import type { Dictionary } from "./en";
import type { Player } from "@/types/player";
import type { PrizeRank, PrizeType } from "@/types/prize";

/** Fill `{name}` placeholders in a dictionary string. */
export function format(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => values[key] ?? match);
}

export function rankLabel(t: Dictionary, rank: PrizeRank): string {
  return rank === 1 ? t.prize.rank1 : rank === 2 ? t.prize.rank2 : t.prize.rank3;
}

export function typeLabel(t: Dictionary, type: PrizeType): string {
  return t.round.typeLabels[type];
}

export function typeDescription(t: Dictionary, type: PrizeType): string {
  return t.round.typeDescs[type];
}

export function playerName(t: Dictionary, player: Player): string {
  return `${t.players.player} ${player.number} · ${t.players[player.id]}`;
}
