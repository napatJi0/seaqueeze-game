import { PLAYERS } from "@/config/players";
import { PlayerSymbol } from "@/components/players/PlayerSymbol";

/** Original miniature of the board with gold cookie balls, for the lobby card (decorative). */
export function PlinkoArt() {
  const pegs: { x: number; y: number }[] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 6 - (r % 2); c++) pegs.push({ x: 30 + c * 28 + (r % 2) * 14, y: 34 + r * 18 });
  }
  const balls = [
    { x: 52, y: 22 },
    { x: 96, y: 52 },
    { x: 140, y: 30 },
    { x: 168, y: 96 },
  ];
  return (
    <svg viewBox="0 0 200 124" className="h-full w-full" aria-hidden="true">
      <defs>
        <radialGradient id="pl-cookie" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#f8d67a" />
          <stop offset="60%" stopColor="#e7b23f" />
          <stop offset="100%" stopColor="#c68b1c" />
        </radialGradient>
        <radialGradient id="pl-spot" cx="50%" cy="0%" r="90%">
          <stop offset="0%" stopColor="#ff2b78" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#000" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="200" height="124" fill="url(#pl-spot)" />
      {pegs.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="2.6" fill="#d4d4d8" />
      ))}
      {[50, 100, 150].map((x) => (
        <line key={x} x1={x} y1="100" x2={x} y2="120" stroke="#3a3a3e" strokeWidth="2" />
      ))}
      <line x1="0" y1="121" x2="200" y2="121" stroke="#ff2b78" strokeWidth="2" />
      {PLAYERS.map((p, i) => {
        const b = balls[i] as { x: number; y: number };
        return (
          <g key={p.id}>
            <circle cx={b.x} cy={b.y} r="9" fill="url(#pl-cookie)" stroke="#8a5a15" strokeWidth="1" />
            <g transform={`translate(${b.x - 5} ${b.y - 5})`}>
              <PlayerSymbol kind={p.symbol} color="#6e4510" size={10} strokeWidth={2.4} />
            </g>
          </g>
        );
      })}
    </svg>
  );
}
