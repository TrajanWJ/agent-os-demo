/* ============================================================
   AGENT OS — app.js
   Vanilla JS, no dependencies.
============================================================ */

'use strict';

/* ============================================================
   CONSTANTS / MOCK DATA
============================================================ */

const AGENTS = [
  { id: 'concierge',   emoji: '🛎️', name: 'Concierge',       color: '#D4A574', status: 'thinking', task: 'Coordinating batch tasks', tasks: 8,  files: 0, avgTime: 2.1 },
  { id: 'researcher',  emoji: '🔬', name: 'Researcher',       color: '#5B8AF0', status: 'working',  task: 'AI Interface Competitive',  tasks: 6,  files: 4, avgTime: 5.8 },
  { id: 'coder',       emoji: '💻', name: 'Coder',            color: '#4CAF50', status: 'idle',     task: '',                          tasks: 4,  files: 6, avgTime: 3.2 },
  { id: 'vault',       emoji: '💾', name: 'Vault Keeper',     color: '#9B59B6', status: 'idle',     task: '',                          tasks: 3,  files: 3, avgTime: 4.1 },
  { id: 'devil',       emoji: '😈', name: "Devil's Advocate", color: '#E74C3C', status: 'idle',     task: '',                          tasks: 2,  files: 1, avgTime: 7.5 },
  { id: 'ops',         emoji: '⚙️', name: 'Ops',              color: '#F39C12', status: 'idle',     task: '',                          tasks: 1,  files: 0, avgTime: 1.4 },
];

const CONVERSATIONS = [
  { agent: 'concierge',  emoji: '🛎️', title: 'Morning Task Batch',         preview: 'All 5 priority tasks complete…',            time: '3m' },
  { agent: 'researcher', emoji: '🔬', title: 'Competitive Analysis',        preview: '13 products reviewed, nobody built cockpit', time: '8m' },
  { agent: 'coder',      emoji: '💻', title: 'Backlinker Deploy',           preview: 'cross-channel-backlinker.sh deployed',       time: '14m' },
  { agent: 'devil',      emoji: '😈', title: 'Red Team v5.1',               preview: '3 criticals, 4 mediums found',               time: '21m' },
  { agent: 'vault',      emoji: '💾', title: 'Frontend Vision Doc',         preview: 'Stored in vault/Research/Frontend-Vision',   time: '1h' },
];

const FEED_MESSAGES = [
  {
    agent: 'Concierge', emoji: '🛎️', color: '#D4A574', time: '3m ago',
    content: 'All 5 priority tasks from this morning are complete. Red team report is in #devils-corner. Two tasks remain in queue: Reminder Engine and Discord-to-Native Migration. Want me to run the next batch?',
    cursor: false,
  },
  {
    agent: 'Researcher', emoji: '🔬', color: '#5B8AF0', time: '8m ago',
    content: 'Competitive analysis complete — 13 products reviewed. Key finding: nobody\'s built the cockpit. Full report at vault/Research/Competitive-Analysis.',
    cursor: false,
  },
  {
    agent: 'Coder', emoji: '💻', color: '#4CAF50', time: '14m ago',
    content: 'cross-channel-backlinker.sh deployed and live. Cron set to every 10 min.',
    cursor: false,
  },
  {
    agent: "Devil's Advocate", emoji: '😈', color: '#E74C3C', time: '21m ago',
    content: 'v5.1 red team complete. 3 criticals, 4 mediums. Rate limit storm is the real killer.',
    cursor: true,
  },
];

const QUEUE_TASKS = [
  { priority: 'P2', agent: 'coder',      color: '#4CAF50', name: 'Build: Reminder Engine' },
  { priority: 'P2', agent: 'coder',      color: '#4CAF50', name: 'Streaming Progress UI' },
  { priority: 'P3', agent: 'researcher', color: '#5B8AF0', name: 'Discord-to-Native Migration' },
];

const COMPLETED_TASKS = [
  { emoji: '💾', name: 'Future Frontend Vision Doc',  agent: 'Vault Keeper', color: '#9B59B6' },
  { emoji: '🔬', name: 'UX Spec',                     agent: 'Researcher',   color: '#5B8AF0' },
  { emoji: '💻', name: 'cross-channel-backlinker.sh', agent: 'Coder',        color: '#4CAF50' },
  { emoji: '😈', name: 'Red Team Report v5.1',        agent: "Devil's Advocate", color: '#E74C3C' },
];

const VAULT_FILES = [
  { name: 'Competitive-Analysis.md', type: 'Research' },
  { name: 'Future-Frontend-Vision.md', type: 'Vision' },
  { name: 'UX-Spec.md', type: 'Research' },
  { name: 'Red-Team-Report-v5.1.md', type: 'Report' },
  { name: 'cross-channel-backlinker.sh', type: 'Code' },
  { name: 'Agent-OS-Architecture.md', type: 'Architecture' },
];

const CRON_JOBS = [
  { name: 'agent-heartbeat',      schedule: '*/2 * * * *',  status: 'OK' },
  { name: 'vault-sync',           schedule: '*/5 * * * *',  status: 'OK' },
  { name: 'cross-channel-backlinker', schedule: '*/10 * * * *', status: 'OK' },
  { name: 'daily-digest',         schedule: '0 7 * * *',    status: 'OK' },
  { name: 'memory-compactor',     schedule: '0 3 * * *',    status: 'OK' },
  { name: 'performance-report',   schedule: '0 0 * * 1',    status: 'OK' },
  { name: 'token-budget-reset',   schedule: '0 0 * * *',    status: 'OK' },
  { name: 'session-watchdog',     schedule: '*/1 * * * *',  status: 'ERR' },
];

const WEBHOOKS = [
  { name: 'discord-inbound',      status: 'ok',      latency: '42ms' },
  { name: 'github-events',        status: 'ok',      latency: '88ms' },
  { name: 'telegram-bot',         status: 'ok',      latency: '67ms' },
  { name: 'vault-write',          status: 'ok',      latency: '31ms' },
  { name: 'openai-stream',        status: 'warn',    latency: '1.2s' },
  { name: 'anthropic-main',       status: 'ok',      latency: '95ms' },
  { name: 'cron-runner',          status: 'timeout', latency: 'N/A' },
  { name: 'agent-bus',            status: 'warn',    latency: '3.1s' },
];

const ERROR_LOG_LINES = [
  { text: '[ERR]  session-watchdog: Connection refused :8484', cls: 'error-line' },
  { text: '[WARN] openai-stream: timeout 1200ms (limit 1000ms)', cls: 'error-line warn' },
  { text: '[ERR]  session-watchdog: Retry 2/3 failed', cls: 'error-line' },
  { text: '[WARN] agent-bus: latency spike 3.1s', cls: 'error-line warn' },
  { text: '[ERR]  session-watchdog: Max retries exceeded', cls: 'error-line' },
  { text: '[INFO] vault-sync: 6 files written OK', cls: 'error-line info' },
];

const TOKEN_DATA = [
  { agent: 'Researcher',  color: '#5B8AF0', tokens: 18200 },
  { agent: 'Coder',       color: '#4CAF50', tokens: 12800 },
  { agent: 'Concierge',   color: '#D4A574', tokens: 9500  },
  { agent: 'Vault Keeper',color: '#9B59B6', tokens: 4200  },
  { agent: "Devil's Adv", color: '#E74C3C', tokens: 2800  },
  { agent: 'Ops',         color: '#F39C12', tokens: 734   },
];
const TOKEN_TOTAL = 100000;
const TOKEN_USED  = TOKEN_DATA.reduce((s, d) => s + d.tokens, 0); // 48234

/* ============================================================
   GRAPH DATA
============================================================ */
const GRAPH_NODES = [
  { id: 0,  label: 'Agent OS Core',           type: 'architecture', color: '#D4A574' },
  { id: 1,  label: 'Cockpit Vision',           type: 'vision',       color: '#5B8AF0', glow: true },
  { id: 2,  label: 'Competitive Analysis',     type: 'research',     color: '#5B8AF0' },
  { id: 3,  label: 'Bridge Interface',         type: 'architecture', color: '#D4A574', glow: true },
  { id: 4,  label: 'Knowledge Graph',          type: 'architecture', color: '#D4A574' },
  { id: 5,  label: 'Task Workspace',           type: 'project',      color: '#4CAF50' },
  { id: 6,  label: 'Multi-Agent Routing',      type: 'architecture', color: '#D4A574' },
  { id: 7,  label: 'Vault System',             type: 'ops',          color: '#9B59B6', glow: true },
  { id: 8,  label: 'Red Team Report v5.1',     type: 'research',     color: '#E74C3C' },
  { id: 9,  label: 'Reminder Engine',          type: 'project',      color: '#4CAF50' },
  { id: 10, label: 'Discord Integration',      type: 'ops',          color: '#F39C12' },
  { id: 11, label: 'Session Watchdog',         type: 'ops',          color: '#F39C12' },
  { id: 12, label: 'Token Budget System',      type: 'ops',          color: '#F39C12' },
  { id: 13, label: 'Future Frontend Vision',   type: 'vision',       color: '#5B8AF0' },
  { id: 14, label: 'UX Spec',                  type: 'research',     color: '#5B8AF0' },
  { id: 15, label: 'Rate Limit Mitigation',    type: 'architecture', color: '#E74C3C' },
  { id: 16, label: 'Cross-Channel Backlinker', type: 'ops',          color: '#F39C12' },
  { id: 17, label: 'Streaming Progress',       type: 'project',      color: '#4CAF50' },
  { id: 18, label: 'Agent Gallery View',       type: 'vision',       color: '#5B8AF0' },
  { id: 19, label: 'Cron Scheduler',           type: 'ops',          color: '#F39C12' },
  { id: 20, label: 'Memory Compactor',         type: 'ops',          color: '#9B59B6' },
  { id: 21, label: 'OpenProse Integration',    type: 'project',      color: '#4CAF50' },
];

const GRAPH_EDGES = [
  [0,1],[0,3],[0,4],[0,5],[0,6],[0,7],
  [1,13],[1,18],[1,3],[1,14],
  [2,1],[2,8],[2,14],
  [3,6],[3,5],[3,17],
  [4,7],[4,20],
  [5,9],[5,17],[5,10],
  [6,10],[6,16],[6,21],
  [7,20],[7,12],
  [8,15],[8,6],
  [9,19],[10,16],[10,11],
  [11,19],[12,19],[13,18],[15,12],
];

const NODE_NOTES = {
  0: 'The central orchestration layer. Routes tasks to agents, manages session state, and coordinates vault access.',
  1: 'The north star: a unified "cockpit" interface for humans to oversee, steer, and collaborate with AI agents. The key gap in the market.',
  3: 'The main communication hub. Shows agent activity feeds, message routing, conversation history, and live status.',
  7: 'Persistent storage for all agent outputs. Files are indexed, versioned, and linked via Knowledge Graph nodes.',
};

/* ============================================================
   STATE
============================================================ */
const state = {
  currentView: 'bridge',
  selectedConv: 0,
  selectedAgent: null,
  selectedRoute: 'concierge',
  graphFilter: 'all',
  graphSearch: '',
  taskTab: 'active',     // mobile task tab
  timerSeconds: 204,     // 3:24
  logIndex: 0,
  errorLogIndex: 0,
  graphNodes: null,      // runtime positions
  hoveredNode: null,
  clickedNode: null,
  animationId: null,
  mobileGraphOpen: false,
};

/* ============================================================
   NAVIGATION
============================================================ */
function navigateTo(viewId) {
  if (state.currentView === viewId) return;
  // Hide old view
  const oldView = document.getElementById('view-' + state.currentView);
  if (oldView) oldView.classList.remove('active');

  state.currentView = viewId;

  // Show new view
  const newView = document.getElementById('view-' + viewId);
  if (newView) {
    newView.classList.add('active');
    newView.classList.remove('fade-in');
    void newView.offsetWidth; // reflow
    newView.classList.add('fade-in');
  }

  // Update sidebar
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === viewId);
  });
  document.querySelectorAll('.mobile-nav-btn').forEach(el => {
    el.classList.toggle('active', el.dataset.view === viewId);
  });

  // Update topbar title on mobile
  const viewNames = { bridge: 'Bridge', tasks: 'Tasks', graph: 'Knowledge Graph', agents: 'Agents', system: 'System' };
  const titleEl = document.querySelector('.topbar-title');
  if (titleEl && window.innerWidth < 768) {
    titleEl.textContent = viewNames[viewId] || '🤖 Agent OS';
  }

  // Init view-specific logic
  if (viewId === 'graph') initGraph();
}

/* ============================================================
   VIEW 1: BRIDGE
============================================================ */
function renderBridge() {
  renderConversations();
  renderFeed();
  renderAgentsStatus();
  renderRouteSelector('route-selector');
  renderRouteSelector('route-selector-mobile');
}

function renderConversations() {
  const el = document.getElementById('conv-list');
  el.innerHTML = CONVERSATIONS.map((c, i) => `
    <div class="conv-item ${i === state.selectedConv ? 'active' : ''}" data-conv="${i}">
      <div class="conv-emoji">${c.emoji}</div>
      <div class="conv-meta">
        <div class="conv-title">${c.title}</div>
        <div class="conv-preview">${c.preview}</div>
      </div>
      <div class="conv-time">${c.time}</div>
    </div>
  `).join('');

  el.querySelectorAll('.conv-item').forEach(el => {
    el.addEventListener('click', () => {
      state.selectedConv = +el.dataset.conv;
      renderConversations();
    });
  });
}

function renderFeed() {
  const el = document.getElementById('feed');
  el.innerHTML = FEED_MESSAGES.map(m => `
    <div class="feed-card" style="border-left-color:${m.color}">
      <div class="feed-card-header">
        <span>${m.emoji}</span>
        <span class="feed-agent-name" style="color:${m.color}">${m.agent}</span>
        <span class="feed-time">${m.time}</span>
      </div>
      <div class="feed-content${m.cursor ? ' blinking-cursor' : ''}">${m.content}</div>
    </div>
  `).join('');
}

function renderAgentsStatus() {
  const el = document.getElementById('agents-status-list');
  el.innerHTML = AGENTS.map(a => `
    <div class="agent-status-row">
      <span class="status-dot ${a.status !== 'idle' ? 'active pulse-green' : 'idle'}"></span>
      <div>
        <div class="agent-row-name">${a.emoji} ${a.name}</div>
        <div class="agent-row-task">${a.status !== 'idle' ? (a.task || a.status) : 'Idle'}</div>
      </div>
    </div>
  `).join('');
}

function renderRouteSelector(containerId) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = AGENTS.map(a => `
    <button class="route-pill ${a.id === state.selectedRoute ? 'selected' : ''}"
      data-route="${a.id}"
      style="${a.id === state.selectedRoute ? `background:${a.color};border-color:${a.color}` : ''}">
      ${a.emoji} ${a.name}
    </button>
  `).join('');
  el.querySelectorAll('.route-pill').forEach(btn => {
    btn.addEventListener('click', () => {
      state.selectedRoute = btn.dataset.route;
      renderRouteSelector('route-selector');
      renderRouteSelector('route-selector-mobile');
    });
  });
}

function sendMessage() {
  const input = document.getElementById('msg-input') || document.getElementById('msg-input-mobile');
  const text = input.value.trim();
  if (!text) return;
  const agent = AGENTS.find(a => a.id === state.selectedRoute);
  FEED_MESSAGES.unshift({
    agent: agent.name, emoji: agent.emoji, color: agent.color,
    time: 'now',
    content: text,
    cursor: false,
  });
  input.value = '';
  renderFeed();
  const feed = document.getElementById('feed');
  feed.scrollTop = 0;
}

/* ============================================================
   VIEW 2: TASKS
============================================================ */
function renderTasks() {
  renderQueueList();
  renderActiveTask();
  renderCompletedTasks();
  renderVaultOutputs();
  initMobileTaskTabs();
}

function renderQueueList() {
  const el = document.getElementById('queue-list');
  const byPriority = {};
  QUEUE_TASKS.forEach(t => {
    if (!byPriority[t.priority]) byPriority[t.priority] = [];
    byPriority[t.priority].push(t);
  });
  el.innerHTML = Object.entries(byPriority).map(([p, tasks]) => `
    <div class="queue-priority">${p}</div>
    ${tasks.map(t => `
      <div class="queue-item">
        <span class="queue-dot" style="background:${t.color}"></span>
        <span class="queue-name">${t.name}</span>
      </div>
    `).join('')}
  `).join('');
}

function renderActiveTask() {
  const el = document.getElementById('active-task-card');
  el.classList.add('running');
  el.innerHTML = `
    <div class="task-card-header">
      <span class="task-agent-emoji">🔬</span>
      <span class="task-title">Research: AI Agent Interface Competitive Landscape</span>
      <span class="task-badge">RUNNING</span>
    </div>
    <div class="task-timer" id="task-timer">3:24</div>
    <div class="progress-bar-wrap">
      <div class="progress-bar" style="width:67%">
        <div class="progress-shimmer"></div>
      </div>
    </div>
    <div class="task-logs" id="task-logs">
      <div class="task-log-line">[03:01:14] Fetching ChatGPT Projects docs...</div>
      <div class="task-log-line">[03:02:47] Analyzing Cursor — mental model mapped</div>
      <div class="task-log-line">[03:03:52] Writing comparative matrix...</div>
    </div>
  `;
}

function renderCompletedTasks() {
  const el = document.getElementById('completed-tasks');
  el.innerHTML = COMPLETED_TASKS.map(t => `
    <div class="completed-card">
      <span>${t.emoji}</span>
      <div>
        <div style="font-weight:600;font-size:13px">${t.name}</div>
        <div style="color:${t.color};font-size:11px">${t.agent}</div>
      </div>
      <span class="done-badge">✓ Done</span>
    </div>
  `).join('');
}

function renderVaultOutputs() {
  const el = document.getElementById('vault-outputs');
  el.innerHTML = VAULT_FILES.map(f => `
    <div class="vault-item">
      <span class="vault-icon">📄</span>
      <div>
        <div style="font-size:12px;font-weight:500">${f.name}</div>
        <div style="font-size:11px;color:var(--text2)">${f.type}</div>
      </div>
    </div>
  `).join('');
}

function initMobileTaskTabs() {
  const tabs = document.getElementById('tasks-mobile-tabs');
  if (!tabs) return;
  tabs.querySelectorAll('.mobile-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      state.taskTab = tab.dataset.tab;
      tabs.querySelectorAll('.mobile-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      renderMobileTaskTab();
    });
  });
  renderMobileTaskTab();
}

function renderMobileTaskTab() {
  if (window.innerWidth >= 768) return;
  const tab = state.taskTab;
  const queuePanel = document.getElementById('tasks-queue-panel');
  const vaultPanel = document.getElementById('tasks-vault-panel');
  const centerPanel = document.querySelector('.tasks-center');
  if (queuePanel) queuePanel.style.display = tab === 'queue' ? 'block' : 'none';
  if (vaultPanel) vaultPanel.style.display = tab === 'done' ? 'block' : 'none';
  if (centerPanel) centerPanel.style.display = tab === 'active' ? 'block' : 'none';
}

/* ============================================================
   TASK TIMER
============================================================ */
function startTimer() {
  setInterval(() => {
    state.timerSeconds++;
    const m = Math.floor(state.timerSeconds / 60);
    const s = state.timerSeconds % 60;
    const el = document.getElementById('task-timer');
    if (el) el.textContent = `${m}:${String(s).padStart(2,'0')}`;
  }, 1000);
}

/* ============================================================
   VIEW 3: GRAPH
============================================================ */
let graphCanvas, graphCtx, minimapCanvas, minimapCtx;
let graphAnimId = null;

function initGraph() {
  graphCanvas   = document.getElementById('graph-canvas');
  minimapCanvas = document.getElementById('minimap-canvas');
  if (!graphCanvas) return;

  graphCtx    = graphCanvas.getContext('2d');
  minimapCtx  = minimapCanvas.getContext('2d');

  resizeGraph();
  if (!window._graphResizeBound) {
    window.addEventListener('resize', resizeGraph);
    window._graphResizeBound = true;
  }

  if (!state.graphNodes) initGraphPositions();

  // Events
  graphCanvas.addEventListener('mousemove', onGraphMouseMove);
  graphCanvas.addEventListener('click', onGraphClick);
  graphCanvas.addEventListener('mouseleave', () => {
    state.hoveredNode = null;
    document.getElementById('graph-tooltip').classList.add('hidden');
  });

  const hint = document.getElementById('graph-hint');
  if (hint) {
    graphCanvas.addEventListener('mousemove', () => { hint.style.opacity = '0'; }, { once: true });
  }

  // Search
  const searchEl = document.getElementById('graph-search');
  if (searchEl) {
    searchEl.addEventListener('input', () => {
      state.graphSearch = searchEl.value.toLowerCase();
    });
  }

  // Filters
  document.querySelectorAll('.chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      state.graphFilter = chip.dataset.filter;
    });
  });

  if (graphAnimId) cancelAnimationFrame(graphAnimId);
  graphLoop();

  // Mobile list
  renderGraphList();
  document.getElementById('show-graph-btn')?.addEventListener('click', openGraphModal);
  document.getElementById('close-graph-modal')?.addEventListener('click', closeGraphModal);
}

function resizeGraph() {
  if (!graphCanvas) return;
  const container = graphCanvas.parentElement;
  graphCanvas.width  = container.clientWidth;
  graphCanvas.height = container.clientHeight;
}

function initGraphPositions() {
  const W = graphCanvas?.width  || 800;
  const H = graphCanvas?.height || 600;
  state.graphNodes = GRAPH_NODES.map((n, i) => {
    const angle = (i / GRAPH_NODES.length) * Math.PI * 2;
    const r = Math.min(W, H) * 0.3;
    return {
      ...n,
      x: W/2 + r * Math.cos(angle) + (Math.random()-0.5)*60,
      y: H/2 + r * Math.sin(angle) + (Math.random()-0.5)*60,
      vx: 0, vy: 0,
    };
  });
}

function graphLoop() {
  if (!graphCanvas) return;
  updateGraphPhysics();
  drawGraph();
  drawMinimap();
  graphAnimId = requestAnimationFrame(graphLoop);
}

function updateGraphPhysics() {
  const nodes = state.graphNodes;
  if (!nodes) return;
  const W = graphCanvas.width, H = graphCanvas.height;
  const k = 120, repulse = 2500, damp = 0.85, gravity = 0.03;

  // Repulsion
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i+1; j < nodes.length; j++) {
      const dx = nodes[j].x - nodes[i].x;
      const dy = nodes[j].y - nodes[i].y;
      const dist = Math.sqrt(dx*dx + dy*dy) || 1;
      const force = repulse / (dist * dist);
      const fx = (dx/dist) * force;
      const fy = (dy/dist) * force;
      nodes[i].vx -= fx; nodes[i].vy -= fy;
      nodes[j].vx += fx; nodes[j].vy += fy;
    }
  }

  // Spring attraction along edges
  GRAPH_EDGES.forEach(([a, b]) => {
    const na = nodes[a], nb = nodes[b];
    if (!na || !nb) return;
    const dx = nb.x - na.x;
    const dy = nb.y - na.y;
    const dist = Math.sqrt(dx*dx + dy*dy) || 1;
    const force = (dist - k) * 0.03;
    const fx = (dx/dist) * force;
    const fy = (dy/dist) * force;
    na.vx += fx; na.vy += fy;
    nb.vx -= fx; nb.vy -= fy;
  });

  // Center gravity + damping + clamp
  nodes.forEach(n => {
    n.vx += (W/2 - n.x) * gravity;
    n.vy += (H/2 - n.y) * gravity;
    n.vx *= damp; n.vy *= damp;
    n.x += n.vx; n.y += n.vy;
    n.x = Math.max(20, Math.min(W-20, n.x));
    n.y = Math.max(20, Math.min(H-20, n.y));
  });
}

function isNodeVisible(n) {
  if (state.graphFilter !== 'all' && n.type !== state.graphFilter) return false;
  if (state.graphSearch && !n.label.toLowerCase().includes(state.graphSearch)) return false;
  return true;
}

function drawGraph() {
  const ctx = graphCtx;
  const nodes = state.graphNodes;
  if (!ctx || !nodes) return;
  const W = graphCanvas.width, H = graphCanvas.height;

  ctx.clearRect(0, 0, W, H);

  // Edges
  GRAPH_EDGES.forEach(([a, b]) => {
    const na = nodes[a], nb = nodes[b];
    if (!na || !nb) return;
    const vis = isNodeVisible(na) && isNodeVisible(nb);
    ctx.beginPath();
    ctx.moveTo(na.x, na.y);
    ctx.lineTo(nb.x, nb.y);
    ctx.strokeStyle = vis ? 'rgba(42,42,53,0.9)' : 'rgba(42,42,53,0.2)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });

  // Nodes
  nodes.forEach(n => {
    const vis = isNodeVisible(n);
    const isMobile = window.innerWidth < 768;
    const r = isMobile ? 16 : 9;
    const isHovered = state.hoveredNode === n.id;

    // Glow for knowledge gravity nodes
    if (n.glow && vis) {
      const grad = ctx.createRadialGradient(n.x, n.y, r, n.x, n.y, r*3.5);
      grad.addColorStop(0, 'rgba(212,165,116,0.4)');
      grad.addColorStop(1, 'rgba(212,165,116,0)');
      ctx.beginPath();
      ctx.arc(n.x, n.y, r*3.5, 0, Math.PI*2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    // Hover ring
    if (isHovered) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, r+4, 0, Math.PI*2);
      ctx.strokeStyle = n.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Node circle
    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI*2);
    ctx.fillStyle = vis ? n.color : 'rgba(42,42,53,0.5)';
    ctx.fill();

    // Label
    if (vis && (isHovered || state.graphSearch)) {
      ctx.font = '11px -apple-system,sans-serif';
      ctx.fillStyle = '#e8e8f0';
      ctx.textAlign = 'center';
      ctx.fillText(n.label, n.x, n.y - r - 4);
    }
  });
}

function drawMinimap() {
  const ctx = minimapCtx;
  const nodes = state.graphNodes;
  if (!ctx || !nodes) return;
  const MW = minimapCanvas.width, MH = minimapCanvas.height;
  const W = graphCanvas.width, H = graphCanvas.height;

  ctx.clearRect(0, 0, MW, MH);
  ctx.fillStyle = 'rgba(15,15,18,0.8)';
  ctx.fillRect(0, 0, MW, MH);

  nodes.forEach(n => {
    const mx = (n.x / W) * MW;
    const my = (n.y / H) * MH;
    ctx.beginPath();
    ctx.arc(mx, my, 2, 0, Math.PI*2);
    ctx.fillStyle = n.color;
    ctx.fill();
  });
}

function onGraphMouseMove(e) {
  const nodes = state.graphNodes;
  if (!nodes) return;
  const rect = graphCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  let found = null;
  for (const n of nodes) {
    const dx = n.x - mx, dy = n.y - my;
    const hitR = window.innerWidth < 768 ? 20 : 12;
    if (Math.sqrt(dx*dx+dy*dy) <= hitR) { found = n; break; }
  }
  state.hoveredNode = found ? found.id : null;
  const tooltip = document.getElementById('graph-tooltip');
  if (found) {
    tooltip.classList.remove('hidden');
    tooltip.style.left = (mx+14)+'px';
    tooltip.style.top  = (my-10)+'px';
    tooltip.innerHTML  = `<strong>${found.label}</strong><div class="tt-type">${found.type}</div>`;
    graphCanvas.style.cursor = 'pointer';
  } else {
    tooltip.classList.add('hidden');
    graphCanvas.style.cursor = 'default';
  }
}

function onGraphClick(e) {
  const nodes = state.graphNodes;
  if (!nodes) return;
  const rect = graphCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  let found = null;
  for (const n of nodes) {
    const dx = n.x - mx, dy = n.y - my;
    const hitR = window.innerWidth < 768 ? 20 : 12;
    if (Math.sqrt(dx*dx+dy*dy) <= hitR) { found = n; break; }
  }
  if (found) openNodePanel(found);
}

function openNodePanel(node) {
  const panel = document.getElementById('node-panel');
  panel.classList.remove('hidden');
  panel.innerHTML = `
    <button class="node-panel-close" onclick="document.getElementById('node-panel').classList.add('hidden')">✕</button>
    <div class="node-panel-title">${node.label}</div>
    <div class="node-panel-type">${node.type}</div>
    <div class="node-panel-content">${NODE_NOTES[node.id] || 'This node represents a key concept in the Agent OS knowledge graph. Click connections to explore related ideas.'}</div>
    <br>
    <div style="font-size:12px;color:var(--text2);margin-top:8px">Connected to:</div>
    <div style="font-size:12px;margin-top:6px">
      ${GRAPH_EDGES
          .filter(([a,b]) => a===node.id || b===node.id)
          .map(([a,b]) => {
            const other = GRAPH_NODES[a===node.id ? b : a];
            return `<div style="padding:4px 0;border-bottom:1px solid var(--border);color:var(--text2)">${other.label}</div>`;
          }).join('')}
    </div>
  `;
}

function renderGraphList() {
  const el = document.getElementById('graph-list-mobile');
  if (!el) return;
  const byType = {};
  GRAPH_NODES.forEach(n => {
    if (!byType[n.type]) byType[n.type] = [];
    byType[n.type].push(n);
  });
  el.innerHTML = Object.entries(byType).map(([type, nodes]) => `
    <div class="graph-group">
      <div class="graph-group-header" onclick="this.parentElement.classList.toggle('collapsed')">
        <span>${type}</span><span>▾</span>
      </div>
      <div class="graph-group-body">
        ${nodes.map(n => `
          <div class="graph-node-item">
            <span class="graph-node-dot" style="background:${n.color}"></span>
            <span>${n.label}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
}

function openGraphModal() {
  const modal = document.getElementById('graph-modal');
  modal.classList.remove('hidden');
  const mCanvas = document.getElementById('graph-canvas-mobile');
  mCanvas.width  = window.innerWidth;
  mCanvas.height = window.innerHeight - 56;
  // Run physics on mobile canvas
  const mCtx = mCanvas.getContext('2d');
  if (!state.graphNodes) {
    // Quick init for mobile
    graphCanvas = mCanvas;
    graphCtx = mCtx;
    initGraphPositions();
  }
  // swap to mobile canvas
  graphCanvas = mCanvas;
  graphCtx = mCtx;
}

function closeGraphModal() {
  document.getElementById('graph-modal').classList.add('hidden');
  // restore desktop canvas
  graphCanvas = document.getElementById('graph-canvas');
  if (graphCanvas) graphCtx = graphCanvas.getContext('2d');
}

/* ============================================================
   VIEW 4: AGENTS
============================================================ */
function renderAgents() {
  renderAgentsStatsBar();
  renderAgentsGrid();
}

function renderAgentsStatsBar() {
  const el = document.getElementById('agents-stats-bar');
  const active = AGENTS.filter(a => a.status !== 'idle').length;
  el.innerHTML = `
    <div class="agents-stat"><div class="agents-stat-val">${AGENTS.length}</div><div class="agents-stat-label">Agents</div></div>
    <div class="agents-stat"><div class="agents-stat-val" style="color:#4CAF50">${active}</div><div class="agents-stat-label">Active</div></div>
    <div class="agents-stat"><div class="agents-stat-val">12</div><div class="agents-stat-label">Tasks Today</div></div>
    <div class="agents-stat"><div class="agents-stat-val">48k</div><div class="agents-stat-label">Tokens Used</div></div>
    <div class="agents-stat"><div class="agents-stat-val">4</div><div class="agents-stat-label">Outputs</div></div>
  `;
  const activeCount = AGENTS.filter(a => a.status !== 'idle').length;
  const countEl = document.getElementById('topbar-active-count');
  if (countEl) countEl.textContent = activeCount + ' active';
}

function renderAgentsGrid() {
  const el = document.getElementById('agents-grid');
  el.innerHTML = AGENTS.map(a => `
    <div class="agent-card ${a.status !== 'idle' ? 'active' : ''}" data-agent="${a.id}">
      <div class="agent-card-emoji">${a.emoji}</div>
      <div class="agent-card-name">${a.name}</div>
      <div class="agent-card-status status-${a.status}">● ${a.status}</div>
      <div class="agent-card-task" style="${!a.task ? 'opacity:0.4' : ''}">${a.task || 'Idle — waiting for tasks'}</div>
      <div class="agent-card-stats">
        <div><span>${a.tasks}</span> tasks</div>
        <div><span>${a.files}</span> files</div>
        <div><span>${a.avgTime}h</span> avg</div>
      </div>
    </div>
  `).join('');

  el.querySelectorAll('.agent-card').forEach(card => {
    card.addEventListener('click', () => {
      const agent = AGENTS.find(a => a.id === card.dataset.agent);
      openAgentDetail(agent);
      // mobile
      if (window.innerWidth < 768) {
        document.getElementById('agent-detail-panel').style.top = '0';
      }
    });
  });
}

function openAgentDetail(agent) {
  const panel = document.getElementById('agent-detail-panel');
  panel.classList.remove('hidden');

  const tokenAmt = TOKEN_DATA.find(t => t.agent.startsWith(agent.name.slice(0,5)));
  const tokens = tokenAmt ? tokenAmt.tokens : agent.tasks * 3000;
  const tokenPct = Math.round((tokens / TOKEN_TOTAL) * 100);

  const outputsByAgent = {
    concierge:  ['Morning briefing delivered', 'Batch task coordination', 'Preferences updated'],
    researcher: ['Competitive-Analysis.md', 'UX-Spec.md', 'Future-Frontend-Vision.md'],
    coder:      ['cross-channel-backlinker.sh', 'progress-stream.sh', 'work-engine.sh'],
    vault:      ['Future-Frontend-Layer.md', 'Discord-Architecture-v5.md', 'Preferences.md'],
    devil:      ['Red-Team-Report-v5.1.md', 'v5-critique.md'],
    ops:        ['crontab-cleanup.log', 'heartbeat-embed.sh'],
  };
  const tasksByAgent = {
    concierge:  ['Coordinate morning batch', 'Route research request', 'Update vault preferences'],
    researcher: ['AI Interface Competitive Landscape', 'Future Frontend UX Spec', 'Discord-to-Native Migration'],
    coder:      ['cross-channel-backlinker.sh', 'progress-stream.sh', 'Reminder Engine (queued)'],
    vault:      ['Write Future Frontend Layer vision doc', 'Archive old architecture docs'],
    devil:      ['Red team v5.1 architecture', 'Challenge cron-cleanup assumptions'],
    ops:        ['Trim crontab 40→18 jobs', 'Clear zombie dispatch tasks'],
  };
  const outputs = outputsByAgent[agent.id] || ['No recent outputs'];
  const history = tasksByAgent[agent.id] || [];

  panel.innerHTML = `
    <button class="agent-detail-close" onclick="document.getElementById('agent-detail-panel').classList.add('hidden')">✕</button>
    <span class="agent-detail-emoji">${agent.emoji}</span>
    <div class="agent-detail-name">${agent.name}</div>
    <div class="agent-detail-status-row"><span class="status-${agent.status}">● ${agent.status}</span></div>
    <div class="token-bar-wrap">
      <div class="token-bar-label"><span>Token Usage</span><span>${tokens.toLocaleString()} tokens</span></div>
      <div class="token-bar"><div class="token-bar-fill" style="width:${tokenPct}%;background:${agent.color}"></div></div>
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Recent Outputs</div>
      ${outputs.map(f => `<div class="detail-output-item">📄 ${f}</div>`).join('')}
    </div>
    <div class="detail-section">
      <div class="detail-section-title">Task History</div>
      ${history.map(t => `<div class="detail-output-item" style="color:var(--coder)">✓ ${t}</div>`).join('')}
    </div>
  `;
}

/* ============================================================
   VIEW 5: SYSTEM
============================================================ */
function renderSystem() {
  renderCronTable();
  renderTokenBudget();
  renderErrorLog();
  renderWebhookHealth();
}

function renderCronTable() {
  const el = document.getElementById('cron-table');
  el.classList.add('cron-table');
  el.innerHTML = CRON_JOBS.map(j => `
    <div class="cron-row ${j.status === 'ERR' ? 'err' : ''}">
      <span class="cron-name">${j.name}</span>
      <span class="cron-schedule">${j.schedule}</span>
      <span class="cron-status ${j.status === 'OK' ? 'ok' : 'err'}">${j.status}</span>
    </div>
  `).join('');
}

function renderTokenBudget() {
  const el = document.getElementById('token-budget');

  // Build SVG donut
  const cx = 110, cy = 100, r = 70, stroke = 22;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  const segments = TOKEN_DATA.map(d => {
    const pct = d.tokens / TOKEN_TOTAL;
    const len = pct * circumference;
    const seg = { ...d, offset, len, pct };
    offset += len;
    return seg;
  });

  const svgSegments = segments.map(s => `
    <circle cx="${cx}" cy="${cy}" r="${r}"
      fill="none" stroke="${s.color}" stroke-width="${stroke}"
      stroke-dasharray="${s.len} ${circumference - s.len}"
      stroke-dashoffset="${-s.offset + circumference/4}"
      transform="rotate(-90 ${cx} ${cy})"
      style="transition:all 0.5s ease"
    />
  `).join('');

  el.innerHTML = `
    <div style="position:relative;display:flex;flex-direction:column;align-items:center;width:100%">
      <svg width="220" height="200" viewBox="0 0 220 200">
        <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--surface2)" stroke-width="${stroke}"/>
        ${svgSegments}
      </svg>
      <div style="position:absolute;top:60px;text-align:center">
        <div style="font-size:16px;font-weight:700">${TOKEN_USED.toLocaleString()}</div>
        <div style="font-size:10px;color:var(--text2)">/ ${TOKEN_TOTAL.toLocaleString()}</div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;justify-content:center;padding:0 12px 8px">
        ${TOKEN_DATA.map(d => `
          <div style="display:flex;align-items:center;gap:4px;font-size:11px">
            <span style="width:8px;height:8px;border-radius:50%;background:${d.color};display:inline-block"></span>
            <span style="color:var(--text2)">${d.agent}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

function renderErrorLog() {
  const el = document.getElementById('error-log');
  el.innerHTML = ERROR_LOG_LINES.slice(0, 5).map(l => `
    <div class="${l.cls}">${l.text}</div>
  `).join('');

  let idx = 0;
  setInterval(() => {
    idx = (idx + 1) % ERROR_LOG_LINES.length;
    const line = document.createElement('div');
    line.className = ERROR_LOG_LINES[idx].cls;
    line.textContent = ERROR_LOG_LINES[idx].text;
    el.appendChild(line);
    if (el.children.length > 8) el.removeChild(el.firstChild);
  }, 4000);
}

function renderWebhookHealth() {
  const el = document.getElementById('webhook-health');
  el.classList.add('webhook-list');

  const sparkData = [95,98,92,99,88,95,70,96,94,90];
  const sparkW = 60, sparkH = 24;
  const pts = sparkData.map((v, i) => {
    const x = (i / (sparkData.length-1)) * sparkW;
    const y = sparkH - (v/100) * sparkH;
    return `${x},${y}`;
  }).join(' ');

  el.innerHTML = WEBHOOKS.map(w => `
    <div class="webhook-row">
      <span class="webhook-name">${w.name}</span>
      <span style="color:var(--text2);font-size:11px">${w.latency}</span>
      <span class="webhook-status ${w.status}">${w.status.toUpperCase()}</span>
    </div>
  `).join('') + `
    <div class="sparkline-wrap">
      <div style="font-size:10px;color:var(--text2);margin-bottom:2px">10-min latency trend</div>
      <svg width="${sparkW}" height="${sparkH}" viewBox="0 0 ${sparkW} ${sparkH}">
        <polyline points="${pts}" fill="none" stroke="var(--researcher)" stroke-width="1.5"/>
        <circle cx="${sparkW}" cy="${sparkH - (sparkData[sparkData.length-1]/100)*sparkH}" r="2" fill="var(--researcher)"/>
      </svg>
    </div>
  `;
}

/* ============================================================
   MOBILE: INPUT SHEET
============================================================ */
function initMobileInput() {
  const feedWrap = document.querySelector('.bridge-feed-wrap');
  if (window.innerWidth < 768) {
    // add tap-to-open button
    const btn = document.createElement('button');
    btn.className = 'show-graph-btn';
    btn.style.cssText = 'bottom:72px;right:16px;z-index:150';
    btn.textContent = '✏️ Message';
    btn.addEventListener('click', () => {
      document.getElementById('input-sheet').classList.toggle('hidden');
    });
    document.body.appendChild(btn);
  }
}

/* ============================================================
   SIDEBAR / MOBILE NAV — EVENT BINDING
============================================================ */
function bindNavigation() {
  // Sidebar
  document.querySelectorAll('.nav-item[data-view]').forEach(el => {
    el.addEventListener('click', () => navigateTo(el.dataset.view));
  });
  // Mobile nav
  document.querySelectorAll('.mobile-nav-btn[data-view]').forEach(el => {
    el.addEventListener('click', () => navigateTo(el.dataset.view));
  });
}

/* ============================================================
   MAIN INIT
============================================================ */
function init() {
  bindNavigation();

  renderBridge();
  renderTasks();
  renderAgents();
  renderSystem();

  // Graph init deferred until viewed
  // Tasks timer
  startTimer();
  window.addEventListener('resize', renderMobileTaskTab);

  // Mobile input sheet
  initMobileInput();

  // Enter to send
  document.getElementById('msg-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') sendMessage();
  });
}

document.addEventListener('DOMContentLoaded', init);
