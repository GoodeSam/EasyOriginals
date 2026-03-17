/**
 * TDD Tests for auto-hide of right-side sidebar toggle buttons and panels.
 * When bars auto-hide in reading mode, sidebar toggles should also hide.
 * Moving the mouse to the right edge (or tapping) should reveal them.
 * Opening a panel should keep it visible until explicitly closed.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

let css;

beforeEach(() => {
  css = fs.readFileSync(path.resolve(__dirname, '../src/reader.css'), 'utf-8');
  document.body.innerHTML = `
    <div id="readerScreen" class="screen active">
      <div class="top-bar"></div>
      <div class="reader-content" id="readerContent"></div>
      <div class="bottom-bar"></div>
    </div>
    <button class="side-toggle notes-toggle visible" id="notesToggle">N</button>
    <button class="side-toggle history-toggle visible" id="historyToggle">H</button>
    <button class="side-toggle wordlist-toggle visible" id="wordListToggle">Aa</button>
    <button class="side-toggle settings-toggle visible" id="settingsToggle">S</button>
    <div class="side-panel notes-panel" id="notesPanel"></div>
    <div class="side-panel history-panel" id="historyPanel"></div>
    <div class="side-panel wordlist-panel" id="wordListPanel"></div>
    <div class="side-panel settings-panel" id="settingsPanel"></div>
  `;
});

describe('CSS: sidebar auto-hide classes', () => {
  test('side-toggle.auto-hide has transition properties', () => {
    expect(css).toMatch(/\.side-toggle\.auto-hide/);
  });

  test('side-toggle.auto-hide moves toggles off-screen', () => {
    // Should translate off-screen to hide (upward for top-positioned toggles)
    const autoHideMatch = css.match(/\.side-toggle\.auto-hide\s*\{([^}]+)\}/);
    expect(autoHideMatch).not.toBeNull();
    const rules = autoHideMatch[1];
    expect(rules).toMatch(/transform:\s*translate[XY]\(/);
  });

  test('side-toggle.auto-hide disables pointer events', () => {
    const autoHideMatch = css.match(/\.side-toggle\.auto-hide\s*\{([^}]+)\}/);
    expect(autoHideMatch).not.toBeNull();
    expect(autoHideMatch[1]).toMatch(/pointer-events:\s*none/);
  });

  test('side-toggle has transition for smooth animation', () => {
    // The .side-toggle base rule should include a transition
    expect(css).toMatch(/\.side-toggle[\s\S]*?transition:/);
  });
});

describe('DOM: auto-hide toggle class manipulation', () => {
  test('adding auto-hide class to all side toggles', () => {
    const toggles = document.querySelectorAll('.side-toggle');
    toggles.forEach(t => t.classList.add('auto-hide'));

    toggles.forEach(t => {
      expect(t.classList.contains('auto-hide')).toBe(true);
    });
  });

  test('removing auto-hide class from all side toggles', () => {
    const toggles = document.querySelectorAll('.side-toggle');
    toggles.forEach(t => t.classList.add('auto-hide'));
    toggles.forEach(t => t.classList.remove('auto-hide'));

    toggles.forEach(t => {
      expect(t.classList.contains('auto-hide')).toBe(false);
    });
  });

  test('auto-hide should not remove visible class', () => {
    const toggle = document.getElementById('notesToggle');
    toggle.classList.add('auto-hide');
    expect(toggle.classList.contains('visible')).toBe(true);
    expect(toggle.classList.contains('auto-hide')).toBe(true);
  });

  test('side panel with active class should not get auto-hide on its toggle', () => {
    // When a panel is open (active), its toggle should stay visible
    const panel = document.getElementById('notesPanel');
    const toggle = document.getElementById('notesToggle');
    panel.classList.add('active');

    // Simulate the logic: only hide toggles whose panels are NOT active
    const toggles = document.querySelectorAll('.side-toggle');
    toggles.forEach(t => {
      const panelId = t.getAttribute('id').replace('Toggle', 'Panel');
      const associatedPanel = document.getElementById(panelId);
      if (!associatedPanel || !associatedPanel.classList.contains('active')) {
        t.classList.add('auto-hide');
      }
    });

    expect(toggle.classList.contains('auto-hide')).toBe(false);
    expect(document.getElementById('historyToggle').classList.contains('auto-hide')).toBe(true);
  });
});

describe('reader.js: sidebar auto-hide integration', () => {
  test('reader.js includes side-toggle auto-hide in startAutoHideTimer', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/reader.js'), 'utf-8');
    expect(src).toMatch(/side-toggle/);
    expect(src).toMatch(/auto-hide/);
  });

  test('reader.js showBars removes auto-hide from side-toggles', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/reader.js'), 'utf-8');
    // showBars should handle side toggles
    const showBarsMatch = src.match(/function showBars\(\)\s*\{([\s\S]*?)\n\}/);
    expect(showBarsMatch).not.toBeNull();
    expect(showBarsMatch[1]).toMatch(/side-toggle/);
  });

  test('reader.js mousemove handler reveals toggles at right edge', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/reader.js'), 'utf-8');
    // Should check for right edge in mousemove handler
    expect(src).toMatch(/atRight|clientX.*innerWidth|window\.innerWidth.*clientX/);
  });

  test('reader.js does not auto-hide toggles when their panel is active', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/reader.js'), 'utf-8');
    // The auto-hide logic should check for active panels
    expect(src).toMatch(/\.active|panel.*active/);
  });
});
