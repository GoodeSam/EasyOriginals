/**
 * TDD Tests for fullscreen reading mode.
 * After 5 seconds of inactivity, all UI chrome hides and only
 * the document content is displayed.
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
    // Should remove active class from side panels
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
    // In fullscreen mode, reader-content should have no max-width constraint
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
    // reader-content should have transition for smooth expansion
    expect(css).toMatch(/\.reader-content[\s\S]*?transition:/);
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

describe('cursor hides in fullscreen mode', () => {
  test('CSS hides cursor in fullscreen-reading mode', () => {
    expect(css).toMatch(/\.fullscreen-reading[\s\S]*?cursor:\s*none/);
  });
});

describe('scroll reveals UI temporarily', () => {
  test('reader.js has scroll listener that shows bars', () => {
    expect(readerSrc).toMatch(/scroll.*showBars|readerContent.*scroll/);
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
