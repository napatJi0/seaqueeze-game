/**
 * Geometry checks for the obstacle field (no ball-trapping geometry).
 *
 * Every obstacle is modelled as a set of "capsules" (a segment with a radius): a peg is a
 * zero-length capsule, a ramp is a capsule, a wall deflector is its edges with radius 0,
 * and the side walls are vertical segments. Between any two shapes the free gap must be
 * either ~0 (they touch: attached, nothing can get in) or wide enough for a ball to pass.
 */
import type { BoardLayout, Point } from "./board-layout";

export interface Capsule {
  a: Point;
  b: Point;
  r: number;
}

export interface ShapeRef {
  id: string;
  parts: Capsule[];
}

export interface GapIssue {
  a: string;
  b: string;
  gap: number;
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

function pointSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : clamp01(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2);
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const cross = (o: Point, p: Point, q: Point) => (p.x - o.x) * (q.y - o.y) - (p.y - o.y) * (q.x - o.x);
  const d1 = cross(c, d, a);
  const d2 = cross(c, d, b);
  const d3 = cross(a, b, c);
  const d4 = cross(a, b, d);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

/** Shortest distance between two segments. */
export function segmentDistance(a: Point, b: Point, c: Point, d: Point): number {
  if (segmentsIntersect(a, b, c, d)) return 0;
  return Math.min(pointSegment(a, c, d), pointSegment(b, c, d), pointSegment(c, a, b), pointSegment(d, a, b));
}

/** Free gap between two capsules (negative = overlap). */
export function capsuleGap(p: Capsule, q: Capsule): number {
  return segmentDistance(p.a, p.b, q.a, q.b) - p.r - q.r;
}

/** All obstacle shapes of the field, plus the two side walls. */
export function fieldShapes(layout: BoardLayout): ShapeRef[] {
  const shapes: ShapeRef[] = [];
  layout.pegs.forEach((p, i) => shapes.push({ id: `peg${i}`, parts: [{ a: p, b: p, r: p.r }] }));
  layout.ramps.forEach((r, i) => shapes.push({ id: `ramp${i}`, parts: [{ a: r.a, b: r.b, r: r.thickness / 2 }] }));
  layout.deflectors.forEach((t, i) =>
    shapes.push({
      id: `deflector${i}`,
      parts: [
        { a: t[0], b: t[1], r: 0 },
        { a: t[1], b: t[2], r: 0 },
        { a: t[2], b: t[0], r: 0 },
      ],
    }),
  );
  shapes.push({ id: "wallL", parts: [{ a: { x: 0, y: 0 }, b: { x: 0, y: layout.floorY }, r: 0 }] });
  shapes.push({ id: "wallR", parts: [{ a: { x: layout.width, y: 0 }, b: { x: layout.width, y: layout.floorY }, r: 0 }] });
  return shapes;
}

export function shapeGap(s: ShapeRef, t: ShapeRef): number {
  let best = Infinity;
  for (const p of s.parts) for (const q of t.parts) best = Math.min(best, capsuleGap(p, q));
  return best;
}

/** Smallest gap a ball can pass through (ball diameter plus a margin). */
export function minimumPassage(layout: BoardLayout): number {
  return layout.ballRadius * 2 + 6;
}

/**
 * Pairs whose gap is neither "touching" (≤ 1) nor wide enough for a ball. Such a gap is a
 * pinch point where a ball could wedge.
 */
export function findPinchPoints(layout: BoardLayout): GapIssue[] {
  const shapes = fieldShapes(layout);
  const need = minimumPassage(layout);
  const issues: GapIssue[] = [];
  for (let i = 0; i < shapes.length; i++) {
    for (let j = i + 1; j < shapes.length; j++) {
      const s = shapes[i] as ShapeRef;
      const t = shapes[j] as ShapeRef;
      if (s.id.startsWith("wall") && t.id.startsWith("wall")) continue;
      const gap = shapeGap(s, t);
      if (gap > 1 && gap < need) issues.push({ a: s.id, b: t.id, gap: Math.round(gap * 10) / 10 });
    }
  }
  return issues;
}

/** Ramp and deflector surfaces must be steep enough that a ball always rolls off. */
export function shallowSurfaces(layout: BoardLayout, minDegrees = 18): string[] {
  const issues: string[] = [];
  const angle = (a: Point, b: Point) => (Math.abs(Math.atan2(b.y - a.y, b.x - a.x)) * 180) / Math.PI;
  layout.ramps.forEach((r, i) => {
    const deg = angle(r.a, r.b);
    const tilt = Math.min(deg, 180 - deg);
    if (tilt < minDegrees) issues.push(`ramp${i}: ${tilt.toFixed(1)}°`);
  });
  layout.deflectors.forEach((t, i) => {
    // t[0] = top point on the wall, t[1] = tip: the top face a ball lands on.
    const deg = angle(t[0], t[1]);
    const tilt = Math.min(deg, 180 - deg);
    if (tilt < minDegrees) issues.push(`deflector${i}: ${tilt.toFixed(1)}°`);
  });
  return issues;
}

/** A local high point a ball could balance on if it drops onto it dead-center. */
export interface BalancePoint {
  id: string;
  x: number;
  top: number;
}

export function balancePoints(layout: BoardLayout): BalancePoint[] {
  const points: BalancePoint[] = layout.pegs.map((p, i) => ({ id: `peg${i}`, x: p.x, top: p.y - p.r }));
  layout.ramps.forEach((r, i) => {
    const high = r.a.y <= r.b.y ? r.a : r.b;
    // A ramp end touching a wall is not a balance point (the wall is beside it).
    if (high.x - r.thickness / 2 <= 1 || high.x + r.thickness / 2 >= layout.width - 1) return;
    points.push({ id: `ramp${i}`, x: high.x, top: high.y - r.thickness / 2 });
  });
  return points;
}

/**
 * Balance points a ball can reach by falling straight down from a possible spawn x, with
 * nothing in between. A dead-center vertical drop onto such a point can leave a ball
 * balanced indefinitely in the simulation, so none may exist.
 */
export function exposedBalancePoints(
  layout: BoardLayout,
  spawn: { columns: number[]; xJitter: number; yMax: number },
): BalancePoint[] {
  const shapes = fieldShapes(layout).filter((s) => !s.id.startsWith("wall"));
  return balancePoints(layout).filter((bp) => {
    const underSpawn = spawn.columns.some((c) => Math.abs(bp.x - c) <= spawn.xJitter + 1);
    if (!underSpawn) return false;
    // Is the straight drop path above the point clear of every other obstacle?
    const path: Capsule = { a: { x: bp.x, y: spawn.yMax }, b: { x: bp.x, y: bp.top - 1 }, r: layout.ballRadius };
    return shapes.every((s) => s.id === bp.id || s.parts.every((part) => capsuleGap(path, part) > 0));
  });
}
