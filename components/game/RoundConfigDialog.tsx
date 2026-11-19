"use client";

import { Lock } from "lucide-react";
import { PRIZE_TYPES } from "@/config/prizes";
import { useMemo, useState } from "react";
import { useGame } from "@/hooks/useGame";
import { useT } from "@/hooks/usePreferences";
import { pad2 } from "@/lib/i18n";
import { format, typeDescription, typeLabel } from "@/lib/i18n/labels";
import { lockedRoundNumbers } from "@/lib/game-engine/game-state";
import { countTypes, createDefaultRoundConfigs, setRoundType } from "@/lib/round-manager/round-config";
import { validateRoundConfigs } from "@/lib/round-manager/round-validator";
import { gameStore } from "@/stores/game-store";
import type { PrizeType } from "@/types/prize";
import type { RoundConfig } from "@/types/round";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

interface RoundConfigDialogProps {
  open: boolean;
  onClose: () => void;
}

/** One distinct look per prize type in the round grid. */
const TYPE_STYLE: Record<PrizeType, string> = {
  A: "border-pink/70 bg-pink/15",
  B: "border-line bg-white/[0.04]",
  C: "border-sky-400/80 bg-sky-400/25",
  D: "border-amber-300/80 bg-amber-300/25",
};

/** Clicking a round cycles A → B → C → D → A. */
function nextPrizeType(type: PrizeType): PrizeType {
  return PRIZE_TYPES[(PRIZE_TYPES.indexOf(type) + 1) % PRIZE_TYPES.length] as PrizeType;
}

export function RoundConfigDialog({ open, onClose }: RoundConfigDialogProps) {
  const t = useT();
  return (
    <Dialog open={open} onClose={onClose} title={t.config.title} description={t.config.description} wide>
      {open ? <ConfigEditor onClose={onClose} /> : null}
    </Dialog>
  );
}

/** Mounted fresh each time the dialog opens, so the draft starts from the saved config. */
function ConfigEditor({ onClose }: { onClose: () => void }) {
  const t = useT();
  const session = useGame((s) => s.session);
  const [draft, setDraft] = useState<RoundConfig[]>(() => session?.roundConfigs.map((c) => ({ ...c })) ?? []);
  const [error, setError] = useState<string | null>(null);
  const locked = useMemo(() => (session ? lockedRoundNumbers(session) : new Set<number>()), [session]);
  const counts = countTypes(draft);
  if (!session) return null;

  /** Apply a bulk pattern without touching locked rounds. */
  const applyPattern = (typeFor: (round: number) => PrizeType) => {
    setDraft((d) => d.map((c) => (locked.has(c.roundNumber) ? c : { ...c, prizeType: typeFor(c.roundNumber) })));
    setError(null);
  };
  const defaults = createDefaultRoundConfigs();

  const save = () => {
    if (!validateRoundConfigs(draft).ok) {
      setError(t.config.invalid);
      return;
    }
    const result = gameStore.getState().saveRoundConfigs(draft);
    if (result.ok) onClose();
    else setError(result.error === "locked_round_edit" ? t.config.notEditable : t.config.invalid);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {PRIZE_TYPES.map((type) => (
          <Button key={type} size="sm" onPress={() => applyPattern(() => type)} guardMs={0}>
            {format(t.config.allOfType, { type: typeLabel(t, type) })}
          </Button>
        ))}
        <Button size="sm" onPress={() => applyPattern((r) => (r % 2 === 1 ? "A" : "B"))} guardMs={0}>
          {t.config.alternate}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onPress={() => applyPattern((r) => defaults.find((c) => c.roundNumber === r)?.prizeType ?? "A")}
          guardMs={0}
        >
          {t.config.resetDefault}
        </Button>
      </div>

      <p className="tabular flex flex-wrap gap-x-4 gap-y-1 text-xs uppercase tracking-[0.12em] text-muted">
        {PRIZE_TYPES.map((type) => (
          <span key={type} title={typeDescription(t, type)}>
            {typeLabel(t, type)}: <strong className="text-white">{counts[type]}</strong>
          </span>
        ))}
      </p>
      <p className="text-xs text-muted">{t.config.cycleHint}</p>

      <ol className="grid grid-cols-3 gap-1.5 sm:grid-cols-6 md:grid-cols-10">
        {draft.map((c) => {
          const isLocked = locked.has(c.roundNumber);
          return (
            <li key={c.roundNumber}>
              <button
                type="button"
                disabled={isLocked}
                aria-label={`${t.round.label} ${pad2(c.roundNumber)}: ${typeLabel(t, c.prizeType)}${isLocked ? ` (${t.config.lockedRound})` : ""}`}
                title={typeDescription(t, c.prizeType)}
                onClick={() => {
                  setDraft((d) => setRoundType(d, c.roundNumber, nextPrizeType(c.prizeType)));
                  setError(null);
                }}
                className={`flex h-14 w-full flex-col items-center justify-center border text-center text-white transition-colors focus-visible:outline-2 focus-visible:outline-pink disabled:cursor-not-allowed disabled:opacity-50 ${TYPE_STYLE[c.prizeType]}`}
              >
                <span className="tabular text-[10px] text-muted">{pad2(c.roundNumber)}</span>
                <span className="flex items-center gap-1 font-display text-xl leading-none">
                  {c.prizeType}
                  {isLocked ? <Lock size={10} aria-hidden="true" /> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {error ? (
        <p role="alert" className="text-sm text-red">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
        <Button variant="ghost" onPress={onClose} guardMs={0}>
          {t.config.cancel}
        </Button>
        <Button variant="primary" onPress={save}>
          {t.config.save}
        </Button>
      </div>
    </div>
  );
}
