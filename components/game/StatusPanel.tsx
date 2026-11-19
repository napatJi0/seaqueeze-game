"use client";

import { useGame } from "@/hooks/useGame";
import { useT } from "@/hooks/usePreferences";
import { PrizeReveal } from "@/components/prizes/PrizeReveal";

/** Right-column status: lifecycle state, round type, attempt count, invalid details, results. */
export function StatusPanel() {
  const t = useT();
  const session = useGame((s) => s.session);
  const paused = useGame((s) => s.paused);
  if (!session) return null;

  const { status, activeRound } = session;
  const result =
    status === "revealing" || status === "completed"
      ? session.results.find((r) => r.roundNumber === session.currentRound)
      : undefined;
  const lastInvalid = status === "invalid" ? activeRound?.invalidAttempts.at(-1) : undefined;
  const statusText = paused ? t.status.paused : t.status[status];
  const tone = status === "invalid" ? "text-red" : status === "completed" || status === "revealing" ? "text-pink" : "text-white";
  const indicator = status === "invalid" ? "bg-red" : status === "simulating" && !paused ? "animate-pulse bg-pink" : "bg-pink";

  return (
    <section
      className="panel order-2 mx-auto w-full max-w-2xl space-y-3 overflow-hidden border-t-2 border-t-pink/70 px-4 py-3 shadow-[0_8px_24px_-16px_rgba(255,43,120,0.65)] lg:order-none lg:mx-0 lg:max-w-none lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none"
      aria-live="polite"
    >
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 lg:justify-between">
        <p className={`flex items-center gap-2 text-center text-sm font-bold tracking-[0.08em] sm:text-base lg:text-left lg:tracking-[0.12em] ${tone}`}>
          <span aria-hidden="true" className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-white/5 ${indicator}`} />
          {statusText}
        </p>
        {activeRound ? (
          <p className="tabular border border-line bg-black/30 px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-muted">
            {t.round.attempt} {activeRound.attempt}
          </p>
        ) : null}
      </div>

      {lastInvalid ? (
        <div role="alert" className="border border-red/70 bg-red/10 px-3 py-2 text-sm">
          <p className="font-bold uppercase tracking-[0.1em] text-red">{t.invalid.title}</p>
          <p className="text-white">{t.invalid[lastInvalid.reason]}</p>
          {lastInvalid.reason === "duplicate_slot" ? (
            <p className="text-xs text-muted">
              {t.invalid.duplicateSlots}:{" "}
              {[...new Set(
                lastInvalid.landings
                  .map((l) => l.slotIndex)
                  .filter((s, i, arr) => arr.indexOf(s) !== i),
              )]
                .map((s) => `${t.prize.slot} ${s + 1}`)
                .join(", ")}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-muted">{t.invalid.preserved}</p>
        </div>
      ) : null}

      {result ? <PrizeReveal result={result} /> : null}
    </section>
  );
}
