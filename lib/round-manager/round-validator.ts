import { isPrizeType } from "@/config/prizes";
import { TOTAL_ROUNDS } from "@/config/rounds";
import type { RoundConfig } from "@/types/round";

export type RoundConfigIssue =
  | { code: "wrong_count"; count: number }
  | { code: "duplicate_round"; roundNumber: number }
  | { code: "missing_round"; roundNumber: number }
  | { code: "out_of_range"; roundNumber: number }
  | { code: "invalid_type"; roundNumber: number };

export type RoundConfigCheck = { ok: true; configs: RoundConfig[] } | { ok: false; issues: RoundConfigIssue[] };

/**
 * Validate a full 60-round configuration. Returns a normalized copy sorted by round number.
 */
export function validateRoundConfigs(input: readonly unknown[]): RoundConfigCheck {
  const issues: RoundConfigIssue[] = [];
  if (input.length !== TOTAL_ROUNDS) issues.push({ code: "wrong_count", count: input.length });

  const seen = new Set<number>();
  const configs: RoundConfig[] = [];
  for (const raw of input) {
    const item = raw as Partial<RoundConfig> | null;
    const n = item?.roundNumber;
    if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > TOTAL_ROUNDS) {
      issues.push({ code: "out_of_range", roundNumber: typeof n === "number" ? n : NaN });
      continue;
    }
    if (seen.has(n)) {
      issues.push({ code: "duplicate_round", roundNumber: n });
      continue;
    }
    seen.add(n);
    if (!isPrizeType(item?.prizeType)) {
      issues.push({ code: "invalid_type", roundNumber: n });
      continue;
    }
    configs.push({ roundNumber: n, prizeType: item.prizeType });
  }
  for (let n = 1; n <= TOTAL_ROUNDS; n++) {
    if (!seen.has(n)) issues.push({ code: "missing_round", roundNumber: n });
  }
  if (issues.length > 0) return { ok: false, issues };
  configs.sort((a, b) => a.roundNumber - b.roundNumber);
  return { ok: true, configs };
}
