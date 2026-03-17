/**
 * TDD Tests for auth UI — login screen with guest/Google sign-in modes.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

let indexHtml;

beforeEach(() => {
  indexHtml = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf-8');
});

describe('auth screen in index.html', () => {
  test('has an auth screen element', () => {
    expect(indexHtml).toMatch(/id="authScreen"/);
  });

  test('auth screen has guest mode button', () => {
    expect(indexHtml).toMatch(/id="guestModeBtn"/);
  });

  test('auth screen has Google sign-in button', () => {
    expect(indexHtml).toMatch(/id="googleSignInBtn"/);
  });

  test('auth screen does NOT have email input', () => {
    expect(indexHtml).not.toMatch(/id="authEmail"/);
  });

  test('auth screen does NOT have password input', () => {
    expect(indexHtml).not.toMatch(/id="authPassword"/);
  });

  test('auth screen has error display area', () => {
    expect(indexHtml).toMatch(/id="authError"/);
  });

  test('auth screen is the initial active screen', () => {
    const match = indexHtml.match(/id="authScreen"[^>]*class="[^"]*active[^"]*"/);
    expect(match).not.toBeNull();
  });

  test('upload screen is not initially active', () => {
    const match = indexHtml.match(/id="uploadScreen"[^>]*class="[^"]*active[^"]*"/);
    expect(match).toBeNull();
  });
});

describe('user menu in reader top bar', () => {
  test('has a user menu button in top bar', () => {
    expect(indexHtml).toMatch(/id="userMenuBtn"/);
  });

  test('has a user menu dropdown', () => {
    expect(indexHtml).toMatch(/id="userMenu"/);
  });

  test('user menu has logout option', () => {
    expect(indexHtml).toMatch(/id="logoutBtn"/);
  });
});

describe('auth-ui.js module', () => {
  test('auth-ui.js exists', () => {
    const filePath = path.resolve(__dirname, '../src/auth-ui.js');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test('auth-ui.js has no chrome extension references', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/auth-ui.js'), 'utf-8');
    expect(src).not.toMatch(/chrome\./);
  });

  test('auth-ui.js imports from auth module', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/auth-ui.js'), 'utf-8');
    expect(src).toMatch(/from ['"]\.\/auth\.js['"]/);
  });

  test('auth-ui.js uses Google sign-in (signInWithPopup + GoogleAuthProvider)', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/auth-ui.js'), 'utf-8');
    expect(src).toMatch(/GoogleAuthProvider/);
    expect(src).toMatch(/signInWithPopup/);
  });

  test('auth-ui.js does NOT use email/password auth', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/auth-ui.js'), 'utf-8');
    expect(src).not.toMatch(/signInWithEmailAndPassword/);
    expect(src).not.toMatch(/createUserWithEmailAndPassword/);
  });
});

describe('CSS: auth screen styles', () => {
  test('reader.css has auth-screen styles', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../src/reader.css'), 'utf-8');
    expect(css).toMatch(/\.auth-screen/);
  });

  test('reader.css has user-menu styles', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../src/reader.css'), 'utf-8');
    expect(css).toMatch(/\.user-menu/);
  });

  test('reader.css has Google sign-in button styles', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../src/reader.css'), 'utf-8');
    expect(css).toMatch(/\.auth-btn-google/);
  });
});

describe('auth-ui.js Firebase-unavailable resilience', () => {
  let authUiSrc;
  beforeEach(() => {
    authUiSrc = fs.readFileSync(path.resolve(__dirname, '../src/auth-ui.js'), 'utf-8');
  });

  test('guards onAuthStateChanged against null auth', () => {
    // When Firebase is disabled, auth is null — onAuthStateChanged must not be called with null
    expect(authUiSrc).toMatch(/if\s*\(\s*auth\s*\)\s*onAuthStateChanged/);
  });

  test('guards signInWithPopup against null auth', () => {
    // handleGoogleSignIn should bail early when auth is null
    expect(authUiSrc).toMatch(/if\s*\(\s*!auth\s*\)/);
  });

  test('guards signOut against null auth', () => {
    // Logout handler should not call signOut(null)
    expect(authUiSrc).toMatch(/if\s*\(\s*auth\s*\)\s*await\s+signOut/);
  });

  test('disables Google sign-in button when Firebase is unavailable', () => {
    // When auth is null, the button should be disabled with a title explaining why
    expect(authUiSrc).toMatch(/googleSignInBtn\.disabled\s*=\s*true/);
    expect(authUiSrc).toMatch(/Firebase not configured/);
  });

  test('onAuthStateChanged is never called unconditionally', () => {
    // Every call to onAuthStateChanged should be preceded by an auth guard
    // Split into lines and find all onAuthStateChanged calls (excluding import)
    const lines = authUiSrc.split('\n');
    const callLines = lines.filter(l =>
      l.includes('onAuthStateChanged(') && !l.includes('import')
    );
    for (const line of callLines) {
      // Should be preceded by `if (auth)` on the same line or the call is inside a guarded block
      const idx = lines.indexOf(line);
      const context = lines.slice(Math.max(0, idx - 3), idx + 1).join('\n');
      expect(context).toMatch(/if\s*\(\s*auth\s*\)/);
    }
  });
});
