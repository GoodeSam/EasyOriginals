/**
 * TDD Tests: split-pane positioning fix.
 *
 * Problem: side panels (notes, history, word list) use position:fixed
 * and overlay reader content, obscuring text when opened.
 *
 * Fix: side panels must participate in the flex layout flow so they
 * push reader-content down instead of covering it. Screen pagination
 * must recalculate when panels open/close.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('split-pane positioning fix', () => {
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

  // ── Side panel no longer uses fixed positioning ─────────────────

  test('side-panel does NOT use position: fixed', () => {
    const rule = css.match(/\.side-panel\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule[1]).not.toMatch(/position\s*:\s*fixed/);
  });

  test('side-panel does NOT use top: 0 for fixed overlay', () => {
    const rule = css.match(/\.side-panel\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule[1]).not.toMatch(/top\s*:\s*0/);
  });

  // ── Flex ordering for proper layout flow ────────────────────────

  test('side-panel has order property for flex layout placement', () => {
    // Side panels should use CSS order to appear above reader-content
    const rule = css.match(/\.side-panel\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule[1]).toMatch(/order\s*:/);
  });

  test('reader-content has order property', () => {
    const rule = css.match(/\.reader-content\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule[1]).toMatch(/order\s*:/);
  });

  test('bottom-bar has order property', () => {
    const rule = css.match(/\.bottom-bar\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule[1]).toMatch(/order\s*:/);
  });

  test('side-panel order is less than reader-content order', () => {
    const panelRule = css.match(/\.side-panel\s*\{([^}]*)\}/);
    const contentRule = css.match(/\.reader-content\s*\{([^}]*)\}/);
    expect(panelRule).not.toBeNull();
    expect(contentRule).not.toBeNull();

    const panelOrder = panelRule[1].match(/order\s*:\s*(\d+)/);
    const contentOrder = contentRule[1].match(/order\s*:\s*(\d+)/);
    expect(panelOrder).not.toBeNull();
    expect(contentOrder).not.toBeNull();
    expect(Number(panelOrder[1])).toBeLessThan(Number(contentOrder[1]));
  });

  // ── Side panel constrains height within flow ────────────────────

  test('side-panel uses max-height to constrain its size', () => {
    const rule = css.match(/\.side-panel\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule[1]).toMatch(/max-height\s*:/);
  });

  // ── Screen recalculation on panel toggle ────────────────────────

  test('notes panel toggle calls recalcScreens', () => {
    // After toggling notes panel, recalcScreens must be called
    expect(js).toMatch(/notesPanel[\s\S]{0,200}recalcScreens|notesToggle[\s\S]{0,200}recalcScreens/);
  });

  test('word list panel toggle calls recalcScreens', () => {
    expect(js).toMatch(/wordListPanel[\s\S]{0,200}recalcScreens|wordListToggle[\s\S]{0,200}recalcScreens/);
  });

  test('history panel toggle calls recalcScreens', () => {
    expect(js).toMatch(/historyPanel[\s\S]{0,200}recalcScreens|historyToggle[\s\S]{0,200}recalcScreens/);
  });

  test('closeAllSidePanels calls recalcScreens', () => {
    const fn = js.match(/function closeAllSidePanels\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/recalcScreens\s*\(/);
  });

  // ── Panel close buttons trigger recalc ──────────────────────────

  test('notes close triggers recalcScreens', () => {
    expect(js).toMatch(/notesClose[\s\S]{0,200}recalcScreens/);
  });

  test('word list close triggers recalcScreens', () => {
    expect(js).toMatch(/wordListClose[\s\S]{0,200}recalcScreens/);
  });

  test('history close triggers recalcScreens', () => {
    expect(js).toMatch(/historyClose[\s\S]{0,200}recalcScreens/);
  });
});
