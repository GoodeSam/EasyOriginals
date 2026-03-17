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

describe('word list and history toggles in toolbar', () => {
  let indexHtml;

  beforeEach(() => {
    indexHtml = fs.readFileSync(
      path.resolve(__dirname, '../index.html'),
      'utf-8'
    );
  });

  test('wordListToggle is inside .top-bar-actions', () => {
    // Extract the top-bar-actions block
    const actionsMatch = indexHtml.match(/class="top-bar-actions">([\s\S]*?)<\/div>\s*<\/div>/);
    expect(actionsMatch).not.toBeNull();
    expect(actionsMatch[1]).toMatch(/id="wordListToggle"/);
  });

  test('historyToggle is inside .top-bar-actions', () => {
    const actionsMatch = indexHtml.match(/class="top-bar-actions">([\s\S]*?)<\/div>\s*<\/div>/);
    expect(actionsMatch).not.toBeNull();
    expect(actionsMatch[1]).toMatch(/id="historyToggle"/);
  });

  test('searchToggle is inside .top-bar-actions', () => {
    const actionsMatch = indexHtml.match(/class="top-bar-actions">([\s\S]*?)<\/div>\s*<\/div>/);
    expect(actionsMatch).not.toBeNull();
    expect(actionsMatch[1]).toMatch(/id="searchToggle"/);
  });

  test('wordListToggle is NOT a standalone side-toggle button', () => {
    // Should not exist as a separate side-toggle element outside the toolbar
    expect(indexHtml).not.toMatch(/<button[^>]*class="side-toggle[^"]*wordlist-toggle[^"]*"[^>]*id="wordListToggle"/);
  });

  test('historyToggle is NOT a standalone side-toggle button', () => {
    expect(indexHtml).not.toMatch(/<button[^>]*class="side-toggle[^"]*history-toggle[^"]*"[^>]*id="historyToggle"/);
  });

  test('wordListToggle and historyToggle use icon-btn class in toolbar', () => {
    const actionsMatch = indexHtml.match(/class="top-bar-actions">([\s\S]*?)<\/div>\s*<\/div>/);
    const actions = actionsMatch[1];
    const wlMatch = actions.match(/<button[^>]*id="wordListToggle"[^>]*/);
    const hMatch = actions.match(/<button[^>]*id="historyToggle"[^>]*/);
    expect(wlMatch[0]).toMatch(/class="[^"]*icon-btn/);
    expect(hMatch[0]).toMatch(/class="[^"]*icon-btn/);
  });

  test('JS does not toggle .visible class on wordListToggle or historyToggle', () => {
    const readerSrc = fs.readFileSync(
      path.resolve(__dirname, '../src/reader.js'),
      'utf-8'
    );
    // Toolbar buttons are always visible, no need for .visible class toggling
    expect(readerSrc).not.toMatch(/wordListToggle\.classList\.(add|remove)\(['"]visible['"]\)/);
    expect(readerSrc).not.toMatch(/historyToggle\.classList\.(add|remove)\(['"]visible['"]\)/);
  });
});

describe('settings and auto-play icons in toolbar after history', () => {
  let indexHtml;

  beforeEach(() => {
    indexHtml = fs.readFileSync(
      path.resolve(__dirname, '../index.html'),
      'utf-8'
    );
  });

  test('settingsToggle is inside .top-bar-actions', () => {
    const actionsMatch = indexHtml.match(/class="top-bar-actions">([\s\S]*?)<\/div>\s*<\/div>/);
    expect(actionsMatch).not.toBeNull();
    expect(actionsMatch[1]).toMatch(/id="settingsToggle"/);
  });

  test('autoPlayBtn is inside .top-bar-actions', () => {
    const actionsMatch = indexHtml.match(/class="top-bar-actions">([\s\S]*?)<\/div>\s*<\/div>/);
    expect(actionsMatch).not.toBeNull();
    expect(actionsMatch[1]).toMatch(/id="autoPlayBtn"/);
  });

  test('settingsToggle and autoPlayBtn use icon-btn class', () => {
    const actionsMatch = indexHtml.match(/class="top-bar-actions">([\s\S]*?)<\/div>\s*<\/div>/);
    const actions = actionsMatch[1];
    const sMatch = actions.match(/<button[^>]*id="settingsToggle"[^>]*/);
    const aMatch = actions.match(/<button[^>]*id="autoPlayBtn"[^>]*/);
    expect(sMatch[0]).toMatch(/class="[^"]*icon-btn/);
    expect(aMatch[0]).toMatch(/class="[^"]*icon-btn/);
  });

  test('order: historyToggle then settingsToggle then autoPlayBtn', () => {
    const actionsMatch = indexHtml.match(/class="top-bar-actions">([\s\S]*?)<\/div>\s*<\/div>/);
    const actions = actionsMatch[1];
    const historyPos = actions.indexOf('id="historyToggle"');
    const settingsPos = actions.indexOf('id="settingsToggle"');
    const autoPlayPos = actions.indexOf('id="autoPlayBtn"');
    expect(historyPos).toBeLessThan(settingsPos);
    expect(settingsPos).toBeLessThan(autoPlayPos);
  });

  test('settingsToggle is NOT a standalone side-toggle button', () => {
    expect(indexHtml).not.toMatch(/<button[^>]*class="side-toggle[^"]*settings-toggle[^"]*"[^>]*id="settingsToggle"/);
  });

  test('autoPlayBtn is NOT a standalone side-toggle button', () => {
    expect(indexHtml).not.toMatch(/<button[^>]*class="side-toggle[^"]*autoplay-toggle[^"]*"[^>]*id="autoPlayBtn"/);
  });

  test('JS does not toggle .visible class on settingsToggle or autoPlayBtn', () => {
    const readerSrc = fs.readFileSync(
      path.resolve(__dirname, '../src/reader.js'),
      'utf-8'
    );
    expect(readerSrc).not.toMatch(/settingsToggle.*classList\.(add|remove)\(['"]visible['"]\)/);
    expect(readerSrc).not.toMatch(/autoPlayBtn\.classList\.(add|remove)\(['"]visible['"]\)/);
  });
});
