"use client";

import { useRef } from "react";
import { usePhysics } from "@/hooks/usePhysics";
import { usePrefersReducedMotion } from "@/hooks/useResponsive";
import type { BoardLayout } from "@/lib/physics/board-layout";

interface PlinkoCanvasProps {
  layout: BoardLayout;
  width: number;
  height: number;
  label: string;
}

export function PlinkoCanvas({ layout, width, height, label }: PlinkoCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  usePhysics(canvasRef, layout, { width, height }, reducedMotion);
  return <canvas ref={canvasRef} role="img" aria-label={label} style={{ width, height, display: "block" }} />;
}
