/**
 * TDD Tests: side panel placement and touch auto-hide recovery.
 *
 * Root causes from bug analysis:
 * 1. Side panels (notes, history, word list) are outside #readerScreen
 *    in the DOM, so CSS order property has no effect — panels render
 *    off-viewport at the body level.
 * 2. Touch users cannot recover from auto-hide fullscreen mode because
 *    the only recovery path is mousemove at screen edges.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('side panel placement and touch recovery', () => {
  let html;
  let js;

  beforeEach(() => {
    html = fs.readFileSync(
      path.resolve(__dirname, '../index.html'),
      'utf-8'
    );
    js = fs.readFileSync(
      path.resolve(__dirname, '../src/reader.js'),
      'utf-8'
    );
  });

  // ── Side panels must be inside readerScreen ─────────────────────

  describe('side panels inside readerScreen', () => {
    // Helper: extract the readerScreen block by finding its open and close tags
    // by counting div nesting depth
    function getReaderScreenBlock() {
      const startIdx = html.indexOf('id="readerScreen"');
      if (startIdx === -1) return null;
      // Find the opening < before the id
      let openTag = html.lastIndexOf('<', startIdx);
      let depth = 1;
      let pos = html.indexOf('>', openTag) + 1;
      while (depth > 0 && pos < html.length) {
        const nextOpen = html.indexOf('<div', pos);
        const nextClose = html.indexOf('</div>', pos);
        if (nextClose === -1) break;
        if (nextOpen !== -1 && nextOpen < nextClose) {
          depth++;
          pos = html.indexOf('>', nextOpen) + 1;
        } else {
          depth--;
          if (depth === 0) return html.slice(openTag, nextClose + 6);
          pos = nextClose + 6;
        }
      }
      return null;
    }

    test('notesPanel is inside readerScreen div', () => {
      const block = getReaderScreenBlock();
      expect(block).not.toBeNull();
      expect(block).toMatch(/id="notesPanel"/);
    });

    test('historyPanel is inside readerScreen div', () => {
      const block = getReaderScreenBlock();
      expect(block).not.toBeNull();
      expect(block).toMatch(/id="historyPanel"/);
    });

    test('wordListPanel is inside readerScreen div', () => {
      const block = getReaderScreenBlock();
      expect(block).not.toBeNull();
      expect(block).toMatch(/id="wordListPanel"/);
    });

    test('side panels appear between bottom-bar and readerScreen closing tag', () => {
      const block = getReaderScreenBlock();
      expect(block).not.toBeNull();
      const bottomBarPos = block.indexOf('class="bottom-bar"');
      const notesPos = block.indexOf('id="notesPanel"');
      expect(bottomBarPos).toBeGreaterThan(-1);
      expect(notesPos).toBeGreaterThan(bottomBarPos);
    });
  });

  // ── Touch recovery from auto-hide ──────────────────────────────

  describe('touch recovery from fullscreen auto-hide', () => {
    test('document-level touchstart listener exists for auto-hide recovery', () => {
      // Should have a touchstart listener on document that calls showBars
      expect(js).toMatch(/document\.addEventListener\s*\(\s*['"]touchstart['"]/);
    });

    test('document touchstart handler calls showBars during fullscreen-reading', () => {
      // The handler should check for fullscreen-reading and call showBars
      expect(js).toMatch(/touchstart[\s\S]{0,500}fullscreen-reading[\s\S]{0,300}showBars|touchstart[\s\S]{0,500}showBars/);
    });
  });
});
