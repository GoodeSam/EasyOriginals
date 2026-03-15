/**
 * TDD Tests: search highlighting must preserve full word text for audio/popup.
 *
 * Problem: rebuildSentenceWithHighlights() splits words into fragments when
 * search text overlaps a word. Clicking a fragment yields partial text,
 * breaking word popup and TTS pronunciation.
 *
 * Fix: each .word span created during highlight rebuild must carry
 * data-word with the original full word, and the click handler must
 * prefer data-word over textContent.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('search highlight preserves full word for audio', () => {
  let readerSrc;

  beforeEach(() => {
    readerSrc = fs.readFileSync(
      path.resolve(__dirname, '../src/reader.js'),
      'utf-8'
    );
  });

  test('makeWordSpan inside rebuildSentenceWithHighlights stores data-word attribute', () => {
    // The makeWordSpan helper must set data-word so the click handler can
    // retrieve the original full word even when the span only shows a fragment.
    // Look for dataset.word or setAttribute('data-word' in the makeWordSpan function
    const makeWordSpanMatch = readerSrc.match(
      /function makeWordSpan[\s\S]*?return w;\s*\}/
    );
    expect(makeWordSpanMatch).not.toBeNull();
    const fnBody = makeWordSpanMatch[0];
    // Must set data-word attribute
    expect(fnBody).toMatch(/data-word|dataset\.word/);
  });

  test('rebuildSentenceWithHighlights passes original word text to makeWordSpan for highlighted pieces', () => {
    // When a word is split into pieces (highlight branch), each makeWordSpan
    // call must receive the original full nodeText so data-word is set correctly.
    // Look for makeWordSpan calls with nodeText in the highlight split branch.
    const rebuildFn = readerSrc.match(
      /function rebuildSentenceWithHighlights[\s\S]*?sentEl\.appendChild\(fragment\)/
    );
    expect(rebuildFn).not.toBeNull();
    const fnBody = rebuildFn[0];
    // In the highlighted pieces loop (splitTextWithHighlights branch),
    // makeWordSpan(mark, nodeText) and makeWordSpan(piece.text, nodeText)
    // must pass nodeText as second arg so data-word captures the full word
    const highlightBranch = fnBody.match(/splitTextWithHighlights[\s\S]*/);
    expect(highlightBranch).not.toBeNull();
    const branchCode = highlightBranch[0];
    // Every makeWordSpan call in the highlight branch must include nodeText
    const makeWordCalls = branchCode.match(/makeWordSpan\([^)]+\)/g) || [];
    expect(makeWordCalls.length).toBeGreaterThan(0);
    for (const call of makeWordCalls) {
      expect(call).toContain('nodeText');
    }
  });

  test('click handler uses data-word attribute when available', () => {
    // handleReaderClick must prefer wordEl.dataset.word over wordEl.textContent
    // so that clicking a search-highlighted fragment still gets the full word
    const clickHandler = readerSrc.match(
      /function handleReaderClick[\s\S]*?closeAllSidePanels\(\)/
    );
    expect(clickHandler).not.toBeNull();
    const fnBody = clickHandler[0];
    expect(fnBody).toMatch(/dataset\.word|getAttribute\(['"]data-word['"]\)/);
  });

  test('keyboard handler uses data-word attribute when available', () => {
    // handleReaderKeydown must also prefer data-word
    const keyHandler = readerSrc.match(
      /function handleReaderKeydown[\s\S]*?\n\}/
    );
    expect(keyHandler).not.toBeNull();
    const fnBody = keyHandler[0];
    expect(fnBody).toMatch(/dataset\.word|getAttribute\(['"]data-word['"]\)/);
  });
});
