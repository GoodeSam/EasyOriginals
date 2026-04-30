/**
 * Full-book translation with progress tracking.
 *
 * Translates every text paragraph in a loaded book using the configured
 * translation provider, tracks progress, supports cancellation, and
 * produces a translated paragraphs array that can be rendered or fed
 * to the audiobook generator.
 *
 * Inspired by tepub's translation controller: parallel segment
 * processing, state tracking, and resumable operations.
 */

let _cancelled = false;
let _abortController = null;

/**
 * Translate a single paragraph of text.
 *
 * @param {string} text - The text to translate.
 * @param {Function} translateFn - Translation function (text, from, to) => Promise<string>.
 * @param {string} [fromLang='en'] - Source language.
 * @param {string} [toLang='zh'] - Target language.
 * @returns {Promise<string>} Translated text.
 */
export async function translateParagraph(text, translateFn, fromLang = 'en', toLang = 'zh') {
  return await translateFn(text, fromLang, toLang);
}

/**
 * Translate all paragraphs in a book.
 *
 * @param {Array} paragraphs - Array of paragraph objects from state.paragraphs.
 * @param {object} options - Options: translateFn, fromLang, toLang, onProgress(current, total).
 * @returns {Promise<Array>} Array of translated paragraph objects.
 */
export async function translateBook(paragraphs, options = {}) {
  _cancelled = false;
  _abortController = new AbortController();
  const { translateFn, fromLang = 'en', toLang = 'zh', onProgress, onParagraphComplete, startIndex = 0, existingResults = [] } = options;
  const translatedParagraphs = existingResults.length > 0 ? [...existingResults] : [];
  // Fill any gaps in existing results to prevent undefined entries
  for (let j = 0; j < translatedParagraphs.length; j++) {
    if (!translatedParagraphs[j]) translatedParagraphs[j] = { sentences: [''] };
  }
  const textParagraphs = paragraphs.filter(p => p.type !== 'image');
  const total = textParagraphs.length;
  let textIndex = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    if (_cancelled) throw new Error('Translation cancelled');

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

    const abortPromise = new Promise((_, reject) => {
      _abortController.signal.addEventListener('abort', () => reject(new Error('Translation cancelled')), { once: true });
    });
    const translated = await Promise.race([translateParagraph(text, translateFn, fromLang, toLang), abortPromise]);
    translatedParagraphs[i] = { sentences: [translated] };
    textIndex++;

    if (onParagraphComplete) onParagraphComplete(textIndex, translatedParagraphs);
    if (onProgress) onProgress(textIndex, total);
  }

  return translatedParagraphs;
}

/**
 * Cancel an in-progress translation.
 */
export function cancelTranslation() {
  _cancelled = true;
  if (_abortController) _abortController.abort();
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
