import { describe, expect, it } from "vitest";
import { TOTAL_ROUNDS } from "@/config/rounds";
import { countTypes, createDefaultRoundConfigs, setRoundType } from "@/lib/round-manager/round-config";
import { validateRoundConfigs } from "@/lib/round-manager/round-validator";
import { createSession, updateRoundConfigs } from "@/lib/game-engine/game-state";
import { sessionCompletedThrough, testClock, unwrap } from "./helpers";

describe("round configuration", () => {
  it("has exactly 60 rounds numbered 1..60", () => {
    const c = createDefaultRoundConfigs();
    expect(c).toHaveLength(TOTAL_ROUNDS);
    expect(c.map((x) => x.roundNumber)).toEqual(Array.from({ length: 60 }, (_, i) => i + 1));
    expect(validateRoundConfigs(c).ok).toBe(true);
  });

  it("rejects duplicate round numbers", () => {
    const c = createDefaultRoundConfigs();
    c[5] = { roundNumber: 5, prizeType: "A" };
    const r = validateRoundConfigs(c);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.issues).toContainEqual({ code: "duplicate_round", roundNumber: 5 });
      expect(r.issues).toContainEqual({ code: "missing_round", roundNumber: 6 });
    }
  });

  it("rejects missing rounds and wrong counts", () => {
    const r = validateRoundConfigs(createDefaultRoundConfigs().slice(0, 59));
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.issues).toContainEqual({ code: "wrong_count", count: 59 });
      expect(r.issues).toContainEqual({ code: "missing_round", roundNumber: 60 });
    }
  });

  it("only accepts Types A, B, C and D", () => {
    const c: unknown[] = createDefaultRoundConfigs();
    for (const type of ["C", "D"]) {
      c[0] = { roundNumber: 1, prizeType: type };
      expect(validateRoundConfigs(c).ok).toBe(true);
    }
    c[0] = { roundNumber: 1, prizeType: "E" };
    expect(validateRoundConfigs(c).ok).toBe(false);
    c[0] = { roundNumber: 61, prizeType: "A" };
    expect(validateRoundConfigs(c).ok).toBe(false);
  });

  it("edits persist in the session and counts update", () => {
    const s = createSession(undefined, testClock);
    const edited = setRoundType(s.roundConfigs, 2, "A");
    const next = unwrap(updateRoundConfigs(s, edited, testClock));
    expect(next.roundConfigs.find((c) => c.roundNumber === 2)?.prizeType).toBe("A");
    expect(countTypes(next.roundConfigs)).toEqual({ A: 31, B: 29, C: 0, D: 0 });
  });

  it("forbids editing during an active round and changing completed rounds", () => {
    const completed = sessionCompletedThrough(1); // status completed, round 1 recorded as A
    const changedPast = setRoundType(completed.roundConfigs, 1, "B");
    expect(updateRoundConfigs(completed, changedPast, testClock)).toEqual({ ok: false, error: "locked_round_edit" });
    const changedFuture = setRoundType(completed.roundConfigs, 10, "A");
    expect(updateRoundConfigs(completed, changedFuture, testClock).ok).toBe(true);

    const active = { ...completed, status: "simulating" as const };
    expect(updateRoundConfigs(active, changedFuture, testClock)).toEqual({ ok: false, error: "locked_round_edit" });
  });
});
