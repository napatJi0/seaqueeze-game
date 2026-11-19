import { isPrizeType, PRIZE_DISTRIBUTIONS, PRIZE_RANKS, SLOT_COUNT } from "@/config/prizes";
import type { PrizeType } from "@/types/prize";

export type ArrangementCheck =
  | { ok: true }
  | { ok: false; reason: "wrong_length" | "unsupported_rank" | "wrong_distribution" | "unknown_type" };

/** Validates that an arrangement exactly matches its prize type's distribution. */
export function validateArrangement(type: unknown, arrangement: readonly unknown[]): ArrangementCheck {
  if (!isPrizeType(type)) return { ok: false, reason: "unknown_type" };
  if (arrangement.length !== SLOT_COUNT) return { ok: false, reason: "wrong_length" };
  const counts = { 1: 0, 2: 0, 3: 0 };
  for (const rank of arrangement) {
    if (!PRIZE_RANKS.includes(rank as 1 | 2 | 3)) return { ok: false, reason: "unsupported_rank" };
    counts[rank as 1 | 2 | 3] += 1;
  }
  const expected = PRIZE_DISTRIBUTIONS[type];
  if (counts[1] !== expected.rank1 || counts[2] !== expected.rank2 || counts[3] !== expected.rank3) {
    return { ok: false, reason: "wrong_distribution" };
  }
  return { ok: true };
}
