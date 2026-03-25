/**
 * TDD Tests: viewport-based screen pagination.
 *
 * Replace vertical scroll navigation with left/right screen-based
 * navigation that divides content into screens matching viewport height.
 * Recalculate pagination dynamically when window or font size changes.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('viewport-based screen pagination', () => {
  let js;
  let css;

  beforeEach(() => {
    js = fs.readFileSync(
      path.resolve(__dirname, '../src/reader.js'),
      'utf-8'
    );
    css = fs.readFileSync(
      path.resolve(__dirname, '../src/reader.css'),
      'utf-8'
    );
  });

  // ── State ───────────────────────────────────────────────────────

  test('state includes currentScreen property', () => {
    expect(js).toMatch(/state\s*=\s*\{[\s\S]*?currentScreen\s*:/);
  });

  test('state includes totalScreens property', () => {
    expect(js).toMatch(/state\s*=\s*\{[\s\S]*?totalScreens\s*:/);
  });

  // ── Core functions ──────────────────────────────────────────────

  test('recalcScreens function is defined', () => {
    expect(js).toMatch(/function recalcScreens\s*\(/);
  });

  test('recalcScreens calculates totalScreens from scrollHeight and clientHeight', () => {
    const fn = js.match(/function recalcScreens\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/scrollHeight/);
    expect(fn[0]).toMatch(/clientHeight/);
  });

  test('recalcScreens clamps currentScreen within bounds', () => {
    const fn = js.match(/function recalcScreens\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // Should ensure currentScreen doesn't exceed totalScreens - 1
    expect(fn[0]).toMatch(/currentScreen/);
    expect(fn[0]).toMatch(/Math\.min|clamp|totalScreens\s*-\s*1/);
  });

  test('goToScreen function is defined', () => {
    expect(js).toMatch(/function goToScreen\s*\(/);
  });

  test('goToScreen sets scrollTop based on screen index and clientHeight', () => {
    const fn = js.match(/function goToScreen\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/scrollTop/);
    expect(fn[0]).toMatch(/clientHeight/);
  });

  test('goToScreen navigates to next page when beyond last screen', () => {
    const fn = js.match(/function goToScreen\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // Should call goToPage when screen exceeds bounds
    expect(fn[0]).toMatch(/goToPage/);
  });

  // ── renderPage integration ──────────────────────────────────────

  test('renderPage calls recalcScreens', () => {
    const fn = js.match(/function renderPage\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/recalcScreens\s*\(/);
  });

  // ── CSS changes ─────────────────────────────────────────────────

  test('reader-content uses overflow hidden instead of auto', () => {
    const rule = css.match(/\.reader-content\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule[1]).toMatch(/overflow(?:-y)?\s*:\s*hidden/);
  });

  // ── Arrow key navigation ────────────────────────────────────────

  test('ArrowLeft calls goToScreen for screen navigation', () => {
    expect(js).toMatch(/ArrowLeft.*goToScreen|goToScreen.*ArrowLeft/s);
  });

  test('ArrowRight calls goToScreen for screen navigation', () => {
    expect(js).toMatch(/ArrowRight.*goToScreen|goToScreen.*ArrowRight/s);
  });

  test('ArrowUp and ArrowDown are removed or repurposed (no manual scrollTop +=)', () => {
    // The old manual scroll increments should be gone
    expect(js).not.toMatch(/ArrowDown[\s\S]{0,100}scrollTop\s*\+=\s*80/);
    expect(js).not.toMatch(/ArrowUp[\s\S]{0,100}scrollTop\s*-=\s*80/);
  });

  // ── Wheel navigation ───────────────────────────────────────────

  test('wheel handler calls goToScreen for screen-level navigation', () => {
    // The wheel handler should navigate screens, not just pages
    expect(js).toMatch(/wheel[\s\S]*?goToScreen/);
  });

  // ── Dynamic recalculation ───────────────────────────────────────

  test('resize event triggers recalcScreens', () => {
    expect(js).toMatch(/resize[\s\S]{0,200}recalcScreens|recalcScreens[\s\S]{0,200}resize/);
  });

  test('changeFontSize triggers recalcScreens', () => {
    const fn = js.match(/function changeFontSize\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/recalcScreens\s*\(/);
  });

  // ── Navigation display ─────────────────────────────────────────

  test('updateNav shows screen position within page', () => {
    const fn = js.match(/function updateNav\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/currentScreen|totalScreens/);
  });

  // ── goToPage resets screen ──────────────────────────────────────

  test('goToPage resets currentScreen to 0', () => {
    const fn = js.match(/function goToPage\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/currentScreen\s*=\s*0/);
  });
});
