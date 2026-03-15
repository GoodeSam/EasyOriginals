/**
 * TDD Test: word popup width is 680px (doubled from 340px).
 */
import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('word popup width', () => {
  test('.word-popup width is 680px', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../src/reader.css'), 'utf-8');
    const match = css.match(/\.word-popup\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match[1]).toMatch(/width:\s*min\(680px/);
  });
});
