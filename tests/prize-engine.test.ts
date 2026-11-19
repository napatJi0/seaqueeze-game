import { describe, expect, it } from "vitest";
import { buildPrizePool, generateArrangement } from "@/lib/prize-engine/prize-generator";
import { validateArrangement } from "@/lib/prize-engine/prize-validator";
import { seeded } from "./helpers";

const count = (arr: number[], rank: number) => arr.filter((r) => r === rank).length;

describe("prize distribution", () => {
  it("Type A = 1×Rank1, 0×Rank2, 3×Rank3", () => {
    const pool = buildPrizePool("A");
    expect(pool).toHaveLength(4);
    expect([count(pool, 1), count(pool, 2), count(pool, 3)]).toEqual([1, 0, 3]);
  });

  it("Type B = 0×Rank1, 2×Rank2, 2×Rank3", () => {
    const pool = buildPrizePool("B");
    expect(pool).toHaveLength(4);
    expect([count(pool, 1), count(pool, 2), count(pool, 3)]).toEqual([0, 2, 2]);
  });
});

describe("prize distribution (new types)", () => {
  it("Type C = 0×Rank1, 1×Rank2, 3×Rank3", () => {
    const pool = buildPrizePool("C");
    expect(pool).toHaveLength(4);
    expect([count(pool, 1), count(pool, 2), count(pool, 3)]).toEqual([0, 1, 3]);
  });

  it("Type D = 0×Rank1, 0×Rank2, 4×Rank3", () => {
    const pool = buildPrizePool("D");
    expect(pool).toHaveLength(4);
    expect([count(pool, 1), count(pool, 2), count(pool, 3)]).toEqual([0, 0, 4]);
  });
});

describe("prize randomization", () => {
  it.each(["A", "B", "C", "D"] as const)("never changes the Type %s distribution over 2000 shuffles", (type) => {
    const rng = seeded(42);
    const expected = buildPrizePool(type).slice().sort();
    for (let i = 0; i < 2000; i++) {
      const arr = generateArrangement(type, rng);
      expect(arr.slice().sort()).toEqual(expected);
      expect(validateArrangement(type, arr).ok).toBe(true);
    }
  });

  it("places the Type A Rank 1 prize in every slot with roughly uniform frequency", () => {
    const rng = seeded(7);
    const hits = [0, 0, 0, 0];
    const N = 8000;
    for (let i = 0; i < N; i++) hits[generateArrangement("A", rng).indexOf(1)]! += 1;
    for (const h of hits) expect(Math.abs(h / N - 0.25)).toBeLessThan(0.03);
  });

  it("produces different arrangements across rounds (independent shuffles)", () => {
    const rng = seeded(3);
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) seen.add(generateArrangement("B", rng).join(""));
    expect(seen.size).toBe(6); // all C(4,2) Type B permutations appear
  });
});

describe("prize validation", () => {
  it("rejects wrong length, unsupported ranks, wrong distributions, unknown types", () => {
    expect(validateArrangement("A", [1, 3, 3])).toEqual({ ok: false, reason: "wrong_length" });
    expect(validateArrangement("A", [1, 3, 3, 4])).toEqual({ ok: false, reason: "unsupported_rank" });
    expect(validateArrangement("A", [1, 1, 3, 3])).toEqual({ ok: false, reason: "wrong_distribution" });
    expect(validateArrangement("B", [1, 2, 2, 3])).toEqual({ ok: false, reason: "wrong_distribution" });
    expect(validateArrangement("E", [2, 2, 3, 3])).toEqual({ ok: false, reason: "unknown_type" });
    expect(validateArrangement("C", [3, 2, 3, 3])).toEqual({ ok: true });
    expect(validateArrangement("C", [2, 2, 3, 3])).toEqual({ ok: false, reason: "wrong_distribution" });
    expect(validateArrangement("D", [3, 3, 3, 3])).toEqual({ ok: true });
    expect(validateArrangement("D", [1, 3, 3, 3])).toEqual({ ok: false, reason: "wrong_distribution" });
    expect(validateArrangement("B", [3, 2, 3, 2])).toEqual({ ok: true });
  });
});
