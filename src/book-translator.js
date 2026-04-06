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
  const { translateFn, fromLang = 'en', toLang = 'zh', onProgress } = options;
  const translatedParagraphs = [];
  const textParagraphs = paragraphs.filter(p => p.type !== 'image');
  const total = textParagraphs.length;
  let textIndex = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    if (_cancelled) throw new Error('Translation cancelled');

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

    const abortPromise = new Promise((_, reject) => {
      _abortController.signal.addEventListener('abort', () => reject(new Error('Translation cancelled')), { once: true });
    });
    const translated = await Promise.race([translateParagraph(text, translateFn, fromLang, toLang), abortPromise]);
    translatedParagraphs.push({ sentences: [translated] });
    textIndex++;

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
