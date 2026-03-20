/* AGENT OS v5 — BRIDGE CLIENT */
'use strict';

const Bridge = {
  baseUrl: localStorage.getItem('bridge_url') || 'http://192.168.122.10:18790',
  token: localStorage.getItem('bridge_token') || '',
  ws: null,
  connected: false,
  reconnectTimer: null,
  listeners: {},
  liveMode: false,

  // ── Config ──────────────────────────────────────────────
  setToken(t) { this.token = t; localStorage.setItem('bridge_token', t); },
  setBaseUrl(u) { this.baseUrl = u.replace(/\/$/, ''); localStorage.setItem('bridge_url', u); },
  isConfigured() { return !!(this.token && this.baseUrl); },

  // ── HTTP ────────────────────────────────────────────────
  async fetch(path, opts = {}) {
    const resp = await fetch(`${this.baseUrl}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...(opts.headers || {}),
      },
    });
    if (!resp.ok) {
      const err = await resp.text().catch(() => '');
      throw new Error(`Bridge ${resp.status}: ${err}`);
    }
    return resp.json();
  },

  // ── Channels ────────────────────────────────────────────
  async getChannels() {
    return this.fetch('/api/channels');
  },

  async getMessages(channelId, limit = 50) {
    return this.fetch(`/api/channels/${channelId}/messages?limit=${limit}`);
  },

  async sendMessage(channelId, text, replyTo = null) {
    const body = { message: text };
    if (replyTo) body.reply_to = replyTo;
    return this.fetch(`/api/channels/${channelId}/messages`, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

  // ── Queue ───────────────────────────────────────────────
  async getQueue() {
    return this.fetch('/api/queue');
  },

  async resolveQueueItem(id, status, resolution = '') {
    return this.fetch(`/api/queue/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify({ status, resolution }),
    });
  },

  async getQueueHistory() {
    return this.fetch('/api/queue/history');
  },

  // ── Feed ────────────────────────────────────────────────
  async getFeed(limit = 50, type = null) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (type) params.set('type', type);
    return this.fetch(`/api/feed?${params}`);
  },

  // ── WebSocket ───────────────────────────────────────────
  connect() {
    if (this.ws) this.disconnect();
    if (!this.isConfigured()) return;

    const wsUrl = this.baseUrl.replace(/^http/, 'ws');
    try {
      this.ws = new WebSocket(wsUrl);
    } catch (e) {
      console.warn('[Bridge] WS connect failed:', e.message);
      this._scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.connected = true;
      this.liveMode = true;
      this._emit('status', { connected: true });
      console.log('[Bridge] WebSocket connected');
    };

    this.ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        this._emit(msg.type, msg);
      } catch {}
    };

    this.ws.onclose = () => {
      this.connected = false;
      this._emit('status', { connected: false });
      this._scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.connected = false;
    };
  },

  disconnect() {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.ws) { this.ws.close(); this.ws = null; }
    this.connected = false;
    this.liveMode = false;
    this._emit('status', { connected: false });
  },

  _scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.connected && this.isConfigured()) this.connect();
    }, 5000);
  },

  // ── Events ──────────────────────────────────────────────
  on(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = new Set();
    this.listeners[event].add(fn);
  },

  off(event, fn) {
    if (this.listeners[event]) this.listeners[event].delete(fn);
  },

  _emit(event, data) {
    if (this.listeners[event]) {
      for (const fn of this.listeners[event]) {
        try { fn(data); } catch (e) { console.error('[Bridge] listener error:', e); }
      }
    }
  },

  // ── Health check ────────────────────────────────────────
  async checkHealth() {
    try {
      const resp = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(3000) });
      return resp.ok;
    } catch {
      return false;
    }
  },
};

// ── Connection UI ─────────────────────────────────────────
function initBridgeUI() {
  // Add status dot to top bar
  const topBar = document.querySelector('.top-bar-left') || document.querySelector('.top-bar');
  if (topBar) {
    const statusEl = document.createElement('div');
    statusEl.id = 'bridge-status';
    statusEl.style.cssText = 'display:inline-flex;align-items:center;gap:6px;margin-left:12px;cursor:pointer;font-size:12px;color:var(--text-muted);';
    statusEl.innerHTML = '<span id="bridge-dot" style="width:8px;height:8px;border-radius:50%;background:#f38ba8;display:inline-block;"></span><span id="bridge-label">Offline</span>';
    statusEl.onclick = showBridgeConfig;
    topBar.appendChild(statusEl);
  }

  // Listen for status changes
  Bridge.on('status', ({ connected }) => {
    const dot = document.getElementById('bridge-dot');
    const label = document.getElementById('bridge-label');
    if (dot) dot.style.background = connected ? '#a6e3a1' : '#f38ba8';
    if (label) label.textContent = connected ? 'Live' : 'Offline';
  });

  // Auto-connect if configured
  if (Bridge.isConfigured()) {
    Bridge.checkHealth().then(ok => {
      if (ok) {
        Bridge.connect();
        loadLiveData();
      }
    });
  }
}

function showBridgeConfig() {
  // Create modal
  const existing = document.getElementById('bridge-config-modal');
  if (existing) { existing.remove(); return; }

  const modal = document.createElement('div');
  modal.id = 'bridge-config-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);';
  modal.innerHTML = `
    <div style="background:var(--bg-secondary,#1a1a24);border:1px solid var(--border,#2a2a3a);border-radius:12px;padding:24px;width:380px;max-width:90vw;">
      <h3 style="margin:0 0 16px;color:var(--accent,#D4A574);">🔗 Bridge Connection</h3>
      <label style="display:block;margin-bottom:8px;color:var(--text-muted,#888);font-size:13px;">Server URL</label>
      <input id="bridge-url-input" type="text" value="${Bridge.baseUrl}" 
        style="width:100%;padding:8px 12px;background:var(--bg-primary,#0f0f12);border:1px solid var(--border,#2a2a3a);border-radius:8px;color:var(--text-primary,#e0e0e0);margin-bottom:12px;box-sizing:border-box;font-size:14px;" />
      <label style="display:block;margin-bottom:8px;color:var(--text-muted,#888);font-size:13px;">Auth Token</label>
      <input id="bridge-token-input" type="password" value="${Bridge.token}" placeholder="Bearer token"
        style="width:100%;padding:8px 12px;background:var(--bg-primary,#0f0f12);border:1px solid var(--border,#2a2a3a);border-radius:8px;color:var(--text-primary,#e0e0e0);margin-bottom:16px;box-sizing:border-box;font-size:14px;" />
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button onclick="document.getElementById('bridge-config-modal').remove()" 
          style="padding:8px 16px;background:var(--bg-tertiary,#252530);border:1px solid var(--border,#2a2a3a);border-radius:8px;color:var(--text-primary,#e0e0e0);cursor:pointer;">Cancel</button>
        <button onclick="saveBridgeConfig()" 
          style="padding:8px 16px;background:var(--accent,#D4A574);border:none;border-radius:8px;color:#0f0f12;cursor:pointer;font-weight:600;">Connect</button>
      </div>
      <div id="bridge-config-status" style="margin-top:12px;font-size:12px;color:var(--text-muted,#888);"></div>
    </div>
  `;
  modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
  document.body.appendChild(modal);
  document.getElementById('bridge-url-input').focus();
}

async function saveBridgeConfig() {
  const url = document.getElementById('bridge-url-input').value.trim();
  const token = document.getElementById('bridge-token-input').value.trim();
  const status = document.getElementById('bridge-config-status');

  if (!url || !token) { status.textContent = '❌ Both fields required'; return; }

  Bridge.setBaseUrl(url);
  Bridge.setToken(token);

  status.textContent = '⏳ Testing connection...';
  const ok = await Bridge.checkHealth();
  if (!ok) {
    status.textContent = '❌ Cannot reach server';
    return;
  }

  // Test auth
  try {
    await Bridge.getChannels();
  } catch (e) {
    status.textContent = '❌ Auth failed: ' + e.message;
    return;
  }

  status.textContent = '✅ Connected!';
  Bridge.connect();
  loadLiveData();
  setTimeout(() => {
    const modal = document.getElementById('bridge-config-modal');
    if (modal) modal.remove();
  }, 800);
}

// ── Live data loading ─────────────────────────────────────

let liveChannels = null;
let liveChannelMap = {}; // id -> name

async function loadLiveData() {
  if (!Bridge.isConfigured()) return;

  try {
    // Load channels
    liveChannels = await Bridge.getChannels();
    liveChannelMap = {};
    liveChannels.forEach(ch => { liveChannelMap[ch.id] = ch.name; });
    console.log(`[Bridge] Loaded ${liveChannels.length} channels`);

    // Replace channel list in Talk view if active
    if (typeof currentView !== 'undefined' && currentView === 'talk') {
      renderLiveChannelList();
    }
  } catch (e) {
    console.error('[Bridge] Failed to load live data:', e);
  }

  // Wire WebSocket events
  Bridge.on('message', (msg) => {
    if (typeof currentView !== 'undefined' && currentView === 'talk') {
      // If we're viewing this channel, append the message
      const channelId = msg.channel;
      if (channelId === currentLiveChannel) {
        appendLiveMessage(msg.data);
      }
    }
  });

  Bridge.on('queue', (msg) => {
    if (typeof currentView !== 'undefined' && currentView === 'queue') {
      refreshLiveQueue();
    }
  });

  Bridge.on('feed', (msg) => {
    if (typeof currentView !== 'undefined' && currentView === 'feed') {
      prependLiveFeedEntry(msg.data);
    }
  });
}

// ── Talk: Live channel list ───────────────────────────────

let currentLiveChannel = null;

function renderLiveChannelList() {
  if (!liveChannels || !Bridge.liveMode) return;

  const container = document.querySelector('.channel-list') || document.getElementById('channel-list');
  if (!container) return;

  // Group channels by category (prefix before -)
  const categorized = {};
  liveChannels.forEach(ch => {
    const name = ch.name.replace(/^[📋🗂️⚖️🎯💬🔬💻🤖📡🔒⚙️📦🧠🔧🍎🛠️🔗🌐]+[-\s]*/, '');
    const emoji = ch.name.match(/^[📋🗂️⚖️🎯💬🔬💻🤖📡🔒⚙️📦🧠🔧🍎🛠️🔗🌐]+/)?.[0] || '💬';
    if (!categorized['Channels']) categorized['Channels'] = [];
    categorized['Channels'].push({ id: ch.id, name: name || ch.name, emoji, fullName: ch.name });
  });

  container.innerHTML = '';
  for (const [cat, channels] of Object.entries(categorized)) {
    channels.forEach(ch => {
      const el = document.createElement('div');
      el.className = 'channel-item' + (ch.id === currentLiveChannel ? ' active' : '');
      el.innerHTML = `<span class="channel-hash">#</span> ${ch.fullName}`;
      el.onclick = () => selectLiveChannel(ch.id);
      container.appendChild(el);
    });
  }
}

async function selectLiveChannel(channelId) {
  if (!Bridge.liveMode) return;
  currentLiveChannel = channelId;

  // Update active state
  document.querySelectorAll('.channel-item').forEach(el => el.classList.remove('active'));
  event?.target?.closest('.channel-item')?.classList.add('active');

  // Update header
  const name = liveChannelMap[channelId] || channelId;
  const headerEl = document.getElementById('current-channel-name');
  if (headerEl) {
    headerEl.textContent = '#' + name;
    headerEl.style.color = '#D4A574';
  }

  // Load messages
  try {
    const messages = await Bridge.getMessages(channelId, 50);
    renderLiveMessages(messages.reverse()); // API returns newest-first, we want oldest-first
  } catch (e) {
    console.error('[Bridge] Failed to load messages:', e);
  }
}

function renderLiveMessages(messages) {
  const container = document.getElementById('messages-list');
  if (!container) return;
  container.innerHTML = '';

  if (!messages.length) {
    container.innerHTML = '<div style="padding:30px;text-align:center;color:var(--text-muted)">No messages in this channel</div>';
    return;
  }

  let lastAuthor = null;
  messages.forEach(msg => {
    const collapsed = msg.author.username === lastAuthor;
    lastAuthor = msg.author.username;
    container.appendChild(makeLiveMessageEl(msg, collapsed));
  });

  const msgContainer = document.getElementById('messages-container');
  if (msgContainer) setTimeout(() => { msgContainer.scrollTop = msgContainer.scrollHeight; }, 50);
}

function makeLiveMessageEl(msg, collapsed = false) {
  const isBot = msg.author.bot;
  const name = msg.author.display_name || msg.author.username;
  const color = isBot ? '#D4A574' : '#89b4fa';
  const emoji = isBot ? '🤖' : '🧑';
  const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const group = document.createElement('div');
  group.className = `msg-group${collapsed ? ' collapsed' : ''}`;
  group.id = `msg-${msg.id}`;

  // Format content
  let text = msg.content || '';
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => `<pre><code>${code.replace(/</g,'&lt;')}</code></pre>`);
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  text = text.replace(/\n/g, '<br>');

  // Reply reference
  let replyHTML = '';
  if (msg.referenced_message) {
    replyHTML = `<div class="msg-reply-ref"><span>↩</span><span class="reply-author">${msg.referenced_message.author || '?'}</span><span>${(msg.referenced_message.content || '').substring(0, 60)}</span></div>`;
  }

  // Reactions
  let reactHTML = '';
  if (msg.reactions?.length) {
    reactHTML = `<div class="msg-reactions">${msg.reactions.map(r => `<span class="reaction">${r.emoji} ${r.count}</span>`).join('')}</div>`;
  }

  // Attachments
  let attachHTML = '';
  if (msg.attachments?.length) {
    attachHTML = msg.attachments.map(a => {
      if (a.content_type?.startsWith('image/')) {
        return `<img src="${a.url}" style="max-width:300px;max-height:200px;border-radius:8px;margin-top:4px;" />`;
      }
      return `<a href="${a.url}" target="_blank" style="color:var(--accent)">${a.filename || 'attachment'}</a>`;
    }).join('<br>');
  }

  const avatarSection = `<div class="msg-avatar" style="background:${color}20;border-color:${color}">${emoji}</div>`;
  const headerSection = !collapsed ? `<div class="msg-header"><span class="msg-author" style="color:${color}">${name}</span><span class="msg-timestamp">${time}</span></div>` : '';

  group.innerHTML = `
    ${avatarSection}
    <div class="msg-body">
      ${headerSection}
      ${replyHTML}
      <div class="msg-text">${collapsed ? `<span class="msg-timestamp-hover">${time}</span>` : ''}${text}</div>
      ${attachHTML}
      ${reactHTML}
      <div class="msg-actions-bar">
        <button class="msg-action-mini" onclick="replyToLiveMessage('${msg.id}')">↩ Reply</button>
      </div>
    </div>
  `;
  return group;
}

function appendLiveMessage(msg) {
  const container = document.getElementById('messages-list');
  if (!container) return;
  container.appendChild(makeLiveMessageEl(msg, false));
  const msgContainer = document.getElementById('messages-container');
  if (msgContainer) setTimeout(() => { msgContainer.scrollTop = msgContainer.scrollHeight; }, 50);
}

// ── Talk: Live send ───────────────────────────────────────

let liveReplyTo = null;

function replyToLiveMessage(msgId) {
  liveReplyTo = msgId;
  const input = document.getElementById('message-input');
  if (input) input.focus();
}

async function sendLiveMessage() {
  if (!Bridge.liveMode || !currentLiveChannel) return false;

  const input = document.getElementById('message-input');
  const text = input?.value?.trim();
  if (!text) return false;

  try {
    await Bridge.sendMessage(currentLiveChannel, text, liveReplyTo);
    input.value = '';
    liveReplyTo = null;

    // Refresh messages (WS will also push, but refresh ensures order)
    const messages = await Bridge.getMessages(currentLiveChannel, 50);
    renderLiveMessages(messages.reverse());
    return true;
  } catch (e) {
    console.error('[Bridge] Send failed:', e);
    if (typeof toast === 'function') toast('Failed to send: ' + e.message, 'error');
    return false;
  }
}

// ── Queue: Live ───────────────────────────────────────────

async function refreshLiveQueue() {
  if (!Bridge.liveMode) return;
  try {
    const items = await Bridge.getQueue();
    renderLiveQueueItems(items);
  } catch (e) {
    console.error('[Bridge] Queue refresh failed:', e);
  }
}

function renderLiveQueueItems(items) {
  const container = document.getElementById('queue-cards') || document.querySelector('.queue-list');
  if (!container) return;

  if (!items.length) {
    container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);">Queue empty — all caught up ✅</div>';
    return;
  }

  container.innerHTML = items.map(item => {
    const priorityColor = { P0: '#f38ba8', P1: '#fab387', P2: '#f9e2af', P3: '#a6e3a1', P4: '#89b4fa' }[item.priority] || '#888';
    const typeEmoji = { binary: '⚡', choice: '📋', review: '📝', approval: '✅', info: 'ℹ️' }[item.type] || '❓';
    return `
      <div class="queue-card" style="border-left:3px solid ${priorityColor};">
        <div class="queue-card-header">
          <span class="queue-priority" style="color:${priorityColor}">${item.priority || '?'}</span>
          <span>${typeEmoji} ${item.title || item.description || 'Untitled'}</span>
        </div>
        <div class="queue-card-context" style="color:var(--text-muted);font-size:13px;margin:8px 0;">${item.context || item.description || ''}</div>
        <div class="queue-card-meta" style="font-size:12px;color:var(--text-muted);">From: ${item.source_agent || '?'} · ${item.created_at ? new Date(item.created_at).toLocaleTimeString() : ''}</div>
        <div class="queue-card-actions" style="margin-top:8px;display:flex;gap:6px;">
          <button class="btn-queue-action" onclick="resolveLiveQueue('${item.id}','approved')" style="background:#a6e3a1;color:#0f0f12;border:none;padding:4px 12px;border-radius:6px;cursor:pointer;font-size:12px;">✅ Approve</button>
          <button class="btn-queue-action" onclick="resolveLiveQueue('${item.id}','rejected')" style="background:#f38ba8;color:#0f0f12;border:none;padding:4px 12px;border-radius:6px;cursor:pointer;font-size:12px;">❌ Reject</button>
          <button class="btn-queue-action" onclick="resolveLiveQueue('${item.id}','deferred')" style="background:#89b4fa;color:#0f0f12;border:none;padding:4px 12px;border-radius:6px;cursor:pointer;font-size:12px;">⏸ Defer</button>
        </div>
      </div>
    `;
  }).join('');
}

async function resolveLiveQueue(id, status) {
  try {
    await Bridge.resolveQueueItem(id, status);
    if (typeof toast === 'function') toast(`Queue item ${status}`, 'success');
    refreshLiveQueue();
  } catch (e) {
    if (typeof toast === 'function') toast('Failed: ' + e.message, 'error');
  }
}

// ── Feed: Live ────────────────────────────────────────────

async function refreshLiveFeed() {
  if (!Bridge.liveMode) return;
  try {
    const entries = await Bridge.getFeed(50);
    renderLiveFeedEntries(entries);
  } catch (e) {
    console.error('[Bridge] Feed refresh failed:', e);
  }
}

function renderLiveFeedEntries(entries) {
  const container = document.getElementById('feed-list') || document.querySelector('.feed-container');
  if (!container) return;

  if (!entries.length) {
    container.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);">No feed entries yet</div>';
    return;
  }

  const typeEmoji = {
    task_started: '🚀', task_completed: '✅', error: '🔴', insight: '💡',
    vault_write: '📝', file_changed: '📁', question_asked: '❓',
    queue_new: '📋', queue_resolved: '✔️', system: '📌',
  };

  const agentColors = {
    righthand: '#f9e2af', researcher: '#89b4fa', coder: '#a6e3a1',
    ops: '#fab387', utility: '#cba6f7', devil: '#f38ba8',
  };

  container.innerHTML = entries.map(entry => {
    const emoji = typeEmoji[entry.type] || '📌';
    const color = agentColors[entry.agent] || '#D4A574';
    const time = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const urgentBadge = entry.urgent ? '<span style="background:#f38ba8;color:#0f0f12;padding:1px 6px;border-radius:4px;font-size:10px;margin-left:6px;">URGENT</span>' : '';

    return `
      <div class="feed-event${entry.pinned ? ' pinned' : ''}" style="border-left:3px solid ${color};">
        <div class="feed-event-header" style="display:flex;align-items:center;gap:8px;">
          <span>${emoji}</span>
          <span style="color:${color};font-weight:600;">${entry.agent}</span>
          <span style="color:var(--text-muted);font-size:12px;">${time}</span>
          ${urgentBadge}
        </div>
        <div class="feed-event-content" style="margin-top:4px;color:var(--text-secondary,#ccc);">${entry.content}</div>
      </div>
    `;
  }).join('');
}

function prependLiveFeedEntry(entry) {
  const container = document.getElementById('feed-list') || document.querySelector('.feed-container');
  if (!container) return;
  // Just refresh the whole feed for simplicity
  refreshLiveFeed();
}

// ── Hook into existing app ────────────────────────────────

// Override sendMessage if Bridge is live
const _originalSendMessage = typeof sendMessage === 'function' ? sendMessage : null;

function hookSendMessage() {
  if (typeof window.sendMessage !== 'function') return;
  const original = window.sendMessage;
  window.sendMessage = function() {
    if (Bridge.liveMode && currentLiveChannel) {
      sendLiveMessage();
    } else {
      original.call(this);
    }
  };
}

// Hook into view changes to load live data
function hookViewChanges() {
  if (typeof window.switchView !== 'function') return;
  const original = window.switchView;
  window.switchView = function(view) {
    original.call(this, view);
    if (!Bridge.liveMode) return;
    if (view === 'talk' || view === 'feed') {
      setTimeout(() => {
        if (view === 'talk') renderLiveChannelList();
        if (view === 'feed') refreshLiveFeed();
      }, 100);
    }
  };
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    initBridgeUI();
    hookSendMessage();
    hookViewChanges();
  }, 500); // Let the main app init first
});
