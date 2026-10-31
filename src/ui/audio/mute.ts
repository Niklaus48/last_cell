/**
 * Sound on/off, remembered across reloads.
 *
 * One key, one boolean, defensive parsing: a corrupted or unavailable store must
 * never break the game, it just means sound stays on.
 */
const MUTE_KEY = 'last-cell.muted.v1';

export function readMuted(): boolean {
  try {
    return globalThis.localStorage?.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeMuted(muted: boolean): void {
  try {
    globalThis.localStorage?.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // Storage refused: the toggle still works for this session.
  }
}
