import { PLAYER_IDS } from "@/config/players";
import { SLOT_COUNT } from "@/config/prizes";
import type { InvalidReason, LandingEvent } from "@/types/game";
import type { PlayerId } from "@/types/player";

export type LandingCheck =
  | { valid: true; landings: LandingEvent[] }
  | { valid: false; reason: InvalidReason; landings: LandingEvent[]; duplicateSlots: number[] };

/**
 * Validate the landing events of one attempt.
 *
 * Rules:
 *  - Exact duplicate events (same ball, same slot) are collapsed safely.
 *  - A ball reporting two different slots, unknown balls, out-of-range slots,
 *    or more than four distinct landings are rejected (physics_error).
 *  - Fewer than four landed balls → missing_landing.
 *  - Two or more balls in the same slot → duplicate_slot.
 *  - Otherwise valid: four balls in four unique slots.
 */
export function validateLandings(events: readonly LandingEvent[]): LandingCheck {
  const byPlayer = new Map<PlayerId, number>();
  for (const e of events) {
    if (!PLAYER_IDS.includes(e.playerId)) return reject("physics_error");
    if (!Number.isInteger(e.slotIndex) || e.slotIndex < 0 || e.slotIndex >= SLOT_COUNT) return reject("physics_error");
    const prev = byPlayer.get(e.playerId);
    if (prev === undefined) byPlayer.set(e.playerId, e.slotIndex);
    else if (prev !== e.slotIndex) return reject("physics_error");
  }
  if (byPlayer.size > SLOT_COUNT) return reject("physics_error");

  // Canonical order: player order.
  const landings: LandingEvent[] = PLAYER_IDS.filter((id) => byPlayer.has(id)).map((id) => ({
    playerId: id,
    slotIndex: byPlayer.get(id) as number,
  }));

  const occupancy = new Map<number, number>();
  for (const l of landings) occupancy.set(l.slotIndex, (occupancy.get(l.slotIndex) ?? 0) + 1);
  const duplicateSlots = [...occupancy.entries()].filter(([, n]) => n > 1).map(([s]) => s).sort();

  if (duplicateSlots.length > 0) return { valid: false, reason: "duplicate_slot", landings, duplicateSlots };
  if (landings.length < PLAYER_IDS.length) return { valid: false, reason: "missing_landing", landings, duplicateSlots };
  return { valid: true, landings };

  function reject(reason: InvalidReason): LandingCheck {
    return { valid: false, reason, landings: [], duplicateSlots: [] };
  }
}
