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
  { id: 'specced',    label: "📋 Spec'd",      color: '#89b4fa' },
  { id: 'inprogress', label: '🔨 In Progress', color: '#f9e2af' },
  { id: 'review',     label: '👀 Review',      color: '#fab387' },
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
  // Use real dispatch data if available, else fall back to BOARD_CARDS
  const liveQueue = _pipelineLiveData.queue;
  const liveActive = _pipelineLiveData.active;
  const liveDone = _pipelineLiveData.done;
  const liveFailed = _pipelineLiveData.failed;
  const hasLive = liveQueue || liveActive || liveDone;

  const stageCards = {};
  TASK_PIPELINE_STAGES.forEach(s => stageCards[s.id] = []);

  if (hasLive) {
    // Map real dispatch data to pipeline stages
    (liveQueue || []).forEach(t => {
      stageCards.inbox.push({
        id: t.id, title: t.title || t.task || 'Untitled', agent: t.agent || '',
        priority: t.priority || 'P3', tags: [], _raw: t,
        _timeInStage: timeAgoShort(t.created_at || t.created),
      });
    });
    (liveActive || []).forEach(t => {
      stageCards.inprogress.push({
        id: t.id, title: t.title || t.task || 'Untitled', agent: t.agent || '',
        priority: t.priority || 'P3', tags: [], progress: t.progress, _raw: t,
        _timeInStage: timeAgoShort(t.started_at || t.created_at || t.created),
      });
    });
    (liveDone || []).forEach(t => {
      stageCards.done.push({
        id: t.id, title: t.title || t.task || 'Untitled', agent: t.agent || '',
        priority: t.priority || 'P3', tags: [], _raw: t,
        _timeInStage: timeAgoShort(t.completed_at || t.created_at),
      });
    });
  } else {
    // Fallback to static BOARD_CARDS
    const stageMap = { inbox: 'inbox', queued: 'specced', active: 'inprogress', review: 'review', done: 'done' };
    Object.entries(BOARD_CARDS).forEach(([col, cards]) => {
      const stageId = stageMap[col] || 'inbox';
      cards.forEach(c => stageCards[stageId].push(c));
    });
  }
  
  // Add failed tasks section if any
  const failedCards = (liveFailed || []).map(t => ({
    id: t.id, title: t.title || t.task || 'Untitled', agent: t.agent || '',
    priority: t.priority || 'P3', tags: [], _raw: t,
    _timeInStage: timeAgoShort(t.failed_at || t.created_at),
  }));

  body.innerHTML = `
    <div class="pipeline-stages">
      ${TASK_PIPELINE_STAGES.map(stage => `
        <div class="pipeline-stage-col" data-stage="${stage.id}"
          ondragover="event.preventDefault();this.classList.add('drag-over')"
          ondragleave="this.classList.remove('drag-over')"
          ondrop="pipelineDrop(event,'${stage.id}','tasks')">
          <div class="pipeline-stage-header" style="border-top: 3px solid ${stage.color}">
            <span>${stage.label}</span>
            <span class="pipeline-stage-count">${(stageCards[stage.id] || []).length}</span>
          </div>
          <div class="pipeline-cards">
            ${(stageCards[stage.id] || []).map(c => renderPipelineCard(c, 'tasks')).join('')}
          </div>
        </div>
      `).join('')}
    </div>
    ${failedCards.length > 0 ? `
      <div style="margin-top:16px">
        <div style="font-size:13px;font-weight:600;color:var(--red);margin-bottom:8px">❌ Failed (${failedCards.length})</div>
        <div class="pipeline-stages" style="grid-template-columns:1fr">
          <div class="pipeline-stage-col" style="border-top:3px solid var(--red)">
            <div class="pipeline-cards">
              ${failedCards.map(c => renderPipelineCard(c, 'tasks')).join('')}
            </div>
          </div>
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
  
  // Use live proposals if available, else fall back to queueCards
  const proposals = _pipelineLiveData.proposals || queueCards;
  
  proposals.forEach(q => {
    // Handle both raw proposal format and converted queueCards format
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

  body.innerHTML = `
    <div class="pipeline-stages">
      ${PROPOSAL_PIPELINE_STAGES.map(stage => `
        <div class="pipeline-stage-col" data-stage="${stage.id}">
          <div class="pipeline-stage-header" style="border-top: 3px solid ${stage.color}">
            <span>${stage.label}</span>
            <span class="pipeline-stage-count">${(stageCards[stage.id] || []).length}</span>
          </div>
          <div class="pipeline-cards">
            ${(stageCards[stage.id] || []).map(q => {
              const srcId = q.source || q._source || q.agent || 'righthand';
              const src = typeof getSourceAgent === 'function' ? getSourceAgent(srcId) : { emoji: '🤖', name: srcId };
              return `
                <div class="pipeline-card" onclick="togglePipelineCardDetail(this)" data-ctx-type="task" data-ctx-id="${q.id || ''}">
                  <div class="pipeline-card-title">${(q.title || q.question || 'Untitled').substring(0, 50)}</div>
                  <div class="pipeline-card-meta">
                    <span class="pipeline-card-agent">${src.emoji}</span>
                    <span class="pipeline-card-priority">${q.priority || q._priority || 'P3'}</span>
                    ${q.triage_verdict || q._triageVerdict ? `<span style="font-size:10px;color:var(--text-muted)">${q.triage_verdict || q._triageVerdict}</span>` : ''}
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `).join('')}
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
              ${assignedTasks.slice(0, 3).map(t => `<div class="capacity-task-item">${(t.title || t.task || 'Untitled').substring(0, 30)}</div>`).join('')}
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
  const ag = ga(card.agent) || { emoji: '⬜', color: '#6c7086' };
  const timeInStage = card._timeInStage || '';
  return `
    <div class="pipeline-card" draggable="true"
      ondragstart="pipelineDragStart(event,'${card.id}')"
      onclick="togglePipelineCardDetail(this)"
      data-ctx-type="task" data-ctx-id="${card.id || ''}">
      <div class="pipeline-card-title">${card.title || 'Untitled'}</div>
      <div class="pipeline-card-meta">
        <span class="pipeline-card-agent" style="border-color:${ag.color}">${ag.emoji}</span>
        <span class="pipeline-card-priority ${(card.priority || 'P3').toLowerCase()}">${card.priority || 'P3'}</span>
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
// ROLES PAGE — Agent Role Editor (RBAC)
// ═══════════════════════════════════════════════════════════

const DEFAULT_CAPABILITIES = [
  'code.write', 'code.review', 'web.search', 'vault.read', 'vault.write',
  'system.exec', 'dispatch.create', 'decision.auto', 'file.delete', 'external.api',
];

const AUTONOMY_ZONES = [
  { min: 0, max: 20, label: 'Observer', desc: 'Watch only', color: '#6c7086' },
  { min: 20, max: 40, label: 'Advisor', desc: 'Suggest, wait for approval', color: '#89b4fa' },
  { min: 40, max: 60, label: 'Partner', desc: 'Auto-execute safe, ask for risky', color: '#f9e2af' },
  { min: 60, max: 80, label: 'Delegate', desc: 'Act independently, report after', color: '#fab387' },
  { min: 80, max: 100, label: 'Autopilot', desc: 'Full autonomy', color: '#a6e3a1' },
];

const DEFAULT_ROLES = [
  {
    id: 'orchestrator', name: 'Orchestrator', description: 'Coordinates all agents, dispatches work, manages priorities',
    capabilities: { 'code.write': false, 'code.review': true, 'web.search': true, 'vault.read': true, 'vault.write': true, 'system.exec': false, 'dispatch.create': true, 'decision.auto': true, 'file.delete': false, 'external.api': true },
    autonomy: 70, domains: ['orchestration', 'dispatch', 'vault'],
    escalationRules: ['Escalate if task involves deletion', 'Escalate if cost > 50K tokens', 'Escalate if confidence < 0.4'],
    agents: ['righthand'],
  },
  {
    id: 'developer', name: 'Developer', description: 'Writes, reviews, and deploys code',
    capabilities: { 'code.write': true, 'code.review': true, 'web.search': true, 'vault.read': true, 'vault.write': false, 'system.exec': true, 'dispatch.create': false, 'decision.auto': false, 'file.delete': false, 'external.api': false },
    autonomy: 55, domains: ['frontend', 'backend', 'infrastructure'],
    escalationRules: ['Escalate if task involves production deployment', 'Escalate if modifying security configs'],
    agents: ['coder'],
  },
  {
    id: 'researcher', name: 'Researcher', description: 'Deep research, source evaluation, competitive analysis',
    capabilities: { 'code.write': false, 'code.review': false, 'web.search': true, 'vault.read': true, 'vault.write': true, 'system.exec': false, 'dispatch.create': false, 'decision.auto': false, 'file.delete': false, 'external.api': true },
    autonomy: 35, domains: ['research', 'competitive', 'vault'],
    escalationRules: ['Escalate if confidence < 0.5', 'Escalate if source tier < T2'],
    agents: ['researcher'],
  },
  {
    id: 'security', name: 'Security', description: 'Infrastructure audits, hardening, vulnerability scanning',
    capabilities: { 'code.write': false, 'code.review': true, 'web.search': true, 'vault.read': true, 'vault.write': false, 'system.exec': true, 'dispatch.create': false, 'decision.auto': false, 'file.delete': false, 'external.api': false },
    autonomy: 25, domains: ['security', 'infrastructure'],
    escalationRules: ['Always escalate critical findings', 'Escalate if remediation requires restart'],
    agents: ['ops'],
  },
  {
    id: 'redteam', name: 'Red Team', description: 'Adversarial review, critique, pre-mortem analysis',
    capabilities: { 'code.write': false, 'code.review': true, 'web.search': false, 'vault.read': true, 'vault.write': false, 'system.exec': false, 'dispatch.create': false, 'decision.auto': false, 'file.delete': false, 'external.api': false },
    autonomy: 15, domains: ['security', 'architecture', 'review'],
    escalationRules: ['Escalate if risk score > 7/10', 'Escalate when critical assumptions are flawed'],
    agents: ['devil'],
  },
  {
    id: 'utility', name: 'Utility', description: 'General purpose tasks, vault cleanup, knowledge organization',
    capabilities: { 'code.write': false, 'code.review': false, 'web.search': true, 'vault.read': true, 'vault.write': true, 'system.exec': false, 'dispatch.create': false, 'decision.auto': false, 'file.delete': false, 'external.api': false },
    autonomy: 45, domains: ['vault', 'knowledge', 'scraping'],
    escalationRules: ['Escalate if task involves source code', 'Escalate if confidence < 0.5'],
    agents: ['utility'],
  },
];

let rolesData = JSON.parse(localStorage.getItem('agent-os-roles') || 'null') || DEFAULT_ROLES;
let selectedRoleId = rolesData[0]?.id || null;

function renderRoles() {
  const el = $('roles-content');
  if (!el) return;

  el.innerHTML = `
    <div class="roles-layout">
      <div class="roles-sidebar" id="roles-sidebar">
        <div class="roles-sidebar-header">Roles</div>
        <div class="roles-sidebar-list" id="roles-sidebar-list"></div>
        <button class="roles-create-btn" onclick="createNewRole()">+ Create New Role</button>
      </div>
      <div class="roles-editor" id="roles-editor"></div>
    </div>
  `;

  renderRolesSidebar();
  if (selectedRoleId) renderRoleEditor(selectedRoleId);
}

function renderRolesSidebar() {
  const list = $('roles-sidebar-list');
  if (!list) return;
  list.innerHTML = rolesData.map(r => `
    <div class="roles-sidebar-item${selectedRoleId === r.id ? ' active' : ''}" onclick="selectRole('${r.id}')">
      <div class="roles-sidebar-item-name">${r.name}</div>
      <div class="roles-sidebar-item-agents">${(r.agents || []).map(a => (ga(a) || {}).emoji || '🤖').join(' ')}</div>
    </div>
  `).join('');
}

function selectRole(id) {
  selectedRoleId = id;
  renderRolesSidebar();
  renderRoleEditor(id);
}

function renderRoleEditor(roleId) {
  const editor = $('roles-editor');
  if (!editor) return;
  const role = rolesData.find(r => r.id === roleId);
  if (!role) { editor.innerHTML = '<div class="roles-empty">Select a role</div>'; return; }

  const autonomyZone = AUTONOMY_ZONES.find(z => role.autonomy >= z.min && role.autonomy < z.max) || AUTONOMY_ZONES[2];

  editor.innerHTML = `
    <div class="role-editor-section">
      <div class="role-name-row">
        <input type="text" class="role-name-input" value="${role.name}" onchange="updateRole('${roleId}','name',this.value)">
        <button class="role-delete-btn" onclick="deleteRole('${roleId}')">🗑️ Delete</button>
      </div>
      <textarea class="role-desc-input" rows="2" onchange="updateRole('${roleId}','description',this.value)">${role.description}</textarea>
    </div>

    <div class="role-editor-section">
      <div class="role-section-title">Capabilities</div>
      <div class="role-capabilities-grid">
        ${DEFAULT_CAPABILITIES.map(cap => {
          const granted = role.capabilities[cap] || false;
          return `
            <div class="role-cap-row">
              <span class="role-cap-name">${cap}</span>
              <label class="role-toggle">
                <input type="checkbox" ${granted ? 'checked' : ''} onchange="toggleCapability('${roleId}','${cap}',this.checked)">
                <span class="role-toggle-track"><span class="role-toggle-thumb"></span></span>
              </label>
            </div>
          `;
        }).join('')}
      </div>
    </div>

    <div class="role-editor-section">
      <div class="role-section-title">Autonomy Level</div>
      <div class="role-autonomy-wrap">
        <input type="range" class="role-autonomy-slider" min="0" max="100" value="${role.autonomy}"
          oninput="updateAutonomyPreview(this.value)" onchange="updateRole('${roleId}','autonomy',parseInt(this.value))">
        <div class="role-autonomy-zones">
          ${AUTONOMY_ZONES.map(z => `
            <div class="role-autonomy-zone" style="left:${z.min}%;width:${z.max - z.min}%;background:${z.color}20;border-bottom:2px solid ${z.color}">
              <span class="role-zone-label">${z.label}</span>
            </div>
          `).join('')}
        </div>
        <div class="role-autonomy-current" id="role-autonomy-current">
          <span class="role-autonomy-value" style="color:${autonomyZone.color}">${role.autonomy}%</span>
          <span class="role-autonomy-zone-name">${autonomyZone.label}</span>
          <span class="role-autonomy-zone-desc">${autonomyZone.desc}</span>
        </div>
      </div>
    </div>

    <div class="role-editor-section">
      <div class="role-section-title">Domain Restrictions</div>
      <div class="role-domains" id="role-domains-${roleId}">
        ${(role.domains || []).map(d => `
          <span class="role-domain-tag">${d} <button class="role-domain-remove" onclick="removeDomain('${roleId}','${d}')">×</button></span>
        `).join('')}
        <input type="text" class="role-domain-input" placeholder="Add domain..." onkeydown="if(event.key==='Enter'){addDomain('${roleId}',this.value);this.value='';}">
      </div>
    </div>

    <div class="role-editor-section">
      <div class="role-section-title">Escalation Rules</div>
      <div class="role-escalation-rules" id="role-esc-${roleId}">
        ${(role.escalationRules || []).map((rule, i) => `
          <div class="role-esc-rule">
            <span class="role-esc-icon">⚠️</span>
            <input type="text" class="role-esc-input" value="${rule}" onchange="updateEscalationRule('${roleId}',${i},this.value)">
            <button class="role-esc-remove" onclick="removeEscalationRule('${roleId}',${i})">×</button>
          </div>
        `).join('')}
        <button class="role-add-esc-btn" onclick="addEscalationRule('${roleId}')">+ Add Rule</button>
      </div>
    </div>

    <div class="role-editor-section">
      <div class="role-section-title">Assigned Agents</div>
      <div class="role-assigned-agents">
        ${AGENTS.map(a => {
          const assigned = (role.agents || []).includes(a.id);
          return `
            <div class="role-agent-chip${assigned ? ' assigned' : ''}" onclick="toggleAgentRole('${roleId}','${a.id}')">
              <span>${a.emoji}</span>
              <span>${a.name}</span>
              ${assigned ? '<span class="role-agent-check">✓</span>' : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function updateRole(roleId, field, value) {
  const role = rolesData.find(r => r.id === roleId);
  if (!role) return;
  role[field] = value;
  saveRoles();
  if (field === 'name') renderRolesSidebar();
}

function toggleCapability(roleId, cap, checked) {
  const role = rolesData.find(r => r.id === roleId);
  if (!role) return;
  role.capabilities[cap] = checked;
  saveRoles();
}

function updateAutonomyPreview(val) {
  const zone = AUTONOMY_ZONES.find(z => val >= z.min && val < z.max) || AUTONOMY_ZONES[4];
  const el = $('role-autonomy-current');
  if (el) {
    el.innerHTML = `
      <span class="role-autonomy-value" style="color:${zone.color}">${val}%</span>
      <span class="role-autonomy-zone-name">${zone.label}</span>
      <span class="role-autonomy-zone-desc">${zone.desc}</span>
    `;
  }
}

function addDomain(roleId, domain) {
  if (!domain.trim()) return;
  const role = rolesData.find(r => r.id === roleId);
  if (!role) return;
  if (!role.domains) role.domains = [];
  if (!role.domains.includes(domain.trim())) {
    role.domains.push(domain.trim());
    saveRoles();
    renderRoleEditor(roleId);
  }
}

function removeDomain(roleId, domain) {
  const role = rolesData.find(r => r.id === roleId);
  if (!role) return;
  role.domains = (role.domains || []).filter(d => d !== domain);
  saveRoles();
  renderRoleEditor(roleId);
}

function addEscalationRule(roleId) {
  const role = rolesData.find(r => r.id === roleId);
  if (!role) return;
  if (!role.escalationRules) role.escalationRules = [];
  role.escalationRules.push('Escalate if ...');
  saveRoles();
  renderRoleEditor(roleId);
}

function updateEscalationRule(roleId, index, value) {
  const role = rolesData.find(r => r.id === roleId);
  if (!role || !role.escalationRules) return;
  role.escalationRules[index] = value;
  saveRoles();
}

function removeEscalationRule(roleId, index) {
  const role = rolesData.find(r => r.id === roleId);
  if (!role || !role.escalationRules) return;
  role.escalationRules.splice(index, 1);
  saveRoles();
  renderRoleEditor(roleId);
}

function toggleAgentRole(roleId, agentId) {
  const role = rolesData.find(r => r.id === roleId);
  if (!role) return;
  if (!role.agents) role.agents = [];
  const idx = role.agents.indexOf(agentId);
  if (idx >= 0) role.agents.splice(idx, 1);
  else role.agents.push(agentId);
  saveRoles();
  renderRoleEditor(roleId);
  renderRolesSidebar();
}

function createNewRole() {
  const id = 'role-' + Date.now();
  rolesData.push({
    id, name: 'New Role', description: 'Describe this role...',
    capabilities: Object.fromEntries(DEFAULT_CAPABILITIES.map(c => [c, false])),
    autonomy: 40, domains: [], escalationRules: [], agents: [],
  });
  saveRoles();
  selectedRoleId = id;
  renderRoles();
}

function deleteRole(roleId) {
  rolesData = rolesData.filter(r => r.id !== roleId);
  saveRoles();
  selectedRoleId = rolesData[0]?.id || null;
  renderRoles();
}

function saveRoles() {
  localStorage.setItem('agent-os-roles', JSON.stringify(rolesData));
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
