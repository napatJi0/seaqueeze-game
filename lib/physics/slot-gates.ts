/**
 * Slot gates: a filled slot closes.
 *
 * As soon as a ball drops fully inside a slot, that slot's gate (a visible steel lid)
 * closes over it. Balls arriving later hit the lid and roll off toward an open slot.
 * This is a physical board rule (like a real arcade machine), not steering: the gate
 * reacts only to occupancy, never to prizes or ball identity, and balls move only
 * under physics.
 *
 * Lid geometry: all closed lids together form a continuous downhill ramp toward the
 * nearest open slot, so no valley exists where a ball could come to rest. A closed slot
 * with open slots at equal distance on both sides gets a roof (peak in the middle).
 * Ramp height grows by RAMP_STEP per slot of distance.
 */
import type { BoardLayout, Point } from "./board-layout";

export const RAMP_STEP = 26;

export interface LidSegment {
  slot: number;
  a: Point;
  b: Point;
}

/** Nearest open slot distance on each side (Infinity if none). */
function openDistances(index: number, closed: ReadonlySet<number>, count: number): { left: number; right: number } {
  let left = Infinity;
  let right = Infinity;
  for (let j = index - 1; j >= 0; j--) {
    if (!closed.has(j)) {
      left = index - j;
      break;
    }
  }
  for (let j = index + 1; j < count; j++) {
    if (!closed.has(j)) {
      right = j - index;
      break;
    }
  }
  return { left, right };
}

/** Lid surface segments (top surface line) for every closed slot. */
export function computeLidSegments(layout: BoardLayout, closed: ReadonlySet<number>): LidSegment[] {
  // Sit just above the rounded divider caps so the downhill edge has no bump to catch a ball.
  const capTop = Math.max(0, ...layout.dividers.map((d) => d.thickness / 2 + 1));
  const base = layout.dividerTop - capTop - 3;
  const count = layout.slots.length;
  const segments: LidSegment[] = [];
  for (const slot of layout.slots) {
    if (!closed.has(slot.index)) continue;
    const { left, right } = openDistances(slot.index, closed, count);
    const L = slot.left;
    const R = slot.right;
    if (!Number.isFinite(left) && !Number.isFinite(right)) {
      // Every slot is full: the round is over; flat lids.
      segments.push({ slot: slot.index, a: { x: L, y: base }, b: { x: R, y: base } });
    } else if (left < right) {
      // Downhill to the left: near (left) edge low, far (right) edge high.
      segments.push({ slot: slot.index, a: { x: L, y: base - (left - 1) * RAMP_STEP }, b: { x: R, y: base - left * RAMP_STEP } });
    } else if (right < left) {
      segments.push({ slot: slot.index, a: { x: L, y: base - right * RAMP_STEP }, b: { x: R, y: base - (right - 1) * RAMP_STEP } });
    } else {
      // Equal distance both ways: a roof.
      const edge = base - (left - 1) * RAMP_STEP;
      const peak = { x: slot.centerX, y: edge - RAMP_STEP / 2 };
      segments.push({ slot: slot.index, a: { x: L, y: edge }, b: peak });
      segments.push({ slot: slot.index, a: peak, b: { x: R, y: edge } });
    }
  }
  return segments;
}

/** Height (y) of the lid surface of a closed slot at its left / right edge. */
export function lidEdgeHeights(segments: readonly LidSegment[], slot: number): { left: number; right: number } | null {
  const own = segments.filter((s) => s.slot === slot);
  if (own.length === 0) return null;
  const first = own[0] as LidSegment;
  const last = own[own.length - 1] as LidSegment;
  return { left: first.a.y, right: last.b.y };
}

/** Height (y) of the lid top surface for a closed slot at horizontal coordinate x. */
export function lidSurfaceYAt(segments: readonly LidSegment[], slot: number, x: number): number | null {
  for (const s of segments) {
    if (s.slot !== slot) continue;
    const minX = Math.min(s.a.x, s.b.x);
    const maxX = Math.max(s.a.x, s.b.x);
    if (x >= minX - 1 && x <= maxX + 1) {
      const span = s.b.x - s.a.x;
      const t = Math.abs(span) < 1e-6 ? 0.5 : Math.min(1, Math.max(0, (x - s.a.x) / span));
      return s.a.y + (s.b.y - s.a.y) * t;
    }
  }
  return null;
}
