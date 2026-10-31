# کارگاه داستان (the story studio)

A development tool for editing the chapter without touching TypeScript: it shows
the decision tree, lets the text, the branches, the pacing, the artwork and the
sound be edited, and writes the result into the game.

```bash
npm run studio        # opens http://localhost:5173/studio.html
npm run dev           # the game, unchanged, at http://localhost:5173/
```

## What "Apply" does

There is exactly one artifact: **`src/story/content/chapter1/studio.pack.json`**
(a *content pack*). It is both the edit surface and the game's input.

- **Apply** (`اعمال در بازی`) sends the draft to a development-only endpoint
  (`POST /__studio/pack`), which writes that file. Vite then reloads the game, so
  the next run uses the new content — no code edit, no copy step.
- **خروجی JSON** downloads the same pack, for handing it to someone else or
  keeping it outside the repo.
- The pack is JSON in the repository on purpose: versioned, diffable, reviewable
  in a PR, works offline, and needs no database.

Why this shape: the alternative (export a file and ask the author to move it into
place) makes every edit a manual two-step chore, and the alternative of keeping
the story only in the browser loses it on a cache clear. A committed JSON file is
the version that still works when the tool is not running.

## Safety

The pack is untrusted input.

- `validateContentPack` checks every field and hands the story to the engine's
  own `validateStory`. The studio shows the errors and **disables Apply** while
  any of them is outstanding; nothing is ever half-applied.
- On load, a missing, empty or invalid pack makes the game fall back to the
  canonical TypeScript content, so a bad edit can never brick the game.
- Asset file names are validated (no URLs, no absolute paths, no traversal) and
  uploads are written only inside `public/assets/scenes/chapter-1/` and
  `public/assets/audio/chapter-1/`, with sanitised names.
- The studio page and its write API exist only in dev: `studio.html` is not a
  build entry point, and the plugin in `vite-studio-plugin.ts` is declared with
  `apply: 'serve'`.

## What can be edited

## Importing

**ورود از JSON** in the header, or dropping a `.json` file anywhere on the page,
loads a pack into the draft. Import is *not* save: the file is validated (the same
validator as Apply), the draft is replaced, and nothing touches the disk until
Apply is pressed. A file that fails — bad JSON, unknown scene target, invalid file
name — is refused whole, with every error listed, and the current draft is left
exactly as it was.

Typical uses: pulling in a pack a colleague exported, restoring a backup, or
hand-writing a small pack (just pacing and sound, `"story": null`) and previewing
it before it becomes the game's content.

| Area | Where in the pack | Notes |
| --- | --- | --- |
| Scene text | `story.scenes[].narration`, `.title` | paragraphs can be added, removed, reordered |
| Branching | `story.scenes[].choices[].outcome` | retarget any choice to any scene, ending or failure |
| Timed decisions | `story.scenes[].timedDecision` | duration + which choice a timeout picks |
| Reading pace | `flow.readingPauseMs[sceneId]` | overrides the paragraph-scaled default for one scene |
| Artwork | `presentation.assets` + `presentation.overrides[].assetId` | one image per scene; camera/overlay/transition/focus too |
| Narrator voice | `audio.scenes[sceneId].voice` | one track per scene, plays with the scene |
| Sound effects | `audio.scenes[sceneId].sfx[]` | `{ assetId, atMs, volume }`, timed from the scene appearing |

Audio ids are declared in `audio.assets` (id → file name). The studio declares an
id as soon as you name it — a sound without a file is *pending*, and the scene is
simply silent, not invalid. `src/audio/audioManifest.ts` turns an id into a URL.

Sound never affects progression: a missing file, a decode error or a blocked
autoplay policy just means silence.

## Files

```
studio.html                                   the studio page (dev only)
vite-studio-plugin.ts                         POST /__studio/pack, /__studio/upload (dev only)
src/studio/model.ts                           the draft: edits, tree layout
src/studio/StudioApp.tsx                      the page: list, graph, editor, Apply
src/studio/StoryTreeView.tsx                  the decision tree
src/studio/SceneEditor.tsx                    one scene's inspector
src/story/content/pack/types.ts               the pack schema
src/story/content/pack/validate.ts            the validator
src/story/content/pack/index.ts               what the game reads
src/story/content/chapter1/studio.pack.json   the applied content
src/audio/audioManifest.ts                    audio id → file
src/ui/audio/useSceneAudio.ts                 voice + timed cues
```
