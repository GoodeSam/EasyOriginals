/**
 * TDD Tests for the adapted reader.js.
 * Ensures reader works without Chrome extension APIs.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('reader.js web adaptation', () => {
  let readerSrc;

  beforeEach(() => {
    readerSrc = fs.readFileSync(
      path.resolve(__dirname, '../src/reader.js'),
      'utf-8'
    );
  });

  test('imports from storage.js module', () => {
    expect(readerSrc).toMatch(/import.*from.*['"]\.\/storage\.js['"]/);
  });

  test('imports from settings-ui.js module', () => {
    expect(readerSrc).toMatch(/import.*from.*['"]\.\/settings-ui\.js['"]/);
  });

  test('does not use chrome.storage.local', () => {
    // Filter out comments
    const codeLines = readerSrc.split('\n').filter(
      line => !line.trimStart().startsWith('//')
    );
    const code = codeLines.join('\n');
    expect(code).not.toMatch(/chrome\.storage\.local/);
  });

  test('does not use chrome.storage.session', () => {
    const codeLines = readerSrc.split('\n').filter(
      line => !line.trimStart().startsWith('//')
    );
    const code = codeLines.join('\n');
    expect(code).not.toMatch(/chrome\.storage\.session/);
  });

  test('does not use chrome.runtime.getURL', () => {
    expect(readerSrc).not.toMatch(/chrome\.runtime\.getURL/);
  });

  test('does not use chrome.runtime.lastError', () => {
    const codeLines = readerSrc.split('\n').filter(
      line => !line.trimStart().startsWith('//')
    );
    const code = codeLines.join('\n');
    expect(code).not.toMatch(/chrome\.runtime\.lastError/);
  });

  test('loads offline dict from relative path', () => {
    expect(readerSrc).toMatch(/['"]\/dict-en\.json['"]/);
  });

  test('uses loadStorageSettings for settings', () => {
    expect(readerSrc).toMatch(/loadStorageSettings\(\)/);
  });

  test('uses createSettingsPanel for settings UI', () => {
    expect(readerSrc).toMatch(/createSettingsPanel\(\)/);
  });

  test('has bindSettingsPanel function', () => {
    expect(readerSrc).toMatch(/function bindSettingsPanel\(\)/);
  });
});

describe('reader.js preserves core features', () => {
  let readerSrc;

  beforeEach(() => {
    readerSrc = fs.readFileSync(
      path.resolve(__dirname, '../src/reader.js'),
      'utf-8'
    );
  });

  test('has file parsing functions', () => {
    expect(readerSrc).toMatch(/function parsePDF/);
    expect(readerSrc).toMatch(/function parseEPUB/);
    expect(readerSrc).toMatch(/function parseDOCX/);
    expect(readerSrc).toMatch(/function parseTXT/);
  });

  test('has translation functions', () => {
    expect(readerSrc).toMatch(/function translateText/);
    expect(readerSrc).toMatch(/function googleTranslate/);
  });

  test('has TTS function', () => {
    expect(readerSrc).toMatch(/function playTTS/);
  });

  test('has theme support', () => {
    expect(readerSrc).toMatch(/const THEMES/);
    expect(readerSrc).toMatch(/function applyTheme/);
  });

  test('has word lookup', () => {
    expect(readerSrc).toMatch(/function lookupWord/);
  });

  test('has notes system', () => {
    expect(readerSrc).toMatch(/function addNote/);
    expect(readerSrc).toMatch(/function saveNotes/);
  });

  test('has bookmark system', () => {
    expect(readerSrc).toMatch(/function saveBookmark/);
    expect(readerSrc).toMatch(/function loadBookmark/);
  });

  test('has search', () => {
    expect(readerSrc).toMatch(/function openSearch/);
    expect(readerSrc).toMatch(/function performSearch/);
  });
});
