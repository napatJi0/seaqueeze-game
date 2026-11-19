import { describe, expect, it } from "vitest";
import { validateLandings } from "@/lib/game-engine/landing-validation";
import { createBoardLayout } from "@/lib/physics/board-layout";
import { PlinkoPhysicsEngine, PHYSICS } from "@/lib/physics/physics-engine";
import { seeded } from "./helpers";

const layout = createBoardLayout();

function runToEnd(engine: PlinkoPhysicsEngine) {
  engine.release();
  let steps = 0;
  while (engine.phase === "running" && steps < 10000) {
    engine.stepOnce();
    steps++;
  }
  return engine.outcome!;
}

describe("physics engine", () => {
  it("does not move balls before release and releases all four together", () => {
    const e = new PlinkoPhysicsEngine(layout, seeded(1));
    const before = e.getBallStates();
    e.advance(500);
    expect(e.getBallStates()).toEqual(before);
    e.release();
    e.stepOnce();
    e.stepOnce();
    const after = e.getBallStates();
    expect(after.every((b, i) => b.y > before[i]!.y)).toBe(true);
    e.destroy();
  });

  it("every attempt ends naturally (landed or explicit failure) within the timeout", () => {
    const tally: Record<string, number> = {};
    for (let i = 0; i < 25; i++) {
      const e = new PlinkoPhysicsEngine(layout, seeded(100 + i));
      const o = runToEnd(e);
      expect(e.phase).toBe("finished");
      expect(o.elapsedMs).toBeLessThanOrEqual(PHYSICS.timeoutMs + 20);
      const check = validateLandings(o.landings);
      const key = o.failure ?? (check.valid ? "valid" : check.reason);
      tally[key] = (tally[key] ?? 0) + 1;
      if (o.failure === null && !check.valid) expect(check.reason).toBe("duplicate_slot");
      for (const l of o.landings) {
        const ball = e.getBallStates().find((b) => b.playerId === l.playerId)!;
        const slot = layout.slots[l.slotIndex]!;
        // A reported landing is where the ball physically rests.
        expect(ball.x).toBeGreaterThanOrEqual(slot.left);
        expect(ball.x).toBeLessThanOrEqual(slot.right);
        expect(ball.y).toBeGreaterThan(layout.dividerTop);
      }
      e.destroy();
    }
    expect(tally.valid ?? 0).toBeGreaterThan(0);
  }, 60000);

  it("emits the finish event exactly once per attempt", () => {
    const e = new PlinkoPhysicsEngine(layout, seeded(3));
    let calls = 0;
    e.onFinish(() => calls++);
    runToEnd(e);
    e.stepOnce();
    e.advance(1000);
    expect(calls).toBe(1);
    e.resetBalls();
    runToEnd(e);
    expect(calls).toBe(2);
    e.destroy();
  }, 30000);
});
