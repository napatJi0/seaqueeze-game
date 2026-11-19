"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Lock } from "lucide-react";
import Link from "next/link";
import { GAMES, UPCOMING_GAME_SLOTS } from "@/config/games";
import { useT } from "@/hooks/usePreferences";
import { pad2 } from "@/lib/i18n";
import type { ShapeKind } from "@/types/player";
import { PlayerSymbol } from "@/components/players/PlayerSymbol";
import { FullscreenButton } from "./FullscreenButton";
import { LanguageToggle } from "./LanguageToggle";
import { PlinkoArt } from "./PlinkoArt";

const MARKS: ShapeKind[] = ["circle", "triangle", "star", "umbrella"];
const UPCOMING_MARKS: ShapeKind[] = ["star", "umbrella", "triangle"];

/** The central platform: pick a game to run. */
export function Lobby() {
  const t = useT();
  return (
    <div className="arena-bg flex min-h-svh flex-col">
      <header className="flex items-center justify-between gap-3 border-b border-line bg-black/60 px-4 py-2 backdrop-blur sm:px-6">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex items-center gap-1" aria-hidden="true">
            {MARKS.map((m) => (
              <PlayerSymbol key={m} kind={m} color="#ff2b78" size={16} strokeWidth={3} />
            ))}
          </span>
          <Image
            src="/Logo.png"
            alt="Platform logo"
            width={2000}
            height={667}
            priority
            className="h-8 w-auto object-contain"
          />
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <FullscreenButton />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14 lg:gap-14 lg:py-20">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center"
          aria-labelledby="platform-title"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.5em] text-pink sm:text-sm">{t.platform.event}</p>
          <h1
            id="platform-title"
            className="font-display neon-text mt-3 leading-[0.9] text-white"
            style={{ fontSize: "clamp(3.2rem, 12vw, 9.5rem)" }}
          >
            <Image
              src="/Logo.png"
              alt="Platform logo"
              width={2000}
              height={667}
              priority
              className="mx-auto h-auto w-[min(92vw,1000px)] object-contain"
            />
          </h1>
          <div className="mt-5 flex items-center justify-center gap-4" aria-hidden="true">
            <span className="h-px w-12 bg-gradient-to-r from-transparent to-pink sm:w-24" />
            {MARKS.map((m) => (
              <PlayerSymbol key={m} kind={m} color="#f5f5f5" size={22} strokeWidth={2.4} />
            ))}
            <span className="h-px w-12 bg-gradient-to-l from-transparent to-pink sm:w-24" />
          </div>
          {/* <p className="mx-auto mt-5 max-w-xl text-sm text-white/70 sm:text-base">{t.platform.tagline}</p> */}
        </motion.section>

        <section aria-labelledby="games-title" className="space-y-4">
          <h2 id="games-title" className="text-xs font-bold uppercase tracking-[0.3em] text-muted">
            {t.platform.chooseGame}
          </h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GAMES.map((game, i) => {
              const info = t.games[game.id];
              return (
                <motion.li
                  key={game.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.1, duration: 0.6 }}
                >
                  <Link
                    href={game.href}
                    className="panel group flex h-full flex-col overflow-hidden transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-pink hover:shadow-[0_0_40px_-12px_rgba(255,43,120,0.9)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-pink"
                  >
                    <div className="relative aspect-[200/124] border-b border-line bg-black">
                      <PlinkoArt />
                      <span className="absolute left-3 top-2 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/60">
                        {t.platform.gameSlot} {pad2(i + 1)}
                      </span>
                    </div>
                    <div className="flex flex-1 flex-col gap-2 p-4">
                      <h3 className="font-display text-3xl tracking-[0.04em] text-white">{info.title}</h3>
                      <p className="text-sm text-white/70">{info.description}</p>
                      <p className="text-xs uppercase tracking-[0.15em] text-muted">{info.meta}</p>
                      <span className="mt-auto flex items-center justify-between pt-3 text-sm font-bold uppercase tracking-[0.15em] text-pink">
                        {t.platform.play}
                        <ArrowRight size={18} aria-hidden="true" className="transition-transform group-hover:translate-x-1" />
                      </span>
                    </div>
                  </Link>
                </motion.li>
              );
            })}

            {Array.from({ length: UPCOMING_GAME_SLOTS }, (_, k) => {
              const n = GAMES.length + k + 1;
              const mark = UPCOMING_MARKS[k % UPCOMING_MARKS.length] as ShapeKind;
              return (
                <motion.li
                  key={`upcoming-${n}`}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + (GAMES.length + k) * 0.1, duration: 0.6 }}
                  aria-label={`${t.platform.gameSlot} ${pad2(n)} · ${t.platform.comingSoon}`}
                  className="flex min-h-56 flex-col items-center justify-center gap-3 border border-dashed border-line bg-black/30 p-6 text-center"
                >
                  <PlayerSymbol kind={mark} color="#3f3f46" size={48} strokeWidth={2} />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-muted">
                    {t.platform.gameSlot} {pad2(n)}
                  </p>
                  <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-white/50">
                    <Lock size={14} aria-hidden="true" /> {t.platform.comingSoon}
                  </p>
                </motion.li>
              );
            })}
          </ul>
        </section>
      </main>

      <footer className="border-t border-line px-4 py-4 text-center text-[11px] uppercase tracking-[0.25em] text-muted">
        <span>{t.platform.event} · {t.platform.footer}</span>
      </footer>
    </div>
  );
}
