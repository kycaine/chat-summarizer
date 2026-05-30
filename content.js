(function () {
  'use strict';

  const PLATFORM_SELECTORS = {
    'chatgpt.com': {
      messages: '[data-message-author-role]',
      userRole: 'user',
      assistantRole: 'assistant',
      roleAttr: 'data-message-author-role',
      contentSelector: '.markdown, .text-message, [class*="prose"]'
    },
    'chat.openai.com': {
      messages: '[data-message-author-role]',
      userRole: 'user',
      assistantRole: 'assistant',
      roleAttr: 'data-message-author-role',
      contentSelector: '.markdown, .text-message, [class*="prose"]'
    },
    'claude.ai': {
      messages: '[data-testid="human-turn"], [data-testid="ai-turn"]',
      userSelector: '[data-testid="human-turn"]',
      assistantSelector: '[data-testid="ai-turn"]'
    },
    'gemini.google.com': {
      userSelector: '.user-query-container, .user-request',
      assistantSelector: '.model-response-text, .response-container'
    },
    'grok.com': {
      userSelector: '[class*="user-message"], [class*="human"]',
      assistantSelector: '[class*="assistant"], [class*="bot-message"]'
    },
    'perplexity.ai': {
      userSelector: '[class*="user"], .query',
      assistantSelector: '[class*="answer"], [class*="response"]'
    }
  };

  function detectPlatform() {
    const hostname = window.location.hostname;
    for (const domain in PLATFORM_SELECTORS) {
      if (hostname.includes(domain)) {
        return { domain, config: PLATFORM_SELECTORS[domain] };
      }
    }
    return null;
  }

  function extractFromKnownPlatform(platform) {
    const { config } = platform;
    const messages = [];

    try {
      if (config.messages && config.roleAttr) {
        const elements = document.querySelectorAll(config.messages);
        elements.forEach((el, idx) => {
          const role = el.getAttribute(config.roleAttr);
          const contentEl = el.querySelector(config.contentSelector) || el;
          const text = getCleanText(contentEl);
          if (text.length > 5) {
            const label = role === config.userRole ? 'User' : 'Assistant';
            messages.push(`${label}:\n${text}`);
          }
        });
        if (messages.length > 0) return messages;
      }

      if (config.userSelector && config.assistantSelector) {
        const allEls = [];

        document.querySelectorAll(config.userSelector).forEach(el => {
          allEls.push({ el, role: 'user', order: getElementOrder(el) });
        });
        document.querySelectorAll(config.assistantSelector).forEach(el => {
          allEls.push({ el, role: 'assistant', order: getElementOrder(el) });
        });

        allEls.sort((a, b) => a.order - b.order);

        allEls.forEach(({ el, role }) => {
          const text = getCleanText(el);
          if (text.length > 5) {
            const label = role === 'user' ? 'User' : 'Assistant';
            messages.push(`${label}:\n${text}`);
          }
        });

        if (messages.length > 0) return messages;
      }
    } catch (e) {
      console.warn('[ky-summarizer] Platform extraction failed, falling back to universal:', e);
    }

    return null;
  }

  function getElementOrder(el) {
    const rect = el.getBoundingClientRect();
    return rect.top + window.scrollY;
  }

  function extractUniversal() {
    const messages = [];
    const seen = new Set();

    const candidateSelectors = [
      '[class*="message"]',
      '[class*="chat"]',
      '[class*="conversation"]',
      '[class*="bubble"]',
      '[class*="turn"]',
      '[class*="response"]',
      '[class*="query"]',
      '[role="listitem"]',
      'article',
    ];

    let candidates = [];
    for (const selector of candidateSelectors) {
      try {
        const els = document.querySelectorAll(selector);
        candidates.push(...Array.from(els));
      } catch (e) {}
    }

    const unique = [...new Set(candidates)];
    const filtered = unique.filter(el => {
      const text = el.innerText?.trim() || '';
      if (text.length < 20 || text.length > 15000) return false;
      const tag = el.tagName.toLowerCase();
      if (['nav', 'header', 'footer', 'aside'].includes(tag)) return false;
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      return true;
    });

    filtered.sort((a, b) => {
      const rectA = a.getBoundingClientRect();
      const rectB = b.getBoundingClientRect();
      return (rectA.top + window.scrollY) - (rectB.top + window.scrollY);
    });

    const outermost = filtered.filter(el => {
      return !filtered.some(other => other !== el && other.contains(el));
    });

    outermost.forEach((el, idx) => {
      const text = getCleanText(el);
      if (!seen.has(text) && text.length > 20) {
        seen.add(text);
        const isUser = guessUserMessage(el, idx, outermost);
        const label = isUser ? 'User' : 'Assistant';
        messages.push(`${label}:\n${text}`);
      }
    });

    return messages;
  }

  function guessUserMessage(el, idx, allElements) {
    const classList = el.className?.toLowerCase() || '';

    if (classList.includes('user') || classList.includes('human') || classList.includes('query')) return true;
    if (classList.includes('assistant') || classList.includes('bot') || classList.includes('ai-') || classList.includes('model')) return false;

    const style = window.getComputedStyle(el);
    if (style.textAlign === 'right' || style.marginLeft === 'auto') return true;
    if (style.marginRight === 'auto' && style.marginLeft !== 'auto') return false;

    return idx % 2 === 0;
  }

  function getCleanText(el) {
    const clone = el.cloneNode(true);

    clone.querySelectorAll('script, style, svg, img, button').forEach(e => e.remove());

    clone.querySelectorAll('pre, code').forEach(codeEl => {
      const text = codeEl.innerText?.trim();
      if (text) {
        const tag = codeEl.tagName.toLowerCase();
        if (tag === 'pre') {
          codeEl.textContent = `\n\`\`\`\n${text}\n\`\`\`\n`;
        }
      }
    });

    let text = clone.innerText || clone.textContent || '';
    text = text.replace(/\n{4,}/g, '\n\n').trim();
    return text;
  }

  function extractChat() {
    const platform = detectPlatform();
    let messages = [];

    if (platform) {
      messages = extractFromKnownPlatform(platform) || [];
    }

    if (messages.length === 0) {
      messages = extractUniversal();
    }

    if (messages.length === 0) {
      return {
        success: false,
        error: 'No chat messages found on this page.',
        url: window.location.href,
        title: document.title
      };
    }

    const rawChat = messages.join('\n\n---\n\n');

    return {
      success: true,
      rawChat,
      messageCount: messages.length,
      url: window.location.href,
      title: document.title,
      platform: platform?.domain || 'unknown'
    };
  }

  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'extractChat') {
      try {
        const result = extractChat();
        sendResponse(result);
      } catch (error) {
        sendResponse({
          success: false,
          error: `Failed to extract chat: ${error.message}`,
          url: window.location.href,
          title: document.title
        });
      }
    }
    return true;
  });

})();
