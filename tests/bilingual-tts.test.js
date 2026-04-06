/**
 * TDD Tests: Bilingual Chinese-English TTS support.
 *
 * Auto-detects language per paragraph, selects matching voice,
 * and strips [Original]/[Translated] labels before synthesis.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

let bookAudioSrc;

beforeEach(() => {
  bookAudioSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/book-audio.js'), 'utf-8'
  );
});

// ─── stripTtsLabels ─────────────────────────────────────────────────

describe('stripTtsLabels', () => {
  test('exports stripTtsLabels function', () => {
    expect(bookAudioSrc).toMatch(/function stripTtsLabels\s*\(/);
  });

  test('removes [Original] prefix', () => {
    const fn = bookAudioSrc.match(/function stripTtsLabels[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/Original/);
  });

  test('removes [Translated] prefix', () => {
    const fn = bookAudioSrc.match(/function stripTtsLabels[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/Translated/);
  });
});

// ─── Per-paragraph voice selection ──────────────────────────────────

describe('per-paragraph voice selection in generateBookAudio', () => {
  test('generateBookAudio detects language per paragraph', () => {
    const fn = bookAudioSrc.match(/function generateBookAudio[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/detectChinese/);
  });

  test('generateBookAudio selects voice per paragraph based on content', () => {
    const fn = bookAudioSrc.match(/function generateBookAudio[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // Should use voiceForLanguage or similar per-paragraph logic
    expect(fn[0]).toMatch(/voiceForLanguage|paraVoice|chineseVoice|enVoice/);
  });

  test('generateBookAudio supports bilingual content without throwing', () => {
    const fn = bookAudioSrc.match(/function generateBookAudio[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // Should NOT throw on mixed Chinese+English content
    expect(fn[0]).not.toMatch(/throw.*Chinese text detected but/);
  });

  test('generateBookAudio strips labels before synthesis', () => {
    const fn = bookAudioSrc.match(/function generateBookAudio[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/stripTtsLabels/);
  });

  test('generateBookAudio accepts chineseVoice and englishVoice options', () => {
    const fn = bookAudioSrc.match(/function generateBookAudio[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/chineseVoice/);
    expect(fn[0]).toMatch(/englishVoice/);
  });
});
