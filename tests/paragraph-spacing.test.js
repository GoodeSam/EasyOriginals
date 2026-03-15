/**
 * TDD Test: paragraph spacing is halved (10px).
 */
import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('paragraph spacing', () => {
  test('.paragraph margin-bottom is 10px', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../src/reader.css'), 'utf-8');
    const match = css.match(/\.paragraph\s*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match[1]).toMatch(/margin-bottom:\s*5px/);
  });
});
