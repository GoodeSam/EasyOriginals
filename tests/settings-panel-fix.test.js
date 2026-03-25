/**
 * TDD Tests: fix unresponsive settings icon.
 *
 * Root cause: settings panel is appended to document.body instead of
 * #readerScreen, so it renders outside the 100vh flex layout and is
 * invisible when toggled. Also missing recalcScreens on toggle/close.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('settings panel fix', () => {
  let js;

  beforeEach(() => {
    js = fs.readFileSync(
      path.resolve(__dirname, '../src/reader.js'),
      'utf-8'
    );
  });

  // ── Panel appended to readerScreen, not body ────────────────────

  test('bindSettingsPanel appends panel to readerScreen, not document.body', () => {
    const fn = js.match(/function bindSettingsPanel\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // Should NOT append to document.body
    expect(fn[0]).not.toMatch(/document\.body\.appendChild/);
    // Should append to readerScreen
    expect(fn[0]).toMatch(/readerScreen\.appendChild/);
  });

  // ── Toggle triggers recalcScreens ───────────────────────────────

  test('settings toggle calls recalcScreens after toggling panel', () => {
    const fn = js.match(/function bindSettingsPanel\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/recalcScreens\s*\(/);
  });

  // ── Settings close button in settings-ui.js also recalcs ────────

  test('settings panel close handler exists in bindSettingsPanel', () => {
    const fn = js.match(/function bindSettingsPanel\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // The close button handler should be in bindSettingsPanel or settings-ui
    // At minimum, bindSettingsPanel should handle recalcScreens on close
    expect(fn[0]).toMatch(/settingsClose|panel.*remove.*active/);
  });
});
