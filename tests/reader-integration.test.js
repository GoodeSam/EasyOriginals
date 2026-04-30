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

describe('toolbar order: grouped by function', () => {
  // Extract from top-bar-actions open to search-bar (the next sibling)
  let actions;

  beforeEach(() => {
    const indexHtml = fs.readFileSync(
      path.resolve(__dirname, '../index.html'),
      'utf-8'
    );
    const start = indexHtml.indexOf('class="top-bar-actions">');
    const end = indexHtml.indexOf('<!-- Search Bar -->', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    actions = indexHtml.slice(start, end);
  });

  // Helper: position of an id attribute in the actions block
  function pos(id) {
    const i = actions.indexOf(`id="${id}"`);
    expect(i, `${id} must be inside .top-bar-actions`).toBeGreaterThan(-1);
    return i;
  }

  test('all toolbar buttons are present', () => {
    const ids = [
      'searchToggle', 'bookmarkBtn', 'autoPlayBtn', 'gestureModeBtn',
      'wordListToggle', 'notesToggle', 'historyToggle',
      'fontDecrease', 'fontIncrease', 'widthDecrease', 'widthIncrease',
      'translateBookBtn', 'generateAudiobookBtn',
      'generateTranslatedAudioBtn', 'exportDocxBtn',
      'settingsToggle', 'helpBtn', 'pageInfo',
    ];
    for (const id of ids) {
      expect(actions).toMatch(new RegExp(`id="${id}"`));
    }
  });

  // Group 1 — Reading: search, bookmark, autoPlay, gestureMode
  test('reading group: search → bookmark → autoPlay → gesture', () => {
    expect(pos('searchToggle')).toBeLessThan(pos('bookmarkBtn'));
    expect(pos('bookmarkBtn')).toBeLessThan(pos('autoPlayBtn'));
    expect(pos('autoPlayBtn')).toBeLessThan(pos('gestureModeBtn'));
  });

  // Group 2 — Content panels: wordList, notes, history
  test('content panels group: wordList → notes → history, after reading', () => {
    expect(pos('gestureModeBtn')).toBeLessThan(pos('wordListToggle'));
    expect(pos('wordListToggle')).toBeLessThan(pos('notesToggle'));
    expect(pos('notesToggle')).toBeLessThan(pos('historyToggle'));
  });

  test('notesToggle uses icon-btn class in toolbar', () => {
    const m = actions.match(/<button[^>]*id="notesToggle"[^>]*/);
    expect(m).not.toBeNull();
    expect(m[0]).toMatch(/class="[^"]*icon-btn/);
  });

  test('notesToggle is NOT a standalone side-toggle button', () => {
    const indexHtml = fs.readFileSync(
      path.resolve(__dirname, '../index.html'),
      'utf-8'
    );
    expect(indexHtml).not.toMatch(/<button[^>]*class="side-toggle[^"]*notes-toggle[^"]*"[^>]*id="notesToggle"/);
  });

  test('JS does not toggle .visible class on notesToggle', () => {
    const readerSrc = fs.readFileSync(
      path.resolve(__dirname, '../src/reader.js'),
      'utf-8'
    );
    expect(readerSrc).not.toMatch(/notesToggle\.classList\.(add|remove)\(['"]visible['"]\)/);
  });

  // Group 3 — Display: font, width, theme
  test('display group: font → width → theme, after panels', () => {
    expect(pos('historyToggle')).toBeLessThan(pos('fontDecrease'));
    expect(pos('fontIncrease')).toBeLessThan(pos('widthDecrease'));
  });

  // Group 4 — Actions: translate, audiobook, translated audio, export
  test('actions group: translate → audiobook → translatedAudio → export, after display', () => {
    expect(pos('widthIncrease')).toBeLessThan(pos('translateBookBtn'));
    expect(pos('translateBookBtn')).toBeLessThan(pos('generateAudiobookBtn'));
    expect(pos('generateAudiobookBtn')).toBeLessThan(pos('generateTranslatedAudioBtn'));
    expect(pos('generateTranslatedAudioBtn')).toBeLessThan(pos('exportDocxBtn'));
  });

  // Group 5 — System: settings, help, page info (rightmost)
  test('system group: settings → help → page, at end', () => {
    expect(pos('exportDocxBtn')).toBeLessThan(pos('settingsToggle'));
    expect(pos('settingsToggle')).toBeLessThan(pos('helpBtn'));
    expect(pos('helpBtn')).toBeLessThan(pos('pageInfo'));
  });

  // Groups are separated by toolbar-divider elements
  test('toolbar groups are separated by dividers', () => {
    const dividerCount = (actions.match(/toolbar-divider/g) || []).length;
    expect(dividerCount).toBeGreaterThanOrEqual(4);
  });
});

describe('reader width unchanged when toolbar hidden/shown', () => {
  let cssSrc;

  beforeEach(() => {
    cssSrc = fs.readFileSync(
      path.resolve(__dirname, '../src/reader.css'),
      'utf-8'
    );
  });

  test('fullscreen-reading does not override reader-content max-width', () => {
    const rule = cssSrc.match(/\.fullscreen-reading\s+\.reader-content\s*\{([^}]*)\}/);
    if (rule) {
      const props = rule[1].replace(/\/\*[\s\S]*?\*\//g, '');
      expect(props).not.toMatch(/max-width/);
    }
  });

  test('fullscreen-reading does not override reader-content padding', () => {
    // Padding must stay the same so text area width is identical
    const rule = cssSrc.match(/\.fullscreen-reading\s+\.reader-content\s*\{([^}]*)\}/);
    if (rule) {
      const props = rule[1].replace(/\/\*[\s\S]*?\*\//g, '');
      expect(props).not.toMatch(/padding/);
    }
  });

  test('auto-hide toolbar uses transform only (no layout shift)', () => {
    // .top-bar.auto-hide should use transform to slide out, not display:none
    const rule = cssSrc.match(/\.top-bar\.auto-hide\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule[1]).toMatch(/transform:/);
    expect(rule[1]).not.toMatch(/display:\s*none/);
  });

  test('auto-hide bottom-bar uses transform only (no layout shift)', () => {
    const rule = cssSrc.match(/\.bottom-bar\.auto-hide\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule[1]).toMatch(/transform:/);
    expect(rule[1]).not.toMatch(/display:\s*none/);
  });
});
