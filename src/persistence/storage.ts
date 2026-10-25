/**
 * Browser storage adapter for local saves.
 *
 * This module is the only place in the app that knows where saves live. It
 * exposes the smallest possible surface (read/write/clear on strings) so the
 * save layer above it can be unit-tested with a fake, and so the story engine
 * never learns that a browser exists.
 */

/** Stable, namespaced key: one save slot per origin, versioned by name. */
export const SAVE_STORAGE_KEY = 'last-cell.save.v1';

export interface SaveStorage {
  /** Raw value, or `null` when nothing is stored. May throw if storage fails. */
  read(): string | null;
  /** Persists the raw value. May throw (quota, disabled storage, private mode). */
  write(value: string): void;
  clear(): void;
}

function probe(storage: Storage): boolean {
  const key = `${SAVE_STORAGE_KEY}.probe`;
  storage.setItem(key, '1');
  storage.removeItem(key);
  return true;
}

/**
 * `localStorage`-backed storage, or `null` when the browser refuses it.
 *
 * Access can throw (Safari private mode, disabled cookies/site data, sandboxed
 * iframes), and a storage that cannot be written to is useless to us, so the
 * adapter is probed once on creation instead of failing later mid-save.
 */
export function createLocalStorageSaveStorage(
  storageKey: string = SAVE_STORAGE_KEY,
): SaveStorage | null {
  try {
    if (typeof globalThis.localStorage === 'undefined') {
      return null;
    }
    const storage = globalThis.localStorage;
    probe(storage);
    return {
      read: () => storage.getItem(storageKey),
      write: (value: string) => storage.setItem(storageKey, value),
      clear: () => storage.removeItem(storageKey),
    };
  } catch {
    return null;
  }
}
