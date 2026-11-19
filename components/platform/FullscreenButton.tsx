"use client";

import { Maximize, Minimize } from "lucide-react";
import { useT } from "@/hooks/usePreferences";
import { useFullscreen } from "@/hooks/useResponsive";

/** Fullscreen toggle that degrades gracefully when the API is unavailable. */
export function FullscreenButton() {
  const t = useT();
  const fullscreen = useFullscreen();
  const label = !fullscreen.supported
    ? t.controls.fullscreenUnavailable
    : fullscreen.active
      ? t.controls.exitFullscreen
      : t.controls.fullscreen;
  return (
    <button
      type="button"
      onClick={() => void fullscreen.toggle()}
      disabled={!fullscreen.supported}
      aria-label={label}
      title={label}
      className="grid h-9 w-9 place-items-center border border-line text-muted transition-colors hover:text-white focus-visible:outline-2 focus-visible:outline-pink disabled:opacity-40"
    >
      {fullscreen.active ? <Minimize size={18} aria-hidden="true" /> : <Maximize size={18} aria-hidden="true" />}
    </button>
  );
}
