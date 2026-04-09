/**
 * Full-book translation using free Ollama models.
 *
 * Translates every text paragraph in a loaded book by calling a local
 * Ollama instance via /api/chat with structured prompts, deterministic
 * decoding, validation, and automatic repair of bad output.
 */

const DEFAULT_OLLAMA_URL = 'http://localhost:11434/api/chat';
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

// Deterministic decoding defaults for translation
const OLLAMA_OPTIONS = {
  temperature: 0,
  top_p: 0.9,
  top_k: 20,
  repeat_penalty: 1.1,
  num_ctx: 8192,
  seed: 42,
};

// Common Traditional Chinese characters that should be Simplified
const TRADITIONAL_CHARS = /[電話農與點節選標確變價從號態導無衛線論報說網費現環齊讓開練負種題個復語認書圖質單達長運區將動]/;

// Patterns indicating bad output
const LABEL_PATTERNS = /(?:^|\n)\s*(?:英文|中文|Pinyin|拼音|Translation|Original|翻[译譯]|注[：:]|Note[：:])/i;
// Allow short abbreviations (OK, AI, GDP, etc.) but flag longer English words
const SIGNIFICANT_ENGLISH_RE = /(?<![A-Z])[A-Za-z]{4,}(?![A-Za-z])/;

let _cancelled = false;
let _abortController = null;

async function waitForOllamaReady(baseUrl) {
  const healthUrl = baseUrl.replace(/\/api\/(generate|chat)$/, '/api/tags');
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

// ── Validation helpers ──────────────────────────────────────────────

function hasSignificantEnglish(text) {
  // Strip known acceptable Latin fragments (common abbreviations)
  const cleaned = text.replace(/\b(?:OK|GDP|AI|IT|CEO|API|DNA|RNA|NBA|FIFA|USB|URL|HTTP|Wi-Fi|iPhone|iPad|Google|Amazon|Apple|Meta|EPUB)\b/gi, '');
  return SIGNIFICANT_ENGLISH_RE.test(cleaned);
}

function hasTraditionalChinese(text) {
  return TRADITIONAL_CHARS.test(text);
}

function hasLabelsOrArtifacts(text) {
  return LABEL_PATTERNS.test(text);
}

function looksOmitted(source, translation) {
  // Chinese is roughly 0.4-0.8x the character count of English
  if (!source || !translation) return true;
  const ratio = translation.length / source.length;
  return ratio < 0.2;
}

function extractFromTags(raw) {
  const match = raw.match(/<TRANSLATION>([\s\S]*?)<\/TRANSLATION>/);
  if (match) return match[1].trim();
  // Fallback: strip any XML-like wrapper tags the model might have invented
  return raw.replace(/<\/?[A-Z_]+>/g, '').trim();
}

function validateTranslation(source, translation) {
  const issues = [];
  if (hasSignificantEnglish(translation)) issues.push('english_residue');
  if (hasTraditionalChinese(translation)) issues.push('traditional_chars');
  if (hasLabelsOrArtifacts(translation)) issues.push('labels');
  if (looksOmitted(source, translation)) issues.push('omitted');
  return issues;
}

// ── System prompt builder ───────────────────────────────────────────

function buildSystemPrompt(fromLang, toLang) {
  return [
    `You are a professional ${fromLang}-to-${toLang} translator.`,
    'Rules you MUST follow:',
    '1. Use Simplified Chinese (简体中文) exclusively. Never use Traditional Chinese characters.',
    '2. Translate EVERY word. Never leave any English words or fragments in the output.',
    '3. Output ONLY the translation inside <TRANSLATION>...</TRANSLATION> tags. Nothing else.',
    '4. Translate the COMPLETE text. Do not omit, summarize, or skip any part.',
    '5. Preserve the original meaning, tone, and style. Use natural Chinese equivalents for literary or idiomatic expressions.',
    '6. For proper nouns (person names, place names, brand names), use the standard established Chinese translation.',
    '7. For domain-specific terms (economics, finance, technology), use correct Chinese technical terminology.',
  ].join('\n');
}

function buildUserMessage(text, context) {
  const parts = [];
  if (context) {
    parts.push('[Context from surrounding paragraphs — do NOT translate these, they are for reference only]');
    if (context.prev) parts.push('<PREV>' + context.prev + '</PREV>');
    if (context.next) parts.push('<NEXT>' + context.next + '</NEXT>');
    parts.push('');
  }
  parts.push('Translate the text inside <SOURCE>...</SOURCE> into Simplified Chinese.');
  parts.push('Return ONLY the Chinese translation inside <TRANSLATION>...</TRANSLATION>.');
  parts.push('');
  parts.push('<SOURCE>');
  parts.push(text);
  parts.push('</SOURCE>');
  return parts.join('\n');
}

function buildRepairMessage(source, badTranslation, issues) {
  const issueDescs = [];
  if (issues.includes('english_residue')) issueDescs.push('contains untranslated English words');
  if (issues.includes('traditional_chars')) issueDescs.push('uses Traditional Chinese instead of Simplified');
  if (issues.includes('labels')) issueDescs.push('contains unwanted labels or notes');
  if (issues.includes('omitted')) issueDescs.push('is incomplete — parts of the source were omitted');
  return [
    'The previous translation was rejected because it ' + issueDescs.join(', and ') + '.',
    'Please translate again. Fix ALL issues. Output ONLY the corrected Simplified Chinese translation inside <TRANSLATION>...</TRANSLATION>.',
    '',
    '<SOURCE>',
    source,
    '</SOURCE>',
    '',
    'Previous bad translation for reference:',
    badTranslation,
  ].join('\n');
}

// ── Low-level Ollama API call ───────────────────────────────────────

async function callOllama(ollamaUrl, model, messages, externalSignal, textLength, strict) {
  if (externalSignal && externalSignal.aborted) {
    const err = new Error('Ollama translation cancelled');
    err.name = 'AbortError';
    throw err;
  }

  const timeoutMs = OLLAMA_TIMEOUT_BASE_MS + textLength * OLLAMA_TIMEOUT_PER_CHAR_MS;
  const reqCtrl = new AbortController();
  const timer = setTimeout(() => reqCtrl.abort(), timeoutMs);

  let onExternalAbort;
  if (externalSignal) {
    onExternalAbort = () => reqCtrl.abort();
    externalSignal.addEventListener('abort', onExternalAbort);
  }
  const signal = reqCtrl.signal;

  const opts = strict
    ? { ...OLLAMA_OPTIONS, temperature: 0, top_p: 0.8, top_k: 10 }
    : { ...OLLAMA_OPTIONS };

  let res;
  try {
    res = await fetch(ollamaUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, messages, stream: false, options: opts }),
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
  const content = (data.message && typeof data.message.content === 'string')
    ? data.message.content
    : (typeof data.response === 'string' ? data.response : null);
  if (content === null) {
    throw new Error('Unexpected Ollama response: ' + JSON.stringify(data).slice(0, 200));
  }
  return content.trim();
}

// ── Public translation function ─────────────────────────────────────

/**
 * Translate a single text using the local Ollama API with validation and repair.
 *
 * @param {string} text - The text to translate.
 * @param {object} [options] - Options: model, fromLang, toLang, signal, ollamaUrl, context.
 * @returns {Promise<string>} Translated text.
 */
export async function translateWithOllama(text, options = {}) {
  const model = options.model || DEFAULT_MODEL;
  const fromLang = options.fromLang || 'English';
  const toLang = options.toLang || 'Chinese';
  const externalSignal = options.signal;
  const ollamaUrl = options.ollamaUrl || DEFAULT_OLLAMA_URL;
  const context = options.context || null;

  const systemPrompt = buildSystemPrompt(fromLang, toLang);
  const userMessage = buildUserMessage(text, context);

  // Attempt 1: normal translation
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];
  let raw = await callOllama(ollamaUrl, model, messages, externalSignal, text.length, false);
  let result = extractFromTags(raw);

  // Validate and repair if needed (up to 2 repair attempts with stricter decoding)
  for (let repair = 0; repair < 2; repair++) {
    const issues = validateTranslation(text, result);
    if (issues.length === 0) break;

    const repairMsg = buildRepairMessage(text, result, issues);
    const repairMessages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: repairMsg },
    ];
    raw = await callOllama(ollamaUrl, model, repairMessages, externalSignal, text.length, true);
    result = extractFromTags(raw);
  }

  return result;
}

function _getNeighborText(paragraphs, currentIdx, direction) {
  for (let j = currentIdx + direction; j >= 0 && j < paragraphs.length; j += direction) {
    const p = paragraphs[j];
    if (p.type === 'image') continue;
    const t = p.sentences.join(' ').trim();
    if (t) return t.length > 300 ? t.slice(0, 300) + '…' : t;
    break;
  }
  return null;
}

/**
 * Translate all paragraphs in a book using Ollama with retry logic,
 * sliding-window context, validation, and repair.
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
  // Fill any gaps in existing results to prevent undefined entries
  for (let j = 0; j < translatedParagraphs.length; j++) {
    if (!translatedParagraphs[j]) translatedParagraphs[j] = { sentences: [''] };
  }
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

    // Build sliding window context from neighboring paragraphs
    const prevPara = _getNeighborText(paragraphs, i, -1);
    const nextPara = _getNeighborText(paragraphs, i, +1);
    const context = (prevPara || nextPara) ? { prev: prevPara, next: nextPara } : null;

    let translated;
    for (let attempt = 0; attempt <= OLLAMA_MAX_RETRIES; attempt++) {
      if (_cancelled) throw new Error('Ollama translation cancelled');
      try {
        translated = await translateWithOllama(text, { model, fromLang, toLang, ollamaUrl, signal: _abortController.signal, context });
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
      const imgSrc = (orig.src && !orig.src.startsWith('blob:')) ? orig.src : '[image]';
      lines.push(`![${orig.alt || ''}](${imgSrc})\n`);
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
      const pSrc = (para.src && !para.src.startsWith('blob:')) ? para.src : '[image]';
      lines.push(`![${para.alt || ''}](${pSrc})\n`);
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
