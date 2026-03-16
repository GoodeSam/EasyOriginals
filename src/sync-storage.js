/**
 * Sync storage module — unified storage layer.
 * Guest mode: localStorage only.
 * Account mode: localStorage + remote sync via pluggable provider.
 *
 * Remote provider interface:
 *   push(key, value)    — save one key to remote (value=DELETED_SENTINEL means delete)
 *   pull()              — returns object with all remote key/value pairs
 *   pushAll(data)       — save all keys to remote at once
 */

export const SYNC_KEYS = [
  'reader-font-size',
  'reader-content-width',
  'reader-theme',
  'reader-notes',
  'reader-wordlist',
  'reader-history',
  'reader-provider',
  'reader-model',
];

let _remoteProvider = null;

export function setRemoteProvider(provider) {
  _remoteProvider = provider;
}

export function getRemoteProvider() {
  return _remoteProvider;
}

export function clearRemoteProvider() {
  _remoteProvider = null;
}

export function getItem(key) {
  return localStorage.getItem(key);
}

export function setItem(key, value) {
  localStorage.setItem(key, value);
  if (_remoteProvider) {
    _remoteProvider.push(key, value).catch(err => {
      console.warn('Sync push failed for', key, err);
    });
  }
}

/** Sentinel value used to mark keys as deleted in remote storage */
export const DELETED_SENTINEL = '__sync_deleted__';

export function removeItem(key) {
  localStorage.removeItem(key);
  if (_remoteProvider) {
    _remoteProvider.push(key, DELETED_SENTINEL).catch(err => {
      console.warn('Sync remove failed for', key, err);
    });
  }
}

/**
 * Pull all data from remote and merge into localStorage.
 * Returns the merged data object.
 */
function isAllowedKey(key) {
  return SYNC_KEYS.includes(key) || (typeof key === 'string' && key.startsWith('reader-bookmark-'));
}

export async function pullAll() {
  if (!_remoteProvider) return {};
  const remoteData = await _remoteProvider.pull();
  if (remoteData) {
    for (const [key, value] of Object.entries(remoteData)) {
      if (!isAllowedKey(key)) continue;
      if (value === null || value === DELETED_SENTINEL) {
        localStorage.removeItem(key);
      } else if (value !== undefined) {
        // Ensure only strings are stored in localStorage
        const strValue = typeof value === 'string' ? value : JSON.stringify(value);
        localStorage.setItem(key, strValue);
      }
    }
  }
  return remoteData || {};
}

/**
 * Push all syncable local data to remote.
 */
export async function pushAll() {
  if (!_remoteProvider) return;
  const data = {};
  for (const key of SYNC_KEYS) {
    const val = localStorage.getItem(key);
    if (val !== null) data[key] = val;
  }
  // Also include bookmark keys
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('reader-bookmark-')) {
      data[key] = localStorage.getItem(key);
    }
  }
  if (_remoteProvider.pushAll) {
    await _remoteProvider.pushAll(data);
  }
}
