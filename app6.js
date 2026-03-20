/* Agent OS v7 — app6.js — Task Lifecycle + Discord Mirror + Workflow Viz */
'use strict';

// ═══════════════════════════════════════════════════════════
// TASK LIFECYCLE TRACKER
// ═══════════════════════════════════════════════════════════

let taskTrackerData = { active: [], queue: [], done: [], failed: [] };
let taskTrackerTimer = null;
let taskTrackerSeenIds = new Set();
let taskTrackerPrevActive = new Set();

const TASK_AGENT_EMOJI = {
  researcher: '🔬', coder: '💻', ops: '⚙️', righthand: '🤝',
  utility: '🔧', devil: '😈', system: '🤖', unknown: '🤖',
};

function getTaskAgentEmoji(agent) {
  if (!agent) return '🤖';
  const key = agent.toLowerCase().replace(/[^a-z]/g, '');
  return TASK_AGENT_EMOJI[key] || '🤖';
}

function taskTimeElapsed(createdAt) {
  if (!createdAt) return '';
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m`;
  return `${Math.floor(diff / 86400)}d`;
}

async function fetchTaskLifecycle() {
  try {
    const [active, queue, done, failed] = await Promise.all([
      fetch('/api/tasks/active').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/tasks/queue').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/tasks/done').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/tasks/failed').then(r => r.ok ? r.json() : []).catch(() => []),
    ]);

    const prevActiveIds = new Set(taskTrackerData.active.map(t => t.id));
    const newDoneIds = new Set(done.map(t => t.id));

    // Detect tasks that moved from active to done
    for (const id of prevActiveIds) {
      if (newDoneIds.has(id) && !taskTrackerSeenIds.has('done-' + id)) {
        taskTrackerSeenIds.add('done-' + id);
        const task = done.find(t => t.id === id);
        if (task) {
          showTaskCompletionCelebration(task);
        }
      }
    }

    taskTrackerPrevActive = prevActiveIds;
    taskTrackerData = { active, queue, done: done.slice(0, 10), failed: failed.slice(0, 5) };
    return taskTrackerData;
  } catch (e) {
    console.warn('[TaskTracker] Fetch error:', e.message);
    return taskTrackerData;
  }
}

function showTaskCompletionCelebration(task) {
  toast(`🎉 Task completed: ${task.title || task.task || task.id}`, 'success', 4000);
  // Gold glow on the completed card
  const card = document.querySelector(`[data-task-id="${task.id}"]`);
  if (card) {
    card.classList.add('task-celebrate');
    setTimeout(() => card.classList.remove('task-celebrate'), 2000);
  }
}

function renderTaskTracker() {
  const container = document.getElementById('task-tracker-section');
  if (!container) return;

  const { active, queue, done, failed } = taskTrackerData;

  let html = '';

  // Active Work
  if (active.length > 0 || queue.length > 0) {
    html += `<div class="task-tracker-group">
      <div class="task-tracker-group-header">
        <span class="task-tracker-group-icon">🔵</span>
        <span class="task-tracker-group-title">Active Work</span>
        <span class="task-tracker-group-count">${active.length} active, ${queue.length} queued</span>
      </div>
      <div class="task-tracker-cards">`;

    for (const task of active) {
      html += makeTaskCard(task, 'active');
    }
    for (const task of queue.slice(0, 5)) {
      html += makeTaskCard(task, 'queued');
    }
    html += `</div></div>`;
  }

  // Recently Completed
  if (done.length > 0) {
    html += `<div class="task-tracker-group">
      <div class="task-tracker-group-header">
        <span class="task-tracker-group-icon">✅</span>
        <span class="task-tracker-group-title">Recently Completed</span>
        <span class="task-tracker-group-count">${done.length}</span>
      </div>
      <div class="task-tracker-compact-list">`;
    for (const task of done) {
      const agent = task.agent || 'system';
      const elapsed = taskTimeElapsed(task.completed_at || task.created_at || task.created);
      html += `<div class="task-tracker-compact-item done">
        <span>✅</span>
        <span class="task-tracker-compact-title">${task.title || task.task || task.id}</span>
        <span class="task-tracker-compact-agent">${getTaskAgentEmoji(agent)} ${agent}</span>
        <span class="task-tracker-compact-time">${elapsed} ago</span>
      </div>`;
    }
    html += `</div></div>`;
  }

  // Failed
  if (failed.length > 0) {
    html += `<div class="task-tracker-group">
      <div class="task-tracker-group-header">
        <span class="task-tracker-group-icon">🔴</span>
        <span class="task-tracker-group-title">Failed</span>
        <span class="task-tracker-group-count">${failed.length}</span>
      </div>
      <div class="task-tracker-compact-list">`;
    for (const task of failed) {
      const agent = task.agent || 'system';
      html += `<div class="task-tracker-compact-item failed">
        <span>🔴</span>
        <span class="task-tracker-compact-title">${task.title || task.task || task.id}</span>
        <span class="task-tracker-compact-agent">${getTaskAgentEmoji(agent)} ${agent}</span>
        <span class="task-tracker-compact-time">${task.error ? task.error.substring(0, 40) + '…' : ''}</span>
      </div>`;
    }
    html += `</div></div>`;
  }

  if (!html) {
    html = `<div class="task-tracker-empty">
      <span>🚀</span> No dispatch tasks right now — approve a proposal to get started
    </div>`;
  }

  container.innerHTML = html;
}

function makeTaskCard(task, status) {
  const agent = task.agent || 'system';
  const emoji = getTaskAgentEmoji(agent);
  const title = task.title || task.task || task.id;
  const elapsed = taskTimeElapsed(task.created_at || task.created);
  const isActive = status === 'active';
  const statusDot = isActive ? 'task-status-active' : 'task-status-queued';
  const statusLabel = isActive ? '🔵 Active' : '🟡 Queued';
  const desc = task.description || task.context || task.output_contract || '';

  return `<div class="task-tracker-card ${status}" data-task-id="${task.id}">
    <div class="task-tracker-card-header">
      <span class="task-tracker-card-agent">${emoji}</span>
      <span class="task-tracker-card-title">${title.length > 80 ? title.substring(0, 80) + '…' : title}</span>
      <span class="task-tracker-card-status ${statusDot}">${statusLabel}</span>
    </div>
    <div class="task-tracker-card-meta">
      <span class="task-tracker-card-agent-name">${agent}</span>
      <span class="task-tracker-card-elapsed">⏱ ${elapsed}</span>
      ${task.priority ? `<span class="task-tracker-card-priority">${task.priority}</span>` : ''}
    </div>
    ${desc ? `<div class="task-tracker-card-desc">${desc.substring(0, 120)}${desc.length > 120 ? '…' : ''}</div>` : ''}
  </div>`;
}

// Enhanced proposal approval with tracking
async function approveAndTrack(proposalId, option) {
  try {
    const res = await fetch(`/api/proposals/${proposalId}/approve-and-track`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ option }),
    });
    const data = await res.json();
    if (data.taskId) {
      toast(`✅ Approved → Task ${data.taskId} created`, 'success', 3000);
    } else {
      toast('✅ Approved → Task created', 'success', 3000);
    }
    // Refresh tasks immediately
    await fetchTaskLifecycle();
    renderTaskTracker();
    // Also refresh proposals
    if (typeof loadLiveProposals === 'function') loadLiveProposals();
    return data;
  } catch (e) {
    console.warn('[approveAndTrack] Error:', e.message);
    toast('Approval failed: ' + e.message, 'error');
    return null;
  }
}

// Start task tracker polling
function startTaskTracker() {
  if (taskTrackerTimer) return;
  fetchTaskLifecycle().then(() => renderTaskTracker());
  taskTrackerTimer = setInterval(async () => {
    if (!shouldPoll()) return;
    await fetchTaskLifecycle();
    renderTaskTracker();
    // Also update workflow viz if on system page
    if (currentPage === 'pulse') updateWorkflowViz();
  }, 10000);
}

function stopTaskTracker() {
  if (taskTrackerTimer) {
    clearInterval(taskTrackerTimer);
    taskTrackerTimer = null;
  }
}

// ═══════════════════════════════════════════════════════════
// DISCORD MIRROR IN STREAM
// ═══════════════════════════════════════════════════════════

let discordMirrorMessages = [];
let discordMirrorSeenIds = new Set();
let discordMirrorTimer = null;

async function fetchDiscordRecent() {
  try {
    const res = await fetch('/api/discord/recent?limit=20');
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

function mergeDiscordIntoStream() {
  if (!streamItems || typeof streamItems === 'undefined') return;

  for (const msg of discordMirrorMessages) {
    if (discordMirrorSeenIds.has(msg.id)) continue;
    discordMirrorSeenIds.add(msg.id);

    // Create a stream item for this Discord message
    const streamItem = {
      id: 'discord-' + msg.id,
      type: 'discord',
      streamType: 'discord',
      agent: msg.authorBot ? 'righthand' : 'user',
      title: msg.content ? msg.content.substring(0, 120) : '[embed]',
      detail: msg.content || '',
      time: msg.timestamp,
      displayTime: formatStreamTime(msg.timestamp),
      source: 'discord',
      read: false,
      _discordAuthor: msg.author,
      _discordFull: msg.content,
      _isDiscord: true,
    };

    // Only add if not already in stream
    if (!streamItems.find(i => i.id === streamItem.id)) {
      streamItems.push(streamItem);
    }
  }
}

async function pollDiscordMirror() {
  const messages = await fetchDiscordRecent();
  if (messages.length === 0) return;

  const prevCount = discordMirrorMessages.length;
  discordMirrorMessages = messages;

  mergeDiscordIntoStream();

  // Re-render stream if on feed page and we have new messages
  if (currentPage === 'feed' && messages.length > prevCount) {
    renderStreamItems();
  }
}

function startDiscordMirror() {
  if (discordMirrorTimer) return;
  pollDiscordMirror();
  discordMirrorTimer = setInterval(pollDiscordMirror, 30000);
}

// Patch makeStreamItem to handle discord type
const _origMakeStreamItem = typeof makeStreamItem === 'function' ? makeStreamItem : null;
if (_origMakeStreamItem) {
  window.makeStreamItem = function(item, idx) {
    if (item._isDiscord) {
      return makeDiscordStreamItem(item, idx);
    }
    return _origMakeStreamItem(item, idx);
  };
}

function makeDiscordStreamItem(item, idx) {
  const el = document.createElement('div');
  el.className = 'stream-item discord-mirror-item';
  el.dataset.type = 'discord';
  el.dataset.id = item.id;
  el.dataset.idx = idx;

  const timeStr = item.displayTime || formatStreamTime(item.time);
  const author = item._discordAuthor || 'Unknown';
  const content = item.title || '';
  const fullContent = item._discordFull || item.detail || '';
  const truncated = content.length > 120;

  el.innerHTML = `
    <div class="stream-item-header" onclick="toggleStreamExpand('${item.id}')">
      <div class="stream-item-icon discord-icon">📡</div>
      <span class="stream-item-agent discord-author">${author}</span>
      <span class="stream-item-type-badge discord-badge">📡 Discord</span>
      <span class="stream-item-title">${content}${truncated ? '…' : ''}</span>
      <span class="stream-item-time">${timeStr}</span>
    </div>
    <div class="stream-item-detail">
      ${fullContent ? `<div class="stream-item-detail-text discord-full-content">${fullContent}</div>` : ''}
    </div>
  `;
  return el;
}

// ═══════════════════════════════════════════════════════════
// WORKFLOW VISUALIZATION (System Page)
// ═══════════════════════════════════════════════════════════

let workflowVizTimer = null;

async function updateWorkflowViz() {
  const container = document.getElementById('workflow-viz');
  if (!container) return;

  // Fetch counts
  let proposalCount = 0, queueCount = 0, activeCount = 0, doneCount = 0, failedCount = 0;

  try {
    const [proposals, tasks] = await Promise.all([
      fetch('/api/proposals?status=pending').then(r => r.ok ? r.json() : []).catch(() => []),
      fetch('/api/tasks/all').then(r => r.ok ? r.json() : []).catch(() => []),
    ]);

    proposalCount = proposals.length;
    queueCount = tasks.filter(t => t.status === 'queued').length;
    activeCount = tasks.filter(t => t.status === 'active').length;
    doneCount = tasks.filter(t => t.status === 'done').length;
    failedCount = tasks.filter(t => t.status === 'failed').length;
  } catch {}

  // Approval count = recent approved proposals
  const approvedCount = 0; // Would need a separate query; using 0 for simplicity

  const stages = [
    { label: 'Proposals', count: proposalCount, icon: '📋', color: '#f9e2af', active: proposalCount > 0 },
    { label: 'Approved', count: approvedCount, icon: '✅', color: '#a6e3a1', active: false },
    { label: 'Queued', count: queueCount, icon: '📥', color: '#89b4fa', active: queueCount > 0 },
    { label: 'Working', count: activeCount, icon: '⚡', color: '#fab387', active: activeCount > 0, pulse: true },
    { label: 'Done', count: doneCount, icon: '🏁', color: '#a6e3a1', active: false },
    { label: 'Failed', count: failedCount, icon: '🔴', color: '#f38ba8', active: failedCount > 0 },
  ];

  container.innerHTML = `
    <div class="workflow-pipeline">
      ${stages.map((s, i) => `
        <div class="workflow-stage ${s.active ? 'workflow-stage-active' : ''} ${s.pulse ? 'workflow-stage-pulse' : ''}">
          <div class="workflow-stage-icon">${s.icon}</div>
          <div class="workflow-stage-count" style="color:${s.color}">${s.count}</div>
          <div class="workflow-stage-label">${s.label}</div>
        </div>
        ${i < stages.length - 1 ? '<div class="workflow-arrow">→</div>' : ''}
      `).join('')}
    </div>
  `;
}

function startWorkflowViz() {
  if (workflowVizTimer) return;
  updateWorkflowViz();
  workflowVizTimer = setInterval(updateWorkflowViz, 15000);
}

// ═══════════════════════════════════════════════════════════
// INITIALIZATION — Wire into existing nav/page lifecycle
// ═══════════════════════════════════════════════════════════

// Patch nav to start/stop task tracker and workflow viz
const _origNav6 = window.nav;
window.nav = function(page) {
  _origNav6(page);

  // Start task tracker when on proposals page
  if (page === 'queue') {
    startTaskTracker();
  }

  // Start workflow viz when on system page
  if (page === 'pulse') {
    startWorkflowViz();
  }
};

// Start Discord mirror and task tracker on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    startDiscordMirror();
    // Task tracker starts on first visit to queue/tasks page, not on load
  }, 2000);
});

// Add discord type to the stream rendering maps
if (typeof STREAM_TYPE_COLORS !== 'undefined') {
  STREAM_TYPE_COLORS.discord = '#5865F2';
}
if (typeof STREAM_TYPE_BG !== 'undefined') {
  STREAM_TYPE_BG.discord = 'rgba(88,101,242,0.15)';
}
if (typeof TYPE_ICONS !== 'undefined') {
  TYPE_ICONS.discord = '📡';
}
if (typeof TYPE_LABELS !== 'undefined') {
  TYPE_LABELS.discord = 'discord';
}
