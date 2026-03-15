/**
 * Storage module — web-standard localStorage wrapper.
 * Provides settings persistence for the web app.
 */

const KEYS = {
  translationProvider: 'reader-provider',
  openaiApiKey: 'reader-api-key',
  openaiModel: 'reader-model',
};

export const DEFAULT_MODEL = 'gpt-4o-mini';

const DEFAULTS = {
  translationProvider: 'chatgpt',
  openaiApiKey: '',
  openaiModel: DEFAULT_MODEL,
};

let _cache = null;

function getStorage() {
  return window.localStorage;
}

export function loadSettings() {
  const storage = getStorage();
  const settings = {};
  for (const [key, storageKey] of Object.entries(KEYS)) {
    const val = storage.getItem(storageKey);
    settings[key] = val !== null ? val : DEFAULTS[key];
  }
  _cache = { ...settings };
  return settings;
}

export function saveSettings(obj) {
  const storage = getStorage();
  for (const [key, storageKey] of Object.entries(KEYS)) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      storage.setItem(storageKey, obj[key]);
      if (_cache) _cache[key] = obj[key];
    }
  }
}

export function getSettings() {
  if (!_cache) return loadSettings();
  return { ..._cache };
}
