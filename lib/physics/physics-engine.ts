/**
 * Plinko physics world built on Matter.js.
 *
 * Responsibilities:
 *  - build static geometry (walls, pegs, ramps, deflectors, slot dividers, slot sensors)
 *  - place the four balls at their start positions
 *  - release all four balls inside the same physics update
 *  - advance the world with a fixed timestep
 *  - detect natural landings (in slot sensor + at rest) and abnormal endings
 *
 * The engine knows nothing about prizes. It never moves a ball after release
 * except through the physics solver.
 */
import Matter from "matter-js";
import { PLAYERS } from "@/config/players";
import type { LandingEvent } from "@/types/game";
import type { PlayerId } from "@/types/player";
import { secureRandom, type RandomSource } from "@/lib/random";
import { slotIndexAt, type BoardLayout } from "./board-layout";
import { BALL_LABEL, SLOT_SENSOR_LABEL, SlotSensorTracker } from "./collision";
import { computeLidSegments, lidSurfaceYAt, type LidSegment } from "./slot-gates";
import { defaultSpawn, isValidSpawn, type SpawnPoint } from "./spawn";

/** Tunable physical parameters. */
export const PHYSICS = {
  /** Fixed simulation step (ms). 120 Hz gives stable peg collisions. */
  stepMs: 1000 / 120,
  gravityY: 1.2,
  ball: { restitution: 0.38, friction: 0.12, frictionStatic: 0.05, frictionAir: 0.01, density: 0.0024 },
  peg: { restitution: 0.55, friction: 0.08, frictionStatic: 0 },
  wall: { restitution: 0.3, friction: 0.08 },
  floor: { restitution: 0.02, friction: 0.9, frictionStatic: 1 },
  /** Slot gate lids: zero static friction so balls never stall, light rolling friction for spin. */
  lid: { restitution: 0.12, friction: 0.12, frictionStatic: 0 },
  lidThickness: 10,
  /** Downhill roller speed multiplier along closed slot lids. */
  lidRollSpeed: 2,
  /** Release variation: tiny, symmetric, per ball (the only randomness source). */
  releaseJitterX: 5,
  releaseJitterVX: 0.45,
  /** Speed (px per 60 Hz frame) below which a ball counts as at rest. */
  restSpeed: 0.3,
  /** Simulated ms a ball must stay at rest inside a slot to count as landed. */
  settleMs: 500,
  /**
   * A ball outside the slots is stuck when it has moved less than stuckDistance in stuckMs
   * (simulated). Displacement, not instantaneous speed, so a ball slowly rolling along a
   * gentle slope is never mistaken for a stuck one.
   */
  stuckMs: 3500,
  stuckDistance: 12,
  /** Hard cap on one attempt (simulated ms). */
  timeoutMs: 30000,
} as const;

/**
 * Matter.js collides circles as polygons, and its default circle has only ~radius sides.
 * The collision normal is then quantized to the facet angles, so a ball landing within a
 * few pixels of a peg's center gets an exactly vertical normal and balances forever.
 * A high side count keeps balls and pegs effectively round, as in reality.
 */
const CIRCLE_SIDES = 120;

/** A near-perfect circle body (Matter.Bodies.circle caps its side count at the radius). */
function roundBody(x: number, y: number, radius: number, options: Matter.IChamferableBodyDefinition): Matter.Body {
  // circleRadius (missing from @types/matter-js) marks the body as a circle, as Bodies.circle does.
  const definition = { ...options, circleRadius: radius } as Matter.IChamferableBodyDefinition;
  return Matter.Bodies.polygon(x, y, CIRCLE_SIDES, radius, definition);
}

export interface BallState {
  playerId: PlayerId;
  x: number;
  y: number;
  angle: number;
  speed: number;
  landedSlot: number | null;
}

export interface EngineOutcome {
  landings: LandingEvent[];
  failure: "timeout" | "stuck" | "physics_error" | null;
  elapsedMs: number;
  duplicateSlots: number[];
}

interface BallRuntime {
  playerId: PlayerId;
  body: Matter.Body;
  restMs: number;
  /** Simulated ms since the ball last moved stuckDistance while outside the slots. */
  outsideStillMs: number;
  /** Position the stillness window is measured from. */
  anchor: { x: number; y: number };
  landedSlot: number | null;
}

export type EnginePhase = "ready" | "running" | "finished";

export class PlinkoPhysicsEngine {
  readonly layout: BoardLayout;
  private readonly engine: Matter.Engine;
  private readonly tracker: SlotSensorTracker;
  private readonly random: RandomSource;
  private balls: BallRuntime[] = [];
  /** slot index → player whose ball closed it (filled-slot gates). */
  private closedSlots = new Map<number, PlayerId>();
  private lidBodies: Matter.Body[] = [];
  private lidSegments: LidSegment[] = [];
  private accumulator = 0;
  private elapsedMs = 0;
  private phaseValue: EnginePhase = "ready";
  private outcomeValue: EngineOutcome | null = null;
  private finishListeners = new Set<(o: EngineOutcome) => void>();

  constructor(layout: BoardLayout, random: RandomSource = secureRandom, spawn?: readonly SpawnPoint[]) {
    this.layout = layout;
    this.random = random;
    this.engine = Matter.Engine.create({
      gravity: { x: 0, y: PHYSICS.gravityY, scale: 0.001 },
      positionIterations: 10,
      velocityIterations: 8,
      enableSleeping: false,
    });
    this.tracker = new SlotSensorTracker();
    this.buildStaticWorld();
    this.resetBalls(spawn);
  }

  get phase(): EnginePhase {
    return this.phaseValue;
  }

  get outcome(): EngineOutcome | null {
    return this.outcomeValue;
  }

  get simulatedMs(): number {
    return this.elapsedMs;
  }

  onFinish(listener: (o: EngineOutcome) => void): () => void {
    this.finishListeners.add(listener);
    return () => this.finishListeners.delete(listener);
  }

  /**
   * Remove all balls and place four fresh, motionless balls at their spawn points.
   * An invalid or missing spawn falls back to the aligned default spawn.
   */
  resetBalls(spawn?: readonly SpawnPoint[]): void {
    const points = isValidSpawn(this.layout, spawn) ? spawn : defaultSpawn(this.layout);
    for (const b of this.balls) Matter.Composite.remove(this.engine.world, b.body);
    this.balls = PLAYERS.map((player) => {
      const start = points.find((p) => p.playerId === player.id) as SpawnPoint;
      const body = roundBody(start.x, start.y, this.layout.ballRadius, {
        label: BALL_LABEL,
        // Balls are dynamic from creation (Matter cannot reliably convert a body that
        // was created static). They stay put because the world is not stepped until release().
        ...PHYSICS.ball,
      });
      Matter.Composite.add(this.engine.world, body);
      return {
        playerId: player.id,
        body,
        restMs: 0,
        outsideStillMs: 0,
        anchor: { x: start.x, y: start.y },
        landedSlot: null,
      };
    });
    this.accumulator = 0;
    this.elapsedMs = 0;
    this.phaseValue = "ready";
    this.outcomeValue = null;
    this.closedSlots.clear();
    this.rebuildLids();
  }

  /**
   * Release all four balls in one synchronous call, before the next physics update,
   * so they share the same simulation timestamp.
   */
  release(): void {
    if (this.phaseValue !== "ready") return;
    const jitter = () => this.random() * 2 - 1;
    for (const b of this.balls) {
      Matter.Body.setPosition(b.body, {
        x: b.body.position.x + jitter() * PHYSICS.releaseJitterX,
        y: b.body.position.y,
      });
      Matter.Body.setVelocity(b.body, { x: jitter() * PHYSICS.releaseJitterVX, y: 0 });
      Matter.Body.setAngularVelocity(b.body, jitter() * 0.02);
    }
    this.phaseValue = "running";
  }

  /**
   * Advance the simulation by real elapsed time (ms) using a fixed timestep.
   * Returns true while the attempt is still running.
   */
  advance(realMs: number): boolean {
    if (this.phaseValue !== "running") return false;
    // Clamp to avoid a spiral after tab switches.
    this.accumulator += Math.min(realMs, 100);
    while (this.accumulator >= PHYSICS.stepMs && this.phaseValue === "running") {
      this.accumulator -= PHYSICS.stepMs;
      this.stepOnce();
    }
    return this.phaseValue === "running";
  }

  /** Run one fixed physics step. Exposed for headless tests. */
  stepOnce(): void {
    if (this.phaseValue !== "running") return;
    this.applyLidRollDrive();
    try {
      Matter.Engine.update(this.engine, PHYSICS.stepMs);
    } catch {
      this.finish("physics_error");
      return;
    }
    this.elapsedMs += PHYSICS.stepMs;
    this.evaluateBalls();
  }

  /**
   * Powered roller assist along closed slot lids: when a ball touches a sloped lid,
   * accelerate it smoothly downhill toward the open slot with matching rolling spin.
   * Depends only on lid geometry (never on prizes or ball identity).
   */
  private applyLidRollDrive(): void {
    if (this.lidSegments.length === 0) return;
    const r = this.layout.ballRadius;
    const contactDist = r + 5;
    const boost = Math.max(0, PHYSICS.lidRollSpeed - 1);
    const targetSpeed = 2.4 * PHYSICS.lidRollSpeed;

    for (const b of this.balls) {
      if (b.landedSlot !== null) continue;
      const { x, y } = b.body.position;
      for (const seg of this.lidSegments) {
        const dx = seg.b.x - seg.a.x;
        const dy = seg.b.y - seg.a.y;
        if (Math.abs(dy) < 0.5) continue; // flat lid (all slots closed)
        const lenSq = dx * dx + dy * dy;
        const t = ((x - seg.a.x) * dx + (y - seg.a.y) * dy) / lenSq;
        if (t < -0.05 || t > 1.05) continue;
        const cx = seg.a.x + Math.min(1, Math.max(0, t)) * dx;
        const cy = seg.a.y + Math.min(1, Math.max(0, t)) * dy;
        if (y > cy + 4) continue; // ball is below the lid
        if (Math.hypot(x - cx, y - cy) > contactDist) continue;

        const len = Math.sqrt(lenSq);
        const dir = dy > 0 ? 1 : -1;
        const tx = (dx / len) * dir;
        const ty = (dy / len) * dir;
        const v = Matter.Body.getVelocity(b.body);
        const vAlong = v.x * tx + v.y * ty;
        let deltaV = 0;
        if (boost > 0 && vAlong < targetSpeed) {
          deltaV = Math.min(0.09 * boost, targetSpeed - vAlong);
          Matter.Body.setVelocity(b.body, { x: v.x + tx * deltaV, y: v.y + ty * deltaV });
        }
        const vNew = vAlong + deltaV;
        if (Math.abs(vNew) > 0.05) {
          const targetOmega = Math.sign(tx) * (vNew / r);
          const curOmega = Matter.Body.getAngularVelocity(b.body);
          Matter.Body.setAngularVelocity(b.body, curOmega + (targetOmega - curOmega) * 0.25);
        }
        break;
      }
    }
  }

  getBallStates(): BallState[] {
    return this.balls.map((b) => ({
      playerId: b.playerId,
      x: b.body.position.x,
      y: b.body.position.y,
      angle: b.body.angle,
      speed: Matter.Body.getSpeed(b.body),
      landedSlot: b.landedSlot,
    }));
  }

  /** Current gate lids (for rendering). */
  getLids(): { segments: readonly LidSegment[]; closedBy: ReadonlyMap<number, PlayerId> } {
    return { segments: this.lidSegments, closedBy: this.closedSlots };
  }

  destroy(): void {
    this.finishListeners.clear();
    this.tracker.destroy();
    Matter.Composite.clear(this.engine.world, false);
    Matter.Engine.clear(this.engine);
    this.balls = [];
    this.phaseValue = "finished";
  }

  // ---------------------------------------------------------------------------

  private buildStaticWorld(): void {
    const L = this.layout;
    const t = L.wallThickness;
    const statics: Matter.Body[] = [
      // side walls
      Matter.Bodies.rectangle(-t / 2, L.height / 2, t, L.height * 2, { isStatic: true, label: "wall", ...PHYSICS.wall }),
      Matter.Bodies.rectangle(L.width + t / 2, L.height / 2, t, L.height * 2, { isStatic: true, label: "wall", ...PHYSICS.wall }),
      // floor
      Matter.Bodies.rectangle(L.width / 2, L.floorY + t / 2, L.width + 2 * t, t, { isStatic: true, label: "floor", ...PHYSICS.floor }),
    ];

    for (const p of L.pegs) {
      statics.push(roundBody(p.x, p.y, p.r, { isStatic: true, label: "peg", ...PHYSICS.peg }));
    }

    // Ramps: a straight bar with round caps (a capsule), smooth so balls always roll off.
    for (const r of L.ramps) {
      const length = Math.hypot(r.b.x - r.a.x, r.b.y - r.a.y);
      const angle = Math.atan2(r.b.y - r.a.y, r.b.x - r.a.x);
      statics.push(
        Matter.Bodies.rectangle((r.a.x + r.b.x) / 2, (r.a.y + r.b.y) / 2, length, r.thickness, {
          isStatic: true,
          angle,
          label: "ramp",
          ...PHYSICS.peg,
        }),
        roundBody(r.a.x, r.a.y, r.thickness / 2, { isStatic: true, label: "ramp-cap", ...PHYSICS.peg }),
        roundBody(r.b.x, r.b.y, r.thickness / 2, { isStatic: true, label: "ramp-cap", ...PHYSICS.peg }),
      );
    }

    for (const tri of L.deflectors) {
      const cx = (tri[0].x + tri[1].x + tri[2].x) / 3;
      const cy = (tri[0].y + tri[1].y + tri[2].y) / 3;
      const body = Matter.Bodies.fromVertices(cx, cy, [tri.map((p) => ({ x: p.x, y: p.y }))], {
        isStatic: true,
        label: "deflector",
        ...PHYSICS.wall,
      });
      // fromVertices recenters on the centroid; move so vertices match exactly.
      const b = body.bounds;
      const minX = Math.min(tri[0].x, tri[1].x, tri[2].x);
      const minY = Math.min(tri[0].y, tri[1].y, tri[2].y);
      Matter.Body.setPosition(body, { x: body.position.x + (minX - b.min.x), y: body.position.y + (minY - b.min.y) });
      statics.push(body);
    }

    for (const d of L.dividers) {
      const h = d.bottom - d.top;
      statics.push(
        Matter.Bodies.rectangle(d.x, d.top + h / 2, d.thickness, h, { isStatic: true, label: "divider", ...PHYSICS.wall }),
      );
      // Rounded cap: a ball can never balance on a divider top.
      statics.push(roundBody(d.x, d.top, d.thickness / 2 + 1, { isStatic: true, label: "divider-cap", ...PHYSICS.peg }));
    }

    for (const s of L.slots) {
      const h = s.bottom - s.top;
      const sensor = Matter.Bodies.rectangle(s.centerX, s.top + h / 2, s.right - s.left, h, {
        isStatic: true,
        isSensor: true,
        label: SLOT_SENSOR_LABEL,
      });
      this.tracker.registerSensor(sensor, s.index);
      statics.push(sensor);
    }

    Matter.Composite.add(this.engine.world, statics);
  }

  private evaluateBalls(): void {
    const dt = PHYSICS.stepMs;
    for (const b of this.balls) {
      const { x, y } = b.body.position;
      if (!Number.isFinite(x) || !Number.isFinite(y) || y > this.layout.height + 200 || x < -200 || x > this.layout.width + 200) {
        this.finish("physics_error");
        return;
      }
      // Body.getSpeed is normalized to Matter's 60 Hz base delta, so thresholds
      // are independent of the fixed step size.
      const atRest = Matter.Body.getSpeed(b.body) < PHYSICS.restSpeed;
      const sensorSlot = this.tracker.slotOf(b.body);

      if (sensorSlot !== null && slotIndexAt(this.layout, x) === sensorSlot) {
        // Filled-slot gate: as soon as the first ball clears the slot mouth, the shutter closes.
        if (!this.closedSlots.has(sensorSlot) && y - this.layout.ballRadius > this.layout.dividerTop - 4) {
          this.closedSlots.set(sensorSlot, b.playerId);
          this.rebuildLids();
          this.deflectTrailingBallsAboveLid(sensorSlot, b);
        }
        b.outsideStillMs = 0;
        b.anchor = { x, y };
        b.restMs = atRest ? b.restMs + dt : 0;
        if (b.restMs >= PHYSICS.settleMs) b.landedSlot = sensorSlot;
        else if (!atRest && b.landedSlot !== null && b.landedSlot !== sensorSlot) b.landedSlot = null;
      } else {
        b.restMs = 0;
        b.landedSlot = null;
        if (Math.hypot(x - b.anchor.x, y - b.anchor.y) >= PHYSICS.stuckDistance) {
          b.anchor = { x, y };
          b.outsideStillMs = 0;
        } else {
          b.outsideStillMs += dt;
        }
        if (b.outsideStillMs >= PHYSICS.stuckMs) {
          this.finish("stuck");
          return;
        }
      }
    }

    // Early invalid: two balls at rest in the same slot can never become valid.
    const landed = this.balls.filter((b) => b.landedSlot !== null);
    const slots = landed.map((b) => b.landedSlot as number);
    if (new Set(slots).size !== slots.length) {
      this.finish(null);
      return;
    }
    if (landed.length === this.balls.length) {
      this.finish(null);
      return;
    }
    if (this.elapsedMs >= PHYSICS.timeoutMs) this.finish("timeout");
  }

  /** Replace the lid bodies to match the current set of closed slots. */
  private rebuildLids(): void {
    for (const body of this.lidBodies) Matter.Composite.remove(this.engine.world, body);
    this.lidBodies = [];
    this.lidSegments = computeLidSegments(this.layout, new Set(this.closedSlots.keys()));
    const t = PHYSICS.lidThickness;
    for (const seg of this.lidSegments) {
      const dx = seg.b.x - seg.a.x;
      const dy = seg.b.y - seg.a.y;
      const length = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      // Rectangle whose top face lies on the segment (normal points up-ish).
      const nx = -Math.sin(angle);
      const ny = Math.cos(angle);
      const body = Matter.Bodies.rectangle(
        (seg.a.x + seg.b.x) / 2 + (nx * t) / 2,
        (seg.a.y + seg.b.y) / 2 + (ny * t) / 2,
        length + 4,
        t,
        { isStatic: true, angle, label: "slot-lid", ...PHYSICS.lid },
      );
      this.lidBodies.push(body);
    }
    if (this.lidBodies.length > 0) Matter.Composite.add(this.engine.world, this.lidBodies);
  }

  /**
   * When a slot shutter snaps shut behind `claimer`, any trailing ball still in the upper
   * mouth of that slot is physically popped up onto the closed lid so it rolls to an open slot
   * instead of being trapped inside the same slot.
   */
  private deflectTrailingBallsAboveLid(slot: number, claimer: BallRuntime): void {
    const r = this.layout.ballRadius;
    const claimerY = claimer.body.position.y;
    for (const other of this.balls) {
      if (other === claimer || other.landedSlot !== null) continue;
      const { x, y } = other.body.position;
      if (slotIndexAt(this.layout, x) !== slot) continue;
      const lidY = lidSurfaceYAt(this.lidSegments, slot, x);
      if (lidY === null) continue;
      // Only lift balls that are still trailing above the claimer (or overlapping the closing shutter).
      const trailingAbove = y <= claimerY + 2 && y < this.layout.floorY - r - 12;
      const overlappingShutter = y - r < lidY + PHYSICS.lidThickness + 4 && y + r > lidY - 2;
      if (!trailingAbove && !overlappingShutter) continue;
      const targetY = lidY - r - 2;
      if (y > targetY) {
        const v = Matter.Body.getVelocity(other.body);
        Matter.Body.setPosition(other.body, { x, y: targetY });
        Matter.Body.setVelocity(other.body, { x: v.x, y: Math.min(v.y, -2.6) });
      }
    }
  }

  private finish(failure: EngineOutcome["failure"]): void {
    if (this.phaseValue !== "running") return;
    this.phaseValue = "finished";
    const landings: LandingEvent[] = this.balls
      .filter((b) => b.landedSlot !== null)
      .map((b) => ({ playerId: b.playerId, slotIndex: b.landedSlot as number }));
    const counts = new Map<number, number>();
    landings.forEach((l) => counts.set(l.slotIndex, (counts.get(l.slotIndex) ?? 0) + 1));
    const duplicateSlots = [...counts.entries()].filter(([, n]) => n > 1).map(([s]) => s);
    // Freeze balls where they are so the board shows the true final state.
    for (const b of this.balls) Matter.Body.setStatic(b.body, true);
    this.outcomeValue = { landings, failure, elapsedMs: Math.round(this.elapsedMs), duplicateSlots };
    const outcome = this.outcomeValue;
    for (const l of [...this.finishListeners]) l(outcome);
  }
}
