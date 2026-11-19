/**
 * Slot sensor detection.
 *
 * Membership is evaluated with a direct Matter.js collision test between each
 * ball and the slot sensor bodies every step. (Tracking collisionStart /
 * collisionEnd events alone proved unreliable for balls at rest: an "end"
 * event can arrive while the ball is still inside the sensor.)
 */
import Matter from "matter-js";

export const SLOT_SENSOR_LABEL = "slot-sensor";
export const BALL_LABEL = "ball";

export class SlotSensorTracker {
  private sensors: { body: Matter.Body; slot: number }[] = [];

  registerSensor(sensor: Matter.Body, slotIndex: number): void {
    this.sensors.push({ body: sensor, slot: slotIndex });
  }

  /** Slot sensor the ball currently overlaps (the one containing its center wins), or null. */
  slotOf(ball: Matter.Body): number | null {
    let found: number | null = null;
    for (const s of this.sensors) {
      if (!Matter.Collision.collides(ball, s.body)) continue;
      if (Matter.Bounds.contains(s.body.bounds, ball.position)) return s.slot;
      found ??= s.slot;
    }
    return found;
  }

  destroy(): void {
    this.sensors = [];
  }
}
