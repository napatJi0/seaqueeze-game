/**
 * Board geometry in fixed simulation units (800 × 1000). The canvas scales this space
 * uniformly, so the aspect ratio is always preserved.
 *
 * The obstacle field is deliberately irregular: round pegs of different sizes scattered
 * without a grid, angled ramps, and uneven wall deflectors and wall ramps. It is a fixed,
 * hand-placed design (not random per round) so it can be verified once to contain no
 * ball-trapping geometry: every gap is either closed or wide enough for a ball
 * (see clearance.ts and tests/board-layout.test.ts).
 */
import { SLOT_COUNT } from "@/config/prizes";

export interface Point {
  x: number;
  y: number;
}

/** A round peg with its own radius. */
export interface Peg extends Point {
  r: number;
}

/** A straight steel ramp with rounded ends (a capsule from a to b). */
export interface Ramp {
  a: Point;
  b: Point;
  thickness: number;
}

export interface SlotRegion {
  index: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
}

export interface Divider {
  x: number;
  top: number;
  bottom: number;
  thickness: number;
}

/**
 * A triangular deflector attached to a side wall, world coordinates:
 * [top point on the wall, tip, bottom point on the wall]. The top face slopes down
 * toward the board center.
 */
export type WallDeflector = [Point, Point, Point];

export interface BoardLayout {
  width: number;
  height: number;
  ballRadius: number;
  wallThickness: number;
  pegs: Peg[];
  ramps: Ramp[];
  deflectors: WallDeflector[];
  dividers: Divider[];
  slots: SlotRegion[];
  /** Column centers above the field (used for the aligned fallback spawn). */
  startPositions: Point[];
  /** Highest / lowest point of any obstacle in the field. */
  fieldTop: number;
  fieldBottom: number;
  floorY: number;
  dividerTop: number;
}

export interface BoardLayoutOptions {
  ballRadius?: number;
}

export const BOARD_WIDTH = 800;
export const BOARD_HEIGHT = 1000;

const RAMP_THICKNESS = 12;

/** Scattered round pegs of different sizes (no grid). */
const PEGS: Peg[] = [
  { x: 165, y: 248, r: 14 },
  { x: 590, y: 232, r: 10 },
  { x: 655, y: 318, r: 16 },
  { x: 232, y: 380, r: 12 },
  { x: 652, y: 430, r: 9 },
  { x: 404, y: 510, r: 17 },
  { x: 585, y: 548, r: 11 },
  { x: 120, y: 560, r: 13 },
  { x: 262, y: 630, r: 10 },
  { x: 660, y: 652, r: 14 },
];

/** Angled ramps in the open field (20–35°). */
const RAMPS: Array<[Point, Point]> = [
  [{ x: 362, y: 226 }, { x: 470, y: 280 }],
  [{ x: 540, y: 362 }, { x: 445, y: 410 }],
  [{ x: 205, y: 470 }, { x: 292, y: 518 }],
  [{ x: 505, y: 624 }, { x: 420, y: 660 }],
];

/** Ramps attached to a side wall, sloping down away from it. */
const WALL_RAMPS: Array<[Point, Point]> = [
  [{ x: RAMP_THICKNESS / 2, y: 392 }, { x: 70, y: 432 }],
  [{ x: BOARD_WIDTH - RAMP_THICKNESS / 2, y: 560 }, { x: 742, y: 594 }],
];

/** Uneven wall deflectors: [top on wall, tip, bottom on wall]. */
const DEFLECTORS: WallDeflector[] = [
  [{ x: 0, y: 252 }, { x: 34, y: 290 }, { x: 0, y: 300 }],
  [{ x: 0, y: 610 }, { x: 40, y: 650 }, { x: 0, y: 658 }],
  [{ x: BOARD_WIDTH, y: 200 }, { x: BOARD_WIDTH - 28, y: 228 }, { x: BOARD_WIDTH, y: 236 }],
  [{ x: BOARD_WIDTH, y: 424 }, { x: BOARD_WIDTH - 46, y: 470 }, { x: BOARD_WIDTH, y: 480 }],
];

export function createBoardLayout(opts: BoardLayoutOptions = {}): BoardLayout {
  const width = BOARD_WIDTH;
  const height = BOARD_HEIGHT;
  const ballRadius = opts.ballRadius ?? 34;
  const wallThickness = 40;

  const pegs = PEGS.map((p) => ({ ...p }));
  const ramps: Ramp[] = [...RAMPS, ...WALL_RAMPS].map(([a, b]) => ({ a: { ...a }, b: { ...b }, thickness: RAMP_THICKNESS }));
  const deflectors = DEFLECTORS.map((t) => t.map((p) => ({ ...p })) as WallDeflector);

  const tops = [
    ...pegs.map((p) => p.y - p.r),
    ...ramps.map((r) => Math.min(r.a.y, r.b.y) - r.thickness / 2),
    ...deflectors.map((t) => Math.min(t[0].y, t[1].y, t[2].y)),
  ];
  const bottoms = [
    ...pegs.map((p) => p.y + p.r),
    ...ramps.map((r) => Math.max(r.a.y, r.b.y) + r.thickness / 2),
    ...deflectors.map((t) => Math.max(t[0].y, t[1].y, t[2].y)),
  ];
  const fieldTop = Math.min(...tops);
  const fieldBottom = Math.max(...bottoms);

  // Room under the field for two stacked balls, so a ball rolling along a closed slot
  // gate can never be pinned between an obstacle and the gate by another ball.
  const dividerTop = fieldBottom + 4 * ballRadius + 30;
  const floorY = height - 14;
  const slotWidth = width / SLOT_COUNT;

  const dividers: Divider[] = [];
  for (let i = 1; i < SLOT_COUNT; i++) {
    dividers.push({ x: i * slotWidth, top: dividerTop, bottom: floorY, thickness: 8 });
  }

  const slots: SlotRegion[] = Array.from({ length: SLOT_COUNT }, (_, i) => ({
    index: i,
    left: i * slotWidth,
    right: (i + 1) * slotWidth,
    top: dividerTop + ballRadius,
    bottom: floorY,
    centerX: (i + 0.5) * slotWidth,
  }));

  const startPositions: Point[] = Array.from({ length: SLOT_COUNT }, (_, i) => ({
    x: (i + 0.5) * slotWidth,
    y: Math.min(fieldTop - ballRadius - 30, 60 + ballRadius),
  }));

  return {
    width,
    height,
    ballRadius,
    wallThickness,
    pegs,
    ramps,
    deflectors,
    dividers,
    slots,
    startPositions,
    fieldTop,
    fieldBottom,
    floorY,
    dividerTop,
  };
}

/** Which slot column an x coordinate belongs to (geometric fallback). */
export function slotIndexAt(layout: BoardLayout, x: number): number {
  const i = Math.floor(x / (layout.width / layout.slots.length));
  return Math.min(layout.slots.length - 1, Math.max(0, i));
}

/** The board used by the game (geometry never changes at runtime). */
export const BOARD_LAYOUT: BoardLayout = createBoardLayout();
