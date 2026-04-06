/**
 * TDD Tests: speech fallback chain guarantees audio always works.
 *
 * speakText() should try providers in order:
 *   1. OpenAI TTS (if API key configured)
 *   2. Edge TTS (free WebSocket service)
 *   3. Browser speechSynthesis (always-available last resort)
 *
 * If Edge TTS fails (WebSocket rejected, network error, etc.),
 * speakText must fall back to speechSynthesis so the user always
 * hears something regardless of environment or configuration.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

let readerSrc;

beforeEach(() => {
  readerSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/reader.js'), 'utf-8'
  );
});

// ─── speakText fallback chain ───────────────────────────────────────

describe('speakText falls back to speechSynthesis when Edge TTS fails', () => {
  test('speakText catches playEdgeTTS errors and falls back', () => {
    const fn = readerSrc.match(/function speakText[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // speechSynthesis is used as last-resort browser fallback via browserFallback helper
    expect(fn[0]).toMatch(/speechSynthesis/);
    expect(fn[0]).toMatch(/playEdgeTTS[\s\S]*?\.catch/);
  });

  test('fallback uses SpeechSynthesisUtterance with dynamic language', () => {
    const fn = readerSrc.match(/function speakText[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/SpeechSynthesisUtterance/);
    expect(fn[0]).toMatch(/\.lang\s*=\s*langFromVoice/);
  });

  test('fallback calls speechSynthesis.cancel before speaking', () => {
    const fn = readerSrc.match(/function speakText[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/speechSynthesis\.cancel\(\)/);
  });

  test('fallback calls speechSynthesis.speak', () => {
    const fn = readerSrc.match(/function speakText[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/speechSynthesis\.speak\(/);
  });
});

// ─── speakText still uses Edge TTS as primary no-key path ───────────

describe('speakText still tries Edge TTS first', () => {
  test('speakText calls playEdgeTTS in the no-apiKey branch', () => {
    const fn = readerSrc.match(/function speakText[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/playEdgeTTS/);
  });

  test('speakText still calls playTTS when apiKey is set', () => {
    const fn = readerSrc.match(/function speakText[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/state\.apiKey[\s\S]*?playTTS/);
  });
});
