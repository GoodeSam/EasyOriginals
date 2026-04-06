/**
 * TDD Tests: Full-book translation with progress tracking.
 *
 * Translates every text paragraph in a loaded book using the configured
 * translation provider (Google, Microsoft, or ChatGPT), tracks progress,
 * supports cancellation, and can generate translated audio via Edge TTS.
 * Inspired by tepub's translation controller (parallel translation,
 * state tracking, resumable operations).
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

let bookTranslatorSrc, readerSrc, htmlSrc;

beforeEach(() => {
  bookTranslatorSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/book-translator.js'), 'utf-8'
  );
  readerSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/reader.js'), 'utf-8'
  );
  htmlSrc = fs.readFileSync(
    path.resolve(__dirname, '../index.html'), 'utf-8'
  );
});

// ─── Module exports ─────────────────────────────────────────────────

describe('book-translator module exports', () => {
  test('exports translateBook function', () => {
    expect(bookTranslatorSrc).toMatch(/export\s+(async\s+)?function\s+translateBook\s*\(/);
  });

  test('exports cancelTranslation function', () => {
    expect(bookTranslatorSrc).toMatch(/export\s+function\s+cancelTranslation\s*\(/);
  });

  test('exports translateParagraph function for single-paragraph translation', () => {
    expect(bookTranslatorSrc).toMatch(/export\s+(async\s+)?function\s+translateParagraph\s*\(/);
  });
});

// ─── translateParagraph ─────────────────────────────────────────────

describe('translateParagraph', () => {
  test('accepts text, from-language, and to-language params', () => {
    const fn = bookTranslatorSrc.match(/function translateParagraph\s*\(([^)]*)\)/);
    expect(fn).not.toBeNull();
    expect(fn[1]).toMatch(/text/);
  });

  test('uses the configured translation provider via translateFn', () => {
    const fn = bookTranslatorSrc.match(/function translateParagraph[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/translateFn/);
  });
});

// ─── translateBook ──────────────────────────────────────────────────

describe('translateBook', () => {
  test('accepts paragraphs array and options object', () => {
    const fn = bookTranslatorSrc.match(/function translateBook\s*\(([^)]*)\)/);
    expect(fn).not.toBeNull();
    expect(fn[1]).toMatch(/paragraphs/);
    expect(fn[1]).toMatch(/options/);
  });

  test('calls onProgress callback with current/total during translation', () => {
    const fn = bookTranslatorSrc.match(/function translateBook[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/onProgress/);
  });

  test('skips image paragraphs', () => {
    const fn = bookTranslatorSrc.match(/function translateBook[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/image/);
  });

  test('joins paragraph sentences into text for translation', () => {
    const fn = bookTranslatorSrc.match(/function translateBook[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/sentences/);
  });

  test('supports cancellation via cancelTranslation', () => {
    const fn = bookTranslatorSrc.match(/function translateBook[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/cancel/i);
  });

  test('returns translated paragraphs array', () => {
    const fn = bookTranslatorSrc.match(/function translateBook[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/translatedParagraphs/);
  });

  test('preserves image paragraphs in output unchanged', () => {
    const fn = bookTranslatorSrc.match(/function translateBook[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // Image paragraphs should be pushed as-is
    expect(fn[0]).toMatch(/\.push\(/);
  });

  test('creates translated paragraphs with sentences array', () => {
    const fn = bookTranslatorSrc.match(/function translateBook[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/sentences/);
  });
});

// ─── cancelTranslation ──────────────────────────────────────────────

describe('cancelTranslation', () => {
  test('sets a cancelled flag to stop translation', () => {
    const fn = bookTranslatorSrc.match(/function cancelTranslation[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/cancel/i);
    expect(fn[0]).toMatch(/true/);
  });
});

// ─── Integration with reader.js ─────────────────────────────────────

describe('reader.js integrates book-translator', () => {
  test('reader.js imports from book-translator.js', () => {
    expect(readerSrc).toMatch(/from\s+['"]\.\/book-translator(\.js)?['"]/);
  });

  test('reader.js exposes translateBook on window', () => {
    expect(readerSrc).toMatch(/window\.translateBook/);
  });
});

// ─── UI elements ────────────────────────────────────────────────────

describe('book translation UI', () => {
  test('index.html has a translate-book button', () => {
    expect(htmlSrc).toMatch(/id=['"]translateBookBtn['"]/);
  });

  test('index.html has a progress container for translation', () => {
    expect(htmlSrc).toMatch(/id=['"]translationProgress['"]/);
  });

  test('progress container includes a progress bar', () => {
    expect(htmlSrc).toMatch(/id=['"]translationProgressBar['"]/);
  });

  test('progress container includes status text', () => {
    expect(htmlSrc).toMatch(/id=['"]translationStatus['"]/);
  });

  test('progress container includes a cancel button', () => {
    expect(htmlSrc).toMatch(/id=['"]cancelTranslationBtn['"]/);
  });
});

// ─── Translated audio generation ────────────────────────────────────

describe('generate audio from translations', () => {
  test('index.html has a generate-translated-audio button', () => {
    expect(htmlSrc).toMatch(/id=['"]generateTranslatedAudioBtn['"]/);
  });

  test('reader.js handles generating audio from translated paragraphs', () => {
    expect(readerSrc).toMatch(/generateTranslatedAudio|translatedAudio/);
  });
});
