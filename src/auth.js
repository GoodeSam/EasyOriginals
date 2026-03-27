/**
 * Auth module — manages guest vs account mode.
 * Persists auth state to localStorage for session restore.
 */

let _state = { mode: 'guest', user: null };
const _listeners = [];

// Restore session from localStorage on module load
function restoreSession() {
  try {
    const mode = localStorage.getItem('auth-mode');
    if (mode === 'account') {
      const raw = localStorage.getItem('auth-user');
      const user = JSON.parse(raw);
      if (user && user.uid) {
        _state = { mode: 'account', user };
        return;
      }
    }
  } catch (e) {
    // Corrupted data — fall back to guest
  }
  _state = { mode: 'guest', user: null };
  try { localStorage.setItem('auth-mode', 'guest'); } catch { /* storage unavailable */ }
}

restoreSession();

function notify() {
  const snapshot = { ..._state };
  _listeners.forEach(cb => cb(snapshot));
}

/** Returns a snapshot of current auth state: { mode: 'guest'|'account', user: object|null } */
export function getAuthState() {
  return { ..._state };
}

/** Returns true if the user is logged in with a valid account. */
export function isLoggedIn() {
  return _state.mode === 'account' && _state.user !== null;
}

function safeStorage(fn) {
  try { fn(); } catch (e) { console.warn('localStorage operation failed:', e); }
}

/** Switch to guest mode, clearing any stored account data. */
export function enterGuestMode() {
  _state = { mode: 'guest', user: null };
  safeStorage(() => {
    localStorage.setItem('auth-mode', 'guest');
    localStorage.removeItem('auth-user');
  });
  notify();
}

/** Record a successful login. @param {{ uid: string, email?: string, displayName?: string }} user */
export function loginSuccess(user) {
  if (!user || !user.uid) {
    console.warn('loginSuccess called with invalid user — ignoring');
    return;
  }
  _state = {
    mode: 'account',
    user: { uid: user.uid, email: user.email || '', displayName: user.displayName || '' },
  };
  safeStorage(() => {
    localStorage.setItem('auth-mode', 'account');
    localStorage.setItem('auth-user', JSON.stringify(_state.user));
  });
  notify();
}

/** Log out and revert to guest mode. */
export function logout() {
  _state = { mode: 'guest', user: null };
  safeStorage(() => {
    localStorage.setItem('auth-mode', 'guest');
    localStorage.removeItem('auth-user');
  });
  notify();
}

/** Subscribe to auth state changes. Returns an unsubscribe function. @param {(state: {mode: string, user: object|null}) => void} cb */
export function onAuthChange(cb) {
  _listeners.push(cb);
  return () => offAuthChange(cb);
}

export function offAuthChange(cb) {
  const idx = _listeners.indexOf(cb);
  if (idx >= 0) _listeners.splice(idx, 1);
}
