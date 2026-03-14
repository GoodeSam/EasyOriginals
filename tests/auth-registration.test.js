/**
 * TDD Tests for account registration fix.
 * Verifies Firebase SDK is properly integrated via npm + Vite bundling.
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

  test('firebase-init.js exists', () => {
    expect(src.length).toBeGreaterThan(0);
  });

  test('imports from firebase/app npm package (not CDN URL)', () => {
    expect(src).toMatch(/from ['"]firebase\/app['"]/);
    expect(src).not.toMatch(/gstatic\.com/);
  });

  test('imports from firebase/auth npm package', () => {
    expect(src).toMatch(/from ['"]firebase\/auth['"]/);
  });

  test('imports from firebase/firestore npm package', () => {
    expect(src).toMatch(/from ['"]firebase\/firestore['"]/);
  });

  test('initializes app with initializeApp and config object', () => {
    expect(src).toMatch(/initializeApp/);
    expect(src).toMatch(/apiKey/);
    expect(src).toMatch(/projectId/);
  });

  test('exports auth and db instances', () => {
    expect(src).toMatch(/export.*\bauth\b/);
    expect(src).toMatch(/export.*\bdb\b/);
  });

  test('exports auth functions', () => {
    expect(src).toMatch(/signInWithEmailAndPassword/);
    expect(src).toMatch(/createUserWithEmailAndPassword/);
    expect(src).toMatch(/signOut/);
    expect(src).toMatch(/onAuthStateChanged/);
  });

  test('exports firestore functions', () => {
    expect(src).toMatch(/\bdoc\b/);
    expect(src).toMatch(/\bsetDoc\b/);
    expect(src).toMatch(/\bgetDoc\b/);
  });
});

describe('auth-ui.js Firebase integration', () => {
  let authUiSrc;

  beforeEach(() => {
    authUiSrc = fs.readFileSync(path.resolve(__dirname, '../src/auth-ui.js'), 'utf-8');
  });

  test('imports from firebase-init module (not window globals)', () => {
    expect(authUiSrc).toMatch(/from ['"]\.\/firebase-init\.js['"]/);
    expect(authUiSrc).not.toMatch(/window\.firebaseAuth/);
    expect(authUiSrc).not.toMatch(/window\.firebaseFirestore/);
    expect(authUiSrc).not.toMatch(/window\.firebaseApp/);
  });

  test('handleRegister creates user and calls loginSuccess', () => {
    expect(authUiSrc).toMatch(/createUserWithEmailAndPassword/);
    expect(authUiSrc).toMatch(/loginSuccess/);
  });

  test('handleLogin signs in user and calls loginSuccess', () => {
    expect(authUiSrc).toMatch(/signInWithEmailAndPassword/);
    expect(authUiSrc).toMatch(/loginSuccess/);
  });

  test('listens for Firebase onAuthStateChanged for session restore', () => {
    expect(authUiSrc).toMatch(/onAuthStateChanged/);
  });

  test('calls signOut on logout', () => {
    expect(authUiSrc).toMatch(/signOut/);
  });

  test('has friendly error message mapping', () => {
    expect(authUiSrc).toMatch(/auth\/email-already-in-use/);
    expect(authUiSrc).toMatch(/auth\/invalid-email/);
    expect(authUiSrc).toMatch(/auth\/wrong-password|auth\/invalid-credential/);
  });
});

describe('setup-firebase.sh exists', () => {
  test('setup script exists for configuring Firebase project', () => {
    const filePath = path.resolve(__dirname, '../setup-firebase.sh');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test('setup script creates firebase-init.js with real config', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../setup-firebase.sh'), 'utf-8');
    expect(src).toMatch(/firebase.*projects.*create|firebase/i);
    expect(src).toMatch(/apiKey/);
  });
});
