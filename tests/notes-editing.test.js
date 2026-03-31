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

describe('Note button click feedback', () => {
  let readerSrc;

  beforeEach(() => {
    readerSrc = fs.readFileSync(
      path.resolve(__dirname, '../src/reader.js'),
      'utf-8'
    );
  });

  test('has noteWithFeedback function', () => {
    expect(readerSrc).toMatch(/function noteWithFeedback\(/);
  });

  test('noteWithFeedback accepts btn, text, and originalLabel parameters', () => {
    expect(readerSrc).toMatch(/function noteWithFeedback\(\s*btn\s*,\s*text\s*,\s*originalLabel\s*\)/);
  });

  test('noteWithFeedback disables button to prevent duplicate operations', () => {
    const match = readerSrc.match(/function noteWithFeedback\([^)]*\)[\s\S]*?^}/m);
    expect(match).not.toBeNull();
    expect(match[0]).toMatch(/btn\.disabled\s*=\s*true/);
  });

  test('noteWithFeedback re-enables button after feedback', () => {
    const match = readerSrc.match(/function noteWithFeedback\([^)]*\)[\s\S]*?^}/m);
    expect(match).not.toBeNull();
    expect(match[0]).toMatch(/btn\.disabled\s*=\s*false/);
  });

  test('noteWithFeedback shows checkmark on success', () => {
    const match = readerSrc.match(/function noteWithFeedback\([^)]*\)[\s\S]*?^}/m);
    expect(match).not.toBeNull();
    expect(match[0]).toMatch(/\\u2714|✔|Noted/);
  });

  test('noteWithFeedback uses 300ms timeout for feedback reset', () => {
    const match = readerSrc.match(/function noteWithFeedback\([^)]*\)[\s\S]*?^}/m);
    expect(match).not.toBeNull();
    expect(match[0]).toMatch(/setTimeout\(.*300\)/s);
  });

  test('noteWithFeedback calls addNote', () => {
    const match = readerSrc.match(/function noteWithFeedback\([^)]*\)[\s\S]*?^}/m);
    expect(match).not.toBeNull();
    expect(match[0]).toMatch(/addNote\(\s*text\s*\)/);
  });

  test('noteWithFeedback adds noted class for highlight styling', () => {
    const match = readerSrc.match(/function noteWithFeedback\([^)]*\)[\s\S]*?^}/m);
    expect(match).not.toBeNull();
    expect(match[0]).toMatch(/classList\.add\(['"]noted['"]\)/);
  });

  test('btnNote click handler uses noteWithFeedback', () => {
    expect(readerSrc).toMatch(/btnNote\.addEventListener\(['"]click['"],\s*\(\)\s*=>\s*\{[\s\S]*?noteWithFeedback\(\s*btnNote\b/);
  });

  test('wordNoteBtn click handler uses noteWithFeedback', () => {
    expect(readerSrc).toMatch(/wordNoteBtn\.addEventListener\(['"]click['"],\s*\(\)\s*=>\s*\{[\s\S]*?noteWithFeedback\(\s*wordNoteBtn\b/);
  });

  test('paraNoteBtn click handler uses noteWithFeedback', () => {
    expect(readerSrc).toMatch(/paraNoteBtn\.addEventListener\(['"]click['"],\s*\(\)\s*=>\s*\{[\s\S]*?noteWithFeedback\(\s*paraNoteBtn\b/);
  });

  test('selNote click handler uses noteWithFeedback', () => {
    expect(readerSrc).toMatch(/selNote\.addEventListener\(['"]click['"],\s*\(\)\s*=>\s*\{[\s\S]*?noteWithFeedback\(\s*selNote\b/);
  });
});

describe('Note button feedback CSS', () => {
  let cssSrc;

  beforeEach(() => {
    cssSrc = fs.readFileSync(
      path.resolve(__dirname, '../src/reader.css'),
      'utf-8'
    );
  });

  test('has .noted class for highlight styling', () => {
    expect(cssSrc).toMatch(/\.noted\b/);
  });

  test('.noted class sets a distinct background or color', () => {
    const match = cssSrc.match(/\.noted\b[^{]*\{([^}]*)\}/);
    expect(match).not.toBeNull();
    expect(match[1]).toMatch(/background|color/);
  });
});
