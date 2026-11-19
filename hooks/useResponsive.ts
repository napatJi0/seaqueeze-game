"use client";

import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";

export interface Size {
  width: number;
  height: number;
}

/** Observe an element's content box size. */
export function useElementSize(ref: RefObject<HTMLElement | null>): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const r = el.getBoundingClientRect();
      setSize((prev) =>
        Math.abs(prev.width - r.width) < 0.5 && Math.abs(prev.height - r.height) < 0.5
          ? prev
          : { width: r.width, height: r.height },
      );
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

/** Largest size with the given aspect ratio (w/h) that fits inside the container. */
export function fitAspect(container: Size, aspect: number): Size {
  if (container.width <= 0) return { width: 0, height: 0 };
  if (container.height <= 0) return { width: container.width, height: container.width / aspect };
  const width = Math.min(container.width, container.height * aspect);
  return { width: Math.floor(width), height: Math.floor(width / aspect) };
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(cb: () => void): () => void {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION_QUERY).matches,
    () => false,
  );
}

function subscribeFullscreen(cb: () => void): () => void {
  document.addEventListener("fullscreenchange", cb);
  return () => document.removeEventListener("fullscreenchange", cb);
}

const noopSubscribe = () => () => undefined;

/** Fullscreen API wrapper that never assumes permission. */
export function useFullscreen(): { supported: boolean; active: boolean; toggle: () => Promise<void> } {
  const supported = useSyncExternalStore(
    noopSubscribe,
    () => Boolean(document.fullscreenEnabled && typeof document.documentElement.requestFullscreen === "function"),
    () => false,
  );
  const active = useSyncExternalStore(
    subscribeFullscreen,
    () => Boolean(document.fullscreenElement),
    () => false,
  );
  const toggle = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen({ navigationUI: "hide" });
    } catch {
      // Permission denied or unsupported: the game stays usable windowed.
    }
  };
  return { supported, active, toggle };
}
