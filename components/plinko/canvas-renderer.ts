/**
 * Canvas renderer for the Plinko board. Pure drawing — no game rules, no prizes.
 * Static geometry is cached on an offscreen canvas and redrawn only on resize.
 */
import { PLAYERS } from "@/config/players";
import type { BoardLayout } from "@/lib/physics/board-layout";
import type { PlinkoPhysicsEngine } from "@/lib/physics/physics-engine";
import type { PlayerId, PlayerSymbolKind } from "@/types/player";

const COLORS = {
  bg: "#0b0b0c",
  grid: "rgba(255,255,255,0.025)",
  peg: "#d9d9d9",
  pegShadow: "rgba(0,0,0,0.6)",
  wall: "#202022",
  pink: "#ff2b78",
  divider: "#3a3a3e",
};

const TRAIL_LENGTH = 9;

/** Trace a cookie symbol path centered at (cx, cy) with nominal radius r (stroke it afterwards). */
export function traceSymbol(ctx: CanvasRenderingContext2D, kind: PlayerSymbolKind, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  switch (kind) {
    case "circle":
      ctx.arc(cx, cy, r * 1.05, 0, Math.PI * 2);
      break;
    case "triangle": {
      for (let i = 0; i < 3; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / 3;
        const x = cx + r * 1.15 * Math.cos(a);
        const y = cy + r * 1.15 * Math.sin(a) + r * 0.16;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
    }
    case "star": {
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 === 0 ? r * 1.15 : r * 0.48;
        const x = cx + rr * Math.cos(a);
        const y = cy + rr * Math.sin(a) + r * 0.06;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      break;
    }
    case "umbrella": {
      const R = r * 1.05;
      const top = cy - r * 0.15;
      // canopy dome
      ctx.moveTo(cx - R, top);
      ctx.arc(cx, top, R, Math.PI, 0);
      // scalloped hem (three small arcs back to the left edge)
      const w = (2 * R) / 3;
      for (let k = 0; k < 3; k++) {
        const scx = cx + R - w / 2 - k * w;
        ctx.arc(scx, top, w / 2, 0, Math.PI, true);
      }
      // tip
      ctx.moveTo(cx, top - R);
      ctx.lineTo(cx, top - R - r * 0.18);
      // shaft + hook
      ctx.moveTo(cx, top);
      ctx.lineTo(cx, top + r * 0.95);
      ctx.arc(cx - r * 0.24, top + r * 0.95, r * 0.24, 0, Math.PI);
      break;
    }
  }
}

/** Fixed speckle pattern per player (deterministic, so the cookie texture never flickers). */
function speckles(seed: number): { dx: number; dy: number; s: number }[] {
  let a = seed * 2654435761;
  const next = () => {
    a = (a * 1103515245 + 12345) % 2147483648;
    return a / 2147483648;
  };
  return Array.from({ length: 14 }, () => {
    const ang = next() * Math.PI * 2;
    const dist = Math.sqrt(next()) * 0.8;
    return { dx: Math.cos(ang) * dist, dy: Math.sin(ang) * dist, s: 0.025 + next() * 0.035 };
  });
}

const COOKIE = {
  light: "#f8d67a",
  mid: "#e7b23f",
  deep: "#c68b1c",
  rim: "#8a5a15",
  engrave: "#6e4510",
  engraveLight: "rgba(255, 238, 190, 0.45)",
  speck: "rgba(150, 95, 25, 0.35)",
};

export class BoardRenderer {
  private readonly layout: BoardLayout;
  private staticLayer: HTMLCanvasElement | null = null;
  private staticKey = "";
  private trails = new Map<PlayerId, { x: number; y: number }[]>();
  /** Slots to highlight as a duplicate landing (set by the UI on invalid attempts). */
  duplicateSlots: number[] = [];
  /** Balls are hidden while waiting for START ROUND; they appear at their random spawn. */
  showBalls = true;
  reducedMotion = false;

  constructor(layout: BoardLayout) {
    this.layout = layout;
  }

  /** Force the static layer to be redrawn (e.g. once web fonts finish loading). */
  invalidate(): void {
    this.staticKey = "";
  }

  clearTrails(): void {
    this.trails.clear();
  }

  render(canvas: HTMLCanvasElement, engine: PlinkoPhysicsEngine, timeMs: number): void {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const scale = canvas.width / this.layout.width;
    this.ensureStaticLayer(canvas.width, canvas.height, scale);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (this.staticLayer) ctx.drawImage(this.staticLayer, 0, 0);

    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    this.drawSlotHighlights(ctx, timeMs);

    const balls = engine.getBallStates();
    const running = engine.phase === "running";
    for (const b of balls) {
      const trail = this.trails.get(b.playerId) ?? [];
      if (running && !this.reducedMotion) {
        trail.push({ x: b.x, y: b.y });
        if (trail.length > TRAIL_LENGTH) trail.shift();
      } else if (!running) {
        trail.length = 0;
      }
      this.trails.set(b.playerId, trail);
    }
    this.drawLids(ctx, engine);
    if (!this.showBalls) return;
    for (const b of balls) this.drawTrail(ctx, b.playerId);
    for (const b of balls) this.drawBall(ctx, b.playerId, b.x, b.y, b.landedSlot !== null);
  }

  // ---------------------------------------------------------------------------

  private ensureStaticLayer(w: number, h: number, scale: number): void {
    const key = `${w}x${h}`;
    if (this.staticLayer && this.staticKey === key) return;
    const layer = document.createElement("canvas");
    layer.width = w;
    layer.height = h;
    const ctx = layer.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    this.drawStatic(ctx);
    this.staticLayer = layer;
    this.staticKey = key;
  }

  private drawStatic(ctx: CanvasRenderingContext2D): void {
    const L = this.layout;

    // Base
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, L.width, L.height);

    // Overhead spotlight
    const spot = ctx.createRadialGradient(L.width / 2, -80, 40, L.width / 2, 260, L.width * 0.9);
    spot.addColorStop(0, "rgba(255,255,255,0.10)");
    spot.addColorStop(0.45, "rgba(255,43,120,0.035)");
    spot.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = spot;
    ctx.fillRect(0, 0, L.width, L.height);

    // Fine industrial grid
    ctx.strokeStyle = COLORS.grid;
    ctx.lineWidth = 1;
    for (let x = 0; x <= L.width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, L.height);
      ctx.stroke();
    }
    for (let y = 0; y <= L.height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(L.width, y);
      ctx.stroke();
    }

    // Wall deflectors (uneven steel wedges)
    for (const tri of L.deflectors) {
      ctx.beginPath();
      ctx.moveTo(tri[0].x, tri[0].y);
      ctx.lineTo(tri[1].x, tri[1].y);
      ctx.lineTo(tri[2].x, tri[2].y);
      ctx.closePath();
      ctx.fillStyle = "#3a3a40";
      ctx.fill();
      ctx.strokeStyle = "#8d8d95";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(tri[0].x, tri[0].y);
      ctx.lineTo(tri[1].x, tri[1].y);
      ctx.stroke();
    }

    // Ramps: brushed steel bars with rounded ends
    for (const r of L.ramps) {
      ctx.save();
      ctx.lineCap = "round";
      ctx.strokeStyle = COLORS.pegShadow;
      ctx.lineWidth = r.thickness;
      ctx.beginPath();
      ctx.moveTo(r.a.x + 1.5, r.a.y + 2.5);
      ctx.lineTo(r.b.x + 1.5, r.b.y + 2.5);
      ctx.stroke();
      const g = ctx.createLinearGradient(r.a.x, r.a.y - r.thickness, r.a.x, r.a.y + r.thickness);
      g.addColorStop(0, "#f2f2f4");
      g.addColorStop(0.5, "#a9a9b0");
      g.addColorStop(1, "#5d5d63");
      ctx.strokeStyle = g;
      ctx.beginPath();
      ctx.moveTo(r.a.x, r.a.y);
      ctx.lineTo(r.b.x, r.b.y);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,255,255,0.55)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(r.a.x, r.a.y - r.thickness * 0.22);
      ctx.lineTo(r.b.x, r.b.y - r.thickness * 0.22);
      ctx.stroke();
      ctx.restore();
    }

    // Pegs: metallic studs of different sizes
    for (const p of L.pegs) {
      ctx.fillStyle = COLORS.pegShadow;
      ctx.beginPath();
      ctx.arc(p.x + 1.2, p.y + 1.8, p.r, 0, Math.PI * 2);
      ctx.fill();
      const g = ctx.createRadialGradient(p.x - p.r * 0.3, p.y - p.r * 0.3, 0.5, p.x, p.y, p.r);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.5, COLORS.peg);
      g.addColorStop(1, "#6b6b70");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Slot bays
    for (const s of L.slots) {
      const g = ctx.createLinearGradient(0, L.dividerTop, 0, L.floorY);
      g.addColorStop(0, "rgba(255,43,120,0)");
      g.addColorStop(1, "rgba(255,43,120,0.10)");
      ctx.fillStyle = g;
      ctx.fillRect(s.left + 4, L.dividerTop, s.right - s.left - 8, L.floorY - L.dividerTop);
    }

    // Dividers with rounded caps
    for (const d of L.dividers) {
      ctx.fillStyle = COLORS.divider;
      ctx.fillRect(d.x - d.thickness / 2, d.top, d.thickness, d.bottom - d.top);
      ctx.fillStyle = "#bdbdc2";
      ctx.beginPath();
      ctx.arc(d.x, d.top, d.thickness / 2 + 1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Floor neon
    ctx.save();
    ctx.shadowColor = COLORS.pink;
    ctx.shadowBlur = 18;
    ctx.fillStyle = COLORS.pink;
    ctx.fillRect(0, L.floorY - 2, L.width, 4);
    ctx.restore();

    // Side rails
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(0, 0, 3, L.height);
    ctx.fillRect(L.width - 3, 0, 3, L.height);
  }

  private drawSlotHighlights(ctx: CanvasRenderingContext2D, timeMs: number): void {
    if (this.duplicateSlots.length === 0) return;
    const L = this.layout;
    const pulse = this.reducedMotion ? 0.5 : 0.35 + 0.2 * Math.sin(timeMs / 320);
    for (const idx of this.duplicateSlots) {
      const s = L.slots[idx];
      if (!s) continue;
      ctx.save();
      ctx.strokeStyle = `rgba(230,57,70,${pulse + 0.3})`;
      ctx.lineWidth = 4;
      ctx.setLineDash([12, 8]);
      ctx.strokeRect(s.left + 6, L.dividerTop - 4, s.right - s.left - 12, L.floorY - L.dividerTop);
      ctx.fillStyle = `rgba(230,57,70,${pulse * 0.25})`;
      ctx.fillRect(s.left + 6, L.dividerTop - 4, s.right - s.left - 12, L.floorY - L.dividerTop);
      ctx.restore();
    }
  }

  /** Closed slot gates: a steel shutter in the color of the ball that filled the slot. */
  private drawLids(ctx: CanvasRenderingContext2D, engine: PlinkoPhysicsEngine): void {
    const { segments, closedBy } = engine.getLids();
    for (const seg of segments) {
      const owner = closedBy.get(seg.slot);
      const color = PLAYERS.find((p) => p.id === owner)?.color ?? COLORS.pink;
      ctx.save();
      ctx.lineCap = "round";
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
      ctx.strokeStyle = "#9a9aa2";
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.moveTo(seg.a.x, seg.a.y + 4);
      ctx.lineTo(seg.b.x, seg.b.y + 4);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(seg.a.x, seg.a.y + 1);
      ctx.lineTo(seg.b.x, seg.b.y + 1);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawTrail(ctx: CanvasRenderingContext2D, id: PlayerId): void {
    const trail = this.trails.get(id);
    if (!trail || trail.length < 2) return;
    const r = this.layout.ballRadius;
    for (let i = 0; i < trail.length - 1; i++) {
      const t = trail[i];
      if (!t) continue;
      const a = (i + 1) / trail.length;
      ctx.fillStyle = COOKIE.mid;
      ctx.globalAlpha = a * 0.16;
      ctx.beginPath();
      ctx.arc(t.x, t.y, r * (0.45 + 0.5 * a), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /** A gold dalgona cookie with the player's symbol engraved (kept upright for readability). */
  private drawBall(ctx: CanvasRenderingContext2D, id: PlayerId, x: number, y: number, landed: boolean): void {
    const player = PLAYERS.find((p) => p.id === id);
    if (!player) return;
    const r = this.layout.ballRadius;

    // Body with a soft drop shadow
    ctx.save();
    ctx.shadowColor = landed ? "rgba(255, 214, 120, 0.75)" : "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = landed ? 26 : 12;
    ctx.shadowOffsetY = landed ? 0 : 4;
    const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
    g.addColorStop(0, COOKIE.light);
    g.addColorStop(0.55, COOKIE.mid);
    g.addColorStop(1, COOKIE.deep);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Baked texture
    ctx.fillStyle = COOKIE.speck;
    for (const sp of speckles(player.number)) {
      ctx.beginPath();
      ctx.arc(x + sp.dx * r, y + sp.dy * r, sp.s * r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Highlight crescent (upper right)
    ctx.save();
    ctx.strokeStyle = "rgba(255, 250, 225, 0.6)";
    ctx.lineWidth = r * 0.08;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(x, y, r * 0.8, -Math.PI * 0.42, -Math.PI * 0.05);
    ctx.stroke();
    ctx.restore();

    // Engraved symbol: light lower edge + dark groove
    const size = r * 0.5;
    ctx.save();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.lineWidth = Math.max(2, r * 0.075);
    ctx.strokeStyle = COOKIE.engraveLight;
    traceSymbol(ctx, player.symbol, x + r * 0.03, y + r * 0.04, size);
    ctx.stroke();
    ctx.strokeStyle = COOKIE.engrave;
    traceSymbol(ctx, player.symbol, x, y, size);
    ctx.stroke();
    ctx.restore();

    // Baked rim
    ctx.strokeStyle = landed ? "#fff3cf" : COOKIE.rim;
    ctx.lineWidth = Math.max(1.5, r * 0.07);
    ctx.beginPath();
    ctx.arc(x, y, r - ctx.lineWidth / 2, 0, Math.PI * 2);
    ctx.stroke();
  }

}
