# آخرین سلول — The Last Cell

A Persian-language, choice-driven narrative game. The player follows **Kian Farahmand**, an
experienced Iranian operative held in a fictional high-security prison; the game leans on
psychological suspense, investigation, hidden information and branching outcomes.

This repository currently contains **Phase 1 — the project foundation and story-engine
architecture only**. The canonical Chapter 1 story, timed decisions, clue systems, save games,
artwork, audio and Android packaging are *not* implemented yet.

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
npm run test       # vitest run (51 tests)
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
fixture**, not Chapter 1. It has 3 scenes, 3 endings, one state variable (`suspicion`) and one
conditionally available choice:

```
demo-arrival (سلول ۱۴)
├── «حرف می‌زنم»      → demo-interrogation   (suspicion +1)
│   ├── «دروغ می‌گویم»  → ending: روایت شکسته
│   ├── «بخشی از حقیقت» → ending: حقیقت کوچک
│   └── «وکیل می‌خواهم» → ending: روایت شکسته   ← only if suspicion ≥ 1
└── «سکوت می‌کنم»     → demo-silence
    └── «همچنان سکوت»  → ending: سکوت
```

---

## Architecture

```
src/
  app/
    App.tsx              # screen router: title → playing → ending
    useStorySession.ts   # the only place React touches the engine
  ui/
    components/          # ChoiceList, NarrationBlock  (presentational)
    screens/             # TitleScreen, GameScreen, EndingScreen
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
  fixtures/testStory.ts  # engine fixture, independent of production content
  engine.test.ts         # initialisation, transitions, invalid input, endings, history
  validation.test.ts     # malformed story definitions
  demoStory.test.ts      # the demo story, driven through the engine only
  enginePurity.test.ts   # architectural guard (see below)
  app.test.tsx           # RTL smoke test of the real App
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

### Engine API

```ts
import { createStoryEngine } from './story/engine';

const engine = createStoryEngine(story);      // throws StoryDefinitionError if invalid
const state  = engine.start();                // StoryState at story.initialSceneId

engine.getCurrentScene(state);                // SceneDefinition
engine.getChoices(state);                     // all declared choices
engine.getAvailableChoices(state);            // choices whose condition passes
engine.isChoiceAvailable(state, 'go-fork');   // boolean
engine.getEnding(state);                      // EndingDefinition | null

const result = engine.choose(state, { sceneId: state.currentSceneId, choiceId: 'go-fork' });
// or the shorthand: engine.choose(state, 'go-fork')

if (result.ok) {
  result.state;        // new StoryState — the input is never mutated
  result.choice;       // ChoiceDefinition that was taken
  result.transition;   // { type: 'scene', toSceneId } | { type: 'ending', endingId }
} else {
  result.error.code;   // 'INVALID_CHOICE' | 'CHOICE_UNAVAILABLE' | 'STALE_SCENE'
                       // | 'GAME_ENDED' | 'UNKNOWN_SCENE'
  result.state;        // === the unchanged input state
}
```

Design decisions worth knowing:

* **Declarative content only.** Conditions (`always`, `compareVariable`, `visitedScene`,
  `not`, `all`, `any`) and effects (`setVariable`, `incrementVariable`, `unsetVariable`) are
  typed data, never functions — so they can be validated, serialised and tested.
* **Immutable transitions.** Every successful `choose` returns fresh objects; failures return
  the *same* state instance, so a rejected click cannot corrupt a run.
* **Discriminated unions** are used where they remove invalid states: a choice leads to a scene
  *or* an ending (never both), a run is `playing` *or* `ended`, and results are `ok | !ok`.
* **`StoryState` is a plain serialisable snapshot** (`storyId`, `currentSceneId`, `progress`,
  `variables`, `history`, `visitedSceneIds`). There is no persistence in this phase; the hook
  keeps it in memory. A later phase can write `JSON.stringify(state)` from outside the engine
  (or use `engine.restore(state)` to re-validate a loaded save) without touching domain code.
* **Timed decisions** exist in the type model (`SceneDefinition.timedDecision`) and are
  validated for structural correctness, but they are **not evaluated** yet — no timers exist in
  the engine or UI.
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

`npm run test` currently runs **51 tests in 5 files**:

| File | Covers |
| --- | --- |
| `tests/engine.test.ts` (18) | new game init, initial scene, valid transition + destination, effects, history/visited scenes, invalid choice id, stale scene, unsatisfied condition, ended-run rejection, ending recognition, `restore` |
| `tests/validation.test.ts` (10) | missing initial scene, duplicate scene ids, dangling scene/ending references, duplicate choice ids, dead-end scene, malformed timed decision, `StoryDefinitionError` payload |
| `tests/demoStory.test.ts` (7) | demo story validity, both branches, all three endings, conditional choice gating, invalid choice safety |
| `tests/enginePurity.test.ts` (13) | engine stays React/DOM/storage-free; `any` never appears in the engine |
| `tests/app.test.tsx` (3) | RTL/jsdom: title screen → start → transition → ending → restart |

---

## Known limitations (Phase 1 scope)

* Only the disposable demo story exists; Chapter 1 content, the full branching graph and its
  canonical narration are not written.
* Timed decisions are modelled and validated but not executed.
* No clue tracking beyond free-form variables; no relationship system, checkpoints, or
  save/load UI (the state shape is ready, the persistence layer is not implemented).
* No artwork, audio, animations beyond a fade, analytics, or Android/Capacitor project.
* Error copy is mapped from engine codes in the UI; engine messages themselves are English and
  developer-facing.

## Roadmap hooks already in place

`StoryDefinition.scenes[]` + `endings[]` + `initialVariables` for content growth; `visitedSceneIds`
and `history` for path analysis and the future chapter flowchart; `ChoiceCondition`/`StateEffect`
for clue and relationship gating; the serialisable `StoryState` for save/load and checkpoint
recovery; `SceneDefinition.timedDecision` for the timed-decision phase.
