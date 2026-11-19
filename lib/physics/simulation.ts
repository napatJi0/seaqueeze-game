/**
 * Frame loop that drives a PlinkoPhysicsEngine and a renderer with requestAnimationFrame.
 * Lives entirely outside React: no React state is touched per frame.
 */
import type { PlinkoPhysicsEngine } from "./physics-engine";

export type FrameRenderer = (engine: PlinkoPhysicsEngine, timeMs: number) => void;

export class SimulationRunner {
  private readonly engine: PlinkoPhysicsEngine;
  private readonly render: FrameRenderer;
  private rafId: number | null = null;
  private lastTime: number | null = null;
  private pausedValue = false;
  private destroyed = false;

  constructor(engine: PlinkoPhysicsEngine, render: FrameRenderer) {
    this.engine = engine;
    this.render = render;
  }

  get paused(): boolean {
    return this.pausedValue;
  }

  /** Start the render loop (idempotent). Physics only advances while the engine is running. */
  start(): void {
    if (this.destroyed || this.rafId !== null) return;
    this.lastTime = null;
    this.rafId = requestAnimationFrame(this.frame);
  }

  pause(): void {
    this.pausedValue = true;
  }

  resume(): void {
    this.pausedValue = false;
    // Drop the paused interval so the simulation does not jump forward.
    this.lastTime = null;
  }

  /** Render once without advancing physics (e.g. after a resize). */
  renderNow(): void {
    if (!this.destroyed) this.render(this.engine, performance.now());
  }

  destroy(): void {
    this.destroyed = true;
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  }

  private frame = (time: number): void => {
    if (this.destroyed) return;
    const dt = this.lastTime === null ? 0 : time - this.lastTime;
    this.lastTime = time;
    if (!this.pausedValue && this.engine.phase === "running") this.engine.advance(dt);
    this.render(this.engine, time);
    this.rafId = requestAnimationFrame(this.frame);
  };
}
