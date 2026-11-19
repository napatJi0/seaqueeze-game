import { describe, expect, it } from "vitest";
import { createSession, releaseBalls, retryRound, startRound, submitAttempt } from "@/lib/game-engine/game-state";
import { BOARD_LAYOUT } from "@/lib/physics/board-layout";
import { PlinkoPhysicsEngine } from "@/lib/physics/physics-engine";
import { defaultSpawn, generateSpawn, isValidSpawn, spawnZone } from "@/lib/physics/spawn";
import { recoverSession } from "@/lib/storage/recovery";
import { duplicateLandings, outcomeFor, seeded, sessionCompletedThrough, testClock, uniqueLandings, unwrap } from "./helpers";

const L = BOARD_LAYOUT;

describe("random spawn", () => {
  it("is always valid: four players, inside the spawn zone, no overlaps", () => {
    const rng = seeded(9);
    for (let i = 0; i < 2000; i++) expect(isValidSpawn(L, generateSpawn(L, rng))).toBe(true);
  });

  it("randomizes which ball starts in which column", () => {
    const rng = seeded(4);
    const orders = new Set<string>();
    for (let i = 0; i < 400; i++) {
      const s = generateSpawn(L, rng);
      orders.add([...s].sort((a, b) => a.x - b.x).map((p) => p.playerId).join(","));
    }
    expect(orders.size).toBe(24); // all 4! column orders occur
  });

  it("balls are not lined up at one height and not centered in their column", () => {
    const zone = spawnZone(L);
    const s = generateSpawn(L, seeded(12));
    expect(new Set(s.map((p) => p.y.toFixed(3))).size).toBe(4);
    for (const p of s) {
      expect(p.y).toBeGreaterThanOrEqual(zone.yMin);
      expect(p.y).toBeLessThanOrEqual(zone.yMax);
    }
    expect(s.some((p) => L.slots.every((slot) => Math.abs(slot.centerX - p.x) > 0.5))).toBe(true);
    expect(zone.yMax - zone.yMin).toBeGreaterThan(60);
  });

  it("is generated at START ROUND, kept on retry and recorded with the result", () => {
    let s = unwrap(startRound(createSession(undefined, testClock), seeded(1), testClock));
    const spawn = s.activeRound!.spawn!;
    expect(isValidSpawn(L, spawn)).toBe(true);
    s = unwrap(submitAttempt(unwrap(releaseBalls(s, testClock)), outcomeFor(s, duplicateLandings), testClock));
    s = unwrap(retryRound(s, testClock));
    expect(s.activeRound!.spawn).toEqual(spawn);
    s = unwrap(submitAttempt(unwrap(releaseBalls(s, testClock)), outcomeFor(s, uniqueLandings), testClock));
    expect(s.results[0]!.spawn).toEqual(spawn);
  });

  it("each round gets a new random spawn", () => {
    const a = unwrap(startRound(createSession(undefined, testClock), seeded(1), testClock)).activeRound!.spawn;
    const b = unwrap(startRound(createSession(undefined, testClock), seeded(2), testClock)).activeRound!.spawn;
    expect(a).not.toEqual(b);
  });

  it("places each ball exactly at its spawn point in the physics world", () => {
    const spawn = generateSpawn(L, seeded(5));
    const e = new PlinkoPhysicsEngine(L, seeded(1), spawn);
    for (const b of e.getBallStates()) {
      const p = spawn.find((x) => x.playerId === b.playerId)!;
      expect(b.x).toBeCloseTo(p.x);
      expect(b.y).toBeCloseTo(p.y);
    }
    e.destroy();
  });

  it("older saves without a spawn still recover and use the default spawn", () => {
    const s = structuredClone(sessionCompletedThrough(2)) as unknown as { results: Record<string, unknown>[] };
    s.results.forEach((r) => delete r.spawn);
    expect(recoverSession(s, testClock).notice).toBe("restored");
    const e = new PlinkoPhysicsEngine(L, seeded(1), undefined);
    const d = defaultSpawn(L);
    for (const b of e.getBallStates()) expect(b.x).toBeCloseTo(d.find((p) => p.playerId === b.playerId)!.x);
    e.destroy();
  });
});
