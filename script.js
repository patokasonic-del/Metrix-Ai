(() => {
  'use strict';

  const AI_NAME = 'Metrix Ai';
  const AVATAR = 'avatar.png';
  const STORE = 'metrix_ai_chats_v1';
  const MAX_CONTEXT = 20;

  const SUGGESTIONS = [
    { icon: 'fa-bug', title: 'Debug my code', sub: "Paste your code and the error you're getting",
      prompt: 'Help me debug my code. Please tell me what to paste (the code, the error message and the language).' },
    { icon: 'fa-lightbulb', title: 'Explain a concept', sub: 'Recursion, pointers, OOP... in simple words',
      prompt: 'Explain recursion in simple terms with a short Python example.' },
    { icon: 'fa-code', title: 'Write a function', sub: 'Clean code with a clear explanation',
      prompt: 'Write a JavaScript function that checks if a string is a palindrome, and explain how it works.' },
    { icon: 'fa-graduation-cap', title: 'Practice for exams', sub: 'Coding questions with worked solutions',
      prompt: 'Give me 3 beginner-friendly practice problems on arrays in C, with solutions.' },
  ];

  /* ---------- helpers ---------- */
  const $ = (s, r = document) => r.querySelector(s);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  const fmtTime = (t) => new Date(t).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const isTouch = () => window.matchMedia && window.matchMedia('(pointer: coarse)').matches;

  const chatEl = $('#chat');
  const inner = $('#chatInner');
  const input = $('#input');
  const sendBtn = $('#send');
  const listEl = $('#chatList');

  async function copyText(text) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch (e) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text; ta.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
        document.body.appendChild(ta); ta.select();
        const ok = document.execCommand('copy'); ta.remove(); return ok;
      } catch (e2) { return false; }
    }
  }

  /* ---------- avatar with letter fallback ---------- */
  function avatarHTML(sizeClass) {
    return `<img class="avatar-img ${sizeClass}" src="${AVATAR}" alt="${esc(AI_NAME)}">`;
  }
  function toFallback(img) {
    const span = document.createElement('span');
    span.className = img.className.replace('avatar-img', 'avatar-fallback');
    span.textContent = AI_NAME.charAt(0).toUpperCase();
    span.setAttribute('role', 'img');
    span.setAttribute('aria-label', AI_NAME);
    img.replaceWith(span);
  }
  function checkAvatars(root) {
    (root || document).querySelectorAll('img.avatar-img').forEach((img) => {
      if (img.complete && img.naturalWidth === 0) toFallback(img);
    });
  }
  document.addEventListener('error', (e) => {
    const t = e.target;
    if (t && t.tagName === 'IMG' && t.classList.contains('avatar-img')) toFallback(t);
  }, true);

  /* ---------- markdown (safe: everything is escaped) ---------- */
  function inline(text) {
    return text.split(/(`[^`\n]+`)/g).map((part, i) => {
      if (i % 2 === 1) return '<code>' + esc(part.slice(1, -1)) + '</code>';
      let s = esc(part);
      s = s.replace(/\*\*([^*\n]+?)\*\*/g, '<strong>$1</strong>');
      s = s.replace(/(^|[^*\w])\*([^*\s][^*\n]*?)\*(?!\*)/g, '$1<em>$2</em>');
      s = s.replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
      return s;
    }).join('');
  }

  function renderText(text) {
    const lines = text.split('\n');
    let out = '', list = null, para = [];
    const flushPara = () => { if (para.length) { out += '<p>' + para.map(inline).join('<br>') + '</p>'; para = []; } };
    const closeList = () => { if (list) { out += '</' + list + '>'; list = null; } };
    let m;
    for (const raw of lines) {
      const line = raw.replace(/\s+$/, '');
      if (!line.trim()) { flushPara(); closeList(); continue; }
      if ((m = line.match(/^(#{1,6})\s+(.*)$/))) {
        flushPara(); closeList();
        const lv = Math.min(m[1].length + 1, 6);
        out += `<h${lv}>${inline(m[2])}</h${lv}>`; continue;
      }
      if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { flushPara(); closeList(); out += '<hr>'; continue; }
      if ((m = line.match(/^\s*>\s?(.*)$/))) { flushPara(); closeList(); out += '<blockquote>' + inline(m[1]) + '</blockquote>'; continue; }
      if ((m = line.match(/^\s*[-*•]\s+(.*)$/))) {
        flushPara();
        if (list !== 'ul') { closeList(); out += '<ul>'; list = 'ul'; }
        out += '<li>' + inline(m[1]) + '</li>'; continue;
      }
      if ((m = line.match(/^\s*\d+[.)]\s+(.*)$/))) {
        flushPara();
        if (list !== 'ol') { closeList(); out += '<ol>'; list = 'ol'; }
        out += '<li>' + inline(m[1]) + '</li>'; continue;
      }
      closeList();
      para.push(line);
    }
    flushPara(); closeList();
    return out;
  }

  function codeBlock(lang, code) {
    const label = (lang || 'code').trim() || 'code';
    return '<div class="codeblock"><div class="code-head"><span class="lang">' + esc(label) +
      '</span><button type="button" class="code-copy"><i class="fa-regular fa-copy"></i><span>Copy code</span></button></div>' +
      '<pre><code>' + esc(code.replace(/\n$/, '')) + '</code></pre></div>';
  }

  function renderMarkdown(text) {
    const re = /```([^\n`]*)\n([\s\S]*?)```/g;
    let html = '', last = 0, m;
    while ((m = re.exec(text))) {
      html += renderText(text.slice(last, m.index));
      html += codeBlock(m[1].trim().split(/\s+/)[0], m[2]);
      last = re.lastIndex;
    }
    const rest = text.slice(last);
    const open = rest.indexOf('```');
    if (open > -1) { // a fence that was never closed
      html += renderText(rest.slice(0, open));
      const after = rest.slice(open + 3);
      const nl = after.indexOf('\n');
      html += codeBlock(nl > -1 ? after.slice(0, nl).trim().split(/\s+/)[0] : '', nl > -1 ? after.slice(nl + 1) : after);
    } else {
      html += renderText(rest);
    }
    return html;
  }

  /* ---------- state ---------- */
  let chats = [];
  let current = newChatObj();
  let busy = false;
  let errorRow = null;

  function newChatObj() { return { id: uid(), title: 'New chat', messages: [], updated: Date.now() }; }

  function loadChats() {
    try {
      const data = JSON.parse(localStorage.getItem(STORE) || '[]');
      if (Array.isArray(data)) {
        chats = data.filter((c) => c && typeof c.id === 'string' && Array.isArray(c.messages)).map((c) => ({
          id: c.id,
          title: typeof c.title === 'string' ? c.title : 'Chat',
          updated: Number(c.updated) || 0,
          messages: c.messages.filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string'),
        }));
      }
    } catch (e) { chats = []; }
  }
  function saveChats() {
    try { localStorage.setItem(STORE, JSON.stringify(chats.slice(-50))); } catch (e) { /* storage full or blocked */ }
  }

  /* ---------- rendering ---------- */
  function renderSidebar() {
    const sorted = chats.filter((c) => c.messages.length).sort((a, b) => b.updated - a.updated);
    if (!sorted.length) { listEl.innerHTML = '<div class="empty-list">No chats yet. Start a new one!</div>'; return; }
    listEl.innerHTML = sorted.map((c) =>
      `<div class="chat-row${c.id === current.id ? ' active' : ''}" data-id="${esc(c.id)}">` +
      `<button class="chat-item" type="button" data-open><i class="fa-regular fa-message"></i><span>${esc(c.title)}</span></button>` +
      `<button class="chat-del" type="button" data-del aria-label="Delete chat"><i class="fa-regular fa-trash-can"></i></button></div>`
    ).join('');
  }

  function welcomeHTML() {
    return '<div class="welcome">' + avatarHTML('av-xl') +
      `<h1>Hi, I'm <span>${esc(AI_NAME)}</span></h1>` +
      '<p>Your coding and debugging buddy. Paste your code, share an error, or ask a question and I will help you fix it and understand why.</p>' +
      '<div class="cards">' + SUGGESTIONS.map((s, i) =>
        `<button class="card" type="button" data-sug="${i}"><i class="fa-solid ${s.icon}"></i><b>${esc(s.title)}</b><small>${esc(s.sub)}</small></button>`
      ).join('') + '</div></div>';
  }

  function messageEl(msg, i) {
    const el = document.createElement('div');
    el.dataset.i = String(i);
    if (msg.role === 'user') {
      el.className = 'msg user';
      el.innerHTML = '<div class="bubble">' + esc(msg.content) + '</div>';
    } else {
      const fb = msg.feedback;
      el.className = 'msg ai';
      el.innerHTML = avatarHTML('av-sm') +
        '<div class="ai-body"><div class="bubble">' + renderMarkdown(msg.content) + '</div>' +
        '<div class="actions">' +
        '<button class="act copy" type="button" title="Copy reply" aria-label="Copy reply"><i class="fa-regular fa-copy"></i><span class="lbl"></span></button>' +
        '<span class="time">' + esc(fmtTime(msg.time || Date.now())) + '</span>' +
        `<button class="act up${fb === 'up' ? ' active' : ''}" type="button" title="Good response" aria-label="Good response" aria-pressed="${fb === 'up'}"><i class="fa-${fb === 'up' ? 'solid' : 'regular'} fa-thumbs-up"></i></button>` +
        `<button class="act down${fb === 'down' ? ' active' : ''}" type="button" title="Bad response" aria-label="Bad response" aria-pressed="${fb === 'down'}"><i class="fa-${fb === 'down' ? 'solid' : 'regular'} fa-thumbs-down"></i></button>` +
        '</div></div>';
    }
    return el;
  }

  function renderChat() {
    errorRow = null;
    inner.innerHTML = '';
    if (!current.messages.length) {
      inner.innerHTML = welcomeHTML();
    } else {
      current.messages.forEach((m, i) => inner.appendChild(messageEl(m, i)));
    }
    checkAvatars(inner);
    scrollDown(true);
  }

  function scrollDown(instant) {
    requestAnimationFrame(() => chatEl.scrollTo({ top: chatEl.scrollHeight, behavior: instant ? 'auto' : 'smooth' }));
  }

  function showTyping() {
    const el = document.createElement('div');
    el.className = 'msg ai'; el.id = 'typing';
    el.innerHTML = avatarHTML('av-sm') + '<div class="ai-body"><div class="bubble"><span class="dots"><i></i><i></i><i></i></span></div></div>';
    inner.appendChild(el); checkAvatars(el); scrollDown();
  }
  function hideTyping() { const t = $('#typing'); if (t) t.remove(); }

  function showError(text) {
    const el = document.createElement('div');
    el.className = 'msg ai error';
    el.innerHTML = avatarHTML('av-sm') +
      '<div class="ai-body"><div class="bubble"><i class="fa-solid fa-triangle-exclamation"></i> ' + esc(text) +
      '</div><button class="retry" type="button" data-retry><i class="fa-solid fa-rotate-right"></i> Try again</button></div>';
    inner.appendChild(el); errorRow = el; checkAvatars(el); scrollDown();
  }

  /* ---------- sending ---------- */
  function updateSend() { sendBtn.disabled = busy || !input.value.trim(); }
  function autosize() { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 160) + 'px'; }

  async function requestReply(chat) {
    busy = true; updateSend();
    if (errorRow) { errorRow.remove(); errorRow = null; }
    showTyping();

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 60000);
    let reply = null, errText = null;

    try {
      const payload = chat.messages.slice(-MAX_CONTEXT).map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: payload }),
        signal: ctrl.signal,
      });
      let data = {};
      try { data = await res.json(); } catch (e) { /* not JSON */ }
      if (!res.ok || !data.reply) {
        errText = data.error || (res.status === 404
          ? 'The chat service was not found. Make sure api/chat.js is deployed.'
          : 'Something went wrong. Please try again.');
      } else {
        reply = data.reply;
      }
    } catch (e) {
      errText = e && e.name === 'AbortError'
        ? 'That took too long. Please try again.'
        : "I couldn't reach the server. Check your internet connection and try again.";
    } finally {
      clearTimeout(timer);
    }

    busy = false;
    if (current === chat) hideTyping();

    if (reply) {
      chat.messages.push({ role: 'assistant', content: reply, time: Date.now() });
      chat.updated = Date.now();
      saveChats(); renderSidebar();
      if (current === chat) {
        inner.appendChild(messageEl(chat.messages[chat.messages.length - 1], chat.messages.length - 1));
        checkAvatars(inner); scrollDown();
      }
    } else if (current === chat) {
      showError(errText);
    }
    updateSend();
  }

  function send(text) {
    text = String(text || '').trim();
    if (!text || busy) return;
    if (!chats.includes(current)) chats.push(current);
    current.messages.push({ role: 'user', content: text, time: Date.now() });
    if (current.title === 'New chat') current.title = text.replace(/\s+/g, ' ').slice(0, 42);
    current.updated = Date.now();
    saveChats();
    input.value = ''; autosize();
    renderChat(); renderSidebar();
    requestReply(current);
  }

  /* ---------- sidebar actions ---------- */
  function closeSidebar() { document.body.classList.remove('sidebar-open'); }

  function startNewChat() {
    if (busy) return;
    if (!current.messages.length) { closeSidebar(); input.focus(); return; }
    current = newChatObj();
    renderChat(); renderSidebar(); closeSidebar(); input.focus();
  }

  /* ---------- events ---------- */
  input.addEventListener('input', () => { autosize(); updateSend(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !isTouch()) {
      e.preventDefault();
      send(input.value);
    }
  });
  $('#form').addEventListener('submit', (e) => { e.preventDefault(); send(input.value); });

  $('#newChat').addEventListener('click', startNewChat);
  $('#menuBtn').addEventListener('click', () => document.body.classList.toggle('sidebar-open'));
  $('#overlay').addEventListener('click', closeSidebar);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSidebar(); });

  listEl.addEventListener('click', (e) => {
    const row = e.target.closest('.chat-row');
    if (!row) return;
    const id = row.dataset.id;
    if (e.target.closest('[data-del]')) {
      const wasCurrent = current.id === id;
      chats = chats.filter((c) => c.id !== id);
      saveChats();
      if (wasCurrent) { current = newChatObj(); renderChat(); }
      renderSidebar();
      return;
    }
    if (e.target.closest('[data-open]')) {
      if (busy && current.id !== id) return;
      const c = chats.find((x) => x.id === id);
      if (c) { current = c; renderChat(); renderSidebar(); closeSidebar(); }
    }
  });

  inner.addEventListener('click', async (e) => {
    const sug = e.target.closest('[data-sug]');
    if (sug) { send(SUGGESTIONS[Number(sug.dataset.sug)].prompt); return; }

    if (e.target.closest('[data-retry]')) { requestReply(current); return; }

    const codeCopy = e.target.closest('.code-copy');
    if (codeCopy) {
      const code = codeCopy.closest('.codeblock').querySelector('code').textContent;
      const ok = await copyText(code);
      const label = codeCopy.querySelector('span');
      label.textContent = ok ? 'Copied' : 'Failed';
      setTimeout(() => { label.textContent = 'Copy code'; }, 1500);
      return;
    }

    const msgEl = e.target.closest('.msg.ai');
    const act = e.target.closest('.act');
    if (!msgEl || !act || msgEl.dataset.i === undefined) return;
    const msg = current.messages[Number(msgEl.dataset.i)];
    if (!msg) return;

    if (act.classList.contains('copy')) {
      const ok = await copyText(msg.content);
      const icon = act.querySelector('i'), lbl = act.querySelector('.lbl');
      icon.className = ok ? 'fa-solid fa-check' : 'fa-solid fa-xmark';
      lbl.textContent = ok ? 'Copied' : 'Failed';
      act.classList.toggle('done', ok);
      setTimeout(() => { icon.className = 'fa-regular fa-copy'; lbl.textContent = ''; act.classList.remove('done'); }, 1500);
      return;
    }

    const val = act.classList.contains('up') ? 'up' : 'down';
    msg.feedback = msg.feedback === val ? null : val;
    saveChats();
    const up = msgEl.querySelector('.act.up'), down = msgEl.querySelector('.act.down');
    [[up, 'up'], [down, 'down']].forEach(([btn, v]) => {
      const on = msg.feedback === v;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-pressed', String(on));
      btn.querySelector('i').className = 'fa-' + (on ? 'solid' : 'regular') + ' fa-thumbs-' + v;
    });
  });

  /* ---------- start ---------- */
  loadChats();
  checkAvatars(document);
  renderChat();
  renderSidebar();
  updateSend();
  if (!isTouch()) input.focus();
})();
