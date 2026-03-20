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
  Research:'#89b4fa', Architecture:'#f9e2af', Vision:'#cba6f7',
  Operations:'#fab387', Report:'#f38ba8', Code:'#a6e3a1'
};

// initMind is now in mind.js — this is the legacy version kept for reference
function initMindLegacy() {
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
let _graphResizeHandler = null;
let graphLocked = false;
let graphAlpha = 1.0; // simulation "temperature" — decays over time

function initGraph() {
  graphCanvas = $('graph-canvas');
  if (!graphCanvas) return;
  graphCtx = graphCanvas.getContext('2d');

  // Remove old resize listener before adding new one
  if (_graphResizeHandler) window.removeEventListener('resize', _graphResizeHandler);
  _graphResizeHandler = () => {
    if (mindMode !== 'graph' || !graphCanvas) return;
    const p = graphCanvas.parentElement;
    graphCanvas.width = p.clientWidth || 800;
    graphCanvas.height = p.clientHeight || 500;
    if (graphSettled) drawGraph();
  };
  window.addEventListener('resize', _graphResizeHandler);

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

  // Touch support for mobile
  graphCanvas.addEventListener('touchstart', e => {
    if (graphLocked) return;
    const touch = e.touches[0];
    const rect = graphCanvas.getBoundingClientRect();
    const n = hitTestNode(touch.clientX - rect.left, touch.clientY - rect.top);
    if (n) { draggingNode = n; e.preventDefault(); }
  }, { passive: false });
  graphCanvas.addEventListener('touchmove', e => {
    if (!draggingNode || graphLocked) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = graphCanvas.getBoundingClientRect();
    draggingNode.x = touch.clientX - rect.left;
    draggingNode.y = touch.clientY - rect.top;
    draggingNode.vx = 0; draggingNode.vy = 0;
    if (graphSettled) drawGraph();
  }, { passive: false });
  graphCanvas.addEventListener('touchend', e => {
    if (draggingNode && graphSettled && !graphLocked) {
      graphSettled = false; graphSimTick = 0; graphAlpha = 0.5; runGraphSim();
    }
    // Tap to select
    if (draggingNode) {
      selectedNode = draggingNode;
      showGraphDetail(draggingNode);
    }
    draggingNode = null;
  });

  // Init lock button state
  const lockBtn = $('graph-lock-btn');
  if (lockBtn) {
    lockBtn.textContent = graphLocked ? '🔓 Unlock' : '🔒 Lock';
    lockBtn.classList.toggle('active', graphLocked);
  }

  if (graphAnimId) cancelAnimationFrame(graphAnimId);
  graphSimTick = 0;
  graphSettled = false;
  graphAlpha = 1.0;
  runGraphSim();
}

function toggleGraphLock() {
  graphLocked = !graphLocked;
  const btn = $('graph-lock-btn');
  if (btn) {
    btn.textContent = graphLocked ? '🔓 Unlock' : '🔒 Lock';
    btn.classList.toggle('active', graphLocked);
  }
  if (graphLocked) {
    // Freeze: zero all velocities, stop sim
    graphNodes.forEach(n => { n.vx = 0; n.vy = 0; });
    graphSettled = true;
    if (graphAnimId) { cancelAnimationFrame(graphAnimId); graphAnimId = null; }
    drawGraph();
  }
}

let graphSimTick = 0;
let graphSettled = false;

function runGraphSim() {
  if (mindMode !== 'graph' || !graphCtx || graphLocked) return;

  const W = graphCanvas.width;
  const H = graphCanvas.height;
  const k = Math.sqrt((W * H) / Math.max(graphNodes.length, 1));

  // Alpha decay — simulation loses energy each frame (5% decay)
  graphAlpha *= 0.95;

  // Reset forces
  graphNodes.forEach(n => { n.fx = 0; n.fy = 0; });

  // Repulsion between all nodes (includes collision prevention)
  for (let i = 0; i < graphNodes.length; i++) {
    for (let j = i + 1; j < graphNodes.length; j++) {
      const a = graphNodes[i], b = graphNodes[j];
      let dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const minDist = (a.r + b.r) + 20; // collision buffer

      // Standard repulsion scaled by alpha
      let force = (k * k) / d * 0.3 * graphAlpha;

      // Extra collision repulsion when nodes overlap
      if (d < minDist) {
        force += (minDist - d) * 2.0;
      }

      const fx = (dx / d) * force;
      const fy = (dy / d) * force;
      a.fx -= fx; a.fy -= fy;
      b.fx += fx; b.fy += fy;
    }
  }

  // Attraction along edges (scaled by alpha)
  graphEdges.forEach(({ source, target }) => {
    const a = graphNodes[source], b = graphNodes[target];
    if (!a || !b) return;
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const force = (d * d) / k * 0.08 * graphAlpha;
    const fx = (dx / d) * force;
    const fy = (dy / d) * force;
    a.fx += fx; a.fy += fy;
    b.fx -= fx; b.fy -= fy;
  });

  // Center gravity (scaled by alpha)
  graphNodes.forEach(n => {
    n.fx += (W / 2 - n.x) * 0.08 * graphAlpha;
    n.fy += (H / 2 - n.y) * 0.08 * graphAlpha;
  });

  // Integrate with velocity decay (friction = 0.85) + measure kinetic energy
  const velocityDecay = 0.85;
  let totalEnergy = 0;
  graphNodes.forEach(n => {
    if (n === draggingNode) return;
    n.vx = (n.vx + n.fx) * velocityDecay;
    n.vy = (n.vy + n.fy) * velocityDecay;

    // Clamp velocity to prevent explosions
    const maxV = 8;
    const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
    if (speed > maxV) { n.vx = (n.vx / speed) * maxV; n.vy = (n.vy / speed) * maxV; }

    n.x += n.vx;
    n.y += n.vy;
    const pad = 60;
    n.x = Math.max(pad, Math.min(W - pad, n.x));
    n.y = Math.max(pad, Math.min(H - pad, n.y));
    totalEnergy += n.vx * n.vx + n.vy * n.vy;
  });

  graphSimTick++;
  drawGraph();

  // Stop when all velocities are tiny (energy < 0.1) or alpha exhausted or max ticks
  if ((totalEnergy < 0.1 && graphSimTick > 30) || graphAlpha < 0.01 || graphSimTick > 200) {
    graphSettled = true;
    // Zero out residual velocities for clean stop
    graphNodes.forEach(n => { n.vx = 0; n.vy = 0; });
    drawGraph(); // final frame
    graphAnimId = null;
    return; // stop the loop
  }

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
  const isMobileGraph = window.innerWidth <= 768;
  graphNodes.forEach(n => {
    const isH = n === hoveredNode;
    const isS = n === selectedNode;
    const baseR = isMobileGraph ? Math.max(n.r, 14) : n.r;
    const r = baseR + (isH ? 4 : 0);

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
  const hitPad = window.innerWidth <= 768 ? 22 : 6;
  for (let i = graphNodes.length - 1; i >= 0; i--) {
    const n = graphNodes[i];
    const dx = mx - n.x, dy = my - n.y;
    if (dx * dx + dy * dy < (n.r + hitPad) * (n.r + hitPad)) return n;
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
  if (graphLocked) return;
  const rect = graphCanvas.getBoundingClientRect();
  const n = hitTestNode(e.clientX - rect.left, e.clientY - rect.top);
  if (n) { draggingNode = n; graphCanvas.style.cursor = 'grabbing'; }
}

function graphMouseUp() {
  if (draggingNode && graphSettled && !graphLocked) {
    // Restart sim briefly to re-settle after drag (low alpha = quick settle)
    graphSettled = false;
    graphSimTick = 0;
    graphAlpha = 0.3; // brief re-settle, not full sim
    runGraphSim();
  }
  draggingNode = null;
  graphCanvas.style.cursor = graphLocked ? 'default' : 'grab';
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

function renderVerticalTimeline(track, sorted) {
  track.style.width = '100%';
  track.style.height = 'auto';
  track.innerHTML = '';

  let lastDate = '';
  sorted.forEach(note => {
    const agent = ga(note.agent) || { emoji: '🤖', color: '#cba6f7' };
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

// ═══════════════════════════════════════════════════════════
// PLANS PAGE — Kanban with Agent Action Buttons
// ═══════════════════════════════════════════════════════════

let plansData = [];
let currentPlanId = null;
let currentPlanData = null;
let planChatContext = null; // { plan, task? }

async function renderPlansPage() {
  const selector = $('plans-selector');
  const container = $('plans-kanban-container');
  if (!selector || !container) return;

  // Load plans from bridge
  try {
    if (typeof Bridge !== 'undefined' && Bridge.liveMode) {
      plansData = await Bridge.getPlans();
    }
  } catch (e) {
    console.warn('[Plans] Bridge load failed:', e.message);
  }

  // Fallback seed data if no plans loaded
  if (!plansData || plansData.length === 0) {
    plansData = [
      { id: 'plan-agent-os-frontend', name: 'Agent OS Frontend', description: 'Native frontend with agent interaction', status: 'active', task_count: 6 },
      { id: 'plan-system-improvements', name: 'System Improvements', description: 'Infrastructure and reliability', status: 'active', task_count: 4 },
    ];
  }

  // Render plan selector tabs
  selector.innerHTML = plansData.map(p =>
    `<button class="chip${currentPlanId === p.id ? ' active' : ''}" onclick="selectPlan('${p.id}')">${p.name}</button>`
  ).join('');

  // Auto-select first plan if none selected
  if (!currentPlanId && plansData.length > 0) {
    selectPlan(plansData[0].id);
  } else if (currentPlanId) {
    await renderPlanKanban(currentPlanId);
  }
}

async function selectPlan(planId) {
  currentPlanId = planId;
  // Update selector active state
  const selector = $('plans-selector');
  if (selector) {
    selector.querySelectorAll('.chip').forEach(c => {
      c.classList.toggle('active', c.textContent === plansData.find(p => p.id === planId)?.name);
    });
  }
  await renderPlanKanban(planId);
}

async function renderPlanKanban(planId) {
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

  // Fallback seed data
  if (!plan) {
    plan = getSeedPlan(planId);
  }

  currentPlanData = plan;
  if (!plan) {
    container.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted)">Plan not found</div>';
    return;
  }

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

function makePlanTaskCard(task, col, plan) {
  const agentObj = task.agent ? (ga(task.agent) || { emoji: '🤖' }) : { emoji: '⬜' };
  const pCls = (task.priority || 'P3').toLowerCase();
  const isDone = col.id === 'done' || col.id === 'shipped';

  // Determine which agent buttons to show
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
