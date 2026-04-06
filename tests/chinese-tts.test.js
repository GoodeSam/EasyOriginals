/**
 * TDD Tests: Chinese language TTS support.
 *
 * Ensures Edge TTS SSML uses the correct xml:lang based on voice name,
 * Chinese voices are available in the voice list, and translatedTtsVoice
 * is persisted in settings.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

let bookAudioSrc, readerSrc, storageSrc, settingsSrc;

beforeEach(() => {
  bookAudioSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/book-audio.js'), 'utf-8'
  );
  readerSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/reader.js'), 'utf-8'
  );
  storageSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/storage.js'), 'utf-8'
  );
  settingsSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/settings-ui.js'), 'utf-8'
  );
});

// ─── Language detection from voice name ─────────────────────────────

describe('langFromVoice helper', () => {
  test('book-audio.js has a langFromVoice function', () => {
    expect(bookAudioSrc).toMatch(/function langFromVoice\s*\(/);
  });

  test('langFromVoice extracts language code from voice name', () => {
    const fn = bookAudioSrc.match(/function langFromVoice[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/match|split/);
  });

  test('reader.js also has langFromVoice for playEdgeTTS', () => {
    expect(readerSrc).toMatch(/function langFromVoice\s*\(/);
  });
});

// ─── SSML uses dynamic xml:lang ─────────────────────────────────────

describe('dynamic SSML language', () => {
  test('synthesizeParagraph SSML does not hardcode en-US', () => {
    const fn = bookAudioSrc.match(/function synthesizeParagraph[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).not.toMatch(/xml:lang='en-US'/);
    expect(fn[0]).toMatch(/xml:lang/);
  });

  test('playEdgeTTS SSML does not hardcode en-US', () => {
    const fn = readerSrc.match(/function playEdgeTTS[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).not.toMatch(/xml:lang='en-US'/);
    expect(fn[0]).toMatch(/xml:lang/);
  });

  test('speakText browser fallback does not hardcode en-US', () => {
    const fn = readerSrc.match(/function speakText[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).not.toMatch(/utterance\.lang\s*=\s*'en-US'/);
  });
});

// ─── Chinese voices in voice list ───────────────────────────────────

describe('Chinese voice options', () => {
  test('EDGE_TTS_VOICES includes zh-CN-XiaoxiaoNeural', () => {
    expect(readerSrc).toMatch(/zh-CN-XiaoxiaoNeural/);
  });

  test('EDGE_TTS_VOICES includes a Chinese male voice', () => {
    expect(readerSrc).toMatch(/zh-CN-Yun\w+Neural/);
  });
});

// ─── translatedTtsVoice in storage ──────────────────────────────────

describe('translatedTtsVoice persistence', () => {
  test('storage.js has translatedTtsVoice key', () => {
    expect(storageSrc).toMatch(/translatedTtsVoice/);
  });

  test('storage.js has default for translatedTtsVoice', () => {
    expect(storageSrc).toMatch(/zh-CN-XiaoxiaoNeural/);
  });

  test('reader.js state includes translatedTtsVoice', () => {
    expect(readerSrc).toMatch(/state\.translatedTtsVoice/);
  });

  test('reader.js loads translatedTtsVoice in loadSettings', () => {
    const fn = readerSrc.match(/function loadSettings[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/translatedTtsVoice/);
  });
});

// ─── Settings UI for translated voice ───────────────────────────────

describe('translated voice settings UI', () => {
  test('settings UI has translatedTtsVoice select', () => {
    expect(settingsSrc).toMatch(/translatedTtsVoice|settingsTranslatedVoice/i);
  });

  test('settings UI saves translatedTtsVoice', () => {
    expect(settingsSrc).toMatch(/translatedTtsVoice/);
  });
});
