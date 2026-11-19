import { describe, expect, it } from "vitest";
import { createDefaultRoundConfigs, setRoundType } from "@/lib/round-manager/round-config";
import { createSession, nextRound, shuffleSpawn, startRound, updateRoundConfigs } from "@/lib/game-engine/game-state";
import { validateArrangement } from "@/lib/prize-engine/prize-validator";
import { BOARD_LAYOUT } from "@/lib/physics/board-layout";
import { isValidSpawn } from "@/lib/physics/spawn";
import { MemoryGameRepository } from "@/lib/storage/persistence";
import { recoverSession } from "@/lib/storage/recovery";
import { createGameStore } from "@/stores/game-store";
import { playRound, seeded, testClock, unwrap } from "./helpers";

describe("round setup shown before START ROUND", () => {
  it("a new session prepares a valid arrangement for round 1", () => {
    const s = createSession(undefined, testClock, "p1", seeded(3));
    expect(s.pendingArrangement!.roundNumber).toBe(1);
    expect(s.pendingArrangement!.prizeType).toBe("A");
    expect(validateArrangement("A", s.pendingArrangement!.arrangement).ok).toBe(true);
  });

  it("START ROUND locks exactly the arrangement that was shown", () => {
    const s = createSession(undefined, testClock, "p1", seeded(3));
    const shown = s.pendingArrangement!.arrangement;
    const started = unwrap(startRound(s, seeded(99), testClock));
    expect(started.activeRound!.arrangement).toEqual(shown);
    expect(started.pendingArrangement).toBeNull();
  });

  it("NEXT ROUND prepares the next round's arrangement for its configured type", () => {
    const s = unwrap(nextRound(playRound(createSession(undefined, testClock)), testClock, seeded(5)));
    expect(s.currentRound).toBe(2);
    expect(s.pendingArrangement!.roundNumber).toBe(2);
    expect(s.pendingArrangement!.prizeType).toBe("B");
    expect(validateArrangement("B", s.pendingArrangement!.arrangement).ok).toBe(true);
  });

  it("changing the waiting round's type re-prepares it; other edits keep the shown colors", () => {
    const s = createSession(undefined, testClock, "p1", seeded(3));
    const shown = s.pendingArrangement!.arrangement;
    const otherEdit = unwrap(updateRoundConfigs(s, setRoundType(s.roundConfigs, 10, "A"), testClock, seeded(8)));
    expect(otherEdit.pendingArrangement!.arrangement).toEqual(shown);
    const typeChange = unwrap(updateRoundConfigs(s, setRoundType(s.roundConfigs, 1, "B"), testClock, seeded(8)));
    expect(typeChange.pendingArrangement!.prizeType).toBe("B");
    expect(validateArrangement("B", typeChange.pendingArrangement!.arrangement).ok).toBe(true);
  });

  it("a page refresh keeps the same colors", async () => {
    const repository = new MemoryGameRepository();
    const store = createGameStore({ repository, random: seeded(1), clock: testClock });
    await store.getState().hydrate();
    await store.getState().flush();
    const shown = store.getState().session!.pendingArrangement!.arrangement;
    const reloaded = createGameStore({ repository, random: seeded(2), clock: testClock });
    await reloaded.getState().hydrate();
    expect(reloaded.getState().session!.pendingArrangement!.arrangement).toEqual(shown);
  });

  it("older saves without prepared colors get them on recovery", () => {
    const s = structuredClone(createSession(createDefaultRoundConfigs(), testClock)) as unknown as Record<string, unknown>;
    delete s.pendingArrangement;
    const rec = recoverSession(s, testClock);
    expect(rec.notice).toBe("restored");
    expect(rec.changed).toBe(true);
    expect(validateArrangement("A", rec.session.pendingArrangement!.arrangement).ok).toBe(true);
  });

  it("ball positions are prepared too, and START ROUND locks exactly them", () => {
    const s = createSession(undefined, testClock, "p1", seeded(3));
    const spawn = s.pendingArrangement!.spawn!;
    expect(isValidSpawn(BOARD_LAYOUT, spawn)).toBe(true);
    const started = unwrap(startRound(s, seeded(99), testClock));
    expect(started.activeRound!.spawn).toEqual(spawn);
  });

  it("NEXT ROUND prepares new ball positions; a type change keeps them", () => {
    const first = createSession(undefined, testClock, "p1", seeded(3));
    const next = unwrap(nextRound(playRound(first), testClock, seeded(5)));
    expect(isValidSpawn(BOARD_LAYOUT, next.pendingArrangement!.spawn)).toBe(true);
    expect(next.pendingArrangement!.spawn).not.toEqual(first.pendingArrangement!.spawn);
    const typeChange = unwrap(updateRoundConfigs(next, setRoundType(next.roundConfigs, 2, "A"), testClock, seeded(8)));
    expect(typeChange.pendingArrangement!.spawn).toEqual(next.pendingArrangement!.spawn);
  });

  it("a page refresh keeps the same ball positions", async () => {
    const repository = new MemoryGameRepository();
    const store = createGameStore({ repository, random: seeded(1), clock: testClock });
    await store.getState().hydrate();
    await store.getState().flush();
    const spawn = store.getState().session!.pendingArrangement!.spawn;
    const reloaded = createGameStore({ repository, random: seeded(2), clock: testClock });
    await reloaded.getState().hydrate();
    expect(reloaded.getState().session!.pendingArrangement!.spawn).toEqual(spawn);
  });

  it("saves that showed colors but no positions keep their colors and get positions", () => {
    const s = structuredClone(createSession(undefined, testClock, "p1", seeded(3)));
    const colors = s.pendingArrangement!.arrangement;
    delete s.pendingArrangement!.spawn;
    const rec = recoverSession(s, testClock);
    expect(rec.session.pendingArrangement!.arrangement).toEqual(colors);
    expect(isValidSpawn(BOARD_LAYOUT, rec.session.pendingArrangement!.spawn)).toBe(true);
  });

  it("SHUFFLE BALLS draws new positions before START ROUND, keeping the prize colors", () => {
    const s = createSession(undefined, testClock, "p1", seeded(3));
    const shuffled = unwrap(shuffleSpawn(s, seeded(42), testClock));
    expect(shuffled.pendingArrangement!.spawn).not.toEqual(s.pendingArrangement!.spawn);
    expect(isValidSpawn(BOARD_LAYOUT, shuffled.pendingArrangement!.spawn)).toBe(true);
    expect(shuffled.pendingArrangement!.arrangement).toEqual(s.pendingArrangement!.arrangement);
    // START ROUND drops the balls from the shuffled positions.
    const started = unwrap(startRound(shuffled, seeded(1), testClock));
    expect(started.activeRound!.spawn).toEqual(shuffled.pendingArrangement!.spawn);
    // Not allowed once the round has started.
    expect(shuffleSpawn(started, seeded(7), testClock)).toEqual({ ok: false, error: "invalid_transition" });
  });

  it("the store's shuffle is saved, so a refresh keeps the shuffled positions", async () => {
    const repository = new MemoryGameRepository();
    const store = createGameStore({ repository, random: seeded(1), clock: testClock });
    await store.getState().hydrate();
    expect(store.getState().shuffleBalls()).toBe(true);
    await store.getState().flush();
    const spawn = store.getState().session!.pendingArrangement!.spawn;
    const reloaded = createGameStore({ repository, random: seeded(2), clock: testClock });
    await reloaded.getState().hydrate();
    expect(reloaded.getState().session!.pendingArrangement!.spawn).toEqual(spawn);
    store.getState().startRound();
    expect(store.getState().shuffleBalls()).toBe(false);
  });
});
