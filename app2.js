/* Agent OS v5 — app2.js — Mind + Pulse + Board + Stream */
'use strict';

// ═══════════════════════════════════════════════════════════
// MIND PAGE
// ═══════════════════════════════════════════════════════════

let mindMode = 'cards'; // default to cards (most usable on mobile)
let mindFilter = 'all';
let mindSortBy = 'recent';
let graphNodes = [];
let graphEdges = [];
let graphCanvas = null;
let graphCtx = null;
let hoveredNode = null;
let selectedNode = null;
let draggingNode = null;
let graphAnimId = null;

const MIND_TYPES = ['all','Research','Architecture','Vision','Operations','Report','Code'];
const TYPE_COLORS = {
  Research:'#5B8AF0', Architecture:'#D4A574', Vision:'#D4A574',
  Operations:'#F39C12', Report:'#E74C3C', Code:'#4CAF50'
};

function initMind() {
  // Default to cards on mobile, graph on desktop
  if (window.innerWidth <= 768 && mindMode === 'graph') {
    mindMode = 'cards';
  }
  renderMindFilterPills();
  setMindMode(mindMode);
}

function renderMindFilterPills() {
  const row = $('mind-filter-pills');
  if (!row) return;
  row.innerHTML = MIND_TYPES.map(t => {
    const active = mindFilter === (t === 'all' ? 'all' : t);
    const color = t === 'all' ? 'var(--accent)' : (TYPE_COLORS[t] || 'var(--text-dim)');
    return `<button class="mind-pill${active ? ' active' : ''}"
      style="${active ? `background:${color};color:var(--bg-base)` : ''}"
      data-filter="${t === 'all' ? 'all' : t}"
      onclick="setMindFilter('${t === 'all' ? 'all' : t}')">${t === 'all' ? 'All' : t}</button>`;
  }).join('');
}

function setMindFilter(type) {
  mindFilter = type;
  renderMindFilterPills();
  if (mindMode === 'cards') renderVaultCards();
  else if (mindMode === 'timeline') renderTimeline();
}

function applyMindSort() {
  mindSortBy = $('mind-sort').value;
  if (mindMode === 'cards') renderVaultCards();
  else if (mindMode === 'timeline') renderTimeline();
}

function getFilteredNotes() {
  let notes = [...VAULT_NOTES];
  // Filter
  if (mindFilter !== 'all') {
    notes = notes.filter(n => n.type === mindFilter);
  }
  // Search
  const q = ($('mind-search')?.value || '').toLowerCase().trim();
  if (q) {
    notes = notes.filter(n =>
      n.title.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q) ||
      n.tags.some(t => t.includes(q)) || n.type.toLowerCase().includes(q)
    );
  }
  // Sort
  switch (mindSortBy) {
    case 'confidence': notes.sort((a,b) => b.confidence - a.confidence); break;
    case 'backlinks': notes.sort((a,b) => b.backlinks - a.backlinks); break;
    case 'alpha': notes.sort((a,b) => a.title.localeCompare(b.title)); break;
    default: notes.sort((a,b) => new Date(b.date) - new Date(a.date)); break;
  }
  return notes;
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

  // Show/hide filters (not for graph)
  const filters = $('mind-filters');
  if (filters) filters.style.display = mode === 'graph' ? 'none' : '';

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
  graphSimTick = 0;
  graphSettled = false;
  runGraphSim();
}

let graphSimTick = 0;
let graphSettled = false;

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

  // Integrate + measure total kinetic energy
  let totalEnergy = 0;
  graphNodes.forEach(n => {
    if (n === draggingNode) return;
    n.vx = (n.vx + n.fx) * 0.85;
    n.vy = (n.vy + n.fy) * 0.85;
    n.x += n.vx;
    n.y += n.vy;
    const pad = 60;
    n.x = Math.max(pad, Math.min(W - pad, n.x));
    n.y = Math.max(pad, Math.min(H - pad, n.y));
    totalEnergy += n.vx * n.vx + n.vy * n.vy;
  });

  graphSimTick++;
  drawGraph();

  // Stop animating once settled (energy near zero or max 300 ticks)
  if ((totalEnergy < 0.01 && graphSimTick > 50) || graphSimTick > 300) {
    graphSettled = true;
    drawGraph(); // final frame
    return; // stop the loop
  }

  graphAnimId = requestAnimationFrame(runGraphSim);
}

function drawGraph() {
  const ctx = graphCtx;
  const W = graphCanvas.width, H = graphCanvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0f0f12';
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
      gr.addColorStop(0, (n.hex || '#D4A574') + '60');
      gr.addColorStop(1, 'transparent');
      ctx.fillStyle = gr;
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
    ctx.fillStyle = n.hex || '#D4A574';
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

function graphMouseUp() {
  if (draggingNode && graphSettled) {
    // Restart sim to re-settle after drag
    graphSettled = false;
    graphSimTick = 0;
    runGraphSim();
  }
  draggingNode = null;
  graphCanvas.style.cursor = 'grab';
}

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
function renderVaultCards() {
  const grid = $('vault-cards-grid');
  const list = getFilteredNotes();
  grid.innerHTML = '';
  updateNoteCount(list.length);

  list.forEach(note => {
    const agent = ga(note.agent) || { emoji: '🤖' };
    const cc = note.confidence >= 80 ? 'confidence-high' : note.confidence >= 60 ? 'confidence-mid' : 'confidence-low';
    const typeColor = TYPE_COLORS[note.type] || 'var(--text-dim)';
    const card = document.createElement('div');
    card.className = 'vault-card';
    card.onclick = () => openVaultNote(note);
    card.innerHTML = `
      <div class="vault-card-header">
        <div class="vault-card-title">${note.title}</div>
        <span class="vault-card-type" style="color:${typeColor};border-color:${typeColor}40">${note.type}</span>
      </div>
      <div class="vault-card-summary">${note.summary}</div>
      <div class="vault-card-meta">
        <div class="confidence-bar-outer"><div class="confidence-bar-inner ${cc}" style="width:${note.confidence}%"></div></div>
        <span class="vault-backlinks">🔗 ${note.backlinks}</span>
        <span class="vault-agent">${agent.emoji}</span>
        <span class="vault-date">${note.date.slice(5)}</span>
      </div>
    `;
    grid.appendChild(card);
  });
}

function updateNoteCount(count) {
  const el = $('mind-note-count');
  if (el) el.textContent = `${count} note${count !== 1 ? 's' : ''}`;
}

function openVaultNote(note) {
  const agent = ga(note.agent) || { emoji: '🤖', name: note.agent };
  const cc = note.confidence >= 80 ? 'var(--green)' : note.confidence >= 60 ? 'var(--yellow)' : 'var(--red)';
  const typeColor = TYPE_COLORS[note.type] || 'var(--text-dim)';

  // Find related notes via shared tags
  const related = VAULT_NOTES.filter(n => n.id !== note.id && n.tags.some(t => note.tags.includes(t))).slice(0, 4);

  // On mobile, use full-screen detail; on desktop, use modal
  if (window.innerWidth <= 768) {
    const detail = $('mind-note-detail');
    detail.innerHTML = renderNoteDetailContent(note, agent, cc, typeColor, related, true);
    detail.classList.remove('hidden');
    return;
  }

  const modal = $('card-modal-content');
  modal.innerHTML = renderNoteDetailContent(note, agent, cc, typeColor, related, false);
  $('card-modal').classList.remove('hidden');
}

function renderNoteDetailContent(note, agent, cc, typeColor, related, isMobile) {
  const closeAction = isMobile ? 'closeMobileNoteDetail()' : 'closeModal()';
  return `
    <div class="note-detail-header">
      <button class="note-detail-back" onclick="${closeAction}">${isMobile ? '← Back' : '✕'}</button>
    </div>
    <div class="note-detail-body">
      <div class="note-detail-type-badge" style="color:${typeColor};border-color:${typeColor}">${note.type}</div>
      <h2 class="note-detail-title">${note.title}</h2>
      <div class="note-detail-meta-row">
        <span>${agent.emoji} ${agent.name || note.agent}</span>
        <span>·</span>
        <span>${note.date}</span>
        <span>·</span>
        <span style="color:${cc}">⬤ ${note.confidence}%</span>
        <span>·</span>
        <span>🔗 ${note.backlinks} links</span>
      </div>
      <div class="note-detail-tags">${note.tags.map(t => `<span class="note-tag">#${t}</span>`).join('')}</div>
      <div class="note-detail-content">${note.summary}</div>
      ${related.length ? `
        <div class="note-detail-related">
          <h3>Related Notes</h3>
          ${related.map(r => {
            const ra = ga(r.agent) || { emoji:'🤖' };
            return `<div class="note-related-item" onclick="openVaultNote(VAULT_NOTES.find(n=>n.id==='${r.id}'))">
              <span>${ra.emoji}</span>
              <span class="note-related-title">${r.title}</span>
              <span class="note-related-type" style="color:${TYPE_COLORS[r.type]||'var(--text-dim)'}">${r.type}</span>
            </div>`;
          }).join('')}
        </div>` : ''}
    </div>
  `;
}

function closeMobileNoteDetail() {
  $('mind-note-detail').classList.add('hidden');
}

function closeModal() { $('card-modal').classList.add('hidden'); }
function closeModalIfOutside(e) { if (e.target === $('card-modal')) closeModal(); }

function searchMind(query) {
  if (mindMode === 'cards') renderVaultCards();
  else if (mindMode === 'timeline') renderTimeline();
}

// ── Timeline ──────────────────────────────────────────────
function renderTimeline() {
  const track = $('timeline-track');
  if (!track) return;

  const notes = getFilteredNotes();
  const sorted = [...notes].sort((a, b) => new Date(b.date) - new Date(a.date)); // newest first
  updateNoteCount(sorted.length);

  // On mobile: vertical timeline
  if (window.innerWidth <= 768) {
    renderVerticalTimeline(track, sorted);
    return;
  }

  // Desktop: horizontal timeline
  track.innerHTML = '<div class="timeline-axis"></div>';
  const trackW = Math.max(1400, sorted.length * 100);
  track.style.width = trackW + 'px';
  track.style.height = '';

  const desktopSorted = [...notes].sort((a,b) => new Date(a.date) - new Date(b.date));
  const dates = desktopSorted.map(n => new Date(n.date).getTime());
  const minD = Math.min(...dates), maxD = Math.max(...dates);
  const range = maxD - minD || 1;

  desktopSorted.forEach((note, i) => {
    const agent = ga(note.agent) || { emoji: '🤖', color: '#D4A574' };
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
      <div class="timeline-dot" style="background:${agent.color || '#D4A574'}"></div>
    `;
    track.appendChild(item);
  });
}

function renderVerticalTimeline(track, sorted) {
  track.style.width = '100%';
  track.style.height = 'auto';
  track.innerHTML = '';

  let lastDate = '';
  sorted.forEach(note => {
    const agent = ga(note.agent) || { emoji: '🤖', color: '#D4A574' };
    const typeColor = TYPE_COLORS[note.type] || 'var(--text-dim)';
    const cc = note.confidence >= 80 ? 'var(--green)' : note.confidence >= 60 ? 'var(--yellow)' : 'var(--red)';

    // Date separator
    if (note.date !== lastDate) {
      lastDate = note.date;
      const sep = document.createElement('div');
      sep.className = 'vtl-date';
      sep.textContent = note.date;
      track.appendChild(sep);
    }

    const item = document.createElement('div');
    item.className = 'vtl-item';
    item.onclick = () => openVaultNote(note);
    item.innerHTML = `
      <div class="vtl-dot" style="background:${typeColor}"></div>
      <div class="vtl-content">
        <div class="vtl-title">${note.title}</div>
        <div class="vtl-summary">${note.summary.substring(0, 80)}${note.summary.length > 80 ? '…' : ''}</div>
        <div class="vtl-meta">
          <span>${agent.emoji}</span>
          <span style="color:${cc}">●${note.confidence}%</span>
          <span>🔗${note.backlinks}</span>
          <span class="vtl-type" style="color:${typeColor}">${note.type}</span>
        </div>
      </div>
    `;
    track.appendChild(item);
  });
}

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
  const colors = { righthand: '#D4A574', researcher: '#5B8AF0', coder: '#4CAF50', vault: '#D4A574', other: '#1ABC9C' };
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
      rect.setAttribute('fill', colors[agent] || '#1ABC9C');
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
    const levelClass = e.level === 'error' ? 'error' : e.level === 'warn' ? 'warn' : 'info';
    return `
      <div class="error-item error-line ${levelClass}">
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
  const agent = ga(card.agent) || { emoji: '🤖', name: card.agent, color: '#D4A574' };
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

// ═══════════════════════════════════════════════════════════
// PLANS PAGE — Kanban Board
// ═══════════════════════════════════════════════════════════

let plansData = [];
let currentPlanId = null;
let plansLoaded = false;

const PLAN_PRIORITY_COLORS = {P1:'#f38ba8', P2:'#fab387', P3:'#89b4fa', P4:'#6c7086'};
const DEFAULT_COLUMNS = ['Backlog','In Progress','Review','Done'];

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return Math.floor(s/60) + 'm ago';
  if (s < 86400) return Math.floor(s/3600) + 'h ago';
  return Math.floor(s/86400) + 'd ago';
}

async function renderPlans() {
  const v = $('view-plans');
  if (!v) return;

  if (!Bridge.liveMode) {
    v.innerHTML = `<div class="plans-empty"><div class="empty-icon">📋</div><div class="empty-title">Connect bridge to view plans</div><div class="empty-desc">Configure bridge connection to load your Kanban boards</div></div>`;
    return;
  }

  v.innerHTML = `<div class="plans-loading"><span class="plans-spinner"></span> Loading plans...</div>`;

  try {
    plansData = await Bridge.getPlans();
    if (!Array.isArray(plansData)) plansData = plansData.plans || [];
    plansLoaded = true;
    if (!currentPlanId && plansData.length > 0) currentPlanId = plansData[0].id;
    renderPlansUI();
  } catch (e) {
    v.innerHTML = `<div class="plans-empty"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load plans</div><div class="empty-desc">${e.message}</div></div>`;
  }
}

function renderPlansUI() {
  const v = $('view-plans');
  if (!v) return;

  const plan = plansData.find(p => p.id === currentPlanId);

  // Top bar: plan tabs + new plan button
  let html = `<div class="plans-topbar">
    <div class="plans-tabs">`;
  plansData.forEach(p => {
    const active = p.id === currentPlanId ? ' active' : '';
    const statusCls = p.status || 'active';
    html += `<button class="plans-tab${active}" onclick="switchPlan('${p.id}')">${p.name || 'Untitled'}<span class="plan-status-dot ${statusCls}"></span></button>`;
  });
  html += `</div>
    <button class="plans-new-btn" onclick="showNewPlanModal()">+ New Plan</button>
  </div>`;

  if (!plan) {
    html += `<div class="plans-empty"><div class="empty-icon">📋</div><div class="empty-title">No plans yet</div><div class="empty-desc">Create your first plan to get started</div></div>`;
    v.innerHTML = html;
    lucide.createIcons();
    return;
  }

  // Status badge
  const statusLabel = plan.status || 'active';
  html += `<div class="plan-info-bar"><span class="plan-status-badge ${statusLabel}">${statusLabel.charAt(0).toUpperCase()+statusLabel.slice(1)}</span>`;
  if (plan.description) html += `<span class="plan-desc">${plan.description}</span>`;
  html += `</div>`;

  // Kanban columns
  const columns = plan.columns || DEFAULT_COLUMNS;
  const tasks = plan.tasks || [];

  html += `<div class="kanban-container">`;
  columns.forEach((col, ci) => {
    const colTasks = tasks.filter(t => t.column === col || t.status === col);
    const colColors = ['#89b4fa','#fab387','#cba6f7','#a6e3a1'];
    const colColor = colColors[ci % colColors.length];

    html += `<div class="kanban-column" data-col="${col}">
      <div class="kanban-col-header" style="border-top:3px solid ${colColor}">
        <span class="kanban-col-title">${col}</span>
        <span class="kanban-col-count">${colTasks.length}</span>
      </div>
      <div class="kanban-col-body">`;

    colTasks.forEach(task => {
      const agent = ga(task.agent);
      const agentColor = agent ? agent.color : '#6c7086';
      const agentEmoji = agent ? agent.emoji : '🤖';
      const agentName = agent ? agent.name : (task.agent || 'Unassigned');
      const prio = task.priority || 'P3';
      const prioColor = PLAN_PRIORITY_COLORS[prio] || '#6c7086';
      const labels = task.labels || [];

      html += `<div class="kanban-card" style="border-left:3px solid ${agentColor}" onclick="openTaskDetail('${plan.id}','${task.id}')">
        <div class="kanban-card-top">
          <span class="kanban-card-agent">${agentEmoji} ${agentName}</span>
          <span class="kanban-card-prio" style="background:${prioColor}">${prio}</span>
        </div>
        <div class="kanban-card-title">${task.title || 'Untitled'}</div>`;
      if (labels.length) {
        html += `<div class="kanban-card-labels">${labels.map(l => `<span class="kanban-label">${l}</span>`).join('')}</div>`;
      }
      html += `<div class="kanban-card-time">${timeAgo(task.updated_at || task.created_at)}</div>
      </div>`;
    });

    html += `</div>
      <button class="kanban-add-btn" onclick="showQuickCreate('${plan.id}','${col}',this)">+ Add task</button>
    </div>`;
  });
  html += `</div>`;

  v.innerHTML = html;
  lucide.createIcons();
}

function switchPlan(id) {
  currentPlanId = id;
  renderPlansUI();
}

// ── Quick Create (inline) ──────────────────────────────────

function showQuickCreate(planId, col, btn) {
  // Remove any existing quick-create
  document.querySelectorAll('.kanban-quick-create').forEach(e => e.remove());

  const form = document.createElement('div');
  form.className = 'kanban-quick-create';
  form.innerHTML = `
    <input type="text" class="qc-title" placeholder="Task title..." autofocus />
    <select class="qc-priority">
      <option value="P1">P1</option><option value="P2">P2</option>
      <option value="P3" selected>P3</option><option value="P4">P4</option>
    </select>
    <div class="qc-actions">
      <button class="qc-create-btn" onclick="submitQuickCreate('${planId}','${col}',this)">Create</button>
      <button class="qc-cancel-btn" onclick="this.closest('.kanban-quick-create').remove()">✕</button>
    </div>`;
  btn.parentElement.insertBefore(form, btn);
  form.querySelector('.qc-title').focus();
  form.querySelector('.qc-title').addEventListener('keydown', e => {
    if (e.key === 'Enter') submitQuickCreate(planId, col, form.querySelector('.qc-create-btn'));
    if (e.key === 'Escape') form.remove();
  });
}

async function submitQuickCreate(planId, col, btn) {
  const form = btn.closest('.kanban-quick-create');
  const title = form.querySelector('.qc-title').value.trim();
  const priority = form.querySelector('.qc-priority').value;
  if (!title) return;

  btn.disabled = true;
  btn.textContent = '...';
  try {
    await Bridge.createTask(planId, { title, priority, column: col });
    form.remove();
    toast('Task created', 'success');
    // Reload plan
    const updated = await Bridge.getPlan(planId);
    const idx = plansData.findIndex(p => p.id === planId);
    if (idx >= 0) plansData[idx] = updated;
    renderPlansUI();
  } catch (e) {
    toast('Failed: ' + e.message, 'error');
    btn.disabled = false;
    btn.textContent = 'Create';
  }
}

// ── Task Detail Modal ──────────────────────────────────────

function openTaskDetail(planId, taskId) {
  const plan = plansData.find(p => p.id === planId);
  if (!plan) return;
  const task = (plan.tasks || []).find(t => t.id === taskId);
  if (!task) return;

  const agent = ga(task.agent);
  const columns = plan.columns || DEFAULT_COLUMNS;
  const prio = task.priority || 'P3';
  const labels = task.labels || [];
  const comments = task.comments || [];

  const overlay = document.createElement('div');
  overlay.className = 'task-modal-overlay';
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML = `<div class="task-modal">
    <div class="task-modal-header">
      <input class="task-modal-title" value="${(task.title||'').replace(/"/g,'&quot;')}" 
        onchange="updateTaskField('${planId}','${taskId}','title',this.value)" />
      <button class="task-modal-close" onclick="this.closest('.task-modal-overlay').remove()">✕</button>
    </div>
    <div class="task-modal-body">
      <div class="task-modal-main">
        <div class="task-field-group">
          <label>Description</label>
          <textarea class="task-modal-desc" rows="4" placeholder="Add a description..."
            onchange="updateTaskField('${planId}','${taskId}','description',this.value)">${task.description || ''}</textarea>
        </div>
        <div class="task-field-group">
          <label>Labels</label>
          <div class="task-labels-row">
            ${labels.map(l => `<span class="kanban-label removable" onclick="removeLabel('${planId}','${taskId}','${l}',this)">${l} ✕</span>`).join('')}
            <input class="task-label-input" placeholder="+ Add label" onkeydown="addLabelKey(event,'${planId}','${taskId}')" />
          </div>
        </div>
        <div class="task-field-group">
          <label>Comments</label>
          <div class="task-comments-list">
            ${comments.map(c => `<div class="task-comment"><span class="task-comment-author">${c.author || 'Unknown'}</span><span class="task-comment-time">${timeAgo(c.created_at)}</span><p>${c.text || ''}</p></div>`).join('')}
            ${comments.length === 0 ? '<div class="task-no-comments">No comments yet</div>' : ''}
          </div>
          <div class="task-comment-input-row">
            <input class="task-comment-input" placeholder="Add a comment..." id="task-comment-input-${taskId}" onkeydown="if(event.key==='Enter')submitComment('${planId}','${taskId}')" />
            <button class="task-comment-send" onclick="submitComment('${planId}','${taskId}')">Send</button>
          </div>
        </div>
      </div>
      <div class="task-modal-sidebar">
        <div class="task-field-group">
          <label>Agent</label>
          <select class="task-select" onchange="updateTaskField('${planId}','${taskId}','agent',this.value)">
            <option value="">Unassigned</option>
            ${AGENTS.map(a => `<option value="${a.id}" ${a.id===task.agent?'selected':''}>${a.emoji} ${a.name}</option>`).join('')}
          </select>
        </div>
        <div class="task-field-group">
          <label>Column</label>
          <select class="task-select" onchange="updateTaskField('${planId}','${taskId}','column',this.value)">
            ${columns.map(c => `<option value="${c}" ${c===task.column||c===task.status?'selected':''}>${c}</option>`).join('')}
          </select>
        </div>
        <div class="task-field-group">
          <label>Priority</label>
          <select class="task-select" onchange="updateTaskField('${planId}','${taskId}','priority',this.value)">
            ${['P1','P2','P3','P4'].map(p => `<option value="${p}" ${p===prio?'selected':''}>${p}</option>`).join('')}
          </select>
        </div>
        <div class="task-field-group task-danger-zone">
          <button class="task-delete-btn" onclick="confirmDeleteTask('${planId}','${taskId}')">🗑️ Delete Task</button>
        </div>
      </div>
    </div>
  </div>`;

  document.body.appendChild(overlay);
}

async function updateTaskField(planId, taskId, field, value) {
  try {
    await Bridge.updateTask(planId, taskId, { [field]: value });
    // Update local data
    const plan = plansData.find(p => p.id === planId);
    if (plan) {
      const task = (plan.tasks || []).find(t => t.id === taskId);
      if (task) task[field] = value;
    }
    if (field === 'column' || field === 'agent' || field === 'priority') {
      document.querySelector('.task-modal-overlay')?.remove();
      renderPlansUI();
    }
  } catch (e) {
    toast('Update failed: ' + e.message, 'error');
  }
}

async function addLabelKey(event, planId, taskId) {
  if (event.key !== 'Enter') return;
  const input = event.target;
  const label = input.value.trim();
  if (!label) return;

  const plan = plansData.find(p => p.id === planId);
  if (!plan) return;
  const task = (plan.tasks || []).find(t => t.id === taskId);
  if (!task) return;

  const labels = task.labels || [];
  if (labels.includes(label)) { input.value = ''; return; }
  labels.push(label);
  task.labels = labels;
  input.value = '';

  try {
    await Bridge.updateTask(planId, taskId, { labels });
    // Re-render the labels row
    const row = input.closest('.task-labels-row');
    const pill = document.createElement('span');
    pill.className = 'kanban-label removable';
    pill.textContent = label + ' ✕';
    pill.onclick = () => removeLabel(planId, taskId, label, pill);
    row.insertBefore(pill, input);
  } catch (e) {
    toast('Failed: ' + e.message, 'error');
  }
}

async function removeLabel(planId, taskId, label, el) {
  const plan = plansData.find(p => p.id === planId);
  if (!plan) return;
  const task = (plan.tasks || []).find(t => t.id === taskId);
  if (!task) return;

  task.labels = (task.labels || []).filter(l => l !== label);
  el.remove();
  try {
    await Bridge.updateTask(planId, taskId, { labels: task.labels });
  } catch (e) {
    toast('Failed: ' + e.message, 'error');
  }
}

async function submitComment(planId, taskId) {
  const input = document.getElementById(`task-comment-input-${taskId}`);
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';

  try {
    await Bridge.updateTask(planId, taskId, { comment: text });
    // Reload and reopen
    const updated = await Bridge.getPlan(planId);
    const idx = plansData.findIndex(p => p.id === planId);
    if (idx >= 0) plansData[idx] = updated;
    document.querySelector('.task-modal-overlay')?.remove();
    openTaskDetail(planId, taskId);
  } catch (e) {
    toast('Comment failed: ' + e.message, 'error');
  }
}

function confirmDeleteTask(planId, taskId) {
  if (!confirm('Delete this task? This cannot be undone.')) return;
  deleteTask(planId, taskId);
}

async function deleteTask(planId, taskId) {
  try {
    await Bridge.deleteTask(planId, taskId);
    toast('Task deleted', 'success');
    document.querySelector('.task-modal-overlay')?.remove();
    const updated = await Bridge.getPlan(planId);
    const idx = plansData.findIndex(p => p.id === planId);
    if (idx >= 0) plansData[idx] = updated;
    renderPlansUI();
  } catch (e) {
    toast('Delete failed: ' + e.message, 'error');
  }
}

// ── New Plan Modal ─────────────────────────────────────────

function showNewPlanModal() {
  const overlay = document.createElement('div');
  overlay.className = 'task-modal-overlay';
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML = `<div class="task-modal" style="max-width:480px">
    <div class="task-modal-header">
      <h3 style="margin:0;font-size:16px;color:var(--text)">New Plan</h3>
      <button class="task-modal-close" onclick="this.closest('.task-modal-overlay').remove()">✕</button>
    </div>
    <div class="task-modal-body" style="flex-direction:column;gap:12px;">
      <div class="task-field-group">
        <label>Name</label>
        <input class="task-modal-title" id="new-plan-name" placeholder="Plan name..." />
      </div>
      <div class="task-field-group">
        <label>Description</label>
        <textarea class="task-modal-desc" id="new-plan-desc" rows="3" placeholder="What is this plan for?"></textarea>
      </div>
      <div class="task-field-group">
        <label>Columns</label>
        <div style="color:var(--text-muted);font-size:12px;margin-bottom:4px">Default: Backlog, In Progress, Review, Done</div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px">
        <button class="qc-cancel-btn" onclick="this.closest('.task-modal-overlay').remove()" style="padding:8px 16px;border-radius:8px;border:1px solid var(--border);background:none;color:var(--text);cursor:pointer">Cancel</button>
        <button class="qc-create-btn" onclick="submitNewPlan()" style="padding:8px 16px">Create Plan</button>
      </div>
      <div id="new-plan-status" style="font-size:12px;color:var(--text-muted)"></div>
    </div>
  </div>`;

  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById('new-plan-name')?.focus(), 100);
}

async function submitNewPlan() {
  const name = document.getElementById('new-plan-name')?.value.trim();
  const description = document.getElementById('new-plan-desc')?.value.trim();
  const status = document.getElementById('new-plan-status');

  if (!name) { if (status) status.textContent = '❌ Name is required'; return; }
  if (status) status.textContent = '⏳ Creating...';

  try {
    const plan = await Bridge.createPlan({ name, description, columns: DEFAULT_COLUMNS });
    plansData.push(plan);
    currentPlanId = plan.id;
    document.querySelector('.task-modal-overlay')?.remove();
    toast('Plan created!', 'success');
    renderPlansUI();
  } catch (e) {
    if (status) status.textContent = '❌ ' + e.message;
  }
}
