# آخرین سلول — The Last Cell

A Persian-language, choice-driven narrative game. The player follows **Kian Farahmand**, an
experienced Iranian operative held in a fictional high-security prison; the game leans on
psychological suspense, investigation, hidden information and branching outcomes.

This repository currently contains **Phases 1–5: the foundation, a hardened React-independent
story engine, the complete canonical Chapter 1 narrative** («شش ماه سکوت»), **live timed
decisions, local saves and a cinematic presentation layer** ready to receive final artwork.
Final illustrations, audio, cloud saves and Android packaging are *not* implemented.

* Phase 1 — React + Vite foundation, first engine, demo story, tests.
* Phase 2 — declarative conditions/effects hardening, structured clue tracking, checkpoints,
  recoverable failures, versioned snapshots, extended validation.
* Phase 3 — Chapter 1: 32 scenes, 69 choices, 6 clues, 3 tiered endings, 3 checkpoints,
  2 recoverable failures, all pure data.
* Phase 4 — the chapter is playable under pressure: real countdowns that resolve to the
  declared default, and local save/resume built on the existing snapshot format.
* Phase 5 — cinematic presentation: per-scene artwork, focal points, slow camera moves,
  fades, atmospheric overlays, and a documented asset contract for the final images.
* Phase 6 — narration-gated decisions: every scene is presented, read and announced before
  its choices become interactive, and a timed decision only starts counting once the
  choice buttons are actually on screen.

Chapter 1 narrative design and its consistency review:
**[docs/chapter1-narrative-review.md](docs/chapter1-narrative-review.md)**.

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
npm run test       # vitest run (209 tests)
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

### Restoring git in a fresh session

`.git/config` is excluded from workspace snapshots, so the remote and its credentials do not
survive between sessions (and occasionally the whole `.git` directory is missing). One command
fixes all of it — no token pasted into a chat:

```bash
./scripts/git-session.sh            # npm run git:session
```

It will:

1. re-clone the history from `origin` if `.git` is gone, and point `HEAD` at the work branch
   **without touching a single working file** (local work is never overwritten);
2. re-apply `origin` with the stored token;
3. set the commit identity, `core.fileMode false` (the snapshot drops exec bits, which used to
   show up as phantom modifications) and drop any in-repo `credential.helper`;
4. print branch, HEAD, tree state and an `auth OK / FAILED` check against the remote.

Options: `--push` (restore, then push the current branch; refuses `main`/`master`),
`--backup` (also write a bundle to `.git-backup/`), `--save-token` (store a token from stdin).

The token lives in **`~/.config/last-cell/github-token`** (mode `600`), i.e. *outside* the
repository, so it can never be committed, and it is not on the snapshot exclusion list, so it
persists. Store or replace it once:

```bash
./scripts/git-session.sh --save-token <<< "github_pat_…"   # then revoke that token in the chat history
```

Use a fine-grained PAT limited to this repository with **Contents: Read and write**, and set
*no expiration* if you do not want to repeat this. `GITHUB_TOKEN=… ./scripts/git-session.sh`
overrides the stored token for a single run.

---

## Playing Chapter 1

1. `npm run dev`
2. Open the printed URL (mobile viewport recommended; the layout is portrait-first).
3. Press **شروع فصل اول** and choose.

The application loads `chapter1` by default (`DEFAULT_STORY_KEY`). It is 32 scenes across seven
acts: the cell before dawn, the stranger at the bars, the escape itself, two investigative routes
(the warden's office, riskier; the cafeteria and service corridor, quieter), the locked door, the
old telephone, and three endings. Design notes, gating rules and the consistency review live in
[docs/chapter1-narrative-review.md](docs/chapter1-narrative-review.md).

### Timed decisions

Two Chapter 1 scenes declare a countdown in the story data — the stranger at the cell
(12 s, default **silence**) and the guarded door (8 s, default **freeze and observe**). The UI
reads those values from the content; it hard-codes neither the durations nor the defaults.

* While a decision is active, the scene shows its choices plus a countdown (`زمان تصمیم: ۹ ثانیه`)
  and a progress bar. The time is text first, so it survives `prefers-reduced-motion`, a greyscale
  screen and a screen reader.
* If the timer reaches zero, the declared default is applied **exactly once, through the normal
  engine path** — conditions, effects, checkpoints, history and transition validation all run
  as they would for a click. Silent expiry therefore awards no clue and records the choice in the
  history like any other.
* Choosing manually before expiry cancels the pending timeout. A manual choice and a timeout
  landing in the same tick resolve once: the run applies one choice and moves one scene.
* A scene change, an ending, a failure, a recovery, a load or an unmount clears the countdown. A
  stale timer can never resolve a decision in a later scene.
* **Background tabs:** the countdown is computed from an absolute deadline and a monotonic clock,
  never by counting ticks. A throttled tab that misses callbacks catches up on return (via
  `visibilitychange`) and an already-expired decision resolves once, immediately.
* **Loading a save mid-decision restarts the full declared duration.** The snapshot stores run
  state, not remaining time, so a resumed run always gets the whole window rather than a deadline
  inherited from before the save (documented, and asserted by a test).

### Saving and resuming

* The game screen has **ذخیره**; the title screen has **ادامه از ذخیرهٔ محلی**, disabled with an
  explanation when there is nothing usable to resume.
* Overwriting an existing save asks first (inline confirmation, no modal framework).
* Saves live in `localStorage` under the namespaced key `last-cell.save.v1` — one slot, **this
  browser and this origin only**. They are not encrypted, not synced across devices, and contain
  no credentials or personal data — just the run state.
* A save is accepted only if the engine validates it: envelope format and version, story key, then
  `restoreSnapshot` checks snapshot schema version, story identity, current scene, progress,
  variables, clues and history consistency. Any failure is reported in Persian and **leaves the
  current in-memory run untouched**; a corrupt save is never partially loaded and never overwrites
  a valid one.
* A restored run keeps its variables, clues, history and route. Checkpoints are not stored in the
  snapshot; they are rebuilt by replaying the saved history through the public engine API, so a
  saved failure can still be recovered. Storage being unavailable, full or disabled degrades to
  "no saves" without breaking play.

### Cinematic presentation

Every scene is painted by one shared layer (`SceneBackdrop`) driven by declarative
metadata — no per-scene rendering code:

* **Artwork is optional and replaceable.** `src/presentation/assetManifest.ts` maps an asset id
  to a file in `public/assets/scenes/chapter-1/`. Every entry is `null` today, so the game shows
  its fallback gradients; adding a file is a one-line manifest change.
* **Camera motion** is a small preset set (`slow-zoom-in`, `slow-zoom-out`, `pan-left`,
  `pan-right`, `none`) applied to the artwork layer only, so text and buttons never drift.
* **Overlays** (`vignette`, `haze`, `cold`) plus a fixed readability scrim keep Persian
  narration and choices legible over any image.
* **Fades** are short and scene-keyed; the previous scene is never left on screen, and nothing
  waits for an animation before the story advances.
* **Fallbacks are total**: a pending, unknown, missing or broken image just means "gradient" —
  never a blank screen, a broken-image icon or a console error storm.
* **Reduced motion** drops camera movement and turns fades into cuts, in both the hook and CSS.

Nothing in this layer can change choices, timed decisions, clues, checkpoints or endings — it is
read-only decoration with tests that assert exactly that. Artwork workflow, dimensions, naming and
focal-point guidance: **[docs/art-assets.md](docs/art-assets.md)**.

### Narration-gated decisions

A scene is a short, explicit sequence rather than "narration plus buttons":

| Stage | What the player sees | What runs |
| --- | --- | --- |
| `scene_narration` | scene backdrop + narration, a **«ادامه»** action | one reading-pause timer (6 s) |
| `choice_announcement` | the narrator introduces the available options as *text* | one reading-pause timer (4 s) |
| `choices_available` | the choice buttons | the decision countdown, if the scene declares one |

* **The choices are not rendered during the first two stages**, so there is no button to
  click, focus, or reach from the keyboard — and the session refuses any choice while the
  gate is closed, so a stale handler cannot sneak one through either.
* **Continue is always available**, and manual and automatic progression share one guarded
  function: exactly one of them advances a stage, never both.
* **The countdown starts with the buttons**, not with the scene. A 12-second decision gives
  twelve seconds from the moment the choices appear; nothing ticks during narration or the
  announcement.
* **Only available choices are announced.** The announcement is built from the engine's
  condition-filtered list and reuses the story's own labels — no new dialogue.
* **Scenes with nothing to announce skip that stage** instead of waiting for an option that
  does not exist.
* **The stage is derived, never saved.** A restored run starts its scene from the narration,
  so a save can never expose choices or a countdown the player never reached.
* **Pauses scale with the text.** A five-paragraph scene is given far longer than a one-line
  one, within declared bounds, so a long scene is never rushed. The numbers live in one typed
  configuration (`NARRATION_TIMING` in `src/app/narrationFlow.ts`), which is also where future
  narration *audio* would hook in.

### The dev fixture

`src/story/content/demoStory.ts` («اتاق بازجویی») is still registered as `demo` — a
**development-only fixture**, used by the UI tests because it is small and deterministic. It is
not the shipped story and the app never loads it unless a caller passes `storyKey="demo"`. It has
3 scenes, 3 endings, 3 variables, one clue, one declared checkpoint and one recoverable failure:

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

`npm run test` currently runs **362 tests in 23 files** (`npm run assets:check` runs the artwork
manifest check on its own):

| File | Tests | Covers |
| --- | --- | --- |
| `tests/engine.test.ts` | 21 | init, transitions + destinations, atomic effect failure, history/visited scenes, invalid choice id, stale scene, unavailable condition, ended/failed rejection, ending recognition, repeated visits, `restore` |
| `tests/conditions.test.ts` | 17 | primitive comparisons, non-coercion, missing variables, nesting, clue/visited conditions, determinism, frozen inputs |
| `tests/effects.test.ts` | 15 | set/increment/unset/discover, ordering, missing = 0, invalid increments, atomicity, immutability |
| `tests/clues.test.ts` | 7 | discovery, record exposure, re-discovery, gating, no description leakage |
| `tests/checkpoints.test.ts` | 22 | opportunities, creation, snapshot isolation, restore, recoverable vs terminal failures, recovery semantics, invalid checkpoints |
| `tests/snapshots.test.ts` | 11 | JSON round-trip, JSON-safety walk, invalid-snapshot diagnostics, independence, strict `restore` |
| `tests/validation.test.ts` | 30 | scene/choice/ending/failure/checkpoint/clue/condition/effect errors, malformed arrays, timed-decision duration/default/unavailable-default rules |
| `tests/demoStory.test.ts` | 10 | demo validity, branches, endings, clue gating, checkpoint + failure recovery |
| `tests/content.test.ts` | 7 | story content is declarative JSON data (no functions/classes) |
| `tests/enginePurity.test.ts` | 13 | engine stays React/DOM/storage-free; `any` never appears; imports stay in-layer |
| `tests/app.test.tsx` | 6 | RTL/jsdom: Chapter 1 default load, demo-fixture playthrough, ending, failure screen, recovery, restart |
| `tests/chapter1.content.test.ts` | 26 | Chapter 1 validation, unique ids, declared refs, reachability of every scene/choice/ending/failure, no dead ends, Persian-only text, timers, checkpoint placement, no functions in data |
| `tests/chapter1.playthrough.test.ts` | 28 | Chapter 1 branches: three stranger choices, silence reveals nothing, note via its action only, both routes and their convergence, clue-gated options, ending A/B/C gating, checkpoint recovery and rollback |
| `tests/timing.test.ts` | 8 | countdown arithmetic: deadline maths, clamping, rounding, urgency buckets |
| `tests/timedDecision.test.tsx` | 25 | 12 s → silence, 8 s → freeze-and-observe, manual-vs-timeout races, stale timers, unmount, background tabs, restart-on-load, no narration replay, live-region restraint, invalid timer data |
| `tests/saveGame.test.ts` | 20 | save/load round trip, clue/variable/history preservation, terminal states, missing/malformed/incompatible/wrong-story/tampered data, schema and story identity, storage exceptions and quota |
| `tests/saveSession.test.tsx` | 12 | session save/resume, checkpoint rebuild after load, recovery from a loaded failure, stale timers across load, corrupt save leaves the run intact, resume/overwrite/unavailable-storage UI |
| `tests/presentation.model.test.ts` | 19 | scene metadata resolution and defaults, canonical-id references, malformed/duplicate/unknown metadata, asset manifest rules, warn-once for unknown ids |
| `tests/presentation.assets.test.ts` | 4 | manifest structure (`npm run assets:check`), every supplied file exists in `public/`, pending-artwork report |
| `tests/sceneBackdrop.test.tsx` | 13 | gradient fallback, image load/error handling, focal point, stale-load protection, scene swap, reduced motion, decorative layer |
| `tests/narrationFlowModel.test.ts` | 15 | stage order and the announcement skip for choice-less scenes, centralised reading pauses, stage identity, announcement reuse of choice labels |
| `tests/narrationGate.test.tsx` | 21 | no interactive choice before the announcement, Continue advances once, auto-pause progression, manual-vs-auto races, unmount/restart/load cleanup, only available choices announced, full countdown after the gate, manual cancel, gated `choose`, save/load before narration, recovery through the gate |
| `tests/cinematic.integration.test.tsx` | 9 | presentation cannot advance the story, no duplicate transitions mid-fade, timed default fires once, save/resume intact, title/failure/ending screens unaffected, keyboard activation |

---

## Known limitations (Phase 6 scope)

* Chapter 1 is complete as *content*; Chapters 2+ are not written. The three endings each carry a
  Chapter-2 hook, but no Chapter 2 exists yet.
* **No final artwork is shipped.** All 32 scenes render fallback gradients; the presentation layer,
  asset manifest and naming convention are ready for the illustrations (see
  [docs/art-assets.md](docs/art-assets.md)).
* One image per asset id: there are no per-breakpoint art variants, no parallax and no video.
* Reading pauses are fixed durations (6 s narration, 4 s announcement); they do not scale with
  paragraph length, and there is no typewriter/paragraph-by-paragraph reveal yet.
* There is no narration audio. The flow is shaped so that a later audio stage can hold
  `scene_narration` open until playback ends, but nothing plays today.
* Saves are a single local slot per browser origin: no multiple slots, no export/import, no cloud
  sync, no encryption. Clearing site data deletes the save.
* The countdown is wall-clock based, so a backgrounded decision can expire while the tab is hidden;
  the player returns to its aftermath rather than to a paused timer. This is deliberate (the scene
  is under time pressure) and documented, not an oversight.
* No save/load UI and no browser persistence: `serializeState`/`restoreSnapshot` are ready,
  storage is deliberately absent. Checkpoints live in memory for the current session only.
* Clues are tracked and gated, but there is no clue-inventory screen, investigation UI,
  relationship system or flowchart view yet.
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
