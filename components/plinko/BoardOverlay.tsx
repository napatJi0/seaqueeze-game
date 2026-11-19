"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, Pause } from "lucide-react";
import { PLAYERS } from "@/config/players";
import { useGame } from "@/hooks/useGame";
import { useT } from "@/hooks/usePreferences";
import { pad2 } from "@/lib/i18n";
import { typeDescription, typeLabel } from "@/lib/i18n/labels";
import { getRoundConfig } from "@/lib/round-manager/round-config";
import { Countdown } from "@/components/game/Countdown";
import { PlayerSymbol } from "@/components/players/PlayerSymbol";

/** Cinematic overlays drawn above the canvas: intro, countdown, pause, invalid, completion. */
export function BoardOverlay() {
  const t = useT();
  const session = useGame((s) => s.session);
  const paused = useGame((s) => s.paused);
  if (!session) return null;

  const { status, currentRound, activeRound } = session;
  const config = getRoundConfig(session.roundConfigs, currentRound);
  const attemptKey = `${currentRound}-${activeRound?.attempt ?? 0}`;
  const lastInvalid = activeRound?.invalidAttempts.at(-1);

  return (
    <div className="pointer-events-none absolute inset-0" style={{ containerType: "inline-size" }}>
      <AnimatePresence>
        {status === "idle" && config ? (
          <motion.div
            key={`intro-${currentRound}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5 }}
            className="absolute inset-x-0 bottom-0 top-[17%] flex flex-col items-center justify-center gap-[3cqw] bg-gradient-to-b from-black/30 via-black/60 to-black/60 text-center"
          >
            <p className="text-[clamp(0.7rem,2.4cqw,1rem)] uppercase tracking-[0.5em] text-pink">{t.status.idle}</p>
            <h2 className="font-display neon-text leading-[0.85] text-white" style={{ fontSize: "clamp(3rem, 19cqw, 10rem)" }}>
              <span className="block text-[0.32em] tracking-[0.3em] text-white/70">{t.round.label}</span>
              {pad2(currentRound)}
            </h2>
            <div className="flex items-center gap-[2.5cqw]">
              {PLAYERS.map((p) => (
                <PlayerSymbol key={p.id} kind={p.symbol} color={p.color} size={28} strokeWidth={3} />
              ))}
            </div>
            {/* <p className="border border-white/20 px-3 py-1 text-[clamp(0.7rem,2.6cqw,1rem)] uppercase tracking-[0.2em] text-white/80">
              {typeLabel(t, config.prizeType)} · {typeDescription(t, config.prizeType)}
            </p> */}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {status === "countdown" ? <Countdown key={attemptKey} /> : null}

      <AnimatePresence>
        {paused ? (
          <motion.div
            key="paused"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 grid place-items-center bg-black/50"
          >
            <div className="flex items-center gap-3 border border-white/30 bg-black/70 px-5 py-3 text-xl font-bold uppercase tracking-[0.3em]">
              <Pause aria-hidden="true" /> {t.status.paused}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {status === "invalid" && lastInvalid ? (
          <motion.div
            key={`invalid-${attemptKey}`}
            role="alert"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute inset-x-[4cqw] top-[18cqw] border border-red bg-black/85 p-[3cqw] text-center shadow-[0_0_40px_-10px_rgba(230,57,70,0.8)]"
          >
            <div className="flex items-center justify-center gap-2 text-red">
              <AlertTriangle aria-hidden="true" />
              <span className="font-display text-[clamp(1.4rem,7cqw,3.2rem)] leading-none tracking-wide">{t.invalid.title}</span>
            </div>
            <p className="mt-2 text-[clamp(0.8rem,2.8cqw,1.1rem)] text-white">{t.invalid[lastInvalid.reason]}</p>
            <p className="mt-1 text-[clamp(0.7rem,2.2cqw,0.9rem)] text-muted">{t.invalid.preserved}</p>
            <p className="mt-2 text-[clamp(0.7rem,2.4cqw,0.95rem)] font-semibold uppercase tracking-[0.15em] text-pink">
              {t.invalid.retryHint}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {status === "revealing" ? (
          <motion.div
            key={`complete-${currentRound}`}
            initial={{ opacity: 0, scale: 1.3 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="absolute inset-x-0 top-[30%] text-center"
          >
            <p className="font-display neon-text text-[clamp(2rem,11cqw,6rem)] leading-none text-white">{t.reveal.title}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
