/**
 * TDD Tests: Full-book audio generation using Edge TTS.
 *
 * Generates audio for every paragraph in a loaded book using the free
 * Microsoft Edge Read Aloud service, concatenates MP3 chunks, and
 * offers the result as a downloadable file. Inspired by tepub's
 * audiobook pipeline (parallel TTS, chapter assembly, progress tracking).
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

let bookAudioSrc, readerSrc, htmlSrc;

beforeEach(() => {
  bookAudioSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/book-audio.js'), 'utf-8'
  );
  readerSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/reader.js'), 'utf-8'
  );
  htmlSrc = fs.readFileSync(
    path.resolve(__dirname, '../index.html'), 'utf-8'
  );
});

// ─── Module exports ─────────────────────────────────────────────────

describe('book-audio module exports', () => {
  test('exports generateBookAudio function', () => {
    expect(bookAudioSrc).toMatch(/export\s+(async\s+)?function\s+generateBookAudio\s*\(/);
  });

  test('exports cancelBookAudio function', () => {
    expect(bookAudioSrc).toMatch(/export\s+function\s+cancelBookAudio\s*\(/);
  });

  test('exports synthesizeParagraph function for single-paragraph TTS', () => {
    expect(bookAudioSrc).toMatch(/export\s+(async\s+)?function\s+synthesizeParagraph\s*\(/);
  });

  test('exports concatenateAudioBlobs helper', () => {
    expect(bookAudioSrc).toMatch(/export\s+(async\s+)?function\s+concatenateAudioBlobs\s*\(/);
  });
});

// ─── synthesizeParagraph ────────────────────────────────────────────

describe('synthesizeParagraph', () => {
  test('uses Edge TTS WebSocket to generate audio', () => {
    const fn = bookAudioSrc.match(/function synthesizeParagraph[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/WebSocket/);
  });

  test('returns a Blob of type audio/mpeg', () => {
    const fn = bookAudioSrc.match(/function synthesizeParagraph[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/new Blob\(/);
    expect(fn[0]).toMatch(/audio\/mpeg/);
  });

  test('sends SSML with configurable voice', () => {
    const fn = bookAudioSrc.match(/function synthesizeParagraph[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/<voice name=/);
    expect(fn[0]).toMatch(/voice/);
  });

  test('supports speech rate configuration', () => {
    const fn = bookAudioSrc.match(/function synthesizeParagraph[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/rate/);
  });

  test('handles turn.end to know when synthesis is complete', () => {
    const fn = bookAudioSrc.match(/function synthesizeParagraph[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/turn\.end/);
  });

  test('collects audio chunks from binary messages', () => {
    const fn = bookAudioSrc.match(/function synthesizeParagraph[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/audioChunks/);
  });
});

// ─── generateBookAudio ─────────────────────────────────────────────

describe('generateBookAudio', () => {
  test('accepts paragraphs array and options object', () => {
    const fn = bookAudioSrc.match(/function generateBookAudio\s*\(([^)]*)\)/);
    expect(fn).not.toBeNull();
    expect(fn[1]).toMatch(/paragraphs/);
    expect(fn[1]).toMatch(/options/);
  });

  test('calls onProgress callback with current/total during generation', () => {
    const fn = bookAudioSrc.match(/function generateBookAudio[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/onProgress/);
  });

  test('skips image paragraphs', () => {
    const fn = bookAudioSrc.match(/function generateBookAudio[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/image/);
  });

  test('joins paragraph sentences into text for synthesis', () => {
    const fn = bookAudioSrc.match(/function generateBookAudio[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/sentences/);
  });

  test('supports cancellation via cancelBookAudio', () => {
    const fn = bookAudioSrc.match(/function generateBookAudio[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/cancel/i);
  });

  test('concatenates all paragraph blobs into a single audio blob', () => {
    const fn = bookAudioSrc.match(/function generateBookAudio[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/concatenateAudioBlobs/);
  });

  test('returns an object with blob and metadata', () => {
    const fn = bookAudioSrc.match(/function generateBookAudio[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/blob/);
    expect(fn[0]).toMatch(/paragraphCount/);
  });
});

// ─── Empty audio detection ─────────────────────────────────────────

describe('empty audio detection', () => {
  test('synthesizeParagraph rejects when no audio chunks received', () => {
    const fn = bookAudioSrc.match(/function synthesizeParagraph[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/audioChunks\.length\s*===\s*0/);
  });

  test('error message mentions voice and language mismatch', () => {
    const fn = bookAudioSrc.match(/function synthesizeParagraph[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/language.*match|match.*language/i);
  });
});

// ─── Language mismatch detection ───────────────────────────────────

describe('language mismatch detection', () => {
  test('generateBookAudio detects Chinese text', () => {
    const fn = bookAudioSrc.match(/function generateBookAudio[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/detectChinese|[\u4e00-\u9fff]/);
  });

  test('auto-selects Chinese voice for Chinese paragraphs', () => {
    const fn = bookAudioSrc.match(/function generateBookAudio[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/chineseVoice/);
  });

  test('auto-selects English voice for English paragraphs', () => {
    const fn = bookAudioSrc.match(/function generateBookAudio[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/englishVoice/);
  });

  test('detectChinese helper checks for CJK characters', () => {
    expect(bookAudioSrc).toMatch(/function detectChinese/);
    const fn = bookAudioSrc.match(/function detectChinese[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/\\u4e00/);
  });
});

// ─── concatenateAudioBlobs ──────────────────────────────────────────

describe('concatenateAudioBlobs', () => {
  test('merges multiple blobs into a single audio/mpeg Blob', () => {
    const fn = bookAudioSrc.match(/function concatenateAudioBlobs[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/new Blob\(/);
    expect(fn[0]).toMatch(/audio\/mpeg/);
  });
});

// ─── cancelBookAudio ────────────────────────────────────────────────

describe('cancelBookAudio', () => {
  test('sets a cancelled flag to stop generation', () => {
    const fn = bookAudioSrc.match(/function cancelBookAudio[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/cancel/i);
    expect(fn[0]).toMatch(/true/);
  });
});

// ─── downloadAudio helper ───────────────────────────────────────────

describe('downloadAudio helper', () => {
  test('exports downloadAudio function', () => {
    expect(bookAudioSrc).toMatch(/export\s+function\s+downloadAudio\s*\(/);
  });

  test('creates a download link from a blob', () => {
    const fn = bookAudioSrc.match(/function downloadAudio[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/createObjectURL/);
    expect(fn[0]).toMatch(/download/);
  });
});

// ─── Integration with reader.js ─────────────────────────────────────

describe('reader.js integrates book-audio', () => {
  test('reader.js imports from book-audio.js', () => {
    expect(readerSrc).toMatch(/from\s+['"]\.\/book-audio(\.js)?['"]/);
  });

  test('reader.js exposes generateBookAudio on window', () => {
    expect(readerSrc).toMatch(/window\.generateBookAudio/);
  });
});

// ─── UI elements ────────────────────────────────────────────────────

describe('audiobook generation UI', () => {
  test('index.html has a generate-audiobook button', () => {
    expect(htmlSrc).toMatch(/id=['"]generateAudiobookBtn['"]/);
  });

  test('index.html has a progress container for audiobook generation', () => {
    expect(htmlSrc).toMatch(/id=['"]audiobookProgress['"]/);
  });

  test('progress container includes a progress bar element', () => {
    expect(htmlSrc).toMatch(/id=['"]audiobookProgressBar['"]/);
  });

  test('progress container includes a status text element', () => {
    expect(htmlSrc).toMatch(/id=['"]audiobookStatus['"]/);
  });

  test('progress container includes a cancel button', () => {
    expect(htmlSrc).toMatch(/id=['"]cancelAudiobookBtn['"]/);
  });
});
