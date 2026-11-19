import { PLAYER_IDS } from "@/config/players";
import type { RoundResult } from "@/types/game";
import type { PlayerId, PlayerStats } from "@/types/player";

export function emptyStats(): PlayerStats[] {
  return PLAYER_IDS.map((playerId) => ({ playerId, rank1: 0, rank2: 0, rank3: 0, total: 0, roundsCompleted: 0 }));
}

/** Derive player statistics from completed round results (single source of truth). */
export function computePlayerStats(results: readonly RoundResult[]): PlayerStats[] {
  const stats = new Map<PlayerId, PlayerStats>(emptyStats().map((s) => [s.playerId, s]));
  for (const r of results) {
    for (const p of r.placements) {
      const s = stats.get(p.playerId);
      if (!s) continue;
      if (p.prize === 1) s.rank1 += 1;
      else if (p.prize === 2) s.rank2 += 1;
      else s.rank3 += 1;
      s.total += 1;
      s.roundsCompleted += 1;
    }
  }
  return PLAYER_IDS.map((id) => stats.get(id) as PlayerStats);
}

export interface PodiumEntry {
  /** Shared positions use standard competition ranking (1, 1, 3, 4). */
  position: number;
  shared: boolean;
  stats: PlayerStats;
}

/**
 * Deterministic podium ranking:
 *  1. Most Rank 1 prizes
 *  2. Most Rank 2 prizes
 *  3. Most Rank 3 prizes
 *  4. Otherwise a shared position — never an arbitrary winner.
 * Ties keep the fixed player order for display only.
 */
export function computePodium(stats: readonly PlayerStats[]): PodiumEntry[] {
  const compare = (a: PlayerStats, b: PlayerStats) => b.rank1 - a.rank1 || b.rank2 - a.rank2 || b.rank3 - a.rank3;
  const order = PLAYER_IDS;
  const sorted = stats
    .slice()
    .sort((a, b) => compare(a, b) || order.indexOf(a.playerId) - order.indexOf(b.playerId));
  return sorted.map((s) => {
    const firstEqual = sorted.findIndex((o) => compare(o, s) === 0);
    const tiedCount = sorted.filter((o) => compare(o, s) === 0).length;
    return { position: firstEqual + 1, shared: tiedCount > 1, stats: s };
  });
}
