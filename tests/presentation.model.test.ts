/**
 * Presentation model: resolution, defaults, validation and the asset manifest.
 * Node environment — this layer is pure data and pure functions.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { chapter1Story } from '../src/story/content/chapter1';
import { demoStory } from '../src/story/content';
import {
  CAMERA_PRESETS,
  DEFAULT_PRESENTATION,
  SCENE_ASSETS,
  SCENE_ASSET_DIRECTORY,
  SCENE_PRESENTATION_OVERRIDES,
  getScenePresentation,
  hasAssetEntry,
  pendingAssetIds,
  resetAssetWarnings,
  resolveAssetUrl,
  resolveFallbackGradient,
  suppliedAssetIds,
  validateAssetManifest,
  validateScenePresentation,
  type CameraPreset,
  type ScenePresentationOverride,
} from '../src/presentation';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
}

describe('presentation stays out of the story and the browser', () => {
  const presentationDir = join(repoRoot, 'src/presentation');
  const files = readdirSync(presentationDir).filter((file) => file.endsWith('.ts'));

  it('imports no React, no DOM and no storage', () => {
    for (const file of files) {
      const source = stripComments(readFileSync(join(presentationDir, file), 'utf8'));
      expect(source, file).not.toMatch(/from ['"]react/);
      expect(source, file).not.toMatch(/\bwindow\.|\bdocument\.|localStorage|sessionStorage/);
      expect(source, file).not.toMatch(/from ['"][^'"]*ui\//);
    }
  });

  it('never mutates or drives the engine', () => {
    for (const file of files) {
      const source = stripComments(readFileSync(join(presentationDir, file), 'utf8'));
      // Read-only: no engine commands, no timers, no side effects on the story.
      expect(source, file).not.toMatch(/\btransitionTo\b|\bapplyChoice\b|\bsetTimeout\b|\bsetInterval\b/);
      expect(source, file).not.toMatch(/from ['"][^'"]*app\//);
    }
  });

  it('keeps CSS strings out of scene data (class names only, via presets.ts)', () => {
    const presets = stripComments(readFileSync(join(presentationDir, 'presets.ts'), 'utf8'));
    const overrides = stripComments(readFileSync(join(presentationDir, 'scenePresentation.ts'), 'utf8'));
    // Gradient values are allowed in fallbacks.ts only; metadata carries ids.
    expect(overrides).not.toMatch(/linear-gradient|radial-gradient|background-image|px\b/);
    // A single file owns the preset → class mapping.
    expect(presets).toMatch(/scene-camera--/);
  });
});

describe('presentation covers the canonical story', () => {
  it('every presentation entry references a real Chapter 1 scene', () => {
    const sceneIds = new Set(chapter1Story.scenes.map((scene) => scene.id));
    for (const override of SCENE_PRESENTATION_OVERRIDES) {
      expect(sceneIds.has(override.sceneId), override.sceneId).toBe(true);
    }
  });

  it('the whole configuration is coherent for Chapter 1', () => {
    expect(validateScenePresentation(chapter1Story.scenes)).toEqual([]);
  });

  it('the dev fixture resolves with no override entries of its own', () => {
    // The demo story is a test fixture: it ships no presentation metadata and
    // relies entirely on the location defaults.
    expect(validateScenePresentation(demoStory.scenes, [])).toEqual([]);
    for (const scene of demoStory.scenes) {
      expect(getScenePresentation(scene).fallbackGradientId).not.toBe('default');
    }
  });

  it('resolves a presentation for every canonical scene', () => {
    for (const scene of chapter1Story.scenes) {
      const presentation = getScenePresentation(scene);
      expect(presentation.sceneId).toBe(scene.id);
      expect(CAMERA_PRESETS).toContain(presentation.camera);
      expect(presentation.focus.x).toBeGreaterThanOrEqual(0);
      expect(presentation.focus.x).toBeLessThanOrEqual(100);
      // A scene with artwork always has a gradient to fall back to.
      expect(resolveFallbackGradient(presentation.fallbackGradientId).background.length).toBeGreaterThan(0);
    }
  });

  it('gives scenes with no metadata sensible defaults', () => {
    const presentation = getScenePresentation({ id: 'a-scene-with-no-metadata' });
    expect(presentation.camera).toBe(DEFAULT_PRESENTATION.camera);
    expect(presentation.overlay).toBe(DEFAULT_PRESENTATION.overlay);
    expect(presentation.transition).toBe(DEFAULT_PRESENTATION.transition);
    expect(presentation.focus).toEqual(DEFAULT_PRESENTATION.focus);
    expect(presentation.assetId).toBe('default');
    expect(presentation.fallbackGradientId).toBe('default');
  });

  it('uses the location defaults, and lets a scene override win', () => {
    const cellScene = chapter1Story.scenes.find((scene) => scene.id === 'ch1-cell-dawn');
    const strangerScene = chapter1Story.scenes.find((scene) => scene.id === 'ch1-stranger-arrives');
    if (cellScene === undefined || strangerScene === undefined) {
      throw new Error('fixture content changed');
    }

    expect(getScenePresentation(cellScene).camera).toBe('slow-zoom-in');
    // ch1-stranger-arrives overrides the cell look with a still, cold frame.
    const stranger = getScenePresentation(strangerScene);
    expect(stranger.camera).toBe('none');
    expect(stranger.overlay).toBe('cold');
    expect(stranger.focus).toEqual({ x: 50, y: 35 });
  });

  it('is serialisable data with no functions or class instances', () => {
    const roundTrip: unknown = JSON.parse(JSON.stringify(SCENE_PRESENTATION_OVERRIDES));
    expect(roundTrip).toEqual(SCENE_PRESENTATION_OVERRIDES);

    const walk = (value: unknown, path: string): void => {
      expect(typeof value, path).not.toBe('function');
      if (value === null || typeof value !== 'object') {
        return;
      }
      for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
        walk(child, `${path}.${key}`);
      }
    };
    for (const override of SCENE_PRESENTATION_OVERRIDES) {
      walk(override, override.sceneId);
    }
  });
});

describe('malformed presentation metadata is detected', () => {
  const scenes = chapter1Story.scenes;

  it('catches an override for a scene that does not exist', () => {
    const bad: ScenePresentationOverride[] = [{ sceneId: 'ch1-not-a-scene' }];
    expect(validateScenePresentation(scenes, bad).join(' ')).toMatch(/unknown scene/);
  });

  it('catches duplicate overrides', () => {
    const bad: ScenePresentationOverride[] = [
      { sceneId: 'ch1-cell-dawn', camera: 'none' },
      { sceneId: 'ch1-cell-dawn', camera: 'pan-left' },
    ];
    expect(validateScenePresentation(scenes, bad).join(' ')).toMatch(/duplicate/);
  });

  it('catches invalid presets and out-of-range focal points', () => {
    const bad = [
      { sceneId: 'ch1-cell-dawn', camera: 'wobble' as CameraPreset },
      { sceneId: 'ch1-cell-bars' as string, transition: 'wipe' },
      { sceneId: 'ch1-cell-listen' as string, overlay: 'lasers' },
      { sceneId: 'ch1-note' as string, focus: { x: 140, y: 50 } },
      { sceneId: 'ch1-silence' as string, focus: { x: 50, y: Number.NaN } },
    ] as unknown as ScenePresentationOverride[];

    const problems = validateScenePresentation(scenes, bad).join(' ');
    expect(problems).toMatch(/unknown camera preset/);
    expect(problems).toMatch(/unknown transition preset/);
    expect(problems).toMatch(/unknown overlay preset/);
    expect(problems).toMatch(/focus outside/);
  });

  it('catches an asset id that is not in the manifest', () => {
    const bad: ScenePresentationOverride[] = [
      { sceneId: 'ch1-cell-dawn', assetId: 'cell-interior-typo' },
      { sceneId: 'ch1-note', assetId: '   ' },
    ];
    const problems = validateScenePresentation(scenes, bad).join(' ');
    expect(problems).toMatch(/not in the asset manifest/);
    expect(problems).toMatch(/empty assetId/);
  });
});

describe('asset manifest', () => {
  const realAssets = chapter1Story.scenes.map((scene) => scene.backgroundAssetId);

  it('declares an entry for every asset id the content uses', () => {
    for (const assetId of realAssets) {
      expect(assetId, 'content references an asset id').toBeDefined();
      expect(hasAssetEntry(assetId ?? ''), String(assetId)).toBe(true);
    }
  });

  it('is structurally valid as committed (no artwork supplied yet)', () => {
    expect(validateAssetManifest(SCENE_ASSETS)).toEqual([]);
    expect(suppliedAssetIds()).toEqual([]);
    expect(pendingAssetIds().length).toBe(Object.keys(SCENE_ASSETS).length);
  });

  it('resolves supplied artwork to a project-local path', () => {
    const manifest = { ...SCENE_ASSETS, office: 'office.webp' };
    expect(validateAssetManifest(manifest)).toEqual([]);
    // Same rule the app uses, applied to this hypothetical entry.
    expect(`${SCENE_ASSET_DIRECTORY}${manifest.office}`).toBe('/assets/scenes/chapter-1/office.webp');
  });

  it('rejects external, absolute and traversing paths', () => {
    for (const file of [
      'https://example.com/office.webp',
      '//cdn.example.com/office.webp',
      '/assets/office.webp',
      '../secrets/office.webp',
      'data:image/webp;base64,AAAA',
    ]) {
      const issues = validateAssetManifest({ office: file });
      expect(issues.length, file).toBeGreaterThan(0);
    }
  });

  it('rejects malformed file names and ids', () => {
    expect(validateAssetManifest({ office: 'Office Artwork.webp' }).length).toBeGreaterThan(0);
    expect(validateAssetManifest({ office: 'office.gif' }).length).toBeGreaterThan(0);
    expect(validateAssetManifest({ Office: 'office.webp' }).length).toBeGreaterThan(0);
    expect(validateAssetManifest({ '': 'office.webp' }).length).toBeGreaterThan(0);
  });

  it('flags two ids pointing at the same file', () => {
    const issues = validateAssetManifest({ office: 'same.webp', gate: 'same.webp' });
    expect(issues.map((issue) => issue.message).join(' ')).toMatch(/already used by/);
  });

  it('treats an unknown asset id as "no artwork" and warns only once', () => {
    resetAssetWarnings();
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(resolveAssetUrl('not-a-real-asset')).toBeNull();
    expect(resolveAssetUrl('not-a-real-asset')).toBeNull();

    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]?.[0]).toMatch(/unknown asset id/);
    warn.mockRestore();
    resetAssetWarnings();
  });

  it('returns null (not a broken URL) for a pending asset', () => {
    expect(resolveAssetUrl('cell-interior')).toBeNull();
  });
});
