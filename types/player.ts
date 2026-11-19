/**
 * Permanent player IDs (stored in saved sessions and results — never rename).
 * Players 3 ("square") and 4 ("hexagon") now carry the star and umbrella cookie symbols.
 */
export type PlayerId = "circle" | "triangle" | "square" | "hexagon";

/** Cookie symbol engraved on a player's ball. */
export type PlayerSymbolKind = "circle" | "triangle" | "star" | "umbrella";

/** Every shape the UI can draw: player symbols plus decorative geometric marks. */
export type ShapeKind = PlayerSymbolKind | "square" | "hexagon";

export interface Player {
  /** Permanent player identifier. */
  id: PlayerId;
  /** 1-based, permanent seat number. */
  number: 1 | 2 | 3 | 4;
  symbol: PlayerSymbolKind;
  /** Permanent ball / identity color. */
  color: string;
  /** Darker companion tone used for ball shading. */
  colorDeep: string;
  /** Unique physics ball identifier. */
  ballId: string;
}

export interface PlayerStats {
  playerId: PlayerId;
  rank1: number;
  rank2: number;
  rank3: number;
  total: number;
  roundsCompleted: number;
}
