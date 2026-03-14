/**
 * TDD Tests for account registration fix.
 * Verifies Firebase SDK is loaded and auth-ui properly integrates.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

let indexHtml;

beforeEach(() => {
  indexHtml = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf-8');
});

describe('Firebase SDK loading', () => {
  test('index.html loads firebase-init.js module', () => {
    expect(indexHtml).toMatch(/firebase-init\.js/);
  });

  test('firebase-init.js imports Firebase app SDK from CDN', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/firebase-init.js'), 'utf-8');
    expect(src).toMatch(/firebase.*app/i);
  });

  test('firebase-init.js imports Firebase auth SDK from CDN', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/firebase-init.js'), 'utf-8');
    expect(src).toMatch(/firebase.*auth/i);
  });

  test('firebase-init.js imports Firebase firestore SDK from CDN', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/firebase-init.js'), 'utf-8');
    expect(src).toMatch(/firebase.*firestore/i);
  });

  test('Firebase init script loads before the main app module', () => {
    const firebasePos = indexHtml.indexOf('firebase-init.js');
    const mainPos = indexHtml.indexOf('src/main.js');
    expect(firebasePos).toBeLessThan(mainPos);
    expect(firebasePos).toBeGreaterThan(0);
  });
});

describe('Firebase initialization script', () => {
  test('index.html has firebase-init.js or inline firebase config', () => {
    // Should have either a firebase-init script or inline config
    const hasInit = indexHtml.match(/firebase-init\.js/) ||
                    indexHtml.match(/initializeApp/) ||
                    indexHtml.match(/firebaseConfig/);
    expect(hasInit).not.toBeNull();
  });
});

describe('auth-ui.js Firebase integration', () => {
  let authUiSrc;

  beforeEach(() => {
    authUiSrc = fs.readFileSync(path.resolve(__dirname, '../src/auth-ui.js'), 'utf-8');
  });

  test('imports Firebase auth functions directly (not from window globals)', () => {
    // Should use ES module imports, not window.firebaseAuth
    expect(authUiSrc).not.toMatch(/window\.firebaseAuth/);
  });

  test('imports Firebase firestore functions directly (not from window globals)', () => {
    expect(authUiSrc).not.toMatch(/window\.firebaseFirestore/);
  });

  test('imports from firebase-init module', () => {
    expect(authUiSrc).toMatch(/from ['"]\.\/firebase-init\.js['"]/);
  });

  test('handleRegister creates user and calls loginSuccess', () => {
    expect(authUiSrc).toMatch(/createUserWithEmailAndPassword/);
    expect(authUiSrc).toMatch(/loginSuccess/);
  });

  test('handleLogin signs in user and calls loginSuccess', () => {
    expect(authUiSrc).toMatch(/signInWithEmailAndPassword/);
    expect(authUiSrc).toMatch(/loginSuccess/);
  });
});

describe('firebase-init.js module', () => {
  test('firebase-init.js exists', () => {
    const filePath = path.resolve(__dirname, '../src/firebase-init.js');
    expect(fs.existsSync(filePath)).toBe(true);
  });

  test('firebase-init.js exports auth and db', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/firebase-init.js'), 'utf-8');
    expect(src).toMatch(/export.*auth/);
    expect(src).toMatch(/export.*db/);
  });

  test('firebase-init.js initializes app with config', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/firebase-init.js'), 'utf-8');
    expect(src).toMatch(/initializeApp/);
    expect(src).toMatch(/apiKey/);
  });

  test('firebase-init.js uses Firebase Auth', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/firebase-init.js'), 'utf-8');
    expect(src).toMatch(/getAuth/);
  });

  test('firebase-init.js uses Firestore', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/firebase-init.js'), 'utf-8');
    expect(src).toMatch(/getFirestore/);
  });
});

describe('session restore re-authenticates with Firebase', () => {
  test('auth-ui.js listens for Firebase onAuthStateChanged', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/auth-ui.js'), 'utf-8');
    expect(src).toMatch(/onAuthStateChanged/);
  });
});

describe('logout signs out of Firebase', () => {
  test('auth-ui.js calls signOut on logout', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/auth-ui.js'), 'utf-8');
    expect(src).toMatch(/signOut/);
  });
});
