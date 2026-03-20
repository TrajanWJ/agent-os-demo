/* Agent OS v7 — tasks.js — Full Tasks Page */
'use strict';

// ═══════════════════════════════════════════════════════════
// TASKS PAGE — Dedicated task management view
// ═══════════════════════════════════════════════════════════

PAGE_TITLES.tasks = 'Tasks';

let tasksPageData = [];
let tasksFilter = 'all';
let tasksSort = 'newest';
let tasksSelectedId = null;
let tasksSelectedDetail = null;
let tasksPollTimer = null;
let tasksPrevIds = new Set();

const TASK_PRIORITY_BADGES = {
  P0: { emoji: '🔴', color: '#f38ba8', label: 'P0 Critical' },
  P1: { emoji: '🟠', color: '#fab387', label: 'P1 High' },
  P2: { emoji: '🟡', color: '#f9e2af', label: 'P2 Medium' },
  P3: { emoji: '🟢', color: '#a6e3a1', label: 'P3 Low' },
};

const TASK_STATUS_COLORS = {
  queued:  { dot: '#f9e2af', bg: 'rgba(249,226,175,0.15)', label: 'Queued' },
  active:  { dot: '#89b4fa', bg: 'rgba(137,180,250,0.15)', label: 'Active' },
  done:    { dot: '#a6e3a1', bg: 'rgba(166,227,161,0.15)', label: 'Done' },
  failed:  { dot: '#f38ba8', bg: 'rgba(243,139,168,0.15)', label: 'Failed' },
};

const TASK_AGENTS = {
  researcher: { emoji: '🔬', name: 'Researcher', color: '#89b4fa' },
  coder:      { emoji: '💻', name: 'Coder', color: '#a6e3a1' },
  ops:        { emoji: '⚙️', name: 'Ops', color: '#fab387' },
  righthand:  { emoji: '🤝', name: 'Right Hand', color: '#E8A838' },
  utility:    { emoji: '🔧', name: 'Utility', color: '#cba6f7' },
  devil:      { emoji: '😈', name: "Devil's Advocate", color: '#f38ba8' },
  system:     { emoji: '🤖', name: 'System', color: '#6c7086' },
};

function getTaskAgent(agentStr) {
  if (!agentStr) return TASK_AGENTS.system;
  const key = agentStr.toLowerCase().replace(/[^a-z]/g, '');
  return TASK_AGENTS[key] || ga(agentStr) || { emoji: '🤖', name: agentStr, color: '#6c7086' };
}

function getTaskPriority(task) {
  if (task.priority && TASK_PRIORITY_BADGES[task.priority]) return task.priority;
  // Try to extract from various fields — handle numeric priorities
  const raw = task.priority ?? task._priority ?? '';
  if (typeof raw === 'number') {
    // Map numeric 0-4 to P0-P3 (clamp at P3)
    const idx = Math.min(Math.max(raw, 0), 3);
    const mapped = 'P' + idx;
    return TASK_PRIORITY_BADGES[mapped] ? mapped : 'P3';
  }
  const p = String(raw).toUpperCase();
  if (p.startsWith('P') && TASK_PRIORITY_BADGES[p]) return p;
  return 'P3';
}

function taskRelativeTime(dateStr, prefix) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  let timeStr;
  if (diff < 0) timeStr = 'just now';
  else if (diff < 60) timeStr = `${diff}s ago`;
  else if (diff < 3600) timeStr = `${Math.floor(diff / 60)}m ago`;
  else if (diff < 86400) timeStr = `${Math.floor(diff / 3600)}h ago`;
  else timeStr = `${Math.floor(diff / 86400)}d ago`;
  return prefix ? `${prefix} ${timeStr}` : timeStr;
}

function taskDuration(startStr, endStr) {
  if (!startStr) return '';
  const start = new Date(startStr).getTime();
  const end = endStr ? new Date(endStr).getTime() : Date.now();
  const diff = Math.floor((end - start) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
}

// ── Data Loading ──────────────────────────────────────────

async function loadTasksPage() {
  try {
    const resp = await fetch('/api/tasks/all');
    if (!resp.ok) throw new Error('Failed to fetch tasks');
    const data = await resp.json();

    // Detect transitions: active → done for glow animation
    const newIds = new Set(data.filter(t => t.status === 'done').map(t => t.id));
    const prevActiveIds = new Set(tasksPageData.filter(t => t.status === 'active').map(t => t.id));
    const justCompleted = new Set();
    for (const id of prevActiveIds) {
      if (newIds.has(id) && !tasksPrevIds.has('done-' + id)) {
        justCompleted.add(id);
        tasksPrevIds.add('done-' + id);
      }
    }

    tasksPageData = data;
    renderTasksList();

    // Apply glow animation to just-completed tasks
    for (const id of justCompleted) {
      const card = document.querySelector(`.tasks-card[data-task-id="${id}"]`);
      if (card) {
        card.classList.add('tasks-card-glow');
        setTimeout(() => card.classList.remove('tasks-card-glow'), 2500);
      }
    }

    // Auto-select first task if none selected
    if (!tasksSelectedId && tasksPageData.length > 0) {
      selectTask(getFilteredTasks()[0]?.id);
    } else if (tasksSelectedId) {
      // Refresh detail if selected task still exists
      selectTask(tasksSelectedId);
    }
  } catch (e) {
    console.warn('[Tasks] Load error:', e.message);
  }
}

function getFilteredTasks() {
  let filtered = tasksPageData;
  if (tasksFilter !== 'all') {
    filtered = filtered.filter(t => t.status === tasksFilter);
  }

  // Sort
  switch (tasksSort) {
    case 'newest':
      filtered.sort((a, b) => (b.created_at || b.created || '').localeCompare(a.created_at || a.created || ''));
      break;
    case 'priority':
      filtered.sort((a, b) => {
        const pa = parseInt((getTaskPriority(a) || 'P3').replace('P', ''));
        const pb = parseInt((getTaskPriority(b) || 'P3').replace('P', ''));
        return pa - pb;
      });
      break;
    case 'agent':
      filtered.sort((a, b) => (a.agent || '').localeCompare(b.agent || ''));
      break;
  }
  return filtered;
}

function getTaskCounts() {
  const counts = { all: tasksPageData.length, queued: 0, active: 0, done: 0, failed: 0 };
  tasksPageData.forEach(t => {
    if (counts[t.status] !== undefined) counts[t.status]++;
  });
  return counts;
}

// ── Render: Left Panel (Task List) ────────────────────────

function renderTasksList() {
  const container = document.getElementById('tasks-list-panel');
  if (!container) return;

  const counts = getTaskCounts();
  const filtered = getFilteredTasks();

  // Filter bar
  const filterBar = container.querySelector('.tasks-filter-bar');
  if (filterBar) {
    filterBar.innerHTML = `
      <div class="tasks-filter-tabs">
        ${['all', 'queued', 'active', 'done', 'failed'].map(f => `
          <button class="tasks-filter-tab${tasksFilter === f ? ' active' : ''}" onclick="setTasksFilter('${f}')">
            ${f.charAt(0).toUpperCase() + f.slice(1)}
            <span class="tasks-filter-count">${counts[f]}</span>
          </button>
        `).join('')}
      </div>
      <div class="tasks-sort-bar">
        <select class="tasks-sort-select" onchange="setTasksSort(this.value)">
          <option value="newest"${tasksSort === 'newest' ? ' selected' : ''}>Newest</option>
          <option value="priority"${tasksSort === 'priority' ? ' selected' : ''}>Priority</option>
          <option value="agent"${tasksSort === 'agent' ? ' selected' : ''}>Agent</option>
        </select>
      </div>
    `;
  }

  // Task cards
  const listContent = container.querySelector('.tasks-list-content');
  if (!listContent) return;

  if (filtered.length === 0) {
    listContent.innerHTML = `<div class="tasks-empty-list">
      <div style="font-size:28px;margin-bottom:8px">📋</div>
      <div style="color:var(--text-muted);font-size:13px">No ${tasksFilter === 'all' ? '' : tasksFilter + ' '}tasks</div>
    </div>`;
    return;
  }

  listContent.innerHTML = filtered.map(task => makeTaskListCard(task)).join('');
}

function makeTaskListCard(task) {
  const priority = getTaskPriority(task);
  const pb = TASK_PRIORITY_BADGES[priority] || TASK_PRIORITY_BADGES.P3;
  const agent = getTaskAgent(task.agent);
  const status = task.status || 'queued';
  const sc = TASK_STATUS_COLORS[status] || TASK_STATUS_COLORS.queued;
  const title = task.title || task.task || task.id || 'Untitled';
  const isSelected = tasksSelectedId === task.id;
  const isActive = status === 'active';

  // Time text
  let timeText = '';
  if (status === 'queued') timeText = taskRelativeTime(task.created_at || task.created, 'queued');
  else if (status === 'active') timeText = 'active for ' + taskDuration(task.started_at || task.created_at || task.created);
  else if (status === 'done') timeText = taskRelativeTime(task.completed_at || task.created_at, 'completed');
  else if (status === 'failed') timeText = taskRelativeTime(task.failed_at || task.created_at, 'failed');

  return `<div class="tasks-card${isSelected ? ' selected' : ''}" data-task-id="${task.id}" onclick="selectTask('${task.id}')">
    <div class="tasks-card-top">
      <span class="tasks-card-priority" style="color:${pb.color}" title="${pb.label}">${pb.emoji}</span>
      <span class="tasks-card-title">${title.length > 60 ? title.substring(0, 60) + '…' : title}</span>
    </div>
    <div class="tasks-card-bottom">
      <span class="tasks-card-agent" style="color:${agent.color}">${agent.emoji} ${agent.name}</span>
      <span class="tasks-card-status-dot${isActive ? ' pulsing' : ''}" style="background:${sc.dot}"></span>
      <span class="tasks-card-time">${timeText}</span>
    </div>
  </div>`;
}

// ── Render: Center Panel (Task Detail) ────────────────────

async function selectTask(taskId) {
  if (!taskId) return;
  tasksSelectedId = taskId;

  // Update selected state in list
  document.querySelectorAll('.tasks-card').forEach(el => {
    el.classList.toggle('selected', el.dataset.taskId === taskId);
  });

  const task = tasksPageData.find(t => t.id === taskId);
  if (!task) return;

  // Try to fetch detailed info from bridge
  let detail = null;
  try {
    const resp = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`);
    if (resp.ok) detail = await resp.json();
  } catch { /* use basic data */ }

  tasksSelectedDetail = detail || task;
  renderTaskDetail(tasksSelectedDetail);
  renderTaskActions(tasksSelectedDetail);
}

function renderTaskDetail(task) {
  const container = document.getElementById('tasks-detail-panel');
  if (!container) return;

  const status = task.status || 'queued';
  const sc = TASK_STATUS_COLORS[status] || TASK_STATUS_COLORS.queued;
  const priority = getTaskPriority(task);
  const pb = TASK_PRIORITY_BADGES[priority] || TASK_PRIORITY_BADGES.P3;
  const agent = getTaskAgent(task.agent);
  const title = task.title || task.task || task.id || 'Untitled';

  // Description
  const desc = task.description || task.context || task.output_contract || task.task || '';

  // Origin / Proposal link
  let originHTML = '';
  const proposalId = task.proposal_id || (task.source_proposal && task.source_proposal.id);
  const proposal = task.source_proposal || null;
  if (proposalId) {
    originHTML = `<div class="tasks-detail-origin">
      <div class="tasks-detail-section-title">📋 Origin</div>
      <div class="tasks-detail-origin-card" onclick="nav('queue')">
        <span class="tasks-detail-origin-link">← Proposal ${proposalId}</span>
        ${proposal ? `
          <div class="tasks-detail-origin-meta">
            <span>${proposal.title || ''}</span>
            ${proposal.source_agent ? `<span style="color:${getTaskAgent(proposal.source_agent).color}">${getTaskAgent(proposal.source_agent).emoji} ${getTaskAgent(proposal.source_agent).name}</span>` : ''}
            ${proposal.confidence ? `<span>Confidence: ${Math.round(proposal.confidence * 100)}%</span>` : ''}
          </div>
        ` : ''}
      </div>
    </div>`;
  }

  // Timeline
  let timelineHTML = '';
  const events = buildTaskTimeline(task);
  if (events.length > 0) {
    timelineHTML = `<div class="tasks-detail-timeline">
      <div class="tasks-detail-section-title">📅 Timeline</div>
      <div class="tasks-timeline-items">
        ${events.map(e => `
          <div class="tasks-timeline-item">
            <span class="tasks-timeline-dot" style="background:${e.color}"></span>
            <div class="tasks-timeline-content">
              <span class="tasks-timeline-text">${e.text}</span>
              <span class="tasks-timeline-time">${e.time}</span>
            </div>
          </div>
        `).join('')}
      </div>
    </div>`;
  }

  // Output section (for done tasks)
  let outputHTML = '';
  if (status === 'done' && (task.output || task.result)) {
    const output = task.output || task.result || '';
    outputHTML = `<div class="tasks-detail-output">
      <div class="tasks-detail-section-title">📤 Output</div>
      <pre class="tasks-detail-output-content">${typeof output === 'string' ? output : JSON.stringify(output, null, 2)}</pre>
    </div>`;
  }

  // Error (for failed tasks)
  let errorHTML = '';
  if (status === 'failed' && (task.error || task.reason)) {
    errorHTML = `<div class="tasks-detail-error">
      <div class="tasks-detail-section-title">❌ Error</div>
      <pre class="tasks-detail-error-content">${task.error || task.reason || 'Unknown error'}</pre>
    </div>`;
  }

  // Related items
  let relatedHTML = '';
  const relatedItems = [];
  if (task.mission_id) relatedItems.push({ icon: '🎯', label: 'Mission', value: task.mission_id, action: `nav('missions')` });
  if (task.vault_path) relatedItems.push({ icon: '🧠', label: 'Vault', value: task.vault_path, action: `nav('mind')` });
  if (relatedItems.length > 0) {
    relatedHTML = `<div class="tasks-detail-related">
      <div class="tasks-detail-section-title">🔗 Related</div>
      ${relatedItems.map(r => `
        <div class="tasks-detail-related-item" onclick="${r.action}">
          <span>${r.icon}</span>
          <span class="tasks-related-label">${r.label}</span>
          <span class="tasks-related-value">${r.value}</span>
        </div>
      `).join('')}
    </div>`;
  }

  container.innerHTML = `
    <div class="tasks-detail-header">
      <h2 class="tasks-detail-title">${title}</h2>
      <div class="tasks-detail-badges">
        <span class="tasks-detail-status-badge" style="background:${sc.bg};color:${sc.dot}">${sc.label}</span>
        <span class="tasks-detail-priority-badge" style="background:${pb.color}20;color:${pb.color}">${pb.emoji} ${priority}</span>
        <span class="tasks-detail-agent-badge" style="color:${agent.color}">${agent.emoji} ${agent.name}</span>
      </div>
    </div>
    ${desc ? `<div class="tasks-detail-description">${formatTaskDescription(desc)}</div>` : ''}
    ${originHTML}
    ${timelineHTML}
    ${outputHTML}
    ${errorHTML}
    ${relatedHTML}
  `;
}

function formatTaskDescription(text) {
  // Basic markdown-like formatting
  let html = text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
  return html;
}

function buildTaskTimeline(task) {
  const events = [];
  const green = '#a6e3a1';
  const blue = '#89b4fa';
  const yellow = '#f9e2af';
  const red = '#f38ba8';
  const gray = '#6c7086';

  if (task.created_at || task.created) {
    events.push({
      text: 'Created',
      time: formatTimelineTime(task.created_at || task.created),
      color: gray,
    });
  }

  if (task.queued_at || (task.status !== 'queued' && task.created_at)) {
    events.push({
      text: 'Queued for dispatch',
      time: formatTimelineTime(task.queued_at || task.created_at || task.created),
      color: yellow,
    });
  }

  if (task.started_at || task.status === 'active') {
    const agentObj = getTaskAgent(task.agent);
    events.push({
      text: `Picked up by ${agentObj.emoji} ${agentObj.name}`,
      time: formatTimelineTime(task.started_at || ''),
      color: blue,
    });
  }

  // Log entries if available
  if (task.log && Array.isArray(task.log)) {
    task.log.forEach(entry => {
      events.push({
        text: entry.text || entry.message || entry,
        time: formatTimelineTime(entry.timestamp || entry.time || ''),
        color: gray,
      });
    });
  }

  if (task.status === 'done') {
    events.push({
      text: 'Completed',
      time: formatTimelineTime(task.completed_at || ''),
      color: green,
    });
  }

  if (task.status === 'failed') {
    events.push({
      text: `Failed: ${(task.error || task.reason || 'unknown').substring(0, 60)}`,
      time: formatTimelineTime(task.failed_at || ''),
      color: red,
    });
  }

  return events;
}

function formatTimelineTime(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' · ' +
           d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

// ── Render: Right Panel (Actions + Meta) ──────────────────

function renderTaskActions(task) {
  const container = document.getElementById('tasks-actions-panel');
  if (!container) return;

  const status = task.status || 'queued';
  const priority = getTaskPriority(task);
  const agent = getTaskAgent(task.agent);

  // Action buttons — status-driven
  let actionsHTML = '';
  switch (status) {
    case 'queued':
      actionsHTML = `
        <div class="tasks-action-group">
          <div class="tasks-action-group-title">Actions</div>
          <button class="tasks-action-btn success" onclick="taskAction('${task.id}','approve')">✅ Approve</button>
          <button class="tasks-action-btn" onclick="taskAction('${task.id}','boost')">⬆️ Boost Priority</button>
          <button class="tasks-action-btn danger" onclick="taskAction('${task.id}','delete')">🗑️ Delete</button>
        </div>`;
      break;
    case 'active':
      actionsHTML = `
        <div class="tasks-action-group">
          <div class="tasks-action-group-title">Actions</div>
          <button class="tasks-action-btn success" onclick="taskAction('${task.id}','complete')">✅ Complete</button>
          <button class="tasks-action-btn danger" onclick="taskAction('${task.id}','fail')">❌ Fail</button>
          <button class="tasks-action-btn" onclick="taskAction('${task.id}','reassign')">🔄 Reassign</button>
        </div>`;
      break;
    case 'done':
      actionsHTML = `
        <div class="tasks-action-group">
          <div class="tasks-action-group-title">Actions</div>
          <button class="tasks-action-btn" onclick="taskAction('${task.id}','reopen')">🔄 Reopen</button>
        </div>`;
      break;
    case 'failed':
      actionsHTML = `
        <div class="tasks-action-group">
          <div class="tasks-action-group-title">Actions</div>
          <button class="tasks-action-btn" onclick="taskAction('${task.id}','retry')">🔄 Retry</button>
          <button class="tasks-action-btn danger" onclick="taskAction('${task.id}','delete')">🗑️ Delete</button>
        </div>`;
      break;
  }

  // Meta info
  const created = task.created_at || task.created || '';
  const metaItems = [
    { label: 'Created', value: created ? new Date(created).toLocaleString() : '—' },
    { label: 'Agent', value: `${agent.emoji} ${agent.name}` },
    { label: 'Priority', value: `${TASK_PRIORITY_BADGES[priority]?.emoji || ''} ${priority}` },
  ];
  if (task.estimated_duration) metaItems.push({ label: 'Est. Duration', value: task.estimated_duration });
  if (task.tokens_used) metaItems.push({ label: 'Tokens', value: task.tokens_used.toLocaleString() });
  if (task.model) metaItems.push({ label: 'Model', value: task.model });
  if (task.fitness !== undefined) metaItems.push({ label: 'Fitness', value: Math.round(task.fitness * 100) + '%' });

  // Linked items
  let linkedHTML = '';
  const linkedItems = [];
  if (task.proposal_id) linkedItems.push({ icon: '📋', label: 'Source Proposal', value: task.proposal_id, action: `nav('queue')` });
  if (task.mission_id) linkedItems.push({ icon: '🎯', label: 'Parent Mission', value: task.mission_id, action: `nav('missions')` });
  if (task.output_files && task.output_files.length > 0) {
    task.output_files.forEach(f => {
      linkedItems.push({ icon: '📄', label: 'Output File', value: f, action: `nav('mind')` });
    });
  }
  if (linkedItems.length > 0) {
    linkedHTML = `<div class="tasks-linked-group">
      <div class="tasks-action-group-title">Linked Items</div>
      ${linkedItems.map(l => `
        <div class="tasks-linked-item" onclick="${l.action}">
          <span>${l.icon}</span>
          <div class="tasks-linked-info">
            <span class="tasks-linked-label">${l.label}</span>
            <span class="tasks-linked-value">${l.value}</span>
          </div>
        </div>
      `).join('')}
    </div>`;
  }

  container.innerHTML = `
    ${actionsHTML}
    <div class="tasks-meta-group">
      <div class="tasks-action-group-title">Info</div>
      ${metaItems.map(m => `
        <div class="tasks-meta-row">
          <span class="tasks-meta-label">${m.label}</span>
          <span class="tasks-meta-value">${m.value}</span>
        </div>
      `).join('')}
    </div>
    ${linkedHTML}
  `;
}

// ── Actions ───────────────────────────────────────────────

async function taskAction(taskId, action) {
  const baseUrl = (typeof Bridge !== 'undefined' && Bridge.baseUrl) ? Bridge.baseUrl : '';

  try {
    switch (action) {
      case 'approve':
        await Bridge.approveDispatchTask(taskId);
        toast('✅ Task approved and moved to active', 'success');
        break;
      case 'cancel':
        await fetch(`${baseUrl}/api/tasks/${encodeURIComponent(taskId)}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
        toast('❌ Task cancelled', 'info');
        break;
      case 'retry':
        await fetch(`${baseUrl}/api/tasks/${encodeURIComponent(taskId)}/retry`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
        toast('🔄 Task requeued', 'success');
        break;
      case 'boost': {
        const task = tasksPageData.find(t => t.id === taskId);
        const curP = getTaskPriority(task);
        const newP = curP === 'P3' ? 'P2' : curP === 'P2' ? 'P1' : curP === 'P1' ? 'P0' : 'P0';
        await fetch(`${baseUrl}/api/tasks/${encodeURIComponent(taskId)}/priority`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ priority: newP }),
        });
        toast(`⬆️ Priority boosted to ${newP}`, 'success');
        break;
      }
      case 'complete':
      case 'fail':
      case 'reassign':
      case 'reopen':
      case 'delete':
        toast(`🚧 "${action}" not yet implemented`, 'info');
        break;
      case 'check':
        toast('🔍 Checking task status...', 'info');
        break;
    }
    // Refresh data
    setTimeout(loadTasksPage, 500);
  } catch (e) {
    toast(`❌ Action failed: ${e.message}`, 'error');
  }
}

// ── Filters & Sort ────────────────────────────────────────

function setTasksFilter(filter) {
  tasksFilter = filter;
  tasksSelectedId = null;
  renderTasksList();
  // Auto-select first in filtered list
  const filtered = getFilteredTasks();
  if (filtered.length > 0) {
    selectTask(filtered[0].id);
  } else {
    // Clear detail and actions panels
    const detail = document.getElementById('tasks-detail-panel');
    const actions = document.getElementById('tasks-actions-panel');
    if (detail) detail.innerHTML = '<div class="tasks-detail-empty"><div style="font-size:48px;margin-bottom:12px">📋</div><div style="color:var(--text-muted)">Select a task to view details</div></div>';
    if (actions) actions.innerHTML = '';
  }
}

function setTasksSort(sort) {
  tasksSort = sort;
  renderTasksList();
}

// ── Init & Polling ────────────────────────────────────────

function initTasksPage() {
  loadTasksPage();
  if (!tasksPollTimer) {
    tasksPollTimer = setInterval(loadTasksPage, 10000);
  }
}

function stopTasksPagePolling() {
  if (tasksPollTimer) {
    clearInterval(tasksPollTimer);
    tasksPollTimer = null;
  }
}

// Hook into nav system
const _origNav = nav;
// We need to patch nav to support tasks page — wrap at load time
(function patchNav() {
  const origNav = window.nav;
  if (!origNav) return;

  window.nav = function(page) {
    // If leaving tasks page, stop polling
    if (currentPage === 'tasks' && page !== 'tasks') {
      stopTasksPagePolling();
    }

    origNav(page);

    // If entering tasks page, init
    if (page === 'tasks') {
      initTasksPage();
    }
  };
})();
