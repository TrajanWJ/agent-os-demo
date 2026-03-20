/* AGENT OS v5 — BRIDGE CLIENT — Progressive live data layer */
'use strict';

const Bridge = {
  baseUrl: localStorage.getItem('bridge_url') || (location.pathname.startsWith('/app') ? location.origin : ''),
  token: localStorage.getItem('bridge_token') || '',
  ws: null,
  connected: false,
  reconnectTimer: null,
  listeners: {},
  liveMode: false,

  // ── Config ──────────────────────────────────────────────
  setToken(t) { this.token = t; localStorage.setItem('bridge_token', t); },
  setBaseUrl(u) { this.baseUrl = u.replace(/\/$/, ''); localStorage.setItem('bridge_url', u); },
  isConfigured() { return !!(this.baseUrl && (this.token || this.baseUrl === location.origin)); },

  // ── HTTP ────────────────────────────────────────────────
  async apiFetch(path, opts = {}) {
    const resp = await fetch(`${this.baseUrl}${path}`, {
      ...opts,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
        ...(opts.headers || {}),
      },
    });
    if (!resp.ok) throw new Error(`Bridge ${resp.status}`);
    return resp.json();
  },

  // ── Plans ───────────────────────────────────────────────
  async getPlans() { return this.apiFetch('/api/plans'); },
  async getPlan(id) { return this.apiFetch(`/api/plans/${id}`); },
  async createPlan(data) { return this.apiFetch('/api/plans', { method:'POST', body:JSON.stringify(data) }); },
  async updateTask(planId, taskId, data) { return this.apiFetch(`/api/plans/${planId}/tasks/${taskId}`, { method:'PUT', body:JSON.stringify(data) }); },
  async createTask(planId, data) { return this.apiFetch(`/api/plans/${planId}/tasks`, { method:'POST', body:JSON.stringify(data) }); },
  async deleteTask(planId, taskId) { return this.apiFetch(`/api/plans/${planId}/tasks/${taskId}`, { method:'DELETE' }); },

  // ── Channels ────────────────────────────────────────────
  async getChannels()              { return this.apiFetch('/api/channels'); },
  async getMessages(chId, limit=50){ return this.apiFetch(`/api/channels/${chId}/messages?limit=${limit}`); },
  async sendMessage(chId, text, replyTo=null) {
    const body = { message: text };
    if (replyTo) body.reply_to = replyTo;
    return this.apiFetch(`/api/channels/${chId}/messages`, { method:'POST', body:JSON.stringify(body) });
  },

  // ── Queue ───────────────────────────────────────────────
  async getQueue()           { return this.apiFetch('/api/queue'); },
  async getProposals(status='pending') { return this.apiFetch(`/api/proposals?status=${status}`); },
  async resolveProposal(id, action, option) { return this.apiFetch(`/api/proposals/${id}/resolve`, { method:'POST', body:JSON.stringify({action, option}) }); },
  async resolveQueueItem(id, status, resolution='') {
    return this.apiFetch(`/api/queue/${id}/resolve`, { method:'POST', body:JSON.stringify({status,resolution}) });
  },

  // ── Vault ────────────────────────────────────────────────
  async vaultSearch(q, limit=10) { return this.apiFetch(`/api/vault/search?q=${encodeURIComponent(q)}&limit=${limit}`); },
  async vaultNote(path) { return this.apiFetch(`/api/vault/note?path=${encodeURIComponent(path)}`); },
  async vaultRecent(limit=20) { return this.apiFetch(`/api/vault/recent?limit=${limit}`); },
  async vaultStats() { return this.apiFetch('/api/vault/stats'); },
  async vaultGraph(limit=100) { return this.apiFetch(`/api/vault/graph?limit=${limit}`); },

  // ── System ───────────────────────────────────────────────
  async getSystemOverview() { return this.apiFetch('/api/system/overview'); },
  async getSystemAgents() { return this.apiFetch('/api/system/agents'); },
  async getSystemCrons() { return this.apiFetch('/api/system/crons'); },
  async getSystemServices() { return this.apiFetch('/api/system/services'); },
  async getSystemLogs(service, lines=50) { return this.apiFetch(`/api/system/logs?service=${encodeURIComponent(service)}&lines=${lines}`); },
  async getSystemProcesses() { return this.apiFetch('/api/system/processes'); },

  // ── Feed ────────────────────────────────────────────────
  async getFeed(limit=50) { return this.apiFetch(`/api/feed?limit=${limit}`); },

  // ── Missions ────────────────────────────────────────────
  async getMissionsGoals()        { return this.apiFetch('/api/missions/goals'); },
  async getMissionsGoalsArchive() { return this.apiFetch('/api/missions/goals/archive'); },
  async getMissionsQueue()        { return this.apiFetch('/api/missions/queue'); },
  async getMissionsDone(limit=20) { return this.apiFetch(`/api/missions/done?limit=${limit}`); },
  async getMissionsFailed()       { return this.apiFetch('/api/missions/failed'); },
  async getMissionsSchedule()     { return this.apiFetch('/api/missions/schedule'); },
  async getMissionsFeed(limit=50) { return this.apiFetch(`/api/missions/feed?limit=${limit}`); },
  async getMissionsStats()        { return this.apiFetch('/api/missions/stats'); },

  // ── WebSocket ───────────────────────────────────────────
  connect() {
    if (this.ws) this.disconnect();
    if (!this.isConfigured()) return;
    const wsUrl = this.baseUrl.replace(/^http/, 'ws');
    try { this.ws = new WebSocket(wsUrl); } catch { this._scheduleReconnect(); return; }
    this.ws.onopen = () => { this.connected = true; this.liveMode = true; this._emit('status', {connected:true}); };
    this.ws.onmessage = (e) => { try { const m = JSON.parse(e.data); this._emit(m.type, m); } catch {} };
    this.ws.onclose = () => { this.connected = false; this._emit('status', {connected:false}); this._scheduleReconnect(); };
    this.ws.onerror = () => {};
  },
  disconnect() {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.ws) { this.ws.close(); this.ws = null; }
    this.connected = false; this.liveMode = false;
    this._emit('status', {connected:false});
  },
  _scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => { this.reconnectTimer = null; if (this.isConfigured()) this.connect(); }, 5000);
  },

  // ── Events ──────────────────────────────────────────────
  on(ev, fn) { if (!this.listeners[ev]) this.listeners[ev] = new Set(); this.listeners[ev].add(fn); },
  off(ev, fn) { if (this.listeners[ev]) this.listeners[ev].delete(fn); },
  _emit(ev, data) { if (this.listeners[ev]) for (const fn of this.listeners[ev]) try { fn(data); } catch {} },

  // ── Health ──────────────────────────────────────────────
  async checkHealth() {
    try { const r = await fetch(`${this.baseUrl}/health`, {signal: AbortSignal.timeout(3000)}); return r.ok; } catch { return false; }
  },
};

// ═══════════════════════════════════════════════════════════
// BRIDGE UI — Status indicator + config modal
// ═══════════════════════════════════════════════════════════

function initBridgeUI() {
  // Status dot in top bar
  const topBar = document.querySelector('.top-bar-right') || document.querySelector('.top-bar-left') || document.querySelector('.top-bar');
  if (topBar) {
    const el = document.createElement('div');
    el.id = 'bridge-status';
    el.style.cssText = 'display:inline-flex;align-items:center;gap:6px;margin-left:12px;cursor:pointer;font-size:12px;color:var(--text-muted);padding:4px 10px;border-radius:6px;background:var(--bg-tertiary,#1a1a24);';
    el.innerHTML = '<span id="bridge-dot" style="width:8px;height:8px;border-radius:50%;background:#f38ba8;display:inline-block;transition:background .3s;"></span><span id="bridge-label">Offline</span>';
    el.onclick = showBridgeConfig;
    topBar.prepend(el);
  }

  Bridge.on('status', ({connected}) => {
    const dot = document.getElementById('bridge-dot');
    const lbl = document.getElementById('bridge-label');
    if (dot) dot.style.background = connected ? '#a6e3a1' : '#f38ba8';
    if (lbl) lbl.textContent = connected ? 'Live' : 'Offline';
  });

  // Auto-detect same-origin: if served from /app and no token saved, try fetching config
  if (!Bridge.token && location.pathname.startsWith('/app')) {
    // Prompt user to enter token via the config modal on first load
    const dot = document.getElementById('bridge-dot');
    const lbl = document.getElementById('bridge-label');
    if (dot) dot.style.background = '#f9e2af';
    if (lbl) lbl.textContent = 'Setup needed';
  }

  // Auto-connect
  if (Bridge.isConfigured()) {
    const lbl = document.getElementById('bridge-label');
    if (lbl) lbl.textContent = 'Connecting...';
    const dot = document.getElementById('bridge-dot');
    if (dot) dot.style.background = '#f9e2af';
    Bridge.checkHealth().then(ok => {
      if (ok) { Bridge.connect(); bridgeGoLive(); }
      else { if (lbl) lbl.textContent = 'Offline'; if (dot) dot.style.background = '#f38ba8'; }
    });
  }
}

function showBridgeConfig() {
  const existing = document.getElementById('bridge-modal');
  if (existing) { existing.remove(); return; }
  const m = document.createElement('div');
  m.id = 'bridge-modal';
  m.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.7);';
  m.innerHTML = `
    <div style="background:var(--bg-secondary,#1a1a24);border:1px solid var(--border,#2a2a3a);border-radius:12px;padding:24px;width:380px;max-width:90vw;">
      <h3 style="margin:0 0 16px;color:var(--accent,#D4A574);">🔗 Bridge Connection</h3>
      <label style="display:block;margin-bottom:6px;color:var(--text-muted);font-size:13px;">Server URL</label>
      <input id="br-url" type="text" value="${Bridge.baseUrl}" placeholder="http://192.168.122.10:18790"
        style="width:100%;padding:8px 12px;background:var(--bg-primary,#0f0f12);border:1px solid var(--border,#2a2a3a);border-radius:8px;color:var(--text-primary);margin-bottom:12px;box-sizing:border-box;font-size:14px;" />
      <label style="display:block;margin-bottom:6px;color:var(--text-muted);font-size:13px;">Auth Token</label>
      <input id="br-tok" type="password" value="${Bridge.token}" placeholder="Bearer token"
        style="width:100%;padding:8px 12px;background:var(--bg-primary,#0f0f12);border:1px solid var(--border,#2a2a3a);border-radius:8px;color:var(--text-primary);margin-bottom:16px;box-sizing:border-box;font-size:14px;" />
      <div style="display:flex;gap:8px;justify-content:flex-end;">
        <button onclick="document.getElementById('bridge-modal').remove()" style="padding:8px 16px;background:var(--bg-tertiary);border:1px solid var(--border);border-radius:8px;color:var(--text-primary);cursor:pointer;">Cancel</button>
        ${Bridge.liveMode ? '<button onclick="bridgeDisconnect()" style="padding:8px 16px;background:#f38ba8;border:none;border-radius:8px;color:#0f0f12;cursor:pointer;font-weight:600;">Disconnect</button>' : ''}
        <button onclick="bridgeSaveConfig()" style="padding:8px 16px;background:var(--accent,#D4A574);border:none;border-radius:8px;color:#0f0f12;cursor:pointer;font-weight:600;">Connect</button>
      </div>
      <div id="br-status" style="margin-top:12px;font-size:12px;color:var(--text-muted);"></div>
    </div>
  `;
  m.onclick = (e) => { if (e.target === m) m.remove(); };
  document.body.appendChild(m);
}

async function bridgeSaveConfig() {
  const url = document.getElementById('br-url').value.trim();
  const tok = document.getElementById('br-tok').value.trim();
  const st = document.getElementById('br-status');
  if (!url || !tok) { st.textContent = '❌ Both fields required'; return; }
  Bridge.setBaseUrl(url);
  Bridge.setToken(tok);
  st.textContent = '⏳ Testing...';
  if (!await Bridge.checkHealth()) { st.textContent = '❌ Cannot reach server'; return; }
  try { await Bridge.getChannels(); } catch (e) { st.textContent = '❌ Auth failed'; return; }
  st.textContent = '✅ Connected!';
  Bridge.connect();
  bridgeGoLive();
  setTimeout(() => { const m = document.getElementById('bridge-modal'); if (m) m.remove(); }, 600);
}

function bridgeDisconnect() {
  Bridge.disconnect();
  document.getElementById('bridge-modal')?.remove();
  toast('Bridge disconnected — using demo data', 'info');
  // Re-render with mock data
  if (currentPage === 'feed') renderFeed();
  if (currentPage === 'talk') { renderChannelList(); renderMessages(currentChannel); }
  if (currentPage === 'queue') renderQueue();
}

// ═══════════════════════════════════════════════════════════
// GO LIVE — Replace mock data with real data
// ═══════════════════════════════════════════════════════════

let _liveChannelData = null; // Cached categorized channels
let _liveChannelIdMap = {};  // id -> {name, topic}

async function bridgeGoLive() {
  if (!Bridge.isConfigured()) return;
  console.log('[Bridge] Going live...');

  // 1) Load channels & replace DC_CHANNELS
  try {
    _liveChannelData = await Bridge.getChannels();
    _liveChannelIdMap = {};
    
    // Build DC_CHANNELS replacement
    if (_liveChannelData.categories) {
      DC_CHANNELS.categories = _liveChannelData.categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        channels: cat.channels.map(ch => {
          _liveChannelIdMap[ch.id] = { name: ch.name, topic: ch.topic };
          return {
            id: ch.id,
            name: ch.name,
            unread: ch.unread || 0,
            type: ch.type || 'text',
            topic: ch.topic || '',
            count: ch.type === 'forum' ? 0 : undefined,
          };
        }),
      }));
      
      // Also rebuild flat list
      DC_CHANNELS.text = _liveChannelData.flat?.map(ch => ({
        id: ch.id,
        name: ch.name,
        unread: 0,
        topic: ch.topic || '',
      })) || [];
    }
    
    console.log(`[Bridge] Loaded ${Object.keys(_liveChannelIdMap).length} channels`);
  } catch (e) {
    console.error('[Bridge] Channel load failed:', e);
  }

  // 2) Load feed
  try {
    const liveFeed = await Bridge.getFeed(50);
    if (liveFeed.length > 0) {
      // Convert bridge feed format to app feedEvents format
      const converted = liveFeed.map(entry => ({
        id: entry.id,
        agent: entry.agent || 'righthand',
        type: entry.type || 'system',
        time: new Date(entry.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
        content: entry.content || '',
        pinned: entry.pinned || false,
        urgent: entry.urgent || false,
      }));
      // Merge: live entries first, then mock data
      feedEvents = [...converted, ...FEED_EVENTS];
    }
  } catch (e) {
    console.error('[Bridge] Feed load failed:', e);
  }

  // 3) Load proposals (replaces old queue)
  try {
    await loadLiveProposals();
  } catch (e) {
    console.error('[Bridge] Proposals load failed:', e);
  }

  // 4) Re-render current view
  if (currentPage === 'feed') {
    if (typeof renderDashboard === 'function') renderDashboard();
    else renderFeed();
  }
  if (currentPage === 'talk') {
    renderChannelList();
    // Switch to first real channel if current is a fake ID
    if (currentChannel && !/^\d+$/.test(currentChannel) && _liveChannelData?.categories?.length) {
      const firstCh = _liveChannelData.categories[0]?.channels?.[0];
      if (firstCh) {
        currentChannel = firstCh.id;
        renderChannelList(); // Re-render with active highlight
        loadLiveMessages(firstCh.id);
      }
    }
  }
  if (currentPage === 'queue') renderQueue();

  // 5) Wire WebSocket events
  Bridge.on('message', (msg) => {
    // Skip our own messages (sent via bridgeSendMessage → POST → WS broadcast)
    if (msg.source === 'self') return;
    // Skip if we already have this message (dedup with optimistic sends)
    const existing = document.querySelector(`[data-msg-id="${msg.data?.id}"]`);
    if (existing) return;
    
    if (currentPage === 'talk' && msg.channel === currentChannel) {
      // Append to current messages
      const converted = bridgeMsgToLocal(msg.data);
      const container = document.getElementById('messages-list');
      if (container && typeof makeMessageGroup === 'function') {
        const el = makeMessageGroup(converted, false, currentChannel);
        // Add a subtle highlight for new messages
        el.style.animation = 'fadeIn 0.3s ease';
        container.appendChild(el);
        const mc = document.getElementById('messages-container');
        if (mc) setTimeout(() => { mc.scrollTop = mc.scrollHeight; }, 50);
      }
    } else if (msg.channel && msg.channel !== currentChannel) {
      // Update unread count for other channels
      const chItem = document.querySelector(`.channel-item[data-chid="${msg.channel}"]`);
      if (chItem && !chItem.classList.contains('active')) {
        chItem.classList.add('has-unread');
        let badge = chItem.querySelector('.channel-unread');
        if (!badge) {
          badge = document.createElement('span');
          badge.className = 'channel-unread';
          badge.textContent = '1';
          chItem.appendChild(badge);
        } else {
          badge.textContent = String(Math.min(99, parseInt(badge.textContent || '0') + 1));
        }
      }
    }
  });

  Bridge.on('feed', (msg) => {
    if (msg.data) {
      const entry = {
        id: msg.data.id || 'live-' + Date.now(),
        agent: msg.data.agent || 'righthand',
        type: msg.data.type || 'system',
        time: new Date(msg.data.timestamp || Date.now()).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
        content: msg.data.content || '',
        pinned: false,
        urgent: msg.data.urgent || false,
      };
      if (typeof prependFeedCard === 'function') prependFeedCard(entry);
    }
  });

  Bridge.on('queue', (msg) => {
    if (currentPage === 'queue') loadLiveProposals();
  });

  Bridge.on('proposal', (msg) => {
    loadLiveProposals(); // Refresh on any proposal change
  });

  startProposalRefresh();
  toast('🔗 Bridge connected — live data loaded', 'success');
}

// ═══════════════════════════════════════════════════════════
// HOOK: Talk view — Load real messages when channel is selected
// ═══════════════════════════════════════════════════════════

// switchChannel hook is now in app.js directly (calls loadLiveMessages when Bridge.liveMode)

async function loadLiveMessages(channelId) {
  const container = document.getElementById('messages-list');
  if (!container) return;
  
  // Subscribe to this channel for real-time polling on the server
  if (Bridge.ws && Bridge.ws.readyState === 1) {
    Bridge.ws.send(JSON.stringify({ type: 'subscribe', channel: channelId }));
  }
  
  // Show loading
  container.innerHTML = '<div style="padding:30px;text-align:center;color:var(--text-muted);">Loading messages...</div>';
  
  try {
    const messages = await Bridge.getMessages(channelId, 50);
    const reversed = messages.reverse(); // API returns newest-first
    
    container.innerHTML = '';
    if (!reversed.length) {
      container.innerHTML = '<div style="padding:30px;text-align:center;color:var(--text-muted)">No messages in this channel</div>';
      return;
    }
    
    let lastAuthor = null;
    reversed.forEach(msg => {
      const local = bridgeMsgToLocal(msg);
      const collapsed = local.agent === lastAuthor;
      lastAuthor = local.agent;
      container.appendChild(makeMessageGroup(local, collapsed, channelId));
    });
    
    const mc = document.getElementById('messages-container');
    if (mc) setTimeout(() => { mc.scrollTop = mc.scrollHeight; }, 50);
  } catch (e) {
    container.innerHTML = `<div style="padding:30px;text-align:center;color:#f38ba8;">Failed to load: ${e.message}</div>`;
  }
}

// Convert Discord API message to local format expected by makeMessageGroup
function bridgeMsgToLocal(msg) {
  const isBot = msg.author?.bot || false;
  const authorName = msg.author?.display_name || msg.author?.username || 'Unknown';
  
  // Try to match to an agent
  let agentId = null;
  if (isBot) {
    // Map bot display names to agent IDs
    const nameLower = authorName.toLowerCase();
    if (nameLower.includes('right hand') || nameLower.includes('traclaw') || nameLower.includes('traclaw1')) agentId = 'righthand';
    else if (nameLower.includes('research')) agentId = 'researcher';
    else if (nameLower.includes('coder')) agentId = 'coder';
    else if (nameLower.includes('ops')) agentId = 'ops';
    else if (nameLower.includes('devil')) agentId = 'devil';
    else if (nameLower.includes('vault')) agentId = 'vault';
  }
  
  return {
    id: msg.id,
    agent: agentId || (isBot ? 'righthand' : 'user'),
    text: msg.content || '',
    time: new Date(msg.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
    ts: new Date(msg.timestamp).getTime() / 1000,
    reactions: (msg.reactions || []).map(r => ({ e: r.emoji, n: r.count || 1 })),
    replyTo: msg.referenced_message?.id || null,
    embed: msg.embeds?.[0] ? {
      title: msg.embeds[0].title || '',
      desc: msg.embeds[0].description || '',
      color: msg.embeds[0].color ? `#${msg.embeds[0].color.toString(16).padStart(6,'0')}` : '#D4A574',
    } : null,
    attachments: msg.attachments || [],
    // Extra metadata for display
    _authorName: authorName,
    _authorAvatar: msg.author?.avatar ? `https://cdn.discordapp.com/avatars/${msg.author.id}/${msg.author.avatar}.png?size=40` : null,
    _isBot: isBot,
  };
}

// ═══════════════════════════════════════════════════════════
// HOOK: Send message — Use bridge when live
// ═══════════════════════════════════════════════════════════

// (switchChannel hook removed — now native in app.js)

const _origSendMessage = typeof sendMessage === 'function' ? sendMessage : null;

if (typeof window !== 'undefined' && typeof window.sendMessage === 'function') {
  const _realSendMessage = window.sendMessage;
  window.sendMessage = function() {
    if (Bridge.liveMode) {
      // Resolve channel name to ID if needed
      if (!/^\d+$/.test(currentChannel) && _liveChannelData?.flat) {
        const match = _liveChannelData.flat.find(c => c.name === currentChannel || c.name.includes(currentChannel));
        if (match) currentChannel = match.id;
      }
      if (/^\d+$/.test(currentChannel)) {
        bridgeSendMessage();
        return;
      }
    }
    _realSendMessage.call(this);
  };
}

async function bridgeSendMessage() {
  const input = document.getElementById('message-input');
  const text = input?.value?.trim();
  if (!text || !currentChannel) return;
  
  input.value = '';
  
  // Optimistic: show message immediately with pending state
  const tempId = 'pending-' + Date.now();
  const optimistic = {
    id: tempId,
    agent: 'user',
    text: text,
    time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
    ts: Date.now() / 1000,
    reactions: [],
    replyTo: (typeof replyingTo !== 'undefined' && replyingTo?.id) || null,
    embed: null,
    attachments: [],
    _authorName: 'You',
    _authorAvatar: null,
    _isBot: false,
    _pending: true,
  };
  
  const container = document.getElementById('messages-list');
  if (container && typeof makeMessageGroup === 'function') {
    container.appendChild(makeMessageGroup(optimistic, false, currentChannel));
    const mc = document.getElementById('messages-container');
    if (mc) mc.scrollTop = mc.scrollHeight;
  }
  
  try {
    const replyId = (typeof replyingTo !== 'undefined' && replyingTo?.id) || null;
    const result = await Bridge.sendMessage(currentChannel, text, replyId);
    // Clear reply state after successful send
    if (typeof replyingTo !== 'undefined') replyingTo = null;
    const replyBar = document.getElementById('reply-bar');
    if (replyBar) replyBar.style.display = 'none';
    // Update the optimistic element with the real Discord message ID
    const pendingEl = container?.querySelector(`[data-msg-id="${tempId}"]`);
    if (pendingEl) {
      pendingEl.setAttribute('data-msg-id', result.id);
      pendingEl.id = `msg-${result.id}`;
    }
  } catch (e) {
    // Remove optimistic message and show error
    const pendingEl = container?.querySelector(`[data-msg-id="${tempId}"]`);
    if (pendingEl) {
      pendingEl.style.opacity = '0.5';
      pendingEl.title = 'Send failed: ' + e.message;
    }
    toast('Send failed: ' + e.message, 'error');
  }
}

// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// Proposals: Load, render, auto-refresh, resolve
// ═══════════════════════════════════════════════════════════

let _proposalRefreshTimer = null;

async function loadLiveProposals() {
  if (!Bridge.liveMode) return;
  try {
    const proposals = await Bridge.getProposals('all');
    // Convert to queueCards format — show all, with status indicator
    const converted = proposals.map(p => ({
      id: p.id,
      agent: p.source || 'righthand',
      type: p.type === 'research' ? 'choice' : p.type === 'dispatch' ? 'approval' : 'freetext',
      priority: (p.priority || 'P3').toLowerCase().replace('p','') <= 2 ? 'urgent' : 'normal',
      ttl: 86400, // 24h
      elapsed: Math.floor((Date.now() - new Date(p.created_at).getTime()) / 1000),
      remaining: Math.max(0, 86400 - Math.floor((Date.now() - new Date(p.created_at).getTime()) / 1000)),
      question: p.title || '',
      context: p.body || '',
      options: p.options ? Object.values(p.options).map(o => typeof o === 'string' ? o : o.label || String(o)) : null,
      _proposalId: p.id,
      _priority: p.priority || 'P3',
      _source: p.source || 'unknown',
      _type: p.type || 'idea',
      _status: p.status || 'pending',
      _createdAt: p.created_at,
      _triageVerdict: p.triage_verdict || null,
      _triageReason: p.triage_reason || null,
    }));
    
    // Replace queueCards entirely with live proposals
    if (typeof queueCards !== 'undefined') {
      queueCards = converted;
    }
    
    if (currentPage === 'queue' && typeof renderQueue === 'function') {
      renderQueue();
    }
    
    // Update badge count
    const badge = document.getElementById('queue-badge');
    if (badge) {
      badge.textContent = String(converted.length);
      badge.style.display = converted.length > 0 ? '' : 'none';
    }
    
    // Update flow visualization
    updateProposalFlow(proposals);
    
    console.log(`[Bridge] Loaded ${converted.length} proposals`);
  } catch (e) {
    console.error('[Bridge] Proposals load failed:', e);
  }
}

function updateProposalFlow(proposals) {
  const el = (id) => document.getElementById(id);
  const total = proposals.length;
  const auto = proposals.filter(p => p.triage_verdict === 'auto-execute').length;
  const escalate = proposals.filter(p => p.triage_verdict === 'escalate').length;
  const dismissed = proposals.filter(p => p.triage_verdict === 'dismissed' || p.status === 'dismissed').length;
  if (el('flow-created')) el('flow-created').textContent = total;
  if (el('flow-auto')) el('flow-auto').textContent = auto + ' safe';
  if (el('flow-escalate')) el('flow-escalate').textContent = escalate + ' risky';
  if (el('flow-dismiss')) el('flow-dismiss').textContent = dismissed;
}

// Also update flow from seed data on page load
function updateFlowFromSeed() {
  if (typeof queueCards !== 'undefined' && queueCards.length > 0) {
    const el = (id) => document.getElementById(id);
    const total = queueCards.length;
    const auto = queueCards.filter(q => q._triageVerdict === 'auto-execute').length;
    const escalate = queueCards.filter(q => q._triageVerdict === 'escalate').length;
    if (el('flow-created')) el('flow-created').textContent = total;
    if (el('flow-auto')) el('flow-auto').textContent = auto + ' safe';
    if (el('flow-escalate')) el('flow-escalate').textContent = escalate + ' risky';
  }
}

// Call on DOMContentLoaded after main app init
document.addEventListener('DOMContentLoaded', () => setTimeout(updateFlowFromSeed, 500));

function startProposalRefresh() {
  if (_proposalRefreshTimer) return;
  // Refresh proposals every 30s
  _proposalRefreshTimer = setInterval(() => {
    if (Bridge.liveMode) loadLiveProposals();
  }, 30000);
}

function stopProposalRefresh() {
  if (_proposalRefreshTimer) {
    clearInterval(_proposalRefreshTimer);
    _proposalRefreshTimer = null;
  }
}

// Override answerQueue to resolve proposals via bridge
if (typeof window !== 'undefined') {
  const _origAnswerQueue = window.answerQueue;
  window.answerQueue = function(qId, answer) {
    if (Bridge.liveMode && qId?.startsWith('prop-')) {
      Bridge.resolveProposal(qId, 'approve', answer).then(() => {
        loadLiveProposals(); // Refresh after resolve
        toast('✅ Proposal approved', 'success');
      }).catch(e => toast('Failed: ' + e.message, 'error'));
      return;
    }
    if (_origAnswerQueue) _origAnswerQueue.call(this, qId, answer);
  };
}

// ═══════════════════════════════════════════════════════════
// Auto-Generate Proposals
// ═══════════════════════════════════════════════════════════

async function autoGenerateProposal() {
  const btn = document.getElementById('auto-gen-btn');
  if (!btn) return;
  
  const origText = btn.textContent;
  btn.textContent = '⚡ Generating...';
  btn.disabled = true;
  btn.style.opacity = '0.6';
  
  try {
    if (Bridge.liveMode) {
      const result = await Bridge.apiFetch('/api/proposals/generate', { method: 'POST' });
      if (result.created > 0) {
        toast(`⚡ Generated ${result.created} new proposals`, 'success');
      } else if (result.totalPending > 0) {
        toast(`✅ ${result.totalPending} proposals already pending — nothing new to generate`, 'info');
      } else {
        toast('No proposals to generate right now — dispatch queue may be empty', 'info');
      }
      await loadLiveProposals();
    } else {
      toast('⚡ Connect bridge first to generate proposals', 'error');
    }
  } catch (e) {
    toast('Generation failed: ' + e.message, 'error');
  } finally {
    btn.textContent = origText;
    btn.disabled = false;
    btn.style.opacity = '1';
  }
}

// ═══════════════════════════════════════════════════════════
// New Proposal Modal
// ═══════════════════════════════════════════════════════════

function showNewProposalModal() {
  const m = document.createElement('div');
  m.id = 'new-proposal-modal';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;';
  m.innerHTML = `
    <div style="background:var(--bg-secondary,#1e1e2e);border:1px solid var(--border);border-radius:16px;padding:24px;width:90%;max-width:480px;">
      <h3 style="margin:0 0 16px;color:var(--text);font-size:16px;">New Proposal</h3>
      <select id="np-type" style="width:100%;padding:8px 12px;margin-bottom:12px;background:var(--bg-tertiary,#181825);color:var(--text);border:1px solid var(--border);border-radius:8px;">
        <option value="idea">💡 Idea</option>
        <option value="dispatch">🚀 Dispatch</option>
        <option value="research">🔬 Research</option>
        <option value="build">🔨 Build</option>
        <option value="question">❓ Question</option>
      </select>
      <select id="np-priority" style="width:100%;padding:8px 12px;margin-bottom:12px;background:var(--bg-tertiary,#181825);color:var(--text);border:1px solid var(--border);border-radius:8px;">
        <option value="P1">P1 — Urgent</option>
        <option value="P2">P2 — High</option>
        <option value="P3" selected>P3 — Normal</option>
        <option value="P4">P4 — Low</option>
      </select>
      <input id="np-title" placeholder="Proposal title..." style="width:100%;padding:8px 12px;margin-bottom:12px;background:var(--bg-tertiary,#181825);color:var(--text);border:1px solid var(--border);border-radius:8px;box-sizing:border-box;" />
      <textarea id="np-body" placeholder="Details, context, rationale..." rows="4" style="width:100%;padding:8px 12px;margin-bottom:16px;background:var(--bg-tertiary,#181825);color:var(--text);border:1px solid var(--border);border-radius:8px;resize:vertical;box-sizing:border-box;"></textarea>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button onclick="document.getElementById('new-proposal-modal').remove()" style="padding:8px 16px;border-radius:8px;border:1px solid var(--border);background:none;color:var(--text);cursor:pointer;">Cancel</button>
        <button onclick="submitNewProposal()" style="padding:8px 16px;border-radius:8px;border:none;background:var(--accent);color:#000;font-weight:600;cursor:pointer;">Create</button>
      </div>
      <div id="np-status" style="margin-top:8px;font-size:12px;color:var(--text-muted);"></div>
    </div>
  `;
  m.onclick = (e) => { if (e.target === m) m.remove(); };
  document.body.appendChild(m);
  setTimeout(() => document.getElementById('np-title')?.focus(), 100);
}

async function submitNewProposal() {
  const type = document.getElementById('np-type').value;
  const priority = document.getElementById('np-priority').value;
  const title = document.getElementById('np-title').value.trim();
  const body = document.getElementById('np-body').value.trim();
  const status = document.getElementById('np-status');
  
  if (!title) { status.textContent = '❌ Title required'; return; }
  
  status.textContent = '⏳ Creating...';
  
  try {
    if (Bridge.liveMode) {
      await Bridge.apiFetch('/api/proposals', {
        method: 'POST',
        body: JSON.stringify({ type, priority, title, body, source: 'webui' }),
      });
    } else {
      // Offline: add to local queueCards
      const id = 'local-' + Date.now();
      queueCards.unshift({
        id, agent: 'user', type: 'approval', priority: priority <= 'P2' ? 'urgent' : 'normal',
        ttl: 86400, elapsed: 0, remaining: 86400,
        question: title, context: body, options: null,
      });
    }
    
    status.textContent = '✅ Created!';
    setTimeout(() => {
      document.getElementById('new-proposal-modal')?.remove();
      loadLiveProposals();
    }, 500);
  } catch (e) {
    status.textContent = '❌ ' + e.message;
  }
}

// ═══════════════════════════════════════════════════════════
// HOOK: Nav — Refresh live data on view switch
// ═══════════════════════════════════════════════════════════

const _origNav = typeof nav === 'function' ? nav : null;

if (typeof window !== 'undefined' && typeof window.nav === 'function') {
  const _realNav = window.nav;
  window.nav = function(page) {
    _realNav.call(this, page);
    if (!Bridge.liveMode) return;
    // Refresh live data for the view
    if (page === 'talk') {
      renderChannelList();
      // Auto-select first real channel if current is fake
      if (currentChannel && !/^\d+$/.test(currentChannel) && _liveChannelData?.categories?.length) {
        const firstCh = _liveChannelData.categories[0]?.channels?.[0];
        if (firstCh) {
          currentChannel = firstCh.id;
          renderChannelList();
          loadLiveMessages(firstCh.id);
        }
      } else if (/^\d+$/.test(currentChannel)) {
        loadLiveMessages(currentChannel);
      }
    }
    if (page === 'feed') {
      if (typeof renderDashboard === 'function') renderDashboard();
      else renderFeed();
    }
    if (page === 'queue') renderQueue();      // queueCards is already replaced
  };
}

// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // Wait for main app to init first
  setTimeout(initBridgeUI, 300);
});
