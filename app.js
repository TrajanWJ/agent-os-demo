/* Agent OS v5 — app.js — Core + Feed + Queue + Talk */
'use strict';

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
  feed: 'Home', queue: 'Proposals', plans: 'Plans', talk: 'Talk',
  mind: 'Mind', pulse: 'System', board: 'Board',
  stream: 'Stream', command: 'Command', config: 'Config',
  schedule: 'Schedule', missions: 'Missions', explore: 'Explore'
};

// ── Navigation ────────────────────────────────────────────
function nav(page) {
  if (currentPage === page) return;

  // Deactivate old
  const oldView = $('view-' + currentPage);
  if (oldView) { oldView.classList.remove('active'); oldView.style.display = 'none'; }

  // Update sidebar
  $$('.nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  $$('.mobile-nav-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));

  // Activate new
  const newView = $('view-' + page);
  if (newView) {
    newView.classList.remove('hidden');
    newView.style.display = '';
    newView.classList.add('active');
  }

  currentPage = page;
  $('page-title').textContent = PAGE_TITLES[page] || page;

  // Lazy init pages
  if (page === 'feed')     renderDashboard();
  if (page === 'talk' && typeof Bridge !== 'undefined' && Bridge.liveMode && typeof _liveChannelData !== 'undefined') {
    // Ensure currentChannel is a numeric Discord ID when bridge is live
    if (!/^\d+$/.test(currentChannel) && _liveChannelData?.flat?.length) {
      const match = _liveChannelData.flat.find(c => c.name === currentChannel || c.name.includes(currentChannel));
      if (match) currentChannel = match.id;
      else currentChannel = _liveChannelData.flat[0].id;
    }
    if (typeof renderChannelList === 'function') renderChannelList();
    if (typeof loadLiveMessages === 'function') loadLiveMessages(currentChannel);
  }
  if (page === 'mind')     initMind();
  if (page === 'pulse')    renderPulse();
  if (page === 'plans')    renderPlans();
  if (page === 'board')    renderBoard();
  if (page === 'stream')   renderStream();
  if (page === 'config')   renderConfig();
  if (page === 'command')  initCommand();
  if (page === 'schedule') renderSchedule();
  if (page === 'missions') renderMissions();
  if (page === 'explore')  renderExplore();

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
// FEED PAGE
// ═══════════════════════════════════════════════════════════

let feedFilter = 'all';
let feedEvents = [...FEED_EVENTS];

const TYPE_ICONS = {
  task_started:   '▶️',
  task_completed: '✅',
  file_changed:   '📝',
  question_asked: '❓',
  error:          '🔴',
  insight:        '💡',
  vault_write:    '📚',
};

const TYPE_LABELS = {
  task_started:   'started',
  task_completed: 'completed',
  file_changed:   'file',
  question_asked: 'question',
  error:          'error',
  insight:        'insight',
  vault_write:    'vault',
};

// ═══════════════════════════════════════════════════════════
// DASHBOARD — Mission Control
// ═══════════════════════════════════════════════════════════

let dashFeedExpanded = false;

function renderDashboard() {
  renderDashAgents();
  renderDashMetrics();
  renderDashPulse();
  renderFeed();
  applyDashFeedLimit();
  lucide.createIcons();
}

function renderDashAgents() {
  const bar = $('dash-agents-bar');
  if (!bar) return;
  bar.innerHTML = AGENTS.map(a => {
    const isActive = a.status === 'active';
    const taskText = a.task || 'Idle';
    return `
      <div class="dash-agent-card" onclick="openTalkWithAgent('${a.id}')" title="${a.name} — ${taskText}">
        <div class="dash-agent-card-top">
          <span class="dash-agent-emoji">${a.emoji}</span>
          <span class="dash-agent-name" style="color:${a.color}">${a.name}</span>
          <span class="dash-agent-status ${isActive ? 'active' : 'idle'}"></span>
        </div>
        <div class="dash-agent-task">${isActive ? taskText : 'Idle'}</div>
      </div>`;
  }).join('');
}

function renderDashMetrics() {
  const el = $('dash-metrics');
  if (!el) return;
  const activeCount = AGENTS.filter(a => a.status === 'active').length;
  const queueDepth = typeof queueCards !== 'undefined' ? queueCards.length : 0;
  const tasksToday = AGENTS.reduce((s, a) => s + (a.tasks || 0), 0);
  const totalTokens = AGENTS.reduce((s, a) => s + (a.tokens || 0), 0);
  const tokenStr = totalTokens >= 1000 ? (totalTokens / 1000).toFixed(1) + 'K' : totalTokens.toString();

  const cards = [
    { icon: 'users',        num: activeCount, label: 'Active Agents',  trend: '↑ 2',   dir: 'up' },
    { icon: 'inbox',        num: queueDepth,  label: 'Proposals',      trend: queueDepth > 5 ? '↑ High' : '→ Normal', dir: queueDepth > 5 ? 'down' : 'flat' },
    { icon: 'check-circle', num: tasksToday,   label: 'Tasks Today',    trend: '↑ 12%', dir: 'up' },
    { icon: 'zap',          num: tokenStr,     label: 'Token Usage',    trend: '49.9K budget', dir: 'flat' },
  ];

  el.innerHTML = cards.map(c => `
    <div class="dash-stat-card">
      <div class="dash-stat-icon">
        <i data-lucide="${c.icon}"></i>
        <span class="dash-stat-trend ${c.dir}">${c.trend}</span>
      </div>
      <div class="dash-stat-number">${c.num}</div>
      <div class="dash-stat-label">${c.label}</div>
    </div>`).join('');
}

function renderDashPulse() {
  const el = $('dash-pulse');
  if (!el) return;
  el.innerHTML = `
    <div class="dash-pulse-title"><i data-lucide="heart-pulse"></i> System Pulse</div>
    <div class="dash-pulse-row">
      <span class="dash-pulse-label">Gateway</span>
      <span class="dash-pulse-value"><span class="dash-pulse-dot green"></span> Healthy</span>
    </div>
    <div class="dash-pulse-row">
      <span class="dash-pulse-label">Uptime</span>
      <span class="dash-pulse-value">4d 7h 23m</span>
    </div>
    <div class="dash-pulse-divider"></div>
    <div class="dash-pulse-row">
      <span class="dash-pulse-label">Last Dispatch</span>
      <span class="dash-pulse-value">2m ago</span>
    </div>
    <div class="dash-pulse-row">
      <span class="dash-pulse-label">Cron Jobs</span>
      <span class="dash-pulse-value"><span class="dash-pulse-dot yellow"></span> 6/7 OK</span>
    </div>
    <div class="dash-pulse-divider"></div>
    <div class="dash-pulse-row">
      <span class="dash-pulse-label">Memory</span>
      <span class="dash-pulse-value">6.2 / 14 GB</span>
    </div>
    <div class="dash-pulse-row">
      <span class="dash-pulse-label">Disk</span>
      <span class="dash-pulse-value"><span class="dash-pulse-dot ${94 > 90 ? 'red' : 'green'}"></span> 94% used</span>
    </div>
  `;
}

function applyDashFeedLimit() {
  const list = $('feed-list');
  if (!list) return;
  if (dashFeedExpanded) {
    list.classList.remove('collapsed');
    list.classList.add('expanded');
  } else {
    list.classList.add('collapsed');
    list.classList.remove('expanded');
    // Show only first 5 cards
    const cards = list.querySelectorAll('.feed-card');
    cards.forEach((c, i) => {
      c.style.display = i < 5 ? '' : 'none';
    });
  }
}

function toggleDashFeedExpand() {
  dashFeedExpanded = !dashFeedExpanded;
  const btn = $('dash-view-all-btn');
  if (btn) {
    btn.textContent = dashFeedExpanded ? 'Show Less' : 'View All';
    btn.classList.toggle('expanded', dashFeedExpanded);
  }
  if (dashFeedExpanded) {
    // Show all cards
    const cards = $('feed-list').querySelectorAll('.feed-card');
    cards.forEach(c => c.style.display = '');
  }
  applyDashFeedLimit();
}

function renderFeed() {
  const list = $('feed-list');
  list.innerHTML = '';
  const filtered = feedFilter === 'all' ? feedEvents : feedEvents.filter(e => e.type === feedFilter);
  filtered.forEach(event => {
    list.appendChild(makeFeedCard(event));
  });
}

function makeFeedCard(event, isNew = false) {
  const agent = ga(event.agent) || { emoji: '🤖', name: event.agent, color: '#D4A574' };
  const card = document.createElement('div');
  card.className = `feed-card type-${event.type}${event.pinned ? ' pinned' : ''}${event.urgent ? ' urgent' : ''}${isNew ? ' new' : ''}`;
  card.dataset.id = event.id;
  card.dataset.type = event.type;
  card.style.borderLeftColor = agent.color;

  // Format content (basic inline code support)
  const formattedContent = event.content
    .replace(/`([^`]+)`/g, '<code>$1</code>');

  card.innerHTML = `
    <div class="feed-card-avatar" style="background:${agent.color}20;border-color:${agent.color}">
      ${agent.emoji}
    </div>
    <div class="feed-card-body">
      <div class="feed-card-header">
        <span class="feed-agent-name" style="color:${agent.color}">${agent.name}</span>
        <span class="feed-type-badge">${TYPE_ICONS[event.type] || ''} ${TYPE_LABELS[event.type] || event.type}</span>
        ${event.pinned ? '<span class="feed-pinned-icon">📌</span>' : ''}
        <span class="feed-time">${event.time}</span>
      </div>
      <div class="feed-content">${formattedContent}</div>
      <div class="feed-actions">
        <button class="feed-action-btn" onclick="feedAction('approve','${event.id}')">👍</button>
        <button class="feed-action-btn" onclick="feedAction('reject','${event.id}')">👎</button>
        <button class="feed-action-btn" onclick="feedAction('reply','${event.id}')">💬</button>
        <button class="feed-action-btn" onclick="feedAction('pin','${event.id}')">📌</button>
        <button class="feed-action-btn" onclick="feedAction('retry','${event.id}')">🔄</button>
        <button class="feed-action-btn" onclick="feedAction('dismiss','${event.id}')">⏩</button>
      </div>
    </div>
  `;
  return card;
}

function filterFeed(type) {
  feedFilter = type;
  $$('.chip').forEach(c => c.classList.toggle('active', c.dataset.filter === type));
  renderFeed();
}

function feedAction(action, eventId) {
  const event = feedEvents.find(e => e.id === eventId);
  if (!event) return;
  const agent = ga(event.agent);
  const agentName = agent ? agent.name : event.agent;
  switch(action) {
    case 'approve': toast(`👍 Approved ${agentName}'s work`, 'success'); addXP(10, 'feedback'); break;
    case 'reject':  toast(`👎 Rejected — feedback sent to ${agentName}`, 'error'); break;
    case 'reply':   openTalkWithAgent(event.agent); break;
    case 'pin':
      event.pinned = !event.pinned;
      toast(event.pinned ? '📌 Pinned to vault' : '📌 Unpinned', 'info');
      renderFeed();
      break;
    case 'retry':   toast(`🔄 Retrying task...`, 'info'); break;
    case 'dismiss':
      feedEvents = feedEvents.filter(e => e.id !== eventId);
      const card = document.querySelector(`[data-id="${eventId}"]`);
      if (card) card.remove();
      break;
  }
}

function openTalkWithAgent(agentId) {
  nav('talk');
  setTimeout(() => selectDM(agentId), 200);
}

// Live feed updates (called from simulation)
function prependFeedCard(event) {
  feedEvents.unshift(event);
  if (feedFilter === 'all' || feedFilter === event.type) {
    const list = $('feed-list');
    const card = makeFeedCard(event, true);
    list.insertBefore(card, list.firstChild);
  }
  addNotification(`${(ga(event.agent) || {}).name || event.agent}: ${TYPE_LABELS[event.type] || event.type}`, event.content.substring(0, 80), TYPE_ICONS[event.type] || '🔔');
}

// ═══════════════════════════════════════════════════════════
// QUEUE PAGE
// ═══════════════════════════════════════════════════════════

let queueCards = QUEUE_QUESTIONS.map(q => ({ ...q, remaining: q.ttl - q.elapsed }));
let qStats = { answered: 0, autoresolved: 0, expired: 0 };
let qTimerInterval = null;

function renderQueue() {
  updateQueueStats();
  const list = $('queue-list');
  list.innerHTML = '';

  if (queueCards.length === 0) {
    $('queue-empty').classList.remove('hidden');
    return;
  }
  $('queue-empty').classList.add('hidden');

  queueCards.forEach(q => {
    list.appendChild(makeQueueCard(q));
  });

  // Start countdown
  if (!qTimerInterval) {
    qTimerInterval = setInterval(tickQueue, 1000);
  }
}

function makeQueueCard(q) {
  const agent = ga(q.agent) || { emoji: '🤖', name: q.agent, color: '#D4A574' };
  const pct = (q.remaining / q.ttl) * 100;
  const urgency = pct < 20 ? 'urgent' : pct < 40 ? 'warning' : '';

  const card = document.createElement('div');
  card.className = `queue-card priority-${q.priority}`;
  card.style.boxShadow = `0 0 12px ${agent.color}25`;
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
      <span class="queue-priority-badge">${q._priority || q.priority}</span>
      ${q._triageVerdict ? `<span style="font-size:10px;padding:2px 8px;border-radius:10px;margin-left:4px;background:${q._triageVerdict==='escalate'?'#f9e2af33':'#a6e3a133'};color:${q._triageVerdict==='escalate'?'#f9e2af':'#a6e3a1'};">${q._triageVerdict==='escalate'?'⚠️ Needs Review':'✅ Safe'}</span>` : ''}
    </div>
    ${q._source ? `<div style="font-size:10px;color:var(--text-muted);margin:-4px 0 6px 46px;">via ${q._source}${q._type ? ' · ' + q._type : ''}</div>` : ''}
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
  syncToDiscord('dispatch', `📋 Proposal decision: **${q.question?.substring(0,60)||qId}** → \`${answer}\``, q.agent);
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
  $('q-answered').textContent = qStats.answered;
  $('q-autoresolved').textContent = qStats.autoresolved;
  $('q-expired').textContent = qStats.expired;

  // Update badge
  const badge = $('queue-badge');
  if (badge) badge.textContent = queueCards.length || '';
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
let currentChannel = '1482997518362214422'; // concierge
let currentDM = null;
let memberListVisible = false;
let threadPanelVisible = false;
let replyingTo = null;
let typingTimer = null;

const THREAD_REPLIES = {};

const CHANNEL_COLOR = {
  bridge: '#D4A574', concierge: '#D4A574', dev: '#4CAF50', 'research-feed': '#5B8AF0',
  'devils-corner': '#E74C3C', 'ops-log': '#F39C12', dispatch: '#E67E22',
  'code-output': '#4CAF50', 'agent-feed': '#1ABC9C',
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
      item.onclick = () => switchChannel(ch.id);
    } else {
      // text or mixed
      item.innerHTML = `
        <span class="channel-hash">#</span>
        <span class="channel-name">${ch.name}</span>
        ${ch.unread > 0 ? `<span class="channel-unread">${ch.unread}</span>` : ''}
      `;
      item.onclick = () => switchChannel(ch.id);
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
    item.onclick = () => selectDM(agent.id);
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
    switchChannel(currentChannel);
  } else {
    // Show first DM
    selectDM(AGENTS[0].id);
  }
}

function switchChannel(chId) {
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

  // Show channel name (resolve from live data if available)
  let displayName = chId;
  if (typeof _liveChannelData !== 'undefined' && _liveChannelData?.flat) {
    const lch = _liveChannelData.flat.find(c => c.id === chId);
    if (lch) displayName = lch.name;
  }
  $('current-channel-name').textContent = displayName;
  $('message-input').placeholder = `Message #${displayName}`;

  // Update topbar
  const color = CHANNEL_COLOR[chId] || '#D4A574';
  $('current-channel-name').style.color = color;

  // Show channel topic
  const allChannels = DC_CHANNELS.categories
    ? DC_CHANNELS.categories.flatMap(c => c.channels)
    : DC_CHANNELS.text;
  const chData = allChannels.find(c => c.id === chId);
  const topicEl = $('channel-topic');
  if (topicEl && chData?.topic) {
    topicEl.textContent = chData.topic;
    topicEl.style.display = '';
  } else if (topicEl) {
    topicEl.style.display = 'none';
  }

  renderMessages(chId);
  renderPinnedMessages(chId);

  // Bridge: load real Discord messages when live
  if (typeof Bridge !== 'undefined' && Bridge.liveMode && /^\d+$/.test(chId) && typeof loadLiveMessages === 'function') {
    loadLiveMessages(chId);
  }
}

function selectDM(agentId) {
  currentDM = agentId;
  talkMode = 'dms';

  // Update server rail icons
  const serverIcons = $$('.server-icon');
  serverIcons[0].classList.remove('active');
  $('dm-icon').classList.add('active');
  // Update mobile tabs
  $$('.mobile-talk-tab').forEach((tab, i) => {
    tab.classList.toggle('active', i === 1);
  });

  // Re-render DM list with correct active state
  renderChannelList();

  $$('.channel-item').forEach(el => {
    const ag = AGENTS.find(a => a.emoji === el.querySelector('span')?.textContent);
    el.classList.toggle('active', ag?.id === agentId);
  });

  const agent = ga(agentId);
  $('current-channel-name').textContent = agent ? `${agent.emoji} ${agent.name}` : agentId;
  $('current-channel-name').style.color = agent?.color || '#D4A574';
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
    container.innerHTML = '<div style="padding:30px;text-align:center;color:var(--text-muted)">No messages yet. Be the first!</div>';
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
  const agent = isUser ? { emoji: '🧑', name: 'You', color: '#D4A574' } : (ga(msg.agent) || { emoji: '🤖', name: msg.agent, color: '#D4A574' });

  const group = document.createElement('div');
  group.className = `msg-group${collapsed ? ' collapsed' : ''}${isUser ? ' msg-user' : ''}`;
  group.id = `msg-${msg.id}`;
  group.setAttribute('data-msg-id', msg.id);

  // Reply reference
  let replyHTML = '';
  if (msg.replyTo) {
    const refMsg = findMessage(msg.replyTo);
    if (refMsg) {
      const refAgent = ga(refMsg.agent) || { name: refMsg.agent };
      replyHTML = `
        <div class="msg-reply-ref">
          <span>↩</span>
          <span class="reply-author" style="color:${ga(refMsg.agent)?.color || '#D4A574'}">${refAgent.name}</span>
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
      <div class="msg-embed" style="border-color:${msg.embed.color || '#D4A574'}">
        <div class="embed-title">${msg.embed.title}</div>
        <div class="embed-desc">${msg.embed.desc}</div>
      </div>
    `;
  }

  // Reactions
  let reactHTML = '';
  if (msg.reactions && msg.reactions.length > 0) {
    reactHTML = `<div class="msg-reactions">
      ${msg.reactions.map(r => `
        <button class="reaction${r.mine ? ' mine' : ''}" onclick="toggleReaction('${msg.id}','${r.e}')">
          ${r.e} <span class="reaction-count">${r.n}</span>
        </button>
      `).join('')}
      <button class="reaction" onclick="openEmojiForReaction('${msg.id}')">+</button>
    </div>`;
  }

  // Avatar + header only if not collapsed
  const avatarSection = `
    <div class="msg-avatar" style="background:${agent.color}20;border-color:${agent.color}" 
      onclick="openMemberProfile('${msg.agent}')">
      ${agent.emoji}
    </div>
  `;

  const headerSection = !collapsed ? `
    <div class="msg-header">
      <span class="msg-author" style="color:${agent.color}" onclick="openMemberProfile('${msg.agent}')">${agent.name}</span>
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
      ${THREAD_REPLIES[msg.id]?.length ? `<div class="thread-badge" onclick="threadFromMessage('${msg.id}')">🧵 ${THREAD_REPLIES[msg.id].length} replies</div>` : ''}
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
  }
  if (e.key === 'Escape') cancelReply();
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
    case '/ask': {
      const askParts = args.split(/\s+/);
      const targetAgent = askParts[0] || 'righthand';
      const question = askParts.slice(1).join(' ') || 'How are you?';
      const agent = ga(targetAgent) || AGENTS[0];
      appendSystemMessage(`Asking ${agent.emoji} ${agent.name}: "${question}"`);
      setTimeout(() => {
        appendSystemMessage(`${agent.emoji} **${agent.name}**: I've received your question and I'm working on it. I'll update you shortly.`);
      }, 1500);
      break;
    }
    case '/pin': {
      const msgs = currentDM ? (DM_MESSAGES[currentDM] || []) : (DC_MESSAGES[currentChannel] || []);
      const lastMsg = msgs[msgs.length - 1];
      if (lastMsg && currentChannel) {
        pinMessage(lastMsg.id, currentChannel);
      } else {
        toast('📌 No message to pin', 'error');
      }
      break;
    }
    case '/thread': {
      const msgs2 = currentDM ? (DM_MESSAGES[currentDM] || []) : (DC_MESSAGES[currentChannel] || []);
      const lastMsg2 = msgs2[msgs2.length - 1];
      if (lastMsg2) {
        threadFromMessage(lastMsg2.id);
        toast('🧵 Thread started', 'success');
      } else {
        toast('🧵 No message to thread', 'error');
      }
      break;
    }
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

function toggleReaction(msgId, emoji) {
  // Find and toggle reaction
  const allMsgs = [...Object.values(DC_MESSAGES), ...Object.values(DM_MESSAGES)].flat();
  const msg = allMsgs.find(m => m.id === msgId);
  if (!msg || !msg.reactions) return;
  const existing = msg.reactions.find(r => r.e === emoji);
  if (existing) {
    existing.mine = !existing.mine;
    existing.n += existing.mine ? 1 : -1;
    if (existing.n <= 0) msg.reactions = msg.reactions.filter(r => r.e !== emoji);
  } else {
    msg.reactions.push({ e: emoji, n: 1, mine: true });
  }
  renderMessages(currentDM ? null : currentChannel, currentDM);
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

  // Initialize thread if needed
  if (!THREAD_REPLIES[msgId]) {
    THREAD_REPLIES[msgId] = [];
    // Seed with 2-3 fake replies for demo
    const agent = ga(msg.agent) || { id: 'righthand', emoji: '🤖', name: 'Agent', color: '#D4A574' };
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

  // Show thread panel
  threadPanelVisible = true;
  const tp = $('thread-panel');
  tp.classList.remove('hidden');
  tp.dataset.msgId = msgId;
  renderThreadPanel(msgId, msg);
}

function renderThreadPanel(msgId, msg) {
  const agent = ga(msg.agent) || { emoji: '🤖', name: msg.agent, color: '#D4A574' };
  const replies = THREAD_REPLIES[msgId] || [];

  const repliesHTML = replies.map(r => {
    const ra = ga(r.agent) || { emoji: '🤖', name: r.agent, color: '#D4A574' };
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
  THREAD_REPLIES[msgId].push({
    id: 'tr_' + Date.now(),
    agent: 'user',
    text,
    time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),
    ts: Date.now() / 1000,
  });

  input.value = '';
  const msg = findMessage(msgId);
  if (msg) renderThreadPanel(msgId, msg);
  addXP(5, 'thread reply');
  toast('🧵 Reply added to thread', 'success');
}

function togglePinned() {
  $('pinned-panel').classList.toggle('hidden');
}

function renderPinnedMessages(channelId) {
  const pinned = DC_PINNED[channelId] || [];
  const list = $('pinned-list');
  list.innerHTML = '';
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
    item.onclick = () => selectDM(agent.id);
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
  toast(`${agent.emoji} ${agent.name} — ${agent.role} · ${agent.status}`, 'info', 3000);
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
  // Ensure channels with demo data have message entries
  // Map concierge to bridge messages if concierge has none
  if (!DC_MESSAGES['concierge'] && DC_MESSAGES['bridge']) {
    DC_MESSAGES['concierge'] = DC_MESSAGES['bridge'];
  }
  if (!DC_PINNED['concierge'] && DC_PINNED['bridge']) {
    DC_PINNED['concierge'] = DC_PINNED['bridge'];
  }
  renderChannelList();
  switchChannel('concierge');
}
