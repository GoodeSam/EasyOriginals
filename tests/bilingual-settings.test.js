/**
 * TDD Tests: Independent English/Chinese voice and speed settings.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

let storageSrc, settingsSrc, readerSrc, bookAudioSrc;

beforeEach(() => {
  storageSrc = fs.readFileSync(path.resolve(__dirname, '../src/storage.js'), 'utf-8');
  settingsSrc = fs.readFileSync(path.resolve(__dirname, '../src/settings-ui.js'), 'utf-8');
  readerSrc = fs.readFileSync(path.resolve(__dirname, '../src/reader.js'), 'utf-8');
  bookAudioSrc = fs.readFileSync(path.resolve(__dirname, '../src/book-audio.js'), 'utf-8');
});

// ─── Storage keys ───────────────────────────────────────────────────

describe('Chinese speech rate in storage', () => {
  test('storage.js has chineseSpeechRate key', () => {
    expect(storageSrc).toMatch(/chineseSpeechRate/);
  });

  test('storage.js has default for chineseSpeechRate', () => {
    const defaults = storageSrc.match(/DEFAULTS\s*=\s*\{[\s\S]*?\}/);
    expect(defaults).not.toBeNull();
    expect(defaults[0]).toMatch(/chineseSpeechRate/);
  });
});

// ─── Settings UI ────────────────────────────────────────────────────

describe('bilingual voice settings UI', () => {
  test('settings UI has English voice section', () => {
    expect(settingsSrc).toMatch(/English.*Voice|english.*voice/i);
  });

  test('settings UI has Chinese voice section', () => {
    expect(settingsSrc).toMatch(/Chinese.*Voice|chinese.*voice/i);
  });

  test('settings UI has Chinese speech rate control', () => {
    expect(settingsSrc).toMatch(/chineseSpeechRate/);
  });

  test('settings UI saves chineseSpeechRate', () => {
    const saveBlock = settingsSrc.match(/saveSettings\(\{[\s\S]*?\}\)/);
    expect(saveBlock).not.toBeNull();
    expect(saveBlock[0]).toMatch(/chineseSpeechRate/);
  });
});

// ─── Reader state ───────────────────────────────────────────────────

describe('reader.js Chinese speech rate state', () => {
  test('state includes chineseSpeechRate', () => {
    expect(readerSrc).toMatch(/state\.chineseSpeechRate/);
  });

  test('loadSettings loads chineseSpeechRate', () => {
    const fn = readerSrc.match(/function loadSettings[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/chineseSpeechRate/);
  });
});

// ─── Book audio uses per-language rate ──────────────────────────────

describe('generateBookAudio per-language speech rate', () => {
  test('accepts chineseSpeechRate option', () => {
    const fn = bookAudioSrc.match(/function generateBookAudio[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/chineseSpeechRate/);
  });

  test('uses chineseSpeechRate for Chinese paragraphs', () => {
    const fn = bookAudioSrc.match(/function generateBookAudio[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // Should pass different rate based on language
    expect(fn[0]).toMatch(/chineseSpeechRate|paraRate/);
  });
});
