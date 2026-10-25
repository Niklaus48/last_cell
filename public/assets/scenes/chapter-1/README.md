# Chapter 1 artwork — «شش ماه سکوت»

Put the final scene illustrations in **this folder**. Nothing else needs to change:
the game looks up each scene's artwork in `src/presentation/assetManifest.ts`.

## Naming

```
public/assets/scenes/chapter-1/<asset-id>.webp
```

`<asset-id>` is the id already used by the story content (`backgroundAssetId`):

| asset id | used by |
| --- | --- |
| `cell-interior` | the cell scenes (dawn, bars, listening, stranger, search, note) |
| `corridor` | the first corridor beat |
| `service-corridor` | the cafeteria and service corridor |
| `office` | the warden's office |
| `cafeteria` | the cafeteria |
| `door` | the locked steel door and the guard encounter |
| `alcove` | the old archive room |
| `gate` | the final approach to the yard |
| `default` | neutral fallback, if a scene ever needs one |

Artwork may be **shared on purpose** (several scenes use one image). If a single
scene later needs its own image, add an id here and point that scene at it with
`assetId` in `SCENE_PRESENTATION_OVERRIDES` (`src/presentation/scenePresentation.ts`).

## Recommended images

- **Format:** WebP preferred (quality ~80). Optimised JPEG is fine. PNG only when
  transparency is genuinely needed.
- **Aspect:** portrait 9:16 (e.g. 1080 × 1920) for phones; keep the important
  subject away from the extreme edges so the same file also crops well on desktop.
- **Size:** aim for ≤ 300 KB per image; they are bundled locally and must work
  offline, on mid-range Android WebView.
- **Focal point:** if the subject sits off-centre, set `focus: { x, y }`
  (percentages) for that scene — the image is cover-cropped, never stretched.

## Currently

No final artwork has been supplied yet: every entry in the manifest is `null` and
the game renders its fallback gradients. That is expected — see
`docs/art-assets.md` for the full workflow.
