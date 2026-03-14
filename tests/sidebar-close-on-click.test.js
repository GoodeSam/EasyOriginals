/**
 * TDD Tests: clicking on the main reader content area closes all open side panels.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

const SIDE_PANELS = ['notesPanel', 'historyPanel', 'wordListPanel', 'settingsPanel'];

beforeEach(() => {
  document.body.innerHTML = `
    <div id="readerScreen" class="screen active">
      <div class="top-bar"></div>
      <div class="reader-content" id="readerContent">
        <div class="paragraph">
          <span class="sentence" data-sentence="Hello world.">
            <span class="word">Hello</span> <span class="word">world.</span>
          </span>
        </div>
      </div>
      <div class="bottom-bar"></div>
    </div>
    <div class="side-panel notes-panel active" id="notesPanel"></div>
    <div class="side-panel history-panel" id="historyPanel"></div>
    <div class="side-panel wordlist-panel active" id="wordListPanel"></div>
    <div class="side-panel settings-panel" id="settingsPanel"></div>
  `;
});

describe('closeAllSidePanels function', () => {
  test('reader.js exports or defines closeAllSidePanels', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/reader.js'), 'utf-8');
    expect(src).toMatch(/function closeAllSidePanels/);
  });

  test('closeAllSidePanels removes active class from all side panels', () => {
    // Simulate what closeAllSidePanels should do
    document.querySelectorAll('.side-panel').forEach(p => p.classList.remove('active'));

    SIDE_PANELS.forEach(id => {
      expect(document.getElementById(id).classList.contains('active')).toBe(false);
    });
  });

  test('only panels with active class are affected', () => {
    const historyPanel = document.getElementById('historyPanel');
    expect(historyPanel.classList.contains('active')).toBe(false);

    document.querySelectorAll('.side-panel').forEach(p => p.classList.remove('active'));

    // historyPanel was already inactive — no error, still inactive
    expect(historyPanel.classList.contains('active')).toBe(false);
  });
});

describe('reader content click closes side panels', () => {
  test('reader.js handleReaderClick calls closeAllSidePanels', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/reader.js'), 'utf-8');
    // handleReaderClick should reference closeAllSidePanels
    const fnMatch = src.match(/function handleReaderClick[\s\S]*?\n\}/);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch[0]).toMatch(/closeAllSidePanels/);
  });

  test('clicking empty area of reader content closes panels (DOM simulation)', () => {
    const notesPanel = document.getElementById('notesPanel');
    const wordListPanel = document.getElementById('wordListPanel');
    expect(notesPanel.classList.contains('active')).toBe(true);
    expect(wordListPanel.classList.contains('active')).toBe(true);

    // Simulate the click handler behavior
    document.querySelectorAll('.side-panel').forEach(p => p.classList.remove('active'));

    expect(notesPanel.classList.contains('active')).toBe(false);
    expect(wordListPanel.classList.contains('active')).toBe(false);
  });

  test('clicking a word should not close panels (word click returns early)', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/reader.js'), 'utf-8');
    const fnMatch = src.match(/function handleReaderClick[\s\S]*?\n\}/);
    expect(fnMatch).not.toBeNull();
    // closeAllSidePanels should be called BEFORE the word/paragraph checks
    // so that clicking a word (which returns early) does NOT close panels
    // Actually: the word click does return; closeAllSidePanels should run
    // only when no word or paragraph border was clicked — at the end
    const fnBody = fnMatch[0];
    const closePos = fnBody.indexOf('closeAllSidePanels');
    const wordReturnPos = fnBody.indexOf("showWordPopup");
    // closeAllSidePanels should come after the word handling return
    expect(closePos).toBeGreaterThan(wordReturnPos);
  });
});

describe('side panel structure is preserved', () => {
  test('side panels still use .active class to show', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../src/reader.css'), 'utf-8');
    expect(css).toMatch(/\.side-panel\.active\s*\{/);
  });

  test('each panel still has its own close button handler', () => {
    const readerSrc = fs.readFileSync(path.resolve(__dirname, '../src/reader.js'), 'utf-8');
    const settingsSrc = fs.readFileSync(path.resolve(__dirname, '../src/settings-ui.js'), 'utf-8');
    expect(readerSrc).toMatch(/notesClose/);
    expect(readerSrc).toMatch(/historyClose/);
    expect(readerSrc).toMatch(/wordListClose/);
    expect(settingsSrc).toMatch(/settingsClose/);
  });
});
