# The mobile game shell and its motion

The game is meant to be played one-handed on a phone, in the dark. This note
records the decisions behind the touch layout and the two animations that carry
feedback: **choosing an option** and **the state-change notice**.

Both animations are presentation only. The engine's transition, the countdown and
the Phase 6 staging (`scene_narration` → `choice_announcement` →
`choices_available`) are untouched: a tap commits on the same tick it always did,
and no animation is awaited before the run advances.

## Layout rules

| Rule | Where |
| --- | --- |
| Full-height frame with `100dvh`, all four `env(safe-area-inset-*)` respected | `.screen`, `.screen--game` in `src/styles/layout.css` |
| Compact top bar that sticks to the top edge (orientation while a scene scrolls) | `.game-topbar` |
| Choices are a **bottom dock**: sticky to the bottom edge on phones, so the options are always under the thumb | `.game-content .choice-list` (`max-width: 47.99rem` or short landscape) |
| Opaque choices and dock — text never ghosts through a button | `--color-surface-raised`, `.choice-button` |
| Touch targets ≥ `--touch-target` (44px), primary actions ≥ `--touch-target-lg` (56px) | `.choice-button`, `.game-topbar .button`, `.state-panel__summary` |
| No hover-only affordances; hover styles are switched off on touch (`@media (hover: none)`) | `.choice-button`, `.button` |
| Small/short phones (≤ 26rem wide or ≤ 40rem tall) get compact cards and a one-line top bar | end of `layout.css` |
| Landscape: the narration scrolls inside a capped box so the bar, countdown and options stay visible together | `@media (orientation: landscape) and (max-height: 32rem)` |

Desktop keeps the reading-first column: the choices follow the narration and the
page scrolls. The dock only takes over where a thumb, not a mouse, does the
choosing.

## Motion

Three beats for a choice (all CSS, `src/styles/index.css`):

1. **Entrance** — `choice-arrive`, staggered per option through the `--order`
   custom property (40ms apart).
2. **Press-in** — `:active` sinks the card (`scale(0.972)`), switches it to the
   accent colour and adds an inset shadow.
3. **Ripple** — a `::after` radial bloom that expands while the card is held.

A tap also asks for an 8ms haptic tick when the platform has
`navigator.vibrate`; the call is wrapped and never awaited, so a refused or
missing vibration cannot affect the choice.

The **change notice** (`src/ui/components/ChangeNotice.tsx`) animates as a
receipt: the card drops in (`notice-in`), an accent sweep fades once
(`notice-sweep`), then each changed value arrives on its own line (`notice-item-in`,
70ms apart, ordered by `--order`, discovery last).

Closing the notice uses `Element.animate` for the exit because a CSS transition
cannot animate a removal. Where the API is missing (jsdom, old browsers) — or
where the user asks for reduced motion — `onDismiss` is called straight away.

## Reduced motion

`src/styles/index.css` already collapses every animation and transition duration
to `0.001ms` under `prefers-reduced-motion: reduce`, and the scene camera stops
independently. The two animations above are therefore inert under that
preference, and no information depends on them: every delta and every option is
plain text, present in the DOM regardless of motion.

## How it was checked

`npm run verify` (typecheck + lint + unit tests + build) plus a Playwright run
under mobile emulation — iPhone 13 390×844, iPhone SE 320×568, Pixel 7 412×915,
landscape 844×390, reduced-motion, and desktop 1280×800 — asserting per device:

- no horizontal scrolling (`documentElement.scrollWidth` ≤ viewport width);
- every visible choice is at least 44px tall;
- on phones and in landscape, all options sit inside the viewport (the dock);
- the top bar is on screen;
- `:active` produces the scale, the accent background and a visible ripple;
- the entrance animation runs (`getAnimations()` on list items);
- after a choice the notice appears with `notice-in` + `notice-item-in`, is
  readable, is ahead of the narration in document order, and closes;
- after the transition the choice list is gone and the reading stages are back;
- no console errors.
