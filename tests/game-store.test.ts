import { describe, expect, it } from "vitest";
import { MemoryGameRepository, type GameRepository } from "@/lib/storage/persistence";
import { createGameStore } from "@/stores/game-store";
import { duplicateLandings, seeded, testClock, uniqueLandings } from "./helpers";
import type { LandingEvent } from "@/types/game";

async function setup(repository: GameRepository = new MemoryGameRepository()) {
  const store = createGameStore({ repository, random: seeded(1), clock: testClock });
  await store.getState().hydrate();
  return { store, repository };
}

function finishAttempt(store: Awaited<ReturnType<typeof setup>>["store"], landings: LandingEvent[]) {
  const a = store.getState().session!.activeRound!;
  return store.getState().submitAttempt({ roundNumber: a.roundNumber, attempt: a.attempt, landings, failure: null, elapsedMs: 1 });
}

describe("game store", () => {
  it("full round flow with manual retry and persisted completion", async () => {
    const { store, repository } = await setup();
    const s = store.getState();
    expect(s.startRound()).toBe(true);
    expect(s.startRound()).toBe(false); // double click
    const arrangement = store.getState().session!.activeRound!.arrangement;
    expect(s.releaseBalls()).toBe(true);
    expect(s.releaseBalls()).toBe(false);

    expect(finishAttempt(store, duplicateLandings)).toBe(true);
    expect(store.getState().session!.status).toBe("invalid");
    expect(store.getState().nextRound()).toBe(false);

    expect(store.getState().retryRound()).toBe(true);
    expect(store.getState().session!.activeRound!.arrangement).toEqual(arrangement);
    store.getState().releaseBalls();
    expect(finishAttempt(store, uniqueLandings)).toBe(true);
    expect(store.getState().finishReveal()).toBe(true);
    await store.getState().flush();
    expect(store.getState().saveState).toBe("saved");

    const saved = (await repository.loadActiveSession()) as { results: unknown[]; status: string };
    expect(saved.results).toHaveLength(1);
    expect(saved.status).toBe("completed");

    expect(store.getState().nextRound()).toBe(true);
    expect(store.getState().session!.currentRound).toBe(2);
  });

  it("NEXT ROUND is blocked until the result has been saved", async () => {
    let fail = false;
    const inner = new MemoryGameRepository();
    const repo: GameRepository = {
      loadActiveSession: () => inner.loadActiveSession(),
      saveSession: async (s) => {
        if (fail) throw new Error("disk full");
        return inner.saveSession(s);
      },
      loadResults: (id) => inner.loadResults(id),
      deleteSession: (id) => inner.deleteSession(id),
    };
    const { store } = await setup(repo);
    store.getState().startRound();
    store.getState().releaseBalls();
    fail = true;
    finishAttempt(store, uniqueLandings);
    store.getState().finishReveal();
    await store.getState().flush();
    expect(store.getState().saveState).toBe("error");
    expect(store.getState().nextRound()).toBe(false);
    fail = false;
    await store.getState().retrySave();
    expect(store.getState().saveState).toBe("saved");
    expect(store.getState().nextRound()).toBe(true);
  });

  it("pause / resume only during an active drop; release waits while paused", async () => {
    const { store } = await setup();
    expect(store.getState().pause()).toBe(false);
    store.getState().startRound();
    expect(store.getState().pause()).toBe(true);
    expect(store.getState().releaseBalls()).toBe(false);
    expect(store.getState().resume()).toBe(true);
    expect(store.getState().releaseBalls()).toBe(true);
  });

  it("recovers an interrupted round after a reload", async () => {
    const repository = new MemoryGameRepository();
    const { store } = await setup(repository);
    store.getState().startRound();
    store.getState().releaseBalls();
    await store.getState().flush();
    const arrangement = store.getState().session!.activeRound!.arrangement;

    const { store: reloaded } = await setup(repository);
    const s = reloaded.getState().session!;
    expect(s.status).toBe("invalid");
    expect(s.invalidReason).toBe("interrupted");
    expect(s.activeRound!.arrangement).toEqual(arrangement);
    expect(reloaded.getState().notice).toBe("interrupted");
    expect(reloaded.getState().retryRound()).toBe(true);
  });

  it("reset creates a new session and keeps the round configuration", async () => {
    const { store } = await setup();
    store.getState().saveRoundConfigs(store.getState().session!.roundConfigs.map((c) => ({ ...c, prizeType: "B" as const })));
    const oldId = store.getState().session!.id;
    await store.getState().resetGame();
    const s = store.getState().session!;
    expect(s.id).not.toBe(oldId);
    expect(s.results).toHaveLength(0);
    expect(s.roundConfigs.every((c) => c.prizeType === "B")).toBe(true);
  });
});
