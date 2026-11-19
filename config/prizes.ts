import type { PrizeDistribution, PrizeRank, PrizeType } from "@/types/prize";

export const SLOT_COUNT = 4 as const;

export const PRIZE_TYPES: readonly PrizeType[] = ["A", "B", "C", "D"];

export const PRIZE_RANKS: readonly PrizeRank[] = [1, 2, 3];

/** The supported prize distributions (four prizes per round). */
export const PRIZE_DISTRIBUTIONS: Readonly<Record<PrizeType, PrizeDistribution>> = {
  A: { rank1: 1, rank2: 0, rank3: 3 },
  B: { rank1: 0, rank2: 2, rank3: 2 },
  C: { rank1: 0, rank2: 1, rank3: 3 },
  D: { rank1: 0, rank2: 0, rank3: 4 },
};

export function isPrizeType(value: unknown): value is PrizeType {
  return PRIZE_TYPES.includes(value as PrizeType);
}

/** Prize color per rank: each slot is filled with its prize color from the start of the round. */
export const PRIZE_RANK_COLORS: Readonly<Record<PrizeRank, string>> = {
  1: "#facc15", // yellow
  2: "#22c55e", // green
  3: "#f9a8d4", // light pink
};
