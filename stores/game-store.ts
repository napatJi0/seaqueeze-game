/**
 * Global game store (Zustand).
 *
 * Holds the persisted GameSession plus UI/runtime flags. All rule logic lives in
 * lib/game-engine/game-state.ts; this store only applies guarded transitions,
 * serializes persistence and exposes status to the UI.
 *
 * High-frequency physics data (ball coordinates) is never stored here.
 */
import { createStore, type StoreApi } from "zustand/vanilla";
import {
  finishReveal as finishRevealTransition,
  markInterrupted,
  nextRound as nextRoundTransition,
  releaseBalls as releaseBallsTransition,
  resetSession,
  retryRound as retryRoundTransition,
  shuffleSpawn,
  startRound as startRoundTransition,
  submitAttempt as submitAttemptTransition,
  systemClock,
  updateRoundConfigs,
  type Clock,
} from "@/lib/game-engine/game-state";
import { secureRandom, type RandomSource } from "@/lib/random";
import { isIndexedDbAvailable } from "@/lib/storage/database";
import { IndexedDbGameRepository, MemoryGameRepository, type GameRepository } from "@/lib/storage/persistence";
import { recoverSession, type RecoveryNotice } from "@/lib/storage/recovery";
import type { AttemptOutcome, GameErrorCode, GameSession, TransitionResult } from "@/types/game";

export type SaveState = "idle" | "saving" | "saved" | "error";
export type StoreNotice = RecoveryNotice | "storageUnavailable" | "configSaved";
export type StoreError = GameErrorCode | "physicsInit";

export interface GameStoreState {
  session: GameSession | null;
  hydrated: boolean;
  paused: boolean;
  busy: boolean;
  saveState: SaveState;
  notice: StoreNotice | null;
  error: StoreError | null;

  hydrate(): Promise<void>;
  startRound(): boolean;
  /** Before START ROUND: draw new random ball positions (prize colors unchanged). */
  shuffleBalls(): boolean;
  releaseBalls(): boolean;
  submitAttempt(outcome: AttemptOutcome): boolean;
  finishReveal(): boolean;
  retryRound(): boolean;
  nextRound(): boolean;
  pause(): boolean;
  resume(): boolean;
  saveRoundConfigs(configs: readonly unknown[]): TransitionResult;
  /**
   * The game screen is leaving while balls are in play (navigation away, unmount).
   * The drop cannot continue without its physics world: mark it interrupted, keep the
   * locked prizes, and require RETRY ROUND — exactly like a page refresh.
   */
  interruptActiveRound(): boolean;
  resetGame(): Promise<void>;
  retrySave(): Promise<void>;
  /** Resolves when all queued saves have settled. */
  flush(): Promise<void>;
  reportError(error: StoreError): void;
  dismissNotice(): void;
  dismissError(): void;
}

export interface GameStoreDeps {
  repository?: GameRepository;
  random?: RandomSource;
  clock?: Clock;
}

function defaultRepository(): { repo: GameRepository; available: boolean } {
  if (isIndexedDbAvailable()) return { repo: new IndexedDbGameRepository(), available: true };
  return { repo: new MemoryGameRepository(), available: false };
}

export function createGameStore(deps: GameStoreDeps = {}): StoreApi<GameStoreState> {
  const random = deps.random ?? secureRandom;
  const clock = deps.clock ?? systemClock;
  let repo: GameRepository | null = deps.repository ?? null;
  let storageAvailable = true;
  let saveChain: Promise<void> = Promise.resolve();
  let saveSeq = 0;
  let hydrating: Promise<void> | null = null;

  const getRepo = (): GameRepository => {
    if (!repo) {
      const d = defaultRepository();
      repo = d.repo;
      storageAvailable = d.available;
    }
    return repo;
  };

  return createStore<GameStoreState>()((set, get) => {
    /** Queue a save of the given snapshot; saves run strictly in order. */
    const persist = (session: GameSession): Promise<void> => {
      set({ saveState: "saving" });
      const snapshot = structuredClone(session);
      const seq = ++saveSeq;
      saveChain = saveChain
        .catch(() => undefined)
        .then(async () => {
          try {
            await getRepo().saveSession(snapshot);
            // Only the most recent snapshot decides the visible save state.
            if (seq === saveSeq) set({ saveState: "saved" });
          } catch {
            if (seq === saveSeq) set({ saveState: "error" });
          }
        });
      return saveChain;
    };

    /** Apply a transition result: update state + persist. Returns success. */
    const apply = (result: TransitionResult, silentErrors: GameErrorCode[] = ["invalid_transition", "stale_attempt"]): boolean => {
      if (!result.ok) {
        if (!silentErrors.includes(result.error)) set({ error: result.error });
        return false;
      }
      set({ session: result.session });
      void persist(result.session);
      return true;
    };

    const withSession = (fn: (s: GameSession) => TransitionResult): TransitionResult => {
      const s = get().session;
      if (!s || !get().hydrated) return { ok: false, error: "invalid_transition" };
      return fn(s);
    };

    return {
      session: null,
      hydrated: false,
      paused: false,
      busy: false,
      saveState: "idle",
      notice: null,
      error: null,

      hydrate() {
        if (hydrating) return hydrating;
        hydrating = (async () => {
          let raw: unknown = null;
          let notice: StoreNotice | null = null;
          try {
            raw = await getRepo().loadActiveSession();
          } catch {
            // IndexedDB failed to open: fall back to memory for this tab.
            repo = new MemoryGameRepository();
            storageAvailable = false;
          }
          const recovered = recoverSession(raw, clock);
          if (!storageAvailable) notice = "storageUnavailable";
          else if (recovered.notice !== "new" && recovered.notice !== "restored") notice = recovered.notice;
          set({ session: recovered.session, hydrated: true, notice, paused: false });
          if (recovered.changed) await persist(recovered.session);
          else set({ saveState: "saved" });
        })();
        return hydrating;
      },

      startRound() {
        if (get().busy) return false;
        return apply(withSession((s) => startRoundTransition(s, random, clock)));
      },

      shuffleBalls() {
        if (get().busy) return false;
        return apply(withSession((s) => shuffleSpawn(s, random, clock)));
      },

      releaseBalls() {
        if (get().paused) return false;
        return apply(withSession((s) => releaseBallsTransition(s, clock)));
      },

      submitAttempt(outcome) {
        const ok = apply(withSession((s) => submitAttemptTransition(s, outcome, clock)));
        if (ok) set({ paused: false });
        return ok;
      },

      finishReveal() {
        return apply(withSession((s) => finishRevealTransition(s, clock)));
      },

      retryRound() {
        if (get().busy) return false;
        return apply(withSession((s) => retryRoundTransition(s, clock)));
      },

      nextRound() {
        // A round is complete only once its result has been persisted.
        if (get().busy || get().saveState !== "saved") return false;
        return apply(withSession((s) => nextRoundTransition(s, clock, random)));
      },

      pause() {
        const status = get().session?.status;
        if (get().paused || (status !== "countdown" && status !== "simulating")) return false;
        set({ paused: true });
        return true;
      },

      resume() {
        if (!get().paused) return false;
        set({ paused: false });
        return true;
      },

      saveRoundConfigs(configs) {
        const result = withSession((s) => updateRoundConfigs(s, configs, clock, random));
        if (apply(result, [])) set({ notice: "configSaved" });
        return result;
      },

      interruptActiveRound() {
        const s = get().session;
        if (!s || (s.status !== "countdown" && s.status !== "simulating" && s.status !== "validating")) return false;
        const next = markInterrupted(s, clock);
        set({ session: next, paused: false, notice: "interrupted" });
        void persist(next);
        return true;
      },

      async resetGame() {
        const current = get().session;
        if (!current || get().busy) return;
        set({ busy: true, paused: false });
        try {
          await saveChain.catch(() => undefined);
          const fresh = resetSession(current, clock);
          set({ session: fresh, error: null, notice: null });
          await persist(fresh);
          try {
            await getRepo().deleteSession(current.id);
          } catch {
            // Old data stays orphaned but inactive; the new session is authoritative.
          }
        } finally {
          set({ busy: false });
        }
      },

      async retrySave() {
        const s = get().session;
        if (s) await persist(s);
      },

      flush() {
        return saveChain.catch(() => undefined);
      },

      reportError(error) {
        set({ error });
      },

      dismissNotice() {
        set({ notice: null });
      },

      dismissError() {
        set({ error: null });
      },
    };
  });
}

/** Application singleton. */
export const gameStore = createGameStore();
