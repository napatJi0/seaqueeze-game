/**
 * Platform-wide UI preferences (shared by the lobby and every game).
 * Persisted in LocalStorage; never holds game state.
 */
import { createStore } from "zustand/vanilla";
import { DEFAULT_LANGUAGE, loadLanguagePreference, saveLanguagePreference, type Language } from "@/lib/i18n";

export interface PreferencesState {
  language: Language;
  /** Load saved preferences (call once on the client). */
  load(): void;
  setLanguage(lang: Language): void;
}

export const preferencesStore = createStore<PreferencesState>()((set) => ({
  language: DEFAULT_LANGUAGE,
  load() {
    set({ language: loadLanguagePreference() });
  },
  setLanguage(lang) {
    saveLanguagePreference(lang);
    set({ language: lang });
  },
}));
