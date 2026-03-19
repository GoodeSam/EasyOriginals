/**
 * TDD Tests: audio playback buttons in word popup and sentence panel.
 *
 * Users should be able to replay audio on demand via explicit play buttons,
 * regardless of the autoPlayAudio toggle. The sentence panel gets a
 * 🔊 Listen button alongside Translate/Grammar/Copy. The word popup gets
 * a 🔊 Listen button in its header next to the word.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

let readerSrc;
let htmlSrc;
let cssSrc;

beforeEach(() => {
  readerSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/reader.js'), 'utf-8'
  );
  htmlSrc = fs.readFileSync(
    path.resolve(__dirname, '../index.html'), 'utf-8'
  );
  cssSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/reader.css'), 'utf-8'
  );
});

// ─── Sentence Panel: Listen Button ─────────────────────────────────

describe('sentence panel listen button', () => {
  test('HTML contains a listen button in the sentence panel actions', () => {
    const panelBlock = htmlSrc.match(
      /id=["']sentencePanel["'][\s\S]*?<\/div>\s*<\/div>/
    );
    expect(panelBlock).not.toBeNull();
    expect(panelBlock[0]).toMatch(/id=["']btnListen["']/);
  });

  test('listen button has accessible aria-label', () => {
    const btnMatch = htmlSrc.match(/<button[^>]*id=["']btnListen["'][^>]*>/);
    expect(btnMatch).not.toBeNull();
    expect(btnMatch[0]).toMatch(/aria-label=/);
  });

  test('listen button uses btn-sm class', () => {
    const btnMatch = htmlSrc.match(/<button[^>]*id=["']btnListen["'][^>]*>/);
    expect(btnMatch).not.toBeNull();
    expect(btnMatch[0]).toMatch(/btn-sm/);
  });

  test('listen button is inside panel-actions div', () => {
    const actionsBlock = htmlSrc.match(
      /<div class=["']panel-actions["']>([\s\S]*?)<\/div>/
    );
    expect(actionsBlock).not.toBeNull();
    expect(actionsBlock[0]).toMatch(/id=["']btnListen["']/);
  });

  test('reader.js binds click handler to btnListen', () => {
    expect(readerSrc).toMatch(/btnListen\.addEventListener\s*\(\s*['"]click['"]/);
  });

  test('btnListen click handler calls speakText with panel sentence text', () => {
    // The handler should call speakText with the sentence text content
    expect(readerSrc).toMatch(/btnListen[\s\S]*?speakText/);
  });

  test('btnListen handler does NOT check autoPlayAudio (always available)', () => {
    // Find the btnListen handler block - it should call playTTS without autoPlayAudio guard
    const handler = readerSrc.match(
      /btnListen\.addEventListener\s*\(\s*['"]click['"]\s*,[\s\S]*?\}\s*\)/
    );
    expect(handler).not.toBeNull();
    expect(handler[0]).not.toMatch(/autoPlayAudio/);
  });
});

// ─── Word Popup: Listen Button ──────────────────────────────────────

describe('word popup listen button', () => {
  test('HTML contains a listen button in the word popup', () => {
    const popupBlock = htmlSrc.match(
      /id=["']wordPopup["'][\s\S]*?<\/div>\s*<\/div>/
    );
    expect(popupBlock).not.toBeNull();
    expect(popupBlock[0]).toMatch(/id=["']wordListenBtn["']/);
  });

  test('listen button has accessible aria-label', () => {
    const btnMatch = htmlSrc.match(/<button[^>]*id=["']wordListenBtn["'][^>]*>/);
    expect(btnMatch).not.toBeNull();
    expect(btnMatch[0]).toMatch(/aria-label=/);
  });

  test('listen button is inside the word-popup-header', () => {
    const headerBlock = htmlSrc.match(
      /<div class=["']word-popup-header["']>([\s\S]*?)<\/div>/
    );
    expect(headerBlock).not.toBeNull();
    expect(headerBlock[0]).toMatch(/id=["']wordListenBtn["']/);
  });

  test('reader.js binds click handler to wordListenBtn', () => {
    expect(readerSrc).toMatch(/wordListenBtn\.addEventListener\s*\(\s*['"]click['"]/);
  });

  test('wordListenBtn click handler calls speakText with the popup word text', () => {
    expect(readerSrc).toMatch(/wordListenBtn[\s\S]*?speakText/);
  });

  test('wordListenBtn handler does NOT check autoPlayAudio (always available)', () => {
    const handler = readerSrc.match(
      /wordListenBtn\.addEventListener\s*\(\s*['"]click['"]\s*,[\s\S]*?\}\s*\)/
    );
    expect(handler).not.toBeNull();
    expect(handler[0]).not.toMatch(/autoPlayAudio/);
  });
});

// ─── Button styling ─────────────────────────────────────────────────

describe('listen button styling', () => {
  test('word listen button uses icon-btn class for compact styling', () => {
    const btnMatch = htmlSrc.match(/<button[^>]*id=["']wordListenBtn["'][^>]*>/);
    expect(btnMatch).not.toBeNull();
    expect(btnMatch[0]).toMatch(/icon-btn/);
  });
});
