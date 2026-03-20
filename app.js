/* Agent OS v5 — app.js — Core + Feed + Queue + Talk */
'use strict';

// Global polling pause when tab is hidden
let _tabVisible = true;
document.addEventListener('visibilitychange', () => {
  _tabVisible = !document.hidden;
  if (_tabVisible) console.log('[Polling] Tab visible — resuming');
});
function shouldPoll() { return _tabVisible; }

// Safe date helper — prevents crashes on invalid date strings
function safeDate(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}
function safeDateStr(v, fallback) {
  const d = safeDate(v);
  if (!d) return fallback || '';
  try { return d.toLocaleDateString([], { month: 'short', day: 'numeric' }); } catch { return fallback || ''; }
}

// ═══════════════════════════════════════════════════════════
// CORE UTILITIES
// ═══════════════════════════════════════════════════════════

const $ = id => document.getElementById(id);
const $$ = (sel, ctx = document) => ctx.querySelectorAll(sel);
const ga = id => AGENTS.find(a => a.id === id);

let currentPage = 'feed';
let notifications = [];

// Page titles
const PAGE_TITLES = {
  feed: 'Stream', queue: 'Proposals', talk: 'Talk',
  mind: 'Mind', pulse: 'System', board: 'Board',
  stream: 'Stream', command: 'Command', config: 'Config',
  schedule: 'Schedule', missions: 'Missions', explore: 'Explore',
  plans: 'Plans', briefing: 'Briefing', inbox: 'Inbox',
  rooms: 'Rooms', pipelines: 'Pipelines', roles: 'Roles',
  records: 'Records', tasks: 'Tasks', projects: 'Projects',
  workbench: 'Workbench'
};

// ── Navigation ────────────────────────────────────────────
let _channelSwitchLock = false;
function nav(page) {
  // Guard: don't navigate away from Talk during channel switch
  if (_channelSwitchLock && currentPage === 'talk' && page !== 'talk') return;
  // Redirect removed pages
  const redirects = { schedule: 'briefing', board: 'feed', config: 'feed', command: 'feed', stream: 'feed' };
  if (redirects[page]) page = redirects[page];
  if (currentPage === page) return;

  // Save scroll position before leaving
  const oldView = $('view-' + currentPage);
  if (oldView) {
    oldView._savedScroll = oldView.scrollTop;
    oldView.classList.remove('active');
    oldView.style.display = 'none';
  }

  // Update sidebar
  $$('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  $$('.mobile-nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));

  // Activate new
  const newView = $('view-' + page);
  if (newView) {
    newView.classList.remove('hidden');
    newView.style.display = '';
    newView.classList.add('active');
    // Restore scroll position
    if (newView._savedScroll) {
      requestAnimationFrame(() => { newView.scrollTop = newView._savedScroll; });
    }
  }

  currentPage = page;
  $('page-title').textContent = PAGE_TITLES[page] || page;
  document.title = `${PAGE_TITLES[page] || page} — Agent OS`;

  // Lazy init pages
  if (page === 'mind')     initMind();
  if (page === 'pulse')    renderPulse();
  if (page === 'board')    { if (typeof renderBoard === 'function') renderBoard(); }
  if (page === 'stream')   { if (typeof renderStreamItems === 'function') renderStreamItems(); }
  if (page === 'config')   { if (typeof renderConfig === 'function') renderConfig(); }
  if (page === 'command')  { if (typeof initCommand === 'function') initCommand(); }
  if (page === 'schedule') renderSchedule();
  if (page === 'tasks' && typeof initTasksPage === 'function') initTasksPage();
  if (page === 'projects' && typeof initProjectsPage === 'function') initProjectsPage();
  if (page === 'records' && typeof initRecords === 'function') initRecords();
  if (page === 'missions') renderMissions();
  if (page === 'explore')  renderExplore();
  if (page === 'plans')    { if (typeof renderPlansPage === 'function') renderPlansPage(); }
  if (page === 'queue') {
    // Load live proposals if bridge is active, then render
    if (typeof Bridge !== 'undefined' && Bridge.liveMode && typeof loadLiveProposals === 'function') {
      loadLiveProposals();
    } else {
      renderQueue();
    }
  }
  if (page === 'workbench') { if (typeof initWorkbench === 'function') initWorkbench(); }
  if (page === 'rooms') { if (typeof initRooms === 'function') initRooms(); }
  if (page === 'talk') {
    renderChannelList();
    if (typeof Bridge !== 'undefined' && Bridge.liveMode && typeof loadLiveMessages === 'function' && currentChannel) {
      loadLiveMessages(currentChannel);
    }
  }

  // Update quick actions for new page
  if (typeof updateQuickActions === 'function') updateQuickActions();

  // Close mobile sidebar
  const sidebar = $('sidebar');
  if (sidebar.classList.contains('mobile-open')) {
    sidebar.classList.remove('mobile-open');
  }
}

function toggleSidebar() {
  $('sidebar').classList.toggle('mobile-open');
}

// ── Toast ─────────────────────────────────────────────────
function toast(msg, type = 'info', duration = 3000) {
  const container = $('toast-container');
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  container.appendChild(t);
  setTimeout(() => t.remove(), duration);
}

// ── Discord Sync ──────────────────────────────────────────
function syncToDiscord(channel, content, agent) {
  // Simulated sync — shows a Discord sync toast
  const agentObj = ga(agent);
  const emoji = agentObj?.emoji || '👤';
  const ch = channel || 'dispatch';
  
  // Add to agent-feed as a sync record
  if (!DC_MESSAGES['agent-feed']) DC_MESSAGES['agent-feed'] = [];
  DC_MESSAGES['agent-feed'].push({
    id: 'sync_' + Date.now(),
    agent: agent === 'user' ? 'righthand' : agent,
    time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),
    ts: Date.now()/1000,
    text: `📡 **Synced from Agent OS** → #${ch}\n${content.substring(0,120)}${content.length>120?'...':''}`,
    reactions: [],
  });

  // Show sync toast
  const container = $('toast-container');
  const t = document.createElement('div');
  t.className = 'toast discord-sync';
  t.innerHTML = `<span style="font-size:16px">📡</span> <span>Synced to Discord <strong>#${ch}</strong></span>`;
  container.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

// ── Notifications ─────────────────────────────────────────
function addNotification(title, desc, icon = '🔔') {
  notifications.unshift({ title, desc, icon, time: new Date().toLocaleTimeString() });
  updateNotifBadge();
}

function updateNotifBadge() {
  const badge = $('notif-count');
  badge.textContent = notifications.length;
  badge.style.display = notifications.length > 0 ? '' : 'none';
}

function toggleNotifications() {
  const panel = $('notif-panel');
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) renderNotifications();
}

function clearNotifications() {
  notifications = [];
  updateNotifBadge();
  renderNotifications();
}

function renderNotifications() {
  const list = $('notif-list');
  if (notifications.length === 0) {
    list.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted)">No notifications</div>';
    return;
  }
  list.innerHTML = notifications.map(n => `
    <div class="notif-item">
      <span class="notif-icon">${n.icon}</span>
      <div class="notif-body">
        <div class="notif-title">${n.title}</div>
        <div class="notif-desc">${n.desc}</div>
      </div>
      <div class="notif-time">${n.time}</div>
    </div>
  `).join('');
}

// Close notif panel if click outside
document.addEventListener('click', e => {
  const panel = $('notif-panel');
  if (!panel.classList.contains('hidden') &&
      !panel.contains(e.target) &&
      !$('notif-btn').contains(e.target)) {
    panel.classList.add('hidden');
  }
});

// ═══════════════════════════════════════════════════════════
// XP / LEVELING SYSTEM
// ═══════════════════════════════════════════════════════════

let xpState = { xp: GROWTH.xp, level: GROWTH.level };

function addXP(amount, reason = '') {
  xpState.xp += amount;
  toast(`+${amount} XP ${reason ? '— ' + reason : ''}`, 'xp');
  checkLevelUp();
  updateXPDisplay();
}

function checkLevelUp() {
  const thresholds = GROWTH.thresholds;
  while (xpState.level < thresholds.length - 1 && xpState.xp >= thresholds[xpState.level + 1]) {
    xpState.level++;
    showLevelUp(xpState.level);
  }
}

function showLevelUp(level) {
  $('levelup-text').textContent = `You reached Level ${level}!`;
  $('levelup-overlay').classList.remove('hidden');
}

function closeLevelUp() {
  $('levelup-overlay').classList.add('hidden');
}

function showLevelPanel() {
  const t = GROWTH.thresholds;
  const cur = t[xpState.level] || 0;
  const next = t[xpState.level + 1] || xpState.xp;
  const pct = ((xpState.xp - cur) / (next - cur) * 100).toFixed(0);
  toast(`Level ${xpState.level} · ${xpState.xp} XP · ${pct}% to next level`, 'info', 4000);
}

function updateXPDisplay() {
  const t = GROWTH.thresholds;
  const cur = t[xpState.level] || 0;
  const next = t[xpState.level + 1] || xpState.xp + 1;
  const pct = ((xpState.xp - cur) / (next - cur) * 100);
  $('xp-badge').querySelector('span').textContent = `⭐ Lv${xpState.level}`;
  const fill = $('xp-bar-mini-fill');
  if (fill) fill.style.width = pct + '%';
  const sidXP = $('sidebar-xp');
  if (sidXP) sidXP.textContent = `Lv${xpState.level} · ${xpState.xp} XP`;
}

// ═══════════════════════════════════════════════════════════
// THE STREAM — Unified Action Feed
// ═══════════════════════════════════════════════════════════

let streamFilter = 'all';
let streamItems = [];
let streamFocusIdx = -1;
let streamSelectedIds = new Set();
let streamPollTimer = null;
let streamReadIds = new Set();
let streamInitialized = false;

// Legacy compat — keep feedEvents for other code that references it
let feedFilter = 'all';
let feedEvents = [...FEED_EVENTS];

const TYPE_ICONS = {
  task_started: '▶️', task_completed: '✅', file_changed: '📝',
  question_asked: '❓', error: '🔴', insight: '💡', vault_write: '📚',
  activity: '⚡', proposal: '📋', completion: '✅', question: '❓',
  system: '⚙️', vault: '📚',
};

const TYPE_LABELS = {
  task_started: 'started', task_completed: 'completed', file_changed: 'file',
  question_asked: 'question', error: 'error', insight: 'insight', vault_write: 'vault',
  activity: 'activity', proposal: 'decision', completion: 'done', question: 'question',
  system: 'system', vault: 'vault',
};

const STREAM_TYPE_COLORS = {
  activity: 'var(--accent2)', proposal: 'var(--yellow)', error: 'var(--red)',
  completion: 'var(--green)', vault: 'var(--accent)', question: 'var(--orange)',
  system: 'var(--text-muted)',
};

const STREAM_TYPE_BG = {
  activity: 'rgba(137,180,250,0.15)', proposal: 'rgba(249,226,175,0.15)',
  error: 'rgba(243,139,168,0.15)', completion: 'rgba(166,227,161,0.15)',
  vault: 'rgba(203,166,247,0.15)', question: 'rgba(250,179,135,0.15)',
  system: 'rgba(108,112,134,0.15)',
};

// Convert old FEED_EVENTS to stream items for fallback
function feedEventsToStreamItems(events) {
  return events.map(e => {
    const typeMap = {
      task_started: 'activity', task_completed: 'completion', file_changed: 'activity',
      question_asked: 'question', error: 'error', insight: 'activity', vault_write: 'vault',
    };
    return {
      id: e.id,
      type: typeMap[e.type] || 'activity',
      streamType: e.type,
      agent: e.agent,
      title: e.content,
      detail: '',
      time: new Date().toISOString(),
      displayTime: e.time,
      severity: e.type === 'error' ? 'error' : 'info',
      source: 'local',
      read: false,
      pinned: e.pinned || false,
      urgent: e.urgent || false,
    };
  });
}

function renderFeedSkeletons(count = 5) {
  const list = $('stream-list');
  if (!list) return;
  list.innerHTML = '';
  for (let i = 0; i < count; i++) {
    const skel = document.createElement('div');
    skel.className = 'stream-item';
    skel.style.padding = '14px';
    skel.innerHTML = `
      <div style="display:flex;gap:10px;align-items:center">
        <div class="skeleton skeleton-avatar" style="width:30px;height:30px"></div>
        <div class="skeleton-body" style="flex:1;display:flex;flex-direction:column;gap:6px">
          <div class="skeleton skeleton-line short"></div>
          <div class="skeleton skeleton-line long"></div>
        </div>
      </div>
    `;
    list.appendChild(skel);
  }
}

function renderFeed() {
  const list = $('stream-list');
  if (!list) return;

  if (!streamInitialized) {
    renderFeedSkeletons();
    streamInitialized = true;
    // Try fetching from bridge first, fall back to local data
    fetchStreamFromBridge().then(items => {
      if (items && items.length > 0) {
        streamItems = items;
      } else {
        streamItems = feedEventsToStreamItems(feedEvents);
        // Also add proposals from queueCards
        queueCards.forEach(q => {
          streamItems.push({
            id: q.id,
            type: q.type === 'approval' ? 'proposal' : 'question',
            streamType: q.type,
            agent: q.agent,
            title: q.question || 'Queue item',
            detail: q.context || '',
            time: q._createdAt || new Date().toISOString(),
            displayTime: '',
            severity: q.priority === 'urgent' ? 'action' : 'info',
            confidence: q._confidence || 0,
            priority: q._priority || (q.priority === 'urgent' ? 'P0' : 'P2'),
            choices: q.options || null,
            source: 'queue',
            read: false,
          });
        });
      }
      renderStreamItems();
    });
    // Start polling
    if (!streamPollTimer) {
      streamPollTimer = setInterval(pollStream, 5000);
    }
    return;
  }

  renderStreamItems();
}

async function fetchStreamFromBridge() {
  try {
    const r = await fetch('/api/stream?limit=50&filter=' + streamFilter);
    if (r.ok) return await r.json();
  } catch { /* bridge may be down */ }
  return null;
}

async function pollStream() {
  if (!shouldPoll()) return;
  if (currentPage !== 'feed') return;
  const items = await fetchStreamFromBridge();
  if (!items || items.length === 0) return;

  // Find truly new items
  const existingIds = new Set(streamItems.map(i => i.id));
  const newItems = items.filter(i => !existingIds.has(i.id));

  if (newItems.length > 0) {
    newItems.forEach(item => {
      item._isNew = true;
      streamItems.unshift(item);
    });

    // Check if user has scrolled down — show banner instead of jarring re-render
    const list = $('stream-list');
    const isScrolledDown = list && list.scrollTop > 100;
    if (isScrolledDown) {
      showNewItemsBanner(newItems.length);
    } else {
      renderStreamItems();
    }

    // Update badge
    const badge = $('feed-badge');
    if (badge) {
      const actionCount = streamItems.filter(i => !i.read && ['proposal', 'question', 'error'].includes(i.type)).length;
      badge.textContent = actionCount || '';
      badge.style.display = actionCount > 0 ? '' : 'none';
    }
    // Update chip counts
    updateFilterChipCounts();
  }
}

function renderStreamItems() {
  const list = $('stream-list');
  if (!list) return;
  list.innerHTML = '';

  // Apply filter
  let filtered = streamItems;
  if (streamFilter === 'action') filtered = streamItems.filter(i => ['proposal', 'question', 'error'].includes(i.type));
  else if (streamFilter === 'completed') filtered = streamItems.filter(i => i.type === 'completion');
  else if (streamFilter === 'conversations') filtered = streamItems.filter(i => i.type === 'activity' || i.type === 'question');
  else if (streamFilter === 'errors') filtered = streamItems.filter(i => i.severity === 'error' || i.severity === 'warn' || i.type === 'error');
  else if (streamFilter === 'vault') filtered = streamItems.filter(i => i.type === 'vault' || i.streamType === 'vault_write');
  else if (streamFilter === 'insights') filtered = streamItems.filter(i => i.type === 'activity' && (i.streamType === 'insight' || (i.title && i.title.toLowerCase().includes('insight'))));

  // Priority sort: action items first
  filtered.sort((a, b) => {
    const aAction = ['proposal', 'question'].includes(a.type) && !a.read ? 1 : 0;
    const bAction = ['proposal', 'question'].includes(b.type) && !b.read ? 1 : 0;
    if (aAction !== bAction) return bAction - aAction;
    return new Date(b.time) - new Date(a.time);
  });

  if (filtered.length === 0) {
    list.innerHTML = `<div class="stream-empty">
      <div class="stream-empty-icon">🌊</div>
      <div class="stream-empty-title">The Stream is quiet</div>
      <div class="stream-empty-desc">Events from agents, proposals, and system will appear here</div>
    </div>`;
    return;
  }

  filtered.forEach((item, idx) => list.appendChild(makeStreamItem(item, idx)));

  // Update filter chip counts
  updateFilterChipCounts();

  // Show batch bar if there are actionable items
  const batchBar = $('stream-batch-bar');
  if (batchBar) {
    const hasActionable = filtered.some(i => ['proposal', 'question'].includes(i.type));
    batchBar.style.display = hasActionable ? 'flex' : 'none';
  }
}

function makeStreamItem(item, idx) {
  const agent = ga(item.agent) || { emoji: '🤖', name: item.agent || 'System', color: '#cba6f7' };
  const typeColor = STREAM_TYPE_COLORS[item.type] || 'var(--text-dim)';
  const typeBg = STREAM_TYPE_BG[item.type] || 'var(--bg-raised)';
  const typeIcon = TYPE_ICONS[item.type] || TYPE_ICONS[item.streamType] || '📋';
  const typeLabel = TYPE_LABELS[item.type] || TYPE_LABELS[item.streamType] || item.type;
  const timeStr = item.displayTime || formatStreamTime(item.time);
  const isUnread = !item.read && !streamReadIds.has(item.id);
  const isActionable = ['proposal', 'question'].includes(item.type);

  const el = document.createElement('div');
  const isError = item.type === 'error';
  const isUrgentError = isError && (item.urgent || item.severity === 'error');
  const isCompleted = item.type === 'completion';
  el.className = `stream-item${isUnread ? ' unread' : ''}${item._isNew ? ' new-item' : ''}${isActionable ? ' selectable' : ''}${isUrgentError ? ' error-urgent' : ''}`;
  el.dataset.type = item.type;
  el.dataset.id = item.id;
  el.dataset.idx = idx;
  if (item._isNew) setTimeout(() => { item._isNew = false; el.classList.remove('new-item'); }, 1500);

  // Build action buttons based on type
  let actionsHTML = '';
  switch (item.type) {
    case 'activity':
      actionsHTML = `
        <button class="stream-action-btn" onclick="event.stopPropagation();streamAction('${item.id}','ack')">👍</button>
        <button class="stream-action-btn" onclick="event.stopPropagation();streamAction('${item.id}','pin')">📌</button>
        <button class="stream-action-btn" onclick="event.stopPropagation();streamAction('${item.id}','reply')">💬</button>
        <button class="stream-action-btn" onclick="event.stopPropagation();streamAction('${item.id}','retry')">🔄</button>`;
      break;
    case 'proposal':
      actionsHTML = `
        <button class="stream-action-btn approve" onclick="event.stopPropagation();streamAction('${item.id}','approve')">✅</button>
        <button class="stream-action-btn reject" onclick="event.stopPropagation();streamAction('${item.id}','reject')">❌</button>
        <button class="stream-action-btn" onclick="event.stopPropagation();streamAction('${item.id}','defer')">⏸️</button>`;
      break;
    case 'error':
      actionsHTML = `
        <button class="stream-action-btn" onclick="event.stopPropagation();streamAction('${item.id}','fix')">🔧</button>
        <button class="stream-action-btn" onclick="event.stopPropagation();streamAction('${item.id}','mute')">🔇</button>
        <button class="stream-action-btn" onclick="event.stopPropagation();streamAction('${item.id}','task')">📋</button>`;
      break;
    case 'question':
      actionsHTML = `
        <button class="stream-action-btn" onclick="event.stopPropagation();streamAction('${item.id}','reply')">💬</button>`;
      break;
    case 'completion':
      actionsHTML = `
        <button class="stream-action-btn approve" onclick="event.stopPropagation();streamAction('${item.id}','accept')">✅</button>
        <button class="stream-action-btn" onclick="event.stopPropagation();streamAction('${item.id}','redo')">🔄</button>
        <button class="stream-action-btn" onclick="event.stopPropagation();streamAction('${item.id}','reply')">💬</button>`;
      break;
    case 'vault':
      actionsHTML = `
        <button class="stream-action-btn" onclick="event.stopPropagation();goToEntity('note','${(item.title||'').replace(/'/g,"\\'")}','${(item.title||'').replace(/'/g,"\\'")}')" title="View in Mind">👁️</button>
        <button class="stream-action-btn" onclick="event.stopPropagation();streamAction('${item.id}','link')">🔗</button>`;
      break;
    case 'system':
      actionsHTML = `
        <button class="stream-action-btn" onclick="event.stopPropagation();streamAction('${item.id}','investigate')">🔧</button>
        <button class="stream-action-btn" onclick="event.stopPropagation();streamAction('${item.id}','mute')">🔇</button>`;
      break;
  }

  // Expanded detail content
  let detailHTML = '';
  if (item.detail) {
    detailHTML = `<div class="stream-item-detail-text">${item.detail.replace(/`([^`]+)`/g, '<code>$1</code>')}</div>`;
  }
  if (item.type === 'proposal') {
    const confPct = Math.round((item.confidence || 0) * 100);
    const confColor = confPct > 80 ? '#a6e3a1' : confPct > 60 ? '#f9e2af' : '#f38ba8';
    detailHTML += `
      <div class="stream-confidence-bar" style="width:${confPct}%;background:${confColor}"></div>
      ${item.linkedMission ? `<div class="stream-linked-mission entity-link entity-mission" onclick="event.stopPropagation();goToEntity('mission','${item.linkedMission}','${item.linkedMission}')">🔗 ${item.linkedMission}</div>` : ''}
      <div class="stream-proposal-actions">
        <button class="stream-proposal-btn approve" onclick="streamAction('${item.id}','approve')">✅ Approve</button>
        <button class="stream-proposal-btn edit" onclick="streamAction('${item.id}','edit')">📝 Edit</button>
        <button class="stream-proposal-btn reject" onclick="streamAction('${item.id}','reject')">❌ Reject</button>
        <button class="stream-proposal-btn defer" onclick="streamAction('${item.id}','defer')">⏸️ Defer</button>
      </div>`;
  }
  if (item.type === 'question' && item.choices) {
    const choices = Array.isArray(item.choices) ? item.choices : [];
    detailHTML += `<div class="stream-quick-replies">
      ${choices.map(c => `<button class="stream-quick-reply-btn" onclick="streamReply('${item.id}','${c.replace(/'/g, "\\'")}')">${c}</button>`).join('')}
    </div>`;
  }
  // Inline reply box (for all types)
  detailHTML += `<div class="stream-reply-box" id="reply-${item.id}">
    <input class="stream-reply-input" placeholder="Reply to ${agent.name}..." onkeydown="if(event.key==='Enter'){streamSendReply('${item.id}',this.value);event.preventDefault();}">
    <button class="stream-reply-send" onclick="streamSendReply('${item.id}',this.previousElementSibling.value)">Send</button>
  </div>`;

  el.innerHTML = `
    <div class="stream-item-header" onclick="toggleStreamExpand('${item.id}')">
      <input type="checkbox" class="stream-item-checkbox" onclick="event.stopPropagation();toggleStreamSelect('${item.id}',this.checked)" ${streamSelectedIds.has(item.id) ? 'checked' : ''}>
      <div class="stream-item-icon" style="background:${agent.color}20;border-color:${agent.color}">${agent.emoji}</div>
      <span class="stream-item-agent" style="color:${agent.color};cursor:pointer" onclick="event.stopPropagation();goToEntity('agent','${item.agent}','${agent.name}')">${agent.name}</span>
      <span class="stream-item-type-badge" style="background:${typeBg};color:${typeColor}">${typeIcon} ${typeLabel}</span>
      <span class="stream-item-title">${(item.title || '').replace(/`([^`]+)`/g, '<code>$1</code>')}</span>
      <span class="stream-item-time">${timeStr}</span>
      <div class="stream-item-actions">${actionsHTML}</div>
    </div>
    <div class="stream-item-detail">${detailHTML}</div>
  `;
  return el;
}

// Add stream event (used by simulation engine and live.js)
function addStreamEvent(event) {
  if (!event) return;
  const agent = ga(event.agent) || { emoji: '🤖', name: event.agent || 'System', color: '#cba6f7' };
  const typeMap = { debug: 'system', info: 'activity', warn: 'system', error: 'error' };
  const newItem = {
    id: event.id || 'se_' + Date.now(),
    type: typeMap[event.level] || 'activity',
    streamType: event.level || 'info',
    agent: event.agent || 'righthand',
    title: event.text || '',
    detail: '',
    time: new Date().toISOString(),
    displayTime: event.time || '',
    severity: event.level || 'info',
    source: 'system',
    read: false,
  };
  if (!streamItems.find(i => i.id === newItem.id)) {
    streamItems.push(newItem);
  }
}

function formatStreamTime(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

function toggleStreamExpand(itemId) {
  const el = document.querySelector(`.stream-item[data-id="${itemId}"]`);
  if (!el) return;
  const wasExpanded = el.classList.contains('expanded');
  // Collapse all others
  $$('.stream-item.expanded').forEach(e => e.classList.remove('expanded'));
  if (!wasExpanded) {
    el.classList.add('expanded');
    // Mark as read
    streamReadIds.add(itemId);
    el.classList.remove('unread');
    const item = streamItems.find(i => i.id === itemId);
    if (item) item.read = true;
  }
}

function filterStream2(type) {
  streamFilter = type;
  $$('.stream-chip').forEach(c => c.classList.toggle('active', c.dataset.filter === type));
  renderStreamItems();
}

// Legacy compat
function filterFeed(type) {
  // Map old filter types to stream types
  const map = { all: 'all', error: 'errors', question_asked: 'action', task_completed: 'completed', vault_write: 'all', insight: 'all' };
  filterStream2(map[type] || 'all');
}

async function streamAction(itemId, action) {
  const item = streamItems.find(i => i.id === itemId);
  if (!item) return;
  const agent = ga(item.agent) || { name: item.agent || 'Agent' };
  const baseUrl = (typeof Bridge !== 'undefined' && Bridge.baseUrl) ? Bridge.baseUrl : '';

  // If this is a proposal, resolve via the proposals API
  if (item.type === 'proposal' && (action === 'approve' || action === 'reject' || action === 'defer')) {
    const proposalId = item.id.startsWith('prop-') ? item.id : item.id;
    const apiAction = action === 'reject' ? 'dismiss' : action === 'defer' ? 'dismiss' : 'approve';
    try {
      await fetch(`${baseUrl}/api/proposals/${proposalId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: apiAction }),
      });
    } catch (e) {
      toast(`❌ Action failed: ${e.message}`, 'error');
      return;
    }
  } else {
    // POST generic stream action
    fetch(`${baseUrl}/api/stream/${itemId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, value: null }),
    }).catch(() => {});
  }

  switch (action) {
    case 'approve':
    case 'accept':
      toast(`✅ Approved ${agent.name}'s work`, 'success');
      addXP(10, 'approved');
      removeStreamItem(itemId);
      break;
    case 'reject':
      toast(`❌ Rejected — feedback sent to ${agent.name}`, 'error');
      removeStreamItem(itemId);
      break;
    case 'defer':
      toast('⏸️ Deferred', 'info');
      removeStreamItem(itemId);
      break;
    case 'ack':
      toast('👍 Acknowledged', 'success');
      addXP(5, 'ack');
      markStreamRead(itemId);
      break;
    case 'pin':
      toast('📌 Pinned to vault', 'success');
      break;
    case 'reply':
      // Toggle inline reply box
      const replyBox = document.getElementById('reply-' + itemId);
      if (replyBox) {
        replyBox.classList.toggle('visible');
        if (replyBox.classList.contains('visible')) {
          const input = replyBox.querySelector('.stream-reply-input');
          if (input) input.focus();
          // Auto-expand the item
          const el = document.querySelector(`.stream-item[data-id="${itemId}"]`);
          if (el && !el.classList.contains('expanded')) el.classList.add('expanded');
        }
      }
      break;
    case 'retry':
      toast('🔄 Retrying...', 'info');
      break;
    case 'fix':
      toast('🔧 Dispatching fix to agent...', 'info');
      addXP(5, 'fix dispatch');
      break;
    case 'mute':
      toast('🔇 Category muted', 'info');
      removeStreamItem(itemId);
      break;
    case 'task':
      toast('📋 Task created from error', 'success');
      addXP(5, 'task created');
      break;
    case 'redo':
      toast('🔄 Sent back for rework', 'info');
      break;
    case 'preview':
      toast('👁️ Opening vault preview...', 'info');
      goToEntity('note', item.title || item.id, item.title);
      break;
    case 'edit':
      toast('📝 Edit mode — not yet implemented', 'info');
      break;
    case 'link':
      toast('🔗 Link to mission — select mission...', 'info');
      break;
    case 'investigate':
      toast('🔧 Investigating system event...', 'info');
      nav('pulse');
      break;
  }
}

function streamReply(itemId, text) {
  if (!text) return;
  streamSendReply(itemId, text);
}

async function streamSendReply(itemId, text) {
  if (!text || !text.trim()) return;
  const item = streamItems.find(i => i.id === itemId);
  if (!item) return;
  const agent = ga(item.agent) || { name: item.agent || 'Agent' };
  const baseUrl = (typeof Bridge !== 'undefined' && Bridge.baseUrl) ? Bridge.baseUrl : '';

  try {
    // Post to agent chat endpoint for real dispatch
    await fetch(`${baseUrl}/api/agent/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text.trim(),
        agent: item.agent,
        context: `stream-reply:${itemId}`,
        page: 'feed',
      }),
    });

    // Also post as stream action
    fetch(`${baseUrl}/api/stream/${itemId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reply', value: text.trim() }),
    }).catch(() => {});

    toast(`💬 Reply sent to ${agent.name}`, 'success');
    addXP(5, 'replied');
  } catch (e) {
    toast(`❌ Reply failed: ${e.message}`, 'error');
  }

  markStreamRead(itemId);

  // Clear input
  const replyBox = document.getElementById('reply-' + itemId);
  if (replyBox) {
    const input = replyBox.querySelector('.stream-reply-input');
    if (input) input.value = '';
    replyBox.classList.remove('visible');
  }
}

function removeStreamItem(itemId) {
  streamItems = streamItems.filter(i => i.id !== itemId);
  const el = document.querySelector(`.stream-item[data-id="${itemId}"]`);
  if (el) {
    el.style.opacity = '0';
    el.style.transform = 'translateX(100%)';
    el.style.transition = 'all 0.3s ease';
    setTimeout(() => el.remove(), 300);
  }
}

function markStreamRead(itemId) {
  streamReadIds.add(itemId);
  const item = streamItems.find(i => i.id === itemId);
  if (item) item.read = true;
  const el = document.querySelector(`.stream-item[data-id="${itemId}"]`);
  if (el) el.classList.remove('unread');
}

// Batch actions
function toggleStreamSelect(itemId, checked) {
  if (checked) streamSelectedIds.add(itemId);
  else streamSelectedIds.delete(itemId);
  updateStreamBatchCount();
}

function toggleSelectAllStream(checked) {
  const checkboxes = $$('.stream-item-checkbox');
  checkboxes.forEach(cb => {
    cb.checked = checked;
    const id = cb.closest('.stream-item')?.dataset.id;
    if (id) {
      if (checked) streamSelectedIds.add(id);
      else streamSelectedIds.delete(id);
    }
  });
  updateStreamBatchCount();
}

function updateStreamBatchCount() {
  const el = $('stream-batch-count');
  if (el) el.textContent = streamSelectedIds.size + ' selected';
}

function batchStreamAction(action) {
  if (streamSelectedIds.size === 0) { toast('No items selected', 'info'); return; }
  const count = streamSelectedIds.size;
  streamSelectedIds.forEach(id => streamAction(id, action));
  streamSelectedIds.clear();
  updateStreamBatchCount();
  toast(`Batch ${action}: ${count} items`, 'success');
}

// Keyboard shortcuts for The Stream
document.addEventListener('keydown', e => {
  if (currentPage !== 'feed') return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (paletteOpen) return;

  const items = $$('.stream-item');
  if (items.length === 0) return;

  switch (e.key) {
    case 'j': // Next item
      e.preventDefault();
      streamFocusIdx = Math.min(streamFocusIdx + 1, items.length - 1);
      updateStreamFocus(items);
      break;
    case 'k': // Previous item
      e.preventDefault();
      streamFocusIdx = Math.max(streamFocusIdx - 1, 0);
      updateStreamFocus(items);
      break;
    case 'Enter': // Expand focused
      e.preventDefault();
      if (streamFocusIdx >= 0 && items[streamFocusIdx]) {
        const id = items[streamFocusIdx].dataset.id;
        if (id) toggleStreamExpand(id);
      }
      break;
    case 'a': // Approve focused
      e.preventDefault();
      if (streamFocusIdx >= 0 && items[streamFocusIdx]) {
        const id = items[streamFocusIdx].dataset.id;
        if (id) streamAction(id, 'approve');
      }
      break;
    case 'r': // Reject focused
      e.preventDefault();
      if (streamFocusIdx >= 0 && items[streamFocusIdx]) {
        const id = items[streamFocusIdx].dataset.id;
        if (id) streamAction(id, 'reject');
      }
      break;
    case 'd': // Defer focused
      e.preventDefault();
      if (streamFocusIdx >= 0 && items[streamFocusIdx]) {
        const id = items[streamFocusIdx].dataset.id;
        if (id) streamAction(id, 'defer');
      }
      break;
    case '/': // Focus omnibus / command palette
      e.preventDefault();
      openCommandPalette();
      break;
  }
});

function updateStreamFocus(items) {
  items.forEach((el, i) => el.classList.toggle('focused', i === streamFocusIdx));
  if (streamFocusIdx >= 0 && items[streamFocusIdx]) {
    items[streamFocusIdx].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function openTalkWithAgent(agentId) {
  nav('talk');
  setTimeout(() => selectDM(agentId), 200);
}

// Live feed updates (called from simulation) — now adds to stream
function prependFeedCard(event) {
  feedEvents.unshift(event);
  // Add to stream
  const typeMap = {
    task_started: 'activity', task_completed: 'completion', file_changed: 'activity',
    question_asked: 'question', error: 'error', insight: 'activity', vault_write: 'vault',
  };
  const newItem = {
    id: event.id,
    type: typeMap[event.type] || 'activity',
    streamType: event.type,
    agent: event.agent,
    title: event.content,
    detail: '',
    time: new Date().toISOString(),
    displayTime: event.time,
    severity: event.type === 'error' ? 'error' : 'info',
    source: 'local',
    read: false,
    _isNew: true,
  };
  // Avoid duplicates
  if (!streamItems.find(i => i.id === event.id)) {
    streamItems.unshift(newItem);
    if (currentPage === 'feed') {
      const list = $('stream-list');
      if (list && list.firstChild && !list.querySelector('.stream-empty')) {
        const el = makeStreamItem(newItem, 0);
        list.insertBefore(el, list.firstChild);
      }
    }
  }
  addNotification(
    `${(ga(event.agent) || {}).name || event.agent}: ${TYPE_LABELS[event.type] || event.type}`,
    (event.content || '').substring(0, 80),
    TYPE_ICONS[event.type] || '🔔'
  );
}

// ═══════════════════════════════════════════════════════════
// QUEUE PAGE — Proposals "Daily Brief" Redesign
// ═══════════════════════════════════════════════════════════

let queueCards = QUEUE_QUESTIONS.map(q => ({ ...q, remaining: q.ttl - q.elapsed }));
let qStats = { answered: 0, autoresolved: 0, expired: 0 };
let qTimerInterval = null;
let _proposalFilter = 'all';
let _lastProposalSync = Date.now();

const PRIORITY_COLORS = { P0: '#f38ba8', P1: '#fab387', P2: '#89b4fa', P3: '#6c7086' };
const SOURCE_AGENTS = {
  researcher: { emoji: '🔬', name: 'Researcher', color: '#89b4fa' },
  coder: { emoji: '💻', name: 'Coder', color: '#a6e3a1' },
  ops: { emoji: '⚙️', name: 'Ops', color: '#fab387' },
  righthand: { emoji: '🤝', name: 'Right Hand', color: '#E8A838' },
  utility: { emoji: '🔧', name: 'Utility', color: '#cba6f7' },
  orchestrator: { emoji: '🎯', name: 'Orchestrator', color: '#f5c2e7' },
  unknown: { emoji: '🤖', name: 'Agent', color: '#6c7086' },
};

function getSourceAgent(source) {
  if (!source) return SOURCE_AGENTS.unknown;
  const key = source.toLowerCase().replace(/[^a-z]/g, '');
  return SOURCE_AGENTS[key] || ga(source) || SOURCE_AGENTS.unknown;
}

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

function getConfidenceColor(c) {
  if (c > 0.8) return '#a6e3a1';
  if (c > 0.6) return '#f9e2af';
  return '#f38ba8';
}

function getNormalizedPriority(q) {
  return q._priority || (q.priority === 'urgent' ? 'P0' : q.priority === 'normal' ? 'P2' : 'P3');
}

function filterProposals(filter) {
  _proposalFilter = filter;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.toggle('active', c.dataset.filter === filter));
  renderQueue();
}

function applyProposalFilter(cards) {
  if (_proposalFilter === 'all') return cards;
  if (_proposalFilter === 'pending') return cards.filter(q => (q._status || 'pending') === 'pending');
  if (_proposalFilter === 'approved') return cards.filter(q => q._status === 'approved' || q._status === 'auto-approved');
  if (_proposalFilter === 'dismissed') return cards.filter(q => q._status === 'dismissed' || q._status === 'rejected');
  return cards;
}

let _selectedProposalId = null;

function renderQueue() {
  _lastProposalSync = Date.now();

  const syncEl = document.getElementById('proposals-sync-indicator');
  if (syncEl) syncEl.textContent = 'Synced just now';

  const listEl = document.getElementById('proposals-list');
  const emptyEl = document.getElementById('queue-empty');
  const mainEl = document.getElementById('proposals-main');

  if (queueCards.length === 0) {
    if (emptyEl) emptyEl.classList.remove('hidden');
    if (mainEl) mainEl.classList.add('hidden');
    return;
  }
  if (emptyEl) emptyEl.classList.add('hidden');
  if (mainEl) mainEl.classList.remove('hidden');

  // Count badge
  const pending = queueCards.filter(q => (q._status || 'pending') === 'pending');
  const countBadge = document.getElementById('proposals-count-badge');
  if (countBadge) countBadge.textContent = `${queueCards.length} total`;

  // Pipeline summary
  renderProposalPipeline(queueCards);

  // Apply filter
  const filtered = applyProposalFilter(queueCards);

  // Sort: pending first, then by priority
  const sorted = [...filtered].sort((a, b) => {
    const statusOrder = { pending: 0, approved: 1, 'auto-approved': 1, dismissed: 2, rejected: 2 };
    const sa = statusOrder[a._status || 'pending'] || 0;
    const sb = statusOrder[b._status || 'pending'] || 0;
    if (sa !== sb) return sa - sb;
    const pa = parseInt((getNormalizedPriority(a) || 'P3').replace('P', ''));
    const pb = parseInt((getNormalizedPriority(b) || 'P3').replace('P', ''));
    return pa - pb;
  });

  if (!listEl) return;
  listEl.innerHTML = sorted.length === 0
    ? '<div class="proposals-empty-hint" style="padding:40px;text-align:center;color:var(--text-muted)">No proposals match this filter</div>'
    : sorted.map(q => makeProposalCard(q)).join('');

  // Update filter chip counts
  const chips = document.querySelectorAll('.filter-chip');
  chips.forEach(c => {
    const f = c.dataset.filter;
    let count = 0;
    if (f === 'all') count = queueCards.length;
    else if (f === 'pending') count = queueCards.filter(q => (q._status || 'pending') === 'pending').length;
    else if (f === 'approved') count = queueCards.filter(q => q._status === 'approved' || q._status === 'auto-approved').length;
    else if (f === 'dismissed') count = queueCards.filter(q => q._status === 'dismissed' || q._status === 'rejected').length;
    const label = { all: 'All', pending: 'Pending', approved: 'Approved', dismissed: 'Dismissed' }[f] || f;
    c.textContent = `${label} (${count})`;
  });

  // Update nav badges
  const badge = document.getElementById('proposals-badge');
  if (badge) { badge.textContent = pending.length || ''; badge.style.display = pending.length > 0 ? '' : 'none'; }

  // Re-select detail if open
  if (_selectedProposalId) {
    const still = queueCards.find(q => q.id === _selectedProposalId);
    if (still) showProposalDetail(still);
    else closeProposalDetail();
  }

  if (!qTimerInterval) {
    qTimerInterval = setInterval(tickSyncIndicator, 10000);
  }
}

function renderProposalPipeline(cards) {
  const el = document.getElementById('proposals-pipeline');
  if (!el) return;

  const total = cards.length;
  const pendingCount = cards.filter(q => (q._status || 'pending') === 'pending').length;
  const approvedCount = cards.filter(q => q._status === 'approved' || q._status === 'auto-approved').length;
  const dismissedCount = cards.filter(q => q._status === 'dismissed' || q._status === 'rejected').length;

  const stages = [
    { label: 'Total', count: total, color: '#cba6f7', filter: 'all' },
    { label: 'Pending', count: pendingCount, color: '#f9e2af', filter: 'pending' },
    { label: 'Approved', count: approvedCount, color: '#a6e3a1', filter: 'approved' },
    { label: 'Dismissed', count: dismissedCount, color: '#6c7086', filter: 'dismissed' },
  ];

  el.innerHTML = stages.map((s, i) =>
    `<button class="pipeline-stage" style="--stage-color:${s.color}" onclick="filterProposals('${s.filter}')">` +
    `<span class="pipeline-count">${s.count}</span>` +
    `<span class="pipeline-label">${s.label}</span>` +
    `</button>` +
    (i < stages.length - 1 ? '<span class="pipeline-arrow">→</span>' : '')
  ).join('');
}

function makeProposalCard(q) {
  const priority = getNormalizedPriority(q);
  const priorityColor = PRIORITY_COLORS[priority] || PRIORITY_COLORS.P3;
  const source = getSourceAgent(q._source || q.agent);
  const confidence = q._confidence || 0;
  const confColor = getConfidenceColor(confidence);
  const confWidth = Math.round(confidence * 100);
  const proposalType = q._type || 'idea';
  const typeEmojis = { research: '🔬', dispatch: '🚀', improvement: '⚡', idea: '💡', build: '🔨', question: '❓' };
  const created = timeAgo(q._createdAt);
  const status = q._status || 'pending';
  const statusColors = { pending: '#f9e2af', approved: '#a6e3a1', 'auto-approved': '#a6e3a1', dismissed: '#6c7086', rejected: '#6c7086' };
  const statusLabels = { pending: 'Pending', approved: 'Approved', 'auto-approved': 'Auto-Approved', dismissed: 'Dismissed', rejected: 'Rejected' };
  const statusColor = statusColors[status] || '#6c7086';
  const isSelected = _selectedProposalId === q.id;
  const title = (q.question || q.title || 'Untitled');
  const safeTitle = title.replace(/'/g, "\\'").replace(/"/g, '&quot;');
  const context = q.context || q.body || '';
  const truncContext = context.length > 120 ? context.substring(0, 120) + '…' : context;

  return `
    <div class="proposal-card ${isSelected ? 'selected' : ''}" id="qcard-${q.id}" style="--priority-color:${priorityColor}" onclick="selectProposal('${q.id}')">
      <div class="proposal-card-top">
        <div class="proposal-card-title">${title}</div>
        <span class="proposal-status-badge" style="background:${statusColor}20;color:${statusColor}">${statusLabels[status] || status}</span>
      </div>
      <div class="proposal-card-meta">
        <span class="proposal-source-badge" style="background:${source.color}18;color:${source.color}">${source.emoji} ${source.name}</span>
        <span class="proposal-type-badge">${typeEmojis[proposalType] || '📝'} ${proposalType}</span>
        <span class="proposal-priority-pill" style="background:${priorityColor}20;color:${priorityColor}">${priority}</span>
        <span class="proposal-confidence-pill" style="color:${confColor}" title="Confidence: ${confWidth}%">⬤ ${confWidth}%</span>
        ${created ? `<span class="proposal-time">${created}</span>` : ''}
      </div>
      ${truncContext ? `<div class="proposal-card-context">${truncContext}</div>` : ''}
    </div>`;
}

function selectProposal(id) {
  const q = queueCards.find(c => c.id === id);
  if (!q) return;
  _selectedProposalId = id;
  // Highlight selected card
  document.querySelectorAll('.proposal-card').forEach(c => c.classList.remove('selected'));
  const card = document.getElementById('qcard-' + id);
  if (card) card.classList.add('selected');
  showProposalDetail(q);
}

function showProposalDetail(q) {
  const panel = document.getElementById('proposals-detail-panel');
  if (!panel) return;
  panel.classList.remove('hidden');

  const source = getSourceAgent(q._source || q.agent);
  const priority = getNormalizedPriority(q);
  const priorityColor = PRIORITY_COLORS[priority] || PRIORITY_COLORS.P3;
  const confidence = q._confidence || 0;
  const confColor = getConfidenceColor(confidence);
  const confWidth = Math.round(confidence * 100);
  const status = q._status || 'pending';
  const statusColors = { pending: '#f9e2af', approved: '#a6e3a1', 'auto-approved': '#a6e3a1', dismissed: '#6c7086', rejected: '#6c7086' };
  const statusLabels = { pending: 'Pending', approved: 'Approved', 'auto-approved': 'Auto-Approved', dismissed: 'Dismissed', rejected: 'Rejected' };
  const statusColor = statusColors[status] || '#6c7086';
  const proposalType = q._type || 'idea';
  const typeEmojis = { research: '🔬', dispatch: '🚀', improvement: '⚡', idea: '💡', build: '🔨', question: '❓' };
  const created = timeAgo(q._createdAt);
  const body = q.context || q.body || '';
  const triageReason = q._triageReason || q.triage_reason || '';
  const triageVerdict = q._triageVerdict || q.triage_verdict || '';

  let actionsHTML = '';
  if (status === 'pending') {
    actionsHTML = `
      <div class="proposal-detail-actions">
        <button class="proposal-action-btn approve" onclick="resolveProposalAction('${q.id}','approve')">✅ Approve</button>
        <button class="proposal-action-btn approve-track" onclick="approveAndTrack('${q.id}')">🚀 Approve & Track</button>
        <button class="proposal-action-btn reject" onclick="resolveProposalAction('${q.id}','reject')">❌ Dismiss</button>
      </div>`;
  } else if (status === 'approved' || status === 'auto-approved') {
    actionsHTML = `
      <div class="proposal-detail-actions">
        <div class="proposal-detail-status-info" style="color:#a6e3a1">✅ This proposal was approved</div>
        <button class="proposal-action-btn approve-track" onclick="approveAndTrack('${q.id}')">📋 Create Task</button>
      </div>`;
  } else if (status === 'dismissed' || status === 'rejected') {
    actionsHTML = `
      <div class="proposal-detail-actions">
        <div class="proposal-detail-status-info" style="color:#6c7086">❌ This proposal was dismissed</div>
        ${triageReason ? `<div class="proposal-detail-dismiss-reason">${triageReason}</div>` : ''}
        <button class="proposal-action-btn edit" onclick="reopenProposal('${q.id}')">🔄 Reopen</button>
      </div>`;
  }

  panel.innerHTML = `
    <div class="proposal-detail-header">
      <h3 class="proposal-detail-title">${q.question || q.title || 'Untitled'}</h3>
      <button class="proposal-detail-close" onclick="closeProposalDetail()">✕</button>
    </div>
    <div class="proposal-detail-meta">
      <span class="proposal-status-badge" style="background:${statusColor}20;color:${statusColor};font-size:12px;padding:3px 10px;border-radius:8px">${statusLabels[status] || status}</span>
      <span class="proposal-source-badge" style="background:${source.color}18;color:${source.color}">${source.emoji} ${source.name}</span>
      <span class="proposal-type-badge">${typeEmojis[proposalType] || '📝'} ${proposalType}</span>
      <span class="proposal-priority-pill" style="background:${priorityColor}20;color:${priorityColor}">${priority}</span>
    </div>
    <div class="proposal-detail-confidence">
      <span style="font-size:12px;color:var(--text-muted)">Confidence</span>
      <div class="proposal-confidence-bar-wrap">
        <div class="proposal-confidence-bar-detail" style="width:${confWidth}%;background:${confColor}"></div>
      </div>
      <span style="font-size:12px;color:${confColor}">${confWidth}%</span>
    </div>
    ${created ? `<div class="proposal-detail-time" style="font-size:12px;color:var(--text-muted);margin-bottom:12px">Created ${created}</div>` : ''}
    <div class="proposal-detail-section">
      <h4>Description</h4>
      <div class="proposal-detail-body">${body || '<span style="color:var(--text-muted)">No description provided</span>'}</div>
    </div>
    ${triageVerdict ? `
    <div class="proposal-detail-section">
      <h4>Triage Analysis</h4>
      <div class="proposal-detail-body">
        <strong>Verdict:</strong> ${triageVerdict}
        ${triageReason ? `<br><strong>Reason:</strong> ${triageReason}` : ''}
      </div>
    </div>` : ''}
    ${q.options ? `
    <div class="proposal-detail-section">
      <h4>Options</h4>
      <div class="proposal-detail-options">
        ${(Array.isArray(q.options) ? q.options : Object.values(q.options)).map((opt, i) => {
          const label = typeof opt === 'string' ? opt : (opt.label || String(opt));
          return `<div class="proposal-detail-option">${i + 1}. ${label}</div>`;
        }).join('')}
      </div>
    </div>` : ''}
    ${actionsHTML}
  `;
}

function closeProposalDetail() {
  _selectedProposalId = null;
  const panel = document.getElementById('proposals-detail-panel');
  if (panel) panel.classList.add('hidden');
  document.querySelectorAll('.proposal-card').forEach(c => c.classList.remove('selected'));
}

function approveAndTrack(id) {
  if (typeof Bridge === 'undefined' || !Bridge.liveMode) {
    toast('Connect bridge first', 'error');
    return;
  }
  Bridge.apiFetch('/api/proposals/' + id + '/approve-and-track', { method: 'POST' })
    .then(() => {
      toast('🚀 Approved & task created', 'success');
      loadLiveProposals();
    })
    .catch(e => toast('Failed: ' + e.message, 'error'));
}

function reopenProposal(id) {
  if (typeof Bridge === 'undefined' || !Bridge.liveMode) {
    toast('Connect bridge first', 'error');
    return;
  }
  // Reopen = resolve with 'pending' decision
  Bridge.apiFetch('/api/proposals/' + id + '/resolve', {
    method: 'POST',
    body: JSON.stringify({ decision: 'reopen', reason: 'Reopened from UI' })
  })
    .then(() => {
      toast('🔄 Proposal reopened', 'success');
      loadLiveProposals();
    })
    .catch(e => toast('Failed: ' + e.message, 'error'));
}

function resolveProposalAction(qId, action) {
  if (typeof Bridge !== 'undefined' && Bridge.liveMode) {
    const decision = action === 'reject' ? 'dismissed' : action;
    Bridge.apiFetch('/api/proposals/' + qId + '/resolve', {
      method: 'POST',
      body: JSON.stringify({ decision: decision, reason: 'Resolved from UI' })
    }).then(() => {
      loadLiveProposals();
      const msgs = { approve: '✅ Proposal approved', reject: '❌ Proposal dismissed' };
      toast(msgs[action] || '✅ Done', action === 'approve' ? 'success' : 'info');
    }).catch(e => toast('Failed: ' + e.message, 'error'));
  } else {
    // Offline fallback
    const q = queueCards.find(c => c.id === qId);
    if (q) q._status = action === 'approve' ? 'approved' : 'dismissed';
    renderQueue();
    toast(action === 'approve' ? '✅ Proposal approved' : '❌ Proposal dismissed', 'info');
  }
}

function batchApproveSafe() {
  const safe = queueCards.filter(q => (q._status === 'pending' || !q._status) && (q._confidence || 0) > 0.85);
  if (safe.length === 0) { toast('No safe proposals to approve', 'info'); return; }
  safe.forEach(q => resolveProposalAction(q.id, 'approve'));
  toast('✅ Batch approved ' + safe.length + ' safe proposals', 'success');
}

function toggleResolvedSection() {
  // Legacy compat — no longer used but keep to avoid errors
}

function tickSyncIndicator() {
  if (!shouldPoll()) return;
  const el = document.getElementById('proposals-sync-indicator');
  if (!el) return;
  const diff = Math.floor((Date.now() - _lastProposalSync) / 1000);
  if (diff < 10) el.textContent = 'Synced just now';
  else if (diff < 60) el.textContent = `Synced ${diff}s ago`;
  else el.textContent = `Synced ${Math.floor(diff / 60)}m ago`;
}

function makeQueueCard(q) {
  const agent = ga(q.agent) || { emoji: '🤖', name: q.agent, color: '#cba6f7' };
  const pct = (q.remaining / q.ttl) * 100;
  const urgency = pct < 20 ? 'urgent' : pct < 40 ? 'warning' : '';

  const card = document.createElement('div');
  card.className = `queue-card priority-${q.priority}`;
  card.style.boxShadow = `0 0 12px ${agent.color}25`;
  card.style.setProperty('--agent-color', agent.color);
  card.id = `qcard-${q.id}`;

  let answerHTML = '';
  switch(q.type) {
    case 'binary':
      answerHTML = `
        <div class="binary-btns">
          <button class="approve-btn" onclick="answerQueue('${q.id}','yes')">✅ Yes</button>
          <button class="reject-btn" onclick="answerQueue('${q.id}','no')">❌ No</button>
        </div>`;
      break;
    case 'choice':
      answerHTML = `
        <div class="choice-list">
          ${q.options.map((opt, i) => `
            <label class="choice-item">
              <input type="radio" name="choice-${q.id}" value="${i}" onchange="answerQueue('${q.id}','${opt.replace(/'/g,"\\'")}')">
              <label>${opt}</label>
            </label>
          `).join('')}
        </div>`;
      break;
    case 'freetext':
      answerHTML = `
        <div class="freetext-area">
          <textarea class="freetext-input" id="freetext-${q.id}" placeholder="Type your response..." rows="2"></textarea>
          <button class="submit-btn" onclick="answerQueueFreetext('${q.id}')">Send</button>
        </div>`;
      break;
    case 'approval':
      answerHTML = `
        <div class="approval-btns">
          <button class="approve-btn" onclick="answerQueue('${q.id}','approved')">✅ Approve</button>
          <button class="edit-btn" onclick="answerQueue('${q.id}','edit')">✏️ Edit</button>
          <button class="reject-btn" onclick="answerQueue('${q.id}','rejected')">❌ Reject</button>
        </div>`;
      break;
    case 'rating':
      answerHTML = `
        <div class="star-row" id="stars-${q.id}">
          ${[1,2,3,4,5].map(n => `
            <button class="star-btn" data-n="${n}" onclick="rateQueue('${q.id}',${n})">⭐</button>
          `).join('')}
        </div>`;
      break;
  }

  const minutes = Math.floor(q.remaining / 60);
  const secs = q.remaining % 60;
  const timeStr = `${minutes}:${String(secs).padStart(2,'0')}`;

  card.innerHTML = `
    <div class="countdown-bar-container">
      <div class="countdown-bar ${urgency}" id="bar-${q.id}" style="width:${pct}%"></div>
    </div>
    <div class="queue-card-header">
      <div class="queue-agent-avatar" style="background:${agent.color}20;border-color:${agent.color}">
        ${agent.emoji}
      </div>
      <div>
        <div class="queue-agent-name" style="color:${agent.color}">${agent.name}</div>
        <div style="font-size:10px;color:var(--text-muted)">${q.type}</div>
      </div>
      <span class="queue-priority-badge">${q.priority}</span>
    </div>
    <div class="queue-question">${q.question}</div>
    <div class="queue-context">${q.context}</div>
    <div class="queue-answer-area">${answerHTML}</div>
    <div class="queue-card-actions">
      <button class="delegate-btn" onclick="delegateQueueCard('${q.id}')">🔀 Delegate</button>
    </div>
    <div class="countdown-timer" id="timer-${q.id}">⏱ ${timeStr} remaining</div>
  `;
  return card;
}

function tickQueue() {
  let changed = false;
  const toRemove = [];

  queueCards.forEach(q => {
    q.remaining--;
    if (q.remaining <= 0) {
      // Auto-resolve
      toRemove.push(q.id);
      qStats.autoresolved++;
      toast(`⏱ Auto-resolved: "${q.question.substring(0, 40)}..."`, 'info');
      // Add to feed
      prependFeedCard({
        id: 'auto_' + q.id,
        agent: q.agent,
        type: 'task_completed',
        time: new Date().toLocaleTimeString(),
        content: `[Auto-resolved] ${q.question}`
      });
    } else {
      const pct = (q.remaining / q.ttl) * 100;
      const bar = $(`bar-${q.id}`);
      const timer = $(`timer-${q.id}`);
      if (bar) {
        bar.style.width = pct + '%';
        const urgency = pct < 20 ? 'urgent' : pct < 40 ? 'warning' : '';
        bar.className = `countdown-bar ${urgency}`;
      }
      if (timer) {
        const m = Math.floor(q.remaining / 60);
        const s = q.remaining % 60;
        timer.textContent = `⏱ ${m}:${String(s).padStart(2,'0')} remaining`;
      }
      changed = true;
    }
  });

  toRemove.forEach(id => removeQueueCard(id, 'autoresolved'));
  updateQueueStats();

  if (queueCards.length === 0) {
    $('queue-empty').classList.remove('hidden');
  }
}

function answerQueue(qId, answer) {
  const q = queueCards.find(c => c.id === qId);
  if (!q) return;
  removeQueueCard(qId, 'answered');
  qStats.answered++;
  addXP(15, 'answered question');
  toast(`✅ Answered: ${answer}`, 'success');
  updateQueueStats();
  if (queueCards.length === 0) {
    $('queue-empty').classList.remove('hidden');
  }
  // Mirror to Discord #dispatch
  syncToDiscord('dispatch', `📋 Queue decision: **${q.question?.substring(0,60)||qId}** → \`${answer}\``, q.agent);
  // Bidirectional: emit to event bus
  if (typeof EventBus !== 'undefined') {
    EventBus.emit('queue:answered', { agent: q.agent, question: q.question || qId, answer, qId });
  }
}

function answerQueueFreetext(qId) {
  const input = $(`freetext-${qId}`);
  if (!input || !input.value.trim()) {
    toast('Please enter a response', 'error');
    return;
  }
  answerQueue(qId, input.value);
}

function rateQueue(qId, stars) {
  // Highlight stars
  const container = $(`stars-${qId}`);
  if (container) {
    container.querySelectorAll('.star-btn').forEach((btn, i) => {
      btn.classList.toggle('selected', i < stars);
    });
  }
  setTimeout(() => answerQueue(qId, `${stars} stars`), 400);
}

function removeQueueCard(qId, reason) {
  queueCards = queueCards.filter(c => c.id !== qId);
  const el = $(`qcard-${qId}`);
  if (el) {
    el.style.opacity = '0';
    el.style.transform = 'translateX(100%)';
    el.style.transition = 'all 0.4s ease';
    setTimeout(() => el.remove(), 400);
  }
}

function delegateQueueCard(qId) {
  const q = queueCards.find(c => c.id === qId);
  if (!q) return;
  const otherAgents = AGENTS.filter(a => a.id !== q.agent);
  const target = otherAgents[Math.floor(Math.random() * otherAgents.length)];
  q.agent = target.id;
  toast(`🔀 Delegated to ${target.emoji} ${target.name}`, 'success');
  renderQueue();
}

let batchMode = false;
let batchSelected = new Set();

function toggleBatchMode() {
  batchMode = !batchMode;
  batchSelected.clear();
  const btn = $('batch-toggle-btn');
  btn.textContent = batchMode ? '☑ Batch Mode' : '☐ Batch Mode';
  btn.classList.toggle('active', batchMode);
  const actions = $('batch-actions');
  if (actions) actions.classList.toggle('hidden', !batchMode);
  // Toggle checkboxes on cards
  $$('.queue-card').forEach(card => {
    let cb = card.querySelector('.batch-checkbox');
    if (batchMode && !cb) {
      cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'batch-checkbox';
      cb.onclick = (e) => { e.stopPropagation(); toggleBatchSelect(card.id.replace('qcard-',''), cb.checked); };
      card.prepend(cb);
    } else if (!batchMode && cb) {
      cb.remove();
    }
  });
  updateBatchCount();
}

function toggleBatchSelect(qId, checked) {
  if (checked) batchSelected.add(qId);
  else batchSelected.delete(qId);
  updateBatchCount();
}

function updateBatchCount() {
  const el = $('batch-count');
  if (el) el.textContent = `${batchSelected.size} selected`;
}

function batchApproveAll() {
  batchSelected.forEach(qId => answerQueue(qId, 'approved'));
  batchMode = false;
  batchSelected.clear();
  toggleBatchMode();
}

function batchRejectAll() {
  batchSelected.forEach(qId => answerQueue(qId, 'rejected'));
  batchMode = false;
  batchSelected.clear();
  toggleBatchMode();
}

function batchDelegateAll() {
  batchSelected.forEach(qId => delegateQueueCard(qId));
  batchMode = false;
  batchSelected.clear();
  toggleBatchMode();
}

function updateQueueStats() {
  // Legacy stat elements may not exist in new layout
  const answered = document.getElementById('q-answered');
  if (answered) answered.textContent = qStats.answered;
  const autoresolved = document.getElementById('q-autoresolved');
  if (autoresolved) autoresolved.textContent = qStats.autoresolved;
  const expired = document.getElementById('q-expired');
  if (expired) expired.textContent = qStats.expired;

  // Update badges
  const count = queueCards.length;
  const badge = document.getElementById('proposals-badge');
  if (badge) { badge.textContent = count || ''; badge.style.display = count > 0 ? '' : 'none'; }
  const mobileBadge = document.getElementById('queue-mobile-badge');
  if (mobileBadge) mobileBadge.textContent = count || '';
}

// Generate a new queue card (for simulation)
function generateQueueCard() {
  const agents = AGENTS.filter(a => a.status === 'active' || Math.random() > 0.5);
  const agent = agents[Math.floor(Math.random() * agents.length)];
  const types = ['binary', 'choice', 'freetext', 'approval', 'rating'];
  const type = types[Math.floor(Math.random() * types.length)];
  const priorities = ['urgent', 'normal', 'optional'];
  const priority = priorities[Math.floor(Math.random() * priorities.length)];

  const questions = {
    binary: ['Should I proceed with this approach?', 'Can I deploy to production?', 'Should I archive these old files?'],
    choice: ['Which format for the report?', 'Which model should I use?'],
    freetext: ['I need guidance on this task.', 'What should the output format be?'],
    approval: ['Please review this output before I send it.', 'Review this plan before I execute?'],
    rating: ['Rate the quality of this output (1-5)', 'How satisfied are you with this result?'],
  };

  const qList = questions[type];
  const newCard = {
    id: 'gen_' + Date.now(),
    agent: agent.id,
    type,
    priority,
    ttl: 180 + Math.floor(Math.random() * 300),
    elapsed: 0,
    question: qList[Math.floor(Math.random() * qList.length)],
    context: 'Auto-generated question from agent activity. Review and respond.',
    options: type === 'choice' ? ['Option A', 'Option B', 'Option C', 'Option D'] : null,
  };
  newCard.remaining = newCard.ttl;

  queueCards.push(newCard);
  const list = $('queue-list');
  if (list) {
    $('queue-empty').classList.add('hidden');
    list.appendChild(makeQueueCard(newCard));
  }
  updateQueueStats();
  addNotification('New question', newCard.question, '❓');
}

// ═══════════════════════════════════════════════════════════
// TALK PAGE (Discord Clone)
// ═══════════════════════════════════════════════════════════

let talkMode = 'channels'; // 'channels' | 'dms'
let currentChannel = null; // auto-selected on Talk page load
let currentDM = null;
let memberListVisible = false;
let threadPanelVisible = false;
let replyingTo = null;
let typingTimer = null;
let _lastTypingSent = 0;
const TYPING_DEBOUNCE_MS = 8000;

const THREAD_REPLIES = {};

const CHANNEL_COLOR = {
  bridge: '#cba6f7', dev: '#a6e3a1', 'research-feed': '#89b4fa',
  'devils-corner': '#f38ba8', 'ops-log': '#fab387', dispatch: '#f9e2af',
  'code-output': '#a6e3a1', 'agent-feed': '#94e2d5',
};

function renderChannelList() {
  const list = $('channel-list');
  list.innerHTML = '';

  if (talkMode === 'dms') {
    renderDMList();
    return;
  }

  // Use real Discord categories
  if (DC_CHANNELS.categories) {
    DC_CHANNELS.categories.forEach(cat => {
      const section = makeCategorySection(cat.name, cat.channels, 'mixed');
      list.appendChild(section);
    });
  } else {
    // Fallback to flat lists
    const textCat = makeCategorySection('TEXT CHANNELS', DC_CHANNELS.text, 'text');
    list.appendChild(textCat);
    const voiceCat = makeCategorySection('VOICE', DC_CHANNELS.voice, 'voice');
    list.appendChild(voiceCat);
    const forumCat = makeCategorySection('FORUMS', DC_CHANNELS.forums, 'forum');
    list.appendChild(forumCat);
  }

  // Sessions at bottom
  renderSessionList();
}

function makeCategorySection(label, channels, type) {
  const section = document.createElement('div');
  section.className = 'channel-category';

  const header = document.createElement('div');
  header.className = 'channel-category-header';
  header.innerHTML = `<span class="category-arrow">▼</span> ${label}`;
  let collapsed = false;
  const channelsDiv = document.createElement('div');

  channels.forEach(ch => {
    const chType = ch.type || type;
    const item = document.createElement('div');
    item.className = `channel-item${ch.id === currentChannel ? ' active' : ''}${ch.unread > 0 ? ' has-unread' : ''}`;
    item.dataset.chid = ch.id;

    if (chType === 'voice') {
      item.innerHTML = `
        <span>🔊</span>
        <span class="channel-name">${ch.name}</span>
        ${ch.users?.length > 0 ? `<span class="voice-users">${ch.users.join('')}</span>` : ''}
      `;
    } else if (chType === 'forum') {
      item.innerHTML = `
        <span>💬</span>
        <span class="channel-name">${ch.name}</span>
        <span class="forum-count">${ch.count || 0}</span>
      `;
      item.onclick = (e) => { e.stopPropagation(); e.preventDefault(); switchChannel(ch.id); };
    } else {
      // text or mixed
      item.innerHTML = `
        <span class="channel-hash">#</span>
        <span class="channel-name">${ch.name}</span>
        ${ch.unread > 0 ? `<span class="channel-unread">${ch.unread}</span>` : ''}
      `;
      item.onclick = (e) => { e.stopPropagation(); e.preventDefault(); switchChannel(ch.id); };
    }
    channelsDiv.appendChild(item);
  });

  header.onclick = () => {
    collapsed = !collapsed;
    channelsDiv.style.display = collapsed ? 'none' : '';
    header.querySelector('.category-arrow').classList.toggle('collapsed', collapsed);
  };

  section.appendChild(header);
  section.appendChild(channelsDiv);
  return section;
}

function renderDMList() {
  const list = $('channel-list');
  list.innerHTML = '<div class="channel-category-header">DIRECT MESSAGES</div>';
  AGENTS.forEach(agent => {
    const item = document.createElement('div');
    item.className = `channel-item${currentDM === agent.id ? ' active' : ''}`;
    const statusColor = agent.status === 'active' ? 'var(--green)' : 'var(--text-muted)';
    item.innerHTML = `
      <span style="font-size:18px">${agent.emoji}</span>
      <span class="channel-name">${agent.name}</span>
      <span style="width:8px;height:8px;border-radius:50%;background:${statusColor};flex-shrink:0"></span>
    `;
    item.onclick = (e) => { e.stopPropagation(); e.preventDefault(); selectDM(agent.id); };
    list.appendChild(item);
  });
  renderSessionList();
}

function renderSessionList() {
  const container = $('channel-sessions');
  if (!AGENT_SESSIONS.length) { container.innerHTML = ''; return; }
  container.innerHTML = `<div class="channel-session-label">Active Sessions</div>`;
  AGENT_SESSIONS.forEach(s => {
    const agent = ga(s.agent) || { emoji: '🤖', name: s.agent };
    const item = document.createElement('div');
    item.className = 'session-item';
    item.innerHTML = `
      <span class="session-dot-active"></span>
      <div class="session-text">
        <div class="session-name">${agent.emoji} ${agent.name}</div>
        <div class="session-task">${s.task}</div>
      </div>
      <span class="session-dur">${s.duration}</span>
    `;
    container.appendChild(item);
  });
}

function setTalkMode(mode) {
  talkMode = mode;
  currentDM = null;
  // Update server rail
  const serverIcons = $$('.server-icon');
  serverIcons[0].classList.toggle('active', mode === 'channels');
  $('dm-icon').classList.toggle('active', mode === 'dms');
  // Update mobile tab active states
  $$('.mobile-talk-tab').forEach((tab, i) => {
    tab.classList.toggle('active', (i === 0 && mode === 'channels') || (i === 1 && mode === 'dms'));
  });
  renderChannelList();
  // On mobile, open the channel drawer
  if (window.innerWidth <= 768 && typeof openMobileChannelDrawer === 'function') {
    openMobileChannelDrawer();
    return; // don't switch channel/DM yet — let drawer handle it
  }
  if (mode === 'channels') {
    // Auto-select first real channel if none selected
    if (!currentChannel) {
      if (DC_CHANNELS.categories) {
        for (const cat of DC_CHANNELS.categories) {
          const textCh = cat.channels?.find(c => (c.type || 'text') !== 'voice');
          if (textCh) { currentChannel = textCh.id; break; }
        }
      }
      if (!currentChannel && DC_CHANNELS.text && DC_CHANNELS.text.length > 0) {
        currentChannel = DC_CHANNELS.text[0].id;
      }
    }
    switchChannel(currentChannel);
  } else {
    // Show first DM
    selectDM(AGENTS[0].id);
  }
}

function switchChannel(chId) {
  _channelSwitchLock = true;
  setTimeout(() => { _channelSwitchLock = false; }, 200);
  currentChannel = chId;
  currentDM = null;
  // Update active state
  $$('.channel-item').forEach(el => {
    el.classList.toggle('active', el.dataset.chid === chId);
    if (el.dataset.chid === chId) el.classList.remove('has-unread');
  });
  // Reset unread count in data
  const ch = DC_CHANNELS.text.find(c => c.id === chId);
  if (ch) ch.unread = 0;

  // Resolve display name: use channel name from categories, or fallback to chId
  const allChannels = DC_CHANNELS.categories
    ? DC_CHANNELS.categories.flatMap(c => c.channels)
    : DC_CHANNELS.text;
  const chData = allChannels.find(c => c.id === chId);
  const displayName = chData?.name || chId;

  $('current-channel-name').textContent = displayName;
  $('message-input').placeholder = `Message #${displayName}`;

  // Update topbar
  const color = CHANNEL_COLOR[chId] || '#cba6f7';
  $('current-channel-name').style.color = color;
  const topicEl = $('channel-topic');
  if (topicEl && chData?.topic) {
    const fullTopic = chData.topic;
    topicEl.dataset.fullTopic = fullTopic;
    topicEl.textContent = fullTopic.length > 120 ? fullTopic.substring(0, 120) + '…' : fullTopic;
    topicEl.classList.remove('expanded');
    topicEl.style.display = '';
  } else if (topicEl) {
    topicEl.dataset.fullTopic = '';
    topicEl.style.display = 'none';
  }

  // Close info panel on channel switch
  const infoPanel = $('channel-info-panel');
  if (infoPanel && !infoPanel.classList.contains('hidden')) {
    loadChannelInfo(chId);
  }

  // Show loading state, then load messages
  const msgContainer = $('messages-list');
  if (msgContainer) msgContainer.innerHTML = '<div style="padding:30px;text-align:center;color:var(--text-muted)">Loading messages...</div>';

  if (typeof Bridge !== 'undefined' && Bridge.liveMode && typeof loadLiveMessages === 'function') {
    loadLiveMessages(chId);
  } else {
    renderMessages(chId);
  }
  renderPinnedMessages(chId);
}

function selectDM(agentId) {
  currentDM = agentId;
  talkMode = 'dms';
  setTalkMode('dms');

  $$('.channel-item').forEach(el => {
    const ag = AGENTS.find(a => a.emoji === el.querySelector('span')?.textContent);
    el.classList.toggle('active', ag?.id === agentId);
  });

  const agent = ga(agentId);
  $('current-channel-name').textContent = agent ? `${agent.emoji} ${agent.name}` : agentId;
  $('current-channel-name').style.color = agent?.color || '#cba6f7';
  $('message-input').placeholder = `Message ${agent?.name || agentId}...`;

  renderMessages(null, agentId);
}

// ── Messages ──────────────────────────────────────────────
function renderMessages(channelId, dmId = null) {
  const container = $('messages-list');
  container.innerHTML = '';

  let messages = [];
  if (dmId) {
    messages = DM_MESSAGES[dmId] || [];
  } else {
    messages = DC_MESSAGES[channelId] || [];
  }

  if (messages.length === 0) {
    container.innerHTML = '<div style="padding:30px;text-align:center;color:var(--text-muted)">No messages in this channel yet</div>';
    return;
  }

  let lastAuthor = null;
  let lastTime = 0;

  messages.forEach((msg, idx) => {
    const collapsed = (msg.agent === lastAuthor || msg.agent === 'user' && lastAuthor === 'user') &&
      msg.ts && lastTime && (msg.ts - lastTime) < 300; // 5 min grouping
    lastAuthor = msg.agent;
    lastTime = msg.ts || 0;
    container.appendChild(makeMessageGroup(msg, collapsed, channelId));
  });

  // Scroll to bottom
  const msgContainer = $('messages-container');
  setTimeout(() => { msgContainer.scrollTop = msgContainer.scrollHeight; }, 50);
}

function makeMessageGroup(msg, collapsed = false, channelId = null) {
  const isUser = msg.agent === 'user';
  const agent = isUser ? { emoji: '🧑', name: 'You', color: '#cba6f7' } : (ga(msg.agent) || { emoji: '🤖', name: msg.agent, color: '#cba6f7' });

  const group = document.createElement('div');
  group.className = `msg-group${collapsed ? ' collapsed' : ''}${isUser ? ' msg-user' : ''}${msg._pending ? ' msg-pending' : ''}${msg._failed ? ' msg-failed' : ''}`;
  group.id = `msg-${msg.id}`;
  group.dataset.msgId = msg.id;

  // Reply reference
  let replyHTML = '';
  if (msg.replyTo) {
    const refMsg = findMessage(msg.replyTo);
    if (refMsg) {
      const refAgent = ga(refMsg.agent) || { name: refMsg.agent };
      replyHTML = `
        <div class="msg-reply-ref">
          <span>↩</span>
          <span class="reply-author" style="color:${ga(refMsg.agent)?.color || '#cba6f7'}">${refAgent.name}</span>
          <span>${refMsg.text.substring(0, 60)}${refMsg.text.length > 60 ? '...' : ''}</span>
        </div>
      `;
    }
  }

  // Format message text (code blocks, inline code, bold)
  let formattedText = formatMessageText(msg.text);

  // Embed
  let embedHTML = '';
  if (msg.embed) {
    embedHTML = `
      <div class="msg-embed" style="border-color:${msg.embed.color || '#cba6f7'}">
        <div class="embed-title">${msg.embed.title}</div>
        <div class="embed-desc">${msg.embed.desc}</div>
      </div>
    `;
  }

  // Reactions
  let reactHTML = '';
  const existingReactions = (msg.reactions && msg.reactions.length > 0) ? msg.reactions.map(r => `
    <button class="reaction${r.mine ? ' mine' : ''}" onclick="toggleReaction('${msg.id}','${r.e}','${channelId || ''}')">
      ${r.e} <span class="reaction-count">${r.n}</span>
    </button>
  `).join('') : '';
  // Quick reaction picker (common emoji) — shown on hover
  const quickReactEmojis = ['👍','❤️','😂','🎉','✅','❌'];
  const quickReactHTML = quickReactEmojis.map(e =>
    `<button class="quick-react-btn" onclick="event.stopPropagation();addQuickReaction('${msg.id}','${e}','${channelId || ''}')" title="${e}">${e}</button>`
  ).join('');
  reactHTML = `
    <div class="msg-quick-react-bar">${quickReactHTML}</div>
    ${existingReactions ? `<div class="msg-reactions">${existingReactions}<button class="reaction" onclick="openEmojiForReaction('${msg.id}')">+</button></div>` : ''}
  `;

  // Avatar + header only if not collapsed
  const avatarSection = `
    <div class="msg-avatar" style="background:${agent.color}20;border-color:${agent.color}" 
      onclick="openMemberProfile('${msg.agent}')">
      ${agent.emoji}
    </div>
  `;

  const headerSection = !collapsed ? `
    <div class="msg-header">
      <span class="msg-author entity-link entity-agent" style="color:${agent.color}" onclick="event.stopPropagation();goToEntity('agent','${msg.agent}','${agent.name}')">${agent.name}</span>
      <span class="msg-timestamp">${msg.time}</span>
      ${isUser ? '<span class="msg-sync-check">✓ synced</span>' : ''}
    </div>
  ` : '';

  group.innerHTML = `
    ${avatarSection}
    <div class="msg-body">
      ${headerSection}
      ${replyHTML}
      <div class="msg-text">${collapsed ? `<span class="msg-timestamp-hover">${msg.time}</span>` : ''}${formattedText}</div>
      ${embedHTML}
      ${reactHTML}
      <div class="msg-actions-bar">
        <button class="msg-action-mini" onclick="replyToMessage('${msg.id}','${msg.agent}')">↩ Reply</button>
        <button class="msg-action-mini" onclick="addReactionToMsg('${msg.id}')">😊</button>
        <button class="msg-action-mini" onclick="pinMessage('${msg.id}','${channelId || ''}')">📌</button>
        <button class="msg-action-mini" onclick="threadFromMessage('${msg.id}')">🧵 Thread</button>
      </div>
      ${(THREAD_REPLIES[msg.id]?.length || msg._threadId) ? `<div class="thread-badge" onclick="threadFromMessage('${msg.id}')">💬 ${THREAD_REPLIES[msg.id]?.length || msg._threadReplyCount || '?'} replies</div>` : ''}
    </div>
  `;
  return group;
}

function formatMessageText(text) {
  // Code blocks first
  text = text.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
    return `<pre><code>${escapeHtml(code.trim())}</code></pre>`;
  });
  // Inline code
  text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold
  text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic (single * — but not inside ** pairs)
  text = text.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
  // Strikethrough
  text = text.replace(/~~(.+?)~~/g, '<del>$1</del>');
  // Blockquote (lines starting with >)
  text = text.replace(/(^|\n)&gt; ?(.+)/g, '$1<blockquote class="msg-blockquote">$2</blockquote>');
  text = text.replace(/(^|\n)> ?(.+)/g, '$1<blockquote class="msg-blockquote">$2</blockquote>');
  // Newlines
  text = text.replace(/\n/g, '<br>');
  return text;
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function findMessage(id) {
  for (const ch of Object.keys(DC_MESSAGES)) {
    const msg = DC_MESSAGES[ch].find(m => m.id === id);
    if (msg) return msg;
  }
  for (const dm of Object.keys(DM_MESSAGES)) {
    const msg = DM_MESSAGES[dm].find(m => m.id === id);
    if (msg) return msg;
  }
  return null;
}

// ── Send Message ──────────────────────────────────────────
function handleMessageInput(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
    return;
  }
  if (e.key === 'Escape') { cancelReply(); return; }
  // Typing indicator — debounced, at most every 8s
  if (typeof Bridge !== 'undefined' && Bridge.liveMode && currentChannel && !currentDM) {
    const now = Date.now();
    if (now - _lastTypingSent > TYPING_DEBOUNCE_MS) {
      _lastTypingSent = now;
      Bridge.sendTyping(currentChannel).catch(() => {});
    }
  }
}

function handleInputChange(e) {
  const val = e.target.value;
  // Slash command autocomplete
  if (val.startsWith('/')) {
    const matches = SLASH_COMMANDS.filter(c => c.cmd.startsWith(val));
    const ac = $('input-autocomplete');
    if (matches.length > 0) {
      ac.classList.remove('hidden');
      ac.innerHTML = matches.map(c => `
        <div class="autocomplete-item" onclick="insertCommand('${c.cmd}')">
          <strong>${c.cmd}</strong> — <span style="color:var(--text-muted)">${c.desc}</span>
        </div>
      `).join('');
    } else {
      ac.classList.add('hidden');
    }
  } else {
    $('input-autocomplete').classList.add('hidden');
  }
}

function insertCommand(cmd) {
  $('message-input').value = cmd + ' ';
  $('input-autocomplete').classList.add('hidden');
  $('message-input').focus();
}

function sendMessage() {
  const input = $('message-input');
  const text = input.value.trim();
  if (!text) return;

  // Handle slash commands
  if (text.startsWith('/')) {
    handleSlashCommand(text);
    input.value = '';
    return;
  }

  const newMsg = {
    id: 'user_' + Date.now(),
    agent: 'user',
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    ts: Date.now() / 1000,
    text,
    reactions: [],
    replyTo: replyingTo?.id || null,
  };

  // Add to data
  if (currentDM) {
    if (!DM_MESSAGES[currentDM]) DM_MESSAGES[currentDM] = [];
    DM_MESSAGES[currentDM].push(newMsg);
    renderMessages(null, currentDM);
  } else {
    if (!DC_MESSAGES[currentChannel]) DC_MESSAGES[currentChannel] = [];
    DC_MESSAGES[currentChannel].push(newMsg);
    renderMessages(currentChannel);
  }

  input.value = '';
  replyingTo = null;
  const rp = $('reply-preview');
  if (rp) rp.classList.add('hidden');
  addXP(5, 'message sent');

  // Mirror to Discord
  const target = currentDM ? `DM @${currentDM}` : `#${currentChannel}`;
  syncToDiscord(currentChannel || currentDM, text, 'user');

  // Bidirectional: emit to event bus
  if (typeof EventBus !== 'undefined') {
    EventBus.emit('chat:message', { agent: 'user', text, channel: currentChannel, dm: currentDM, time: newMsg.time });
  }

  // Agent auto-reply
  const replyDelay = 1500 + Math.random() * 2000;
  showTypingIndicator();
  setTimeout(() => {
    hideTypingIndicator();
    agentAutoReply(text);
  }, replyDelay);
}

function handleSlashCommand(text) {
  const parts = text.split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1).join(' ');

  switch(cmd) {
    case '/dispatch':
      toast(`🚀 Dispatching: ${args || 'new task'}`, 'success');
      addXP(10, 'dispatch command');
      // Add system message
      appendSystemMessage(`Dispatch command received: ${args || 'awaiting task details'}`);
      break;
    case '/status':
      const active = AGENTS.filter(a => a.status === 'active');
      appendSystemMessage(`**System Status**\n${active.length} agents active, ${queueCards.length} items in queue\n${active.map(a => `${a.emoji} ${a.name}: ${a.task || 'standing by'}`).join('\n')}`);
      break;
    case '/search':
      toast(`🔍 Searching: ${args || '...'}`, 'info');
      appendSystemMessage(`Search results for "${args}":\n• 3 vault notes matched\n• 2 recent conversations\n• 1 dispatched task`);
      break;
    default:
      toast(`Unknown command: ${cmd}`, 'error');
      return;
  }
}

function appendSystemMessage(text) {
  const msg = {
    id: 'sys_' + Date.now(),
    agent: 'righthand',
    time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),
    ts: Date.now() / 1000,
    text,
    reactions: [],
  };
  if (currentDM) {
    if (!DM_MESSAGES[currentDM]) DM_MESSAGES[currentDM] = [];
    DM_MESSAGES[currentDM].push(msg);
    renderMessages(null, currentDM);
  } else {
    if (!DC_MESSAGES[currentChannel]) DC_MESSAGES[currentChannel] = [];
    DC_MESSAGES[currentChannel].push(msg);
    renderMessages(currentChannel);
  }
}

function showTypingIndicator() {
  const indicator = $('typing-indicator');
  let agentName = 'Agent';
  if (currentDM) {
    const agent = ga(currentDM);
    agentName = agent ? `${agent.emoji} ${agent.name}` : currentDM;
  } else {
    // Random agent in channel
    const agents = AGENTS.filter(a => a.status === 'active');
    if (agents.length > 0) agentName = `${agents[0].emoji} ${agents[0].name}`;
  }
  $('typing-who').textContent = `${agentName} is typing...`;
  indicator.classList.remove('hidden');
}

function hideTypingIndicator() {
  $('typing-indicator').classList.add('hidden');
}

function agentAutoReply(userText) {
  let respondingAgent;
  if (currentDM) {
    respondingAgent = ga(currentDM);
  } else {
    const activeAgents = AGENTS.filter(a => a.status === 'active');
    respondingAgent = activeAgents[Math.floor(Math.random() * activeAgents.length)] || AGENTS[0];
  }

  const lowerText = userText.toLowerCase();
  let replyPool;

  if (lowerText.includes('status')) {
    replyPool = [
      'Current task is 78% complete. Estimated 12 minutes remaining.',
      'All systems nominal. Processing queue at steady pace.',
      'Status: active on 2 tasks, 1 pending review. No blockers.',
      'Running smoothly — last checkpoint was 3 minutes ago.',
    ];
  } else if (lowerText.includes('vault')) {
    replyPool = [
      'Vault updated 4 minutes ago. 3 new cross-links detected.',
      'Recent vault activity: 2 notes modified, 1 new note created.',
      'Vault health at 94%. Recommending a reindex to catch orphaned links.',
      'Checked vault — found 2 notes matching your recent work.',
    ];
  } else if (lowerText.includes('dispatch') || lowerText.includes('task')) {
    replyPool = [
      'Task queued. Estimated start in ~2 minutes.',
      'Dispatching now. I\'ll report back when there\'s progress.',
      'Added to my queue — priority set based on current workload.',
      'Task acknowledged. Running parallel with current work.',
    ];
  } else if (lowerText.includes('error') || lowerText.includes('bug')) {
    replyPool = [
      'Investigating now. Pulling recent logs for context.',
      'I see the error. Cross-referencing with known issues...',
      'Bug acknowledged. Checking if this matches a known pattern.',
      'On it — running diagnostics. Will report findings shortly.',
    ];
  } else if (lowerText.includes('?')) {
    replyPool = [
      'Good question. Let me check the latest data before answering.',
      'Hmm, I have a partial answer. Want me to do a deeper search?',
      'Let me cross-reference that with what I have in the vault.',
      'Interesting question — checking multiple sources now.',
    ];
  } else {
    replyPool = [
      'Got it. I\'ll look into that now.',
      'Understood. Processing your request.',
      'On it — I\'ll have results shortly.',
      'Noted. Dispatching task now.',
      'Acknowledged. Updating my work queue.',
      'Received. Cross-referencing with vault...',
      'Copy that. Adding to my current batch.',
      'Roger. Spinning up analysis now.',
      'Affirmative. I\'ll ping you when there\'s an update.',
      'On my radar. Prioritizing based on current workload.',
      'Queued up. Working through items sequentially.',
      'Message received. Integrating into my workflow.',
      'Taking action on this now.',
      'Will handle this. Stand by for results.',
    ];
  }
  const reply = replyPool[Math.floor(Math.random() * replyPool.length)];

  const replyMsg = {
    id: 'reply_' + Date.now(),
    agent: respondingAgent.id,
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    ts: Date.now() / 1000,
    text: reply,
    reactions: [],
  };

  if (currentDM) {
    DM_MESSAGES[currentDM].push(replyMsg);
    renderMessages(null, currentDM);
  } else {
    DC_MESSAGES[currentChannel].push(replyMsg);
    renderMessages(currentChannel);
  }
  // Bidirectional: emit agent reply
  if (typeof EventBus !== 'undefined') {
    EventBus.emit('chat:message', { agent: respondingAgent.id, text: reply, channel: currentChannel, dm: currentDM, time: replyMsg.time });
  }
}

function replyToMessage(msgId, agentId) {
  const msg = findMessage(msgId);
  if (!msg) return;
  replyingTo = msg;
  const agent = ga(agentId) || { name: agentId };
  $('message-input').placeholder = `Replying to ${agent.name}...`;
  $('message-input').focus();

  // Show reply preview
  const preview = $('reply-preview');
  const previewText = $('reply-preview-text');
  if (preview && previewText) {
    previewText.innerHTML = `Replying to <strong style="color:${agent.color||'var(--accent)'}">${agent.name}</strong>: ${msg.text.substring(0,80)}${msg.text.length>80?'...':''}`;
    preview.classList.remove('hidden');
  }
}

function cancelReply() {
  replyingTo = null;
  const preview = $('reply-preview');
  if (preview) preview.classList.add('hidden');
  const ch = currentDM ? `@${currentDM}` : `#${currentChannel}`;
  $('message-input').placeholder = `Message ${ch}`;
}

function toggleReaction(msgId, emoji, channelId) {
  // Find and toggle reaction locally
  const allMsgs = [...Object.values(DC_MESSAGES), ...Object.values(DM_MESSAGES)].flat();
  const msg = allMsgs.find(m => m.id === msgId);
  if (!msg) return;
  if (!msg.reactions) msg.reactions = [];
  const existing = msg.reactions.find(r => r.e === emoji);
  if (existing) {
    existing.mine = !existing.mine;
    existing.n += existing.mine ? 1 : -1;
    if (existing.n <= 0) msg.reactions = msg.reactions.filter(r => r.e !== emoji);
  } else {
    msg.reactions.push({ e: emoji, n: 1, mine: true });
  }
  renderMessages(currentDM ? null : currentChannel, currentDM);
  // POST to bridge if live
  const chId = channelId || currentChannel;
  if (typeof Bridge !== 'undefined' && Bridge.liveMode && chId) {
    Bridge.addReaction(chId, msgId, emoji).catch(e => {
      console.warn('[Reaction] Failed:', e.message);
    });
  }
}

function addQuickReaction(msgId, emoji, channelId) {
  toggleReaction(msgId, emoji, channelId);
}

function openEmojiForReaction(msgId) {
  window._reactionTarget = msgId;
  toggleEmojiPicker('reaction');
}

function addReactionToMsg(msgId) {
  window._reactionTarget = msgId;
  toggleEmojiPicker('reaction');
}

function pinMessage(msgId, channelId) {
  if (!channelId) return;
  if (!DC_PINNED[channelId]) DC_PINNED[channelId] = [];
  if (!DC_PINNED[channelId].includes(msgId)) {
    DC_PINNED[channelId].push(msgId);
    toast('📌 Message pinned', 'success');
    renderPinnedMessages(channelId);
  }
}

function threadFromMessage(msgId) {
  const msg = findMessage(msgId);
  if (!msg) return;

  // Show thread panel immediately
  threadPanelVisible = true;
  const tp = $('thread-panel');
  tp.classList.remove('hidden');
  tp.dataset.msgId = msgId;

  // Try fetching real thread messages from bridge
  if (typeof Bridge !== 'undefined' && Bridge.liveMode && msg._threadId) {
    // Show loading state
    tp.innerHTML = `
      <div class="thread-panel-header"><span>🧵 Thread</span><button onclick="toggleThreadPanel()">✕</button></div>
      <div style="padding:24px;text-align:center;color:var(--text-muted)">Loading thread...</div>
    `;
    Bridge.getThreadMessages(msg._threadId).then(messages => {
      const replies = (messages || []).map(m => {
        const local = typeof bridgeMsgToLocal === 'function' ? bridgeMsgToLocal(m) : {
          id: m.id, agent: m.author?.bot ? 'righthand' : 'user',
          text: m.content || '', time: new Date(m.timestamp).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),
          ts: new Date(m.timestamp).getTime() / 1000,
        };
        return local;
      });
      THREAD_REPLIES[msgId] = replies;
      renderThreadPanel(msgId, msg);
    }).catch(e => {
      console.warn('[Thread] Load failed:', e.message);
      // Fallback to local/demo data
      initDemoThreadReplies(msgId, msg);
      renderThreadPanel(msgId, msg);
    });
  } else if (!THREAD_REPLIES[msgId]) {
    // No bridge or no threadId — use demo data
    initDemoThreadReplies(msgId, msg);
    renderThreadPanel(msgId, msg);
  } else {
    renderThreadPanel(msgId, msg);
  }
}

function initDemoThreadReplies(msgId, msg) {
  const agent = ga(msg.agent) || { id: 'righthand', emoji: '🤖', name: 'Agent', color: '#cba6f7' };
  const otherAgents = AGENTS.filter(a => a.id !== msg.agent).slice(0, 2);
  const fakeReplies = [
    { id: 'tr_' + msgId + '_1', agent: otherAgents[0]?.id || 'researcher', text: 'Good point — I\'ll factor this into my analysis.', time: msg.time, ts: (msg.ts || Date.now()/1000) + 60 },
    { id: 'tr_' + msgId + '_2', agent: agent.id, text: 'Updated. Check the latest revision when ready.', time: msg.time, ts: (msg.ts || Date.now()/1000) + 180 },
  ];
  if (otherAgents[1]) {
    fakeReplies.push({ id: 'tr_' + msgId + '_3', agent: otherAgents[1].id, text: 'Looks good from my side. Proceeding with integration.', time: msg.time, ts: (msg.ts || Date.now()/1000) + 300 });
  }
  THREAD_REPLIES[msgId] = fakeReplies;
}

function renderThreadPanel(msgId, msg) {
  const agent = ga(msg.agent) || { emoji: '🤖', name: msg.agent, color: '#cba6f7' };
  const replies = THREAD_REPLIES[msgId] || [];

  const repliesHTML = replies.map(r => {
    const ra = ga(r.agent) || { emoji: '🤖', name: r.agent, color: '#cba6f7' };
    const time = r.time || new Date(r.ts * 1000).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
    return `
      <div class="thread-reply">
        <div class="thread-reply-avatar" style="background:${ra.color}20;border-color:${ra.color}">${ra.emoji}</div>
        <div class="thread-reply-body">
          <div class="thread-reply-header">
            <span class="thread-reply-name" style="color:${ra.color}">${ra.name}</span>
            <span class="thread-reply-time">${time}</span>
          </div>
          <div class="thread-reply-text">${formatMessageText(r.text)}</div>
        </div>
      </div>
    `;
  }).join('');

  $('thread-panel').innerHTML = `
    <div class="thread-panel-header">
      <span>🧵 Thread</span>
      <button onclick="toggleThreadPanel()">✕</button>
    </div>
    <div id="thread-content">
      <div class="thread-original-msg" style="border-left: 3px solid ${agent.color}">
        <div class="thread-original-header">
          <span style="color:${agent.color};font-weight:700">${agent.emoji} ${agent.name}</span>
          <span style="font-size:11px;color:var(--text-muted)">${msg.time}</span>
        </div>
        <div style="font-size:13px;margin-top:4px">${formatMessageText(msg.text)}</div>
      </div>
      <div class="thread-reply-count">${replies.length} repl${replies.length !== 1 ? 'ies' : 'y'}</div>
      <div class="thread-replies-list">${repliesHTML}</div>
      <div class="thread-input-bar">
        <input type="text" class="thread-input" id="thread-input" placeholder="Reply in thread..." onkeydown="if(event.key==='Enter'){sendThreadReply('${msgId}');event.preventDefault();}">
        <button class="send-btn" onclick="sendThreadReply('${msgId}')">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M1.724 1.053a.5.5 0 0 1 .553-.05l12 6.5a.5.5 0 0 1 0 .894l-12 6.5A.5.5 0 0 1 1.5 14.5v-5l7-1.5-7-1.5v-5a.5.5 0 0 1 .224-.447z"/></svg>
        </button>
      </div>
    </div>
  `;
}

function sendThreadReply(msgId) {
  const input = $('thread-input');
  if (!input || !input.value.trim()) return;
  const text = input.value.trim();

  if (!THREAD_REPLIES[msgId]) THREAD_REPLIES[msgId] = [];
  const newReply = {
    id: 'tr_' + Date.now(),
    agent: 'user',
    text,
    time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),
    ts: Date.now() / 1000,
    _pending: true,
  };
  THREAD_REPLIES[msgId].push(newReply);

  input.value = '';
  const msg = findMessage(msgId);
  if (msg) renderThreadPanel(msgId, msg);

  // POST to bridge if live and the message has a threadId
  if (typeof Bridge !== 'undefined' && Bridge.liveMode && msg && msg._threadId) {
    Bridge.sendMessage(msg._threadId, text).then(result => {
      newReply._pending = false;
      if (result && result.id) newReply.id = result.id;
      if (msg) renderThreadPanel(msgId, msg);
    }).catch(e => {
      newReply._pending = false;
      newReply._failed = true;
      if (msg) renderThreadPanel(msgId, msg);
      toast('❌ Thread reply failed: ' + e.message, 'error');
    });
  } else {
    newReply._pending = false;
  }
  addXP(5, 'thread reply');
  toast('🧵 Reply added to thread', 'success');
}

function togglePinned() {
  $('pinned-panel').classList.toggle('hidden');
}

function renderPinnedMessages(channelId) {
  // Try live bridge pins first
  if (typeof Bridge !== 'undefined' && Bridge.liveMode && channelId) {
    Bridge.apiFetch(`/api/channels/${channelId}/pins`).then(pins => {
      const list = $('pinned-list');
      list.innerHTML = '';
      if (!Array.isArray(pins) || !pins.length) {
        list.innerHTML = '<div style="padding:12px;color:var(--text-muted);font-size:12px">No pinned messages</div>';
        return;
      }
      pins.forEach(msg => {
        const item = document.createElement('div');
        item.className = 'pinned-msg-item';
        const authorName = msg.author?.display_name || msg.author?.username || 'Unknown';
        item.innerHTML = `<span class="pinned-msg-author">${authorName}</span><span class="pinned-msg-text">${(msg.content || '').substring(0, 150)}</span>`;
        list.appendChild(item);
      });
    }).catch(() => {
      renderLocalPinnedFallback(channelId);
    });
    return;
  }
  renderLocalPinnedFallback(channelId);
}

function renderLocalPinnedFallback(channelId) {
  const pinned = DC_PINNED[channelId] || [];
  const list = $('pinned-list');
  list.innerHTML = '';
  if (!pinned.length) {
    list.innerHTML = '<div style="padding:12px;color:var(--text-muted);font-size:12px">No pinned messages</div>';
    return;
  }
  pinned.forEach(id => {
    const msg = findMessage(id);
    if (!msg) return;
    const agent = ga(msg.agent) || { name: msg.agent };
    const item = document.createElement('div');
    item.className = 'pinned-msg-item';
    item.innerHTML = `<span class="pinned-msg-author">${agent.name}</span><span class="pinned-msg-text">${msg.text.substring(0, 100)}</span>`;
    list.appendChild(item);
  });
}

// ── Topic expand/collapse ─────────────────────────────────
function expandChannelTopic() {
  const el = $('channel-topic');
  if (!el) return;
  const full = el.dataset.fullTopic || '';
  if (!full) return;
  if (el.classList.contains('expanded')) {
    el.classList.remove('expanded');
    el.textContent = full.length > 120 ? full.substring(0, 120) + '…' : full;
  } else {
    el.classList.add('expanded');
    el.textContent = full;
  }
}

// ── Channel Info Panel ────────────────────────────────────
let channelInfoVisible = false;

function toggleChannelInfo() {
  channelInfoVisible = !channelInfoVisible;
  const panel = $('channel-info-panel');
  panel.classList.toggle('hidden', !channelInfoVisible);
  if (channelInfoVisible && currentChannel) {
    loadChannelInfo(currentChannel);
  }
}

async function loadChannelInfo(channelId) {
  const content = $('channel-info-content');
  if (!content) return;
  content.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted)">Loading...</div>';

  // Resolve channel name from local data
  const allChannels = DC_CHANNELS.categories
    ? DC_CHANNELS.categories.flatMap(c => c.channels)
    : (DC_CHANNELS.text || []);
  const chData = allChannels.find(c => c.id === channelId);
  const channelName = chData?.name || channelId;
  const channelTopic = chData?.topic || '';

  // If bridge is live, fetch real stats
  if (typeof Bridge !== 'undefined' && Bridge.liveMode) {
    try {
      const [info, pins] = await Promise.all([
        Bridge.apiFetch(`/api/channels/${channelId}/info`).catch(() => null),
        Bridge.apiFetch(`/api/channels/${channelId}/pins`).catch(() => []),
      ]);

      const created = info?.created_at ? new Date(info.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
      const lastMsg = info?.last_message_time ? timeAgo(new Date(info.last_message_time)) : '—';
      const topic = info?.topic || channelTopic || 'No topic set';
      const pinnedCount = Array.isArray(pins) ? pins.length : (info?.pinned_count || 0);

      let html = `
        <div class="channel-info-section">
          <h4>Channel</h4>
          <p style="font-size:16px;font-weight:600"># ${info?.name || channelName}</p>
        </div>
        <div class="channel-info-section">
          <h4>Topic</h4>
          <p style="font-size:12px;line-height:1.5">${escapeHtml(topic)}</p>
        </div>
        <div class="channel-info-section">
          <h4>Stats</h4>
          <div class="channel-info-stat"><span class="stat-label">Members</span><span class="stat-value">${info?.member_count || '—'}</span></div>
          <div class="channel-info-stat"><span class="stat-label">Messages (24h)</span><span class="stat-value">${info?.recent_messages_24h ?? '—'}</span></div>
          <div class="channel-info-stat"><span class="stat-label">Pinned</span><span class="stat-value">${pinnedCount}</span></div>
          <div class="channel-info-stat"><span class="stat-label">Created</span><span class="stat-value">${created}</span></div>
          <div class="channel-info-stat"><span class="stat-label">Last Message</span><span class="stat-value">${lastMsg}</span></div>
        </div>`;

      // Pinned messages in info panel
      if (Array.isArray(pins) && pins.length > 0) {
        html += `<div class="channel-info-section"><h4>📌 Pinned Messages (${pins.length})</h4>`;
        pins.slice(0, 10).forEach(msg => {
          const author = msg.author?.display_name || msg.author?.username || 'Unknown';
          html += `<div class="channel-info-pin"><div class="pin-author">${escapeHtml(author)}</div><div class="pin-text">${escapeHtml((msg.content || '').substring(0, 200))}</div></div>`;
        });
        html += '</div>';
      }

      content.innerHTML = html;
      return;
    } catch (e) {
      // Fall through to local-only display
    }
  }

  // Fallback: local data only
  content.innerHTML = `
    <div class="channel-info-section">
      <h4>Channel</h4>
      <p style="font-size:16px;font-weight:600"># ${escapeHtml(channelName)}</p>
    </div>
    <div class="channel-info-section">
      <h4>Topic</h4>
      <p style="font-size:12px;line-height:1.5">${escapeHtml(channelTopic || 'No topic set')}</p>
    </div>
    <div class="channel-info-section" style="color:var(--text-muted);font-size:12px">
      Connect to bridge for full channel stats
    </div>`;
}

// Helper: time ago string
function timeAgo(date) {
  const now = new Date();
  const diff = now - date;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// Helper: escape HTML
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function toggleMemberList() {
  memberListVisible = !memberListVisible;
  const ml = $('member-list');
  ml.classList.toggle('hidden', !memberListVisible);
  if (memberListVisible) renderMemberList();
}

function renderMemberList() {
  const content = $('member-list-content');
  content.innerHTML = '';
  AGENTS.forEach(agent => {
    const item = document.createElement('div');
    item.className = 'member-item';
    const statusClass = agent.status === 'active' ? 'status-active' : 'status-idle';
    item.innerHTML = `
      <div class="member-avatar" style="background:${agent.color}20;border-color:${agent.color}">
        ${agent.emoji}
        <span class="member-status-dot ${statusClass}"></span>
      </div>
      <div>
        <div class="member-name" style="color:${agent.color}">${agent.name}</div>
        <div class="member-task">${agent.task || agent.role}</div>
      </div>
    `;
    item.onclick = (e) => { e.stopPropagation(); e.preventDefault(); selectDM(agent.id); };
    content.appendChild(item);
  });
}

function toggleThreadPanel(msg = null) {
  if (msg) {
    threadFromMessage(msg.id || msg);
    return;
  }
  threadPanelVisible = !threadPanelVisible;
  const tp = $('thread-panel');
  tp.classList.toggle('hidden', !threadPanelVisible);
}

function toggleServerSettings() {
  toast('⚙️ Server settings — coming soon', 'info');
}

function openMemberProfile(agentId) {
  const agent = ga(agentId);
  if (!agent) return;
  const agentNotes = VAULT_NOTES.filter(n => n.agent === agentId);
  const agentTasks = Object.values(BOARD_CARDS).flat().filter(c => c.agent === agentId);
  const modal = $('card-modal-content');
  modal.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <span style="font-size:28px;border:2px solid ${agent.color};border-radius:50%;width:48px;height:48px;display:flex;align-items:center;justify-content:center">${agent.emoji}</span>
      <div>
        <div style="font-weight:700;font-size:16px;color:${agent.color}">${agent.name}</div>
        <div style="font-size:12px;color:var(--text-muted)">${agent.role} · ${agent.status}</div>
      </div>
      <button onclick="closeModal()" style="margin-left:auto;color:var(--text-muted);font-size:18px">✕</button>
    </div>
    <div style="display:flex;gap:16px;margin-bottom:16px;font-size:12px;color:var(--text-dim)">
      <span>📊 ${agent.tasks} tasks</span><span>📁 ${agent.files} files</span><span>🔤 ${(agent.tokens/1000).toFixed(1)}K tokens</span><span>💪 ${Math.round(agent.fitness*100)}% fitness</span>
    </div>
    ${agentNotes.length ? `<div style="margin-bottom:12px"><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px">Vault Notes (${agentNotes.length})</div>${agentNotes.slice(0,5).map(n => `<div style="padding:4px 0;font-size:12px;color:var(--text-dim)">📚 ${n.title}</div>`).join('')}</div>` : ''}
    ${agentTasks.length ? `<div><div style="font-size:11px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px">Tasks (${agentTasks.length})</div>${agentTasks.slice(0,5).map(t => `<div style="padding:4px 0;font-size:12px;color:var(--text-dim)">📋 ${t.title}</div>`).join('')}</div>` : ''}
  `;
  $('card-modal').classList.remove('hidden');
}

function attachFile() {
  toast('📎 File attachment — coming soon', 'info');
}

// ── Emoji Picker ──────────────────────────────────────────
let emojiTarget = null;

function toggleEmojiPicker(target) {
  emojiTarget = target;
  const picker = $('emoji-picker');
  picker.classList.toggle('hidden');
  if (!picker.classList.contains('hidden')) renderEmojiPicker();
}

function renderEmojiPicker() {
  const grid = $('emoji-grid');
  grid.innerHTML = EMOJIS_LIST.map(e => `
    <button onclick="selectEmoji('${e}')">${e}</button>
  `).join('');
}

function selectEmoji(emoji) {
  $('emoji-picker').classList.add('hidden');
  if (emojiTarget === 'message') {
    $('message-input').value += emoji;
    $('message-input').focus();
  } else if (emojiTarget === 'reaction' && window._reactionTarget) {
    toggleReaction(window._reactionTarget, emoji);
    window._reactionTarget = null;
  }
}

// Close emoji picker if click outside
document.addEventListener('click', e => {
  const picker = $('emoji-picker');
  if (!picker.classList.contains('hidden') &&
      !picker.contains(e.target) &&
      !e.target.closest('.emoji-btn')) {
    picker.classList.add('hidden');
  }
});

// ── Initial Talk render ───────────────────────────────────
function initTalk() {
  renderChannelList();
  // Default to first real channel (not phantom 'bridge')
  let firstCh = null;
  if (DC_CHANNELS.categories) {
    for (const cat of DC_CHANNELS.categories) {
      if (cat.channels && cat.channels.length > 0) {
        const textCh = cat.channels.find(c => (c.type || 'text') !== 'voice');
        if (textCh) { firstCh = textCh.id; break; }
      }
    }
  }
  if (!firstCh && DC_CHANNELS.text && DC_CHANNELS.text.length > 0) {
    firstCh = DC_CHANNELS.text[0].id;
  }
  switchChannel(firstCh || 'bridge');
}

// ═══════════════════════════════════════════════════════════
// SMART ROUTER — Ambient Agent Chat (FAB)
// ═══════════════════════════════════════════════════════════

const AGENT_ROUTES = [
  { id: 'researcher', emoji: '🔬', name: 'Researcher', keywords: ['research','analyze','compare','study','find','search','look up','investigate'] },
  { id: 'coder',      emoji: '💻', name: 'Coder',      keywords: ['build','fix','code','implement','deploy','script','debug','refactor','test'] },
  { id: 'ops',        emoji: '⚙️', name: 'Ops',        keywords: ['check','status','restart','health','disk','memory','cpu','service','uptime'] },
  { id: 'devil',      emoji: '😈', name: "Devil's Advocate", keywords: ['review','critique','challenge','risk','flaw','weakness','premortem'] },
  { id: 'utility',    emoji: '🔧', name: 'Utility',    keywords: ['cleanup','organize','scan','vault','security','index','backup'] },
  { id: 'righthand',  emoji: '🤝', name: 'Right Hand', keywords: [] },
];

let agentChatOpen = false;
let agentChatOverrideIdx = -1; // -1 = auto-detect

function detectAgentRoute(text) {
  if (agentChatOverrideIdx >= 0) return AGENT_ROUTES[agentChatOverrideIdx];
  const lower = text.toLowerCase();
  for (const route of AGENT_ROUTES) {
    if (route.keywords.some(kw => lower.includes(kw))) return route;
  }
  return AGENT_ROUTES[AGENT_ROUTES.length - 1]; // default: Right Hand
}

function cycleAgentRoute() {
  agentChatOverrideIdx = (agentChatOverrideIdx + 1) % AGENT_ROUTES.length;
  const route = AGENT_ROUTES[agentChatOverrideIdx];
  const badge = document.getElementById('agent-route-badge');
  if (badge) {
    badge.textContent = `→ ${route.emoji} ${route.name}`;
    badge.dataset.agent = route.id;
  }
}

function initAgentChatFAB() {
  // Create FAB button
  const fab = document.createElement('button');
  fab.id = 'agent-chat-fab';
  fab.className = 'agent-chat-fab';
  fab.textContent = '🧠';
  fab.onclick = toggleAgentChat;
  document.body.appendChild(fab);

  // Create chat panel
  const panel = document.createElement('div');
  panel.id = 'agent-chat-panel';
  panel.className = 'agent-chat-panel';
  panel.innerHTML = `
    <div class="agent-chat-header">
      <div class="agent-chat-header-left">
        <span class="agent-chat-title">🧠 Agent</span>
        <span class="agent-chat-subtitle">auto-routes to the best specialist</span>
      </div>
      <button class="agent-chat-close" onclick="toggleAgentChat()">✕</button>
    </div>
    <div class="agent-chat-messages" id="agent-chat-messages"></div>
    <div class="agent-chat-input-area">
      <input type="text" class="agent-chat-input" id="agent-chat-input"
        placeholder="Ask anything..."
        oninput="onAgentChatInput(this.value)"
        onkeydown="if(event.key==='Enter'){event.preventDefault();sendAgentChat();}">
      <button class="agent-route-badge" id="agent-route-badge" data-agent="righthand" onclick="cycleAgentRoute()">→ 🤝 Right Hand</button>
      <button class="agent-chat-send" onclick="sendAgentChat()">▶</button>
    </div>
  `;
  document.body.appendChild(panel);

  // Load history from localStorage
  loadAgentChatHistory();
}

function toggleAgentChat() {
  agentChatOpen = !agentChatOpen;
  const fab = document.getElementById('agent-chat-fab');
  const panel = document.getElementById('agent-chat-panel');
  fab.classList.toggle('open', agentChatOpen);
  fab.textContent = agentChatOpen ? '✕' : '🧠';
  panel.classList.toggle('open', agentChatOpen);
  if (agentChatOpen) {
    document.getElementById('agent-chat-input').focus();
  }
}

function onAgentChatInput(val) {
  if (agentChatOverrideIdx >= 0) return; // user overrode, don't auto-detect
  const route = detectAgentRoute(val);
  const badge = document.getElementById('agent-route-badge');
  if (badge) {
    badge.textContent = `→ ${route.emoji} ${route.name}`;
    badge.dataset.agent = route.id;
  }
}

function sendAgentChat() {
  const input = document.getElementById('agent-chat-input');
  const text = input.value.trim();
  if (!text) return;

  const route = detectAgentRoute(text);
  const container = document.getElementById('agent-chat-messages');

  // Add user bubble
  const userBubble = document.createElement('div');
  userBubble.className = 'agent-chat-bubble user';
  userBubble.textContent = text;
  container.appendChild(userBubble);

  // POST to bridge
  const payload = {
    message: text,
    agent: route.id,
    context: `page=${currentPage}`,
    page: currentPage,
  };

  const bridgeUrl = (typeof Bridge !== 'undefined' && Bridge.baseUrl) ? Bridge.baseUrl : '';
  fetch(`${bridgeUrl}/api/agent/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(r => r.json()).then(data => {
    // Agent response bubble
    const agentBubble = document.createElement('div');
    agentBubble.className = 'agent-chat-bubble agent';
    agentBubble.innerHTML = `<span class="bubble-agent-label" style="color:${getAgentColor(route.id)}">${route.emoji} ${route.name}</span>📨 Message sent to ${route.emoji} ${route.name}. They'll respond in the feed.`;
    container.appendChild(agentBubble);
    container.scrollTop = container.scrollHeight;
  }).catch(() => {
    // Fallback if bridge not available
    const agentBubble = document.createElement('div');
    agentBubble.className = 'agent-chat-bubble agent';
    agentBubble.innerHTML = `<span class="bubble-agent-label" style="color:${getAgentColor(route.id)}">${route.emoji} ${route.name}</span>📨 Message queued for ${route.emoji} ${route.name}. They'll respond in the feed.`;
    container.appendChild(agentBubble);
    container.scrollTop = container.scrollHeight;
  });

  // Save to localStorage
  saveAgentChatMessage({ role: 'user', text, agent: route.id, ts: Date.now() });
  saveAgentChatMessage({ role: 'agent', text: `📨 Message sent to ${route.emoji} ${route.name}. They'll respond in the feed.`, agent: route.id, agentEmoji: route.emoji, agentName: route.name, ts: Date.now() });

  input.value = '';
  agentChatOverrideIdx = -1; // reset override
  onAgentChatInput(''); // reset badge
  container.scrollTop = container.scrollHeight;

  toast(`📨 Routed to ${route.emoji} ${route.name}`, 'success', 2000);
}

function getAgentColor(agentId) {
  const colors = { researcher:'#89b4fa', coder:'#a6e3a1', ops:'#fab387', devil:'#f38ba8', utility:'#94e2d5', righthand:'#E8A838' };
  return colors[agentId] || '#cba6f7';
}

function saveAgentChatMessage(msg) {
  const history = JSON.parse(localStorage.getItem('agentOS-chatHistory') || '[]');
  history.push(msg);
  // Keep last 100 messages
  if (history.length > 100) history.splice(0, history.length - 100);
  localStorage.setItem('agentOS-chatHistory', JSON.stringify(history));
}

function loadAgentChatHistory() {
  const history = JSON.parse(localStorage.getItem('agentOS-chatHistory') || '[]');
  const container = document.getElementById('agent-chat-messages');
  if (!container) return;
  container.innerHTML = '';
  history.forEach(msg => {
    const bubble = document.createElement('div');
    bubble.className = `agent-chat-bubble ${msg.role}`;
    if (msg.role === 'agent') {
      bubble.innerHTML = `<span class="bubble-agent-label" style="color:${getAgentColor(msg.agent)}">${msg.agentEmoji || '🤝'} ${msg.agentName || 'Agent'}</span>${msg.text}`;
    } else {
      bubble.textContent = msg.text;
    }
    container.appendChild(bubble);
  });
  container.scrollTop = container.scrollHeight;
}

// ═══════════════════════════════════════════════════════════
// DASHBOARD — Home page header with agent status + metrics
// ═══════════════════════════════════════════════════════════
function renderDashboard() {
  // ── Agent Status Bar ──
  renderAgentStatusBar();

  // ── Quick Stats ──
  const tasksDone = feedEvents.filter(e => e.type === 'task_completed').length;
  const vaultWrites = feedEvents.filter(e => e.type === 'vault_write').length;
  const errors = feedEvents.filter(e => e.type === 'error').length;
  const activeAgents = AGENTS.filter(a => a.status === 'active').length;
  const pendingQ = (typeof queueCards !== 'undefined') ? queueCards.filter(q => !q._status || q._status === 'pending').length : 0;

  const el = (id, v) => { const e = document.getElementById(id); if(e) e.textContent = v; };
  el('qs-active', activeAgents);
  el('qs-completed', tasksDone);
  el('qs-proposals', pendingQ);
  el('qs-errors', errors);
  el('qs-vault', vaultWrites);

  // System metrics (try bridge)
  fetch('/api/overview').then(r => r.ok ? r.json() : null).then(d => {
    if (!d) return;
    if (d.load) el('qs-load', d.load.avg1.toFixed(1));
  }).catch(() => {});

  // ── Typing indicator ──
  updateTypingIndicator();

  // ── Filter chip counts ──
  updateFilterChipCounts();
}

// ── Agent Status Bar ──
function renderAgentStatusBar() {
  const bar = document.getElementById('agent-status-bar');
  if (!bar) return;
  bar.innerHTML = AGENTS.map(a => {
    const statusClass = a.status === 'active' ? 'is-active' : (a.status === 'error' ? 'is-error' : '');
    const dotClass = 'status-' + (a.status || 'idle');
    const tooltip = a.status === 'active' ? (a.task || 'Working') : (a.status === 'error' ? 'Error' : 'Idle');
    return `<div class="agent-status-pill ${statusClass}" title="${a.name}: ${tooltip}" onclick="openAgentDrawer('${a.id}')">
      <span class="agent-pill-emoji">${a.emoji}</span>
      <span class="agent-pill-name">${a.name}</span>
      <span class="agent-pill-dot ${dotClass}"></span>
      ${a.status === 'active' && a.task ? `<span class="agent-pill-task">${a.task.substring(0, 20)}${a.task.length > 20 ? '…' : ''}</span>` : ''}
    </div>`;
  }).join('');
}

// ── Typing Indicator ──
function updateTypingIndicator() {
  const indicator = document.getElementById('stream-typing-indicator');
  if (!indicator) return;
  const activeAgents = AGENTS.filter(a => a.status === 'active');
  if (activeAgents.length > 0) {
    const names = activeAgents.map(a => a.emoji + ' ' + a.name).join(', ');
    const text = document.getElementById('typing-text');
    if (text) text.textContent = names + (activeAgents.length === 1 ? ' is working...' : ' are working...');
    indicator.style.display = '';
  } else {
    indicator.style.display = 'none';
  }
}

// ── Filter Chip Counts ──
function updateFilterChipCounts() {
  const counts = {
    all: streamItems.length,
    action: streamItems.filter(i => ['proposal', 'question', 'error'].includes(i.type)).length,
    completed: streamItems.filter(i => i.type === 'completion').length,
    errors: streamItems.filter(i => i.severity === 'error' || i.severity === 'warn' || i.type === 'error').length,
    vault: streamItems.filter(i => i.type === 'vault' || i.streamType === 'vault_write').length,
    insights: streamItems.filter(i => i.type === 'activity' && (i.streamType === 'insight' || (i.title && i.title.toLowerCase().includes('insight')))).length,
  };
  Object.keys(counts).forEach(key => {
    const el = document.getElementById('chip-count-' + key);
    if (el) el.textContent = counts[key] > 0 ? counts[key] : '';
  });
}

// ── New Items Banner ──
let pendingNewItems = 0;

function showNewItemsBanner(count) {
  pendingNewItems += count;
  const banner = document.getElementById('stream-new-banner');
  const text = document.getElementById('new-banner-text');
  if (banner && text) {
    text.textContent = pendingNewItems + ' new item' + (pendingNewItems !== 1 ? 's' : '');
    banner.style.display = '';
  }
}

function scrollStreamToTop() {
  const list = document.getElementById('stream-list');
  if (list) list.scrollTop = 0;
  const banner = document.getElementById('stream-new-banner');
  if (banner) banner.style.display = 'none';
  pendingNewItems = 0;
}

// Run dashboard on feed render
const _origRenderFeed = renderFeed;
renderFeed = function() {
  _origRenderFeed();
  renderDashboard();
};

// Update page title for Home/Stream
PAGE_TITLES.feed = 'The Stream';

// ── Badge Polling ─────────────────────────────────────────
// Poll /api/proposals?status=pending every 30s to update inbox-badge and proposals-badge
let badgePollTimer = null;

function pollBadges() {
  if (!shouldPoll()) return;
  fetch('/api/proposals?status=pending')
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (!data) return;
      const count = Array.isArray(data) ? data.length : (data.count || 0);
      const inboxBadge = $('inbox-badge');
      const proposalsBadge = $('proposals-badge');
      if (inboxBadge) {
        inboxBadge.textContent = count || '';
      }
      if (proposalsBadge) {
        proposalsBadge.textContent = count || '';
      }
    })
    .catch(() => {/* bridge may be down */});
}

function startBadgePolling() {
  if (!badgePollTimer) {
    pollBadges(); // initial poll
    badgePollTimer = setInterval(pollBadges, 30000);
  }
}

// Start badge polling on load
startBadgePolling();

// ═══════════════════════════════════════════════════════════
// AGENT DRAWER — Live Activity Windows
// ═══════════════════════════════════════════════════════════

let agentDrawerOpen = false;
let agentDrawerCurrentId = null;

function openAgentDrawer(agentId) {
  const agent = ga(agentId);
  if (!agent) return;
  agentDrawerCurrentId = agentId;
  agentDrawerOpen = true;

  const drawer = $('agent-drawer');
  const overlay = $('agent-drawer-overlay');
  drawer.classList.add('open');
  overlay.classList.remove('hidden');

  renderAgentDrawerContent(agent);

  // Fetch live activity from bridge
  const bridgeUrl = (typeof Bridge !== 'undefined' && Bridge.baseUrl) ? Bridge.baseUrl : '';
  fetch(`${bridgeUrl}/api/agents/${agentId}/activity`)
    .then(r => r.ok ? r.json() : null)
    .then(data => {
      if (data && data.events) {
        renderDrawerActivity(data.events);
      }
    })
    .catch(() => {/* use mock data already rendered */});
}

function closeAgentDrawer() {
  agentDrawerOpen = false;
  agentDrawerCurrentId = null;
  $('agent-drawer').classList.remove('open');
  $('agent-drawer-overlay').classList.add('hidden');
}

function renderAgentDrawerContent(agent) {
  const statusClass = agent.status === 'active' ? 'active' : agent.status === 'error' ? 'error' : 'idle';
  const statusLabel = agent.status === 'active' ? `🟢 Active` : agent.status === 'error' ? '🔴 Error' : '⚫ Idle';
  const uptimeMin = Math.floor(Math.random() * 480 + 60);
  const uptimeStr = uptimeMin >= 60 ? `${Math.floor(uptimeMin/60)}h ${uptimeMin%60}m` : `${uptimeMin}m`;
  const tokensToday = agent.tokens || 0;
  const tasksDone = agent.tasks || 0;
  const tasksWeek = tasksDone + Math.floor(Math.random() * 20);
  const successRate = Math.floor(agent.fitness * 100);

  // Header
  $('agent-drawer-header').innerHTML = `
    <div class="drawer-header-top">
      <div class="drawer-avatar" style="background:${agent.color}20;border-color:${agent.color}">${agent.emoji}</div>
      <div class="drawer-agent-info">
        <div class="drawer-agent-name" style="color:${agent.color}">${agent.name}</div>
        <div class="drawer-agent-role">${agent.role}</div>
      </div>
      <button class="drawer-close-btn" onclick="closeAgentDrawer()">✕</button>
    </div>
    <div class="drawer-status-row">
      <span class="drawer-status-dot ${statusClass}"></span>
      <span>${statusLabel}${agent.task ? ' — ' + agent.task.substring(0, 40) : ''}</span>
    </div>
    <div class="drawer-stats-row">
      <div class="drawer-stat"><span class="drawer-stat-val">${uptimeStr}</span><span class="drawer-stat-label">Uptime</span></div>
      <div class="drawer-stat"><span class="drawer-stat-val">${(tokensToday/1000).toFixed(1)}K</span><span class="drawer-stat-label">Tokens</span></div>
      <div class="drawer-stat"><span class="drawer-stat-val">${successRate}%</span><span class="drawer-stat-label">Success</span></div>
      <div class="drawer-stat"><span class="drawer-stat-val">${Math.round(agent.fitness*100)}</span><span class="drawer-stat-label">Fitness</span></div>
    </div>
  `;

  // Body
  const recentActions = feedEvents
    .filter(e => e.agent === agent.id)
    .slice(0, 5)
    .map(e => {
      const icon = TYPE_ICONS[e.type] || '📝';
      return `<div class="drawer-action-item">
        <span class="drawer-action-dot"></span>
        <span>${icon} ${e.content.substring(0, 60)}${e.content.length > 60 ? '…' : ''}</span>
        <span class="drawer-action-time">${e.time}</span>
      </div>`;
    }).join('');

  // Mock conversation
  const dmMsgs = (typeof DM_MESSAGES !== 'undefined' && DM_MESSAGES[agent.id]) ? DM_MESSAGES[agent.id].slice(-10) : [];
  const msgsHTML = dmMsgs.map(m => {
    const isUser = m.agent === 'user';
    return `<div class="drawer-msg ${isUser ? 'from-user' : 'from-agent'}">
      ${!isUser ? `<span class="drawer-msg-sender" style="color:${agent.color}">${agent.emoji} ${agent.name}</span>` : ''}
      ${m.text.substring(0, 150)}
    </div>`;
  }).join('');

  // Sparkline data (mock token usage)
  const sparkBars = Array.from({length: 12}, () => Math.floor(Math.random() * 24 + 4));
  const maxSpark = Math.max(...sparkBars);
  const sparkHTML = sparkBars.map(v =>
    `<div class="drawer-spark-bar" style="height:${Math.round(v/maxSpark*100)}%;background:${agent.color}"></div>`
  ).join('');

  $('agent-drawer-body').innerHTML = `
    ${agent.status === 'active' && agent.task ? `
      <div class="drawer-section">
        <div class="drawer-section-title">Currently Working On</div>
        <div class="drawer-current-task">
          <span class="drawer-task-pulse"></span>
          <span>${agent.task}</span>
        </div>
      </div>
    ` : ''}
    <div class="drawer-section">
      <div class="drawer-section-title">Recent Actions</div>
      ${recentActions || '<div style="font-size:12px;color:var(--text-muted)">No recent activity</div>'}
    </div>
    <div class="drawer-section">
      <div class="drawer-section-title">Conversation</div>
      <div class="drawer-messages">${msgsHTML || '<div style="font-size:12px;color:var(--text-muted)">No messages yet</div>'}</div>
      <div class="drawer-msg-input-area">
        <input type="text" class="drawer-msg-input" id="drawer-msg-input"
          placeholder="Message ${agent.name}..."
          onkeydown="if(event.key==='Enter'){event.preventDefault();sendDrawerMessage('${agent.id}');}">
        <button class="drawer-msg-send" onclick="sendDrawerMessage('${agent.id}')">▶</button>
      </div>
    </div>
    <div class="drawer-section">
      <div class="drawer-section-title">Stats</div>
      <div style="display:flex;gap:16px;margin-bottom:10px;">
        <div><span style="font-size:18px;font-weight:700;color:var(--text)">${tasksDone}</span><span style="font-size:11px;color:var(--text-muted)"> today</span></div>
        <div><span style="font-size:18px;font-weight:700;color:var(--text)">${tasksWeek}</span><span style="font-size:11px;color:var(--text-muted)"> this week</span></div>
      </div>
      <div class="drawer-section-title" style="margin-top:8px">Token Usage (24h)</div>
      <div class="drawer-sparkline">${sparkHTML}</div>
    </div>
  `;

  // Footer
  $('agent-drawer-footer').innerHTML = `
    <button class="drawer-action-btn" onclick="drawerAssignTask('${agent.id}')">📋 Assign Task</button>
    <button class="drawer-action-btn" onclick="drawerPauseAgent('${agent.id}')">⏸️ Pause</button>
    <button class="drawer-action-btn" onclick="drawerConfigAgent('${agent.id}')">🔧 Config</button>
  `;
}

function renderDrawerActivity(events) {
  const section = $('agent-drawer-body')?.querySelector('.drawer-section');
  if (!section) return;
  // Merge live events into the recent actions display
  const actionsContainer = section.querySelector('.drawer-section-title + div') || section;
  if (events.length > 0) {
    const html = events.slice(0, 5).map(e => `
      <div class="drawer-action-item">
        <span class="drawer-action-dot"></span>
        <span>${e.content || e.text || ''}</span>
        <span class="drawer-action-time">${e.time || ''}</span>
      </div>
    `).join('');
    // Find the recent actions section by title and replace
    const allSections = $('agent-drawer-body').querySelectorAll('.drawer-section');
    if (allSections[1]) { // second section = recent actions (or first if no current task)
      const titleEl = allSections[0].querySelector('.drawer-section-title');
      if (titleEl && titleEl.textContent.includes('Recent')) {
        allSections[0].innerHTML = `<div class="drawer-section-title">Recent Actions</div>${html}`;
      }
    }
  }
}

function sendDrawerMessage(agentId) {
  const input = $('drawer-msg-input');
  if (!input || !input.value.trim()) return;
  const text = input.value.trim();
  input.value = '';

  // Add to UI
  const container = $('agent-drawer-body')?.querySelector('.drawer-messages');
  if (container) {
    const bubble = document.createElement('div');
    bubble.className = 'drawer-msg from-user';
    bubble.textContent = text;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
  }

  // POST to bridge
  const bridgeUrl = (typeof Bridge !== 'undefined' && Bridge.baseUrl) ? Bridge.baseUrl : '';
  fetch(`${bridgeUrl}/api/agent/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agentId, message: text }),
  }).catch(() => {});

  toast(`📨 Sent to ${(ga(agentId) || {}).emoji || ''} ${(ga(agentId) || {}).name || agentId}`, 'success', 2000);
}

function drawerAssignTask(agentId) {
  closeAgentDrawer();
  // Pre-fill task creation
  const agent = ga(agentId);
  const title = prompt(`Assign task to ${agent?.emoji || ''} ${agent?.name || agentId}:`);
  if (!title) return;

  const bridgeUrl = (typeof Bridge !== 'undefined' && Bridge.baseUrl) ? Bridge.baseUrl : '';
  fetch(`${bridgeUrl}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, agent: agentId, priority: 'P2', description: '' }),
  }).catch(() => {});

  toast(`📋 Task assigned to ${agent?.emoji || ''} ${agent?.name || agentId}`, 'success');
}

function drawerPauseAgent(agentId) {
  const agent = ga(agentId);
  const bridgeUrl = (typeof Bridge !== 'undefined' && Bridge.baseUrl) ? Bridge.baseUrl : '';
  fetch(`${bridgeUrl}/api/agents/${agentId}/pause`, { method: 'POST' }).catch(() => {});
  if (agent) { agent.status = 'idle'; agent.task = ''; }
  toast(`⏸️ ${agent?.emoji || ''} ${agent?.name || agentId} paused`, 'info');
  closeAgentDrawer();
  if (typeof updateActiveAgents === 'function') updateActiveAgents();
}

function drawerConfigAgent(agentId) {
  closeAgentDrawer();
  nav('config');
  toast(`🔧 Showing config for ${(ga(agentId) || {}).name || agentId}`, 'info');
}

// Escape key closes drawer
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && agentDrawerOpen) {
    closeAgentDrawer();
  }
});

// Event delegation: make all agent emojis/names clickable
document.addEventListener('click', e => {
  // Check for agent name elements (feed cards, dashboard, etc.)
  const agentName = e.target.closest('.feed-agent-name, .dash-agent, .health-agent, .member-item');

  if (e.target.classList.contains('feed-agent-name')) {
    const card = e.target.closest('.feed-card');
    if (card) {
      const event = feedEvents.find(ev => ev.id === card.dataset.id);
      if (event) { openAgentDrawer(event.agent); return; }
    }
  }

  if (e.target.closest('.dash-agent')) {
    const dashAgent = e.target.closest('.dash-agent');
    const agentObj = AGENTS.find(a => dashAgent.textContent.includes(a.name));
    if (agentObj) { openAgentDrawer(agentObj.id); return; }
  }

  if (e.target.closest('.health-agent')) {
    const healthRow = e.target.closest('.health-row');
    if (healthRow) {
      const agentObj = AGENTS.find(a => healthRow.textContent.includes(a.name));
      if (agentObj) { openAgentDrawer(agentObj.id); return; }
    }
  }
});

// ═══════════════════════════════════════════════════════════
// ENTITY LINKING — Universal cross-page navigation
// ═══════════════════════════════════════════════════════════

let _entityNavHistory = [];

function goToEntity(type, id, extra) {
  // Record where we came from
  _entityNavHistory.push(currentPage);

  switch(type) {
    case 'agent':
      if (typeof openAgentDrawer === 'function') openAgentDrawer(id);
      break;
    case 'task':
      if (typeof nav === 'function') {
        nav('pipelines');
        setTimeout(() => {
          if (typeof selectTask === 'function') selectTask(id);
          else if (typeof openCtxPanel === 'function') openCtxPanel('task', id);
        }, 300);
      }
      break;
    case 'proposal':
      nav('queue');
      setTimeout(() => {
        if (typeof selectProposal === 'function') selectProposal(id);
        else {
          // Scroll to proposal card
          const card = document.getElementById('qcard-' + id);
          if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      break;
    case 'mission':
      nav('missions');
      setTimeout(() => {
        if (typeof selectMCMission === 'function') selectMCMission(id);
      }, 300);
      break;
    case 'note':
      nav('mind');
      setTimeout(() => {
        if (typeof mindShowNote === 'function') {
          mindShowNote(id);
        } else if (typeof setMindTab === 'function') {
          setMindTab('reader');
          // Try to open note by path or id
          if (typeof openVaultNote === 'function') {
            const note = (typeof VAULT_NOTES !== 'undefined') ? VAULT_NOTES.find(n => n.id === id || n.title === id || (n.path && n.path.includes(id))) : null;
            if (note) openVaultNote(note);
          }
        }
      }, 300);
      break;
    case 'channel':
      nav('talk');
      setTimeout(() => {
        if (typeof switchChannel === 'function') switchChannel(id);
      }, 300);
      break;
    case 'room':
      nav('rooms');
      setTimeout(() => {
        if (typeof selectRoom === 'function') selectRoom(id);
      }, 300);
      break;
  }

  // Show breadcrumb
  const fromPage = _entityNavHistory[_entityNavHistory.length - 1];
  const fromLabel = PAGE_TITLES[fromPage] || fromPage || 'Home';
  const entityLabel = extra || id || type;
  const typeEmojis = { agent: '🤖', task: '📋', proposal: '💡', mission: '🎯', note: '📚', channel: '💬', room: '🏠' };
  showBreadcrumbTrail(fromLabel, `${typeEmojis[type] || ''} ${type}: ${entityLabel}`);
}

function showBreadcrumbTrail(fromPage, entityDesc) {
  const bar = document.getElementById('breadcrumb-bar');
  const trail = document.getElementById('breadcrumb-trail');
  if (!bar || !trail) return;
  trail.innerHTML = `<span class="bc-page" onclick="entityNavBack()">${fromPage}</span><span class="bc-sep">→</span><span class="bc-entity">${entityDesc}</span>`;
  bar.style.display = 'flex';
}

function clearBreadcrumb() {
  const bar = document.getElementById('breadcrumb-bar');
  if (bar) bar.style.display = 'none';
  _entityNavHistory = [];
}

function entityNavBack() {
  const prevPage = _entityNavHistory.pop();
  if (prevPage) {
    nav(prevPage);
  }
  clearBreadcrumb();
}

// Escape key goes back via breadcrumb
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && _entityNavHistory.length > 0 && !agentDrawerOpen && !paletteOpen && !ctxPanelOpen) {
    entityNavBack();
  }
});

// ── Entity Link Helpers ──────────────────────────────────

function agentLink(agentId, label) {
  const safeId = (agentId || '').replace(/'/g, "\\'");
  const agentObj = ga(agentId);
  const displayLabel = label || (agentObj ? agentObj.name : agentId) || agentId;
  return `<span class="entity-link entity-agent" onclick="event.stopPropagation();goToEntity('agent','${safeId}','${displayLabel.replace(/'/g, "\\'")}')" title="Click to view agent">${displayLabel}</span>`;
}

function taskLink(taskId, label) {
  const safeId = (taskId || '').replace(/'/g, "\\'");
  const displayLabel = label || taskId;
  return `<span class="entity-link entity-task" onclick="event.stopPropagation();goToEntity('task','${safeId}','${(displayLabel||'').replace(/'/g, "\\'")}')" title="Click to view task">${displayLabel}</span>`;
}

function proposalLink(proposalId, label) {
  const safeId = (proposalId || '').replace(/'/g, "\\'");
  const displayLabel = label || proposalId;
  return `<span class="entity-link entity-proposal" onclick="event.stopPropagation();goToEntity('proposal','${safeId}','${(displayLabel||'').replace(/'/g, "\\'")}')" title="Click to view proposal">${displayLabel}</span>`;
}

function missionLink(missionId, label) {
  const safeId = (missionId || '').replace(/'/g, "\\'");
  const displayLabel = label || missionId;
  return `<span class="entity-link entity-mission" onclick="event.stopPropagation();goToEntity('mission','${safeId}','${(displayLabel||'').replace(/'/g, "\\'")}')" title="Click to view mission">${displayLabel}</span>`;
}

function noteLink(noteId, label) {
  const safeId = (noteId || '').replace(/'/g, "\\'");
  const displayLabel = label || noteId;
  return `<span class="entity-link entity-note" onclick="event.stopPropagation();goToEntity('note','${safeId}','${(displayLabel||'').replace(/'/g, "\\'")}')" title="Click to view note">${displayLabel}</span>`;
}

function channelLink(channelId, label) {
  const safeId = (channelId || '').replace(/'/g, "\\'");
  const displayLabel = label || ('#' + channelId);
  return `<span class="entity-link entity-channel" onclick="event.stopPropagation();goToEntity('channel','${safeId}','${(displayLabel||'').replace(/'/g, "\\'")}')" title="Click to open channel">${displayLabel}</span>`;
}

// ═══════════════════════════════════════════════════════════
// OMNIBUS INPUT — Universal command bar
// ═══════════════════════════════════════════════════════════

const OMNIBUS_ROUTES = [
  { id: 'coder',      emoji: '💻', name: 'Coder',         keywords: ['code','build','fix','implement','deploy','script','debug','refactor','test','compile','npm','git'] },
  { id: 'researcher', emoji: '🔬', name: 'Researcher',    keywords: ['research','find','compare','analyze','study','investigate','look up','search for','what is','who is'] },
  { id: 'ops',        emoji: '⚙️', name: 'Ops',           keywords: ['system','service','restart','health','disk','memory','cpu','uptime','status','server','deploy','cron'] },
  { id: 'task',       emoji: '📋', name: 'New Task',      keywords: ['task','todo','create','assign','schedule','plan','add'] },
  { id: 'search',     emoji: '🔍', name: 'Search Vault',  keywords: [] }, // triggered by ? prefix or 'search'/'find' prefix
  { id: 'navigate',   emoji: '🧭', name: 'Navigate',      keywords: [] }, // triggered by page name match
  { id: 'righthand',  emoji: '🤝', name: 'Right Hand',    keywords: [] }, // default fallback
];

const NAV_PAGES = {
  'home': 'feed', 'feed': 'feed', 'dashboard': 'feed',
  'talk': 'talk', 'chat': 'talk', 'messages': 'talk',
  'queue': 'queue', 'proposals': 'queue',
  'mind': 'mind', 'vault': 'mind', 'knowledge': 'mind',
  'pulse': 'pulse', 'system': 'pulse',
  'board': 'board', 'tasks': 'tasks',
  'plans': 'plans', 'kanban': 'plans',
  'schedule': 'schedule', 'calendar': 'schedule',
  'missions': 'missions', 'goals': 'missions',
  'explore': 'explore',
  'config': 'config', 'settings': 'config',
  'stream': 'stream', 'logs': 'stream',
};

function detectOmnibusRoute(text) {
  const lower = text.toLowerCase().trim();
  if (!lower) return { id: 'righthand', emoji: '🤝', name: 'Right Hand', label: 'default' };

  // Check navigation first
  for (const [keyword, page] of Object.entries(NAV_PAGES)) {
    if (lower === keyword || lower === `go to ${keyword}` || lower === `open ${keyword}`) {
      return { id: 'navigate', emoji: '🧭', name: 'Navigate', label: `→ ${PAGE_TITLES[page] || page}`, page };
    }
  }

  // Search vault
  if (lower.startsWith('?') || lower.startsWith('search ') || lower.startsWith('find ')) {
    return { id: 'search', emoji: '🔍', name: 'Search Vault', label: 'search vault' };
  }

  // Keyword matching
  for (const route of OMNIBUS_ROUTES) {
    if (route.keywords.length === 0) continue;
    if (route.keywords.some(kw => lower.includes(kw))) {
      return { ...route, label: route.name };
    }
  }

  return { id: 'righthand', emoji: '🤝', name: 'Right Hand', label: 'default' };
}

function focusOmnibus() {
  $('omnibus-input').focus();
}

function onOmnibusFocus() {
  const val = $('omnibus-input').value;
  if (val.trim()) {
    $('omnibus-route-preview').classList.remove('hidden');
  }
}

function onOmnibusBlur() {
  // Delay to allow click on preview
  setTimeout(() => {
    $('omnibus-route-preview').classList.add('hidden');
  }, 200);
}

function onOmnibusInput(val) {
  const preview = $('omnibus-route-preview');
  if (!val.trim()) {
    preview.classList.add('hidden');
    return;
  }

  const route = detectOmnibusRoute(val);
  preview.classList.remove('hidden');

  const routeColors = {
    coder: '#a6e3a1', researcher: '#89b4fa', ops: '#fab387',
    task: '#f9e2af', search: '#94e2d5', navigate: '#cba6f7', righthand: '#E8A838'
  };
  const color = routeColors[route.id] || '#E8A838';

  preview.innerHTML = `
    <div class="omnibus-route-badge">
      <span class="omnibus-route-icon">${route.emoji}</span>
      <span style="color:${color}">${route.name}</span>
      ${route.label && route.label !== route.name ? `<span class="omnibus-route-label">${route.label}</span>` : ''}
    </div>
  `;
}

function handleOmnibusKey(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    submitOmnibus();
  }
  if (e.key === 'Escape') {
    $('omnibus-input').blur();
    $('omnibus-input').value = '';
    $('omnibus-route-preview').classList.add('hidden');
  }
}

async function submitOmnibus() {
  const input = $('omnibus-input');
  const text = input.value.trim();
  if (!text) return;

  const route = detectOmnibusRoute(text);
  input.value = '';
  $('omnibus-route-preview').classList.add('hidden');
  input.blur();

  const bridgeUrl = (typeof Bridge !== 'undefined' && Bridge.baseUrl) ? Bridge.baseUrl : '';
  const lower = text.toLowerCase();

  // Detect "search vault for X" pattern
  if (lower.includes('search vault') || lower.includes('search mind') || lower.startsWith('vault ')) {
    const query = text.replace(/^.*(?:search\s+(?:vault|mind)\s+(?:for\s+)?|vault\s+)/i, '').trim();
    nav('mind');
    setTimeout(() => {
      const searchInput = $('mind-search-input') || $('mind-search');
      if (searchInput) {
        searchInput.value = query;
        if (typeof doMindSearch === 'function') doMindSearch();
        else if (typeof searchMind === 'function') searchMind(query);
      }
    }, 300);
    toast(`🔍 Searching vault: "${query}"`, 'info', 2000);
    addXP(5, 'omnibus search');
    return;
  }

  // Detect "dispatch task: Y" pattern
  if (lower.startsWith('dispatch') || lower.includes('dispatch task')) {
    const title = text.replace(/^.*dispatch\s*(?:task)?:?\s*/i, '').trim() || text;
    try {
      const resp = await fetch(`${bridgeUrl}/api/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, priority: 'P2', description: '' }),
      });
      if (resp.ok) {
        toast(`🚀 Dispatched: "${title}"`, 'success', 2500);
      } else {
        toast(`❌ Dispatch failed`, 'error');
      }
    } catch (e) {
      toast(`❌ Dispatch failed: ${e.message}`, 'error');
    }
    addXP(5, 'omnibus dispatch');
    return;
  }

  // Detect "send message: Z" pattern
  if (lower.startsWith('send') || lower.includes('send message')) {
    const msg = text.replace(/^.*(?:send\s+(?:message)?:?\s*)/i, '').trim();
    if (msg) {
      try {
        await fetch(`${bridgeUrl}/api/agent/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: msg, agent: 'righthand', context: 'omnibus', page: currentPage }),
        });
        toast(`📨 Message sent`, 'success', 2500);
      } catch (e) {
        toast(`❌ Send failed: ${e.message}`, 'error');
      }
    }
    addXP(5, 'omnibus send');
    return;
  }

  // Detect "check system" pattern
  if (lower.includes('check system') || lower.includes('system status')) {
    nav('pulse');
    toast(`⚙️ Opening System page`, 'info', 2000);
    addXP(5, 'omnibus navigate');
    return;
  }

  switch (route.id) {
    case 'navigate':
      nav(route.page);
      toast(`🧭 Navigating to ${PAGE_TITLES[route.page] || route.page}`, 'info', 2000);
      break;

    case 'search': {
      const query = text.replace(/^\??\s*(search|find)\s*/i, '');
      nav('mind');
      setTimeout(() => {
        const searchInput = $('mind-search-input') || $('mind-search');
        if (searchInput) {
          searchInput.value = query;
          if (typeof doMindSearch === 'function') doMindSearch();
          else if (typeof searchMind === 'function') searchMind(query);
        }
      }, 300);
      toast(`🔍 Searching vault: "${query}"`, 'info', 2000);
      break;
    }

    case 'task': {
      const title = text.replace(/^(task|todo|create|assign|add)\s*/i, '').trim() || text;
      try {
        await fetch(`${bridgeUrl}/api/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, priority: 'P2', description: '' }),
        });
        toast(`📋 Created task: "${title}"`, 'success', 2500);
      } catch (e) {
        toast(`❌ Task creation failed: ${e.message}`, 'error');
      }
      break;
    }

    case 'coder':
    case 'researcher':
    case 'ops':
    case 'righthand': {
      try {
        await fetch(`${bridgeUrl}/api/agent/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, agent: route.id, context: 'omnibus', page: currentPage }),
        });
        toast(`${route.emoji} Sent to ${route.name}`, 'success', 2500);
      } catch (e) {
        toast(`❌ Send failed: ${e.message}`, 'error');
      }
      break;
    }

    default:
      toast(`${route.emoji} ${route.name}: "${text}"`, 'info', 2500);
  }

  addXP(5, 'omnibus command');
}

// Keyboard shortcut: ⌘K opens command palette (handled by global handler in ux.js)
// / on feed page is handled by feed keydown handler above

// ═══════════════════════════════════════════════════════════
// CONNECTION STATUS INDICATOR
// ═══════════════════════════════════════════════════════════

let _connStatus = 'connecting'; // 'live' | 'offline' | 'connecting'

function updateConnectionStatus(status) {
  _connStatus = status;
  const dot = $('conn-dot');
  const label = $('conn-label');
  if (!dot || !label) return;

  dot.className = 'conn-dot ' + status;
  switch (status) {
    case 'live':
      label.textContent = 'Live';
      label.style.color = 'var(--green)';
      break;
    case 'offline':
      label.textContent = 'Offline';
      label.style.color = 'var(--red)';
      break;
    case 'connecting':
      label.textContent = 'Connecting…';
      label.style.color = 'var(--yellow)';
      break;
  }
}

// Auto-detect connection status from Bridge
function pollConnectionStatus() {
  if (typeof Bridge !== 'undefined') {
    if (Bridge.liveMode && Bridge.ws && Bridge.ws.readyState === WebSocket.OPEN) {
      updateConnectionStatus('live');
    } else if (Bridge.liveMode && Bridge.ws && Bridge.ws.readyState === WebSocket.CONNECTING) {
      updateConnectionStatus('connecting');
    } else {
      // Try a quick health check
      fetch('/api/health', { signal: AbortSignal.timeout(3000) })
        .then(r => r.ok ? updateConnectionStatus('live') : updateConnectionStatus('offline'))
        .catch(() => updateConnectionStatus('offline'));
    }
  } else {
    fetch('/api/health', { signal: AbortSignal.timeout(3000) })
      .then(r => r.ok ? updateConnectionStatus('live') : updateConnectionStatus('offline'))
      .catch(() => updateConnectionStatus('offline'));
  }
}

// Poll connection every 10s
setInterval(pollConnectionStatus, 10000);
pollConnectionStatus();

// ═══════════════════════════════════════════════════════════
// TOPBAR CLOCK
// ═══════════════════════════════════════════════════════════

function updateTopbarClock() {
  const el = $('topbar-clock');
  if (!el) return;
  const now = new Date();
  el.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

updateTopbarClock();
setInterval(updateTopbarClock, 60000);

// ═══════════════════════════════════════════════════════════
// SIDEBAR ACTIVE AGENT COUNT
// ═══════════════════════════════════════════════════════════

function updateSidebarAgentCount() {
  const count = AGENTS.filter(a => a.status === 'active').length;
  const el = $('sidebar-active-count');
  if (el) el.textContent = `${count} active`;
  const topEl = $('active-agents-text');
  if (topEl) topEl.textContent = `${count} active`;
}

updateSidebarAgentCount();
setInterval(updateSidebarAgentCount, 5000);

// ═══════════════════════════════════════════════════════════
// MISSING FUNCTION STUBS — Referenced in index.html but undefined
// ═══════════════════════════════════════════════════════════

function addBoardCard() {
  toast('📋 New card — this board is legacy; use Tasks or Plans instead', 'info');
}

function closeModal() {
  const modal = $('card-modal');
  if (modal) modal.classList.add('hidden');
}

function closeModalIfOutside(event) {
  if (event.target.id === 'card-modal') closeModal();
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelectorAll('.theme-option').forEach(el => {
    el.classList.toggle('active', el.textContent.trim().toLowerCase() === theme);
  });
  try { localStorage.setItem('agentOS-theme', theme); } catch {}
  toast(`🎨 Theme: ${theme}`, 'info', 2000);
}

// Restore saved theme on load
(function() {
  try {
    const saved = localStorage.getItem('agentOS-theme');
    if (saved) document.documentElement.setAttribute('data-theme', saved);
  } catch {}
})();

function expandChannelTopic() {
  const el = $('channel-topic');
  if (!el) return;
  el.classList.toggle('expanded');
}

function toggleChannelInfo() {
  const panel = $('channel-info-panel');
  if (!panel) return;
  panel.classList.toggle('hidden');
  if (!panel.classList.contains('hidden')) {
    const content = $('channel-info-content');
    if (content && typeof currentChannel !== 'undefined') {
      const ch = typeof DC_CHANNELS !== 'undefined' ? (DC_CHANNELS.channels || DC_CHANNELS[currentChannel] || []).find(c => c.id === currentChannel || c.name === currentChannel) : null;
      content.innerHTML = ch
        ? `<div style="padding:12px"><strong>#${ch.name || currentChannel}</strong><p style="color:var(--text-muted);margin:8px 0">${ch.topic || 'No topic set'}</p></div>`
        : `<div style="padding:12px"><strong>#${currentChannel}</strong><p style="color:var(--text-muted);margin:8px 0">No info available</p></div>`;
    }
  }
}

function toggleLevelFilter(level, btn) {
  if (btn) btn.classList.toggle('active');
  // Filter stream log entries by level
  const activelevels = new Set();
  document.querySelectorAll('.level-chip.active').forEach(c => activelevels.add(c.dataset.level));
  document.querySelectorAll('#stream-log .log-line').forEach(line => {
    const lineLevel = line.dataset?.level || 'info';
    line.style.display = activelevels.has(lineLevel) ? '' : 'none';
  });
}

// ═══════════════════════════════════════════════════════════
// HASH-BASED ROUTING — URL hash updates on page switch
// ═══════════════════════════════════════════════════════════

// Patch nav to update URL hash
const _origNavHash = nav;
nav = function(page) {
  _origNavHash(page);
  if (!window._suppressHashWrite) {
    if (page && page !== 'feed') {
      history.replaceState(null, '', '#' + page);
    } else {
      history.replaceState(null, '', location.pathname);
    }
  }
};

// On load, navigate to hash page if present
(function() {
  const hash = location.hash.replace('#', '');
  if (hash && PAGE_TITLES[hash]) {
    // Defer to after DOMContentLoaded / init
    setTimeout(() => nav(hash), 100);
  }
})();

// Handle browser back/forward
window.addEventListener('hashchange', () => {
  const hash = location.hash.replace('#', '');
  if (hash && PAGE_TITLES[hash] && hash !== currentPage) {
    // Use window.nav (which includes all wrappers) but suppress hash write
    window._suppressHashWrite = true;
    window.nav(hash);
    window._suppressHashWrite = false;
  } else if (!hash && currentPage !== 'feed') {
    window._suppressHashWrite = true;
    window.nav('feed');
    window._suppressHashWrite = false;
  }
});
