/**
 * TDD Tests: center sentence and paragraph panels horizontally
 * with full viewport width.
 *
 * Problem: paragraph popup is constrained to width:90% / max-width:600px
 * as a narrow centered box. Both panels should span full viewport width
 * with content centered inside for readability.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('full-width centered query panels', () => {
  let css;

  beforeEach(() => {
    css = fs.readFileSync(
      path.resolve(__dirname, '../src/reader.css'),
      'utf-8'
    );
  });

  // ── Sentence panel: full viewport width ─────────────────────────

  describe('sentence panel full width', () => {
    test('sentence-panel spans full viewport width with left:0 and right:0', () => {
      const rule = css.match(/\.sentence-panel\s*\{([^}]*)\}/);
      expect(rule).not.toBeNull();
      expect(rule[1]).toMatch(/left\s*:\s*0/);
      expect(rule[1]).toMatch(/right\s*:\s*0/);
    });

    test('sentence-panel does not have a narrow max-width', () => {
      const rule = css.match(/\.sentence-panel\s*\{([^}]*)\}/);
      expect(rule).not.toBeNull();
      // Should not be capped at some small pixel value like 600px
      expect(rule[1]).not.toMatch(/max-width\s*:\s*\d{2,3}px/);
    });
  });

  // ── Paragraph popup: full viewport width ────────────────────────

  describe('paragraph popup full width', () => {
    test('para-popup spans full viewport width', () => {
      const rule = css.match(/\.para-popup\s*\{([^}]*)\}/);
      expect(rule).not.toBeNull();
      // Should use left:0; right:0 or width:100% for full viewport width
      const hasLeftRight = rule[1].match(/left\s*:\s*0/) && rule[1].match(/right\s*:\s*0/);
      const hasFullWidth = rule[1].match(/width\s*:\s*100%/);
      expect(hasLeftRight || hasFullWidth).toBeTruthy();
    });

    test('para-popup does not use narrow max-width on container', () => {
      const rule = css.match(/\.para-popup\s*\{([^}]*)\}/);
      expect(rule).not.toBeNull();
      // Should not be capped at 600px — full viewport width
      expect(rule[1]).not.toMatch(/max-width\s*:\s*600px/);
    });

    test('para-popup does not use transform translate for centering', () => {
      const rule = css.match(/\.para-popup\s*\{([^}]*)\}/);
      expect(rule).not.toBeNull();
      // Full-width panels don't need translate centering
      expect(rule[1]).not.toMatch(/transform\s*:\s*translate\(-50%/);
    });

    test('para-popup is anchored to bottom of viewport', () => {
      const rule = css.match(/\.para-popup\s*\{([^}]*)\}/);
      expect(rule).not.toBeNull();
      expect(rule[1]).toMatch(/bottom\s*:\s*0/);
    });
  });

  // ── Content centering inside panels ─────────────────────────────

  describe('content centering', () => {
    test('panel-body has max-width and auto margins for centered content', () => {
      const rule = css.match(/\.panel-body\s*\{([^}]*)\}/);
      expect(rule).not.toBeNull();
      expect(rule[1]).toMatch(/max-width\s*:/);
      expect(rule[1]).toMatch(/margin.*auto/);
    });

    test('para-popup-body has max-width and auto margins for centered content', () => {
      const rule = css.match(/\.para-popup-body\s*\{([^}]*)\}/);
      expect(rule).not.toBeNull();
      expect(rule[1]).toMatch(/max-width\s*:/);
      expect(rule[1]).toMatch(/margin.*auto/);
    });
  });
});
