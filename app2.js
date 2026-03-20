/* Agent OS v5 — app2.js — Mind + Pulse + Board + Stream */
'use strict';

// ═══════════════════════════════════════════════════════════
// MIND PAGE — Vault Integration
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

// Live vault data caches
let _vaultSearchResults = [];
let _vaultRecentNotes = [];
let _vaultStats = null;
let _vaultGraphData = null;
let _vaultSearchDebounce = null;

const MIND_TYPES = ['all','Research','Architecture','Vision','Operations','Report','Code',
  'Projects','Security','Tools','System','Agents','Skills','Decisions','Reference','Templates'];
const TYPE_COLORS = {
  Research:'#5B8AF0', Architecture:'#D4A574', Vision:'#D4A574',
  Operations:'#F39C12', Report:'#E74C3C', Code:'#4CAF50',
  Projects:'#9B59B6', Security:'#E74C3C', Tools:'#1ABC9C',
  System:'#95A5A6', Agents:'#E8A838', Skills:'#2ECC71',
  Decisions:'#F1C40F', Reference:'#3498DB', Templates:'#BDC3C7',
  'Agent Knowledge':'#E8A838', 'Claude-Code-Memory':'#D4A574',
  'Claude-Code-Bot':'#D4A574', 'Daily Notes':'#95A5A6', Inbox:'#F39C12',
  Reports:'#E74C3C', Trajan:'#9B59B6'
};

function initMind() {
  // Default to cards on mobile, graph on desktop
  if (window.innerWidth <= 768 && mindMode === 'graph') {
    mindMode = 'cards';
  }
  renderMindFilterPills();
  setMindMode(mindMode);
  // Load live vault data if bridge is connected
  if (typeof Bridge !== 'undefined' && Bridge.liveMode) {
    loadVaultRecent();
    loadVaultStats();
  }
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
async function initGraph() {
  graphCanvas = $('graph-canvas');
  if (!graphCanvas) return;
  graphCtx = graphCanvas.getContext('2d');

  const parent = graphCanvas.parentElement;
  graphCanvas.width = parent.clientWidth || 800;
  graphCanvas.height = parent.clientHeight || 500;

  const W = graphCanvas.width;
  const H = graphCanvas.height;

  // Try to load live graph data from vault
  if (typeof Bridge !== 'undefined' && Bridge.liveMode && !_vaultGraphData) {
    try {
      _vaultGraphData = await Bridge.vaultGraph(100);
    } catch (err) {
      console.error('[mind] graph load error:', err);
    }
  }

  if (_vaultGraphData && _vaultGraphData.nodes.length > 0) {
    // Use live vault data
    const nodeIndex = new Map();
    _vaultGraphData.nodes.forEach((n, i) => nodeIndex.set(n.id, i));
    graphNodes = _vaultGraphData.nodes.map((n, i) => ({
      id: i,
      label: n.title || n.id.split('/').pop().replace('.md', ''),
      type: n.category || 'root',
      hex: TYPE_COLORS[n.category] || '#D4A574',
      vaultPath: n.id,
      x: W / 2 + (Math.random() - 0.5) * 200,
      y: H / 2 + (Math.random() - 0.5) * 150,
      vx: 0, vy: 0,
      r: 10,
    }));
    graphEdges = _vaultGraphData.edges
      .map(e => ({ source: nodeIndex.get(e.source), target: nodeIndex.get(e.target) }))
      .filter(e => e.source !== undefined && e.target !== undefined);

    // Size nodes by connection count
    const connCount = new Map();
    graphEdges.forEach(e => {
      connCount.set(e.source, (connCount.get(e.source) || 0) + 1);
      connCount.set(e.target, (connCount.get(e.target) || 0) + 1);
    });
    graphNodes.forEach((n, i) => {
      n.r = Math.max(6, Math.min(20, 8 + (connCount.get(i) || 0) * 2));
    });
  } else {
    // Fall back to demo data
    graphNodes = GNODES.map(n => ({
      ...n,
      x: W / 2 + (Math.random() - 0.5) * 200,
      y: H / 2 + (Math.random() - 0.5) * 150,
      vx: 0, vy: 0,
      r: n.size || 12,
    }));
    graphEdges = GEDGES.map(([a, b]) => ({ source: a, target: b }));
  }

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
  const nodeIdx = graphNodes.indexOf(node);
  const conns = graphEdges.filter(e => e.source === nodeIdx || e.target === nodeIdx)
    .map(e => graphNodes[e.source === nodeIdx ? e.target : e.source]?.label)
    .filter(Boolean);

  // If this is a live vault node, offer to open it
  const openBtn = node.vaultPath ?
    `<button onclick="openLiveVaultNote('${node.vaultPath.replace(/'/g, "\\'")}')" style="margin-top:8px;padding:4px 12px;background:var(--accent);border:none;border-radius:6px;color:var(--bg-base);cursor:pointer;font-size:11px;font-weight:600">Open Note</button>` : '';

  const note = typeof GNOTES_MAP !== 'undefined' ? GNOTES_MAP[node.id] : null;

  panel.innerHTML = `
    <button class="graph-detail-close" onclick="$('graph-detail').classList.add('hidden');selectedNode=null">✕</button>
    <div class="graph-detail-title" style="color:${node.hex}">${escHtml(node.label)}</div>
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">${node.type} · ${conns.length} connections</div>
    <div class="graph-detail-body">${note || (node.vaultPath ? node.vaultPath : 'Click a node to see details.')}</div>
    ${conns.length ? `
      <div style="margin-top:10px">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px">Connected to</div>
        <div style="display:flex;flex-wrap:wrap;gap:4px">${conns.slice(0, 8).map(c => `<span style="background:var(--bg-raised);padding:2px 8px;border-radius:10px;font-size:11px">${escHtml(c)}</span>`).join('')}</div>
      </div>` : ''}
    ${openBtn}
  `;
  panel.classList.remove('hidden');
}

// ── Vault Cards ───────────────────────────────────────────
function renderVaultCards() {
  const grid = $('vault-cards-grid');
  if (!grid) return;

  // If we have live search results, show those
  if (_vaultSearchResults.length > 0) {
    renderLiveSearchResults(_vaultSearchResults);
    return;
  }

  // If bridge is live and we have recent notes but no search, show recent
  if (typeof Bridge !== 'undefined' && Bridge.liveMode && _vaultRecentNotes.length > 0) {
    grid.innerHTML = '';
    updateNoteCount(_vaultRecentNotes.length);
    _vaultRecentNotes.forEach(n => {
      const name = n.path.split('/').pop().replace('.md', '');
      const cat = n.path.split('/')[0] || 'root';
      const typeColor = TYPE_COLORS[cat] || 'var(--text-dim)';
      const ago = relativeTime(n.modified);
      const card = document.createElement('div');
      card.className = 'vault-card';
      card.onclick = () => openLiveVaultNote(n.path);
      card.innerHTML = `
        <div class="vault-card-header">
          <div class="vault-card-title">${escHtml(name)}</div>
          <span class="vault-card-type" style="color:${typeColor};border-color:${typeColor}40">${cat}</span>
        </div>
        <div class="vault-card-summary" style="color:var(--text-muted);font-size:12px">${escHtml(n.path)}</div>
        <div class="vault-card-meta">
          <span class="vault-date">${ago}</span>
        </div>
      `;
      grid.appendChild(card);
    });
    return;
  }

  // Fall back to demo data
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
  if (typeof Bridge !== 'undefined' && Bridge.liveMode && query.trim().length >= 2) {
    // Live search with debounce
    clearTimeout(_vaultSearchDebounce);
    _vaultSearchDebounce = setTimeout(() => liveVaultSearch(query.trim()), 300);
    return;
  }
  // Fall back to demo data filter
  if (mindMode === 'cards') renderVaultCards();
  else if (mindMode === 'timeline') renderTimeline();
}

// ── Live Vault API Functions ──────────────────────────────

async function liveVaultSearch(query) {
  try {
    const results = await Bridge.vaultSearch(query, 20);
    _vaultSearchResults = results;
    renderLiveSearchResults(results);
  } catch (err) {
    console.error('[mind] vault search error:', err);
  }
}

function renderLiveSearchResults(results) {
  const grid = $('vault-cards-grid');
  if (!grid) return;

  // Switch to cards mode to show results
  if (mindMode !== 'cards') setMindMode('cards');

  grid.innerHTML = '';
  updateNoteCount(results.length);

  if (results.length === 0) {
    grid.innerHTML = '<div style="text-align:center;color:var(--text-muted);padding:40px;">No vault notes found</div>';
    return;
  }

  results.forEach(r => {
    const category = r.path.split('/')[0] || 'root';
    const typeColor = TYPE_COLORS[category] || 'var(--text-dim)';
    const title = r.title || r.path.split('/').pop().replace('.md', '');
    const snippet = (r.snippet || '').replace(/@@ .* @@\n?/, '').substring(0, 120);

    const card = document.createElement('div');
    card.className = 'vault-card';
    card.onclick = () => openLiveVaultNote(r.path);
    card.innerHTML = `
      <div class="vault-card-header">
        <div class="vault-card-title">${escHtml(title)}</div>
        <span class="vault-card-type" style="color:${typeColor};border-color:${typeColor}40">${category}</span>
      </div>
      <div class="vault-card-summary">${escHtml(snippet)}</div>
      <div class="vault-card-meta">
        <span class="vault-card-path" style="font-size:10px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:200px">${escHtml(r.path)}</span>
      </div>
    `;
    grid.appendChild(card);
  });
}

function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

async function openLiveVaultNote(path) {
  try {
    const note = await Bridge.vaultNote(path);
    const category = path.split('/')[0] || 'root';
    const typeColor = TYPE_COLORS[category] || 'var(--text-dim)';
    const title = note.frontmatter?.title || path.split('/').pop().replace('.md', '');

    // Render markdown-ish content (basic)
    const rendered = renderMarkdown(note.content);

    if (window.innerWidth <= 768) {
      const detail = $('mind-note-detail');
      detail.innerHTML = renderLiveNoteDetail(title, category, typeColor, path, note, rendered, true);
      detail.classList.remove('hidden');
    } else {
      const modal = $('card-modal-content');
      modal.innerHTML = renderLiveNoteDetail(title, category, typeColor, path, note, rendered, false);
      $('card-modal').classList.remove('hidden');
    }
  } catch (err) {
    console.error('[mind] load note error:', err);
  }
}

function renderLiveNoteDetail(title, category, typeColor, path, note, rendered, isMobile) {
  const closeAction = isMobile ? 'closeMobileNoteDetail()' : 'closeModal()';
  const fm = note.frontmatter || {};
  const metaParts = [];
  if (fm.created) metaParts.push(fm.created);
  if (fm.updated) metaParts.push('updated ' + fm.updated);
  if (fm.confidence) metaParts.push('confidence: ' + fm.confidence);

  return `
    <div class="note-detail-header">
      <button class="note-detail-back" onclick="${closeAction}">${isMobile ? '← Back' : '✕'}</button>
    </div>
    <div class="note-detail-body">
      <div class="note-detail-type-badge" style="color:${typeColor};border-color:${typeColor}">${category}</div>
      <h2 class="note-detail-title">${escHtml(title)}</h2>
      <div class="note-detail-meta-row">
        <span style="color:var(--text-muted);font-size:11px">${escHtml(path)}</span>
        ${metaParts.length ? '<span>·</span><span>' + metaParts.join(' · ') + '</span>' : ''}
      </div>
      ${fm.tags ? `<div class="note-detail-tags">${String(fm.tags).split(',').map(t => `<span class="note-tag">#${t.trim()}</span>`).join('')}</div>` : ''}
      <div class="note-detail-content" style="white-space:pre-wrap;font-family:var(--font-mono,monospace);font-size:13px;line-height:1.6;max-height:60vh;overflow-y:auto">${rendered}</div>
    </div>
  `;
}

function renderMarkdown(text) {
  if (!text) return '';
  // Basic markdown rendering — headers, bold, italic, code, links, lists
  return escHtml(text)
    .replace(/^### (.+)$/gm, '<h3 style="color:var(--accent);margin:12px 0 4px">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 style="color:var(--accent);margin:16px 0 6px">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 style="color:var(--accent);margin:20px 0 8px">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code style="background:var(--bg-raised);padding:1px 4px;border-radius:3px">$1</code>')
    .replace(/\[\[([^\]]+)\]\]/g, '<a style="color:var(--accent);cursor:pointer" onclick="searchAndOpen(\'$1\')">$1</a>')
    .replace(/^- (.+)$/gm, '<div style="padding-left:16px">• $1</div>')
    .replace(/\n/g, '<br>');
}

function searchAndOpen(term) {
  const input = $('mind-search');
  if (input) input.value = term;
  liveVaultSearch(term);
}

async function loadVaultRecent() {
  try {
    _vaultRecentNotes = await Bridge.vaultRecent(20);
    renderRecentSidebar();
  } catch (err) {
    console.error('[mind] recent notes error:', err);
  }
}

function renderRecentSidebar() {
  let sidebar = $('vault-recent-sidebar');
  if (!sidebar) {
    // Create sidebar element after mind-toolbar
    const toolbar = document.querySelector('.mind-toolbar');
    if (!toolbar) return;
    sidebar = document.createElement('div');
    sidebar.id = 'vault-recent-sidebar';
    sidebar.className = 'vault-recent-sidebar';
    toolbar.parentElement.insertBefore(sidebar, toolbar.nextSibling);
  }

  if (!_vaultRecentNotes.length) {
    sidebar.innerHTML = '<div style="color:var(--text-muted);padding:8px;font-size:12px">No recent notes</div>';
    return;
  }

  sidebar.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
      <span style="font-size:12px;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:0.5px">Recent Notes</span>
      ${_vaultStats ? `<span style="font-size:11px;color:var(--text-muted)">${_vaultStats.totalNotes} total</span>` : ''}
    </div>
    <div class="vault-recent-list" style="display:flex;gap:6px;overflow-x:auto;padding-bottom:6px;scrollbar-width:thin">
      ${_vaultRecentNotes.slice(0, 12).map(n => {
        const name = n.path.split('/').pop().replace('.md', '');
        const cat = n.path.split('/')[0] || 'root';
        const color = TYPE_COLORS[cat] || 'var(--text-dim)';
        const ago = relativeTime(n.modified);
        return `<div class="vault-recent-chip" onclick="openLiveVaultNote('${n.path.replace(/'/g, "\\'")}')"
          style="flex-shrink:0;background:var(--bg-raised);padding:6px 10px;border-radius:8px;cursor:pointer;border-left:3px solid ${color};min-width:120px;max-width:200px">
          <div style="font-size:11px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escHtml(name)}</div>
          <div style="font-size:10px;color:var(--text-muted)">${cat} · ${ago}</div>
        </div>`;
      }).join('')}
    </div>
  `;
}

function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + 'm ago';
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return hrs + 'h ago';
  const days = Math.floor(hrs / 24);
  return days + 'd ago';
}

async function loadVaultStats() {
  try {
    _vaultStats = await Bridge.vaultStats();
    renderVaultStatsPanel();
    // Update mind-badge with total count
    const badge = $('mind-badge');
    if (badge) badge.textContent = _vaultStats.totalNotes;
  } catch (err) {
    console.error('[mind] stats error:', err);
  }
}

function renderVaultStatsPanel() {
  let panel = $('vault-stats-panel');
  if (!panel) {
    const filters = $('mind-filters');
    if (!filters) return;
    panel = document.createElement('div');
    panel.id = 'vault-stats-panel';
    panel.className = 'vault-stats-panel';
    filters.parentElement.insertBefore(panel, filters);
  }

  if (!_vaultStats) return;
  const s = _vaultStats;
  const sizeStr = s.totalSize > 1024*1024 ? (s.totalSize / (1024*1024)).toFixed(1) + ' MB' : (s.totalSize / 1024).toFixed(0) + ' KB';
  const cats = Object.entries(s.categories).sort((a,b) => b[1] - a[1]).slice(0, 8);

  panel.innerHTML = `
    <div style="display:flex;gap:16px;align-items:center;flex-wrap:wrap;padding:8px 0">
      <div style="display:flex;align-items:baseline;gap:6px">
        <span style="font-size:22px;font-weight:700;color:var(--accent)">${s.totalNotes}</span>
        <span style="font-size:11px;color:var(--text-muted)">notes</span>
      </div>
      <div style="display:flex;align-items:baseline;gap:6px">
        <span style="font-size:16px;font-weight:600;color:var(--text-bright)">${sizeStr}</span>
        <span style="font-size:11px;color:var(--text-muted)">total</span>
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap">
        ${cats.map(([cat, count]) => {
          const color = TYPE_COLORS[cat] || 'var(--text-dim)';
          return `<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:${color}20;color:${color};cursor:pointer"
            onclick="setMindFilter('${cat}')">${cat} ${count}</span>`;
        }).join('')}
      </div>
    </div>
  `;
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
// PULSE PAGE — Full Operations Dashboard
// ═══════════════════════════════════════════════════════════

let _pulseRefreshTimer = null;
let _currentLogService = 'openclaw-gateway';

function renderPulse() {
  // Load live data from bridge if available, else show demo
  if (Bridge.liveMode) {
    loadPulseData();
  } else {
    renderPulseDemo();
  }
  // Start auto-refresh every 30s
  if (_pulseRefreshTimer) clearInterval(_pulseRefreshTimer);
  _pulseRefreshTimer = setInterval(() => {
    if (currentPage === 'pulse' && Bridge.liveMode) loadPulseData();
  }, 30000);
}

function refreshPulseData() {
  if (Bridge.liveMode) {
    loadPulseData();
    toast('🔄 Refreshing system data...', 'info');
  } else {
    toast('Connect bridge first', 'error');
  }
}

async function loadPulseData() {
  try {
    const [overview, services, agents, crons] = await Promise.all([
      Bridge.getSystemOverview().catch(() => null),
      Bridge.getSystemServices().catch(() => []),
      Bridge.getSystemAgents().catch(() => ({})),
      Bridge.getSystemCrons().catch(() => ({ crons: [], timers: [] })),
    ]);
    if (overview) renderMetricsBar(overview);
    renderServicesPanel(services);
    renderAgentStatusPanel(agents);
    renderCronHealthPanel(crons);
    loadLogPanel(_currentLogService);
    // Re-init lucide icons
    if (typeof lucide !== 'undefined') lucide.createIcons();
  } catch (err) {
    console.error('[pulse] data load error:', err);
  }
}

function renderPulseDemo() {
  // Render static demo data for offline mode
  const metricsEl = $('pulse-metrics');
  if (!metricsEl) return;

  // Demo metrics
  const uptimeCard = $('metric-uptime');
  if (uptimeCard) {
    uptimeCard.querySelector('.metric-value').textContent = '4d 7h';
    uptimeCard.querySelector('.metric-sub').textContent = 'demo data';
    uptimeCard.querySelector('.metric-value').style.color = '#a6e3a1';
  }
  const loadCard = $('metric-load');
  if (loadCard) {
    loadCard.querySelector('.metric-value').textContent = '1.2';
    loadCard.querySelector('.metric-sub').textContent = '1.2 / 0.8 / 0.6';
  }
  const memCard = $('metric-memory');
  if (memCard) {
    memCard.querySelector('.metric-value').textContent = '6.2 / 14 GB';
    const memBar = $('mem-bar');
    if (memBar) { memBar.style.width = '44%'; memBar.style.background = 'linear-gradient(90deg, #a6e3a1, #f9e2af)'; }
  }
  const diskCard = $('metric-disk');
  if (diskCard) {
    diskCard.querySelector('.metric-value').textContent = '94%';
    const diskBar = $('disk-bar');
    if (diskBar) { diskBar.style.width = '94%'; diskBar.style.background = 'linear-gradient(90deg, #f9e2af, #f38ba8)'; }
  }

  // Demo services
  const sGrid = $('services-grid');
  if (sGrid) {
    sGrid.innerHTML = ['OpenClaw Gateway', 'OAuth Guardian', 'Bridge Server', 'Bridge Sync'].map(name =>
      `<div class="svc-card"><span class="svc-dot" style="background:#a6e3a1"></span><div class="svc-info"><div class="svc-name">${name}</div><div class="svc-sub">active · demo</div></div></div>`
    ).join('');
  }

  // Demo agents
  const aGrid = $('agent-status-grid');
  if (aGrid) {
    aGrid.innerHTML = (typeof AGENTS !== 'undefined' ? AGENTS : []).map(a =>
      `<div class="agent-card-sys"><div class="agent-card-header-sys"><span>${a.emoji}</span><span class="agent-name-sys">${a.name}</span><span class="agent-status-pill ${a.status === 'active' ? 'pill-active' : 'pill-idle'}">${a.status || 'idle'}</span></div><div class="agent-task-sys">${a.task || 'standing by'}</div></div>`
    ).join('');
  }

  // Demo crons
  const cTable = $('cron-health-table');
  if (cTable && typeof CRONS !== 'undefined') {
    cTable.innerHTML = CRONS.map(c =>
      `<div class="cron-row-sys"><span class="svc-dot" style="background:${c.ok ? '#a6e3a1' : '#f38ba8'}"></span><span class="cron-name-sys">${c.n}</span><span class="cron-sched-sys">${c.s}</span></div>`
    ).join('');
  }

  // Demo logs
  const logViewer = $('log-viewer');
  if (logViewer) {
    logViewer.innerHTML = '<div class="log-placeholder">Connect bridge to view live logs</div>';
  }
}

// ── Metrics Bar ───────────────────────────────────────────

function renderMetricsBar(data) {
  // Uptime
  const uptimeCard = $('metric-uptime');
  if (uptimeCard) {
    const upStr = data.uptime || 'unknown';
    uptimeCard.querySelector('.metric-value').textContent = upStr;
    // Color: parse hours
    const hourMatch = upStr.match(/(\d+)\s*day/);
    const days = hourMatch ? parseInt(hourMatch[1]) : 0;
    const hasHours = upStr.match(/(\d+)\s*hour/);
    const hours = hasHours ? parseInt(hasHours[1]) : 0;
    const totalHours = days * 24 + hours;
    const upColor = totalHours >= 24 ? '#a6e3a1' : totalHours >= 1 ? '#f9e2af' : '#f38ba8';
    uptimeCard.querySelector('.metric-value').style.color = upColor;
    uptimeCard.querySelector('.metric-sub').textContent = totalHours >= 24 ? 'healthy' : 'recently restarted';
  }

  // Load
  const loadCard = $('metric-load');
  if (loadCard && data.load) {
    const l1 = data.load.avg1;
    loadCard.querySelector('.metric-value').textContent = l1.toFixed(2);
    loadCard.querySelector('.metric-value').style.color = l1 < 2 ? '#a6e3a1' : l1 < 4 ? '#f9e2af' : '#f38ba8';
    loadCard.querySelector('.metric-sub').textContent = `${l1.toFixed(1)} / ${data.load.avg5.toFixed(1)} / ${data.load.avg15.toFixed(1)}`;
  }

  // Memory
  const memCard = $('metric-memory');
  if (memCard && data.memory) {
    const usedGB = (data.memory.used / 1024).toFixed(1);
    const totalGB = (data.memory.total / 1024).toFixed(1);
    const pct = Math.round((data.memory.used / data.memory.total) * 100);
    memCard.querySelector('.metric-value').textContent = `${usedGB} / ${totalGB} GB`;
    const memBar = $('mem-bar');
    if (memBar) {
      memBar.style.width = pct + '%';
      memBar.style.background = pct > 85 ? 'linear-gradient(90deg, #f9e2af, #f38ba8)' : 'linear-gradient(90deg, #a6e3a1, #89dceb)';
    }
  }

  // Disk
  const diskCard = $('metric-disk');
  if (diskCard && data.disk) {
    const pctStr = data.disk.percent || '0%';
    const pct = parseInt(pctStr);
    diskCard.querySelector('.metric-value').textContent = `${data.disk.used} / ${data.disk.total}`;
    diskCard.querySelector('.metric-value').style.color = pct > 85 ? '#f38ba8' : pct > 70 ? '#f9e2af' : '#a6e3a1';
    const diskBar = $('disk-bar');
    if (diskBar) {
      diskBar.style.width = pct + '%';
      diskBar.style.background = pct > 85 ? 'linear-gradient(90deg, #f9e2af, #f38ba8)' : 'linear-gradient(90deg, #a6e3a1, #89dceb)';
    }
  }
}

// ── Services Panel ────────────────────────────────────────

function renderServicesPanel(services) {
  const grid = $('services-grid');
  if (!grid) return;

  const friendlyNames = {
    'openclaw-gateway': 'OpenClaw Gateway',
    'oauth-guardian': 'OAuth Guardian',
    'agent-os-bridge': 'Bridge Server',
    'bridge-sync': 'Bridge Sync',
  };

  grid.innerHTML = services.map(svc => {
    const isActive = svc.active === 'active';
    const dotColor = isActive ? '#a6e3a1' : '#f38ba8';
    const name = friendlyNames[svc.name] || svc.name;
    const since = svc.since ? timeSince(new Date(svc.since)) : 'unknown';
    const glowClass = isActive ? 'svc-glow' : '';

    return `<div class="svc-card ${glowClass}" onclick="showServiceLogs('${svc.name}','${name}')">
      <span class="svc-dot" style="background:${dotColor}"></span>
      <div class="svc-info">
        <div class="svc-name">${name}</div>
        <div class="svc-sub">${svc.active}${svc.sub !== 'unknown' ? ' · ' + svc.sub : ''} · ${since}</div>
      </div>
      <span class="svc-pid">${svc.pid ? 'PID ' + svc.pid : ''}</span>
    </div>`;
  }).join('');
}

function timeSince(date) {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return secs + 's';
  if (secs < 3600) return Math.floor(secs / 60) + 'm';
  if (secs < 86400) return Math.floor(secs / 3600) + 'h';
  return Math.floor(secs / 86400) + 'd';
}

function showServiceLogs(svcId, svcName) {
  const slideout = $('service-log-slideout');
  const title = $('slideout-title');
  const viewer = $('slideout-log-viewer');
  if (!slideout || !viewer) return;
  title.textContent = svcName + ' Logs';
  slideout.classList.remove('hidden');
  viewer.innerHTML = '<div class="log-placeholder">Loading...</div>';
  Bridge.getSystemLogs(svcId, 100).then(data => {
    renderLogLines(viewer, data.lines || []);
  }).catch(err => {
    viewer.innerHTML = `<div class="log-placeholder" style="color:#f38ba8">Error: ${err.message}</div>`;
  });
}

function closeServiceSlideout() {
  const slideout = $('service-log-slideout');
  if (slideout) slideout.classList.add('hidden');
}

// ── Agent Status Panel ────────────────────────────────────

function renderAgentStatusPanel(agentData) {
  const grid = $('agent-status-grid');
  if (!grid) return;

  // Merge AGENTS roster with live dispatch data
  const roster = typeof AGENTS !== 'undefined' ? AGENTS : [];
  grid.innerHTML = roster.map(a => {
    const liveData = agentData[a.id] || agentData[a.name?.toLowerCase()] || {};
    const queuedTasks = liveData.queued || [];
    const doneCount = liveData.doneCount || 0;
    const isActive = queuedTasks.length > 0 || a.status === 'active';
    const currentTask = queuedTasks.length > 0 ? queuedTasks[0].title : (a.task || 'standing by');
    const statusPill = isActive ? 'pill-active' : 'pill-idle';

    return `<div class="agent-card-sys ${isActive ? 'agent-active-glow' : ''}">
      <div class="agent-card-header-sys">
        <span class="agent-emoji-sys">${a.emoji}</span>
        <span class="agent-name-sys">${a.name}</span>
        <span class="agent-status-pill ${statusPill}">${isActive ? 'active' : 'idle'}</span>
      </div>
      <div class="agent-task-sys">${currentTask}</div>
      <div class="agent-stats-sys">
        <span class="agent-stat-item">📋 ${queuedTasks.length} queued</span>
        <span class="agent-stat-item">✅ ${doneCount} done</span>
      </div>
    </div>`;
  }).join('');
}

// ── Cron Health Panel ─────────────────────────────────────

function renderCronHealthPanel(cronData) {
  const table = $('cron-health-table');
  if (!table) return;

  let rows = '';

  // Crontab entries
  (cronData.crons || []).forEach(c => {
    const schedHuman = cronToHuman(c.schedule);
    rows += `<div class="cron-row-sys">
      <span class="svc-dot" style="background:#a6e3a1"></span>
      <span class="cron-name-sys" title="${c.command}">${c.command.substring(0, 40)}</span>
      <span class="cron-sched-sys">${schedHuman}</span>
      <span class="cron-type-badge">crontab</span>
    </div>`;
  });

  // Systemd timers
  (cronData.timers || []).forEach(t => {
    const name = t.unit || t.activates || 'timer';
    const isOverdue = t.left && t.left.includes('ago');
    const dotColor = isOverdue ? '#f9e2af' : '#a6e3a1';
    rows += `<div class="cron-row-sys">
      <span class="svc-dot" style="background:${dotColor}"></span>
      <span class="cron-name-sys">${name}</span>
      <span class="cron-sched-sys">${t.left || 'unknown'}</span>
      <span class="cron-type-badge type-systemd">systemd</span>
    </div>`;
  });

  if (!rows) {
    rows = '<div class="log-placeholder">No cron jobs found</div>';
  }
  table.innerHTML = rows;
}

function cronToHuman(sched) {
  if (!sched) return '';
  const parts = sched.split(/\s+/);
  if (parts.length < 5) return sched;
  const [min, hr, dom, mon, dow] = parts;
  if (min === '*' && hr === '*') return 'every minute';
  if (min !== '*' && hr === '*') return `every hour at :${min.padStart(2,'0')}`;
  if (min === '0' && hr === '*') return 'every hour';
  if (min === '*/5') return 'every 5 min';
  if (min === '*/10') return 'every 10 min';
  if (min === '*/15') return 'every 15 min';
  if (min === '*/30' || (min === '0' && hr === '*/2')) return 'every 30 min';
  if (dom === '*' && mon === '*' && dow === '*') return `daily at ${hr}:${min.padStart(2,'0')}`;
  return sched;
}

// ── Live Logs Panel ───────────────────────────────────────

function switchLogTab(svc, btn) {
  _currentLogService = svc;
  document.querySelectorAll('.log-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
  loadLogPanel(svc);
}

async function loadLogPanel(svc) {
  const viewer = $('log-viewer');
  if (!viewer) return;
  if (!Bridge.liveMode) {
    viewer.innerHTML = '<div class="log-placeholder">Connect bridge to view live logs</div>';
    return;
  }
  viewer.innerHTML = '<div class="log-placeholder">Loading...</div>';
  try {
    const data = await Bridge.getSystemLogs(svc, 50);
    renderLogLines(viewer, data.lines || []);
  } catch (err) {
    viewer.innerHTML = `<div class="log-placeholder" style="color:#f38ba8">Error: ${err.message}</div>`;
  }
}

function renderLogLines(container, lines) {
  if (!lines.length) {
    container.innerHTML = '<div class="log-placeholder">No log entries</div>';
    return;
  }
  container.innerHTML = lines.map(l => {
    const text = l.text || '';
    let severity = 'info';
    if (/error|fail|fatal|panic/i.test(text)) severity = 'error';
    else if (/warn/i.test(text)) severity = 'warn';
    const ts = l.ts ? `<span class="log-ts">${l.ts.substring(11, 19) || l.ts}</span>` : '';
    return `<div class="log-line log-${severity}">${ts}<span class="log-text">${escHtml(text)}</span></div>`;
  }).join('');
  // Auto-scroll to bottom
  container.scrollTop = container.scrollHeight;
}

function quickAction(action) {
  const msgs = {
    'restart-gateway': '🔄 Restarting gateway...',
    'clear-queue':     '🗑️ Queue cleared',
    'reindex':         '📚 Reindexing vault...',
    'health-check':    '🩺 Running health check...',
  };
  toast(msgs[action] || action, 'success');
  if (typeof addXP === 'function') addXP(5, 'quick action');
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
let currentPlanId = null; // null = "All Plans" overview
let plansLoaded = false;
let plansPollingInterval = null;
let plansLastSyncTime = null;

const PLAN_PRIORITY_COLORS = {P1:'#f38ba8', P2:'#fab387', P3:'#89b4fa', P4:'#6c7086'};
const DEFAULT_COLUMNS = ['Backlog','In Progress','Review','Done'];

// Helper: normalize column — handles both string and {id, name, color} formats
function colName(col) { return typeof col === 'object' ? (col.name || col.id) : col; }
function colId(col) { return typeof col === 'object' ? (col.id || col.name) : col; }
function colColor(col, idx) {
  if (typeof col === 'object' && col.color) return col.color;
  const palette = ['#89b4fa','#fab387','#cba6f7','#a6e3a1'];
  return palette[idx % palette.length];
}
function taskInCol(task, col) {
  const cid = colId(col);
  const cname = colName(col);
  return task.column === cid || task.column === cname || task.status === cid || task.status === cname;
}

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
    stopPlansPolling();
    v.innerHTML = `<div class="plans-empty"><div class="empty-icon">📋</div><div class="empty-title">Connect bridge to view plans</div><div class="empty-desc">Configure bridge connection to load your Kanban boards</div></div>`;
    return;
  }

  v.innerHTML = `<div class="plans-loading"><span class="plans-spinner"></span> Loading plans...</div>`;

  try {
    await loadFullPlans();
    plansLoaded = true;
    renderPlansUI();
    startPlansPolling();
  } catch (e) {
    v.innerHTML = `<div class="plans-empty"><div class="empty-icon">⚠️</div><div class="empty-title">Failed to load plans</div><div class="empty-desc">${e.message}</div></div>`;
  }
}

async function loadFullPlans() {
  const summaries = await Bridge.getPlans();
  const list = Array.isArray(summaries) ? summaries : (summaries.plans || []);
  // Fetch full plan data for each (needed for tasks, cross-refs)
  const full = await Promise.all(list.map(async s => {
    try { return await Bridge.getPlan(s.id); } catch { return s; }
  }));
  plansData = full;
  plansLastSyncTime = Date.now();
}

function startPlansPolling() {
  stopPlansPolling();
  plansPollingInterval = setInterval(async () => {
    if (!Bridge.liveMode) { stopPlansPolling(); return; }
    try {
      const prev = JSON.stringify(plansData.map(p => ({ id: p.id, updated_at: p.updated_at, tc: (p.tasks||[]).length })));
      await loadFullPlans();
      const next = JSON.stringify(plansData.map(p => ({ id: p.id, updated_at: p.updated_at, tc: (p.tasks||[]).length })));
      if (prev !== next) renderPlansUI();
      else updateSyncIndicator();
    } catch { /* silent */ }
  }, 10000);
}

function stopPlansPolling() {
  if (plansPollingInterval) { clearInterval(plansPollingInterval); plansPollingInterval = null; }
}

function updateSyncIndicator() {
  const el = document.querySelector('.plans-sync-indicator');
  if (el && plansLastSyncTime) {
    const ago = Math.floor((Date.now() - plansLastSyncTime) / 1000);
    el.textContent = ago < 5 ? 'Synced just now' : `Synced ${ago}s ago`;
  }
}

function renderPlansUI() {
  const v = $('view-plans');
  if (!v) return;

  // Sync indicator text
  const syncText = plansLastSyncTime ? (() => {
    const ago = Math.floor((Date.now() - plansLastSyncTime) / 1000);
    return ago < 5 ? 'Synced just now' : `Synced ${ago}s ago`;
  })() : '';

  // Top bar: "All Plans" pill + plan tabs + sync indicator + new plan button
  let html = `<div class="plans-topbar">
    <div class="plans-tabs-scroll">
      <button class="plans-tab${currentPlanId === null ? ' active' : ''}" onclick="switchPlan(null)">📋 All Plans</button>`;
  plansData.forEach(p => {
    const active = p.id === currentPlanId ? ' active' : '';
    const statusCls = p.status || 'active';
    const taskCount = (p.tasks || []).length;
    html += `<button class="plans-tab${active}" onclick="switchPlan('${p.id}')">${p.name || 'Untitled'}<span class="plans-tab-count">${taskCount}</span><span class="plan-status-dot ${statusCls}"></span></button>`;
  });
  html += `</div>
    <span class="plans-sync-indicator">${syncText}</span>
    <button class="plans-new-btn" onclick="showNewPlanModal()">+ New Plan</button>
  </div>`;

  if (plansData.length === 0) {
    html += `<div class="plans-empty"><div class="empty-icon">📋</div><div class="empty-title">No plans yet</div><div class="empty-desc">Create your first plan to get started</div></div>`;
    v.innerHTML = html;
    lucide.createIcons();
    return;
  }

  // "All Plans" overview or single plan kanban
  if (currentPlanId === null) {
    html += renderAllPlansOverview();
  } else {
    const plan = plansData.find(p => p.id === currentPlanId);
    if (!plan) { currentPlanId = null; html += renderAllPlansOverview(); }
    else html += renderSinglePlanKanban(plan);
  }

  v.innerHTML = html;
  lucide.createIcons();
}

function renderAllPlansOverview() {
  let html = `<div class="plans-overview-grid">`;
  plansData.forEach(p => {
    const tasks = p.tasks || [];
    const columns = p.columns || DEFAULT_COLUMNS;
    const statusLabel = p.status || 'active';
    const totalTasks = tasks.length;
    const doneTasks = tasks.filter(t => {
      const lastCol = columns[columns.length - 1];
      return taskInCol(t, lastCol);
    }).length;
    const progress = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

    html += `<div class="plans-overview-card" onclick="switchPlan('${p.id}')">
      <div class="plans-ov-header">
        <span class="plans-ov-name">${p.name || 'Untitled'}</span>
        <span class="plan-status-badge ${statusLabel}">${statusLabel}</span>
      </div>`;
    if (p.description) html += `<div class="plans-ov-desc">${p.description}</div>`;

    // Column summary chips
    html += `<div class="plans-ov-cols">`;
    columns.forEach((col, ci) => {
      const count = tasks.filter(t => taskInCol(t, col)).length;
      html += `<span class="plans-ov-col-chip" style="border-color:${colColor(col, ci)}">${colName(col)} <strong>${count}</strong></span>`;
    });
    html += `</div>`;

    // Progress bar
    html += `<div class="plans-ov-progress">
      <div class="plans-ov-progress-bar" style="width:${progress}%"></div>
    </div>
    <div class="plans-ov-footer">
      <span>${totalTasks} tasks · ${doneTasks} done</span>
      <span class="plans-ov-arrow">→</span>
    </div>`;

    // Cross-references from this plan
    const refs = getCrossRefsForPlan(p);
    if (refs.length > 0) {
      html += `<div class="plans-ov-refs">`;
      refs.forEach(r => {
        html += `<span class="plans-cross-ref" onclick="event.stopPropagation();switchPlan('${r.planId}')">🔗 ${r.planName}</span>`;
      });
      html += `</div>`;
    }

    html += `</div>`;
  });
  html += `</div>`;
  return html;
}

function renderSinglePlanKanban(plan) {
  let html = '';
  const statusLabel = plan.status || 'active';
  html += `<div class="plan-info-bar"><span class="plan-status-badge ${statusLabel}">${statusLabel.charAt(0).toUpperCase()+statusLabel.slice(1)}</span>`;
  if (plan.description) html += `<span class="plan-desc">${plan.description}</span>`;
  html += `</div>`;

  const columns = plan.columns || DEFAULT_COLUMNS;
  const tasks = plan.tasks || [];

  html += `<div class="kanban-container">`;
  columns.forEach((col, ci) => {
    const cId = colId(col);
    const cName = colName(col);
    const cColor = colColor(col, ci);
    const colTasks = tasks.filter(t => taskInCol(t, col));

    html += `<div class="kanban-column" data-col="${cId}">
      <div class="kanban-col-header" style="border-top:3px solid ${cColor}">
        <span class="kanban-col-title">${cName}</span>
        <span class="kanban-col-count">${colTasks.length}</span>
      </div>
      <div class="kanban-col-body">`;

    colTasks.forEach(task => {
      html += renderKanbanCard(plan, task);
    });

    html += `</div>
      <button class="kanban-add-btn" onclick="showQuickCreate('${plan.id}','${cId}',this)">+ Add task</button>
    </div>`;
  });
  html += `</div>`;

  // Cross-references section
  const refs = getCrossRefsForPlan(plan);
  if (refs.length > 0) {
    html += `<div class="plans-related-section">
      <div class="plans-related-title">🔗 Related Plans</div>
      <div class="plans-related-list">`;
    refs.forEach(r => {
      html += `<div class="plans-related-item" onclick="switchPlan('${r.planId}')">
        <span class="plans-related-name">${r.planName}</span>
        <span class="plans-related-detail">${r.refs.length} cross-reference${r.refs.length > 1 ? 's' : ''}</span>
      </div>`;
    });
    html += `</div></div>`;
  }

  return html;
}

function renderKanbanCard(plan, task) {
  const agent = ga(task.agent);
  const agentColor = agent ? agent.color : '#6c7086';
  const agentEmoji = agent ? agent.emoji : '🤖';
  const agentName = agent ? agent.name : (task.agent || 'Unassigned');
  const prio = task.priority || 'P3';
  const prioColor = PLAN_PRIORITY_COLORS[prio] || '#6c7086';
  const labels = task.labels || [];
  const blockedBy = task.blockedBy || [];

  let cardHtml = `<div class="kanban-card" style="border-left:3px solid ${agentColor}" onclick="openTaskDetail('${plan.id}','${task.id}')">
    <div class="kanban-card-top">
      <span class="kanban-card-agent">${agentEmoji} ${agentName}</span>
      <span class="kanban-card-prio" style="background:${prioColor}">${prio}</span>
    </div>
    <div class="kanban-card-title">${task.title || 'Untitled'}</div>`;

  // Cross-reference badges
  if (blockedBy.length > 0) {
    cardHtml += `<div class="kanban-card-xrefs">`;
    blockedBy.forEach(ref => {
      const refPlan = plansData.find(p => p.id === ref.planId);
      const refName = refPlan ? refPlan.name : ref.planId;
      cardHtml += `<span class="kanban-xref-badge" title="Blocked by: [${refName}] ${ref.taskTitle || ref.taskId}">🔗 ${ref.taskTitle || ref.taskId}</span>`;
    });
    cardHtml += `</div>`;
  }

  if (labels.length) {
    cardHtml += `<div class="kanban-card-labels">${labels.map(l => `<span class="kanban-label">${l}</span>`).join('')}</div>`;
  }
  cardHtml += `<div class="kanban-card-time">${timeAgo(task.updated_at || task.created_at)}</div>
  </div>`;
  return cardHtml;
}

// Cross-reference helpers
function getCrossRefsForPlan(plan) {
  const tasks = plan.tasks || [];
  const refMap = new Map(); // planId → { planName, refs: [] }
  tasks.forEach(t => {
    const blockedBy = t.blockedBy || [];
    blockedBy.forEach(ref => {
      if (ref.planId && ref.planId !== plan.id) {
        if (!refMap.has(ref.planId)) {
          const other = plansData.find(p => p.id === ref.planId);
          refMap.set(ref.planId, { planId: ref.planId, planName: other ? other.name : ref.planId, refs: [] });
        }
        refMap.get(ref.planId).refs.push({ taskId: t.id, taskTitle: t.title, refTaskId: ref.taskId });
      }
    });
    // Also check relatedPlans field
    const related = plan.relatedPlans || [];
    related.forEach(rp => {
      const rpId = typeof rp === 'string' ? rp : rp.id;
      if (rpId && !refMap.has(rpId)) {
        const other = plansData.find(p => p.id === rpId);
        if (other) refMap.set(rpId, { planId: rpId, planName: other.name, refs: [{ note: 'Related plan' }] });
      }
    });
  });
  return Array.from(refMap.values());
}

function switchPlan(id) {
  currentPlanId = id;
  renderPlansUI();
  // Scroll top of plans view
  const v = $('view-plans');
  if (v) v.scrollTop = 0;
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
            ${columns.map(c => { const cid = colId(c), cn = colName(c); return `<option value="${cid}" ${cid===task.column||cn===task.column||cid===task.status||cn===task.status?'selected':''}>${cn}</option>`; }).join('')}
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
