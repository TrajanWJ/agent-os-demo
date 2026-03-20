/* Agent OS v5 — app2.js — Pulse + Plans */
'use strict';


// ═══════════════════════════════════════════════════════════
// PULSE PAGE
// ═══════════════════════════════════════════════════════════

function renderPulse() {
  if (window.innerWidth <= 768) {
    renderPulseMobileAccordion();
  } else {
    renderAgentHealth();
    renderCostChart();
    renderSystemLoad();
    renderCrons();
    renderHooks();
    renderErrorLog();
  }
}

function renderPulseMobileAccordion() {
  const grid = document.querySelector('.pulse-grid');
  if (!grid) return;

  // Render content into temporary containers
  renderAgentHealth();
  renderCostChart();
  renderSystemLoad();
  renderCrons();
  renderHooks();
  renderErrorLog();

  const sections = [
    { icon: '\u{1F916}', title: 'Agent Health', contentId: 'agent-health-table' },
    { icon: '\u{1F4B0}', title: 'Cost (7 days)', contentId: 'cost-chart', isParent: '.cost-chart-container' },
    { icon: '\u{1F4CA}', title: 'System Load', contentId: 'system-load' },
    { icon: '\u23F0', title: 'Cron Jobs', contentId: 'cron-status' },
    { icon: '\u{1F517}', title: 'Webhooks', contentId: 'hook-status' },
    { icon: '\u{1F6A8}', title: 'Recent Errors', contentId: 'error-log' },
  ];

  // Wrap each pulse-section in accordion markup
  const pulseSections = grid.querySelectorAll('.pulse-section');
  sections.forEach((sec, i) => {
    const psEl = pulseSections[i];
    if (!psEl || psEl.dataset.accordion === 'done') return;

    psEl.dataset.accordion = 'done';
    const title = psEl.querySelector('.section-title');
    if (!title) return;

    // Wrap children (except title) in accordion-body
    const body = document.createElement('div');
    body.className = 'accordion-body';
    const children = [...psEl.children].filter(c => c !== title);
    children.forEach(c => body.appendChild(c));

    // Create accordion header
    const header = document.createElement('div');
    header.className = 'accordion-header';
    header.innerHTML = `<span>${sec.icon} ${sec.title}</span><span class="accordion-arrow">\u25B6</span>`;
    header.onclick = function() { toggleAccordion(this); };

    psEl.innerHTML = '';
    psEl.classList.add('accordion-section');
    if (i === 0) psEl.classList.add('open');
    psEl.appendChild(header);
    psEl.appendChild(body);
  });
}

function toggleAccordion(header) {
  const section = header.parentElement;
  section.classList.toggle('open');
}

function renderAgentHealth() {
  const c = $('agent-health-table');
  c.innerHTML = '';
  AGENTS.forEach(a => {
    const statusClr = a.status === 'active' ? 'var(--green)' : 'var(--text-muted)';
    const fitClr = a.fitness > 0.8 ? 'var(--green)' : a.fitness > 0.6 ? 'var(--yellow)' : 'var(--red)';
    const row = document.createElement('div');
    row.className = 'health-row';
    row.innerHTML = `
      <div class="health-agent" style="cursor:pointer" onclick="goToEntity('agent','${a.id}','${a.name}')"><span class="health-status-dot" style="background:${statusClr}"></span><span class="entity-link entity-agent">${a.emoji} ${a.name}</span></div>
      <div class="health-task">${a.task || a.role}</div>
      <div class="health-bar-outer"><div class="health-bar-inner" style="width:${a.fitness * 100}%;background:${fitClr}"></div></div>
      <div class="health-tokens">${(a.tokens / 1000).toFixed(1)}K</div>
    `;
    c.appendChild(row);
  });
}

function renderCostChart() {
  const svg = $('cost-chart');
  if (!svg) return;
  const W = svg.parentElement.clientWidth || 400;
  const H = 160;
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = '';
  const agents = ['righthand', 'researcher', 'coder', 'utility', 'other'];
  const colors = { righthand: '#E8A838', researcher: '#2BA89E', coder: '#57A773', utility: '#8E44AD', other: '#6C7A89' };
  const barW = (W - 60) / COST_DATA.length;
  const maxT = Math.max(...COST_DATA.map(d => agents.reduce((s, a) => s + (d[a] || 0), 0)));

  COST_DATA.forEach((d, i) => {
    let y = H - 20;
    agents.forEach(agent => {
      const val = d[agent] || 0;
      const bH = (val / maxT) * (H - 30);
      y -= bH;
      const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      rect.setAttribute('x', 30 + i * barW + 4);
      rect.setAttribute('y', y);
      rect.setAttribute('width', barW - 8);
      rect.setAttribute('height', bH);
      rect.setAttribute('fill', colors[agent] || '#94e2d5');
      rect.setAttribute('rx', '2');
      svg.appendChild(rect);
    });
    const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    txt.setAttribute('x', 30 + (i + 0.5) * barW);
    txt.setAttribute('y', H - 4);
    txt.setAttribute('text-anchor', 'middle');
    txt.setAttribute('fill', '#6c7086');
    txt.setAttribute('font-size', '10');
    txt.textContent = d.day;
    svg.appendChild(txt);
  });
}

function renderSystemLoad() {
  const loads = [
    { label: 'CPU', val: 34, color: 'var(--accent)' },
    { label: 'Mem', val: 67, color: 'var(--accent2)' },
    { label: 'Disk', val: 94, color: 'var(--red)' },
    { label: 'Net', val: 12, color: 'var(--green)' },
  ];
  $('system-load').innerHTML = loads.map(l => `
    <div class="load-row">
      <span class="load-label">${l.label}</span>
      <div class="load-bar-outer"><div class="load-bar-inner" style="width:${l.val}%;background:${l.color}"></div></div>
      <span class="load-value">${l.val}%</span>
    </div>
  `).join('');
}

function renderCrons() {
  $('cron-status').innerHTML = CRONS.map(c => `
    <div class="cron-row">
      <span class="status-dot ${c.ok ? 'status-ok' : 'status-fail'}"></span>
      <span class="cron-name">${c.n}</span>
      <span class="cron-schedule">${c.s}</span>
    </div>
  `).join('');
}

function renderHooks() {
  $('hook-status').innerHTML = HOOKS.map(h => `
    <div class="hook-row">
      <span class="status-dot ${h.s === 'ok' ? 'status-ok' : h.s === 'warn' ? 'status-warn' : 'status-fail'}"></span>
      <span class="hook-name">${h.n}</span>
      <span class="hook-latency">${h.l}</span>
    </div>
  `).join('');
}

function renderErrorLog() {
  const errors = STREAM_EVENTS.filter(e => e.level === 'error' || e.level === 'warn' || e.level === 'info').slice(0, 8);
  $('error-log').innerHTML = errors.map(e => {
    const agent = ga(e.agent) || { emoji: '❓' };
    const levelClass = e.level;
    const borderColor = e.level === 'error' ? 'var(--red)' : e.level === 'warn' ? 'var(--yellow)' : 'var(--green)';
    const bgColor = e.level === 'error' ? 'rgba(243,139,168,0.05)' : e.level === 'warn' ? 'rgba(249,226,175,0.05)' : 'rgba(166,227,161,0.03)';
    return `
      <div class="error-item error-line ${levelClass}" style="border-left-color:${borderColor};background:${bgColor}">
        <span class="error-time">${e.time}</span>
        <span class="error-agent">${agent.emoji}</span>
        <span class="log-level ${levelClass}" style="min-width:35px;font-size:10px">${e.level.toUpperCase()}</span>
        <span class="error-text">${e.text}</span>
      </div>`;
  }).join('');
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
