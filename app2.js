/* Agent OS v5 — app2.js — Mind + Pulse + Board + Stream */
'use strict';

// ═══════════════════════════════════════════════════════════
// MIND PAGE
// ═══════════════════════════════════════════════════════════

let mindMode = 'graph';
let graphNodes = [];
let graphEdges = [];
let graphCanvas = null;
let graphCtx = null;
let hoveredNode = null;
let selectedNode = null;
let draggingNode = null;
let graphAnimId = null;

function initMind() {
  if (mindMode === 'graph') {
    requestAnimationFrame(() => initGraph());
  } else if (mindMode === 'cards') {
    renderVaultCards();
  } else {
    renderTimeline();
  }
}

function setMindMode(mode) {
  mindMode = mode;
  $$('.view-toggle').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));

  $('mind-graph').classList.toggle('hidden', mode !== 'graph');
  $('mind-cards').classList.toggle('hidden', mode !== 'cards');
  $('mind-timeline').classList.toggle('hidden', mode !== 'timeline');

  if (mode !== 'graph') $('mind-graph').classList.remove('active');
  if (mode !== 'cards') $('mind-cards').classList.remove('active');
  if (mode !== 'timeline') $('mind-timeline').classList.remove('active');

  const target = mode === 'graph' ? 'mind-graph' : mode === 'cards' ? 'mind-cards' : 'mind-timeline';
  $(target).classList.add('active');
  $(target).classList.remove('hidden');

  if (mode === 'graph') initGraph();
  else if (mode === 'cards') renderVaultCards();
  else renderTimeline();
}

// ── Force-Directed Graph ──────────────────────────────────
function initGraph() {
  graphCanvas = $('graph-canvas');
  if (!graphCanvas) return;
  graphCtx = graphCanvas.getContext('2d');

  const parent = graphCanvas.parentElement;
  graphCanvas.width = parent.clientWidth || 800;
  graphCanvas.height = parent.clientHeight || 500;

  const W = graphCanvas.width;
  const H = graphCanvas.height;

  graphNodes = GNODES.map(n => ({
    ...n,
    x: W / 2 + (Math.random() - 0.5) * 200,
    y: H / 2 + (Math.random() - 0.5) * 150,
    vx: 0, vy: 0,
    r: n.size || 12,
  }));
  graphEdges = GEDGES.map(([a, b]) => ({ source: a, target: b }));

  graphCanvas.onmousemove = graphMouseMove;
  graphCanvas.onmousedown = graphMouseDown;
  graphCanvas.onmouseup = graphMouseUp;
  graphCanvas.onclick = graphClick;

  if (graphAnimId) cancelAnimationFrame(graphAnimId);
  runGraphSim();
}

function runGraphSim() {
  if (mindMode !== 'graph' || !graphCtx) return;

  const W = graphCanvas.width;
  const H = graphCanvas.height;
  const k = Math.sqrt((W * H) / Math.max(graphNodes.length, 1));

  // Reset forces
  graphNodes.forEach(n => { n.fx = 0; n.fy = 0; });

  // Repulsion between all nodes
  for (let i = 0; i < graphNodes.length; i++) {
    for (let j = i + 1; j < graphNodes.length; j++) {
      const a = graphNodes[i], b = graphNodes[j];
      let dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const force = (k * k) / d * 0.3;
      const fx = (dx / d) * force;
      const fy = (dy / d) * force;
      a.fx -= fx; a.fy -= fy;
      b.fx += fx; b.fy += fy;
    }
  }

  // Attraction along edges
  graphEdges.forEach(({ source, target }) => {
    const a = graphNodes[source], b = graphNodes[target];
    if (!a || !b) return;
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const force = (d * d) / k * 0.08;
    const fx = (dx / d) * force;
    const fy = (dy / d) * force;
    a.fx += fx; a.fy += fy;
    b.fx -= fx; b.fy -= fy;
  });

  // Center gravity — strong pull to keep nodes clustered
  graphNodes.forEach(n => {
    n.fx += (W / 2 - n.x) * 0.12;
    n.fy += (H / 2 - n.y) * 0.12;
  });

  // Integrate
  graphNodes.forEach(n => {
    if (n === draggingNode) return;
    n.vx = (n.vx + n.fx) * 0.85;
    n.vy = (n.vy + n.fy) * 0.85;
    n.x += n.vx;
    n.y += n.vy;
    const pad = 60; // padding for labels
    n.x = Math.max(pad, Math.min(W - pad, n.x));
    n.y = Math.max(pad, Math.min(H - pad, n.y));
  });

  drawGraph();
  graphAnimId = requestAnimationFrame(runGraphSim);
}

function drawGraph() {
  const ctx = graphCtx;
  const W = graphCanvas.width, H = graphCanvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#1e1e2e';
  ctx.fillRect(0, 0, W, H);

  // Edges
  graphEdges.forEach(({ source, target }) => {
    const a = graphNodes[source], b = graphNodes[target];
    if (!a || !b) return;
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = 'rgba(99,102,119,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Nodes
  graphNodes.forEach(n => {
    const isH = n === hoveredNode;
    const isS = n === selectedNode;
    const r = n.r + (isH ? 4 : 0);

    if (n.glow || isS) {
      ctx.beginPath();
      ctx.arc(n.x, n.y, r + 8, 0, Math.PI * 2);
      const gr = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r + 8);
      gr.addColorStop(0, (n.hex || '#cba6f7') + '60');
      gr.addColorStop(1, 'transparent');
      ctx.fillStyle = gr;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    ctx.fillStyle = n.hex || '#cba6f7';
    ctx.fill();
    ctx.strokeStyle = isS ? '#fff' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = isS ? 2 : 1;
    ctx.stroke();

    ctx.fillStyle = isH ? '#fff' : 'rgba(205,214,244,0.8)';
    ctx.font = `${isH ? '12px' : '10px'} sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(n.label, n.x, n.y + r + 12);
  });
}

function hitTestNode(mx, my) {
  for (let i = graphNodes.length - 1; i >= 0; i--) {
    const n = graphNodes[i];
    const dx = mx - n.x, dy = my - n.y;
    if (dx * dx + dy * dy < (n.r + 6) * (n.r + 6)) return n;
  }
  return null;
}

function graphMouseMove(e) {
  const rect = graphCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  if (draggingNode) {
    draggingNode.x = mx; draggingNode.y = my;
    draggingNode.vx = 0; draggingNode.vy = 0;
    return;
  }
  hoveredNode = hitTestNode(mx, my);
  graphCanvas.style.cursor = hoveredNode ? 'pointer' : 'grab';
  const tip = $('graph-tooltip');
  if (hoveredNode) {
    tip.textContent = hoveredNode.label;
    tip.style.left = (mx + 14) + 'px';
    tip.style.top = (my - 8) + 'px';
    tip.classList.remove('hidden');
  } else {
    tip.classList.add('hidden');
  }
}

function graphMouseDown(e) {
  const rect = graphCanvas.getBoundingClientRect();
  const n = hitTestNode(e.clientX - rect.left, e.clientY - rect.top);
  if (n) { draggingNode = n; graphCanvas.style.cursor = 'grabbing'; }
}

function graphMouseUp() { draggingNode = null; graphCanvas.style.cursor = 'grab'; }

function graphClick(e) {
  const rect = graphCanvas.getBoundingClientRect();
  const n = hitTestNode(e.clientX - rect.left, e.clientY - rect.top);
  if (n) { selectedNode = n; showGraphDetail(n); }
  else { selectedNode = null; $('graph-detail').classList.add('hidden'); }
}

function showGraphDetail(node) {
  const panel = $('graph-detail');
  const note = GNOTES_MAP[node.id];
  const conns = graphEdges.filter(e => e.source === node.id || e.target === node.id)
    .map(e => graphNodes[e.source === node.id ? e.target : e.source]?.label)
    .filter(Boolean);

  panel.innerHTML = `
    <button class="graph-detail-close" onclick="$('graph-detail').classList.add('hidden');selectedNode=null">✕</button>
    <div class="graph-detail-title" style="color:${node.hex}">${node.label}</div>
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">${node.type} · ${conns.length} connections</div>
    <div class="graph-detail-body">${note || 'Click a node to see details.'}</div>
    ${conns.length ? `
      <div style="margin-top:10px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px">Connected to</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px">${conns.slice(0, 8).map(c => `<span style="background:var(--bg-raised);padding:2px 8px;border-radius:10px;font-size:11px">${c}</span>`).join('')}</div>
      </div>` : ''}
  `;
  panel.classList.remove('hidden');
}

// ── Vault Cards ───────────────────────────────────────────
function renderVaultCards(notes) {
  const grid = $('vault-cards-grid');
  const list = notes || VAULT_NOTES;
  grid.innerHTML = '';
  list.forEach(note => {
    const agent = ga(note.agent) || { emoji: '🤖' };
    const cc = note.confidence >= 80 ? 'confidence-high' : note.confidence >= 60 ? 'confidence-mid' : 'confidence-low';
    const card = document.createElement('div');
    card.className = 'vault-card';
    card.onclick = () => openVaultNote(note);
    card.innerHTML = `
      <div class="vault-card-header">
        <div class="vault-card-title">${note.title}</div>
        <span class="vault-card-type">${note.type}</span>
      </div>
      <div class="vault-card-summary">${note.summary}</div>
      <div class="vault-card-meta">
        <div class="confidence-bar-outer"><div class="confidence-bar-inner ${cc}" style="width:${note.confidence}%"></div></div>
        <span class="vault-backlinks">🔗 ${note.backlinks}</span>
        <span class="vault-agent">${agent.emoji}</span>
      </div>
    `;
    grid.appendChild(card);
  });
}

function openVaultNote(note) {
  const agent = ga(note.agent) || { emoji: '🤖', name: note.agent };
  const modal = $('card-modal-content');
  modal.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <div style="font-size:24px">${agent.emoji}</div>
      <div style="flex:1">
        <div style="font-weight:700;font-size:16px">${note.title}</div>
        <div style="font-size:12px;color:var(--text-muted)">${note.type} · ${note.date} · ${agent.name}</div>
      </div>
      <button onclick="closeModal()" style="color:var(--text-muted);font-size:18px">✕</button>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap">${note.tags.map(t => `<span style="background:var(--bg-raised);padding:2px 8px;border-radius:10px;font-size:11px">#${t}</span>`).join('')}</div>
    <div style="color:var(--text-dim);line-height:1.7;margin-bottom:16px">${note.summary}</div>
    <div style="display:flex;gap:16px;font-size:12px;color:var(--text-muted)">
      <span>Confidence: <strong style="color:var(--green)">${note.confidence}%</strong></span>
      <span>Backlinks: <strong>${note.backlinks}</strong></span>
    </div>
  `;
  $('card-modal').classList.remove('hidden');
}

function closeModal() { $('card-modal').classList.add('hidden'); }
function closeModalIfOutside(e) { if (e.target === $('card-modal')) closeModal(); }

function searchMind(query) {
  if (mindMode !== 'cards') return;
  const q = query.toLowerCase().trim();
  if (!q) { renderVaultCards(); return; }
  const filtered = VAULT_NOTES.filter(n =>
    n.title.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q) ||
    n.tags.some(t => t.includes(q)) || n.type.toLowerCase().includes(q)
  );
  renderVaultCards(filtered);
}

// ── Timeline ──────────────────────────────────────────────
function renderTimeline() {
  const track = $('timeline-track');
  if (!track) return;
  const sorted = [...VAULT_NOTES].sort((a, b) => new Date(a.date) - new Date(b.date));
  track.innerHTML = '<div class="timeline-axis"></div>';
  const trackW = Math.max(1400, sorted.length * 100);
  track.style.width = trackW + 'px';
  const dates = sorted.map(n => new Date(n.date).getTime());
  const minD = Math.min(...dates), maxD = Math.max(...dates);
  const range = maxD - minD || 1;

  sorted.forEach((note, i) => {
    const agent = ga(note.agent) || { emoji: '🤖', color: '#cba6f7' };
    const pct = (new Date(note.date).getTime() - minD) / range;
    const x = 60 + pct * (trackW - 120);
    const above = i % 2 === 0;
    const item = document.createElement('div');
    item.className = 'timeline-item';
    item.style.left = x + 'px';
    item.style.top = above ? '20%' : '55%';
    item.onclick = () => openVaultNote(note);
    item.innerHTML = `
      <div class="timeline-label ${above ? 'above' : 'below'}">${agent.emoji} ${note.title.substring(0, 22)}${note.title.length > 22 ? '…' : ''}</div>
      <div class="timeline-dot" style="background:${agent.color || '#cba6f7'}"></div>
    `;
    track.appendChild(item);
  });
}

// ═══════════════════════════════════════════════════════════
// PULSE PAGE
// ═══════════════════════════════════════════════════════════

function renderPulse() {
  renderAgentHealth();
  renderCostChart();
  renderSystemLoad();
  renderCrons();
  renderHooks();
  renderErrorLog();
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
      <div class="health-agent"><span class="health-status-dot" style="background:${statusClr}"></span>${a.emoji} ${a.name}</div>
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
  const agents = ['righthand', 'researcher', 'coder', 'vault', 'other'];
  const colors = { righthand: '#f9e2af', researcher: '#89b4fa', coder: '#a6e3a1', vault: '#cba6f7', other: '#94e2d5' };
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
  const errors = STREAM_EVENTS.filter(e => e.level === 'error' || e.level === 'warn').slice(0, 8);
  $('error-log').innerHTML = errors.map(e => {
    const agent = ga(e.agent) || { emoji: '❓' };
    return `
      <div class="error-item">
        <span class="error-time">${e.time}</span>
        <span class="error-agent">${agent.emoji}</span>
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
// BOARD PAGE
// ═══════════════════════════════════════════════════════════

const BOARD_COLUMNS = [
  { id: 'inbox',  label: 'Inbox',  color: 'var(--text-muted)' },
  { id: 'queued', label: 'Queued', color: 'var(--yellow)' },
  { id: 'active', label: 'Active', color: 'var(--accent2)' },
  { id: 'review', label: 'Review', color: 'var(--orange)' },
  { id: 'done',   label: 'Done',   color: 'var(--green)' },
];

function renderBoard() {
  const board = $('kanban-board');
  board.innerHTML = '';
  BOARD_COLUMNS.forEach(col => {
    const cards = BOARD_CARDS[col.id] || [];
    const el = document.createElement('div');
    el.className = 'kanban-col';
    el.innerHTML = `
      <div class="kanban-col-header" style="border-top:2px solid ${col.color}">
        <span style="color:${col.color}">${col.label}</span>
        <span class="col-count">${cards.length}</span>
      </div>
      <div class="kanban-cards" id="cards-${col.id}"></div>
    `;
    board.appendChild(el);
    const container = el.querySelector(`#cards-${col.id}`);
    cards.forEach(card => container.appendChild(makeBoardCard(card, col.id)));
  });
}

function makeBoardCard(card, colId) {
  const agent = ga(card.agent) || { emoji: '🤖' };
  const pCls = (card.priority || 'P3').toLowerCase();
  const el = document.createElement('div');
  el.className = 'board-card';
  el.onclick = () => openBoardCard(card, colId);
  let progressHTML = '';
  if (card.progress !== undefined) {
    progressHTML = `<div class="progress-bar-outer"><div class="progress-bar-inner" style="width:${card.progress}%"></div></div>
      <div style="font-size:10px;color:var(--text-muted);margin-top:3px">${card.progress}% complete</div>`;
  }
  el.innerHTML = `
    <div class="board-card-title">${card.title}</div>
    <div class="board-card-meta">
      <span class="priority-badge ${pCls}">${card.priority}</span>
      <span class="board-card-agent">${agent.emoji}</span>
    </div>
    ${progressHTML}
    <div class="board-tags">${(card.tags || []).map(t => `<span class="board-tag">${t}</span>`).join('')}</div>
  `;
  return el;
}

function openBoardCard(card, colId) {
  const agent = ga(card.agent) || { emoji: '🤖', name: card.agent, color: '#cba6f7' };
  const pCls = (card.priority || 'P3').toLowerCase();
  const col = BOARD_COLUMNS.find(c => c.id === colId);
  const modal = $('card-modal-content');
  modal.innerHTML = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
      <span class="priority-badge ${pCls}" style="font-size:14px;padding:4px 12px">${card.priority}</span>
      <div style="font-weight:700;font-size:16px;flex:1">${card.title}</div>
      <button onclick="closeModal()" style="color:var(--text-muted);font-size:18px">✕</button>
    </div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px">
      <span style="font-size:22px;border:2px solid ${agent.color};border-radius:50%;width:36px;height:36px;display:flex;align-items:center;justify-content:center">${agent.emoji}</span>
      <div>
        <div style="font-weight:600">${agent.name}</div>
        <div style="font-size:12px;color:var(--text-muted)">${agent.role}</div>
      </div>
      <div style="margin-left:auto;padding:4px 10px;border-radius:8px;background:var(--bg-raised);font-size:12px;color:${col?.color || 'var(--text-muted)'}">${col?.label || colId}</div>
    </div>
    ${card.progress !== undefined ? `
      <div style="margin-bottom:16px">
        <div style="font-size:12px;color:var(--text-muted);margin-bottom:4px">Progress: ${card.progress}%</div>
        <div class="progress-bar-outer" style="height:6px"><div class="progress-bar-inner" style="width:${card.progress}%"></div></div>
      </div>` : ''}
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px">${(card.tags || []).map(t => `<span style="background:var(--bg-raised);padding:3px 10px;border-radius:10px;font-size:12px">${t}</span>`).join('')}</div>
    <div style="display:flex;gap:8px;margin-top:12px">
      <button class="approve-btn" style="flex:none;padding:6px 14px;font-size:12px" onclick="moveBoardCard('${card.id}','${colId}','right');closeModal()">Move →</button>
      <button class="reject-btn" style="flex:none;padding:6px 14px;font-size:12px" onclick="moveBoardCard('${card.id}','${colId}','left');closeModal()">← Move</button>
    </div>
  `;
  $('card-modal').classList.remove('hidden');
}

function moveBoardCard(cardId, fromCol, direction) {
  const colIds = BOARD_COLUMNS.map(c => c.id);
  const idx = colIds.indexOf(fromCol);
  const newIdx = direction === 'right' ? Math.min(idx + 1, colIds.length - 1) : Math.max(idx - 1, 0);
  if (newIdx === idx) return;

  const cards = BOARD_CARDS[fromCol];
  const ci = cards.findIndex(c => c.id === cardId);
  if (ci === -1) return;
  const [card] = cards.splice(ci, 1);
  BOARD_CARDS[colIds[newIdx]].push(card);
  renderBoard();
  toast(`Card moved to ${BOARD_COLUMNS[newIdx].label}`, 'success');
  addXP(5, 'board action');
}

function addBoardCard() {
  const title = prompt('Card title:');
  if (!title) return;
  const newCard = {
    id: 'b_' + Date.now(),
    title,
    priority: 'P2',
    agent: AGENTS[Math.floor(Math.random() * AGENTS.length)].id,
    tags: ['new'],
  };
  BOARD_CARDS.inbox.push(newCard);
  renderBoard();
  toast('📋 Card added to Inbox', 'success');
  addXP(5, 'board card created');
}

// ═══════════════════════════════════════════════════════════
// STREAM PAGE
// ═══════════════════════════════════════════════════════════

let streamEvents = [...STREAM_EVENTS];
let streamLevels = new Set(['debug', 'info', 'warn', 'error']);
let streamAgentFilter = 'all';

function renderStream() {
  renderStreamAgentFilters();
  renderStreamLog();
}

function renderStreamAgentFilters() {
  const container = $('stream-agent-filters');
  if (!container) return;
  container.innerHTML = `<button class="stream-agent-chip ${streamAgentFilter === 'all' ? 'active' : ''}" onclick="setStreamAgent('all')">All</button>`;
  const uniqueAgents = [...new Set(streamEvents.map(e => e.agent))];
  uniqueAgents.forEach(agentId => {
    const agent = ga(agentId);
    if (!agent) return;
    container.innerHTML += `<button class="stream-agent-chip ${streamAgentFilter === agentId ? 'active' : ''}" onclick="setStreamAgent('${agentId}')">${agent.emoji} ${agent.name}</button>`;
  });
}

function setStreamAgent(agentId) {
  streamAgentFilter = agentId;
  renderStreamAgentFilters();
  renderStreamLog();
}

function renderStreamLog() {
  const log = $('stream-log');
  if (!log) return;
  const filtered = getFilteredStream();
  log.innerHTML = filtered.map(e => {
    const agent = ga(e.agent) || { emoji: '❓', name: e.agent };
    return `<div class="log-line level-${e.level}">
      <span class="log-time">${e.time}</span>
      <span class="log-level ${e.level}">${e.level}</span>
      <span class="log-agent">${agent.emoji} ${agent.name}</span>
      <span class="log-text">${e.text}</span>
    </div>`;
  }).join('');

  // Auto-scroll
  const autoScroll = $('autoscroll-toggle');
  if (autoScroll && autoScroll.checked) {
    log.scrollTop = log.scrollHeight;
  }
}

function getFilteredStream() {
  const search = $('stream-search')?.value || '';
  let evs = streamEvents.filter(e => streamLevels.has(e.level));
  if (streamAgentFilter !== 'all') evs = evs.filter(e => e.agent === streamAgentFilter);
  if (search) {
    try {
      const re = new RegExp(search, 'i');
      evs = evs.filter(e => re.test(e.text) || re.test(e.agent));
    } catch {
      evs = evs.filter(e => e.text.toLowerCase().includes(search.toLowerCase()));
    }
  }
  return evs;
}

function filterStream(val) {
  renderStreamLog();
}

function toggleLevelFilter(level, btn) {
  if (streamLevels.has(level)) streamLevels.delete(level);
  else streamLevels.add(level);
  if (btn) btn.classList.toggle('active', streamLevels.has(level));
  renderStreamLog();
}

function addStreamEvent(event) {
  streamEvents.unshift(event);
  if (currentPage === 'stream') renderStreamLog();
}
