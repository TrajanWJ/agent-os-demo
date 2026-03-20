/* Agent OS v7 — mind.js — Complete Mind Page (Search, Browse, Graph, Reader, Insights) */
'use strict';

// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════

let mindTab = 'search';
let mindSearchResults = [];
let mindRecentSearches = JSON.parse(localStorage.getItem('mind_recent_searches') || '[]');
let mindBrowseNotes = [];
let mindBrowseFolders = {};
let mindSelectedFolder = null;
let mindBrowseSort = 'modified';
let mindGraphNodes = [];
let mindGraphEdges = [];
let mindGraphCanvas = null;
let mindGraphCtx = null;
let mindGraphHovered = null;
let mindGraphSelected = null;
let mindGraphDragging = null;
let mindGraphAnimId = null;
let mindGraphAlpha = 1.0;
let mindGraphSimTick = 0;
let mindGraphSettled = false;
let mindGraphLocked = false;
let mindGraphFilter = '';
let mindReaderNote = null;
let mindInsightsData = null;
let _mindGraphResizeHandler = null;

const FOLDER_COLORS = {
  'Research': '#89b4fa',
  'Architecture': '#cba6f7',
  'Agents': '#a6e3a1',
  'Projects': '#f9e2af',
  'Trajan': '#fab387',
  'Operations': '#fab387',
  'Vision': '#f5c2e7',
  'Code': '#a6e3a1',
  'Report': '#f38ba8',
  'root': '#94e2d5',
};

function getFolderColor(folder) {
  if (!folder) return '#6c7086';
  const top = folder.split('/')[0];
  return FOLDER_COLORS[top] || '#6c7086';
}

// ═══════════════════════════════════════════════════════════
// INIT + TAB NAVIGATION
// ═══════════════════════════════════════════════════════════

function initMind() {
  setMindTab(mindTab);
}

function setMindTab(tab) {
  mindTab = tab;
  // Update tab buttons
  document.querySelectorAll('.mind-tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  // Show/hide panels
  document.querySelectorAll('.mind-tab-panel').forEach(p => {
    p.classList.toggle('hidden', p.id !== `mind-panel-${tab}`);
    p.classList.toggle('active', p.id === `mind-panel-${tab}`);
  });
  // Activate tab content
  switch (tab) {
    case 'search': initMindSearch(); break;
    case 'browse': initMindBrowse(); break;
    case 'graph': initMindGraph(); break;
    case 'reader': renderMindReader(); break;
    case 'insights': initMindInsights(); break;
  }
}

// ═══════════════════════════════════════════════════════════
// TAB 1: SEARCH
// ═══════════════════════════════════════════════════════════

function initMindSearch() {
  renderRecentSearches();
  const results = document.getElementById('mind-search-results');
  if (results && mindSearchResults.length === 0) {
    results.innerHTML = '<div class="mind-empty">Type a query and press Enter to search the vault</div>';
  }
}

function doMindSearch() {
  const input = document.getElementById('mind-search-input');
  const q = (input?.value || '').trim();
  if (!q) return;

  // Save recent search
  mindRecentSearches = [q, ...mindRecentSearches.filter(s => s !== q)].slice(0, 8);
  localStorage.setItem('mind_recent_searches', JSON.stringify(mindRecentSearches));
  renderRecentSearches();

  const results = document.getElementById('mind-search-results');
  const stats = document.getElementById('mind-search-stats');
  results.innerHTML = '<div class="mind-loading">Searching...</div>';
  if (stats) stats.textContent = '';

  const startTime = performance.now();

  const bridgeUrl = (typeof Bridge !== 'undefined' && Bridge.baseUrl) ? Bridge.baseUrl : '';
  fetch(`${bridgeUrl}/api/vault/search?q=${encodeURIComponent(q)}&limit=30`)
    .then(r => r.json())
    .then(data => {
      const elapsed = Math.round(performance.now() - startTime);
      mindSearchResults = data;
      if (stats) stats.textContent = `Found ${data.length} notes in ${elapsed}ms`;
      renderSearchResults(data);
    })
    .catch(err => {
      // Fallback to seed data
      const filtered = VAULT_NOTES.filter(n =>
        n.title.toLowerCase().includes(q.toLowerCase()) ||
        n.summary.toLowerCase().includes(q.toLowerCase()) ||
        n.tags.some(t => t.includes(q.toLowerCase()))
      );
      const elapsed = Math.round(performance.now() - startTime);
      mindSearchResults = filtered.map(n => ({
        path: `${n.type}/${n.title}.md`,
        title: n.title,
        snippet: n.summary,
      }));
      if (stats) stats.textContent = `Found ${filtered.length} notes in ${elapsed}ms (local)`;
      renderSearchResults(mindSearchResults);
    });
}

function renderSearchResults(results) {
  const container = document.getElementById('mind-search-results');
  if (!results.length) {
    container.innerHTML = '<div class="mind-empty">No results found</div>';
    return;
  }
  container.innerHTML = results.map(r => {
    const title = extractTitle(r.path || r.title || '');
    const folder = extractFolder(r.path || '');
    return `<div class="mind-search-card" onclick="openNoteInReader('${escHtml(r.path || '')}')">
      <div class="mind-search-card-title">${escHtml(title)}</div>
      <div class="mind-search-card-folder">${escHtml(folder)}</div>
      ${r.snippet ? `<div class="mind-search-card-snippet">${escHtml(r.snippet).substring(0, 150)}</div>` : ''}
    </div>`;
  }).join('');
}

function renderRecentSearches() {
  const container = document.getElementById('mind-recent-searches');
  if (!container) return;
  if (!mindRecentSearches.length) {
    container.innerHTML = '';
    return;
  }
  container.innerHTML = `<div class="mind-recent-label">Recent searches</div>
    <div class="mind-recent-chips">${mindRecentSearches.map(s =>
      `<button class="mind-recent-chip" onclick="document.getElementById('mind-search-input').value='${escHtml(s)}';doMindSearch()">${escHtml(s)}</button>`
    ).join('')}</div>`;
}

function handleMindSearchKey(e) {
  if (e.key === 'Enter') doMindSearch();
}

// ═══════════════════════════════════════════════════════════
// TAB 2: BROWSE
// ═══════════════════════════════════════════════════════════

function initMindBrowse() {
  const tree = document.getElementById('mind-browse-tree');
  if (tree && tree.children.length === 0) {
    tree.innerHTML = '<div class="mind-loading">Loading vault...</div>';
    loadBrowseData();
  }
}

async function loadBrowseData() {
  try {
    const bridgeUrl = (typeof Bridge !== 'undefined' && Bridge.baseUrl) ? Bridge.baseUrl : '';
    const resp = await fetch(`${bridgeUrl}/api/vault/recent?limit=100`);
    const notes = await resp.json();
    mindBrowseNotes = notes;
    buildFolderTree(notes);
  } catch {
    // Fallback to seed data
    mindBrowseNotes = VAULT_NOTES.map(n => ({
      path: `${n.type}/${n.title.replace(/ /g, '-')}.md`,
      modified: n.date + 'T00:00:00Z',
      size: 0,
    }));
    buildFolderTree(mindBrowseNotes);
  }
}

function buildFolderTree(notes) {
  mindBrowseFolders = {};
  notes.forEach(n => {
    const parts = (n.path || '').split('/');
    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : 'root';
    if (!mindBrowseFolders[folder]) mindBrowseFolders[folder] = [];
    mindBrowseFolders[folder].push(n);
  });

  const tree = document.getElementById('mind-browse-tree');
  if (!tree) return;

  // Get top-level folders sorted by note count
  const topFolders = {};
  Object.keys(mindBrowseFolders).forEach(f => {
    const top = f.split('/')[0];
    if (!topFolders[top]) topFolders[top] = 0;
    topFolders[top] += mindBrowseFolders[f].length;
  });

  const sorted = Object.entries(topFolders).sort((a, b) => b[1] - a[1]);
  tree.innerHTML = sorted.map(([folder, count]) => {
    const color = getFolderColor(folder);
    const subfolders = Object.keys(mindBrowseFolders).filter(f => f.startsWith(folder + '/') || f === folder);
    return `<div class="mind-folder-item" data-folder="${escHtml(folder)}">
      <div class="mind-folder-header" onclick="selectBrowseFolder('${escHtml(folder)}')" style="border-left: 3px solid ${color}">
        <span class="mind-folder-icon">📂</span>
        <span class="mind-folder-name">${escHtml(folder)}</span>
        <span class="mind-folder-count">${count}</span>
      </div>
      ${subfolders.filter(f => f !== folder && f.split('/').length === 2).map(sf =>
        `<div class="mind-subfolder" onclick="selectBrowseFolder('${escHtml(sf)}')" style="padding-left:32px">
          <span class="mind-folder-icon" style="font-size:12px">📁</span>
          <span class="mind-folder-name">${escHtml(sf.split('/').pop())}</span>
          <span class="mind-folder-count">${mindBrowseFolders[sf]?.length || 0}</span>
        </div>`
      ).join('')}
    </div>`;
  }).join('');

  // Auto-select first folder
  if (sorted.length > 0 && !mindSelectedFolder) {
    selectBrowseFolder(sorted[0][0]);
  }
}

function selectBrowseFolder(folder) {
  mindSelectedFolder = folder;
  // Highlight selected folder
  document.querySelectorAll('.mind-folder-header, .mind-subfolder').forEach(el => {
    el.classList.remove('selected');
  });
  const headers = document.querySelectorAll('.mind-folder-header, .mind-subfolder');
  headers.forEach(el => {
    if (el.textContent.includes(folder.split('/').pop())) {
      el.classList.add('selected');
    }
  });

  // Get notes for this folder (include subfolders)
  let notes = [];
  Object.keys(mindBrowseFolders).forEach(f => {
    if (f === folder || f.startsWith(folder + '/')) {
      notes = notes.concat(mindBrowseFolders[f]);
    }
  });

  // Sort
  switch (mindBrowseSort) {
    case 'name': notes.sort((a, b) => extractTitle(a.path).localeCompare(extractTitle(b.path))); break;
    case 'size': notes.sort((a, b) => (b.size || 0) - (a.size || 0)); break;
    default: notes.sort((a, b) => new Date(b.modified || 0) - new Date(a.modified || 0));
  }

  const list = document.getElementById('mind-browse-list');
  if (!list) return;

  if (!notes.length) {
    list.innerHTML = '<div class="mind-empty">No notes in this folder</div>';
    return;
  }

  list.innerHTML = `<div class="mind-browse-sort-row">
    <span class="mind-browse-folder-title">📂 ${escHtml(folder)} <span style="color:var(--text-muted);font-weight:400">(${notes.length})</span></span>
    <select class="mind-browse-sort-select" onchange="mindBrowseSort=this.value;selectBrowseFolder('${escHtml(folder)}')">
      <option value="modified"${mindBrowseSort === 'modified' ? ' selected' : ''}>Modified</option>
      <option value="name"${mindBrowseSort === 'name' ? ' selected' : ''}>Name</option>
      <option value="size"${mindBrowseSort === 'size' ? ' selected' : ''}>Size</option>
    </select>
  </div>` +
  notes.map(n => {
    const title = extractTitle(n.path);
    const relTime = n.modified ? timeAgo(new Date(n.modified)) : '';
    const size = n.size ? formatSize(n.size) : '';
    return `<div class="mind-browse-note" onclick="openNoteInReader('${escHtml(n.path)}')">
      <div class="mind-browse-note-title">${escHtml(title)}</div>
      <div class="mind-browse-note-meta">
        ${relTime ? `<span>${relTime}</span>` : ''}
        ${size ? `<span>· ${size}</span>` : ''}
        <span style="color:${getFolderColor(n.path)}">${escHtml(extractFolder(n.path))}</span>
      </div>
    </div>`;
  }).join('');
}

// ═══════════════════════════════════════════════════════════
// TAB 3: GRAPH
// ═══════════════════════════════════════════════════════════

function initMindGraph() {
  mindGraphCanvas = document.getElementById('mind-graph-canvas');
  if (!mindGraphCanvas) return;
  mindGraphCtx = mindGraphCanvas.getContext('2d');

  // Remove old resize listener
  if (_mindGraphResizeHandler) window.removeEventListener('resize', _mindGraphResizeHandler);
  _mindGraphResizeHandler = () => {
    if (mindTab !== 'graph' || !mindGraphCanvas) return;
    const p = mindGraphCanvas.parentElement;
    mindGraphCanvas.width = p.clientWidth || 800;
    mindGraphCanvas.height = p.clientHeight || 500;
    if (mindGraphSettled) drawMindGraph();
  };
  window.addEventListener('resize', _mindGraphResizeHandler);

  const parent = mindGraphCanvas.parentElement;
  mindGraphCanvas.width = parent.clientWidth || 800;
  mindGraphCanvas.height = parent.clientHeight || 500;

  // Try real API first, fallback to seed data
  loadGraphData().then(() => {
    setupGraphInteraction();
    startGraphSim();
  });
}

async function loadGraphData() {
  const W = mindGraphCanvas.width;
  const H = mindGraphCanvas.height;

  try {
    const bridgeUrl = (typeof Bridge !== 'undefined' && Bridge.baseUrl) ? Bridge.baseUrl : '';
    const resp = await fetch(`${bridgeUrl}/api/vault/graph?limit=150`);
    const data = await resp.json();

    if (data.nodes && data.nodes.length > 0) {
      mindGraphNodes = data.nodes.map((n, i) => ({
        id: n.id || i,
        label: n.title || extractTitle(n.id || ''),
        folder: n.category || extractFolder(n.id || ''),
        hex: getFolderColor(n.category || n.id || ''),
        x: W / 2 + (Math.random() - 0.5) * 300,
        y: H / 2 + (Math.random() - 0.5) * 200,
        vx: 0, vy: 0,
        r: Math.min(8 + (data.edges || []).filter(e => e.source === n.id || e.target === n.id).length * 1.5, 22),
      }));

      // Build node ID → index map
      const idMap = {};
      mindGraphNodes.forEach((n, i) => { idMap[n.id] = i; });

      mindGraphEdges = (data.edges || []).map(e => ({
        source: idMap[e.source],
        target: idMap[e.target],
        type: e.type || 'link',
      })).filter(e => e.source !== undefined && e.target !== undefined);
      return;
    }
  } catch { /* fallback */ }

  // Fallback to seed data
  mindGraphNodes = GNODES.map(n => ({
    ...n,
    label: n.label,
    folder: n.type,
    hex: n.hex || getFolderColor(n.type),
    x: W / 2 + (Math.random() - 0.5) * 200,
    y: H / 2 + (Math.random() - 0.5) * 150,
    vx: 0, vy: 0,
    r: n.size || 12,
  }));
  mindGraphEdges = GEDGES.map(([a, b]) => ({ source: a, target: b, type: 'link' }));
}

function setupGraphInteraction() {
  mindGraphCanvas.onmousemove = graphOnMouseMove;
  mindGraphCanvas.onmousedown = graphOnMouseDown;
  mindGraphCanvas.onmouseup = graphOnMouseUp;
  mindGraphCanvas.onclick = graphOnClick;

  // Touch
  mindGraphCanvas.addEventListener('touchstart', e => {
    if (mindGraphLocked) return;
    const touch = e.touches[0];
    const rect = mindGraphCanvas.getBoundingClientRect();
    const n = graphHitTest(touch.clientX - rect.left, touch.clientY - rect.top);
    if (n) { mindGraphDragging = n; e.preventDefault(); }
  }, { passive: false });
  mindGraphCanvas.addEventListener('touchmove', e => {
    if (!mindGraphDragging || mindGraphLocked) return;
    e.preventDefault();
    const touch = e.touches[0];
    const rect = mindGraphCanvas.getBoundingClientRect();
    mindGraphDragging.x = touch.clientX - rect.left;
    mindGraphDragging.y = touch.clientY - rect.top;
    mindGraphDragging.vx = 0; mindGraphDragging.vy = 0;
    if (mindGraphSettled) drawMindGraph();
  }, { passive: false });
  mindGraphCanvas.addEventListener('touchend', () => {
    if (mindGraphDragging && mindGraphSettled && !mindGraphLocked) {
      mindGraphSettled = false; mindGraphSimTick = 0; mindGraphAlpha = 0.5; startGraphSim();
    }
    if (mindGraphDragging) { mindGraphSelected = mindGraphDragging; showGraphNodeDetail(mindGraphDragging); }
    mindGraphDragging = null;
  });
}

function startGraphSim() {
  if (mindGraphAnimId) cancelAnimationFrame(mindGraphAnimId);
  mindGraphSimTick = 0;
  mindGraphSettled = false;
  mindGraphAlpha = 1.0;
  runMindGraphSim();
}

function runMindGraphSim() {
  if (mindTab !== 'graph' || !mindGraphCtx || mindGraphLocked) return;

  const W = mindGraphCanvas.width;
  const H = mindGraphCanvas.height;
  const k = Math.sqrt((W * H) / Math.max(mindGraphNodes.length, 1));
  const filtered = getFilteredGraphNodes();
  const filteredSet = new Set(filtered.map((_, i) => i));

  mindGraphAlpha *= 0.95;

  // Reset forces
  mindGraphNodes.forEach(n => { n.fx = 0; n.fy = 0; });

  // Repulsion
  for (let i = 0; i < mindGraphNodes.length; i++) {
    for (let j = i + 1; j < mindGraphNodes.length; j++) {
      const a = mindGraphNodes[i], b = mindGraphNodes[j];
      let dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      const minDist = (a.r + b.r) + 20;
      let force = (k * k) / d * 0.3 * mindGraphAlpha;
      if (d < minDist) force += (minDist - d) * 2.0;
      const fx = (dx / d) * force, fy = (dy / d) * force;
      a.fx -= fx; a.fy -= fy;
      b.fx += fx; b.fy += fy;
    }
  }

  // Attraction
  mindGraphEdges.forEach(({ source, target }) => {
    const a = mindGraphNodes[source], b = mindGraphNodes[target];
    if (!a || !b) return;
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const force = (d * d) / k * 0.08 * mindGraphAlpha;
    const fx = (dx / d) * force, fy = (dy / d) * force;
    a.fx += fx; a.fy += fy;
    b.fx -= fx; b.fy -= fy;
  });

  // Center gravity
  mindGraphNodes.forEach(n => {
    n.fx += (W / 2 - n.x) * 0.08 * mindGraphAlpha;
    n.fy += (H / 2 - n.y) * 0.08 * mindGraphAlpha;
  });

  // Integrate
  let totalEnergy = 0;
  mindGraphNodes.forEach(n => {
    if (n === mindGraphDragging) return;
    n.vx = (n.vx + n.fx) * 0.85;
    n.vy = (n.vy + n.fy) * 0.85;
    const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
    if (speed > 8) { n.vx = (n.vx / speed) * 8; n.vy = (n.vy / speed) * 8; }
    n.x += n.vx; n.y += n.vy;
    n.x = Math.max(60, Math.min(W - 60, n.x));
    n.y = Math.max(60, Math.min(H - 60, n.y));
    totalEnergy += n.vx * n.vx + n.vy * n.vy;
  });

  mindGraphSimTick++;
  drawMindGraph();

  if ((totalEnergy < 0.1 && mindGraphSimTick > 30) || mindGraphAlpha < 0.01 || mindGraphSimTick > 200) {
    mindGraphSettled = true;
    mindGraphNodes.forEach(n => { n.vx = 0; n.vy = 0; });
    drawMindGraph();
    mindGraphAnimId = null;
    return;
  }

  mindGraphAnimId = requestAnimationFrame(runMindGraphSim);
}

function getFilteredGraphNodes() {
  if (!mindGraphFilter) return mindGraphNodes;
  const q = mindGraphFilter.toLowerCase();
  return mindGraphNodes.filter(n => n.label.toLowerCase().includes(q));
}

function drawMindGraph() {
  const ctx = mindGraphCtx;
  const W = mindGraphCanvas.width, H = mindGraphCanvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#1e1e2e';
  ctx.fillRect(0, 0, W, H);

  const filteredSet = new Set();
  if (mindGraphFilter) {
    const q = mindGraphFilter.toLowerCase();
    mindGraphNodes.forEach((n, i) => {
      if (n.label.toLowerCase().includes(q)) filteredSet.add(i);
    });
  }
  const hasFilter = mindGraphFilter && filteredSet.size > 0;

  // Edges
  mindGraphEdges.forEach(({ source, target, type }) => {
    const a = mindGraphNodes[source], b = mindGraphNodes[target];
    if (!a || !b) return;
    const dimmed = hasFilter && !filteredSet.has(source) && !filteredSet.has(target);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = dimmed ? 'rgba(99,102,119,0.1)' : 'rgba(99,102,119,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
  });

  // Nodes
  mindGraphNodes.forEach((n, i) => {
    const isH = n === mindGraphHovered;
    const isS = n === mindGraphSelected;
    const dimmed = hasFilter && !filteredSet.has(i);
    const r = n.r + (isH ? 4 : 0);

    if ((n.glow || isS) && !dimmed) {
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
    ctx.fillStyle = dimmed ? (n.hex || '#cba6f7') + '30' : (n.hex || '#cba6f7');
    ctx.fill();
    ctx.strokeStyle = isS ? '#fff' : dimmed ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.25)';
    ctx.lineWidth = isS ? 2 : 1;
    ctx.stroke();

    if (!dimmed) {
      ctx.fillStyle = isH ? '#fff' : 'rgba(205,214,244,0.8)';
      ctx.font = `${isH ? '12px' : '10px'} sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(n.label.substring(0, 20), n.x, n.y + r + 12);
    }
  });
}

function graphHitTest(mx, my) {
  const pad = window.innerWidth <= 768 ? 22 : 6;
  for (let i = mindGraphNodes.length - 1; i >= 0; i--) {
    const n = mindGraphNodes[i];
    const dx = mx - n.x, dy = my - n.y;
    if (dx * dx + dy * dy < (n.r + pad) * (n.r + pad)) return n;
  }
  return null;
}

function graphOnMouseMove(e) {
  const rect = mindGraphCanvas.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  if (mindGraphDragging) {
    mindGraphDragging.x = mx; mindGraphDragging.y = my;
    mindGraphDragging.vx = 0; mindGraphDragging.vy = 0;
    if (mindGraphSettled) drawMindGraph();
    return;
  }
  mindGraphHovered = graphHitTest(mx, my);
  mindGraphCanvas.style.cursor = mindGraphHovered ? 'pointer' : 'grab';

  // Tooltip for edge type on hover
  const tip = document.getElementById('mind-graph-tooltip');
  if (mindGraphHovered && tip) {
    tip.textContent = mindGraphHovered.label;
    tip.style.left = (mx + 14) + 'px';
    tip.style.top = (my - 8) + 'px';
    tip.classList.remove('hidden');
  } else if (tip) {
    tip.classList.add('hidden');
  }

  // Show edge label on hover
  if (mindGraphHovered) {
    const nodeIdx = mindGraphNodes.indexOf(mindGraphHovered);
    const hoveredEdges = mindGraphEdges.filter(e => e.source === nodeIdx || e.target === nodeIdx);
    if (hoveredEdges.length && tip) {
      const conns = hoveredEdges.map(e => {
        const other = mindGraphNodes[e.source === nodeIdx ? e.target : e.source];
        return other ? other.label : '';
      }).filter(Boolean).slice(0, 4);
      tip.innerHTML = `<strong>${escHtml(mindGraphHovered.label)}</strong><br><span style="font-size:10px;color:var(--text-muted)">${conns.join(', ')}</span>`;
    }
  }
  if (mindGraphSettled) drawMindGraph();
}

function graphOnMouseDown(e) {
  if (mindGraphLocked) return;
  const rect = mindGraphCanvas.getBoundingClientRect();
  const n = graphHitTest(e.clientX - rect.left, e.clientY - rect.top);
  if (n) { mindGraphDragging = n; mindGraphCanvas.style.cursor = 'grabbing'; }
}

function graphOnMouseUp() {
  if (mindGraphDragging && mindGraphSettled && !mindGraphLocked) {
    mindGraphSettled = false; mindGraphSimTick = 0; mindGraphAlpha = 0.3; runMindGraphSim();
  }
  mindGraphDragging = null;
  mindGraphCanvas.style.cursor = mindGraphLocked ? 'default' : 'grab';
}

function graphOnClick(e) {
  const rect = mindGraphCanvas.getBoundingClientRect();
  const n = graphHitTest(e.clientX - rect.left, e.clientY - rect.top);
  if (n) { mindGraphSelected = n; showGraphNodeDetail(n); }
  else { mindGraphSelected = null; document.getElementById('mind-graph-detail').classList.add('hidden'); }
  if (mindGraphSettled) drawMindGraph();
}

function showGraphNodeDetail(node) {
  const panel = document.getElementById('mind-graph-detail');
  const nodeIdx = mindGraphNodes.indexOf(node);
  const conns = mindGraphEdges
    .filter(e => e.source === nodeIdx || e.target === nodeIdx)
    .map(e => {
      const otherIdx = e.source === nodeIdx ? e.target : e.source;
      const other = mindGraphNodes[otherIdx];
      return other ? { label: other.label, type: e.type || 'link', hex: other.hex } : null;
    })
    .filter(Boolean);

  panel.innerHTML = `
    <button class="graph-detail-close" onclick="document.getElementById('mind-graph-detail').classList.add('hidden');mindGraphSelected=null;if(mindGraphSettled)drawMindGraph()">✕</button>
    <div class="graph-detail-title" style="color:${node.hex}">${escHtml(node.label)}</div>
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">${escHtml(node.folder || '')} · ${conns.length} connections</div>
    ${conns.length ? `<div style="margin-top:10px">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px">Connected to</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px">${conns.slice(0, 10).map(c =>
        `<span class="mind-graph-conn-chip" onclick="openNoteInReader('${escHtml(c.label)}')" style="border-left:2px solid ${c.hex}">${escHtml(c.label)}<span style="font-size:9px;color:var(--text-muted);margin-left:4px">${c.type}</span></span>`
      ).join('')}</div>
    </div>` : ''}
    <button class="mind-graph-open-btn" onclick="openNoteInReader('${escHtml(node.label || node.id)}')">📖 Open in Reader</button>
  `;
  panel.classList.remove('hidden');
}

function filterMindGraph(q) {
  mindGraphFilter = q;
  if (mindGraphSettled) drawMindGraph();
}

function toggleMindGraphLock() {
  mindGraphLocked = !mindGraphLocked;
  const btn = document.getElementById('mind-graph-lock-btn');
  if (btn) {
    btn.textContent = mindGraphLocked ? '🔓 Unlock' : '🔒 Lock';
    btn.classList.toggle('active', mindGraphLocked);
  }
  if (mindGraphLocked) {
    mindGraphNodes.forEach(n => { n.vx = 0; n.vy = 0; });
    mindGraphSettled = true;
    if (mindGraphAnimId) { cancelAnimationFrame(mindGraphAnimId); mindGraphAnimId = null; }
    drawMindGraph();
  }
}

// ═══════════════════════════════════════════════════════════
// TAB 4: READER
// ═══════════════════════════════════════════════════════════

function openNoteInReader(pathOrTitle) {
  if (!pathOrTitle) return;
  mindReaderNote = { path: pathOrTitle, loading: true };
  setMindTab('reader');
  renderMindReader();
  loadNoteContent(pathOrTitle);
}

async function loadNoteContent(pathOrTitle) {
  const container = document.getElementById('mind-reader-content');
  if (!container) return;
  container.innerHTML = '<div class="mind-loading">Loading note...</div>';

  try {
    const bridgeUrl = (typeof Bridge !== 'undefined' && Bridge.baseUrl) ? Bridge.baseUrl : '';

    // Try direct path first
    let resp = await fetch(`${bridgeUrl}/api/vault/note?path=${encodeURIComponent(pathOrTitle)}`);
    if (!resp.ok) {
      // Try search as fallback
      const searchResp = await fetch(`${bridgeUrl}/api/vault/search?q=${encodeURIComponent(extractTitle(pathOrTitle))}&limit=1`);
      const searchResults = await searchResp.json();
      if (searchResults.length > 0) {
        resp = await fetch(`${bridgeUrl}/api/vault/note?path=${encodeURIComponent(searchResults[0].path)}`);
      }
    }

    if (resp.ok) {
      const data = await resp.json();
      mindReaderNote = {
        path: data.path || pathOrTitle,
        content: data.content || '',
        frontmatter: data.frontmatter || {},
        loading: false,
      };
      renderNoteView();
      return;
    }
  } catch { /* fallback */ }

  // Fallback to seed data
  const seedNote = VAULT_NOTES.find(n =>
    n.title.toLowerCase() === extractTitle(pathOrTitle).toLowerCase() ||
    pathOrTitle.toLowerCase().includes(n.title.toLowerCase().replace(/ /g, '-'))
  );

  if (seedNote) {
    mindReaderNote = {
      path: `${seedNote.type}/${seedNote.title}.md`,
      content: seedNote.summary,
      frontmatter: { confidence: seedNote.confidence, tags: seedNote.tags.join(', ') },
      loading: false,
    };
  } else {
    mindReaderNote = {
      path: pathOrTitle,
      content: 'Note not found. The bridge may be offline.',
      frontmatter: {},
      loading: false,
    };
  }
  renderNoteView();
}

function renderMindReader() {
  const container = document.getElementById('mind-reader-content');
  if (!container) return;

  if (!mindReaderNote) {
    container.innerHTML = `<div class="mind-reader-empty">
      <div style="font-size:48px;margin-bottom:12px">📖</div>
      <div style="font-size:16px;font-weight:600;color:var(--text-dim)">No note selected</div>
      <div style="font-size:13px;color:var(--text-muted);margin-top:4px">Click a note from Search, Browse, or Graph to view it here</div>
    </div>`;
    return;
  }

  if (mindReaderNote.loading) {
    container.innerHTML = '<div class="mind-loading">Loading note...</div>';
    return;
  }

  renderNoteView();
}

function renderNoteView() {
  const container = document.getElementById('mind-reader-content');
  if (!container || !mindReaderNote) return;

  const note = mindReaderNote;
  const title = extractTitle(note.path);
  const folder = extractFolder(note.path);
  const fm = note.frontmatter || {};
  const confidence = fm.confidence ? parseInt(fm.confidence) : null;
  const tags = fm.tags ? fm.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
  const rendered = renderBasicMarkdown(note.content || '');

  // Check localStorage for drafts
  const draftKey = `mind_draft_${note.path}`;
  const hasDraft = localStorage.getItem(draftKey);

  container.innerHTML = `
    <div class="mind-reader-header">
      <div class="mind-reader-title">${escHtml(title)}</div>
      <div class="mind-reader-path">${escHtml(folder ? folder + '/' : '')}${escHtml(title)}.md</div>
      ${fm['last-modified'] ? `<div class="mind-reader-modified">Last modified: ${fm['last-modified']}</div>` : ''}
    </div>
    <div class="mind-reader-body-wrap">
      <div class="mind-reader-body">
        <div class="mind-reader-rendered" id="mind-reader-rendered">${rendered}</div>
        <div class="mind-reader-edit-area hidden" id="mind-reader-edit-area">
          <textarea id="mind-reader-edit-textarea" class="mind-reader-textarea">${escHtml(note.content || '')}</textarea>
          <div class="mind-reader-edit-actions">
            <button class="mind-reader-save-btn" onclick="saveDraft()">💾 Save Draft</button>
            <button class="mind-reader-cancel-btn" onclick="cancelEdit()">Cancel</button>
          </div>
        </div>
      </div>
      <div class="mind-reader-sidebar">
        <div class="mind-reader-sidebar-section">
          <div class="mind-reader-sidebar-title">Actions</div>
          <button class="mind-reader-action-btn" onclick="toggleEdit()">✏️ Edit</button>
          ${hasDraft ? '<button class="mind-reader-action-btn" onclick="loadDraft()">📝 Load Draft</button>' : ''}
        </div>
        ${confidence !== null ? `<div class="mind-reader-sidebar-section">
          <div class="mind-reader-sidebar-title">Confidence</div>
          <div class="mind-reader-confidence">
            <div class="mind-reader-confidence-bar">
              <div class="mind-reader-confidence-fill" style="width:${confidence}%;background:${confidence >= 80 ? 'var(--green)' : confidence >= 60 ? 'var(--yellow)' : 'var(--red)'}"></div>
            </div>
            <span>${confidence}%</span>
          </div>
        </div>` : ''}
        ${tags.length ? `<div class="mind-reader-sidebar-section">
          <div class="mind-reader-sidebar-title">Tags</div>
          <div class="mind-reader-tags">${tags.map(t => `<span class="mind-reader-tag">#${escHtml(t)}</span>`).join('')}</div>
        </div>` : ''}
      </div>
    </div>
  `;
}

function toggleEdit() {
  const rendered = document.getElementById('mind-reader-rendered');
  const editArea = document.getElementById('mind-reader-edit-area');
  if (!rendered || !editArea) return;
  const isEditing = !editArea.classList.contains('hidden');
  rendered.classList.toggle('hidden', !isEditing);
  editArea.classList.toggle('hidden', isEditing);
}

function cancelEdit() {
  const rendered = document.getElementById('mind-reader-rendered');
  const editArea = document.getElementById('mind-reader-edit-area');
  if (rendered) rendered.classList.remove('hidden');
  if (editArea) editArea.classList.add('hidden');
}

function saveDraft() {
  if (!mindReaderNote) return;
  const textarea = document.getElementById('mind-reader-edit-textarea');
  if (!textarea) return;
  const draftKey = `mind_draft_${mindReaderNote.path}`;
  localStorage.setItem(draftKey, textarea.value);
  if (typeof toast === 'function') toast('📝 Draft saved to localStorage', 'success');
  cancelEdit();
}

function loadDraft() {
  if (!mindReaderNote) return;
  const draftKey = `mind_draft_${mindReaderNote.path}`;
  const draft = localStorage.getItem(draftKey);
  if (!draft) return;
  mindReaderNote.content = draft;
  renderNoteView();
  toggleEdit();
  const textarea = document.getElementById('mind-reader-edit-textarea');
  if (textarea) textarea.value = draft;
}

// ═══════════════════════════════════════════════════════════
// TAB 5: INSIGHTS
// ═══════════════════════════════════════════════════════════

function initMindInsights() {
  const container = document.getElementById('mind-insights-content');
  if (!container) return;
  container.innerHTML = '<div class="mind-loading">Loading insights...</div>';
  loadInsightsData();
}

async function loadInsightsData() {
  const container = document.getElementById('mind-insights-content');
  if (!container) return;

  let stats = null;
  let recent = [];
  let graphData = null;

  try {
    const bridgeUrl = (typeof Bridge !== 'undefined' && Bridge.baseUrl) ? Bridge.baseUrl : '';
    const [statsResp, recentResp, graphResp] = await Promise.all([
      fetch(`${bridgeUrl}/api/vault/stats`).then(r => r.json()).catch(() => null),
      fetch(`${bridgeUrl}/api/vault/recent?limit=10`).then(r => r.json()).catch(() => []),
      fetch(`${bridgeUrl}/api/vault/graph?limit=200`).then(r => r.json()).catch(() => null),
    ]);
    stats = statsResp;
    recent = recentResp;
    graphData = graphResp;
  } catch { /* fallback below */ }

  // Fallback stats
  if (!stats) {
    stats = {
      totalNotes: VAULT_NOTES.length,
      totalSize: 0,
      categories: {},
    };
    VAULT_NOTES.forEach(n => {
      stats.categories[n.type] = (stats.categories[n.type] || 0) + 1;
    });
  }

  // Compute graph stats
  const totalLinks = graphData ? (graphData.edges || []).length : GEDGES.length;
  const totalGraphNodes = graphData ? (graphData.nodes || []).length : GNODES.length;
  const avgLinks = totalGraphNodes > 0 ? (totalLinks * 2 / totalGraphNodes).toFixed(1) : '0';

  // Find orphan nodes (no edges)
  let orphanCount = 0;
  if (graphData && graphData.nodes) {
    const connected = new Set();
    (graphData.edges || []).forEach(e => { connected.add(e.source); connected.add(e.target); });
    orphanCount = graphData.nodes.filter(n => !connected.has(n.id)).length;
  }

  // Stale notes (>30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const staleCount = recent.length > 0 ? 0 : VAULT_NOTES.filter(n => new Date(n.date) < thirtyDaysAgo).length;

  // Growth data from recent notes — simple bar chart by week
  const weekBuckets = {};
  (recent.length > 0 ? recent : VAULT_NOTES.map(n => ({ modified: n.date }))).forEach(n => {
    const d = new Date(n.modified || n.date);
    const weekStart = new Date(d);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const key = weekStart.toISOString().split('T')[0];
    weekBuckets[key] = (weekBuckets[key] || 0) + 1;
  });

  // Knowledge gaps (from categories with few notes)
  const gapThreshold = 5;
  const gaps = Object.entries(stats.categories || {})
    .map(([cat, count]) => ({ cat, count }))
    .sort((a, b) => a.count - b.count);

  // Contradictions (seed data — would come from ~/dispatch/proposals/)
  const contradictions = [
    { noteA: 'Token Budget Strategy', noteB: 'Rate Limiting Mitigation', issue: 'Budget says 100K/day but rate limiter uses 3-concurrent which may exceed' },
    { noteA: 'Session Watchdog Spec', noteB: 'Cron Scheduler Design', issue: 'Watchdog heartbeat is 2min but watchdog spec says restart after 30s backoff — timing conflict' },
  ];

  container.innerHTML = `
    <div class="mind-insights-stats">
      <div class="mind-insight-stat">
        <div class="mind-insight-stat-num">${stats.totalNotes}</div>
        <div class="mind-insight-stat-label">Total Notes</div>
      </div>
      <div class="mind-insight-stat">
        <div class="mind-insight-stat-num">${totalLinks}</div>
        <div class="mind-insight-stat-label">Total Links</div>
      </div>
      <div class="mind-insight-stat">
        <div class="mind-insight-stat-num">${avgLinks}</div>
        <div class="mind-insight-stat-label">Avg Links/Note</div>
      </div>
      <div class="mind-insight-stat">
        <div class="mind-insight-stat-num">${orphanCount}</div>
        <div class="mind-insight-stat-label">Orphan Notes</div>
      </div>
      <div class="mind-insight-stat">
        <div class="mind-insight-stat-num">${staleCount}</div>
        <div class="mind-insight-stat-label">Stale (&gt;30d)</div>
      </div>
      <div class="mind-insight-stat">
        <div class="mind-insight-stat-num">${stats.totalSize ? formatSize(stats.totalSize) : '—'}</div>
        <div class="mind-insight-stat-label">Vault Size</div>
      </div>
    </div>

    <div class="mind-insights-section">
      <h3>📊 Recent Activity</h3>
      <div class="mind-insights-recent">
        ${(recent.length > 0 ? recent : VAULT_NOTES.slice(0, 10).map(n => ({ path: n.type + '/' + n.title + '.md', modified: n.date }))).map(n => {
          const title = extractTitle(n.path || '');
          const relTime = n.modified ? timeAgo(new Date(n.modified)) : '';
          return `<div class="mind-insights-recent-item" onclick="openNoteInReader('${escHtml(n.path || '')}')">
            <span class="mind-insights-recent-title">${escHtml(title)}</span>
            <span class="mind-insights-recent-time">${relTime}</span>
          </div>`;
        }).join('')}
      </div>
    </div>

    <div class="mind-insights-section">
      <h3>⚠️ Contradictions</h3>
      ${contradictions.map(c => `
        <div class="mind-insights-contradiction">
          <div class="mind-insights-contradiction-notes">
            <span class="mind-insights-contradiction-note" onclick="openNoteInReader('${escHtml(c.noteA)}')">${escHtml(c.noteA)}</span>
            <span style="color:var(--text-muted)">vs</span>
            <span class="mind-insights-contradiction-note" onclick="openNoteInReader('${escHtml(c.noteB)}')">${escHtml(c.noteB)}</span>
          </div>
          <div class="mind-insights-contradiction-issue">${escHtml(c.issue)}</div>
          <button class="mind-insights-resolve-btn" onclick="this.textContent='✅ Noted';this.disabled=true">🔍 Review</button>
        </div>
      `).join('')}
    </div>

    <div class="mind-insights-section">
      <h3>🏷️ Knowledge Coverage</h3>
      <div class="mind-insights-gaps">
        ${gaps.map(g => {
          const color = g.count < gapThreshold ? 'var(--red)' : g.count < 15 ? 'var(--yellow)' : 'var(--green)';
          return `<span class="mind-insights-gap-tag" style="border-left:3px solid ${color}">${escHtml(g.cat)} <strong>${g.count}</strong></span>`;
        }).join('')}
      </div>
    </div>

    <div class="mind-insights-section">
      <h3>📈 Growth</h3>
      <div class="mind-insights-growth-chart">
        ${Object.entries(weekBuckets).sort((a, b) => a[0].localeCompare(b[0])).slice(-8).map(([week, count]) => {
          const maxCount = Math.max(...Object.values(weekBuckets), 1);
          const pct = (count / maxCount) * 100;
          return `<div class="mind-insights-growth-bar-wrap">
            <div class="mind-insights-growth-bar" style="height:${Math.max(pct, 5)}%"></div>
            <div class="mind-insights-growth-label">${week.slice(5)}</div>
            <div class="mind-insights-growth-count">${count}</div>
          </div>`;
        }).join('')}
      </div>
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════

function extractTitle(path) {
  if (!path) return 'Untitled';
  const parts = path.split('/');
  const filename = parts[parts.length - 1];
  return filename.replace(/\.md$/i, '').replace(/[-_]/g, ' ');
}

function extractFolder(path) {
  if (!path) return '';
  const parts = path.split('/');
  return parts.length > 1 ? parts.slice(0, -1).join('/') : '';
}

function escHtml(s) {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function timeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return Math.floor(seconds / 60) + 'm ago';
  if (seconds < 86400) return Math.floor(seconds / 3600) + 'h ago';
  if (seconds < 604800) return Math.floor(seconds / 86400) + 'd ago';
  return date.toLocaleDateString();
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + 'KB';
  return (bytes / 1048576).toFixed(1) + 'MB';
}

function renderBasicMarkdown(text) {
  if (!text) return '<p style="color:var(--text-muted)">No content</p>';
  let html = escHtml(text);

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="mind-md-code"><code>$2</code></pre>');
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="mind-md-inline">$1</code>');
  // Headers
  html = html.replace(/^#### (.+)$/gm, '<h4 class="mind-md-h4">$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3 class="mind-md-h3">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="mind-md-h2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="mind-md-h1">$1</h1>');
  // Bold/italic
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // Lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\s*<ul>/g, '');
  // Wikilinks
  html = html.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) =>
    `<a class="mind-wikilink" onclick="openNoteInReader('${escHtml(target)}')">${escHtml(label || target)}</a>`
  );
  // Regular links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  // Paragraphs
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';
  // Clean empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '');
  html = html.replace(/<p>(<h[1-4])/g, '$1');
  html = html.replace(/(<\/h[1-4]>)<\/p>/g, '$1');
  html = html.replace(/<p>(<pre)/g, '$1');
  html = html.replace(/(<\/pre>)<\/p>/g, '$1');
  html = html.replace(/<p>(<ul>)/g, '$1');
  html = html.replace(/(<\/ul>)<\/p>/g, '$1');

  return html;
}

// ═══════════════════════════════════════════════════════════
// COMPATIBILITY — bridge old function names to new system
// ═══════════════════════════════════════════════════════════

function searchMind(query) {
  // Called from app.js omnibus search
  if (query) {
    const input = document.getElementById("mind-search-input");
    if (input) input.value = query;
    setMindTab("search");
    doMindSearch();
  }
}

// Legacy setMindMode — redirect to tab system
function setMindMode(mode) {
  if (mode === "graph") setMindTab("graph");
  else if (mode === "cards") setMindTab("search");
  else if (mode === "timeline") setMindTab("insights");
}


// Override openVaultNote after all scripts load
document.addEventListener('DOMContentLoaded', () => {
  const _origOpenVaultNote = window.openVaultNote;
  window.openVaultNote = function(note) {
    if (note && note.title) {
      nav('mind');
      openNoteInReader(note.type + '/' + note.title + '.md');
    } else if (_origOpenVaultNote) {
      _origOpenVaultNote(note);
    }
  };
});

