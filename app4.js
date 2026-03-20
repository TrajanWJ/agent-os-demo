/* Agent OS v7 — app4.js — Records + Pipelines + Roles */
'use strict';

// ═══════════════════════════════════════════════════════════
// PAGE REGISTRATION
// ═══════════════════════════════════════════════════════════

PAGE_TITLES.records = 'Records';
PAGE_TITLES.pipelines = 'Pipelines';
PAGE_TITLES.roles = 'Roles';

// ═══════════════════════════════════════════════════════════
// RECORDS PAGE — Universal Record Browser
// ═══════════════════════════════════════════════════════════

const RECORD_TYPES = [
  { id: 'agents',    label: '🤖 Agents',      icon: '🤖' },
  { id: 'tasks',     label: '📋 Tasks',       icon: '📋' },
  { id: 'missions',  label: '🎯 Missions',    icon: '🎯' },
  { id: 'vault',     label: '📄 Vault Notes', icon: '📄' },
  { id: 'proposals', label: '💡 Proposals',   icon: '💡' },
  { id: 'services',  label: '⚙️ Services',    icon: '⚙️' },
];

let recordsActiveTab = 'agents';
let recordsSearch = '';
let recordsSortCol = 'name';
let recordsSortDir = 1; // 1 = asc, -1 = desc
let recordsExpandedId = null;

function renderRecords() {
  const el = $('records-content');
  if (!el) return;

  el.innerHTML = `
    <div class="records-tabs" id="records-tabs">
      ${RECORD_TYPES.map(t => `
        <button class="records-tab${recordsActiveTab === t.id ? ' active' : ''}" data-type="${t.id}" onclick="switchRecordTab('${t.id}')">
          ${t.label}
        </button>
      `).join('')}
    </div>
    <div class="records-toolbar">
      <input type="text" class="records-search" id="records-search" placeholder="🔍 Search records..." value="${recordsSearch}" oninput="recordsSearch=this.value;renderRecordTable()">
      <div class="records-toolbar-actions">
        <button class="records-action-btn" onclick="exportRecords()">📥 Export</button>
        <button class="records-action-btn records-action-primary" onclick="createRecord()">+ New Record</button>
      </div>
    </div>
    <div class="records-table-wrap" id="records-table-wrap"></div>
  `;

  renderRecordTable();
}

function switchRecordTab(type) {
  recordsActiveTab = type;
  recordsExpandedId = null;
  recordsSearch = '';
  recordsSortCol = 'name';
  recordsSortDir = 1;
  $$('.records-tab').forEach(t => t.classList.toggle('active', t.dataset.type === type));
  const searchEl = $('records-search');
  if (searchEl) searchEl.value = '';
  renderRecordTable();
}

function getRecordsData(type) {
  const now = new Date();
  switch (type) {
    case 'agents':
      return AGENTS.map(a => ({
        id: a.id, name: `${a.emoji} ${a.name}`, status: a.status,
        agent: a.role, priority: '—', updated: 'Now',
        _raw: a,
        fields: { Role: a.role, Status: a.status, Tasks: a.tasks, Files: a.files, Tokens: a.tokens, Fitness: Math.round(a.fitness * 100) + '%', Color: a.color },
        timeline: [
          { time: '9:00 AM', text: `Status: ${a.status}`, type: 'status' },
          { time: '8:30 AM', text: a.task || 'Idle', type: 'task' },
        ],
        related: type === 'agents' ? getAgentRelated(a.id) : [],
      }));
    case 'tasks':
      return Object.entries(BOARD_CARDS).flatMap(([col, cards]) =>
        cards.map(c => {
          const ag = ga(c.agent) || { emoji: '🤖', name: c.agent || 'Unassigned' };
          return {
            id: c.id, name: c.title, status: col, agent: `${ag.emoji} ${ag.name}`,
            priority: c.priority || 'P3', updated: 'Today',
            _raw: c,
            fields: { Title: c.title, Status: col, Priority: c.priority, Agent: ag.name, Tags: (c.tags || []).join(', '), Progress: (c.progress || 0) + '%' },
            timeline: [{ time: 'Today', text: `In ${col}`, type: 'status' }],
            related: [],
          };
        })
      );
    case 'missions':
      return (typeof mcMissions !== 'undefined' && mcMissions.length > 0 ? mcMissions : MISSIONS_DATA).map(m => ({
        id: m.id, name: `${m.icon} ${m.title}`, status: m.status,
        agent: `${m.agents_active} agents`, priority: m.progress + '%', updated: m.days_active + 'd active',
        _raw: m,
        fields: { Title: m.title, Status: m.status, Progress: m.progress + '%', Goal: m.goal, 'Target Date': m.target_date, Velocity: m.velocity + '/d', 'Tasks Done': m.tasks_done + '/' + m.tasks_total },
        timeline: [
          { time: 'Now', text: `${m.agents_active} agents working`, type: 'status' },
          { time: m.days_active + 'd ago', text: 'Mission started', type: 'task' },
        ],
        related: getMissionRelated(m.id),
      }));
    case 'vault':
      return VAULT_NOTES.map(n => {
        const ag = ga(n.agent) || { emoji: '🤖', name: n.agent };
        return {
          id: n.id, name: n.title, status: n.type, agent: `${ag.emoji} ${ag.name}`,
          priority: n.confidence + '%', updated: n.date,
          _raw: n,
          fields: { Title: n.title, Type: n.type, Confidence: n.confidence + '%', Agent: ag.name, Date: n.date, Backlinks: n.backlinks, Tags: n.tags.join(', ') },
          timeline: [{ time: n.date, text: 'Note created', type: 'task' }],
          related: [],
        };
      });
    case 'proposals':
      return queueCards.map(q => {
        const src = getSourceAgent(q._source || q.agent);
        return {
          id: q.id, name: q.question || q.title || 'Untitled', status: q._status || 'pending',
          agent: `${src.emoji} ${src.name}`, priority: q._priority || 'P3', updated: timeAgo(q._createdAt) || 'Recently',
          _raw: q,
          fields: { Title: q.question || q.title, Status: q._status || 'pending', Priority: q._priority || 'P3', Source: src.name, Type: q._type || 'idea', Context: q.context || '' },
          timeline: [{ time: timeAgo(q._createdAt) || 'Now', text: 'Proposal created', type: 'task' }],
          related: [],
        };
      });
    case 'services':
      return [
        { id: 'svc-gateway', name: 'OpenClaw Gateway', status: 'running', agent: '⚙️ System', priority: '—', updated: 'Now', fields: { Service: 'openclaw-gateway', Port: '18789', Status: 'running' }, timeline: [], related: [] },
        { id: 'svc-oauth', name: 'OAuth Guardian', status: 'running', agent: '⚙️ System', priority: '—', updated: 'Now', fields: { Service: 'oauth-guardian', Status: 'running' }, timeline: [], related: [] },
        { id: 'svc-qmd', name: 'QMD Index', status: 'running', agent: '⚙️ System', priority: '—', updated: '30m ago', fields: { Service: 'qmd-cron', Schedule: '*/30 * * * *', Status: 'running' }, timeline: [], related: [] },
        ...CRONS.map(c => ({ id: 'cron-' + c.n.replace(/\s/g, '-'), name: c.n, status: c.ok ? 'ok' : 'error', agent: '⚙️ Cron', priority: '—', updated: 'Scheduled', fields: { Name: c.n, Schedule: c.s, Status: c.ok ? 'OK' : 'Error' }, timeline: [], related: [] })),
        ...HOOKS.map(h => ({ id: 'hook-' + h.n.replace(/\s/g, '-'), name: h.n, status: h.s, agent: '⚙️ Webhook', priority: '—', updated: h.l, fields: { Name: h.n, Status: h.s, Latency: h.l }, timeline: [], related: [] })),
      ];
    default: return [];
  }
}

function getAgentRelated(agentId) {
  const tasks = Object.values(BOARD_CARDS).flat().filter(c => c.agent === agentId).slice(0, 3);
  const notes = VAULT_NOTES.filter(n => n.agent === agentId).slice(0, 3);
  return [
    ...tasks.map(t => ({ type: 'Task', name: t.title, icon: '📋' })),
    ...notes.map(n => ({ type: 'Vault Note', name: n.title, icon: '📄' })),
  ];
}

function getMissionRelated(missionId) {
  const plansData = typeof mcPlans !== 'undefined' ? mcPlans : (typeof MISSION_PLANS_DATA !== 'undefined' ? MISSION_PLANS_DATA : []);
  const plans = plansData.filter(p => p.mission === missionId);
  return plans.map(p => ({ type: 'Plan', name: p.name, icon: '📋' }));
}

function renderRecordTable() {
  const wrap = $('records-table-wrap');
  if (!wrap) return;
  let data = getRecordsData(recordsActiveTab);

  // Search filter
  if (recordsSearch) {
    const q = recordsSearch.toLowerCase();
    data = data.filter(r => r.name.toLowerCase().includes(q) || r.status.toLowerCase().includes(q) || r.agent.toLowerCase().includes(q));
  }

  // Sort
  data.sort((a, b) => {
    const av = (a[recordsSortCol] || '').toString().toLowerCase();
    const bv = (b[recordsSortCol] || '').toString().toLowerCase();
    return av.localeCompare(bv) * recordsSortDir;
  });

  const columns = ['name', 'status', 'agent', 'priority', 'updated'];
  const colLabels = { name: 'Name', status: 'Status', agent: 'Agent', priority: 'Priority', updated: 'Updated' };

  wrap.innerHTML = `
    <table class="records-table">
      <thead>
        <tr>
          ${columns.map(c => `
            <th class="records-th${recordsSortCol === c ? ' sorted' : ''}" onclick="sortRecords('${c}')">
              ${colLabels[c]} ${recordsSortCol === c ? (recordsSortDir === 1 ? '▲' : '▼') : ''}
            </th>
          `).join('')}
          <th class="records-th records-th-actions">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${data.length === 0 ? '<tr><td colspan="6" class="records-empty">No records found</td></tr>' : ''}
        ${data.map(r => `
          <tr class="records-row${recordsExpandedId === r.id ? ' expanded' : ''}" onclick="toggleRecordExpand('${r.id}')">
            <td class="records-td records-td-name">${r.name}</td>
            <td class="records-td"><span class="records-status-badge records-status-${r.status}">${r.status}</span></td>
            <td class="records-td">${r.agent}</td>
            <td class="records-td">${r.priority}</td>
            <td class="records-td records-td-time">${r.updated}</td>
            <td class="records-td records-td-actions" onclick="event.stopPropagation()">
              <button class="records-row-action" onclick="editRecord('${r.id}')" title="Edit">✏️</button>
              <button class="records-row-action" onclick="archiveRecord('${r.id}')" title="Archive">🗑️</button>
              <button class="records-row-action" onclick="linkRecord('${r.id}')" title="Link">🔗</button>
              <button class="records-row-action" onclick="commentRecord('${r.id}')" title="Comment">💬</button>
            </td>
          </tr>
          ${recordsExpandedId === r.id ? renderRecordDetail(r) : ''}
        `).join('')}
      </tbody>
    </table>
  `;
}

function renderRecordDetail(r) {
  const fields = r.fields || {};
  const timeline = r.timeline || [];
  const related = r.related || [];
  return `
    <tr class="records-detail-row">
      <td colspan="6">
        <div class="records-detail">
          <div class="records-detail-left">
            <div class="records-detail-section-title">Fields</div>
            <div class="records-fields-grid">
              ${Object.entries(fields).map(([k, v]) => `
                <div class="records-field">
                  <span class="records-field-key">${k}</span>
                  <span class="records-field-value" contenteditable="true" onblur="updateRecordField('${r.id}','${k}',this.textContent)">${v}</span>
                </div>
              `).join('')}
            </div>
          </div>
          <div class="records-detail-right">
            <div class="records-detail-section-title">Timeline</div>
            <div class="records-timeline">
              ${timeline.length === 0 ? '<div class="records-timeline-empty">No events</div>' : ''}
              ${timeline.map(ev => `
                <div class="records-timeline-item">
                  <span class="records-tl-dot"></span>
                  <span class="records-tl-time">${ev.time}</span>
                  <span class="records-tl-text">${ev.text}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        ${related.length > 0 ? `
          <div class="records-related">
            <div class="records-detail-section-title">Related Records</div>
            <div class="records-related-items">
              ${related.map(rel => `
                <span class="records-related-chip">${rel.icon} ${rel.type}: ${rel.name}</span>
              `).join('')}
            </div>
          </div>
        ` : ''}
      </td>
    </tr>
  `;
}

function sortRecords(col) {
  if (recordsSortCol === col) recordsSortDir *= -1;
  else { recordsSortCol = col; recordsSortDir = 1; }
  renderRecordTable();
}

function toggleRecordExpand(id) {
  recordsExpandedId = recordsExpandedId === id ? null : id;
  renderRecordTable();
}

function editRecord(id) { toast('✏️ Editing record: ' + id, 'info'); }
function archiveRecord(id) { toast('🗑️ Archived: ' + id, 'success'); }
function linkRecord(id) { toast('🔗 Link record: ' + id, 'info'); }
function commentRecord(id) {
  const comment = prompt('Add comment:');
  if (comment) toast('💬 Comment added', 'success');
}
function exportRecords() { toast('📥 Exporting records as CSV...', 'info'); }
function createRecord() { toast('+ New record creation coming soon', 'info'); }
function updateRecordField(id, key, value) { /* save to localStorage or bridge */ }


// ═══════════════════════════════════════════════════════════
// PIPELINES PAGE — Visual Workflow Pipelines
// ═══════════════════════════════════════════════════════════

const PIPELINE_TYPES = [
  { id: 'tasks',     label: '📋 Task Pipeline' },
  { id: 'proposals', label: '💡 Proposal Pipeline' },
  { id: 'missions',  label: '🎯 Mission Pipeline' },
  { id: 'capacity',  label: '🤖 Agent Capacity' },
];

const TASK_PIPELINE_STAGES = [
  { id: 'inbox',      label: '📥 Inbox',       color: '#6c7086' },
  { id: 'inprogress', label: '🔨 In Progress', color: '#f9e2af' },
  { id: 'done',       label: '✅ Done',        color: '#a6e3a1' },
];

const PROPOSAL_PIPELINE_STAGES = [
  { id: 'generated',    label: '💡 Generated',      color: '#cba6f7' },
  { id: 'triaged',      label: '🔍 Triaged',        color: '#89b4fa' },
  { id: 'auto_approved',label: '⚡ Auto-Approved',   color: '#a6e3a1' },
  { id: 'needs_decision',label: '🧑 Needs Decision', color: '#fab387' },
  { id: 'resolved',     label: '✅ Resolved',        color: '#a6e3a1' },
];

const MISSION_PIPELINE_STAGES = [
  { id: 'planning',  label: '🌱 Planning',  color: '#94e2d5' },
  { id: 'active',    label: '🚀 Active',    color: '#89b4fa' },
  { id: 'climbing',  label: '🏔️ Climbing',  color: '#f9e2af' },
  { id: 'downhill',  label: '⛰️ Downhill',  color: '#fab387' },
  { id: 'complete',  label: '🏁 Complete',  color: '#a6e3a1' },
];

let pipelinesActiveTab = 'tasks';
let pipelineDragItem = null;
let _pipelinesRefreshTimer = null;
let _pipelineLiveData = { queue: null, active: null, done: null, failed: null, proposals: null, missions: null };

async function fetchPipelineData() {
  if (typeof Bridge === 'undefined' || !Bridge.liveMode) return false;
  try {
    const [queue, active, done, failed, proposals, missions] = await Promise.all([
      Bridge.apiFetch('/api/tasks/queue').catch(() => null),
      Bridge.apiFetch('/api/tasks/active').catch(() => null),
      Bridge.apiFetch('/api/tasks/done?limit=10').catch(() => null),
      Bridge.apiFetch('/api/tasks/failed').catch(() => null),
      Bridge.getProposals('all').catch(() => null),
      Bridge.apiFetch('/api/missions').catch(() => null),
    ]);
    _pipelineLiveData = { queue, active, done, failed, proposals, missions };
    return true;
  } catch (e) {
    console.warn('[Pipelines] Bridge load failed:', e.message);
    return false;
  }
}

function renderPipelines() {
  const el = $('pipelines-content');
  if (!el) return;

  el.innerHTML = `
    <div class="pipelines-tabs" id="pipelines-tabs">
      ${PIPELINE_TYPES.map(t => `
        <button class="pipelines-tab${pipelinesActiveTab === t.id ? ' active' : ''}" onclick="switchPipelineTab('${t.id}')">${t.label}</button>
      `).join('')}
    </div>
    <div class="pipelines-body" id="pipelines-body"></div>
  `;

  // Fetch live data then render
  fetchPipelineData().then(() => renderPipelineBody());
  startPipelinesRefresh();
}

function switchPipelineTab(type) {
  pipelinesActiveTab = type;
  $$('.pipelines-tab').forEach(t => t.classList.toggle('active', t.textContent.includes(PIPELINE_TYPES.find(p => p.id === type)?.label.split(' ').pop())));
  renderPipelines();
}

function renderPipelineBody() {
  const body = $('pipelines-body');
  if (!body) return;

  switch (pipelinesActiveTab) {
    case 'tasks': renderTaskPipeline(body); break;
    case 'proposals': renderProposalPipeline2(body); break;
    case 'missions': renderMissionPipeline(body); break;
    case 'capacity': renderCapacityPipeline(body); break;
  }
}

function startPipelinesRefresh() {
  if (_pipelinesRefreshTimer) return;
  _pipelinesRefreshTimer = setInterval(async () => {
    if (!shouldPoll()) return;
    if (currentPage !== 'pipelines') { stopPipelinesRefresh(); return; }
    const updated = await fetchPipelineData();
    if (updated) renderPipelineBody();
  }, 15000);
}

function stopPipelinesRefresh() {
  if (_pipelinesRefreshTimer) { clearInterval(_pipelinesRefreshTimer); _pipelinesRefreshTimer = null; }
}

function renderTaskPipeline(body) {
  const liveQueue = _pipelineLiveData.queue;
  const liveActive = _pipelineLiveData.active;
  const liveDone = _pipelineLiveData.done;
  const liveFailed = _pipelineLiveData.failed;
  const isLoading = !liveQueue && !liveActive && !liveDone && (typeof Bridge !== 'undefined' && Bridge.liveMode);

  const stageCards = {};
  TASK_PIPELINE_STAGES.forEach(s => stageCards[s.id] = []);

  if (liveQueue || liveActive || liveDone) {
    (liveQueue || []).forEach(t => {
      stageCards.inbox.push({
        id: t.id, title: t.title || t.task || t.description || 'Untitled', agent: t.agent || '',
        priority: t.priority || 'P3', tags: [], _raw: t,
        _timeInStage: timeAgoShort(t.created_at || t.created),
      });
    });
    (liveActive || []).forEach(t => {
      stageCards.inprogress.push({
        id: t.id, title: t.title || t.task || t.description || 'Untitled', agent: t.agent || '',
        priority: t.priority || 'P3', tags: [], progress: t.progress, _raw: t,
        _timeInStage: timeAgoShort(t.started_at || t.created_at || t.created),
      });
    });
    (liveDone || []).slice(0, 10).forEach(t => {
      stageCards.done.push({
        id: t.id, title: t.title || t.task || t.description || 'Untitled', agent: t.agent || '',
        priority: t.priority || 'P3', tags: [], _raw: t,
        _timeInStage: timeAgoShort(t.completed_at || t.created_at),
      });
    });
  } else if (!isLoading) {
    // Fallback to static BOARD_CARDS
    const stageMap = { inbox: 'inbox', queued: 'inbox', active: 'inprogress', review: 'inprogress', done: 'done' };
    if (typeof BOARD_CARDS !== 'undefined') {
      Object.entries(BOARD_CARDS).forEach(([col, cards]) => {
        const stageId = stageMap[col] || 'inbox';
        cards.forEach(c => stageCards[stageId].push(c));
      });
    }
  }

  const failedCards = (liveFailed || []).map(t => ({
    id: t.id, title: t.title || t.task || t.description || 'Untitled', agent: t.agent || '',
    priority: t.priority || 'P3', tags: [], _raw: t, _failed: true,
    _timeInStage: timeAgoShort(t.failed_at || t.created_at),
  }));

  const skeletonCards = `
    <div class="skeleton-card" style="padding:10px 12px;margin-bottom:6px">
      <div class="skeleton skeleton-line long" style="height:14px;margin-bottom:8px"></div>
      <div class="skeleton skeleton-line short" style="height:10px"></div>
    </div>`.repeat(3);

  const emptyMsg = `<div style="padding:20px 12px;text-align:center;color:var(--text-muted);font-size:12px">No items</div>`;

  body.innerHTML = `
    <div class="pipeline-stages">
      ${TASK_PIPELINE_STAGES.map(stage => {
        const cards = stageCards[stage.id] || [];
        return `
        <div class="pipeline-stage-col" data-stage="${stage.id}"
          ondragover="event.preventDefault();this.classList.add('drag-over')"
          ondragleave="this.classList.remove('drag-over')"
          ondrop="pipelineDrop(event,'${stage.id}','tasks')">
          <div class="pipeline-stage-header" style="border-top: 3px solid ${stage.color}">
            <span>${stage.label}</span>
            <span class="pipeline-stage-count">${isLoading ? '…' : cards.length}</span>
          </div>
          <div class="pipeline-cards">
            ${isLoading ? skeletonCards : (cards.length === 0 ? emptyMsg : cards.map(c => renderPipelineCard(c, 'tasks')).join(''))}
          </div>
        </div>`;
      }).join('')}
    </div>
    ${failedCards.length > 0 ? `
      <div style="margin-top:16px">
        <div style="font-size:13px;font-weight:700;color:var(--red);margin-bottom:8px;padding:0 4px">❌ Failed (${failedCards.length})</div>
        <div class="pipeline-stages" style="display:flex;flex-wrap:wrap;gap:8px">
          ${failedCards.map(c => `
            <div class="pipeline-card pipeline-card-failed" style="border-left:3px solid var(--red);background:rgba(243,139,168,0.06);flex:0 0 calc(50% - 4px);cursor:grab"
              onclick="togglePipelineCardDetail(this)" data-ctx-type="task" data-ctx-id="${c.id || ''}">
              <div class="pipeline-card-title" style="color:var(--red)">${c.title}</div>
              <div class="pipeline-card-meta">
                ${(() => { const ag = ga(c.agent) || { emoji: '⬜', color: '#6c7086', name: c.agent || 'unknown' }; return `<span class="pipeline-card-agent" style="border-color:${ag.color}">${ag.emoji}</span><span style="font-size:11px;color:var(--text-dim)">${ag.name || c.agent}</span>`; })()}
                <span class="pipeline-card-priority ${String(c.priority || 'P3').toLowerCase()}">${c.priority || 'P3'}</span>
                ${c._timeInStage ? `<span style="font-size:10px;color:var(--text-muted);margin-left:auto">${c._timeInStage}</span>` : ''}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}
  `;
}

function timeAgoShort(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + 'm';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h';
  return Math.floor(hrs / 24) + 'd';
}

function renderProposalPipeline2(body) {
  const stageCards = {};
  PROPOSAL_PIPELINE_STAGES.forEach(s => stageCards[s.id] = []);
  
  const liveProposals = _pipelineLiveData.proposals;
  const isLoading = !liveProposals && (typeof Bridge !== 'undefined' && Bridge.liveMode);
  const proposals = liveProposals || (typeof queueCards !== 'undefined' ? queueCards : []);
  
  proposals.forEach(q => {
    const status = q.status || q._status || 'pending';
    const verdict = q.triage_verdict || q._triageVerdict || '';
    
    if (status === 'approved' || status === 'rejected' || status === 'auto-approved' || status === 'dismissed') {
      stageCards.resolved.push(q);
    } else if (verdict === 'auto-execute') {
      stageCards.auto_approved.push(q);
    } else if (verdict === 'escalate' || status === 'pending') {
      stageCards.needs_decision.push(q);
    } else if (verdict) {
      stageCards.triaged.push(q);
    } else {
      stageCards.generated.push(q);
    }
  });

  const skeletonCards = `
    <div class="skeleton-card" style="padding:10px 12px;margin-bottom:6px">
      <div class="skeleton skeleton-line long" style="height:14px;margin-bottom:8px"></div>
      <div class="skeleton skeleton-line short" style="height:10px"></div>
    </div>`.repeat(2);

  const emptyMsg = `<div style="padding:20px 12px;text-align:center;color:var(--text-muted);font-size:12px">No items</div>`;

  body.innerHTML = `
    <div class="pipeline-stages">
      ${PROPOSAL_PIPELINE_STAGES.map(stage => {
        const cards = stageCards[stage.id] || [];
        return `
        <div class="pipeline-stage-col" data-stage="${stage.id}">
          <div class="pipeline-stage-header" style="border-top: 3px solid ${stage.color}">
            <span>${stage.label}</span>
            <span class="pipeline-stage-count">${isLoading ? '…' : cards.length}</span>
          </div>
          <div class="pipeline-cards">
            ${isLoading ? skeletonCards : (cards.length === 0 ? emptyMsg : cards.map(q => {
              const srcId = q.source || q._source || q.agent || 'righthand';
              const src = typeof getSourceAgent === 'function' ? getSourceAgent(srcId) : { emoji: '🤖', name: srcId };
              return `
                <div class="pipeline-card" onclick="togglePipelineCardDetail(this)" data-ctx-type="task" data-ctx-id="${q.id || ''}">
                  <div class="pipeline-card-title">${(q.title || q.question || 'Untitled').substring(0, 50)}</div>
                  <div class="pipeline-card-meta">
                    <span class="pipeline-card-agent">${src.emoji}</span>
                    <span style="font-size:11px;color:var(--text-dim)">${src.name || srcId}</span>
                    <span class="pipeline-card-priority">${q.priority || q._priority || 'P3'}</span>
                    ${q.triage_verdict || q._triageVerdict ? `<span style="font-size:10px;color:var(--text-muted);margin-left:auto">${q.triage_verdict || q._triageVerdict}</span>` : ''}
                  </div>
                </div>
              `;
            }).join(''))}
          </div>
        </div>`;
      }).join('')}
    </div>
  `;
}

function renderMissionPipeline(body) {
  // Use real mission data if available
  const missions = (_pipelineLiveData.missions && _pipelineLiveData.missions.length > 0)
    ? _pipelineLiveData.missions
    : (typeof mcMissions !== 'undefined' && mcMissions.length > 0 ? mcMissions : MISSIONS_DATA);

  // Assign missions to stages based on progress
  const stageCards = {};
  MISSION_PIPELINE_STAGES.forEach(s => stageCards[s.id] = []);
  missions.forEach(m => {
    if (m.status === 'completed') stageCards.complete.push(m);
    else if (m.status === 'planned') stageCards.planning.push(m);
    else if (m.progress >= 70) stageCards.downhill.push(m);
    else if (m.progress >= 30) stageCards.climbing.push(m);
    else stageCards.active.push(m);
  });

  body.innerHTML = `
    <div class="pipeline-hill-chart" id="pipeline-hill-chart"></div>
    <div class="pipeline-stages">
      ${MISSION_PIPELINE_STAGES.map(stage => `
        <div class="pipeline-stage-col" data-stage="${stage.id}">
          <div class="pipeline-stage-header" style="border-top: 3px solid ${stage.color}">
            <span>${stage.label}</span>
            <span class="pipeline-stage-count">${(stageCards[stage.id] || []).length}</span>
          </div>
          <div class="pipeline-cards">
            ${(stageCards[stage.id] || []).map(m => `
              <div class="pipeline-card pipeline-card-mission" onclick="selectMCMission('${m.id}');nav('missions')">
                <div class="pipeline-card-title">${m.icon || '🎯'} ${m.title}</div>
                <div class="pipeline-card-meta">
                  <span>${m.progress}%</span>
                  <span>${m.agents_active || 0} agents</span>
                </div>
                <div class="pipeline-card-bar">
                  <div class="pipeline-card-bar-fill" style="width:${m.progress}%;background:${stage.color}"></div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;

  // Render hill chart SVG with real data
  setTimeout(() => renderHillChart(missions), 50);
}

function renderHillChart(missionsInput) {
  const container = $('pipeline-hill-chart');
  if (!container) return;

  const missionSource = missionsInput
    || (_pipelineLiveData.missions && _pipelineLiveData.missions.length > 0 ? _pipelineLiveData.missions : null)
    || (typeof mcMissions !== 'undefined' && mcMissions.length > 0 ? mcMissions : MISSIONS_DATA);

  const W = container.clientWidth || 700;
  const H = 200;
  const pad = 40;

  // Hill curve: quadratic bezier — peak in the middle
  const hillStartX = pad;
  const hillEndX = W - pad;
  const hillPeakX = W / 2;
  const hillBaseY = H - 30;
  const hillPeakY = 30;

  // Build SVG path
  const pathD = `M ${hillStartX} ${hillBaseY} Q ${hillPeakX} ${hillPeakY * 2 - hillBaseY} ${hillEndX} ${hillBaseY}`;

  // Place missions on the hill
  const activeMissions = missionSource.filter(m => m.status !== 'completed' && m.status !== 'planned');
  const dots = activeMissions.map(m => {
    // Map progress 0-100 to position along the curve
    const t = m.progress / 100;
    // Quadratic bezier: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
    const p0x = hillStartX, p0y = hillBaseY;
    const p1x = hillPeakX, p1y = hillPeakY * 2 - hillBaseY;
    const p2x = hillEndX, p2y = hillBaseY;
    const x = (1 - t) * (1 - t) * p0x + 2 * (1 - t) * t * p1x + t * t * p2x;
    const y = (1 - t) * (1 - t) * p0y + 2 * (1 - t) * t * p1y + t * t * p2y;
    return { ...m, cx: x, cy: y };
  });

  container.innerHTML = `
    <svg width="${W}" height="${H}" class="hill-chart-svg">
      <!-- Hill curve -->
      <path d="${pathD}" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6,4"/>
      <!-- Labels -->
      <text x="${W * 0.25}" y="${H - 8}" fill="var(--text-muted)" font-size="11" text-anchor="middle">Figuring it out</text>
      <text x="${W * 0.75}" y="${H - 8}" fill="var(--text-muted)" font-size="11" text-anchor="middle">Making it happen</text>
      <!-- Peak marker -->
      <line x1="${W / 2}" y1="20" x2="${W / 2}" y2="${H - 25}" stroke="var(--border)" stroke-width="1" stroke-dasharray="3,3" opacity="0.4"/>
      <!-- Dots -->
      ${dots.map(d => `
        <g class="hill-dot-group" onclick="selectMCMission('${d.id}');nav('missions')" style="cursor:pointer">
          <circle cx="${d.cx}" cy="${d.cy}" r="10" fill="${d.status === 'active' ? 'var(--accent2)' : 'var(--text-muted)'}" stroke="var(--bg-base)" stroke-width="2"/>
          <text x="${d.cx}" y="${d.cy - 16}" fill="var(--text)" font-size="10" text-anchor="middle" font-weight="600">${d.icon}</text>
          <text x="${d.cx}" y="${d.cy + 24}" fill="var(--text-dim)" font-size="9" text-anchor="middle">${d.title.substring(0, 18)}</text>
        </g>
      `).join('')}
    </svg>
  `;
}

function renderCapacityPipeline(body) {
  const maxConcurrent = 5; // max tasks per agent
  
  // Use live active tasks if available, else BOARD_CARDS
  const liveActive = _pipelineLiveData.active;
  const liveQueue = _pipelineLiveData.queue;
  const allLiveTasks = [...(liveActive || []), ...(liveQueue || [])];
  const hasLive = allLiveTasks.length > 0;

  body.innerHTML = `
    <div class="capacity-grid">
      ${AGENTS.map(a => {
        let assignedTasks;
        if (hasLive) {
          assignedTasks = allLiveTasks.filter(t => (t.agent || '').toLowerCase() === a.id || (t.agent || '').toLowerCase() === a.name.toLowerCase());
        } else {
          assignedTasks = Object.values(BOARD_CARDS).flat().filter(c => c.agent === a.id);
        }
        const load = assignedTasks.length;
        const utilization = Math.round((load / maxConcurrent) * 100);
        const barColor = utilization > 80 ? 'var(--red)' : utilization > 50 ? 'var(--yellow)' : 'var(--green)';
        const statusDot = a.status === 'active' ? 'var(--green)' : 'var(--text-muted)';
        return `
          <div class="capacity-card" data-ctx-type="agent" data-ctx-id="${a.id}" style="cursor:pointer">
            <div class="capacity-card-header">
              <span class="capacity-agent-avatar" style="border-color:${a.color}">${a.emoji}</span>
              <div class="capacity-agent-info">
                <div class="capacity-agent-name entity-link entity-agent" style="color:${a.color}" onclick="event.stopPropagation();goToEntity('agent','${a.id}','${a.name}')">${a.name}</div>
                <div class="capacity-agent-role">${a.role}</div>
              </div>
              <span class="capacity-status-dot" style="background:${statusDot}"></span>
            </div>
            <div class="capacity-bar-wrap">
              <div class="capacity-bar-track">
                <div class="capacity-bar-fill" style="width:${Math.min(100, utilization)}%;background:${barColor}"></div>
              </div>
              <span class="capacity-bar-label">${load}/${maxConcurrent}</span>
            </div>
            <div class="capacity-utilization" style="color:${barColor}">${utilization}% utilized</div>
            <div class="capacity-tasks">
              ${assignedTasks.slice(0, 3).map(t => `<div class="capacity-task-item">${(t.title || t.task || t.description || 'Untitled').substring(0, 30)}</div>`).join('')}
              ${assignedTasks.length > 3 ? `<div class="capacity-task-more">+${assignedTasks.length - 3} more</div>` : ''}
              ${assignedTasks.length === 0 ? '<div class="capacity-task-empty">No tasks assigned</div>' : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderPipelineCard(card, type) {
  const ag = ga(card.agent) || { emoji: '⬜', color: '#6c7086', name: card.agent || '' };
  const agName = ag.name || card.agent || '';
  const timeInStage = card._timeInStage || '';
  return `
    <div class="pipeline-card" draggable="true"
      ondragstart="pipelineDragStart(event,'${card.id}')"
      onclick="togglePipelineCardDetail(this)"
      data-ctx-type="task" data-ctx-id="${card.id || ''}">
      <div class="pipeline-card-title">${card.title || 'Untitled'}</div>
      <div class="pipeline-card-meta">
        <span class="pipeline-card-agent" style="border-color:${ag.color}">${ag.emoji}</span>
        <span style="font-size:11px;color:var(--text-dim)">${agName}</span>
        <span class="pipeline-card-priority ${String(card.priority || 'P3').toLowerCase()}">${card.priority || 'P3'}</span>
        ${timeInStage ? `<span style="font-size:10px;color:var(--text-muted);margin-left:auto">${timeInStage}</span>` : ''}
      </div>
    </div>
  `;
}

function pipelineDragStart(e, cardId) {
  pipelineDragItem = cardId;
  e.dataTransfer.effectAllowed = 'move';
}

function pipelineDrop(e, stageId, pipelineType) {
  e.preventDefault();
  e.currentTarget.classList.remove('drag-over');
  if (!pipelineDragItem) return;
  toast(`Moved card to ${stageId}`, 'success');
  // In a real app, POST /api/pipeline/:type/:id/advance
  pipelineDragItem = null;
  renderPipelineBody();
}

function togglePipelineCardDetail(el) {
  el.classList.toggle('pipeline-card-expanded');
}


// ═══════════════════════════════════════════════════════════
// ROLES PAGE — Agent Configuration Center
// ═══════════════════════════════════════════════════════════

const AGENT_CAP_MATRIX = {
  code:   { label: 'Code',   icon: '💻', perms: ['read', 'write', 'execute'] },
  vault:  { label: 'Vault',  icon: '📚', perms: ['read', 'write'] },
  web:    { label: 'Web',    icon: '🌐', perms: ['search', 'fetch', 'browse'] },
  system: { label: 'System', icon: '⚙️', perms: ['exec', 'services', 'cron'] },
  comms:  { label: 'Comms',  icon: '💬', perms: ['discord', 'telegram'] },
};

const AUTONOMY_LEVELS = [
  { value: 0, label: 'Observer',  icon: '👁️', desc: 'Read only, no actions. Agent observes and logs but never acts autonomously.', color: '#6c7086' },
  { value: 1, label: 'Suggest',   icon: '💡', desc: 'Proposes actions, waits for approval. Agent drafts plans but never executes without sign-off.', color: '#89b4fa' },
  { value: 2, label: 'Confirm',   icon: '✋', desc: 'Acts on low-risk tasks, asks for high-risk. Balanced autonomy with human oversight on important decisions.', color: '#f9e2af' },
  { value: 3, label: 'Auto',      icon: '⚡', desc: 'Acts on everything, reports after. Full execution with post-hoc reporting. Escalates only on errors.', color: '#fab387' },
  { value: 4, label: 'Autopilot', icon: '🚀', desc: 'Full autonomy, minimal reporting. Agent handles everything end-to-end with minimal interruptions.', color: '#a6e3a1' },
];

const DEFAULT_OVERRIDES = [
  'Deleting files or data',
  'Spending > 10K tokens on a single task',
  'Modifying system configurations',
  'Sending external communications',
  'Deploying to production',
];

const DEFAULT_ESCALATION_TRIGGERS = [
  'Confidence drops below 40%',
  'Task exceeds budget by 2x',
  'Error rate > 3 consecutive failures',
  'Security-sensitive operations detected',
  'Cross-agent dependency conflict',
];

// Per-agent config (persisted to localStorage)
let agentConfigs = JSON.parse(localStorage.getItem('agent-os-agent-configs') || 'null') || {};
let selectedAgentId = AGENTS[0]?.id || null;
let activeAgentTab = 'overview';

// Generate simulated history for agents
const AGENT_HISTORY = {};
AGENTS.forEach(a => {
  const tasks = [];
  const proposals = [];
  const errors = [];
  const taskNames = [
    'Code review for dispatch engine', 'Vault indexing batch', 'Security scan results',
    'API endpoint audit', 'Competitive analysis report', 'Prompt template optimization',
    'Infrastructure health check', 'Knowledge graph update', 'Red team analysis v5.1',
    'Morning coordination batch', 'Token budget rebalance', 'Backlinker deployment',
  ];
  const proposalNames = [
    'Increase parallel dispatch limit to 5', 'Rotate API keys quarterly',
    'Add circuit breaker to dispatch', 'Refactor session watchdog to multi-thread',
    'Switch to streaming progress UI', 'Implement memory compaction v2',
  ];
  const errorTypes = [
    'Connection timeout on port 8484', 'Rate limit exceeded (429)',
    'Token budget overflow', 'Session heartbeat missed', 'Vault sync conflict',
  ];
  for (let i = 0; i < 5 + Math.floor(Math.random() * 6); i++) {
    tasks.push({
      name: taskNames[Math.floor(Math.random() * taskNames.length)],
      time: `${7 + Math.floor(Math.random() * 3)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')} AM`,
      status: Math.random() > 0.2 ? 'completed' : 'failed',
      tokens: Math.floor(500 + Math.random() * 5000),
    });
  }
  for (let i = 0; i < Math.floor(Math.random() * 4); i++) {
    proposals.push({
      name: proposalNames[Math.floor(Math.random() * proposalNames.length)],
      time: `${8 + Math.floor(Math.random() * 2)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')} AM`,
      status: ['pending', 'approved', 'rejected'][Math.floor(Math.random() * 3)],
    });
  }
  for (let i = 0; i < Math.floor(Math.random() * 3); i++) {
    errors.push({
      message: errorTypes[Math.floor(Math.random() * errorTypes.length)],
      time: `${6 + Math.floor(Math.random() * 4)}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')} AM`,
      severity: Math.random() > 0.5 ? 'error' : 'warn',
    });
  }
  AGENT_HISTORY[a.id] = { tasks, proposals, errors };
});

// Sparkline data per agent (last 7 days task count)
const AGENT_SPARKLINES = {};
AGENTS.forEach(a => {
  AGENT_SPARKLINES[a.id] = Array.from({ length: 7 }, () => Math.floor(Math.random() * 8) + 1);
});

function getAgentConfig(agentId) {
  if (!agentConfigs[agentId]) {
    // Generate defaults based on agent
    const caps = {};
    Object.keys(AGENT_CAP_MATRIX).forEach(cat => {
      caps[cat] = {};
      AGENT_CAP_MATRIX[cat].perms.forEach(p => {
        caps[cat][p] = false;
      });
    });
    // Set sensible defaults per agent
    if (agentId === 'righthand') {
      caps.vault.read = true; caps.vault.write = true;
      caps.web.search = true; caps.web.fetch = true;
      caps.comms.discord = true; caps.comms.telegram = true;
    } else if (agentId === 'coder') {
      caps.code.read = true; caps.code.write = true; caps.code.execute = true;
      caps.vault.read = true; caps.system.exec = true;
    } else if (agentId === 'researcher') {
      caps.web.search = true; caps.web.fetch = true; caps.web.browse = true;
      caps.vault.read = true; caps.vault.write = true;
    } else if (agentId === 'ops') {
      caps.system.exec = true; caps.system.services = true; caps.system.cron = true;
      caps.vault.read = true;
    } else if (agentId === 'devil') {
      caps.code.read = true; caps.vault.read = true;
    } else if (agentId === 'utility') {
      caps.vault.read = true; caps.vault.write = true;
      caps.web.search = true; caps.web.fetch = true;
    }
    agentConfigs[agentId] = {
      capabilities: caps,
      autonomy: agentId === 'righthand' ? 3 : agentId === 'coder' ? 2 : agentId === 'devil' ? 0 : 1,
      overrides: DEFAULT_OVERRIDES.slice(0, 3).map((text, i) => ({ text, enabled: i < 2 })),
      escalationTriggers: DEFAULT_ESCALATION_TRIGGERS.slice(0, 3).map((text, i) => ({ text, enabled: i < 2 })),
    };
  }
  return agentConfigs[agentId];
}

function saveAgentConfigs() {
  localStorage.setItem('agent-os-agent-configs', JSON.stringify(agentConfigs));
}

function renderRoles() {
  const el = $('roles-content');
  if (!el) return;

  el.innerHTML = `
    <div class="acenter-layout">
      <div class="acenter-list" id="acenter-list"></div>
      <div class="acenter-detail" id="acenter-detail"></div>
    </div>
  `;

  renderAgentList();
  if (selectedAgentId) renderAgentDetail(selectedAgentId);
}

function renderAgentList() {
  const list = $('acenter-list');
  if (!list) return;

  const activeTasks = FEED_EVENTS.filter(e => e.type === 'task_started');

  list.innerHTML = `
    <div class="acenter-list-header">
      <span class="acenter-list-title">Agents</span>
      <span class="acenter-list-count">${AGENTS.length}</span>
    </div>
    <div class="acenter-list-items" id="acenter-list-items">
      ${AGENTS.map(a => {
        const isSelected = selectedAgentId === a.id;
        const taskCount = (AGENT_HISTORY[a.id]?.tasks || []).length;
        const statusClass = a.status === 'active' ? 'status-active' : 'status-idle';
        return `
          <div class="acenter-agent-card${isSelected ? ' selected' : ''}" onclick="selectAgent('${a.id}')" style="${isSelected ? `border-color:${a.color}` : ''}">
            <div class="acenter-agent-card-left">
              <span class="acenter-agent-emoji">${a.emoji}</span>
              <div class="acenter-agent-info">
                <div class="acenter-agent-name">${a.name}</div>
                <div class="acenter-agent-role">${a.role}</div>
              </div>
            </div>
            <div class="acenter-agent-card-right">
              <span class="acenter-agent-tasks">${taskCount}</span>
              <span class="acenter-status-dot ${statusClass}"></span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
    <button class="acenter-add-btn" onclick="toast('Agent creation coming soon','info')">+ Add Agent</button>
  `;
}

function selectAgent(agentId) {
  selectedAgentId = agentId;
  activeAgentTab = 'overview';
  renderAgentList();
  renderAgentDetail(agentId);
}

function setAgentTab(tab) {
  activeAgentTab = tab;
  renderAgentDetail(selectedAgentId);
}

function renderAgentDetail(agentId) {
  const panel = $('acenter-detail');
  if (!panel) return;
  const agent = AGENTS.find(a => a.id === agentId);
  if (!agent) { panel.innerHTML = '<div class="acenter-empty">Select an agent</div>'; return; }

  const config = getAgentConfig(agentId);
  const tabs = ['overview', 'capabilities', 'autonomy', 'history'];

  panel.innerHTML = `
    <div class="acenter-tabs">
      ${tabs.map(t => `
        <button class="acenter-tab${activeAgentTab === t ? ' active' : ''}" onclick="setAgentTab('${t}')">${
          t === 'overview' ? '📊 Overview' :
          t === 'capabilities' ? '🔑 Capabilities' :
          t === 'autonomy' ? '🎚️ Autonomy' : '📜 History'
        }</button>
      `).join('')}
    </div>
    <div class="acenter-tab-content" id="acenter-tab-content"></div>
  `;

  const content = $('acenter-tab-content');
  if (activeAgentTab === 'overview') renderOverviewTab(content, agent, config);
  else if (activeAgentTab === 'capabilities') renderCapabilitiesTab(content, agent, config);
  else if (activeAgentTab === 'autonomy') renderAutonomyTab(content, agent, config);
  else if (activeAgentTab === 'history') renderHistoryTab(content, agent);
}

function renderOverviewTab(el, agent, config) {
  const sparkData = AGENT_SPARKLINES[agent.id] || [0,0,0,0,0,0,0];
  const maxSpark = Math.max(...sparkData, 1);
  const sparkSvg = renderSparklineSvg(sparkData, maxSpark, agent.color);
  const autonomyLevel = AUTONOMY_LEVELS[config.autonomy] || AUTONOMY_LEVELS[1];
  const sessions = AGENT_SESSIONS.filter(s => s.agent === agent.id);
  const sessionCount = sessions.length || Math.floor(Math.random() * 3) + 1;

  el.innerHTML = `
    <div class="acenter-overview">
      <div class="acenter-overview-header">
        <div class="acenter-avatar" style="background:${agent.color}20;border-color:${agent.color}">
          <span class="acenter-avatar-emoji">${agent.emoji}</span>
        </div>
        <div class="acenter-overview-info">
          <h2 class="acenter-overview-name">${agent.name}</h2>
          <div class="acenter-overview-role">${agent.role}</div>
          <div class="acenter-overview-status">
            <span class="acenter-status-dot ${agent.status === 'active' ? 'status-active' : 'status-idle'}"></span>
            <span>${agent.status === 'active' ? 'Active' : 'Idle'}</span>
          </div>
        </div>
      </div>

      ${agent.task ? `
        <div class="acenter-current-task-banner">
          <span class="acenter-task-pulse"></span>
          <span class="acenter-task-label">Currently working on:</span>
          <span class="acenter-task-name">${agent.task}</span>
        </div>
      ` : ''}

      <div class="acenter-stats-grid">
        <div class="acenter-stat-card">
          <div class="acenter-stat-value">${agent.tasks}</div>
          <div class="acenter-stat-label">Tasks Done</div>
        </div>
        <div class="acenter-stat-card">
          <div class="acenter-stat-value">${(agent.tokens / 1000).toFixed(1)}K</div>
          <div class="acenter-stat-label">Tokens</div>
        </div>
        <div class="acenter-stat-card">
          <div class="acenter-stat-value" style="color:${agent.fitness >= 0.9 ? 'var(--green)' : agent.fitness >= 0.8 ? 'var(--yellow)' : 'var(--red)'}">${Math.round(agent.fitness * 100)}%</div>
          <div class="acenter-stat-label">Fitness</div>
        </div>
        <div class="acenter-stat-card">
          <div class="acenter-stat-value">${sessionCount}</div>
          <div class="acenter-stat-label">Sessions</div>
        </div>
      </div>

      <div class="acenter-sparkline-section">
        <div class="acenter-section-title">Performance — Last 7 Days</div>
        <div class="acenter-sparkline-wrap">
          ${sparkSvg}
          <div class="acenter-sparkline-labels">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Today</span>
          </div>
        </div>
      </div>

      <div class="acenter-overview-meta">
        <div class="acenter-meta-row">
          <span class="acenter-meta-label">Autonomy</span>
          <span class="acenter-meta-value" style="color:${autonomyLevel.color}">${autonomyLevel.icon} ${autonomyLevel.label}</span>
        </div>
        <div class="acenter-meta-row">
          <span class="acenter-meta-label">Active Capabilities</span>
          <span class="acenter-meta-value">${countActiveCaps(config)} enabled</span>
        </div>
        <div class="acenter-meta-row">
          <span class="acenter-meta-label">Files Modified</span>
          <span class="acenter-meta-value">${agent.files}</span>
        </div>
      </div>
    </div>
  `;
}

function renderSparklineSvg(data, max, color) {
  const w = 280, h = 48, pad = 4;
  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - (v / max) * (h - pad * 2);
    return `${x},${y}`;
  });
  const linePoints = points.join(' ');
  const areaPoints = `${pad},${h - pad} ${linePoints} ${w - pad},${h - pad}`;
  return `
    <svg class="acenter-sparkline-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <polygon points="${areaPoints}" fill="${color}15" />
      <polyline points="${linePoints}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      ${data.map((v, i) => {
        const x = pad + (i / (data.length - 1)) * (w - pad * 2);
        const y = h - pad - (v / max) * (h - pad * 2);
        return `<circle cx="${x}" cy="${y}" r="3" fill="${color}" />`;
      }).join('')}
    </svg>
  `;
}

function countActiveCaps(config) {
  let count = 0;
  Object.values(config.capabilities).forEach(cat => {
    Object.values(cat).forEach(v => { if (v) count++; });
  });
  return count;
}

function renderCapabilitiesTab(el, agent, config) {
  el.innerHTML = `
    <div class="acenter-capabilities">
      ${Object.entries(AGENT_CAP_MATRIX).map(([catKey, cat]) => `
        <div class="acenter-cap-category">
          <div class="acenter-cap-cat-header">
            <span class="acenter-cap-cat-icon">${cat.icon}</span>
            <span class="acenter-cap-cat-label">${cat.label}</span>
          </div>
          <div class="acenter-cap-perms">
            ${cat.perms.map(perm => {
              const enabled = config.capabilities[catKey]?.[perm] || false;
              return `
                <div class="acenter-cap-perm-row">
                  <span class="acenter-cap-perm-name">${perm}</span>
                  <label class="acenter-switch">
                    <input type="checkbox" ${enabled ? 'checked' : ''} onchange="toggleAgentCap('${agent.id}','${catKey}','${perm}',this.checked)">
                    <span class="acenter-switch-track"><span class="acenter-switch-thumb"></span></span>
                  </label>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function toggleAgentCap(agentId, category, perm, checked) {
  const config = getAgentConfig(agentId);
  if (!config.capabilities[category]) config.capabilities[category] = {};
  config.capabilities[category][perm] = checked;
  saveAgentConfigs();
}

function renderAutonomyTab(el, agent, config) {
  const currentLevel = AUTONOMY_LEVELS[config.autonomy] || AUTONOMY_LEVELS[1];

  el.innerHTML = `
    <div class="acenter-autonomy">
      <div class="acenter-section-title">Autonomy Level</div>
      <div class="acenter-autonomy-slider-wrap">
        <input type="range" class="acenter-autonomy-range" min="0" max="4" step="1" value="${config.autonomy}"
          oninput="previewAutonomy(this.value)" onchange="setAgentAutonomy('${agent.id}', parseInt(this.value))">
        <div class="acenter-autonomy-labels">
          ${AUTONOMY_LEVELS.map(l => `
            <span class="acenter-autonomy-label${config.autonomy === l.value ? ' active' : ''}" style="${config.autonomy === l.value ? `color:${l.color}` : ''}">${l.icon}</span>
          `).join('')}
        </div>
      </div>

      <div class="acenter-autonomy-levels-detail">
        ${AUTONOMY_LEVELS.map(l => `
          <div class="acenter-autonomy-level-row${config.autonomy === l.value ? ' active' : ''}" style="${config.autonomy === l.value ? `border-color:${l.color};background:${l.color}10` : ''}">
            <span class="acenter-autonomy-level-icon">${l.icon}</span>
            <div class="acenter-autonomy-level-info">
              <span class="acenter-autonomy-level-name" style="${config.autonomy === l.value ? `color:${l.color}` : ''}">${l.label}</span>
              <span class="acenter-autonomy-level-desc">${l.desc}</span>
            </div>
            ${config.autonomy === l.value ? `<span class="acenter-autonomy-active-badge" style="background:${l.color}20;color:${l.color}">Active</span>` : ''}
          </div>
        `).join('')}
      </div>

      <div class="acenter-rules-section">
        <div class="acenter-section-title">Always Ask Before…</div>
        <div class="acenter-rules-list" id="acenter-overrides-list">
          ${(config.overrides || []).map((rule, i) => `
            <label class="acenter-rule-item">
              <input type="checkbox" ${rule.enabled ? 'checked' : ''} onchange="toggleOverride('${agent.id}',${i},this.checked)">
              <span class="acenter-rule-check"></span>
              <span class="acenter-rule-text">${rule.text}</span>
              <button class="acenter-rule-remove" onclick="removeOverride('${agent.id}',${i})">×</button>
            </label>
          `).join('')}
          <button class="acenter-add-rule-btn" onclick="addOverride('${agent.id}')">+ Add rule</button>
        </div>
      </div>

      <div class="acenter-rules-section">
        <div class="acenter-section-title">Escalate When…</div>
        <div class="acenter-rules-list" id="acenter-escalation-list">
          ${(config.escalationTriggers || []).map((rule, i) => `
            <label class="acenter-rule-item">
              <input type="checkbox" ${rule.enabled ? 'checked' : ''} onchange="toggleEscalation('${agent.id}',${i},this.checked)">
              <span class="acenter-rule-check"></span>
              <span class="acenter-rule-text">${rule.text}</span>
              <button class="acenter-rule-remove" onclick="removeEscalation('${agent.id}',${i})">×</button>
            </label>
          `).join('')}
          <button class="acenter-add-rule-btn" onclick="addEscalation('${agent.id}')">+ Add trigger</button>
        </div>
      </div>
    </div>
  `;
}

function previewAutonomy(val) {
  const v = parseInt(val);
  // Update label highlights
  document.querySelectorAll('.acenter-autonomy-label').forEach((lbl, i) => {
    if (i === v) {
      lbl.classList.add('active');
      lbl.style.color = AUTONOMY_LEVELS[i].color;
    } else {
      lbl.classList.remove('active');
      lbl.style.color = '';
    }
  });
  // Update level rows
  document.querySelectorAll('.acenter-autonomy-level-row').forEach((row, i) => {
    const l = AUTONOMY_LEVELS[i];
    if (i === v) {
      row.classList.add('active');
      row.style.borderColor = l.color;
      row.style.background = l.color + '10';
    } else {
      row.classList.remove('active');
      row.style.borderColor = '';
      row.style.background = '';
    }
  });
}

function setAgentAutonomy(agentId, value) {
  const config = getAgentConfig(agentId);
  config.autonomy = value;
  saveAgentConfigs();
}

function toggleOverride(agentId, index, checked) {
  const config = getAgentConfig(agentId);
  if (config.overrides[index]) config.overrides[index].enabled = checked;
  saveAgentConfigs();
}

function removeOverride(agentId, index) {
  const config = getAgentConfig(agentId);
  config.overrides.splice(index, 1);
  saveAgentConfigs();
  renderAgentDetail(agentId);
}

function addOverride(agentId) {
  const config = getAgentConfig(agentId);
  config.overrides.push({ text: 'New override rule...', enabled: true });
  saveAgentConfigs();
  renderAgentDetail(agentId);
}

function toggleEscalation(agentId, index, checked) {
  const config = getAgentConfig(agentId);
  if (config.escalationTriggers[index]) config.escalationTriggers[index].enabled = checked;
  saveAgentConfigs();
}

function removeEscalation(agentId, index) {
  const config = getAgentConfig(agentId);
  config.escalationTriggers.splice(index, 1);
  saveAgentConfigs();
  renderAgentDetail(agentId);
}

function addEscalation(agentId) {
  const config = getAgentConfig(agentId);
  config.escalationTriggers.push({ text: 'New escalation trigger...', enabled: true });
  saveAgentConfigs();
  renderAgentDetail(agentId);
}

function renderHistoryTab(el, agent) {
  const history = AGENT_HISTORY[agent.id] || { tasks: [], proposals: [], errors: [] };

  // Build unified timeline from all sources
  const timelineItems = [];
  history.tasks.forEach(t => {
    const hrs = parseInt(t.time);
    const relHrs = 9 - hrs + Math.floor(Math.random() * 2);
    const relStr = relHrs <= 0 ? 'Just now' : relHrs === 1 ? '1h ago' : `${relHrs}h ago`;
    timelineItems.push({
      icon: t.status === 'completed' ? '✅' : '❌',
      action: t.status === 'completed' ? 'Completed' : 'Failed',
      name: t.name,
      meta: `${relStr} · ${(t.tokens / 1000).toFixed(1)}K tokens`,
      status: t.status,
      sortKey: relHrs,
    });
  });
  history.proposals.forEach(p => {
    const hrs = parseInt(p.time);
    const relHrs = 9 - hrs + Math.floor(Math.random() * 2);
    const relStr = relHrs <= 0 ? 'Just now' : relHrs === 1 ? '1h ago' : `${relHrs}h ago`;
    timelineItems.push({
      icon: p.status === 'approved' ? '✅' : p.status === 'rejected' ? '❌' : '⏳',
      action: p.status === 'approved' ? 'Approved' : p.status === 'rejected' ? 'Rejected' : 'Proposed',
      name: p.name,
      meta: relStr,
      status: p.status,
      sortKey: relHrs,
    });
  });
  history.errors.forEach(e => {
    const hrs = parseInt(e.time);
    const relHrs = 9 - hrs + Math.floor(Math.random() * 2);
    const relStr = relHrs <= 0 ? 'Just now' : relHrs === 1 ? '1h ago' : `${relHrs}h ago`;
    timelineItems.push({
      icon: e.severity === 'error' ? '🔴' : '🟡',
      action: e.severity === 'error' ? 'Error' : 'Warning',
      name: e.message,
      meta: relStr,
      status: e.severity,
      sortKey: relHrs,
    });
  });
  timelineItems.sort((a, b) => a.sortKey - b.sortKey);

  el.innerHTML = `
    <div class="acenter-history">
      <div class="acenter-history-section">
        <div class="acenter-section-title">Activity Timeline</div>
        ${timelineItems.length === 0 ? `
          <div class="acenter-history-empty-state">
            <span class="acenter-history-empty-icon">📭</span>
            <span>No history available yet</span>
          </div>
        ` : `
          <div class="acenter-timeline">
            ${timelineItems.map(item => `
              <div class="acenter-timeline-item">
                <div class="acenter-timeline-dot-col">
                  <span class="acenter-timeline-dot" style="${item.status === 'completed' || item.status === 'approved' ? 'background:var(--green)' : item.status === 'failed' || item.status === 'error' ? 'background:var(--red)' : 'background:var(--text-muted)'}"></span>
                  <div class="acenter-timeline-line"></div>
                </div>
                <div class="acenter-timeline-content">
                  <div class="acenter-timeline-header">
                    <span class="acenter-timeline-action">${item.icon} ${item.action}:</span>
                    <span class="acenter-timeline-time">${item.meta}</span>
                  </div>
                  <span class="acenter-timeline-name">${item.name}</span>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════
// NAV HOOK — Lazy init for new pages
// ═══════════════════════════════════════════════════════════

const _origNav4 = nav;
nav = function(page) {
  _origNav4(page);
  if (page === 'records')   renderRecords();
  if (page === 'pipelines') renderPipelines();
  if (page === 'roles')     renderRoles();
};
