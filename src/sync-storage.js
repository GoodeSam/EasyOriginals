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

// Coalescing write queue — only the latest value per key is pushed remotely
let _writeQueue = Promise.resolve();
let _pendingWrites = new Map(); // key → value (coalesced)
let _flushScheduled = false;

export function setRemoteProvider(provider) {
  _remoteProvider = provider;
}

export function getRemoteProvider() {
  return _remoteProvider;
}

export function clearRemoteProvider() {
  _remoteProvider = null;
  _pendingWrites.clear();
}

export function getItem(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}

function scheduleFlush() {
  if (_flushScheduled) return;
  _flushScheduled = true;
  _writeQueue = _writeQueue.then(async () => {
    _flushScheduled = false;
    if (!_remoteProvider || _pendingWrites.size === 0) return;
    const batch = new Map(_pendingWrites);
    _pendingWrites.clear();
    for (const [key, value] of batch) {
      try {
        await _remoteProvider.push(key, value);
      } catch (err) {
        console.warn('Sync push failed for', key, err);
        // Re-enqueue failed key for retry (only if not already superseded)
        if (!_pendingWrites.has(key)) {
          _pendingWrites.set(key, value);
        }
      }
    }
    // Schedule another flush if there are failed/new writes pending
    if (_pendingWrites.size > 0) {
      scheduleFlush();
    }
  });
}

function enqueueRemoteWrite(key, value) {
  _pendingWrites.set(key, value); // coalesces: latest value wins
  scheduleFlush();
}

export function setItem(key, value) {
  try { localStorage.setItem(key, value); } catch (e) { console.warn('localStorage.setItem failed:', e); }
  if (_remoteProvider) {
    enqueueRemoteWrite(key, value);
  }
}

/** Sentinel value used to mark keys as deleted in remote storage */
export const DELETED_SENTINEL = '__sync_deleted__';

export function removeItem(key) {
  try { localStorage.removeItem(key); } catch (e) { console.warn('localStorage.removeItem failed:', e); }
  if (_remoteProvider) {
    enqueueRemoteWrite(key, DELETED_SENTINEL);
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
      try {
        if (value === null || value === DELETED_SENTINEL) {
          localStorage.removeItem(key);
        } else if (value !== undefined) {
          // Ensure only strings are stored in localStorage
          const strValue = typeof value === 'string' ? value : JSON.stringify(value);
          localStorage.setItem(key, strValue);
        }
      } catch (e) { console.warn('localStorage operation failed in pullAll:', e); }
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
  try {
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
  } catch (e) { console.warn('localStorage read failed in pushAll:', e); }
  if (_remoteProvider.pushAll) {
    await _remoteProvider.pushAll(data);
  }
}
