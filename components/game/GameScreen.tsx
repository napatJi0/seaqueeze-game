"use client";

import { useEffect, useState } from "react";
import { PLAYERS } from "@/config/players";
import { useGame } from "@/hooks/useGame";
import { useT } from "@/hooks/usePreferences";
import { usePrefersReducedMotion } from "@/hooks/useResponsive";
import { gameStore } from "@/stores/game-store";
import { PlinkoBoard } from "@/components/plinko/PlinkoBoard";
import { PlayerCard } from "@/components/players/PlayerCard";
import { FinalPodium } from "@/components/results/FinalPodium";
import { GameControls } from "./GameControls";
import { GameHeader } from "./GameHeader";
import { Notices } from "./Notices";
import { ResetDialog } from "./ResetDialog";
import { RoundConfigDialog } from "./RoundConfigDialog";
import { StatusPanel } from "./StatusPanel";

const REVEAL_MS = 2800;
const REVEAL_MS_REDUCED = 900;

export function GameScreen() {
  const t = useT();
  const hydrated = useGame((s) => s.hydrated);
  const session = useGame((s) => s.session);
  const reducedMotion = usePrefersReducedMotion();
  const [configOpen, setConfigOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);

  // Restore the persisted session once on mount.
  useEffect(() => {
    void gameStore.getState().hydrate();
  }, []);

  // Coordinated reveal: after the flip animation, the round becomes "completed".
  const status = session?.status;
  useEffect(() => {
    if (status !== "revealing") return;
    const id = window.setTimeout(() => gameStore.getState().finishReveal(), reducedMotion ? REVEAL_MS_REDUCED : REVEAL_MS);
    return () => window.clearTimeout(id);
  }, [status, reducedMotion]);

  if (!hydrated || !session) {
    return (
      <div className="arena-bg grid min-h-svh place-items-center">
        <p className="animate-pulse text-sm uppercase tracking-[0.4em] text-muted">{t.app.loading}</p>
      </div>
    );
  }

  return (
    <div className="arena-bg flex min-h-svh flex-col lg:h-svh lg:overflow-hidden">
      <GameHeader />
      <Notices />

      {status === "finished" ? (
        <main className="flex-1 overflow-y-auto">
          <FinalPodium session={session} onReset={() => setResetOpen(true)} />
        </main>
      ) : (
        <main className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[minmax(200px,280px)_minmax(0,1fr)_minmax(270px,330px)] xl:gap-5 xl:p-5">
          <aside aria-label={t.players.heading} className="order-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:order-none lg:grid-cols-1 lg:content-center">
            {PLAYERS.map((p) => (
              <PlayerCard key={p.id} player={p} />
            ))}
          </aside>

          <section aria-label={t.app.title} className="order-1 h-[min(80svh,140vw)] min-h-0 min-w-0 lg:order-none lg:h-auto">
            <PlinkoBoard />
          </section>

          <aside className="contents lg:panel lg:order-none lg:flex lg:min-h-0 lg:flex-col lg:gap-4 lg:overflow-y-auto lg:p-4">
            <StatusPanel />
            <div className="panel order-4 p-4 lg:mt-auto lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none">
              <GameControls onOpenConfig={() => setConfigOpen(true)} onOpenReset={() => setResetOpen(true)} />
            </div>
          </aside>
        </main>
      )}

      <RoundConfigDialog open={configOpen} onClose={() => setConfigOpen(false)} />
      <ResetDialog open={resetOpen} onClose={() => setResetOpen(false)} />
    </div>
  );
}
