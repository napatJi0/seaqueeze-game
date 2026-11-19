import { describe, expect, it } from "vitest";
import { en } from "@/lib/i18n/en";
import { th } from "@/lib/i18n/th";

function keys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === "object" && v !== null ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe("localization dictionaries", () => {
  it("Thai and English define the same keys", () => {
    expect(keys(th).sort()).toEqual(keys(en).sort());
  });

  it("no translation is empty", () => {
    const values = (o: object): string[] => Object.values(o).flatMap((v) => (typeof v === "string" ? [v] : values(v)));
    expect(values(th).every((v) => v.trim().length > 0)).toBe(true);
    expect(values(en).every((v) => v.trim().length > 0)).toBe(true);
  });
});
