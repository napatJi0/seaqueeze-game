"use client";

import { TOTAL_ROUNDS } from "@/config/rounds";
import { useT } from "@/hooks/usePreferences";
import { pad2 } from "@/lib/i18n";
import { ProgressBar } from "@/components/ui/ProgressBar";

export function RoundIndicator({ round, completed }: { round: number; completed: number }) {
  const t = useT();
  return (
    <div className="flex min-w-0 flex-col items-center gap-1">
      <p className="flex items-baseline gap-2 leading-none" aria-live="polite">
        <span className="text-[10px] uppercase tracking-[0.35em] text-muted sm:text-xs">{t.round.label}</span>
        <span className="font-display tabular text-3xl text-white sm:text-4xl xl:text-5xl">{pad2(round)}</span>
        <span className="font-display tabular text-lg text-muted sm:text-xl">
          {t.round.of} {TOTAL_ROUNDS}
        </span>
      </p>
      <div className="w-36 sm:w-56">
        <ProgressBar value={completed} max={TOTAL_ROUNDS} label={`${t.round.progress}: ${completed}/${TOTAL_ROUNDS}`} />
      </div>
    </div>
  );
}
