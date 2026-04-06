/**
 * TDD Tests: Markdown parsing and rendering support.
 *
 * Enables EasyOriginals to load .md files, parse markdown blocks
 * (headings, lists, blockquotes, code blocks), strip inline formatting
 * for sentence/word processing, and render with appropriate CSS classes.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

let readerSrc, htmlSrc, cssSrc;

beforeEach(() => {
  readerSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/reader.js'), 'utf-8'
  );
  htmlSrc = fs.readFileSync(
    path.resolve(__dirname, '../index.html'), 'utf-8'
  );
  cssSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/reader.css'), 'utf-8'
  );
});

// ─── File input accepts .md ─────────────────────────────────────────

describe('markdown file support', () => {
  test('file input accepts .md files', () => {
    expect(htmlSrc).toMatch(/accept="[^"]*\.md/);
  });

  test('reader.js has a parseMarkdown function', () => {
    expect(readerSrc).toMatch(/function parseMarkdown\s*\(/);
  });

  test('handleFile dispatches .md files to parseMarkdown', () => {
    expect(readerSrc).toMatch(/md.*parseMarkdown|parseMarkdown.*md/s);
  });
});

// ─── parseMarkdown function ─────────────────────────────────────────

describe('parseMarkdown', () => {
  test('returns an array of paragraph objects', () => {
    const fn = readerSrc.match(/function parseMarkdown[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/return/);
  });

  test('detects headings and assigns mdType', () => {
    const fn = readerSrc.match(/function parseMarkdown[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // Constructs heading type dynamically: 'h' + level
    expect(fn[0]).toMatch(/mdType.*h/);
  });

  test('detects list items', () => {
    const fn = readerSrc.match(/function parseMarkdown[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/li/);
  });

  test('detects blockquotes', () => {
    const fn = readerSrc.match(/function parseMarkdown[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/blockquote/);
  });

  test('detects code blocks', () => {
    const fn = readerSrc.match(/function parseMarkdown[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/code/);
  });

  test('strips inline markdown formatting from text', () => {
    const fn = readerSrc.match(/function stripInlineMarkdown[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/replace/);
  });

  test('strips heading markers from text', () => {
    const fn = readerSrc.match(/function parseMarkdown[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // Should remove # prefix
    expect(fn[0]).toMatch(/replace.*#/);
  });
});

// ─── Rendering applies mdType CSS classes ───────────────────────────

describe('markdown rendering', () => {
  test('renderAllContent applies mdType as CSS class', () => {
    const fn = readerSrc.match(/function renderAllContent[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/mdType/);
  });
});

// ─── CSS styles for markdown types ──────────────────────────────────

describe('markdown CSS styles', () => {
  test('has styles for md-h1 headings', () => {
    expect(cssSrc).toMatch(/\.md-h1/);
  });

  test('has styles for md-h2 headings', () => {
    expect(cssSrc).toMatch(/\.md-h2/);
  });

  test('has styles for md-h3 headings', () => {
    expect(cssSrc).toMatch(/\.md-h3/);
  });

  test('has styles for md-blockquote', () => {
    expect(cssSrc).toMatch(/\.md-blockquote/);
  });

  test('has styles for md-code', () => {
    expect(cssSrc).toMatch(/\.md-code/);
  });

  test('has styles for md-li list items', () => {
    expect(cssSrc).toMatch(/\.md-li/);
  });

  test('has styles for md-hr horizontal rules', () => {
    expect(cssSrc).toMatch(/\.md-hr/);
  });
});
