const PROVIDERS = {
  groq: {
    name: 'Groq',
    badge: 'FREE',
    badgeColor: '#10b981',
    model: 'llama-3.3-70b-versatile',
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    placeholder: 'gsk_...',
    docsUrl: 'https://console.groq.com/keys',
    note: 'Most generous free tier — recommended!'
  },
  gemini: {
    name: 'Google Gemini',
    badge: 'FREE',
    badgeColor: '#10b981',
    model: 'gemini-2.5-flash',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    placeholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    note: 'Has free tier, sufficient for summaries'
  },
  openai: {
    name: 'OpenAI',
    badge: '~$0.001/call',
    badgeColor: '#6366f1',
    model: 'gpt-4o-mini',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    placeholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    note: 'Very affordable, ~$0.001 per summary'
  },
  anthropic: {
    name: 'Anthropic',
    badge: 'PAID',
    badgeColor: '#f59e0b',
    model: 'claude-haiku-20240307',
    endpoint: 'https://api.anthropic.com/v1/messages',
    placeholder: 'sk-ant-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    note: 'No free tier'
  }
};

let selectedProvider = 'groq';

document.addEventListener('DOMContentLoaded', async () => {
  renderProviderCards();
  await loadSettings();
  setupEventListeners();
  updateApiKeyPlaceholder();
});

function renderProviderCards() {
  const container = document.getElementById('provider-cards');
  container.innerHTML = '';

  Object.entries(PROVIDERS).forEach(([key, provider]) => {
    const card = document.createElement('div');
    card.className = 'provider-card';
    card.id = `card-${key}`;
    card.dataset.provider = key;

    card.innerHTML = `
      <div class="provider-card-header">
        <span class="provider-name">${provider.name}</span>
        <span class="provider-badge" style="background: ${provider.badgeColor}20; color: ${provider.badgeColor}; border: 1px solid ${provider.badgeColor}40">${provider.badge}</span>
      </div>
      <div class="provider-model">Model: ${provider.model}</div>
      <div class="provider-note">${provider.note}</div>
    `;

    card.addEventListener('click', () => selectProvider(key));
    container.appendChild(card);
  });
}

function selectProvider(providerKey) {
  selectedProvider = providerKey;
  document.querySelectorAll('.provider-card').forEach(card => {
    card.classList.remove('selected');
  });
  document.getElementById(`card-${providerKey}`)?.classList.add('selected');
  updateApiKeyPlaceholder();
}

function updateApiKeyPlaceholder() {
  const provider = PROVIDERS[selectedProvider];
  if (!provider) return;

  const input = document.getElementById('api-key-input');
  const link = document.getElementById('get-key-link');
  const modelInfo = document.getElementById('model-info');

  if (input) input.placeholder = `Enter API Key (${provider.placeholder})`;
  if (link) link.href = provider.docsUrl;
  if (modelInfo) modelInfo.textContent = `Model: ${provider.model}`;
}

async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['provider', 'apiKeys'], (result) => {
      const savedProvider = result.provider || 'groq';
      const apiKeys = result.apiKeys || {};

      selectProvider(savedProvider);

      const keyInput = document.getElementById('api-key-input');
      if (keyInput && apiKeys[savedProvider]) {
        keyInput.value = apiKeys[savedProvider];
      }

      document.getElementById('api-key-input').dataset.allKeys = JSON.stringify(apiKeys);
      resolve();
    });
  });
}

function setupEventListeners() {
  document.getElementById('save-btn').addEventListener('click', saveSettings);
  document.getElementById('clear-key-btn')?.addEventListener('click', () => {
    document.getElementById('api-key-input').value = '';
    document.getElementById('api-key-input').focus();
  });
  document.getElementById('toggle-visibility-btn')?.addEventListener('click', () => {
    const input = document.getElementById('api-key-input');
    const btn = document.getElementById('toggle-visibility-btn');
    if (input.type === 'password') {
      input.type = 'text';
      btn.textContent = '🙈';
    } else {
      input.type = 'password';
      btn.textContent = '👁️';
    }
  });

  const cards = document.querySelectorAll('.provider-card');
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const provider = card.dataset.provider;
      const allKeys = JSON.parse(document.getElementById('api-key-input').dataset.allKeys || '{}');
      document.getElementById('api-key-input').value = allKeys[provider] || '';
    });
  });

  document.getElementById('api-key-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveSettings();
  });
}

async function saveSettings() {
  const apiKey = document.getElementById('api-key-input').value.trim();

  if (!apiKey) {
    showStatus('error', 'API Key cannot be empty!');
    return;
  }

  const provider = PROVIDERS[selectedProvider];
  if (selectedProvider === 'groq' && !apiKey.startsWith('gsk_')) {
    showStatus('warning', 'Groq API keys usually start with "gsk_". Please verify.');
  }
  if (selectedProvider === 'openai' && !apiKey.startsWith('sk-')) {
    showStatus('warning', 'OpenAI API keys usually start with "sk-". Please verify.');
  }
  if (selectedProvider === 'anthropic' && !apiKey.startsWith('sk-ant-')) {
    showStatus('warning', 'Anthropic API keys usually start with "sk-ant-". Please verify.');
  }

  const saveBtn = document.getElementById('save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving...';

  chrome.storage.local.get(['apiKeys'], (result) => {
    const existingKeys = result.apiKeys || {};
    existingKeys[selectedProvider] = apiKey;

    document.getElementById('api-key-input').dataset.allKeys = JSON.stringify(existingKeys);

    chrome.storage.local.set({
      provider: selectedProvider,
      apiKeys: existingKeys,
      model: PROVIDERS[selectedProvider].model
    }, () => {
      saveBtn.disabled = false;
      saveBtn.textContent = '💾 Save Settings';
      showStatus('success', 'Settings saved successfully!');
      setTimeout(() => {
        hideStatus();
      }, 3000);
    });
  });
}

function showStatus(type, message) {
  const statusEl = document.getElementById('status-message');
  statusEl.textContent = message;
  statusEl.className = `status-message status-${type} visible`;
}

function hideStatus() {
  const statusEl = document.getElementById('status-message');
  statusEl.className = 'status-message';
}
