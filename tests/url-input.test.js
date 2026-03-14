/**
 * TDD Tests for URL input feature.
 * Users can enter a web address to load and display its content in the reader.
 */
import { describe, test, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

let indexHtml;

beforeEach(() => {
  indexHtml = fs.readFileSync(path.resolve(__dirname, '../index.html'), 'utf-8');
});

describe('URL input in upload screen HTML', () => {
  test('has a URL input field', () => {
    expect(indexHtml).toMatch(/id="urlInput"/);
  });

  test('URL input has appropriate placeholder', () => {
    expect(indexHtml).toMatch(/placeholder="[^"]*http[^"]*"/i);
  });

  test('has a URL load button', () => {
    expect(indexHtml).toMatch(/id="urlLoadBtn"/);
  });

  test('has a URL error display area', () => {
    expect(indexHtml).toMatch(/id="urlError"/);
  });

  test('has a divider between URL input and file upload', () => {
    // URL section and file section should be visually separated
    const urlPos = indexHtml.indexOf('urlInput');
    const filePos = indexHtml.indexOf('fileInput');
    expect(urlPos).toBeGreaterThan(0);
    expect(filePos).toBeGreaterThan(urlPos);
  });
});

describe('reader.js URL handling', () => {
  let readerSrc;

  beforeEach(() => {
    readerSrc = fs.readFileSync(path.resolve(__dirname, '../src/reader.js'), 'utf-8');
  });

  test('has a handleURL or loadURL function', () => {
    expect(readerSrc).toMatch(/function (handleURL|loadURL)/);
  });

  test('handleURL fetches content from a URL', () => {
    expect(readerSrc).toMatch(/fetch\(/);
  });

  test('handleURL extracts readable text from HTML', () => {
    // Should parse HTML and extract text content
    expect(readerSrc).toMatch(/DOMParser|parseFromString|innerText|textContent/);
  });

  test('handleURL feeds content through the same pipeline as file uploads', () => {
    // Should call splitIntoParagraphs and paginateParagraphs
    const fnMatch = readerSrc.match(/function (handleURL|loadURL)[\s\S]*?\n\}/);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch[0]).toMatch(/splitIntoParagraphs/);
    expect(fnMatch[0]).toMatch(/paginateParagraphs/);
  });

  test('handleURL transitions to reader screen', () => {
    const fnMatch = readerSrc.match(/function (handleURL|loadURL)[\s\S]*?\n\}/);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch[0]).toMatch(/readerScreen/);
  });

  test('handleURL is exposed on window for binding', () => {
    expect(readerSrc).toMatch(/window\.handleURL|window\.loadURL/);
  });

  test('URL load button click is bound in reader.js', () => {
    expect(readerSrc).toMatch(/urlLoadBtn/);
  });
});

describe('CSS: URL input styles', () => {
  test('reader.css has url-input-group styles', () => {
    const css = fs.readFileSync(path.resolve(__dirname, '../src/reader.css'), 'utf-8');
    expect(css).toMatch(/\.url-input-group/);
  });
});

describe('URL text extraction', () => {
  test('extractTextFromHTML function exists in reader.js', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/reader.js'), 'utf-8');
    expect(src).toMatch(/function extractTextFromHTML/);
  });

  test('extractTextFromHTML strips script and style tags', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../src/reader.js'), 'utf-8');
    // Should remove script/style before extracting text
    expect(src).toMatch(/script|style/i);
  });
});
