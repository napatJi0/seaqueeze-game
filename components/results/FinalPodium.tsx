"use client";

import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { getPlayer } from "@/config/players";
import { TOTAL_ROUNDS } from "@/config/rounds";
import { useT } from "@/hooks/usePreferences";
import { computePodium, type PodiumEntry } from "@/lib/game-engine/statistics";
import type { GameSession } from "@/types/game";
import { PlayerSymbol } from "@/components/players/PlayerSymbol";
import { Button } from "@/components/ui/Button";
import { PlayerStatistics } from "./PlayerStatistics";

const STEP_HEIGHT: Record<number, string> = { 1: "h-44 sm:h-56", 2: "h-32 sm:h-40", 3: "h-24 sm:h-28", 4: "h-16 sm:h-20" };

export function FinalPodium({ session, onReset }: { session: GameSession; onReset: () => void }) {
  const t = useT();
  const entries = computePodium(session.playerStats);
  const allTied = entries.every((e) => e.position === 1);
  // Classic podium order: 2nd, 1st, 3rd, 4th (by sorted index; shared places keep their numbers).
  const visualOrder = [entries[1], entries[0], entries[2], entries[3]].filter((e): e is PodiumEntry => Boolean(e));

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="mx-auto flex w-full max-w-6xl flex-col items-center gap-6 px-4 py-6 sm:py-10"
      aria-labelledby="podium-title"
    >
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.5em] text-pink">{t.podium.completed}</p>
        <h2 id="podium-title" className="font-display neon-text mt-2 text-5xl text-white sm:text-7xl">
          {t.podium.title}
        </h2>
        <p className="tabular mt-2 text-sm uppercase tracking-[0.2em] text-muted">
          {t.podium.roundsPlayed}: {session.results.length} / {TOTAL_ROUNDS}
        </p>
        {allTied ? <p className="mt-2 text-sm text-white">{t.podium.allTied}</p> : null}
      </div>

      <div className="flex w-full max-w-3xl items-end justify-center gap-2 sm:gap-4">
        {visualOrder.map((e, i) => {
          const p = getPlayer(e.stats.playerId);
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + (3 - Math.min(e.position, 3)) * 0.35 + i * 0.05, type: "spring", damping: 16 }}
              className="flex min-w-0 flex-1 flex-col items-center gap-2"
            >
              <PlayerSymbol kind={p.symbol} color={p.color} size={e.position === 1 ? 64 : 44} strokeWidth={2.6} title={t.players[p.id]} />
              <p className="truncate text-sm font-bold uppercase tracking-[0.1em]" style={{ color: p.color }}>
                {t.players[p.id]}
              </p>
              <p className="tabular text-[11px] text-muted">
                {t.stats.rank1} {e.stats.rank1} · {t.stats.rank2} {e.stats.rank2} · {t.stats.rank3} {e.stats.rank3}
              </p>
              <div
                className={`relative flex w-full flex-col items-center justify-start border-t-4 bg-gradient-to-b from-[#232326] to-[#111113] pt-2 ${STEP_HEIGHT[Math.min(e.position, 4)]}`}
                style={{ borderTopColor: p.color, boxShadow: e.position === 1 ? `0 0 50px -10px ${p.color}` : undefined }}
              >
                <span className="font-display text-4xl text-white sm:text-6xl">{e.position}</span>
                {e.shared ? <span className="text-[10px] uppercase tracking-[0.2em] text-muted">{t.podium.shared}</span> : null}
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="panel w-full max-w-3xl p-4">
        <PlayerStatistics entries={entries} />
        <p className="mt-3 text-xs text-muted">
          <strong className="uppercase tracking-[0.12em] text-white/80">{t.podium.ruleTitle}:</strong> {t.podium.rule}
        </p>
      </div>

      <Button variant="danger" icon={<Trash2 size={16} />} onPress={onReset}>
        {t.podium.newGame}
      </Button>
    </motion.section>
  );
}
