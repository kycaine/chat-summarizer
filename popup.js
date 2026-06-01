let currentState = 'idle';

function setState(state, message = '') {
  currentState = state;
  const btn = document.getElementById('summarize-btn');
  const statusEl = document.getElementById('status');
  const progressBar = document.getElementById('progress-bar');
  const progressFill = document.getElementById('progress-fill');

  const states = {
    idle:       { btnText: 'Summarize Now', btnDisabled: false, statusText: '', progress: 0,   showProgress: false, btnClass: '' },
    extracting: { btnText: 'Reading chat...', btnDisabled: true, statusText: 'Extracting page content...', progress: 25,  showProgress: true,  btnClass: '' },
    summarizing:{ btnText: 'Summarizing...', btnDisabled: true, statusText: 'AI is summarizing...', progress: 65,  showProgress: true,  btnClass: '' },
    generating: { btnText: 'Generating...', btnDisabled: true, statusText: 'Creating .md file...', progress: 90,  showProgress: true,  btnClass: '' },
    done:       { btnText: 'Done — click again', btnDisabled: false, statusText: message || 'File downloaded successfully!', progress: 100, showProgress: true, btnClass: 'done' },
    error:      { btnText: 'Try Again', btnDisabled: false, statusText: message || 'An error occurred. Try again.', progress: 0, showProgress: false, btnClass: 'err' }
  };

  const config = states[state] || states.idle;

  if (btn) {
    btn.textContent = config.btnText;
    btn.disabled = config.btnDisabled;
    btn.className = `btn btn-main ${config.btnClass}`;
  }

  if (statusEl) {
    statusEl.textContent = config.statusText;
    statusEl.className = `status ${state === 'error' ? 'err' : state === 'done' ? 'ok' : ''}`;
  }

  if (progressBar) {
    progressBar.classList.toggle('visible', config.showProgress);
  }

  if (progressFill && config.showProgress) {
    progressFill.style.width = `${config.progress}%`;
  }
}

async function loadSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['provider', 'apiKeys', 'model'], (result) => {
      resolve({
        provider: result.provider || 'groq',
        apiKey: result.apiKeys?.[result.provider || 'groq'] || '',
        model: result.model || null
      });
    });
  });
}

async function handleSummarize() {
  if (currentState === 'extracting' || currentState === 'summarizing' || currentState === 'generating') return;

  if (currentState === 'done' || currentState === 'error') {
    setState('idle');
    await chrome.storage.local.remove(['summaryState']);
    return;
  }

  const { apiKey } = await loadSettings();

  if (!apiKey) {
    setState('error', 'API Key not set. Click Settings first.');
    return;
  }

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab) {
      setState('error', 'No active tab found.');
      return;
    }
    
    // Request background script to start summarization
    chrome.runtime.sendMessage({ action: 'startSummarize', tabId: tab.id });
  } catch (error) {
    setState('error', `Failed to start process: ${error.message}`);
  }
}

async function updateProviderBadge() {
  const { provider, apiKey } = await loadSettings();
  const pill = document.getElementById('provider-pill');
  const providerNames = { groq: 'Groq', openai: 'OpenAI', gemini: 'Gemini', anthropic: 'Anthropic' };

  if (pill) {
    pill.textContent = providerNames[provider] || provider;
    pill.className = `provider-pill${apiKey ? '' : ' no-key'}`;
  }

  const guide = document.getElementById('guide');
  if (guide) {
    if (apiKey) guide.setAttribute('hidden', '');
    else guide.removeAttribute('hidden');
  }
}

async function checkActiveState() {
  chrome.storage.local.get(['summaryState', 'totalSummarized'], (result) => {
    // Render stats
    const countEl = document.getElementById('total-count');
    if (countEl && result.totalSummarized !== undefined) {
      countEl.textContent = result.totalSummarized;
    }

    const stateObj = result.summaryState;
    if (stateObj) {
      const elapsed = Date.now() - (stateObj.timestamp || 0);
      if (stateObj.status === 'done' && elapsed > 5000) {
        // Automatically clear done state after 5 seconds
        setState('idle');
        chrome.storage.local.remove(['summaryState']);
      } else {
        setState(stateObj.status, stateObj.message);
      }
    } else {
      setState('idle');
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('summarize-btn')?.addEventListener('click', handleSummarize);
  document.getElementById('settings-btn')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  
  updateProviderBadge();
  checkActiveState();
  
  // Periodically refresh states or listen for changes
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'stateChanged' && request.summaryState) {
      setState(request.summaryState.status, request.summaryState.message);
      if (request.summaryState.status === 'done') {
        // Update stats counter immediately if completed
        chrome.storage.local.get(['totalSummarized'], (res) => {
          const countEl = document.getElementById('total-count');
          if (countEl && res.totalSummarized !== undefined) {
            countEl.textContent = res.totalSummarized;
          }
        });
      }
    }
  });
});
