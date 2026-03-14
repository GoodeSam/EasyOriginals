/**
 * Test setup: Override Node.js built-in localStorage with Web Storage API.
 * Node 22+ ships a non-standard localStorage that lacks clear/getItem/setItem.
 */

class WebStorage {
  constructor() {
    this._store = new Map();
  }
  getItem(key) {
    return this._store.has(key) ? this._store.get(key) : null;
  }
  setItem(key, value) {
    this._store.set(key, String(value));
  }
  removeItem(key) {
    this._store.delete(key);
  }
  clear() {
    this._store.clear();
  }
  get length() {
    return this._store.size;
  }
  key(index) {
    return [...this._store.keys()][index] ?? null;
  }
}

const webLocalStorage = new WebStorage();

// Override the Node.js built-in localStorage
Object.defineProperty(globalThis, 'localStorage', {
  value: webLocalStorage,
  writable: true,
  configurable: true,
});
