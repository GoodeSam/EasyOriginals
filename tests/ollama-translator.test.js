/**
 * TDD Tests: Full-book translation using free Ollama models.
 *
 * Translates every text paragraph in a loaded book using a local Ollama
 * instance (http://localhost:11434), exports the result as a downloadable
 * markdown file with original and translated text side by side.
 * Inspired by tepub's Ollama provider and translation pipeline.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

let ollamaSrc, readerSrc, htmlSrc;

beforeEach(() => {
  ollamaSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/ollama-translator.js'), 'utf-8'
  );
  readerSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/reader.js'), 'utf-8'
  );
  htmlSrc = fs.readFileSync(
    path.resolve(__dirname, '../index.html'), 'utf-8'
  );
});

// ─── Module exports ─────────────────────────────────────────────────

describe('ollama-translator module exports', () => {
  test('exports translateWithOllama function', () => {
    expect(ollamaSrc).toMatch(/export\s+(async\s+)?function\s+translateWithOllama\s*\(/);
  });

  test('exports translateBookWithOllama function', () => {
    expect(ollamaSrc).toMatch(/export\s+(async\s+)?function\s+translateBookWithOllama\s*\(/);
  });

  test('exports cancelOllamaTranslation function', () => {
    expect(ollamaSrc).toMatch(/export\s+function\s+cancelOllamaTranslation\s*\(/);
  });

  test('exports exportAsMarkdown function', () => {
    expect(ollamaSrc).toMatch(/export\s+function\s+exportAsMarkdown\s*\(/);
  });

  test('exports downloadMarkdown function', () => {
    expect(ollamaSrc).toMatch(/export\s+function\s+downloadMarkdown\s*\(/);
  });
});

// ─── translateWithOllama ────────────────────────────────────────────

describe('translateWithOllama', () => {
  test('calls the Ollama /api/generate endpoint', () => {
    // URL is defined as a module-level constant and used via OLLAMA_URL in the function
    expect(ollamaSrc).toMatch(/localhost:11434/);
    expect(ollamaSrc).toMatch(/\/api\/generate/);
    const fn = ollamaSrc.match(/function translateWithOllama[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/OLLAMA_URL/);
  });

  test('sends a POST request with JSON body', () => {
    const fn = ollamaSrc.match(/function translateWithOllama[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/POST/);
    expect(fn[0]).toMatch(/JSON\.stringify/);
  });

  test('includes model name in the request', () => {
    const fn = ollamaSrc.match(/function translateWithOllama[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/model/);
  });

  test('builds a translation prompt with source and target language', () => {
    const fn = ollamaSrc.match(/function translateWithOllama[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/fromLang|sourceLang|from/i);
    expect(fn[0]).toMatch(/toLang|targetLang|to/i);
  });

  test('disables streaming for simpler response handling', () => {
    const fn = ollamaSrc.match(/function translateWithOllama[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/stream.*false/);
  });

  test('extracts the response text from Ollama JSON response', () => {
    const fn = ollamaSrc.match(/function translateWithOllama[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/\.response/);
  });
});

// ─── translateBookWithOllama ────────────────────────────────────────

describe('translateBookWithOllama', () => {
  test('accepts paragraphs array and options object', () => {
    const fn = ollamaSrc.match(/function translateBookWithOllama\s*\(([^)]*)\)/);
    expect(fn).not.toBeNull();
    expect(fn[1]).toMatch(/paragraphs/);
    expect(fn[1]).toMatch(/options/);
  });

  test('calls onProgress callback with current/total during translation', () => {
    const fn = ollamaSrc.match(/function translateBookWithOllama[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/onProgress/);
  });

  test('skips image paragraphs', () => {
    const fn = ollamaSrc.match(/function translateBookWithOllama[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/image/);
  });

  test('joins paragraph sentences into text for translation', () => {
    const fn = ollamaSrc.match(/function translateBookWithOllama[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/sentences/);
  });

  test('supports cancellation via cancelOllamaTranslation', () => {
    const fn = ollamaSrc.match(/function translateBookWithOllama[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/cancel/i);
  });

  test('returns translated paragraphs array', () => {
    const fn = ollamaSrc.match(/function translateBookWithOllama[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/translatedParagraphs/);
  });

  test('preserves image paragraphs in output unchanged', () => {
    const fn = ollamaSrc.match(/function translateBookWithOllama[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/\.push\(/);
  });

  test('uses configurable model with a sensible default', () => {
    const fn = ollamaSrc.match(/function translateBookWithOllama[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/model/);
  });
});

// ─── cancelOllamaTranslation ───────────────────────────────────────

describe('cancelOllamaTranslation', () => {
  test('sets a cancelled flag to stop translation', () => {
    const fn = ollamaSrc.match(/function cancelOllamaTranslation[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/cancel/i);
    expect(fn[0]).toMatch(/true/);
  });
});

// ─── exportAsMarkdown ──────────────────────────────────────────────

describe('exportAsMarkdown', () => {
  test('accepts original paragraphs, translated paragraphs, and title', () => {
    const fn = ollamaSrc.match(/function exportAsMarkdown\s*\(([^)]*)\)/);
    expect(fn).not.toBeNull();
    expect(fn[1]).toMatch(/original|paragraphs/i);
    expect(fn[1]).toMatch(/translated/i);
  });

  test('produces markdown with a title heading', () => {
    const fn = ollamaSrc.match(/function exportAsMarkdown[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/#/);
  });

  test('includes both original and translated text', () => {
    const fn = ollamaSrc.match(/function exportAsMarkdown[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/original|Original/);
    expect(fn[0]).toMatch(/translat|Translat/i);
  });

  test('returns a string of markdown content', () => {
    const fn = ollamaSrc.match(/function exportAsMarkdown[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/return/);
  });
});

// ─── downloadMarkdown ──────────────────────────────────────────────

describe('downloadMarkdown', () => {
  test('creates a download link from markdown content', () => {
    const fn = ollamaSrc.match(/function downloadMarkdown[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/createObjectURL|Blob/);
    expect(fn[0]).toMatch(/download/);
  });

  test('uses text/markdown MIME type', () => {
    const fn = ollamaSrc.match(/function downloadMarkdown[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/text\/markdown/);
  });
});

// ─── Integration with reader.js ─────────────────────────────────────

describe('reader.js integrates ollama-translator', () => {
  test('reader.js imports from ollama-translator.js', () => {
    expect(readerSrc).toMatch(/from\s+['"]\.\/ollama-translator(\.js)?['"]/);
  });

  test('reader.js exposes translateBookWithOllama on window', () => {
    expect(readerSrc).toMatch(/window\.translateBookWithOllama/);
  });
});

// ─── UI elements ────────────────────────────────────────────────────

describe('Ollama translation UI', () => {
  test('index.html has an Ollama translate button', () => {
    expect(htmlSrc).toMatch(/id=['"]ollamaTranslateBtn['"]/);
  });

  test('Ollama translate button is in the toolbar', () => {
    const start = htmlSrc.indexOf('class="top-bar-actions">');
    const end = htmlSrc.indexOf('<!-- Search Bar -->', start);
    const actions = htmlSrc.slice(start, end);
    expect(actions).toMatch(/id=['"]ollamaTranslateBtn['"]/);
  });

  test('index.html has a progress container for Ollama translation', () => {
    expect(htmlSrc).toMatch(/id=['"]ollamaTranslationProgress['"]/);
  });

  test('progress container includes a progress bar', () => {
    expect(htmlSrc).toMatch(/id=['"]ollamaTranslationProgressBar['"]/);
  });

  test('progress container includes status text', () => {
    expect(htmlSrc).toMatch(/id=['"]ollamaTranslationStatus['"]/);
  });

  test('progress container includes a cancel button', () => {
    expect(htmlSrc).toMatch(/id=['"]cancelOllamaTranslationBtn['"]/);
  });
});

// ─── CSP allows Ollama connection ───────────────────────────────────

describe('Content Security Policy', () => {
  test('CSP connect-src includes localhost:11434 for Ollama', () => {
    expect(htmlSrc).toMatch(/connect-src[^;]*localhost:11434/);
  });
});
