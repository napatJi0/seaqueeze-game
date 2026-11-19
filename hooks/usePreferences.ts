"use client";

import { useStore } from "zustand";
import { dictionaries, type Dictionary, type Language } from "@/lib/i18n";
import { preferencesStore } from "@/stores/preferences-store";

export function useLanguage(): Language {
  return useStore(preferencesStore, (s) => s.language);
}

/** Current translation dictionary. */
export function useT(): Dictionary {
  return dictionaries[useLanguage()];
}
