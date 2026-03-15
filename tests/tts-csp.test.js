/**
 * TDD Tests: CSP must allow blob: audio playback for TTS.
 *
 * Problem: The Content-Security-Policy has no media-src directive, so it
 * falls back to default-src 'self'. This blocks Audio elements from loading
 * blob: URLs created by playTTS(), causing silent failure on Listen/Pronounce.
 *
 * Fix: Add media-src 'self' blob: to the CSP meta tag.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('CSP allows blob audio for TTS playback', () => {
  let indexHtml;

  beforeEach(() => {
    indexHtml = fs.readFileSync(
      path.resolve(__dirname, '../index.html'),
      'utf-8'
    );
  });

  test('CSP includes media-src directive', () => {
    expect(indexHtml).toMatch(/media-src\s/);
  });

  test('CSP media-src allows blob: URLs for TTS audio', () => {
    const cspMatch = indexHtml.match(/media-src\s+([^;"]+)/);
    expect(cspMatch).not.toBeNull();
    expect(cspMatch[1]).toContain('blob:');
  });
});
