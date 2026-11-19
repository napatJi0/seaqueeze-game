"use client";

import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { PLAYERS } from "@/config/players";
import { useGame } from "@/hooks/useGame";
import { useT } from "@/hooks/usePreferences";
import { typeLabel } from "@/lib/i18n/labels";
import { getRoundConfig } from "@/lib/round-manager/round-config";
import { FullscreenButton } from "@/components/platform/FullscreenButton";
import { LanguageToggle } from "@/components/platform/LanguageToggle";
import { PlayerSymbol } from "@/components/players/PlayerSymbol";
import { RoundIndicator } from "./RoundIndicator";

export function GameHeader() {
  const t = useT();
  const session = useGame((s) => s.session);
  // Leaving mid-drop would stop the physics; the lobby link waits until balls are not in play.
  const status = session?.status;
  const dropInProgress = status === "countdown" || status === "simulating" || status === "validating";
  const config = session ? getRoundConfig(session.roundConfigs, session.currentRound) : undefined;
  const type = session?.activeRound?.prizeType ?? config?.prizeType;

  return (
    <header className="relative z-10 grid grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 border-b border-line bg-black/60 px-3 py-2 backdrop-blur sm:px-5 md:grid-cols-[1fr_auto_1fr]">
      <div className="flex min-w-0 items-center gap-3">
        {dropInProgress ? (
          <span
            aria-disabled="true"
            role="link"
            aria-label={`${t.platform.backToLobby} — ${t.platform.backLocked}`}
            title={t.platform.backLocked}
            className="grid h-9 w-9 shrink-0 cursor-not-allowed place-items-center border border-line text-muted opacity-40"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </span>
        ) : (
          <Link
            href="/"
            aria-label={t.platform.backToLobby}
            title={t.platform.backToLobby}
            className="grid h-9 w-9 shrink-0 place-items-center border border-line text-muted transition-colors hover:border-white/40 hover:text-white focus-visible:outline-2 focus-visible:outline-pink"
          >
            <ChevronLeft size={18} aria-hidden="true" />
          </Link>
        )}
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1" aria-hidden="true">
          {PLAYERS.map((p) => (
            <PlayerSymbol
              key={p.id}
              kind={p.symbol}
              color="#ff2b78"
              size={18}
              strokeWidth={3}
              className="h-3.5 w-3.5 sm:h-[18px] sm:w-[18px]"
            />
          ))}
        </div>
        <h1 className="font-display neon-text truncate text-2xl tracking-[0.08em] text-white sm:text-3xl">{t.app.title}</h1>
      </div>

      {session ? (
        <div className="col-span-2 row-start-2 justify-self-center md:col-span-1 md:col-start-2 md:row-start-1">
          <RoundIndicator round={session.currentRound} completed={session.results.length} />
        </div>
      ) : (
        <div className="hidden md:block" />
      )}

      <div className="flex items-center justify-end gap-2">
        {type ? (
          <span
            className="hidden border border-pink/60 px-2 py-1 text-xs font-bold uppercase tracking-[0.15em] text-pink sm:inline"
            title={t.round.type}
          >
            {typeLabel(t, type)}
          </span>
        ) : null}
        <LanguageToggle />
        <FullscreenButton />
      </div>
    </header>
  );
}
