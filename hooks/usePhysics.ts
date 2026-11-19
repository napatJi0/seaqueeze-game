"use client";

import { useEffect, useRef, type RefObject } from "react";
import { BoardRenderer } from "@/components/plinko/canvas-renderer";
import { type BoardLayout } from "@/lib/physics/board-layout";
import { PlinkoPhysicsEngine } from "@/lib/physics/physics-engine";
import { SimulationRunner } from "@/lib/physics/simulation";
import { gameStore, type GameStoreState } from "@/stores/game-store";

/**
 * Owns the physics engine + render loop for a canvas and synchronizes it with
 * the game store through subscriptions (no React re-render per frame).
 *
 *  - status → countdown / idle : reset balls to the round's random spawn
 *  - status → simulating       : release all four balls at once
 *  - paused flag               : pause / resume the fixed-step loop
 *  - engine finish             : report the outcome exactly once per attempt
 */
export function usePhysics(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  layout: BoardLayout,
  cssSize: { width: number; height: number },
  reducedMotion: boolean,
): void {
  const rendererRef = useRef<BoardRenderer | null>(null);
  const runnerRef = useRef<SimulationRunner | null>(null);

  // Engine lifecycle
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let engine: PlinkoPhysicsEngine;
    try {
      engine = new PlinkoPhysicsEngine(layout);
    } catch {
      gameStore.getState().reportError("physicsInit");
      return;
    }
    const renderer = new BoardRenderer(layout);
    const runner = new SimulationRunner(engine, (eng, t) => renderer.render(canvas, eng, t));
    rendererRef.current = renderer;
    runnerRef.current = runner;

    /** Token of the attempt the engine is currently running. */
    let activeToken: { roundNumber: number; attempt: number } | null = null;
    let lastKey = "";

    const offFinish = engine.onFinish((outcome) => {
      const token = activeToken;
      activeToken = null;
      if (!token) return;
      renderer.duplicateSlots = outcome.duplicateSlots;
      gameStore.getState().submitAttempt({ ...token, ...outcome });
    });

    const sync = (state: GameStoreState) => {
      const s = state.session;
      if (!s) return;
      const a = s.activeRound;
      // Before START ROUND the balls already sit at the prepared random spawn.
      const pending = s.status === "idle" && s.pendingArrangement?.roundNumber === s.currentRound ? s.pendingArrangement : null;
      const spawn = a?.spawn ?? pending?.spawn;
      renderer.showBalls = s.status !== "finished" && spawn !== undefined;
      const spawnKey = spawn ? spawn.map((p) => `${p.playerId}:${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(";") : "-";
      const key = `${s.id}|${s.currentRound}|${a?.attempt ?? 0}|${s.status}|${spawnKey}`;
      if (key !== lastKey) {
        lastKey = key;
        if (s.status === "idle" || s.status === "countdown") {
          activeToken = null;
          engine.resetBalls(spawn);
          renderer.clearTrails();
          renderer.duplicateSlots = [];
        } else if (s.status === "invalid" && a && engine.phase === "ready") {
          // Fresh engine (e.g. after a reload): show the round's locked spawn while waiting for RETRY.
          engine.resetBalls(a.spawn);
        } else if (s.status === "simulating" && a && engine.phase === "ready") {
          activeToken = { roundNumber: a.roundNumber, attempt: a.attempt };
          engine.release();
        } else if (s.status === "simulating" && engine.phase !== "running" && !activeToken) {
          // Simulating without a live engine run (should not happen): report it as an error attempt.
          if (a) {
            gameStore.getState().submitAttempt({
              roundNumber: a.roundNumber,
              attempt: a.attempt,
              landings: [],
              failure: "physics_error",
              elapsedMs: 0,
            });
          }
        }
      }
      if (state.paused) runner.pause();
      else if (runner.paused) runner.resume();
    };

    sync(gameStore.getState());
    const unsubscribe = gameStore.subscribe(sync);
    runner.start();

    const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
    void fonts?.ready.then(() => renderer.invalidate());

    return () => {
      unsubscribe();
      offFinish();
      // The physics world is going away: a drop in progress cannot finish naturally.
      gameStore.getState().interruptActiveRound();
      runner.destroy();
      engine.destroy();
      rendererRef.current = null;
      runnerRef.current = null;
    };
  }, [canvasRef, layout]);

  // Canvas backing-store size follows the CSS size (crisp on HiDPI).
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || cssSize.width <= 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(cssSize.width * dpr);
    canvas.height = Math.round(cssSize.height * dpr);
    rendererRef.current?.invalidate();
    runnerRef.current?.renderNow();
  }, [canvasRef, cssSize.width, cssSize.height]);

  useEffect(() => {
    if (rendererRef.current) rendererRef.current.reducedMotion = reducedMotion;
  }, [reducedMotion]);
}
