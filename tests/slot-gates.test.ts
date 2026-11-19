import { describe, expect, it } from "vitest";
import { validateLandings } from "@/lib/game-engine/landing-validation";
import { createBoardLayout } from "@/lib/physics/board-layout";
import { PlinkoPhysicsEngine } from "@/lib/physics/physics-engine";
import { computeLidSegments, lidEdgeHeights } from "@/lib/physics/slot-gates";
import { seeded } from "./helpers";

const layout = createBoardLayout();

/** Every subset of slots with at least one open slot. */
const subsets: number[][] = Array.from({ length: 15 }, (_, mask) => [0, 1, 2, 3].filter((i) => mask & (1 << i)));

describe("slot gate geometry", () => {
  it.each(subsets.map((s) => [s.join(",") || "none", s] as const))(
    "closed {%s}: lids form a continuous ramp with no valley",
    (_label, closedList) => {
      const closed = new Set(closedList);
      const segs = computeLidSegments(layout, closed);
      // y grows downward: a "valley" is a point with larger y than both neighbors.
      for (const i of closedList) {
        const h = lidEdgeHeights(segs, i)!;
        // Neighbor closed slot: edges meet at the same height (continuous surface).
        if (closed.has(i + 1)) expect(lidEdgeHeights(segs, i + 1)!.left).toBeCloseTo(h.right);
        // Against a wall: the wall end must be the high end (ball rolls away from the wall).
        if (i === 0) expect(h.left).toBeLessThanOrEqual(h.right);
        if (i === 3) expect(h.right).toBeLessThanOrEqual(h.left);
        // Next to an open slot: that edge is the low end (ball rolls into it).
        if (i > 0 && !closed.has(i - 1)) expect(h.left).toBeGreaterThanOrEqual(h.right - 1e-9);
        if (i < 3 && !closed.has(i + 1)) expect(h.right).toBeGreaterThanOrEqual(h.left - 1e-9);
        // Lids stay above the divider caps (no bump at the downhill edge).
        expect(Math.max(h.left, h.right)).toBeLessThan(layout.dividerTop - 6);
      }
      // No interior valley along any polyline of a closed run.
      const points = segs.flatMap((s) => [s.a, s.b]).sort((a, b) => a.x - b.x);
      for (let k = 1; k < points.length - 1; k++) {
        const prev = points[k - 1]!;
        const cur = points[k]!;
        const next = points[k + 1]!;
        const contiguous = next.x - prev.x <= 200 + 1e-6 && cur.x > prev.x && next.x > cur.x;
        if (contiguous) expect(cur.y > prev.y + 1e-9 && cur.y > next.y + 1e-9).toBe(false);
      }
    },
  );

  it("no gates exist before any ball enters a slot", () => {
    const e = new PlinkoPhysicsEngine(layout, seeded(1));
    expect(e.getLids().segments).toHaveLength(0);
    e.release();
    for (let i = 0; i < 60; i++) e.stepOnce();
    expect(e.getLids().closedBy.size).toBe(0);
    e.destroy();
  });
});

describe("one ball per slot", () => {
  it("almost every attempt ends with four balls in four different slots", () => {
    let valid = 0;
    const N = 30;
    for (let i = 0; i < N; i++) {
      const e = new PlinkoPhysicsEngine(layout, seeded(500 + i));
      e.release();
      while (e.phase === "running") e.stepOnce();
      const o = e.outcome!;
      const check = validateLandings(o.landings);
      if (o.failure === null && check.valid) {
        valid++;
        // Each gate was closed by the ball that ended up in that slot.
        const { closedBy } = e.getLids();
        for (const l of check.landings) expect(closedBy.get(l.slotIndex)).toBe(l.playerId);
      }
      e.destroy();
    }
    expect(valid).toBeGreaterThanOrEqual(24);
  }, 120000);
});
