/* Agent OS v7 — mind.js — Complete Mind Page (Search, Browse, Tags, Graph, Reader, Insights) */
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
let mindTagsData = null;
let mindTagsExpanded = false;
let mindFolderTreeData = null;
let mindReaderEditing = false;

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

const TAG_CATEGORY_COLORS = {
  'research': '#89b4fa',
  'agents': '#cba6f7',
  'system': '#fab387',
  'architecture': '#cba6f7',
  'projects': '#f9e2af',
  'operations': '#fab387',
  'code': '#a6e3a1',
  'vision': '#f5c2e7',
};

function getFolderColor(folder) {
  if (!folder) return '#6c7086';
  const top = folder.split('/')[0];
  return FOLDER_COLORS[top] || '#6c7086';
}

function getTagColor(tag) {
  const t = tag.toLowerCase();
  for (const [cat, color] of Object.entries(TAG_CATEGORY_COLORS)) {
    if (t.includes(cat)) return color;
  }
  return '#6c7086';
}

function getBridgeUrl() {
  return (typeof Bridge !== 'undefined' && Bridge.baseUrl) ? Bridge.baseUrl : '';
}

// ═══════════════════════════════════════════════════════════
// INIT + TAB NAVIGATION
// ═══════════════════════════════════════════════════════════

function initMind() {
  setMindTab(mindTab);
}

function setMindTab(tab) {
  mindTab = tab;
  document.querySelectorAll('.mind-tab-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  document.querySelectorAll('.mind-tab-panel').forEach(p => {
    p.classList.toggle('hidden', p.id !== `mind-panel-${tab}`);
    p.classList.toggle('active', p.id === `mind-panel-${tab}`);
  });
  switch (tab) {
    case 'search': initMindSearch(); break;
    case 'browse': initMindBrowse(); break;
    case 'tags': initMindTags(); break;
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

  mindRecentSearches = [q, ...mindRecentSearches.filter(s => s !== q)].slice(0, 8);
  localStorage.setItem('mind_recent_searches', JSON.stringify(mindRecentSearches));
  renderRecentSearches();

  const results = document.getElementById('mind-search-results');
  const stats = document.getElementById('mind-search-stats');
  results.innerHTML = '<div class="mind-loading">Searching...</div>';
  if (stats) stats.textContent = '';

  const startTime = performance.now();

  fetch(`${getBridgeUrl()}/api/vault/search?q=${encodeURIComponent(q)}&limit=30`)
    .then(r => r.json())
    .then(data => {
      const elapsed = Math.round(performance.now() - startTime);
      mindSearchResults = data;
      if (stats) stats.textContent = `Found ${data.length} notes in ${elapsed}ms`;
      renderSearchResults(data);
    })
    .catch(() => {
      const filtered = (typeof VAULT_NOTES !== 'undefined' ? VAULT_NOTES : []).filter(n =>
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
  if (!mindRecentSearches.length) { container.innerHTML = ''; return; }
  container.innerHTML = `<div class="mind-recent-label">Recent searches</div>
    <div class="mind-recent-chips">${mindRecentSearches.map(s =>
      `<button class="mind-recent-chip" onclick="document.getElementById('mind-search-input').value='${escHtml(s)}';doMindSearch()">${escHtml(s)}</button>`
    ).join('')}</div>`;
}

function handleMindSearchKey(e) {
  if (e.key === 'Enter') doMindSearch();
}

// ═══════════════════════════════════════════════════════════
// TAB 2: BROWSE (Enhanced with /api/vault/folders)
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
    // Try real folder tree endpoint first
    const foldersResp = await fetch(`${getBridgeUrl()}/api/vault/folders`);
    const folders = await foldersResp.json();
    mindFolderTreeData = folders;
    renderFolderTree(folders);

    // Also load recent notes for the list panel
    const notesResp = await fetch(`${getBridgeUrl()}/api/vault/recent?limit=100`);
    const notes = await notesResp.json();
    mindBrowseNotes = notes;
    buildFolderNoteIndex(notes);
  } catch {
    // Fallback to old method
    try {
      const resp = await fetch(`${getBridgeUrl()}/api/vault/recent?limit=100`);
      const notes = await resp.json();
      mindBrowseNotes = notes;
      buildFolderTree(notes);
    } catch {
      mindBrowseNotes = (typeof VAULT_NOTES !== 'undefined' ? VAULT_NOTES : []).map(n => ({
        path: `${n.type}/${n.title.replace(/ /g, '-')}.md`,
        modified: n.date + 'T00:00:00Z',
        size: 0,
      }));
      buildFolderTree(mindBrowseNotes);
    }
  }
}

function renderFolderTree(folders) {
  const tree = document.getElementById('mind-browse-tree');
  if (!tree) return;

  // folders is expected to be an array or tree structure from /api/vault/folders
  // Handle both array-of-objects and flat formats
  if (Array.isArray(folders)) {
    tree.innerHTML = folders.map(f => {
      const name = f.name || f.path || f;
      const count = f.count || f.noteCount || 0;
      const color = getFolderColor(name);
      const children = f.children || [];
      return `<div class="mind-folder-item">
        <div class="mind-folder-header" onclick="selectBrowseFolderByPath('${escHtml(typeof name === 'string' ? name : '')}')" style="border-left: 3px solid ${color}">
          <span class="mind-folder-icon">📂</span>
          <span class="mind-folder-name">${escHtml(typeof name === 'string' ? name : '')}</span>
          <span class="mind-folder-count">${count}</span>
        </div>
        ${children.map(c => {
          const cName = c.name || c.path || c;
          const cCount = c.count || c.noteCount || 0;
          return `<div class="mind-subfolder" onclick="selectBrowseFolderByPath('${escHtml(typeof cName === 'string' ? cName : '')}')" style="padding-left:32px">
            <span class="mind-folder-icon" style="font-size:12px">📁</span>
            <span class="mind-folder-name">${escHtml(typeof cName === 'string' ? cName.split('/').pop() : '')}</span>
            <span class="mind-folder-count">${cCount}</span>
          </div>`;
        }).join('')}
      </div>`;
    }).join('');
  } else {
    tree.innerHTML = '<div class="mind-empty">No folders found</div>';
  }
}

function buildFolderNoteIndex(notes) {
  mindBrowseFolders = {};
  notes.forEach(n => {
    const parts = (n.path || '').split('/');
    const folder = parts.length > 1 ? parts.slice(0, -1).join('/') : 'root';
    if (!mindBrowseFolders[folder]) mindBrowseFolders[folder] = [];
    mindBrowseFolders[folder].push(n);
  });
}

function selectBrowseFolderByPath(folderPath) {
  if (!folderPath) return;
  mindSelectedFolder = folderPath;

  // Highlight
  document.querySelectorAll('.mind-folder-header, .mind-subfolder').forEach(el => {
    el.classList.remove('selected');
  });
  event?.target?.closest?.('.mind-folder-header, .mind-subfolder')?.classList.add('selected');

  // Fetch notes for this folder
  const list = document.getElementById('mind-browse-list');
  if (!list) return;
  list.innerHTML = '<div class="mind-loading">Loading notes...</div>';

  fetch(`${getBridgeUrl()}/api/vault/search?q=path:${encodeURIComponent(folderPath)}&limit=50`)
    .then(r => r.json())
    .then(notes => {
      renderBrowseNoteList(folderPath, notes);
    })
    .catch(() => {
      // Fallback: filter from loaded notes
      let notes = [];
      Object.keys(mindBrowseFolders).forEach(f => {
        if (f === folderPath || f.startsWith(folderPath + '/')) {
          notes = notes.concat(mindBrowseFolders[f]);
        }
      });
      renderBrowseNoteList(folderPath, notes);
    });
}

function renderBrowseNoteList(folder, notes) {
  const list = document.getElementById('mind-browse-list');
  if (!list) return;
  if (!notes.length) {
    list.innerHTML = '<div class="mind-empty">No notes in this folder</div>';
    return;
  }

  switch (mindBrowseSort) {
    case 'name': notes.sort((a, b) => extractTitle(a.path || a.title || '').localeCompare(extractTitle(b.path || b.title || ''))); break;
    case 'size': notes.sort((a, b) => (b.size || 0) - (a.size || 0)); break;
    default: notes.sort((a, b) => new Date(b.modified || 0) - new Date(a.modified || 0));
  }

  list.innerHTML = `<div class="mind-browse-sort-row">
    <span class="mind-browse-folder-title">📂 ${escHtml(folder)} <span style="color:var(--text-muted);font-weight:400">(${notes.length})</span></span>
    <select class="mind-browse-sort-select" onchange="mindBrowseSort=this.value;selectBrowseFolderByPath('${escHtml(folder)}')">
      <option value="modified"${mindBrowseSort === 'modified' ? ' selected' : ''}>Modified</option>
      <option value="name"${mindBrowseSort === 'name' ? ' selected' : ''}>Name</option>
      <option value="size"${mindBrowseSort === 'size' ? ' selected' : ''}>Size</option>
    </select>
  </div>` +
  notes.map(n => {
    const path = n.path || '';
    const title = extractTitle(path || n.title || '');
    const relTime = n.modified ? mindTimeAgo(new Date(n.modified)) : '';
    const size = n.size ? formatSize(n.size) : '';
    return `<div class="mind-browse-note" onclick="openNoteInReader('${escHtml(path)}')">
      <div class="mind-browse-note-title">${escHtml(title)}</div>
      <div class="mind-browse-note-meta">
        ${relTime ? `<span>${relTime}</span>` : ''}
        ${size ? `<span>· ${size}</span>` : ''}
        <span style="color:${getFolderColor(path)}">${escHtml(extractFolder(path))}</span>
      </div>
    </div>`;
  }).join('');
}

function buildFolderTree(notes) {
  buildFolderNoteIndex(notes);

  const tree = document.getElementById('mind-browse-tree');
  if (!tree) return;

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

  if (sorted.length > 0 && !mindSelectedFolder) {
    selectBrowseFolder(sorted[0][0]);
  }
}

function selectBrowseFolder(folder) {
  mindSelectedFolder = folder;
  document.querySelectorAll('.mind-folder-header, .mind-subfolder').forEach(el => {
    el.classList.remove('selected');
  });
  const headers = document.querySelectorAll('.mind-folder-header, .mind-subfolder');
  headers.forEach(el => {
    if (el.textContent.includes(folder.split('/').pop())) {
      el.classList.add('selected');
    }
  });

  let notes = [];
  Object.keys(mindBrowseFolders).forEach(f => {
    if (f === folder || f.startsWith(folder + '/')) {
      notes = notes.concat(mindBrowseFolders[f]);
    }
  });

  renderBrowseNoteList(folder, notes);
}

// ═══════════════════════════════════════════════════════════
// TAB 3: TAGS (NEW — /api/vault/tags)
// ═══════════════════════════════════════════════════════════

async function initMindTags() {
  const container = document.getElementById('mind-tags-content');
  if (!container) return;
  if (mindTagsData) { renderTagCloud(mindTagsData); return; }

  container.innerHTML = '<div class="mind-loading">Loading tags...</div>';

  try {
    const resp = await fetch(`${getBridgeUrl()}/api/vault/tags`);
    const data = await resp.json();
    mindTagsData = Array.isArray(data) ? data : (data.tags || []);
    renderTagCloud(mindTagsData);
  } catch {
    container.innerHTML = '<div class="mind-empty">Could not load tags. Bridge may be offline.</div>';
  }
}

function renderTagCloud(tags) {
  const container = document.getElementById('mind-tags-content');
  if (!container) return;

  if (!tags.length) {
    container.innerHTML = '<div class="mind-empty">No tags found in vault</div>';
    return;
  }

  // Sort by count descending
  const sorted = [...tags].sort((a, b) => (b.count || 0) - (a.count || 0));
  const maxCount = sorted[0]?.count || 1;
  const showAll = mindTagsExpanded;
  const displayTags = showAll ? sorted : sorted.slice(0, 20);

  const totalTags = sorted.length;
  const totalNotes = sorted.reduce((sum, t) => sum + (t.count || 0), 0);

  container.innerHTML = `
    <div class="mind-tags-header">
      <div class="mind-tags-stats">
        <span class="mind-tags-stat"><strong>${totalTags}</strong> tags</span>
        <span class="mind-tags-stat"><strong>${totalNotes}</strong> tagged notes</span>
      </div>
    </div>
    <div class="mind-tag-cloud">
      ${displayTags.map(t => {
        const name = t.tag || t.name || t;
        const count = t.count || 0;
        const ratio = count / maxCount;
        const fontSize = Math.max(12, Math.min(32, 12 + ratio * 20));
        const color = getTagColor(typeof name === 'string' ? name : '');
        return `<span class="mind-tag-cloud-item" 
          style="font-size:${fontSize}px;color:${color}" 
          onclick="searchByTag('${escHtml(typeof name === 'string' ? name : '')}')"
          title="${count} notes">#${escHtml(typeof name === 'string' ? name : '')} <sup style="font-size:10px;opacity:0.6">${count}</sup></span>`;
      }).join('')}
    </div>
    ${totalTags > 20 ? `<div class="mind-tags-expand">
      <button class="mind-tags-expand-btn" onclick="mindTagsExpanded=!mindTagsExpanded;renderTagCloud(mindTagsData)">
        ${showAll ? '▲ Show top 20' : `▼ Show all ${totalTags} tags`}
      </button>
    </div>` : ''}
  `;
}

function searchByTag(tag) {
  const input = document.getElementById('mind-search-input');
  if (input) input.value = `tag:${tag}`;
  setMindTab('search');
  doMindSearch();
}

// ═══════════════════════════════════════════════════════════
// TAB 4: GRAPH (Enhanced with /api/vault/graph REAL data)
// ═══════════════════════════════════════════════════════════

function initMindGraph() {
  mindGraphCanvas = document.getElementById('mind-graph-canvas');
  if (!mindGraphCanvas) return;
  mindGraphCtx = mindGraphCanvas.getContext('2d');

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

  loadGraphData().then(() => {
    setupGraphInteraction();
    startGraphSim();
  });
}

async function loadGraphData() {
  const W = mindGraphCanvas.width;
  const H = mindGraphCanvas.height;

  try {
    const resp = await fetch(`${getBridgeUrl()}/api/vault/graph`);
    const data = await resp.json();

    if (data.nodes && data.nodes.length > 0) {
      // Count edges per node for sizing
      const edgeCounts = {};
      (data.edges || []).forEach(e => {
        edgeCounts[e.source] = (edgeCounts[e.source] || 0) + 1;
        edgeCounts[e.target] = (edgeCounts[e.target] || 0) + 1;
      });

      mindGraphNodes = data.nodes.map((n, i) => {
        const id = n.id || n.path || i;
        const folder = n.category || n.folder || extractFolder(id);
        const linkCount = edgeCounts[id] || 0;
        return {
          id: id,
          label: n.title || extractTitle(id),
          folder: folder,
          hex: getFolderColor(folder),
          x: W / 2 + (Math.random() - 0.5) * 300,
          y: H / 2 + (Math.random() - 0.5) * 200,
          vx: 0, vy: 0,
          r: Math.min(8 + linkCount * 1.5, 22),
          linkCount: linkCount,
        };
      });

      const idMap = {};
      mindGraphNodes.forEach((n, i) => { idMap[n.id] = i; });

      mindGraphEdges = (data.edges || []).map(e => {
        const sourceId = e.source;
        const targetId = e.target;
        return {
          source: idMap[sourceId],
          target: idMap[targetId],
          type: e.type || 'link',
          weight: e.weight || 1,
        };
      }).filter(e => e.source !== undefined && e.target !== undefined);
      return;
    }
  } catch { /* fallback */ }

  // Fallback to seed data
  if (typeof GNODES !== 'undefined') {
    mindGraphNodes = GNODES.map(n => ({
      ...n,
      label: n.label,
      folder: n.type,
      hex: n.hex || getFolderColor(n.type),
      x: W / 2 + (Math.random() - 0.5) * 200,
      y: H / 2 + (Math.random() - 0.5) * 150,
      vx: 0, vy: 0,
      r: n.size || 12,
      linkCount: 0,
    }));
    mindGraphEdges = (typeof GEDGES !== 'undefined' ? GEDGES : []).map(([a, b]) => ({ source: a, target: b, type: 'link', weight: 1 }));
  }
}

function setupGraphInteraction() {
  mindGraphCanvas.onmousemove = graphOnMouseMove;
  mindGraphCanvas.onmousedown = graphOnMouseDown;
  mindGraphCanvas.onmouseup = graphOnMouseUp;
  mindGraphCanvas.onclick = graphOnClick;

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

  mindGraphAlpha *= 0.95;

  mindGraphNodes.forEach(n => { n.fx = 0; n.fy = 0; });

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

  mindGraphEdges.forEach(({ source, target, weight }) => {
    const a = mindGraphNodes[source], b = mindGraphNodes[target];
    if (!a || !b) return;
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.sqrt(dx * dx + dy * dy) || 1;
    const force = (d * d) / k * 0.08 * mindGraphAlpha;
    const fx = (dx / d) * force, fy = (dy / d) * force;
    a.fx += fx; a.fy += fy;
    b.fx -= fx; b.fy -= fy;
  });

  mindGraphNodes.forEach(n => {
    n.fx += (W / 2 - n.x) * 0.08 * mindGraphAlpha;
    n.fy += (H / 2 - n.y) * 0.08 * mindGraphAlpha;
  });

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

  // Edges with thickness by weight
  mindGraphEdges.forEach(({ source, target, type, weight }) => {
    const a = mindGraphNodes[source], b = mindGraphNodes[target];
    if (!a || !b) return;
    const dimmed = hasFilter && !filteredSet.has(source) && !filteredSet.has(target);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.strokeStyle = dimmed ? 'rgba(99,102,119,0.1)' : 'rgba(99,102,119,0.35)';
    ctx.lineWidth = Math.min((weight || 1) * 0.8, 4);
    ctx.stroke();
  });

  // Nodes colored by folder
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

  const tip = document.getElementById('mind-graph-tooltip');
  if (mindGraphHovered && tip) {
    const nodeIdx = mindGraphNodes.indexOf(mindGraphHovered);
    const hoveredEdges = mindGraphEdges.filter(e => e.source === nodeIdx || e.target === nodeIdx);
    const conns = hoveredEdges.map(e => {
      const other = mindGraphNodes[e.source === nodeIdx ? e.target : e.source];
      return other ? other.label : '';
    }).filter(Boolean).slice(0, 4);
    tip.innerHTML = `<strong>${escHtml(mindGraphHovered.label)}</strong>` +
      (conns.length ? `<br><span style="font-size:10px;color:var(--text-muted)">${conns.join(', ')}</span>` : '');
    tip.style.left = (mx + 14) + 'px';
    tip.style.top = (my - 8) + 'px';
    tip.classList.remove('hidden');
  } else if (tip) {
    tip.classList.add('hidden');
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
      return other ? { label: other.label, type: e.type || 'link', hex: other.hex, id: other.id } : null;
    })
    .filter(Boolean);

  panel.innerHTML = `
    <button class="graph-detail-close" onclick="document.getElementById('mind-graph-detail').classList.add('hidden');mindGraphSelected=null;if(mindGraphSettled)drawMindGraph()">✕</button>
    <div class="graph-detail-title" style="color:${node.hex}">${escHtml(node.label)}</div>
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px">${escHtml(node.folder || '')} · ${conns.length} connections</div>
    ${conns.length ? `<div style="margin-top:10px">
      <div style="font-size:10px;font-weight:700;text-transform:uppercase;color:var(--text-muted);margin-bottom:6px">Connected to</div>
      <div style="display:flex;flex-wrap:wrap;gap:4px">${conns.slice(0, 10).map(c =>
        `<span class="mind-graph-conn-chip" onclick="openNoteInReader('${escHtml(c.id || c.label)}')" style="border-left:2px solid ${c.hex}">${escHtml(c.label)}<span style="font-size:9px;color:var(--text-muted);margin-left:4px">${c.type}</span></span>`
      ).join('')}</div>
    </div>` : ''}
    <button class="mind-graph-open-btn" onclick="openNoteInReader('${escHtml(node.id || node.label)}')">📖 Open in Reader</button>
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
// TAB 5: READER (Enhanced with backlinks + editing)
// ═══════════════════════════════════════════════════════════

function openNoteInReader(pathOrTitle) {
  if (!pathOrTitle) return;
  mindReaderNote = { path: pathOrTitle, loading: true };
  mindReaderEditing = false;
  setMindTab('reader');
  renderMindReader();
  loadNoteContent(pathOrTitle);
}

async function loadNoteContent(pathOrTitle) {
  const container = document.getElementById('mind-reader-content');
  if (!container) return;
  container.innerHTML = '<div class="mind-loading">Loading note...</div>';

  try {
    let resp = await fetch(`${getBridgeUrl()}/api/vault/note?path=${encodeURIComponent(pathOrTitle)}`);
    if (!resp.ok) {
      const searchResp = await fetch(`${getBridgeUrl()}/api/vault/search?q=${encodeURIComponent(extractTitle(pathOrTitle))}&limit=1`);
      const searchResults = await searchResp.json();
      if (searchResults.length > 0) {
        resp = await fetch(`${getBridgeUrl()}/api/vault/note?path=${encodeURIComponent(searchResults[0].path)}`);
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
      // Load backlinks
      loadBacklinks(mindReaderNote.path);
      return;
    }
  } catch { /* fallback */ }

  // Fallback to seed data
  const seedNote = (typeof VAULT_NOTES !== 'undefined' ? VAULT_NOTES : []).find(n =>
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

async function loadBacklinks(path) {
  const backlinkContainer = document.getElementById('mind-reader-backlinks');
  if (!backlinkContainer) return;

  try {
    const resp = await fetch(`${getBridgeUrl()}/api/vault/backlinks/${encodeURIComponent(path)}`);
    if (!resp.ok) throw new Error('not ok');
    const data = await resp.json();
    const backlinks = Array.isArray(data) ? data : (data.backlinks || []);

    if (backlinks.length === 0) {
      backlinkContainer.innerHTML = '<div style="font-size:12px;color:var(--text-muted);padding:8px 0">No backlinks found</div>';
      return;
    }

    backlinkContainer.innerHTML = `
      <div class="mind-backlinks-header">← ${backlinks.length} note${backlinks.length !== 1 ? 's' : ''} link here</div>
      <div class="mind-backlinks-list">
        ${backlinks.map(bl => {
          const blPath = bl.path || bl.source || bl;
          const blTitle = bl.title || extractTitle(typeof blPath === 'string' ? blPath : '');
          return `<div class="mind-backlink-item" onclick="openNoteInReader('${escHtml(typeof blPath === 'string' ? blPath : '')}')">
            <span class="mind-backlink-icon">🔗</span>
            <span class="mind-backlink-title">${escHtml(blTitle)}</span>
          </div>`;
        }).join('')}
      </div>
    `;
  } catch {
    backlinkContainer.innerHTML = '';
  }
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
            <button class="mind-reader-save-btn" onclick="saveNoteToVault()">💾 Save to Vault</button>
            <button class="mind-reader-cancel-btn" onclick="cancelEdit()">Cancel</button>
          </div>
        </div>
        <div id="mind-reader-backlinks" class="mind-reader-backlinks-section"></div>
      </div>
      <div class="mind-reader-sidebar">
        <div class="mind-reader-sidebar-section">
          <div class="mind-reader-sidebar-title">Actions</div>
          <button class="mind-reader-action-btn" onclick="toggleEdit()">✏️ Edit</button>
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
          <div class="mind-reader-tags">${tags.map(t => `<span class="mind-reader-tag" onclick="searchByTag('${escHtml(t)}')" style="cursor:pointer">#${escHtml(t)}</span>`).join('')}</div>
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
  mindReaderEditing = !isEditing;
}

function cancelEdit() {
  const rendered = document.getElementById('mind-reader-rendered');
  const editArea = document.getElementById('mind-reader-edit-area');
  if (rendered) rendered.classList.remove('hidden');
  if (editArea) editArea.classList.add('hidden');
  mindReaderEditing = false;
}

async function saveNoteToVault() {
  if (!mindReaderNote || !mindReaderNote.path) return;
  const textarea = document.getElementById('mind-reader-edit-textarea');
  if (!textarea) return;

  const content = textarea.value;

  try {
    const resp = await fetch(`${getBridgeUrl()}/api/vault/note/${encodeURIComponent(mindReaderNote.path)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });

    if (resp.ok) {
      mindReaderNote.content = content;
      cancelEdit();
      renderNoteView();
      if (typeof toast === 'function') toast('✅ Note saved to vault', 'success');
    } else {
      if (typeof toast === 'function') toast('❌ Failed to save note', 'error');
    }
  } catch {
    if (typeof toast === 'function') toast('❌ Bridge error — could not save', 'error');
  }
}

// ═══════════════════════════════════════════════════════════
// TAB 6: INSIGHTS
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
    const [statsResp, recentResp, graphResp] = await Promise.all([
      fetch(`${getBridgeUrl()}/api/vault/stats`).then(r => r.json()).catch(() => null),
      fetch(`${getBridgeUrl()}/api/vault/recent?limit=10`).then(r => r.json()).catch(() => []),
      fetch(`${getBridgeUrl()}/api/vault/graph`).then(r => r.json()).catch(() => null),
    ]);
    stats = statsResp;
    recent = recentResp;
    graphData = graphResp;
  } catch { /* fallback below */ }

  if (!stats) {
    stats = {
      totalNotes: (typeof VAULT_NOTES !== 'undefined' ? VAULT_NOTES.length : 0),
      totalSize: 0,
      categories: {},
    };
    if (typeof VAULT_NOTES !== 'undefined') {
      VAULT_NOTES.forEach(n => {
        stats.categories[n.type] = (stats.categories[n.type] || 0) + 1;
      });
    }
  }

  const totalLinks = graphData ? (graphData.edges || []).length : (typeof GEDGES !== 'undefined' ? GEDGES.length : 0);
  const totalGraphNodes = graphData ? (graphData.nodes || []).length : (typeof GNODES !== 'undefined' ? GNODES.length : 0);
  const avgLinks = totalGraphNodes > 0 ? (totalLinks * 2 / totalGraphNodes).toFixed(1) : '0';

  let orphanCount = 0;
  if (graphData && graphData.nodes) {
    const connected = new Set();
    (graphData.edges || []).forEach(e => { connected.add(e.source); connected.add(e.target); });
    orphanCount = graphData.nodes.filter(n => !connected.has(n.id)).length;
  }

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const staleCount = recent.length > 0 ? 0 : (typeof VAULT_NOTES !== 'undefined' ? VAULT_NOTES.filter(n => new Date(n.date) < thirtyDaysAgo).length : 0);

  const weekBuckets = {};
  const recentForBuckets = recent.length > 0 ? recent : (typeof VAULT_NOTES !== 'undefined' ? VAULT_NOTES.slice(0, 10).map(n => ({ modified: n.date })) : []);
  recentForBuckets.forEach(n => {
    const d = new Date(n.modified || n.date);
    const weekStart = new Date(d);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const key = weekStart.toISOString().split('T')[0];
    weekBuckets[key] = (weekBuckets[key] || 0) + 1;
  });

  const gapThreshold = 5;
  const gaps = Object.entries(stats.categories || {})
    .map(([cat, count]) => ({ cat, count }))
    .sort((a, b) => a.count - b.count);

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
        ${(recent.length > 0 ? recent : (typeof VAULT_NOTES !== 'undefined' ? VAULT_NOTES.slice(0, 10).map(n => ({ path: n.type + '/' + n.title + '.md', modified: n.date })) : [])).map(n => {
          const title = extractTitle(n.path || '');
          const relTime = n.modified ? mindTimeAgo(new Date(n.modified)) : '';
          return `<div class="mind-insights-recent-item" onclick="openNoteInReader('${escHtml(n.path || '')}')">
            <span class="mind-insights-recent-title">${escHtml(title)}</span>
            <span class="mind-insights-recent-time">${relTime}</span>
          </div>`;
        }).join('')}
      </div>
    </div>

    ${gaps.length ? `<div class="mind-insights-section">
      <h3>🏷️ Knowledge Coverage</h3>
      <div class="mind-insights-gaps">
        ${gaps.map(g => {
          const color = g.count < gapThreshold ? 'var(--red)' : g.count < 15 ? 'var(--yellow)' : 'var(--green)';
          return `<span class="mind-insights-gap-tag" style="border-left:3px solid ${color}">${escHtml(g.cat)} <strong>${g.count}</strong></span>`;
        }).join('')}
      </div>
    </div>` : ''}

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
// NOTE CREATION MODAL
// ═══════════════════════════════════════════════════════════

async function openNewNoteModal() {
  const modal = document.getElementById('new-note-modal');
  if (!modal) return;
  modal.classList.remove('hidden');

  // Load folders into dropdown
  const select = document.getElementById('new-note-folder');
  if (select) {
    select.innerHTML = '<option value="">Loading...</option>';
    try {
      const resp = await fetch(`${getBridgeUrl()}/api/vault/folders`);
      const folders = await resp.json();
      const flatFolders = [];
      function flatten(items, prefix) {
        if (!Array.isArray(items)) return;
        items.forEach(f => {
          const name = typeof f === 'string' ? f : (f.name || f.path || '');
          flatFolders.push(prefix ? `${prefix}/${name}` : name);
          if (f.children) flatten(f.children, prefix ? `${prefix}/${name}` : name);
        });
      }
      flatten(folders, '');
      select.innerHTML = flatFolders.map(f =>
        `<option value="${escHtml(f)}">${escHtml(f)}</option>`
      ).join('');
    } catch {
      select.innerHTML = '<option value="">root</option>';
    }
  }

  // Clear form
  const titleInput = document.getElementById('new-note-title');
  const contentInput = document.getElementById('new-note-content');
  if (titleInput) titleInput.value = '';
  if (contentInput) contentInput.value = '';
}

function closeNewNoteModal() {
  const modal = document.getElementById('new-note-modal');
  if (modal) modal.classList.add('hidden');
}

function closeNewNoteModalIfOutside(e) {
  if (e.target.id === 'new-note-modal') closeNewNoteModal();
}

async function submitNewNote() {
  const title = document.getElementById('new-note-title')?.value?.trim();
  const folder = document.getElementById('new-note-folder')?.value || '';
  const content = document.getElementById('new-note-content')?.value || '';

  if (!title) {
    if (typeof toast === 'function') toast('❌ Title is required', 'error');
    return;
  }

  try {
    const resp = await fetch(`${getBridgeUrl()}/api/vault/note`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, folder, content }),
    });

    if (resp.ok) {
      closeNewNoteModal();
      if (typeof toast === 'function') toast(`✅ Created "${title}"`, 'success');
      // Open the new note
      const path = folder ? `${folder}/${title}.md` : `${title}.md`;
      openNoteInReader(path);
    } else {
      const err = await resp.text().catch(() => 'Unknown error');
      if (typeof toast === 'function') toast(`❌ Failed: ${err}`, 'error');
    }
  } catch {
    if (typeof toast === 'function') toast('❌ Bridge error — could not create note', 'error');
  }
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

function mindTimeAgo(date) {
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

  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="mind-md-code"><code>$2</code></pre>');
  html = html.replace(/`([^`]+)`/g, '<code class="mind-md-inline">$1</code>');
  html = html.replace(/^#### (.+)$/gm, '<h4 class="mind-md-h4">$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3 class="mind-md-h3">$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2 class="mind-md-h2">$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1 class="mind-md-h1">$1</h1>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>');
  html = html.replace(/<\/ul>\s*<ul>/g, '');
  html = html.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, target, label) =>
    `<a class="mind-wikilink" onclick="openNoteInReader('${escHtml(target)}')">${escHtml(label || target)}</a>`
  );
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  html = html.replace(/\n\n/g, '</p><p>');
  html = '<p>' + html + '</p>';
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
// COMPATIBILITY
// ═══════════════════════════════════════════════════════════

function searchMind(query) {
  if (query) {
    const input = document.getElementById("mind-search-input");
    if (input) input.value = query;
    setMindTab("search");
    doMindSearch();
  }
}

function setMindMode(mode) {
  if (mode === "graph") setMindTab("graph");
  else if (mode === "cards") setMindTab("search");
  else if (mode === "timeline") setMindTab("insights");
}

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
