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
const OLLAMA_TIMEOUT_BASE_MS = 60000;
const OLLAMA_TIMEOUT_PER_CHAR_MS = 30;
const OLLAMA_MAX_RETRIES = 5;
const OLLAMA_RETRY_BASE_DELAY_MS = 3000;
const OLLAMA_COOLDOWN_MS = 300;
const OLLAMA_REST_EVERY_N = 50;
const OLLAMA_REST_MS = 3000;
const OLLAMA_HEALTH_POLL_MS = 2000;
const OLLAMA_HEALTH_MAX_WAIT_MS = 120000;

let _cancelled = false;
let _abortController = null;

async function waitForOllamaReady(baseUrl) {
  const healthUrl = baseUrl.replace(/\/api\/generate$/, '/api/tags');
  const deadline = Date.now() + OLLAMA_HEALTH_MAX_WAIT_MS;
  while (Date.now() < deadline) {
    if (_cancelled) return false;
    try {
      const res = await fetch(healthUrl, { method: 'GET' });
      if (res.ok) return true;
    } catch (_) { /* still down */ }
    await new Promise(r => setTimeout(r, OLLAMA_HEALTH_POLL_MS));
  }
  return false;
}

function isRetryable(err, status) {
  if (err && (err.name === 'AbortError')) return false;
  if (status && [408, 429, 500, 502, 503, 504].includes(status)) return true;
  if (err && (err.name === 'TypeError' || err.name === 'SyntaxError')) return true;
  return false;
}

/**
 * Translate a single text using the local Ollama API.
 *
 * @param {string} text - The text to translate.
 * @param {object} [options] - Options: model, fromLang, toLang, signal, ollamaUrl.
 * @returns {Promise<string>} Translated text.
 */
export async function translateWithOllama(text, options = {}) {
  const model = options.model || DEFAULT_MODEL;
  const fromLang = options.fromLang || 'English';
  const toLang = options.toLang || 'Chinese';
  const externalSignal = options.signal;
  const ollamaUrl = options.ollamaUrl || DEFAULT_OLLAMA_URL;

  const prompt = `Translate the following text from ${fromLang} to ${toLang}. Return only the translation, no explanations.\n\n${text}`;

  if (externalSignal && externalSignal.aborted) {
    const err = new Error('Ollama translation cancelled');
    err.name = 'AbortError';
    throw err;
  }

  const timeoutMs = OLLAMA_TIMEOUT_BASE_MS + text.length * OLLAMA_TIMEOUT_PER_CHAR_MS;
  const reqCtrl = new AbortController();
  const timer = setTimeout(() => reqCtrl.abort(), timeoutMs);

  let onExternalAbort;
  if (externalSignal) {
    onExternalAbort = () => reqCtrl.abort();
    externalSignal.addEventListener('abort', onExternalAbort);
  }
  const signal = reqCtrl.signal;

  let res;
  try {
    res = await fetch(ollamaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false }),
      signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (onExternalAbort) externalSignal.removeEventListener('abort', onExternalAbort);
    if (externalSignal && externalSignal.aborted) {
      const abortErr = new Error('Ollama translation cancelled');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
    if (err.name === 'AbortError') throw new Error('Ollama request timed out after ' + Math.round(timeoutMs / 1000) + 's');
    const fetchErr = new Error(
      'Ollama connection lost (' + err.message + ').\n' +
      'Ollama must be running on THIS computer.\n' +
      'Run: OLLAMA_ORIGINS="' + (typeof location !== 'undefined' ? location.origin : '*') + '" ollama serve'
    );
    fetchErr.name = 'TypeError';
    throw fetchErr;
  }
  clearTimeout(timer);
  if (onExternalAbort) externalSignal.removeEventListener('abort', onExternalAbort);

  if (!res.ok) {
    let body = '';
    try { body = (await res.text()).slice(0, 200); } catch (_) { /* ignore */ }
    const httpErr = new Error('Ollama returned ' + res.status + (body ? ': ' + body : ''));
    httpErr.status = res.status;
    throw httpErr;
  }

  let data;
  try {
    data = await res.json();
  } catch (parseErr) {
    const synErr = new Error('Ollama returned invalid JSON');
    synErr.name = 'SyntaxError';
    throw synErr;
  }
  if (typeof data.response !== 'string') {
    throw new Error('Unexpected Ollama response: ' + JSON.stringify(data).slice(0, 200));
  }
  return data.response.trim();
}

/**
 * Translate all paragraphs in a book using Ollama with retry logic.
 *
 * @param {Array} paragraphs - Array of paragraph objects from state.paragraphs.
 * @param {object} options - Options: model, fromLang, toLang, ollamaUrl, onProgress(current, total).
 * @returns {Promise<Array>} Array of translated paragraph objects.
 */
export async function translateBookWithOllama(paragraphs, options = {}) {
  _cancelled = false;
  _abortController = new AbortController();
  const { model, fromLang, toLang, onProgress, onParagraphComplete, ollamaUrl, startIndex = 0, existingResults = [] } = options;
  const translatedParagraphs = existingResults.length > 0 ? [...existingResults] : [];
  const textParagraphs = paragraphs.filter(p => p.type !== 'image');
  const total = textParagraphs.length;
  let textIndex = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    if (_cancelled) throw new Error('Ollama translation cancelled');

    const para = paragraphs[i];

    if (para.type === 'image') {
      if (i >= translatedParagraphs.length) translatedParagraphs.push(para);
      continue;
    }

    if (textIndex < startIndex) {
      if (i >= translatedParagraphs.length) translatedParagraphs.push({ sentences: [''] });
      textIndex++;
      if (onProgress) onProgress(textIndex, total);
      continue;
    }

    const text = para.sentences.join(' ');
    if (!text.trim()) {
      if (i >= translatedParagraphs.length) translatedParagraphs.push({ sentences: [''] });
      textIndex++;
      if (onProgress) onProgress(textIndex, total);
      continue;
    }

    let translated;
    for (let attempt = 0; attempt <= OLLAMA_MAX_RETRIES; attempt++) {
      if (_cancelled) throw new Error('Ollama translation cancelled');
      try {
        translated = await translateWithOllama(text, { model, fromLang, toLang, ollamaUrl, signal: _abortController.signal });
        break;
      } catch (err) {
        if (err.name === 'AbortError' || _cancelled) throw err;
        if (attempt < OLLAMA_MAX_RETRIES && isRetryable(err, err.status)) {
          // Wait for Ollama to become healthy before retrying
          const ready = await waitForOllamaReady(ollamaUrl);
          if (!ready && !_cancelled) {
            throw new Error('Paragraph ' + (textIndex + 1) + '/' + total + ': Ollama did not recover within ' + (OLLAMA_HEALTH_MAX_WAIT_MS / 1000) + 's');
          }
          if (_cancelled) throw new Error('Ollama translation cancelled');
          continue;
        }
        throw new Error('Paragraph ' + (textIndex + 1) + '/' + total + ' failed after ' + (attempt + 1) + ' attempts: ' + err.message);
      }
    }
    translatedParagraphs[i] = { sentences: [translated] };
    textIndex++;

    if (onParagraphComplete) onParagraphComplete(textIndex, translatedParagraphs);
    if (onProgress) onProgress(textIndex, total);

    // Cooldown between paragraphs to prevent Ollama overload
    if (OLLAMA_COOLDOWN_MS > 0) {
      await new Promise(r => setTimeout(r, OLLAMA_COOLDOWN_MS));
    }
    // Periodic rest stop to let Ollama breathe on long books
    if (textIndex > 0 && textIndex % OLLAMA_REST_EVERY_N === 0) {
      await new Promise(r => setTimeout(r, OLLAMA_REST_MS));
    }
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
      return { ok: false, error: 'Cannot reach Ollama at ' + baseUrl + '.\nOllama must be installed and running on THIS computer (not a remote server).\nFix: OLLAMA_ORIGINS="' + location.origin + '" ollama serve' };
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

    if (orig.type === 'image') {
      lines.push(`![${orig.alt || ''}](${orig.src || ''})\n`);
      continue;
    }

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
    if (para.type === 'image') {
      lines.push(`![${para.alt || ''}](${para.src || ''})\n`);
      continue;
    }
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
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
