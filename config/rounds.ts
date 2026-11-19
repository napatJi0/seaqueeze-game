import type { PrizeType } from "@/types/prize";

export const TOTAL_ROUNDS = 60 as const;

/** Default pattern used for a fresh configuration: alternating A / B. */
export function defaultPrizeTypeFor(roundNumber: number): PrizeType {
  return roundNumber % 2 === 1 ? "A" : "B";
}
