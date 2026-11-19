"use client";

import { useEffect } from "react";
import { useLanguage } from "@/hooks/usePreferences";
import { preferencesStore } from "@/stores/preferences-store";

/** Loads saved preferences once and keeps <html lang> in sync. Renders nothing. */
export function PreferencesBootstrap() {
  const language = useLanguage();
  useEffect(() => {
    preferencesStore.getState().load();
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  return null;
}
