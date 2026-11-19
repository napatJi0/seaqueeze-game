/**
 * Random ball spawn points.
 *
 * At START ROUND every ball gets a random spawn: which column it starts above is a random
 * permutation of the players, and its exact position inside that column (x) and its height
 * (y) are random too, so the balls are not lined up. The spawn is locked for the round
 * (a retry restores the same starting positions) and never depends on prizes.
 */
import { PLAYER_IDS } from "@/config/players";
import { secureRandom, shuffle, type RandomSource } from "@/lib/random";
import type { SpawnPoint } from "@/types/game";
import type { BoardLayout } from "./board-layout";

export type { SpawnPoint };

/** The area balls may spawn in: above the obstacle field, away from walls and each other. */
export function spawnZone(layout: BoardLayout): { xJitter: number; yMin: number; yMax: number } {
  const columnWidth = layout.width / layout.slots.length;
  return {
    // Keeps a ball fully inside its column with a margin, so balls never overlap at spawn.
    // ±35 keeps every possible straight drop clear of round tops (see exposedBalancePoints).
    xJitter: Math.max(0, Math.min(35, columnWidth / 2 - layout.ballRadius - 16)),
    yMin: layout.ballRadius + 16,
    yMax: Math.max(layout.ballRadius + 16, layout.fieldTop - layout.ballRadius - 12),
  };
}

export function generateSpawn(layout: BoardLayout, random: RandomSource = secureRandom): SpawnPoint[] {
  const zone = spawnZone(layout);
  const order = shuffle(PLAYER_IDS, random);
  return order.map((playerId, column) => {
    const cx = (layout.slots[column] as { centerX: number }).centerX;
    return {
      playerId,
      x: cx + (random() * 2 - 1) * zone.xJitter,
      y: zone.yMin + random() * (zone.yMax - zone.yMin),
    };
  });
}

/** Aligned fallback (player order, column centers, one height). Used only for old saves. */
export function defaultSpawn(layout: BoardLayout): SpawnPoint[] {
  const zone = spawnZone(layout);
  return PLAYER_IDS.map((playerId, column) => ({
    playerId,
    x: (layout.slots[column] as { centerX: number }).centerX,
    y: (zone.yMin + zone.yMax) / 2,
  }));
}

/** Four distinct players, inside the spawn zone, not overlapping each other. */
export function isValidSpawn(layout: BoardLayout, spawn: readonly SpawnPoint[] | undefined): spawn is SpawnPoint[] {
  if (!spawn || spawn.length !== PLAYER_IDS.length) return false;
  if (new Set(spawn.map((s) => s.playerId)).size !== PLAYER_IDS.length) return false;
  if (!spawn.every((s) => PLAYER_IDS.includes(s.playerId))) return false;
  const zone = spawnZone(layout);
  const r = layout.ballRadius;
  for (const s of spawn) {
    if (!Number.isFinite(s.x) || !Number.isFinite(s.y)) return false;
    if (s.x - r < 0 || s.x + r > layout.width || s.y < zone.yMin - 0.5 || s.y > zone.yMax + 0.5) return false;
  }
  for (let i = 0; i < spawn.length; i++) {
    for (let j = i + 1; j < spawn.length; j++) {
      const a = spawn[i] as SpawnPoint;
      const b = spawn[j] as SpawnPoint;
      if (Math.hypot(a.x - b.x, a.y - b.y) < 2 * r + 2) return false;
    }
  }
  return true;
}
