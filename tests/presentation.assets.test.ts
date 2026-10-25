/**
 * Artwork check. Also runs standalone: `npm run assets:check`.
 *
 * Verifies the manifest is well formed and that every asset marked as supplied
 * actually exists under `public/`. While final artwork is pending this passes —
 * entries are `null`, which is a valid state, not an error.
 */
import { existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { chapter1Story } from '../src/story/content/chapter1';
import {
  SCENE_ASSETS,
  SCENE_ASSET_DIRECTORY,
  pendingAssetIds,
  suppliedAssetIds,
  validateAssetManifest,
} from '../src/presentation';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = resolve(repoRoot, 'public');

describe('artwork manifest', () => {
  it('has no malformed entries, duplicate ids or external paths', () => {
    expect(validateAssetManifest(SCENE_ASSETS)).toEqual([]);
  });

  it('covers every asset id the canonical content asks for', () => {
    for (const scene of chapter1Story.scenes) {
      if (scene.backgroundAssetId !== undefined) {
        expect(
          Object.prototype.hasOwnProperty.call(SCENE_ASSETS, scene.backgroundAssetId),
          `${scene.id} → ${scene.backgroundAssetId}`,
        ).toBe(true);
      }
    }
  });

  it('every supplied file exists in public/ and is not empty', () => {
    const missing: string[] = [];
    for (const assetId of suppliedAssetIds()) {
      const file = SCENE_ASSETS[assetId];
      if (typeof file !== 'string') {
        continue;
      }
      const absolute = resolve(publicDir, `.${SCENE_ASSET_DIRECTORY}${file}`);
      if (!existsSync(absolute) || statSync(absolute).size === 0) {
        missing.push(`${assetId} → public${SCENE_ASSET_DIRECTORY}${file}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('reports which artwork is still pending, without failing', () => {
    const pending = pendingAssetIds();
    expect(Array.isArray(pending)).toBe(true);
    // Visible in the test output so the next contributor sees the exact list.
    console.info(`[assets] pending artwork (${pending.length}): ${pending.join(', ')}`);
  });
});
