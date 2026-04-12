/**
 * Full-book audio generation using Edge TTS (free).
 *
 * Synthesizes every text paragraph in a book into MP3 audio via the
 * Microsoft Edge Read Aloud WebSocket service, concatenates the results,
 * and provides a downloadable audiobook file.
 *
 * Inspired by tepub's audiobook pipeline: parallel TTS synthesis,
 * chapter assembly, progress tracking, and cancellation support.
 */

const EDGE_TTS_URL = 'wss://speech.platform.bing.com/consumer/speech/synthesize/readaloud/edge/v1';
const EDGE_TTS_TOKEN = '6A5AA1D4EAFF4E9FB37E23D68491D6F4';
const EDGE_TTS_DEFAULT_VOICE = 'en-US-AriaNeural';

function langFromVoice(voice) {
  const m = voice.match(/^([a-z]{2}-[A-Z]{2})/);
  return m ? m[1] : 'en-US';
}
const SEC_MS_GEC_VERSION = '1-130.0.2849.68';

const SYNTH_TIMEOUT_BASE_MS = 30000;
const SYNTH_TIMEOUT_PER_CHAR_MS = 15;
const SYNTH_MAX_RETRIES = 2;

let _cancelled = false;
let _activeWebSocket = null;

async function generateSecMsGec() {
  let ticks = Math.floor(Date.now() / 1000);
  ticks += 11644473600;
  ticks -= ticks % 300;
  ticks *= 1e7;
  const input = `${ticks}${EDGE_TTS_TOKEN}`;
  const data = new TextEncoder().encode(input);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

/**
 * Synthesize a single paragraph of text into an MP3 audio Blob using Edge TTS.
 *
 * @param {string} text - The text to synthesize.
 * @param {object} [options] - Options: voice, speechRate.
 * @returns {Promise<Blob>} MP3 audio blob.
 */
export async function synthesizeParagraph(text, options = {}) {
  const voice = options.voice || EDGE_TTS_DEFAULT_VOICE;
  const speechRate = options.speechRate || 0;
  const connId = crypto.randomUUID().replace(/-/g, '');
  const requestId = crypto.randomUUID().replace(/-/g, '');
  const gecToken = await generateSecMsGec();

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(
      `${EDGE_TTS_URL}?TrustedClientToken=${EDGE_TTS_TOKEN}&ConnectionId=${connId}&Sec-MS-GEC=${gecToken}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`
    );
    _activeWebSocket = ws;
    ws.binaryType = 'arraybuffer';
    const audioChunks = [];
    const timeoutMs = SYNTH_TIMEOUT_BASE_MS + text.length * SYNTH_TIMEOUT_PER_CHAR_MS;
    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Edge TTS request timed out'));
    }, timeoutMs);

    ws.onopen = () => {
      ws.send(
        'Content-Type:application/json; charset=utf-8\r\nPath:speech.config\r\n\r\n' +
        JSON.stringify({
          context: {
            synthesis: {
              audio: {
                metadataoptions: { sentenceBoundaryEnabled: 'false', wordBoundaryEnabled: 'false' },
                outputFormat: 'audio-24khz-48kbitrate-mono-mp3'
              }
            }
          }
        })
      );

      const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const rateVal = Number(speechRate) || 0;
      const rateStr = (rateVal >= 0 ? '+' : '') + rateVal + '%';
      const lang = langFromVoice(voice);
      const ssml = `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='${lang}'><voice name='${voice}'><prosody pitch='+0Hz' rate='${rateStr}' volume='+0%'>${escaped}</prosody></voice></speak>`;
      ws.send(`X-RequestId:${requestId}\r\nContent-Type:application/ssml+xml\r\nPath:ssml\r\n\r\n${ssml}`);
    };

    ws.onmessage = (event) => {
      if (typeof event.data === 'string') {
        if (event.data.includes('Path:turn.end')) {
          clearTimeout(timeout);
          _activeWebSocket = null;
          ws.close();
          if (audioChunks.length === 0) {
            reject(new Error(
              'Edge TTS returned no audio for voice "' + voice + '".\n' +
              'This usually means the text language does not match the voice language.\n' +
              'Voice language: ' + langFromVoice(voice) + '\n' +
              'Try selecting a voice that matches the text language in Settings.'
            ));
            return;
          }
          const blob = new Blob(audioChunks, { type: 'audio/mpeg' });
          resolve(blob);
        }
      } else if (event.data instanceof ArrayBuffer) {
        const buf = event.data;
        const view = new DataView(buf);
        const headerLen = view.getUint16(0);
        if (buf.byteLength > headerLen + 2) {
          audioChunks.push(new Uint8Array(buf, headerLen + 2));
        }
      }
    };

    ws.onerror = () => { clearTimeout(timeout); _activeWebSocket = null; reject(new Error('Edge TTS connection failed')); };

    let settled = false;
    const originalResolve = resolve;
    const originalReject = reject;
    resolve = (v) => { settled = true; originalResolve(v); };
    reject = (e) => { settled = true; originalReject(e); };

    ws.onclose = () => {
      clearTimeout(timeout);
      _activeWebSocket = null;
      if (!settled) {
        reject(new Error(_cancelled ? 'Audio generation cancelled' : 'Edge TTS connection closed unexpectedly'));
      }
    };
  });
}

/**
 * Concatenate an array of MP3 Blobs into a single MP3 Blob.
 * Since all blobs share the same MP3 encoding from Edge TTS,
 * raw concatenation produces a valid MP3 stream.
 *
 * @param {Blob[]} blobs - Array of MP3 audio blobs.
 * @returns {Promise<Blob>} Single concatenated MP3 blob.
 */
export function concatenateAudioBlobs(blobs) {
  return new Blob(blobs, { type: 'audio/mpeg' });
}

/**
 * Generate a full audiobook from parsed paragraphs using Edge TTS.
 *
 * @param {Array} paragraphs - Array of paragraph objects from state.paragraphs.
 * @param {object} options - Options: voice, speechRate, onProgress(current, total).
 * @returns {Promise<{blob: Blob, paragraphCount: number}>}
 */
function detectChinese(text) {
  return /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/.test(text);
}

function stripTtsLabels(text) {
  return text.replace(/^\[Original\]\s*/i, '').replace(/^\[Translated\]\s*/i, '').trim();
}

/**
 * Detect the dominant language of content by sampling paragraphs.
 * @param {Array} paragraphs - Paragraph objects with sentences arrays.
 * @returns {'zh'|'en'} Detected language code.
 */
export function detectContentLanguage(paragraphs) {
  let chineseChars = 0;
  let totalChars = 0;
  for (const p of paragraphs) {
    if (p.type === 'image') continue;
    const text = p.sentences.join(' ');
    for (const ch of text) {
      if (/\s/.test(ch)) continue;
      totalChars++;
      if (detectChinese(ch)) chineseChars++;
    }
    if (totalChars >= 500) break;
  }
  return chineseChars > totalChars * 0.3 ? 'zh' : 'en';
}

/**
 * Return the best default voice for a detected language.
 * Prefers the user's configured voice if it matches, otherwise falls back to a default.
 * @param {'zh'|'en'} lang - Detected language.
 * @param {string} [currentVoice] - User's currently configured voice.
 * @returns {string} Voice name matching the language.
 */
export function voiceForLanguage(lang, currentVoice) {
  if (currentVoice) {
    const voiceLang = langFromVoice(currentVoice);
    if (lang === 'zh' && voiceLang.startsWith('zh')) return currentVoice;
    if (lang === 'en' && voiceLang.startsWith('en')) return currentVoice;
  }
  return lang === 'zh' ? 'zh-CN-XiaoxiaoNeural' : 'en-US-AriaNeural';
}

export async function generateBookAudio(paragraphs, options = {}) {
  _cancelled = false;
  const { voice, speechRate, onProgress } = options;
  const chineseSpeechRate = options.chineseSpeechRate != null ? options.chineseSpeechRate : speechRate;
  const englishVoice = options.englishVoice || voiceForLanguage('en', voice);
  const chineseVoice = options.chineseVoice || voiceForLanguage('zh', voice);

  const textParagraphs = paragraphs.filter(p => p.type !== 'image');
  const { startIndex = 0, existingBlobs = [], onParagraphComplete } = options;
  const audioBlobs = existingBlobs.length > 0 ? [...existingBlobs] : [];
  const nonBlankParas = textParagraphs.filter(p => {
    const t = stripTtsLabels(p.sentences.join(' '));
    return t.trim().length > 0;
  });
  const total = nonBlankParas.length;
  let progressIndex = startIndex;

  let nonBlankIndex = 0;
  for (let i = 0; i < textParagraphs.length; i++) {
    if (_cancelled) throw new Error('Audio generation cancelled');

    const para = textParagraphs[i];
    const rawText = para.sentences.join(' ');
    const text = stripTtsLabels(rawText);
    if (!text.trim()) continue;

    if (nonBlankIndex < startIndex) {
      nonBlankIndex++;
      continue;
    }

    // Synthesize each sentence individually so we can skip sentences
    // whose language doesn't match the voice (instead of failing the whole book)
    const sentences = para.sentences.map(s => stripTtsLabels(s)).filter(s => s.trim());
    const sentenceBlobs = [];
    for (const sentence of sentences) {
      if (_cancelled) throw new Error('Audio generation cancelled');
      const isChinese = detectChinese(sentence);
      const sentVoice = isChinese ? chineseVoice : englishVoice;
      const sentRate = isChinese ? chineseSpeechRate : speechRate;

      let blob;
      let skipped = false;
      for (let attempt = 0; attempt <= SYNTH_MAX_RETRIES; attempt++) {
        try {
          blob = await synthesizeParagraph(sentence, { voice: sentVoice, speechRate: sentRate });
          break;
        } catch (err) {
          if (_cancelled) throw err;
          if (err.message.includes('returned no audio')) {
            console.warn(`Skipping sentence (voice/language mismatch): "${sentence.slice(0, 80)}…"`);
            skipped = true;
            break;
          }
          if (attempt === SYNTH_MAX_RETRIES) throw err;
        }
      }
      if (!skipped) sentenceBlobs.push(blob);
    }
    if (sentenceBlobs.length > 0) {
      audioBlobs.push(concatenateAudioBlobs(sentenceBlobs));
    }
    nonBlankIndex++;
    progressIndex++;

    if (onParagraphComplete) onParagraphComplete(progressIndex, blob);
    if (onProgress) onProgress(progressIndex, total);
  }

  const blob = await concatenateAudioBlobs(audioBlobs);
  return { blob, paragraphCount: audioBlobs.length };
}

/**
 * Generate a bilingual audiobook that interleaves original and translated paragraphs.
 * Original paragraphs are read with the English voice, translated with the Chinese voice.
 * Prefix labels ("Original:", "Translated:", "[Original]", "[Translated]") are stripped.
 *
 * @param {Array} originalParagraphs - Original paragraph objects.
 * @param {Array} translatedParagraphs - Translated paragraph objects.
 * @param {object} options - Options: englishVoice, chineseVoice, speechRate, chineseSpeechRate, onProgress.
 * @returns {Promise<{blob: Blob, paragraphCount: number}>}
 */
export async function generateBilingualAudio(originalParagraphs, translatedParagraphs, options = {}) {
  _cancelled = false;
  const { speechRate, onProgress } = options;
  const chineseSpeechRate = options.chineseSpeechRate != null ? options.chineseSpeechRate : speechRate;
  const englishVoice = options.englishVoice || voiceForLanguage('en');
  const chineseVoice = options.chineseVoice || voiceForLanguage('zh');

  // Build interleaved pairs: [{ text, voice, rate }, ...]
  const entries = [];
  for (let i = 0; i < originalParagraphs.length; i++) {
    const orig = originalParagraphs[i];
    const trans = translatedParagraphs[i];
    if (orig.type === 'image') continue;

    const origText = stripTtsLabels(orig.sentences.join(' '));
    const transText = trans ? stripTtsLabels(trans.sentences.join(' ')) : '';

    if (origText.trim()) entries.push({ text: origText, voice: englishVoice, rate: speechRate });
    if (transText.trim()) entries.push({ text: transText, voice: chineseVoice, rate: chineseSpeechRate });
  }

  const total = entries.length;
  const audioBlobs = [];

  for (let i = 0; i < entries.length; i++) {
    if (_cancelled) throw new Error('Audio generation cancelled');
    const { text, voice, rate } = entries[i];

    let blob;
    let skipped = false;
    for (let attempt = 0; attempt <= SYNTH_MAX_RETRIES; attempt++) {
      try {
        blob = await synthesizeParagraph(text, { voice, speechRate: rate });
        break;
      } catch (err) {
        if (_cancelled) throw err;
        if (err.message.includes('returned no audio')) {
          console.warn(`Skipping sentence (voice/language mismatch): "${text.slice(0, 80)}…"`);
          skipped = true;
          break;
        }
        if (attempt === SYNTH_MAX_RETRIES) throw err;
      }
    }
    if (!skipped) audioBlobs.push(blob);
    if (onProgress) onProgress(i + 1, total);
  }

  const blob = concatenateAudioBlobs(audioBlobs);
  return { blob, paragraphCount: audioBlobs.length };
}

/**
 * Cancel an in-progress audio generation.
 */
export function cancelBookAudio() {
  _cancelled = true;
  if (_activeWebSocket) {
    _activeWebSocket.close();
    _activeWebSocket = null;
  }
}

/**
 * Trigger a browser download for an audio blob.
 *
 * @param {Blob} blob - The audio blob to download.
 * @param {string} [filename] - Download filename.
 */
export function downloadAudio(blob, filename = 'audiobook.mp3') {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
