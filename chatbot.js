/* ══════════════════════════════════════
   Kolachi Seafood — Chat Widget
   Vanilla JS + SSE streaming → /api/chat
══════════════════════════════════════ */

(function () {
  'use strict';

  // ── Config ──────────────────────────────────────────────────
  // Auto-detect: on production use same origin, locally use port 3001
  const API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? `http://${window.location.hostname}:3001/api/chat`
    : '/api/chat';
  const BOT_NAME    = 'Kolachi Assistant';
  const BOT_TAGLINE = 'Ocean to Table · Always Here';

  const SUGGESTIONS = [
    '🦞 What\'s on the menu?',
    '📅 What are your opening hours?',
    '🍽️ Do you have a tasting menu?',
    '📞 How can I make a reservation?',
  ];

  // ── State ────────────────────────────────────────────────────
  let messages   = [];   // { role: 'user'|'assistant', content: string }
  let isStreaming = false;
  let unreadCount = 0;

  // ── Helpers ──────────────────────────────────────────────────
  function timestamp() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function autoResize(el) {
    el.style.height = '22px';
    el.style.height = Math.min(el.scrollHeight, 100) + 'px';
  }

  function scrollToBottom() {
    const msgs = document.getElementById('chat-messages');
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
  }

  // ── Build widget HTML ────────────────────────────────────────
  function buildWidget() {
    // Toggle button
    const toggle = document.createElement('button');
    toggle.id = 'chat-toggle';
    toggle.setAttribute('aria-label', 'Open chat');
    toggle.innerHTML = `
      <svg class="icon-open" width="24" height="24" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <svg class="icon-close" width="24" height="24" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round">
        <line x1="18" y1="6" x2="6" y2="18"/>
        <line x1="6" y1="6" x2="18" y2="18"/>
      </svg>
      <span id="chat-badge"></span>`;

    // Chat window
    const win = document.createElement('aside');
    win.id = 'chat-window';
    win.setAttribute('aria-label', 'Chat with Kolachi Assistant');
    win.innerHTML = `
      <header id="chat-header">
        <div class="chat-header-icon"><i class="fas fa-anchor"></i></div>
        <div class="chat-header-text">
          <strong>${BOT_NAME}</strong>
          <span>${BOT_TAGLINE}</span>
        </div>
        <div class="chat-status-dot" title="Online"></div>
      </header>

      <div id="chat-messages" role="log" aria-live="polite">
        ${buildEmptyState()}
      </div>

      <div id="chat-input-area">
        <div class="chat-input-row">
          <textarea id="chat-textarea" rows="1"
            placeholder="Ask about menu, hours, reservations…"
            aria-label="Type your message"></textarea>
          <button id="chat-send" aria-label="Send message" disabled>
            <svg width="16" height="16" viewBox="0 0 24 24"
                 fill="none" stroke="currentColor" stroke-width="2.5"
                 stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
        <p class="chat-footer-text">Powered by Kolachi Seafood AI</p>
      </div>`;

    document.body.appendChild(toggle);
    document.body.appendChild(win);
  }

  function buildEmptyState() {
    const pills = SUGGESTIONS.map(s =>
      `<button class="chat-suggestion" data-text="${s.replace(/['"]/g, '')}">${s}</button>`
    ).join('');

    return `
      <div class="chat-empty" id="chat-empty">
        <div class="chat-empty-icon"><i class="fas fa-anchor"></i></div>
        <strong>How can we help?</strong>
        <p>Ask about the menu, hours, reservations — or let us know how we can make your experience perfect.</p>
        <div class="chat-suggestions">${pills}</div>
      </div>`;
  }

  // ── Render a message bubble ──────────────────────────────────
  function appendMessage(role, content, id) {
    const container = document.getElementById('chat-messages');

    // Remove empty state on first message
    const empty = document.getElementById('chat-empty');
    if (empty) empty.remove();

    const wrap = document.createElement('div');
    wrap.classList.add('msg', role === 'user' ? 'user' : 'bot');
    if (id) wrap.id = id;

    wrap.innerHTML = `
      <div class="msg-bubble">${escapeHtml(content)}</div>
      <span class="msg-time">${timestamp()}</span>`;

    container.appendChild(wrap);
    scrollToBottom();
    return wrap;
  }

  // Append a streaming bot bubble (returns the bubble div for updates)
  function appendBotBubble(id) {
    const container = document.getElementById('chat-messages');
    const empty = document.getElementById('chat-empty');
    if (empty) empty.remove();

    const wrap = document.createElement('div');
    wrap.classList.add('msg', 'bot');
    wrap.id = id;
    wrap.innerHTML = `
      <div class="msg-bubble"></div>
      <span class="msg-time">${timestamp()}</span>`;

    container.appendChild(wrap);
    scrollToBottom();
    return wrap.querySelector('.msg-bubble');
  }

  function appendTyping() {
    const container = document.getElementById('chat-messages');
    const empty = document.getElementById('chat-empty');
    if (empty) empty.remove();

    const wrap = document.createElement('div');
    wrap.classList.add('msg', 'bot');
    wrap.id = 'typing-indicator';
    wrap.innerHTML = `
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>`;
    container.appendChild(wrap);
    scrollToBottom();
  }

  function removeTyping() {
    const el = document.getElementById('typing-indicator');
    if (el) el.remove();
  }

  function appendError(text) {
    const container = document.getElementById('chat-messages');
    const wrap = document.createElement('div');
    wrap.classList.add('msg', 'bot', 'msg-error');
    wrap.innerHTML = `
      <div class="msg-bubble">${escapeHtml(text)}</div>
      <span class="msg-time">${timestamp()}</span>`;
    container.appendChild(wrap);
    scrollToBottom();
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/\n/g, '<br>');
  }

  // ── Send message → streaming SSE ────────────────────────────
  async function sendMessage(text) {
    if (!text.trim() || isStreaming) return;

    isStreaming = true;
    setSendDisabled(true);

    // Push user message
    messages.push({ role: 'user', content: text });
    appendMessage('user', text);

    // Show typing
    appendTyping();

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(err.error || `HTTP ${res.status}`);
      }

      removeTyping();

      // Create streaming bubble
      const bubbleId  = 'bot-msg-' + Date.now();
      const bubbleEl  = appendBotBubble(bubbleId);
      let   fullText  = '';

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let   buffer  = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // keep partial line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.token) {
              fullText += parsed.token;
              bubbleEl.innerHTML = escapeHtml(fullText);
              scrollToBottom();
            }
          } catch (parseErr) {
            if (parseErr.message !== 'Unexpected end of JSON input') {
              throw parseErr;
            }
          }
        }
      }

      // Save assistant message
      if (fullText) {
        messages.push({ role: 'assistant', content: fullText });
      }

    } catch (err) {
      removeTyping();
      console.error('[Kolachi Chat]', err);

      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        appendError('Unable to connect to the server. Please make sure the server is running with: npm start');
      } else if (err.message.includes('GROQ_API_KEY') || err.message.includes('OPENAI_API_KEY')) {
        appendError('Server configuration error: API key is missing in .env');
      } else if (err.message.includes('429') || err.message.includes('credits') || err.message.includes('rate')) {
        appendError('Our AI assistant is temporarily busy. Please try again in a moment or call us at (212) 555-0199.');
      } else if (err.message.includes('401') || err.message.includes('Invalid API Key') || err.message.includes('Incorrect API key')) {
        appendError('Server configuration error: invalid API key. Please check your .env file.');
      } else {
        appendError('Something went wrong. Please try again or call us at (212) 555-0199.');
      }
    } finally {
      isStreaming = false;
      setSendDisabled(false);
      document.getElementById('chat-textarea')?.focus();
    }
  }

  // ── UI helpers ───────────────────────────────────────────────
  function setSendDisabled(disabled) {
    const btn = document.getElementById('chat-send');
    if (btn) btn.disabled = disabled;
  }

  function toggleWindow() {
    const win    = document.getElementById('chat-window');
    const toggle = document.getElementById('chat-toggle');
    const badge  = document.getElementById('chat-badge');
    const isOpen = win.classList.contains('open');

    if (isOpen) {
      win.classList.remove('open');
      toggle.classList.remove('open');
      toggle.setAttribute('aria-label', 'Open chat');
    } else {
      win.classList.add('open');
      toggle.classList.add('open');
      toggle.setAttribute('aria-label', 'Close chat');
      // Clear badge
      unreadCount = 0;
      badge.textContent = '';
      badge.classList.remove('show');
      // Focus textarea
      setTimeout(() => document.getElementById('chat-textarea')?.focus(), 60);
    }
  }

  // ── Wire up events ───────────────────────────────────────────
  function bindEvents() {
    // Toggle button
    document.getElementById('chat-toggle').addEventListener('click', toggleWindow);

    const textarea = document.getElementById('chat-textarea');
    const sendBtn  = document.getElementById('chat-send');

    // Enable/disable send based on input
    textarea.addEventListener('input', () => {
      autoResize(textarea);
      sendBtn.disabled = !textarea.value.trim() || isStreaming;
    });

    // Enter to send (Shift+Enter = newline)
    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        const text = textarea.value.trim();
        if (text && !isStreaming) {
          textarea.value = '';
          autoResize(textarea);
          sendBtn.disabled = true;
          sendMessage(text);
        }
      }
    });

    // Send button click
    sendBtn.addEventListener('click', () => {
      const text = textarea.value.trim();
      if (text && !isStreaming) {
        textarea.value = '';
        autoResize(textarea);
        sendBtn.disabled = true;
        sendMessage(text);
      }
    });

    // Suggestion pills (event delegation)
    document.getElementById('chat-messages').addEventListener('click', (e) => {
      const btn = e.target.closest('.chat-suggestion');
      if (!btn) return;
      const text = btn.dataset.text;
      if (text) sendMessage(text);
    });
  }

  // ── Init ─────────────────────────────────────────────────────
  function init() {
    buildWidget();
    bindEvents();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
