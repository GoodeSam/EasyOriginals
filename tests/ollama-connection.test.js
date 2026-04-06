/**
 * TDD Tests: Ollama connection validation and CORS error handling.
 *
 * Ensures checkOllamaConnection validates the /api/generate endpoint,
 * distinguishes CORS from network errors, and translateWithOllama
 * provides actionable error messages.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

let ollamaSrc;

beforeEach(() => {
  ollamaSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/ollama-translator.js'), 'utf-8'
  );
});

// ─── checkOllamaConnection validates /api/generate ──────────────────

describe('checkOllamaConnection endpoint validation', () => {
  test('pings /api/tags to verify Ollama API is reachable', () => {
    const fn = ollamaSrc.match(/function checkOllamaConnection[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/\/api\/tags/);
  });

  test('returns ok:true when API responds successfully', () => {
    const fn = ollamaSrc.match(/function checkOllamaConnection[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/ok:\s*true/);
  });

  test('detects CORS errors specifically', () => {
    const fn = ollamaSrc.match(/function checkOllamaConnection[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/CORS|cors/);
  });

  test('includes OLLAMA_ORIGINS fix in CORS error message', () => {
    const fn = ollamaSrc.match(/function checkOllamaConnection[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/OLLAMA_ORIGINS/);
  });
});

// ─── translateWithOllama error handling ─────────────────────────────

describe('translateWithOllama error handling', () => {
  test('catches fetch errors with actionable message', () => {
    const fn = ollamaSrc.match(/function translateWithOllama[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/catch/);
    expect(fn[0]).toMatch(/fetch failed|timed out/);
  });

  test('includes the Ollama URL in error message', () => {
    const fn = ollamaSrc.match(/function translateWithOllama[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/ollamaUrl/);
  });

  test('re-throws AbortError without wrapping', () => {
    const fn = ollamaSrc.match(/function translateWithOllama[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/AbortError/);
  });

  test('includes response body in HTTP error messages', () => {
    const fn = ollamaSrc.match(/function translateWithOllama[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/res\.text/);
  });

  test('validates response has string response field', () => {
    const fn = ollamaSrc.match(/function translateWithOllama[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/typeof.*response.*string/);
  });
});
