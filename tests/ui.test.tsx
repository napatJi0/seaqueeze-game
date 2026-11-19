// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { controlAvailability, GameControls } from "@/components/game/GameControls";
import { PlayerCard } from "@/components/players/PlayerCard";
import { PrizeSlots } from "@/components/plinko/PrizeSlots";
import { PLAYERS } from "@/config/players";
import { createSession } from "@/lib/game-engine/game-state";
import { gameStore } from "@/stores/game-store";
import { preferencesStore } from "@/stores/preferences-store";
import { sessionCompletedThrough, testClock } from "./helpers";

const base = { hydrated: true, paused: false, busy: false, saveState: "saved" };

describe("operator control availability", () => {
  it("idle: only start, config, reset", () => {
    expect(controlAvailability({ ...base, status: "idle" })).toEqual({
      start: true, shuffle: true, retry: false, next: false, pause: false, resume: false, reset: true, config: true,
    });
  });
  it("simulating: only pause", () => {
    expect(controlAvailability({ ...base, status: "simulating" })).toEqual({
      start: false, shuffle: false, retry: false, next: false, pause: true, resume: false, reset: false, config: false,
    });
  });
  it("paused: resume and reset", () => {
    const c = controlAvailability({ ...base, status: "simulating", paused: true });
    expect([c.resume, c.pause, c.reset]).toEqual([true, false, true]);
  });
  it("invalid: retry only (no next)", () => {
    const c = controlAvailability({ ...base, status: "invalid" });
    expect([c.retry, c.next, c.start]).toEqual([true, false, false]);
  });
  it("completed: next only once saved", () => {
    expect(controlAvailability({ ...base, status: "completed" }).next).toBe(true);
    expect(controlAvailability({ ...base, status: "completed", saveState: "saving" }).next).toBe(false);
    expect(controlAvailability({ ...base, status: "completed", saveState: "error" }).next).toBe(false);
  });
  it("nothing works before hydration", () => {
    expect(Object.values(controlAvailability({ ...base, status: "idle", hydrated: false })).some(Boolean)).toBe(false);
  });
});

describe("UI rendering", () => {
  beforeEach(() => {
    gameStore.setState({ session: createSession(undefined, testClock), hydrated: true, saveState: "saved", paused: false });
    preferencesStore.setState({ language: "th" });
  });
  afterEach(cleanup);

  it("shows all four players in Thai and English", () => {
    const { rerender } = render(
      <>{PLAYERS.map((p) => <PlayerCard key={p.id} player={p} />)}</>,
    );
    for (const name of ["วงกลม", "สามเหลี่ยม", "ดาว", "ร่ม"]) expect(screen.getByText(name)).toBeTruthy();
    act(() => preferencesStore.setState({ language: "en" }));
    rerender(<>{PLAYERS.map((p) => <PlayerCard key={p.id} player={p} />)}</>);
    for (const name of ["Circle", "Triangle", "Star", "Umbrella"]) expect(screen.getByText(name)).toBeTruthy();
  });

  it("prize slots are color-filled before START ROUND, without rank labels, and START keeps them", () => {
    act(() => preferencesStore.setState({ language: "en" }));
    const { rerender } = render(<PrizeSlots height={80} />);
    const shown = gameStore.getState().session!.pendingArrangement!.arrangement;
    const before = screen.getAllByRole("img", { name: /^Slot \d: Rank [123]$/ });
    expect(before).toHaveLength(4);
    before.forEach((el, i) => expect(el.getAttribute("aria-label")).toBe(`Slot ${i + 1}: Rank ${shown[i]}`));
    expect(screen.queryByText(/Rank/)).toBeNull(); // no visible labels
    act(() => {
      gameStore.getState().startRound();
    });
    rerender(<PrizeSlots height={80} />);
    expect(gameStore.getState().session!.activeRound!.arrangement).toEqual(shown);
    screen
      .getAllByRole("img", { name: /^Slot \d: Rank [123]$/ })
      .forEach((el, i) => expect(el.getAttribute("aria-label")).toBe(`Slot ${i + 1}: Rank ${shown[i]}`));
  });

  it("after a valid round each slot shows the player who landed there", () => {
    act(() => {
      gameStore.setState({ session: sessionCompletedThrough(1) });
      preferencesStore.setState({ language: "en" });
    });
    render(<PrizeSlots height={80} />);
    expect(screen.getAllByRole("img", { name: /^Slot \d: Rank [13] · (Circle|Triangle|Star|Umbrella)$/ })).toHaveLength(4);
  });

  it("controls follow game state and START ROUND starts the countdown", () => {
    act(() => preferencesStore.setState({ language: "en" }));
    render(<GameControls onOpenConfig={() => undefined} onOpenReset={() => undefined} />);
    const start = screen.getByRole("button", { name: /START ROUND/ }) as HTMLButtonElement;
    const retry = screen.getByRole("button", { name: /RETRY ROUND/ }) as HTMLButtonElement;
    expect(start.disabled).toBe(false);
    expect(retry.disabled).toBe(true);
    fireEvent.click(start);
    fireEvent.click(start);
    expect(gameStore.getState().session!.status).toBe("countdown");
    expect(start.disabled).toBe(true);
    expect((screen.getByRole("button", { name: /PAUSE/ }) as HTMLButtonElement).disabled).toBe(false);
  });
});
