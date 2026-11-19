import type { Player, PlayerId } from "@/types/player";

/** The four fixed players. Order is permanent (Player 1 → Player 4). */
export const PLAYERS: readonly Player[] = [
  { id: "circle", number: 1, symbol: "circle", color: "#ff4d91", colorDeep: "#a3134f", ballId: "ball-circle" },
  { id: "triangle", number: 2, symbol: "triangle", color: "#4ade80", colorDeep: "#15803d", ballId: "ball-triangle" },
  // IDs are permanent (saved data); the displayed symbols follow the dalgona cookie set.
  { id: "square", number: 3, symbol: "star", color: "#ef4444", colorDeep: "#991b1b", ballId: "ball-square" },
  { id: "hexagon", number: 4, symbol: "umbrella", color: "#facc15", colorDeep: "#a16207", ballId: "ball-hexagon" },
] as const;

export const PLAYER_IDS: readonly PlayerId[] = PLAYERS.map((p) => p.id);

export const PLAYER_COUNT = 4 as const;

export function getPlayer(id: PlayerId): Player {
  const player = PLAYERS.find((p) => p.id === id);
  if (!player) throw new Error(`Unknown player: ${id}`);
  return player;
}
