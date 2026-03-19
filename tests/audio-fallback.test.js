/**
 * TDD Tests: audio fallback via browser speechSynthesis.
 *
 * When no OpenAI API key is configured, audio playback should fall back
 * to the browser's built-in Web Speech API (speechSynthesis). A new
 * speakText(text) function serves as the universal entry point for all
 * audio playback, choosing the best available provider automatically.
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

// ─── speakText function ─────────────────────────────────────────────

describe('speakText function exists', () => {
  test('reader.js defines a speakText function', () => {
    expect(readerSrc).toMatch(/function speakText\s*\(/);
  });

  test('speakText calls ensureSettings to load API key', () => {
    const fn = readerSrc.match(/function speakText[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/ensureSettings/);
  });
});

// ─── OpenAI path (when API key available) ───────────────────────────

describe('speakText uses OpenAI TTS when API key is set', () => {
  test('speakText calls playTTS when state.apiKey is available', () => {
    const fn = readerSrc.match(/function speakText[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/state\.apiKey[\s\S]*?playTTS/);
  });
});

// ─── Browser speechSynthesis fallback ───────────────────────────────

describe('speakText falls back to speechSynthesis without API key', () => {
  test('speakText references speechSynthesis as fallback', () => {
    const fn = readerSrc.match(/function speakText[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/speechSynthesis/);
  });

  test('speakText creates a SpeechSynthesisUtterance', () => {
    const fn = readerSrc.match(/function speakText[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/SpeechSynthesisUtterance/);
  });

  test('speakText sets English language on the utterance', () => {
    const fn = readerSrc.match(/function speakText[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/\.lang\s*=\s*['"]en/);
  });

  test('speakText cancels any in-progress speech before starting new', () => {
    const fn = readerSrc.match(/function speakText[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/speechSynthesis\.cancel\(\)/);
  });

  test('speakText calls speechSynthesis.speak with the utterance', () => {
    const fn = readerSrc.match(/function speakText[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/speechSynthesis\.speak\(/);
  });
});

// ─── All callers use speakText ──────────────────────────────────────

describe('all audio callers use speakText (no direct apiKey guards)', () => {
  test('btnListen handler calls speakText', () => {
    const handler = readerSrc.match(
      /btnListen\.addEventListener\s*\(\s*['"]click['"]\s*,[\s\S]*?\}\s*\)/
    );
    expect(handler).not.toBeNull();
    expect(handler[0]).toMatch(/speakText\(/);
  });

  test('btnListen handler does NOT guard on state.apiKey', () => {
    const handler = readerSrc.match(
      /btnListen\.addEventListener\s*\(\s*['"]click['"]\s*,[\s\S]*?\}\s*\)/
    );
    expect(handler).not.toBeNull();
    expect(handler[0]).not.toMatch(/state\.apiKey/);
  });

  test('wordListenBtn handler calls speakText', () => {
    const handler = readerSrc.match(
      /wordListenBtn\.addEventListener\s*\(\s*['"]click['"]\s*,[\s\S]*?\}\s*\)/
    );
    expect(handler).not.toBeNull();
    expect(handler[0]).toMatch(/speakText\(/);
  });

  test('wordListenBtn handler does NOT guard on state.apiKey', () => {
    const handler = readerSrc.match(
      /wordListenBtn\.addEventListener\s*\(\s*['"]click['"]\s*,[\s\S]*?\}\s*\)/
    );
    expect(handler).not.toBeNull();
    expect(handler[0]).not.toMatch(/state\.apiKey/);
  });

  test('speakSentence function calls speakText', () => {
    const fn = readerSrc.match(
      /(?:async\s+)?function speakSentence[\s\S]*?\n\}/
    );
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/speakText\(/);
  });

  test('speakSentence does NOT guard on state.apiKey', () => {
    const fn = readerSrc.match(
      /(?:async\s+)?function speakSentence[\s\S]*?\n\}/
    );
    expect(fn).not.toBeNull();
    expect(fn[0]).not.toMatch(/state\.apiKey/);
  });

  test('paraPopupText click handler calls speakText', () => {
    const handler = readerSrc.match(
      /paraPopupText\.addEventListener\s*\(\s*['"]click['"]\s*,[\s\S]*?\}\s*\)/
    );
    expect(handler).not.toBeNull();
    expect(handler[0]).toMatch(/speakText\(/);
  });

  test('paraPopupText handler does NOT guard on state.apiKey', () => {
    const handler = readerSrc.match(
      /paraPopupText\.addEventListener\s*\(\s*['"]click['"]\s*,[\s\S]*?\}\s*\)/
    );
    expect(handler).not.toBeNull();
    expect(handler[0]).not.toMatch(/state\.apiKey/);
  });

  test('handleReaderClick word audio calls speakText', () => {
    const clickHandler = readerSrc.match(
      /function handleReaderClick[\s\S]*?closeAllSidePanels\(\)/
    );
    expect(clickHandler).not.toBeNull();
    expect(clickHandler[0]).toMatch(/autoPlayAudio[\s\S]*?speakText/);
  });

  test('handleReaderClick word audio does NOT guard on state.apiKey', () => {
    // Find the word-click block specifically
    const clickHandler = readerSrc.match(
      /function handleReaderClick[\s\S]*?closeAllSidePanels\(\)/
    );
    expect(clickHandler).not.toBeNull();
    // The autoPlay line should not reference apiKey
    const autoPlayLine = clickHandler[0].match(/autoPlayAudio.*(?:speakText|playTTS).*/);
    expect(autoPlayLine).not.toBeNull();
    expect(autoPlayLine[0]).not.toMatch(/apiKey/);
  });
});

// ─── speakText is exported for testing ──────────────────────────────

describe('speakText is accessible', () => {
  test('speakText is assigned to window for test access', () => {
    expect(readerSrc).toMatch(/window\.speakText\s*=\s*speakText/);
  });
});
