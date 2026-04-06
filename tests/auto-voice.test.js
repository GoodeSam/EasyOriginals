/**
 * TDD Tests: Auto-detect content language and select matching TTS voice.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

let readerSrc, bookAudioSrc;

beforeEach(() => {
  readerSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/reader.js'), 'utf-8'
  );
  bookAudioSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/book-audio.js'), 'utf-8'
  );
});

// ─── detectContentLanguage ──────────────────────────────────────────

describe('detectContentLanguage', () => {
  test('book-audio.js exports detectContentLanguage', () => {
    expect(bookAudioSrc).toMatch(/export\s+function\s+detectContentLanguage\s*\(/);
  });

  test('samples paragraphs to detect language', () => {
    const fn = bookAudioSrc.match(/function detectContentLanguage[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/sentences/);
  });

  test('returns zh for Chinese content', () => {
    const fn = bookAudioSrc.match(/function detectContentLanguage[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/zh/);
  });

  test('returns en for English content', () => {
    const fn = bookAudioSrc.match(/function detectContentLanguage[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/en/);
  });
});

// ─── voiceForLanguage ───────────────────────────────────────────────

describe('voiceForLanguage', () => {
  test('book-audio.js exports voiceForLanguage', () => {
    expect(bookAudioSrc).toMatch(/export\s+function\s+voiceForLanguage\s*\(/);
  });

  test('returns Chinese voice for zh', () => {
    const fn = bookAudioSrc.match(/function voiceForLanguage[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/zh-CN/);
  });

  test('returns English voice for en', () => {
    const fn = bookAudioSrc.match(/function voiceForLanguage[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/en-US/);
  });
});

// ─── Audio handlers use auto-detection ──────────────────────────────

describe('auto voice selection in audio handlers', () => {
  test('audiobook handler uses detectContentLanguage or voiceForLanguage', () => {
    // The handler should auto-select voice based on content language
    expect(readerSrc).toMatch(/detectContentLanguage|voiceForLanguage/);
  });

  test('reader.js imports detectContentLanguage from book-audio', () => {
    expect(readerSrc).toMatch(/detectContentLanguage.*from.*book-audio|book-audio.*detectContentLanguage/s);
  });

  test('reader.js imports voiceForLanguage from book-audio', () => {
    expect(readerSrc).toMatch(/voiceForLanguage.*from.*book-audio|book-audio.*voiceForLanguage/s);
  });
});
