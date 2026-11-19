"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { useGame } from "@/hooks/useGame";
import { useT } from "@/hooks/usePreferences";
import { gameStore } from "@/stores/game-store";

const STEP_MS = 1000;

/**
 * 3 · 2 · 1 · DROP. Mount with a key per attempt so every attempt counts down afresh.
 * Pausing freezes the countdown. At zero it asks the store to release all balls.
 */
export function Countdown() {
  const t = useT();
  const paused = useGame((s) => s.paused);
  const [n, setN] = useState(3);

  useEffect(() => {
    if (paused) return;
    const id = window.setTimeout(
      () => {
        if (n > 0) setN(n - 1);
        else gameStore.getState().releaseBalls();
      },
      n > 0 ? STEP_MS : 350,
    );
    return () => window.clearTimeout(id);
  }, [n, paused]);

  const label = n > 0 ? String(n) : t.countdown.release;

  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/35" aria-live="assertive">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={label}
          initial={{ opacity: 0, scale: 1.8, filter: "blur(8px)" }}
          animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.6, filter: "blur(6px)" }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="font-display neon-text select-none leading-none text-white"
          style={{ fontSize: n > 0 ? "clamp(6rem, 28cqw, 16rem)" : "clamp(3rem, 14cqw, 8rem)" }}
        >
          {label}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}
