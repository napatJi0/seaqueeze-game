import type { ShapeKind } from "@/types/player";

interface PlayerSymbolProps {
  kind: ShapeKind;
  color?: string;
  size?: number;
  strokeWidth?: number;
  filled?: boolean;
  title?: string;
  className?: string;
}

/** Original player / decorative symbol (SVG): circle, triangle, star, umbrella, square, hexagon. Recognizable without color. */
export function PlayerSymbol({
  kind,
  color = "currentColor",
  size = 24,
  strokeWidth = 2.5,
  filled = false,
  title,
  className,
}: PlayerSymbolProps) {
  const common = {
    fill: filled ? color : "none",
    stroke: color,
    strokeWidth,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
    >
      {kind === "circle" && <circle cx="12" cy="12" r="9" {...common} />}
      {kind === "triangle" && <path d="M12 3 L21.5 20 H2.5 Z" {...common} />}
      {kind === "square" && <rect x="3.5" y="3.5" width="17" height="17" {...common} />}
      {kind === "hexagon" && <path d="M21 12 L16.5 19.8 H7.5 L3 12 L7.5 4.2 H16.5 Z" {...common} />}
      {kind === "star" && (
        <path d="M12 2.6 L14.6 8.6 L21.1 9.1 L16.2 13.4 L17.7 19.8 L12 16.4 L6.3 19.8 L7.8 13.4 L2.9 9.1 L9.4 8.6 Z" {...common} />
      )}
      {kind === "umbrella" && (
        <path
          d="M12 3.2 V4.4 M3 12.2 A9 8 0 0 1 21 12.2 A3 2.6 0 0 0 15 12.2 A3 2.6 0 0 0 9 12.2 A3 2.6 0 0 0 3 12.2 Z M12 12.2 V18.8 A2 2 0 0 1 8 18.8"
          {...common}
          fill="none"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
