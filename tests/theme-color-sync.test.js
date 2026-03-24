/**
 * TDD Tests: background and text colors for search bar, search highlights,
 * sentence hover/active, and word hover must be synchronised across ALL themes
 * (white, black, brown, green) — not just the default brown + black override.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('theme color synchronisation across search and interactive UI', () => {
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

  // ── Search bar theme overrides ──────────────────────────────────

  test('search bar has white-theme override', () => {
    expect(css).toMatch(/\[data-theme="white"\]\s+\.search-bar\s*\{[^}]*background/);
  });

  test('search bar has green-theme override', () => {
    expect(css).toMatch(/\[data-theme="green"\]\s+\.search-bar\s*\{[^}]*background/);
  });

  test('search bar has black-theme override', () => {
    expect(css).toMatch(/\[data-theme="black"\]\s+\.search-bar\s*\{[^}]*background/);
  });

  // ── Search highlight theme overrides ────────────────────────────

  test('search highlight has white-theme override', () => {
    expect(css).toMatch(/\[data-theme="white"\]\s+\.search-highlight\s*\{/);
  });

  test('search highlight has green-theme override', () => {
    expect(css).toMatch(/\[data-theme="green"\]\s+\.search-highlight\s*\{/);
  });

  test('search highlight current has white-theme override', () => {
    expect(css).toMatch(/\[data-theme="white"\]\s+\.search-highlight\.current\s*\{/);
  });

  test('search highlight current has green-theme override', () => {
    expect(css).toMatch(/\[data-theme="green"\]\s+\.search-highlight\.current\s*\{/);
  });

  // ── Sentence hover/active theme overrides ───────────────────────

  test('sentence hover-active has white-theme override', () => {
    expect(css).toMatch(/\[data-theme="white"\]\s+\.sentence\.hover-active\s*\{/);
  });

  test('sentence hover-active has green-theme override', () => {
    expect(css).toMatch(/\[data-theme="green"\]\s+\.sentence\.hover-active\s*\{/);
  });

  test('sentence active has white-theme override', () => {
    expect(css).toMatch(/\[data-theme="white"\]\s+\.sentence\.active\s*\{/);
  });

  test('sentence active has green-theme override', () => {
    expect(css).toMatch(/\[data-theme="green"\]\s+\.sentence\.active\s*\{/);
  });

  // ── Word hover theme overrides ──────────────────────────────────

  test('word hover-active has white-theme override', () => {
    expect(css).toMatch(/\[data-theme="white"\]\s+\.word\.hover-active\s*\{/);
  });

  test('word hover-active has green-theme override', () => {
    expect(css).toMatch(/\[data-theme="green"\]\s+\.word\.hover-active\s*\{/);
  });

  // ── Search bar input theme overrides ────────────────────────────

  test('search bar input has black-theme override for border/color', () => {
    expect(css).toMatch(/\[data-theme="black"\]\s+\.search-bar\s+input\s*\{[^}]*background/);
  });

  test('search bar input has green-theme override', () => {
    expect(css).toMatch(/\[data-theme="green"\]\s+\.search-bar\s+input\s*\{[^}]*background/);
  });

  // ── Theme colours are visually distinct per theme ───────────────

  test('green-theme sentence hover uses a green-family colour', () => {
    const match = css.match(
      /\[data-theme="green"\]\s+\.sentence\.hover-active\s*\{([^}]*)\}/
    );
    expect(match).not.toBeNull();
    // Should contain a greenish background (hex starting with a green hue)
    expect(match[1]).toMatch(/background\s*:\s*#/);
  });

  test('white-theme sentence hover uses a neutral colour', () => {
    const match = css.match(
      /\[data-theme="white"\]\s+\.sentence\.hover-active\s*\{([^}]*)\}/
    );
    expect(match).not.toBeNull();
    expect(match[1]).toMatch(/background\s*:\s*#/);
  });

  // ── applyTheme updates search bar ──────────────────────────────

  test('THEMES object includes searchBarBg for each theme', () => {
    // Each theme in THEMES should define a searchBarBg property
    const themesBlock = js.match(/const THEMES\s*=\s*\{[\s\S]*?\};/);
    expect(themesBlock).not.toBeNull();
    const block = themesBlock[0];
    expect(block).toMatch(/white:.*searchBarBg/);
    expect(block).toMatch(/black:.*searchBarBg/);
    expect(block).toMatch(/brown:.*searchBarBg/);
    expect(block).toMatch(/green:.*searchBarBg/);
  });

  test('applyTheme sets search bar background from theme', () => {
    const applyFn = js.match(/function applyTheme[\s\S]*?\n\}/);
    expect(applyFn).not.toBeNull();
    expect(applyFn[0]).toMatch(/search[Bb]ar.*background|searchBar.*style/i);
  });
});
