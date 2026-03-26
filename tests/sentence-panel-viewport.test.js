/**
 * TDD Tests: sentence panel viewport-fit positioning.
 *
 * Problem: sentence panel uses a fixed max-height: 60vh which doesn't
 * account for the top bar or varying viewport sizes. On small screens
 * the panel can overflow, and there's no dynamic viewport boundary logic.
 *
 * Fix: dynamically calculate max-height in openSentencePanel() based on
 * available viewport space, ensuring the panel fits within viewport bounds.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('sentence panel viewport-fit positioning', () => {
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

  // ── Dynamic max-height calculation ──────────────────────────────

  test('openSentencePanel calculates available viewport height', () => {
    const fn = js.match(/function openSentencePanel\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // Should reference viewport height (window.innerHeight or similar)
    expect(fn[0]).toMatch(/innerHeight|visualViewport/);
  });

  test('openSentencePanel sets max-height dynamically on the panel', () => {
    const fn = js.match(/function openSentencePanel\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // Should set style.maxHeight based on calculation
    expect(fn[0]).toMatch(/sentencePanel\.style\.maxHeight|style\.maxHeight/);
  });

  test('openSentencePanel accounts for top bar height in calculation', () => {
    const fn = js.match(/function openSentencePanel\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // Should reference the top bar's height (offsetHeight or getBoundingClientRect)
    expect(fn[0]).toMatch(/topBar|top-bar|offsetHeight|getBoundingClientRect/);
  });

  // ── CSS uses max-height as fallback only ────────────────────────

  test('CSS max-height is a fallback (not removed, but overridden by JS)', () => {
    // The CSS should still have a max-height as a safe default
    const rule = css.match(/\.sentence-panel\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule[1]).toMatch(/max-height\s*:/);
  });

  // ── Panel stays fully in viewport ──────────────────────────────

  test('openSentencePanel includes a safety margin in viewport calculation', () => {
    const fn = js.match(/function openSentencePanel\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // Should subtract some margin/padding for the top bar + breathing room
    expect(fn[0]).toMatch(/\-\s*\d+|\-\s*topBar/);
  });

  // ── Resolution-agnostic: no hardcoded pixel breakpoints ─────────

  test('openSentencePanel does not use hardcoded pixel values for max-height', () => {
    const fn = js.match(/function openSentencePanel\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // Should NOT have something like maxHeight = '500px' (hardcoded)
    // Should compute dynamically from viewport dimensions
    expect(fn[0]).not.toMatch(/maxHeight\s*=\s*['"](?:\d{3,})px['"]/);
  });

  // ── Cleanup on close ───────────────────────────────────────────

  test('closeSentencePanel resets max-height style', () => {
    const fn = js.match(/function closeSentencePanel\s*\([^)]*\)\s*\{[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // Should clear the inline maxHeight so CSS default applies next time
    expect(fn[0]).toMatch(/maxHeight\s*=\s*['"]|style\.maxHeight/);
  });
});
