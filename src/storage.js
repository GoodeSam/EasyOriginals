/**
 * Storage module — web-standard localStorage wrapper.
 * Provides settings persistence for the web app.
 * Wraps all localStorage access in try/catch for SecurityError/quota safety.
 */

const KEYS = {
  translationProvider: 'reader-provider',
  openaiApiKey: 'reader-api-key',
  openaiModel: 'reader-model',
  edgeTtsVoice: 'reader-edge-tts-voice',
};

// API key uses sessionStorage for reduced exposure — not persisted across sessions
const SESSION_KEYS = new Set(['openaiApiKey']);

export const DEFAULT_MODEL = 'gpt-4o-mini';

const DEFAULTS = {
  translationProvider: 'microsoft',
  openaiApiKey: '',
  openaiModel: DEFAULT_MODEL,
  edgeTtsVoice: 'en-US-AriaNeural',
};

let _cache = null;

/** Safe storage getItem — returns null on error */
function safeGetItem(storageKey, settingKey) {
  try {
    const store = SESSION_KEYS.has(settingKey) ? window.sessionStorage : window.localStorage;
    return store.getItem(storageKey);
  } catch (e) {
    console.warn('Storage read failed for', storageKey, e);
    return null;
  }
}

/** Safe storage setItem — returns false on error */
function safeSetItem(storageKey, value, settingKey) {
  try {
    const store = SESSION_KEYS.has(settingKey) ? window.sessionStorage : window.localStorage;
    store.setItem(storageKey, value);
    return true;
  } catch (e) {
    console.warn('Storage write failed for', storageKey, e);
    return false;
  }
}

export function loadSettings() {
  const settings = {};
  for (const [key, storageKey] of Object.entries(KEYS)) {
    const val = safeGetItem(storageKey, key);
    settings[key] = val !== null ? val : DEFAULTS[key];
  }
  _cache = { ...settings };
  return settings;
}

const VALID_PROVIDERS = ['chatgpt', 'google', 'microsoft', 'offline'];

export function saveSettings(obj) {
  if (obj.translationProvider && !VALID_PROVIDERS.includes(obj.translationProvider)) {
    throw new Error('Invalid translation provider: ' + obj.translationProvider);
  }
  let allSaved = true;
  for (const [key, storageKey] of Object.entries(KEYS)) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      if (!safeSetItem(storageKey, obj[key], key)) allSaved = false;
      if (_cache) _cache[key] = obj[key];
    }
  }
  return allSaved;
}

export function getSettings() {
  if (!_cache) return loadSettings();
  return { ..._cache };
}
