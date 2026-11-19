import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import { createSession, releaseBalls, startRound, submitAttempt } from "@/lib/game-engine/game-state";
import { IndexedDbGameRepository } from "@/lib/storage/persistence";
import { recoverSession } from "@/lib/storage/recovery";
import { duplicateLandings, outcomeFor, seeded, sessionCompletedThrough, testClock, uniqueLandings, unwrap } from "./helpers";

const repo = () => new IndexedDbGameRepository(new IDBFactory());

describe("IndexedDB persistence", () => {
  it("round-trips a session and its result history", async () => {
    const r = repo();
    const s = sessionCompletedThrough(3);
    await r.saveSession(s);
    const loaded = await r.loadActiveSession();
    expect(loaded).toEqual(s);
    const results = await r.loadResults(s.id);
    expect(results.map((x) => x.roundNumber)).toEqual([1, 2, 3]);
  });

  it("repeated saves never duplicate result records", async () => {
    const r = repo();
    const s = sessionCompletedThrough(2);
    await r.saveSession(s);
    await r.saveSession(s);
    await r.saveSession({ ...s, updatedAt: "x" });
    expect(await r.loadResults(s.id)).toHaveLength(2);
  });

  it("deleteSession removes the session's history", async () => {
    const r = repo();
    const s = sessionCompletedThrough(2);
    await r.saveSession(s);
    await r.deleteSession(s.id);
    expect(await r.loadResults(s.id)).toHaveLength(0);
  });
});

describe("recovery", () => {
  it("no saved data → new session", () => {
    expect(recoverSession(null, testClock).notice).toBe("new");
  });

  it("restores completed results and statistics", async () => {
    const r = repo();
    const s = sessionCompletedThrough(4);
    await r.saveSession(s);
    const rec = recoverSession(await r.loadActiveSession(), testClock);
    expect(rec.notice).toBe("restored");
    expect(rec.session.results).toEqual(s.results);
    expect(rec.session.playerStats).toEqual(s.playerStats);
    expect(rec.session.status).toBe("completed");
  });

  it("refresh during simulation → interrupted, same locked arrangement, no result", async () => {
    const r = repo();
    const s = unwrap(releaseBalls(unwrap(startRound(createSession(undefined, testClock), seeded(11), testClock)), testClock));
    await r.saveSession(s);
    const rec = recoverSession(await r.loadActiveSession(), testClock);
    expect(rec.notice).toBe("interrupted");
    expect(rec.session.status).toBe("invalid");
    expect(rec.session.invalidReason).toBe("interrupted");
    expect(rec.session.activeRound!.arrangement).toEqual(s.activeRound!.arrangement);
    expect(rec.session.results).toHaveLength(0);
  });

  it("refresh during countdown → interrupted as well", () => {
    const s = unwrap(startRound(createSession(undefined, testClock), seeded(2), testClock));
    const rec = recoverSession(structuredClone(s), testClock);
    expect(rec.session.status).toBe("invalid");
    expect(rec.session.activeRound!.arrangement).toEqual(s.activeRound!.arrangement);
  });

  it("refresh during reveal → round stays completed (result already persisted)", () => {
    let s = unwrap(releaseBalls(unwrap(startRound(createSession(undefined, testClock), seeded(2), testClock)), testClock));
    s = unwrap(submitAttempt(s, outcomeFor(s, uniqueLandings), testClock));
    expect(s.status).toBe("revealing");
    const rec = recoverSession(structuredClone(s), testClock);
    expect(rec.session.status).toBe("completed");
    expect(rec.session.results).toHaveLength(1);
  });

  it("invalid round state survives a refresh unchanged", () => {
    let s = unwrap(releaseBalls(unwrap(startRound(createSession(undefined, testClock), seeded(2), testClock)), testClock));
    s = unwrap(submitAttempt(s, outcomeFor(s, duplicateLandings), testClock));
    const rec = recoverSession(structuredClone(s), testClock);
    expect(rec.session.status).toBe("invalid");
    expect(rec.session.invalidReason).toBe("duplicate_slot");
    expect(rec.changed).toBe(false);
  });

  it("corrupted data → fresh session, never a fabricated result", () => {
    expect(recoverSession({ hello: "world" }, testClock).notice).toBe("corrupted");
    expect(recoverSession("garbage", testClock).notice).toBe("corrupted");

    const s = sessionCompletedThrough(2);
    const tampered = structuredClone(s);
    tampered.results[0]!.arrangement = [1, 1, 3, 3];
    expect(recoverSession(tampered, testClock).notice).toBe("corrupted");

    const dup = structuredClone(s);
    dup.results[1] = structuredClone(dup.results[0]!);
    expect(recoverSession(dup, testClock).notice).toBe("corrupted");

    const progress = { ...structuredClone(s), currentRound: 5 };
    expect(recoverSession(progress, testClock).notice).toBe("corrupted");
  });

  it("unsupported schema versions are rejected", () => {
    const s = { ...createSession(undefined, testClock), schemaVersion: 2 };
    expect(recoverSession(s, testClock).notice).toBe("unsupported_version");
  });

  it("player statistics are re-derived (tampered stats are corrected)", () => {
    const s = structuredClone(sessionCompletedThrough(2));
    s.playerStats[0]!.rank1 = 99;
    const rec = recoverSession(s, testClock);
    expect(rec.session.playerStats[0]!.rank1).toBeLessThan(99);
  });
});
