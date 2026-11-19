/** A source of uniformly distributed numbers in [0, 1). Injectable for tests. */
export type RandomSource = () => number;

/** Cryptographically strong default random source (falls back to Math.random). */
export const secureRandom: RandomSource = () => {
  const cryptoObj: Crypto | undefined = typeof globalThis.crypto !== "undefined" ? globalThis.crypto : undefined;
  if (cryptoObj && typeof cryptoObj.getRandomValues === "function") {
    const buf = new Uint32Array(1);
    cryptoObj.getRandomValues(buf);
    return (buf[0] ?? 0) / 4294967296;
  }
  return Math.random();
};

/** Unbiased Fisher–Yates shuffle returning a new array. */
export function shuffle<T>(items: readonly T[], random: RandomSource = secureRandom): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const a = out[i] as T;
    out[i] = out[j] as T;
    out[j] = a;
  }
  return out;
}

export function createId(): string {
  if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `s-${Date.now().toString(36)}-${Math.floor(secureRandom() * 1e9).toString(36)}`;
}
