"use client";

import { ChevronRight, Pause, Play, RotateCcw, Settings2, Shuffle, Trash2, Trophy } from "lucide-react";
import { TOTAL_ROUNDS } from "@/config/rounds";
import { useGame } from "@/hooks/useGame";
import { useT } from "@/hooks/usePreferences";
import { CONFIG_EDITABLE_STATUSES } from "@/lib/game-engine/game-state";
import { gameStore } from "@/stores/game-store";
import type { GameStatus } from "@/types/game";
import { Button } from "@/components/ui/Button";

export interface ControlAvailability {
  start: boolean;
  shuffle: boolean;
  retry: boolean;
  next: boolean;
  pause: boolean;
  resume: boolean;
  reset: boolean;
  config: boolean;
}

/** Pure mapping from game state to which operator controls are enabled. */
export function controlAvailability(input: {
  status: GameStatus | null;
  hydrated: boolean;
  paused: boolean;
  busy: boolean;
  saveState: string;
}): ControlAvailability {
  const { status, hydrated, paused, busy, saveState } = input;
  const ready = hydrated && !busy && status !== null;
  const running = status === "countdown" || status === "simulating";
  return {
    start: ready && status === "idle",
    shuffle: ready && status === "idle",
    retry: ready && status === "invalid",
    next: ready && status === "completed" && saveState === "saved",
    pause: ready && running && !paused,
    resume: ready && running && paused,
    reset: ready && (!running || paused) && status !== "revealing",
    config: ready && status !== null && CONFIG_EDITABLE_STATUSES.includes(status),
  };
}

interface GameControlsProps {
  onOpenConfig: () => void;
  onOpenReset: () => void;
}

export function GameControls({ onOpenConfig, onOpenReset }: GameControlsProps) {
  const t = useT();
  const status = useGame((s) => s.session?.status ?? null);
  const round = useGame((s) => s.session?.currentRound ?? 1);
  const hydrated = useGame((s) => s.hydrated);
  const paused = useGame((s) => s.paused);
  const busy = useGame((s) => s.busy);
  const saveState = useGame((s) => s.saveState);
  const can = controlAvailability({ status, hydrated, paused, busy, saveState });
  const store = gameStore.getState;
  const isLast = round >= TOTAL_ROUNDS;

  return (
    <nav aria-label={t.controls.heading} className="grid grid-cols-2 gap-2">
      <Button
        variant="primary"
        size="lg"
        className="col-span-2"
        icon={<Play size={18} />}
        disabled={!can.start}
        onPress={() => store().startRound()}
      >
        {t.controls.start}
      </Button>
      <Button
        className="col-span-2"
        icon={<Shuffle size={16} />}
        disabled={!can.shuffle}
        onPress={() => store().shuffleBalls()}
        guardMs={300}
      >
        {t.controls.shuffle}
      </Button>
      <Button
        variant={can.retry ? "primary" : "secondary"}
        icon={<RotateCcw size={16} />}
        disabled={!can.retry}
        onPress={() => store().retryRound()}
      >
        {t.controls.retry}
      </Button>
      <Button
        variant={can.next ? "primary" : "secondary"}
        icon={isLast ? <Trophy size={16} /> : <ChevronRight size={16} />}
        disabled={!can.next}
        onPress={() => store().nextRound()}
      >
        {isLast ? t.controls.finish : t.controls.next}
      </Button>
      <Button icon={<Pause size={16} />} disabled={!can.pause} onPress={() => store().pause()} guardMs={250}>
        {t.controls.pause}
      </Button>
      <Button icon={<Play size={16} />} disabled={!can.resume} onPress={() => store().resume()} guardMs={250}>
        {t.controls.resume}
      </Button>
      <Button variant="ghost" size="sm" icon={<Settings2 size={14} />} disabled={!can.config} onPress={onOpenConfig}>
        {t.controls.config}
      </Button>
      <Button variant="danger" size="sm" icon={<Trash2 size={14} />} disabled={!can.reset} onPress={onOpenReset}>
        {t.controls.reset}
      </Button>
    </nav>
  );
}
