/* Agent OS v5 — app3.js — Command Palette + Simulation + Init */
'use strict';

// COMMAND PALETTE (⌘K overlay) — Raycast-style launcher
// ═══════════════════════════════════════════════════════════

let paletteOpen = false;
let paletteSelectedIdx = 0;
let _paletteMode = 'search'; // search | action | agent | slash | task | vault

// ── Quick action chips (shown when palette first opens) ──
const PALETTE_QUICK_ACTIONS = [
  { icon: '📬', label: 'Inbox', action: () => { nav('inbox'); closeCommandPalette(); } },
  { icon: '🔍', label: 'Search Vault', action: () => { _setPaletteMode('vault'); } },
  { icon: '✅', label: 'New Task', action: () => { nav('tasks'); closeCommandPalette(); toast('Create a new task', 'info'); } },
  { icon: '📋', label: 'New Proposal', action: () => { if (typeof showNewProposalModal === 'function') showNewProposalModal(); closeCommandPalette(); } },
  { icon: '⚡', label: 'Actions', action: () => { _setPaletteMode('action'); } },
  { icon: '🤖', label: 'Agents', action: () => { _setPaletteMode('agent'); } },
];

function _setPaletteMode(mode) {
  _paletteMode = mode;
  const input = $('palette-input');
  const prefix = $('palette-prefix');
  const modeIndicator = $('palette-mode-indicator');
  switch (mode) {
    case 'action':
      input.value = '> ';
      prefix.textContent = '⚡';
      if (modeIndicator) modeIndicator.textContent = 'Actions';
      input.focus();
      input.setSelectionRange(2, 2);
      renderPaletteResults('> ');
      break;
    case 'agent':
      input.value = '@ ';
      prefix.textContent = '🤖';
      if (modeIndicator) modeIndicator.textContent = 'Agents';
      input.focus();
      input.setSelectionRange(2, 2);
      renderPaletteResults('@ ');
      break;
    case 'slash':
      input.value = '/ ';
      prefix.textContent = '⌨️';
      if (modeIndicator) modeIndicator.textContent = 'Commands';
      input.focus();
      input.setSelectionRange(2, 2);
      renderPaletteResults('/ ');
      break;
    case 'task':
      input.value = 'task: ';
      prefix.textContent = '✅';
      if (modeIndicator) modeIndicator.textContent = 'Tasks';
      input.focus();
      input.setSelectionRange(6, 6);
      renderPaletteResults('task: ');
      break;
    case 'vault':
      input.value = 'vault: ';
      prefix.textContent = '📚';
      if (modeIndicator) modeIndicator.textContent = 'Vault';
      input.focus();
      input.setSelectionRange(7, 7);
      renderPaletteResults('vault: ');
      break;
    default:
      prefix.textContent = '🔍';
      if (modeIndicator) modeIndicator.textContent = '';
      break;
  }
}

function openCommandPalette() {
  paletteOpen = true;
  _paletteMode = 'search';
  $('cmd-palette-overlay').classList.remove('hidden');
  const input = $('palette-input');
  input.value = '';
  input.focus();
  const prefix = $('palette-prefix');
  if (prefix) prefix.textContent = '🔍';
  const mi = $('palette-mode-indicator');
  if (mi) mi.textContent = '';
  renderPaletteResults('');
}

function closeCommandPalette() {
  paletteOpen = false;
  _paletteMode = 'search';
  $('cmd-palette-overlay').classList.add('hidden');
}

function closeCmdPaletteIfOutside(e) {
  if (e.target === $('cmd-palette-overlay')) closeCommandPalette();
}

function handlePaletteInput(val) {
  // Update prefix icon based on mode prefix
  const prefix = $('palette-prefix');
  const mi = $('palette-mode-indicator');
  if (val.startsWith('>')) { prefix.textContent = '⚡'; if (mi) mi.textContent = 'Actions'; _paletteMode = 'action'; }
  else if (val.startsWith('@')) { prefix.textContent = '🤖'; if (mi) mi.textContent = 'Agents'; _paletteMode = 'agent'; }
  else if (val.startsWith('/')) { prefix.textContent = '⌨️'; if (mi) mi.textContent = 'Commands'; _paletteMode = 'slash'; }
  else if (val.toLowerCase().startsWith('task:')) { prefix.textContent = '✅'; if (mi) mi.textContent = 'Tasks'; _paletteMode = 'task'; }
  else if (val.toLowerCase().startsWith('vault:')) { prefix.textContent = '📚'; if (mi) mi.textContent = 'Vault'; _paletteMode = 'vault'; }
  else { prefix.textContent = '🔍'; if (mi) mi.textContent = ''; _paletteMode = 'search'; }

  renderPaletteResults(val);
}

// ── All available actions for ">" mode ──
function _getPaletteActions() {
  return [
    // Navigation
    { icon: '📡', title: 'Go to Stream', desc: 'Navigate', sc: '1', cat: 'nav', action: () => { nav('feed'); closeCommandPalette(); } },
    { icon: '📬', title: 'Go to Inbox', desc: 'Navigate', sc: '2', cat: 'nav', action: () => { nav('inbox'); closeCommandPalette(); } },
    { icon: '💬', title: 'Go to Talk', desc: 'Navigate', sc: '3', cat: 'nav', action: () => { nav('talk'); closeCommandPalette(); } },
    { icon: '✅', title: 'Go to Tasks', desc: 'Navigate', sc: '4', cat: 'nav', action: () => { nav('tasks'); closeCommandPalette(); } },
    { icon: '🧠', title: 'Go to Mind', desc: 'Navigate', sc: '5', cat: 'nav', action: () => { nav('mind'); closeCommandPalette(); } },
    { icon: '⚙️', title: 'Go to System', desc: 'Navigate', sc: '6', cat: 'nav', action: () => { nav('pulse'); closeCommandPalette(); } },
    { icon: '📋', title: 'Go to Proposals', desc: 'Navigate', cat: 'nav', action: () => { nav('queue'); closeCommandPalette(); } },
    { icon: '🎯', title: 'Go to Missions', desc: 'Navigate', cat: 'nav', action: () => { nav('missions'); closeCommandPalette(); } },
    { icon: '📁', title: 'Go to Projects', desc: 'Navigate', cat: 'nav', action: () => { nav('projects'); closeCommandPalette(); } },
    { icon: '🔀', title: 'Go to Pipelines', desc: 'Navigate', cat: 'nav', action: () => { nav('pipelines'); closeCommandPalette(); } },
    { icon: '🏠', title: 'Go to Rooms', desc: 'Navigate', cat: 'nav', action: () => { nav('rooms'); closeCommandPalette(); } },
    { icon: '📜', title: 'Go to Briefing', desc: 'Navigate', cat: 'nav', action: () => { nav('briefing'); closeCommandPalette(); } },
    { icon: '🛡️', title: 'Go to Roles', desc: 'Navigate', cat: 'nav', action: () => { nav('roles'); closeCommandPalette(); } },
    { icon: '📊', title: 'Go to Records', desc: 'Navigate', cat: 'nav', action: () => { nav('records'); closeCommandPalette(); } },
    // Create
    { icon: '✅', title: 'New Task', desc: 'Create', cat: 'create', action: () => { nav('tasks'); closeCommandPalette(); toast('➕ Create a new task', 'info'); } },
    { icon: '🎯', title: 'New Mission', desc: 'Create', cat: 'create', action: () => { nav('missions'); closeCommandPalette(); toast('➕ Create a new mission', 'info'); } },
    { icon: '📁', title: 'New Project', desc: 'Create', cat: 'create', action: () => { nav('projects'); closeCommandPalette(); toast('➕ Create a new project', 'info'); } },
    { icon: '📋', title: 'New Proposal', desc: 'Create', cat: 'create', action: () => { if (typeof showNewProposalModal === 'function') showNewProposalModal(); closeCommandPalette(); } },
    // System actions
    { icon: '🔄', title: 'Restart Gateway', desc: 'System', cat: 'system', action: () => { quickAction('restart-gateway'); closeCommandPalette(); } },
    { icon: '📚', title: 'Reindex Vault', desc: 'System', cat: 'system', action: () => { quickAction('reindex'); closeCommandPalette(); } },
    { icon: '🩺', title: 'Health Check', desc: 'System', cat: 'system', action: () => { quickAction('health-check'); closeCommandPalette(); } },
    { icon: '🗑️', title: 'Clear Inbox', desc: 'System', cat: 'system', action: () => { toast('Inbox cleared', 'success'); closeCommandPalette(); } },
    { icon: '📊', title: 'Export Records', desc: 'System — CSV export', cat: 'system', action: () => { toast('Exporting records as CSV...', 'info'); closeCommandPalette(); } },
  ];
}

function renderPaletteResults(val) {
  const container = $('palette-results');
  let results = [];
  const q = val.toLowerCase().replace(/^[>@/]\s*/, '').replace(/^(task|vault):\s*/i, '').trim();

  if (val.startsWith('>')) {
    // Actions mode — show all commands
    const actions = _getPaletteActions();
    results = actions.filter(c => !q || c.title.toLowerCase().includes(q) || (c.desc && c.desc.toLowerCase().includes(q)));
  } else if (val.startsWith('@')) {
    // Agent mode
    results = (typeof AGENTS !== 'undefined' ? AGENTS : []).filter(a => !q || a.name.toLowerCase().includes(q))
      .map(a => ({
        icon: a.emoji, title: a.name, desc: `${a.role} · ${a.status}`,
        action: () => {
          if (typeof openAgentDrawer === 'function') openAgentDrawer(a.id);
          else { nav('talk'); setTimeout(() => { if (typeof selectDM === 'function') selectDM(a.id); }, 200); }
          closeCommandPalette();
        },
      }));
  } else if (val.startsWith('/')) {
    // Slash commands
    results = (typeof SLASH_COMMANDS !== 'undefined' ? SLASH_COMMANDS : []).filter(c => !q || c.cmd.includes(q))
      .map(c => ({
        icon: '⌨️', title: c.cmd, desc: c.desc,
        action: () => { toast(`${c.usage}`, 'info', 4000); closeCommandPalette(); },
      }));
  } else if (val.toLowerCase().startsWith('task:')) {
    // Task search
    if (typeof TASKS_DATA !== 'undefined') {
      results = TASKS_DATA.filter(t => !q || t.title.toLowerCase().includes(q)).slice(0, 12)
        .map(t => ({
          icon: t.status === 'done' ? '✅' : t.status === 'active' ? '🔵' : '⬜',
          title: t.title, desc: `${t.status} · ${t.agent || 'unassigned'}`,
          action: () => { nav('tasks'); closeCommandPalette(); },
        }));
    }
    if (results.length === 0 && q) {
      results.push({ icon: '✅', title: `Create task: "${q}"`, desc: 'New task', action: () => { nav('tasks'); closeCommandPalette(); toast(`➕ Task: ${q}`, 'info'); } });
    }
  } else if (val.toLowerCase().startsWith('vault:')) {
    // Vault search
    if (typeof VAULT_NOTES !== 'undefined') {
      results = VAULT_NOTES.filter(n => !q || n.title.toLowerCase().includes(q)).slice(0, 12)
        .map(n => ({
          icon: '📚', title: n.title, desc: n.type || 'Note',
          action: () => { nav('mind'); if (typeof openVaultNote === 'function') openVaultNote(n.title); else if (typeof setMindTab === 'function') setMindTab('search'); closeCommandPalette(); },
        }));
    }
  } else {
    // ── Default: show quick actions + search everything ──
    if (!q) {
      // Show quick action chips as first "row", then frequent pages
      container.innerHTML = _renderQuickChips() + _renderDefaultResults();
      paletteSelectedIdx = -1;
      window.paletteResults = [];
      return;
    }

    // Search pages
    const dedupPages = new Set();
    Object.entries(typeof PAGE_TITLES !== 'undefined' ? PAGE_TITLES : {}).forEach(([k, v]) => {
      if (dedupPages.has(v)) return;
      if (v.toLowerCase().includes(q) || k.toLowerCase().includes(q)) {
        dedupPages.add(v);
        results.push({ icon: '📄', title: v, desc: 'Page', sc: '', action: () => { nav(k); closeCommandPalette(); } });
      }
    });
    // Search agents
    (typeof AGENTS !== 'undefined' ? AGENTS : []).forEach(a => {
      if (a.name.toLowerCase().includes(q) || a.id.includes(q)) {
        results.push({
          icon: a.emoji, title: a.name, desc: a.role,
          action: () => {
            if (typeof openAgentDrawer === 'function') openAgentDrawer(a.id);
            else { nav('talk'); setTimeout(() => { if (typeof selectDM === 'function') selectDM(a.id); }, 200); }
            closeCommandPalette();
          },
        });
      }
    });
    // Search vault notes
    (typeof VAULT_NOTES !== 'undefined' ? VAULT_NOTES : []).forEach(n => {
      if (n.title.toLowerCase().includes(q)) {
        results.push({ icon: '📚', title: n.title, desc: n.type || 'Vault note', action: () => { nav('mind'); if (typeof setMindTab === 'function') setMindTab('search'); closeCommandPalette(); } });
      }
    });
    // Search tasks
    if (typeof TASKS_DATA !== 'undefined') {
      TASKS_DATA.forEach(t => {
        if (t.title.toLowerCase().includes(q)) {
          results.push({ icon: '✅', title: t.title, desc: `Task · ${t.status}`, action: () => { nav('tasks'); closeCommandPalette(); } });
        }
      });
    }
    // Search actions
    _getPaletteActions().forEach(a => {
      if (a.title.toLowerCase().includes(q)) {
        results.push(a);
      }
    });
  }

  paletteSelectedIdx = 0;
  window.paletteResults = results;

  if (results.length === 0 && q) {
    container.innerHTML = `<div class="palette-empty"><span class="palette-empty-icon">🔍</span><span>No results for "<strong>${_escHTML(q)}</strong>"</span><div class="palette-empty-hint">Try <kbd>></kbd> for actions, <kbd>@</kbd> for agents, <kbd>vault:</kbd> for vault</div></div>`;
    return;
  }

  container.innerHTML = results.slice(0, 14).map((r, i) => `
    <div class="palette-item${i === 0 ? ' selected' : ''}" onclick="window.paletteResults[${i}]?.action?.()" data-idx="${i}" onmouseenter="_paletteHover(${i})">
      <span class="palette-item-icon">${r.icon}</span>
      <div class="palette-item-text">
        <div class="palette-item-title">${r.title}</div>
        ${r.desc ? `<div class="palette-item-desc">${r.desc}</div>` : ''}
      </div>
      ${r.sc ? `<kbd class="palette-item-shortcut">${r.sc}</kbd>` : ''}
    </div>
  `).join('');
}

function _paletteHover(idx) {
  paletteSelectedIdx = idx;
  $$('.palette-item').forEach((it, i) => it.classList.toggle('selected', i === idx));
}

function _escHTML(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

function _renderQuickChips() {
  return `<div class="palette-quick-actions">${PALETTE_QUICK_ACTIONS.map((qa, i) =>
    `<button class="palette-chip" onclick="PALETTE_QUICK_ACTIONS[${i}].action()" title="${qa.label}"><span class="palette-chip-icon">${qa.icon}</span><span class="palette-chip-label">${qa.label}</span></button>`
  ).join('')}</div>`;
}

function _renderDefaultResults() {
  // Show recently-used / high-value destinations
  const defaults = [
    { icon: '📡', title: 'Stream', desc: 'Live activity feed', sc: '1', action: () => { nav('feed'); closeCommandPalette(); } },
    { icon: '📬', title: 'Inbox', desc: 'Items needing attention', sc: '2', action: () => { nav('inbox'); closeCommandPalette(); } },
    { icon: '💬', title: 'Talk', desc: 'Discord channels', sc: '3', action: () => { nav('talk'); closeCommandPalette(); } },
    { icon: '✅', title: 'Tasks', desc: 'Task management', sc: '4', action: () => { nav('tasks'); closeCommandPalette(); } },
    { icon: '🧠', title: 'Mind', desc: 'Knowledge vault', sc: '5', action: () => { nav('mind'); closeCommandPalette(); } },
    { icon: '⚙️', title: 'System', desc: 'System health & config', sc: '6', action: () => { nav('pulse'); closeCommandPalette(); } },
  ];
  window.paletteResults = defaults;
  paletteSelectedIdx = -1;
  return `<div class="palette-section-label">Pages</div>` + defaults.map((r, i) => `
    <div class="palette-item" onclick="window.paletteResults[${i}]?.action?.()" data-idx="${i}" onmouseenter="_paletteHover(${i})">
      <span class="palette-item-icon">${r.icon}</span>
      <div class="palette-item-text">
        <div class="palette-item-title">${r.title}</div>
        <div class="palette-item-desc">${r.desc}</div>
      </div>
      <kbd class="palette-item-shortcut">${r.sc}</kbd>
    </div>
  `).join('');
}

function handlePaletteKey(e) {
  const items = $$('.palette-item');
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    paletteSelectedIdx = Math.min(paletteSelectedIdx + 1, items.length - 1);
    items.forEach((it, i) => it.classList.toggle('selected', i === paletteSelectedIdx));
    if (items[paletteSelectedIdx]) items[paletteSelectedIdx].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    paletteSelectedIdx = Math.max(paletteSelectedIdx - 1, 0);
    items.forEach((it, i) => it.classList.toggle('selected', i === paletteSelectedIdx));
    if (items[paletteSelectedIdx]) items[paletteSelectedIdx].scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (window.paletteResults && window.paletteResults[paletteSelectedIdx]?.action) {
      window.paletteResults[paletteSelectedIdx].action();
    }
  } else if (e.key === 'Escape') {
    closeCommandPalette();
  } else if (e.key === 'Backspace') {
    // If input is empty and we're in a mode, go back to search mode
    const input = $('palette-input');
    if (input && input.value.length <= 1 && _paletteMode !== 'search') {
      _paletteMode = 'search';
      input.value = '';
      const prefix = $('palette-prefix');
      if (prefix) prefix.textContent = '🔍';
      const mi = $('palette-mode-indicator');
      if (mi) mi.textContent = '';
      renderPaletteResults('');
    }
  } else if (e.key === 'Tab') {
    // Tab cycles through modes
    e.preventDefault();
    const modes = ['search', 'action', 'agent', 'vault'];
    const idx = modes.indexOf(_paletteMode);
    const next = modes[(idx + 1) % modes.length];
    _setPaletteMode(next);
  }
}

// ⌘K keyboard shortcut — handled by global handler in ux.js now
// Keep this as a backup for edge cases
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    if (paletteOpen) closeCommandPalette();
    else openCommandPalette();
  }
});

// ═══════════════════════════════════════════════════════════


function toggleCron(name, enabled) {
  const cron = CRONS.find(c => c.n === name);
  if (cron) {
    cron.ok = enabled;
    toast(`${enabled ? '✅' : '⛔'} ${name} ${enabled ? 'enabled' : 'disabled'}`, enabled ? 'success' : 'info');
  }
}

// ═══════════════════════════════════════════════════════════
// EVENT BUS — Bidirectional Mirroring
// ═══════════════════════════════════════════════════════════

const EventBus = {
  _handlers: {},
  on(event, fn) {
    (this._handlers[event] = this._handlers[event] || []).push(fn);
  },
  emit(event, data) {
    (this._handlers[event] || []).forEach(fn => fn(data));
  }
};

// Wire up cross-view mirroring
EventBus.on('chat:message', data => {
  // Chat message → Feed event
  prependFeedCard({
    id: 'feed_chat_' + Date.now(),
    agent: data.agent,
    type: data.agent === 'user' ? 'question_asked' : 'task_completed',
    time: data.time,
    content: `[#${data.channel || 'DM'}] ${data.text.substring(0, 150)}`,
  });
  // Chat message → Stream event
  if (typeof addStreamEvent === 'function') {
    addStreamEvent({
      id: 'str_chat_' + Date.now(),
      level: 'info',
      agent: data.agent === 'user' ? 'righthand' : data.agent,
      time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'}),
      text: `Message in #${data.channel || 'DM'}: ${data.text.substring(0, 80)}`,
    });
  }
  // Update unread badges
  if (data.channel && data.channel !== currentChannel) {
    updateUnreadBadge(data.channel);
  }
});

EventBus.on('queue:answered', data => {
  // Queue answer → Chat message in #dispatch
  const newMsg = {
    id: 'qans_' + Date.now(),
    agent: 'user',
    time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),
    ts: Date.now() / 1000,
    text: `📋 **Queue Decision:** ${data.question.substring(0, 80)}\n→ \`${data.answer}\``,
    reactions: [],
  };
  if (!DC_MESSAGES['dispatch']) DC_MESSAGES['dispatch'] = [];
  DC_MESSAGES['dispatch'].push(newMsg);
  if (currentPage === 'talk' && currentChannel === 'dispatch') renderMessages('dispatch');

  // Queue answer → agent response in relevant channel
  const agentReply = {
    id: 'qreply_' + Date.now(),
    agent: data.agent,
    time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),
    ts: Date.now() / 1000,
    text: `Acknowledged. Acting on your decision: \`${data.answer}\``,
    reactions: [{e:'✅', n:1, mine:false}],
  };
  const agentChannel = getAgentChannel(data.agent);
  if (!DC_MESSAGES[agentChannel]) DC_MESSAGES[agentChannel] = [];
  DC_MESSAGES[agentChannel].push(agentReply);
  if (currentPage === 'talk' && currentChannel === agentChannel) renderMessages(agentChannel);
  updateUnreadBadge(agentChannel);
});

EventBus.on('agent:statusChange', data => {
  // Agent status → Feed event
  const verb = data.status === 'active' ? 'started working' : 'went idle';
  prependFeedCard({
    id: 'feed_status_' + Date.now(),
    agent: data.agentId,
    type: data.status === 'active' ? 'task_started' : 'task_completed',
    time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),
    content: `${verb}${data.task ? ': ' + data.task : ''}`,
  });
  // Agent status → Stream
  if (typeof addStreamEvent === 'function') {
    addStreamEvent({
      id: 'str_status_' + Date.now(),
      level: 'info',
      agent: data.agentId,
      time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'}),
      text: `Agent ${verb}${data.task ? ': ' + data.task : ''}`,
    });
  }
  // Status → agent-feed chat
  const statusMsg = {
    id: 'af_status_' + Date.now(),
    agent: data.agentId,
    time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),
    ts: Date.now() / 1000,
    text: `[STATUS] ${verb}${data.task ? ': ' + data.task : ''}`,
    reactions: [],
  };
  if (!DC_MESSAGES['agent-feed']) DC_MESSAGES['agent-feed'] = [];
  DC_MESSAGES['agent-feed'].push(statusMsg);
  if (currentPage === 'talk' && currentChannel === 'agent-feed') renderMessages('agent-feed');
  updateUnreadBadge('agent-feed');
  // Update pulse if visible
  if (currentPage === 'pulse') renderAgentHealth();
});

function getAgentChannel(agentId) {
  const map = {
    researcher: 'research-feed', coder: 'code-output', devil: 'devils-corner',
    ops: 'ops-log', utility: 'agent-feed', righthand: 'bridge',
  };
  return map[agentId] || 'agent-feed';
}

function updateUnreadBadge(channelId) {
  // Update data
  const allChannels = DC_CHANNELS.categories
    ? DC_CHANNELS.categories.flatMap(c => c.channels)
    : DC_CHANNELS.text;
  const ch = allChannels.find(c => c.id === channelId);
  if (ch) ch.unread = (ch.unread || 0) + 1;
  // Update DOM
  const item = document.querySelector(`.channel-item[data-chid="${channelId}"]`);
  if (item) {
    item.classList.add('has-unread');
    let badge = item.querySelector('.channel-unread');
    if (badge) {
      badge.textContent = ch ? ch.unread : '•';
    } else {
      badge = document.createElement('span');
      badge.className = 'channel-unread';
      badge.textContent = ch ? ch.unread : '•';
      item.appendChild(badge);
    }
  }
}

// ═══════════════════════════════════════════════════════════
// SIMULATION ENGINE (Live Updates)
// ═══════════════════════════════════════════════════════════

let simTimers = {};

// Rich chat messages for simulation
const SIM_CHAT_MESSAGES = {
  bridge: [
    { agent: 'righthand', texts: [
      'Morning batch complete. All agents checked in.',
      'Vault freshness scan done — 3 notes need updates.',
      'Dispatch queue clear. Standing by for instructions.',
      'Session health check passed. All connections stable.',
      'Memory pressure at 62% — comfortable headroom.',
    ]},
    { agent: 'researcher', texts: [
      'New finding from competitive scan — updating vault.',
      'Cross-referenced 4 sources on multi-agent patterns.',
      'Published analysis to #research-feed.',
    ]},
  ],
  dev: [
    { agent: 'coder', texts: [
      '```bash\ngit push origin main\n# All tests passing ✅\n```',
      'Refactored dispatch engine — 30% fewer lines.',
      'New streaming component deployed. Check #code-output.',
      'Bug fix: race condition in concurrent dispatch.',
    ]},
    { agent: 'ops', texts: [
      'Deploy verified — no latency spikes.',
      'CI pipeline green. 47/47 tests passed.',
    ]},
  ],
  'research-feed': [
    { agent: 'researcher', texts: [
      '**Key Insight:** Agent frameworks converging on tool-use patterns. Three distinct approaches emerging:\n1. Function calling (OpenAI)\n2. MCP (Anthropic)\n3. Custom protocols',
      'Completed teardown of Cursor UX. Notes saved to vault.',
      'Market gap confirmed — no unified control surface exists.',
      '**Source Tier:** T1 (peer-reviewed) — new paper on multi-agent coordination benchmarks.',
    ]},
    { agent: 'utility', texts: [
      'Research notes indexed. 4 new cross-links created.',
    ]},
  ],
  'devils-corner': [
    { agent: 'devil', texts: [
      '**Counter-point:** The "no competitor" claim assumes static market. 3 startups raised in Q1 targeting similar space.',
      'Pre-mortem: If deployment fails, fallback is... what exactly?',
      'Assumption check: we\'re assuming users want control. Enterprise data says otherwise — 70% prefer guardrails.',
    ]},
  ],
  'ops-log': [
    { agent: 'ops', texts: [
      '✅ All 7 cron jobs nominal\n✅ Disk: 67% used\n✅ Memory: 4.2GB/14GB\n❌ Token budget: 82% consumed',
      'Heartbeat check: 8/8 agents responding.',
      'Auto-scaling triggered — spawning additional executor.',
      'Vault sync complete: 0 conflicts, 3 files updated.',
    ]},
  ],
  'code-output': [
    { agent: 'coder', texts: [
      '```js\n// New streaming progress component\nclass StreamProgress {\n  update(pct) {\n    this.bar.style.width = pct + "%";\n  }\n}\n```\nDeploy ready. Awaiting review.',
      'Build artifact: `agent-os-v7.min.js` (48KB gzipped)',
      'Integration tests: 12/12 passed. Coverage: 89%.',
    ]},
  ],
  'agent-feed': [
    { agent: 'righthand', texts: [
      '[DISPATCH] Researcher → competitive deep-dive (P1, 12K budget)',
      '[DISPATCH] Coder → streaming UI polish (P2, 8K budget)',
      '[STATUS] All agents healthy. Queue depth: 0.',
    ]},
    { agent: 'ops', texts: [
      '[METRIC] Token usage: 52K/100K daily budget.',
      '[CRON] vault-sync completed in 2.1s.',
    ]},
    { agent: 'utility', texts: [
      '[VAULT] 3 notes updated, 2 new cross-links added.',
      '[INDEX] Knowledge graph refreshed — 312 nodes, 847 edges.',
    ]},
  ],
};

function startSimulation() {
  // Don't run simulation when Bridge provides real data
  if (typeof Bridge !== 'undefined' && Bridge.liveMode) {
    console.log('[Sim] Bridge is live — simulation disabled');
    return;
  }
  // Agent status changes every 8s — with event bus
  simTimers.agents = setInterval(() => {
    if (!shouldPoll()) return;
    AGENTS.forEach(a => {
      if (Math.random() < 0.12) {
        const wasActive = a.status === 'active';
        if (wasActive) {
          a.status = 'idle';
          a.task = '';
          EventBus.emit('agent:statusChange', { agentId: a.id, status: 'idle', task: '' });
        } else {
          a.status = 'active';
          const tasks = [
            'Processing dispatch batch...', 'Scanning vault for gaps...', 
            'Running competitive analysis...', 'Reviewing agent output...', 
            'Indexing new documents...', 'Generating report...',
            'Cross-referencing sources...', 'Optimizing prompts...',
          ];
          a.task = tasks[Math.floor(Math.random() * tasks.length)];
          EventBus.emit('agent:statusChange', { agentId: a.id, status: 'active', task: a.task });
        }
      }
    });
    updateActiveAgents();
  }, 8000);

  // Chat messages — the big new one. Every 12s, post a message to a channel
  simTimers.chat = setInterval(() => {
    if (!shouldPoll()) return;
    const channels = Object.keys(SIM_CHAT_MESSAGES);
    const channel = channels[Math.floor(Math.random() * channels.length)];
    const speakers = SIM_CHAT_MESSAGES[channel];
    const speaker = speakers[Math.floor(Math.random() * speakers.length)];
    const text = speaker.texts[Math.floor(Math.random() * speaker.texts.length)];
    const time = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

    const msg = {
      id: 'sim_msg_' + Date.now(),
      agent: speaker.agent,
      time,
      ts: Date.now() / 1000,
      text,
      reactions: Math.random() > 0.7 ? [{e: ['👍','🔥','✅','💡'][Math.floor(Math.random()*4)], n: 1, mine: false}] : [],
    };

    // Add to data
    if (!DC_MESSAGES[channel]) DC_MESSAGES[channel] = [];
    DC_MESSAGES[channel].push(msg);

    // Live-update if user is viewing this channel
    if (currentPage === 'talk' && currentChannel === channel && !currentDM) {
      // Append message to DOM without full re-render
      const container = $('messages-list');
      if (container) {
        const existing = DC_MESSAGES[channel];
        const prevMsg = existing.length > 1 ? existing[existing.length - 2] : null;
        const collapsed = prevMsg && prevMsg.agent === msg.agent && 
          msg.ts - prevMsg.ts < 300;
        container.appendChild(makeMessageGroup(msg, collapsed, channel));
        const msgContainer = $('messages-container');
        // Auto-scroll only if near bottom
        if (msgContainer.scrollHeight - msgContainer.scrollTop - msgContainer.clientHeight < 100) {
          msgContainer.scrollTop = msgContainer.scrollHeight;
        }
      }
    }

    // Show typing indicator briefly before message appears (visual flair)
    // Update unread if not current channel
    if (currentPage !== 'talk' || currentChannel !== channel || currentDM) {
      updateUnreadBadge(channel);
    }

    // Mirror to event bus (but skip feed mirroring for sim messages to avoid spam)
    if (typeof addStreamEvent === 'function') {
      addStreamEvent({
        id: 'str_sim_' + Date.now(),
        level: 'info',
        agent: speaker.agent,
        time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'}),
        text: `#${channel}: ${text.substring(0, 60).replace(/\n/g,' ')}`,
      });
    }
  }, 12000);

  // Feed update every 20s (slower now since chat drives feed events too)
  simTimers.feed = setInterval(() => {
    if (!shouldPoll()) return;
    const agent = AGENTS[Math.floor(Math.random() * AGENTS.length)];
    const types = ['task_started', 'task_completed', 'insight', 'vault_write', 'file_changed'];
    const type = types[Math.floor(Math.random() * types.length)];
    const contents = {
      task_started:   ['Initiated new scan cycle.', 'Starting background processing...', 'New task dispatched to executor.'],
      task_completed: ['Task finished successfully.', 'All checks passed ✅', 'Report generated and saved.'],
      insight:        ['Interesting pattern discovered in recent data.', 'Cross-reference reveals new connection.', 'Confidence score updated.'],
      vault_write:    ['New document saved to vault.', 'Updated existing note with latest findings.', 'Cross-links refreshed.'],
      file_changed:   ['Configuration updated.', 'Script modified and deployed.', 'Template file regenerated.'],
    };
    const contentList = contents[type] || contents.task_completed;

    prependFeedCard({
      id: 'sim_' + Date.now(),
      agent: agent.id,
      type,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: contentList[Math.floor(Math.random() * contentList.length)],
    });
  }, 20000);

  // Queue cards every 30s
  simTimers.queue = setInterval(() => {
    if (!shouldPoll()) return;
    if (typeof generateQueueCard === 'function') generateQueueCard();
  }, 30000);

  // Stream events every 8s
  simTimers.stream = setInterval(() => {
    if (!shouldPoll()) return;
    const agent = AGENTS[Math.floor(Math.random() * AGENTS.length)];
    const levels = ['debug', 'info', 'info', 'info', 'warn'];
    const level = levels[Math.floor(Math.random() * levels.length)];
    const texts = {
      debug: ['Heartbeat OK — all agents responding', 'Vault sync: 0 changes', 'Token ledger: balanced', 'Memory compactor: idle', 'Session pool: 3 active'],
      info:  ['Task checkpoint reached', 'Dispatch acknowledged', 'Agent slot acquired (2/3)', 'Scan cycle complete — 0 issues', 'Backlink index refreshed'],
      warn:  ['Latency spike: 1.8s on agent-bus', 'Token budget at 78%', 'Retry queued for failed webhook', 'Disk I/O elevated'],
    };
    const textList = texts[level] || texts.info;

    addStreamEvent({
      id: 'ss_' + Date.now(),
      level,
      agent: agent.id,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      text: textList[Math.floor(Math.random() * textList.length)],
    });
  }, 8000);

  // DM simulation — agents occasionally DM
  simTimers.dms = setInterval(() => {
    if (!shouldPoll()) return;
    const agent = AGENTS.filter(a => a.status === 'active')[0] || AGENTS[0];
    const dmTexts = [
      'Quick update — task is progressing well. ETA 20 minutes.',
      'Found an edge case. Handling it now, no action needed from you.',
      'Results are in. Summary posted to the relevant channel.',
      'Heads up — I noticed something in the vault that might need attention.',
      'Task complete. Moving to next item in queue.',
    ];
    const text = dmTexts[Math.floor(Math.random() * dmTexts.length)];
    const time = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});

    if (!DM_MESSAGES[agent.id]) DM_MESSAGES[agent.id] = [];
    DM_MESSAGES[agent.id].push({
      id: 'sim_dm_' + Date.now(),
      agent: agent.id,
      time,
      ts: Date.now() / 1000,
      text,
      reactions: [],
    });

    // Live update if viewing this DM
    if (currentPage === 'talk' && currentDM === agent.id) {
      renderMessages(null, agent.id);
    }

    // Notification
    addNotification(`DM from ${agent.name}`, text.substring(0, 60), agent.emoji);
  }, 35000);
}

function updateActiveAgents() {
  const active = AGENTS.filter(a => a.status === 'active');
  const count = active.length;
  const text = `${count} agent${count !== 1 ? 's' : ''} active`;
  const el = $('active-agents-text');
  if (el) el.textContent = text;
  const sideCount = $('sidebar-active-count');
  if (sideCount) sideCount.textContent = `${count} active`;
  const metricEl = $('metric-agents');
  if (metricEl) metricEl.textContent = count;
  const totalEl = $('metric-agents-total');
  if (totalEl) totalEl.textContent = `${AGENTS.length} total`;
}

// Alias for clarity
const updateTopbarAgentCount = updateActiveAgents;

// ═══════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════
// MOBILE TALK — Channel Drawer
// ═══════════════════════════════════════════════════════════

function isMobile() { return window.innerWidth <= 767; }

function initMobileTalk() {
  if (isMobile()) {
    const chName = document.getElementById('current-channel-name');
    if (chName) chName.classList.add('mobile-tap');
  }
  window.addEventListener('resize', () => {
    const chName = document.getElementById('current-channel-name');
    if (!chName) return;
    if (isMobile()) chName.classList.add('mobile-tap');
    else chName.classList.remove('mobile-tap');
  });
}

function openMobileChannelDrawer() {
  if (!isMobile()) return;
  closeMobileDrawer();

  const overlay = document.createElement('div');
  overlay.className = 'mobile-drawer-overlay';
  overlay.onclick = closeMobileDrawer;
  document.body.appendChild(overlay);

  const drawer = document.createElement('div');
  drawer.className = 'channel-sidebar mobile-drawer';
  drawer.id = 'mobile-channel-drawer';

  // Server name header
  const header = document.createElement('div');
  header.className = 'channel-server-name';
  header.innerHTML = '<span>Agent OS</span>';
  drawer.appendChild(header);

  // Mode tabs
  const tabs = document.createElement('div');
  tabs.style.cssText = 'display:flex;gap:4px;padding:8px 12px;';
  tabs.innerHTML = `
    <button style="flex:1;padding:6px;border:none;border-radius:4px;font-size:12px;cursor:pointer;
      background:${talkMode==='channels'?'var(--accent)':'var(--bg-raised)'};
      color:${talkMode==='channels'?'var(--bg)':'var(--text-dim)'};"
      onclick="talkMode='channels';closeMobileDrawer();openMobileChannelDrawer()">Channels</button>
    <button style="flex:1;padding:6px;border:none;border-radius:4px;font-size:12px;cursor:pointer;
      background:${talkMode==='dms'?'var(--accent)':'var(--bg-raised)'};
      color:${talkMode==='dms'?'var(--bg)':'var(--text-dim)'};"
      onclick="talkMode='dms';closeMobileDrawer();openMobileChannelDrawer()">DMs</button>`;
  drawer.appendChild(tabs);

  // Channel/DM list
  const list = document.createElement('div');
  list.id = 'mobile-channel-list';
  list.style.cssText = 'flex:1;overflow-y:auto;padding:4px 0;';
  drawer.appendChild(list);

  document.body.appendChild(drawer);
  renderMobileDrawerChannels();
}

function renderMobileDrawerChannels() {
  const list = document.getElementById('mobile-channel-list');
  if (!list) return;

  if (talkMode === 'channels') {
    let html = '';
    if (DC_CHANNELS.categories) {
      DC_CHANNELS.categories.forEach(cat => {
        html += `<div style="padding:10px 12px 4px;font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text-muted);letter-spacing:0.5px">${cat.name}</div>`;
        cat.channels.forEach(ch => {
          const chType = ch.type || 'text';
          if (chType === 'voice') return; // skip voice on mobile
          const active = ch.id === currentChannel ? 'background:var(--bg-raised);color:var(--accent)' : '';
          const unread = ch.unread ? `<span style="background:var(--accent);color:var(--bg);border-radius:10px;padding:1px 6px;font-size:10px;margin-left:auto">${ch.unread}</span>` : '';
          const icon = chType === 'forum' ? '💬' : '#';
          html += `<div onclick="switchChannel('${ch.id}');closeMobileDrawer()" 
            style="display:flex;align-items:center;gap:8px;padding:9px 16px;cursor:pointer;border-radius:4px;margin:1px 8px;${active}">
            <span style="color:var(--text-muted);font-size:14px">${icon}</span>
            <span style="font-size:13px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${ch.name}</span>
            ${unread}
          </div>`;
        });
      });
    } else {
      DC_CHANNELS.text.forEach(ch => {
        const active = ch.id === currentChannel ? 'background:var(--bg-raised);color:var(--accent)' : '';
        const unread = ch.unread ? `<span style="background:var(--accent);color:var(--bg);border-radius:10px;padding:1px 6px;font-size:10px;margin-left:auto">${ch.unread}</span>` : '';
        html += `<div onclick="switchChannel('${ch.id}');closeMobileDrawer()" 
          style="display:flex;align-items:center;gap:8px;padding:8px 16px;cursor:pointer;border-radius:4px;margin:1px 8px;${active}">
          <span style="color:var(--text-muted);font-size:14px">#</span>
          <span style="font-size:14px">${ch.id}</span>
          ${unread}
        </div>`;
      });
    }
    list.innerHTML = html;
  } else {
    // DMs — derive from DM_MESSAGES keys
    let html = '';
    const dmAgents = typeof DM_MESSAGES !== 'undefined' ? Object.keys(DM_MESSAGES) : [];
    dmAgents.forEach(agentId => {
      const agent = AGENTS.find(a => a.id === agentId) || {};
      const msgs = DM_MESSAGES[agentId] || [];
      const lastMsg = msgs.length ? msgs[msgs.length - 1].text : '';
      const active = currentDM === agentId ? 'background:var(--bg-raised);color:var(--accent)' : '';
      html += `<div onclick="selectDM('${agentId}');closeMobileDrawer()"
        style="display:flex;align-items:center;gap:10px;padding:10px 16px;cursor:pointer;border-radius:4px;margin:1px 8px;${active}">
        <span style="font-size:20px">${agent.emoji||'🤖'}</span>
        <div style="min-width:0;flex:1">
          <div style="font-size:14px;font-weight:500">${agent.name||agentId}</div>
          <div style="font-size:11px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${lastMsg.slice(0,60)}</div>
        </div>
      </div>`;
    });
    if (!dmAgents.length) html = '<div style="padding:20px;text-align:center;color:var(--text-muted)">No DMs yet</div>';
    list.innerHTML = html;
  }
}

function closeMobileDrawer() {
  document.querySelectorAll('.mobile-drawer-overlay').forEach(el => el.remove());
  document.getElementById('mobile-channel-drawer')?.remove();
}

// ═══════════════════════════════════════════════════════════
// CONTEXTUAL PANEL SYSTEM
// ═══════════════════════════════════════════════════════════

let ctxPanelOpen = false;

function openCtxPanel(type, id) {
  const panel = $('context-panel');
  const overlay = $('ctx-panel-overlay');
  const title = $('ctx-title');
  const body = $('ctx-body');
  const footer = $('ctx-footer');
  if (!panel || !body) return;

  // Build content based on type
  switch (type) {
    case 'agent': renderAgentCtx(id, title, body, footer); break;
    case 'task':  renderTaskCtx(id, title, body, footer); break;
    case 'vault': renderVaultCtx(id, title, body, footer); break;
    case 'mission': renderMissionCtx(id, title, body, footer); break;
    default: return;
  }

  // Show panel
  panel.classList.remove('hidden');
  overlay.classList.remove('hidden');
  requestAnimationFrame(() => {
    panel.classList.add('visible');
  });
  ctxPanelOpen = true;
}

function closeCtxPanel() {
  const panel = $('context-panel');
  const overlay = $('ctx-panel-overlay');
  if (!panel) return;
  panel.classList.remove('visible');
  overlay.classList.add('hidden');
  ctxPanelOpen = false;
}

// Close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && ctxPanelOpen) closeCtxPanel();
});

function renderAgentCtx(agentId, titleEl, bodyEl, footerEl) {
  const agent = ga(agentId);
  if (!agent) return;
  titleEl.innerHTML = `${agent.emoji} ${agent.name}`;

  const statusColor = agent.status === 'active' ? 'var(--green)' : 'var(--text-muted)';
  const statusText = agent.status === 'active' ? 'Active' : 'Idle';

  // Find recent feed events for this agent
  const recentEvents = feedEvents.filter(e => e.agent === agentId).slice(0, 5);

  bodyEl.innerHTML = `
    <div class="ctx-section">
      <div class="ctx-status-row">
        <span class="ctx-status-dot" style="background:${statusColor}"></span>
        <span style="color:${statusColor};font-weight:600">${statusText}</span>
        ${agent.task ? `<span style="color:var(--text-dim);margin-left:8px">— ${agent.task}</span>` : ''}
      </div>
    </div>

    <div class="ctx-section">
      <div class="ctx-section-title">Statistics</div>
      <div class="ctx-stat-grid">
        <div class="ctx-stat"><div class="ctx-stat-val">${agent.tasks || 0}</div><div class="ctx-stat-label">Tasks Done</div></div>
        <div class="ctx-stat"><div class="ctx-stat-val">${agent.files || 0}</div><div class="ctx-stat-label">Files</div></div>
        <div class="ctx-stat"><div class="ctx-stat-val">${((agent.tokens || 0) / 1000).toFixed(1)}K</div><div class="ctx-stat-label">Tokens</div></div>
        <div class="ctx-stat"><div class="ctx-stat-val">${Math.round((agent.fitness || 0) * 100)}%</div><div class="ctx-stat-label">Fitness</div></div>
      </div>
    </div>

    <div class="ctx-section">
      <div class="ctx-section-title">Recent Activity</div>
      ${recentEvents.length > 0 ? recentEvents.map(e => `
        <div class="ctx-timeline-item">
          <span class="ctx-timeline-time">${e.time}</span>
          <span class="ctx-timeline-text">${e.content.substring(0, 80)}${e.content.length > 80 ? '…' : ''}</span>
        </div>
      `).join('') : '<div style="color:var(--text-muted);font-size:12px">No recent activity</div>'}
    </div>

    <div class="ctx-section">
      <div class="ctx-section-title">Quick Message</div>
      <div class="ctx-quick-input">
        <input type="text" id="ctx-agent-msg-input" placeholder="Message ${agent.name}..." onkeydown="if(event.key==='Enter'){sendCtxAgentMsg('${agentId}');event.preventDefault();}">
        <button onclick="sendCtxAgentMsg('${agentId}')">Send</button>
      </div>
    </div>
  `;

  footerEl.innerHTML = `
    <button class="ctx-action-btn" onclick="openTalkWithAgent('${agentId}');closeCtxPanel()">💬 Open Chat</button>
    <button class="ctx-action-btn" onclick="openMemberProfile('${agentId}');closeCtxPanel()">👤 Full Profile</button>
  `;
}

function sendCtxAgentMsg(agentId) {
  const input = $('ctx-agent-msg-input');
  if (!input || !input.value.trim()) return;
  const text = input.value.trim();
  input.value = '';
  // Navigate to DM and send
  nav('talk');
  setTimeout(() => {
    selectDM(agentId);
    setTimeout(() => {
      $('message-input').value = text;
      sendMessage();
    }, 200);
  }, 200);
  closeCtxPanel();
}

function renderTaskCtx(taskId, titleEl, bodyEl, footerEl) {
  // Search across board cards and plan tasks
  let task = null;
  let source = null;
  for (const col of Object.keys(BOARD_CARDS)) {
    const found = BOARD_CARDS[col].find(c => c.id === taskId);
    if (found) { task = found; source = 'board'; break; }
  }
  if (!task && currentPlanData) {
    task = (currentPlanData.tasks || []).find(t => t.id === taskId);
    if (task) source = 'plan';
  }
  // Also check proposals
  if (!task) {
    task = queueCards.find(q => q.id === taskId);
    if (task) source = 'proposal';
  }

  if (!task) {
    titleEl.textContent = '📋 Task';
    bodyEl.innerHTML = '<div style="color:var(--text-muted);padding:20px 0">Task not found</div>';
    footerEl.innerHTML = '';
    return;
  }

  const agent = ga(task.agent) || { emoji: '⬜', name: task.agent || 'Unassigned', color: '#6c7086' };
  const title = task.title || task.question || 'Untitled';
  titleEl.innerHTML = `📋 ${title}`;

  const description = task.description || task.context || '';
  const priority = task.priority || task._priority || 'P3';
  const tags = task.tags || task.labels || [];

  bodyEl.innerHTML = `
    <div class="ctx-section">
      <div class="ctx-status-row">
        <span class="priority-badge ${priority.toLowerCase()}">${priority}</span>
        <span style="font-size:16px">${agent.emoji}</span>
        <span style="color:${agent.color || 'var(--text-dim)'};font-weight:600">${agent.name}</span>
      </div>
    </div>

    ${description ? `
    <div class="ctx-section">
      <div class="ctx-section-title">Description</div>
      <div class="ctx-note-preview">${description}</div>
    </div>` : ''}

    ${tags.length > 0 ? `
    <div class="ctx-section">
      <div class="ctx-section-title">Tags</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${tags.map(t => `<span class="board-tag">${t}</span>`).join('')}
      </div>
    </div>` : ''}

    ${task.progress !== undefined ? `
    <div class="ctx-section">
      <div class="ctx-section-title">Progress</div>
      <div class="progress-bar-outer" style="height:8px"><div class="progress-bar-inner" style="width:${task.progress}%"></div></div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:4px">${task.progress}% complete</div>
    </div>` : ''}
  `;

  footerEl.innerHTML = `
    ${source === 'proposal' ? `<button class="ctx-action-btn primary" onclick="resolveProposalAction('${taskId}','approve');closeCtxPanel()">✅ Approve</button>` : ''}
    ${source === 'proposal' ? `<button class="ctx-action-btn" onclick="resolveProposalAction('${taskId}','reject');closeCtxPanel()">❌ Reject</button>` : ''}
  `;
}

function renderVaultCtx(noteId, titleEl, bodyEl, footerEl) {
  const note = VAULT_NOTES.find(n => n.id === noteId);
  if (!note) {
    titleEl.textContent = '📚 Vault Note';
    bodyEl.innerHTML = '<div style="color:var(--text-muted);padding:20px 0">Note not found</div>';
    footerEl.innerHTML = '';
    return;
  }

  const agent = ga(note.agent) || { emoji: '🤖', name: note.agent };
  const typeColor = TYPE_COLORS[note.type] || 'var(--text-dim)';
  const cc = note.confidence >= 80 ? 'var(--green)' : note.confidence >= 60 ? 'var(--yellow)' : 'var(--red)';

  titleEl.innerHTML = `📚 ${note.title}`;

  // Related notes
  const related = VAULT_NOTES.filter(n => n.id !== note.id && n.tags.some(t => note.tags.includes(t))).slice(0, 3);

  bodyEl.innerHTML = `
    <div class="ctx-section">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span class="vault-card-type" style="color:${typeColor};border-color:${typeColor}40">${note.type}</span>
        <span style="font-size:12px;color:var(--text-muted)">${note.date}</span>
        <span style="font-size:12px;color:${cc}">● ${note.confidence}%</span>
        <span style="font-size:12px;color:var(--text-muted)">🔗 ${note.backlinks}</span>
      </div>
      <div style="font-size:12px;color:var(--text-dim)">By ${agent.emoji} ${agent.name}</div>
    </div>

    <div class="ctx-section">
      <div class="ctx-section-title">Preview</div>
      <div class="ctx-note-preview">${note.summary}</div>
    </div>

    <div class="ctx-section">
      <div class="ctx-section-title">Tags</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        ${note.tags.map(t => `<span class="note-tag">#${t}</span>`).join('')}
      </div>
    </div>

    ${related.length > 0 ? `
    <div class="ctx-section">
      <div class="ctx-section-title">Related Notes</div>
      ${related.map(r => `
        <div class="ctx-timeline-item" style="cursor:pointer" onclick="closeCtxPanel();setTimeout(()=>openCtxPanel('vault','${r.id}'),100)">
          <span class="ctx-timeline-time">${(ga(r.agent)||{emoji:'🤖'}).emoji}</span>
          <span class="ctx-timeline-text">${r.title}</span>
        </div>
      `).join('')}
    </div>` : ''}
  `;

  footerEl.innerHTML = `
    <button class="ctx-action-btn primary" onclick="closeCtxPanel();nav('mind');setMindMode('graph')">🧠 Open in Mind</button>
    <button class="ctx-action-btn" onclick="closeCtxPanel();openVaultNote(VAULT_NOTES.find(n=>n.id==='${noteId}'))">📖 Full View</button>
  `;
}

function renderMissionCtx(missionId, titleEl, bodyEl, footerEl) {
  const m = (typeof mcMissions !== 'undefined' ? mcMissions : MISSIONS_DATA).find(x => x.id === missionId);
  if (!m) {
    titleEl.textContent = '🎯 Mission';
    bodyEl.innerHTML = '<div style="color:var(--text-muted);padding:20px 0">Mission not found</div>';
    footerEl.innerHTML = '';
    return;
  }

  const progressColor = m.progress >= 100 ? 'var(--accent)' : m.progress >= 50 ? 'var(--green)' : 'var(--yellow)';
  const blocking = (typeof mcBlocking !== 'undefined' ? mcBlocking : []).filter(b => b.mission === missionId);

  titleEl.innerHTML = `${m.icon} ${m.title}`;

  bodyEl.innerHTML = `
    <div class="ctx-section">
      <div class="ctx-progress-ring-wrap">
        ${typeof renderMiniProgressRing === 'function' ? renderMiniProgressRing(m.progress, progressColor, 48) : ''}
        <div>
          <div style="font-size:22px;font-weight:800;color:var(--text)">${m.progress}%</div>
          <div style="font-size:12px;color:var(--text-muted)">${m.status}</div>
        </div>
      </div>
      ${m.goal ? `<div style="font-size:12px;color:var(--text-dim);margin-bottom:8px">Goal: ${m.goal}</div>` : ''}
      ${m.desc ? `<div style="font-size:13px;color:var(--text-dim);line-height:1.5">${m.desc}</div>` : ''}
    </div>

    <div class="ctx-section">
      <div class="ctx-section-title">Stats</div>
      <div class="ctx-stat-grid">
        <div class="ctx-stat"><div class="ctx-stat-val">${m.tasks_done}/${m.tasks_total}</div><div class="ctx-stat-label">Tasks</div></div>
        <div class="ctx-stat"><div class="ctx-stat-val">${m.agents_active}</div><div class="ctx-stat-label">Agents</div></div>
        <div class="ctx-stat"><div class="ctx-stat-val">${m.velocity.toFixed(1)}/d</div><div class="ctx-stat-label">Velocity</div></div>
        <div class="ctx-stat"><div class="ctx-stat-val">${m.days_active}d</div><div class="ctx-stat-label">Active</div></div>
      </div>
    </div>

    ${blocking.length > 0 ? `
    <div class="ctx-section">
      <div class="ctx-section-title">⚡ Needs Your Input</div>
      ${blocking.map(b => `
        <div style="padding:6px 0;font-size:13px;color:var(--text);border-bottom:1px solid var(--border)">
          ${b.type === 'proposal' ? '📋' : '👁️'} ${b.title}
          <div style="font-size:11px;color:var(--text-muted)">From: ${b.source}</div>
        </div>
      `).join('')}
    </div>` : ''}

    ${m.milestones && m.milestones.length > 0 ? `
    <div class="ctx-section">
      <div class="ctx-section-title">Milestones</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${m.milestones.map(ms => `<span class="milestone-badge${ms.includes('✓')?' earned':''}">${ms}</span>`).join('')}
      </div>
    </div>` : ''}
  `;

  footerEl.innerHTML = `
    <button class="ctx-action-btn primary" onclick="closeCtxPanel();nav('missions');setTimeout(()=>selectMCMission('${missionId}'),200)">🎯 Open Mission</button>
  `;
}

// ── Event delegation for context triggers ─────────────────
document.addEventListener('click', e => {
  const ctxEl = e.target.closest('[data-ctx-type]');
  if (ctxEl) {
    e.preventDefault();
    e.stopPropagation();
    const type = ctxEl.dataset.ctxType;
    const id = ctxEl.dataset.ctxId;
    if (type && id) openCtxPanel(type, id);
  }
});

// ═══════════════════════════════════════════════════════════
// THE BRIEFING (Auto-Generated Summary)
// ═══════════════════════════════════════════════════════════

function getTimeGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getTimeSinceLastVisit() {
  const last = parseInt(localStorage.getItem('agentOS-lastVisit') || '0');
  if (!last) return null;
  const diffMs = Date.now() - last;
  const hours = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  if (hours > 24) return `${Math.floor(hours / 24)} day${Math.floor(hours/24) !== 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
}

async function generateBriefing() {
  const body = $('briefing-body');
  if (!body) return;

  const greeting = getTimeGreeting();
  const sinceText = getTimeSinceLastVisit();

  // Gather data from local state + optionally bridge
  let systemHealth = 'All systems operational';
  let systemHealthOk = true;
  let feedData = feedEvents.slice(0, 30);
  let pendingCount = queueCards.filter(q => !q._status || q._status === 'pending').length;
  let errorCount = feedData.filter(e => e.type === 'error').length;
  let autoApproved = queueCards.filter(q => q._triageVerdict === 'auto-execute' || q._status === 'auto-approved').length;

  // Count completions per agent
  const completions = {};
  feedData.filter(e => e.type === 'task_completed').forEach(e => {
    const a = ga(e.agent);
    const key = a ? `${a.emoji} ${a.name}` : e.agent;
    completions[key] = (completions[key] || 0) + 1;
  });

  const vaultWrites = feedData.filter(e => e.type === 'vault_write').length;

  // Try bridge for system health
  if (Bridge.liveMode) {
    try {
      const sys = await Bridge.getSystemOverview().catch(() => null);
      if (sys) {
        if (sys.status === 'degraded' || sys.status === 'error') {
          systemHealth = sys.message || 'Issues detected';
          systemHealthOk = false;
        }
      }
    } catch (e) { /* ignore */ }
  }

  // Active missions
  const missions = typeof mcMissions !== 'undefined' ? mcMissions.filter(m => m.status === 'active') : [];
  const topMission = missions.sort((a, b) => b.velocity - a.velocity)[0];

  // Build HTML
  let html = `<div class="briefing-greeting">${greeting}, Trajan.</div>`;

  // Since Last Visit
  if (sinceText) {
    html += `<div class="briefing-section">
      <div class="briefing-section-title">📊 Since Last Visit</div>
      <div class="briefing-item" style="color:var(--text-muted);margin-bottom:6px">Since you were last here ${sinceText}:</div>`;

    if (Object.keys(completions).length > 0) {
      Object.entries(completions).forEach(([agent, count]) => {
        html += `<div class="briefing-item">${agent} shipped <strong>${count} task${count !== 1 ? 's' : ''}</strong></div>`;
      });
    }
    if (vaultWrites > 0) {
      html += `<div class="briefing-item">📚 <strong>${vaultWrites}</strong> vault write${vaultWrites !== 1 ? 's' : ''}</div>`;
    }
    if (errorCount > 0) {
      html += `<div class="briefing-item" style="color:var(--red)">🔴 <strong>${errorCount}</strong> error${errorCount !== 1 ? 's' : ''} detected</div>`;
    } else {
      html += `<div class="briefing-item" style="color:var(--green)">✅ No errors.</div>`;
    }
    if (autoApproved > 0) {
      html += `<div class="briefing-item">⚡ ${autoApproved} proposal${autoApproved !== 1 ? 's' : ''} auto-approved</div>`;
    }
    html += `</div>`;
  }

  // Needs Attention
  const attentionItems = [];
  if (pendingCount > 0) attentionItems.push(`📋 <strong>${pendingCount}</strong> pending proposal${pendingCount !== 1 ? 's' : ''}`);
  if (errorCount > 0) attentionItems.push(`🔴 <strong>${errorCount}</strong> error${errorCount !== 1 ? 's' : ''} to review`);

  if (attentionItems.length > 0) {
    html += `<div class="briefing-section">
      <div class="briefing-attention">
        <div class="briefing-section-title" style="margin-bottom:6px">⚡ Needs Your Attention</div>
        ${attentionItems.map(i => `<div class="briefing-item">${i}</div>`).join('')}
      </div>
    </div>`;
  }

  // Today's Plan
  if (missions.length > 0) {
    html += `<div class="briefing-section">
      <div class="briefing-section-title">🎯 Active Missions</div>`;
    missions.slice(0, 3).forEach(m => {
      html += `<div class="briefing-item">${m.icon} <strong>${m.title}</strong> — ${m.progress}% · ${m.agents_active} agent${m.agents_active !== 1 ? 's' : ''}</div>`;
    });
    if (topMission) {
      html += `<div class="briefing-highlight">💡 Suggested focus: <strong>${topMission.title}</strong> (highest velocity: ${topMission.velocity.toFixed(1)}/day)</div>`;
    }
    html += `</div>`;
  }

  // System Health
  html += `<div class="briefing-section">
    <div class="briefing-section-title">🩺 System Health</div>
    <div class="briefing-health">
      <span class="briefing-health-dot" style="background:${systemHealthOk ? 'var(--green)' : 'var(--red)'}"></span>
      <span>${systemHealth}</span>
    </div>
    <div class="briefing-item">${AGENTS.filter(a => a.status === 'active').length}/${AGENTS.length} agents active</div>
  </div>`;

  body.innerHTML = html;
}

function showBriefing() {
  generateBriefing();
  $('briefing-overlay').classList.remove('hidden');
}

function closeBriefing() {
  $('briefing-overlay').classList.add('hidden');
  // Save visit timestamp
  localStorage.setItem('agentOS-lastVisit', String(Date.now()));
}

function closeBriefingIfOutside(e) {
  if (e.target === $('briefing-overlay')) closeBriefing();
}

function checkBriefingOnLoad() {
  const last = parseInt(localStorage.getItem('agentOS-lastVisit') || '0');
  const oneHour = 3600000;
  if (!last || (Date.now() - last > oneHour)) {
    // Show briefing after a short delay so the app finishes rendering
    setTimeout(() => showBriefing(), 1500);
  }
  // Always update the timestamp on load
  localStorage.setItem('agentOS-lastVisit', String(Date.now()));
}

// ═══════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (typeof lucide !== 'undefined') lucide.createIcons();

  // Set initial XP display
  updateXPDisplay();

  // Initial notifications from existing data
  addNotification('Red Team v5.1', '3 critical issues found', '🔴');
  addNotification('Deploy complete', 'cross-channel-backlinker.sh live', '✅');
  addNotification('Queue pending', `${QUEUE_QUESTIONS.length} question${QUEUE_QUESTIONS.length !== 1 ? 's' : ''} need answers`, '❓');

  // Render Feed (home page)
  renderFeed();

  // Render Queue (preload)
  renderQueue();

  // Init Talk
  initTalk();
  initMobileTalk();

  // Init active agents display
  updateActiveAgents();

  // Start simulation
  startSimulation();

  // Keyboard shortcuts for nav  
  document.addEventListener('keydown', e => {
    if (paletteOpen) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const map = { '1': 'feed', '2': 'talk', '3': 'queue', '4': 'mind', '5': 'pulse' };
    if (map[e.key]) { nav(map[e.key]); }
  });

  // Init Quick Actions
  updateQuickActions();

  // Init Agent Chat FAB
  if (typeof initAgentChatFAB === 'function') initAgentChatFAB();

  // Check if briefing should auto-show
  if (typeof checkBriefingOnLoad === 'function') checkBriefingOnLoad();
});

// ═══════════════════════════════════════════════════════════
// QUICK ACTIONS FAB
// ═══════════════════════════════════════════════════════════

const QUICK_ACTIONS = {
  feed: [
    { icon: '🔬', label: 'Research Topic', action: 'research' },
    { icon: '📊', label: 'Analyze Gaps', action: 'gaps' },
    { icon: '🎯', label: 'Generate 6 Proposals', action: 'proposals' },
    { icon: '📝', label: 'Summarize Today', action: 'summarize' },
  ],
  talk: [
    { icon: '📨', label: 'Deploy Update', action: 'deploy' },
    { icon: '📢', label: 'Broadcast to All', action: 'broadcast' },
    { icon: '🤖', label: 'Summon Agent', action: 'summon' },
  ],
  queue: [
    { icon: '⚡', label: 'Auto-Prioritize All', action: 'auto-prioritize' },
    { icon: '✅', label: 'Batch Approve', action: 'batch-approve' },
    { icon: '🗑️', label: 'Clear Answered', action: 'clear-done' },
  ],
  mind: [
    { icon: '🧠', label: 'Find Gaps', action: 'find-gaps' },
    { icon: '🔗', label: 'Auto-Link Notes', action: 'auto-link' },
    { icon: '📊', label: 'Coverage Report', action: 'coverage' },
  ],
  pulse: [
    { icon: '🔄', label: 'Refresh All Metrics', action: 'refresh-metrics' },
    { icon: '🚨', label: 'Run Health Check', action: 'health-check' },
    { icon: '📉', label: 'Cost Analysis', action: 'cost-analysis' },
  ],
};

let quickActionsOpen = false;

function toggleQuickActions() {
  quickActionsOpen = !quickActionsOpen;
  const fab = $('quick-actions-fab');
  const menu = $('quick-actions-menu');
  fab.classList.toggle('open', quickActionsOpen);
  if (quickActionsOpen) {
    menu.classList.remove('hidden');
    updateQuickActions();
  } else {
    menu.classList.add('hidden');
  }
}

function updateQuickActions() {
  const menu = $('quick-actions-menu');
  if (!menu || !quickActionsOpen) return;
  const page = currentPage || 'feed';
  const actions = QUICK_ACTIONS[page] || QUICK_ACTIONS.feed;
  menu.innerHTML = actions.map(a =>
    `<button class="qa-btn" onclick="runQuickAction('${a.action}')">
      <span class="qa-btn-icon">${a.icon}</span>
      <span class="qa-btn-label">${a.label}</span>
    </button>`
  ).join('');
}

function runQuickAction(action) {
  toggleQuickActions(); // close menu

  // Simulate the action with streaming progress
  const actionNames = {
    'research': '🔬 Researching topic...',
    'gaps': '📊 Analyzing gaps across vault...',
    'proposals': '🎯 Generating 6 proposals...',
    'summarize': '📝 Summarizing today\'s activity...',
    'deploy': '📨 Deploying update to agents...',
    'broadcast': '📢 Broadcasting to all channels...',
    'summon': '🤖 Summoning agent...',
    'auto-prioritize': '⚡ Auto-prioritizing queue...',
    'batch-approve': '✅ Batch approving items...',
    'clear-done': '🗑️ Clearing answered items...',
    'find-gaps': '🧠 Scanning vault for gaps...',
    'auto-link': '🔗 Auto-linking related notes...',
    'coverage': '📊 Generating coverage report...',
    'refresh-metrics': '🔄 Refreshing all metrics...',
    'health-check': '🚨 Running health check...',
    'cost-analysis': '📉 Analyzing token costs...',
  };

  const name = actionNames[action] || 'Running action...';
  toast(name, 'info', 2000);
  
  // Sync to Discord
  syncToDiscord('agent-feed', `⚡ Quick Action: ${name}`, 'righthand');
  addXP(20, 'quick action');

  // Simulate result after delay
  setTimeout(() => {
    const results = {
      'proposals': '✅ 6 proposals generated and posted to #dispatch',
      'gaps': '✅ Gap analysis complete — 3 areas identified',
      'research': '✅ Research task dispatched to 🔬 Researcher',
      'summarize': '✅ Daily summary posted to #daily-brief',
      'auto-prioritize': '✅ Queue reordered by urgency × impact',
      'batch-approve': '✅ 3 items approved, synced to Discord',
      'find-gaps': '✅ Found 4 uncovered topics in vault',
      'coverage': '✅ Coverage: 73% — weak in Operations, strong in Architecture',
    };
    toast(results[action] || '✅ Action complete', 'success', 3500);
    addNotification('Quick Action', results[action] || 'Complete', '⚡');
  }, 2000 + Math.random() * 1500);
}

// ═══════════════════════════════════════════════════════════
// MOBILE MENU
// ═══════════════════════════════════════════════════════════

let mobileMenuOpen = false;

function toggleMobileMenu() {
  mobileMenuOpen = !mobileMenuOpen;
  const drawer = $('mobile-menu-drawer');
  if (mobileMenuOpen) {
    drawer.classList.remove('hidden');
    // Re-render Lucide icons in the drawer
    if (typeof lucide !== 'undefined') lucide.createIcons({ nameAttr: 'data-lucide' });
  } else {
    drawer.classList.add('hidden');
  }
}

// ═══════════════════════════════════════════════════════════
// SCHEDULE VIEW
// ═══════════════════════════════════════════════════════════

const SCHEDULE_DATA = [
  { time: '06:00', events: [] },
  { time: '06:30', events: [{ label: 'QMD vault index', agent: 'ops', color: 'var(--orange)' }] },
  { time: '07:00', events: [{ label: '📢 Daily Brief generation', agent: 'righthand', color: 'var(--accent)' }] },
  { time: '07:15', events: [{ label: 'Heartbeat check', agent: 'ops', color: 'var(--orange)' }] },
  { time: '07:30', events: [] },
  { time: '08:00', events: [{ label: 'Dispatch queue scan', agent: 'righthand', color: 'var(--accent)' }, { label: 'Ingestor feed pull', agent: 'researcher', color: 'var(--accent2)' }] },
  { time: '08:30', events: [{ label: 'Session health check', agent: 'ops', color: 'var(--orange)' }] },
  { time: '09:00', events: [{ label: 'Morning batch dispatch', agent: 'righthand', color: 'var(--accent)', now: true }] },
  { time: '09:30', events: [{ label: 'Vault freshness scan', agent: 'ops', color: 'var(--orange)' }] },
  { time: '10:00', events: [{ label: 'Ontology sync', agent: 'ops', color: 'var(--orange)' }] },
  { time: '10:30', events: [] },
  { time: '11:00', events: [{ label: 'Competitive scan', agent: 'researcher', color: 'var(--accent2)' }] },
  { time: '12:00', events: [{ label: 'Memory pressure check', agent: 'righthand', color: 'var(--accent)' }] },
  { time: '13:00', events: [{ label: 'Agent fitness review', agent: 'righthand', color: 'var(--accent)' }] },
  { time: '14:00', events: [{ label: 'Red team sweep', agent: 'devil', color: 'var(--red)' }] },
  { time: '15:00', events: [{ label: 'Auto-knowledge capture', agent: 'ops', color: 'var(--orange)' }] },
];

function renderSchedule() {
  const el = $('schedule-content');
  if (!el) return;
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div>
        <div style="font-size:16px;font-weight:700">Today — ${new Date().toLocaleDateString('en-US',{weekday:'long',month:'short',day:'numeric'})}</div>
        <div style="font-size:12px;color:var(--text-muted)">${SCHEDULE_DATA.reduce((s,h)=>s+h.events.length,0)} scheduled tasks · 3 cron jobs</div>
      </div>
      <button class="qa-btn" onclick="runQuickAction('summarize')" style="box-shadow:none">📅 Schedule Task</button>
    </div>
    <div class="schedule-timeline">
      ${SCHEDULE_DATA.map(h => `
        <div class="schedule-hour">
          <div class="schedule-time">${h.time}</div>
          <div class="schedule-events">
            ${h.events.length ? h.events.map(e => `
              <div class="schedule-event${e.now?' schedule-now':''}" style="border-left-color:${e.color}">
                ${e.label}
                <span style="font-size:11px;color:var(--text-muted);margin-left:8px">${(ga(e.agent)||{}).emoji||'🤖'}</span>
              </div>
            `).join('') : ''}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════
// MISSION CONTROL VIEW
// ═══════════════════════════════════════════════════════════

// Seed data — replaced by bridge data when live
const MISSIONS_DATA = [
  { id:'m1', icon:'🎯', title:'Competitive Dominance', desc:'Complete analysis of all 60+ competitors',
    progress:73, status:'active', goal:'Market Intelligence', target_date:'2026-04-15',
    success_criteria:'60+ competitors profiled, final report published to vault',
    agents_active:2, blocking_items:1, velocity:2.3, tasks_done:11, tasks_total:15, days_active:18,
    milestones:['Surface scan ✓','Deep dive: 3/13','Final report'] },
  { id:'m2', icon:'🏗️', title:'Frontend Vision', desc:'Build the Agent OS cockpit — replace Discord',
    progress:35, status:'active', goal:'Product Development', target_date:'2026-05-01',
    success_criteria:'Fully functional frontend replacing Discord as primary interface',
    agents_active:3, blocking_items:2, velocity:1.8, tasks_done:7, tasks_total:20, days_active:24,
    milestones:['Design spec ✓','Demo v6 ✓','Mobile QA','Deploy live'] },
  { id:'m3', icon:'💰', title:'Wilson Premier Revenue', desc:'Ship Phase 0 feasibility for Wilson Premier',
    progress:15, status:'active', goal:'Revenue Generation', target_date:'2026-06-01',
    success_criteria:'Phase 0 feasibility delivered, client approval received',
    agents_active:1, blocking_items:0, velocity:0.7, tasks_done:3, tasks_total:20, days_active:10,
    milestones:['Research','Architecture','Prototype','Pitch deck'] },
  { id:'m4', icon:'🧠', title:'Vault Mastery', desc:'500 vault notes, all cross-linked, confidence calibrated',
    progress:88, status:'active', goal:'Knowledge Management', target_date:'2026-04-01',
    success_criteria:'500 notes with backlinks and confidence scores',
    agents_active:1, blocking_items:0, velocity:3.1, tasks_done:44, tasks_total:50, days_active:30,
    milestones:['100 notes ✓','250 notes ✓','Backlinks ✓','500 notes'] },
  { id:'m5', icon:'🔒', title:'Zero Security Criticals', desc:'Clear all security audit findings',
    progress:100, status:'completed', goal:'Infrastructure', target_date:'2026-03-10',
    success_criteria:'All critical and high findings resolved',
    agents_active:0, blocking_items:0, velocity:0, tasks_done:8, tasks_total:8, days_active:14,
    milestones:['Port scan ✓','SSH hardened ✓','Firewall ✓','All clear ✓'] },
  { id:'m6', icon:'📋', title:'Dispatch Engine v3', desc:'Priority queue with agent capability matrix',
    progress:0, status:'planned', goal:'Architecture', target_date:'2026-07-01',
    success_criteria:'Load balancer + capability matrix operational',
    agents_active:0, blocking_items:0, velocity:0, tasks_done:0, tasks_total:12, days_active:0,
    milestones:['Design','Implementation','Testing','Deploy'] },
];

// Seed feed events for missions
const MISSION_FEED_DATA = [
  { ts:'2026-03-20T07:45:00Z', agent:'🔬', type:'task', text:'Completed competitor profile: Cursor', mission:'m1' },
  { ts:'2026-03-20T07:30:00Z', agent:'💻', type:'task', text:'Pushed plans page redesign PR', mission:'m2' },
  { ts:'2026-03-20T07:15:00Z', agent:'🤖', type:'agent', text:'Coder assigned to missions redesign', mission:'m2' },
  { ts:'2026-03-20T06:50:00Z', agent:'📊', type:'task', text:'Vault note #488 indexed with backlinks', mission:'m4' },
  { ts:'2026-03-20T06:30:00Z', agent:'💻', type:'error', text:'Build failed: CSS syntax error in pulse view', mission:'m2' },
  { ts:'2026-03-20T06:00:00Z', agent:'🔬', type:'task', text:'Started deep dive: Devin AI', mission:'m1' },
  { ts:'2026-03-19T23:00:00Z', agent:'💰', type:'task', text:'Wilson research doc v1 drafted', mission:'m3' },
  { ts:'2026-03-19T22:30:00Z', agent:'🤖', type:'agent', text:'Researcher idle — waiting for direction', mission:'m1' },
  { ts:'2026-03-19T21:00:00Z', agent:'📊', type:'task', text:'Confidence calibration pass 3 complete', mission:'m4' },
];

const MISSION_DECISIONS_DATA = [
  { date:'2026-03-19', mission:'m2', decision:'Approved: Use Catppuccin Mocha as base theme', who:'Trajan', type:'approved' },
  { date:'2026-03-18', mission:'m1', decision:'Rejected: Skip smaller competitors (<$1M ARR)', who:'Trajan', type:'rejected' },
  { date:'2026-03-17', mission:'m2', decision:'Auto-approved: Add command palette shortcut', who:'Auto', type:'approved' },
  { date:'2026-03-16', mission:'m3', decision:'Approved: Focus on hospitality vertical first', who:'Trajan', type:'approved' },
  { date:'2026-03-15', mission:'m4', decision:'Auto-approved: Enable QMD cron every 30min', who:'Auto', type:'approved' },
  { date:'2026-03-14', mission:'m2', decision:'Direction change: Move from 4-panel to sidebar layout', who:'Trajan', type:'direction' },
];

const MISSION_BLOCKING_DATA = [
  { mission:'m1', type:'proposal', title:'Add pricing data to competitor profiles?', source:'Researcher' },
  { mission:'m2', type:'review', title:'Review: Mission Control mockup', source:'Coder' },
  { mission:'m2', type:'proposal', title:'Use WebSocket for live feed updates?', source:'Ops' },
];

const MISSION_PLANS_DATA = [
  { id:'plan-agent-os-frontend', name:'Agent OS Frontend', mission:'m2', backlog:3, active:2, done:5, agents:['💻','🎨'] },
  { id:'plan-competitor-research', name:'Competitor Research', mission:'m1', backlog:8, active:2, done:3, agents:['🔬'] },
  { id:'plan-wilson-phase0', name:'Wilson Phase 0', mission:'m3', backlog:5, active:1, done:1, agents:['🔬','💻'] },
  { id:'plan-vault-indexing', name:'Vault Indexing & QMD', mission:'m4', backlog:2, active:1, done:8, agents:['🧠','⚙️'] },
];

let mcSelectedMission = null;
let mcActiveTab = 'overview';
let mcMissions = [...MISSIONS_DATA];
let mcFeed = [...MISSION_FEED_DATA];
let mcDecisions = [...MISSION_DECISIONS_DATA];
let mcBlocking = [...MISSION_BLOCKING_DATA];
let mcPlans = [...MISSION_PLANS_DATA];
let _missionsRefreshTimer = null;

async function fetchMissionsFromBridge() {
  if (typeof Bridge === 'undefined' || !Bridge.liveMode) return false;
  try {
    const [missions, feed, proposals, plans] = await Promise.all([
      Bridge.apiFetch('/api/missions').catch(() => null),
      Bridge.getMissionsFeed(50).catch(() => null),
      Bridge.getProposals('pending').catch(() => null),
      Bridge.getPlans().catch(() => null),
    ]);
    if (missions && Array.isArray(missions) && missions.length > 0) {
      mcMissions = missions;
    }
    if (feed && Array.isArray(feed)) {
      mcFeed = feed.map(f => ({
        ts: f.timestamp || f.ts, agent: f.agent_emoji || f.agent || '🤖',
        type: f.type || 'task', text: f.text || f.message || f.description || f.content || '',
        mission: f.mission_id || f.mission || '',
      }));
    }
    if (proposals && Array.isArray(proposals)) {
      mcBlocking = proposals.filter(p => p.status === 'pending').map(p => ({
        mission: p.mission_id || p.goal_id || '', type: 'proposal',
        title: p.title || p.description, source: p.agent || p.source || 'Agent',
      }));
    }
    if (plans && Array.isArray(plans)) {
      mcPlans = plans.map(p => {
        const tasks = p.tasks || [];
        return {
          id: p.id, name: p.name, mission: p.mission_id || p.goal_id || '',
          backlog: tasks.filter(t => t.column === 'backlog').length,
          active: tasks.filter(t => t.column === 'active' || t.column === 'in_progress').length,
          done: tasks.filter(t => t.column === 'done').length,
          agents: [...new Set(tasks.map(t => t.agent).filter(Boolean))].map(a => {
            const ag = typeof ga === 'function' ? ga(a) : null;
            return ag ? ag.emoji : '🤖';
          }),
        };
      });
    }
    return true;
  } catch (e) {
    console.warn('[MissionControl] Bridge load failed, using seed data:', e.message);
    return false;
  }
}

async function renderMissions() {
  await fetchMissionsFromBridge();

  renderMCSidebar();
  if (mcSelectedMission) {
    renderMCDetail(mcSelectedMission);
  } else {
    renderMCHillAndCards();
  }
  
  // Start auto-refresh every 30s
  startMissionsRefresh();
}

// ── Hill Chart ────────────────────────────────────────────

function renderMCHillAndCards() {
  const detail = $('mc-detail');
  if (!detail) return;

  const active = mcMissions.filter(m => m.status !== 'completed' && m.status !== 'planned');
  const planned = mcMissions.filter(m => m.status === 'planned');
  const completed = mcMissions.filter(m => m.status === 'completed');
  const all = [...active, ...planned, ...completed];

  detail.innerHTML = `
    <div class="hill-chart-container">
      <div class="hill-chart-title">Mission Progress</div>
      <div class="hill-chart-labels">
        <span class="hill-label-left">Figuring it out</span>
        <span class="hill-label-right">Making it happen</span>
      </div>
      <svg class="hill-chart-svg" viewBox="0 0 600 200" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id="hill-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#1e1e2e"/>
            <stop offset="50%" stop-color="#313244"/>
            <stop offset="100%" stop-color="#1e1e2e"/>
          </linearGradient>
          <linearGradient id="hill-stroke-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#cba6f7" stop-opacity="0.4"/>
            <stop offset="50%" stop-color="#cba6f7"/>
            <stop offset="100%" stop-color="#a6e3a1" stop-opacity="0.4"/>
          </linearGradient>
          <filter id="dot-shadow">
            <feDropShadow dx="0" dy="1" stdDeviation="2" flood-color="#000" flood-opacity="0.5"/>
          </filter>
          <filter id="dot-glow">
            <feGaussianBlur stdDeviation="3" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        <!-- Hill fill -->
        <path d="M0,180 C150,180 150,40 300,40 C450,40 450,180 600,180 Z" fill="url(#hill-grad)" opacity="0.6"/>
        <!-- Hill curve -->
        <path d="M0,180 C150,180 150,40 300,40 C450,40 450,180 600,180" fill="none" stroke="url(#hill-stroke-grad)" stroke-width="2"/>
        <!-- Midline -->
        <line x1="300" y1="35" x2="300" y2="185" stroke="#585b70" stroke-width="1" stroke-dasharray="4,4" opacity="0.5"/>
        <!-- Mission dots -->
        ${all.map(m => {
          const pos = hillPosition(m.progress);
          const color = hillDotColor(m);
          const r = hillDotSize(m);
          return `
            <g class="hill-dot-group" data-mission="${m.id}" onclick="selectMCMission('${m.id}')" style="cursor:pointer">
              <circle cx="${pos.x}" cy="${pos.y}" r="${r + 4}" fill="${color}" opacity="0.15" class="hill-dot-pulse"/>
              <circle cx="${pos.x}" cy="${pos.y}" r="${r}" fill="${color}" filter="url(#dot-shadow)" class="hill-dot"/>
              <title>${m.title} — ${m.progress}%</title>
            </g>
          `;
        }).join('')}
      </svg>
      <div class="hill-chart-legend">
        <span class="hill-legend-item"><span class="hill-legend-dot" style="background:#a6e3a1"></span>Active</span>
        <span class="hill-legend-item"><span class="hill-legend-dot" style="background:#89b4fa"></span>Planned</span>
        <span class="hill-legend-item"><span class="hill-legend-dot" style="background:#94e2d5"></span>Complete</span>
        <span class="hill-legend-item"><span class="hill-legend-dot" style="background:#f38ba8"></span>Blocked</span>
      </div>
    </div>

    <div class="mc-cards-grid">
      ${active.map(m => renderMissionCard(m)).join('')}
      ${planned.map(m => renderMissionCard(m)).join('')}
      ${completed.map(m => renderMissionCard(m)).join('')}
    </div>
  `;

  // Animate hill dots on mount
  requestAnimationFrame(() => {
    detail.querySelectorAll('.hill-dot').forEach((dot, i) => {
      dot.style.opacity = '0';
      dot.style.transform = 'scale(0)';
      setTimeout(() => {
        dot.style.transition = 'opacity 0.4s ease, transform 0.4s cubic-bezier(0.34,1.56,0.64,1)';
        dot.style.opacity = '1';
        dot.style.transform = 'scale(1)';
      }, i * 80);
    });
    // Animate progress rings
    detail.querySelectorAll('.mc-card-ring-fill').forEach(ring => {
      const target = ring.getAttribute('data-target-offset');
      if (target) {
        ring.style.strokeDashoffset = ring.getAttribute('data-full-circ');
        setTimeout(() => {
          ring.style.transition = 'stroke-dashoffset 0.8s ease';
          ring.style.strokeDashoffset = target;
        }, 200);
      }
    });
  });
}

function hillPosition(progress) {
  // Map 0-100% to x: 30-570 on the SVG
  const x = 30 + (progress / 100) * 540;
  // Hill curve: y = 180 at edges, 40 at peak (x=300)
  // Using the same bezier logic: parabola approximation
  const t = (x - 0) / 600;
  // Approximate the hill shape
  const y = 180 - 140 * Math.sin(t * Math.PI);
  return { x, y: y + 2 }; // slight offset to sit on curve
}

function hillDotColor(m) {
  if (m.status === 'completed') return '#94e2d5';
  if (m.status === 'planned') return '#89b4fa';
  if (m.blocking_items > 0) return '#f38ba8';
  return '#a6e3a1';
}

function hillDotSize(m) {
  // Size by importance: more tasks = bigger, blocking = bigger
  if (m.status === 'completed') return 6;
  if (m.blocking_items > 0) return 9;
  if (m.tasks_total >= 15) return 8;
  return 7;
}

function renderMissionCard(m) {
  const progressColor = m.status === 'completed' ? 'var(--teal)' : m.progress >= 50 ? 'var(--green)' : 'var(--yellow)';
  const statusMap = { active:'Active', planned:'Planning', completed:'Complete' };
  const statusClass = m.status === 'completed' ? 'mc-status-complete' : m.status === 'planned' ? 'mc-status-planning' : m.blocking_items > 0 ? 'mc-status-blocked' : 'mc-status-active';
  const statusLabel = m.blocking_items > 0 && m.status === 'active' ? 'Blocked' : (statusMap[m.status] || 'Active');
  const blocking = mcBlocking.filter(b => b.mission === m.id);

  const ringSize = 48;
  const r = (ringSize - 6) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (m.progress / 100) * circ;

  return `
    <div class="mc-mission-card" onclick="selectMCMission('${m.id}')">
      <div class="mc-card-top-row">
        <div class="mc-card-title-area">
          <span class="mc-card-icon">${m.icon}</span>
          <div>
            <div class="mc-card-title">${m.title}</div>
            <div class="mc-card-desc">${m.desc}</div>
          </div>
        </div>
        <div class="mc-card-ring-wrap">
          <svg width="${ringSize}" height="${ringSize}" viewBox="0 0 ${ringSize} ${ringSize}">
            <circle cx="${ringSize/2}" cy="${ringSize/2}" r="${r}" fill="none" stroke="var(--bg-raised)" stroke-width="4"/>
            <circle cx="${ringSize/2}" cy="${ringSize/2}" r="${r}" fill="none" stroke="${progressColor}" stroke-width="4"
              stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
              stroke-linecap="round" transform="rotate(-90 ${ringSize/2} ${ringSize/2})"
              class="mc-card-ring-fill" data-target-offset="${offset}" data-full-circ="${circ}"/>
          </svg>
          <span class="mc-card-ring-pct">${m.progress}%</span>
        </div>
      </div>
      <div class="mc-card-stats-row">
        <span class="mc-card-stat"><span class="mc-card-stat-val">${m.tasks_done}/${m.tasks_total}</span> tasks</span>
        <span class="mc-card-stat"><span class="mc-card-stat-val">${m.agents_active}</span> agents</span>
        <span class="mc-card-stat"><span class="mc-card-stat-val">${m.days_active}d</span> active</span>
        <span class="mc-card-stat"><span class="mc-card-stat-val">${m.velocity.toFixed(1)}</span>/day</span>
      </div>
      <div class="mc-card-bottom-row">
        <span class="mc-card-status ${statusClass}">${statusLabel}</span>
        ${blocking.length > 0 ? blocking.map(b => `<span class="mc-card-blocking-pill">⚠ ${b.title}</span>`).join('') : ''}
      </div>
      ${blocking.length > 0 ? `<div class="mc-card-needs-input">⚡ Needs your input · ${blocking.length} item${blocking.length>1?'s':''}</div>` : ''}
    </div>
  `;
}

function startMissionsRefresh() {
  if (_missionsRefreshTimer) return;
  _missionsRefreshTimer = setInterval(async () => {
    if (!shouldPoll()) return;
    if (currentPage !== 'missions') { stopMissionsRefresh(); return; }
    const updated = await fetchMissionsFromBridge();
    if (updated) {
      renderMCSidebar();
      if (mcSelectedMission) {
        renderMCDetail(mcSelectedMission);
      } else {
        renderMCHillAndCards();
      }
    }
  }, 30000);
}

function stopMissionsRefresh() {
  if (_missionsRefreshTimer) { clearInterval(_missionsRefreshTimer); _missionsRefreshTimer = null; }
}

function renderMCSidebar() {
  const sidebar = $('mc-sidebar');
  if (!sidebar) return;

  const grouped = { active: [], planned: [], completed: [] };
  mcMissions.forEach(m => {
    const s = m.status === 'completed' ? 'completed' : m.status === 'planned' ? 'planned' : 'active';
    grouped[s].push(m);
  });

  const renderGroup = (label, missions, status, expanded) => {
    if (missions.length === 0) return '';
    return `
      <div class="mc-sb-group">
        <div class="mc-sb-group-header" onclick="toggleMCGroup(this)">
          <span class="mc-sb-chevron${expanded ? ' expanded' : ''}">›</span>
          <span class="mc-sb-group-label">${label}</span>
          <span class="mc-sb-group-count">${missions.length}</span>
        </div>
        <div class="mc-sb-group-items${expanded ? '' : ' collapsed'}">
          ${missions.map(m => {
            const isActive = mcSelectedMission === m.id;
            const progressColor = m.progress >= 100 ? 'var(--accent)' : m.progress >= 50 ? 'var(--green)' : 'var(--yellow)';
            const pulsingDot = status === 'active' && m.agents_active > 0
              ? '<span class="mc-pulse-dot"></span>' : '';
            return `
              <div class="mc-sb-item${isActive ? ' active' : ''}" onclick="selectMCMission('${m.id}')">
                <div class="mc-sb-item-top">
                  ${pulsingDot}
                  <span class="mc-sb-item-icon">${m.icon}</span>
                  <span class="mc-sb-item-name">${m.title}</span>
                </div>
                <div class="mc-sb-item-bar">
                  <div class="mc-sb-item-bar-fill" style="width:${m.progress}%;background:${progressColor}"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  };

  sidebar.innerHTML = `
    ${renderGroup('ACTIVE', grouped.active, 'active', true)}
    ${renderGroup('PLANNED', grouped.planned, 'planned', false)}
    ${renderGroup('COMPLETED', grouped.completed, 'completed', false)}
    <button class="mc-new-mission-btn" onclick="showNewMissionModal()">＋ New Mission</button>
  `;
}

function toggleMCGroup(header) {
  const chevron = header.querySelector('.mc-sb-chevron');
  const items = header.nextElementSibling;
  chevron.classList.toggle('expanded');
  items.classList.toggle('collapsed');
}

function selectMCMission(id) {
  mcSelectedMission = id;
  mcActiveTab = 'overview';
  renderMCSidebar();
  renderMCDetail(id);
}

function renderMiniProgressRing(pct, color, size) {
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return `
    <svg class="mc-mini-ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--bg-raised)" stroke-width="3"/>
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="3"
        stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
        stroke-linecap="round" transform="rotate(-90 ${size/2} ${size/2})"
        style="transition: stroke-dashoffset 0.5s ease"/>
    </svg>
  `;
}

function renderMCDetail(missionId) {
  const detail = $('mc-detail');
  if (!detail) return;
  const m = mcMissions.find(x => x.id === missionId);
  if (!m) { renderMCHillAndCards(); return; }

  const statusClass = m.status === 'completed' ? 'mc-badge-completed' : m.status === 'planned' ? 'mc-badge-planned' : m.blocking_items > 0 ? 'mc-badge-blocked' : 'mc-badge-active';
  const statusLabel = m.status === 'completed' ? '✓ Completed' : m.status === 'planned' ? 'Planned' : m.blocking_items > 0 ? '⚠ Blocked' : 'Active';
  const linkedAgents = AGENTS.filter(a => a.status === 'active').slice(0, m.agents_active);

  detail.innerHTML = `
    <div class="mc-detail-header">
      <div class="mc-detail-title-row">
        <button class="mc-back-btn" onclick="mcSelectedMission=null;renderMCSidebar();renderMCHillAndCards()">←</button>
        <span class="mc-detail-icon">${m.icon}</span>
        <h2 class="mc-detail-title">${m.title}</h2>
        <span class="mc-badge ${statusClass}">${statusLabel}</span>
      </div>
      <div class="mc-detail-meta-row">
        ${m.goal ? `<span class="mc-detail-meta-chip">🎯 ${m.goal}</span>` : ''}
        ${m.target_date ? `<span class="mc-detail-meta-chip">📅 ${m.target_date}</span>` : ''}
        ${linkedAgents.length > 0 ? `<span class="mc-detail-meta-chip">${linkedAgents.map(a => a.emoji).join('')} ${linkedAgents.length} agent${linkedAgents.length>1?'s':''}</span>` : ''}
      </div>
      ${m.success_criteria ? `<div class="mc-detail-criteria-inline">✅ <strong>Success:</strong> ${m.success_criteria}</div>` : ''}
    </div>

    <div class="mc-tabs">
      ${['overview','plans','activity','decisions'].map(tab => `
        <button class="mc-tab${mcActiveTab === tab ? ' active' : ''}" onclick="mcSwitchTab('${tab}','${missionId}')">${tab.charAt(0).toUpperCase()+tab.slice(1)}</button>
      `).join('')}
    </div>

    <div class="mc-tab-content" id="mc-tab-content"></div>
  `;

  mcRenderTab(mcActiveTab, missionId);
}

function mcSwitchTab(tab, missionId) {
  mcActiveTab = tab;
  $$('.mc-tab').forEach(t => t.classList.toggle('active', t.textContent.toLowerCase() === tab));
  mcRenderTab(tab, missionId);
}

function mcRenderTab(tab, missionId) {
  const el = $('mc-tab-content');
  if (!el) return;
  switch(tab) {
    case 'overview':  mcRenderOverview(el, missionId); break;
    case 'plans':     mcRenderPlans(el, missionId); break;
    case 'activity':  mcRenderActivity(el, missionId); break;
    case 'decisions': mcRenderDecisions(el, missionId); break;
  }
}

function mcRenderOverview(el, missionId) {
  const m = mcMissions.find(x => x.id === missionId);
  if (!m) return;

  const blocking = mcBlocking.filter(b => b.mission === missionId);
  const progressColor = m.progress >= 100 ? 'var(--accent)' : m.progress >= 50 ? 'var(--green)' : 'var(--yellow)';
  const estCompletion = m.velocity > 0 ? Math.ceil((m.tasks_total - m.tasks_done) / m.velocity) : null;

  el.innerHTML = `
    <div class="mc-ov-top">
      <div class="mc-progress-ring-wrap">
        ${renderProgressRing(m.progress, progressColor, 120)}
        <div class="mc-ring-label">${m.progress}%</div>
      </div>
      <div class="mc-ov-metrics">
        <div class="mc-metric">
          <span class="mc-metric-val">${m.tasks_done}/${m.tasks_total}</span>
          <span class="mc-metric-label">Tasks</span>
        </div>
        <div class="mc-metric">
          <span class="mc-metric-val">${m.agents_active}</span>
          <span class="mc-metric-label">Agents</span>
        </div>
        <div class="mc-metric">
          <span class="mc-metric-val">${m.days_active}d</span>
          <span class="mc-metric-label">Active</span>
        </div>
        <div class="mc-metric">
          <span class="mc-metric-val">${m.velocity.toFixed(1)}/d</span>
          <span class="mc-metric-label">Velocity</span>
        </div>
        ${estCompletion !== null ? `
        <div class="mc-metric">
          <span class="mc-metric-val">~${estCompletion}d</span>
          <span class="mc-metric-label">Est. Left</span>
        </div>` : ''}
      </div>
    </div>

    ${blocking.length > 0 ? `
    <div class="mc-needs-input">
      <div class="mc-needs-input-header">⚡ Needs Your Input</div>
      ${blocking.map(b => `
        <div class="mc-blocking-item">
          <span class="mc-blocking-type">${b.type === 'proposal' ? '📋' : b.type === 'review' ? '👁️' : '❓'}</span>
          <div class="mc-blocking-body">
            <div class="mc-blocking-title">${b.title}</div>
            <div class="mc-blocking-source">From: ${b.source}</div>
          </div>
        </div>
      `).join('')}
    </div>
    ` : ''}

    <div class="mc-milestones-section">
      <div class="mc-section-label">Milestones</div>
      <div class="mc-milestone-track">
        <div class="mc-milestone-bar">
          <div class="mc-milestone-bar-fill" style="width:${m.progress}%;background:${progressColor}"></div>
        </div>
        <div class="mc-milestone-markers">
          ${m.milestones.map((ms, i) => {
            const pos = ((i + 1) / m.milestones.length) * 100;
            const done = ms.includes('✓');
            return `<div class="mc-milestone-marker${done ? ' done' : ''}" style="left:${pos}%">
              <div class="mc-milestone-dot"></div>
              <div class="mc-milestone-label">${ms.replace(' ✓','')}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>

    <div class="mc-linked-section">
      <div class="mc-section-label">Linked Vault Notes</div>
      <div class="mc-linked-items">
        ${VAULT_NOTES.filter(v => v.tags.some(t => m.title.toLowerCase().includes(t) || m.desc.toLowerCase().includes(t))).slice(0,3).map(v => `
          <div class="mc-linked-item">
            <span class="mc-linked-icon">📝</span>
            <span class="mc-linked-title">${v.title}</span>
            <span class="mc-linked-conf">${v.confidence}%</span>
          </div>
        `).join('') || '<div class="mc-empty" style="padding:8px">No linked notes found</div>'}
      </div>
    </div>
  `;
}

function renderProgressRing(pct, color, size) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return `
    <svg class="mc-progress-ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="var(--bg-raised)" stroke-width="6"/>
      <circle cx="${size/2}" cy="${size/2}" r="${r}" fill="none" stroke="${color}" stroke-width="6"
        stroke-dasharray="${circ}" stroke-dashoffset="${offset}"
        stroke-linecap="round" transform="rotate(-90 ${size/2} ${size/2})"
        style="transition: stroke-dashoffset 0.8s ease"/>
    </svg>
  `;
}

async function mcRenderPlans(el, missionId) {
  const plans = mcPlans.filter(p => p.mission === missionId);
  
  // Also try to load real dispatch tasks related to this mission
  let relatedTasks = [];
  const detail = await mcLoadMissionDetail(missionId);
  if (detail && detail.related_tasks) {
    relatedTasks = detail.related_tasks;
  }

  el.innerHTML = `
    <div class="mc-plans-list">
      ${plans.length === 0 && relatedTasks.length === 0 ? '<div class="mc-empty">No plans or tasks linked to this mission yet.</div>' : ''}
      ${plans.map(p => {
        const total = p.backlog + p.active + p.done;
        const donePct = total > 0 ? Math.round((p.done / total) * 100) : 0;
        return `
          <div class="mc-plan-card" onclick="nav('plans');setTimeout(()=>typeof selectPlan==='function'&&selectPlan('${p.id}'),200)">
            <div class="mc-plan-header">
              <span class="mc-plan-name">${p.name}</span>
              <span class="mc-plan-agents">${p.agents.join(' ')}</span>
            </div>
            <div class="mc-plan-summary">${p.backlog} backlog · ${p.active} active · ${p.done} done</div>
            <div class="mc-plan-bar">
              <div class="mc-plan-bar-fill" style="width:${donePct}%"></div>
            </div>
          </div>
        `;
      }).join('')}
      ${relatedTasks.length > 0 ? `
        <div class="mc-section-label" style="margin-top:12px">Related Dispatch Tasks</div>
        ${relatedTasks.map(t => {
          const statusColors = { queued: '#6c7086', active: '#f9e2af', done: '#a6e3a1', completed: '#a6e3a1', failed: '#f38ba8' };
          const statusColor = statusColors[t.status] || '#6c7086';
          return `
            <div class="mc-plan-card" style="cursor:default" data-ctx-type="task" data-ctx-id="${t.id || ''}">
              <div class="mc-plan-header">
                <span class="mc-plan-name">${t.title || t.task || 'Untitled'}</span>
                <span style="font-size:11px;padding:2px 8px;border-radius:4px;background:${statusColor}20;color:${statusColor}">${t.status || 'queued'}</span>
              </div>
              <div class="mc-plan-summary">${t.agent || 'unassigned'} · ${t.priority || 'P3'} · ${t.source || ''}</div>
            </div>
          `;
        }).join('')}
      ` : ''}
      <button class="mc-create-plan-btn" onclick="toast('Plan creation coming soon','info')">＋ Create Plan</button>
    </div>
  `;
}

let mcActivityFilter = 'all';

function mcRenderActivity(el, missionId) {
  const events = mcFeed.filter(e => e.mission === missionId);
  const filters = ['all','tasks','agents','errors'];

  const filtered = mcActivityFilter === 'all' ? events :
    events.filter(e => {
      if (mcActivityFilter === 'tasks') return e.type === 'task';
      if (mcActivityFilter === 'agents') return e.type === 'agent';
      if (mcActivityFilter === 'errors') return e.type === 'error';
      return true;
    });

  el.innerHTML = `
    <div class="mc-activity-filters">
      ${filters.map(f => `
        <button class="mc-filter-chip${mcActivityFilter === f ? ' active' : ''}"
          onclick="mcActivityFilter='${f}';mcRenderActivity($('mc-tab-content'),'${missionId}')">${f.charAt(0).toUpperCase()+f.slice(1)}</button>
      `).join('')}
    </div>
    <div class="mc-activity-feed">
      ${filtered.length === 0 ? '<div class="mc-empty">No activity yet.</div>' : ''}
      ${filtered.map(e => {
        const time = new Date(e.ts);
        const timeStr = time.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
        const dateStr = time.toLocaleDateString([], {month:'short', day:'numeric'});
        const typeClass = e.type === 'error' ? 'mc-ev-error' : e.type === 'agent' ? 'mc-ev-agent' : '';
        return `
          <div class="mc-activity-event ${typeClass}">
            <span class="mc-ev-agent">${e.agent}</span>
            <span class="mc-ev-text">${e.text}</span>
            <span class="mc-ev-time">${dateStr} ${timeStr}</span>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function mcRenderDecisions(el, missionId) {
  const decisions = mcDecisions.filter(d => d.mission === missionId);

  el.innerHTML = `
    <div class="mc-decisions-timeline">
      ${decisions.length === 0 ? '<div class="mc-empty">No decisions recorded yet.</div>' : ''}
      ${decisions.map(d => {
        const typeIcon = d.type === 'approved' ? '✅' : d.type === 'rejected' ? '❌' : '↪️';
        const typeClass = d.type === 'rejected' ? 'mc-dec-rejected' : d.type === 'direction' ? 'mc-dec-direction' : '';
        return `
          <div class="mc-decision-card ${typeClass}">
            <div class="mc-dec-line"></div>
            <div class="mc-dec-dot"></div>
            <div class="mc-dec-content">
              <div class="mc-dec-header">
                <span class="mc-dec-icon">${typeIcon}</span>
                <span class="mc-dec-date">${d.date}</span>
                <span class="mc-dec-who">${d.who}</span>
              </div>
              <div class="mc-dec-text">${d.decision}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════
// NEW MISSION MODAL
// ═══════════════════════════════════════════════════════════

function showNewMissionModal() {
  const m = document.createElement('div');
  m.id = 'new-mission-modal';
  m.className = 'modal-overlay';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;';
  m.innerHTML = `
    <div class="modal-panel" style="background:var(--bg-surface,#252536);border:1px solid var(--border);border-radius:16px;padding:28px;width:90%;max-width:520px;">
      <h3 style="margin:0 0 20px;color:var(--text);font-size:18px;font-weight:700;">🎯 New Mission</h3>
      <label class="modal-label">Title</label>
      <input id="nm-title" placeholder="e.g. Ship Agent OS v1" class="modal-input" />
      <label class="modal-label">Goal / Description</label>
      <textarea id="nm-desc" placeholder="What does success look like?" rows="3" class="modal-textarea"></textarea>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <div>
          <label class="modal-label">Target Date</label>
          <input id="nm-deadline" type="date" class="modal-input" />
        </div>
        <div>
          <label class="modal-label">Linked Project</label>
          <input id="nm-project" placeholder="(optional)" class="modal-input" />
        </div>
      </div>
      <label class="modal-label">Success Criteria</label>
      <textarea id="nm-criteria" placeholder="Measurable criteria for completion..." rows="2" class="modal-textarea"></textarea>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:8px;">
        <button onclick="document.getElementById('new-mission-modal').remove()" class="modal-btn-cancel">Cancel</button>
        <button onclick="submitNewMission()" class="modal-btn-primary">Create Mission</button>
      </div>
      <div id="nm-status" style="margin-top:8px;font-size:12px;color:var(--text-muted);"></div>
    </div>
  `;
  m.onclick = (e) => { if (e.target === m) m.remove(); };
  document.body.appendChild(m);
  setTimeout(() => document.getElementById('nm-title')?.focus(), 100);
}

async function submitNewMission() {
  const title = document.getElementById('nm-title').value.trim();
  const desc = document.getElementById('nm-desc').value.trim();
  const deadline = document.getElementById('nm-deadline').value;
  const project = document.getElementById('nm-project')?.value.trim() || '';
  const criteria = document.getElementById('nm-criteria')?.value.trim() || '';
  const status = document.getElementById('nm-status');
  
  if (!title) { status.textContent = '❌ Title required'; return; }
  status.textContent = '⏳ Creating...';
  
  try {
    if (typeof Bridge !== 'undefined' && Bridge.liveMode) {
      await Bridge.apiFetch('/api/missions', {
        method: 'POST',
        body: JSON.stringify({ title, description: desc || title, deadline: deadline || null, project, success_criteria: criteria }),
      });
    } else {
      // Offline fallback: add to local data + localStorage
      const id = 'local-' + Date.now();
      const newMission = {
        id, icon: '🎯', title, desc: desc || title, goal: project || '', status: 'planned',
        progress: 0, tasks_done: 0, tasks_total: 0, agents_active: 0,
        days_active: 0, velocity: 0, milestones: [], blocking_items: 0,
        target_date: deadline || '', success_criteria: criteria || desc || '',
      };
      mcMissions.unshift(newMission);
      try { const saved = JSON.parse(localStorage.getItem('agentOS_missions') || '[]'); saved.unshift(newMission); localStorage.setItem('agentOS_missions', JSON.stringify(saved)); } catch {}
    }
    status.textContent = '✅ Created!';
    setTimeout(() => {
      document.getElementById('new-mission-modal')?.remove();
      renderMissions();
    }, 500);
  } catch (e) {
    status.textContent = '❌ ' + e.message;
  }
}

// ═══════════════════════════════════════════════════════════
// MISSION DETAIL — Plans tab with real dispatch tasks
// ═══════════════════════════════════════════════════════════

async function mcLoadMissionDetail(missionId) {
  if (typeof Bridge === 'undefined' || !Bridge.liveMode) return null;
  try {
    return await Bridge.apiFetch(`/api/missions/${encodeURIComponent(missionId)}`);
  } catch { return null; }
}

// ═══════════════════════════════════════════════════════════
// EXPLORE VIEW
// ═══════════════════════════════════════════════════════════

function renderExplore() {
  const el = $('explore-content');
  if (!el) return;
  
  const trending = [
    { icon:'🔬', title:'Competitive Analysis', type:'Research', desc:'60+ product survey across IDE agents, frameworks' },
    { icon:'🏗️', title:'Agent OS Frontend', type:'Architecture', desc:'North star document for the cockpit' },
    { icon:'💰', title:'Wilson Premier Platform', type:'Project', desc:'Multi-agent AI for real estate + hospitality' },
    { icon:'⚡', title:'Dispatch Engine v3', type:'Architecture', desc:'Priority queue, agent capability matrix, load balancer' },
    { icon:'📊', title:'Agent Performance Tracking', type:'Operations', desc:'Fitness scores, outcome tracker, workflow patterns' },
  ];

  const recentSearches = ['rate limiter', 'vault indexing', 'Discord migration', 'token budget'];
  const quickFilters = ['📝 Notes', '💬 Messages', '📋 Tasks', '⚙️ Config', '🤖 Agents', '🔬 Research'];

  el.innerHTML = `
    <div class="explore-search-box">
      <span class="explore-search-icon">🔍</span>
      <input class="explore-search-input" placeholder="Search notes, messages, tasks, agents..." oninput="handleExploreSearch(this.value)">
    </div>

    <div class="explore-section">
      <div class="explore-section-title">Quick Filters</div>
      <div class="explore-chips">
        ${quickFilters.map(f => `<button class="explore-chip" onclick="toast('Filtering: ${f}','info')">${f}</button>`).join('')}
      </div>
    </div>

    <div class="explore-section">
      <div class="explore-section-title">Recent Searches</div>
      <div class="explore-chips">
        ${recentSearches.map(s => `<button class="explore-chip" onclick="toast('Searching: ${s}','info')">🕐 ${s}</button>`).join('')}
      </div>
    </div>

    <div class="explore-section">
      <div class="explore-section-title">Trending Now</div>
      ${trending.map(t => `
        <div class="explore-result" onclick="toast('Opening: ${t.title}','info')">
          <span class="explore-result-icon">${t.icon}</span>
          <div class="explore-result-body">
            <div class="explore-result-title">${t.title}</div>
            <div class="explore-result-desc">${t.desc}</div>
            <div class="explore-result-meta">${t.type} · Updated today</div>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function handleExploreSearch(q) {
  if (!q.trim()) return;
  // Simulate search results
  if (q.length > 2) {
    toast(`🔍 Found ${Math.floor(Math.random()*20+5)} results for "${q}"`, 'info', 1500);
  }
}
