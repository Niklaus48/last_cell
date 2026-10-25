/**
 * THE art manifest: the one place where an asset id becomes a public file path.
 *
 * Nothing else in the app builds a URL for scene artwork. When the final
 * illustrations exist, drop the files into `public/assets/scenes/chapter-1/` and
 * change the value for that id from `null` to the file name. No component, scene
 * or engine file needs to change.
 *
 * Values are file *names* inside `SCENE_ASSET_DIRECTORY`, not URLs, so the base
 * path and the naming rule stay in one place.
 */

export const SCENE_ASSET_DIRECTORY = '/assets/scenes/chapter-1/';

/** File names allowed in the manifest (kept deliberately narrow). */
export const ASSET_FILE_PATTERN = /^[a-z0-9][a-z0-9-]*\.(webp|jpg|jpeg|png)$/;

/**
 * asset id → file name, or `null` while that artwork does not exist yet.
 *
 * Ids are the locations Chapter 1 already declares (`backgroundAssetId`) plus a
 * neutral `default`. Artwork may be shared between scenes on purpose: every
 * scene in the cell uses `cell-interior` unless the presentation overrides it.
 *
 * PHASE 5 STATUS: no final artwork has been supplied, so every value is `null`
 * and the game renders its fallback gradients. This is expected, not a bug.
 */
export const SCENE_ASSETS: Readonly<Record<string, string | null>> = {
  'cell-interior': null,
  'cell-night': null,
  corridor: null,
  'service-corridor': null,
  office: null,
  cafeteria: null,
  door: null,
  alcove: null,
  gate: null,
  'interrogation-room': null,
  default: null,
};

const warned = new Set<string>();

function warnOnce(message: string): void {
  if (warned.has(message)) {
    return;
  }
  warned.add(message);
  // Development diagnostics only; never a player-facing error.
  if (import.meta.env.DEV) {
    console.warn(`[presentation] ${message}`);
  }
}

export function hasAssetEntry(assetId: string): boolean {
  return Object.prototype.hasOwnProperty.call(SCENE_ASSETS, assetId);
}

/**
 * Public URL for an asset id, or `null` when the artwork is not available yet.
 *
 * An unknown id is a content/typo problem: it is reported once in development
 * and then treated exactly like a missing file, so the game keeps working.
 */
export function resolveAssetUrl(assetId: string): string | null {
  if (!hasAssetEntry(assetId)) {
    warnOnce(`unknown asset id "${assetId}" — falling back to the scene gradient.`);
    return null;
  }
  const file = SCENE_ASSETS[assetId];
  if (file === null || file === undefined || file === '') {
    return null;
  }
  return `${SCENE_ASSET_DIRECTORY}${file}`;
}

/** Asset ids that exist in the manifest but have no file yet. */
export function pendingAssetIds(): readonly string[] {
  return Object.keys(SCENE_ASSETS).filter((id) => SCENE_ASSETS[id] === null);
}

/** Asset ids that already point at a file. */
export function suppliedAssetIds(): readonly string[] {
  return Object.keys(SCENE_ASSETS).filter((id) => {
    const file = SCENE_ASSETS[id];
    return typeof file === 'string' && file.length > 0;
  });
}

export interface AssetManifestIssue {
  readonly id: string;
  readonly message: string;
}

/**
 * Structural validation of the manifest. Returns every problem it finds so a
 * future contributor gets one complete list instead of one error at a time.
 */
export function validateAssetManifest(
  manifest: Readonly<Record<string, string | null>> = SCENE_ASSETS,
): readonly AssetManifestIssue[] {
  const issues: AssetManifestIssue[] = [];
  const seenFiles = new Map<string, string>();

  for (const [id, file] of Object.entries(manifest)) {
    if (id.trim().length === 0) {
      issues.push({ id, message: 'asset id must not be empty' });
      continue;
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) {
      issues.push({ id, message: 'asset id must be kebab-case (a-z, 0-9, hyphen)' });
    }
    if (file === null) {
      // Legitimately pending: no final artwork yet.
      continue;
    }
    if (typeof file !== 'string' || file.trim().length === 0) {
      issues.push({ id, message: 'file must be null (not supplied yet) or a file name' });
      continue;
    }
    if (file.startsWith('/') || file.startsWith('.') || file.includes('..')) {
      issues.push({ id, message: `file "${file}" must be a bare name inside ${SCENE_ASSET_DIRECTORY}` });
      continue;
    }
    if (/^[a-z]+:/i.test(file) || file.startsWith('//')) {
      issues.push({ id, message: `file "${file}" must not be an external or data URL` });
      continue;
    }
    if (!ASSET_FILE_PATTERN.test(file)) {
      issues.push({ id, message: `file "${file}" must match ${ASSET_FILE_PATTERN.source}` });
      continue;
    }
    const existing = seenFiles.get(file);
    if (existing !== undefined) {
      // Allowed (artwork may be reused) but worth surfacing: two ids, one file.
      issues.push({ id, message: `file "${file}" is already used by "${existing}"` });
      continue;
    }
    seenFiles.set(file, id);
  }

  return issues;
}

/** Reset the warn-once bookkeeping (tests only). */
export function resetAssetWarnings(): void {
  warned.clear();
}
