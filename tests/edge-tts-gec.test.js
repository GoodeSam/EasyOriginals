/**
 * TDD Tests: Edge TTS Sec-MS-GEC authentication token.
 *
 * The Edge TTS service requires a time-based DRM token (Sec-MS-GEC)
 * computed as SHA-256 of a timestamp+token string. Without this token,
 * the WebSocket connection is rejected. playEdgeTTS must generate and
 * include this token in the WebSocket URL query parameters.
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

// ─── SEC_MS_GEC_VERSION constant ────────────────────────────────────

describe('Edge TTS GEC version constant', () => {
  test('SEC_MS_GEC_VERSION is defined', () => {
    expect(readerSrc).toMatch(/SEC_MS_GEC_VERSION\s*=\s*['"]/);
  });
});

// ─── generateSecMsGec function ──────────────────────────────────────

describe('generateSecMsGec function', () => {
  test('reader.js defines generateSecMsGec as async', () => {
    expect(readerSrc).toMatch(/async function generateSecMsGec\s*\(/);
  });

  test('generateSecMsGec computes ticks from current time with Windows epoch offset', () => {
    const fn = readerSrc.match(/async function generateSecMsGec[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // Windows epoch offset: 11644473600
    expect(fn[0]).toMatch(/11644473600/);
  });

  test('generateSecMsGec rounds ticks to 5-minute intervals', () => {
    const fn = readerSrc.match(/async function generateSecMsGec[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // Should modulo by 300 seconds (5 minutes)
    expect(fn[0]).toMatch(/%\s*300/);
  });

  test('generateSecMsGec converts to 100-nanosecond intervals', () => {
    const fn = readerSrc.match(/async function generateSecMsGec[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    // Multiply by 1e7 (10,000,000) for 100-nanosecond intervals
    expect(fn[0]).toMatch(/1e7|10000000/);
  });

  test('generateSecMsGec uses crypto.subtle.digest for SHA-256', () => {
    const fn = readerSrc.match(/async function generateSecMsGec[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/crypto\.subtle\.digest/);
    expect(fn[0]).toMatch(/SHA-256/);
  });

  test('generateSecMsGec produces uppercase hex output', () => {
    const fn = readerSrc.match(/async function generateSecMsGec[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/toUpperCase\(\)/);
  });

  test('generateSecMsGec concatenates ticks and EDGE_TTS_TOKEN', () => {
    const fn = readerSrc.match(/async function generateSecMsGec[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/EDGE_TTS_TOKEN/);
  });
});

// ─── playEdgeTTS uses GEC token ─────────────────────────────────────

describe('playEdgeTTS includes GEC token in WebSocket URL', () => {
  test('playEdgeTTS is async', () => {
    expect(readerSrc).toMatch(/async function playEdgeTTS\s*\(/);
  });

  test('playEdgeTTS awaits generateSecMsGec', () => {
    const fn = readerSrc.match(/async function playEdgeTTS[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/await generateSecMsGec\(\)/);
  });

  test('WebSocket URL includes Sec-MS-GEC query parameter', () => {
    const fn = readerSrc.match(/async function playEdgeTTS[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/Sec-MS-GEC=/);
  });

  test('WebSocket URL includes Sec-MS-GEC-Version query parameter', () => {
    const fn = readerSrc.match(/async function playEdgeTTS[\s\S]*?\n\}/);
    expect(fn).not.toBeNull();
    expect(fn[0]).toMatch(/Sec-MS-GEC-Version=/);
  });
});
