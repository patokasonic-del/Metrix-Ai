const AI_CONFIG = {
  name: "Metrix Ai",
  creator: "Patrick Njoroge, created by Digital solution agency",
  purpose: "help students with coding and debugging",
  imageUrl: "./avatar.png",
  storageKey: "metrix_ai_digital_solution_agency_chats_v1",
  suggestions: [
    {
      icon: "fa-code",
      title: "Explain a coding concept",
      prompt:
        "Explain how closures, async/await, or recursion work in plain language with a clear code example.",
    },
    {
      icon: "fa-bug",
      title: "Debug an error message",
      prompt:
        "Help me debug a runtime or syntax error—tell me what I should paste and how you'll pinpoint the cause.",
    },
    {
      icon: "fa-laptop-code",
      title: "Review & improve my code",
      prompt:
        "Review a small function or script for me and show me how to make it cleaner, safer, and easier to read.",
    },
    {
      icon: "fa-lightbulb",
      title: "Break down a programming task",
      prompt:
        "Give me a step-by-step plan and starter code to solve a student coding assignment or mini-project.",
    },
  ],
};

const state = {
  chats: [],
  activeChatId: null,
  isSending: false,
};

const els = {
  sidebar: document.getElementById("sidebar"),
  sidebarBackdrop: document.getElementById("sidebarBackdrop"),
  openSidebarBtn: document.getElementById("openSidebarBtn"),
  closeSidebarBtn: document.getElementById("closeSidebarBtn"),
  newChatBtn: document.getElementById("newChatBtn"),
  chatHistoryList: document.getElementById("chatHistoryList"),
  topBarAvatarContainer: document.getElementById("topBarAvatarContainer"),
  topBarName: document.getElementById("topBarName"),
  chatContainer: document.getElementById("chatContainer"),
  welcomeScreen: document.getElementById("welcomeScreen"),
  welcomeAvatarContainer: document.getElementById("welcomeAvatarContainer"),
  welcomeTitle: document.getElementById("welcomeTitle"),
  welcomeSubtitle: document.getElementById("welcomeSubtitle"),
  suggestionsGrid: document.getElementById("suggestionsGrid"),
  messagesList: document.getElementById("messagesList"),
  messageInput: document.getElementById("messageInput"),
  sendBtn: document.getElementById("sendBtn"),
  disclaimerNote: document.getElementById("disclaimerNote"),
};

function escapeHtml(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatCurrentTime(date = new Date()) {
  return date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function createAvatarElement(variant = "top") {
  const initial = (AI_CONFIG.name.trim()[0] || "M").toUpperCase();
  const wrapper = document.createElement("div");

  const img = document.createElement("img");
  img.src = AI_CONFIG.imageUrl;
  img.alt = ${AI_CONFIG.name} "avatar";

  if (variant === "welcome") {
    img.className = "welcome-avatar-img";
  } else if (variant === "message") {
    img.className = "msg-avatar-img";
  } else {
    img.className = "avatar-img";
  }

  img.addEventListener("error", () => {
    const fallback = document.createElement("div");
    fallback.textContent = initial;
    fallback.setAttribute("aria-label", ${AI_CONFIG.name} avatar);
    if (variant === "welcome") {
      fallback.className = "welcome-avatar-fallback";
    } else if (variant === "message") {
      fallback.className = "msg-avatar-fallback";
    } else {
      fallback.className = "avatar-fallback";
    }
    img.replaceWith(fallback);
  });

  wrapper.appendChild(img);
  return wrapper.firstChild;
}

function renderBranding() {
  els.topBarName.textContent = AI_CONFIG.name;
  els.topBarAvatarContainer.innerHTML = "";
  els.topBarAvatarContainer.appendChild(createAvatarElement("top"));

  els.welcomeAvatarContainer.innerHTML = "";
  els.welcomeAvatarContainer.appendChild(createAvatarElement("welcome"));

  els.welcomeTitle.textContent = Hi, I'm ${AI_CONFIG.name};
  els.welcomeSubtitle.textContent = By ${AI_CONFIG.creator} to ${AI_CONFIG.purpose}. Ask a question, paste an error, or pick a starting prompt below.;
  els.disclaimerNote.textContent = ${AI_CONFIG.name} can make mistakes.;

  els.suggestionsGrid.innerHTML = "";
  AI_CONFIG.suggestions.forEach((item) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "suggestion-card";
    card.innerHTML = `
      <div class="suggestion-card-top">
        <i class="fa-solid ${escapeHtml(item.icon)}"></i>
        <span>${escapeHtml(item.title)}</span>
      </div>
      <div class="suggestion-card-desc">${escapeHtml(item.prompt)}</div>
    `;
    card.addEventListener("click", () => {
      if (state.isSending) return;
      sendUserMessage(item.prompt);
    });
    els.suggestionsGrid.appendChild(card);
  });
}

function loadChatsFromStorage() {
  try {
    const raw = localStorage.getItem(AI_CONFIG.storageKey);
    if (!raw) {
      state.chats = [];
      state.activeChatId = null;
      return;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      state.chats = parsed;
      state.activeChatId = parsed[0]?.id || null;
    }
  } catch (err) {
    console.error("Failed to load chat history:", err);
    state.chats = [];
    state.activeChatId = null;
  }
}

function saveChatsToStorage() {
  try {
    localStorage.setItem(AI_CONFIG.storageKey, JSON.stringify(state.chats));
  } catch (err) {
    console.error("Failed to save chat history:", err);
  }
}

function getActiveChat() {
  return state.chats.find((c) => c.id === state.activeChatId) || null;
}

function createNewChat() {
  const newChat = {
    id: chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)},
    title: "New chat",
    updatedAt: Date.now(),
    messages: [],
  };
  state.chats.unshift(newChat);
  state.activeChatId = newChat.id;
  saveChatsToStorage();
  renderSidebar();
  renderActiveConversation();
  closeMobileSidebar();
  els.messageInput.focus();
}

function selectChat(chatId) {
  if (state.isSending) return;
  state.activeChatId = chatId;
  renderSidebar();
  renderActiveConversation();
  closeMobileSidebar();
}

function deleteChat(chatId, event) {
  event.stopPropagation();
  if (state.isSending) return;
  state.chats = state.chats.filter((c) => c.id !== chatId);
  if (state.activeChatId === chatId) {
    state.activeChatId = state.chats[0]?.id || null;
  }
  saveChatsToStorage();
  renderSidebar();
  renderActiveConversation();
}

function renderSidebar() {
  els.chatHistoryList.innerHTML = "";

  if (!state.chats.length) {
    const emptyEl = document.createElement("div");
    emptyEl.className = "chat-history-empty";
    emptyEl.textContent = "No saved chats yet.";
    els.chatHistoryList.appendChild(emptyEl);
    return;
  }

  state.chats.forEach((chat) => {
    const item = document.createElement("div");
    item.className = chat-history-item ${chat.id === state.activeChatId ? "active" : ""};
    item.setAttribute("role", "button");
    item.setAttribute("tabindex", "0");

    const titleSpan = document.createElement("span");
    titleSpan.className = "chat-history-title";
    titleSpan.textContent = chat.title || "New chat";

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete-chat-btn";
    deleteBtn.title = "Delete chat";
    deleteBtn.setAttribute("aria-label", Delete ${chat.title || "chat"});
    deleteBtn.innerHTML = <i class="fa-solid fa-trash"></i>;
    deleteBtn.addEventListener("click", (e) => deleteChat(chat.id, e));

    item.addEventListener("click", () => selectChat(chat.id));
    item.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectChat(chat.id);
      }
    });

    item.appendChild(titleSpan);
    item.appendChild(deleteBtn);
    els.chatHistoryList.appendChild(item);
  });
}

function formatInlineText(escapedLine) {
  let result = escapedLine;
  result = result.replace(/([^\n]+)`/g, (_, code) => {
    return <code class="inline-code">${code}</code>;
  });
  result = result.replace(/\\([^\n]+)\\*/g, "<strong>$1</strong>");
  return result;
}

function renderMarkdownSafe(markdownText) {
  const normalized = String(markdownText ?? "").replace(/\r\n/g, "\n");
  const fenceRegex = /([a-zA-Z0-9_-]*)\n?([\s\S]*?)/g;

  const segments = [];
  let lastIndex = 0;
  let match;

  while ((match = fenceRegex.exec(normalized)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: "text",
        content: normalized.slice(lastIndex, match.index),
      });
    }
    segments.push({
      type: "code",
      language: (match[1] || "code").trim(),
      code: match[2].replace(/\n$/, ""),
    });
    lastIndex = fenceRegex.lastIndex;
  }

  if (lastIndex < normalized.length) {
    segments.push({
      type: "text",
      content: normalized.slice(lastIndex),
    });
  }

  const container = document.createElement("div");
  container.className = "formatted-content";

  segments.forEach((seg) => {
    if (seg.type === "code") {
      const block = document.createElement("div");
      block.className = "code-block";

      const header = document.createElement("div");
      header.className = "code-block-header";

      const langLabel = document.createElement("span");
      langLabel.textContent = seg.language || "code";

      const copyCodeBtn = document.createElement("button");
      copyCodeBtn.type = "button";
      copyCodeBtn.className = "copy-code-btn";
      copyCodeBtn.innerHTML = <i class="fa-regular fa-copy"></i> <span>Copy code</span>;

      copyCodeBtn.addEventListener("click", async () => {
        try {
          await navigator.clipboard.writeText(seg.code);
        } catch {
          // Clipboard fallback ignored
        }
        copyCodeBtn.innerHTML = <i class="fa-solid fa-check"></i> <span>Copied</span>;
        setTimeout(() => {
          copyCodeBtn.innerHTML = <i class="fa-regular fa-copy"></i> <span>Copy code</span>;
        }, 1600);
      });

      header.appendChild(langLabel);
      header.appendChild(copyCodeBtn);

      const pre = document.createElement("pre");
      const codeEl = document.createElement("code");
      codeEl.textContent = seg.code;
      pre.appendChild(codeEl);

      block.appendChild(header);
      block.appendChild(pre);
      container.appendChild(block);
      return;
    }

    const lines = seg.content.split("\n");
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      if (!line.trim()) {
        i += 1;
        continue;
      }

      const headingMatch = line.match(/^(#{1,4})\s+(.*)$/);
      if (headingMatch) {
        const level = headingMatch[1].length;
        const hTag = h${Math.min(level, 4)};
        const headingEl = document.createElement(hTag);
        headingEl.innerHTML = formatInlineText(escapeHtml(headingMatch[2]));
        container.appendChild(headingEl);
        i += 1;
        continue;
      }

      if (/^\s*[-*+]\s+/.test(line)) {
        const ul = document.createElement("ul");
        while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
          const itemText = lines[i].replace(/^\s*[-*+]\s+/, "");
          const li = document.createElement("li");
          li.innerHTML = formatInlineText(escapeHtml(itemText));
          ul.appendChild(li);
          i += 1;
        }
        container.appendChild(ul);
        continue;
      }

      if (/^\s*\d+\.\s+/.test(line)) {
        const ol = document.createElement("ol");
        while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
          const itemText = lines[i].replace(/^\s*\d+\.\s+/, "");
          const li = document.createElement("li");
          li.innerHTML = formatInlineText(escapeHtml(itemText));
          ol.appendChild(li);
          i += 1;
        }
        container.appendChild(ol);
        continue;
      }

      const paraLines = [];
      while (
        i < lines.length &&
        lines[i].trim() &&
        !/^(#{1,4})\s+/.test(lines[i]) &&
        !/^\s*[-*+]\s+/.test(lines[i]) &&
        !/^\s*\d+\.\s+/.test(lines[i])
      ) {
        paraLines.push(lines[i]);
        i += 1;
      }

      const p = document.createElement("p");
      p.innerHTML = paraLines
        .map((l) => formatInlineText(escapeHtml(l)))
        .join("<br />");
      container.appendChild(p);
    }
  });

  return container;
}

function createAssistantMessageElement(msg, chatId) {
  const row = document.createElement("div");
  row.className = "message-row assistant";

  const wrapper = document.createElement("div");
  wrapper.className = "assistant-message-wrapper";

  wrapper.appendChild(createAvatarElement("message"));

  const bodyCol = document.createElement("div");
  bodyCol.className = "assistant-body-col";

  const card = document.createElement("div");
  card.className = assistant-card ${msg.isError ? "error-card" : ""};
  card.appendChild(renderMarkdownSafe(msg.content));
  bodyCol.appendChild(card);

  if (!msg.isError) {
    const actionBar = document.createElement("div");
    actionBar.className = "message-action-bar";

    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "action-icon-btn";
    copyBtn.innerHTML = <i class="fa-regular fa-copy"></i> <span>Copy</span>;
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(msg.content);
      } catch {
        // Clipboard fallback ignored
      }
      copyBtn.innerHTML = <i class="fa-solid fa-check"></i> <span>Copied</span>;
      copyBtn.classList.add("active");
      setTimeout(() => {
        copyBtn.innerHTML = <i class="fa-regular fa-copy"></i> <span>Copy</span>;
        copyBtn.classList.remove("active");
      }, 1500);
    });

    const timeSpan = document.createElement("span");
    timeSpan.className = "reply-timestamp";
    timeSpan.textContent = msg.timestamp || formatCurrentTime();

    const upBtn = document.createElement("button");
    upBtn.type = "button";
    upBtn.className = action-icon-btn ${msg.feedback === "up" ? "active" : ""};
    upBtn.setAttribute("aria-label", "Thumbs up");
    upBtn.innerHTML = <i class="fa-regular fa-thumbs-up"></i>;

    const downBtn = document.createElement("button");
    downBtn.type = "button";
    downBtn.className = action-icon-btn ${msg.feedback === "down" ? "active" : ""};
    downBtn.setAttribute("aria-label", "Thumbs down");
    downBtn.innerHTML = <i class="fa-regular fa-thumbs-down"></i>;

    const setFeedback = (type) => {
      const targetChat = state.chats.find((c) => c.id === chatId);
      const targetMsg = targetChat?.messages.find((m) => m.id === msg.id);
      if (!targetMsg) return;

      targetMsg.feedback = targetMsg.feedback === type ? null : type;
      saveChatsToStorage();

      upBtn.classList.toggle("active", targetMsg.feedback === "up");
      downBtn.classList.toggle("active", targetMsg.feedback === "down");
    };

    upBtn.addEventListener("click", () => setFeedback("up"));
    downBtn.addEventListener("click", () => setFeedback("down"));

    actionBar.appendChild(copyBtn);
    actionBar.appendChild(timeSpan);
    actionBar.appendChild(upBtn);
    actionBar.appendChild(downBtn);
    bodyCol.appendChild(actionBar);
  }

  wrapper.appendChild(bodyCol);
  row.appendChild(wrapper);
  return row;
}

function createTypingIndicatorElement() {
  const row = document.createElement("div");
  row.id = "typingIndicatorRow";
  row.className = "message-row assistant";

  const wrapper = document.createElement("div");
  wrapper.className = "assistant-message-wrapper";
  wrapper.appendChild(createAvatarElement("message"));

  const bodyCol = document.createElement("div");
  bodyCol.className = "assistant-body-col";

  const card = document.createElement("div");
  card.className = "assistant-card";
  card.innerHTML = `
    <div class="typing-dots" aria-label="AI is typing">
      <span></span>
      <span></span>
      <span></span>
    </div>
  `;

  bodyCol.appendChild(card);
  wrapper.appendChild(bodyCol);
  row.appendChild(wrapper);
  return row;
}

function renderActiveConversation() {
  const chat = getActiveChat();
  els.messagesList.innerHTML = "";

  if (!chat || !chat.messages.length) {
    els.welcomeScreen.style.display = "flex";
    return;
  }

  els.welcomeScreen.style.display = "none";

  chat.messages.forEach((msg) => {
    if (msg.role === "user") {
      const row = document.createElement("div");
      row.className = "message-row user";

      const bubble = document.createElement("div");
      bubble.className = "user-bubble";
      bubble.textContent = msg.content;

      row.appendChild(bubble);
      els.messagesList.appendChild(row);
    } else if (msg.role === "assistant") {
      els.messagesList.appendChild(createAssistantMessageElement(msg, chat.id));
    }
  });

  if (state.isSending) {
    els.messagesList.appendChild(createTypingIndicatorElement());
  }

  scrollToBottom();
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: "smooth",
    });
  });
}

function autoResizeTextarea() {
  const ta = els.messageInput;
  ta.style.height = "auto";
  ta.style.height = ${Math.min(ta.scrollHeight, 180)}px;
  updateSendButtonState();
}

function updateSendButtonState() {
  const hasText = els.messageInput.value.trim().length > 0;
  els.sendBtn.disabled = !hasText || state.isSending;
}

async function sendUserMessage(text) {
  const trimmed = String(text ?? "").trim();
  if (!trimmed || state.isSending) return;

  let chat = getActiveChat();
  if (!chat) {
    chat = {
      id: chat_${Date.now()}_${Math.random().toString(36).slice(2, 7)},
      title: "New chat",
      updatedAt: Date.now(),
      messages: [],
    };
    state.chats.unshift(chat);
    state.activeChatId = chat.id;
  }

  if (chat.messages.length === 0) {
    chat.title = trimmed.length > 36 ? ${trimmed.slice(0, 36)}... : trimmed;
  }

  const userMsg = {
    id: msg_${Date.now()}_u,
    role: "user",
    content: trimmed,
    timestamp: formatCurrentTime(),
  };

  chat.messages.push(userMsg);
  chat.updatedAt = Date.now();

  state.chats = [chat, ...state.chats.filter((c) => c.id !== chat.id)];
  saveChatsToStorage();

  els.messageInput.value = "";
  autoResizeTextarea();

  state.isSending = true;
  updateSendButtonState();
  renderSidebar();
  renderActiveConversation();

  const payloadMessages = chat.messages
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        !m.isError &&
        typeof m.content === "string" &&
        m.content.trim().length > 0
    )
    .slice(-20)
    .map((m) => ({
      role: m.role,
      content: m.content,
    }));

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: payloadMessages }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const errMsg =
        data?.error ||
        Something went wrong (${response.status}). Please try again.;
      chat.messages.push({
        id: msg_${Date.now()}_e,
        role: "assistant",
        content: errMsg,
        isError: true,
        timestamp: formatCurrentTime(),
      });
    } else {
      const replyText =
        typeof data?.reply === "string" && data.reply.trim()
          ? data.reply.trim()
          : "I received your message, but didn't get a text response back.";

      chat.messages.push({
        id: msg_${Date.now()}_a,
        role: "assistant",
        content: replyText,
        feedback: null,
        timestamp: formatCurrentTime(),
      });
    }
  } catch {
    chat.messages.push({
      id: msg_${Date.now()}_n,
      role: "assistant",
      content:
        "Network error: unable to reach the server right now. Please check your connection and try again.",
      isError: true,
      timestamp: formatCurrentTime(),
    });
  } finally {
    state.isSending = false;
    saveChatsToStorage();
    updateSendButtonState();
    renderActiveConversation();
  }
}

function openMobileSidebar() {
  els.sidebar.classList.add("open");
  els.sidebarBackdrop.classList.add("open");
}

function closeMobileSidebar() {
  els.sidebar.classList.remove("open");
  els.sidebarBackdrop.classList.remove("open");
}

function bindEvents() {
  els.openSidebarBtn.addEventListener("click", openMobileSidebar);
  els.closeSidebarBtn.addEventListener("click", closeMobileSidebar);
  els.sidebarBackdrop.addEventListener("click", closeMobileSidebar);
  els.newChatBtn.addEventListener("click", createNewChat);

  els.messageInput.addEventListener("input", autoResizeTextarea);

  els.messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!els.sendBtn.disabled) {
        sendUserMessage(els.messageInput.value);
      }
    }
  });

  els.sendBtn.addEventListener("click", () => {
    sendUserMessage(els.messageInput.value);
  });
}

function init() {
  renderBranding();
  loadChatsFromStorage();
  renderSidebar();
  renderActiveConversation();
  updateSendButtonState();
  bindEvents();
}

init();
