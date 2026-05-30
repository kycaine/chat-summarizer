const API_CONFIGS = {
  groq: {
    endpoint: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.3-70b-versatile',
    buildBody: (prompt, model) => JSON.stringify({
      model: model || 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 4096
    }),
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content
  },
  openai: {
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    buildBody: (prompt, model) => JSON.stringify({
      model: model || 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 4096
    }),
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content
  },
  gemini: {
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    model: 'gemini-2.5-flash',
    buildBody: (prompt) => JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 4096 }
    }),
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey
    }),
    parseResponse: (data) => data.candidates?.[0]?.content?.parts?.[0]?.text,
    buildUrl: (apiKey) => `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`
  },
  anthropic: {
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-haiku-20240307',
    buildBody: (prompt, model) => JSON.stringify({
      model: model || 'claude-haiku-20240307',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    }),
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    }),
    parseResponse: (data) => data.content?.[0]?.text
  }
};

function buildPrompt(chatContent) {
  return `You are an AI summarizer for long conversations between a user and an AI.
Read the following conversation and create a comprehensive structured summary.

CONVERSATION:
---
${chatContent}
---

Create a summary in the following Markdown format (MUST follow this format EXACTLY):

# Chat Summary — ${new Date().toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}

## 🗂️ Main Topics
- [topic 1]
- [topic 2]
- [etc, max 5 points]

## ✅ Decisions Made
- [concrete decisions that were agreed upon]

## ⏳ Unresolved / Needs Follow-up
- [unsolved problems]

## 🧩 Important Context
- **Tech stack:** [languages, frameworks, tools used]
- **Project name:** [project name if any]
- **Environment:** [OS, version, important configs]
- **Preferences:** [coding style, approaches, etc]

## 📌 Prompt for New Chat
"[Write 2-3 concise sentences summarizing the main context to continue in a new chat]"

---
*Summarized by ky-summarizer*

IMPORTANT RULES:
- Answer in the SAME LANGUAGE as the conversation above
- If there are important code snippets, include them in code blocks
- Do not add information that is not in the conversation
- Focus on the MOST USEFUL information for continuing the session`;
}

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

async function callAI(provider, apiKey, prompt, model) {
  const config = API_CONFIGS[provider];
  if (!config) throw new Error(`Unknown provider: ${provider}`);

  const url = config.buildUrl ? config.buildUrl(apiKey) : config.endpoint;
  const headers = config.buildHeaders(apiKey);
  const body = config.buildBody(prompt, model);

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMsg = `HTTP ${response.status}`;
    try {
      const errorJson = JSON.parse(errorText);
      errorMsg = errorJson.error?.message || errorJson.message || errorMsg;
    } catch (e) {}
    throw new Error(`API Error: ${errorMsg}`);
  }

  const data = await response.json();
  const content = config.parseResponse(data);

  if (!content) {
    throw new Error('No response from AI. Check your API key.');
  }

  return content;
}

function generateMarkdownFile(summary, provider, url, messageCount) {
  const header = `<!-- Generated by ky-summarizer | ${new Date().toISOString()} -->
<!-- Source: ${url} | Messages: ${messageCount} | Provider: ${provider} -->

`;
  return header + summary;
}

function downloadFile(content, filename) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function handleSummarize() {
  if (currentState === 'extracting' || currentState === 'summarizing' || currentState === 'generating') return;

  if (currentState === 'done' || currentState === 'error') {
    setState('idle');
    return;
  }

  const { provider, apiKey, model } = await loadSettings();

  if (!apiKey) {
    setState('error', 'API Key not set. Click Settings first.');
    return;
  }

  setState('extracting');

  let extractResult;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js']
      });
    } catch (e) {}

    extractResult = await chrome.tabs.sendMessage(tab.id, { action: 'extractChat' });
  } catch (error) {
    setState('error', `Failed to read page: ${error.message}`);
    return;
  }

  if (!extractResult?.success) {
    setState('error', extractResult?.error || 'No chat found on this page.');
    return;
  }

  setState('summarizing');

  let summary;
  try {
    const prompt = buildPrompt(extractResult.rawChat);
    summary = await callAI(provider, apiKey, prompt, model);
  } catch (error) {
    setState('error', `AI Error: ${error.message}`);
    return;
  }

  setState('generating');

  const fileContent = generateMarkdownFile(
    summary,
    provider,
    extractResult.url,
    extractResult.messageCount
  );

  const dateStr = new Date().toISOString().slice(0, 10);
  const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '-');
  const filename = `ky-summary-${dateStr}-${timeStr}.md`;

  downloadFile(fileContent, filename);

  setState('done', `Downloaded ${filename}! (${extractResult.messageCount} messages)`);

  updateStats(extractResult.messageCount);

  setTimeout(() => {
    if (currentState === 'done') setState('idle');
  }, 5000);
}

function updateStats(messageCount) {
  chrome.storage.local.get(['totalSummarized'], (result) => {
    const total = (result.totalSummarized || 0) + 1;
    chrome.storage.local.set({ totalSummarized: total });
    const countEl = document.getElementById('total-count');
    if (countEl) countEl.textContent = total;
  });
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

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('summarize-btn')?.addEventListener('click', handleSummarize);
  document.getElementById('settings-btn')?.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });
  updateProviderBadge();
});
