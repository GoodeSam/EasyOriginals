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

const OLLAMA_URL = 'http://localhost:11434/api/generate';
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

  const prompt = `Translate the following text from ${fromLang} to ${toLang}. Return only the translation, no explanations.\n\n${text}`;

  const res = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt, stream: false }),
    signal,
  });

  if (!res.ok) throw new Error(`Ollama request failed: ${res.status}`);

  const data = await res.json();
  if (typeof data.response !== 'string') {
    throw new Error(`Unexpected Ollama response: ${JSON.stringify(data).slice(0, 200)}`);
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
  const { model, fromLang, toLang, onProgress } = options;
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

    const translated = await translateWithOllama(text, { model, fromLang, toLang, signal: _abortController.signal });
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
 * Export original and translated paragraphs as a bilingual markdown string.
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
