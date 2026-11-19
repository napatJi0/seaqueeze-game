import { PLAYER_IDS } from "@/config/players";
import {
  createSession,
  finishReveal,
  nextRound,
  releaseBalls,
  startRound,
  submitAttempt,
  type Clock,
} from "@/lib/game-engine/game-state";
import type { RandomSource } from "@/lib/random";
import type { AttemptOutcome, GameSession, LandingEvent, TransitionResult } from "@/types/game";

let tick = 0;
export const testClock: Clock = { now: () => new Date(Date.UTC(2026, 0, 1) + tick++ * 1000).toISOString() };

/** Deterministic PRNG (mulberry32) for reproducible shuffles. */
export function seeded(seed: number): RandomSource {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function unwrap(r: TransitionResult): GameSession {
  if (!r.ok) throw new Error(`transition failed: ${r.error}`);
  return r.session;
}

export const uniqueLandings: LandingEvent[] = PLAYER_IDS.map((playerId, i) => ({ playerId, slotIndex: i }));
export const duplicateLandings: LandingEvent[] = [
  { playerId: "circle", slotIndex: 0 },
  { playerId: "triangle", slotIndex: 0 },
  { playerId: "square", slotIndex: 2 },
  { playerId: "hexagon", slotIndex: 3 },
];

export function outcomeFor(s: GameSession, landings: LandingEvent[], failure: AttemptOutcome["failure"] = null): AttemptOutcome {
  const a = s.activeRound;
  if (!a) throw new Error("no active round");
  return { roundNumber: a.roundNumber, attempt: a.attempt, landings, failure, elapsedMs: 5000 };
}

/** Play the current round to "completed" with a valid landing. */
export function playRound(s: GameSession, random: RandomSource = seeded(1)): GameSession {
  let x = unwrap(startRound(s, random, testClock));
  x = unwrap(releaseBalls(x, testClock));
  x = unwrap(submitAttempt(x, outcomeFor(x, uniqueLandings), testClock));
  return unwrap(finishReveal(x, testClock));
}

/** Session at "completed" state of round n. */
export function sessionCompletedThrough(n: number): GameSession {
  let s = createSession(undefined, testClock, "test-session");
  for (let r = 1; r <= n; r++) {
    s = playRound(s, seeded(r));
    if (r < n) s = unwrap(nextRound(s, testClock));
  }
  return s;
}
