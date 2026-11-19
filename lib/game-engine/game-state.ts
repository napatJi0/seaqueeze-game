/**
 * Pure, guarded game state machine.
 *
 * Every operator / engine action is a function (session, ...) → TransitionResult.
 * No function here performs I/O, touches the physics engine or the UI.
 *
 *   idle → preparing → locked → countdown → simulating → validating
 *        → revealing → completed → (next) idle | finished
 *   validating → invalid → (operator retry) countdown
 */
import { TOTAL_ROUNDS } from "@/config/rounds";
import { generateArrangement } from "@/lib/prize-engine/prize-generator";
import { validateArrangement } from "@/lib/prize-engine/prize-validator";
import { createDefaultRoundConfigs, getRoundConfig } from "@/lib/round-manager/round-config";
import { validateRoundConfigs } from "@/lib/round-manager/round-validator";
import { BOARD_LAYOUT } from "@/lib/physics/board-layout";
import { generateSpawn, isValidSpawn } from "@/lib/physics/spawn";
import { createId, secureRandom, type RandomSource } from "@/lib/random";
import type {
  AttemptOutcome,
  GameErrorCode,
  GameSession,
  GameStatus,
  InvalidReason,
  RoundResult,
  TransitionResult,
} from "@/types/game";
import type { RoundConfig } from "@/types/round";
import { validateLandings } from "./landing-validation";
import { computePlayerStats, emptyStats } from "./statistics";

export interface Clock {
  now(): string;
}
export const systemClock: Clock = { now: () => new Date().toISOString() };

/** States in which the round is "active" (physics may be running or about to). */
export const ACTIVE_STATUSES: readonly GameStatus[] = [
  "preparing",
  "locked",
  "countdown",
  "simulating",
  "validating",
];

/** States in which the round configuration may be edited. */
export const CONFIG_EDITABLE_STATUSES: readonly GameStatus[] = ["idle", "completed"];

const ok = (session: GameSession): TransitionResult => ({ ok: true, session });
const fail = (error: GameErrorCode): TransitionResult => ({ ok: false, error });

function touch(session: GameSession, clock: Clock, patch: Partial<GameSession>): GameSession {
  return { ...session, ...patch, updatedAt: clock.now() };
}

/**
 * Make sure the current (not yet started) round has a prepared setup: a prize arrangement
 * matching its configured type and a random ball spawn, so slot colors and ball positions
 * can be shown before START ROUND. Existing valid parts are never replaced (refreshing the
 * page keeps the same colors and positions); a prize-type change re-prepares only the prizes.
 */
export function ensurePendingArrangement(session: GameSession, random: RandomSource = secureRandom): GameSession {
  if (session.status !== "idle" || session.activeRound !== null) return session;
  const config = getRoundConfig(session.roundConfigs, session.currentRound);
  if (!config) return session;
  const pending = session.pendingArrangement;
  const sameRound = pending?.roundNumber === session.currentRound;
  const keepPrizes =
    sameRound && pending?.prizeType === config.prizeType && validateArrangement(config.prizeType, pending.arrangement).ok;
  const keepSpawn = sameRound && isValidSpawn(BOARD_LAYOUT, pending?.spawn);
  if (keepPrizes && keepSpawn) return session;
  return {
    ...session,
    pendingArrangement: {
      roundNumber: session.currentRound,
      prizeType: config.prizeType,
      arrangement: keepPrizes && pending ? pending.arrangement : generateArrangement(config.prizeType, random),
      spawn: keepSpawn && pending?.spawn ? pending.spawn : generateSpawn(BOARD_LAYOUT, random),
    },
  };
}

/**
 * SHUFFLE BALLS: before START ROUND, draw a new random ball spawn for the waiting round.
 * Only the ball positions change; the prize colors already shown stay the same.
 */
export function shuffleSpawn(
  session: GameSession,
  random: RandomSource = secureRandom,
  clock: Clock = systemClock,
): TransitionResult {
  if (session.status !== "idle" || session.activeRound !== null) return fail("invalid_transition");
  const prepared = ensurePendingArrangement(session, random);
  const pending = prepared.pendingArrangement;
  if (!pending) return fail("invalid_transition");
  return ok(touch(prepared, clock, { pendingArrangement: { ...pending, spawn: generateSpawn(BOARD_LAYOUT, random) } }));
}

export function createSession(
  roundConfigs: RoundConfig[] = createDefaultRoundConfigs(),
  clock: Clock = systemClock,
  id: string = createId(),
  random: RandomSource = secureRandom,
): GameSession {
  const now = clock.now();
  return ensurePendingArrangement({
    schemaVersion: 1,
    id,
    createdAt: now,
    updatedAt: now,
    status: "idle",
    currentRound: 1,
    roundConfigs: roundConfigs.map((c) => ({ ...c })),
    activeRound: null,
    invalidReason: null,
    results: [],
    playerStats: emptyStats(),
    totalRetries: 0,
  }, random);
}

/**
 * START ROUND: idle → preparing → locked → countdown.
 * Reads the predefined round type, generates + validates + locks the arrangement.
 */
export function startRound(
  session: GameSession,
  random: RandomSource = secureRandom,
  clock: Clock = systemClock,
): TransitionResult {
  if (session.status !== "idle" || session.activeRound !== null) return fail("invalid_transition");
  if (session.currentRound < 1 || session.currentRound > TOTAL_ROUNDS) return fail("round_out_of_range");
  if (session.results.some((r) => r.roundNumber === session.currentRound)) return fail("round_already_recorded");

  const configCheck = validateRoundConfigs(session.roundConfigs);
  if (!configCheck.ok) return fail("invalid_round_config");
  const config = getRoundConfig(configCheck.configs, session.currentRound);
  if (!config) return fail("invalid_round_config");

  // preparing
  let next = touch(session, clock, { status: "preparing" });

  // Lock the arrangement that was already shown before START ROUND (generate one only if
  // none was prepared, e.g. a session saved by an older version).
  const pending = session.pendingArrangement;
  const arrangement =
    pending && pending.roundNumber === session.currentRound && pending.prizeType === config.prizeType
      ? [...pending.arrangement]
      : generateArrangement(config.prizeType, random);
  if (!validateArrangement(config.prizeType, arrangement).ok) return fail("invalid_prize_arrangement");

  // locked
  next = touch(next, clock, {
    status: "locked",
    activeRound: {
      roundNumber: session.currentRound,
      prizeType: config.prizeType,
      // The random spawn shown before START ROUND, locked for the round.
      spawn:
        pending && pending.roundNumber === session.currentRound && isValidSpawn(BOARD_LAYOUT, pending.spawn)
          ? pending.spawn.map((p) => ({ ...p }))
          : generateSpawn(BOARD_LAYOUT, random),
      arrangement: [...arrangement],
      lockedAt: clock.now(),
      attempt: 1,
      invalidAttempts: [],
    },
    invalidReason: null,
    pendingArrangement: null,
  });

  // countdown
  return ok(touch(next, clock, { status: "countdown" }));
}

/** Countdown finished: release all four balls at once. countdown → simulating. */
export function releaseBalls(session: GameSession, clock: Clock = systemClock): TransitionResult {
  if (session.status !== "countdown" || !session.activeRound) return fail("invalid_transition");
  return ok(touch(session, clock, { status: "simulating" }));
}

/**
 * The physics engine reports the end of an attempt.
 * simulating → validating → (revealing | invalid).
 * The result is recorded here (once) on a valid landing.
 */
export function submitAttempt(
  session: GameSession,
  outcome: AttemptOutcome,
  clock: Clock = systemClock,
): TransitionResult {
  const active = session.activeRound;
  if (session.status !== "simulating" || !active) return fail("invalid_transition");
  if (outcome.roundNumber !== active.roundNumber || outcome.attempt !== active.attempt) return fail("stale_attempt");

  const validating = touch(session, clock, { status: "validating" });

  let reason: InvalidReason | null = null;
  const check = validateLandings(outcome.landings);
  if (!check.valid && check.reason === "duplicate_slot") reason = "duplicate_slot";
  else if (outcome.failure) reason = outcome.failure;
  else if (!check.valid) reason = check.reason;

  if (reason !== null || !check.valid) {
    const finalReason: InvalidReason = reason ?? "physics_error";
    return ok(
      touch(validating, clock, {
        status: "invalid",
        invalidReason: finalReason,
        totalRetries: session.totalRetries + 1,
        activeRound: {
          ...active,
          invalidAttempts: [
            ...active.invalidAttempts,
            { attempt: active.attempt, reason: finalReason, landings: check.landings, at: clock.now() },
          ],
        },
      }),
    );
  }

  if (validating.results.some((r) => r.roundNumber === active.roundNumber)) return fail("round_already_recorded");

  const result: RoundResult = {
    roundNumber: active.roundNumber,
    prizeType: active.prizeType,
    spawn: active.spawn ? active.spawn.map((p) => ({ ...p })) : undefined,
    arrangement: [...active.arrangement],
    placements: check.landings.map((l) => ({
      playerId: l.playerId,
      slotIndex: l.slotIndex,
      prize: active.arrangement[l.slotIndex] as 1 | 2 | 3,
    })),
    attempt: active.attempt,
    completedAt: clock.now(),
  };
  const results = [...validating.results, result];
  return ok(
    touch(validating, clock, {
      status: "revealing",
      invalidReason: null,
      results,
      playerStats: computePlayerStats(results),
    }),
  );
}

/** Reveal animation finished. revealing → completed. */
export function finishReveal(session: GameSession, clock: Clock = systemClock): TransitionResult {
  if (session.status !== "revealing") return fail("invalid_transition");
  return ok(touch(session, clock, { status: "completed" }));
}

/** Manual operator retry after an invalid attempt. Keeps round + locked arrangement. */
export function retryRound(session: GameSession, clock: Clock = systemClock): TransitionResult {
  const active = session.activeRound;
  if (session.status !== "invalid" || !active) return fail("invalid_transition");
  return ok(
    touch(session, clock, {
      status: "countdown",
      invalidReason: null,
      activeRound: { ...active, attempt: active.attempt + 1 },
    }),
  );
}

/** NEXT ROUND: completed → idle (next round) or → finished after round 60. */
export function nextRound(
  session: GameSession,
  clock: Clock = systemClock,
  random: RandomSource = secureRandom,
): TransitionResult {
  if (session.status !== "completed") return fail("invalid_transition");
  if (!session.results.some((r) => r.roundNumber === session.currentRound)) return fail("invalid_transition");
  if (session.currentRound >= TOTAL_ROUNDS) {
    return ok(touch(session, clock, { status: "finished", activeRound: null }));
  }
  // The next round's prize colors are prepared right away, to be shown before START ROUND.
  return ok(
    ensurePendingArrangement(
      touch(session, clock, {
        status: "idle",
        currentRound: session.currentRound + 1,
        activeRound: null,
        invalidReason: null,
        pendingArrangement: null,
      }),
      random,
    ),
  );
}

/**
 * Recovery after a refresh during an active round: never assume success.
 * The locked arrangement is preserved and the operator must retry.
 */
export function markInterrupted(session: GameSession, clock: Clock = systemClock): GameSession {
  if (!ACTIVE_STATUSES.includes(session.status)) return session;
  if (!session.activeRound) {
    // Nothing was locked yet: safely return to idle without generating anything.
    return touch(session, clock, { status: "idle", invalidReason: null });
  }
  return touch(session, clock, {
    status: "invalid",
    invalidReason: "interrupted",
    totalRetries: session.totalRetries + 1,
    activeRound: {
      ...session.activeRound,
      invalidAttempts: [
        ...session.activeRound.invalidAttempts,
        { attempt: session.activeRound.attempt, reason: "interrupted", landings: [], at: clock.now() },
      ],
    },
  });
}

/** Replace the 60-round configuration. Rounds already completed or locked cannot change. */
export function updateRoundConfigs(
  session: GameSession,
  configs: readonly unknown[],
  clock: Clock = systemClock,
  random: RandomSource = secureRandom,
): TransitionResult {
  if (!CONFIG_EDITABLE_STATUSES.includes(session.status)) return fail("locked_round_edit");
  const check = validateRoundConfigs(configs);
  if (!check.ok) return fail("invalid_round_config");
  for (const r of session.results) {
    const c = getRoundConfig(check.configs, r.roundNumber);
    if (!c || c.prizeType !== r.prizeType) return fail("locked_round_edit");
  }
  // If the waiting round's type changed, its shown arrangement is re-prepared for the new type.
  return ok(ensurePendingArrangement(touch(session, clock, { roundConfigs: check.configs }), random));
}

/** Round numbers that can no longer be edited. */
export function lockedRoundNumbers(session: GameSession): Set<number> {
  const locked = new Set(session.results.map((r) => r.roundNumber));
  if (session.activeRound) locked.add(session.activeRound.roundNumber);
  return locked;
}

/** RESET GAME: a brand-new session that keeps the operator's round configuration. */
export function resetSession(session: GameSession, clock: Clock = systemClock): GameSession {
  return createSession(session.roundConfigs, clock);
}
