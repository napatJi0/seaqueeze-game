"use client";

import { useGame } from "@/hooks/useGame";
import { useT } from "@/hooks/usePreferences";
import { gameStore } from "@/stores/game-store";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

export function ResetDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const busy = useGame((s) => s.busy);
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={t.reset.title}
      footer={
        <>
          <Button variant="ghost" onPress={onClose} guardMs={0}>
            {t.reset.cancel}
          </Button>
          <Button
            variant="danger"
            disabled={busy}
            onPress={() => {
              void gameStore
                .getState()
                .resetGame()
                .then(onClose);
            }}
          >
            {busy ? t.controls.working : t.reset.confirm}
          </Button>
        </>
      }
    >
      <p className="text-sm text-white/85">{t.reset.body}</p>
    </Dialog>
  );
}
