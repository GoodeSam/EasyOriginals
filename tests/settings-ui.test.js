/**
 * TDD Tests for the settings panel UI (replaces popup.html/popup.js).
 * Settings are now integrated into the main page as a slide-out panel.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';

let panel, createSettingsPanel, loadSettings, saveSettings;

beforeEach(async () => {
  window.localStorage.clear();
  vi.resetModules();
  const storageModule = await import('../src/storage.js');
  loadSettings = storageModule.loadSettings;
  saveSettings = storageModule.saveSettings;
  const settingsModule = await import('../src/settings-ui.js');
  createSettingsPanel = settingsModule.createSettingsPanel;
  document.body.innerHTML = '';
  panel = createSettingsPanel();
  document.body.appendChild(panel);
});

describe('settings panel creation', () => {
  test('creates a settings panel element', () => {
    expect(panel).toBeInstanceOf(HTMLElement);
    expect(panel.id).toBe('settingsPanel');
  });

  test('contains provider select', () => {
    const select = panel.querySelector('#provider');
    expect(select).not.toBeNull();
    expect(select.tagName).toBe('SELECT');
  });

  test('provider select has all 4 options', () => {
    const options = panel.querySelectorAll('#provider option');
    const values = Array.from(options).map(o => o.value);
    expect(values).toEqual(['google', 'microsoft', 'chatgpt', 'offline']);
  });

  test('contains API key input', () => {
    const input = panel.querySelector('#settingsApiKey');
    expect(input).not.toBeNull();
    expect(input.type).toBe('password');
  });

  test('contains model select', () => {
    const select = panel.querySelector('#settingsModel');
    expect(select).not.toBeNull();
  });

  test('contains save button', () => {
    const btn = panel.querySelector('#settingsSaveBtn');
    expect(btn).not.toBeNull();
  });

  test('chatgpt settings are hidden when provider is not chatgpt', () => {
    const providerSelect = panel.querySelector('#provider');
    providerSelect.value = 'google';
    providerSelect.dispatchEvent(new Event('change'));
    const chatgptDiv = panel.querySelector('#settingsChatgpt');
    expect(chatgptDiv.classList.contains('hidden')).toBe(true);
  });

  test('chatgpt settings are visible when provider is chatgpt', () => {
    const providerSelect = panel.querySelector('#provider');
    providerSelect.value = 'chatgpt';
    providerSelect.dispatchEvent(new Event('change'));
    const chatgptDiv = panel.querySelector('#settingsChatgpt');
    expect(chatgptDiv.classList.contains('hidden')).toBe(false);
  });
});

describe('settings panel save', () => {
  test('save button persists settings to localStorage', () => {
    const providerSelect = panel.querySelector('#provider');
    const apiKeyInput = panel.querySelector('#settingsApiKey');
    const modelSelect = panel.querySelector('#settingsModel');

    providerSelect.value = 'microsoft';
    apiKeyInput.value = 'sk-test-123';
    modelSelect.value = 'gpt-4o';

    panel.querySelector('#settingsSaveBtn').click();

    const saved = loadSettings();
    expect(saved.translationProvider).toBe('microsoft');
    expect(saved.openaiApiKey).toBe('sk-test-123');
    expect(saved.openaiModel).toBe('gpt-4o');
  });

  test('shows status message after save', () => {
    panel.querySelector('#settingsSaveBtn').click();
    const status = panel.querySelector('#settingsStatus');
    expect(status.textContent).toBe('Settings saved!');
    expect(status.style.display).not.toBe('none');
  });
});

describe('settings panel loads existing values', () => {
  test('populates fields from localStorage on creation', () => {
    saveSettings({
      translationProvider: 'offline',
      openaiApiKey: 'sk-existing',
      openaiModel: 'gpt-4-turbo',
    });

    document.body.innerHTML = '';
    const panel2 = createSettingsPanel();
    document.body.appendChild(panel2);

    expect(panel2.querySelector('#provider').value).toBe('offline');
    expect(panel2.querySelector('#settingsApiKey').value).toBe('sk-existing');
    expect(panel2.querySelector('#settingsModel').value).toBe('gpt-4-turbo');
  });
});
