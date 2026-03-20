/* Agent OS v7 — projects.js — Projects Page */
'use strict';

// ═══════════════════════════════════════════════════════════
// PROJECTS PAGE — Group tasks, missions, vault notes
// ═══════════════════════════════════════════════════════════

let projectsData = [];
let projectsLocalData = JSON.parse(localStorage.getItem('agentOS-projects') || '[]');
let projectsSelectedId = null;
let projectsDetailTab = 'overview';
let projectsPollTimer = null;

const PROJECT_STATUS = {
  active:    { emoji: '🟢', color: '#a6e3a1', label: 'Active' },
  planning:  { emoji: '🟡', color: '#f9e2af', label: 'Planning' },
  review:    { emoji: '🔵', color: '#89b4fa', label: 'Review' },
  paused:    { emoji: '⏸️', color: '#6c7086', label: 'Paused' },
  complete:  { emoji: '✅', color: '#a6e3a1', label: 'Complete' },
};

// ── Data Loading ──────────────────────────────────────────

async function loadProjects() {
  try {
    const resp = await fetch('/api/projects');
    if (resp.ok) {
      const data = await resp.json();
      // Merge with local projects
      const bridgeIds = new Set(data.map(p => p.id));
      const localOnly = projectsLocalData.filter(p => !bridgeIds.has(p.id));
      projectsData = [...data, ...localOnly];
    } else {
      projectsData = [...projectsLocalData];
    }
  } catch {
    projectsData = [...projectsLocalData];
  }

  // Fallback: if still empty, use curated defaults
  if (projectsData.length === 0) {
    projectsData = getDefaultProjects();
  }

  renderProjectsGrid();
  updateProjectsBadge();
}

function getDefaultProjects() {
  return [
    { id: 'agent-os', name: 'Agent OS Frontend', status: 'active', description: 'Ship the native web UI for Agent OS', tasks_active: 6, tasks_done: 12, vault_notes: 8, mission: 'ship-agent-os', last_activity: new Date(Date.now() - 300000).toISOString(), created_at: new Date(Date.now() - 86400000 * 14).toISOString() },
    { id: 'vault-knowledge', name: 'Vault Knowledge System', status: 'active', description: 'Build a comprehensive knowledge graph from vault notes', tasks_active: 2, tasks_done: 5, vault_notes: 15, mission: null, last_activity: new Date(Date.now() - 1800000).toISOString(), created_at: new Date(Date.now() - 86400000 * 30).toISOString() },
    { id: 'dispatch-v2', name: 'Dispatch System v2', status: 'planning', description: 'Next-gen dispatch with proposal engine and auto-triage', tasks_active: 0, tasks_done: 3, vault_notes: 4, mission: null, last_activity: new Date(Date.now() - 7200000).toISOString(), created_at: new Date(Date.now() - 86400000 * 7).toISOString() },
  ];
}

function updateProjectsBadge() {
  const active = projectsData.filter(p => p.status === 'active').length;
  const badge = document.getElementById('projects-badge');
  if (badge) {
    badge.textContent = active || '';
    badge.style.display = active > 0 ? '' : 'none';
  }
}

// ── Render: Card Grid ─────────────────────────────────────

function renderProjectsGrid() {
  const container = document.getElementById('projects-container');
  if (!container) return;

  if (projectsData.length === 0) {
    container.innerHTML = `<div class="projects-empty">
      <div class="projects-empty-icon">📁</div>
      <div class="projects-empty-title">No projects yet</div>
      <div class="projects-empty-desc">Create a project to group tasks, missions, and vault notes together</div>
      <button class="projects-new-btn-empty" onclick="showNewProjectModal()">+ New Project</button>
    </div>`;
    return;
  }

  // Header with new project button
  let html = `<div class="projects-topbar">
    <button class="projects-new-btn" onclick="showNewProjectModal()">+ New Project</button>
  </div>`;

  html += '<div class="projects-cards">';
  projectsData.forEach(project => {
    html += makeProjectCard(project);
  });
  html += '</div>';

  // Detail view (hidden by default)
  html += `<div class="projects-detail-view" id="projects-detail-view" style="display:none"></div>`;

  container.innerHTML = html;
}

function makeProjectCard(p) {
  const st = PROJECT_STATUS[p.status] || PROJECT_STATUS.active;
  const totalTasks = (p.tasks_done || 0) + (p.tasks_active || 0);
  const progress = totalTasks > 0 ? Math.round(((p.tasks_done || 0) / totalTasks) * 100) : 0;
  const lastActivity = p.last_activity ? projectRelativeTime(p.last_activity) : '';
  const missionCount = p.mission ? 1 : (p.missions || 0);

  return `<div class="project-card" data-project-id="${p.id}" onclick="selectProject('${p.id}')">
    <div class="project-card-header">
      <span class="project-card-icon">📁</span>
      <span class="project-card-name">${p.name || 'Untitled'}</span>
      <span class="project-card-status" style="color:${st.color}" title="${st.label}">${st.emoji}</span>
    </div>
    ${p.description ? `<div class="project-card-desc">${(p.description || '').substring(0, 80)}${(p.description || '').length > 80 ? '…' : ''}</div>` : ''}
    <div class="project-card-progress">
      <div class="project-progress-bar">
        <div class="project-progress-fill" style="width:${progress}%;background:${st.color}"></div>
      </div>
      <span class="project-progress-pct">${progress}%</span>
    </div>
    <div class="project-card-stats">
      <span class="project-stat">✅ ${p.tasks_done || 0} done</span>
      <span class="project-stat">🔄 ${p.tasks_active || 0} active</span>
    </div>
    <div class="project-card-stats">
      <span class="project-stat">📝 ${p.vault_notes || 0} notes</span>
      ${missionCount > 0 ? `<span class="project-stat">🎯 ${missionCount} mission${missionCount !== 1 ? 's' : ''}</span>` : ''}
    </div>
    ${lastActivity ? `<div class="project-card-activity">Last activity: ${lastActivity}</div>` : ''}
  </div>`;
}

function projectRelativeTime(dateStr) {
  if (!dateStr) return '';
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return Math.floor(diff / 86400) + 'd ago';
}

// ── Project Detail View ───────────────────────────────────

async function selectProject(projectId) {
  projectsSelectedId = projectId;
  const project = projectsData.find(p => p.id === projectId);
  if (!project) return;

  // Hide the cards grid, show detail
  const cardsEl = document.querySelector('.projects-cards');
  const topbar = document.querySelector('.projects-topbar');
  const detailEl = document.getElementById('projects-detail-view');
  if (cardsEl) cardsEl.style.display = 'none';
  if (topbar) topbar.style.display = 'none';
  if (detailEl) detailEl.style.display = 'block';

  projectsDetailTab = 'overview';
  renderProjectDetail(project);
}

function closeProjectDetail() {
  projectsSelectedId = null;
  const cardsEl = document.querySelector('.projects-cards');
  const topbar = document.querySelector('.projects-topbar');
  const detailEl = document.getElementById('projects-detail-view');
  if (cardsEl) cardsEl.style.display = '';
  if (topbar) topbar.style.display = '';
  if (detailEl) detailEl.style.display = 'none';
}

async function renderProjectDetail(project) {
  const detailEl = document.getElementById('projects-detail-view');
  if (!detailEl) return;

  const st = PROJECT_STATUS[project.status] || PROJECT_STATUS.active;
  const totalTasks = (project.tasks_done || 0) + (project.tasks_active || 0);
  const progress = totalTasks > 0 ? Math.round(((project.tasks_done || 0) / totalTasks) * 100) : 0;

  detailEl.innerHTML = `
    <div class="project-detail-header">
      <button class="project-detail-back" onclick="closeProjectDetail()">← Back</button>
      <div class="project-detail-title-row">
        <span class="project-detail-icon">📁</span>
        <h2 class="project-detail-name">${project.name || 'Untitled'}</h2>
        <span class="project-detail-status" style="background:${st.color}20;color:${st.color}">${st.emoji} ${st.label}</span>
      </div>
      ${project.description ? `<p class="project-detail-desc">${project.description}</p>` : ''}
      <div class="project-detail-progress">
        <div class="project-progress-bar large">
          <div class="project-progress-fill" style="width:${progress}%;background:${st.color}"></div>
        </div>
        <span class="project-progress-pct">${progress}%</span>
      </div>
    </div>
    <div class="project-detail-tabs">
      <button class="project-tab${projectsDetailTab === 'overview' ? ' active' : ''}" onclick="setProjectTab('overview')">📋 Overview</button>
      <button class="project-tab${projectsDetailTab === 'tasks' ? ' active' : ''}" onclick="setProjectTab('tasks')">✅ Tasks</button>
      <button class="project-tab${projectsDetailTab === 'notes' ? ' active' : ''}" onclick="setProjectTab('notes')">📝 Notes</button>
      <button class="project-tab${projectsDetailTab === 'activity' ? ' active' : ''}" onclick="setProjectTab('activity')">📊 Activity</button>
    </div>
    <div class="project-detail-content" id="project-detail-content"></div>
  `;

  renderProjectTabContent(project);
}

function setProjectTab(tab) {
  projectsDetailTab = tab;
  document.querySelectorAll('.project-tab').forEach(t => t.classList.toggle('active', t.textContent.toLowerCase().includes(tab)));
  const project = projectsData.find(p => p.id === projectsSelectedId);
  if (project) renderProjectTabContent(project);
}

async function renderProjectTabContent(project) {
  const contentEl = document.getElementById('project-detail-content');
  if (!contentEl) return;

  switch (projectsDetailTab) {
    case 'overview':
      renderProjectOverview(contentEl, project);
      break;
    case 'tasks':
      await renderProjectTasks(contentEl, project);
      break;
    case 'notes':
      await renderProjectNotes(contentEl, project);
      break;
    case 'activity':
      await renderProjectActivity(contentEl, project);
      break;
  }
}

function renderProjectOverview(el, project) {
  const st = PROJECT_STATUS[project.status] || PROJECT_STATUS.active;
  const created = project.created_at ? new Date(project.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
  const lastAct = project.last_activity ? projectRelativeTime(project.last_activity) : '—';

  el.innerHTML = `
    <div class="project-overview-grid">
      <div class="project-overview-card">
        <div class="project-overview-label">Status</div>
        <div class="project-overview-value" style="color:${st.color}">${st.emoji} ${st.label}</div>
      </div>
      <div class="project-overview-card">
        <div class="project-overview-label">Created</div>
        <div class="project-overview-value">${created}</div>
      </div>
      <div class="project-overview-card">
        <div class="project-overview-label">Last Activity</div>
        <div class="project-overview-value">${lastAct}</div>
      </div>
      <div class="project-overview-card">
        <div class="project-overview-label">Tasks</div>
        <div class="project-overview-value">✅ ${project.tasks_done || 0} done · 🔄 ${project.tasks_active || 0} active</div>
      </div>
      <div class="project-overview-card">
        <div class="project-overview-label">Vault Notes</div>
        <div class="project-overview-value">📝 ${project.vault_notes || 0}</div>
      </div>
      ${project.mission ? `<div class="project-overview-card">
        <div class="project-overview-label">Linked Mission</div>
        <div class="project-overview-value project-mission-link" onclick="goToEntity('mission','${project.mission}','${project.mission}')">🎯 ${project.mission}</div>
      </div>` : ''}
    </div>
  `;
}

async function renderProjectTasks(el, project) {
  el.innerHTML = '<div class="project-loading">Loading tasks...</div>';

  let tasks = [];
  try {
    const resp = await fetch('/api/tasks/all');
    if (resp.ok) {
      const allTasks = await resp.json();
      // Filter by project name/id keywords
      const keywords = [project.id, project.name.toLowerCase()].filter(Boolean);
      tasks = allTasks.filter(t => {
        const text = ((t.title || '') + ' ' + (t.description || '') + ' ' + (t.task || '') + ' ' + (t.context || '') + ' ' + (t.project || '')).toLowerCase();
        return keywords.some(kw => text.includes(kw.toLowerCase()));
      });
    }
  } catch { /* bridge down */ }

  if (tasks.length === 0) {
    el.innerHTML = `<div class="project-tab-empty">
      <div style="font-size:32px;margin-bottom:8px">✅</div>
      <div style="color:var(--text-muted)">No tasks found for this project</div>
    </div>`;
    return;
  }

  const statusOrder = { active: 0, queued: 1, done: 2, failed: 3 };
  tasks.sort((a, b) => (statusOrder[a.status] || 9) - (statusOrder[b.status] || 9));

  el.innerHTML = `<div class="project-tasks-list">
    ${tasks.map(t => {
      const sc = { queued: '#f9e2af', active: '#89b4fa', done: '#a6e3a1', failed: '#f38ba8' };
      const color = sc[t.status] || '#6c7086';
      const title = t.title || t.task || t.id || 'Untitled';
      return `<div class="project-task-item" onclick="goToEntity('task','${t.id}','${title.replace(/'/g, "\\'")}')">
        <span class="project-task-dot" style="background:${color}"></span>
        <span class="project-task-title">${title.substring(0, 70)}${title.length > 70 ? '…' : ''}</span>
        <span class="project-task-status" style="color:${color}">${t.status}</span>
      </div>`;
    }).join('')}
  </div>`;
}

async function renderProjectNotes(el, project) {
  el.innerHTML = '<div class="project-loading">Searching vault...</div>';

  let notes = [];
  try {
    const resp = await fetch(`/api/vault/search?q=${encodeURIComponent(project.name)}&limit=15`);
    if (resp.ok) notes = await resp.json();
  } catch { /* bridge down */ }

  if (notes.length === 0) {
    el.innerHTML = `<div class="project-tab-empty">
      <div style="font-size:32px;margin-bottom:8px">📝</div>
      <div style="color:var(--text-muted)">No vault notes found for "${project.name}"</div>
    </div>`;
    return;
  }

  el.innerHTML = `<div class="project-notes-list">
    ${notes.map(n => {
      const title = n.title || n.path || 'Untitled';
      const snippet = (n.snippet || n.context || '').substring(0, 120);
      return `<div class="project-note-item" onclick="goToEntity('note','${(n.path || title).replace(/'/g, "\\'")}','${title.replace(/'/g, "\\'")}')">
        <div class="project-note-title">📝 ${title}</div>
        ${snippet ? `<div class="project-note-snippet">${snippet}${snippet.length >= 120 ? '…' : ''}</div>` : ''}
      </div>`;
    }).join('')}
  </div>`;
}

async function renderProjectActivity(el, project) {
  el.innerHTML = '<div class="project-loading">Loading activity...</div>';

  let events = [];
  try {
    const resp = await fetch('/api/feed?limit=50');
    if (resp.ok) {
      const allEvents = await resp.json();
      const keywords = [project.id, project.name.toLowerCase()].filter(Boolean);
      events = allEvents.filter(e => {
        const text = ((e.content || '') + ' ' + (e.detail || '') + ' ' + (e.summary || '')).toLowerCase();
        return keywords.some(kw => text.includes(kw.toLowerCase()));
      }).slice(0, 20);
    }
  } catch { /* bridge down */ }

  if (events.length === 0) {
    el.innerHTML = `<div class="project-tab-empty">
      <div style="font-size:32px;margin-bottom:8px">📊</div>
      <div style="color:var(--text-muted)">No recent activity for this project</div>
    </div>`;
    return;
  }

  el.innerHTML = `<div class="project-activity-list">
    ${events.map(e => {
      const time = e.timestamp ? projectRelativeTime(e.timestamp) : '';
      const icon = e.type === 'task_complete' ? '✅' : e.type === 'vault_write' ? '📝' : e.type === 'error' ? '🔴' : '⚡';
      return `<div class="project-activity-item">
        <span class="project-activity-icon">${icon}</span>
        <span class="project-activity-text">${(e.content || e.summary || '').substring(0, 100)}</span>
        <span class="project-activity-time">${time}</span>
      </div>`;
    }).join('')}
  </div>`;
}

// ── New Project Modal ─────────────────────────────────────

function showNewProjectModal() {
  const existing = document.getElementById('new-project-modal');
  if (existing) { existing.remove(); return; }

  const m = document.createElement('div');
  m.id = 'new-project-modal';
  m.className = 'project-modal-overlay';
  m.onclick = (e) => { if (e.target === m) m.remove(); };

  m.innerHTML = `
    <div class="project-modal">
      <div class="project-modal-header">
        <h3>📁 New Project</h3>
        <button class="project-modal-close" onclick="document.getElementById('new-project-modal').remove()">✕</button>
      </div>
      <div class="project-modal-body">
        <label class="project-modal-label">Project Name</label>
        <input type="text" id="new-project-name" class="project-modal-input" placeholder="e.g., Agent OS Frontend">
        <label class="project-modal-label">Description</label>
        <textarea id="new-project-desc" class="project-modal-textarea" placeholder="What is this project about?" rows="3"></textarea>
        <label class="project-modal-label">Status</label>
        <select id="new-project-status" class="project-modal-select">
          <option value="active">🟢 Active</option>
          <option value="planning">🟡 Planning</option>
          <option value="review">🔵 Review</option>
          <option value="paused">⏸️ Paused</option>
        </select>
        <label class="project-modal-label">Linked Mission (optional)</label>
        <input type="text" id="new-project-mission" class="project-modal-input" placeholder="e.g., ship-agent-os">
      </div>
      <div class="project-modal-footer">
        <button class="project-modal-cancel" onclick="document.getElementById('new-project-modal').remove()">Cancel</button>
        <button class="project-modal-create" onclick="createNewProject()">Create Project</button>
      </div>
    </div>
  `;

  document.body.appendChild(m);
  setTimeout(() => document.getElementById('new-project-name')?.focus(), 100);
}

async function createNewProject() {
  const name = document.getElementById('new-project-name')?.value?.trim();
  const desc = document.getElementById('new-project-desc')?.value?.trim();
  const status = document.getElementById('new-project-status')?.value || 'active';
  const mission = document.getElementById('new-project-mission')?.value?.trim();

  if (!name) {
    toast('Project name is required', 'error');
    return;
  }

  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const project = {
    id,
    name,
    description: desc || '',
    status,
    mission: mission || null,
    tasks_active: 0,
    tasks_done: 0,
    vault_notes: 0,
    last_activity: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  // Save locally
  projectsLocalData.push(project);
  localStorage.setItem('agentOS-projects', JSON.stringify(projectsLocalData));

  // Try to POST to bridge
  try {
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(project),
    });
  } catch { /* bridge may be down, local storage is fine */ }

  document.getElementById('new-project-modal')?.remove();
  toast(`📁 Project "${name}" created`, 'success');
  loadProjects();
}

// ── Init & Polling ────────────────────────────────────────

function initProjectsPage() {
  loadProjects();
  if (!projectsPollTimer) {
    projectsPollTimer = setInterval(loadProjects, 30000);
  }
}

function stopProjectsPolling() {
  if (projectsPollTimer) {
    clearInterval(projectsPollTimer);
    projectsPollTimer = null;
  }
}

// Hook into nav system
(function patchNavForProjects() {
  const origNav = window.nav;
  if (!origNav) return;
  window.nav = function(page) {
    if (currentPage === 'projects' && page !== 'projects') {
      stopProjectsPolling();
    }
    origNav(page);
    if (page === 'projects') {
      initProjectsPage();
    }
  };
})();
