// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Lobby } from "@/components/platform/Lobby";
import { GAMES, UPCOMING_GAME_SLOTS } from "@/config/games";
import { dictionaries, loadLanguagePreference } from "@/lib/i18n";
import { MemoryGameRepository } from "@/lib/storage/persistence";
import { createGameStore } from "@/stores/game-store";
import { preferencesStore } from "@/stores/preferences-store";
import { seeded, testClock } from "./helpers";

describe("Platform lobby", () => {
  beforeEach(() => preferencesStore.setState({ language: "th" }));
  afterEach(cleanup);

  it("shows the platform name, event and คุกกี้เสี่ยงทาย as a playable game", () => {
    render(<Lobby />);
    expect(screen.getByRole("heading", { level: 1, name: "Platform logo" })).toBeTruthy();
    expect(screen.getAllByText(/Thank You Day FY27/).length).toBeGreaterThan(0);
    const link = screen.getByRole("link", { name: /คุกกี้เสี่ยงทาย/ });
    expect(link.getAttribute("href")).toBe("/plinko");
    expect(screen.getAllByText(dictionaries.th.platform.comingSoon)).toHaveLength(UPCOMING_GAME_SLOTS);
  });

  it("switches language for the whole platform", () => {
    render(<Lobby />);
    expect(screen.getByText(dictionaries.th.platform.chooseGame)).toBeTruthy();
    act(() => preferencesStore.getState().setLanguage("en"));
    expect(screen.getByText(dictionaries.en.platform.chooseGame)).toBeTruthy();
  });

  it("every registered game has a translated title in both languages", () => {
    for (const g of GAMES) {
      expect(dictionaries.th.games[g.id].title.length).toBeGreaterThan(0);
      expect(dictionaries.en.games[g.id].title.length).toBeGreaterThan(0);
    }
  });
});

describe("language preference", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it("defaults to Thai and is shared under the platform key", () => {
    expect(loadLanguagePreference()).toBe("th");
    preferencesStore.getState().setLanguage("en");
    expect(localStorage.getItem("squid-survival:language")).toBe("en");
    expect(loadLanguagePreference()).toBe("en");
  });

  it("still reads the language saved before the platform existed", () => {
    localStorage.setItem("squid-plinko:language", "en");
    expect(loadLanguagePreference()).toBe("en");
  });
});

describe("leaving คุกกี้เสี่ยงทาย mid-drop", () => {
  it("marks the drop interrupted and keeps the locked prizes", async () => {
    const store = createGameStore({ repository: new MemoryGameRepository(), random: seeded(1), clock: testClock });
    await store.getState().hydrate();
    expect(store.getState().interruptActiveRound()).toBe(false); // idle: nothing to interrupt
    store.getState().startRound();
    store.getState().releaseBalls();
    const arrangement = store.getState().session!.activeRound!.arrangement;
    expect(store.getState().interruptActiveRound()).toBe(true);
    const s = store.getState().session!;
    expect(s.status).toBe("invalid");
    expect(s.invalidReason).toBe("interrupted");
    expect(s.activeRound!.arrangement).toEqual(arrangement);
    expect(s.results).toHaveLength(0);
    expect(store.getState().retryRound()).toBe(true);
  });
});
