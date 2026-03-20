/* Agent OS v5 — app2.js — Pulse + Plans */
'use strict';

// ═══════════════════════════════════════════════════════════
// PULSE / SYSTEM PAGE — Premium Redesign
// ═══════════════════════════════════════════════════════════

let _sysLogPaused = false;
let _sysSortCol = null;
let _sysSortAsc = true;
let _sysCostRange = 'daily';
let _sysExpandedService = null;

// ── Metric history for sparklines ─────────────────────────
function _pushMetricHistory(key, val) {
  const k = 'sys_hist_' + key;
  let arr = [];
  try { arr = JSON.parse(localStorage.getItem(k) || '[]'); } catch {}
  arr.push(val);
  if (arr.length > 10) arr = arr.slice(-10);
  localStorage.setItem(k, JSON.stringify(arr));
  return arr;
}
function _getMetricHistory(key) {
  try { return JSON.parse(localStorage.getItem('sys_hist_' + key) || '[]'); } catch { return []; }
}
function _miniSparkline(data, w, h, color) {
  if (!data.length) return '';
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const step = w / Math.max(data.length - 1, 1);
  const pts = data.map((v, i) => `${i * step},${h - ((v - min) / range) * h}`).join(' ');
  return `<svg width="${w}" height="${h}" style="display:block"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

// ── Uptime formatting ─────────────────────────────────────
function _fmtUptime(seconds) {
  if (!seconds || seconds < 0) return '—';
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ── Main render ───────────────────────────────────────────
function renderPulse() {
  _renderDashboardHeader();
  _renderServiceStatus();
  _renderAgentStatusTable();
  _renderWorkflowPipeline();
  _renderCronSchedule();
  _renderCostTracking();
  _renderSystemLogs();
}

// ── 1. Dashboard Header — 4 stat cards ────────────────────
function _renderDashboardHeader() {
  const el = $('sys-dashboard-header');
  if (!el) return;

  // Simulate system metrics (would come from /api/overview in live mode)
  let cpu = 34, mem = 67, disk = 72, uptime = 345600; // 4 days
  let cpuAvg = { m1: 0.82, m5: 1.14, m15: 0.97 };

  // Try to get live data from Bridge
  if (typeof Bridge !== 'undefined' && Bridge.liveMode) {
    Bridge.getSystemOverview().then(data => {
      if (data.cpu !== undefined) {
        cpu = Math.round(data.cpu);
        cpuAvg = data.loadavg || cpuAvg;
      }
      if (data.memory !== undefined) mem = Math.round(data.memory);
      if (data.disk !== undefined) disk = Math.round(data.disk);
      if (data.uptime !== undefined) uptime = data.uptime;
      _pushMetricHistory('cpu', cpu);
      _pushMetricHistory('mem', mem);
      _pushMetricHistory('disk', disk);
      _updateDashCards(cpu, mem, disk, uptime, cpuAvg);
    }).catch(() => {
      _pushMetricHistory('cpu', cpu);
      _pushMetricHistory('mem', mem);
      _pushMetricHistory('disk', disk);
      _updateDashCards(cpu, mem, disk, uptime, cpuAvg);
    });
  } else {
    _pushMetricHistory('cpu', cpu + Math.round(Math.random() * 6 - 3));
    _pushMetricHistory('mem', mem + Math.round(Math.random() * 4 - 2));
    _pushMetricHistory('disk', disk);
    _updateDashCards(cpu, mem, disk, uptime, cpuAvg);
  }
}

function _updateDashCards(cpu, mem, disk, uptime, cpuAvg) {
  const el = $('sys-dashboard-header');
  if (!el) return;

  const cpuHist = _getMetricHistory('cpu');
  const memHist = _getMetricHistory('mem');
  const diskHist = _getMetricHistory('disk');

  const diskClass = disk > 85 ? 'sys-card-danger' : disk > 75 ? 'sys-card-warn' : '';
  const cpuTrend = cpuHist.length >= 2 ? (cpuHist[cpuHist.length-1] >= cpuHist[cpuHist.length-2] ? '↑' : '↓') : '';
  const memTrend = memHist.length >= 2 ? (memHist[memHist.length-1] >= memHist[memHist.length-2] ? '↑' : '↓') : '';

  el.innerHTML = `
    <div class="sys-stat-card">
      <div class="sys-card-top">
        <span class="sys-card-label">CPU</span>
        <span class="sys-card-trend">${cpuTrend}</span>
      </div>
      <div class="sys-card-value">${cpu}%</div>
      <div class="sys-card-sub">${cpuAvg.m1}/${cpuAvg.m5}/${cpuAvg.m15}</div>
      <div class="sys-card-spark">${_miniSparkline(cpuHist, 80, 24, '#cba6f7')}</div>
    </div>
    <div class="sys-stat-card">
      <div class="sys-card-top">
        <span class="sys-card-label">Memory</span>
        <span class="sys-card-trend">${memTrend}</span>
      </div>
      <div class="sys-card-value">${mem}%</div>
      <div class="sys-card-sub">${((mem / 100) * 14).toFixed(1)} / 14 GB</div>
      <div class="sys-card-spark">${_miniSparkline(memHist, 80, 24, '#89b4fa')}</div>
    </div>
    <div class="sys-stat-card ${diskClass}">
      <div class="sys-card-top">
        <span class="sys-card-label">Disk</span>
        <span class="sys-card-trend">${disk > 85 ? '⚠' : ''}</span>
      </div>
      <div class="sys-card-value">${disk}%</div>
      <div class="sys-card-sub">${((disk / 100) * 200).toFixed(0)} / 200 GB</div>
      <div class="sys-card-spark">${_miniSparkline(diskHist, 80, 24, disk > 85 ? '#f38ba8' : disk > 75 ? '#fab387' : '#a6e3a1')}</div>
    </div>
    <div class="sys-stat-card">
      <div class="sys-card-top">
        <span class="sys-card-label">Uptime</span>
        <span class="sys-card-trend">●</span>
      </div>
      <div class="sys-card-value">${_fmtUptime(uptime)}</div>
      <div class="sys-card-sub">since last restart</div>
      <div class="sys-card-spark" style="opacity:0.5;font-size:11px;color:var(--green)">✓ healthy</div>
    </div>
  `;
}

// ── 2. Service Status Grid ────────────────────────────────
function _renderServiceStatus() {
  const grid = $('sys-services-grid');
  const badge = $('sys-services-count');
  if (!grid) return;

  const services = [
    { id: 'openclaw-gateway',  name: 'OpenClaw Gateway',  status: 'running', uptime: 345600, lastRestart: '2026-03-16 08:30' },
    { id: 'oauth-guardian',    name: 'OAuth Guardian',    status: 'running', uptime: 259200, lastRestart: '2026-03-17 10:15' },
    { id: 'agent-os-bridge',   name: 'Agent OS Bridge',  status: 'running', uptime: 172800, lastRestart: '2026-03-18 12:00' },
    { id: 'bridge-sync',       name: 'Bridge Sync',      status: 'running', uptime: 345600, lastRestart: '2026-03-16 08:30' },
    { id: 'qmd-cron',          name: 'QMD Cron',         status: 'running', uptime: 86400,  lastRestart: '2026-03-19 06:00' },
    { id: 'ontology-sync',     name: 'Ontology Sync',    status: 'stopped', uptime: 0,      lastRestart: '2026-03-19 03:00' },
  ];

  // Try live data
  if (typeof Bridge !== 'undefined' && Bridge.liveMode) {
    Bridge.getSystemServices().then(data => {
      if (Array.isArray(data)) {
        _drawServiceGrid(grid, badge, data);
      } else {
        _drawServiceGrid(grid, badge, services);
      }
    }).catch(() => _drawServiceGrid(grid, badge, services));
  } else {
    _drawServiceGrid(grid, badge, services);
  }
}

function _drawServiceGrid(grid, badge, services) {
  const running = services.filter(s => s.status === 'running').length;
  if (badge) badge.textContent = `${running}/${services.length} running`;

  grid.innerHTML = services.map(s => {
    const isUp = s.status === 'running';
    const expanded = _sysExpandedService === s.id;
    return `
      <div class="sys-svc-card ${isUp ? '' : 'sys-svc-down'} ${expanded ? 'sys-svc-expanded' : ''}" onclick="toggleServiceDetail('${s.id}')">
        <div class="sys-svc-row">
          <span class="sys-svc-dot ${isUp ? 'sys-svc-dot-up' : 'sys-svc-dot-down'}"></span>
          <span class="sys-svc-name">${s.name}</span>
          <span class="sys-svc-uptime">${isUp ? _fmtUptime(s.uptime) : 'stopped'}</span>
        </div>
        ${expanded ? `
          <div class="sys-svc-detail">
            <div class="sys-svc-detail-row"><span>Last restart:</span><span>${s.lastRestart || '—'}</span></div>
            <div class="sys-svc-detail-row"><span>Status:</span><span style="color:${isUp ? 'var(--green)' : 'var(--red)'}">${s.status}</span></div>
            <button class="sys-svc-restart-btn" onclick="event.stopPropagation();restartService('${s.id}')">🔄 Restart</button>
          </div>` : ''}
      </div>`;
  }).join('');
}

function toggleServiceDetail(id) {
  _sysExpandedService = _sysExpandedService === id ? null : id;
  _renderServiceStatus();
}

function restartService(id) {
  const bridgeUrl = (typeof Bridge !== 'undefined' && Bridge.baseUrl) ? Bridge.baseUrl : '';
  fetch(`${bridgeUrl}/api/system/restart/${id}`, { method: 'POST' })
    .then(r => { if (r.ok) toast(`🔄 Restarting ${id}...`, 'success'); else throw new Error(r.status); })
    .catch(() => toast(`⚠ Restart endpoint unavailable for ${id}`, 'error'));
}

// ── 3. Agent Status Table ─────────────────────────────────
function _renderAgentStatusTable() {
  const wrap = $('sys-agents-table');
  if (!wrap) return;

  const cols = [
    { key: 'name', label: 'Agent' },
    { key: 'status', label: 'Status' },
    { key: 'task', label: 'Current Task' },
    { key: 'tasks', label: 'Tasks Done' },
    { key: 'tokens', label: 'Tokens Used' },
    { key: 'fitness', label: 'Fitness' },
  ];

  let agents = [...AGENTS];
  if (_sysSortCol) {
    agents.sort((a, b) => {
      let va = a[_sysSortCol], vb = b[_sysSortCol];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      if (va < vb) return _sysSortAsc ? -1 : 1;
      if (va > vb) return _sysSortAsc ? 1 : -1;
      return 0;
    });
  }

  const headerHtml = cols.map(c => {
    const sorted = _sysSortCol === c.key;
    const arrow = sorted ? (_sysSortAsc ? ' ▲' : ' ▼') : '';
    return `<th class="sys-th ${sorted ? 'sys-th-sorted' : ''}" onclick="sortAgentTable('${c.key}')">${c.label}${arrow}</th>`;
  }).join('');

  const rowsHtml = agents.map(a => {
    const isActive = a.status === 'active';
    const fitClr = a.fitness > 0.8 ? 'var(--green)' : a.fitness > 0.6 ? 'var(--yellow)' : 'var(--red)';
    return `
      <tr class="sys-agent-row" onclick="openAgentDrawerById('${a.id}')" style="cursor:pointer">
        <td>
          <span class="sys-agent-dot ${isActive ? 'sys-agent-dot-active' : 'sys-agent-dot-idle'}"></span>
          <span class="entity-link entity-agent">${a.emoji} ${a.name}</span>
        </td>
        <td><span class="sys-status-pill ${isActive ? 'sys-pill-active' : 'sys-pill-idle'}">${a.status}</span></td>
        <td class="sys-task-cell">${a.task || '<span style="color:var(--text-muted)">—</span>'}</td>
        <td>${a.tasks}</td>
        <td>${(a.tokens / 1000).toFixed(1)}K</td>
        <td>
          <div class="sys-fitness-wrap">
            <div class="sys-fitness-bar"><div class="sys-fitness-fill" style="width:${a.fitness * 100}%;background:${fitClr}"></div></div>
            <span class="sys-fitness-val">${(a.fitness * 100).toFixed(0)}%</span>
          </div>
        </td>
      </tr>`;
  }).join('');

  wrap.innerHTML = `
    <table class="sys-table">
      <thead><tr>${headerHtml}</tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>`;
}

function sortAgentTable(col) {
  if (_sysSortCol === col) _sysSortAsc = !_sysSortAsc;
  else { _sysSortCol = col; _sysSortAsc = true; }
  _renderAgentStatusTable();
}

function openAgentDrawerById(id) {
  if (typeof openAgentDrawer === 'function') openAgentDrawer(id);
}

// ── 4. Workflow Pipeline ──────────────────────────────────
function _renderWorkflowPipeline() {
  const wrap = $('sys-pipeline');
  if (!wrap) return;

  // Get real counts from overview or fallback
  const stages = [
    { id: 'proposed', label: 'Proposed', count: 3, color: '#89b4fa', icon: '💡' },
    { id: 'queued',   label: 'Queued',   count: 4, color: '#f9e2af', icon: '📋' },
    { id: 'working',  label: 'Working',  count: 2, color: '#fab387', icon: '⚡' },
    { id: 'done',     label: 'Done',     count: 14, color: '#a6e3a1', icon: '✅' },
    { id: 'failed',   label: 'Failed',   count: 1, color: '#f38ba8', icon: '❌' },
  ];

  // Try real data
  if (typeof Bridge !== 'undefined' && Bridge.liveMode) {
    Bridge.getSystemOverview().then(data => {
      if (data.workflow) {
        Object.keys(data.workflow).forEach(k => {
          const s = stages.find(st => st.id === k);
          if (s) s.count = data.workflow[k];
        });
      }
      _drawPipeline(wrap, stages);
    }).catch(() => _drawPipeline(wrap, stages));
  } else {
    _drawPipeline(wrap, stages);
  }
}

function _drawPipeline(wrap, stages) {
  wrap.innerHTML = `<div class="sys-pipeline-flow">${
    stages.map((s, i) => `
      ${i > 0 ? '<div class="sys-pipe-arrow"><svg width="32" height="20"><path d="M4,10 L22,10 M18,5 L24,10 L18,15" fill="none" stroke="${s.color}" stroke-width="2" stroke-linecap="round"><animate attributeName="stroke-dashoffset" from="20" to="0" dur="1.5s" repeatCount="indefinite"/></path></svg></div>' : ''}
      <div class="sys-pipe-stage" style="--stage-clr:${s.color}" onclick="showPipelineItems('${s.id}','${s.label}')">
        <div class="sys-pipe-icon">${s.icon}</div>
        <div class="sys-pipe-count" style="color:${s.color}">${s.count}</div>
        <div class="sys-pipe-label">${s.label}</div>
      </div>`
    ).join('')
  }</div>`;
}

function showPipelineItems(stageId, label) {
  const detail = $('sys-pipeline-detail');
  if (!detail) return;
  detail.classList.toggle('hidden', detail.dataset.stage === stageId && !detail.classList.contains('hidden'));
  detail.dataset.stage = stageId;

  // Map stages to board cards
  const stageMap = { proposed: 'inbox', queued: 'queued', working: 'active', done: 'done', failed: 'done' };
  const cards = (BOARD_CARDS[stageMap[stageId]] || []).slice(0, 5);

  detail.innerHTML = `
    <div class="sys-pipe-detail-header">
      <strong>${label}</strong>
      <button onclick="$('sys-pipeline-detail').classList.add('hidden')" style="background:none;border:none;color:var(--text-muted);cursor:pointer">✕</button>
    </div>
    ${cards.length === 0 ? '<div style="padding:8px;color:var(--text-muted);font-size:12px">No items</div>' :
    cards.map(c => {
      const agent = ga(c.agent) || { emoji: '❓' };
      return `<div class="sys-pipe-item"><span>${agent.emoji}</span><span>${c.title}</span><span class="priority-badge ${(c.priority||'P3').toLowerCase()}">${c.priority}</span></div>`;
    }).join('')}`;
}

// ── 5. Cron Schedule ──────────────────────────────────────
function _renderCronSchedule() {
  const el = $('sys-crons');
  if (!el) return;

  const now = new Date();
  const cronData = CRONS.map(c => {
    // Estimate next run from cron expression
    const parts = c.s.split(' ');
    const mins = parts[0] === '*' ? null : (parts[0].startsWith('*/') ? parseInt(parts[0].slice(2)) : parseInt(parts[0]));
    let nextRun = '—';
    if (mins && parts[0].startsWith('*/')) {
      const next = new Date(now.getTime() + (mins - (now.getMinutes() % mins)) * 60000);
      nextRun = next.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (parts[1] !== '*') {
      nextRun = `${parts[1].padStart(2,'0')}:${(parts[0]||'00').padStart(2,'0')}`;
    }
    const disabled = localStorage.getItem('cron_disabled_' + c.n) === '1';
    return { ...c, nextRun, disabled };
  });

  el.innerHTML = `<div class="sys-cron-timeline">${cronData.map(c => `
    <div class="sys-cron-item ${c.ok ? '' : 'sys-cron-fail'} ${c.disabled ? 'sys-cron-disabled' : ''}">
      <div class="sys-cron-left">
        <span class="status-dot ${c.ok ? 'status-ok' : 'status-fail'}"></span>
        <span class="sys-cron-name">${c.n}</span>
      </div>
      <span class="sys-cron-sched">${c.s}</span>
      <span class="sys-cron-next">${c.disabled ? 'disabled' : 'next: ' + c.nextRun}</span>
      <label class="sys-cron-toggle" onclick="event.stopPropagation()">
        <input type="checkbox" ${c.disabled ? '' : 'checked'} onchange="toggleCronJob('${c.n}', this.checked)">
        <span class="sys-cron-slider"></span>
      </label>
    </div>`).join('')}</div>`;
}

function toggleCronJob(name, enabled) {
  localStorage.setItem('cron_disabled_' + name, enabled ? '0' : '1');
  toast(`${enabled ? '✅ Enabled' : '⏸ Disabled'}: ${name}`, 'info');
}

// ── 6. Cost Tracking ──────────────────────────────────────
function _renderCostTracking() {
  const el = $('sys-cost-chart');
  if (!el) return;

  // Load from localStorage or fallback to COST_DATA
  const stored = localStorage.getItem('sys_cost_data');
  const data = stored ? JSON.parse(stored) : COST_DATA;

  const agents = ['righthand', 'researcher', 'coder', 'utility', 'other'];
  const colors = { righthand: '#E8A838', researcher: '#2BA89E', coder: '#57A773', utility: '#8E44AD', other: '#6C7A89' };

  const displayData = _sysCostRange === 'weekly' ?
    [{ day: 'This Week', ...agents.reduce((acc, a) => { acc[a] = data.reduce((s, d) => s + (d[a] || 0), 0); return acc; }, {}) }] :
    data;

  const maxT = Math.max(...displayData.map(d => agents.reduce((s, a) => s + (d[a] || 0), 0)), 1);

  el.innerHTML = `
    <div class="sys-cost-legend">${agents.map(a => `<span class="sys-cost-legend-item"><span class="sys-cost-legend-dot" style="background:${colors[a]}"></span>${a}</span>`).join('')}</div>
    <div class="sys-cost-bars">${displayData.map(d => {
      const total = agents.reduce((s, a) => s + (d[a] || 0), 0);
      return `
        <div class="sys-cost-bar-col">
          <div class="sys-cost-bar-stack" style="height:120px">
            ${agents.map(a => {
              const pct = ((d[a] || 0) / maxT) * 100;
              return `<div class="sys-cost-bar-seg" style="height:${pct}%;background:${colors[a]}" title="${a}: $${(d[a]||0).toFixed(2)}"></div>`;
            }).join('')}
          </div>
          <div class="sys-cost-bar-label">${d.day}</div>
          <div class="sys-cost-bar-total">$${total.toFixed(2)}</div>
        </div>`;
    }).join('')}</div>`;
}

function toggleCostRange(range) {
  _sysCostRange = range;
  document.querySelectorAll('.sys-toggle-btn').forEach(b => b.classList.toggle('active', b.dataset.range === range));
  _renderCostTracking();
}

// ── 7. System Logs ────────────────────────────────────────
function _renderSystemLogs() {
  const el = $('sys-logs');
  if (!el) return;

  // Try fetching from /api/system/logs
  if (typeof Bridge !== 'undefined' && Bridge.liveMode) {
    Bridge.getSystemLogs('all', 20).then(lines => {
      if (Array.isArray(lines) && lines.length > 0) {
        _drawLogs(el, lines);
      } else {
        _drawLogsFromStream(el);
      }
    }).catch(() => _drawLogsFromStream(el));
  } else {
    _drawLogsFromStream(el);
  }
}

function _drawLogsFromStream(el) {
  const logs = STREAM_EVENTS.slice(0, 20);
  _drawLogs(el, logs.map(e => ({
    level: e.level,
    time: e.time,
    agent: e.agent,
    text: e.text,
  })));
}

function _drawLogs(el, logs) {
  const colorMap = { error: 'var(--red)', warn: 'var(--yellow)', info: 'var(--accent2)', debug: 'var(--text-muted)' };
  const bgMap = { error: 'rgba(243,139,168,0.06)', warn: 'rgba(249,226,175,0.04)', info: 'transparent', debug: 'transparent' };

  el.innerHTML = logs.map(l => {
    const agent = ga(l.agent) || { emoji: '❓' };
    return `
      <div class="sys-log-line" style="background:${bgMap[l.level] || 'transparent'}">
        <span class="sys-log-time">${l.time}</span>
        <span class="sys-log-level" style="color:${colorMap[l.level] || 'var(--text-muted)'}">${(l.level||'info').toUpperCase()}</span>
        <span class="sys-log-agent">${agent.emoji}</span>
        <span class="sys-log-text">${l.text}</span>
      </div>`;
  }).join('');

  if (!_sysLogPaused) el.scrollTop = el.scrollHeight;
}

function toggleLogPause() {
  _sysLogPaused = !_sysLogPaused;
  const btn = $('sys-log-pause');
  if (btn) btn.textContent = _sysLogPaused ? '▶ Resume' : '⏸ Pause';
}

function quickAction(action) {
  const msgs = {
    'restart-gateway': '🔄 Restarting gateway...',
    'clear-queue':     '🗑️ Queue cleared',
    'reindex':         '📚 Reindexing vault...',
    'health-check':    '🩺 Running health check...',
  };
  toast(msgs[action] || action, 'success');
  addXP(5, 'quick action');
}


// ═══════════════════════════════════════════════════════════
// PLANS PAGE — Kanban with Agent Action Buttons
// ═══════════════════════════════════════════════════════════

let plansData = [];
let currentPlanId = null;
let currentPlanData = null;
let planChatContext = null; // { plan, task? }
let planDetailExpanded = null; // ID of expanded plan detail

// Seed plans data for offline
const SEED_PLANS = [
  { id:'plan-agent-os-frontend', name:'Agent OS Frontend', description:'Native frontend to replace Discord as the primary interface.', status:'active', mission_id:'m2',
    owner:'💻 Coder', created:'2026-03-10', updated:'2026-03-20',
    steps:[
      { id:'s1', title:'Design system & component library', desc:'Establish color tokens, spacing, typography, and base components.', status:'done', agent:'coder', notes:'Using Catppuccin Mocha' },
      { id:'s2', title:'Core navigation & routing', desc:'Sidebar, bottom bar, page switching, deep linking.', status:'done', agent:'coder', notes:'Completed with mobile support' },
      { id:'s3', title:'Dashboard & feed view', desc:'Main landing page with activity feed and metrics.', status:'done', agent:'coder', notes:'' },
      { id:'s4', title:'Plans page — Kanban board', desc:'Agent-managed Kanban with multiple plans and action buttons.', status:'active', agent:'coder', notes:'In progress' },
      { id:'s5', title:'Missions page redesign', desc:'Hill chart, mission cards, expanded detail.', status:'active', agent:'coder', notes:'Premium pass underway' },
      { id:'s6', title:'Mobile optimization pass', desc:'Responsive nav, touch-friendly cards, gesture support.', status:'todo', agent:null, notes:'' },
      { id:'s7', title:'Browser notifications', desc:'Push notifications for task completions and alerts.', status:'todo', agent:null, notes:'' },
    ]
  },
  { id:'plan-competitor-research', name:'Competitor Research', description:'Comprehensive analysis of 60+ products across 4 categories.', status:'active', mission_id:'m1',
    owner:'🔬 Researcher', created:'2026-03-05', updated:'2026-03-20',
    steps:[
      { id:'s1', title:'Surface scan all 60+ products', desc:'Quick profiles with category, pricing, key features.', status:'done', agent:'researcher', notes:'Completed — 63 products' },
      { id:'s2', title:'Deep dive: top 5 competitors', desc:'Full teardown of Cursor, Devin, LangSmith, Dify, Copilot Workspace.', status:'active', agent:'researcher', notes:'3/5 done' },
      { id:'s3', title:'UX comparison matrix', desc:'Feature-by-feature comparison across all categories.', status:'todo', agent:'researcher', notes:'' },
      { id:'s4', title:'Threat assessment & positioning', desc:'SWOT analysis, positioning recommendations.', status:'todo', agent:'devil', notes:'' },
      { id:'s5', title:'Final report & vault publish', desc:'Comprehensive report with actionable insights.', status:'todo', agent:'researcher', notes:'' },
    ]
  },
  { id:'plan-wilson-phase0', name:'Wilson Phase 0', description:'Feasibility study for Wilson Premier AI agent platform.', status:'draft', mission_id:'m3',
    owner:'🔬 Researcher', created:'2026-03-15', updated:'2026-03-19',
    steps:[
      { id:'s1', title:'Industry research', desc:'Hospitality + real estate AI landscape.', status:'done', agent:'researcher', notes:'Doc v1 drafted' },
      { id:'s2', title:'Architecture proposal', desc:'Multi-agent system design for property management.', status:'todo', agent:'coder', notes:'' },
      { id:'s3', title:'Prototype MVP', desc:'Basic agent interaction demo.', status:'todo', agent:'coder', notes:'' },
      { id:'s4', title:'Pitch deck', desc:'Investor-ready presentation.', status:'todo', agent:null, notes:'' },
    ]
  },
];

async function renderPlansPage() {
  const selector = $('plans-selector');
  const container = $('plans-kanban-container');
  if (!selector || !container) return;

  // Load plans from bridge
  try {
    if (typeof Bridge !== 'undefined' && Bridge.liveMode) {
      const bridgePlans = await Bridge.getPlans();
      if (bridgePlans && bridgePlans.length > 0) plansData = bridgePlans;
    }
  } catch (e) {
    console.warn('[Plans] Bridge load failed:', e.message);
  }

  // Fallback seed data
  if (!plansData || plansData.length === 0) {
    plansData = SEED_PLANS;
  }

  // Render selector with new plan button
  selector.innerHTML = `
    ${plansData.map(p => `<button class="chip${currentPlanId === p.id ? ' active' : ''}" onclick="selectPlan('${p.id}')">${p.name}</button>`).join('')}
    <button class="chip plan-new-chip" onclick="showNewPlanModal()">＋ New Plan</button>
  `;

  if (planDetailExpanded) {
    renderPlanDetail(planDetailExpanded);
  } else if (!currentPlanId && plansData.length > 0) {
    selectPlan(plansData[0].id);
  } else if (currentPlanId) {
    await renderPlanView(currentPlanId);
  }
}

async function selectPlan(planId) {
  currentPlanId = planId;
  planDetailExpanded = null;
  const selector = $('plans-selector');
  if (selector) {
    selector.querySelectorAll('.chip:not(.plan-new-chip)').forEach(c => {
      c.classList.toggle('active', c.textContent === plansData.find(p => p.id === planId)?.name);
    });
  }
  await renderPlanView(planId);
}

async function renderPlanView(planId) {
  const container = $('plans-kanban-container');
  if (!container) return;

  let plan = null;
  try {
    if (typeof Bridge !== 'undefined' && Bridge.liveMode) {
      plan = await Bridge.getPlan(planId);
    }
  } catch (e) {
    console.warn('[Plans] Plan load failed:', e.message);
  }

  if (!plan) {
    plan = getSeedPlan(planId) || plansData.find(p => p.id === planId);
  }

  currentPlanData = plan;
  if (!plan) {
    container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">Plan not found</div>';
    return;
  }

  // If plan has steps (new format), render step-based view
  if (plan.steps) {
    renderPlanCardView(plan, container);
  } else {
    // Legacy kanban view
    renderPlanKanban(plan, container);
  }
}

function renderPlanCardView(plan, container) {
  const steps = plan.steps || [];
  const doneCount = steps.filter(s => s.status === 'done').length;
  const activeCount = steps.filter(s => s.status === 'active').length;
  const totalSteps = steps.length;
  const progress = totalSteps > 0 ? Math.round((doneCount / totalSteps) * 100) : 0;
  const linkedMission = (typeof mcMissions !== 'undefined' ? mcMissions : MISSIONS_DATA).find(m => m.id === plan.mission_id);
  const statusMap = { active:'Active', draft:'Draft', completed:'Complete' };
  const statusColor = plan.status === 'completed' ? 'var(--teal)' : plan.status === 'draft' ? 'var(--text-muted)' : 'var(--green)';

  container.innerHTML = `
    <div class="plan-detail-view">
      <div class="plan-header-card">
        <div class="plan-header-top">
          <div class="plan-header-info">
            <h3 class="plan-header-title">${plan.name}</h3>
            <p class="plan-header-desc">${plan.description || ''}</p>
          </div>
          <div class="plan-header-meta">
            <span class="plan-status-badge" style="color:${statusColor};border-color:${statusColor}">${statusMap[plan.status] || plan.status}</span>
            ${linkedMission ? `<span class="plan-linked-mission" onclick="nav('missions');setTimeout(()=>selectMCMission('${linkedMission.id}'),200)">${linkedMission.icon} ${linkedMission.title}</span>` : ''}
          </div>
        </div>
        <div class="plan-header-stats">
          <div class="plan-stat"><span class="plan-stat-val">${doneCount}/${totalSteps}</span><span class="plan-stat-label">Steps done</span></div>
          <div class="plan-stat"><span class="plan-stat-val">${activeCount}</span><span class="plan-stat-label">In progress</span></div>
          <div class="plan-stat"><span class="plan-stat-val">${plan.owner || '—'}</span><span class="plan-stat-label">Owner</span></div>
          <div class="plan-stat"><span class="plan-stat-val">${plan.updated || '—'}</span><span class="plan-stat-label">Updated</span></div>
        </div>
        <div class="plan-progress-track">
          <div class="plan-progress-bar">
            <div class="plan-progress-fill" style="width:${progress}%"></div>
          </div>
          <span class="plan-progress-label">${progress}%</span>
        </div>
      </div>

      <div class="plan-flow-container">
        ${steps.map((step, i) => {
          const isDone = step.status === 'done';
          const isActive = step.status === 'active';
          const stepAgent = step.agent ? (typeof ga === 'function' ? ga(step.agent) : null) : null;
          const stepEmoji = stepAgent ? stepAgent.emoji : (step.agent ? '🤖' : '⬜');
          const stepStatusIcon = isDone ? '✅' : isActive ? '🔄' : '⬜';
          const stepClass = isDone ? 'plan-step-done' : isActive ? 'plan-step-active' : 'plan-step-todo';
          const checked = isDone ? 'checked' : '';
          const lsKey = `agentOS_plan_step_${plan.id}_${step.id}`;
          const savedCheck = localStorage.getItem(lsKey);
          const isChecked = savedCheck === 'true' || isDone;

          return `
            ${i > 0 ? '<div class="plan-flow-connector"><div class="plan-flow-line' + (isDone || isActive ? ' filled' : '') + '"></div></div>' : ''}
            <div class="plan-step-card ${stepClass}" data-step-id="${step.id}">
              <div class="plan-step-header">
                <input type="checkbox" class="plan-step-check" ${isChecked ? 'checked' : ''} onchange="togglePlanStep('${plan.id}','${step.id}',this.checked)"/>
                <span class="plan-step-num">${i + 1}</span>
                <span class="plan-step-title">${step.title}</span>
                <span class="plan-step-agent">${stepEmoji}</span>
                <span class="plan-step-status-dot ${stepClass}"></span>
              </div>
              ${step.desc ? `<div class="plan-step-desc">${step.desc}</div>` : ''}
              ${step.notes ? `<div class="plan-step-notes">📝 ${step.notes}</div>` : ''}
              <div class="plan-step-actions">
                ${!isDone ? `<button class="plan-step-dispatch-btn" onclick="event.stopPropagation();dispatchPlanStep('${plan.id}','${step.id}')">🚀 Dispatch Step</button>` : ''}
                <button class="plan-step-ask-btn" onclick="event.stopPropagation();openTaskChat('${step.id}','${plan.id}')">❓ Ask</button>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div class="plan-bottom-toolbar">
        <button class="plan-toolbar-btn" onclick="openPlanChat()">💬 Discuss Plan</button>
      </div>
    </div>
  `;
}

function renderPlanKanban(plan, container) {
  const columns = plan.columns || [
    { id: 'backlog', name: 'Backlog', color: '#6c7086' },
    { id: 'active', name: 'In Progress', color: '#f9e2af' },
    { id: 'review', name: 'Review', color: '#89b4fa' },
    { id: 'done', name: 'Done', color: '#a6e3a1' },
  ];

  container.innerHTML = `
    <div class="kanban-board" style="flex:1;display:flex;gap:12px;padding:8px 16px 16px;overflow-x:auto;overflow-y:hidden">
      ${columns.map(col => {
        const tasks = (plan.tasks || []).filter(t => t.column === col.id);
        return `
          <div class="kanban-col">
            <div class="kanban-col-header" style="border-top:2px solid ${col.color}">
              <span style="color:${col.color}">${col.name}</span>
              <span class="col-count">${tasks.length}</span>
            </div>
            <div class="kanban-cards" id="plan-cards-${col.id}">
              ${tasks.map(task => makePlanTaskCard(task, col, plan)).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
    <div class="plan-agent-toolbar" id="plan-agent-toolbar">
      <button class="plan-toolbar-btn" onclick="openPlanChat()">💬 Discuss Plan</button>
    </div>
  `;
}

function togglePlanStep(planId, stepId, checked) {
  const lsKey = `agentOS_plan_step_${planId}_${stepId}`;
  localStorage.setItem(lsKey, String(checked));
  // Update visual state
  const card = document.querySelector(`.plan-step-card[data-step-id="${stepId}"]`);
  if (card) {
    card.classList.toggle('plan-step-done', checked);
    card.classList.toggle('plan-step-todo', !checked);
    card.classList.remove('plan-step-active');
  }
}

function dispatchPlanStep(planId, stepId) {
  const plan = currentPlanData || plansData.find(p => p.id === planId);
  if (!plan) return;
  const step = (plan.steps || plan.tasks || []).find(s => s.id === stepId);
  if (!step) return;

  const payload = {
    action: 'implement',
    task: step.title,
    plan: plan.name,
    description: step.desc || step.description || '',
  };

  const bridgeUrl = (typeof Bridge !== 'undefined' && Bridge.baseUrl) ? Bridge.baseUrl : '';
  fetch(`${bridgeUrl}/api/agent/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: JSON.stringify(payload), context: 'plan-action', plan: plan.name, task: step.title }),
  }).catch(() => {});

  toast(`🚀 Dispatched: ${step.title}`, 'success', 3000);
  if (typeof addXP === 'function') addXP(10, 'dispatch step');
}

function showNewPlanModal() {
  const missions = typeof mcMissions !== 'undefined' ? mcMissions : (typeof MISSIONS_DATA !== 'undefined' ? MISSIONS_DATA : []);
  const m = document.createElement('div');
  m.id = 'new-plan-modal';
  m.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;';
  m.innerHTML = `
    <div class="modal-panel" style="background:var(--bg-surface,#252536);border:1px solid var(--border);border-radius:16px;padding:28px;width:90%;max-width:520px;max-height:80vh;overflow-y:auto;">
      <h3 style="margin:0 0 20px;color:var(--text);font-size:18px;font-weight:700;">📋 New Plan</h3>
      <label class="modal-label">Plan Name</label>
      <input id="np2-title" placeholder="e.g. Launch Campaign" class="modal-input" />
      <label class="modal-label">Linked Mission</label>
      <select id="np2-mission" class="modal-input" style="appearance:auto;">
        <option value="">— None —</option>
        ${missions.map(m => `<option value="${m.id}">${m.icon} ${m.title}</option>`).join('')}
      </select>
      <label class="modal-label">Steps</label>
      <div id="np2-steps-list" class="np2-steps-list"></div>
      <button onclick="addNewPlanStep()" class="plan-add-step-btn" style="margin-bottom:16px;">＋ Add Step</button>
      <div style="display:flex;gap:10px;justify-content:flex-end;">
        <button onclick="document.getElementById('new-plan-modal').remove()" class="modal-btn-cancel">Cancel</button>
        <button onclick="submitNewPlan()" class="modal-btn-primary">Create Plan</button>
      </div>
      <div id="np2-status" style="margin-top:8px;font-size:12px;color:var(--text-muted);"></div>
    </div>
  `;
  m.onclick = (e) => { if (e.target === m) m.remove(); };
  document.body.appendChild(m);
  addNewPlanStep(); // Start with one step
  setTimeout(() => document.getElementById('np2-title')?.focus(), 100);
}

let _npStepCounter = 0;
function addNewPlanStep() {
  _npStepCounter++;
  const list = document.getElementById('np2-steps-list');
  if (!list) return;
  const row = document.createElement('div');
  row.className = 'np2-step-row';
  row.innerHTML = `
    <span class="np2-step-num">${_npStepCounter}</span>
    <input class="np2-step-title modal-input" placeholder="Step title" style="flex:1;margin-bottom:0;" />
    <input class="np2-step-agent modal-input" placeholder="Agent (optional)" style="width:100px;margin-bottom:0;" />
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--red);cursor:pointer;font-size:16px;">✕</button>
  `;
  list.appendChild(row);
}

async function submitNewPlan() {
  const title = document.getElementById('np2-title')?.value.trim();
  const missionId = document.getElementById('np2-mission')?.value || '';
  const status = document.getElementById('np2-status');
  if (!title) { status.textContent = '❌ Title required'; return; }

  const stepRows = document.querySelectorAll('.np2-step-row');
  const steps = [];
  stepRows.forEach((row, i) => {
    const t = row.querySelector('.np2-step-title')?.value.trim();
    const a = row.querySelector('.np2-step-agent')?.value.trim() || null;
    if (t) steps.push({ id: `s${i+1}`, title: t, desc: '', status: 'todo', agent: a, notes: '' });
  });

  status.textContent = '⏳ Creating...';
  const id = 'plan-' + Date.now();
  const newPlan = {
    id, name: title, description: '', status: 'draft', mission_id: missionId,
    owner: 'You', created: new Date().toISOString().slice(0,10), updated: new Date().toISOString().slice(0,10),
    steps,
  };

  try {
    if (typeof Bridge !== 'undefined' && Bridge.liveMode) {
      await Bridge.createPlan({ name: title, mission_id: missionId, steps });
    }
  } catch {}

  plansData.push(newPlan);
  try { localStorage.setItem('agentOS_plans', JSON.stringify(plansData)); } catch {}
  
  status.textContent = '✅ Created!';
  _npStepCounter = 0;
  setTimeout(() => {
    document.getElementById('new-plan-modal')?.remove();
    selectPlan(id);
    renderPlansPage();
  }, 400);
}

function makePlanTaskCard(task, col, plan) {
  const agentObj = task.agent ? (ga(task.agent) || { emoji: '🤖' }) : { emoji: '⬜' };
  const pCls = (task.priority || 'P3').toLowerCase();
  const isDone = col.id === 'done' || col.id === 'shipped';

  let agentBtns = `<button class="task-agent-btn ask-btn" onclick="event.stopPropagation();openTaskChat('${task.id}','${plan.id}')">❓ Ask</button>`;
  if (!isDone) {
    agentBtns += `<button class="task-agent-btn" onclick="event.stopPropagation();dispatchImplement('${task.id}','${plan.id}')">🚀 Implement</button>`;
  }
  if (isDone) {
    agentBtns += `<button class="task-agent-btn review-btn" onclick="event.stopPropagation();dispatchReview('${task.id}','${plan.id}')">🔍 Review</button>`;
  }

  return `
    <div class="board-card plan-task-card" onclick="openPlanTaskDetail('${task.id}','${plan.id}')" data-task-id="${task.id}">
      <div class="board-card-title">${task.title}</div>
      <div class="board-card-meta">
        <span class="priority-badge ${pCls}">${task.priority || 'P3'}</span>
        <span class="board-card-agent">${agentObj.emoji}</span>
      </div>
      ${(task.labels || []).length ? `<div class="board-tags">${task.labels.map(l => `<span class="board-tag">${l}</span>`).join('')}</div>` : ''}
      <div class="task-card-agent-actions">${agentBtns}</div>
    </div>
  `;
}

function getSeedPlan(planId) {
  const now = new Date().toISOString();
  const seedPlans = {
    'plan-agent-os-frontend': {
      id: 'plan-agent-os-frontend', name: 'Agent OS Frontend',
      description: 'Native frontend to replace Discord as the primary interface.',
      columns: [
        { id: 'backlog', name: 'Backlog', color: '#6c7086' },
        { id: 'active', name: 'In Progress', color: '#f9e2af' },
        { id: 'review', name: 'Review', color: '#89b4fa' },
        { id: 'done', name: 'Done', color: '#a6e3a1' },
      ],
      tasks: [
        { id: 'task-dashboard', title: 'Dashboard home page redesign', description: 'Replace flat feed with mission control layout.', column: 'done', agent: 'coder', priority: 'P2', labels: ['frontend','ux'] },
        { id: 'task-bidi-sync', title: 'Bidirectional Discord sync', description: 'Messages flow both ways: WebUI→Discord via bot POST.', column: 'done', agent: 'righthand', priority: 'P2', labels: ['bridge','sync'] },
        { id: 'task-plans-page', title: 'Plans page — Kanban board', description: 'Agent-managed Kanban with multiple plans.', column: 'active', agent: 'coder', priority: 'P1', labels: ['frontend','new-page'] },
        { id: 'task-agent-chat', title: 'Agent interaction buttons', description: 'Smart router chat + plan action buttons.', column: 'active', agent: 'coder', priority: 'P1', labels: ['frontend','agents'] },
        { id: 'task-mobile', title: 'Mobile optimization pass', description: 'Responsive nav, touch-friendly cards.', column: 'backlog', agent: null, priority: 'P3', labels: ['frontend','mobile'] },
        { id: 'task-notifications', title: 'Notification system', description: 'Browser notifications for task completions.', column: 'backlog', agent: null, priority: 'P3', labels: ['frontend','ux'] },
      ],
    },
    'plan-system-improvements': {
      id: 'plan-system-improvements', name: 'System Improvements',
      description: 'Infrastructure, performance, and reliability improvements.',
      columns: [
        { id: 'ideas', name: 'Ideas', color: '#cba6f7' },
        { id: 'planned', name: 'Planned', color: '#89b4fa' },
        { id: 'active', name: 'Active', color: '#f9e2af' },
        { id: 'shipped', name: 'Shipped', color: '#a6e3a1' },
      ],
      tasks: [
        { id: 'task-ws-gateway', title: 'Discord Gateway WebSocket', description: 'Replace REST polling with real-time events.', column: 'planned', agent: null, priority: 'P3', labels: ['bridge','performance'] },
        { id: 'task-bridge-health', title: 'Bridge health dashboard', description: 'Expose /api/health with uptime.', column: 'active', agent: 'ops', priority: 'P2', labels: ['bridge','monitoring'] },
        { id: 'task-vault-perf', title: 'Vault search performance', description: 'Sub-100ms search via QMD cache.', column: 'ideas', agent: null, priority: 'P3', labels: ['vault','performance'] },
        { id: 'task-agent-metrics', title: 'Agent performance metrics', description: 'Track success rates per agent.', column: 'ideas', agent: null, priority: 'P3', labels: ['agents','analytics'] },
      ],
    },
  };
  return seedPlans[planId] || null;
}

function openPlanTaskDetail(taskId, planId) {
  const plan = currentPlanData;
  if (!plan) return;
  const task = plan.tasks.find(t => t.id === taskId);
  if (!task) return;
  const agent = task.agent ? (ga(task.agent) || { emoji:'🤖', name:task.agent, color:'#cba6f7' }) : { emoji:'⬜', name:'Unassigned', color:'#6c7086' };
  const col = (plan.columns || []).find(c => c.id === task.column);

  const modal = $('card-modal-content');
  modal.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <span class="priority-badge ${(task.priority||'P3').toLowerCase()}" style="font-size:14px;padding:4px 12px">${task.priority||'P3'}</span>
      <div style="font-weight:700;font-size:16px;flex:1">${task.title}</div>
      <button onclick="closeModal()" style="color:var(--text-muted);font-size:18px;background:none;border:none;cursor:pointer">✕</button>
    </div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <span style="font-size:22px;border:2px solid ${agent.color};border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center">${agent.emoji}</span>
      <div>
        <div style="font-weight:600">${agent.name}</div>
        <div style="font-size:12px;color:var(--text-muted)">${col?.name || task.column}</div>
      </div>
    </div>
    ${task.description ? `<div style="font-size:13px;color:var(--text-dim);margin-bottom:16px;line-height:1.6">${task.description}</div>` : ''}
    ${(task.labels||[]).length ? `<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">${task.labels.map(l => `<span style="background:var(--bg-raised);padding:3px 10px;border-radius:10px;font-size:12px">${l}</span>`).join('')}</div>` : ''}
    <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
      <button class="task-agent-btn" onclick="dispatchImplement('${taskId}','${planId}');closeModal()" style="padding:8px 14px;font-size:13px">🚀 Implement</button>
      <button class="task-agent-btn review-btn" onclick="dispatchReview('${taskId}','${planId}');closeModal()" style="padding:8px 14px;font-size:13px">🔍 Review</button>
      <button class="task-agent-btn ask-btn" onclick="openTaskChat('${taskId}','${planId}');closeModal()" style="padding:8px 14px;font-size:13px">❓ Ask Agent</button>
    </div>
  `;
  $('card-modal').classList.remove('hidden');
}

// ── Agent Action Dispatchers ──────────────────────────────

function dispatchImplement(taskId, planId) {
  const plan = currentPlanData;
  if (!plan) return;
  const task = plan.tasks.find(t => t.id === taskId);
  if (!task) return;

  const payload = {
    action: 'implement',
    task: task.title,
    plan: plan.name,
    description: task.description || '',
  };

  const bridgeUrl = (typeof Bridge !== 'undefined' && Bridge.baseUrl) ? Bridge.baseUrl : '';
  fetch(`${bridgeUrl}/api/agent/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: JSON.stringify(payload), context: 'plan-action', plan: plan.name, task: task.title }),
  }).catch(() => {});

  toast(`🚀 Dispatched to Coder: ${task.title}`, 'success', 3000);
  addXP(10, 'dispatch implement');
}

function dispatchReview(taskId, planId) {
  const plan = currentPlanData;
  if (!plan) return;
  const task = plan.tasks.find(t => t.id === taskId);
  if (!task) return;

  const payload = { action: 'review', task: task.title };

  const bridgeUrl = (typeof Bridge !== 'undefined' && Bridge.baseUrl) ? Bridge.baseUrl : '';
  fetch(`${bridgeUrl}/api/agent/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: JSON.stringify(payload), context: 'plan-action', plan: plan.name, task: task.title }),
  }).catch(() => {});

  toast(`🔍 Review requested: ${task.title}`, 'success', 3000);
  addXP(10, 'dispatch review');
}

// ── Plan Chat (slide-out) ─────────────────────────────────

function openPlanChat() {
  const plan = currentPlanData;
  if (!plan) { toast('No plan selected', 'error'); return; }

  planChatContext = { plan: plan.name, planId: plan.id };

  $('plan-chat-title').textContent = `💬 Discuss: ${plan.name}`;
  $('plan-chat-context').innerHTML = `<strong>📋 ${plan.name}</strong>${plan.description || ''}`;
  $('plan-chat-messages').innerHTML = '';
  $('plan-chat-overlay').classList.remove('hidden');
  $('plan-chat-panel').classList.add('open');
  setTimeout(() => $('plan-chat-input').focus(), 300);
}

function closePlanChat() {
  $('plan-chat-overlay').classList.add('hidden');
  $('plan-chat-panel').classList.remove('open');
  planChatContext = null;
}

function sendPlanChatMessage() {
  const input = $('plan-chat-input');
  const text = input.value.trim();
  if (!text || !planChatContext) return;

  const container = $('plan-chat-messages');

  // User bubble
  const userBubble = document.createElement('div');
  userBubble.className = 'agent-chat-bubble user';
  userBubble.textContent = text;
  container.appendChild(userBubble);

  // Send to bridge
  const payload = {
    message: text,
    context: 'plan-discuss',
    plan: planChatContext.plan,
    task: planChatContext.task || null,
  };

  const bridgeUrl = (typeof Bridge !== 'undefined' && Bridge.baseUrl) ? Bridge.baseUrl : '';
  fetch(`${bridgeUrl}/api/agent/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  }).then(r => r.json()).then(data => {
    const reply = document.createElement('div');
    reply.className = 'agent-chat-bubble agent';
    reply.innerHTML = `<span class="bubble-agent-label" style="color:#E8A838">🤝 Right Hand</span>📨 Message received (${data.id || 'queued'}). I'll review and respond.`;
    container.appendChild(reply);
    container.scrollTop = container.scrollHeight;
  }).catch(() => {
    const reply = document.createElement('div');
    reply.className = 'agent-chat-bubble agent';
    reply.innerHTML = `<span class="bubble-agent-label" style="color:#E8A838">🤝 Right Hand</span>📨 Message queued. I'll respond when the bridge is available.`;
    container.appendChild(reply);
    container.scrollTop = container.scrollHeight;
  });

  input.value = '';
  container.scrollTop = container.scrollHeight;
}

// ── Task Inline Chat ──────────────────────────────────────

function openTaskChat(taskId, planId) {
  const plan = currentPlanData;
  if (!plan) return;
  const task = plan.tasks.find(t => t.id === taskId);
  if (!task) return;

  // Open the plan chat panel pre-filled with task context
  planChatContext = { plan: plan.name, planId: plan.id, task: task.title, taskId: task.id };

  $('plan-chat-title').textContent = `❓ Ask about: ${task.title}`;
  $('plan-chat-context').innerHTML = `<strong>📋 ${plan.name} → ${task.title}</strong>${task.description || ''}`;
  $('plan-chat-messages').innerHTML = '';
  $('plan-chat-overlay').classList.remove('hidden');
  $('plan-chat-panel').classList.add('open');
  setTimeout(() => $('plan-chat-input').focus(), 300);
}
