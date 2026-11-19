import type { PlayerId, PlayerStats } from "./player";
import type { PrizeArrangement, PrizeRank, PrizeType } from "./prize";
import type { RoundConfig } from "./round";

/**
 * Persisted game lifecycle status.
 * "preparing" and "locked" are transient (synchronous) phases of START ROUND;
 * they are part of the type so the transition pipeline is explicit.
 */
export type GameStatus =
  | "idle"
  | "preparing"
  | "locked"
  | "countdown"
  | "simulating"
  | "validating"
  | "invalid"
  | "revealing"
  | "completed"
  | "finished";

export type InvalidReason =
  | "duplicate_slot"
  | "timeout"
  | "stuck"
  | "missing_landing"
  | "interrupted"
  | "physics_error";

/** One physics landing report: which ball came to rest in which slot. */
export interface LandingEvent {
  playerId: PlayerId;
  slotIndex: number;
}

/** What the physics engine reports when an attempt ends. It never contains prize data. */
export interface AttemptOutcome {
  /** Round + attempt token the outcome belongs to (prevents stale/duplicate events). */
  roundNumber: number;
  attempt: number;
  landings: LandingEvent[];
  /** Set when the engine ended the attempt abnormally. */
  failure: "timeout" | "stuck" | "physics_error" | null;
  /** Simulated time in ms. */
  elapsedMs: number;
}

export interface AttemptRecord {
  attempt: number;
  reason: InvalidReason;
  landings: LandingEvent[];
  at: string;
}

/** Where a ball starts (board units). Generated randomly at START ROUND. */
export interface SpawnPoint {
  playerId: PlayerId;
  x: number;
  y: number;
}

export interface ActiveRound {
  roundNumber: number;
  prizeType: PrizeType;
  /** Random ball spawn locked for this round (a retry restores it). Missing in pre-spawn saves. */
  spawn?: SpawnPoint[];
  /** Locked prize arrangement for this round. Never changes after lock. */
  arrangement: PrizeArrangement;
  lockedAt: string;
  /** Current 1-based attempt number. */
  attempt: number;
  /** Log of invalid attempts for this round. */
  invalidAttempts: AttemptRecord[];
}

export interface PlayerRoundResult {
  playerId: PlayerId;
  slotIndex: number;
  prize: PrizeRank;
}

export interface RoundResult {
  roundNumber: number;
  prizeType: PrizeType;
  spawn?: SpawnPoint[];
  arrangement: PrizeArrangement;
  placements: PlayerRoundResult[];
  attempt: number;
  completedAt: string;
}

/**
 * Round setup prepared for the current round before START ROUND, so the slot colors and the
 * ball positions can be shown in advance. START ROUND locks exactly this setup.
 */
export interface PendingArrangement {
  roundNumber: number;
  prizeType: PrizeType;
  arrangement: PrizeArrangement;
  /** Random ball spawn shown before START ROUND (absent in older saves). */
  spawn?: SpawnPoint[];
}

export interface GameSession {
  schemaVersion: 1;
  id: string;
  createdAt: string;
  updatedAt: string;
  status: GameStatus;
  /** 1..60 */
  currentRound: number;
  roundConfigs: RoundConfig[];
  activeRound: ActiveRound | null;
  /** Arrangement shown before START ROUND (absent in older saves). */
  pendingArrangement?: PendingArrangement | null;
  invalidReason: InvalidReason | null;
  results: RoundResult[];
  playerStats: PlayerStats[];
  /** Total invalid attempts across the session. */
  totalRetries: number;
}

export type GameErrorCode =
  | "invalid_transition"
  | "invalid_round_config"
  | "invalid_prize_arrangement"
  | "round_out_of_range"
  | "round_already_recorded"
  | "stale_attempt"
  | "locked_round_edit";

export type TransitionResult =
  | { ok: true; session: GameSession }
  | { ok: false; error: GameErrorCode };
