"use client";

import { useStore } from "zustand";
import { gameStore, type GameStoreState } from "@/stores/game-store";

/** Select a slice of the คุกกี้เสี่ยงทาย (Plinko) game store. */
export function useGame<T>(selector: (s: GameStoreState) => T): T {
  return useStore(gameStore, selector);
}
