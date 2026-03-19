/**
 * TDD Tests: font size synchronization and click-to-speak.
 *
 * 1. Panel font sizes must use --reader-font-size CSS variable
 *    so they stay in sync with the main reading area.
 * 2. Clicking a word or sentence text should trigger TTS directly,
 *    removing the need for separate Listen / Pronounce buttons.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

let cssSrc;
let htmlSrc;
let readerSrc;

beforeEach(() => {
  cssSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/reader.css'), 'utf-8'
  );
  htmlSrc = fs.readFileSync(
    path.resolve(__dirname, '../index.html'), 'utf-8'
  );
  readerSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/reader.js'), 'utf-8'
  );
});

// ─── Font Size Synchronization ───────────────────────────────────────

describe('font size synchronization', () => {
  test('panel-sentence font-size uses --reader-font-size CSS variable', () => {
    const rule = cssSrc.match(/\.panel-sentence\s*\{[^}]*\}/);
    expect(rule).not.toBeNull();
    expect(rule[0]).toMatch(/font-size:\s*var\(--reader-font-size/);
  });

  test('result-text font-size uses --reader-font-size CSS variable', () => {
    const rule = cssSrc.match(/\.result-text\s*\{[^}]*\}/);
    expect(rule).not.toBeNull();
    expect(rule[0]).toMatch(/font-size:\s*var\(--reader-font-size/);
  });

  test('para-popup-text font-size uses --reader-font-size CSS variable', () => {
    const rule = cssSrc.match(/\.para-popup-text\s*\{[^}]*\}/);
    expect(rule).not.toBeNull();
    expect(rule[0]).toMatch(/font-size:\s*var\(--reader-font-size/);
  });

  test('para-popup-translation font-size uses --reader-font-size CSS variable', () => {
    const rule = cssSrc.match(/\.para-popup-translation\s*\{[^}]*\}/);
    expect(rule).not.toBeNull();
    expect(rule[0]).toMatch(/font-size:\s*var\(--reader-font-size/);
  });

  test('grammar-text font-size uses --reader-font-size CSS variable', () => {
    const rule = cssSrc.match(/\.grammar-text\s*\{[^}]*\}/);
    expect(rule).not.toBeNull();
    expect(rule[0]).toMatch(/font-size:\s*var\(--reader-font-size/);
  });
});

// ─── Word Popup Font Synchronization ─────────────────────────────────

describe('word popup font size synchronization', () => {
  test('def-loading font-size uses --reader-font-size with 18px fallback', () => {
    const rule = cssSrc.match(/\.def-loading\s*\{[^}]*\}/);
    expect(rule).not.toBeNull();
    expect(rule[0]).toMatch(/font-size:\s*var\(--reader-font-size,\s*18px\)/);
  });

  test('def-text font-size uses --reader-font-size with 18px fallback', () => {
    const rule = cssSrc.match(/\.def-text\s*\{[^}]*\}/);
    expect(rule).not.toBeNull();
    expect(rule[0]).toMatch(/font-size:\s*var\(--reader-font-size,\s*18px\)/);
  });

  test('def-pronunciation font-size uses --reader-font-size with 18px fallback', () => {
    const rule = cssSrc.match(/\.def-pronunciation\s*\{[^}]*\}/);
    expect(rule).not.toBeNull();
    expect(rule[0]).toMatch(/font-size:\s*var\(--reader-font-size,\s*18px\)/);
  });

  test('pos-tag font-size uses --reader-font-size with 18px fallback', () => {
    const rule = cssSrc.match(/\.pos-tag\s*\{[^}]*\}/);
    expect(rule).not.toBeNull();
    expect(rule[0]).toMatch(/font-size:\s*var\(--reader-font-size,\s*18px\)/);
  });

  test('word-popup-word font-size references --reader-font-size', () => {
    const rule = cssSrc.match(/\.word-popup-word\s*\{[^}]*\}/);
    expect(rule).not.toBeNull();
    expect(rule[0]).toMatch(/font-size:.*var\(--reader-font-size/);
  });
});

// ─── Consistent Fallback Values ──────────────────────────────────────

describe('all --reader-font-size fallbacks use consistent 18px default', () => {
  test('no --reader-font-size fallback uses a value other than 18px', () => {
    // Find all var(--reader-font-size, Xpx) declarations and ensure X is always 18
    const fallbacks = cssSrc.match(/var\(--reader-font-size,\s*(\d+)px\)/g) || [];
    expect(fallbacks.length).toBeGreaterThan(0);
    for (const fb of fallbacks) {
      const val = fb.match(/,\s*(\d+)px/);
      expect(val).not.toBeNull();
      expect(val[1]).toBe('18');
    }
  });
});

// ─── Click-to-Speak ─────────────────────────────────────────────────

describe('click-to-speak for words', () => {
  test('handleReaderClick calls speakText when clicking a word', () => {
    const clickHandler = readerSrc.match(
      /function handleReaderClick[\s\S]*?closeAllSidePanels\(\)/
    );
    expect(clickHandler).not.toBeNull();
    const fnBody = clickHandler[0];
    // The word-click branch should invoke speakText (which handles API key fallback)
    expect(fnBody).toMatch(/speakText\s*\(/);
  });

  test('word popup no longer has a separate pronounce button in HTML', () => {
    // The btnPronounce button should be removed from the word popup
    expect(htmlSrc).not.toMatch(/id=["']btnPronounce["']/);
  });
});

describe('click-to-speak for sentences', () => {
  test('panel sentence element has click handler for TTS in reader.js', () => {
    // panelSentence should have a click event that calls playTTS or speakSentence
    expect(readerSrc).toMatch(/panelSentence\.addEventListener\s*\(\s*['"]click['"]/);
  });

  test('sentence panel no longer has a separate Listen button in HTML', () => {
    expect(htmlSrc).not.toMatch(/id=["']btnTTS["']/);
  });

  test('panel-sentence has cursor:pointer style', () => {
    const rule = cssSrc.match(/\.panel-sentence\s*\{[^}]*\}/);
    expect(rule).not.toBeNull();
    expect(rule[0]).toMatch(/cursor:\s*pointer/);
  });
});

describe('click-to-speak for paragraphs', () => {
  test('para popup text element has click handler for TTS in reader.js', () => {
    expect(readerSrc).toMatch(/paraPopupText\.addEventListener\s*\(\s*['"]click['"]/);
  });

  test('paragraph popup no longer has a separate Listen button in HTML', () => {
    expect(htmlSrc).not.toMatch(/id=["']paraTTSBtn["']/);
  });

  test('para-popup-text has cursor:pointer style', () => {
    const rule = cssSrc.match(/\.para-popup-text\s*\{[^}]*\}/);
    expect(rule).not.toBeNull();
    expect(rule[0]).toMatch(/cursor:\s*pointer/);
  });
});
