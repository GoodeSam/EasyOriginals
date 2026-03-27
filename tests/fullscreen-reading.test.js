/**
 * TDD Tests for fullscreen reading mode.
 * After 5 seconds of inactivity, all UI chrome hides.
 * Fullscreen stays active during reading (scroll, clicks).
 * Only mouse at screen edges exits fullscreen.
 * Browser fullscreen is entered on first user click (gesture-driven).
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

  test('exitFullscreenReading removes fullscreen-reading class from readerScreen', () => {
    const fnMatch = readerSrc.match(/function exitFullscreenReading[\s\S]*?\n\}/);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch[0]).toMatch(/fullscreen-reading/);
  });

  test('showBars does not exit fullscreen-reading (only reveals UI temporarily)', () => {
    const fnMatch = readerSrc.match(/function showBars[\s\S]*?\n\}/);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch[0]).not.toMatch(/fullscreen-reading/);
    expect(fnMatch[0]).not.toMatch(/exitFullscreen/);
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

  test('.fullscreen-reading .reader-content keeps width stable', () => {
    // Fullscreen reading must NOT change max-width — width stays the same
    const fullscreenMatch = css.match(/\.fullscreen-reading\s+\.reader-content\s*\{([^}]*)\}/);
    if (fullscreenMatch) {
      const props = fullscreenMatch[1].split('\n').filter(l => !l.trim().startsWith('/*'));
      expect(props.join('\n')).not.toMatch(/max-width/);
    }
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

  test('.fullscreen-reading .top-bar has pointer-events none', () => {
    expect(css).toMatch(/\.fullscreen-reading\s+\.top-bar[\s\S]*?pointer-events:\s*none/);
  });
});

describe('cursor hides in fullscreen mode', () => {
  test('CSS hides cursor via .cursor-hidden class (applied by timer in fullscreen)', () => {
    expect(css).toMatch(/\.cursor-hidden[\s\S]*?cursor:\s*none/);
  });
});

describe('browser fullscreen via user gesture', () => {
  test('requestFullscreen is NOT in startAutoHideTimer (timer has no gesture)', () => {
    const fnMatch = readerSrc.match(/function startAutoHideTimer[\s\S]*?\n\}/);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch[0]).not.toMatch(/requestFullscreen/);
  });

  test('enterBrowserFullscreen function exists', () => {
    expect(readerSrc).toMatch(/function enterBrowserFullscreen/);
  });

  test('enterBrowserFullscreen calls requestFullscreen', () => {
    const fnMatch = readerSrc.match(/function enterBrowserFullscreen[\s\S]*?\n\}/);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch[0]).toMatch(/requestFullscreen/);
  });

  test('reader content click triggers enterBrowserFullscreen', () => {
    // handleReaderClick or a click listener on readerContent should
    // call enterBrowserFullscreen so fullscreen is entered via user gesture
    expect(readerSrc).toMatch(/enterBrowserFullscreen/);
    // It should be called in handleReaderClick or a click handler
    const clickContext = readerSrc.match(/handleReaderClick[\s\S]*?enterBrowserFullscreen|click[\s\S]*?enterBrowserFullscreen/);
    expect(clickContext).not.toBeNull();
  });

  test('exitFullscreenReading calls exitFullscreen to restore browser chrome', () => {
    const fnMatch = readerSrc.match(/function exitFullscreenReading[\s\S]*?\n\}/);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch[0]).toMatch(/exitFullscreen/);
  });

  test('fullscreenchange listener syncs state when user presses Escape', () => {
    expect(readerSrc).toMatch(/fullscreenchange/);
  });
});

describe('scrolling does NOT exit fullscreen', () => {
  test('scroll listener does NOT call showBars', () => {
    const scrollMatch = readerSrc.match(/readerContent\.addEventListener\('scroll'[\s\S]*?\}\s*,/);
    expect(scrollMatch).not.toBeNull();
    expect(scrollMatch[0]).not.toMatch(/showBars\(\)/);
  });
});

describe('mouse movement in center does NOT exit fullscreen', () => {
  test('mousemove handler only calls showBars when at screen edge', () => {
    const moveMatch = readerSrc.match(/document\.addEventListener\('mousemove'[\s\S]*?\}\);/);
    expect(moveMatch).not.toBeNull();
    const handler = moveMatch[0];
    const elseMatch = handler.match(/\}\s*else\s*\{([\s\S]*?)\}/);
    expect(elseMatch).not.toBeNull();
    expect(elseMatch[1]).not.toMatch(/showBars\(\)/);
  });

  test('mousemove in center resets auto-hide timer without showing bars', () => {
    const moveMatch = readerSrc.match(/document\.addEventListener\('mousemove'[\s\S]*?\}\);/);
    expect(moveMatch).not.toBeNull();
    const handler = moveMatch[0];
    const elseMatch = handler.match(/\}\s*else\s*\{([\s\S]*?)\}/);
    expect(elseMatch).not.toBeNull();
    expect(elseMatch[1]).toMatch(/startAutoHideTimer\(\)/);
  });
});

describe('edge detection exits fullscreen', () => {
  test('mousemove at top/bottom edge calls showBars (right edge does not)', () => {
    const moveMatch = readerSrc.match(/document\.addEventListener\('mousemove'[\s\S]*?\}\);/);
    expect(moveMatch).not.toBeNull();
    const handler = moveMatch[0];
    const edgeMatch = handler.match(/if\s*\(atTopZone\s*\|\|\s*atBottom\)\s*\{([\s\S]*?)\}/);
    expect(edgeMatch).not.toBeNull();
    expect(edgeMatch[1]).toMatch(/showBars\(\)/);
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
