/**
 * Validates and recovers a persisted session after a page load.
 * Never generates new prize positions for an existing round.
 */
import { TOTAL_ROUNDS } from "@/config/rounds";
import {
  ACTIVE_STATUSES,
  createSession,
  ensurePendingArrangement,
  markInterrupted,
  systemClock,
  type Clock,
} from "@/lib/game-engine/game-state";
import { computePlayerStats } from "@/lib/game-engine/statistics";
import { validateArrangement } from "@/lib/prize-engine/prize-validator";
import { getRoundConfig } from "@/lib/round-manager/round-config";
import { gameSessionSchema } from "@/lib/validation/schemas";
import type { GameSession } from "@/types/game";

export type RecoveryNotice = "new" | "restored" | "interrupted" | "corrupted" | "unsupported_version";

export interface RecoveryResult {
  session: GameSession;
  notice: RecoveryNotice;
  /** True when the recovered session differs from what was stored and must be re-saved. */
  changed: boolean;
}

/** Structural + game-rule integrity checks beyond the schema. Returns an issue or null. */
export function findIntegrityIssue(s: GameSession): string | null {
  const seen = new Set<number>();
  for (const [i, r] of s.results.entries()) {
    if (seen.has(r.roundNumber)) return "duplicate_result";
    seen.add(r.roundNumber);
    if (r.roundNumber !== i + 1) return "non_contiguous_results";
    if (!validateArrangement(r.prizeType, r.arrangement).ok) return "invalid_result_arrangement";
    const config = getRoundConfig(s.roundConfigs, r.roundNumber);
    if (!config || config.prizeType !== r.prizeType) return "result_config_mismatch";
    const slots = new Set(r.placements.map((p) => p.slotIndex));
    const players = new Set(r.placements.map((p) => p.playerId));
    if (slots.size !== 4 || players.size !== 4) return "invalid_placements";
    if (r.placements.some((p) => r.arrangement[p.slotIndex] !== p.prize)) return "placement_prize_mismatch";
  }
  const configRounds = new Set(s.roundConfigs.map((c) => c.roundNumber));
  if (configRounds.size !== TOTAL_ROUNDS) return "invalid_round_configs";

  const done = s.results.length;
  const recordedCurrent = s.results.some((r) => r.roundNumber === s.currentRound);
  switch (s.status) {
    case "finished":
      if (done !== TOTAL_ROUNDS) return "finished_incomplete";
      break;
    case "revealing":
    case "completed":
      if (!recordedCurrent || done !== s.currentRound) return "completed_mismatch";
      break;
    default:
      if (recordedCurrent || done !== s.currentRound - 1) return "progress_mismatch";
  }

  const a = s.activeRound;
  if (a) {
    if (a.roundNumber !== s.currentRound) return "active_round_mismatch";
    if (!validateArrangement(a.prizeType, a.arrangement).ok) return "active_arrangement_invalid";
    const config = getRoundConfig(s.roundConfigs, a.roundNumber);
    if (!config || config.prizeType !== a.prizeType) return "active_config_mismatch";
  } else if (s.status !== "idle" && s.status !== "finished" && s.status !== "preparing") {
    return "missing_active_round";
  }
  if (s.status === "invalid" && s.invalidReason === null) return "missing_invalid_reason";
  return null;
}

export function recoverSession(raw: unknown, clock: Clock = systemClock, fallback?: () => GameSession): RecoveryResult {
  const fresh = () => (fallback ? fallback() : createSession(undefined, clock));
  if (raw === null || raw === undefined) return { session: fresh(), notice: "new", changed: true };

  const version = (raw as { schemaVersion?: unknown }).schemaVersion;
  if (typeof version === "number" && version !== 1) {
    return { session: fresh(), notice: "unsupported_version", changed: true };
  }

  const parsed = gameSessionSchema.safeParse(raw);
  if (!parsed.success) return { session: fresh(), notice: "corrupted", changed: true };
  let session = parsed.data as GameSession;
  if (findIntegrityIssue(session) !== null) return { session: fresh(), notice: "corrupted", changed: true };

  // Player statistics are always re-derived from validated results.
  session = { ...session, playerStats: computePlayerStats(session.results) };

  if (session.status === "revealing") {
    // Result was validated and persisted before the reveal began: the round is complete.
    return { session: { ...session, status: "completed", updatedAt: clock.now() }, notice: "restored", changed: true };
  }
  if (ACTIVE_STATUSES.includes(session.status)) {
    return { session: markInterrupted(session, clock), notice: "interrupted", changed: true };
  }
  // A waiting round keeps its saved (already shown) arrangement; one is prepared only when
  // missing or not matching the round, e.g. a session saved by an older version.
  const prepared = ensurePendingArrangement(session);
  return { session: prepared, notice: "restored", changed: prepared !== session };
}
