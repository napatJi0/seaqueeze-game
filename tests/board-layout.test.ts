import { describe, expect, it } from "vitest";
import { BOARD_LAYOUT as L } from "@/lib/physics/board-layout";
import {
  balancePoints,
  capsuleGap,
  exposedBalancePoints,
  findPinchPoints,
  minimumPassage,
  shallowSurfaces,
} from "@/lib/physics/clearance";
import { PlinkoPhysicsEngine } from "@/lib/physics/physics-engine";
import { generateSpawn, spawnZone } from "@/lib/physics/spawn";
import { validateLandings } from "@/lib/game-engine/landing-validation";
import { seeded } from "./helpers";

describe("irregular obstacle field", () => {
  it("mixes pegs of different sizes, ramps and uneven wall pieces (no grid)", () => {
    expect(new Set(L.pegs.map((p) => p.r)).size).toBeGreaterThanOrEqual(5);
    expect(new Set(L.pegs.map((p) => p.y)).size).toBe(L.pegs.length); // no two pegs on one row
    expect(L.ramps.length).toBeGreaterThanOrEqual(4);
    const wallRamps = L.ramps.filter((r) => r.a.x <= r.thickness || r.a.x >= L.width - r.thickness);
    expect(wallRamps.length).toBeGreaterThanOrEqual(2);
    const depths = L.deflectors.map((t) => Math.abs(t[1].x - t[0].x));
    expect(new Set(depths).size).toBe(L.deflectors.length); // every wall deflector differs
  });

  it("has no pinch point: every gap is closed or wide enough for a ball", () => {
    expect(findPinchPoints(L)).toEqual([]);
  });

  it("has no shallow ramp or deflector a ball could rest on", () => {
    expect(shallowSurfaces(L)).toEqual([]);
  });

  it("no round top or ramp end sits under a straight drop from a spawn point", () => {
    const zone = spawnZone(L);
    expect(balancePoints(L).length).toBeGreaterThan(0);
    expect(exposedBalancePoints(L, { columns: L.slots.map((s) => s.centerX), xJitter: zone.xJitter, yMax: zone.yMax })).toEqual([]);
  });

  it("wall ramps slope down away from the wall", () => {
    for (const r of L.ramps) {
      const atLeftWall = Math.min(r.a.x, r.b.x) <= r.thickness;
      const atRightWall = Math.max(r.a.x, r.b.x) >= L.width - r.thickness;
      const wallEnd = atLeftWall ? (r.a.x < r.b.x ? r.a : r.b) : atRightWall ? (r.a.x > r.b.x ? r.a : r.b) : null;
      const freeEnd = wallEnd === r.a ? r.b : r.a;
      if (wallEnd) expect(wallEnd.y).toBeLessThan(freeEnd.y);
    }
  });

  it("leaves room above the slot gates and deep enough slots", () => {
    expect(L.dividerTop - L.fieldBottom).toBeGreaterThanOrEqual(4 * L.ballRadius);
    expect(L.floorY - L.dividerTop).toBeGreaterThan(2 * L.ballRadius);
    expect(spawnZone(L).yMax + L.ballRadius).toBeLessThan(L.fieldTop);
  });

  it("the gap checker itself detects a too-narrow gap", () => {
    const need = minimumPassage(L);
    expect(capsuleGap({ a: { x: 0, y: 0 }, b: { x: 0, y: 0 }, r: 10 }, { a: { x: need, y: 0 }, b: { x: need, y: 0 }, r: 10 })).toBeLessThan(need);
  });

  it("random drops through the field finish without stuck balls", () => {
    let valid = 0;
    for (let i = 0; i < 40; i++) {
      const rng = seeded(900 + i);
      const e = new PlinkoPhysicsEngine(L, rng, generateSpawn(L, rng));
      e.release();
      while (e.phase === "running") e.stepOnce();
      const o = e.outcome!;
      expect(o.failure).toBeNull();
      if (validateLandings(o.landings).valid) valid++;
      e.destroy();
    }
    expect(valid).toBeGreaterThanOrEqual(32);
  }, 180000);
});
