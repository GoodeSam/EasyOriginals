/**
 * TDD Tests for Firebase integration (Firestore sync).
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

  test('imports from firebase/firestore npm package', () => {
    expect(src).toMatch(/from ['"]firebase\/firestore['"]/);
  });

  test('exports db instance', () => {
    expect(src).toMatch(/export.*\bdb\b/);
  });
});
