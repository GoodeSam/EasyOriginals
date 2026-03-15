/**
 * TDD Tests for Firebase integration with Google Sign-In.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Firebase SDK as npm dependency', () => {
  test('firebase is in package.json dependencies', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf-8'));
    expect(pkg.dependencies).toBeDefined();
    expect(pkg.dependencies.firebase).toBeDefined();
  });
});

describe('firebase-init.js module', () => {
  let src;

  beforeEach(() => {
    src = fs.readFileSync(path.resolve(__dirname, '../src/firebase-init.js'), 'utf-8');
  });

  test('imports from firebase/app npm package', () => {
    expect(src).toMatch(/from ['"]firebase\/app['"]/);
  });

  test('imports from firebase/auth npm package', () => {
    expect(src).toMatch(/from ['"]firebase\/auth['"]/);
  });

  test('imports from firebase/firestore npm package', () => {
    expect(src).toMatch(/from ['"]firebase\/firestore['"]/);
  });

  test('exports GoogleAuthProvider and signInWithPopup', () => {
    expect(src).toMatch(/GoogleAuthProvider/);
    expect(src).toMatch(/signInWithPopup/);
  });

  test('does NOT export email/password auth functions', () => {
    expect(src).not.toMatch(/signInWithEmailAndPassword/);
    expect(src).not.toMatch(/createUserWithEmailAndPassword/);
  });

  test('exports auth and db instances', () => {
    expect(src).toMatch(/export.*\bauth\b/);
    expect(src).toMatch(/export.*\bdb\b/);
  });

  test('exports signOut and onAuthStateChanged', () => {
    expect(src).toMatch(/signOut/);
    expect(src).toMatch(/onAuthStateChanged/);
  });
});

describe('auth-ui.js Google Sign-In integration', () => {
  let authUiSrc;

  beforeEach(() => {
    authUiSrc = fs.readFileSync(path.resolve(__dirname, '../src/auth-ui.js'), 'utf-8');
  });

  test('imports from firebase-init module', () => {
    expect(authUiSrc).toMatch(/from ['"]\.\/firebase-init\.js['"]/);
  });

  test('uses Google sign-in popup', () => {
    expect(authUiSrc).toMatch(/signInWithPopup/);
    expect(authUiSrc).toMatch(/GoogleAuthProvider/);
  });

  test('does NOT use email/password auth', () => {
    expect(authUiSrc).not.toMatch(/signInWithEmailAndPassword/);
    expect(authUiSrc).not.toMatch(/createUserWithEmailAndPassword/);
  });

  test('calls loginSuccess after Google sign-in', () => {
    expect(authUiSrc).toMatch(/loginSuccess/);
  });

  test('listens for Firebase onAuthStateChanged for session restore', () => {
    expect(authUiSrc).toMatch(/onAuthStateChanged/);
  });

  test('calls signOut on logout', () => {
    expect(authUiSrc).toMatch(/signOut/);
  });
});
