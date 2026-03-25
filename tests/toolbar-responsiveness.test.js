/**
 * TDD Tests: fix unresponsive toolbar icons.
 *
 * Root causes:
 * 1. Top-bar has no z-index, so side panels (z-index:160) paint on
 *    top of it in the flex stacking context, blocking clicks.
 * 2. Word list and history toggle listeners are at module scope
 *    without null guards — fragile and inconsistent with other buttons.
 *
 * Fixes:
 * - Add z-index to top-bar and search-bar above side panels
 * - Move word list and history panel listeners into bindToolbarEvents
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('toolbar icon responsiveness fixes', () => {
  let css;
  let js;

  beforeEach(() => {
    css = fs.readFileSync(
      path.resolve(__dirname, '../src/reader.css'),
      'utf-8'
    );
    js = fs.readFileSync(
      path.resolve(__dirname, '../src/reader.js'),
      'utf-8'
    );
  });

  // ── Z-index stacking: top-bar above side panels ─────────────────

  describe('z-index stacking', () => {
    test('top-bar has a z-index defined', () => {
      const rule = css.match(/\.top-bar\s*\{([^}]*)\}/);
      expect(rule).not.toBeNull();
      expect(rule[1]).toMatch(/z-index\s*:/);
    });

    test('top-bar z-index is higher than side-panel z-index', () => {
      const topBarRule = css.match(/\.top-bar\s*\{([^}]*)\}/);
      const sidePanelRule = css.match(/\.side-panel\s*\{([^}]*)\}/);
      expect(topBarRule).not.toBeNull();
      expect(sidePanelRule).not.toBeNull();

      const topBarZ = topBarRule[1].match(/z-index\s*:\s*(\d+)/);
      const sidePanelZ = sidePanelRule[1].match(/z-index\s*:\s*(\d+)/);
      expect(topBarZ).not.toBeNull();
      expect(sidePanelZ).not.toBeNull();
      expect(Number(topBarZ[1])).toBeGreaterThan(Number(sidePanelZ[1]));
    });

    test('search-bar has a z-index defined', () => {
      const rule = css.match(/\.search-bar\s*\{([^}]*)\}/);
      expect(rule).not.toBeNull();
      expect(rule[1]).toMatch(/z-index\s*:/);
    });

    test('search-bar z-index is higher than side-panel z-index', () => {
      const searchRule = css.match(/\.search-bar\s*\{([^}]*)\}/);
      const sidePanelRule = css.match(/\.side-panel\s*\{([^}]*)\}/);
      expect(searchRule).not.toBeNull();
      expect(sidePanelRule).not.toBeNull();

      const searchZ = searchRule[1].match(/z-index\s*:\s*(\d+)/);
      const sidePanelZ = sidePanelRule[1].match(/z-index\s*:\s*(\d+)/);
      expect(searchZ).not.toBeNull();
      expect(sidePanelZ).not.toBeNull();
      expect(Number(searchZ[1])).toBeGreaterThan(Number(sidePanelZ[1]));
    });

    test('bottom-bar has a z-index defined', () => {
      const rule = css.match(/\.bottom-bar\s*\{([^}]*)\}/);
      expect(rule).not.toBeNull();
      expect(rule[1]).toMatch(/z-index\s*:/);
    });
  });

  // ── Panel listeners inside bindToolbarEvents ────────────────────

  describe('panel toggle listeners in bindToolbarEvents', () => {
    test('wordListToggle listener is inside bindToolbarEvents', () => {
      const fn = js.match(/function bindToolbarEvents\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
      expect(fn).not.toBeNull();
      expect(fn[0]).toMatch(/wordListToggle/);
    });

    test('wordListClose listener is inside bindToolbarEvents', () => {
      const fn = js.match(/function bindToolbarEvents\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
      expect(fn).not.toBeNull();
      expect(fn[0]).toMatch(/wordListClose/);
    });

    test('historyToggle listener is inside bindToolbarEvents', () => {
      const fn = js.match(/function bindToolbarEvents\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
      expect(fn).not.toBeNull();
      expect(fn[0]).toMatch(/historyToggle/);
    });

    test('historyClose listener is inside bindToolbarEvents', () => {
      const fn = js.match(/function bindToolbarEvents\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
      expect(fn).not.toBeNull();
      expect(fn[0]).toMatch(/historyClose/);
    });

    test('wordListExport listener is inside bindToolbarEvents', () => {
      const fn = js.match(/function bindToolbarEvents\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
      expect(fn).not.toBeNull();
      expect(fn[0]).toMatch(/wordListExport/);
    });

    test('historyClear listener is inside bindToolbarEvents', () => {
      const fn = js.match(/function bindToolbarEvents\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
      expect(fn).not.toBeNull();
      expect(fn[0]).toMatch(/historyClear/);
    });
  });

  // ── No module-scope panel listeners ─────────────────────────────

  describe('no unsafe module-scope panel listeners', () => {
    test('wordListToggle.addEventListener is NOT at module scope', () => {
      // Remove the function body of bindToolbarEvents and check
      // that wordListToggle.addEventListener doesn't appear outside it
      const withoutBindToolbar = js.replace(
        /function bindToolbarEvents\s*\([^)]*\)\s*\{[\s\S]*?\n\}/,
        ''
      );
      expect(withoutBindToolbar).not.toMatch(/wordListToggle\.addEventListener/);
    });

    test('historyToggle.addEventListener is NOT at module scope', () => {
      const withoutBindToolbar = js.replace(
        /function bindToolbarEvents\s*\([^)]*\)\s*\{[\s\S]*?\n\}/,
        ''
      );
      expect(withoutBindToolbar).not.toMatch(/historyToggle\.addEventListener/);
    });
  });
});
