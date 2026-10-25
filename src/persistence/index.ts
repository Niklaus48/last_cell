/**
 * Persistence layer entry point.
 *
 * Kept separate from `src/story/**` on purpose: the story engine must stay free
 * of browser APIs, and storage must stay free of story rules.
 */
export {
  SAVE_STORAGE_KEY,
  createLocalStorageSaveStorage,
  type SaveStorage,
} from './storage';
export {
  SAVE_FORMAT,
  SAVE_FORMAT_VERSION,
  classifyStorageError,
  clearSave,
  inspectSave,
  loadSession,
  saveSession,
  type LoadOptions,
  type LoadResult,
  type PersistenceFailure,
  type SaveAvailability,
  type SaveEnvelope,
  type SaveErrorCode,
  type SaveOptions,
  type SaveResult,
} from './saveGame';
export { rebuildCheckpoints } from './replay';
