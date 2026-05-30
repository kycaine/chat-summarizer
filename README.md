# ky-summarizer

> A browser extension that grabs all chats from any webpage,
> summarizes them using AI into an `.md` file ready to be uploaded to a new chat.
> Zero server, bring your own API key, open source.

![Version](https://img.shields.io/badge/version-1.0.0-purple)
![License](https://img.shields.io/badge/license-MIT-blue)
![Manifest](https://img.shields.io/badge/manifest-v3-green)

---

## The Problem

Users who have long chats with AI (Claude, ChatGPT, Gemini, etc.) face two problems:

1. **Context limit** — when a chat gets too long, the AI starts "forgetting" initial messages.
2. **Fear of starting a new chat** — if you open a new chat, all context is lost, and you have to explain everything from scratch.

Existing manual solutions (copy-pasting, screenshots) are too tedious and impractical.

---

## The Solution

A Chrome Extension that with **1 click**:
- Automatically grabs the entire chat content from any page
- Sends it to your chosen AI API for summarization
- Exports a structured `.md` file ready to be uploaded to a new chat

You bring your own API key — the extension has no servers, so there are no developer costs passed to you.

---

## Features

- **Universal chat grabber** — works on ChatGPT, Claude, Gemini, Grok, Perplexity, and other AI websites.
- **Multi AI provider** — Groq (free), Gemini, OpenAI, Anthropic.
- **Structured .md output** — ready-to-use summary format.
- **100% private** — API keys stay in your browser, zero server.
- **1 click** — download directly from the chat page.

---

## How to Install

### 1. Download
```bash
git clone https://github.com/[username]/ky-summarizer.git
# or Download ZIP from the GitHub page
```

### 2. Load into Chrome
1. Open `chrome://extensions`
2. Enable **Developer Mode** (top right corner)
3. Click **"Load unpacked"**
4. Select the `ky-summarizer` folder
5. The extension icon will appear in your toolbar ✅

---

## API Key Setup

1. Click the extension icon in your toolbar
2. Click **Settings**
3. Choose a provider:

| Provider | Model | Cost | Link |
|----------|-------|------|------|
| **Groq** ⭐ | llama-3.3-70b | **FREE** | [console.groq.com](https://console.groq.com/keys) |
| Google Gemini | gemini-2.5-flash | Free tier | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| OpenAI | gpt-4o-mini | ~$0.001/call | [platform.openai.com](https://platform.openai.com/api-keys) |
| Anthropic | claude-haiku | Paid | [console.anthropic.com](https://console.anthropic.com) |

4. Paste your API key → **Save** ✅

> 💡 **Recommendation**: Use Groq — it has the most generous free tier!

---

## How to Use

1. Open any AI chat page (ChatGPT, Claude, etc.)
2. When the context limit is near or you want to continue tomorrow
3. Click the extension icon
4. Click **"Summarize Now"**
5. The `ky-summary-[date].md` file will automatically download
6. Open a new chat → upload the .md file → type **"continue from here"**

---

## Output Format

```markdown
# Chat Summary — Saturday, May 30, 2026

## 🗂️ Main Topics
- Building a Chrome extension
- Universal DOM scraping strategy

## ✅ Decisions Made
- Use Manifest V3
- Multi-provider support

## ⏳ Unresolved / Needs Follow-up
- Testing across platforms
- Firefox port

## 🧩 Important Context
- **Tech stack:** Vanilla JS, Chrome Extension API
- **Project name:** ky-summarizer

## 📌 Prompt for New Chat
"We are building a Chrome extension called ky-summarizer that..."
```

---

## Privacy & Security

- ✅ API keys are stored in `chrome.storage.local` — **they never leave your browser**
- ✅ Chats are sent directly from your browser → AI provider (no middleman)
- ✅ Developers never see your chat content or API keys
- ✅ No analytics, no tracking
- ✅ Chat history is not saved anywhere

---

## License

MIT License — free to use, modify, and distribute.
