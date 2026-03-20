/* Agent OS v5 — app3.js — Command + Config + Simulation + Init */
'use strict';

// ═══════════════════════════════════════════════════════════
// COMMAND PAGE
// ═══════════════════════════════════════════════════════════

let cmdMode = 'search'; // search | command | agent | system
let cmdSelectedIdx = 0;

function initCommand() {
  const input = $('command-input');
  if (input) { input.value = ''; input.focus(); }
  updateCommandMode('');
  renderCommandResults('');
}

function handleCommandInput(val) {
  updateCommandMode(val);
  renderCommandResults(val);
}

function updateCommandMode(val) {
  const indicator = $('cmd-mode-indicator');
  const prefix = $('cmd-prefix');
  if (val.startsWith('>')) {
    cmdMode = 'command';
    indicator.innerHTML = '<span class="mode-badge command">⚡ Command</span>';
    prefix.textContent = '>';
  } else if (val.startsWith('@')) {
    cmdMode = 'agent';
    indicator.innerHTML = '<span class="mode-badge agent">🤖 Agent</span>';
    prefix.textContent = '@';
  } else if (val.startsWith('/')) {
    cmdMode = 'system';
    indicator.innerHTML = '<span class="mode-badge system">⚙️ System</span>';
    prefix.textContent = '/';
  } else {
    cmdMode = 'search';
    indicator.innerHTML = '<span class="mode-badge search">🔍 Search</span>';
    prefix.textContent = '→';
  }
}

function renderCommandResults(val) {
  const container = $('command-results');
  const preview = $('command-preview');
  if (!container) return;

  let results = [];
  const q = val.toLowerCase().replace(/^[>@/]\s*/, '');

  if (cmdMode === 'search' || !q) {
    // Search across pages, agents, vault notes
    if (q) {
      // Pages
      Object.entries(PAGE_TITLES).forEach(([k, v]) => {
        if (v.toLowerCase().includes(q)) {
          results.push({ icon: '📄', title: v, desc: `Go to ${v} page`, action: () => nav(k) });
        }
      });
      // Agents
      AGENTS.forEach(a => {
        if (a.name.toLowerCase().includes(q) || a.role.toLowerCase().includes(q)) {
          results.push({ icon: a.emoji, title: a.name, desc: `${a.role} · ${a.status}`, action: () => { nav('talk'); setTimeout(() => selectDM(a.id), 200); } });
        }
      });
      // Vault notes
      VAULT_NOTES.forEach(n => {
        if (n.title.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q)) {
          results.push({ icon: '📚', title: n.title, desc: n.summary.substring(0, 80) + '…', action: () => { nav('mind'); setMindMode('cards'); } });
        }
      });
    } else {
      // Default suggestions
      results = [
        { icon: '🏠', title: 'Feed', desc: 'Activity stream', action: () => nav('feed') },
        { icon: '❓', title: 'Proposals', desc: 'Pending decisions', action: () => nav('queue') },
        { icon: '💬', title: 'Talk', desc: 'Agent comms', action: () => nav('talk') },
        { icon: '🧠', title: 'Mind', desc: 'Knowledge vault', action: () => nav('mind') },
        { icon: '⚡', title: 'Pulse', desc: 'System health', action: () => nav('pulse') },
      ];
    }
  } else if (cmdMode === 'command') {
    const commands = [
      { icon: '🔄', title: 'restart gateway', desc: 'Restart the gateway service' },
      { icon: '📚', title: 'reindex vault', desc: 'Force vault reindexing' },
      { icon: '🗑️', title: 'clear queue', desc: 'Clear all pending questions' },
      { icon: '🩺', title: 'health check', desc: 'Run system health check' },
      { icon: '📊', title: 'show stats', desc: 'Show system statistics' },
      { icon: '🤖', title: 'dispatch', desc: 'Dispatch task to agent' },
    ];
    results = commands.filter(c => !q || c.title.includes(q));
    results.forEach(r => r.action = () => { toast(`⚡ ${r.title}`, 'success'); addXP(5); });
  } else if (cmdMode === 'agent') {
    results = AGENTS.filter(a => !q || a.name.toLowerCase().includes(q) || a.id.includes(q))
      .map(a => ({
        icon: a.emoji,
        title: a.name,
        desc: `${a.role} · ${a.status === 'active' ? '🟢 active' : '⚪ idle'}`,
        action: () => { nav('talk'); setTimeout(() => selectDM(a.id), 200); },
      }));
  } else if (cmdMode === 'system') {
    results = SLASH_COMMANDS.filter(c => !q || c.cmd.includes(q) || c.desc.toLowerCase().includes(q))
      .map(c => ({
        icon: '⌨️',
        title: c.cmd,
        desc: c.desc,
        action: () => toast(`${c.cmd} — ${c.usage}`, 'info', 4000),
      }));
  }

  cmdSelectedIdx = 0;
  container.innerHTML = results.slice(0, 10).map((r, i) => `
    <div class="cmd-result-item${i === 0 ? ' selected' : ''}" onclick="cmdResults[${i}]?.action?.()" data-idx="${i}">
      <span class="cmd-result-icon">${r.icon}</span>
      <div>
        <div class="cmd-result-title">${r.title}</div>
        <div class="cmd-result-desc">${r.desc}</div>
      </div>
    </div>
  `).join('');

  // Store results for click handler
  window.cmdResults = results;

  // Preview — hide for default/page results, show for deep content
  if (results.length > 0 && q && results[0]) {
    preview.style.display = '';
    preview.innerHTML = `<div style="font-weight:600;margin-bottom:6px">${results[0].icon} ${results[0].title}</div><div style="color:var(--text-dim)">${results[0].desc}</div>`;
  } else {
    preview.style.display = 'none';
    preview.innerHTML = '';
  }
}

function handleCommandKey(e) {
  const items = $$('.cmd-result-item');
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    cmdSelectedIdx = Math.min(cmdSelectedIdx + 1, items.length - 1);
    items.forEach((it, i) => it.classList.toggle('selected', i === cmdSelectedIdx));
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    cmdSelectedIdx = Math.max(cmdSelectedIdx - 1, 0);
    items.forEach((it, i) => it.classList.toggle('selected', i === cmdSelectedIdx));
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (window.cmdResults && window.cmdResults[cmdSelectedIdx]?.action) {
      window.cmdResults[cmdSelectedIdx].action();
    }
  }
}

// ═══════════════════════════════════════════════════════════
// COMMAND PALETTE (⌘K overlay)
// ═══════════════════════════════════════════════════════════

let paletteOpen = false;
let paletteSelectedIdx = 0;

function openCommandPalette() {
  paletteOpen = true;
  $('cmd-palette-overlay').classList.remove('hidden');
  const input = $('palette-input');
  input.value = '';
  input.focus();
  renderPaletteResults('');
}

function closeCommandPalette() {
  paletteOpen = false;
  $('cmd-palette-overlay').classList.add('hidden');
}

function closeCmdPaletteIfOutside(e) {
  if (e.target === $('cmd-palette-overlay')) closeCommandPalette();
}

function handlePaletteInput(val) {
  // Update prefix icon
  const prefix = $('palette-prefix');
  if (val.startsWith('>')) prefix.textContent = '⚡';
  else if (val.startsWith('@')) prefix.textContent = '🤖';
  else if (val.startsWith('/')) prefix.textContent = '⌨️';
  else prefix.textContent = '🔍';

  renderPaletteResults(val);
}

function renderPaletteResults(val) {
  const container = $('palette-results');
  let results = [];
  const q = val.toLowerCase().replace(/^[>@/]\s*/, '');

  if (val.startsWith('>')) {
    // Commands
    const cmds = [
      { icon: '🏠', title: 'Go to Feed', sc: '1', action: () => { nav('feed'); closeCommandPalette(); } },
      { icon: '❓', title: 'Go to Proposals', sc: '2', action: () => { nav('queue'); closeCommandPalette(); } },
      { icon: '💬', title: 'Go to Talk', sc: '3', action: () => { nav('talk'); closeCommandPalette(); } },
      { icon: '🧠', title: 'Go to Mind', sc: '4', action: () => { nav('mind'); closeCommandPalette(); } },
      { icon: '⚡', title: 'Go to Pulse', sc: '5', action: () => { nav('pulse'); closeCommandPalette(); } },
      { icon: '🔄', title: 'Restart Gateway', action: () => { quickAction('restart-gateway'); closeCommandPalette(); } },
      { icon: '📚', title: 'Reindex Vault', action: () => { quickAction('reindex'); closeCommandPalette(); } },
      { icon: '🩺', title: 'Health Check', action: () => { quickAction('health-check'); closeCommandPalette(); } },
    ];
    results = cmds.filter(c => !q || c.title.toLowerCase().includes(q));
  } else if (val.startsWith('@')) {
    results = AGENTS.filter(a => !q || a.name.toLowerCase().includes(q))
      .map(a => ({
        icon: a.emoji,
        title: `Talk to ${a.name}`,
        desc: `${a.role} · ${a.status}`,
        action: () => { nav('talk'); setTimeout(() => selectDM(a.id), 200); closeCommandPalette(); },
      }));
  } else if (val.startsWith('/')) {
    results = SLASH_COMMANDS.filter(c => !q || c.cmd.includes(q))
      .map(c => ({
        icon: '⌨️', title: c.cmd, desc: c.desc,
        action: () => { toast(`${c.usage}`, 'info', 4000); closeCommandPalette(); },
      }));
  } else {
    // Default: search everything
    // Pages
    Object.entries(PAGE_TITLES).forEach(([k, v]) => {
      if (!q || v.toLowerCase().includes(q)) {
        results.push({ icon: '📄', title: v, desc: `Navigate to ${v}`, sc: '', action: () => { nav(k); closeCommandPalette(); } });
      }
    });
    // Agents
    if (q) {
      AGENTS.forEach(a => {
        if (a.name.toLowerCase().includes(q) || a.id.includes(q)) {
          results.push({ icon: a.emoji, title: a.name, desc: a.role, action: () => { nav('talk'); setTimeout(() => selectDM(a.id), 200); closeCommandPalette(); } });
        }
      });
      // Vault notes
      VAULT_NOTES.forEach(n => {
        if (n.title.toLowerCase().includes(q)) {
          results.push({ icon: '📚', title: n.title, desc: n.type, action: () => { nav('mind'); setMindMode('cards'); closeCommandPalette(); } });
        }
      });
    }
  }

  paletteSelectedIdx = 0;
  window.paletteResults = results;

  container.innerHTML = results.slice(0, 12).map((r, i) => `
    <div class="palette-item${i === 0 ? ' selected' : ''}" onclick="window.paletteResults[${i}]?.action?.()" data-idx="${i}">
      <span class="palette-item-icon">${r.icon}</span>
      <div class="palette-item-text">
        <div class="palette-item-title">${r.title}</div>
        ${r.desc ? `<div class="palette-item-desc">${r.desc}</div>` : ''}
      </div>
      ${r.sc ? `<span class="palette-item-shortcut">${r.sc}</span>` : ''}
    </div>
  `).join('');
}

function handlePaletteKey(e) {
  const items = $$('.palette-item');
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    paletteSelectedIdx = Math.min(paletteSelectedIdx + 1, items.length - 1);
    items.forEach((it, i) => it.classList.toggle('selected', i === paletteSelectedIdx));
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    paletteSelectedIdx = Math.max(paletteSelectedIdx - 1, 0);
    items.forEach((it, i) => it.classList.toggle('selected', i === paletteSelectedIdx));
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (window.paletteResults && window.paletteResults[paletteSelectedIdx]?.action) {
      window.paletteResults[paletteSelectedIdx].action();
    }
  } else if (e.key === 'Escape') {
    closeCommandPalette();
  }
}

// ⌘K keyboard shortcut
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    if (paletteOpen) closeCommandPalette();
    else openCommandPalette();
  }
  if (e.key === 'Escape' && paletteOpen) closeCommandPalette();
});

// ═══════════════════════════════════════════════════════════
// CONFIG PAGE
// ═══════════════════════════════════════════════════════════

function renderConfig() {
  renderAgentConfig();
  renderConfigCrons();
}

function renderAgentConfig() {
  const container = $('agent-config-cards');
  if (!container) return;
  container.innerHTML = '';

  AGENTS.forEach(agent => {
    const card = document.createElement('div');
    card.className = 'agent-config-card';
    const autonomy = Math.floor(Math.random() * 5) + 4;
    const verbosity = Math.floor(Math.random() * 5) + 3;
    const creativity = Math.floor(Math.random() * 5) + 3;
    const isOn = agent.status === 'active' || Math.random() > 0.3;

    card.innerHTML = `
      <div class="agent-config-header">
        <span style="font-size:20px">${agent.emoji}</span>
        <span class="config-agent-name" style="color:${agent.color}">${agent.name}</span>
        <span style="font-size:11px;color:var(--text-muted)">${agent.role}</span>
        <label class="config-toggle">
          <input type="checkbox" ${isOn ? 'checked' : ''} onchange="toggleAgent('${agent.id}', this.checked)">
          <div class="toggle-track"><div class="toggle-thumb"></div></div>
        </label>
      </div>
      <div class="slider-row">
        <span class="slider-label">Autonomy</span>
        <input type="range" class="slider-input" min="1" max="10" value="${autonomy}" oninput="this.nextElementSibling.textContent=this.value">
        <span class="slider-value">${autonomy}</span>
      </div>
      <div class="slider-row">
        <span class="slider-label">Verbosity</span>
        <input type="range" class="slider-input" min="1" max="10" value="${verbosity}" oninput="this.nextElementSibling.textContent=this.value">
        <span class="slider-value">${verbosity}</span>
      </div>
      <div class="slider-row">
        <span class="slider-label">Creativity</span>
        <input type="range" class="slider-input" min="1" max="10" value="${creativity}" oninput="this.nextElementSibling.textContent=this.value">
        <span class="slider-value">${creativity}</span>
      </div>
    `;
    container.appendChild(card);
  });
}

function toggleAgent(agentId, enabled) {
  const agent = ga(agentId);
  if (agent) {
    agent.status = enabled ? 'idle' : 'offline';
    toast(`${agent.emoji} ${agent.name} ${enabled ? 'enabled' : 'disabled'}`, enabled ? 'success' : 'info');
    updateActiveAgents();
  }
}

// Theme is now fixed to Obsidian Dark — no switcher needed
function setTheme() {}

function renderConfigCrons() {
  const container = $('config-crons');
  if (!container) return;
  container.innerHTML = CRONS.map(c => `
    <div class="cron-row">
      <span class="status-dot ${c.ok ? 'status-ok' : 'status-fail'}"></span>
      <span class="cron-name">${c.n}</span>
      <span class="cron-schedule">${c.s}</span>
      <label class="config-toggle" style="margin-left:auto">
        <input type="checkbox" ${c.ok ? 'checked' : ''} onchange="toggleCron('${c.n}', this.checked)">
        <div class="toggle-track"><div class="toggle-thumb"></div></div>
      </label>
    </div>
  `).join('');
}

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
    ops: 'ops-log', security: 'ops-log', vault: 'agent-feed',
    prompt: 'agent-feed', righthand: 'bridge',
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
    { agent: 'vault', texts: [
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
  ],
};

function startSimulation() {
  // Agent status changes every 8s — with event bus
  simTimers.agents = setInterval(() => {
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
    if (typeof generateQueueCard === 'function') generateQueueCard();
  }, 30000);

  // Stream events every 8s
  simTimers.stream = setInterval(() => {
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
  addNotification('Queue pending', `${QUEUE_QUESTIONS.length} questions need answers`, '❓');

  // Render Dashboard (home page)
  if (typeof renderDashboard === 'function') renderDashboard();
  else renderFeed();

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
// MISSIONS VIEW — Goal Tracking + Dispatch Operations Center
// ═══════════════════════════════════════════════════════════

const PRIORITY_COLORS = { 0:'#f38ba8', 1:'#fab387', 2:'#f9e2af', 3:'#89b4fa', 4:'#6c7086' };
const PRIORITY_LABELS = { 0:'P0', 1:'P1', 2:'P2', 3:'P3', 4:'P4' };
const STEP_STATUS_DOTS = { done:'#a6e3a1', active:'#f9e2af', blocked:'#f38ba8', pending:'#6c7086' };

let _missionsData = { goals:[], archive:[], queue:[], done:[], failed:[], feed:[], schedule:[], stats:{} };
let _missionsExpandedGoals = new Set();
let _missionsShowArchive = false;
let _missionsShowDone = false;
let _missionsShowFailed = false;
let _missionsFeedFilter = 'all';

function _agentEmoji(agentId) {
  const a = AGENTS.find(ag => ag.id === agentId || ag.name?.toLowerCase() === agentId);
  return a ? a.emoji : '🤖';
}
function _agentColor(agentId) {
  const a = AGENTS.find(ag => ag.id === agentId || ag.name?.toLowerCase() === agentId);
  return a ? a.color : '#6c7086';
}

function _relTime(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff/60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
  return Math.floor(diff/86400000) + 'd ago';
}

function _countdown(deadline) {
  if (!deadline) return '';
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff <= 0) return '<span style="color:#f38ba8">overdue</span>';
  if (diff < 86400000) return '<span style="color:#fab387">' + Math.floor(diff/3600000) + 'h left</span>';
  return Math.floor(diff/86400000) + 'd left';
}

async function renderMissions() {
  const el = $('missions-content');
  if (!el) return;

  // Show loading
  el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-muted)">Loading missions data…</div>';

  // Fetch all data in parallel
  if (Bridge.isConfigured()) {
    try {
      const [goals, archive, queue, done, failed, feed, schedule, stats] = await Promise.all([
        Bridge.getMissionsGoals().catch(() => []),
        Bridge.getMissionsGoalsArchive().catch(() => []),
        Bridge.getMissionsQueue().catch(() => []),
        Bridge.getMissionsDone(20).catch(() => []),
        Bridge.getMissionsFailed().catch(() => []),
        Bridge.getMissionsFeed(50).catch(() => []),
        Bridge.getMissionsSchedule().catch(() => []),
        Bridge.getMissionsStats().catch(() => ({})),
      ]);
      _missionsData = { goals, archive, queue, done, failed, feed, schedule, stats };
    } catch (e) {
      console.warn('[missions] Bridge fetch failed:', e.message);
    }
  }

  _renderMissionsUI();
}

function _renderMissionsUI() {
  const el = $('missions-content');
  if (!el) return;

  el.innerHTML = `
    <div class="missions-layout">
      <div class="missions-panel missions-goals-panel">
        <div class="missions-panel-header">
          <span class="missions-panel-icon">🎯</span>
          <span class="missions-panel-title">Goal Tracker</span>
          <span class="missions-panel-count">${_missionsData.goals.length} active</span>
        </div>
        <div id="missions-goals-list" class="missions-panel-body">${_renderGoals()}</div>
      </div>
      <div class="missions-panel missions-ops-panel">
        <div class="missions-panel-header">
          <span class="missions-panel-icon">⚡</span>
          <span class="missions-panel-title">Operations Board</span>
        </div>
        <div class="missions-stats-bar" id="missions-stats-bar">${_renderStatsBar()}</div>
        <div id="missions-ops-list" class="missions-panel-body">${_renderOps()}</div>
      </div>
      <div class="missions-panel missions-feed-panel">
        <div class="missions-panel-header">
          <span class="missions-panel-icon">📡</span>
          <span class="missions-panel-title">Activity Stream</span>
          <span class="missions-panel-count">${_missionsData.feed.length} events</span>
        </div>
        <div class="missions-feed-filters">${_renderFeedFilters()}</div>
        <div id="missions-feed-list" class="missions-panel-body missions-feed-scroll">${_renderFeed()}</div>
      </div>
    </div>
  `;
}

// ── Goal Tracker ──────────────────────────────────────────
function _renderGoals() {
  const { goals, archive } = _missionsData;
  if (!goals.length && !archive.length) {
    return `<div class="missions-empty">
      <div style="font-size:32px;margin-bottom:8px">🎯</div>
      <div style="font-weight:600">No active goals</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Goals are structured objects in ~/dispatch/goals/ with decomposed steps auto-dispatched to agents.</div>
    </div>`;
  }

  let html = '';
  for (const g of goals) {
    const steps = g.steps || [];
    const doneSteps = steps.filter(s => s.status === 'done').length;
    const pct = steps.length ? Math.round((doneSteps / steps.length) * 100) : 0;
    const expanded = _missionsExpandedGoals.has(g.id);
    const pctColor = pct >= 100 ? '#a6e3a1' : pct >= 50 ? '#f9e2af' : '#fab387';

    html += `
      <div class="missions-goal-card" onclick="_toggleGoal('${g.id}')">
        <div class="missions-goal-top">
          <div class="missions-goal-desc">${_esc(g.description || g.id)}</div>
          <div class="missions-goal-meta">
            ${g.deadline ? `<span class="missions-deadline">${_countdown(g.deadline)}</span>` : ''}
            <span class="missions-pct" style="color:${pctColor}">${pct}%</span>
          </div>
        </div>
        <div class="missions-progress-bar"><div class="missions-progress-fill" style="width:${pct}%;background:${pctColor}"></div></div>
        ${expanded ? `<div class="missions-steps">${steps.map(s => `
          <div class="missions-step">
            <span class="missions-step-dot" style="background:${STEP_STATUS_DOTS[s.status] || '#6c7086'}"></span>
            <span class="missions-step-agent">${_agentEmoji(s.agent)}</span>
            <span class="missions-step-desc">${_esc(s.description)}</span>
            <span class="missions-step-status">${s.status}</span>
          </div>
        `).join('')}</div>` : `<div class="missions-expand-hint">${steps.length} steps — click to expand</div>`}
      </div>
    `;
  }

  if (archive.length) {
    html += `
      <div class="missions-archive-toggle" onclick="_toggleArchive()">
        <span>${_missionsShowArchive ? '▼' : '▶'} Archived Goals (${archive.length})</span>
      </div>
    `;
    if (_missionsShowArchive) {
      for (const g of archive) {
        const steps = g.steps || [];
        const doneSteps = steps.filter(s => s.status === 'done').length;
        const pct = steps.length ? Math.round((doneSteps / steps.length) * 100) : 0;
        html += `
          <div class="missions-goal-card missions-archived">
            <div class="missions-goal-top">
              <div class="missions-goal-desc" style="opacity:0.7">${_esc(g.description || g.id)}</div>
              <span class="missions-pct" style="color:var(--text-muted)">${pct}%</span>
            </div>
            <div class="missions-progress-bar"><div class="missions-progress-fill" style="width:${pct}%;background:var(--text-muted)"></div></div>
          </div>
        `;
      }
    }
  }

  return html;
}

function _toggleGoal(id) {
  if (_missionsExpandedGoals.has(id)) _missionsExpandedGoals.delete(id);
  else _missionsExpandedGoals.add(id);
  const el = $('missions-goals-list');
  if (el) el.innerHTML = _renderGoals();
}

function _toggleArchive() {
  _missionsShowArchive = !_missionsShowArchive;
  const el = $('missions-goals-list');
  if (el) el.innerHTML = _renderGoals();
}

// ── Stats Bar ─────────────────────────────────────────────
function _renderStatsBar() {
  const s = _missionsData.stats;
  return `
    <div class="missions-stat"><span class="missions-stat-val">${s.queueDepth ?? '—'}</span><span class="missions-stat-lbl">Queue</span></div>
    <div class="missions-stat"><span class="missions-stat-val">${s.doneToday ?? '—'}</span><span class="missions-stat-lbl">Done Today</span></div>
    <div class="missions-stat"><span class="missions-stat-val" style="color:${(s.failedToday||0)>0?'#f38ba8':'inherit'}">${s.failedToday ?? '—'}</span><span class="missions-stat-lbl">Failed</span></div>
    <div class="missions-stat"><span class="missions-stat-val">${s.completionRate ?? '—'}%</span><span class="missions-stat-lbl">Rate</span></div>
  `;
}

// ── Operations Board ──────────────────────────────────────
function _renderOps() {
  const { queue, done, failed } = _missionsData;
  let html = '';

  // Queue
  if (queue.length) {
    html += '<div class="missions-section-label">📋 Queue</div>';
    for (const t of queue) {
      const p = t.priority ?? 4;
      const pColor = PRIORITY_COLORS[p] || '#6c7086';
      html += `
        <div class="missions-task-card" style="border-left:3px solid ${pColor}">
          <div class="missions-task-top">
            <span class="missions-priority-badge" style="background:${pColor}">${PRIORITY_LABELS[p]}</span>
            <span class="missions-task-agent">${_agentEmoji(t.agent)}</span>
            <span class="missions-task-desc">${_esc((t.description || t.title || t.id).slice(0, 80))}</span>
          </div>
          <div class="missions-task-meta">${_relTime(t.created || t.created_at)}</div>
        </div>
      `;
    }
  } else {
    html += '<div class="missions-empty-small">Queue empty — all clear ✓</div>';
  }

  // Done (collapsed)
  if (done.length) {
    html += `
      <div class="missions-section-toggle" onclick="_toggleDone()">
        <span>${_missionsShowDone ? '▼' : '▶'} Completed (${done.length})</span>
      </div>
    `;
    if (_missionsShowDone) {
      for (const t of done.slice(0, 10)) {
        html += `
          <div class="missions-task-card missions-task-done">
            <div class="missions-task-top">
              <span class="missions-task-agent">${_agentEmoji(t.agent)}</span>
              <span class="missions-task-desc" style="opacity:0.7">${_esc((t.description || t.title || t.id).slice(0, 80))}</span>
              <span style="color:#a6e3a1;font-size:11px">✓</span>
            </div>
            <div class="missions-task-meta">${_relTime(t.completed_at)}</div>
          </div>
        `;
      }
    }
  }

  // Failed (collapsed)
  if (failed.length) {
    html += `
      <div class="missions-section-toggle" onclick="_toggleFailed()">
        <span style="color:#f38ba8">${_missionsShowFailed ? '▼' : '▶'} Failed (${failed.length})</span>
      </div>
    `;
    if (_missionsShowFailed) {
      for (const t of failed) {
        html += `
          <div class="missions-task-card missions-task-failed" style="border-left:3px solid #f38ba8">
            <div class="missions-task-top">
              <span class="missions-task-agent">${_agentEmoji(t.agent)}</span>
              <span class="missions-task-desc">${_esc((t.description || t.title || t.id).slice(0, 80))}</span>
              <span style="color:#f38ba8;font-size:11px">✗</span>
            </div>
            <div class="missions-task-meta" style="color:#f38ba8">${_esc((t.error || '').slice(0, 60))}</div>
          </div>
        `;
      }
    }
  }

  return html;
}

function _toggleDone() {
  _missionsShowDone = !_missionsShowDone;
  const el = $('missions-ops-list');
  if (el) el.innerHTML = _renderOps();
}

function _toggleFailed() {
  _missionsShowFailed = !_missionsShowFailed;
  const el = $('missions-ops-list');
  if (el) el.innerHTML = _renderOps();
}

// ── Activity Feed ─────────────────────────────────────────
function _renderFeedFilters() {
  const filters = ['all','tasks','errors','pipelines'];
  return filters.map(f => `
    <button class="missions-feed-chip${_missionsFeedFilter===f?' active':''}"
      onclick="_setFeedFilter('${f}')">${f}</button>
  `).join('');
}

function _setFeedFilter(f) {
  _missionsFeedFilter = f;
  const filtersEl = document.querySelector('.missions-feed-filters');
  if (filtersEl) filtersEl.innerHTML = _renderFeedFilters();
  const el = $('missions-feed-list');
  if (el) el.innerHTML = _renderFeed();
}

function _renderFeed() {
  let feed = _missionsData.feed || [];
  if (_missionsFeedFilter === 'tasks') feed = feed.filter(e => e.type?.includes('task'));
  else if (_missionsFeedFilter === 'errors') feed = feed.filter(e => e.type === 'error' || e.urgent);
  else if (_missionsFeedFilter === 'pipelines') feed = feed.filter(e => e.type === 'pipeline' || e.type?.includes('pipeline'));

  if (!feed.length) {
    return '<div class="missions-empty-small">No activity yet</div>';
  }

  return feed.map(e => {
    const isUrgent = e.urgent || e.type === 'error';
    const typeBadgeColor = e.type === 'error' ? '#f38ba8' : e.type === 'pipeline' ? '#89b4fa' : e.type?.includes('task') ? '#a6e3a1' : '#6c7086';
    return `
      <div class="missions-feed-entry${isUrgent ? ' missions-feed-urgent' : ''}">
        <span class="missions-feed-agent">${_agentEmoji(e.agent)}</span>
        <span class="missions-feed-type" style="background:${typeBadgeColor}">${_esc(e.type || 'event')}</span>
        <span class="missions-feed-content">${_esc((e.content || '').slice(0, 120))}</span>
        <span class="missions-feed-time">${_relTime(e.timestamp)}</span>
      </div>
    `;
  }).join('');
}

function _esc(s) { return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

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

