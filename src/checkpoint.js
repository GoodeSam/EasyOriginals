/**
 * Checkpoint manager for resumable translation and audio operations.
 *
 * Saves per-paragraph progress to localStorage so interrupted operations
 * can resume from where they stopped. Keyed by fileName + operationType.
 */

const PREFIX = 'eo-ckpt:';
export const RESUME_OVERLAP = 3;

/**
 * Build a deterministic checkpoint key.
 * @param {string} fileName - The source document name.
 * @param {string} opType - Operation type: 'translate', 'ollama-translate', 'audio', 'translated-audio'.
 * @returns {string} localStorage key.
 */
export function makeCheckpointKey(fileName, opType) {
  return PREFIX + fileName + ':' + opType;
}

/**
 * Save translation progress to localStorage.
 * @param {string} fileName
 * @param {string} opType
 * @param {object} data - { completedIndex, translatedParagraphs, totalParagraphs }
 */
export function saveTranslationCheckpoint(fileName, opType, data) {
  try {
    const key = makeCheckpointKey(fileName, opType);
    localStorage.setItem(key, JSON.stringify({
      completedIndex: data.completedIndex,
      translatedParagraphs: data.translatedParagraphs,
      totalParagraphs: data.totalParagraphs,
      timestamp: Date.now(),
    }));
  } catch (e) {
    console.warn('Checkpoint save failed:', e);
  }
}

/**
 * Load translation checkpoint from localStorage.
 * @param {string} fileName
 * @param {string} opType
 * @returns {object|null} Saved data or null.
 */
export function loadTranslationCheckpoint(fileName, opType) {
  try {
    const key = makeCheckpointKey(fileName, opType);
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Checkpoint load failed:', e);
    return null;
  }
}

/**
 * Clear a translation checkpoint.
 * @param {string} fileName
 * @param {string} opType
 */
export function clearTranslationCheckpoint(fileName, opType) {
  try {
    const key = makeCheckpointKey(fileName, opType);
    localStorage.removeItem(key);
  } catch (e) {
    console.warn('Checkpoint clear failed:', e);
  }
}

/**
 * Check if a checkpoint exists without loading full data.
 * @param {string} fileName
 * @param {string} opType
 * @returns {{ exists: boolean, completedIndex?: number, totalParagraphs?: number, timestamp?: number }}
 */
export function getCheckpointInfo(fileName, opType) {
  try {
    const key = makeCheckpointKey(fileName, opType);
    const raw = localStorage.getItem(key);
    if (!raw) return { exists: false };
    const data = JSON.parse(raw);
    return {
      exists: true,
      completedIndex: data.completedIndex,
      totalParagraphs: data.totalParagraphs,
      timestamp: data.timestamp,
    };
  } catch (e) {
    return { exists: false };
  }
}
