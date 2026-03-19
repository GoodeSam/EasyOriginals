/**
 * TDD Tests: settings changes take effect without page reload.
 *
 * When the user saves settings (e.g. Edge TTS voice), the runtime
 * state must be invalidated so ensureSettings() reloads from storage
 * on the next call. Otherwise saved changes are ignored until refresh.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

let readerSrc, settingsSrc;

beforeEach(() => {
  readerSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/reader.js'), 'utf-8'
  );
  settingsSrc = fs.readFileSync(
    path.resolve(__dirname, '../src/settings-ui.js'), 'utf-8'
  );
});

// ─── invalidateSettings function ────────────────────────────────────

describe('invalidateSettings function', () => {
  test('reader.js defines an invalidateSettings function', () => {
    expect(readerSrc).toMatch(/function invalidateSettings\s*\(/);
  });

  test('invalidateSettings sets _settingsLoaded to false', () => {
    const fn = readerSrc.match(/function invalidateSettings[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/_settingsLoaded\s*=\s*false/);
  });

  test('invalidateSettings is exposed on window', () => {
    expect(readerSrc).toMatch(/window\.invalidateSettings\s*=\s*invalidateSettings/);
  });
});

// ─── settings-ui.js calls invalidateSettings after save ─────────────

describe('settings save invalidates runtime cache', () => {
  test('settings-ui.js calls invalidateSettings after successful save', () => {
    // After saveSettings() succeeds, invalidateSettings must be called
    expect(settingsSrc).toMatch(/saveSettings[\s\S]*?invalidateSettings/);
  });

  test('invalidateSettings is called via window reference', () => {
    expect(settingsSrc).toMatch(/window\.invalidateSettings|invalidateSettings\s*\(\)/);
  });
});

// ─── loadSettings also loads edgeTtsVoice ───────────────────────────

describe('initial loadSettings includes edgeTtsVoice', () => {
  test('the init-time loadSettings function loads edgeTtsVoice into state', () => {
    // The loadSettings function (called at init) should also set edgeTtsVoice
    const fn = readerSrc.match(/function loadSettings\(\)[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/edgeTtsVoice/);
  });
});
