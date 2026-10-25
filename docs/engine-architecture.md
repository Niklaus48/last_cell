# Story engine — architecture (Phase 2)

`src/story/engine/` is the domain layer of «آخرین سلول». It is **plain TypeScript**:
no React, no DOM, no browser storage, no CSS, no network. It takes explicit inputs,
returns new state, and describes what happened. Everything here is testable in Vitest's
`node` environment.

```
src/story/engine/
  types.ts       declarative model + result/error unions + STATE_SCHEMA_VERSION
  conditions.ts  evaluateCondition(condition, context) → boolean
  effects.ts     applyEffects({variables, discoveredClueIds}, effects) → typed result
  history.ts     derivations: visited scenes, taken choices, scene transitions
  snapshot.ts    validation/cloning of untrusted state + checkpoint envelopes
  validation.ts  validateStory(story) → StoryValidationResult
  engine.ts      createStoryEngine(story) → StoryEngine
  index.ts       public barrel (the only import path consumers should use)
```

Layer flow — one direction only:

```
content (declarative data) → engine (pure transitions) → state/sceneView (view models) → React
                                     ↑                                    │
                                     └──── choose(state, choiceId) ───────┘
```

React never decides availability, destinations, effects, checkpoints or recovery.
`src/app/useStorySession.ts` stores the `StoryState` the engine returns and calls
`createCheckpoint`/`recover`; it contains no rules of its own.

---

## Public API

```ts
import { createStoryEngine } from './story/engine';

const engine = createStoryEngine(story);   // throws StoryDefinitionError only for
const state  = engine.start();             // structurally invalid *story authoring*
```

| Group | Members |
| --- | --- |
| Run | `start()`, `choose(state, selection \| choiceId)` |
| Queries | `getCurrentScene`, `getChoices`, `getAvailableChoices`, `isChoiceAvailable` |
| Outcomes | `getEnding`, `getFailure`, `getRecoveryTarget` |
| Clues | `hasClue`, `getDiscoveredClues` |
| Path | `getHistory`, `getVisitedSceneIds`, `getTakenChoiceIds`, `getSceneTransitions` |
| Checkpoints | `getCheckpointOpportunity`, `createCheckpoint`, `restoreCheckpoint`, `recover` |
| Snapshots | `serializeState`, `restoreSnapshot` (untrusted input), `restore` (strict) |

### Transitions return typed results

```ts
const result = engine.choose(state, { sceneId: state.currentSceneId, choiceId: 'speak' });
// shorthand: engine.choose(state, 'speak')

if (result.ok) {
  result.state;       // fresh StoryState — the input is never mutated
  result.choice;      // the ChoiceDefinition that was taken
  result.transition;  // {type:'scene', fromSceneId, toSceneId}
                      // {} | {type:'ending', fromSceneId, endingId}
                      // {} | {type:'failure', fromSceneId, failureId}
  result.changes;     // { variableChanges: [{variable, before, after}], discoveredClueIds }
} else {
  result.error;       // { code, message, sceneId?, choiceId?, checkpointId?, detail? }
  result.state;       // === the unchanged input state
}
```

Error codes: `INVALID_CHOICE`, `CHOICE_UNAVAILABLE`, `STALE_SCENE`, `GAME_ENDED`,
`GAME_FAILED`, `UNKNOWN_SCENE`, `EFFECT_FAILED`, `NOT_FAILED`, `NO_RECOVERY_TARGET`,
`INVALID_SNAPSHOT`, `UNKNOWN_CHECKPOINT`, `CHECKPOINT_UNAVAILABLE`, `CHECKPOINT_MISMATCH`.

**Atomicity.** All effects are computed on a copy first. If any effect is impossible the
whole transition fails with `EFFECT_FAILED` and the original state is returned untouched —
no partial variable writes, no history entry, no scene change. Exceptions are reserved for
programming errors (e.g. a state that references a scene the story does not contain).

**Stale-scene protection.** `choose(state, { sceneId, choiceId })` checks `sceneId` against
`state.currentSceneId` and returns `STALE_SCENE` for a choice aimed at an old scene.

---

## Conditions

`ChoiceCondition` is declarative data (never a function):

```ts
{ kind: 'always' }
{ kind: 'compareVariable', variable: 'suspicion', operator: 'gte', value: 1 }
{ kind: 'visitedScene', sceneId: 'demo-silence' }
{ kind: 'clueDiscovered', clueId: 'folded-note' }
{ kind: 'not', condition }
{ kind: 'all', conditions: [...] }   // every child must hold
{ kind: 'any', conditions: [...] }   // at least one child must hold
```

Semantics, applied consistently:

* Values are `string | number | boolean` only; `eq`/`neq` use strict `===`/`!==` with no
  coercion (`'3' !== 3`, `0 !== false`).
* **Missing variable** = "no value": `eq` is `false`, `neq` is `true`, and every ordering
  operator (`gt`/`gte`/`lt`/`lte`) is `false` for non-numeric or missing values.
* `not`/`all`/`any` nest arbitrarily and are evaluated deterministically.
* Evaluation is pure: it never mutates the condition, the variables or the clue list, and
  works on frozen inputs.

Availability is decided by the engine alone (`getAvailableChoices`, `isChoiceAvailable`).
A choice rendered by a UI that the engine considers unavailable is still rejected with
`CHOICE_UNAVAILABLE`.

---

## Effects

Applied in declaration order to a working copy:

| Effect | Behaviour |
| --- | --- |
| `setVariable` | writes the value (last write wins) |
| `incrementVariable` | missing → treated as `0`; **non-numeric current value → `EFFECT_FAILED`**; non-finite `amount` → `EFFECT_FAILED` |
| `unsetVariable` | removes the key; later conditions see it as missing |
| `discoverClue` | appends the clue id once; re-discovery is a no-op |

`StoryState.variables` is immutable data; `applyEffects` returns a new object plus
`variableChanges` (`before: null` means the variable was absent) and
`newlyDiscoveredClueIds`.

---

## Clues

* `StoryDefinition.clues` is an optional **registry** (`{ id, label, detail? }`).
* `discoverClue` effects record ids in `StoryState.discoveredClueIds` (JSON array,
  discovery order, duplicates impossible).
* `clueDiscovered` conditions gate choices on discovery.
* When the registry is declared, **every** clue reference in effects and conditions is
  validated (`UNKNOWN_CLUE`). When it is omitted, ids are free-form (useful for sketching).
* `hasClue()` is the cheap check and returns only a boolean — it never leaks a description.
  `getDiscoveredClues()` returns records for **discovered** clues only, so undiscovered
  clue text cannot be read through the availability API.
* Clues are separate from inventory; there is no item system in this phase.

---

## Checkpoints and recovery

```ts
// content declares the opportunity…
checkpoints: [{ id: 'cp-corridor', sceneId: 'demo-silence', label: 'راهروی بند' }]

engine.getCheckpointOpportunity(state);      // CheckpointDefinition | null
const created = engine.createCheckpoint(state);   // { ok, checkpoint } | { ok:false, error }
const restored = engine.restoreCheckpoint(created.checkpoint);  // validated, cloned
```

A `Checkpoint` is `{ schemaVersion, checkpointId, storyId, sceneId, step, state }` where
`state` is a full `StoryState` clone. It contains no functions, React objects or DOM nodes,
so `JSON.stringify` works and a later phase can persist it.

Rules:

* Only scenes that **declare** a checkpoint are checkpointable — the engine never invents
  recovery points, and `createCheckpoint` refuses a finished run, an undeclared id, or a
  checkpoint belonging to another scene.
* Restoring returns a deep clone: mutating the result cannot corrupt the checkpoint.
* Untrusted input is validated (`restoreCheckpoint` accepts an object *or* JSON text) and
  failures are reported as `INVALID_SNAPSHOT` with `detail[]`, never thrown.

### Failures

```ts
failures: [{
  id: 'f-guard-alert',
  title: '…', summary: '…',
  kind: 'recoverable',                                   // or 'terminal'
  recovery: { type: 'checkpoint', checkpointId: 'cp-corridor' },
}]
```

* A choice with `outcome: { type: 'failure', failureId }` moves the run to
  `progress: { status: 'failed', failureId }`. It is **not** an ending
  (`getEnding` stays `null`), and further choices are refused with `GAME_FAILED`.
* `terminal` failures must not declare recovery; `recoverable` ones must.
* `recover(state, checkpoint)` only works on a failed run, only for a checkpoint the failure
  points at (`CHECKPOINT_MISMATCH` otherwise), and restores the **snapshot** — clues,
  variables and history from before the checkpoint survive; everything after it is rolled
  back. Recovery is never automatic: the player/UI must ask for it.
* `RecoveryTarget` only supports `{ type: 'checkpoint' }`. Jumping to a bare scene id is
  deliberately unsupported, because that would keep post-failure variables and history.

---

## State snapshots

```ts
interface StoryState {
  schemaVersion: 1;                 // STATE_SCHEMA_VERSION
  storyId: string;
  currentSceneId: SceneId;
  progress: { status: 'playing' } | { status:'ended', endingId } | { status:'failed', failureId };
  variables: Record<string, string | number | boolean>;
  discoveredClueIds: ClueId[];      // discovery order, unique
  history: { sceneId: SceneId; choiceId: ChoiceId | null }[];
}
```

`visitedSceneIds` is **not stored** — it is derived from `history`
(`engine.getVisitedSceneIds`), so the two can never disagree. History records one entry for
each scene entry (`choiceId: null`) and one for each successful pick, which is enough to
reconstruct the path, the chosen options and a future flowchart
(`getSceneTransitions` → `{fromSceneId, choiceId, toSceneId}[]`). Failed/invalid picks are
never recorded. Repeated visits are kept as separate history entries while the derived scene
list stays unique.

`restoreSnapshot(input)` accepts an object or JSON text and validates:

* `schemaVersion === STATE_SCHEMA_VERSION`, `storyId` matches this story;
* `currentSceneId` exists; `progress.endingId` / `progress.failureId` are declared;
* variables are only string/number/boolean;
* `discoveredClueIds` is an array of declared, non-duplicated clue ids;
* `history` is non-empty, references real scenes and real choice ids, and **ends at
  `currentSceneId`**.

All problems are collected into `error.detail[]`. `restore(state)` is the strict in-process
variant and throws, because a mismatch there is a programming error.

**Versioning.** `STATE_SCHEMA_VERSION` belongs to `types.ts` and is stamped on every state
and checkpoint. A snapshot with a different version is rejected (`INVALID_SNAPSHOT`) rather
than guessed at. When the shape changes, bump the constant and convert old snapshots in one
explicit place — no migration framework exists yet, by design. No browser persistence is
implemented in this phase.

---

## Adding a scene and a choice declaratively

```ts
import type { StoryDefinition } from '../engine';

export const story: StoryDefinition = {
  id: 'demo-interrogation-room',
  title: 'اتاق بازجویی — نمونهٔ توسعه',
  initialSceneId: 'arrival',
  initialVariables: { suspicion: 0 },
  clues: [{ id: 'folded-note', label: 'یادداشت تاشده' }],
  checkpoints: [{ id: 'cp-corridor', sceneId: 'corridor', label: 'راهروی بند' }],
  failures: [{
    id: 'f-guard-alert', title: '…', summary: '…', kind: 'recoverable',
    recovery: { type: 'checkpoint', checkpointId: 'cp-corridor' },
  }],
  scenes: [{
    id: 'arrival',
    title: 'سلول ۱۴',
    backgroundAssetId: 'cell-night',        // resolved by the UI, never by the engine
    narration: ['چراغ بالای سرت سه بار پلک زد…'],
    choices: [{
      id: 'speak',
      label: 'وقتی در باز شد، حرف می‌زنم.',
      outcome: { type: 'transition', targetSceneId: 'corridor' },
      effects: [
        { kind: 'incrementVariable', variable: 'suspicion', amount: 1 },
        { kind: 'discoverClue', clueId: 'folded-note' },
      ],
      condition: { kind: 'visitedScene', sceneId: 'arrival' },   // optional
    }],
    // timedDecision: { durationMs: 8000, defaultChoiceId: 'speak' }  // validated, not executed
  }],
  endings: [{ id: 'e-closure', title: '…', summary: '…', tone: 'ambiguous' }],
};
```

Then drive it:

```ts
const engine = createStoryEngine(story);       // StoryDefinitionError if malformed
const state = engine.start();
const step  = engine.choose(state, 'speak');
if (!step.ok) { console.error(step.error.code); return; }

const checkpoint = engine.createCheckpoint(step.state);   // declared for this scene
console.log(engine.getCurrentScene(step.state).title, step.changes);
```

---

## Writing engine tests without React

Put tests in `tests/*.test.ts` (the default `node` environment) and import only from
`src/story/engine`:

```ts
import { describe, expect, it } from 'vitest';
import { createStoryEngine } from '../src/story/engine';
import { makeTestStory } from './fixtures/testStory';   // engine-only fixture

it('rejects a stale choice without touching state', () => {
  const engine = createStoryEngine(makeTestStory());
  const state = engine.start();
  const result = engine.choose(state, { sceneId: 's-fork', choiceId: 'brave-path' });
  expect(result.ok).toBe(false);
  if (result.ok) return;              // narrows the union
  expect(result.error.code).toBe('STALE_SCENE');
  expect(result.state).toBe(state);
});
```

UI tests (`tests/app.test.tsx`) use `// @vitest-environment jsdom` and React Testing
Library; they assert rendered behaviour, not engine internals.

Architectural guards that run in CI:

* `tests/enginePurity.test.ts` — no React/CSS/UI imports, no `window`/`document`/
  `localStorage`, no `any`, imports stay inside the layer, and asserts the DOM is absent.
* `tests/content.test.ts` — story content contains no functions, classes or non-JSON values
  and survives a JSON round-trip.
* ESLint `no-restricted-imports` / `no-restricted-globals` for `src/story/engine/**`.

---

## Implemented vs deferred

**Implemented (Phase 2):** typed atomic transitions with change summaries, declarative
conditions (incl. clues), validated effects with atomic failure, clue discovery + gating,
derived scene/choice history and transitions, declared checkpoints, recoverable/terminal
failures with snapshot recovery, versioned JSON snapshots with full validation, story
validation for every reference above, 154 automated tests.

**Modelled/validated but not executed:** `timedDecision` (no timers, no countdowns).

**Deferred:** canonical Chapter 1 content, flowchart UI, save/load UI and any browser
persistence, inventory/items, artwork, audio, Capacitor/Android packaging, backend
services. Derived `visitedSceneIds` is intentionally not persisted; a future save format can
recompute it from `history`.
