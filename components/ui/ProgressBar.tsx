interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
}

export function ProgressBar({ value, max, label }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className="relative h-1.5 w-full overflow-hidden bg-white/10"
    >
      <div className="absolute inset-y-0 left-0 bg-pink transition-[width] duration-700" style={{ width: `${pct}%` }} />
    </div>
  );
}
