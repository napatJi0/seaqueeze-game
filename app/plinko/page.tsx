import type { Metadata } from "next";
import { GameScreen } from "@/components/game/GameScreen";

export const metadata: Metadata = {
  title: "คุกกี้เสี่ยงทาย",
  description: "Four players, four balls, one simultaneous drop.",
};

export default function PlinkoPage() {
  return <GameScreen />;
}
