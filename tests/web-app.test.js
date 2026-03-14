/**
 * TDD Tests for web app integration.
 * Ensures the app works as a standalone web page without Chrome extension APIs.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

let indexHtml;

beforeEach(() => {
  indexHtml = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf-8');
});

describe('index.html structure', () => {
  test('is valid HTML with doctype', () => {
    expect(indexHtml).toMatch(/<!DOCTYPE html>/i);
  });

  test('has no references to chrome extension APIs', () => {
    expect(indexHtml).not.toMatch(/chrome\./);
    expect(indexHtml).not.toMatch(/chrome-extension/);
    expect(indexHtml).not.toMatch(/manifest\.json/);
  });

  test('loads reader.css', () => {
    expect(indexHtml).toMatch(/reader\.css/);
  });

  test('has upload screen', () => {
    expect(indexHtml).toMatch(/id="uploadScreen"/);
  });

  test('has reader screen', () => {
    expect(indexHtml).toMatch(/id="readerScreen"/);
  });

  test('has settings toggle button', () => {
    expect(indexHtml).toMatch(/id="settingsToggle"/);
  });

  test('loads libraries from public directory', () => {
    expect(indexHtml).toMatch(/pdf\.min\.js/);
    expect(indexHtml).toMatch(/epub\.min\.js/);
    expect(indexHtml).toMatch(/jszip\.min\.js/);
  });

  test('loads reader.js as ES module', () => {
    expect(indexHtml).toMatch(/type="module"/);
  });
});

describe('no chrome dependency in source modules', () => {
  test('storage.js has no chrome references', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/storage.js'), 'utf-8');
    expect(src).not.toMatch(/chrome\./);
  });

  test('settings-ui.js has no chrome references', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/settings-ui.js'), 'utf-8');
    expect(src).not.toMatch(/chrome\./);
  });
});
