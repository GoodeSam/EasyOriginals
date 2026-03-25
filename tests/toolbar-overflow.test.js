/**
 * TDD Tests: toolbar icon overflow fix.
 *
 * Problem: .top-bar-actions is a single non-wrapping flex row with 15+
 * items. On most viewport widths, rightmost icons (history, export,
 * settings, help, account) overflow the viewport edge and become
 * invisible and unclickable.
 *
 * Fix: allow the toolbar actions to wrap so all icons remain accessible.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('toolbar icon overflow fix', () => {
  let css;

  beforeEach(() => {
    css = fs.readFileSync(
      path.resolve(__dirname, '../src/reader.css'),
      'utf-8'
    );
  });

  // ── Flex wrap on toolbar actions ────────────────────────────────

  test('top-bar-actions uses flex-wrap: wrap', () => {
    const rule = css.match(/\.top-bar-actions\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule[1]).toMatch(/flex-wrap\s*:\s*wrap/);
  });

  // ── Top bar allows height growth ───────────────────────────────

  test('top-bar does not have a fixed height', () => {
    const rule = css.match(/\.top-bar\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    // Should NOT have a fixed height that would clip wrapped rows
    expect(rule[1]).not.toMatch(/\bheight\s*:\s*\d+px/);
  });

  test('top-bar does not use overflow hidden', () => {
    const rule = css.match(/\.top-bar\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule[1]).not.toMatch(/overflow\s*:\s*hidden/);
  });

  // ── Top bar actions allows overflow to be visible ───────────────

  test('top-bar-actions does not clip content with overflow hidden', () => {
    const rule = css.match(/\.top-bar-actions\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule[1]).not.toMatch(/overflow\s*:\s*hidden/);
  });

  // ── Recalculate screens when top bar height changes ─────────────

  test('top-bar uses flex-shrink: 0 so it does not compress', () => {
    const rule = css.match(/\.top-bar\s*\{([^}]*)\}/);
    expect(rule).not.toBeNull();
    expect(rule[1]).toMatch(/flex-shrink\s*:\s*0/);
  });
});
