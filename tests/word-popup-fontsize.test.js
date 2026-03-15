/**
 * TDD Tests: word lookup popup text matches the editor's font size.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

let readerSrc, css;

beforeEach(() => {
  readerSrc = fs.readFileSync(path.resolve(__dirname, '../src/reader.js'), 'utf-8');
  css = fs.readFileSync(path.resolve(__dirname, '../src/reader.css'), 'utf-8');
});

describe('word popup uses CSS custom property for font size', () => {
  test('applyFontSize sets --reader-font-size custom property', () => {
    const fnMatch = readerSrc.match(/function applyFontSize[\s\S]*?\n\}/);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch[0]).toMatch(/--reader-font-size/);
  });

  test('.def-text uses var(--reader-font-size) for font-size', () => {
    const defTextMatch = css.match(/\.def-text\s*\{([^}]*)\}/);
    expect(defTextMatch).not.toBeNull();
    expect(defTextMatch[1]).toMatch(/font-size:\s*var\(--reader-font-size/);
  });

  test('.word-popup-word uses var(--reader-font-size) scaled up', () => {
    // The looked-up word heading should be larger than the definition text
    const match = css.match(/\.word-popup-word\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match[1]).toMatch(/font-size:\s*calc\(var\(--reader-font-size/);
  });

  test('.def-loading uses var(--reader-font-size)', () => {
    const match = css.match(/\.def-loading\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match[1]).toMatch(/font-size:\s*var\(--reader-font-size/);
  });

  test('.def-cn-text inherits font-size from .def-text (no override)', () => {
    const match = css.match(/\.def-cn-text\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    // Should NOT have its own font-size (inherits from .def-text)
    expect(match[1]).not.toMatch(/font-size/);
  });

  test('.def-pronunciation uses var(--reader-font-size)', () => {
    const match = css.match(/\.def-pronunciation\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match[1]).toMatch(/font-size:\s*var\(--reader-font-size/);
  });
});

describe('custom property is set on document element', () => {
  test('applyFontSize sets the property on documentElement or readerScreen', () => {
    const fnMatch = readerSrc.match(/function applyFontSize[\s\S]*?\n\}/);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch[0]).toMatch(/setProperty.*--reader-font-size/);
  });
});

describe('.pos-tag scales with reader font size', () => {
  test('.pos-tag uses var(--reader-font-size)', () => {
    const match = css.match(/\.pos-tag\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match[1]).toMatch(/font-size:\s*var\(--reader-font-size/);
  });
});
