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

  test('exports exportTranslationMarkdown function', () => {
    expect(ollamaSrc).toMatch(/export\s+function\s+exportTranslationMarkdown\s*\(/);
  });
});

// ─── translateWithOllama ────────────────────────────────────────────

describe('translateWithOllama', () => {
  test('calls the Ollama /api/generate endpoint via configurable URL', () => {
    expect(ollamaSrc).toMatch(/\/api\/generate/);
    const fn = ollamaSrc.match(/function translateWithOllama[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // URL should come from options, not hardcoded
    expect(fn[0]).toMatch(/ollamaUrl|baseUrl|url/i);
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

// ─── exportTranslationMarkdown ──────────────────────────────────────

describe('exportTranslationMarkdown', () => {
  test('accepts translated paragraphs and title', () => {
    const fn = ollamaSrc.match(/function exportTranslationMarkdown\s*\(([^)]*)\)/);
    expect(fn).not.toBeNull();
    expect(fn[1]).toMatch(/translated/i);
  });

  test('produces markdown with a title heading', () => {
    const fn = ollamaSrc.match(/function exportTranslationMarkdown[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/#/);
  });

  test('includes only translated text without original labels', () => {
    const fn = ollamaSrc.match(/function exportTranslationMarkdown[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).not.toMatch(/Original/);
  });

  test('returns a string', () => {
    const fn = ollamaSrc.match(/function exportTranslationMarkdown[\s\S]*?\n\}/);
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

// ─── Translated audio integration ───────────────────────────────────

describe('translation stores result for audio generation', () => {
  test('globe icon handler stores result in translatedParagraphs', () => {
    // The translateBookBtn handler must assign to translatedParagraphs
    expect(readerSrc).toMatch(/translatedParagraphs\s*=\s*await\s+translateBook\s*\(/);
  });

  test('robot icon handler stores result in translatedParagraphs', () => {
    // The ollamaTranslateBtn handler must assign to translatedParagraphs
    expect(readerSrc).toMatch(/translatedParagraphs\s*=\s*await\s+translateBookWithOllama\s*\(/);
  });

  test('both handlers show generateTranslatedAudioBtn after translation', () => {
    // Count occurrences of showing the button
    const matches = readerSrc.match(/generateTranslatedAudioBtn\.style\.display\s*=\s*['"]{2}/g);
    expect(matches).not.toBeNull();
    expect(matches.length).toBeGreaterThanOrEqual(2);
  });

  test('translated audio uses Chinese voice by default', () => {
    expect(readerSrc).toMatch(/translatedTtsVoice.*zh-CN|zh-CN.*translatedTtsVoice/);
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

// ─── checkOllamaConnection ──────────────────────────────────────────

describe('checkOllamaConnection', () => {
  test('exports checkOllamaConnection function', () => {
    expect(ollamaSrc).toMatch(/export\s+(async\s+)?function\s+checkOllamaConnection\s*\(/);
  });

  test('pings the Ollama base URL to verify connectivity', () => {
    const fn = ollamaSrc.match(/function checkOllamaConnection[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/fetch/);
  });

  test('returns an object with ok status', () => {
    const fn = ollamaSrc.match(/function checkOllamaConnection[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/ok/);
  });
});

// ─── Ollama settings in storage ─────────────────────────────────────

describe('Ollama settings persistence', () => {
  let storageSrc;
  beforeEach(() => {
    storageSrc = fs.readFileSync(
      path.resolve(__dirname, '../src/storage.js'), 'utf-8'
    );
  });

  test('storage.js defines ollamaUrl key', () => {
    expect(storageSrc).toMatch(/ollamaUrl/);
  });

  test('storage.js defines ollamaModel key', () => {
    expect(storageSrc).toMatch(/ollamaModel/);
  });

  test('storage.js has default value for ollamaUrl', () => {
    expect(storageSrc).toMatch(/localhost:11434/);
  });

  test('storage.js has default value for ollamaModel', () => {
    expect(storageSrc).toMatch(/llama3/);
  });

  test('reader.js loads ollamaUrl into state', () => {
    expect(readerSrc).toMatch(/state\.ollamaUrl/);
  });

  test('reader.js loads ollamaModel into state', () => {
    expect(readerSrc).toMatch(/state\.ollamaModel/);
  });
});

// ─── Settings UI ────────────────────────────────────────────────────

describe('Ollama settings UI', () => {
  let settingsSrc;
  beforeEach(() => {
    settingsSrc = fs.readFileSync(
      path.resolve(__dirname, '../src/settings-ui.js'), 'utf-8'
    );
  });

  test('settings UI has Ollama URL input', () => {
    expect(settingsSrc).toMatch(/ollamaUrl|settingsOllamaUrl/i);
  });

  test('settings UI has Ollama model input', () => {
    expect(settingsSrc).toMatch(/ollamaModel|settingsOllamaModel/i);
  });

  test('settings UI saves Ollama settings', () => {
    expect(settingsSrc).toMatch(/ollamaUrl/);
    expect(settingsSrc).toMatch(/ollamaModel/);
  });
});

// ─── CSP allows Ollama connection ───────────────────────────────────

describe('Content Security Policy', () => {
  test('CSP connect-src includes localhost:11434 for Ollama', () => {
    expect(htmlSrc).toMatch(/connect-src[^;]*localhost:11434/);
  });
});
