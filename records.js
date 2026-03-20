/* Agent OS v7 — records.js — Universal Entity Browser */
'use strict';

// ═══════════════════════════════════════════════════════════
// RECORDS PAGE — Universal Entity Browser
// ═══════════════════════════════════════════════════════════

const RECORDS_TABS = [
  { id: 'agents',    label: 'Agents',    icon: '🤖' },
  { id: 'tasks',     label: 'Tasks',     icon: '📋' },
  { id: 'proposals', label: 'Proposals', icon: '💡' },
  { id: 'missions',  label: 'Missions',  icon: '🎯' },
  { id: 'notes',     label: 'Notes',     icon: '📄' },
  { id: 'services',  label: 'Services',  icon: '⚙️' },
];

// Column definitions per tab
const RECORDS_COLUMNS = {
  agents:    [
    { key: 'name',       label: 'Name',        sortable: true },
    { key: 'status',     label: 'Status',       sortable: true, type: 'status' },
    { key: 'tasksDone',  label: 'Tasks Done',   sortable: true, type: 'number' },
    { key: 'tokens',     label: 'Tokens',       sortable: true, type: 'number' },
    { key: 'fitness',    label: 'Fitness',       sortable: true, type: 'percent' },
    { key: 'lastActive', label: 'Last Active',   sortable: true },
  ],
  tasks:     [
    { key: 'title',    label: 'Title',     sortable: true },
    { key: 'agent',    label: 'Agent',     sortable: true },
    { key: 'status',   label: 'Status',    sortable: true, type: 'taskStatus' },
    { key: 'priority', label: 'Priority',  sortable: true },
    { key: 'created',  label: 'Created',   sortable: true },
    { key: 'duration', label: 'Duration',  sortable: true },
  ],
  proposals: [
    { key: 'title',      label: 'Title',      sortable: true },
    { key: 'source',     label: 'Source',      sortable: true },
    { key: 'status',     label: 'Status',      sortable: true, type: 'status' },
    { key: 'priority',   label: 'Priority',    sortable: true },
    { key: 'confidence', label: 'Confidence',  sortable: true, type: 'percent' },
    { key: 'created',    label: 'Created',     sortable: true },
  ],
  missions:  [
    { key: 'title',      label: 'Title',       sortable: true },
    { key: 'status',     label: 'Status',      sortable: true, type: 'status' },
    { key: 'progress',   label: 'Progress',    sortable: true, type: 'progressBar' },
    { key: 'tasks',      label: 'Tasks',       sortable: true },
    { key: 'daysActive', label: 'Days Active', sortable: true, type: 'number' },
  ],
  notes:     [
    { key: 'title',    label: 'Title',    sortable: true },
    { key: 'folder',   label: 'Folder',   sortable: true },
    { key: 'modified', label: 'Modified', sortable: true },
    { key: 'links',    label: 'Links',    sortable: true, type: 'number' },
  ],
  services:  [
    { key: 'service', label: 'Service', sortable: true },
    { key: 'status',  label: 'Status',  sortable: true, type: 'serviceStatus' },
    { key: 'type',    label: 'Type',    sortable: true },
  ],
};

// State
let _recTab = 'agents';
let _recSearch = '';
let _recSortCol = '';
let _recSortDir = 1;
let _recPage = 0;
const _recPageSize = 25;
let _recDetailItem = null;  // currently open detail
let _recLiveData = {};      // cache from Bridge
let _recRefreshTimer = null;

// ─── Data fetching ──────────────────────────────────────────

async function fetchRecordsData() {
  if (typeof Bridge === 'undefined' || !Bridge.liveMode) return;
  try {
    const [agents, tasksQueue, tasksActive, tasksDone, tasksFailed, proposals, missions, notes, overview] = await Promise.allSettled([
      Bridge.apiFetch('/api/system/agents'),
      Bridge.apiFetch('/api/tasks/queue'),
      Bridge.apiFetch('/api/tasks/active'),
      Bridge.apiFetch('/api/tasks/done?limit=50'),
      Bridge.apiFetch('/api/tasks/failed'),
      Bridge.getProposals('all'),
      Bridge.apiFetch('/api/missions'),
      Bridge.vaultRecent(50),
      Bridge.getSystemOverview(),
    ]);
    _recLiveData = {
      agents: agents.status === 'fulfilled' ? agents.value : null,
      tasksQueue: tasksQueue.status === 'fulfilled' ? tasksQueue.value : null,
      tasksActive: tasksActive.status === 'fulfilled' ? tasksActive.value : null,
      tasksDone: tasksDone.status === 'fulfilled' ? tasksDone.value : null,
      tasksFailed: tasksFailed.status === 'fulfilled' ? tasksFailed.value : null,
      proposals: proposals.status === 'fulfilled' ? proposals.value : null,
      missions: missions.status === 'fulfilled' ? missions.value : null,
      notes: notes.status === 'fulfilled' ? notes.value : null,
      overview: overview.status === 'fulfilled' ? overview.value : null,
    };
  } catch (e) {
    console.warn('[Records] Bridge fetch failed:', e.message);
  }
}

// ─── Data mappers ──────────────────────────────────────────

function getRecAgents() {
  const live = _recLiveData.agents;
  if (live && Array.isArray(live) && live.length > 0) {
    return live.map(a => ({
      id: a.id || a.name,
      name: `${a.emoji || '🤖'} ${a.name || a.id}`,
      status: a.status || 'idle',
      tasksDone: a.tasks_done ?? a.tasks ?? 0,
      tokens: typeof a.tokens === 'number' ? a.tokens.toLocaleString() : (a.tokens || '0'),
      fitness: a.fitness != null ? Math.round((typeof a.fitness === 'number' && a.fitness <= 1 ? a.fitness * 100 : a.fitness)) : 0,
      lastActive: a.last_active || a.lastActive || 'Unknown',
      _raw: a,
    }));
  }
  // Fallback to static AGENTS
  return AGENTS.map(a => ({
    id: a.id,
    name: `${a.emoji} ${a.name}`,
    status: a.status || 'idle',
    tasksDone: a.tasks || 0,
    tokens: typeof a.tokens === 'number' ? a.tokens.toLocaleString() : (a.tokens || '0'),
    fitness: Math.round((a.fitness || 0) * 100),
    lastActive: a.lastActive || 'Now',
    _raw: a,
  }));
}

function getRecTasks() {
  const q = _recLiveData.tasksQueue;
  const a = _recLiveData.tasksActive;
  const d = _recLiveData.tasksDone;
  const f = _recLiveData.tasksFailed;
  const hasLive = q || a || d || f;

  if (hasLive) {
    const all = [];
    const mapTask = (t, fallbackStatus) => {
      const ag = ga(t.agent) || { emoji: '🤖', name: t.agent || 'Unassigned' };
      return {
        id: t.id,
        title: t.title || t.task || 'Untitled',
        agent: `${ag.emoji} ${ag.name}`,
        status: t.status || fallbackStatus,
        priority: t.priority || 'P3',
        created: t.created_at || t.created || '',
        duration: _calcDuration(t.created_at || t.created, t.completed_at || t.failed_at),
        _raw: t,
      };
    };
    (q || []).forEach(t => all.push(mapTask(t, 'queued')));
    (a || []).forEach(t => all.push(mapTask(t, 'active')));
    (d || []).forEach(t => all.push(mapTask(t, 'done')));
    (f || []).forEach(t => all.push(mapTask(t, 'failed')));
    return all;
  }

  // Fallback to static BOARD_CARDS
  return Object.entries(BOARD_CARDS).flatMap(([col, cards]) =>
    cards.map(c => {
      const ag = ga(c.agent) || { emoji: '🤖', name: c.agent || 'Unassigned' };
      return {
        id: c.id,
        title: c.title,
        agent: `${ag.emoji} ${ag.name}`,
        status: col,
        priority: c.priority || 'P3',
        created: 'Today',
        duration: '—',
        _raw: c,
      };
    })
  );
}

function getRecProposals() {
  const live = _recLiveData.proposals;
  const src = live && Array.isArray(live) && live.length > 0 ? live : (typeof queueCards !== 'undefined' ? queueCards : []);
  return src.map(q => {
    const srcAgent = typeof getSourceAgent === 'function'
      ? getSourceAgent(q.source || q._source || q.agent || 'system')
      : { emoji: '🤖', name: q.source || q._source || q.agent || 'system' };
    return {
      id: q.id,
      title: (q.title || q.question || 'Untitled').substring(0, 80),
      source: `${srcAgent.emoji} ${srcAgent.name}`,
      status: q.status || q._status || 'pending',
      priority: q.priority || q._priority || 'P3',
      confidence: q.confidence ?? q._confidence ?? 0,
      created: q.created_at || (typeof timeAgo === 'function' ? timeAgo(q._createdAt) : '') || 'Recently',
      _raw: q,
    };
  });
}

function getRecMissions() {
  const live = _recLiveData.missions;
  const src = live && Array.isArray(live) && live.length > 0
    ? live
    : (typeof mcMissions !== 'undefined' && mcMissions.length > 0 ? mcMissions : (typeof MISSIONS_DATA !== 'undefined' ? MISSIONS_DATA : []));
  return src.map(m => ({
    id: m.id,
    title: `${m.icon || '🎯'} ${m.title}`,
    status: m.status || 'active',
    progress: m.progress || 0,
    tasks: `${m.tasks_done || 0}/${m.tasks_total || 0}`,
    daysActive: m.days_active || 0,
    _raw: m,
  }));
}

function getRecNotes() {
  const live = _recLiveData.notes;
  if (live && Array.isArray(live) && live.length > 0) {
    return live.map(n => ({
      id: n.path || n.id || n.title,
      title: n.title || n.path || 'Untitled',
      folder: n.folder || (n.path ? n.path.split('/').slice(0, -1).join('/') : ''),
      modified: n.modified || n.date || '',
      links: n.backlinks ?? n.links ?? 0,
      _raw: n,
    }));
  }
  // Fallback to static VAULT_NOTES
  return (typeof VAULT_NOTES !== 'undefined' ? VAULT_NOTES : []).map(n => ({
    id: n.id || n.title,
    title: n.title,
    folder: n.folder || n.type || '',
    modified: n.date || '',
    links: n.backlinks || 0,
    _raw: n,
  }));
}

function getRecServices() {
  const live = _recLiveData.overview;
  const services = [];

  if (live && live.services && Array.isArray(live.services)) {
    live.services.forEach(s => {
      services.push({
        id: s.name || s.service,
        service: s.name || s.service,
        status: s.status || 'unknown',
        type: s.type || 'service',
        _raw: s,
      });
    });
  }

  // Always include known system services
  const knownServices = [
    { id: 'svc-gateway', service: 'OpenClaw Gateway', status: 'running', type: 'Service' },
    { id: 'svc-oauth', service: 'OAuth Guardian', status: 'running', type: 'Service' },
    { id: 'svc-qmd', service: 'QMD Index', status: 'running', type: 'Cron' },
  ];
  knownServices.forEach(ks => {
    if (!services.find(s => s.id === ks.id)) services.push({ ...ks, _raw: ks });
  });

  // Add crons
  (typeof CRONS !== 'undefined' ? CRONS : []).forEach(c => {
    const id = 'cron-' + c.n.replace(/\s/g, '-');
    if (!services.find(s => s.id === id)) {
      services.push({ id, service: c.n, status: c.ok ? 'running' : 'error', type: 'Cron', _raw: c });
    }
  });

  // Add hooks
  (typeof HOOKS !== 'undefined' ? HOOKS : []).forEach(h => {
    const id = 'hook-' + h.n.replace(/\s/g, '-');
    if (!services.find(s => s.id === id)) {
      services.push({ id, service: h.n, status: h.s || 'unknown', type: 'Webhook', _raw: h });
    }
  });

  return services;
}

function _calcDuration(start, end) {
  if (!start) return '—';
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  const diff = e - s;
  if (isNaN(diff) || diff < 0) return '—';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + 'm';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ' + (mins % 60) + 'm';
  return Math.floor(hrs / 24) + 'd ' + (hrs % 24) + 'h';
}

function _getTabData(tab) {
  switch (tab) {
    case 'agents':    return getRecAgents();
    case 'tasks':     return getRecTasks();
    case 'proposals': return getRecProposals();
    case 'missions':  return getRecMissions();
    case 'notes':     return getRecNotes();
    case 'services':  return getRecServices();
    default: return [];
  }
}

// ─── Rendering ──────────────────────────────────────────────

function renderRecords() {
  const el = $('records-content');
  if (!el) return;

  el.innerHTML = `
    <div class="rec-tab-bar" id="rec-tab-bar">
      ${RECORDS_TABS.map(t => `
        <button class="rec-tab${_recTab === t.id ? ' rec-tab-active' : ''}" data-tab="${t.id}" onclick="recSwitchTab('${t.id}')">
          <span class="rec-tab-icon">${t.icon}</span>
          <span class="rec-tab-label">${t.label}</span>
          <span class="rec-tab-count" id="rec-count-${t.id}"></span>
        </button>
      `).join('')}
    </div>
    <div class="rec-toolbar">
      <div class="rec-search-wrap">
        <span class="rec-search-icon">🔍</span>
        <input type="text" class="rec-search" id="rec-search" placeholder="Filter ${_recTab}..." value="${_recSearch}" oninput="_recSearch=this.value;_recPage=0;renderRecTable()">
      </div>
      <div class="rec-toolbar-right">
        <span class="rec-page-info" id="rec-page-info"></span>
        <button class="rec-btn" id="rec-prev-btn" onclick="recPrevPage()" disabled>‹ Prev</button>
        <button class="rec-btn" id="rec-next-btn" onclick="recNextPage()">Next ›</button>
        <button class="rec-btn rec-btn-accent" onclick="recExportCSV()" title="Export as CSV">📥 Export</button>
      </div>
    </div>
    <div class="rec-table-container" id="rec-table-container"></div>
    <div class="rec-detail-overlay" id="rec-detail-overlay" onclick="recCloseDetail()"></div>
    <div class="rec-detail-panel" id="rec-detail-panel"></div>
  `;

  // Fetch live data then render
  fetchRecordsData().then(() => {
    renderRecTable();
    _recUpdateCounts();
  });
  _recStartRefresh();
}

function _recUpdateCounts() {
  RECORDS_TABS.forEach(t => {
    const countEl = $('rec-count-' + t.id);
    if (countEl) {
      const data = _getTabData(t.id);
      countEl.textContent = data.length;
    }
  });
}

function recSwitchTab(tab) {
  _recTab = tab;
  _recSearch = '';
  _recSortCol = '';
  _recSortDir = 1;
  _recPage = 0;
  _recDetailItem = null;
  recCloseDetail();

  $$('.rec-tab').forEach(t => t.classList.toggle('rec-tab-active', t.dataset.tab === tab));
  const searchEl = $('rec-search');
  if (searchEl) { searchEl.value = ''; searchEl.placeholder = `Filter ${tab}...`; }
  renderRecTable();
}

function renderRecTable() {
  const container = $('rec-table-container');
  if (!container) return;

  const cols = RECORDS_COLUMNS[_recTab] || [];
  let data = _getTabData(_recTab);

  // Search filter
  if (_recSearch) {
    const q = _recSearch.toLowerCase();
    data = data.filter(r => {
      return cols.some(c => {
        const v = r[c.key];
        return v != null && v.toString().toLowerCase().includes(q);
      });
    });
  }

  // Sort
  if (_recSortCol) {
    data.sort((a, b) => {
      let av = a[_recSortCol];
      let bv = b[_recSortCol];
      // Numeric sort for number/percent types
      const col = cols.find(c => c.key === _recSortCol);
      if (col && (col.type === 'number' || col.type === 'percent' || col.type === 'progressBar')) {
        av = parseFloat(av) || 0;
        bv = parseFloat(bv) || 0;
        return (av - bv) * _recSortDir;
      }
      av = (av || '').toString().toLowerCase();
      bv = (bv || '').toString().toLowerCase();
      return av.localeCompare(bv) * _recSortDir;
    });
  }

  const total = data.length;
  const totalPages = Math.max(1, Math.ceil(total / _recPageSize));
  if (_recPage >= totalPages) _recPage = totalPages - 1;
  if (_recPage < 0) _recPage = 0;

  const start = _recPage * _recPageSize;
  const pageData = data.slice(start, start + _recPageSize);

  // Update page info
  const pageInfo = $('rec-page-info');
  if (pageInfo) {
    pageInfo.textContent = total === 0 ? 'No results' : `${start + 1}–${Math.min(start + _recPageSize, total)} of ${total}`;
  }
  const prevBtn = $('rec-prev-btn');
  const nextBtn = $('rec-next-btn');
  if (prevBtn) prevBtn.disabled = _recPage === 0;
  if (nextBtn) nextBtn.disabled = _recPage >= totalPages - 1;

  container.innerHTML = `
    <table class="rec-table">
      <thead>
        <tr>
          ${cols.map(c => `
            <th class="rec-th${_recSortCol === c.key ? ' rec-th-sorted' : ''}${c.sortable ? ' rec-th-sortable' : ''}"
                ${c.sortable ? `onclick="recSort('${c.key}')"` : ''}>
              ${c.label}
              ${_recSortCol === c.key ? `<span class="rec-sort-arrow">${_recSortDir === 1 ? '▲' : '▼'}</span>` : ''}
            </th>
          `).join('')}
        </tr>
      </thead>
      <tbody>
        ${pageData.length === 0 ? `<tr><td colspan="${cols.length}" class="rec-empty">No ${_recTab} found</td></tr>` : ''}
        ${pageData.map(r => `
          <tr class="rec-row" onclick="recOpenDetail('${_escAttr(r.id)}')">
            ${cols.map(c => `<td class="rec-td">${_recRenderCell(r[c.key], c)}</td>`).join('')}
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function _escAttr(s) {
  return String(s || '').replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

function _recRenderCell(value, col) {
  if (value == null) return '<span class="rec-cell-empty">—</span>';

  switch (col.type) {
    case 'status':
      return `<span class="rec-pill rec-pill-${_statusClass(value)}">${value}</span>`;

    case 'taskStatus': {
      const cls = { queued: 'yellow', active: 'blue', done: 'green', failed: 'red', inbox: 'gray', review: 'orange' }[value] || 'gray';
      return `<span class="rec-pill rec-pill-${cls}">${value}</span>`;
    }

    case 'serviceStatus': {
      const running = value === 'running' || value === 'ok' || value === 'active';
      return `<span class="rec-svc-dot ${running ? 'rec-svc-green' : 'rec-svc-red'}"></span> ${value}`;
    }

    case 'percent':
      return `<span class="rec-percent">${value}%</span>`;

    case 'progressBar':
      return `
        <div class="rec-progress-wrap">
          <div class="rec-progress-bar">
            <div class="rec-progress-fill" style="width:${Math.min(100, value)}%"></div>
          </div>
          <span class="rec-progress-label">${value}%</span>
        </div>`;

    case 'number':
      return `<span class="rec-number">${value}</span>`;

    default:
      return String(value);
  }
}

function _statusClass(status) {
  const s = (status || '').toLowerCase();
  if (['active', 'running', 'ok', 'online'].includes(s)) return 'green';
  if (['idle', 'planned', 'pending'].includes(s)) return 'blue';
  if (['completed', 'done', 'approved', 'auto-approved'].includes(s)) return 'teal';
  if (['error', 'failed', 'rejected', 'dismissed'].includes(s)) return 'red';
  if (['queued', 'waiting'].includes(s)) return 'yellow';
  return 'gray';
}

// ─── Sorting & Pagination ──────────────────────────────────

function recSort(col) {
  if (_recSortCol === col) _recSortDir *= -1;
  else { _recSortCol = col; _recSortDir = 1; }
  renderRecTable();
}

function recPrevPage() {
  if (_recPage > 0) { _recPage--; renderRecTable(); }
}

function recNextPage() {
  _recPage++;
  renderRecTable();
}

// ─── Detail Panel (slide-in from right) ─────────────────────

function recOpenDetail(id) {
  const data = _getTabData(_recTab);
  const item = data.find(r => String(r.id) === String(id));
  if (!item) return;
  _recDetailItem = item;

  const panel = $('rec-detail-panel');
  const overlay = $('rec-detail-overlay');
  if (!panel || !overlay) return;

  panel.innerHTML = _recRenderDetail(item);
  panel.classList.add('rec-detail-open');
  overlay.classList.add('rec-detail-overlay-visible');
}

function recCloseDetail() {
  _recDetailItem = null;
  const panel = $('rec-detail-panel');
  const overlay = $('rec-detail-overlay');
  if (panel) panel.classList.remove('rec-detail-open');
  if (overlay) overlay.classList.remove('rec-detail-overlay-visible');
}

function _recRenderDetail(item) {
  const raw = item._raw || {};
  const tab = _recTab;

  let header = '';
  let sections = '';

  switch (tab) {
    case 'agents': {
      const a = raw;
      header = `<div class="rec-det-header"><span class="rec-det-avatar" style="border-color:${a.color || '#6c7086'}">${a.emoji || '🤖'}</span><div><div class="rec-det-title">${a.name || item.name}</div><div class="rec-det-subtitle">${a.role || ''}</div></div></div>`;
      sections = `
        <div class="rec-det-section">
          <div class="rec-det-section-title">Stats</div>
          <div class="rec-det-grid">
            ${_detField('Status', item.status)}
            ${_detField('Tasks Done', item.tasksDone)}
            ${_detField('Tokens Used', item.tokens)}
            ${_detField('Fitness', item.fitness + '%')}
            ${_detField('Files', a.files || 0)}
            ${_detField('Last Active', item.lastActive)}
          </div>
        </div>
        <div class="rec-det-section">
          <div class="rec-det-section-title">Capabilities</div>
          <div class="rec-det-tags">${(a.capabilities || a.tools || []).map(c => `<span class="rec-det-tag">${c}</span>`).join('') || '<span class="rec-cell-empty">—</span>'}</div>
        </div>
        <div class="rec-det-section">
          <div class="rec-det-section-title">Recent Tasks</div>
          ${_detRelatedTasks(a.id)}
        </div>
      `;
      break;
    }
    case 'tasks': {
      const t = raw;
      header = `<div class="rec-det-header"><div><div class="rec-det-title">${item.title}</div><div class="rec-det-subtitle">${item.agent}</div></div></div>`;
      sections = `
        <div class="rec-det-section">
          <div class="rec-det-section-title">Details</div>
          <div class="rec-det-grid">
            ${_detField('Status', item.status)}
            ${_detField('Priority', item.priority)}
            ${_detField('Agent', item.agent)}
            ${_detField('Created', item.created)}
            ${_detField('Duration', item.duration)}
            ${_detField('Progress', (t.progress || 0) + '%')}
          </div>
        </div>
        ${t.tags && t.tags.length ? `<div class="rec-det-section"><div class="rec-det-section-title">Tags</div><div class="rec-det-tags">${t.tags.map(tg => `<span class="rec-det-tag">${tg}</span>`).join('')}</div></div>` : ''}
        <div class="rec-det-section">
          <div class="rec-det-section-title">Raw Data</div>
          <pre class="rec-det-json">${JSON.stringify(t, null, 2)}</pre>
        </div>
      `;
      break;
    }
    case 'proposals': {
      const p = raw;
      header = `<div class="rec-det-header"><div><div class="rec-det-title">${item.title}</div><div class="rec-det-subtitle">Proposal from ${item.source}</div></div></div>`;
      sections = `
        <div class="rec-det-section">
          <div class="rec-det-section-title">Details</div>
          <div class="rec-det-grid">
            ${_detField('Status', item.status)}
            ${_detField('Priority', item.priority)}
            ${_detField('Confidence', item.confidence + '%')}
            ${_detField('Source', item.source)}
            ${_detField('Created', item.created)}
            ${_detField('Type', p.type || p._type || '—')}
          </div>
        </div>
        ${p.context ? `<div class="rec-det-section"><div class="rec-det-section-title">Context</div><div class="rec-det-text">${p.context}</div></div>` : ''}
        <div class="rec-det-section">
          <div class="rec-det-section-title">Raw Data</div>
          <pre class="rec-det-json">${JSON.stringify(p, null, 2)}</pre>
        </div>
      `;
      break;
    }
    case 'missions': {
      const m = raw;
      header = `<div class="rec-det-header"><div><div class="rec-det-title">${m.icon || '🎯'} ${m.title}</div><div class="rec-det-subtitle">${m.goal || ''}</div></div></div>`;
      sections = `
        <div class="rec-det-section">
          <div class="rec-det-section-title">Progress</div>
          <div class="rec-det-progress-big">
            <div class="rec-progress-bar rec-progress-bar-big"><div class="rec-progress-fill" style="width:${m.progress || 0}%"></div></div>
            <span>${m.progress || 0}%</span>
          </div>
        </div>
        <div class="rec-det-section">
          <div class="rec-det-section-title">Details</div>
          <div class="rec-det-grid">
            ${_detField('Status', item.status)}
            ${_detField('Tasks', item.tasks)}
            ${_detField('Days Active', item.daysActive)}
            ${_detField('Velocity', (m.velocity || 0) + '/day')}
            ${_detField('Agents', m.agents_active || 0)}
            ${_detField('Target Date', m.target_date || '—')}
          </div>
        </div>
      `;
      break;
    }
    case 'notes': {
      const n = raw;
      header = `<div class="rec-det-header"><div><div class="rec-det-title">📄 ${item.title}</div><div class="rec-det-subtitle">${item.folder}</div></div></div>`;
      sections = `
        <div class="rec-det-section">
          <div class="rec-det-section-title">Info</div>
          <div class="rec-det-grid">
            ${_detField('Modified', item.modified)}
            ${_detField('Links', item.links)}
            ${_detField('Type', n.type || '—')}
            ${_detField('Confidence', n.confidence ? n.confidence + '%' : '—')}
            ${_detField('Agent', n.agent || '—')}
          </div>
        </div>
        ${n.tags && n.tags.length ? `<div class="rec-det-section"><div class="rec-det-section-title">Tags</div><div class="rec-det-tags">${(Array.isArray(n.tags) ? n.tags : []).map(t => `<span class="rec-det-tag">${t}</span>`).join('')}</div></div>` : ''}
        <div class="rec-det-section">
          <button class="rec-btn rec-btn-accent" onclick="nav('mind');${typeof openVaultNote === 'function' ? `openVaultNote('${_escAttr(n.path || n.title)}')` : ''}">Open in Mind →</button>
        </div>
      `;
      break;
    }
    case 'services': {
      const s = raw;
      const running = item.status === 'running' || item.status === 'ok' || item.status === 'active';
      header = `<div class="rec-det-header"><div><div class="rec-det-title">⚙️ ${item.service}</div><div class="rec-det-subtitle">${item.type}</div></div></div>`;
      sections = `
        <div class="rec-det-section">
          <div class="rec-det-section-title">Status</div>
          <div class="rec-det-grid">
            ${_detField('Status', `<span class="rec-svc-dot ${running ? 'rec-svc-green' : 'rec-svc-red'}"></span> ${item.status}`)}
            ${_detField('Type', item.type)}
            ${s.Schedule || s.s ? _detField('Schedule', s.Schedule || s.s) : ''}
            ${s.Port ? _detField('Port', s.Port) : ''}
            ${s.Latency || s.l ? _detField('Latency', s.Latency || s.l) : ''}
          </div>
        </div>
      `;
      break;
    }
  }

  return `
    <div class="rec-det-close" onclick="recCloseDetail()">✕</div>
    ${header}
    ${sections}
  `;
}

function _detField(label, value) {
  return `<div class="rec-det-field"><span class="rec-det-field-label">${label}</span><span class="rec-det-field-value">${value ?? '—'}</span></div>`;
}

function _detRelatedTasks(agentId) {
  const tasks = Object.values(typeof BOARD_CARDS !== 'undefined' ? BOARD_CARDS : {}).flat().filter(c => c.agent === agentId).slice(0, 5);
  if (tasks.length === 0) return '<div class="rec-cell-empty">No recent tasks</div>';
  return `<div class="rec-det-related-list">${tasks.map(t => `<div class="rec-det-related-item"><span class="rec-pill rec-pill-${_statusClass(t.status || 'queued')}">${t.status || 'queued'}</span> ${t.title}</div>`).join('')}</div>`;
}

// ─── CSV Export ──────────────────────────────────────────────

function recExportCSV() {
  const cols = RECORDS_COLUMNS[_recTab] || [];
  let data = _getTabData(_recTab);

  if (_recSearch) {
    const q = _recSearch.toLowerCase();
    data = data.filter(r => cols.some(c => {
      const v = r[c.key];
      return v != null && v.toString().toLowerCase().includes(q);
    }));
  }

  const header = cols.map(c => c.label).join(',');
  const rows = data.map(r => cols.map(c => {
    let v = r[c.key];
    if (v == null) v = '';
    v = String(v).replace(/"/g, '""');
    return `"${v}"`;
  }).join(','));

  const csv = [header, ...rows].join('\n');

  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(csv).then(() => {
      if (typeof toast === 'function') toast(`📥 ${data.length} ${_recTab} rows copied as CSV`, 'success');
    }).catch(() => {
      _csvFallbackDownload(csv);
    });
  } else {
    _csvFallbackDownload(csv);
  }
}

function _csvFallbackDownload(csv) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `records-${_recTab}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  if (typeof toast === 'function') toast(`📥 Downloaded ${_recTab} CSV`, 'success');
}

// ─── Auto-refresh ──────────────────────────────────────────

function _recStartRefresh() {
  if (_recRefreshTimer) return;
  _recRefreshTimer = setInterval(async () => {
    if (typeof shouldPoll === 'function' && !shouldPoll()) return;
    if (typeof currentPage !== 'undefined' && currentPage !== 'records') { _recStopRefresh(); return; }
    await fetchRecordsData();
    renderRecTable();
    _recUpdateCounts();
  }, 20000);
}

function _recStopRefresh() {
  if (_recRefreshTimer) { clearInterval(_recRefreshTimer); _recRefreshTimer = null; }
}

// ─── Nav hook ──────────────────────────────────────────────

// Override the renderRecords from app4.js if it exists
// This will be called from the nav chain
