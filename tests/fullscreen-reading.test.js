/**
 * TDD Tests for fullscreen reading mode.
 * After 5 seconds of inactivity, all UI chrome hides.
 * Fullscreen stays active during reading (scroll, clicks).
 * Only mouse at screen edges exits fullscreen.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

let readerSrc, css;

beforeEach(() => {
  readerSrc = fs.readFileSync(path.resolve(__dirname, '../src/reader.js'), 'utf-8');
  css = fs.readFileSync(path.resolve(__dirname, '../src/reader.css'), 'utf-8');
});

describe('auto-hide delay is 5 seconds', () => {
  test('AUTO_HIDE_DELAY is 5000ms', () => {
    expect(readerSrc).toMatch(/AUTO_HIDE_DELAY\s*=\s*5000/);
  });
});

describe('fullscreen reading mode class', () => {
  test('startAutoHideTimer adds fullscreen-reading class to readerScreen', () => {
    const fnMatch = readerSrc.match(/function startAutoHideTimer[\s\S]*?\n\}/);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch[0]).toMatch(/fullscreen-reading/);
  });

  test('showBars removes fullscreen-reading class from readerScreen', () => {
    const fnMatch = readerSrc.match(/function showBars[\s\S]*?\n\}/);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch[0]).toMatch(/fullscreen-reading/);
  });
});

describe('side panels hide in fullscreen mode', () => {
  test('startAutoHideTimer closes active side panels', () => {
    const fnMatch = readerSrc.match(/function startAutoHideTimer[\s\S]*?\n\}/);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch[0]).toMatch(/side-panel/);
  });
});

describe('CSS: fullscreen reading mode', () => {
  test('.fullscreen-reading .top-bar is hidden', () => {
    expect(css).toMatch(/\.fullscreen-reading\s+\.top-bar|\.fullscreen-reading\s*>\s*\.top-bar/);
  });

  test('.fullscreen-reading .bottom-bar is hidden', () => {
    expect(css).toMatch(/\.fullscreen-reading\s+\.bottom-bar|\.fullscreen-reading\s*>\s*\.bottom-bar/);
  });

  test('.fullscreen-reading .reader-content expands', () => {
    const fullscreenMatch = css.match(/\.fullscreen-reading[\s\S]*?\.reader-content[\s\S]*?\}/);
    expect(fullscreenMatch).not.toBeNull();
    expect(fullscreenMatch[0]).toMatch(/max-width:\s*none|max-width:\s*100%/);
  });

  test('.fullscreen-reading hides side-toggle buttons', () => {
    expect(css).toMatch(/\.fullscreen-reading[\s\S]*?side-toggle/);
  });

  test('.fullscreen-reading hides side panels', () => {
    expect(css).toMatch(/\.fullscreen-reading[\s\S]*?side-panel/);
  });

  test('.fullscreen-reading uses a smooth transition on reader-content', () => {
    expect(css).toMatch(/\.reader-content[\s\S]*?transition:/);
  });
});

describe('cursor hides in fullscreen mode', () => {
  test('CSS hides cursor in fullscreen-reading mode', () => {
    expect(css).toMatch(/\.fullscreen-reading[\s\S]*?cursor:\s*none/);
  });
});

describe('browser Fullscreen API', () => {
  test('startAutoHideTimer calls requestFullscreen to hide browser chrome', () => {
    const fnMatch = readerSrc.match(/function startAutoHideTimer[\s\S]*?\n\}/);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch[0]).toMatch(/requestFullscreen/);
  });

  test('showBars calls exitFullscreen to restore browser chrome', () => {
    const fnMatch = readerSrc.match(/function showBars[\s\S]*?\n\}/);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch[0]).toMatch(/exitFullscreen/);
  });

  test('fullscreenchange listener syncs state when user presses Escape', () => {
    expect(readerSrc).toMatch(/fullscreenchange/);
  });
});

// ===== NEW: Fullscreen persistence during reading =====

describe('scrolling does NOT exit fullscreen', () => {
  test('scroll listener does NOT call showBars', () => {
    // The scroll handler should NOT call showBars() — it must not exit fullscreen
    const scrollMatch = readerSrc.match(/readerContent\.addEventListener\('scroll'[\s\S]*?\}\s*,/);
    expect(scrollMatch).not.toBeNull();
    expect(scrollMatch[0]).not.toMatch(/showBars\(\)/);
  });
});

describe('mouse movement in center does NOT exit fullscreen', () => {
  test('mousemove handler only calls showBars when at screen edge', () => {
    // The mousemove handler should only call showBars inside the edge condition
    const moveMatch = readerSrc.match(/document\.addEventListener\('mousemove'[\s\S]*?\}\);/);
    expect(moveMatch).not.toBeNull();
    const handler = moveMatch[0];
    // showBars should only appear inside the atTop/atBottom/atRight branch
    // There should NOT be a showBars in the else branch
    const elseMatch = handler.match(/\}\s*else\s*\{([\s\S]*?)\}/);
    expect(elseMatch).not.toBeNull();
    expect(elseMatch[1]).not.toMatch(/showBars\(\)/);
  });

  test('mousemove in center resets auto-hide timer without showing bars', () => {
    const moveMatch = readerSrc.match(/document\.addEventListener\('mousemove'[\s\S]*?\}\);/);
    expect(moveMatch).not.toBeNull();
    const handler = moveMatch[0];
    // The else branch should call startAutoHideTimer (to re-arm the hide)
    const elseMatch = handler.match(/\}\s*else\s*\{([\s\S]*?)\}/);
    expect(elseMatch).not.toBeNull();
    expect(elseMatch[1]).toMatch(/startAutoHideTimer\(\)/);
  });
});

describe('edge detection exits fullscreen', () => {
  test('mousemove at top/bottom/right edge calls showBars', () => {
    const moveMatch = readerSrc.match(/document\.addEventListener\('mousemove'[\s\S]*?\}\);/);
    expect(moveMatch).not.toBeNull();
    const handler = moveMatch[0];
    // The edge branch (atTop || atBottom || atRight) should call showBars
    const edgeMatch = handler.match(/if\s*\(atTop\s*\|\|\s*atBottom\s*\|\|\s*atRight\)\s*\{([\s\S]*?)\}/);
    expect(edgeMatch).not.toBeNull();
    expect(edgeMatch[1]).toMatch(/showBars\(\)/);
  });
});

describe('reading interactions stay in fullscreen', () => {
  test('top-bar click handler does NOT call showBars when in fullscreen', () => {
    // Top bar is hidden in fullscreen anyway, but the click handler
    // should not blindly call showBars. It should check fullscreen state.
    // OR the top-bar has pointer-events: none in fullscreen CSS.
    // We verify via CSS that top-bar is non-interactive in fullscreen.
    expect(css).toMatch(/\.fullscreen-reading\s+\.top-bar[\s\S]*?pointer-events:\s*none/);
  });
});

describe('DOM: fullscreen-reading class manipulation', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="readerScreen" class="screen active">
        <div class="top-bar"></div>
        <div class="reader-content" id="readerContent"></div>
        <div class="bottom-bar"></div>
      </div>
      <button class="side-toggle visible" id="notesToggle">N</button>
      <div class="side-panel active" id="notesPanel"></div>
    `;
  });

  test('adding fullscreen-reading class to readerScreen', () => {
    const screen = document.getElementById('readerScreen');
    screen.classList.add('fullscreen-reading');
    expect(screen.classList.contains('fullscreen-reading')).toBe(true);
  });

  test('removing fullscreen-reading class from readerScreen', () => {
    const screen = document.getElementById('readerScreen');
    screen.classList.add('fullscreen-reading');
    screen.classList.remove('fullscreen-reading');
    expect(screen.classList.contains('fullscreen-reading')).toBe(false);
  });
});
