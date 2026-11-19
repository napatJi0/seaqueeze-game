"use client";

import { useEffect, useRef, type ReactNode } from "react";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

/** Accessible modal built on the native <dialog> element (focus trap + Esc). */
export function Dialog({ open, onClose, title, description, children, footer, wide = false }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      aria-labelledby="dialog-title"
      className={`panel m-auto max-h-[92svh] w-[calc(100vw-2rem)] overflow-hidden p-0 text-ink ${wide ? "max-w-4xl" : "max-w-lg"}`}
    >
      {open ? (
        <div className="flex max-h-[92svh] flex-col">
          <header className="border-b border-line px-5 py-4">
            <h2 id="dialog-title" className="text-lg font-bold uppercase tracking-[0.12em]">
              {title}
            </h2>
            {description ? <p className="mt-1 text-sm text-muted">{description}</p> : null}
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer ? <footer className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">{footer}</footer> : null}
        </div>
      ) : null}
    </dialog>
  );
}
