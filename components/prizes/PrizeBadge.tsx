import { PRIZE_RANK_COLORS } from "@/config/prizes";
import type { PrizeRank } from "@/types/prize";

interface PrizeBadgeProps {
  rank: PrizeRank;
  label: string;
  size?: "sm" | "md";
}

export function PrizeBadge({ rank, label, size = "md" }: PrizeBadgeProps) {
  const color = PRIZE_RANK_COLORS[rank];
  return (
    <span
      className={`inline-flex items-center gap-1.5 border font-bold uppercase tracking-[0.1em] ${size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs"}`}
      style={{
        // Same color code as the prize slots: Rank 1 yellow, Rank 2 green, Rank 3 light pink.
        color: "#0a0a0a",
        borderColor: color,
        background: color,
        boxShadow: rank === 1 ? `0 0 16px -2px ${color}` : undefined,
      }}
    >
      {label}
    </span>
  );
}
