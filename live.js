/* Agent OS — Live Data Layer
   Replaces simulated data with real system data via /api/ endpoints.
   Polls periodically and updates the UI in place.
*/
'use strict';

const LIVE = {
  enabled: true,
  pollInterval: 10000,  // 10s for system metrics
  msgPollInterval: 8000, // 8s for messages (fallback, WS is primary)
  timers: {},
  lastMessageIds: {},
  ws: null,
  wsReconnectTimer: null,
};

// ── Boot ──────────────────────────────────────────────────
function initLive() {
  if (!LIVE.enabled) return;
  console.log('[LIVE] Initializing live data connection...');

  // Initial data load
  loadOverview();
  loadChannels();
  loadVaultNotes();
  loadMessages(currentChannel || 'concierge');

  // Connect WebSocket for real-time updates
  connectWebSocket();

  // Sync queue items to backend + Discord (delayed to not block init)
  setTimeout(syncQueueToBackend, 3000);

  // Load from EventStore
  loadFeedEvents();
  loadQueueFromStore();

  // Polling
  LIVE.timers.overview = setInterval(loadOverview, LIVE.pollInterval);
  LIVE.timers.vault = setInterval(loadVaultNotes, 60000);
  LIVE.timers.feed = setInterval(loadFeedEvents, 15000); // Feed refresh every 15s
  LIVE.timers.queue = setInterval(loadQueueFromStore, 10000); // Queue refresh every 10s

  // Override switchChannel to load real messages
  const origSwitchChannel = window.switchChannel;
  window.switchChannel = function(chId) {
    origSwitchChannel(chId);
    loadMessages(chId);
  };

  // Show live indicator
  updateSyncBar('connected');
  toast('🟢 Live mode active — WebSocket connected', 'success', 3000);
}

function updateSyncBar(state) {
  const syncBar = document.getElementById('chat-sync-bar');
  if (!syncBar) return;
  const colors = { connected: 'var(--green)', disconnected: 'var(--red)', reconnecting: 'var(--yellow)' };
  const labels = { connected: 'Live — Real-time connected', disconnected: 'Disconnected — Reconnecting...', reconnecting: 'Reconnecting...' };
  syncBar.innerHTML = `<span class="sync-dot" style="background:${colors[state] || colors.disconnected}"></span><span class="sync-text">${labels[state] || state}</span>`;
}

// ── WebSocket ─────────────────────────────────────────────
function connectWebSocket() {
  if (LIVE.ws && LIVE.ws.readyState === WebSocket.OPEN) return;
  
  const wsUrl = `ws://${location.host}`;
  console.log('[WS] Connecting to', wsUrl);
  
  try {
    LIVE.ws = new WebSocket(wsUrl);
  } catch (e) {
    console.warn('[WS] Connection failed:', e.message);
    scheduleReconnect();
    return;
  }
  
  LIVE.ws.onopen = () => {
    console.log('[WS] Connected');
    updateSyncBar('connected');
    if (LIVE.wsReconnectTimer) {
      clearTimeout(LIVE.wsReconnectTimer);
      LIVE.wsReconnectTimer = null;
    }
  };
  
  LIVE.ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleWSMessage(data);
    } catch (e) {
      console.warn('[WS] Parse error:', e.message);
    }
  };
  
  LIVE.ws.onclose = () => {
    console.log('[WS] Disconnected');
    updateSyncBar('disconnected');
    scheduleReconnect();
  };
  
  LIVE.ws.onerror = (e) => {
    console.warn('[WS] Error');
    updateSyncBar('disconnected');
  };
}

function scheduleReconnect() {
  if (LIVE.wsReconnectTimer) return;
  LIVE.wsReconnectTimer = setTimeout(() => {
    LIVE.wsReconnectTimer = null;
    updateSyncBar('reconnecting');
    connectWebSocket();
  }, 3000);
}

function wsSend(data) {
  if (LIVE.ws && LIVE.ws.readyState === WebSocket.OPEN) {
    LIVE.ws.send(JSON.stringify(data));
    return true;
  }
  return false;
}

function handleWSMessage(data) {
  switch (data.type) {
    case 'new_messages': {
      // Real-time messages from Discord
      const channelId = data.channelId;
      
      // Find which channel slug this ID maps to
      let channelSlug = null;
      for (const [slug, id] of Object.entries(CHANNEL_IDS_LIVE)) {
        if (id === channelId) { channelSlug = slug; break; }
      }
      // Also check category channels
      if (!channelSlug) {
        for (const cat of (DC_CHANNELS.categories || [])) {
          const ch = cat.channels.find(c => c.realId === channelId);
          if (ch) { channelSlug = ch.id; break; }
        }
      }
      
      if (!channelSlug) return;
      
      const existing = DC_MESSAGES[channelSlug] || [];
      const existingIds = new Set(existing.map(m => m.id));
      
      const newMsgs = data.messages
        .filter(m => !existingIds.has(m.id))
        .map(m => ({
          id: m.id,
          agent: m.isBot ? mapBotToAgent(m.author) : 'user',
          time: new Date(m.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
          ts: new Date(m.timestamp).getTime() / 1000,
          text: m.content || (m.embeds?.[0]?.description || '[embed]'),
          reactions: [],
          embed: m.embeds?.[0] ? {
            title: m.embeds[0].title,
            desc: m.embeds[0].description?.substring(0, 200),
          } : null,
          _realAuthor: m.author,
          _isReal: true,
        }));
      
      if (newMsgs.length === 0) return;
      
      DC_MESSAGES[channelSlug] = [...existing, ...newMsgs];
      
      // Update UI if this channel is active
      if (currentPage === 'talk' && currentChannel === channelSlug && !currentDM) {
        const container = document.getElementById('messages-list');
        if (container) {
          newMsgs.forEach(msg => {
            container.appendChild(makeMessageGroup(msg, false, channelSlug));
          });
          const msgContainer = document.getElementById('messages-container');
          if (msgContainer) {
            const nearBottom = msgContainer.scrollHeight - msgContainer.scrollTop - msgContainer.clientHeight < 150;
            if (nearBottom) msgContainer.scrollTop = msgContainer.scrollHeight;
          }
        }
      } else {
        // Unread badge for non-active channel
        const chanItem = document.querySelector(`[data-channel-id="${channelSlug}"] .channel-unread, [data-channel-id="${channelId}"] .channel-unread`);
        if (chanItem) {
          const current = parseInt(chanItem.textContent) || 0;
          chanItem.textContent = current + newMsgs.length;
          chanItem.classList.remove('hidden');
        }
      }
      
      // Feed event
      newMsgs.forEach(msg => {
        if (typeof EventBus !== 'undefined') {
          EventBus.emit('chat:message', {
            agent: msg.agent,
            text: msg.text,
            channel: channelSlug,
            time: msg.time,
          });
        }
      });
      
      // Flash notification
      if (newMsgs.length > 0 && document.hidden) {
        document.title = `(${newMsgs.length}) Agent OS`;
        setTimeout(() => { document.title = 'Agent OS'; }, 5000);
      }
      break;
    }
    
    case 'message_sent': {
      // Our own message confirmed sent
      console.log('[WS] Message sent confirmed:', data.id);
      break;
    }
    
    case 'queue_answered': {
      console.log('[WS] Queue answer bridged:', data.qId);
      break;
    }
    
    case 'new_event': {
      // Real-time event from EventStore
      const evt = data.event;
      if (currentPage === 'feed') {
        // Prepend to feed
        const feedList = document.getElementById('feed-list');
        if (feedList) {
          const agentColors = { righthand: 'var(--accent)', researcher: 'var(--accent2)', coder: 'var(--green)', ops: 'var(--orange)', devil: 'var(--red)', system: 'var(--text2)' };
          const typeIcons = { task_complete: '✅', task_failed: '❌', queue_answered: '📋', queue_auto_resolved: '🤖', vault_write: '📝', system_alert: '🚨', system_warning: '⚠️', queue_item_created: '❓' };
          const icon = typeIcons[evt.type] || '📋';
          const color = agentColors[evt.agent] || 'var(--text2)';
          const time = new Date(evt.timestamp || Date.now()).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
          
          const card = document.createElement('div');
          card.className = 'feed-card';
          card.style.borderLeftColor = color;
          card.style.animation = 'slideIn 0.3s ease';
          card.innerHTML = `
            <div class="feed-card-header">
              <span class="feed-icon">${icon}</span>
              <span class="feed-agent" style="color:${color}">${evt.agent || evt.source || 'system'}</span>
              <span class="feed-time">${time}</span>
              ${evt.severity === 'error' ? '<span class="feed-badge error">ERROR</span>' : ''}
            </div>
            <div class="feed-card-body">${evt.summary || ''}</div>
          `;
          feedList.prepend(card);
        }
      }
      
      // Update notification badge
      if (typeof addNotification === 'function') {
        addNotification(evt.type?.replace(/_/g, ' ') || 'Event', evt.summary?.substring(0, 60) || '', evt.severity === 'error' ? '🚨' : '📋');
      }
      break;
    }
    
    case 'queue_auto_resolved': {
      // Auto-rule resolved a queue item
      toast(`🤖 Auto-resolved: "${data.question?.substring(0, 50)}" → ${data.answer}`, 'info', 4000);
      if (typeof addNotification === 'function') {
        addNotification('Auto-Queue', `Resolved: ${data.question?.substring(0, 40)}`, '🤖');
      }
      // Refresh queue
      loadQueueFromStore();
      break;
    }
    
    case 'queue_item_added': {
      // New queue item from backend
      toast(`❓ New queue item from ${data.item?.agent || 'system'}`, 'info', 3000);
      loadQueueFromStore();
      break;
    }
    
    case 'queue_updated': {
      // Queue state changed (e.g., expiry)
      loadQueueFromStore();
      break;
    }
    
    case 'error': {
      toast('❌ ' + (data.error || 'WebSocket error'), 'error', 3000);
      break;
    }
  }
}

// ── API helpers ───────────────────────────────────────────
async function apiFetch(endpoint) {
  try {
    const res = await fetch('/api/' + endpoint);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn(`[LIVE] API error (${endpoint}):`, e.message);
    return null;
  }
}

async function apiPost(endpoint, body) {
  try {
    const res = await fetch('/api/' + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (e) {
    console.warn(`[LIVE] POST error (${endpoint}):`, e.message);
    return null;
  }
}

// ── Feed from EventStore ──────────────────────────────────
async function loadFeedEvents() {
  const events = await apiFetch('events?limit=50');
  if (!Array.isArray(events)) return;
  
  // Replace feed cards with real events
  const feedList = document.getElementById('feed-list');
  if (!feedList || currentPage !== 'feed') return;
  
  // Clear simulation cards and add real events
  const realCards = events.map(evt => {
    const agentColors = { righthand: 'var(--accent)', researcher: 'var(--accent2)', coder: 'var(--green)', ops: 'var(--orange)', devil: 'var(--red)', system: 'var(--text2)' };
    const severityIcons = { error: '🚨', warn: '⚠️', info: '📋' };
    const typeIcons = { task_complete: '✅', task_failed: '❌', queue_answered: '📋', queue_auto_resolved: '🤖', vault_write: '📝', system_alert: '🚨', system_warning: '⚠️', queue_item_created: '❓', discord_sync: '📡', queue_escalated: '🔺' };
    
    const icon = typeIcons[evt.type] || severityIcons[evt.severity] || '📋';
    const color = agentColors[evt.agent] || 'var(--text2)';
    const time = new Date(evt.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    
    return `<div class="feed-card" style="border-left-color:${color}" data-event-id="${evt.id}">
      <div class="feed-card-header">
        <span class="feed-icon">${icon}</span>
        <span class="feed-agent" style="color:${color}">${evt.agent || evt.source}</span>
        <span class="feed-time">${time}</span>
        ${evt.severity === 'error' ? '<span class="feed-badge error">ERROR</span>' : ''}
        ${evt.severity === 'warn' ? '<span class="feed-badge warn">WARN</span>' : ''}
      </div>
      <div class="feed-card-body">${evt.summary || ''}</div>
      <div class="feed-card-type">${evt.type.replace(/_/g, ' ')}</div>
    </div>`;
  });
  
  feedList.innerHTML = realCards.join('') || '<div class="feed-empty">No events yet. System events will appear here as they happen.</div>';
}

// ── Queue from EventStore ─────────────────────────────────
async function loadQueueFromStore() {
  const data = await apiFetch('queue');
  if (!data) return;
  
  // Update queue cards with real data
  if (data.items && typeof queueCards !== 'undefined') {
    // Merge: keep any client-side items not in store, add store items
    const storeIds = new Set(data.items.map(i => i.id));
    const clientOnly = queueCards.filter(c => !storeIds.has(c.id));
    
    const storeCards = data.items.map(item => ({
      id: item.id,
      question: item.question,
      agent: item.agent || 'righthand',
      type: item.type || 'approval',
      choices: item.choices ? (typeof item.choices === 'string' ? JSON.parse(item.choices) : item.choices) : null,
      priority: item.priority || 'normal',
      ttl: item.ttl || 300,
      elapsed: 0, // Will be calculated from created_at
      remaining: item.expires_at ? Math.max(0, Math.round((new Date(item.expires_at) - Date.now()) / 1000)) : 300,
      _fromStore: true,
    }));
    
    // Replace queueCards
    queueCards.length = 0;
    storeCards.concat(clientOnly).forEach(c => queueCards.push(c));
    
    if (currentPage === 'queue' && typeof renderQueue === 'function') {
      renderQueue();
    }
  }
  
  // Update auto-queue stats
  if (data.stats) {
    const statsEl = document.getElementById('queue-auto-stats');
    if (statsEl) {
      statsEl.innerHTML = `
        <span class="auto-stat">🤖 Auto-resolved: <strong>${data.stats.auto_resolved_today || 0}</strong> today</span>
        <span class="auto-stat">📏 Active rules: <strong>${data.stats.active_rules || 0}</strong></span>
        <span class="auto-stat">📊 Total answered: <strong>${data.stats.total_answered || 0}</strong></span>
      `;
    }
    
    // Update qStats if available
    if (typeof qStats !== 'undefined') {
      qStats.answered = data.stats.answered_today || 0;
      qStats.autoResolved = data.stats.auto_resolved_today || 0;
      if (typeof updateQueueStats === 'function') updateQueueStats();
    }
  }
}

// ── System overview (Feed + Pulse) ────────────────────────
async function loadOverview() {
  const data = await apiFetch('overview');
  if (!data) return;

  // Update Pulse metrics
  if (data.system) {
    const s = data.system;
    updateMetric('metric-cpu', Math.round(s.cpu) + '%');
    updateMetric('metric-memory', s.memory?.percent + '%');
    updateMetric('metric-disk', s.disk?.percent + '%');
    updateMetric('metric-load', s.load?.['1m']?.toFixed(2));

    // Update system load bars if on pulse page
    if (currentPage === 'pulse' && typeof renderSystemLoad === 'function') {
      const loads = [
        { label: 'CPU', val: Math.round(s.cpu || 0), color: s.cpu > 80 ? 'var(--red)' : 'var(--accent)' },
        { label: 'Mem', val: s.memory?.percent || 0, color: s.memory?.percent > 80 ? 'var(--red)' : 'var(--accent2)' },
        { label: 'Disk', val: s.disk?.percent || 0, color: s.disk?.percent > 85 ? 'var(--red)' : s.disk?.percent > 70 ? 'var(--yellow)' : 'var(--green)' },
        { label: 'Load', val: Math.min(Math.round((s.load?.['1m'] || 0) / 6 * 100), 100), color: 'var(--green)' },
      ];
      const el = document.getElementById('system-load');
      if (el) {
        el.innerHTML = loads.map(l => `
          <div class="load-row">
            <span class="load-label">${l.label}</span>
            <div class="load-bar-outer"><div class="load-bar-inner" style="width:${l.val}%;background:${l.color}"></div></div>
            <span class="load-value">${l.val}%</span>
          </div>
        `).join('');
      }
    }
  }

  // Update dispatch counts
  if (data.dispatch) {
    const d = data.dispatch;
    updateMetric('metric-queue', d.queue || 0);
    updateMetric('metric-active', d.active || 0);
    updateMetric('metric-done', d.done || 0);
    updateMetric('metric-failed', d.failed || 0);
  }

  // Update services
  if (data.services) {
    data.services.forEach(s => {
      const dot = document.querySelector(`[data-service="${s.name}"]`);
      if (dot) {
        dot.className = `status-dot ${s.status === 'active' ? 'status-ok' : 'status-fail'}`;
      }
    });
  }

  // Update crons on pulse
  if (data.crons && currentPage === 'pulse') {
    const el = document.getElementById('cron-status');
    if (el) {
      el.innerHTML = data.crons.map(c => `
        <div class="cron-row">
          <span class="status-dot status-ok"></span>
          <span class="cron-name">${c.name}</span>
          <span class="cron-schedule">${c.schedule}</span>
        </div>
      `).join('');
    }
  }

  // Generate feed events from dispatch changes
  if (data.dispatch?.activeItems?.length) {
    data.dispatch.activeItems.forEach(item => {
      if (!seenDispatchIds.has(item.file)) {
        seenDispatchIds.add(item.file);
        prependFeedCard({
          id: 'live_dispatch_' + item.file,
          agent: item.agent || 'righthand',
          type: 'task_started',
          time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
          content: `[DISPATCH] ${item.description || item.task || item.file}`,
        });
      }
    });
  }
}

const seenDispatchIds = new Set();

function updateMetric(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

// ── Discord channels (real structure) ─────────────────────
async function loadChannels() {
  const data = await apiFetch('channels');
  if (!data || data.error) return;

  // Replace DC_CHANNELS.categories with real data
  if (data.categories) {
    DC_CHANNELS.categories = data.categories
      .filter(cat => cat.name !== '_ARCHIVE') // Hide archive
      .map(cat => ({
        id: cat.id,
        name: cat.name,
        channels: cat.channels
          .filter(ch => ch.type !== 'other')
          .map(ch => {
            // Clean slug: strip emoji, leading/trailing hyphens
            const slug = ch.name.replace(/[^\w-]/g, '').replace(/^-+|-+$/g, '').toLowerCase() || ch.id;
            return {
              id: slug,
              realId: ch.id,
              name: ch.name,
              type: ch.type,
              topic: ch.topic,
              unread: 0,
            };
          }),
      }));

    // Update the channel ID map for message fetching
    data.categories.forEach(cat => {
      cat.channels.forEach(ch => {
        const slug = ch.name.replace(/[^\w-]/g, '').replace(/^-+|-+$/g, '').toLowerCase();
        CHANNEL_IDS_LIVE[slug] = ch.id;
        CHANNEL_IDS_LIVE[ch.id] = ch.id;
        // Also map the raw name
        CHANNEL_IDS_LIVE[ch.name] = ch.id;
      });
    });

    // Re-render if on talk page
    if (currentPage === 'talk') {
      renderChannelList();
    }
  }
}

// Live channel ID resolution
const CHANNEL_IDS_LIVE = {};

function resolveChannelId(nameOrId) {
  // Try live map first, then static map
  return CHANNEL_IDS_LIVE[nameOrId] || null;
}

// ── Discord messages (real) ───────────────────────────────
async function loadMessages(channelName, fullReplace = true) {
  if (!channelName) return;

  // Resolve to real Discord channel ID
  let channelId = CHANNEL_IDS_LIVE[channelName];
  // Also try the channel items in categories
  if (!channelId) {
    for (const cat of (DC_CHANNELS.categories || [])) {
      const ch = cat.channels.find(c => c.id === channelName || c.realId === channelName);
      if (ch) { channelId = ch.realId; break; }
    }
  }
  // If it looks like a Discord snowflake, use it directly
  if (!channelId && /^\d{17,20}$/.test(channelName)) {
    channelId = channelName;
  }
  if (!channelId) {
    console.warn('[LIVE] Cannot resolve channel:', channelName, 'known:', Object.keys(CHANNEL_IDS_LIVE).slice(0,5));
    return;
  }

  try {
    const res = await fetch(`/api/messages?channel=${channelName}&limit=30&id=${channelId}`);
    const messages = await res.json();
    if (!Array.isArray(messages) || messages.error) return;

    // Convert to our format
    const converted = messages.reverse().map(m => ({
      id: m.id,
      agent: m.isBot ? mapBotToAgent(m.author) : 'user',
      time: new Date(m.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
      ts: new Date(m.timestamp).getTime() / 1000,
      text: m.content || (m.embeds?.[0]?.description || '[embed]'),
      reactions: m.reactions?.map(r => ({ e: r.emoji, n: r.count, mine: false })) || [],
      replyTo: null,
      embed: m.embeds?.[0] ? {
        title: m.embeds[0].title,
        desc: m.embeds[0].description?.substring(0, 200),
        color: m.embeds[0].color ? '#' + m.embeds[0].color.toString(16).padStart(6, '0') : null,
      } : null,
      _realAuthor: m.author,
      _isReal: true,
    }));

    if (fullReplace) {
      DC_MESSAGES[channelName] = converted;
      if (currentPage === 'talk' && currentChannel === channelName && !currentDM) {
        renderMessages(channelName);
      }
    } else {
      // Incremental — only add new messages
      const existing = DC_MESSAGES[channelName] || [];
      const existingIds = new Set(existing.map(m => m.id));
      const newMsgs = converted.filter(m => !existingIds.has(m.id));
      if (newMsgs.length > 0) {
        DC_MESSAGES[channelName] = [...existing, ...newMsgs];
        if (currentPage === 'talk' && currentChannel === channelName && !currentDM) {
          // Append new messages
          const container = document.getElementById('messages-list');
          if (container) {
            newMsgs.forEach(msg => {
              container.appendChild(makeMessageGroup(msg, false, channelName));
            });
            const msgContainer = document.getElementById('messages-container');
            if (msgContainer && msgContainer.scrollHeight - msgContainer.scrollTop - msgContainer.clientHeight < 100) {
              msgContainer.scrollTop = msgContainer.scrollHeight;
            }
          }
        }
        // Feed event for new messages
        newMsgs.forEach(msg => {
          if (typeof EventBus !== 'undefined') {
            EventBus.emit('chat:message', {
              agent: msg.agent,
              text: msg.text,
              channel: channelName,
              time: msg.time,
            });
          }
        });
      }
    }
  } catch (e) {
    console.warn('[LIVE] Message load error:', e.message);
  }
}

function mapBotToAgent(authorName) {
  const name = (authorName || '').toLowerCase();
  if (name.includes('right hand') || name.includes('concierge')) return 'righthand';
  if (name.includes('research')) return 'researcher';
  if (name.includes('coder') || name.includes('code')) return 'coder';
  if (name.includes('ops')) return 'ops';
  if (name.includes('devil')) return 'devil';
  if (name.includes('security')) return 'security';
  if (name.includes('vault')) return 'vault';
  if (name.includes('prompt')) return 'prompt';
  return 'righthand'; // default for bot messages
}

// ── Vault notes (real) ────────────────────────────────────
async function loadVaultNotes() {
  const notes = await apiFetch('vault');
  if (!notes || notes.error || !Array.isArray(notes)) return;

  // Replace VAULT_NOTES
  const typeColors = {
    research: '#89b4fa', vision: '#89b4fa', architecture: '#f9e2af',
    operations: '#fab387', report: '#f38ba8', code: '#a6e3a1',
    decision: '#f5c2e7', reference: '#94e2d5', session: '#cba6f7',
    note: '#cba6f7', personal: '#f9e2af', system: '#fab387',
  };

  VAULT_NOTES.length = 0;
  notes.forEach((n, i) => {
    VAULT_NOTES.push({
      id: 'v_' + i,
      title: n.title,
      summary: n.summary || '',
      type: (n.type || 'note').charAt(0).toUpperCase() + (n.type || 'note').slice(1),
      confidence: n.confidence ? Math.round(n.confidence * 100) : 50,
      backlinks: 0,
      agent: 'vault',
      date: n.modified?.split('T')[0] || '',
      tags: n.tags || [],
      _path: n.path,
    });
  });

  // Re-render mind if active
  if (currentPage === 'mind' && typeof renderVaultCards === 'function') {
    renderVaultCards();
  }
}

// ── Send messages (real) ──────────────────────────────────
// Override sendMessage to also post to real Discord
const origSendMessage = window.sendMessage;
window.addEventListener('DOMContentLoaded', () => {
  // Patch sendMessage after DOM ready
  setTimeout(() => {
    const _origSend = window.sendMessage;
    window.sendMessage = function() {
      const input = document.getElementById('message-input');
      const text = input?.value?.trim();
      
      // Call original (updates UI)
      _origSend.call(window);
      
      // Send to real Discord via WebSocket (instant) or REST fallback
      if (text && !currentDM) {
        const realId = CHANNEL_IDS_LIVE[currentChannel] || currentChannel;
        const sent = wsSend({ type: 'send', channelId: realId, text });
        if (!sent) {
          // Fallback to REST
          apiPost('send', { channel: currentChannel, channelId: realId, message: text }).then(result => {
            if (result?.ok) {
              toast('📡 Sent to Discord', 'success', 1500);
            } else {
              toast('❌ Discord send failed: ' + (result?.error || 'unknown'), 'error', 3000);
            }
          });
        }
      }
    };
  }, 500);
});

// ── Queue persistence + Discord bridge ────────────────────

// Override answerQueue to persist and bridge
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    const _origAnswer = window.answerQueue;
    if (!_origAnswer) return;
    
    window.answerQueue = function(qId, answer) {
      const q = (typeof queueCards !== 'undefined') ? queueCards.find(c => c.id === qId) : null;
      
      // Call original (updates UI, removes card, shows toast)
      _origAnswer.call(window, qId, answer);
      
      // Persist + bridge to Discord (WS for speed, REST fallback)
      const qPayload = {
        type: 'queue_answer',
        qId,
        answer,
        question: q?.question || qId,
        agent: q?.agent || 'righthand',
      };
      if (!wsSend(qPayload)) {
        apiPost('queue', { ...qPayload, type: 'answer' });
      }
    };
  }, 600);
});

// Override syncToDiscord to actually send to Discord
window.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    window.syncToDiscord = function(channel, content, agent) {
      const agentObj = (typeof ga !== 'undefined') ? ga(agent) : null;
      const emoji = agentObj?.emoji || '👤';
      
      // Still do local UI updates (agent-feed message)
      if (typeof DC_MESSAGES !== 'undefined') {
        if (!DC_MESSAGES['agent-feed']) DC_MESSAGES['agent-feed'] = [];
        DC_MESSAGES['agent-feed'].push({
          id: 'sync_' + Date.now(),
          agent: agent === 'user' ? 'righthand' : agent,
          time: new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}),
          ts: Date.now()/1000,
          text: `📡 **Synced from Agent OS** → #${channel}\n${content.substring(0,120)}`,
          reactions: [],
        });
      }
      
      // Actually send to Discord
      apiPost('queue', {
        type: 'sync',
        channel: channel || 'agent-feed',
        channelId: CHANNEL_IDS_LIVE[channel] || null,
        message: `${emoji} **[Agent OS]** ${content}`,
      });
    };
  }, 600);
});

// Load persisted queue state on init and sync queue items to Discord
async function loadQueueState() {
  const data = await apiFetch('queue');
  if (!data || !data.items) return;
  
  // Update stats
  if (data.stats && typeof qStats !== 'undefined') {
    qStats.answered = data.stats.answered || 0;
    qStats.autoResolved = data.stats.autoResolved || 0;
    if (typeof updateQueueStats === 'function') updateQueueStats();
  }
}

// Sync initial queue items to backend (posts to Discord #queue)
async function syncQueueToBackend() {
  if (typeof queueCards === 'undefined' || !queueCards.length) return;
  
  // Check which items are already synced
  const state = await apiFetch('queue');
  const existingIds = new Set((state?.items || []).map(i => i.id));
  
  for (const q of queueCards) {
    if (existingIds.has(q.id)) continue;
    // Post new item to backend (which posts to Discord)
    await apiPost('queue', {
      type: 'add',
      id: q.id,
      question: q.question,
      agent: q.agent || 'righthand',
      qtype: q.type || 'approval',
      choices: q.choices || null,
      priority: q.priority || 'normal',
      ttl: q.ttl || 300,
    });
    // Small delay to avoid rate limits
    await new Promise(r => setTimeout(r, 500));
  }
}

// ── Metrics display helpers ───────────────────────────────
// These get called when data loads to update any visible metrics

// Override agent display with real session info
async function loadAgentInfo() {
  const agents = await apiFetch('agents');
  if (!agents || !Array.isArray(agents)) return;
  // Update active count
  const el = document.getElementById('active-agents-text');
  if (el) el.textContent = `${agents.length} agents configured`;
}

// ── Init on page load ─────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  // Wait a tick for other scripts to initialize
  setTimeout(initLive, 1000);
});
