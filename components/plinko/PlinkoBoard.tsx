"use client";

import { useRef } from "react";
import { fitAspect, useElementSize } from "@/hooks/useResponsive";
import { useGame } from "@/hooks/useGame";
import { useT } from "@/hooks/usePreferences";
import { createBoardLayout } from "@/lib/physics/board-layout";
import { BoardOverlay } from "./BoardOverlay";
import { PlinkoCanvas } from "./PlinkoCanvas";
import { PrizeSlots } from "./PrizeSlots";

/** Module-level constant: the board geometry never changes at runtime. */
const LAYOUT = createBoardLayout();
/** Height of the prize slot strip relative to board width. */
const STRIP_RATIO = 0.15;
const ASPECT = LAYOUT.width / (LAYOUT.height + LAYOUT.width * STRIP_RATIO);

export function PlinkoBoard() {
  const t = useT();
  const containerRef = useRef<HTMLDivElement>(null);
  const container = useElementSize(containerRef);
  const fit = fitAspect(container, ASPECT);
  const physicsError = useGame((s) => s.error === "physicsInit");
  const width = fit.width;
  const canvasHeight = Math.round((width * LAYOUT.height) / LAYOUT.width);
  const stripHeight = Math.max(0, fit.height - canvasHeight);

  return (
    <div ref={containerRef} className="flex h-full w-full min-w-0 items-center justify-center">
      {width > 0 ? (
        <div className="board-frame relative bg-black" style={{ width }}>
          <div className="relative" style={{ height: canvasHeight }}>
            <PlinkoCanvas layout={LAYOUT} width={width} height={canvasHeight} label={t.app.title} />
            <BoardOverlay />
            {physicsError ? (
              <div role="alert" className="absolute inset-0 grid place-items-center bg-black/80 p-6 text-center text-red">
                {t.errors.physicsInit}
              </div>
            ) : null}
          </div>
          <PrizeSlots height={stripHeight} />
        </div>
      ) : null}
    </div>
  );
}
