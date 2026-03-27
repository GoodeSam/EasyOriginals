/**
 * TDD Tests: Adjustable speech rate for Microsoft Edge TTS.
 *
 * Users can control how fast/slow the TTS reads aloud via a setting
 * that maps to the SSML <prosody rate="..."> parameter. The rate is
 * stored in localStorage and exposed in the settings panel as a slider.
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

describe('speechRate in storage', () => {
  test('KEYS includes speechRate mapping', () => {
    expect(storageSrc).toMatch(/speechRate\s*:\s*['"]reader-speech-rate['"]/);
  });

  test('DEFAULTS includes speechRate with value 0', () => {
    // Default rate is 0 (normal speed), meaning '+0%' in SSML
    const defaultsBlock = storageSrc.match(/DEFAULTS\s*=\s*\{[\s\S]*?\};/);
    expect(defaultsBlock).not.toBeNull();
    expect(defaultsBlock[0]).toMatch(/speechRate\s*:\s*0/);
  });
});

describe('speechRate storage round-trip', () => {
  let loadSettings, saveSettings;

  beforeEach(async () => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.resetModules();
    const mod = await import('../src/storage.js');
    loadSettings = mod.loadSettings;
    saveSettings = mod.saveSettings;
  });

  test('loadSettings returns default speechRate of 0', () => {
    const s = loadSettings();
    expect(s.speechRate).toBe(0);
  });

  test('saveSettings persists speechRate to localStorage', () => {
    saveSettings({ speechRate: 25 });
    expect(window.localStorage.getItem('reader-speech-rate')).toBe('25');
  });

  test('loadSettings reads saved speechRate', () => {
    window.localStorage.setItem('reader-speech-rate', '50');
    const s = loadSettings();
    expect(s.speechRate).toBe('50');
  });
});

// ─── Reader state ───────────────────────────────────────────────────

describe('speechRate in reader state', () => {
  test('state object includes speechRate', () => {
    const stateBlock = readerSrc.match(/let state\s*=\s*\{[\s\S]*?\n\};/);
    expect(stateBlock).not.toBeNull();
    expect(stateBlock[0]).toMatch(/speechRate/);
  });

  test('loadSettings populates state.speechRate', () => {
    const fn = readerSrc.match(/function loadSettings\(\)[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/speechRate/);
  });

  test('ensureSettings populates state.speechRate', () => {
    const fn = readerSrc.match(/function ensureSettings[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/speechRate/);
  });
});

// ─── SSML prosody rate ──────────────────────────────────────────────

describe('playEdgeTTS uses speechRate in SSML', () => {
  test('playEdgeTTS reads state.speechRate for the prosody rate', () => {
    const fn = readerSrc.match(/function playEdgeTTS[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/state\.speechRate/);
  });

  test('SSML prosody rate is dynamic (not hardcoded +0%)', () => {
    const fn = readerSrc.match(/function playEdgeTTS[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // The rate attribute should use a variable, not a literal '+0%'
    expect(fn[0]).toMatch(/rate=.*\$\{/);
    // Should NOT have a hardcoded rate='+0%'
    expect(fn[0]).not.toMatch(/rate='\+0%'/);
  });

  test('rate is formatted with sign and percent (e.g. +20% or -10%)', () => {
    // The SSML should produce rate='+25%' or rate='-10%' style values
    const fn = readerSrc.match(/function playEdgeTTS[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // Should format with sign (+/-) and % suffix
    expect(fn[0]).toMatch(/%/);
  });
});

// ─── Settings UI ────────────────────────────────────────────────────

describe('speech rate control in settings panel', () => {
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
    panel = createSettingsPanel();
    document.body.appendChild(panel);
  });

  test('settings panel contains a speech rate range input', () => {
    const input = panel.querySelector('#speechRate');
    expect(input).not.toBeNull();
    expect(input.type).toBe('range');
  });

  test('speech rate slider has correct min/max/step', () => {
    const input = panel.querySelector('#speechRate');
    expect(Number(input.min)).toBe(-50);
    expect(Number(input.max)).toBe(100);
    expect(Number(input.step)).toBe(5);
  });

  test('speech rate slider defaults to 0 (normal speed)', () => {
    const input = panel.querySelector('#speechRate');
    expect(Number(input.value)).toBe(0);
  });

  test('speech rate label shows current percentage', () => {
    const label = panel.querySelector('#speechRateLabel');
    expect(label).not.toBeNull();
    expect(label.textContent).toMatch(/0%|Normal/);
  });

  test('save button persists speechRate to storage', () => {
    const input = panel.querySelector('#speechRate');
    input.value = '25';
    input.dispatchEvent(new Event('input'));

    panel.querySelector('#settingsSaveBtn').click();

    const saved = loadSettings();
    expect(Number(saved.speechRate)).toBe(25);
  });

  test('slider loads saved speechRate on panel creation', () => {
    saveSettings({ speechRate: -20 });

    document.body.innerHTML = '';
    vi.resetModules();
    // Re-import to get fresh module with updated storage
    return import('../src/settings-ui.js').then(mod => {
      const panel2 = mod.createSettingsPanel();
      document.body.appendChild(panel2);
      const input = panel2.querySelector('#speechRate');
      expect(Number(input.value)).toBe(-20);
    });
  });

  test('changing slider updates the label in real-time', () => {
    const input = panel.querySelector('#speechRate');
    const label = panel.querySelector('#speechRateLabel');

    input.value = '30';
    input.dispatchEvent(new Event('input'));
    expect(label.textContent).toContain('30%');

    input.value = '-15';
    input.dispatchEvent(new Event('input'));
    expect(label.textContent).toContain('-15%');
  });
});
