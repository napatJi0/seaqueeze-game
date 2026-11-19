import { describe, expect, it } from "vitest";
import { computePlayerStats, computePodium } from "@/lib/game-engine/statistics";
import type { PlayerStats } from "@/types/player";
import { sessionCompletedThrough } from "./helpers";

const st = (playerId: PlayerStats["playerId"], rank1: number, rank2: number, rank3: number): PlayerStats => ({
  playerId,
  rank1,
  rank2,
  rank3,
  total: rank1 + rank2 + rank3,
  roundsCompleted: rank1 + rank2 + rank3,
});

describe("final podium ranking", () => {
  it("ranks by Rank 1, then Rank 2, then Rank 3", () => {
    const p = computePodium([st("circle", 2, 0, 5), st("triangle", 3, 0, 1), st("square", 2, 4, 1), st("hexagon", 2, 4, 3)]);
    expect(p.map((e) => [e.stats.playerId, e.position, e.shared])).toEqual([
      ["triangle", 1, false],
      ["hexagon", 2, false],
      ["square", 3, false],
      ["circle", 4, false],
    ]);
  });

  it("shares positions on full ties (no arbitrary winner)", () => {
    const p = computePodium([st("circle", 1, 1, 1), st("triangle", 2, 0, 0), st("square", 1, 1, 1), st("hexagon", 0, 0, 9)]);
    expect(p.map((e) => [e.stats.playerId, e.position, e.shared])).toEqual([
      ["triangle", 1, false],
      ["circle", 2, true],
      ["square", 2, true],
      ["hexagon", 4, false],
    ]);
  });

  it("all tied → everyone shares first", () => {
    const p = computePodium([st("circle", 1, 1, 1), st("triangle", 1, 1, 1), st("square", 1, 1, 1), st("hexagon", 1, 1, 1)]);
    expect(p.every((e) => e.position === 1 && e.shared)).toBe(true);
  });

  it("statistics derived from 60 results account for every prize", () => {
    const s = sessionCompletedThrough(60);
    const stats = computePlayerStats(s.results);
    const totals = stats.reduce((acc, x) => ({ r1: acc.r1 + x.rank1, r2: acc.r2 + x.rank2, r3: acc.r3 + x.rank3 }), { r1: 0, r2: 0, r3: 0 });
    // Default config alternates A/B: 30×A (1 R1 + 3 R3) and 30×B (2 R2 + 2 R3)
    expect(totals).toEqual({ r1: 30, r2: 60, r3: 150 });
    expect(stats.every((x) => x.roundsCompleted === 60)).toBe(true);
  });
});
