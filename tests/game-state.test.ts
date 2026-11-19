import { describe, expect, it } from "vitest";
import {
  createSession,
  finishReveal,
  markInterrupted,
  nextRound,
  releaseBalls,
  retryRound,
  startRound,
  submitAttempt,
} from "@/lib/game-engine/game-state";
import { duplicateLandings, outcomeFor, playRound, seeded, sessionCompletedThrough, testClock, uniqueLandings, unwrap } from "./helpers";

const fresh = () => createSession(undefined, testClock, "s1");

describe("game state transitions", () => {
  it("START ROUND reads the configured type, locks a valid arrangement, enters countdown", () => {
    const s = unwrap(startRound(fresh(), seeded(1), testClock));
    expect(s.status).toBe("countdown");
    expect(s.activeRound?.prizeType).toBe("A");
    expect(s.activeRound?.arrangement.slice().sort()).toEqual([1, 3, 3, 3]);
    expect(s.activeRound?.attempt).toBe(1);
  });

  it("cannot start an already active round", () => {
    const s = unwrap(startRound(fresh(), seeded(1), testClock));
    expect(startRound(s, seeded(2), testClock)).toEqual({ ok: false, error: "invalid_transition" });
  });

  it("cannot release twice", () => {
    const s = unwrap(releaseBalls(unwrap(startRound(fresh(), seeded(1), testClock)), testClock));
    expect(s.status).toBe("simulating");
    expect(releaseBalls(s, testClock)).toEqual({ ok: false, error: "invalid_transition" });
  });

  it("cannot reveal / finish before all balls land", () => {
    const s = unwrap(startRound(fresh(), seeded(1), testClock));
    expect(finishReveal(s, testClock).ok).toBe(false);
    expect(submitAttempt(s, outcomeFor(s, uniqueLandings), testClock).ok).toBe(false); // not simulating yet
  });

  it("valid landing records exactly one result with prizes from the locked arrangement", () => {
    let s = unwrap(releaseBalls(unwrap(startRound(fresh(), seeded(9), testClock)), testClock));
    const arrangement = s.activeRound!.arrangement;
    s = unwrap(submitAttempt(s, outcomeFor(s, uniqueLandings), testClock));
    expect(s.status).toBe("revealing");
    expect(s.results).toHaveLength(1);
    expect(s.results[0]!.placements.map((p) => p.prize)).toEqual(arrangement);
    expect(s.playerStats.reduce((n, p) => n + p.total, 0)).toBe(4);
    expect(s.currentRound).toBe(1); // counter not advanced until NEXT ROUND
  });

  it("ignores stale / duplicate attempt events", () => {
    let s = unwrap(releaseBalls(unwrap(startRound(fresh(), seeded(9), testClock)), testClock));
    const outcome = outcomeFor(s, uniqueLandings);
    expect(submitAttempt(s, { ...outcome, attempt: 2 }, testClock)).toEqual({ ok: false, error: "stale_attempt" });
    s = unwrap(submitAttempt(s, outcome, testClock));
    expect(submitAttempt(s, outcome, testClock).ok).toBe(false); // second delivery rejected
    expect(s.results).toHaveLength(1);
  });

  it("duplicate landing → invalid; manual retry preserves round + arrangement", () => {
    let s = unwrap(releaseBalls(unwrap(startRound(fresh(), seeded(5), testClock)), testClock));
    const arrangement = [...s.activeRound!.arrangement];
    s = unwrap(submitAttempt(s, outcomeFor(s, duplicateLandings), testClock));
    expect(s.status).toBe("invalid");
    expect(s.invalidReason).toBe("duplicate_slot");
    expect(s.results).toHaveLength(0);
    expect(s.activeRound!.invalidAttempts).toHaveLength(1);

    // Not automatic: still invalid until the operator retries.
    expect(nextRound(s, testClock).ok).toBe(false);
    expect(releaseBalls(s, testClock).ok).toBe(false);

    s = unwrap(retryRound(s, testClock));
    expect(s.status).toBe("countdown");
    expect(s.currentRound).toBe(1);
    expect(s.activeRound!.attempt).toBe(2);
    expect(s.activeRound!.arrangement).toEqual(arrangement);
    expect(s.invalidReason).toBeNull();
  });

  it("timeout / stuck failures are invalid even with partial landings", () => {
    let s = unwrap(releaseBalls(unwrap(startRound(fresh(), seeded(5), testClock)), testClock));
    s = unwrap(submitAttempt(s, outcomeFor(s, uniqueLandings.slice(0, 3), "timeout"), testClock));
    expect(s.status).toBe("invalid");
    expect(s.invalidReason).toBe("timeout");
  });

  it("retry is only available after an invalid attempt", () => {
    expect(retryRound(fresh(), testClock).ok).toBe(false);
    expect(retryRound(sessionCompletedThrough(1), testClock).ok).toBe(false);
  });

  it("round completion and progression are manual and sequential", () => {
    let s = playRound(fresh());
    expect(s.status).toBe("completed");
    s = unwrap(nextRound(s, testClock));
    expect(s.status).toBe("idle");
    expect(s.currentRound).toBe(2);
    expect(s.activeRound).toBeNull();
    s = unwrap(startRound(s, seeded(2), testClock));
    expect(s.activeRound!.prizeType).toBe("B");
  });

  it("cannot record the same round twice", () => {
    const s = sessionCompletedThrough(1);
    const replay = { ...s, status: "idle" as const, activeRound: null };
    expect(startRound(replay, seeded(1), testClock)).toEqual({ ok: false, error: "round_already_recorded" });
  });

  it("after round 60 the game finishes and never starts round 61", () => {
    let s = sessionCompletedThrough(60);
    expect(s.results).toHaveLength(60);
    s = unwrap(nextRound(s, testClock));
    expect(s.status).toBe("finished");
    expect(s.currentRound).toBe(60);
    expect(startRound(s, seeded(1), testClock).ok).toBe(false);
    expect(nextRound(s, testClock).ok).toBe(false);
    expect(startRound({ ...s, status: "idle", currentRound: 61 }, seeded(1), testClock).ok).toBe(false);
  });

  it("interrupted simulation becomes invalid with the arrangement preserved", () => {
    const s = unwrap(releaseBalls(unwrap(startRound(fresh(), seeded(4), testClock)), testClock));
    const r = markInterrupted(s, testClock);
    expect(r.status).toBe("invalid");
    expect(r.invalidReason).toBe("interrupted");
    expect(r.activeRound!.arrangement).toEqual(s.activeRound!.arrangement);
    expect(r.results).toHaveLength(0);
  });
});
