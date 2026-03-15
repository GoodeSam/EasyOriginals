/**
 * TDD Tests for cursor auto-hide in fullscreen reading mode.
 * Cursor disappears 5 seconds after mouse stops moving.
 * Cursor reappears immediately when mouse moves.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

let readerSrc, css;

beforeEach(() => {
  readerSrc = fs.readFileSync(path.resolve(__dirname, '../src/reader.js'), 'utf-8');
  css = fs.readFileSync(path.resolve(__dirname, '../src/reader.css'), 'utf-8');
});

describe('cursor-hidden class (not fullscreen-reading)', () => {
  test('CSS hides cursor via .cursor-hidden class, not .fullscreen-reading', () => {
    // .fullscreen-reading should NOT have cursor: none directly
    const fullscreenBlock = css.match(/\.fullscreen-reading\s*\{([^}]*)\}/);
    expect(fullscreenBlock).not.toBeNull();
    expect(fullscreenBlock[1]).not.toMatch(/cursor:\s*none/);
  });

  test('CSS has a .cursor-hidden class that sets cursor: none', () => {
    expect(css).toMatch(/\.cursor-hidden[\s\S]*?cursor:\s*none/);
  });
});

describe('cursor hide timer in reader.js', () => {
  test('has a cursorHideTimer variable', () => {
    expect(readerSrc).toMatch(/cursorHideTimer/);
  });

  test('has a startCursorHideTimer function', () => {
    expect(readerSrc).toMatch(/function startCursorHideTimer/);
  });

  test('startCursorHideTimer adds cursor-hidden class after delay', () => {
    const fnMatch = readerSrc.match(/function startCursorHideTimer[\s\S]*?\n\}/);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch[0]).toMatch(/cursor-hidden/);
  });

  test('startCursorHideTimer uses CURSOR_HIDE_DELAY of 5000ms', () => {
    expect(readerSrc).toMatch(/CURSOR_HIDE_DELAY\s*=\s*5000/);
  });

  test('has a showCursor function', () => {
    expect(readerSrc).toMatch(/function showCursor/);
  });

  test('showCursor removes cursor-hidden class', () => {
    const fnMatch = readerSrc.match(/function showCursor[\s\S]*?\n\}/);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch[0]).toMatch(/cursor-hidden/);
  });
});

describe('mousemove shows cursor and resets timer', () => {
  test('mousemove handler calls showCursor', () => {
    const moveMatch = readerSrc.match(/document\.addEventListener\('mousemove'[\s\S]*?\}\);/);
    expect(moveMatch).not.toBeNull();
    expect(moveMatch[0]).toMatch(/showCursor\(\)/);
  });

  test('mousemove handler calls startCursorHideTimer', () => {
    const moveMatch = readerSrc.match(/document\.addEventListener\('mousemove'[\s\S]*?\}\);/);
    expect(moveMatch).not.toBeNull();
    expect(moveMatch[0]).toMatch(/startCursorHideTimer\(\)/);
  });
});

describe('cursor-hidden only applies in fullscreen', () => {
  test('startCursorHideTimer only hides cursor when in fullscreen-reading', () => {
    const fnMatch = readerSrc.match(/function startCursorHideTimer[\s\S]*?\n\}/);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch[0]).toMatch(/fullscreen-reading/);
  });
});

describe('DOM: cursor-hidden class', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="readerScreen" class="screen active fullscreen-reading">
        <div class="reader-content" id="readerContent"></div>
      </div>
    `;
  });

  test('adding cursor-hidden to readerScreen', () => {
    const screen = document.getElementById('readerScreen');
    screen.classList.add('cursor-hidden');
    expect(screen.classList.contains('cursor-hidden')).toBe(true);
  });

  test('removing cursor-hidden from readerScreen', () => {
    const screen = document.getElementById('readerScreen');
    screen.classList.add('cursor-hidden');
    screen.classList.remove('cursor-hidden');
    expect(screen.classList.contains('cursor-hidden')).toBe(false);
  });
});
