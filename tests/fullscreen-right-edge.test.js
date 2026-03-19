/**
 * TDD Tests: right edge should NOT exit fullscreen mode.
 *
 * Only top and bottom screen edges should trigger showBars() and exit
 * fullscreen. The right edge must keep fullscreen active so users can
 * freely move the mouse to the right side without disrupting reading.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

let readerSrc;

beforeEach(() => {
  readerSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/reader.js'), 'utf-8'
  );
});

// ─── Edge detection condition ───────────────────────────────────────

describe('edge detection only uses top and bottom edges', () => {
  test('mousemove handler still computes atTop and atBottom', () => {
    const moveMatch = readerSrc.match(
      /document\.addEventListener\('mousemove'[\s\S]*?\}\);/
    );
    expect(moveMatch).not.toBeNull();
    expect(moveMatch[0]).toMatch(/atTop/);
    expect(moveMatch[0]).toMatch(/atBottom/);
  });

  test('showBars condition uses only atTop || atBottom (no atRight)', () => {
    const moveMatch = readerSrc.match(
      /document\.addEventListener\('mousemove'[\s\S]*?\}\);/
    );
    expect(moveMatch).not.toBeNull();
    const handler = moveMatch[0];
    // The if-condition that calls showBars should be atTop || atBottom only
    const edgeMatch = handler.match(
      /if\s*\(atTop\s*\|\|\s*atBottom\)\s*\{/
    );
    expect(edgeMatch).not.toBeNull();
  });

  test('atRight is NOT part of the showBars condition', () => {
    const moveMatch = readerSrc.match(
      /document\.addEventListener\('mousemove'[\s\S]*?\}\);/
    );
    expect(moveMatch).not.toBeNull();
    const handler = moveMatch[0];
    // Should NOT have atRight in the if-condition with showBars
    const oldPattern = handler.match(
      /if\s*\(atTop\s*\|\|\s*atBottom\s*\|\|\s*atRight\)/
    );
    expect(oldPattern).toBeNull();
  });
});

// ─── Right edge behavior ────────────────────────────────────────────

describe('right edge keeps fullscreen active', () => {
  test('mousemove handler does NOT compute atRight', () => {
    const moveMatch = readerSrc.match(
      /document\.addEventListener\('mousemove'[\s\S]*?\}\);/
    );
    expect(moveMatch).not.toBeNull();
    // atRight variable should not exist in the handler anymore
    expect(moveMatch[0]).not.toMatch(/const atRight/);
  });

  test('right edge movement falls through to startAutoHideTimer (else branch)', () => {
    // With atRight removed, mouse at right edge is just regular movement
    // that hits the else branch → startAutoHideTimer, not showBars
    const moveMatch = readerSrc.match(
      /document\.addEventListener\('mousemove'[\s\S]*?\}\);/
    );
    expect(moveMatch).not.toBeNull();
    const handler = moveMatch[0];
    const elseMatch = handler.match(/\}\s*else\s*\{([\s\S]*?)\}/);
    expect(elseMatch).not.toBeNull();
    expect(elseMatch[1]).toMatch(/startAutoHideTimer\(\)/);
    expect(elseMatch[1]).not.toMatch(/showBars\(\)/);
  });
});

// ─── Top and bottom still work ──────────────────────────────────────

describe('top and bottom edges still exit fullscreen', () => {
  test('mousemove at top or bottom edge calls showBars', () => {
    const moveMatch = readerSrc.match(
      /document\.addEventListener\('mousemove'[\s\S]*?\}\);/
    );
    expect(moveMatch).not.toBeNull();
    const handler = moveMatch[0];
    const edgeMatch = handler.match(
      /if\s*\(atTop\s*\|\|\s*atBottom\)\s*\{([\s\S]*?)\}/
    );
    expect(edgeMatch).not.toBeNull();
    expect(edgeMatch[1]).toMatch(/showBars\(\)/);
  });

  test('mousemove at top or bottom clears auto-hide timer', () => {
    const moveMatch = readerSrc.match(
      /document\.addEventListener\('mousemove'[\s\S]*?\}\);/
    );
    expect(moveMatch).not.toBeNull();
    const handler = moveMatch[0];
    const edgeMatch = handler.match(
      /if\s*\(atTop\s*\|\|\s*atBottom\)\s*\{([\s\S]*?)\}/
    );
    expect(edgeMatch).not.toBeNull();
    expect(edgeMatch[1]).toMatch(/clearAutoHideTimer\(\)/);
  });
});
