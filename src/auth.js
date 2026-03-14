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
  localStorage.setItem('auth-mode', 'guest');
}

restoreSession();

function notify() {
  const snapshot = { ..._state };
  _listeners.forEach(cb => cb(snapshot));
}

export function getAuthState() {
  return { ..._state };
}

export function isLoggedIn() {
  return _state.mode === 'account' && _state.user !== null;
}

export function enterGuestMode() {
  _state = { mode: 'guest', user: null };
  localStorage.setItem('auth-mode', 'guest');
  localStorage.removeItem('auth-user');
  notify();
}

export function loginSuccess(user) {
  _state = {
    mode: 'account',
    user: { uid: user.uid, email: user.email, displayName: user.displayName || '' },
  };
  localStorage.setItem('auth-mode', 'account');
  localStorage.setItem('auth-user', JSON.stringify(_state.user));
  notify();
}

export function logout() {
  _state = { mode: 'guest', user: null };
  localStorage.setItem('auth-mode', 'guest');
  localStorage.removeItem('auth-user');
  notify();
}

export function onAuthChange(cb) {
  _listeners.push(cb);
}

export function offAuthChange(cb) {
  const idx = _listeners.indexOf(cb);
  if (idx >= 0) _listeners.splice(idx, 1);
}
