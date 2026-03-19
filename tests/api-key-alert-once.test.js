/**
 * TDD Tests: the "Please set your OpenAI API key" alert should appear
 * only once per session instead of on every word lookup.
 *
 * callOpenAI() fires alert() when no API key is configured. Clicking
 * multiple words would trigger repeated alerts. A guard flag ensures
 * the alert fires at most once until the user changes settings.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

let readerSrc;

beforeEach(() => {
  readerSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/reader.js'), 'utf-8'
  );
});

// ─── Guard flag exists ──────────────────────────────────────────────

describe('API key alert guard flag', () => {
  test('reader.js declares an _apiKeyAlertShown flag', () => {
    expect(readerSrc).toMatch(/let _apiKeyAlertShown\s*=\s*false/);
  });
});

// ─── callOpenAI checks the flag before alerting ─────────────────────

describe('callOpenAI shows alert only once', () => {
  test('callOpenAI checks _apiKeyAlertShown before calling alert', () => {
    const fn = readerSrc.match(/async function callOpenAI[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/_apiKeyAlertShown/);
  });

  test('callOpenAI sets _apiKeyAlertShown to true after alerting', () => {
    const fn = readerSrc.match(/async function callOpenAI[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/_apiKeyAlertShown\s*=\s*true/);
  });

  test('callOpenAI skips alert when _apiKeyAlertShown is already true', () => {
    const fn = readerSrc.match(/async function callOpenAI[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // The alert should be inside a conditional that checks !_apiKeyAlertShown
    expect(fn[0]).toMatch(/!_apiKeyAlertShown[\s\S]*?alert\(/);
  });
});

// ─── Flag resets when settings change ───────────────────────────────

describe('alert flag resets on settings change', () => {
  test('ensureSettings or loadStorageSettings resets _apiKeyAlertShown when apiKey changes', () => {
    // When the user updates settings (e.g. sets an API key), the flag
    // should reset so the alert can fire again if key is later cleared.
    // Look for the flag being reset to false in settings-related code.
    const settingsFn = readerSrc.match(
      /function ensureSettings[\s\S]*?\n\}/
    );
    expect(settingsFn).not.toBeNull();
    expect(settingsFn[0]).toMatch(/_apiKeyAlertShown\s*=\s*false/);
  });
});
