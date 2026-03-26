/**
 * TDD Tests: fix text disappearing after font size change in split-screen mode.
 *
 * Root cause: changeFontSize() calls recalcScreens() synchronously after
 * applyFontSize(). The browser hasn't reflowed the DOM yet, so paragraph
 * offsetTop/offsetHeight values still reflect the OLD font size. Screen
 * offsets are computed from stale dimensions, causing text to disappear.
 *
 * Fix: defer recalcScreens() to after browser reflow using
 * requestAnimationFrame. Same issue applies to changeContentWidth().
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('font size change recalculation timing', () => {
  let js;

  beforeEach(() => {
    js = fs.readFileSync(
      path.resolve(__dirname, '../src/reader.js'),
      'utf-8'
    );
  });

  // ── changeFontSize defers recalcScreens ─────────────────────────

  test('changeFontSize uses requestAnimationFrame before recalcScreens', () => {
    const fn = js.match(/function changeFontSize\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // Must defer recalcScreens via requestAnimationFrame
    expect(fn[0]).toMatch(/requestAnimationFrame/);
  });

  test('changeFontSize does NOT call recalcScreens synchronously', () => {
    const fn = js.match(/function changeFontSize\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // The direct synchronous call pattern should not exist
    // recalcScreens should only appear inside the rAF callback
    const withoutRaf = fn[0].replace(/requestAnimationFrame\s*\(\s*\(\)\s*=>\s*\{[^}]*\}\s*\)/g, '');
    expect(withoutRaf).not.toMatch(/recalcScreens\s*\(/);
  });

  // ── changeContentWidth defers recalcScreens ─────────────────────

  test('changeContentWidth uses requestAnimationFrame before recalcScreens', () => {
    const fn = js.match(/function changeContentWidth\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/requestAnimationFrame/);
  });

  test('changeContentWidth does NOT call recalcScreens synchronously', () => {
    const fn = js.match(/function changeContentWidth\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    const withoutRaf = fn[0].replace(/requestAnimationFrame\s*\(\s*\(\)\s*=>\s*\{[^}]*\}\s*\)/g, '');
    expect(withoutRaf).not.toMatch(/recalcScreens\s*\(/);
  });

  // ── recalcScreens still called from renderPage (synchronous OK) ─

  test('renderPage still calls recalcScreens synchronously (layout already settled)', () => {
    const fn = js.match(/function renderPage\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/recalcScreens\s*\(/);
  });
});
