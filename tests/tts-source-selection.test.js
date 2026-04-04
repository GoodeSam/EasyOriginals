/**
 * TDD Tests: TTS source selection — user chooses which voice engine is active.
 *
 * Users can pick between "edge" (Read Aloud Voice, free) and "openai"
 * (TTS Voice Persona, API key required). The chosen source is tried first;
 * the other serves as fallback. The settings UI reflects which is active.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';

let readerSrc, storageSrc, settingsSrc;

beforeEach(() => {
  readerSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/reader.js'), 'utf-8'
  );
  storageSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/storage.js'), 'utf-8'
  );
  settingsSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/settings-ui.js'), 'utf-8'
  );
});

// ─── Storage layer ──────────────────────────────────────────────────

describe('ttsSource in storage', () => {
  test('KEYS includes ttsSource mapping', () => {
    expect(storageSrc).toMatch(/ttsSource\s*:\s*['"]reader-tts-source['"]/);
  });

  test('DEFAULTS includes ttsSource with value edge', () => {
    const defaultsBlock = storageSrc.match(/DEFAULTS\s*=\s*\{[\s\S]*?\};/);
    expect(defaultsBlock).not.toBeNull();
    expect(defaultsBlock[0]).toMatch(/ttsSource\s*:\s*['"]edge['"]/);
  });
});

describe('ttsSource storage round-trip', () => {
  let loadSettings, saveSettings;

  beforeEach(async () => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.resetModules();
    const mod = await import('../src/storage.js');
    loadSettings = mod.loadSettings;
    saveSettings = mod.saveSettings;
  });

  test('loadSettings returns default ttsSource of edge', () => {
    const s = loadSettings();
    expect(s.ttsSource).toBe('edge');
  });

  test('saveSettings persists ttsSource to localStorage', () => {
    saveSettings({ ttsSource: 'openai' });
    expect(window.localStorage.getItem('reader-tts-source')).toBe('openai');
  });

  test('loadSettings reads saved ttsSource', () => {
    window.localStorage.setItem('reader-tts-source', 'openai');
    const s = loadSettings();
    expect(s.ttsSource).toBe('openai');
  });
});

// ─── Reader state ───────────────────────────────────────────────────

describe('ttsSource in reader state', () => {
  test('state object includes ttsSource', () => {
    const stateBlock = readerSrc.match(/let state\s*=\s*\{[\s\S]*?\n\};/);
    expect(stateBlock).not.toBeNull();
    expect(stateBlock[0]).toMatch(/ttsSource/);
  });

  test('loadSettings populates state.ttsSource', () => {
    const fn = readerSrc.match(/function loadSettings\(\)[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/ttsSource/);
  });

  test('ensureSettings populates state.ttsSource', () => {
    const fn = readerSrc.match(/function ensureSettings[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/ttsSource/);
  });
});

// ─── speakText routing logic ────────────────────────────────────────

describe('speakText routes based on ttsSource', () => {
  test('speakText checks state.ttsSource to decide primary engine', () => {
    const fn = readerSrc.match(/function speakText[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/state\.ttsSource/);
  });

  test('when ttsSource is edge, playEdgeTTS is called first', () => {
    const fn = readerSrc.match(/function speakText[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // The else branch (default = edge) should call playEdgeTTS as the primary
    expect(fn[0]).toMatch(/else\s*\{[\s\S]*?playEdgeTTS/);
  });

  test('when ttsSource is openai, playTTS is called first', () => {
    const fn = readerSrc.match(/function speakText[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // The openai branch should call playTTS as the primary
    expect(fn[0]).toMatch(/openai[\s\S]*?playTTS/);
  });

  test('speakText still falls back to browser speechSynthesis as last resort', () => {
    const fn = readerSrc.match(/function speakText[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/speechSynthesis/);
  });
});

// ─── Settings UI ────────────────────────────────────────────────────

describe('TTS source selector in settings panel', () => {
  let panel, createSettingsPanel, loadSettings, saveSettings;

  beforeEach(async () => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.resetModules();
    const storageModule = await import('../src/storage.js');
    loadSettings = storageModule.loadSettings;
    saveSettings = storageModule.saveSettings;
    const settingsModule = await import('../src/settings-ui.js');
    createSettingsPanel = settingsModule.createSettingsPanel;
    document.body.innerHTML = '';
    window.EDGE_TTS_VOICES = [
      { value: 'en-US-AriaNeural', label: 'Aria (US, female)' },
    ];
    window.OPENAI_TTS_VOICES = [
      { value: 'alloy', label: 'Alloy', persona: 'Neutral and balanced' },
    ];
    panel = createSettingsPanel();
    document.body.appendChild(panel);
  });

  test('settings panel contains a TTS source select element', () => {
    const select = panel.querySelector('#ttsSource');
    expect(select).not.toBeNull();
    expect(select.tagName).toBe('SELECT');
  });

  test('TTS source selector has edge and openai options', () => {
    const select = panel.querySelector('#ttsSource');
    const values = Array.from(select.options).map(o => o.value);
    expect(values).toContain('edge');
    expect(values).toContain('openai');
  });

  test('edge option label mentions free / no API key', () => {
    const select = panel.querySelector('#ttsSource');
    const edgeOption = Array.from(select.options).find(o => o.value === 'edge');
    expect(edgeOption.textContent).toMatch(/free|no API key/i);
  });

  test('openai option label mentions API key required', () => {
    const select = panel.querySelector('#ttsSource');
    const openaiOption = Array.from(select.options).find(o => o.value === 'openai');
    expect(openaiOption.textContent).toMatch(/API key/i);
  });

  test('TTS source defaults to edge', () => {
    const select = panel.querySelector('#ttsSource');
    expect(select.value).toBe('edge');
  });

  test('save button persists ttsSource to storage', () => {
    const select = panel.querySelector('#ttsSource');
    select.value = 'openai';

    panel.querySelector('#settingsSaveBtn').click();

    const saved = loadSettings();
    expect(saved.ttsSource).toBe('openai');
  });

  test('selector loads saved ttsSource on panel creation', () => {
    saveSettings({ ttsSource: 'openai' });

    document.body.innerHTML = '';
    vi.resetModules();
    return import('../src/settings-ui.js').then(mod => {
      const panel2 = mod.createSettingsPanel();
      document.body.appendChild(panel2);
      const select = panel2.querySelector('#ttsSource');
      expect(select.value).toBe('openai');
    });
  });
});
