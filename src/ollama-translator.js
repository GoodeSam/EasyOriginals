/**
 * Full-book translation using free Ollama models.
 *
 * Translates every text paragraph in a loaded book by calling a local
 * Ollama instance (http://localhost:11434/api/generate), tracks progress,
 * supports cancellation, and exports the bilingual result as a
 * downloadable markdown file.
 *
 * Inspired by tepub's Ollama provider: HTTP POST to local endpoint,
 * non-streaming response, configurable model, and retry resilience.
 */

const DEFAULT_OLLAMA_URL = 'http://localhost:11434/api/generate';
const DEFAULT_MODEL = 'llama3';

let _cancelled = false;
let _abortController = null;

/**
 * Translate a single text using the local Ollama API.
 *
 * @param {string} text - The text to translate.
 * @param {object} [options] - Options: model, fromLang, toLang, signal.
 * @returns {Promise<string>} Translated text.
 */
export async function translateWithOllama(text, options = {}) {
  const model = options.model || DEFAULT_MODEL;
  const fromLang = options.fromLang || 'English';
  const toLang = options.toLang || 'Chinese';
  const signal = options.signal;
  const ollamaUrl = options.ollamaUrl || DEFAULT_OLLAMA_URL;

  const prompt = `Translate the following text from ${fromLang} to ${toLang}. Return only the translation, no explanations.\n\n${text}`;

  let res;
  try {
    res = await fetch(ollamaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false }),
      signal,
    });
  } catch (err) {
    if (err.name === 'AbortError') throw err;
    throw new Error(
      'Cannot reach Ollama at ' + ollamaUrl + '.\n' +
      'Ensure Ollama is running (ollama serve) and CORS is configured:\n' +
      '  OLLAMA_ORIGINS="' + (typeof location !== 'undefined' ? location.origin : '*') + '" ollama serve'
    );
  }

  if (!res.ok) {
    let body = '';
    try { body = (await res.text()).slice(0, 200); } catch (_) { /* ignore */ }
    throw new Error('Ollama returned ' + res.status + (body ? ': ' + body : ''));
  }

  const data = await res.json();
  if (typeof data.response !== 'string') {
    throw new Error('Unexpected Ollama response: ' + JSON.stringify(data).slice(0, 200));
  }
  return data.response.trim();
}

/**
 * Translate all paragraphs in a book using Ollama.
 *
 * @param {Array} paragraphs - Array of paragraph objects from state.paragraphs.
 * @param {object} options - Options: model, fromLang, toLang, onProgress(current, total).
 * @returns {Promise<Array>} Array of translated paragraph objects.
 */
export async function translateBookWithOllama(paragraphs, options = {}) {
  _cancelled = false;
  _abortController = new AbortController();
  const { model, fromLang, toLang, onProgress, ollamaUrl } = options;
  const translatedParagraphs = [];
  const textParagraphs = paragraphs.filter(p => p.type !== 'image');
  const total = textParagraphs.length;
  let textIndex = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    if (_cancelled) throw new Error('Ollama translation cancelled');

    const para = paragraphs[i];

    if (para.type === 'image') {
      translatedParagraphs.push(para);
      continue;
    }

    const text = para.sentences.join(' ');
    if (!text.trim()) {
      translatedParagraphs.push({ sentences: [''] });
      textIndex++;
      if (onProgress) onProgress(textIndex, total);
      continue;
    }

    const translated = await translateWithOllama(text, { model, fromLang, toLang, ollamaUrl, signal: _abortController.signal });
    translatedParagraphs.push({ sentences: [translated] });
    textIndex++;

    if (onProgress) onProgress(textIndex, total);
  }

  return translatedParagraphs;
}

/**
 * Cancel an in-progress Ollama translation.
 */
export function cancelOllamaTranslation() {
  _cancelled = true;
  if (_abortController) _abortController.abort();
}

/**
 * Check if Ollama is reachable at the given base URL.
 *
 * @param {string} [baseUrl] - Ollama base URL (e.g. http://localhost:11434).
 * @returns {Promise<{ok: boolean, error?: string}>}
 */
export async function checkOllamaConnection(baseUrl = 'http://localhost:11434') {
  const apiUrl = baseUrl.replace(/\/+$/, '') + '/api/tags';
  try {
    const res = await fetch(apiUrl, { method: 'GET' });
    if (res.ok) return { ok: true };
    if (res.status === 403) {
      return { ok: false, error: 'CORS blocked (403). Run: OLLAMA_ORIGINS="' + location.origin + '" ollama serve' };
    }
    return { ok: false, error: `Server returned ${res.status}` };
  } catch (err) {
    const msg = err.message || String(err);
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('CORS')) {
      return { ok: false, error: 'Cannot reach Ollama. Either it is not running, or CORS is blocking the request.\nFix: OLLAMA_ORIGINS="' + location.origin + '" ollama serve' };
    }
    return { ok: false, error: msg };
  }
}

/**
 * Export as bilingual markdown (original + translated interleaved).
 *
 * @param {Array} originalParagraphs - Original paragraph objects.
 * @param {Array} translatedParagraphs - Translated paragraph objects.
 * @param {string} [title] - Book title for the heading.
 * @returns {string} Markdown content.
 */
export function exportAsMarkdown(originalParagraphs, translatedParagraphs, title = 'Translated Book') {
  const lines = [`# ${title}\n`];

  for (let i = 0; i < originalParagraphs.length; i++) {
    const orig = originalParagraphs[i];
    const trans = translatedParagraphs[i];

    if (orig.type === 'image') continue;

    const originalText = orig.sentences.join(' ');
    const translatedText = trans ? trans.sentences.join(' ') : '';

    if (!originalText.trim() && !translatedText.trim()) continue;

    lines.push(`**Original:** ${originalText}\n`);
    lines.push(`**Translated:** ${translatedText}\n`);
    lines.push('---\n');
  }

  return lines.join('\n');
}

/**
 * Export as translation-only markdown.
 *
 * @param {Array} translatedParagraphs - Translated paragraph objects.
 * @param {string} [title] - Book title for the heading.
 * @returns {string} Markdown content.
 */
export function exportTranslationMarkdown(translatedParagraphs, title = 'Translated Book') {
  const lines = [`# ${title}\n`];

  for (const para of translatedParagraphs) {
    if (para.type === 'image') continue;
    const text = para.sentences.join(' ');
    if (text.trim()) lines.push(text + '\n');
  }

  return lines.join('\n');
}

/**
 * Trigger a browser download for markdown content.
 *
 * @param {string} content - The markdown string to download.
 * @param {string} [filename] - Download filename.
 */
export function downloadMarkdown(content, filename = 'translated-book.md') {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
