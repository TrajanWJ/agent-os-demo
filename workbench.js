/* Agent OS v7 — workbench.js — Real-time Agent Workbench */
'use strict';

// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════

let wbSelectedAgent = null;   // null = watch all
let wbWatchAll = true;
let wbAgentActivity = {};     // agentId -> { events:[], task:{}, tokens:0, runtime:0 }
let wbRefreshTimer = null;
let wbFocusedAgent = null;    // full-screen focus mode
let wbMessageAgent = null;    // inline chat target

PAGE_TITLES.workbench = 'Workbench';

// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════

function initWorkbench() {
  // Populate agent dropdown
  const sel = document.getElementById('wb-agent-select');
  if (sel && sel.options.length <= 1) {
    AGENTS.filter(a => a.dept === 'core' || a.status === 'active').forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = `${a.emoji} ${a.name}`;
      sel.appendChild(opt);
    });
  }
  loadWorkbenchData();
  startWorkbenchRefresh();
}

async function loadWorkbenchData() {
  // Load from bridge if live, else use mock data from AGENTS + FEED_EVENTS
  const agentList = AGENTS.filter(a => a.dept === 'core' || a.status === 'active').slice(0, 12);

  for (const agent of agentList) {
    if (!wbAgentActivity[agent.id]) {
      wbAgentActivity[agent.id] = { events: [], task: null, tokens: agent.tokens || 0, runtime: 0, startTime: null };
    }
  }

  if (typeof Bridge !== 'undefined' && Bridge.liveMode) {
    // Try fetching activity for each agent
    for (const agent of agentList) {
      try {
        const data = await Bridge.apiFetch(`/api/agents/${agent.id}/activity`);
        wbAgentActivity[agent.id] = {
          events: (data.events || []).slice(0, 20),
          task: data.task || null,
          tokens: data.tokens || agent.tokens || 0,
          runtime: data.runtime || 0,
          startTime: data.startTime || null,
        };
      } catch {
        // Fall back to feed filter
        await loadAgentFromFeed(agent.id);
      }
    }
  } else {
    // Mock: pull from feedEvents
    for (const agent of agentList) {
      await loadAgentFromFeed(agent.id);
    }
  }

  renderWorkbench();
}

async function loadAgentFromFeed(agentId) {
  const existing = wbAgentActivity[agentId] || { events: [], task: null, tokens: 0, runtime: 0, startTime: null };
  const agentData = ga(agentId);

  // Get events from feedEvents or FEED_EVENTS
  const allEvents = (typeof feedEvents !== 'undefined' ? feedEvents : (typeof FEED_EVENTS !== 'undefined' ? FEED_EVENTS : []));
  const agentEvents = allEvents
    .filter(e => e.agent === agentId)
    .slice(0, 20)
    .map(e => ({
      id: e.id,
      type: e.type || 'info',
      content: e.content || e.text || '',
      time: e.time || '',
      timestamp: e.timestamp || '',
    }));

  existing.events = agentEvents.length > 0 ? agentEvents : existing.events;
  existing.tokens = agentData?.tokens || existing.tokens;
  existing.task = agentData?.task ? { title: agentData.task } : existing.task;

  // Simulate runtime for active agents
  if (agentData?.status === 'active' && !existing.startTime) {
    existing.startTime = Date.now() - (Math.random() * 4 * 3600000); // random runtime up to 4h
  }

  wbAgentActivity[agentId] = existing;
}

// ═══════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════

function renderWorkbench() {
  const container = document.getElementById('workbench-content');
  if (!container) return;

  if (wbFocusedAgent) {
    renderWorkbenchFocused(container);
    return;
  }

  if (wbMessageAgent) {
    renderWorkbenchWithChat(container);
    return;
  }

  if (!wbWatchAll && wbSelectedAgent) {
    renderWorkbenchSingle(container);
    return;
  }

  // Watch All: 2x3 grid of top 6 agents
  renderWorkbenchGrid(container);
}

function renderWorkbenchGrid(container) {
  const topAgents = getTopAgents(6);
  container.innerHTML = `
    <div class="wb-grid">
      ${topAgents.map(a => renderAgentPanel(a, 'grid')).join('')}
    </div>
  `;
  topAgents.forEach(a => scrollPanelToBottom(a.id));
}

function renderWorkbenchSingle(container) {
  const agent = ga(wbSelectedAgent);
  if (!agent) { renderWorkbenchGrid(container); return; }

  container.innerHTML = `
    <div class="wb-single">
      ${renderAgentPanel(agent, 'single')}
    </div>
  `;
  scrollPanelToBottom(agent.id);
}

function renderWorkbenchFocused(container) {
  const agent = ga(wbFocusedAgent);
  if (!agent) { wbFocusedAgent = null; renderWorkbench(); return; }

  container.innerHTML = `
    <div class="wb-focused">
      <div class="wb-focus-topbar">
        <span>${agent.emoji} ${agent.name} — Full View</span>
        <button class="wb-btn wb-btn-close" onclick="wbExitFocus()">✕ Exit Focus</button>
      </div>
      ${renderAgentPanel(agent, 'focused')}
    </div>
  `;
  scrollPanelToBottom(agent.id);
}

function renderWorkbenchWithChat(container) {
  const agent = ga(wbMessageAgent);
  if (!agent) { wbMessageAgent = null; renderWorkbench(); return; }
  const topAgents = getTopAgents(6);

  container.innerHTML = `
    <div class="wb-with-chat">
      <div class="wb-grid wb-grid-small">
        ${topAgents.map(a => renderAgentPanel(a, 'grid')).join('')}
      </div>
      <div class="wb-chat-panel">
        <div class="wb-chat-header">
          <span>${agent.emoji} Message ${agent.name}</span>
          <button class="wb-btn wb-btn-close" onclick="wbCloseChat()">✕</button>
        </div>
        <div class="wb-chat-messages" id="wb-chat-messages"></div>
        <div class="wb-chat-input-area">
          <input type="text" class="wb-chat-input" id="wb-chat-input"
            placeholder="Send to ${agent.name}..."
            onkeydown="if(event.key==='Enter'){event.preventDefault();wbSendChat();}">
          <button class="wb-btn wb-btn-send" onclick="wbSendChat()">▶</button>
        </div>
      </div>
    </div>
  `;
  topAgents.forEach(a => scrollPanelToBottom(a.id));
}

function renderAgentPanel(agent, mode) {
  const activity = wbAgentActivity[agent.id] || { events: [], task: null, tokens: 0, runtime: 0 };
  const isActive = agent.status === 'active';
  const borderColor = agent.color || '#45475a';
  const panelClass = `wb-panel ${isActive ? 'wb-panel-active' : 'wb-panel-idle'} wb-panel-${mode}`;
  const runtime = formatWbRuntime(activity);
  const tokenStr = formatWbTokens(activity.tokens);

  const events = activity.events.slice(0, mode === 'focused' ? 40 : mode === 'single' ? 30 : 12);

  return `
    <div class="${panelClass}" style="--panel-accent:${borderColor}" data-agent="${agent.id}">
      <div class="wb-panel-header">
        <div class="wb-panel-title">
          <span class="wb-agent-dot ${isActive ? 'wb-dot-active' : 'wb-dot-idle'}"></span>
          <span class="wb-agent-emoji">${agent.emoji}</span>
          <span class="wb-agent-name">${agent.name}</span>
        </div>
        <span class="wb-panel-status ${isActive ? 'wb-status-active' : 'wb-status-idle'}">
          ${isActive ? 'Active' : 'Idle'}
        </span>
      </div>
      <div class="wb-panel-terminal" id="wb-terminal-${agent.id}">
        ${events.length === 0
          ? `<div class="wb-event wb-event-system">No recent activity</div>`
          : events.map(e => renderWbEvent(e)).join('')
        }
        ${isActive ? '<div class="wb-cursor">▊</div>' : ''}
      </div>
      <div class="wb-panel-footer">
        <div class="wb-panel-stats">
          <span class="wb-stat">▸ Tokens: ${tokenStr}</span>
          <span class="wb-stat">▸ Runtime: ${runtime}</span>
        </div>
        <div class="wb-panel-actions">
          <button class="wb-action-btn" onclick="wbFocus('${agent.id}')" title="Focus">Focus</button>
          <button class="wb-action-btn" onclick="wbMessage('${agent.id}')" title="Message">Message</button>
          ${isActive ? `<button class="wb-action-btn wb-action-stop" onclick="wbStop('${agent.id}')" title="Stop">Stop</button>` : ''}
        </div>
      </div>
    </div>
  `;
}

function renderWbEvent(event) {
  const typeClass = getWbEventClass(event.type);
  const prefix = getWbEventPrefix(event.type);
  const timeStr = event.time || '';
  return `
    <div class="wb-event ${typeClass}">
      <span class="wb-event-prefix">${prefix}</span>
      <span class="wb-event-content">${escapeHtml(event.content)}</span>
      ${timeStr ? `<span class="wb-event-time">${timeStr}</span>` : ''}
    </div>
  `;
}

function getWbEventClass(type) {
  if (!type) return 'wb-event-info';
  const t = type.toLowerCase();
  if (t.includes('error') || t.includes('fail')) return 'wb-event-error';
  if (t.includes('complete') || t.includes('done') || t.includes('success')) return 'wb-event-complete';
  if (t.includes('task') || t.includes('dispatch') || t.includes('action')) return 'wb-event-task';
  if (t.includes('insight') || t.includes('idea') || t.includes('vault')) return 'wb-event-insight';
  return 'wb-event-info';
}

function getWbEventPrefix(type) {
  if (!type) return '>';
  const t = type.toLowerCase();
  if (t.includes('error') || t.includes('fail')) return '✗';
  if (t.includes('complete') || t.includes('done') || t.includes('success')) return '✓';
  if (t.includes('task') || t.includes('dispatch')) return '▸';
  if (t.includes('insight') || t.includes('idea')) return '◆';
  return '>';
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function scrollPanelToBottom(agentId) {
  requestAnimationFrame(() => {
    const terminal = document.getElementById(`wb-terminal-${agentId}`);
    if (terminal) terminal.scrollTop = terminal.scrollHeight;
  });
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function getTopAgents(n) {
  // Active agents first, then by tokens (most active), limit to n
  return AGENTS
    .filter(a => a.dept === 'core' || a.status === 'active')
    .sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (b.status === 'active' && a.status !== 'active') return 1;
      return (b.tokens || 0) - (a.tokens || 0);
    })
    .slice(0, n);
}

function formatWbRuntime(activity) {
  if (!activity.startTime && !activity.runtime) return '—';
  let ms = activity.runtime ? activity.runtime * 1000 : (Date.now() - activity.startTime);
  if (ms < 0) ms = 0;
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatWbTokens(tokens) {
  if (!tokens) return '0';
  if (tokens >= 1000) return (tokens / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(tokens);
}

// ═══════════════════════════════════════════════════════════
// TOPBAR CONTROLS
// ═══════════════════════════════════════════════════════════

function wbSelectAgent(agentId) {
  if (agentId === '__all__') {
    wbWatchAll = true;
    wbSelectedAgent = null;
  } else {
    wbWatchAll = false;
    wbSelectedAgent = agentId;
  }
  wbFocusedAgent = null;
  wbMessageAgent = null;
  renderWorkbench();
  updateWbDropdown();
}

function updateWbDropdown() {
  const sel = document.getElementById('wb-agent-select');
  if (sel) sel.value = wbWatchAll ? '__all__' : (wbSelectedAgent || '__all__');
}

function wbToggleWatchAll() {
  wbWatchAll = true;
  wbSelectedAgent = null;
  wbFocusedAgent = null;
  wbMessageAgent = null;
  renderWorkbench();
  updateWbDropdown();
}

// ═══════════════════════════════════════════════════════════
// PANEL ACTIONS
// ═══════════════════════════════════════════════════════════

function wbFocus(agentId) {
  wbFocusedAgent = agentId;
  wbMessageAgent = null;
  renderWorkbench();
}

function wbExitFocus() {
  wbFocusedAgent = null;
  renderWorkbench();
}

function wbMessage(agentId) {
  wbMessageAgent = agentId;
  wbFocusedAgent = null;
  renderWorkbench();
  setTimeout(() => {
    const input = document.getElementById('wb-chat-input');
    if (input) input.focus();
  }, 100);
}

function wbCloseChat() {
  wbMessageAgent = null;
  renderWorkbench();
}

async function wbSendChat() {
  const input = document.getElementById('wb-chat-input');
  const text = input?.value?.trim();
  if (!text || !wbMessageAgent) return;
  input.value = '';

  // Add to chat display
  const msgsEl = document.getElementById('wb-chat-messages');
  if (msgsEl) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'wb-chat-msg wb-chat-msg-user';
    msgDiv.textContent = text;
    msgsEl.appendChild(msgDiv);
    msgsEl.scrollTop = msgsEl.scrollHeight;
  }

  // Send via bridge rooms or agent chat
  if (typeof Bridge !== 'undefined' && Bridge.liveMode) {
    try {
      await Bridge.apiFetch('/api/agent/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: text,
          agent: wbMessageAgent,
          context: 'workbench',
          page: 'workbench',
        }),
      });
    } catch (e) {
      if (typeof toast === 'function') toast('Send failed: ' + e.message, 'error');
    }
  }
}

async function wbStop(agentId) {
  if (typeof Bridge !== 'undefined' && Bridge.liveMode) {
    try {
      await Bridge.apiFetch(`/api/agents/${agentId}/stop`, { method: 'POST' });
      if (typeof toast === 'function') toast(`⏹ Sent stop to ${agentId}`, 'info');
    } catch (e) {
      if (typeof toast === 'function') toast('Stop failed: ' + e.message, 'error');
    }
  } else {
    // Mock: mark as idle
    const agent = ga(agentId);
    if (agent) agent.status = 'idle';
    if (typeof toast === 'function') toast(`⏹ Stopped ${agentId}`, 'info');
  }
  renderWorkbench();
}

// ═══════════════════════════════════════════════════════════
// LIVE UPDATES
// ═══════════════════════════════════════════════════════════

function startWorkbenchRefresh() {
  if (wbRefreshTimer) return;
  // Refresh every 10s
  wbRefreshTimer = setInterval(() => {
    if (!shouldPoll()) return;
    if (currentPage !== 'workbench') return;
    loadWorkbenchData();
  }, 10000);
}

function stopWorkbenchRefresh() {
  if (wbRefreshTimer) {
    clearInterval(wbRefreshTimer);
    wbRefreshTimer = null;
  }
}

// Wire into Bridge WebSocket for real-time feed events
if (typeof Bridge !== 'undefined') {
  Bridge.on('feed', (msg) => {
    if (currentPage !== 'workbench') return;
    if (!msg.data) return;
    const agentId = msg.data.agent;
    if (!agentId || !wbAgentActivity[agentId]) return;

    const event = {
      id: msg.data.id || 'ws-' + Date.now(),
      type: msg.data.type || 'info',
      content: msg.data.content || '',
      time: new Date(msg.data.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    wbAgentActivity[agentId].events.unshift(event);
    if (wbAgentActivity[agentId].events.length > 40) {
      wbAgentActivity[agentId].events = wbAgentActivity[agentId].events.slice(0, 40);
    }

    // Live-append to terminal without full re-render
    const terminal = document.getElementById(`wb-terminal-${agentId}`);
    if (terminal) {
      const eventEl = document.createElement('div');
      eventEl.className = `wb-event ${getWbEventClass(event.type)}`;
      eventEl.innerHTML = `
        <span class="wb-event-prefix">${getWbEventPrefix(event.type)}</span>
        <span class="wb-event-content">${escapeHtml(event.content)}</span>
        <span class="wb-event-time">${event.time}</span>
      `;
      // Insert before cursor if exists
      const cursor = terminal.querySelector('.wb-cursor');
      if (cursor) {
        terminal.insertBefore(eventEl, cursor);
      } else {
        terminal.appendChild(eventEl);
      }
      terminal.scrollTop = terminal.scrollHeight;
    }
  });
}
