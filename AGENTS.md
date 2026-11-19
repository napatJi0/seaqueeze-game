AGENTS.md
SQUID PLINKO — AI Agent Development Guide
This document defines the product requirements, architecture rules, engineering standards, gameplay mechanics, design system, and development workflow for SQUID PLINKO.

All AI coding agents must read and follow this document before modifying the project.

1. PROJECT IDENTITY
1.1 Project Name

SQUID PLINKO

1.2 Project Description

SQUID PLINKO is a cinematic, Squid Game-inspired multiplayer prize game built as a responsive web application.

The game features exactly four fixed players per round. Each player is represented by a unique geometric symbol and a uniquely colored ball.

All four balls are released simultaneously into a Plinko board. They bounce through a field of pegs using realistic physics and eventually land in four distinct prize slots.

The game consists of exactly 60 configurable rounds.

Each round uses one of two predefined prize distribution types:

Type A: One Rank 1 prize and three Rank 3 prizes.
Type B: Two Rank 2 prizes and two Rank 3 prizes.

Prize positions are randomized at the beginning of each round.

The prize configuration must remain locked throughout gameplay.

The results are revealed only after all four balls have successfully landed in four unique slots.

1.3 Product Vision

Create a premium cinematic game-show experience inspired by the atmosphere and visual identity of Squid Game.

The application should feel like a real competition arena rather than a conventional web-based arcade game.

Prioritize:

Cinematic visual presentation.
Smooth and believable physics simulation.
Clear player identification.
Suspenseful gameplay.
Reliable game-state management.
Accurate prize distribution.
Operator-friendly controls.
Responsive layouts.
1.4 Core Principles
Gameplay correctness takes priority over decorative effects.
Physics simulation must be independent from prize assignment.
Prize configurations must never change during an active round.
Every valid round must contain exactly four unique landing slots.
All four balls must be released simultaneously.
Results must not be revealed before all balls have landed.
No round may be silently skipped.
No completed round may be recorded twice.
All important game state must survive page refreshes.
Never fabricate a successful physics result.
2. NON-NEGOTIABLE PROJECT REQUIREMENTS

The following requirements must never be violated.

Requirement	Rule
Players	Exactly 4
Balls	Exactly 4
Prize slots	Exactly 4
Total rounds	Exactly 60
Player identities	Fixed
Symbols	Circle, Triangle, Square, Hexagon
Prize types	Type A and Type B
Physics	Realistic physics simulation
Landing	Four different slots
Retry	Manual operator action
Prize reveal	After all four balls land
Round control	Manual
Audio	Disabled
Language	Thai and English
Framework	Next.js App Router
Directory	No src/ directory
Storage	Browser-local persistence

Do not introduce additional players, balls, slots, or prize types without explicit project-owner approval.

3. TECHNOLOGY STACK
3.1 Framework

Use:

Next.js with App Router.
React.
TypeScript.
Tailwind CSS.

Use the latest stable versions compatible with the installed project dependencies.

Do not upgrade major dependencies without checking compatibility.

3.2 Recommended Libraries

Use the following libraries where appropriate:

Library	Purpose
Matter.js	2D physics simulation
Zustand	Global game state
Zod	Runtime data validation
Framer Motion	UI transitions
Lucide React	Interface icons
IndexedDB / Dexie	Persistent game data
next-intl or equivalent	Thai and English localization

Do not install unnecessary libraries.

If a suitable dependency already exists, reuse it rather than introducing another library for the same responsibility.

3.3 Rendering

Use HTML Canvas for the Plinko simulation.

Use React for the surrounding interface.

The physics simulation must not depend on React component re-render cycles.

Keep the physics engine isolated from UI state.

3.4 Language and Type Safety
TypeScript strict mode must be enabled.
Avoid any.
Define explicit interfaces and types.
Validate persisted data before using it.
Handle undefined and null values safely.
Use shared domain types instead of duplicating definitions.
4. PROJECT STRUCTURE

This project MUST use Next.js App Router without a src directory.

Do not create a src/ directory.

Use this structure as the architectural baseline:

text
squid-plinko/
│
├── AGENTS.md
├── README.md
├── package.json
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
├── eslint.config.mjs
│
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── globals.css
│   │
│   └── results/
│       └── page.tsx
│
├── components/
│   ├── game/
│   │   ├── GameScreen.tsx
│   │   ├── GameHeader.tsx
│   │   ├── RoundIndicator.tsx
│   │   ├── Countdown.tsx
│   │   └── GameControls.tsx
│   │
│   ├── plinko/
│   │   ├── PlinkoBoard.tsx
│   │   ├── PlinkoCanvas.tsx
│   │   ├── Peg.tsx
│   │   ├── Ball.tsx
│   │   └── PrizeSlots.tsx
│   │
│   ├── players/
│   │   ├── PlayerCard.tsx
│   │   └── PlayerSymbol.tsx
│   │
│   ├── prizes/
│   │   ├── PrizeReveal.tsx
│   │   └── PrizeBadge.tsx
│   │
│   ├── results/
│   │   ├── FinalPodium.tsx
│   │   └── PlayerStatistics.tsx
│   │
│   └── ui/
│       ├── Button.tsx
│       ├── Dialog.tsx
│       └── ProgressBar.tsx
│
├── lib/
│   ├── physics/
│   │   ├── physics-engine.ts
│   │   ├── board-layout.ts
│   │   ├── collision.ts
│   │   └── simulation.ts
│   │
│   ├── game-engine/
│   │   ├── game-controller.ts
│   │   ├── game-state.ts
│   │   └── game-events.ts
│   │
│   ├── prize-engine/
│   │   ├── prize-generator.ts
│   │   └── prize-validator.ts
│   │
│   ├── round-manager/
│   │   ├── round-config.ts
│   │   ├── round-controller.ts
│   │   └── round-validator.ts
│   │
│   ├── storage/
│   │   ├── database.ts
│   │   ├── persistence.ts
│   │   └── recovery.ts
│   │
│   ├── validation/
│   │   └── schemas.ts
│   │
│   └── i18n/
│       ├── th.ts
│       └── en.ts
│
├── stores/
│   └── game-store.ts
│
├── types/
│   ├── game.ts
│   ├── player.ts
│   ├── prize.ts
│   └── round.ts
│
├── hooks/
│   ├── useGame.ts
│   ├── usePhysics.ts
│   └── useResponsive.ts
│
├── config/
│   ├── players.ts
│   ├── prizes.ts
│   └── rounds.ts
│
└── public/
    ├── images/
    ├── fonts/
    └── icons/


This is a recommended baseline, not a requirement to create every file immediately.

Create modules when they are needed.

Avoid unnecessary abstraction and oversized components.

5. FIXED PLAYER SYSTEM

The game always has four players.

Player identity must remain consistent across all 60 rounds.

5.1 Player Definitions
Player	Symbol	Suggested Color
Player 1	Circle	Pink
Player 2	Triangle	Green
Player 3	Square	Red
Player 4	Hexagon	Yellow

Colors must remain visually distinguishable against the dark background.

Symbols must be recognizable independently of color.

Do not rely on color alone to identify a player.

5.2 Player Identity Rules

Each player must have:

A permanent player ID.
A permanent geometric symbol.
A permanent color.
A unique ball identifier.

Players must never exchange symbols or colors between rounds.

5.3 Player Statistics

Track the following:

Total Rank 1 prizes.
Total Rank 2 prizes.
Total Rank 3 prizes.
Total completed rounds.

Do not automatically treat Rank 1 as a player championship score unless explicitly required.

6. PRIZE SYSTEM

The prize engine must be independent from the physics engine.

6.1 Prize Types

There are exactly two distribution types.

Type A
text
Rank 1: 1 slot
Rank 2: 0 slots
Rank 3: 3 slots
Total: 4 slots

Type B
text
Rank 1: 0 slots
Rank 2: 2 slots
Rank 3: 2 slots
Total: 4 slots

6.2 Prize Generation

At the beginning of each round:

Read the round's predefined type.
Generate the correct four-prize distribution.
Randomly shuffle the prize arrangement.
Validate the generated arrangement.
Lock the arrangement.
Start the countdown and gameplay sequence.

Prize assignment must never depend on the ball's identity or predicted landing position.

Do not manipulate the physics simulation to award a specific prize to a specific player.

6.3 Prize Arrangement Examples

Type A:

text
[Rank 3, Rank 1, Rank 3, Rank 3]


Type B:

text
[Rank 2, Rank 3, Rank 2, Rank 3]


These are examples only.

Actual slot arrangements must be randomized independently for each round.

6.4 Prize Locking

Once a round starts:

Prize configuration is immutable.
Prize positions cannot be changed.
Refreshing the browser must not generate a new arrangement.
Retrying a failed round must not silently change its prize configuration.

The operator must explicitly restart or retry according to the round recovery rules.

6.5 Prize Validation

Before gameplay:

Exactly four prizes must exist.
Type A must contain 1 Rank 1 and 3 Rank 3.
Type B must contain 2 Rank 2 and 2 Rank 3.
No unsupported prize rank is allowed.

Reject invalid configurations.

7. ROUND MANAGEMENT SYSTEM
7.1 Total Rounds

The game consists of exactly 60 rounds.

Round numbers are:

text
01 through 60


The round number must never exceed 60.

7.2 Round Configuration

The operator can configure each round as either Type A or Type B before gameplay.

Example:

ts
type PrizeType = "A" | "B";

interface RoundConfig {
  roundNumber: number;
  prizeType: PrizeType;
}

const roundConfigs: RoundConfig[] = [
  { roundNumber: 1, prizeType: "A" },
  { roundNumber: 2, prizeType: "B" },
  { roundNumber: 3, prizeType: "A" },
  // Continue until round 60.
];


The actual application must provide an operator-friendly way to edit the configurations.

7.3 Configuration Rules
Exactly 60 configurations must exist.
Every round must have one valid prize type.
Duplicate round numbers are forbidden.
Missing round numbers are forbidden.
Editing must be validated before gameplay.
Configuration changes must be persisted.
Active rounds cannot have their prize type changed.
7.4 Round Lifecycle

Use an explicit state machine.

text
IDLE
  ↓
ROUND_PREPARATION
  ↓
PRIZE_LOCKED
  ↓
COUNTDOWN
  ↓
BALLS_RELEASED
  ↓
SIMULATING
  ↓
LANDING_VALIDATION
  ↓
RESULT_REVEAL
  ↓
ROUND_COMPLETED
  ↓
NEXT_ROUND


Invalid landing:

text
LANDING_VALIDATION
  ↓
INVALID_ROUND
  ↓
WAITING_FOR_OPERATOR_RETRY
  ↓
COUNTDOWN

7.5 Manual Controls

The operator controls gameplay manually.

Required controls:

Start Round.
Release Balls, if the countdown and release are separate actions.
Retry Round.
Next Round.
Pause.
Resume.
Reset Game.

Do not automatically start the next round.

Require explicit operator confirmation.

7.6 Round Completion

A round is completed only when:

Four balls have landed.
Four different slots have been occupied.
All results have been validated.
Results have been persisted successfully.

Do not increment the round counter before successful completion.

8. PHYSICS ENGINE
8.1 Core Requirement

Use Matter.js or an equivalent reliable 2D physics engine.

The ball simulation must use actual physical interactions.

Do not use fake movement animations to simulate bouncing.

8.2 Physics Properties

The simulation should support:

Gravity.
Ball mass.
Ball restitution.
Friction.
Peg collisions.
Wall collisions.
Ball-to-ball collisions.
Slot boundaries.

Tune physical parameters to produce visually convincing motion.

Avoid excessive bouncing, unstable collision behavior, and unnatural movement.

8.3 Ball Release

All four balls must be released simultaneously.

The release event must use the same simulation timestamp or physics update.

Do not release players sequentially.

8.4 Peg Layout

Design a triangular or otherwise balanced Plinko peg arrangement.

Requirements:

Consistent spacing.
Clear collision boundaries.
No inaccessible areas.
No ball-trapping geometry.
No unintended gaps.
Four distinct bottom slots.

The board should be designed around the actual simulation dimensions.

8.5 Unique Landing Rule

All four balls must land in four different slots.

This is a strict validity condition.

However, natural physics does not mathematically guarantee unique landing.

Therefore:

Do not preassign destination slots.
Do not secretly redirect balls.
Do not manipulate ball positions after collisions.
Do not alter the prize configuration based on predicted outcomes.
Do not claim a round is valid when duplicate landing occurs.

If two or more balls land in the same slot:

Mark the round as INVALID.
Preserve the current prize arrangement.
Preserve the invalid attempt for debugging if useful.
Do not record player rewards.
Display a clear invalid-round message.
Wait for the operator to manually retry.
8.6 Manual Retry Behavior

The operator must explicitly trigger retry.

Retry must:

Reset the physics simulation.
Reset all four balls.
Restore the starting positions.
Clear temporary landing data.
Preserve the current round number.
Preserve the locked prize arrangement.
Start a new simulation attempt.

Do not silently generate a new prize arrangement.

Do not advance to the next round after an invalid result.

8.7 Ball Completion Detection

Use collision events and slot detection.

A ball is considered landed only when:

It has entered a valid slot.
It has reached a stable resting condition.
It is no longer moving beyond a defined velocity threshold.

Use a timeout as a fallback for stalled simulations.

If a ball does not land within the allowed simulation time:

Mark the attempt invalid.
Notify the operator.
Allow manual retry.

Never force a ball into a slot and report it as a natural landing.

8.8 Performance

The physics engine must:

Run independently from React rendering.
Use an appropriate fixed or controlled timestep.
Clean up event listeners.
Clean up animation frames.
Avoid memory leaks.
Support pause and resume.
Avoid unnecessary React state updates on every physics frame.

Use Canvas rendering for continuous ball and peg movement.

9. GAME STATE MANAGEMENT

Use Zustand or an equivalent predictable state management solution.

Define explicit game states.

Example:

ts
type GameStatus =
  | "idle"
  | "preparing"
  | "countdown"
  | "simulating"
  | "validating"
  | "invalid"
  | "revealing"
  | "completed"
  | "finished";

9.1 State Separation

Separate:

Game configuration.
Round configuration.
Prize configuration.
Physics state.
Player statistics.
Result history.
UI state.

Do not store high-frequency physics coordinates inside persistent global UI state.

9.2 State Transition Rules

Every state transition must be validated.

Prevent:

Starting an already running round.
Releasing balls twice.
Revealing results before completion.
Advancing an invalid round.
Recording duplicate results.
Starting round 61.

Use guarded actions or transition functions.

10. LOCAL DATA PERSISTENCE
10.1 Storage Strategy

Use browser-local persistence.

Prefer IndexedDB for structured game sessions and round histories.

LocalStorage may be used for small settings such as language and display preferences.

No external backend is required for the initial version.

10.2 Persisted Data

Persist:

Current game session ID.
Current round number.
All 60 round configurations.
Prize arrangements.
Current round status.
Retry attempt count.
Completed round results.
Player statistics.
Language preference.
Relevant game settings.
10.3 Recovery

After browser refresh:

Restore the most recent valid session.
Restore round configuration.
Restore prize arrangement.
Restore completed round history.
Restore the current round state safely.

If a round was interrupted during physics simulation:

Do not assume the round completed.
Mark it as interrupted or invalid.
Require operator action before continuing.

Do not automatically resume moving balls from an incomplete simulation unless a reliable simulation checkpoint is implemented.

10.4 Data Integrity

Use schema validation for persisted data.

Handle:

Missing data.
Corrupted data.
Unsupported schema versions.
Interrupted writes.
Duplicate result records.

Provide a confirmation dialog before deleting game history.

11. USER INTERFACE AND VISUAL DESIGN
11.1 Design Direction

The application must follow a cinematic visual style inspired by Squid Game.

Use original visual assets inspired by the show's visual language.

Do not assume permission to use copyrighted logos, character images, official soundtracks, screenshots, or original artwork.

11.2 Visual Identity

Primary visual direction:

Dark industrial atmosphere.
Black and charcoal backgrounds.
Pink and red accent lighting.
Geometric patterns.
Concrete and metallic textures.
Strong contrast.
Dramatic spotlights.
Minimal decorative elements.
11.3 Suggested Color Palette
css
:root {
  --color-background: #090909;
  --color-surface: #151515;
  --color-surface-elevated: #202020;

  --color-pink: #ff2b78;
  --color-red: #e63946;
  --color-white: #f5f5f5;

  --color-muted: #858585;
  --color-border: #343434;

  --player-circle: #ff4d91;
  --player-triangle: #4ade80;
  --player-square: #ef4444;
  --player-hexagon: #facc15;
}


These are starting values. Maintain visual consistency when refining the theme.

11.4 Typography

Use a modern, readable font system.

Thai and English text must render correctly.

Prefer:

Strong display typography for round numbers.
Clear UI typography for controls.
Tabular numerals for statistics.
Consistent font weights.

Avoid overly decorative fonts for important game information.

11.5 Layout

The primary gameplay screen must be fullscreen-oriented.

The Plinko board must be the visual centerpiece.

The layout should include:

Game title.
Current round indicator.
Progress indicator.
Four player identifiers.
Plinko board.
Four prize slots.
Operator controls.
Result reveal area.

Do not overcrowd the screen.

11.6 Responsive Design

The application must be responsive.

Support:

Large desktop monitors.
16:9 presentation displays.
Laptop screens.
Tablets.
Mobile browsers.

On large screens, prioritize a cinematic fullscreen composition.

On smaller screens:

Scale the Plinko board proportionally.
Maintain readable player symbols.
Avoid horizontal overflow.
Keep critical controls accessible.
Do not distort the board aspect ratio.

Use a responsive layout rather than fixed pixel positioning for the overall interface.

11.7 Fullscreen

Provide a fullscreen toggle using the browser Fullscreen API.

The game must remain usable when fullscreen mode is unavailable.

Do not assume fullscreen permission is always granted.

12. GAMEPLAY EXPERIENCE
12.1 Round Introduction

Display:

Current round number.
Total rounds.
Four player symbols.
A dramatic visual introduction.
12.2 Countdown

Show:

text
3
2
1


Use smooth, cinematic transitions.

12.3 Ball Release

All four balls must begin moving simultaneously.

The countdown must not be followed by sequential releases.

12.4 During Simulation
Keep all player identities visible.
Track balls visually.
Show natural collisions.
Hide prize ranks.
Prevent configuration changes.
Disable conflicting operator actions.
12.5 Landing

Wait for all four balls.

Validate unique slot occupancy.

If valid, transition to result reveal.

If invalid, transition to the operator retry state.

12.6 Prize Reveal

Reveal the four prize slots only after successful landing validation.

Use coordinated reveal animations.

Show:

Player symbol.
Landing slot.
Prize rank.
Visual prize indicator.

Do not reveal results prematurely.

12.7 Next Round

The next round must begin only after operator confirmation.

Display the next round's configured prize type during preparation if appropriate.

Do not automatically start gameplay.

13. OPERATOR CONTROLS

The initial application uses one unified game screen.

Do not build a separate admin route unless requested later.

Required controls:

Start Round.
Retry Round.
Next Round.
Pause.
Resume.
Reset Game.
Edit Round Configuration.
Change Language.
Toggle Fullscreen.
13.1 Control Safety

Controls must reflect the current game state.

Examples:

Start Round is disabled during simulation.
Retry is available only after an invalid attempt.
Next Round is available only after a completed round.
Reset requires confirmation.
Round configuration cannot be modified during an active round.

Prevent double-click execution.

Use clear loading and disabled states.

14. RESULTS AND FINAL PODIUM

The final game ends after round 60 is successfully completed.

Display a cinematic podium screen.

14.1 Prize Statistics

For each player, calculate:

Total Rank 1 prizes.
Total Rank 2 prizes.
Total Rank 3 prizes.
Total prizes received.
14.2 Ranking

Do not assume that prize ranks automatically determine an overall competition winner.

The final podium must use a transparent and deterministic ranking rule.

Recommended default:

Most Rank 1 prizes.
If tied, most Rank 2 prizes.
If still tied, most Rank 3 prizes.
If still tied, declare a shared position.

Do not use arbitrary tie-breaking.

If all players are tied, display a shared result.

14.3 Final Screen

The final screen should include:

SQUID PLINKO title.
Game completed indicator.
Final podium.
Four player statistics.
Total completed rounds.
Reset Game action.

The podium must be visually dramatic but readable.

15. LOCALIZATION

Support Thai and English.

All visible UI text must use localization dictionaries.

Do not hardcode UI labels throughout components.

Example:

ts
type Language = "th" | "en";


Use centralized dictionaries.

Required translated content includes:

Buttons.
Round labels.
Prize names.
Player labels.
Error messages.
Validation messages.
Result announcements.
Confirmation dialogs.
Final podium.

Default language may be Thai.

Remember the selected language locally.

16. ACCESSIBILITY AND USABILITY
Use semantic HTML.
Maintain sufficient color contrast.
Do not rely only on color to identify players.
Provide accessible button labels.
Support keyboard navigation.
Show clear disabled states.
Respect reduced-motion preferences where possible.
Avoid flashing effects that may cause discomfort.
Keep important information readable from a distance.

Animations must never prevent operators from using essential controls.

17. ERROR HANDLING

The application must handle:

Physics initialization failures.
Ball collision issues.
Duplicate landing.
Simulation timeout.
Invalid prize configurations.
Invalid round configurations.
Browser refresh.
Corrupted local data.
Storage write failures.
Unexpected component errors.

Show understandable operator-facing messages.

Do not silently ignore failures.

Do not automatically mark a failed round as completed.

18. TESTING REQUIREMENTS

Use appropriate testing tools such as Vitest and React Testing Library.

18.1 Prize Engine Tests

Verify:

Type A:

text
Rank 1 = 1
Rank 2 = 0
Rank 3 = 3
Total = 4


Type B:

text
Rank 1 = 0
Rank 2 = 2
Rank 3 = 2
Total = 4


Test randomized arrangements and ensure distribution counts never change.

18.2 Round Configuration Tests

Verify:

Exactly 60 rounds.
No duplicate round numbers.
No missing rounds.
Only Type A and Type B are accepted.
Editing persists correctly.
18.3 Landing Validation Tests

Test:

Four unique slots = valid.
Two balls in one slot = invalid.
Three balls in one slot = invalid.
Missing landing = invalid.
More than four landing events = rejected.
Duplicate collision events = handled safely.
18.4 Game State Tests

Verify:

Cannot start an active round.
Cannot release twice.
Cannot reveal before all balls land.
Cannot advance an invalid round.
Cannot advance beyond round 60.
Cannot record the same round twice.
18.5 Persistence Tests

Verify:

Session recovery.
Prize arrangement recovery.
Completed result recovery.
Interrupted simulation recovery.
Invalid data handling.
18.6 UI Tests

Verify:

All four players are visible.
All four prize slots are visible.
Thai localization works.
English localization works.
Responsive layout works.
Operator controls match game state.
19. PERFORMANCE REQUIREMENTS

The application should remain smooth during physics simulation.

Priorities:

Stable animation frame rate.
Efficient Canvas rendering.
Minimal React re-rendering.
Proper event cleanup.
Controlled physics updates.
Responsive canvas resizing.
No memory leaks.

Avoid unnecessary effects and expensive rendering operations.

Test the game on a typical laptop and a large presentation display.

20. SECURITY AND DATA RULES
Do not expose secrets in client-side code.
Do not add unnecessary external services.
Validate imported or restored data.
Prevent accidental destructive actions.
Avoid unsafe HTML injection.
Use secure and maintained dependencies.

The initial version is a local single-browser application.

Do not claim that LocalStorage or IndexedDB provides tamper-proof or cryptographically secure prize results.

If tamper-resistant competition results are required later, a trusted server-side system will be necessary.

21. DEVELOPMENT WORKFLOW

AI agents must follow this workflow.

Step 1: Inspect

Before coding:

Inspect the current repository.
Read this AGENTS.md.
Inspect package.json.
Check installed dependencies.
Understand existing components.
Identify existing architecture.

Do not overwrite working project code without understanding it.

Step 2: Plan

Before implementing major features:

Identify affected modules.
Define interfaces.
Identify dependencies.
Consider failure cases.
Keep game logic independent from UI.
Step 3: Implement

Implement features in small, testable modules.

Recommended development order:

Project setup.
Type definitions.
Player configuration.
Prize engine.
Round configuration.
Game state management.
Physics simulation.
Landing validation.
Persistence and recovery.
Gameplay UI.
Localization.
Final podium.
Responsive refinement.
Testing.
Step 4: Verify

After implementation:

Run TypeScript checks.
Run ESLint.
Run unit tests.
Run production build.
Fix all relevant errors.

Do not claim tests passed if they were not executed.

Step 5: Report

After completing a task, report:

What was implemented.
Files created or modified.
Tests executed.
Known limitations.
Remaining work.
22. CODING STANDARDS
Use functional React components.
Prefer small, reusable components.
Keep business logic outside UI components.
Use explicit TypeScript types.
Avoid unnecessary global state.
Avoid duplicated game rules.
Keep configuration centralized.
Use meaningful naming.
Handle asynchronous operations safely.
Clean up browser resources.
Add comments for complex physics and game logic.
Avoid overengineering.
Do not introduce unnecessary dependencies.

Do not create a giant single-file game implementation.

Do not mix prize generation, physics simulation, persistence, and UI rendering in the same module.

23. AI AGENT BEHAVIOR RULES

All AI coding agents must follow these rules.

Read AGENTS.md before making changes.
Follow the approved product requirements.
Do not invent new gameplay rules.
Do not change player identities.
Do not change prize distribution rules.
Do not change the total number of rounds.
Do not introduce automatic round advancement.
Do not introduce audio.
Do not introduce a separate admin application.
Do not create a src directory.
Use Next.js App Router.
Preserve existing working functionality.
Do not replace realistic physics with fake animations.
Do not manipulate landing outcomes to favor a prize.
Do not reveal prizes before valid completion.
Do not silently retry invalid rounds.
Do not silently modify locked prize arrangements.
Do not claim successful tests without running them.
Do not leave critical gameplay functionality as placeholder code.
Ask for clarification when a requested change conflicts with these rules.

When a requested feature conflicts with the requirements, explain the conflict before implementing it.

24. DEFINITION OF DONE

A feature is complete only when:

It meets the requested behavior.
It follows the project architecture.
It has appropriate TypeScript types.
It handles relevant error states.
It does not violate game rules.
It works with existing features.
It has appropriate tests.
Linting passes.
Type checking passes.
Production build succeeds.

The complete SQUID PLINKO application is ready when:

[ ] Exactly four fixed players exist.

[ ] All four players have unique symbols and colors.

[ ] Exactly four balls are simulated.

[ ] Exactly four prize slots exist.

[ ] All four balls are released simultaneously.

[ ] Realistic physics simulation works.

[ ] Type A distribution is correct.

[ ] Type B distribution is correct.

[ ] Prize positions are randomized independently per round.

[ ] Prize arrangements remain locked during gameplay.

[ ] All 60 rounds can be configured.

[ ] Balls must land in four unique slots.

[ ] Duplicate landing produces an invalid round.

[ ] Retry requires manual operator action.

[ ] Prize results are revealed only after successful validation.

[ ] Round progression is manual.

[ ] Browser refresh recovery works.

[ ] Results are persisted locally.

[ ] Thai and English localization work.

[ ] The game is responsive.

[ ] Fullscreen mode works where supported.

[ ] No audio is played.

[ ] Final podium is displayed after round 60.

[ ] No critical console errors remain.

[ ] Production build succeeds.

25. FINAL PRODUCT PRINCIPLE

SQUID PLINKO must feel like a polished cinematic game-show experience.

The board, lighting, symbols, motion, and reveal sequence should create tension and excitement.

However, visual presentation must never compromise game correctness.

Physics must remain real.

Prize rules must remain deterministic.

Round progression must remain controlled by the operator.

Results must remain consistent and recoverable.

Build a complete, reliable, cinematic SQUID PLINKO experience — not just a visual prototype.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
