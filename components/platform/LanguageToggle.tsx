"use client";

import { useLanguage, useT } from "@/hooks/usePreferences";
import { LANGUAGES, dictionaries } from "@/lib/i18n";
import { preferencesStore } from "@/stores/preferences-store";

export function LanguageToggle() {
  const t = useT();
  const language = useLanguage();
  return (
    <div role="group" aria-label={t.controls.language} className="flex border border-line">
      {LANGUAGES.map((lang) => (
        <button
          key={lang}
          type="button"
          aria-pressed={language === lang}
          aria-label={dictionaries[lang].meta.languageName}
          onClick={() => preferencesStore.getState().setLanguage(lang)}
          className={`h-9 px-2.5 text-xs font-bold tracking-[0.1em] transition-colors focus-visible:outline-2 focus-visible:outline-pink ${
            language === lang ? "bg-white text-black" : "text-muted hover:text-white"
          }`}
        >
          {dictionaries[lang].meta.short}
        </button>
      ))}
    </div>
  );
}
