/**
 * Platform game registry. Each game is self-contained and mounted at its own route.
 * Add a new game by giving it a route under app/, a dictionary entry under `games`,
 * and an entry here.
 */
import type { ShapeKind } from "@/types/player";

export type GameId = "plinko";

export interface GameEntry {
  id: GameId;
  href: string;
  /** Geometric mark used on the lobby card. */
  symbol: ShapeKind;
  accent: string;
}

export const GAMES: readonly GameEntry[] = [{ id: "plinko", href: "/plinko", symbol: "circle", accent: "#ff2b78" }];

/** Empty, locked cards shown in the lobby for games still to come. */
export const UPCOMING_GAME_SLOTS = 2;
