"use client";

import { motion } from "framer-motion";
import { getPlayer } from "@/config/players";
import { useT } from "@/hooks/usePreferences";
import { pad2 } from "@/lib/i18n";
import { playerName, rankLabel } from "@/lib/i18n/labels";
import type { RoundResult } from "@/types/game";
import { PlayerSymbol } from "@/components/players/PlayerSymbol";
import { PrizeBadge } from "./PrizeBadge";

/** Result summary for a completed round: player → slot → prize rank. */
export function PrizeReveal({ result }: { result: RoundResult }) {
  const t = useT();
  return (
    <section aria-live="polite" className="space-y-2">
      <h3 className="text-xs uppercase tracking-[0.2em] text-muted">
        {t.reveal.summary} · {t.round.label} {pad2(result.roundNumber)}
      </h3>
      <ul className="space-y-1.5">
        {result.placements.map((p, i) => {
          const player = getPlayer(p.playerId);
          return (
            <motion.li
              key={p.playerId}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 + i * 0.08 }}
              className="flex items-center gap-2 bg-white/[0.04] px-2 py-1.5"
            >
              <PlayerSymbol kind={player.symbol} color={player.color} size={20} title={playerName(t, player)} />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold" style={{ color: player.color }}>
                {t.players[player.id]}
              </span>
              <span className="tabular text-xs text-muted">
                {t.reveal.landedIn} {p.slotIndex + 1}
              </span>
              <PrizeBadge rank={p.prize} label={rankLabel(t, p.prize)} size="sm" />
            </motion.li>
          );
        })}
      </ul>
    </section>
  );
}
