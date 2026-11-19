"use client";

import { motion } from "framer-motion";
import { getPlayer } from "@/config/players";
import { PRIZE_RANK_COLORS, SLOT_COUNT } from "@/config/prizes";
import { useGame } from "@/hooks/useGame";
import { useT } from "@/hooks/usePreferences";
import { rankLabel } from "@/lib/i18n/labels";
import { PlayerSymbol } from "@/components/players/PlayerSymbol";

/**
 * The four prize slots under the board. Each is filled with its prize color (Rank 1 yellow,
 * Rank 2 green, Rank 3 light pink) with no rank label, already before START ROUND.
 * After a valid landing, the symbol of the player who landed there appears on it.
 */
export function PrizeSlots({ height }: { height: number }) {
  const t = useT();
  const session = useGame((s) => s.session);
  if (!session) return null;

  const status = session.status;
  // Before START ROUND: the prepared arrangement of the waiting round; after: the locked one.
  const pending = session.pendingArrangement;
  const arrangement =
    session.activeRound?.arrangement ??
    (status === "idle" && pending && pending.roundNumber === session.currentRound ? pending.arrangement : null);
  const result =
    status === "revealing" || status === "completed"
      ? session.results.find((r) => r.roundNumber === session.currentRound)
      : undefined;

  return (
    <div className="grid grid-cols-4 gap-px border-t border-line bg-line" style={{ height }} aria-label={t.prize.slot}>
      {Array.from({ length: SLOT_COUNT }, (_, i) => {
        const rank = arrangement?.[i];
        const color = rank ? PRIZE_RANK_COLORS[rank] : null;
        const placement = result?.placements.find((p) => p.slotIndex === i);
        const player = placement ? getPlayer(placement.playerId) : null;
        return (
          <motion.div
            key={i}
            role="img"
            aria-label={`${t.prize.slot} ${i + 1}${rank ? `: ${rankLabel(t, rank)}` : ""}${player ? ` · ${t.players[player.id]}` : ""}`}
            initial={false}
            animate={{ backgroundColor: color ?? "#0e0e10" }}
            transition={{ duration: 0.6 }}
            className="grid place-items-center"
            style={color ? { boxShadow: `inset 0 0 24px rgba(0,0,0,0.25), 0 0 24px -6px ${color}` } : undefined}
          >
            {player ? (
              <motion.span
                key={`${result?.roundNumber}-${player.id}`}
                initial={{ opacity: 0, scale: 0.4 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 16 }}
              >
                <PlayerSymbol kind={player.symbol} color="#0a0a0a" size={Math.max(16, height * 0.5)} strokeWidth={3} />
              </motion.span>
            ) : null}
          </motion.div>
        );
      })}
    </div>
  );
}
