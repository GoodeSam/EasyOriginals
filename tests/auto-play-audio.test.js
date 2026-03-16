/**
 * TDD Tests: auto-play audio toggle setting.
 *
 * An autoPlayAudio setting controls whether clicking a word or sentence
 * automatically triggers TTS playback. When disabled, clicks show popups
 * or panels without audio. The setting is persisted to localStorage and
 * exposed as a toolbar toggle button.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

let readerSrc;
let cssSrc;
let htmlSrc;

beforeEach(() => {
  readerSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/reader.js'), 'utf-8'
  );
  cssSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/reader.css'), 'utf-8'
  );
  htmlSrc = fs.readFileSync(
    path.resolve(__dirname, '../index.html'), 'utf-8'
  );
});

// ─── State ───────────────────────────────────────────────────────────

describe('autoPlayAudio state', () => {
  test('state object includes autoPlayAudio property defaulting to false', () => {
    // The state initialiser must declare autoPlayAudio: false
    const stateBlock = readerSrc.match(/let state\s*=\s*\{[\s\S]*?\n\};/);
    expect(stateBlock).not.toBeNull();
    expect(stateBlock[0]).toMatch(/autoPlayAudio:\s*false/);
  });

  test('autoPlayAudio is loaded from localStorage on init', () => {
    // There should be a function that reads reader-auto-play-audio from localStorage
    expect(readerSrc).toMatch(/localStorage\.getItem\s*\(\s*['"]reader-auto-play-audio['"]\s*\)/);
  });

  test('autoPlayAudio is persisted via syncSetItem when toggled', () => {
    expect(readerSrc).toMatch(/syncSetItem\s*\(\s*['"]reader-auto-play-audio['"]/);
  });
});

// ─── Toolbar Button ──────────────────────────────────────────────────

describe('auto-play audio toolbar button', () => {
  test('HTML contains an autoPlayAudio toggle button', () => {
    expect(htmlSrc).toMatch(/id=["']autoPlayBtn["']/);
  });

  test('button has an accessible aria-label', () => {
    const btnMatch = htmlSrc.match(/<button[^>]*id=["']autoPlayBtn["'][^>]*>/);
    expect(btnMatch).not.toBeNull();
    expect(btnMatch[0]).toMatch(/aria-label=/);
  });

  test('reader.js binds a click handler to autoPlayBtn', () => {
    expect(readerSrc).toMatch(/autoPlayBtn\.addEventListener\s*\(\s*['"]click['"]/);
  });

  test('click handler toggles state.autoPlayAudio', () => {
    // The handler should flip the boolean
    const handlerMatch = readerSrc.match(
      /autoPlayBtn\.addEventListener\s*\(\s*['"]click['"][^)]*\)\s*(?:=>|,\s*(?:function\s*)?\(\s*\)\s*(?:=>)?\s*\{)([\s\S]*?)(?:\}\s*\)|\}\s*;)/
    );
    // Alternatively just check that autoPlayAudio is toggled near the button handler
    expect(readerSrc).toMatch(/state\.autoPlayAudio\s*=\s*!state\.autoPlayAudio/);
  });
});

// ─── Button Placement (right sidebar) ────────────────────────────────

describe('auto-play button is a right-sidebar side-toggle', () => {
  test('autoPlayBtn is NOT inside .top-bar-actions', () => {
    const actionsBlock = htmlSrc.match(
      /<div\s[^>]*class=["']top-bar-actions["'][^>]*>([\s\S]*?)<\/div>\s*<\/div>\s*<\/div>/
    );
    expect(actionsBlock).not.toBeNull();
    expect(actionsBlock[0]).not.toMatch(/id=["']autoPlayBtn["']/);
  });

  test('autoPlayBtn has the side-toggle class in HTML', () => {
    const btnMatch = htmlSrc.match(/<button[^>]*id=["']autoPlayBtn["'][^>]*>/);
    expect(btnMatch).not.toBeNull();
    expect(btnMatch[0]).toMatch(/class=["'][^"']*side-toggle/);
  });

  test('autoPlayBtn has a dedicated .autoplay-toggle CSS class', () => {
    const btnMatch = htmlSrc.match(/<button[^>]*id=["']autoPlayBtn["'][^>]*>/);
    expect(btnMatch).not.toBeNull();
    expect(btnMatch[0]).toMatch(/autoplay-toggle/);
  });
});

// ─── CSS Sidebar Toggle Styling ──────────────────────────────────────

describe('auto-play sidebar toggle CSS', () => {
  test('CSS defines .autoplay-toggle with a bottom position', () => {
    const rule = cssSrc.match(/\.autoplay-toggle\s*\{[^}]*\}/);
    expect(rule).not.toBeNull();
    expect(rule[0]).toMatch(/bottom:/);
  });

  test('.autoplay-toggle has a background color', () => {
    const rule = cssSrc.match(/\.autoplay-toggle\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule[1]).toMatch(/background:\s*#/);
  });

  test('.autoplay-toggle has a box-shadow', () => {
    const rule = cssSrc.match(/\.autoplay-toggle\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule[1]).toMatch(/box-shadow:/);
  });

  test('CSS defines .autoplay-toggle.auto-play-active with distinct background', () => {
    expect(cssSrc).toMatch(/\.autoplay-toggle\.auto-play-active\s*\{[^}]*background:[^}]*\}/);
  });
});

// ─── Visibility ──────────────────────────────────────────────────────

describe('auto-play button visibility follows other side-toggles', () => {
  test('reader.js makes autoPlayBtn visible alongside other toggles', () => {
    // autoPlayBtn should get .visible class added where the other toggles do
    expect(readerSrc).toMatch(/autoPlayBtn\.classList\.add\s*\(\s*['"]visible['"]\s*\)/);
  });
});

// ─── Accessibility ───────────────────────────────────────────────────

describe('auto-play button accessibility', () => {
  test('applyAutoPlayAudio sets aria-pressed attribute', () => {
    const fn = readerSrc.match(
      /function applyAutoPlayAudio[\s\S]*?\n\}/
    );
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/aria-pressed/);
  });

  test('button in HTML has role=switch or aria-pressed', () => {
    const btnMatch = htmlSrc.match(/<button[^>]*id=["']autoPlayBtn["'][^>]*>/);
    expect(btnMatch).not.toBeNull();
    expect(btnMatch[0]).toMatch(/aria-pressed=/);
  });
});

// ─── Gating TTS behind autoPlayAudio ─────────────────────────────────

describe('word click TTS is gated by autoPlayAudio', () => {
  test('handleReaderClick checks autoPlayAudio before calling playTTS', () => {
    const clickHandler = readerSrc.match(
      /function handleReaderClick[\s\S]*?closeAllSidePanels\(\)/
    );
    expect(clickHandler).not.toBeNull();
    const fnBody = clickHandler[0];
    // playTTS call must be guarded by autoPlayAudio
    expect(fnBody).toMatch(/autoPlayAudio[\s\S]*?playTTS/);
  });
});

describe('sentence panel TTS is gated by autoPlayAudio', () => {
  test('speakSentence checks autoPlayAudio before calling playTTS', () => {
    const fn = readerSrc.match(
      /(?:async\s+)?function speakSentence[\s\S]*?\n\}/
    );
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/autoPlayAudio/);
  });
});

describe('paragraph popup TTS is gated by autoPlayAudio', () => {
  test('paraPopupText click handler checks autoPlayAudio before calling playTTS', () => {
    // Find the paraPopupText click handler and verify it checks autoPlayAudio
    const handler = readerSrc.match(
      /paraPopupText\.addEventListener\s*\(\s*['"]click['"]\s*,[\s\S]*?\}\s*\)/
    );
    expect(handler).not.toBeNull();
    expect(handler[0]).toMatch(/autoPlayAudio/);
  });
});

describe('sentence panel auto-speaks on open when autoPlayAudio is on', () => {
  test('openSentencePanel calls speakSentence or playTTS when autoPlayAudio is true', () => {
    const fn = readerSrc.match(
      /function openSentencePanel[\s\S]*?\n\}/
    );
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/autoPlayAudio[\s\S]*?(?:speakSentence|playTTS)/);
  });
});
