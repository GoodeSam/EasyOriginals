/**
 * TDD Tests: OpenAI TTS voice selection and persona choices.
 *
 * The OpenAI TTS API supports multiple voices (alloy, echo, fable, onyx,
 * nova, shimmer), each with a distinct pronunciation style. Users can
 * select their preferred voice in Settings, with persona labels describing
 * each voice's characteristics for language learners.
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

// ─── OpenAI TTS Voices constant ─────────────────────────────────────

describe('OPENAI_TTS_VOICES constant', () => {
  test('reader.js defines OPENAI_TTS_VOICES array', () => {
    expect(readerSrc).toMatch(/OPENAI_TTS_VOICES\s*=\s*\[/);
  });

  test('OPENAI_TTS_VOICES includes all six OpenAI voices', () => {
    const match = readerSrc.match(/OPENAI_TTS_VOICES\s*=\s*\[([\s\S]*?)\];/);
    expect(match).not.toBeNull();
    const block = match[1];
    for (const voice of ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']) {
      expect(block).toContain(voice);
    }
  });

  test('each voice entry has value, label, and persona fields', () => {
    const match = readerSrc.match(/OPENAI_TTS_VOICES\s*=\s*\[([\s\S]*?)\];/);
    expect(match).not.toBeNull();
    const block = match[1];
    // Should have 6 entries with value, label, and persona
    const valueEntries = block.match(/value:/g);
    const labelEntries = block.match(/label:/g);
    const personaEntries = block.match(/persona:/g);
    expect(valueEntries).toHaveLength(6);
    expect(labelEntries).toHaveLength(6);
    expect(personaEntries).toHaveLength(6);
  });

  test('persona descriptions mention pronunciation characteristics', () => {
    const match = readerSrc.match(/OPENAI_TTS_VOICES\s*=\s*\[([\s\S]*?)\];/);
    expect(match).not.toBeNull();
    // Personas should be descriptive strings (not empty)
    const personas = match[1].match(/persona:\s*'([^']+)'/g);
    expect(personas).not.toBeNull();
    expect(personas.length).toBe(6);
    // Each persona should have at least 5 characters of description
    for (const p of personas) {
      const desc = p.match(/persona:\s*'([^']+)'/)[1];
      expect(desc.length).toBeGreaterThanOrEqual(5);
    }
  });

  test('OPENAI_TTS_VOICES is exposed on window', () => {
    expect(readerSrc).toMatch(/window\.OPENAI_TTS_VOICES\s*=\s*OPENAI_TTS_VOICES/);
  });
});

// ─── playTTS uses configurable voice ────────────────────────────────

describe('playTTS uses state.openaiTtsVoice', () => {
  test('playTTS reads state.openaiTtsVoice instead of hardcoded constant', () => {
    const fn = readerSrc.match(/function playTTS[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/state\.openaiTtsVoice/);
  });

  test('playTTS falls back to a default voice if state.openaiTtsVoice is empty', () => {
    const fn = readerSrc.match(/function playTTS[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // Should have a fallback like: state.openaiTtsVoice || 'alloy'
    expect(fn[0]).toMatch(/state\.openaiTtsVoice\s*\|\|\s*['"]alloy['"]/);
  });
});

// ─── Storage layer ──────────────────────────────────────────────────

describe('openaiTtsVoice in storage', () => {
  test('KEYS includes openaiTtsVoice mapping', () => {
    expect(storageSrc).toMatch(/openaiTtsVoice\s*:\s*['"]reader-openai-tts-voice['"]/);
  });

  test('DEFAULTS includes openaiTtsVoice with value alloy', () => {
    const defaultsBlock = storageSrc.match(/DEFAULTS\s*=\s*\{[\s\S]*?\};/);
    expect(defaultsBlock).not.toBeNull();
    expect(defaultsBlock[0]).toMatch(/openaiTtsVoice\s*:\s*['"]alloy['"]/);
  });
});

describe('openaiTtsVoice storage round-trip', () => {
  let loadSettings, saveSettings;

  beforeEach(async () => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.resetModules();
    const mod = await import('../src/storage.js');
    loadSettings = mod.loadSettings;
    saveSettings = mod.saveSettings;
  });

  test('loadSettings returns default openaiTtsVoice of alloy', () => {
    const s = loadSettings();
    expect(s.openaiTtsVoice).toBe('alloy');
  });

  test('saveSettings persists openaiTtsVoice to localStorage', () => {
    saveSettings({ openaiTtsVoice: 'nova' });
    expect(window.localStorage.getItem('reader-openai-tts-voice')).toBe('nova');
  });

  test('loadSettings reads saved openaiTtsVoice', () => {
    window.localStorage.setItem('reader-openai-tts-voice', 'shimmer');
    const s = loadSettings();
    expect(s.openaiTtsVoice).toBe('shimmer');
  });
});

// ─── Reader state ───────────────────────────────────────────────────

describe('openaiTtsVoice in reader state', () => {
  test('state object includes openaiTtsVoice', () => {
    const stateBlock = readerSrc.match(/let state\s*=\s*\{[\s\S]*?\n\};/);
    expect(stateBlock).not.toBeNull();
    expect(stateBlock[0]).toMatch(/openaiTtsVoice/);
  });

  test('loadSettings populates state.openaiTtsVoice', () => {
    const fn = readerSrc.match(/function loadSettings\(\)[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/openaiTtsVoice/);
  });

  test('ensureSettings populates state.openaiTtsVoice', () => {
    const fn = readerSrc.match(/function ensureSettings[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/openaiTtsVoice/);
  });
});

// ─── Settings UI ────────────────────────────────────────────────────

describe('OpenAI TTS voice selector in settings panel', () => {
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
    // Expose OPENAI_TTS_VOICES for settings-ui.js
    window.OPENAI_TTS_VOICES = [
      { value: 'alloy', label: 'Alloy', persona: 'Neutral and balanced' },
      { value: 'echo', label: 'Echo', persona: 'Warm and resonant' },
      { value: 'fable', label: 'Fable', persona: 'Expressive and British' },
      { value: 'onyx', label: 'Onyx', persona: 'Deep and authoritative' },
      { value: 'nova', label: 'Nova', persona: 'Friendly and upbeat' },
      { value: 'shimmer', label: 'Shimmer', persona: 'Clear and refined' },
    ];
    panel = createSettingsPanel();
    document.body.appendChild(panel);
  });

  test('settings panel contains an OpenAI TTS voice select element', () => {
    const select = panel.querySelector('#openaiTtsVoice');
    expect(select).not.toBeNull();
    expect(select.tagName).toBe('SELECT');
  });

  test('voice selector is populated with all six voices', () => {
    const select = panel.querySelector('#openaiTtsVoice');
    expect(select.options.length).toBe(6);
  });

  test('each option shows label with persona description', () => {
    const select = panel.querySelector('#openaiTtsVoice');
    const firstOption = select.options[0];
    // Option text should include both label and persona
    expect(firstOption.textContent).toContain('Alloy');
    expect(firstOption.textContent).toMatch(/Neutral|balanced/i);
  });

  test('voice selector defaults to alloy', () => {
    const select = panel.querySelector('#openaiTtsVoice');
    expect(select.value).toBe('alloy');
  });

  test('save button persists openaiTtsVoice to storage', () => {
    const select = panel.querySelector('#openaiTtsVoice');
    select.value = 'nova';

    panel.querySelector('#settingsSaveBtn').click();

    const saved = loadSettings();
    expect(saved.openaiTtsVoice).toBe('nova');
  });

  test('selector loads saved openaiTtsVoice on panel creation', () => {
    saveSettings({ openaiTtsVoice: 'shimmer' });

    document.body.innerHTML = '';
    vi.resetModules();
    return import('../src/settings-ui.js').then(mod => {
      const panel2 = mod.createSettingsPanel();
      document.body.appendChild(panel2);
      const select = panel2.querySelector('#openaiTtsVoice');
      expect(select.value).toBe('shimmer');
    });
  });

  test('voice selector is inside the ChatGPT settings section', () => {
    // Should be within the settingsChatgpt div since it requires an API key
    const chatgptDiv = panel.querySelector('#settingsChatgpt');
    expect(chatgptDiv).not.toBeNull();
    const voiceSelect = chatgptDiv.querySelector('#openaiTtsVoice');
    expect(voiceSelect).not.toBeNull();
  });
});
