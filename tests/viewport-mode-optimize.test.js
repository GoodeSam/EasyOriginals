/**
 * TDD Tests: optimize reading experience in split-pane viewport mode.
 *
 * Fixes:
 * 1. Content width changes must trigger screen recalculation
 * 2. Touch swipe gestures must navigate between screens
 * 3. Search navigation must find the correct screen instead of scrollIntoView
 * 4. Bookmarks must save/restore screen position
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('viewport mode reading optimizations', () => {
  let js;

  beforeEach(() => {
    js = fs.readFileSync(
      path.resolve(__dirname, '../src/reader.js'),
      'utf-8'
    );
  });

  // ── 1. Content width recalculation ──────────────────────────────

  describe('content width triggers recalcScreens', () => {
    test('changeContentWidth calls recalcScreens', () => {
      const fn = js.match(/function changeContentWidth\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
      expect(fn).not.toBeNull();
      expect(fn[0]).toMatch(/recalcScreens\s*\(/);
    });
  });

  // ── 2. Touch swipe navigation ───────────────────────────────────

  describe('touch swipe screen navigation', () => {
    test('touchstart listener is registered on reader content', () => {
      expect(js).toMatch(/readerContent\.addEventListener\s*\(\s*['"]touchstart['"]/);
    });

    test('touchend listener is registered on reader content', () => {
      expect(js).toMatch(/readerContent\.addEventListener\s*\(\s*['"]touchend['"]/);
    });

    test('swipe handler calls goToScreen', () => {
      // The touchend handler should navigate screens based on swipe direction
      expect(js).toMatch(/touchend[\s\S]{0,500}goToScreen/);
    });

    test('swipe detection tracks touch start X coordinate', () => {
      // Must store the starting X position on touchstart
      expect(js).toMatch(/touch(?:Start|start)X|touches\[0\]\.clientX/);
    });
  });

  // ── 3. Search navigates to correct screen ───────────────────────

  describe('search navigation uses screen-aware positioning', () => {
    test('goToSearchMatch does not use scrollIntoView', () => {
      const fn = js.match(/function goToSearchMatch\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
      expect(fn).not.toBeNull();
      expect(fn[0]).not.toMatch(/scrollIntoView/);
    });

    test('goToSearchMatch navigates to correct screen for the match', () => {
      const fn = js.match(/function goToSearchMatch\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
      expect(fn).not.toBeNull();
      // Should find which screen the match element is on and navigate there
      expect(fn[0]).toMatch(/goToScreen|screenOffsets|offsetTop/);
    });

    test('findScreenForElement helper function exists', () => {
      expect(js).toMatch(/function findScreenForElement\s*\(/);
    });

    test('findScreenForElement uses screenOffsets to determine screen', () => {
      const fn = js.match(/function findScreenForElement\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
      expect(fn).not.toBeNull();
      expect(fn[0]).toMatch(/screenOffsets/);
    });
  });

  // ── 4. Bookmark saves/restores screen position ──────────────────

  describe('bookmarks save and restore screen position', () => {
    test('saveBookmark stores currentScreen', () => {
      const fn = js.match(/function saveBookmark\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
      expect(fn).not.toBeNull();
      expect(fn[0]).toMatch(/currentScreen/);
    });

    test('restoreBookmark uses goToScreen instead of raw scrollTop', () => {
      const fn = js.match(/function restoreBookmark\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
      expect(fn).not.toBeNull();
      expect(fn[0]).toMatch(/goToScreen/);
      // Should not directly set scrollTop for bookmark restore
      expect(fn[0]).not.toMatch(/scrollTop\s*=\s*scrollTop/);
    });
  });
});
