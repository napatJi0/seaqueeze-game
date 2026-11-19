import { PRIZE_DISTRIBUTIONS } from "@/config/prizes";
import { secureRandom, shuffle, type RandomSource } from "@/lib/random";
import type { PrizeArrangement, PrizeRank, PrizeType } from "@/types/prize";
import { validateArrangement } from "./prize-validator";

/** Ordered (unshuffled) list of the four prizes for a prize type. */
export function buildPrizePool(type: PrizeType): PrizeRank[] {
  const d = PRIZE_DISTRIBUTIONS[type];
  return [
    ...Array<PrizeRank>(d.rank1).fill(1),
    ...Array<PrizeRank>(d.rank2).fill(2),
    ...Array<PrizeRank>(d.rank3).fill(3),
  ];
}

/**
 * Generate a randomized, validated prize arrangement for a round.
 * This is independent of the physics engine and of any ball identity.
 */
export function generateArrangement(type: PrizeType, random: RandomSource = secureRandom): PrizeArrangement {
  const arrangement = shuffle(buildPrizePool(type), random);
  const check = validateArrangement(type, arrangement);
  if (!check.ok) {
    throw new Error(`Generated prize arrangement failed validation: ${check.reason}`);
  }
  return arrangement;
}
