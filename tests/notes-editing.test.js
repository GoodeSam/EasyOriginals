/**
 * TDD Tests for enhanced Notes feature:
 * - Note buttons in word popup, sentence panel, and paragraph popup
 * - Editable notes in the notes panel
 * - updateNote function
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Note buttons in popups and panels', () => {
  let indexHtml;

  beforeEach(() => {
    indexHtml = fs.readFileSync(
      path.resolve(__dirname, '../index.html'),
      'utf-8'
    );
  });

  test('sentence panel has a Note button', () => {
    const start = indexHtml.indexOf('id="sentencePanel"');
    const end = indexHtml.indexOf('</div>\n\n', start);
    const panel = indexHtml.slice(start, end);
    expect(panel).toMatch(/id="btnNote"/);
    expect(panel).toMatch(/Note/);
  });

  test('paragraph popup has a Note button', () => {
    const start = indexHtml.indexOf('id="paraPopup"');
    const end = indexHtml.indexOf('</div>\n\n', start);
    const popup = indexHtml.slice(start, end);
    expect(popup).toMatch(/id="paraNoteBtn"/);
    expect(popup).toMatch(/Note/);
  });

  test('word popup has a Note button', () => {
    const start = indexHtml.indexOf('id="wordPopup"');
    const end = indexHtml.indexOf('</div>\n\n', start);
    const popup = indexHtml.slice(start, end);
    expect(popup).toMatch(/id="wordNoteBtn"/);
    expect(popup).toMatch(/Note/);
  });

  test('Note buttons use btn btn-sm class', () => {
    expect(indexHtml).toMatch(/<button[^>]*class="btn btn-sm"[^>]*id="btnNote"/);
    expect(indexHtml).toMatch(/<button[^>]*class="btn btn-sm"[^>]*id="paraNoteBtn"/);
    expect(indexHtml).toMatch(/<button[^>]*class="btn btn-sm"[^>]*id="wordNoteBtn"/);
  });
});

describe('Note button event wiring in reader.js', () => {
  let readerSrc;

  beforeEach(() => {
    readerSrc = fs.readFileSync(
      path.resolve(__dirname, '../src/reader.js'),
      'utf-8'
    );
  });

  test('declares btnNote element reference', () => {
    expect(readerSrc).toMatch(/\$\(['"]#btnNote['"]\)/);
  });

  test('declares paraNoteBtn element reference', () => {
    expect(readerSrc).toMatch(/\$\(['"]#paraNoteBtn['"]\)/);
  });

  test('declares wordNoteBtn element reference', () => {
    expect(readerSrc).toMatch(/\$\(['"]#wordNoteBtn['"]\)/);
  });

  test('btnNote has click event listener that calls addNote', () => {
    expect(readerSrc).toMatch(/btnNote\.addEventListener\(['"]click['"],/);
  });

  test('paraNoteBtn has click event listener that calls addNote', () => {
    expect(readerSrc).toMatch(/paraNoteBtn\.addEventListener\(['"]click['"],/);
  });

  test('wordNoteBtn has click event listener that calls addNote', () => {
    expect(readerSrc).toMatch(/wordNoteBtn\.addEventListener\(['"]click['"],/);
  });
});

describe('Editable notes in notes panel', () => {
  let readerSrc;

  beforeEach(() => {
    readerSrc = fs.readFileSync(
      path.resolve(__dirname, '../src/reader.js'),
      'utf-8'
    );
  });

  test('has updateNote function', () => {
    expect(readerSrc).toMatch(/function updateNote\(/);
  });

  test('updateNote calls saveNotes', () => {
    const match = readerSrc.match(/function updateNote\([^)]*\)[\s\S]*?^}/m);
    expect(match).not.toBeNull();
    expect(match[0]).toMatch(/saveNotes\(\)/);
  });

  test('updateNote calls renderNotes', () => {
    const match = readerSrc.match(/function updateNote\([^)]*\)[\s\S]*?^}/m);
    expect(match).not.toBeNull();
    expect(match[0]).toMatch(/renderNotes\(\)/);
  });

  test('renderNotes creates note-edit buttons', () => {
    expect(readerSrc).toMatch(/note-edit/);
  });

  test('renderNotes attaches click handlers to note-edit buttons', () => {
    expect(readerSrc).toMatch(/\.querySelectorAll\(['"]\.note-edit['"]\)/);
  });

  test('has notes system with addNote and updateNote', () => {
    expect(readerSrc).toMatch(/function addNote/);
    expect(readerSrc).toMatch(/function updateNote/);
    expect(readerSrc).toMatch(/function saveNotes/);
  });
});
