"use client";

import { useT } from "@/hooks/usePreferences";
import { playerName } from "@/lib/i18n/labels";
import type { Player } from "@/types/player";
import { PlayerSymbol } from "./PlayerSymbol";

/** Player identity only: symbol, number and name. */
export function PlayerCard({ player }: { player: Player }) {
  const t = useT();
  return (
    <article
      aria-label={playerName(t, player)}
      className="panel relative flex min-w-0 items-center gap-3 overflow-hidden p-3 lg:gap-4 lg:p-4"
      style={{ borderLeft: `3px solid ${player.color}` }}
    >
      <div
        className="grid h-12 w-12 shrink-0 place-items-center lg:h-16 lg:w-16"
        style={{ background: `radial-gradient(circle at 35% 30%, ${player.color}33, transparent 70%)` }}
      >
        <PlayerSymbol kind={player.symbol} color={player.color} size={44} strokeWidth={2.6} className="h-9 w-9 lg:h-11 lg:w-11" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[11px] uppercase tracking-[0.18em] text-muted">
          {t.players.player} {String(player.number).padStart(2, "0")}
        </p>
        <p className="truncate text-base font-bold uppercase tracking-[0.08em] lg:text-xl" style={{ color: player.color }}>
          {t.players[player.id]}
        </p>
      </div>
    </article>
  );
}
