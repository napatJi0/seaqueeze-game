import { describe, expect, it } from "vitest";
import { validateLandings } from "@/lib/game-engine/landing-validation";
import type { LandingEvent } from "@/types/game";
import { duplicateLandings, uniqueLandings } from "./helpers";

describe("landing validation", () => {
  it("four unique slots = valid", () => {
    expect(validateLandings(uniqueLandings)).toEqual({ valid: true, landings: uniqueLandings });
  });

  it("two balls in one slot = invalid", () => {
    const r = validateLandings(duplicateLandings);
    expect(r.valid).toBe(false);
    if (!r.valid) {
      expect(r.reason).toBe("duplicate_slot");
      expect(r.duplicateSlots).toEqual([0]);
    }
  });

  it("three balls in one slot = invalid", () => {
    const r = validateLandings([
      { playerId: "circle", slotIndex: 1 },
      { playerId: "triangle", slotIndex: 1 },
      { playerId: "square", slotIndex: 1 },
      { playerId: "hexagon", slotIndex: 3 },
    ]);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toBe("duplicate_slot");
  });

  it("missing landing = invalid", () => {
    const r = validateLandings(uniqueLandings.slice(0, 3));
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toBe("missing_landing");
  });

  it("more than four landing events (conflicting) are rejected", () => {
    const r = validateLandings([...uniqueLandings, { playerId: "circle", slotIndex: 3 }]);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.reason).toBe("physics_error");
  });

  it("unknown balls and out-of-range slots are rejected", () => {
    expect(validateLandings([{ playerId: "star", slotIndex: 0 } as unknown as LandingEvent]).valid).toBe(false);
    expect(validateLandings([{ playerId: "circle", slotIndex: 4 }]).valid).toBe(false);
  });

  it("exact duplicate collision events are collapsed safely", () => {
    const r = validateLandings([...uniqueLandings, ...uniqueLandings, uniqueLandings[0]!]);
    expect(r).toEqual({ valid: true, landings: uniqueLandings });
  });
});
