/**
 * TDD Tests for storage module.
 * Replaces chrome.storage with localStorage for web app.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';

// Re-import fresh module for each test to reset _cache
let loadSettings, saveSettings, getSettings;

beforeEach(async () => {
  window.localStorage.clear();
  vi.resetModules();
  const mod = await import('../src/storage.js');
  loadSettings = mod.loadSettings;
  saveSettings = mod.saveSettings;
  getSettings = mod.getSettings;
});

describe('saveSettings', () => {
  test('saves translationProvider to localStorage', () => {
    saveSettings({ translationProvider: 'google' });
    expect(window.localStorage.getItem('reader-provider')).toBe('google');
  });

  test('saves openaiApiKey to localStorage', () => {
    saveSettings({ openaiApiKey: 'sk-test-key' });
    expect(window.localStorage.getItem('reader-api-key')).toBe('sk-test-key');
  });

  test('saves openaiModel to localStorage', () => {
    saveSettings({ openaiModel: 'gpt-4o' });
    expect(window.localStorage.getItem('reader-model')).toBe('gpt-4o');
  });

  test('saves multiple settings at once', () => {
    saveSettings({
      translationProvider: 'microsoft',
      openaiApiKey: 'sk-abc',
      openaiModel: 'gpt-4-turbo',
    });
    expect(window.localStorage.getItem('reader-provider')).toBe('microsoft');
    expect(window.localStorage.getItem('reader-api-key')).toBe('sk-abc');
    expect(window.localStorage.getItem('reader-model')).toBe('gpt-4-turbo');
  });

  test('ignores unknown keys', () => {
    saveSettings({ unknownKey: 'value' });
    expect(window.localStorage.getItem('unknownKey')).toBeNull();
  });
});

describe('loadSettings', () => {
  test('returns defaults when localStorage is empty', () => {
    const settings = loadSettings();
    expect(settings.translationProvider).toBe('chatgpt');
    expect(settings.openaiApiKey).toBe('');
    expect(settings.openaiModel).toBe('gpt-4o-mini');
  });

  test('loads saved values from localStorage', () => {
    window.localStorage.setItem('reader-provider', 'google');
    window.localStorage.setItem('reader-api-key', 'sk-saved');
    window.localStorage.setItem('reader-model', 'gpt-4o');

    const settings = loadSettings();
    expect(settings.translationProvider).toBe('google');
    expect(settings.openaiApiKey).toBe('sk-saved');
    expect(settings.openaiModel).toBe('gpt-4o');
  });

  test('falls back to defaults for missing keys', () => {
    window.localStorage.setItem('reader-provider', 'microsoft');
    // apiKey and model not set

    const settings = loadSettings();
    expect(settings.translationProvider).toBe('microsoft');
    expect(settings.openaiApiKey).toBe('');
    expect(settings.openaiModel).toBe('gpt-4o-mini');
  });
});

describe('getSettings', () => {
  test('returns current settings without re-reading localStorage', () => {
    saveSettings({ translationProvider: 'offline' });
    const s = getSettings();
    expect(s.translationProvider).toBe('offline');
  });
});
