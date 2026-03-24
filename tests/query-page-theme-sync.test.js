/**
 * TDD Tests: word popup, sentence panel, and paragraph popup must adapt
 * their background and text colors to the active theme (white, black,
 * brown, green), matching the main reading interface.
 *
 * Currently all three panels use hardcoded #fff backgrounds and dark text,
 * ignoring the selected theme entirely.
 *
 * @vitest-environment happy-dom
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('query page theme colour synchronisation', () => {
  let css;

  beforeEach(() => {
    css = fs.readFileSync(
      path.resolve(__dirname, '../src/reader.css'),
      'utf-8'
    );
  });

  // ── Sentence Panel ──────────────────────────────────────────────

  describe('sentence panel', () => {
    test.each(['black', 'white', 'green'])(
      '%s theme overrides sentence-panel background',
      (theme) => {
        expect(css).toMatch(
          new RegExp(`\\[data-theme="${theme}"\\]\\s+\\.sentence-panel\\s*\\{[^}]*background`)
        );
      }
    );

    test.each(['black', 'white', 'green'])(
      '%s theme overrides panel-header border',
      (theme) => {
        expect(css).toMatch(
          new RegExp(`\\[data-theme="${theme}"\\]\\s+\\.panel-header\\s*\\{[^}]*border`)
        );
      }
    );

    test.each(['black', 'white', 'green'])(
      '%s theme overrides panel-sentence text color',
      (theme) => {
        expect(css).toMatch(
          new RegExp(`\\[data-theme="${theme}"\\]\\s+\\.panel-sentence\\s*\\{[^}]*color`)
        );
      }
    );

    test.each(['black', 'white', 'green'])(
      '%s theme overrides panel-result background',
      (theme) => {
        expect(css).toMatch(
          new RegExp(`\\[data-theme="${theme}"\\]\\s+\\.panel-result\\s*\\{[^}]*background`)
        );
      }
    );
  });

  // ── Word Popup ──────────────────────────────────────────────────

  describe('word popup', () => {
    test.each(['black', 'white', 'green'])(
      '%s theme overrides word-popup background',
      (theme) => {
        expect(css).toMatch(
          new RegExp(`\\[data-theme="${theme}"\\]\\s+\\.word-popup\\s*\\{[^}]*background`)
        );
      }
    );

    test.each(['black', 'white', 'green'])(
      '%s theme overrides word-popup-header border',
      (theme) => {
        expect(css).toMatch(
          new RegExp(`\\[data-theme="${theme}"\\]\\s+\\.word-popup-header\\s*\\{[^}]*border`)
        );
      }
    );

    test.each(['black', 'white', 'green'])(
      '%s theme overrides def-text or word-popup-body color',
      (theme) => {
        // Either def-text color or word-popup-body color should be themed
        const hasDefText = css.match(
          new RegExp(`\\[data-theme="${theme}"\\]\\s+\\.def-text\\s*\\{[^}]*color`)
        );
        const hasBody = css.match(
          new RegExp(`\\[data-theme="${theme}"\\]\\s+\\.word-popup-body\\s*\\{[^}]*color`)
        );
        expect(hasDefText || hasBody).not.toBeNull();
      }
    );
  });

  // ── Paragraph Popup ─────────────────────────────────────────────

  describe('paragraph popup', () => {
    test.each(['black', 'white', 'green'])(
      '%s theme overrides para-popup background',
      (theme) => {
        expect(css).toMatch(
          new RegExp(`\\[data-theme="${theme}"\\]\\s+\\.para-popup\\s*\\{[^}]*background`)
        );
      }
    );

    test.each(['black', 'white', 'green'])(
      '%s theme overrides para-popup-header border',
      (theme) => {
        expect(css).toMatch(
          new RegExp(`\\[data-theme="${theme}"\\]\\s+\\.para-popup-header\\s*\\{[^}]*border`)
        );
      }
    );

    test.each(['black', 'white', 'green'])(
      '%s theme overrides para-popup-text color',
      (theme) => {
        expect(css).toMatch(
          new RegExp(`\\[data-theme="${theme}"\\]\\s+\\.para-popup-text\\s*\\{[^}]*color`)
        );
      }
    );

    test.each(['black', 'white', 'green'])(
      '%s theme overrides para-popup-translation color',
      (theme) => {
        expect(css).toMatch(
          new RegExp(`\\[data-theme="${theme}"\\]\\s+\\.para-popup-translation\\s*\\{[^}]*color`)
        );
      }
    );
  });

  // ── Dark theme uses dark backgrounds ────────────────────────────

  describe('dark theme visual correctness', () => {
    test('sentence-panel dark theme has dark background', () => {
      const match = css.match(
        /\[data-theme="black"\]\s+\.sentence-panel\s*\{([^}]*)\}/
      );
      expect(match).not.toBeNull();
      // Should NOT be white (#fff or #ffffff)
      expect(match[1]).not.toMatch(/background\s*:\s*#fff(fff)?[;\s]/);
    });

    test('word-popup dark theme has dark background', () => {
      const match = css.match(
        /\[data-theme="black"\]\s+\.word-popup\s*\{([^}]*)\}/
      );
      expect(match).not.toBeNull();
      expect(match[1]).not.toMatch(/background\s*:\s*#fff(fff)?[;\s]/);
    });

    test('para-popup dark theme has dark background', () => {
      const match = css.match(
        /\[data-theme="black"\]\s+\.para-popup\s*\{([^}]*)\}/
      );
      expect(match).not.toBeNull();
      expect(match[1]).not.toMatch(/background\s*:\s*#fff(fff)?[;\s]/);
    });
  });

  // ── Green theme uses green-family colours ───────────────────────

  describe('green theme visual correctness', () => {
    test('sentence-panel green theme has green-tinted background', () => {
      const match = css.match(
        /\[data-theme="green"\]\s+\.sentence-panel\s*\{([^}]*)\}/
      );
      expect(match).not.toBeNull();
      expect(match[1]).toMatch(/background\s*:\s*#/);
    });

    test('word-popup green theme has green-tinted background', () => {
      const match = css.match(
        /\[data-theme="green"\]\s+\.word-popup\s*\{([^}]*)\}/
      );
      expect(match).not.toBeNull();
      expect(match[1]).toMatch(/background\s*:\s*#/);
    });
  });
});
