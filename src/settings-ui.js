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
      </div>

      <label for="edgeTtsVoice" style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;">Read Aloud Voice (free, no API key needed)</label>
      <select id="edgeTtsVoice" style="width:100%;padding:8px 10px;border:1px solid #ddd;border-radius:6px;font-size:13px;margin-bottom:12px;">
      </select>

      <label for="speechRate" style="display:block;font-size:13px;font-weight:600;margin-bottom:4px;">Speech Rate</label>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
        <span style="font-size:12px;color:#888;">Slow</span>
        <input type="range" id="speechRate" min="-50" max="100" step="5" value="0" style="flex:1;">
        <span style="font-size:12px;color:#888;">Fast</span>
        <span id="speechRateLabel" style="font-size:12px;font-weight:600;min-width:36px;text-align:center;">Normal</span>
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

  providerSelect.value = settings.translationProvider;
  apiKeyInput.value = settings.openaiApiKey;
  modelSelect.value = settings.openaiModel;

  // Populate voice options from EDGE_TTS_VOICES (exposed by reader.js)
  const EDGE_TTS_VOICES = window.EDGE_TTS_VOICES || [];
  EDGE_TTS_VOICES.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v.value;
    opt.textContent = v.label;
    voiceSelect.appendChild(opt);
  });
  voiceSelect.value = settings.edgeTtsVoice || 'en-US-AriaNeural';

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
        speechRate: Number(speechRateInput.value),
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
