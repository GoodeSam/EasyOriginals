/**
 * TDD Tests for auth module — manages guest vs account mode.
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';

let auth;

beforeEach(async () => {
  localStorage.clear();
  // Re-import fresh module each time
  vi.resetModules();
  auth = await import('../src/auth.js');
});

describe('auth state', () => {
  test('initial mode is guest when no saved session', () => {
    const state = auth.getAuthState();
    expect(state.mode).toBe('guest');
    expect(state.user).toBeNull();
  });

  test('getAuthState returns mode and user fields', () => {
    const state = auth.getAuthState();
    expect(state).toHaveProperty('mode');
    expect(state).toHaveProperty('user');
  });

  test('isLoggedIn returns false in guest mode', () => {
    expect(auth.isLoggedIn()).toBe(false);
  });
});

describe('guest mode', () => {
  test('enterGuestMode sets mode to guest', () => {
    auth.enterGuestMode();
    expect(auth.getAuthState().mode).toBe('guest');
  });

  test('enterGuestMode clears any saved user', () => {
    // Simulate a prior session
    localStorage.setItem('auth-user', JSON.stringify({ uid: '123', email: 'a@b.com' }));
    localStorage.setItem('auth-mode', 'account');
    auth.enterGuestMode();
    expect(auth.getAuthState().user).toBeNull();
    expect(localStorage.getItem('auth-mode')).toBe('guest');
  });
});

describe('account mode', () => {
  test('loginSuccess sets mode to account with user info', () => {
    const user = { uid: 'u1', email: 'test@example.com', displayName: 'Test' };
    auth.loginSuccess(user);
    const state = auth.getAuthState();
    expect(state.mode).toBe('account');
    expect(state.user.uid).toBe('u1');
    expect(state.user.email).toBe('test@example.com');
  });

  test('isLoggedIn returns true after loginSuccess', () => {
    auth.loginSuccess({ uid: 'u1', email: 'test@example.com' });
    expect(auth.isLoggedIn()).toBe(true);
  });

  test('loginSuccess persists session to localStorage', () => {
    auth.loginSuccess({ uid: 'u1', email: 'test@example.com' });
    expect(localStorage.getItem('auth-mode')).toBe('account');
    const saved = JSON.parse(localStorage.getItem('auth-user'));
    expect(saved.uid).toBe('u1');
  });

  test('logout switches back to guest mode', () => {
    auth.loginSuccess({ uid: 'u1', email: 'test@example.com' });
    auth.logout();
    expect(auth.getAuthState().mode).toBe('guest');
    expect(auth.getAuthState().user).toBeNull();
    expect(auth.isLoggedIn()).toBe(false);
  });

  test('logout clears persisted session', () => {
    auth.loginSuccess({ uid: 'u1', email: 'test@example.com' });
    auth.logout();
    expect(localStorage.getItem('auth-user')).toBeNull();
    expect(localStorage.getItem('auth-mode')).toBe('guest');
  });
});

describe('session restore', () => {
  test('restores account mode from localStorage on init', async () => {
    localStorage.setItem('auth-mode', 'account');
    localStorage.setItem('auth-user', JSON.stringify({ uid: 'u1', email: 'a@b.com' }));
    vi.resetModules();
    const freshAuth = await import('../src/auth.js');
    const state = freshAuth.getAuthState();
    expect(state.mode).toBe('account');
    expect(state.user.uid).toBe('u1');
  });

  test('defaults to guest if localStorage is empty', async () => {
    localStorage.clear();
    vi.resetModules();
    const freshAuth = await import('../src/auth.js');
    expect(freshAuth.getAuthState().mode).toBe('guest');
  });

  test('defaults to guest if saved user JSON is corrupted', async () => {
    localStorage.setItem('auth-mode', 'account');
    localStorage.setItem('auth-user', '{invalid');
    vi.resetModules();
    const freshAuth = await import('../src/auth.js');
    expect(freshAuth.getAuthState().mode).toBe('guest');
  });
});

describe('auth event callbacks', () => {
  test('onAuthChange callback fires on login', () => {
    const cb = vi.fn();
    auth.onAuthChange(cb);
    auth.loginSuccess({ uid: 'u1', email: 'test@example.com' });
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ mode: 'account' }));
  });

  test('onAuthChange callback fires on logout', () => {
    const cb = vi.fn();
    auth.loginSuccess({ uid: 'u1', email: 'test@example.com' });
    auth.onAuthChange(cb);
    auth.logout();
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ mode: 'guest' }));
  });

  test('offAuthChange removes callback', () => {
    const cb = vi.fn();
    auth.onAuthChange(cb);
    auth.offAuthChange(cb);
    auth.loginSuccess({ uid: 'u1', email: 'test@example.com' });
    expect(cb).not.toHaveBeenCalled();
  });
});
