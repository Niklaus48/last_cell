/**
 * THE audio manifest: the one place where an audio asset id becomes a URL.
 *
 * Same contract as the artwork manifest: values are file *names* inside
 * `AUDIO_ASSET_DIRECTORY`, never URLs, so the base path and the naming rule live
 * in one file. The studio can add or override entries through the content pack.
 *
 * PHASE 7 STATUS: no audio has been supplied, so every value is `null` and the
 * game is silent. Silence is a supported state, not an error.
 */
import { getPackAudioAssets } from '../story/content/pack';

export const AUDIO_ASSET_DIRECTORY = '/assets/audio/chapter-1/';

/** Extensions accepted for audio entries. */
export const AUDIO_FILE_PATTERN = /^[a-z0-9][a-z0-9-]*\.(mp3|ogg|wav|m4a|opus)$/;

/**
 * Asset id → file name, or `null` while the sound does not exist yet.
 *
 * `narrator-*` ids are narrator voice-over tracks; the rest are sound effects.
 * Both are just audio files as far as the player is concerned.
 */
export const AUDIO_ASSETS: Readonly<Record<string, string | null>> = {
  // Narrator voice-over, one per scene that has a voice track.
  'narrator-cell-dawn': null,
  'narrator-stranger': null,
  'narrator-corridor': null,
  // Sound effects.
  'sfx-bar-rattle': null,
  'sfx-door-metal': null,
  'sfx-footsteps-distant': null,
  'sfx-whisper': null,
  'sfx-alarm': null,
};

function packEntry(assetId: string): string | null | undefined {
  const overrides = getPackAudioAssets();
  if (!Object.prototype.hasOwnProperty.call(overrides, assetId)) {
    return undefined;
  }
  return overrides[assetId] ?? null;
}

/** Every audio id known to the game (built-in manifest + studio pack). */
export function knownAudioIds(): readonly string[] {
  return [...new Set([...Object.keys(AUDIO_ASSETS), ...Object.keys(getPackAudioAssets())])];
}

function resolvedFile(assetId: string): string | null {
  const fromPack = packEntry(assetId);
  if (fromPack !== undefined) {
    return fromPack;
  }
  return AUDIO_ASSETS[assetId] ?? null;
}

const warned = new Set<string>();

/**
 * Resolves an audio id to a playable URL, or `null` when the sound is pending,
 * unknown or deliberately silent. Never throws: a missing sound is not an error.
 */
export function resolveAudioUrl(assetId: string): string | null {
  if (!knownAudioIds().includes(assetId)) {
    if (!warned.has(assetId)) {
      warned.add(assetId);
      if (import.meta.env.DEV) {
        console.warn(`[audio] unknown audio id "${assetId}" — staying silent.`);
      }
    }
    return null;
  }
  const file = resolvedFile(assetId);
  if (file === null || file === '') {
    return null;
  }
  return `${AUDIO_ASSET_DIRECTORY}${file}`;
}

/** Audio ids declared in the manifest but still without a file. */
export function pendingAudioIds(): readonly string[] {
  return knownAudioIds().filter((id) => resolvedFile(id) === null);
}

/** Audio ids that already point at a file. */
export function suppliedAudioIds(): readonly string[] {
  return knownAudioIds().filter((id) => typeof resolvedFile(id) === 'string' && resolvedFile(id) !== null);
}

/** Test hook: lets a test assert the warn-once behaviour. */
export function resetAudioWarnings(): void {
  warned.clear();
}
