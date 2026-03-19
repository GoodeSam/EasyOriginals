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
      saveSettings({
        translationProvider: providerSelect.value,
        openaiApiKey: apiKeyInput.value.trim(),
        openaiModel: modelSelect.value,
        edgeTtsVoice: voiceSelect.value,
      });
      if (window.invalidateSettings) window.invalidateSettings();
      status.textContent = 'Settings saved!';
      status.style.display = 'block';
      status.style.color = '#10b981';
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
