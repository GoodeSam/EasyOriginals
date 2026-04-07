/**
 * Checkpoint manager for resumable translation and audio operations.
 *
 * Saves per-paragraph progress to localStorage so interrupted operations
 * can resume from where they stopped. Keyed by fileName + operationType.
 */

const PREFIX = 'eo-ckpt:';
export const RESUME_OVERLAP = 3;
const CHECKPOINT_SAVE_INTERVAL = 10;

/**
 * Build a deterministic checkpoint key including a content fingerprint.
 * @param {string} fileName - The source document name.
 * @param {string} opType - Operation type.
 * @param {string} [fingerprint] - Content fingerprint to prevent collisions.
 * @returns {string} localStorage key.
 */
export function makeCheckpointKey(fileName, opType, fingerprint) {
  const base = PREFIX + fileName + ':' + opType;
  return fingerprint ? base + ':' + fingerprint : base;
}

/**
 * Generate a short fingerprint from paragraphs to identify content.
 * @param {Array} paragraphs - Source paragraph objects.
 * @returns {string} Short hash string.
 */
export function contentFingerprint(paragraphs) {
  let sample = '';
  for (const p of paragraphs) {
    if (p.type === 'image') continue;
    sample += p.sentences.join(' ');
    if (sample.length >= 200) break;
  }
  let hash = 0;
  for (let i = 0; i < sample.length; i++) {
    hash = ((hash << 5) - hash + sample.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

/**
 * Save translation progress to localStorage.
 * @param {string} fileName
 * @param {string} opType
 * @param {object} data - { completedIndex, translatedParagraphs, totalParagraphs }
 */
export function saveTranslationCheckpoint(fileName, opType, data) {
  // Only persist every N paragraphs to avoid O(n²) serialization on large books
  if (data.completedIndex % CHECKPOINT_SAVE_INTERVAL !== 0 && data.completedIndex < data.totalParagraphs) return;
  try {
    const key = makeCheckpointKey(fileName, opType, data.fingerprint);
    localStorage.setItem(key, JSON.stringify({
      completedIndex: data.completedIndex,
      translatedParagraphs: data.translatedParagraphs,
      totalParagraphs: data.totalParagraphs,
      fingerprint: data.fingerprint,
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
export function loadTranslationCheckpoint(fileName, opType, fingerprint) {
  try {
    const key = makeCheckpointKey(fileName, opType, fingerprint);
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
 */
export function clearTranslationCheckpoint(fileName, opType, fingerprint) {
  try {
    const key = makeCheckpointKey(fileName, opType, fingerprint);
    localStorage.removeItem(key);
  } catch (e) {
    console.warn('Checkpoint clear failed:', e);
  }
}

/**
 * Check if a checkpoint exists without loading full data.
 */
export function getCheckpointInfo(fileName, opType, fingerprint) {
  try {
    const key = makeCheckpointKey(fileName, opType, fingerprint);
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
