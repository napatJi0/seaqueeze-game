import { languageSchema } from "@/lib/validation/schemas";
import { en, type Dictionary } from "./en";
import { th } from "./th";

export type Language = "th" | "en";
export type { Dictionary };

export const DEFAULT_LANGUAGE: Language = "th";
export const LANGUAGES: readonly Language[] = ["th", "en"];
export const dictionaries: Record<Language, Dictionary> = { th, en };

const STORAGE_KEY = "squid-survival:language";
/** Key used before the platform existed (SQUID PLINKO only); still read as a fallback. */
const LEGACY_STORAGE_KEY = "squid-plinko:language";

export function loadLanguagePreference(): Language {
  try {
    const storage = globalThis.localStorage;
    const raw = storage?.getItem(STORAGE_KEY) ?? storage?.getItem(LEGACY_STORAGE_KEY);
    const parsed = languageSchema.safeParse(raw);
    return parsed.success ? parsed.data : DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

export function saveLanguagePreference(lang: Language): void {
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, lang);
  } catch {
    // Preference only; ignore storage failures.
  }
}

/** Two-digit round label, e.g. 1 → "01". */
export function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
