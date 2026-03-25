/**
 * TDD Tests: fix 5 screen pagination bugs identified by analysis.
 *
 * 1. offsetTop must be relative to readerContent (use helper)
 * 2. Oversized paragraphs (taller than viewport) must get sub-screen breaks
 * 3. Search bar open/close must trigger recalcScreens
 * 4. goToScreen prev-page must not access screenOffsets[-1]
 * 5. findScreenForElement must walk up to nearest .paragraph for reliable offset
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('screen pagination bug fixes', () => {
  let js;

  beforeEach(() => {
    js = fs.readFileSync(
      path.resolve(__dirname, '../src/reader.js'),
      'utf-8'
    );
  });

  // ── 1. offsetTop reliability ────────────────────────────────────

  describe('offsetTop relative to readerContent', () => {
    test('recalcScreens computes offset relative to readerContent scrollTop coordinate', () => {
      const fn = js.match(/function recalcScreens\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
      expect(fn).not.toBeNull();
      // Should account for offsetParent chain or use a helper that normalizes to readerContent
      // At minimum, should reference readerContent's offset or use getBoundingClientRect
      expect(fn[0]).toMatch(/readerContent\.offsetTop|readerContent\.getBoundingClientRect|offsetParent|scrollTop\s*\+/);
    });
  });

  // ── 2. Oversized paragraph handling ─────────────────────────────

  describe('oversized paragraphs get sub-screen breaks', () => {
    test('recalcScreens handles paragraphs taller than viewport', () => {
      const fn = js.match(/function recalcScreens\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
      expect(fn).not.toBeNull();
      // Should have logic for when a single paragraph exceeds viewport height
      // This means creating additional screen breaks within a paragraph
      expect(fn[0]).toMatch(/offsetHeight\s*>\s*viewportH|pHeight\s*>\s*viewportH|taller|oversized|> viewportH/);
    });
  });

  // ── 3. Search bar recalculation ─────────────────────────────────

  describe('search bar triggers recalcScreens', () => {
    test('openSearch calls recalcScreens', () => {
      const fn = js.match(/function openSearch\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
      expect(fn).not.toBeNull();
      expect(fn[0]).toMatch(/recalcScreens\s*\(/);
    });

    test('closeSearch calls recalcScreens', () => {
      const fn = js.match(/function closeSearch\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
      expect(fn).not.toBeNull();
      expect(fn[0]).toMatch(/recalcScreens\s*\(/);
    });
  });

  // ── 4. No sentinel -1 access on screenOffsets ───────────────────

  describe('goToScreen prev-page has no invalid array access', () => {
    test('goToScreen does not set currentScreen to -1 before renderPage', () => {
      const fn = js.match(/function goToScreen\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
      expect(fn).not.toBeNull();
      // Should NOT have currentScreen = -1 sentinel
      expect(fn[0]).not.toMatch(/currentScreen\s*=\s*-1/);
    });
  });

  // ── 5. findScreenForElement walks to paragraph ──────────────────

  describe('findScreenForElement uses paragraph offset', () => {
    test('findScreenForElement finds closest paragraph ancestor', () => {
      const fn = js.match(/function findScreenForElement\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
      expect(fn).not.toBeNull();
      // Should use closest('.paragraph') or walk up to paragraph element
      expect(fn[0]).toMatch(/closest\s*\(\s*['"]\.paragraph['"]\)|paragraph/);
    });
  });
});
