/**
 * TDD Tests: Checkpoint system for resumable translation and audio operations.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

let checkpointSrc, readerSrc, bookTranslatorSrc, ollamaSrc, bookAudioSrc;

beforeEach(() => {
  checkpointSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/checkpoint.js'), 'utf-8'
  );
  readerSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/reader.js'), 'utf-8'
  );
  bookTranslatorSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/book-translator.js'), 'utf-8'
  );
  ollamaSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/ollama-translator.js'), 'utf-8'
  );
  bookAudioSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/book-audio.js'), 'utf-8'
  );
});

// ─── Checkpoint module exports ──────────────────────────────────────

describe('checkpoint module exports', () => {
  test('exports makeCheckpointKey', () => {
    expect(checkpointSrc).toMatch(/export\s+function\s+makeCheckpointKey\s*\(/);
  });

  test('exports saveTranslationCheckpoint', () => {
    expect(checkpointSrc).toMatch(/export\s+function\s+saveTranslationCheckpoint\s*\(/);
  });

  test('exports loadTranslationCheckpoint', () => {
    expect(checkpointSrc).toMatch(/export\s+function\s+loadTranslationCheckpoint\s*\(/);
  });

  test('exports clearTranslationCheckpoint', () => {
    expect(checkpointSrc).toMatch(/export\s+function\s+clearTranslationCheckpoint\s*\(/);
  });

  test('exports getCheckpointInfo', () => {
    expect(checkpointSrc).toMatch(/export\s+function\s+getCheckpointInfo\s*\(/);
  });
});

// ─── makeCheckpointKey ──────────────────────────────────────────────

describe('makeCheckpointKey', () => {
  test('combines fileName and operationType', () => {
    const fn = checkpointSrc.match(/function makeCheckpointKey[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/fileName/);
    expect(fn[0]).toMatch(/opType/);
  });

  test('uses a prefix to namespace keys', () => {
    // PREFIX constant defined at module level
    expect(checkpointSrc).toMatch(/eo-ckpt/);
    const fn = checkpointSrc.match(/function makeCheckpointKey[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/PREFIX/);
  });
});

// ─── Translation checkpoint CRUD ────────────────────────────────────

describe('translation checkpoint persistence', () => {
  test('saveTranslationCheckpoint writes to localStorage', () => {
    const fn = checkpointSrc.match(/function saveTranslationCheckpoint[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/localStorage/);
    expect(fn[0]).toMatch(/setItem/);
  });

  test('loadTranslationCheckpoint reads from localStorage', () => {
    const fn = checkpointSrc.match(/function loadTranslationCheckpoint[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/localStorage/);
    expect(fn[0]).toMatch(/getItem/);
  });

  test('loadTranslationCheckpoint returns null on missing data', () => {
    const fn = checkpointSrc.match(/function loadTranslationCheckpoint[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/null/);
  });

  test('loadTranslationCheckpoint handles corrupted JSON gracefully', () => {
    const fn = checkpointSrc.match(/function loadTranslationCheckpoint[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/try|catch/);
  });

  test('clearTranslationCheckpoint removes from localStorage', () => {
    const fn = checkpointSrc.match(/function clearTranslationCheckpoint[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/removeItem/);
  });

  test('getCheckpointInfo returns exists flag and metadata', () => {
    const fn = checkpointSrc.match(/function getCheckpointInfo[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/exists/);
    expect(fn[0]).toMatch(/completedIndex/);
  });
});

// ─── Resume support in translation modules ──────────────────────────

describe('translateBook resume support', () => {
  test('translateBook accepts startIndex option', () => {
    const fn = bookTranslatorSrc.match(/function translateBook\s*\(([^)]*)\)/);
    expect(fn).not.toBeNull();
    const body = bookTranslatorSrc.match(/function translateBook[\s\S]*?\n\}/);
    expect(body[0]).toMatch(/startIndex/);
  });

  test('translateBook accepts onParagraphComplete callback', () => {
    const body = bookTranslatorSrc.match(/function translateBook[\s\S]*?\n\}/);
    expect(body).not.toBeNull();
    expect(body[0]).toMatch(/onParagraphComplete/);
  });
});

describe('translateBookWithOllama resume support', () => {
  test('translateBookWithOllama accepts startIndex option', () => {
    const body = ollamaSrc.match(/function translateBookWithOllama[\s\S]*?\n\}/);
    expect(body).not.toBeNull();
    expect(body[0]).toMatch(/startIndex/);
  });

  test('translateBookWithOllama accepts onParagraphComplete callback', () => {
    const body = ollamaSrc.match(/function translateBookWithOllama[\s\S]*?\n\}/);
    expect(body).not.toBeNull();
    expect(body[0]).toMatch(/onParagraphComplete/);
  });
});

describe('generateBookAudio resume support', () => {
  test('generateBookAudio accepts startIndex option', () => {
    const body = bookAudioSrc.match(/function generateBookAudio[\s\S]*?\n\}/);
    expect(body).not.toBeNull();
    expect(body[0]).toMatch(/startIndex/);
  });

  test('generateBookAudio accepts onParagraphComplete callback', () => {
    const body = bookAudioSrc.match(/function generateBookAudio[\s\S]*?\n\}/);
    expect(body).not.toBeNull();
    expect(body[0]).toMatch(/onParagraphComplete/);
  });
});

// ─── Resume overlap ─────────────────────────────────────────────────

describe('resume overlap', () => {
  test('checkpoint.js exports RESUME_OVERLAP constant', () => {
    expect(checkpointSrc).toMatch(/export\s+const\s+RESUME_OVERLAP/);
  });

  test('RESUME_OVERLAP is a positive number', () => {
    const m = checkpointSrc.match(/RESUME_OVERLAP\s*=\s*(\d+)/);
    expect(m).not.toBeNull();
    expect(Number(m[1])).toBeGreaterThan(0);
  });

  test('reader.js imports RESUME_OVERLAP', () => {
    expect(readerSrc).toMatch(/RESUME_OVERLAP/);
  });

  test('reader.js subtracts RESUME_OVERLAP from startIndex when resuming', () => {
    expect(readerSrc).toMatch(/completedIndex\s*-\s*RESUME_OVERLAP/);
  });

  test('translateBook fills gaps in existingResults', () => {
    const body = bookTranslatorSrc.match(/function translateBook[\s\S]*?\n\}/);
    expect(body).not.toBeNull();
    expect(body[0]).toMatch(/!translatedParagraphs\[j\]/);
  });

  test('translateBookWithOllama fills gaps in existingResults', () => {
    const body = ollamaSrc.match(/function translateBookWithOllama[\s\S]*?\n\}/);
    expect(body).not.toBeNull();
    expect(body[0]).toMatch(/!translatedParagraphs\[j\]/);
  });
});

// ─── Reader.js checkpoint integration ───────────────────────────────

describe('reader.js checkpoint integration', () => {
  test('reader.js imports from checkpoint.js', () => {
    expect(readerSrc).toMatch(/from\s+['"]\.\/checkpoint(\.js)?['"]/);
  });

  test('reader.js calls getCheckpointInfo before operations', () => {
    expect(readerSrc).toMatch(/getCheckpointInfo/);
  });

  test('reader.js calls saveTranslationCheckpoint during translation', () => {
    expect(readerSrc).toMatch(/saveTranslationCheckpoint/);
  });

  test('reader.js calls clearTranslationCheckpoint on completion', () => {
    expect(readerSrc).toMatch(/clearTranslationCheckpoint/);
  });
});
