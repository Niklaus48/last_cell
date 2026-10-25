# آخرین سلول — The Last Cell

A Persian-language, choice-driven narrative game. The player follows **Kian Farahmand**, an
experienced Iranian operative held in a fictional high-security prison; the game leans on
psychological suspense, investigation, hidden information and branching outcomes.

This repository currently contains **Phases 1–2: the project foundation and a hardened,
React-independent story engine**. The canonical Chapter 1 story, timed-decision execution,
save/load UI, artwork, audio and Android packaging are *not* implemented yet.

* Phase 1 — React + Vite foundation, first engine, demo story, tests.
* Phase 2 — declarative conditions/effects hardening, structured clue tracking, checkpoints,
  recoverable failures, versioned snapshots, extended validation.

Engine internals are documented in **[docs/engine-architecture.md](docs/engine-architecture.md)**.

---

## Stack

| Concern | Choice |
| --- | --- |
| UI | React 19 + TypeScript (strict) |
| Build / dev server | Vite 8 |
| Styling | plain CSS with design tokens (`src/styles/`) |
| Tests | Vitest 4 + React Testing Library (jsdom) |
| Lint | ESLint 10 + typescript-eslint |
| Package manager | npm |

No backend, no state-management library, no CSS framework, no network calls at runtime.
Capacitor will be added in the phase that introduces Android packaging.

> TypeScript is pinned to `^6.0.x` on purpose: `typescript-eslint@8` (the current release)
> supports `>=4.8.4 <6.1.0`, so TS 7 would break `npm run lint`.

---

## Getting started

```bash
npm install        # install dependencies
npm run dev        # http://localhost:5173  (dev server, bound to all interfaces)
```

Production web build and a local preview of it:

```bash
npm run build      # tsc -b (type check) + vite build → dist/
npm run preview    # serve dist/
```

Quality gates:

```bash
npm run typecheck  # tsc -b, strict mode, zero errors expected
npm run lint       # eslint .
npm run test       # vitest run (154 tests)
npm run verify     # typecheck + lint + test + build in one go
```

Note: `.npmrc` sets `legacy-peer-deps=true` because npm 10.8's peer resolver crashes on
Vitest's optional `canvas` peer dependency. Keep it unless a newer npm is used.

---

## Git workflow

**Every feature is developed on its own `feature/<slug>` branch and pushed to `origin`.**
`main` is never published to directly — the scripts refuse it.

```bash
npm run feature:new -- phase-2-timed-choices   # ./scripts/new-feature.sh <slug>
# ...develop, then...
npm run publish -- "feat: timed decision countdown"   # ./scripts/publish.sh ["message"]
```

`scripts/new-feature.sh` branches off an up-to-date `main` (fetching first when a remote
exists). `scripts/publish.sh` stages and commits any pending work on the current feature
branch, then pushes it with `git push -u origin <branch>`, so the branch is tracked (and a PR
can be opened) after the first push. Nothing is force-pushed and `main` is never rewritten.

Start a run with the current state of the repo:

| Branch | Purpose |
| --- | --- |
| `main` | integration branch |
| `feature/phase-1-foundation` | Phase 1: foundation and story engine |

`origin` must be configured before the first push:

```bash
git remote add origin git@github.com:<owner>/<repo>.git   # or https://…
```

---

## Playing the demo

1. `npm run dev`
2. Open the printed URL (mobile viewport recommended; the layout is portrait-first).
3. Press **آغاز نمونهٔ توسعه** and choose.

The demo story (`src/story/content/demoStory.ts`, «اتاق بازجویی») is a **development-only
fixture**, not Chapter 1. It has 3 scenes, 3 endings, 3 variables, one clue, one declared
checkpoint and one recoverable failure:

```
demo-arrival (سلول ۱۴)
├── «حرف می‌زنم»      → demo-interrogation   (suspicion +1)
│   ├── «دروغ می‌گویم»      → ending: روایت شکسته
│   ├── «بخشی از حقیقت»     → ending: حقیقت کوچک
│   ├── «دربارهٔ برگه…»      → ending: حقیقت کوچک   ← only if clue folded-note discovered
│   ├── «وکیل می‌خواهم»     → ending: روایت شکسته   ← only if suspicion ≥ 1
│   └── «روی نگهبان فشار…»  → failure: f-guard-alert (recoverable)
└── «سکوت می‌کنم»     → demo-silence   ← declared checkpoint «راهروی بند»
    ├── «همچنان سکوت»      → ending: سکوت
    └── «به تای پوشه نگاه…» → demo-interrogation  (+ clue folded-note)
```

The failure returns the player to the corridor checkpoint (a snapshot: clues and variables
from after the checkpoint are rolled back), which exercises recovery end to end in the UI.

---

## Architecture

```
src/
  app/
    App.tsx              # screen router: title → playing → ending
    useStorySession.ts   # the only place React touches the engine
  ui/
    components/          # ChoiceList, NarrationBlock  (presentational)
    screens/             # TitleScreen, GameScreen, EndingScreen, FailureScreen
    messages.ts          # engine error code → Persian copy
    format.ts            # Persian digits
  story/
    engine/              # PURE DOMAIN — no React, no DOM, no browser storage
      types.ts           # declarative data model + result unions
      conditions.ts      # declarative condition evaluation
      effects.ts         # declarative state effects (immutable)
      validation.ts      # structural validation of story definitions
      engine.ts          # createStoryEngine() — start / choose / queries
      index.ts           # public barrel
    content/
      demoStory.ts       # development-only demo (disposable)
      index.ts           # story registry: key → StoryDefinition
    state/
      sceneView.ts       # engine data → view models + local asset resolution
  styles/
    tokens.css           # colours, spacing, type scale, touch targets
    layout.css           # portrait-first responsive layout (logical properties)
    index.css            # reset, buttons, choice list, motion
  main.tsx
tests/
  fixtures/testStory.ts  # engine fixture (clues, checkpoints, failures), no production data
  engine.test.ts         # init, transitions, atomicity, history, repeated visits, endings
  conditions.test.ts     # primitive comparisons, missing vars, nesting, clues
  effects.test.ts        # set/increment/unset/discover, invalid increments, immutability
  clues.test.ts          # discovery, de-duplication, gating, non-leakage
  checkpoints.test.ts    # checkpoint create/restore, recoverable vs terminal failures
  snapshots.test.ts      # JSON round-trip, untrusted-input validation, independence
  validation.test.ts     # malformed stories: scenes, choices, clues, checkpoints, failures
  demoStory.test.ts      # the demo story end to end, engine only
  content.test.ts        # story content is declarative data (no functions)
  enginePurity.test.ts   # architectural guard (see below)
  app.test.tsx           # RTL: playthrough, ending, failure + recovery
public/favicon.svg
index.html               # <html lang="fa" dir="rtl">
```

### The architectural rule

**`src/story/engine/` is a framework-free domain module.** It must not import React, React
hooks, UI components, CSS, or touch `window`, `document`, `localStorage` or any other browser
API. It uses plain objects and pure functions and therefore runs in a plain Node process.

This boundary is enforced three ways:

1. **ESLint** (`eslint.config.js`) forbids React/UI/CSS imports and DOM/browser-storage globals
   inside `src/story/engine/**`.
2. **`tests/enginePurity.test.ts`** scans the engine sources for React imports, CSS imports,
   `window.`/`document.`/`localStorage` access, `any`, and imports that leave the layer.
3. **The engine tests run in Vitest's default `node` environment** — no DOM, no React — and
   that test file asserts `globalThis.window === undefined` at runtime.

Data flows one way:

```
content (declarative data)  →  engine (pure state transitions)  →  sceneView (view models)  →  React
                                        ↑                                    │
                                        └──── choose(sceneId, choiceId) ─────┘
```

React never decides *what* is a legal choice or *where* it leads. `useStorySession` only stores
the `StoryState` snapshot the engine returns and renders from it.

### Engine API (summary)

```ts
import { createStoryEngine } from './story/engine';

const engine = createStoryEngine(story);        // throws StoryDefinitionError if invalid
const state  = engine.start();

engine.getAvailableChoices(state);              // engine decides availability
engine.getCheckpointOpportunity(state);         // declared checkpoint for this scene, or null
engine.hasClue(state, 'folded-note');           // boolean only, no description leak
engine.getSceneTransitions(state);              // [{ fromSceneId, choiceId, toSceneId }]

const result = engine.choose(state, { sceneId: state.currentSceneId, choiceId: 'speak' });
if (result.ok) {
  result.state;       // new StoryState; input never mutated
  result.transition;  // {type:'scene'} | {type:'ending'} | {type:'failure'}
  result.changes;     // { variableChanges: [{variable, before, after}], discoveredClueIds }
} else {
  result.error.code;  // typed code (see docs); result.state === input state
}

const checkpoint = engine.createCheckpoint(result.state);   // only where declared
const recovered  = engine.recover(failedState, checkpoint.checkpoint);
```

Design decisions worth knowing:

* **Declarative content only** — conditions, effects, clues, checkpoints and failure rules
  are typed data, never functions, so they can be validated, serialised and tested.
* **Atomic transitions** — effects are computed on a copy; if any is impossible the whole
  choice fails with `EFFECT_FAILED` and nothing is written (no partial state, no history entry).
* **Immutable transitions** — successful choices return fresh objects; failures return the
  *same* state instance, so a rejected click cannot corrupt a run.
* **Discriminated unions** remove invalid states: a choice leads to a scene *or* an ending
  *or* a failure; a run is `playing` | `ended` | `failed`; results are `ok | !ok`.
* **`StoryState` is a versioned, JSON-safe snapshot** (`schemaVersion`, `storyId`,
  `currentSceneId`, `progress`, `variables`, `discoveredClueIds`, `history`). Visited scenes
  and taken choices are *derived* from `history`, never stored twice. No browser persistence
  in this phase — `serializeState` / `restoreSnapshot` exist for when it arrives.
* **Checkpoints & failures** — content declares which scenes are safe recovery points
  (`checkpoints`) and how a failure recovers (`failures[].recovery`, checkpoint only).
  Recovery restores a real snapshot, so clues/variables before the checkpoint survive and
  post-checkpoint changes roll back. Nothing recovers automatically.
* **Timed decisions** exist in the type model (`SceneDefinition.timedDecision`) and are
  validated for structural correctness, but they are **not executed** yet.
* **Assets** are referenced by stable ids (`backgroundAssetId`); the UI resolves them to local
  CSS gradients in `src/story/state/sceneView.ts`. No remote URLs, so the app works offline.

### Persian & responsive foundations

* `index.html` sets `<html lang="fa" dir="rtl">`; logical CSS properties
  (`padding-inline`, `margin-block`, `text-align: start`) keep the layout correct in RTL.
* System font stack (`Vazirmatn` / `Vazir` / `IRANSans` / `Segoe UI` / `Tahoma` …) — a licensed
  local Persian webfont can be added later without touching components.
* Portrait-first, fluid layout: `100dvh`, `clamp()` type scale, no fixed pixel widths, safe-area
  insets for notched devices, 44–56 px touch targets, and a desktop layout that caps the reading
  column instead of stretching it.
* `prefers-reduced-motion: reduce` disables the only animation (a short fade on scene change).
* Persian digits are produced locally (`src/ui/format.ts`) — no Intl/ICU dependency.

---

## Tests

`npm run test` currently runs **154 tests in 11 files**:

| File | Tests | Covers |
| --- | --- | --- |
| `tests/engine.test.ts` | 21 | init, transitions + destinations, atomic effect failure, history/visited scenes, invalid choice id, stale scene, unavailable condition, ended/failed rejection, ending recognition, repeated visits, `restore` |
| `tests/conditions.test.ts` | 17 | primitive comparisons, non-coercion, missing variables, nesting, clue/visited conditions, determinism, frozen inputs |
| `tests/effects.test.ts` | 15 | set/increment/unset/discover, ordering, missing = 0, invalid increments, atomicity, immutability |
| `tests/clues.test.ts` | 7 | discovery, record exposure, re-discovery, gating, no description leakage |
| `tests/checkpoints.test.ts` | 22 | opportunities, creation, snapshot isolation, restore, recoverable vs terminal failures, recovery semantics, invalid checkpoints |
| `tests/snapshots.test.ts` | 11 | JSON round-trip, JSON-safety walk, invalid-snapshot diagnostics, independence, strict `restore` |
| `tests/validation.test.ts` | 26 | scene/choice/ending/failure/checkpoint/clue/condition/effect errors, malformed arrays |
| `tests/demoStory.test.ts` | 10 | demo validity, branches, endings, clue gating, checkpoint + failure recovery |
| `tests/content.test.ts` | 7 | story content is declarative JSON data (no functions/classes) |
| `tests/enginePurity.test.ts` | 13 | engine stays React/DOM/storage-free; `any` never appears; imports stay in-layer |
| `tests/app.test.tsx` | 5 | RTL/jsdom: playthrough, ending, failure screen, recovery, restart |

---

## Known limitations (Phase 2 scope)

* Only the disposable demo story exists; Chapter 1 content, the full branching graph and its
  canonical narration are not written.
* Timed decisions are modelled and validated but **not executed** (no timers, no countdown UI).
* No save/load UI and no browser persistence: `serializeState`/`restoreSnapshot` are ready,
  storage is deliberately absent. Checkpoints live in memory for the current session only.
* Clues are tracked, but there is no inventory/item system, investigation UI, relationship
  system or flowchart view yet.
* The UI gained only a failure screen and a checkpoint hint; no redesign.
* No artwork, audio, animations beyond a fade, analytics, or Android/Capacitor project.
* Error copy is mapped from engine codes in the UI; engine messages themselves are English and
  developer-facing.

## Roadmap hooks already in place

`StoryDefinition.scenes[]` + `endings[]` + `initialVariables` for content growth;
`clues[]`/`checkpoints[]`/`failures[]` registries for validated references;
`history` (and the derived `getVisitedSceneIds` / `getTakenChoiceIds` / `getSceneTransitions`)
for path analysis and the future chapter flowchart; `ChoiceCondition`/`StateEffect` for clue and
relationship gating; versioned `StoryState` + `serializeState`/`restoreSnapshot` for save/load;
`SceneDefinition.timedDecision` for the timed-decision phase.
