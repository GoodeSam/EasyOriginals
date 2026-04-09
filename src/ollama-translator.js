/**
 * Full-book translation using free Ollama models.
 *
 * Translates every text paragraph in a loaded book by calling a local
 * Ollama instance via /api/chat with structured prompts, deterministic
 * decoding, validation, and automatic repair of bad output.
 */

const DEFAULT_OLLAMA_URL = 'http://localhost:11434/api/chat';
const DEFAULT_MODEL = 'qwen3:14b';
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

// ── Glossary: proper nouns + domain terms injected into prompt ─────
// Keys are case-insensitive match patterns; values are the required Chinese translation.
// This prevents hallucinated transliterations and untranslated rare terms.
const GLOSSARY = {
  // People — economics & politics
  'Adam Smith': '亚当·斯密',
  'Karl Marx': '卡尔·马克思',
  'Richard Nixon': '理查德·尼克松',
  'Milton Friedman': '米尔顿·弗里德曼',
  'John Maynard Keynes': '约翰·梅纳德·凯恩斯',
  // People — information theory & computing
  'Claude Shannon': '克劳德·香农',
  'Alan Turing': '艾伦·图灵',
  'John von Neumann': '约翰·冯·诺依曼',
  // Companies & brands
  'Apple': '苹果',
  'Amazon': '亚马逊',
  'Google': '谷歌',
  'Meta': 'Meta',
  'Microsoft': '微软',
  // Domain terms often left untranslated by smaller models
  'hypertrophy': '过度膨胀',
  'emergency socialism': '紧急社会主义',
  'emergency monetarism': '紧急货币主义',
  'capitalism': '资本主义',
  'monetarism': '货币主义',
  'equilibrium': '均衡',
  'learning curve': '学习曲线',
  'floating currencies': '浮动汇率',
};

/**
 * Extract glossary entries relevant to source text.
 * Returns a formatted string for prompt injection, or empty string if none match.
 */
function buildGlossaryHint(sourceText) {
  const lower = sourceText.toLowerCase();
  const matches = [];
  for (const [en, zh] of Object.entries(GLOSSARY)) {
    if (lower.includes(en.toLowerCase())) {
      matches.push(`${en} → ${zh}`);
    }
  }
  if (matches.length === 0) return '';
  return '\n[Glossary — use these exact translations]\n' + matches.join('\n') + '\n';
}

// ── Prefilter: skip segments that don't need translation (from tepub) ──

const _PUNCT_ONLY = /^[\s…—–―·•*&^%$#@!~`´°¤§±×÷⇒→←↑↓│¦∗⊗∘[\]{}()<>\\/|\-]+$/;
const _NUMERIC_ONLY = /^[\s\d.,:;()\-–—〜~]+$/;
const _PAGE_MARKER = /^(page|p\.?|pp\.?)[\s\divxlc]+$/i;
const _ISBN = /^isbn\b/i;

function shouldAutoCopy(text) {
  const t = (text || '').trim();
  if (!t) return true;
  if (_PUNCT_ONLY.test(t)) return true;
  if (_NUMERIC_ONLY.test(t)) return true;
  if (_PAGE_MARKER.test(t)) return true;
  if (_ISBN.test(t)) return true;
  if (t.length <= 3 && !/[A-Za-z]/.test(t)) return true;
  return false;
}

// ── CJK text polishing (ported from tepub's cjk-text-formatter) ────

const CJK_RE = /[\u4e00-\u9fff]/;
const HAN = '\u4e00-\u9fff';
const HIRAGANA = '\u3040-\u309f';
const KATAKANA = '\u30a0-\u30ff';
const HANGUL = '\uac00-\ud7af';
const CJK_ALL = `${HAN}${HIRAGANA}${KATAKANA}${HANGUL}`;
const CJK_NO_KOREAN = `${HAN}${HIRAGANA}${KATAKANA}`;
const CJK_TERMINAL_PUNCT = '，。！？；：、';
const CJK_CLOSING_BRACKETS = '》」』】）〉';
const CJK_OPENING_BRACKETS = '《「『【（〈';

function _containsCjk(text) {
  return CJK_RE.test(text);
}

function _normalizeFullwidthAlphanumeric(text) {
  return text.replace(/[\uFF10-\uFF19\uFF21-\uFF3A\uFF41-\uFF5A]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) - 0xFEE0)
  );
}

function _normalizeFullwidthPunctuation(text) {
  const map = { ',': '，', '.': '。', '!': '！', '?': '？', ';': '；', ':': '：' };
  for (const [half, full] of Object.entries(map)) {
    const esc = half.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // CJK + half + CJK → fullwidth
    text = text.replace(new RegExp(`([${CJK_NO_KOREAN}])${esc}([${CJK_NO_KOREAN}])`, 'g'), `$1${full}$2`);
    // CJK + half + end/space → fullwidth
    text = text.replace(new RegExp(`([${CJK_NO_KOREAN}])${esc}(?=\\s|$)`, 'g'), `$1${full}`);
  }
  return text;
}

function _normalizeFullwidthParentheses(text) {
  return text.replace(new RegExp(`\\(([${CJK_NO_KOREAN}][^()]*)\\)`, 'g'), '（$1）');
}

function _normalizeFullwidthBrackets(text) {
  return text.replace(new RegExp(`\\[([${CJK_NO_KOREAN}][^\\[\\]]*)\\]`, 'g'), '【$1】');
}

function _replaceDash(text) {
  const cjkP = `[${HAN}${HIRAGANA}${KATAKANA}《》「」『』【】（）〈〉，。！？；：、]`;
  return text.replace(new RegExp(`(${cjkP})\\s*-{2,}\\s*(${cjkP})`, 'g'), (_, b, a) => {
    const ls = '）》'.includes(b) ? '' : ' ';
    const rs = '（《'.includes(a) ? '' : ' ';
    return `${b}${ls}——${rs}${a}`;
  });
}

function _fixEmdashSpacing(text) {
  return text.replace(/([^\s])\s*——\s*([^\s])/g, (_, b, a) => {
    const ls = '）》'.includes(b) ? '' : ' ';
    const rs = '（《'.includes(a) ? '' : ' ';
    return `${b}${ls}——${rs}${a}`;
  });
}

function _fixQuoteSpacing(text, open, close) {
  const noSpaceBefore = CJK_CLOSING_BRACKETS + CJK_TERMINAL_PUNCT;
  const noSpaceAfter = CJK_OPENING_BRACKETS + CJK_TERMINAL_PUNCT;
  // Space before opening quote
  text = text.replace(new RegExp(`([A-Za-z0-9${CJK_ALL}${CJK_CLOSING_BRACKETS}${CJK_TERMINAL_PUNCT}])${open}`, 'g'), (_, b) =>
    noSpaceBefore.includes(b) ? `${b}${open}` : `${b} ${open}`
  );
  // Space after closing quote
  text = text.replace(new RegExp(`${close}([A-Za-z0-9${CJK_ALL}${CJK_OPENING_BRACKETS}${CJK_TERMINAL_PUNCT}])`, 'g'), (_, a) =>
    noSpaceAfter.includes(a) ? `${close}${a}` : `${close} ${a}`
  );
  return text;
}

function _spaceBetweenCjkAndLatin(text) {
  const alphaNum = `[A-Za-z0-9](?:[A-Za-z0-9%‰℃℉]*(?:°[CcFf]?)?)?`;
  text = text.replace(new RegExp(`([${CJK_ALL}])(${alphaNum})`, 'g'), '$1 $2');
  text = text.replace(new RegExp(`(${alphaNum})([${CJK_ALL}])`, 'g'), '$1 $2');
  return text;
}

function _normalizeEllipsis(text) {
  text = text.replace(/\s*\.\s+\.\s+\.(?:\s+\.)*/g, '...');
  text = text.replace(/\.\.\.\s*(?=\S)/g, '... ');
  return text;
}

function _fixCurrencySpacing(text) {
  return text.replace(/([$¥€£₹])\s+(\d)/g, '$1$2');
}

function _cleanupConsecutivePunctuation(text) {
  for (const mark of ['！', '？', '。']) {
    text = text.replace(new RegExp(`${mark.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}{2,}`, 'g'), mark);
  }
  return text;
}

/**
 * Polish translated CJK text with typography rules.
 * Ported from tepub's cjk-text-formatter.
 */
function polishCjkText(text) {
  // Universal: ellipsis normalization
  text = _normalizeEllipsis(text);

  if (_containsCjk(text)) {
    // Fullwidth normalization
    text = _normalizeFullwidthAlphanumeric(text);
    text = _normalizeFullwidthPunctuation(text);
    text = _normalizeFullwidthBrackets(text);

    // Em-dash and quotes
    text = _replaceDash(text);
    text = _fixEmdashSpacing(text);
    text = _fixQuoteSpacing(text, '\u201c', '\u201d'); // ""
    text = _fixQuoteSpacing(text, '\u2018', '\u2019'); // ''

    // CJK-Latin spacing
    text = _spaceBetweenCjkAndLatin(text);
    text = _normalizeFullwidthParentheses(text);

    // Currency and cleanup
    text = _fixCurrencySpacing(text);
    text = _cleanupConsecutivePunctuation(text);

    // Collapse multiple spaces, remove trailing spaces
    text = text.replace(/(\S) {2,}/g, '$1 ');
    text = text.replace(/ +$/gm, '');
  }

  // Collapse excessive newlines
  text = text.replace(/\n{3,}/g, '\n\n');

  return text.trimEnd();
}

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

function looksOvergenerated(source, translation) {
  if (!source || !translation) return false;
  const ratio = translation.length / source.length;
  return ratio > 2.2;
}

function hasDuplicateSentences(text) {
  // Split on Chinese sentence-ending punctuation or newlines
  const sentences = text.split(/[。！？\n]+/).map(s => s.trim()).filter(s => s.length > 6);
  if (sentences.length < 2) return false;
  const seen = new Set();
  for (const s of sentences) {
    if (seen.has(s)) return true;
    seen.add(s);
  }
  return false;
}

function extractFromTags(raw) {
  // Strip Qwen3 thinking blocks (<think>...</think>) before extraction
  const cleaned = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  const match = cleaned.match(/<TRANSLATION>([\s\S]*?)<\/TRANSLATION>/);
  if (match) return match[1].trim();
  // Fallback: strip any XML-like wrapper tags the model might have invented
  return cleaned.replace(/<\/?[A-Z_]+>/g, '').trim();
}

function hasRepeatedPhrases(text) {
  // Detect repeated 2-4 character Chinese phrases within a short span (e.g. 确保...确保)
  const chars = text.replace(/[^\u4e00-\u9fff]/g, '');
  if (chars.length < 8) return false;
  for (let len = 2; len <= 4; len++) {
    const seen = {};
    for (let i = 0; i <= chars.length - len; i++) {
      const gram = chars.slice(i, i + len);
      seen[gram] = (seen[gram] || 0) + 1;
      if (seen[gram] >= 3) return true; // same phrase 3+ times is suspicious
    }
  }
  return false;
}

function validateTranslation(source, translation) {
  const issues = [];
  if (hasSignificantEnglish(translation)) issues.push('english_residue');
  if (hasTraditionalChinese(translation)) issues.push('traditional_chars');
  if (hasLabelsOrArtifacts(translation)) issues.push('labels');
  if (looksOmitted(source, translation)) issues.push('omitted');
  if (looksOvergenerated(source, translation)) issues.push('overgenerated');
  if (hasDuplicateSentences(translation)) issues.push('duplicated');
  if (hasRepeatedPhrases(translation)) issues.push('repetitive');
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
    '8. Do NOT add any sentence, explanation, paraphrase, or content not present in the source.',
    '9. Preserve directionality and predicate relations exactly. Do not replace with a more familiar saying or proverb.',
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
  // Inject glossary hints for terms found in the source
  const glossary = buildGlossaryHint(text);
  if (glossary) parts.push(glossary);
  parts.push('/no_think');
  parts.push('Translate the text inside <SOURCE>...</SOURCE> into Simplified Chinese.');
  parts.push('Return ONLY the Chinese translation inside <TRANSLATION>...</TRANSLATION>.');
  parts.push('');
  parts.push('<SOURCE>');
  parts.push(text);
  parts.push('</SOURCE>');
  return parts.join('\n');
}

function buildRepairMessage(source, issues) {
  const rules = [];
  if (issues.includes('english_residue')) rules.push('Every English word must be rendered in Chinese. No Latin-script words allowed except standard acronyms (GDP, AI, IT).');
  if (issues.includes('traditional_chars')) rules.push('Use Simplified Chinese only. No Traditional Chinese characters.');
  if (issues.includes('labels')) rules.push('Output only the translation. No labels, notes, Pinyin, or meta-text.');
  if (issues.includes('omitted')) rules.push('Translate every sentence completely. Do not skip or summarize.');
  if (issues.includes('overgenerated')) rules.push('Do not add any content not in the source. Translate only what is given.');
  if (issues.includes('duplicated')) rules.push('Do not repeat any sentence. Each sentence should appear exactly once.');
  if (issues.includes('repetitive')) rules.push('Avoid repeating the same word or phrase multiple times. Vary vocabulary for natural Chinese.');
  return [
    'The previous translation attempt was rejected. Translate the source text again from scratch.',
    'Critical rules for this attempt:',
    ...rules.map((r, i) => `${i + 1}. ${r}`),
    '',
    'Translate the text inside <SOURCE>...</SOURCE> into Simplified Chinese.',
    'Return ONLY the Chinese translation inside <TRANSLATION>...</TRANSLATION>.',
    '',
    '<SOURCE>',
    source,
    '</SOURCE>',
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

  // Cap output length relative to input to prevent hallucinated additions
  const numPredict = strict
    ? Math.max(32, Math.ceil(textLength * 1.1))
    : Math.max(64, Math.ceil(textLength * 1.3));
  const opts = strict
    ? { ...OLLAMA_OPTIONS, temperature: 0, top_p: 0.8, top_k: 10, num_predict: numPredict }
    : { ...OLLAMA_OPTIONS, num_predict: numPredict };

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

// ── Back-translation verifier for short segments ────────────────────

/**
 * For short segments (aphorisms, headings), back-translate to English
 * and compare with the original. If they diverge significantly
 * (e.g. "Money is time" reversed to "Time is money"), force a
 * corrective re-translation with the original explicitly quoted.
 */
async function verifyShortSegment(source, translation, ollamaUrl, model, signal, sourceLang, targetLang) {
  try {
    const backTranslateMsg = [
      { role: 'system', content: `Translate the following ${sourceLang} text back into ${targetLang}. Output ONLY the translation, nothing else.` },
      { role: 'user', content: translation },
    ];
    const backRaw = await callOllama(ollamaUrl, model, backTranslateMsg, signal, translation.length, true);
    const backTranslation = backRaw.replace(/<\/?[A-Z_]+>/g, '').trim().toLowerCase();
    const originalLower = source.trim().toLowerCase().replace(/[.,!?;:'"]/g, '');

    // Check if key content words from source appear in back-translation
    const sourceWords = originalLower.split(/\s+/).filter(w => w.length > 2);
    const matchCount = sourceWords.filter(w => backTranslation.includes(w)).length;
    const matchRatio = sourceWords.length > 0 ? matchCount / sourceWords.length : 1;

    // Also check for word-order reversal in short phrases (e.g. "A is B" vs "B is A")
    const srcParts = originalLower.split(/\s+is\s+|\s+are\s+|\s+was\s+/);
    const backParts = backTranslation.split(/\s+is\s+|\s+are\s+|\s+was\s+/);
    const isReversed = srcParts.length === 2 && backParts.length === 2 &&
      srcParts[0].trim() !== backParts[0].trim() &&
      backParts[0].trim().includes(srcParts[1].trim());

    if (matchRatio < 0.5 || isReversed) {
      // Re-translate with explicit instruction
      const fixMsg = [
        { role: 'system', content: `You are a professional translator. Translate exactly as written. Do not substitute familiar sayings.` },
        {
          role: 'user', content: [
            'The following English text must be translated LITERALLY into Simplified Chinese.',
            'CRITICAL: Preserve the EXACT subject-predicate order. Do not reverse or rearrange.',
            `English: "${source}"`,
            'Output ONLY the Chinese translation inside <TRANSLATION>...</TRANSLATION>.',
          ].join('\n')
        },
      ];
      const fixRaw = await callOllama(ollamaUrl, model, fixMsg, signal, source.length, true);
      const fixed = extractFromTags(fixRaw);
      if (fixed && fixed.length > 0) return fixed;
    }
  } catch (_) {
    // Back-translation failed — return original translation rather than breaking
  }
  return translation;
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
  let bestResult = result;
  let bestIssueCount = validateTranslation(text, result).length;

  for (let repair = 0; repair < 2; repair++) {
    const issues = validateTranslation(text, result);
    if (issues.length === 0) break;

    const repairMsg = buildRepairMessage(text, issues);
    const repairMessages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: repairMsg },
    ];
    raw = await callOllama(ollamaUrl, model, repairMessages, externalSignal, text.length, true);
    result = extractFromTags(raw);

    // Track the best result across attempts
    const newIssueCount = validateTranslation(text, result).length;
    if (newIssueCount < bestIssueCount) {
      bestResult = result;
      bestIssueCount = newIssueCount;
    }
  }

  // Use the best result from all attempts
  const finalIssues = validateTranslation(text, bestResult);
  if (finalIssues.length > 0) {
    console.warn('[Ollama] Translation still has issues after repairs:', finalIssues.join(', '),
      '| Source preview:', text.slice(0, 80));
  }

  // Back-translation verification for short segments (catches semantic reversals)
  if (text.length <= 80) {
    bestResult = await verifyShortSegment(text, bestResult, ollamaUrl, model, externalSignal, toLang, fromLang);
  }

  // Apply CJK typography polishing (from tepub's cjk-text-formatter)
  return polishCjkText(bestResult);
}

function _getNeighborText(paragraphs, currentIdx, direction, maxLen = 150) {
  for (let j = currentIdx + direction; j >= 0 && j < paragraphs.length; j += direction) {
    const p = paragraphs[j];
    if (p.type === 'image') continue;
    const t = p.sentences.join(' ').trim();
    if (t) return t.length > maxLen ? t.slice(0, maxLen) + '…' : t;
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

    // Prefilter: auto-copy segments that don't need translation (punctuation, numbers, etc.)
    if (shouldAutoCopy(text)) {
      translatedParagraphs[i] = { sentences: [text] };
      textIndex++;
      if (onParagraphComplete) onParagraphComplete(textIndex, translatedParagraphs);
      if (onProgress) onProgress(textIndex, total);
      continue;
    }

    // Build sliding window context from neighboring paragraphs
    // Skip context for long paragraphs (model should focus on the source itself)
    // Scale context cap proportionally to source length
    let context = null;
    if (text.length < 500) {
      const ctxCap = Math.min(150, Math.max(60, Math.round(text.length * 0.4)));
      const prevPara = _getNeighborText(paragraphs, i, -1, ctxCap);
      const nextPara = _getNeighborText(paragraphs, i, +1, ctxCap);
      context = (prevPara || nextPara) ? { prev: prevPara, next: nextPara } : null;
    }

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
