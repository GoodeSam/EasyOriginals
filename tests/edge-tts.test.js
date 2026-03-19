/**
 * TDD Tests: Edge TTS (Read Aloud) for free, natural-sounding speech.
 *
 * When no OpenAI API key is configured, speakText() uses Microsoft Edge's
 * Read Aloud service via WebSocket. This provides multiple high-quality
 * neural voices without requiring any API key. The user can select their
 * preferred voice in Settings.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

let readerSrc, storageSrc, settingsSrc, htmlSrc;

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
  htmlSrc = fs.readFileSync(
    path.resolve(__dirname, '../index.html'), 'utf-8'
  );
});

// ─── Constants ──────────────────────────────────────────────────────

describe('Edge TTS constants', () => {
  test('EDGE_TTS_URL points to speech.platform.bing.com WebSocket', () => {
    expect(readerSrc).toMatch(
      /EDGE_TTS_URL\s*=\s*['"]wss:\/\/speech\.platform\.bing\.com/
    );
  });

  test('EDGE_TTS_TOKEN is defined', () => {
    expect(readerSrc).toMatch(/EDGE_TTS_TOKEN\s*=\s*['"]/);
  });

  test('EDGE_TTS_VOICES array has multiple voice options', () => {
    const match = readerSrc.match(/EDGE_TTS_VOICES\s*=\s*\[([\s\S]*?)\];/);
    expect(match).not.toBeNull();
    // Should have at least 4 voices
    const voiceEntries = match[1].match(/value:/g);
    expect(voiceEntries).not.toBeNull();
    expect(voiceEntries.length).toBeGreaterThanOrEqual(4);
  });

  test('voices include both male and female options', () => {
    const match = readerSrc.match(/EDGE_TTS_VOICES\s*=\s*\[([\s\S]*?)\];/);
    expect(match).not.toBeNull();
    const voicesBlock = match[1];
    expect(voicesBlock).toMatch(/female/i);
    expect(voicesBlock).toMatch(/male/i);
  });

  test('voices include Neural voice names', () => {
    const match = readerSrc.match(/EDGE_TTS_VOICES\s*=\s*\[([\s\S]*?)\];/);
    expect(match).not.toBeNull();
    expect(match[1]).toMatch(/Neural/);
  });

  test('EDGE_TTS_DEFAULT_VOICE is defined', () => {
    expect(readerSrc).toMatch(/EDGE_TTS_DEFAULT_VOICE\s*=\s*['"]/);
  });
});

// ─── playEdgeTTS function ───────────────────────────────────────────

describe('playEdgeTTS function', () => {
  test('reader.js defines playEdgeTTS', () => {
    expect(readerSrc).toMatch(/function playEdgeTTS\s*\(/);
  });

  test('playEdgeTTS creates a WebSocket connection', () => {
    const fn = readerSrc.match(/function playEdgeTTS[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/new WebSocket\(/);
  });

  test('playEdgeTTS sends SSML with voice name', () => {
    const fn = readerSrc.match(/function playEdgeTTS[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/ssml/i);
    expect(fn[0]).toMatch(/<voice name=/);
  });

  test('playEdgeTTS uses state.edgeTtsVoice for voice selection', () => {
    const fn = readerSrc.match(/function playEdgeTTS[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/state\.edgeTtsVoice/);
  });

  test('playEdgeTTS collects audio chunks from binary messages', () => {
    const fn = readerSrc.match(/function playEdgeTTS[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/audioChunks/);
  });

  test('playEdgeTTS plays audio via Audio element from Blob', () => {
    const fn = readerSrc.match(/function playEdgeTTS[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/new Blob\(/);
    expect(fn[0]).toMatch(/new Audio\(/);
  });

  test('playEdgeTTS detects turn.end to know when audio is complete', () => {
    const fn = readerSrc.match(/function playEdgeTTS[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/turn\.end/);
  });

  test('playEdgeTTS revokes blob URL after playback', () => {
    const fn = readerSrc.match(/function playEdgeTTS[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/revokeObjectURL/);
  });
});

// ─── speakText uses playEdgeTTS ─────────────────────────────────────

describe('speakText uses Edge TTS as fallback', () => {
  test('speakText calls playEdgeTTS when no API key', () => {
    const fn = readerSrc.match(/function speakText[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/playEdgeTTS/);
  });

  test('speakText does NOT use speechSynthesis', () => {
    const fn = readerSrc.match(/function speakText[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).not.toMatch(/speechSynthesis/);
    expect(fn[0]).not.toMatch(/SpeechSynthesisUtterance/);
  });
});

// ─── State & persistence ────────────────────────────────────────────

describe('Edge TTS voice state', () => {
  test('state object includes edgeTtsVoice', () => {
    const stateBlock = readerSrc.match(/let state\s*=\s*\{[\s\S]*?\n\};/);
    expect(stateBlock).not.toBeNull();
    expect(stateBlock[0]).toMatch(/edgeTtsVoice/);
  });

  test('ensureSettings loads edgeTtsVoice', () => {
    const fn = readerSrc.match(/function ensureSettings[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/edgeTtsVoice/);
  });

  test('storage.js includes edgeTtsVoice key', () => {
    expect(storageSrc).toMatch(/edgeTtsVoice/);
  });
});

// ─── Settings UI voice selector ─────────────────────────────────────

describe('voice selector in settings', () => {
  test('settings-ui.js includes a voice select element', () => {
    expect(settingsSrc).toMatch(/edgeTtsVoice|edge-tts-voice|voiceSelect/);
  });

  test('settings-ui.js references EDGE_TTS_VOICES for populating options', () => {
    // The settings UI should import or reference the voices list
    expect(settingsSrc).toMatch(/EDGE_TTS_VOICES/);
  });

  test('settings save includes edgeTtsVoice', () => {
    expect(settingsSrc).toMatch(/edgeTtsVoice/);
  });
});

// ─── CSP allows WebSocket ───────────────────────────────────────────

describe('CSP allows Edge TTS WebSocket', () => {
  test('connect-src includes wss://speech.platform.bing.com', () => {
    const cspMatch = htmlSrc.match(/connect-src\s+([^;"]+)/);
    expect(cspMatch).not.toBeNull();
    expect(cspMatch[1]).toMatch(/wss:\/\/speech\.platform\.bing\.com/);
  });
});
