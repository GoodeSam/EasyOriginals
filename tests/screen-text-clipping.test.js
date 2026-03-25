/**
 * TDD Tests: fix text clipping in multi-screen pagination.
 *
 * Problem: recalcScreens divides scrollHeight/clientHeight evenly and
 * goToScreen sets scrollTop = index * clientHeight. This splits text
 * mid-line at screen boundaries, clipping paragraphs.
 *
 * Fix: compute screen break offsets at paragraph boundaries so each
 * screen starts at a complete paragraph. Store offsets in state and
 * use them for navigation.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('paragraph-aware screen pagination (no text clipping)', () => {
  let js;

  beforeEach(() => {
    js = fs.readFileSync(
      path.resolve(__dirname, '../src/reader.js'),
      'utf-8'
    );
  });

  // ── State stores screen offsets ─────────────────────────────────

  test('state includes screenOffsets array', () => {
    expect(js).toMatch(/state\s*=\s*\{[\s\S]*?screenOffsets\s*:/);
  });

  // ── recalcScreens builds offsets from paragraph positions ───────

  test('recalcScreens iterates paragraph elements', () => {
    const fn = js.match(/function recalcScreens\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // Must query paragraph elements to measure their positions
    expect(fn[0]).toMatch(/\.paragraph|querySelectorAll|children/);
  });

  test('recalcScreens uses offsetTop or getBoundingClientRect for paragraph positions', () => {
    const fn = js.match(/function recalcScreens\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/offsetTop|getBoundingClientRect|offsetHeight/);
  });

  test('recalcScreens populates screenOffsets array', () => {
    const fn = js.match(/function recalcScreens\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/screenOffsets/);
  });

  test('recalcScreens sets totalScreens from screenOffsets length', () => {
    const fn = js.match(/function recalcScreens\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // totalScreens should be derived from screenOffsets.length
    expect(fn[0]).toMatch(/totalScreens\s*=\s*.*screenOffsets\.length|screenOffsets\.length/);
  });

  test('screenOffsets always starts with 0 (first screen at top)', () => {
    const fn = js.match(/function recalcScreens\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // The offsets array should be initialized with [0] or have 0 pushed first
    expect(fn[0]).toMatch(/\[0\]|push\(0\)|screenOffsets\s*=\s*\[0/);
  });

  // ── goToScreen uses screenOffsets ───────────────────────────────

  test('goToScreen uses screenOffsets instead of index * clientHeight', () => {
    const fn = js.match(/function goToScreen\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/screenOffsets/);
    // Should NOT multiply index by clientHeight for scrollTop
    expect(fn[0]).not.toMatch(/screenIndex\s*\*\s*.*clientHeight/);
  });

  // ── Previous page navigates to last screen using offsets ────────

  test('goToScreen previous-page path uses screenOffsets for last screen', () => {
    const fn = js.match(/function goToScreen\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // When going to previous page's last screen, should use screenOffsets
    expect(fn[0]).toMatch(/screenOffsets/);
  });

  // ── recalcScreens clamps and preserves position ─────────────────

  test('recalcScreens clamps currentScreen to valid range', () => {
    const fn = js.match(/function recalcScreens\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/Math\.min|currentScreen.*totalScreens|clamp/);
  });

  test('recalcScreens applies scrollTop from screenOffsets for current screen', () => {
    const fn = js.match(/function recalcScreens\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // After recalculating, should set scrollTop to the offset for currentScreen
    expect(fn[0]).toMatch(/scrollTop\s*=\s*.*screenOffsets/);
  });
});
