# Thank You Day FY27

The game platform for Thank You Day FY27. The lobby at `/` lists the games, and each game runs at its own route:

| Game             | Route     | Status      |
| ---------------- | --------- | ----------- |
| คุกกี้เสี่ยงทาย  | `/plinko` | Available   |
| Game 02, Game 03 | —         | Coming soon |

To add a game: create its route under `app/`, add strings under `games` in `lib/i18n/en.ts` and `th.ts`, and register it in `config/games.ts`. Language (Thai by default) and fullscreen are shared across the platform (`stores/preferences-store.ts`).

---

# คุกกี้เสี่ยงทาย

(Formerly SQUID PLINKO.) A cinematic four-player Plinko prize game. The balls are gold dalgona-style cookies engraved with each player's symbol: circle, triangle, star and umbrella (original drawings in `components/plinko/canvas-renderer.ts` and `components/players/PlayerSymbol.tsx`). Player IDs stay `circle` / `triangle` / `square` / `hexagon` internally so saved games keep working; `square` shows the star and `hexagon` the umbrella. Four fixed players drop four balls through a real Matter.js physics board into four prize slots across 60 operator-controlled rounds. The game rules are defined in [AGENTS.md](AGENTS.md).

Prize types per round (set in ROUND CONFIGURATION; click a round to cycle A → B → C → D):

| Type | Rank 1 | Rank 2 | Rank 3 |
| ---- | ------ | ------ | ------ |
| A    | 1      | 0      | 3      |
| B    | 0      | 2      | 2      |
| C    | 0      | 1      | 3      |
| D    | 0      | 0      | 4      |

Leaving the game is blocked while balls are in play. If the page is left mid-drop anyway (browser back), the drop is marked interrupted and needs RETRY ROUND, exactly like a refresh.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
npm run build && npm start   # production
```

## Checks

```bash
npm run typecheck  # tsc --noEmit (strict)
npm run lint       # ESLint
npm test           # Vitest
npm run check      # all of the above + production build
npx tsx scripts/tune-physics.ts 200   # headless physics statistics
npx tsx scripts/check-board.ts        # obstacle field geometry checks
```

## Operating a round

1. **START ROUND** reads the round's configured type (A or B), shuffles and locks the four prizes, then counts down 3·2·1.
2. Each ball gets a **random spawn**: which column it starts above, its position inside that column and its height are all random. Like the prize colors, it is prepared as soon as the round becomes current and shown on the board before START ROUND; Before START ROUND the operator can press **SHUFFLE BALLS** to draw new random positions as often as wanted (the prize colors stay the same). START ROUND locks the positions, and retries of that round restore them. The prize of each slot is shown as a color in the strip under the slots (Rank 1 yellow, Rank 2 green, Rank 3 light pink, no labels) already before START ROUND: the arrangement is prepared as soon as a round becomes current (new game, NEXT ROUND), saved with the session, and START ROUND locks exactly that arrangement. Changing the waiting round's prize type in the configuration re-prepares it. All four balls are released in the same physics update.
   **One ball per slot:** as soon as a ball drops fully into a slot, that slot's gate closes (a visible lid in the ball's color). Later balls hit the closed lids and roll on to an open slot. The lids form a continuous downhill ramp toward the nearest open slot, so balls cannot rest on them. Gates react only to occupancy, never to prizes or ball identity, and balls move only under physics (`lib/physics/slot-gates.ts`).
3. If all four balls come to rest in four different slots, the result is validated, saved, and revealed. Then use **NEXT ROUND**.
4. If two or more balls share a slot, a ball gets stuck, or the 30 s simulation limit is reached, the attempt is **invalid**. Press **RETRY ROUND** to drop again with the same round and the same locked prizes.
5. After round 60, **SHOW FINAL RESULTS** opens the podium. Ranking: most Rank 1, then most Rank 2, then most Rank 3. Remaining ties share a place.

Other operator controls: **PAUSE/RESUME** (during countdown or drop), **ROUND CONFIGURATION** (between rounds only; completed rounds are locked), **RESET GAME** (asks for confirmation; keeps the configuration), language (TH/EN, Thai by default), and fullscreen.

## Architecture

| Area                                              | Location               |
| ------------------------------------------------- | ---------------------- |
| Domain types                                      | `types/`               |
| Fixed players, prize types, round count           | `config/`              |
| Prize generation & validation                     | `lib/prize-engine/`    |
| Round configuration & validation                  | `lib/round-manager/`   |
| Guarded state machine, landing validation, podium | `lib/game-engine/`     |
| Matter.js world, slot sensors, fixed-step loop    | `lib/physics/`         |
| IndexedDB repository & recovery                   | `lib/storage/`         |
| Zod schemas                                       | `lib/validation/`      |
| TH / EN dictionaries                              | `lib/i18n/`            |
| Zustand store                                     | `stores/game-store.ts` |
| UI (canvas renderer, overlays, controls, podium)  | `components/`          |

The physics engine never receives prize data. It reports only which ball came to rest in which slot. React does not re-render per physics frame: the canvas is driven by `requestAnimationFrame` and syncs with the store through subscriptions.

## Persistence & recovery

Sessions, round configuration, locked arrangements, retry history, results and statistics are stored in IndexedDB (`squid-plinko`). The language preference is stored in LocalStorage. Each save is one transaction, and stored data is validated with Zod plus integrity checks when loaded.

- A refresh during countdown or drop marks the attempt **interrupted**. The locked prizes are kept and the operator must press RETRY ROUND.
- A refresh during the reveal restores the round as completed, because its result was already saved.
- Corrupted or unsupported data starts a new session and shows a notice. Results are never invented.

## Notes

- The obstacle field is irregular on purpose: 10 pegs of different sizes scattered without a grid, 4 angled ramps, 2 ramps attached to the walls and 4 uneven wall deflectors (`lib/physics/board-layout.ts`). It is a fixed, hand-placed design so it can be verified: every gap is either closed or wide enough for a ball, every ramp/deflector is steep enough to roll off, and no round top or ramp end sits under a straight drop from a spawn point (`lib/physics/clearance.ts`, `tests/board-layout.test.ts`). To change it, edit the coordinates and run `npx tsx scripts/check-board.ts` until all three lists are empty.
- On this board about 92–94% of attempts end with four balls in four different slots (headless runs). The rest are mostly two balls entering a slot at the same instant (before its gate closes); rarely (about 0.2%) two balls jam against each other. Both are marked invalid and need RETRY ROUND. A drop takes about 11 s on average (max about 22 s).
- Browser storage is local and not tamper-proof. Results that must be tamper-resistant would need a trusted server.
- The game is silent by design.
