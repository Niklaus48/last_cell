# Artwork and cinematic presentation

How scenes are painted today, and exactly what to do when the final
illustrations are ready.

**Current state:** no final artwork has been supplied. Every manifest entry is
`null` and the game renders the local fallback gradients it has always used. That
is a supported state, not a failure: scenes, choices, timed decisions, saves and
endings all behave normally.

---

## 1. Architecture

```
story content (src/story/content/chapter1/**)
  SceneDefinition.id, SceneDefinition.backgroundAssetId          ← unchanged game data
        │
        ▼
src/presentation/                                                ← pure data + pure functions
  types.ts             CameraPreset, TransitionPreset, OverlayPreset, SceneFocus, ScenePresentation
  scenePresentation.ts location defaults + SCENE_PRESENTATION_OVERRIDES + resolver + validator
  assetManifest.ts     asset id → file name   (the only place a URL is built)
  fallbacks.ts         the local gradients used when artwork is absent
  presets.ts           preset id → CSS class name
        │
        ▼
src/ui/scene/SceneBackdrop.tsx                                   ← view only
  useSceneImage.ts     preload, error handling, stale-load protection
  usePrefersReducedMotion.ts
        │
        ▼
GameScreen (narration, choices, countdown, save controls) — never affected
```

Three rules keep this safe:

1. **Presentation is derived, never stored in story data.** `SceneDefinition`
   still carries only `backgroundAssetId`; camera, focus, overlay and transitions
   live in `src/presentation/`.
2. **Presentation cannot change gameplay.** It is read-only: no choice, no
   transition, no engine call. Tests assert that camera motion and fades leave
   engine state untouched.
3. **One source of truth per fact.** Scene ids come from `CHAPTER1_SCENE`, asset
   ids from `SCENE_ASSETS`, gradients from `fallbacks.ts`, class names from
   `presets.ts`. Nothing else builds an image URL.

---

## 2. Where things live

| What | File |
| --- | --- |
| Scene presentation metadata and overrides | `src/presentation/scenePresentation.ts` |
| asset id → file name | `src/presentation/assetManifest.ts` |
| Fallback gradients | `src/presentation/fallbacks.ts` |
| Camera/overlay/transition presets | `src/presentation/presets.ts`, `src/styles/index.css` |
| The renderer | `src/ui/scene/SceneBackdrop.tsx` |
| Image files (when supplied) | `public/assets/scenes/chapter-1/` |
| Naming note for the artist | `public/assets/scenes/chapter-1/README.md` |

---

## 3. Adding artwork

### Step 1 — drop the file in

```
public/assets/scenes/chapter-1/<asset-id>.webp
```

`<asset-id>` is the id the content already uses: `cell-interior`, `corridor`,
`service-corridor`, `office`, `cafeteria`, `door`, `alcove`, `gate`,
`cell-night`, `interrogation-room`, `default`.

### Step 2 — point the manifest at it

Edit `src/presentation/assetManifest.ts`:

```ts
export const SCENE_ASSETS: Readonly<Record<string, string | null>> = {
  'cell-interior': 'cell-interior.webp',   // ← supplied
  office: 'office.webp',                   // ← supplied
  door: null,                              // ← still pending, gradient is used
  // …
};
```

That is the whole integration. No scene file, component, style or engine file
changes; the image fades in over the existing gradient on the next render.

### Step 3 — check it

```bash
npm run assets:check     # manifest shape + every supplied file exists in public/
npm run test             # presentation, renderer and integration suites
npm run verify           # typecheck + lint + tests + production build
```

`npm run assets:check` fails if a file named in the manifest is missing, empty,
external (`https://…`), absolute (`/assets/…`) or traversing (`../`). It passes
while entries are still `null`, listing what is pending.

### Per-scene artwork instead of per-location artwork

Artwork defaults to the scene's location, so one image can serve several scenes
(on purpose). If a single scene needs its own image, add the id to the manifest
and point that scene at it:

```ts
// src/presentation/scenePresentation.ts
{
  sceneId: CHAPTER1_SCENE.strangerArrives,
  assetId: 'stranger-arrives',   // must exist in SCENE_ASSETS
  camera: 'none',
  overlay: 'cold',
  focus: { x: 50, y: 35 },
}
```

Use the canonical scene id from `CHAPTER1_SCENE`, never a typed string: a renamed
scene then fails the build instead of silently losing its presentation.

---

## 4. Image specification

| Property | Recommendation |
| --- | --- |
| Format | **WebP** (quality ≈ 80). Optimised JPEG is fine. PNG only for genuine transparency. |
| Aspect ratio | Portrait **9:16** (e.g. 1080 × 1920). Design for a centre-safe crop. |
| Dimensions | 1080 × 1920 for phones; a 1440 × 2560 master downscaled is also fine. |
| File size | ≤ 300 KB per image; total Chapter 1 budget ≈ 3–5 MB. |
| Colour | Dark, low-contrast backgrounds read best under the text scrim. |
| Compression | `cwebp -q 80 -m 6 in.png -o out.webp`; keep a full-resolution master outside the repo. |

There is no target DPI: the browser paints CSS pixels, and the image is
`background-size: cover`-cropped.

### Focal points

The image is cover-cropped (never stretched), so on narrow screens the sides are
trimmed and on wide screens the top/bottom are. `focus: { x, y }` (percentages)
chooses what survives the crop.

- Default is centred (`50, 50`).
- Subject on the left third → `focus: { x: 32, y: 50 }`.
- Keep story-critical objects away from the outer 15% — that band is what gets
  cropped first on a phone.
- Test at 390 × 844 (mobile) and 1280 × 800 (desktop); the same file serves both.

---

## 5. What the renderer guarantees

- **No stretching, no letterboxing.** `background-size: cover` plus focal
  positioning; the layer fills the scene viewport at any size.
- **Never a blank screen.** The scene's gradient is painted first and stays under
  the artwork. Missing, pending or broken images simply never replace it.
- **No broken-image icons.** Images are preloaded; the `<img>` element is never
  rendered, and a failed request only logs one development warning.
- **No stale scene.** Layers are keyed by scene id and a late load from a scene the
  player already left is discarded (`useSceneImage` matches results to the URL).
- **No blocked input.** Loading never gates choices; the backdrop is
  `aria-hidden`, `pointer-events: none` and sits behind the UI.
- **Legible text.** A vertical scrim plus the selected overlay (`vignette`,
  `haze`, `cold`) keep narration and choices readable over bright artwork.
- **Subtle motion only.** `slow-zoom-in`, `slow-zoom-out`, `pan-left`, `pan-right`
  animate the artwork layer only (8% scale / ±1.6% pan over 24–30 s). Buttons and
  text never move, and no layout geometry is affected.
- **Reduced motion.** With `prefers-reduced-motion: reduce` the camera preset is
  dropped entirely and fades become a cut — in both the hook and the stylesheet.

---

## 6. Adding a new preset

1. Add the id to the union in `src/presentation/types.ts`.
2. Add it to the `…_PRESETS` list (used by validation).
3. Map it to a class in `src/presentation/presets.ts`.
4. Add the class + keyframes in `src/styles/index.css`.

Validation rejects unknown preset ids, so a typo in scene metadata fails
`npm run test` rather than silently rendering nothing.

---

## 7. Limitations

- Artwork does not exist yet: all scenes use gradients, and `data-image-status`
  stays `idle`.
- One image per asset id; no art-direction variants per breakpoint (the focal
  point plus cover crop is the only adaptation).
- No parallax between foreground and background, no video, no audio.
- Transitions are a short fade (or cut); no scene-to-scene dissolve of two
  different images, because keeping the previous image on screen would violate
  "never show a stale scene".
- `npm run assets:check` verifies existence and shape, not visual quality: final
  art still needs a human look at 390 × 844 and 1280 × 800.
