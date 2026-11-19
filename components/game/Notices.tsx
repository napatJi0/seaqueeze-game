"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { useGame } from "@/hooks/useGame";
import { useT } from "@/hooks/usePreferences";
import { gameStore } from "@/stores/game-store";

/** Operator-facing toasts: recovery notices, storage failures, rejected actions. */
export function Notices() {
  const t = useT();
  const notice = useGame((s) => s.notice);
  const error = useGame((s) => s.error);
  const saveState = useGame((s) => s.saveState);

  // Transient confirmations auto-dismiss; warnings stay until dismissed.
  useEffect(() => {
    if (notice !== "configSaved" && notice !== "restored") return;
    const id = window.setTimeout(() => gameStore.getState().dismissNotice(), 2600);
    return () => window.clearTimeout(id);
  }, [notice]);

  const noticeText =
    notice === "configSaved"
      ? t.config.saved
      : notice === "storageUnavailable"
        ? t.notices.storageUnavailable
        : notice
          ? t.notices[notice === "new" ? "restored" : notice]
          : null;
  const errorText = error && error !== "physicsInit" ? t.errors[error] : null;
  const warn = notice === "corrupted" || notice === "unsupported_version" || notice === "storageUnavailable" || notice === "interrupted";

  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-40 flex flex-col items-center gap-2 px-4" aria-live="polite">
      <AnimatePresence>
        {saveState === "error" ? (
          <Toast key="save" tone="error" text={t.notices.saveFailed}>
            <button
              type="button"
              className="pointer-events-auto border border-white/40 px-2 py-1 text-xs font-bold uppercase tracking-wider hover:bg-white/10"
              onClick={() => void gameStore.getState().retrySave()}
            >
              {t.notices.retrySave}
            </button>
          </Toast>
        ) : null}
        {errorText ? (
          <Toast key={`err-${error}`} tone="error" text={errorText} onDismiss={() => gameStore.getState().dismissError()} dismissLabel={t.notices.dismiss} />
        ) : null}
        {noticeText ? (
          <Toast
            key={`notice-${notice}`}
            tone={warn ? "warn" : "info"}
            text={noticeText}
            onDismiss={() => gameStore.getState().dismissNotice()}
            dismissLabel={t.notices.dismiss}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function Toast({
  tone,
  text,
  onDismiss,
  dismissLabel,
  children,
}: {
  tone: "info" | "warn" | "error";
  text: string;
  onDismiss?: () => void;
  dismissLabel?: string;
  children?: ReactNode;
}) {
  const border = tone === "error" ? "border-red" : tone === "warn" ? "border-[#facc15]" : "border-pink";
  return (
    <motion.div
      role={tone === "info" ? "status" : "alert"}
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className={`pointer-events-auto flex max-w-xl items-center gap-3 border-l-4 ${border} bg-[#141414]/95 px-4 py-2.5 text-sm text-white shadow-2xl`}
    >
      <span className="flex-1">{text}</span>
      {children}
      {onDismiss ? (
        <button type="button" aria-label={dismissLabel} onClick={onDismiss} className="text-muted hover:text-white">
          <X size={16} aria-hidden="true" />
        </button>
      ) : null}
    </motion.div>
  );
}
