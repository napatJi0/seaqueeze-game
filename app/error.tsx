"use client";

import { useEffect } from "react";
import { dictionaries, loadLanguagePreference } from "@/lib/i18n";

/** Route-level error boundary for unexpected component errors. */
export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = dictionaries[loadLanguagePreference()];
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="arena-bg grid min-h-svh place-items-center p-6 text-center">
      <div className="panel max-w-md p-6">
        <p className="font-display text-3xl text-red">{t.errors.unexpected}</p>
        <p className="mt-2 text-sm text-muted">{t.errors.boundaryHint}</p>
        <button
          type="button"
          onClick={reset}
          className="mt-4 border border-pink px-4 py-2 text-sm font-bold uppercase tracking-[0.15em] text-pink hover:bg-pink/10"
        >
          {t.errors.reload}
        </button>
      </div>
    </div>
  );
}
