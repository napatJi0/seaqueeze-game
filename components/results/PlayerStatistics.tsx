"use client";

import { getPlayer } from "@/config/players";
import { useT } from "@/hooks/usePreferences";
import type { PodiumEntry } from "@/lib/game-engine/statistics";
import { PlayerSymbol } from "@/components/players/PlayerSymbol";

export function PlayerStatistics({ entries }: { entries: PodiumEntry[] }) {
  const t = useT();
  return (
    <div className="overflow-x-auto">
      <table className="tabular w-full min-w-[420px] border-collapse text-sm">
        <caption className="pb-2 text-left text-xs uppercase tracking-[0.2em] text-muted">{t.podium.statistics}</caption>
        <thead>
          <tr className="border-b border-line text-left text-xs uppercase tracking-[0.12em] text-muted">
            <th scope="col" className="py-2 pr-2">{t.podium.position}</th>
            <th scope="col" className="py-2 pr-2">{t.players.heading}</th>
            <th scope="col" className="py-2 text-right">{t.prize.rank1}</th>
            <th scope="col" className="py-2 text-right">{t.prize.rank2}</th>
            <th scope="col" className="py-2 text-right">{t.prize.rank3}</th>
            <th scope="col" className="py-2 text-right">{t.prize.total}</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => {
            const p = getPlayer(e.stats.playerId);
            return (
              <tr key={p.id} className="border-b border-line/60">
                <td className="py-2 pr-2 font-display text-lg">
                  {e.position}
                  {e.shared ? <span className="ml-1 font-sans text-[10px] uppercase text-muted">{t.podium.shared}</span> : null}
                </td>
                <th scope="row" className="py-2 pr-2 text-left font-semibold" style={{ color: p.color }}>
                  <span className="flex items-center gap-2">
                    <PlayerSymbol kind={p.symbol} color={p.color} size={18} /> {t.players[p.id]}
                  </span>
                </th>
                <td className="py-2 text-right">{e.stats.rank1}</td>
                <td className="py-2 text-right">{e.stats.rank2}</td>
                <td className="py-2 text-right">{e.stats.rank3}</td>
                <td className="py-2 text-right font-bold">{e.stats.total}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
