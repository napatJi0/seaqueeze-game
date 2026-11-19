import { PRIZE_TYPES } from "@/config/prizes";
import { defaultPrizeTypeFor, TOTAL_ROUNDS } from "@/config/rounds";
import type { PrizeType } from "@/types/prize";
import type { RoundConfig } from "@/types/round";

export function createDefaultRoundConfigs(): RoundConfig[] {
  return Array.from({ length: TOTAL_ROUNDS }, (_, i) => ({
    roundNumber: i + 1,
    prizeType: defaultPrizeTypeFor(i + 1),
  }));
}

export function createUniformRoundConfigs(type: PrizeType): RoundConfig[] {
  return Array.from({ length: TOTAL_ROUNDS }, (_, i) => ({ roundNumber: i + 1, prizeType: type }));
}

export function setRoundType(configs: readonly RoundConfig[], roundNumber: number, type: PrizeType): RoundConfig[] {
  return configs.map((c) => (c.roundNumber === roundNumber ? { ...c, prizeType: type } : c));
}

export function getRoundConfig(configs: readonly RoundConfig[], roundNumber: number): RoundConfig | undefined {
  return configs.find((c) => c.roundNumber === roundNumber);
}

export function countTypes(configs: readonly RoundConfig[]): Record<PrizeType, number> {
  return configs.reduce<Record<PrizeType, number>>(
    (acc, c) => {
      acc[c.prizeType] += 1;
      return acc;
    },
    Object.fromEntries(PRIZE_TYPES.map((t) => [t, 0])) as Record<PrizeType, number>,
  );
}
