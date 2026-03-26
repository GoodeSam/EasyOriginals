/**
 * TDD Tests for continuous scrolling reading mode.
 * Verifies that the reader renders all content in a single scrollable stream
 * without page division.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('continuous scroll: rendering', () => {
  let readerSrc;

  beforeEach(() => {
    readerSrc = fs.readFileSync(
      path.resolve(__dirname, '../src/reader.js'),
      'utf-8'
    );
  });

  test('has renderAllContent function that renders all paragraphs', () => {
    expect(readerSrc).toMatch(/function renderAllContent\(/);
  });

  test('state has a flat paragraphs array', () => {
    expect(readerSrc).toMatch(/paragraphs:\s*\[/);
  });

  test('handleFile calls renderAllContent instead of goToPage', () => {
    // Extract handleFile function body
    const handleFileMatch = readerSrc.match(/async function handleFile\(file\)\s*\{([\s\S]*?)\n\}/);
    expect(handleFileMatch).not.toBeNull();
    const body = handleFileMatch[1];
    expect(body).toMatch(/renderAllContent\(/);
    expect(body).not.toMatch(/goToPage\(/);
  });

  test('handleURL calls renderAllContent instead of goToPage', () => {
    const handleURLMatch = readerSrc.match(/async function handleURL\(url\)\s*\{([\s\S]*?)\n\}/);
    expect(handleURLMatch).not.toBeNull();
    const body = handleURLMatch[1];
    expect(body).toMatch(/renderAllContent\(/);
    expect(body).not.toMatch(/goToPage\(/);
  });

  test('renderAllContent iterates over state.paragraphs not state.pages', () => {
    const fnMatch = readerSrc.match(/function renderAllContent\([^)]*\)\s*\{([\s\S]*?)\n\}/);
    expect(fnMatch).not.toBeNull();
    const body = fnMatch[1];
    expect(body).toMatch(/state\.paragraphs/);
    expect(body).not.toMatch(/state\.pages\[/);
  });
});

describe('continuous scroll: no page division', () => {
  let readerSrc;

  beforeEach(() => {
    readerSrc = fs.readFileSync(
      path.resolve(__dirname, '../src/reader.js'),
      'utf-8'
    );
  });

  test('no SENTENCES_PER_PAGE constant', () => {
    expect(readerSrc).not.toMatch(/const SENTENCES_PER_PAGE/);
  });

  test('no paginateParagraphs function', () => {
    expect(readerSrc).not.toMatch(/function paginateParagraphs/);
  });

  test('no goToPage function', () => {
    expect(readerSrc).not.toMatch(/function goToPage/);
  });

  test('no renderPage function', () => {
    expect(readerSrc).not.toMatch(/function renderPage\(/);
  });

  test('no updateNav function', () => {
    expect(readerSrc).not.toMatch(/function updateNav\(/);
  });
});

describe('continuous scroll: bottom bar hidden', () => {
  let indexHtml;

  beforeEach(() => {
    indexHtml = fs.readFileSync(
      path.resolve(__dirname, '../index.html'),
      'utf-8'
    );
  });

  test('bottom bar is removed from reader screen', () => {
    // The bottom-bar with prev/next page buttons should not exist
    expect(indexHtml).not.toMatch(/class="bottom-bar"/);
    expect(indexHtml).not.toMatch(/id="prevPage"/);
    expect(indexHtml).not.toMatch(/id="nextPage"/);
    expect(indexHtml).not.toMatch(/id="pageIndicator"/);
  });
});

describe('continuous scroll: bookmark uses scroll position', () => {
  let readerSrc;

  beforeEach(() => {
    readerSrc = fs.readFileSync(
      path.resolve(__dirname, '../src/reader.js'),
      'utf-8'
    );
  });

  test('saveBookmark stores scrollTop without page index', () => {
    const fnMatch = readerSrc.match(/function saveBookmark\(\)\s*\{([\s\S]*?)\n\}/);
    expect(fnMatch).not.toBeNull();
    const body = fnMatch[1];
    expect(body).toMatch(/scrollTop/);
    expect(body).not.toMatch(/page:/);
  });

  test('restoreBookmark restores scrollTop without goToPage', () => {
    const fnMatch = readerSrc.match(/function restoreBookmark\(\)\s*\{([\s\S]*?)\n\}/);
    expect(fnMatch).not.toBeNull();
    const body = fnMatch[1];
    expect(body).toMatch(/scrollTop/);
    expect(body).not.toMatch(/goToPage/);
  });
});

describe('continuous scroll: search works on all content', () => {
  let readerSrc;

  beforeEach(() => {
    readerSrc = fs.readFileSync(
      path.resolve(__dirname, '../src/reader.js'),
      'utf-8'
    );
  });

  test('search matches use paraIndex and sentIndex without pageIndex', () => {
    const fnMatch = readerSrc.match(/function performSearch[\s\S]*?window\.performSearch/);
    expect(fnMatch).not.toBeNull();
    const body = fnMatch[0];
    expect(body).toMatch(/paraIndex/);
    expect(body).toMatch(/sentIndex/);
    expect(body).not.toMatch(/pageIndex/);
  });

  test('highlightSearchOnPage references state.paragraphs not state.pages', () => {
    const fnMatch = readerSrc.match(/function highlightSearchOnPage[\s\S]*?\n\}/);
    expect(fnMatch).not.toBeNull();
    const body = fnMatch[0];
    expect(body).not.toMatch(/pageIndex/);
  });
});

describe('continuous scroll: keyboard navigation', () => {
  let readerSrc;

  beforeEach(() => {
    readerSrc = fs.readFileSync(
      path.resolve(__dirname, '../src/reader.js'),
      'utf-8'
    );
  });

  test('ArrowLeft/ArrowRight do not trigger page navigation', () => {
    // There should be no goToPage calls for arrow keys
    const keydownSection = readerSrc.match(/document\.addEventListener\('keydown'[\s\S]*?\}\);/);
    expect(keydownSection).not.toBeNull();
    expect(keydownSection[0]).not.toMatch(/goToPage/);
  });

  test('no wheel-based page navigation', () => {
    // The two-phase scroll boundary detection should be removed
    expect(readerSrc).not.toMatch(/boundaryReached/);
    expect(readerSrc).not.toMatch(/WHEEL_NAV_COOLDOWN/);
  });
});

describe('continuous scroll: history uses scroll position', () => {
  let readerSrc;

  beforeEach(() => {
    readerSrc = fs.readFileSync(
      path.resolve(__dirname, '../src/reader.js'),
      'utf-8'
    );
  });

  test('saveReadingHistory stores scrollTop without page', () => {
    const fnMatch = readerSrc.match(/function saveReadingHistory\(\)\s*\{([\s\S]*?)\n\}/);
    expect(fnMatch).not.toBeNull();
    const body = fnMatch[1];
    expect(body).toMatch(/scrollTop/);
    expect(body).not.toMatch(/page:/);
    expect(body).not.toMatch(/totalPages/);
  });
});
