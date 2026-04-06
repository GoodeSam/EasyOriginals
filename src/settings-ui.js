/**
 * Settings panel UI — replaces popup.html/popup.js.
 * Creates an inline settings panel for the web app.
 */
import { loadSettings, saveSettings } from './storage.js';

export function createSettingsPanel() {
  const settings = loadSettings();

  const panel = document.createElement('div');
  panel.id = 'settingsPanel';
  panel.className = 'side-panel settings-panel';
  panel.innerHTML = `
    <div class="side-panel-header settings-header">
      <span>Settings</span>
      <button class="icon-btn" id="settingsClose" aria-label="Close settings">&times;</button>
    </div>
    <div class="settings-body" style="padding: 16px 20px;">
      <label for="provider" style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;">Translation Provider</label>
      <select id="provider" style="width:100%;padding:8px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px;margin-bottom:12px;">
        <option value="google">Google Translate (free)</option>
        <option value="microsoft">Microsoft Translate (free)</option>
        <option value="chatgpt">ChatGPT (API key required)</option>
        <option value="offline">Offline Dictionary (no network)</option>
      </select>

      <div id="settingsChatgpt">
        <label for="settingsApiKey" style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;">OpenAI API Key</label>
        <input type="password" id="settingsApiKey" placeholder="sk-..." style="width:100%;padding:8px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px;margin-bottom:12px;">

        <label for="settingsModel" style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;">Model</label>
        <select id="settingsModel" style="width:100%;padding:8px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px;margin-bottom:12px;">
          <option value="gpt-4o-mini">GPT-4o Mini (fast & cheap)</option>
          <option value="gpt-4o">GPT-4o</option>
          <option value="gpt-4-turbo">GPT-4 Turbo</option>
        </select>

        <label for="openaiTtsVoice" style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;">TTS Voice Persona</label>
        <select id="openaiTtsVoice" style="width:100%;padding:8px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px;margin-bottom:12px;">
        </select>
      </div>

      <label for="ttsSource" style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;">Voice Source</label>
      <select id="ttsSource" style="width:100%;padding:8px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px;margin-bottom:12px;">
        <option value="edge">Read Aloud (free, no API key needed)</option>
        <option value="openai">OpenAI TTS Voice Persona (API key required)</option>
      </select>

      <label for="edgeTtsVoice" style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;">Read Aloud Voice (free, no API key needed)</label>
      <select id="edgeTtsVoice" style="width:100%;padding:8px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px;margin-bottom:12px;">
      </select>

      <label for="settingsTranslatedVoice" style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;">Translated Audio Voice</label>
      <select id="settingsTranslatedVoice" style="width:100%;padding:8px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px;margin-bottom:12px;">
      </select>

      <label for="speechRate" style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;">Speech Rate</label>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <span style="font-size:12px;color:#888;">Slow</span>
        <input type="range" id="speechRate" min="-50" max="100" step="5" value="0" style="flex:1;">
        <span style="font-size:12px;color:#888;">Fast</span>
        <span id="speechRateLabel" style="font-size:12px;font-weight:600;min-width:36px;text-align:center;">Normal</span>
      </div>

      <div style="border-top:1px solid #e0e0e0;margin:16px 0 12px;padding-top:12px;">
        <label style="display:block;font-size:13px;font-weight:600;margin-bottom:8px;">Ollama (Local AI Translation)</label>
        <label for="settingsOllamaUrl" style="display:block;font-size:12px;color:#888;margin-bottom:4px;">Ollama Server URL</label>
        <input type="url" id="settingsOllamaUrl" placeholder="http://localhost:11434" style="width:100%;padding:8px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px;margin-bottom:8px;">
        <label for="settingsOllamaModel" style="display:block;font-size:12px;color:#888;margin-bottom:4px;">Model</label>
        <input type="text" id="settingsOllamaModel" placeholder="llama3" style="width:100%;padding:8px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px;margin-bottom:12px;">
      </div>

      <button class="btn btn-primary" id="settingsSaveBtn" style="display:block;width:100%;padding:10px;border:none;border-radius:6px;font-size:14px;font-weight:600;cursor:pointer;background:#4f46e5;color:#fff;">Save Settings</button>
      <div id="settingsStatus" style="font-size:12px;text-align:center;margin-top:8px;display:none;"></div>
    </div>
  `;

  // Load existing values
  const providerSelect = panel.querySelector('#provider');
  const apiKeyInput = panel.querySelector('#settingsApiKey');
  const modelSelect = panel.querySelector('#settingsModel');
  const chatgptDiv = panel.querySelector('#settingsChatgpt');
  const saveBtn = panel.querySelector('#settingsSaveBtn');
  const status = panel.querySelector('#settingsStatus');

  const voiceSelect = panel.querySelector('#edgeTtsVoice');
  const openaiVoiceSelect = panel.querySelector('#openaiTtsVoice');
  const ttsSourceSelect = panel.querySelector('#ttsSource');

  const translatedVoiceSelect = panel.querySelector('#settingsTranslatedVoice');
  const ollamaUrlInput = panel.querySelector('#settingsOllamaUrl');
  const ollamaModelInput = panel.querySelector('#settingsOllamaModel');

  providerSelect.value = settings.translationProvider;
  apiKeyInput.value = settings.openaiApiKey;
  modelSelect.value = settings.openaiModel;
  ttsSourceSelect.value = settings.ttsSource || 'edge';
  ollamaUrlInput.value = settings.ollamaUrl || 'http://localhost:11434';
  ollamaModelInput.value = settings.ollamaModel || 'llama3';

  // Populate voice options from EDGE_TTS_VOICES (exposed by reader.js)
  const EDGE_TTS_VOICES = window.EDGE_TTS_VOICES || [];
  EDGE_TTS_VOICES.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.value;
    opt.textContent = v.label;
    voiceSelect.appendChild(opt);
  });
  voiceSelect.value = settings.edgeTtsVoice || 'en-US-AriaNeural';

  // Populate translated audio voice options (same voice list)
  EDGE_TTS_VOICES.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.value;
    opt.textContent = v.label;
    translatedVoiceSelect.appendChild(opt);
  });
  translatedVoiceSelect.value = settings.translatedTtsVoice || 'zh-CN-XiaoxiaoNeural';

  // Populate OpenAI TTS voice options
  const OPENAI_TTS_VOICES = window.OPENAI_TTS_VOICES || [];
  OPENAI_TTS_VOICES.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.value;
    opt.textContent = `${v.label} — ${v.persona}`;
    openaiVoiceSelect.appendChild(opt);
  });
  openaiVoiceSelect.value = settings.openaiTtsVoice || 'alloy';

  const speechRateInput = panel.querySelector('#speechRate');
  const speechRateLabel = panel.querySelector('#speechRateLabel');
  const savedRate = Number(settings.speechRate) || 0;
  speechRateInput.value = savedRate;

  function updateRateLabel(val) {
    const n = Number(val);
    speechRateLabel.textContent = n === 0 ? 'Normal' : (n > 0 ? '+' : '') + n + '%';
  }
  updateRateLabel(savedRate);
  speechRateInput.addEventListener('input', () => updateRateLabel(speechRateInput.value));

  function updateChatgptVisibility() {
    chatgptDiv.classList.toggle('hidden', providerSelect.value !== 'chatgpt');
  }
  updateChatgptVisibility();

  providerSelect.addEventListener('change', updateChatgptVisibility);

  saveBtn.addEventListener('click', () => {
    if (providerSelect.value === 'chatgpt' && !apiKeyInput.value.trim()) {
      status.textContent = 'API key is required for ChatGPT provider';
      status.style.display = 'block';
      status.style.color = '#e11d48';
      setTimeout(() => { status.style.display = 'none'; }, 3000);
      return;
    }
    try {
      const allSaved = saveSettings({
        translationProvider: providerSelect.value,
        openaiApiKey: apiKeyInput.value.trim(),
        openaiModel: modelSelect.value,
        edgeTtsVoice: voiceSelect.value,
        openaiTtsVoice: openaiVoiceSelect.value,
        translatedTtsVoice: translatedVoiceSelect.value,
        ttsSource: ttsSourceSelect.value,
        speechRate: Number(speechRateInput.value),
        ollamaUrl: ollamaUrlInput.value.trim() || 'http://localhost:11434',
        ollamaModel: ollamaModelInput.value.trim() || 'llama3',
      });
      if (window.invalidateSettings) window.invalidateSettings();
      status.textContent = allSaved ? 'Settings saved!' : 'Settings applied (some may not persist)';
      status.style.display = 'block';
      status.style.color = allSaved ? '#10b981' : '#f59e0b';
      setTimeout(() => { status.style.display = 'none'; }, 2000);
    } catch (e) {
      status.textContent = 'Failed to save: ' + e.message;
      status.style.display = 'block';
      status.style.color = '#e11d48';
      setTimeout(() => { status.style.display = 'none'; }, 3000);
    }
  });

  const closeBtn = panel.querySelector('#settingsClose');
  closeBtn.addEventListener('click', () => {
    panel.classList.remove('active');
  });

  return panel;
}
