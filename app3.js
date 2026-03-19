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
        { icon: '❓', title: 'Queue', desc: 'Pending decisions', action: () => nav('queue') },
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
      { icon: '❓', title: 'Go to Queue', sc: '2', action: () => { nav('queue'); closeCommandPalette(); } },
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
  }
}

function setTheme(theme) {
  $$('.theme-option').forEach(el => el.classList.remove('active'));
  const selected = [...$$('.theme-option')].find(el => el.querySelector(`.theme-preview.${theme}`));
  if (selected) selected.classList.add('active');

  // Apply theme vars (simplified — only Mocha fully implemented)
  if (theme === 'mocha') {
    document.documentElement.style.setProperty('--bg-base', '#1e1e2e');
    document.documentElement.style.setProperty('--bg-surface', '#252536');
    document.documentElement.style.setProperty('--bg-overlay', '#2a2a3c');
    document.documentElement.style.setProperty('--text', '#cdd6f4');
  } else if (theme === 'latte') {
    document.documentElement.style.setProperty('--bg-base', '#eff1f5');
    document.documentElement.style.setProperty('--bg-surface', '#e6e9ef');
    document.documentElement.style.setProperty('--bg-overlay', '#dce0e8');
    document.documentElement.style.setProperty('--text', '#4c4f69');
  } else if (theme === 'macchiato') {
    document.documentElement.style.setProperty('--bg-base', '#24273a');
    document.documentElement.style.setProperty('--bg-surface', '#2a2d3e');
    document.documentElement.style.setProperty('--bg-overlay', '#303347');
    document.documentElement.style.setProperty('--text', '#cad3f5');
  }
  toast(`🎨 Theme: ${theme}`, 'info');
}

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
// SIMULATION ENGINE
// ═══════════════════════════════════════════════════════════

let simTimers = {};

function startSimulation() {
  // Agent status changes every 8s
  simTimers.agents = setInterval(() => {
    AGENTS.forEach(a => {
      if (Math.random() < 0.15) {
        if (a.status === 'active') {
          a.status = 'idle';
          a.task = '';
        } else if (a.status === 'idle') {
          a.status = 'active';
          const tasks = ['Processing batch...', 'Scanning vault...', 'Running analysis...', 'Reviewing output...', 'Indexing documents...'];
          a.task = tasks[Math.floor(Math.random() * tasks.length)];
        }
      }
    });
    updateActiveAgents();
  }, 8000);

  // Feed update every 15s
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
  }, 15000);

  // Queue cards every 25s
  simTimers.queue = setInterval(() => {
    if (typeof generateQueueCard === 'function') generateQueueCard();
  }, 25000);

  // Stream events every 10s
  simTimers.stream = setInterval(() => {
    const agent = AGENTS[Math.floor(Math.random() * AGENTS.length)];
    const levels = ['debug', 'info', 'info', 'info', 'warn'];
    const level = levels[Math.floor(Math.random() * levels.length)];
    const texts = {
      debug: ['Heartbeat OK', 'Vault sync complete', 'Token ledger updated', 'Memory compactor idle'],
      info:  ['Task checkpoint reached', 'Dispatch acknowledged', 'Agent registered', 'Scan cycle complete'],
      warn:  ['Latency spike detected', 'Approaching token limit', 'Retry queued'],
    };
    const textList = texts[level] || texts.info;

    const event = {
      id: 'ss_' + Date.now(),
      level,
      agent: agent.id,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      text: textList[Math.floor(Math.random() * textList.length)],
    };

    if (typeof addStreamEvent === 'function') addStreamEvent(event);
  }, 10000);
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
    const categories = {};
    DC_CHANNELS.text.forEach(ch => {
      const cat = ch.category || 'general';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(ch);
    });

    let html = '';
    for (const [cat, channels] of Object.entries(categories)) {
      html += `<div style="padding:8px 12px 4px;font-size:11px;font-weight:600;text-transform:uppercase;color:var(--text-muted)">${cat}</div>`;
      channels.forEach(ch => {
        const active = ch.id === currentChannel ? 'background:var(--bg-raised);color:var(--accent)' : '';
        const unread = ch.unread ? `<span style="background:var(--accent);color:var(--bg);border-radius:10px;padding:1px 6px;font-size:10px;margin-left:auto">${ch.unread}</span>` : '';
        html += `<div onclick="switchChannel('${ch.id}');closeMobileDrawer()" 
          style="display:flex;align-items:center;gap:8px;padding:8px 16px;cursor:pointer;border-radius:4px;margin:1px 8px;${active}">
          <span style="color:var(--text-muted);font-size:14px">${ch.type==='voice'?'🔊':ch.type==='forum'?'💬':'#'}</span>
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
  // Set initial XP display
  updateXPDisplay();

  // Initial notifications from existing data
  addNotification('Red Team v5.1', '3 critical issues found', '🔴');
  addNotification('Deploy complete', 'cross-channel-backlinker.sh live', '✅');
  addNotification('Queue pending', `${QUEUE_QUESTIONS.length} questions need answers`, '❓');

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

    const map = { '1': 'feed', '2': 'queue', '3': 'talk', '4': 'mind', '5': 'pulse', '6': 'board', '7': 'stream', '8': 'command', '9': 'config' };
    if (map[e.key]) { nav(map[e.key]); }
  });
});
