"use client";

import { useRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick"> {
  variant?: Variant;
  icon?: ReactNode;
  /** Click handler. Repeated clicks within `guardMs` are ignored (no double execution). */
  onPress?: () => void;
  guardMs?: number;
  size?: "md" | "lg" | "sm";
}

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-pink text-white border-pink shadow-[0_0_24px_-6px_rgba(255,43,120,0.8)] hover:bg-[#ff4a8c] disabled:shadow-none",
  secondary: "bg-elevated text-ink border-line hover:border-ink/40 hover:bg-[#2a2a2a]",
  danger: "bg-transparent text-red border-red/60 hover:bg-red/10",
  ghost: "bg-transparent text-muted border-transparent hover:text-ink hover:bg-white/5",
};

const SIZES = {
  sm: "h-9 px-3 text-xs",
  md: "h-11 px-4 text-sm",
  lg: "h-14 px-5 text-base",
};

export function Button({
  variant = "secondary",
  icon,
  onPress,
  guardMs = 600,
  size = "md",
  className = "",
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  const lastPress = useRef(0);
  return (
    <button
      type={type}
      disabled={disabled}
      aria-disabled={disabled}
      onClick={() => {
        const now = performance.now();
        if (disabled || now - lastPress.current < guardMs) return;
        lastPress.current = now;
        onPress?.();
      }}
      className={`inline-flex select-none items-center justify-center gap-2 border font-semibold uppercase tracking-[0.12em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink disabled:cursor-not-allowed disabled:border-line disabled:bg-surface disabled:text-muted/60 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...rest}
    >
      {icon ? <span aria-hidden="true" className="shrink-0">{icon}</span> : null}
      {children}
    </button>
  );
}
