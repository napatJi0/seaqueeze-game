/**
 * Headless physics statistics: run many attempts and report the outcome mix.
 * Usage: npx tsx scripts/tune-physics.ts [attempts]
 */
import { createBoardLayout } from "../lib/physics/board-layout";
import { PlinkoPhysicsEngine } from "../lib/physics/physics-engine";
import { validateLandings } from "../lib/game-engine/landing-validation";
import { generateSpawn } from "../lib/physics/spawn";
import { slotIndexAt } from "../lib/physics/board-layout";

const N = Number(process.argv[2] ?? 200);
const layout = createBoardLayout();
const tally: Record<string, number> = {};
const slotHits = [0, 0, 0, 0];
const startToSlot: number[][] = [0, 1, 2, 3].map(() => [0, 0, 0, 0]);
let totalMs = 0;
let maxMs = 0;
for (let i = 0; i < N; i++) {
  const spawn = generateSpawn(layout);
  const engine = new PlinkoPhysicsEngine(layout, undefined, spawn);
  engine.release();
  while (engine.phase === "running") engine.stepOnce();
  const o = engine.outcome!;
  const check = validateLandings(o.landings);
  const key = o.failure ?? (check.valid ? "VALID" : check.reason);
  tally[key] = (tally[key] ?? 0) + 1;
  totalMs += o.elapsedMs;
  maxMs = Math.max(maxMs, o.elapsedMs);
  o.landings.forEach((l) => {
    slotHits[l.slotIndex]! += 1;
    const start = slotIndexAt(layout, spawn.find((p) => p.playerId === l.playerId)!.x);
    startToSlot[start]![l.slotIndex]! += 1;
  });
  engine.destroy();
}
console.log({ pegs: layout.pegs.length, ramps: layout.ramps.length, deflectors: layout.deflectors.length, N, tally, slotHits, avgMs: Math.round(totalMs / N), maxMs });
console.log("start column→slot", startToSlot);
