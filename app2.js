/* AGENT OS v5 — MIND + PULSE + BOARD + STREAM */
'use strict';

// ── MIND ─────────────────────────────────────────────────────────────────────
let mindGraphNodes = null;
let mindGraphAnim = null;

function setMindView(view, btn) {
  S.mindView = view;
  $$('.toggle-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  ['graph','cards','timeline'].forEach(v => {
    const p = $(`#mind-${v}-view`);
    if (p) p.classList.toggle('hidden', v !== view);
  });
  if (view === 'graph') initMindGraph();
  else if (view === 'cards') renderMindCards();
  else if (view === 'timeline') renderMindTimeline();
}

function initMind() {
  if (S.mindView === 'graph') initMindGraph();
  else if (S.mindView === 'cards') renderMindCards();
  else renderMindTimeline();
}

// ── GRAPH ─────────────────────────────────────────────────────────────────────
function initMindGraph() {
  const canvas = $('#mind-canvas'); if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const wrap = canvas.parentElement;
  canvas.width = wrap.offsetWidth;
  canvas.height = wrap.offsetHeight;
  const W = canvas.width, H = canvas.height;

  if (!mindGraphNodes) {
    mindGraphNodes = GNODES.map(n => ({
      ...n,
      x: W/2 + (Math.random()-0.5)*W*0.7,
      y: H/2 + (Math.random()-0.5)*H*0.7,
      vx: 0, vy: 0,
    }));
  } else {
    mindGraphNodes.forEach(n => {
      n.x = Math.max(60, Math.min(W-60, n.x));
      n.y = Math.max(60, Math.min(H-60, n.y));
    });
  }

  let hoveredNode = null;
  canvas.onmousemove = e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const prev = hoveredNode;
    hoveredNode = mindGraphNodes.find(n => {
      const r = (n.size||12) + 4;
      return Math.hypot(n.x-mx, n.y-my) < r;
    }) || null;
    if (hoveredNode !== prev) canvas.style.cursor = hoveredNode ? 'pointer' : 'default';
  };

  canvas.onclick = e => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const clicked = mindGraphNodes.find(n => Math.hypot(n.x-mx, n.y-my) < (n.size||12)+6);
    if (clicked) showGraphNote(clicked);
  };

  if (mindGraphAnim) cancelAnimationFrame(mindGraphAnim);
  function tick() {
    // Force-directed
    mindGraphNodes.forEach(n => { n.vx *= 0.85; n.vy *= 0.85; });
    // Repulsion
    for (let i = 0; i < mindGraphNodes.length; i++) {
      for (let j = i+1; j < mindGraphNodes.length; j++) {
        const a = mindGraphNodes[i], b = mindGraphNodes[j];
        const dx = a.x-b.x, dy = a.y-b.y;
        const dist = Math.max(Math.hypot(dx,dy), 1);
        const force = 1800/(dist*dist);
        const fx = (dx/dist)*force, fy = (dy/dist)*force;
        a.vx+=fx; a.vy+=fy; b.vx-=fx; b.vy-=fy;
      }
    }
    // Attraction along edges
    GEDGES.forEach(([ai,bi]) => {
      const a = mindGraphNodes[ai], b = mindGraphNodes[bi];
      if (!a||!b) return;
      const dx = b.x-a.x, dy = b.y-a.y;
      const dist = Math.max(Math.hypot(dx,dy), 1);
      const target = 120;
      const force = (dist-target)*0.03;
      const fx = (dx/dist)*force, fy = (dy/dist)*force;
      a.vx+=fx; a.vy+=fy; b.vx-=fx; b.vy-=fy;
    });
    // Center gravity
    mindGraphNodes.forEach(n => {
      n.vx += (W/2 - n.x)*0.002;
      n.vy += (H/2 - n.y)*0.002;
      n.x += n.vx; n.y += n.vy;
      n.x = Math.max(60, Math.min(W-60, n.x));
      n.y = Math.max(60, Math.min(H-60, n.y));
    });

    // Draw
    ctx.clearRect(0,0,W,H);
    // Edges
    ctx.save();
    GEDGES.forEach(([ai,bi]) => {
      const a = mindGraphNodes[ai], b = mindGraphNodes[bi];
      if (!a||!b) return;
      const isHighlighted = hoveredNode && (hoveredNode.id===ai||hoveredNode.id===bi);
      ctx.globalAlpha = isHighlighted ? 0.6 : 0.15;
      ctx.strokeStyle = isHighlighted ? '#cba6f7' : '#6c7086';
      ctx.lineWidth = isHighlighted ? 1.5 : 0.8;
      ctx.beginPath(); ctx.moveTo(a.x,a.y); ctx.lineTo(b.x,b.y); ctx.stroke();
    });
    ctx.restore();

    // Nodes
    mindGraphNodes.forEach(n => {
      const r = n.size || 12;
      const isHov = hoveredNode && hoveredNode.id===n.id;
      ctx.save();
      if (n.glow || isHov) {
        ctx.shadowColor = n.hex; ctx.shadowBlur = isHov ? 20 : 10;
      }
      ctx.beginPath();
      ctx.arc(n.x, n.y, r + (isHov?2:0), 0, Math.PI*2);
      ctx.fillStyle = n.hex + (isHov?'':'99');
      ctx.fill();
      if (isHov) { ctx.strokeStyle = n.hex; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.restore();
      // Label
      ctx.save();
      ctx.font = `${isHov?600:500} ${isHov?11:10}px var(--font, system-ui)`;
      ctx.fillStyle = isHov ? '#cdd6f4' : '#6c7086';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const label = n.label.length > 18 ? n.label.substring(0,16)+'…' : n.label;
      ctx.fillText(label, n.x, n.y + r + 4);
      ctx.restore();
    });

    mindGraphAnim = requestAnimationFrame(tick);
  }
  tick();
}

function showGraphNote(node) {
  const panel = $('#graph-note-panel'); if (!panel) return;
  const note = VAULT_NOTES.find(v => v.title.toLowerCase().includes(node.label.toLowerCase().split(' ').slice(0,2).join(' ')));
  const noteContent = GNOTES_MAP[node.id] || (note?.summary) || `${node.type} node in the knowledge graph. Connected to ${GEDGES.filter(e=>e[0]===node.id||e[1]===node.id).length} other nodes.`;
  panel.classList.remove('hidden');
  panel.innerHTML = `
    <button class="gnp-close" onclick="this.parentElement.classList.add('hidden')">✕</button>
    <div class="gnp-title" style="color:${node.hex}">${node.label}</div>
    <div class="gnp-type">${node.type}</div>
    <div class="gnp-body">${esc(noteContent)}</div>
    ${note ? `<div style="display:flex;gap:8px;flex-wrap:wrap">
      <span style="font-size:11px;color:var(--text-3)">Confidence: <strong style="color:${node.hex}">${note.confidence}%</strong></span>
      <span style="font-size:11px;color:var(--text-3)">${note.backlinks} backlinks</span>
    </div>` : ''}
    <div style="margin-top:10px">
      <button class="chip" onclick="openNote('${node.id}')">Open Note →</button>
    </div>`;
}

function openNote(nodeId) {
  const node = GNODES.find(n => n.id === +nodeId);
  const note = node ? VAULT_NOTES.find(v => v.title.toLowerCase().includes(node.label.toLowerCase().split(' ')[0].toLowerCase())) : null;
  if (!note) { toast('📚', 'Note opened in vault'); return; }
  showNoteModal(note);
}

// ── VAULT CARDS ───────────────────────────────────────────────────────────────
function renderMindCards(searchQ) {
  const grid = $('#mind-cards-grid'); if (!grid) return;
  let notes = VAULT_NOTES;
  if (searchQ || S.mindSearch) {
    const q = (searchQ || S.mindSearch).toLowerCase();
    notes = notes.filter(n => n.title.toLowerCase().includes(q) || n.summary.toLowerCase().includes(q) || n.tags.some(t=>t.includes(q)));
  }
  if (!notes.length) {
    grid.innerHTML = `<div style="color:var(--text-3);padding:24px;text-align:center">No notes match your search</div>`;
    return;
  }
  grid.innerHTML = notes.map(note => {
    const confColor = note.confidence >= 80 ? 'var(--green)' : note.confidence >= 60 ? 'var(--yellow)' : 'var(--red)';
    const typeColors = {Research:'#89b4fa',Vision:'#cba6f7',Architecture:'#f9e2af',Report:'#f38ba8',Code:'#a6e3a1',Operations:'#fab387'};
    const tc = typeColors[note.type] || '#6c7086';
    const a = AGENTS.find(ag => ag.id === note.agent);
    return `<div class="vault-card" onclick="showNoteModal_id('${note.id}')">
      <div class="vc-title">${esc(note.title)}</div>
      <div class="vc-type" style="color:${tc}">${note.type}</div>
      <div class="vc-summary">${esc(note.summary.substring(0,140))}${note.summary.length>140?'…':''}</div>
      <div class="vc-conf-bar"><div class="vc-conf-fill" style="width:${note.confidence}%;background:${confColor}"></div></div>
      <div class="vc-meta">
        <span>${a?.emoji||''} ${a?.name||note.agent}</span>
        <span>${note.date}</span>
        <span class="vc-links">🔗 ${note.backlinks}</span>
      </div>
      <div style="display:flex;gap:4px;flex-wrap:wrap;margin-top:6px">
        ${note.tags.slice(0,3).map(t=>`<span style="font-size:10px;background:rgba(255,255,255,0.05);border-radius:4px;padding:1px 6px;color:var(--text-3)">#${t}</span>`).join('')}
      </div>
    </div>`;
  }).join('');
}

function showNoteModal_id(id) {
  const note = VAULT_NOTES.find(n => n.id === id);
  if (note) showNoteModal(note);
}

function showNoteModal(note) {
  const modal = $('#note-modal'); if (!modal) return;
  const a = ga(note.agent);
  const confColor = note.confidence >= 80 ? 'var(--green)' : note.confidence >= 60 ? 'var(--yellow)' : 'var(--red)';
  modal.classList.remove('hidden');
  modal.innerHTML = `<div class="note-modal-card">
    <button class="close-btn" onclick="$('#note-modal').classList.add('hidden')">✕</button>
    <h3>${esc(note.title)}</h3>
    <div style="font-size:11px;color:var(--text-3);margin-bottom:12px">${note.type} · ${note.date} · ${a?.emoji} ${a?.name}</div>
    <div style="font-size:13px;color:var(--text-2);line-height:1.7;margin-bottom:16px">${esc(note.summary)}</div>
    <div class="note-conf-row">
      Confidence:
      <div class="note-conf-track"><div class="note-conf-bar" style="width:${note.confidence}%;background:${confColor}"></div></div>
      <strong style="color:${confColor}">${note.confidence}%</strong>
    </div>
    <div style="margin-top:12px;font-size:12px;color:var(--text-3)">🔗 ${note.backlinks} backlinks · ${note.tags.map(t=>'#'+t).join(' ')}</div>
    <div style="margin-top:16px;display:flex;gap:8px">
      <button class="btn-primary" onclick="toast('📝','Editing…');$('#note-modal').classList.add('hidden')">Edit</button>
      <button class="btn-secondary" onclick="$('#note-modal').classList.add('hidden')">Close</button>
    </div>
  </div>`;
}

// ── TIMELINE ──────────────────────────────────────────────────────────────────
function renderMindTimeline() {
  const tl = $('#mind-timeline'); if (!tl) return;
  // Sort notes by date desc
  const sorted = [...VAULT_NOTES].sort((a,b) => b.date.localeCompare(a.date));
  const sizeMap = n => Math.max(14, Math.min(32, n.confidence * 0.3 + n.backlinks * 1.5));
  const typeColors = {Research:'#89b4fa',Vision:'#cba6f7',Architecture:'#f9e2af',Report:'#f38ba8',Code:'#a6e3a1',Operations:'#fab387'};

  tl.innerHTML = `<div class="tl-axis"></div>` + sorted.map((note, i) => {
    const sz = sizeMap(note);
    const tc = typeColors[note.type] || '#6c7086';
    const above = i % 2 === 0;
    return `
      <div class="tl-spacer"></div>
      <div class="tl-dot-wrap">
        <div class="tl-tooltip">${esc(note.title)}<br><span style="color:var(--text-3)">${note.summary.substring(0,60)}…</span></div>
        <div class="tl-dot" style="width:${sz}px;height:${sz}px;background:${tc}22;border-color:${tc};margin:${above?`0 0 ${(sz/2)+4}px`:`${(sz/2)+4}px 0 0`}" onclick="showNoteModal_id('${note.id}')"></div>
        <div class="tl-label" style="color:${tc}">${note.title.substring(0,20)}${note.title.length>20?'…':''}</div>
        <div class="tl-date">${note.date}</div>
      </div>`;
  }).join('') + `<div class="tl-spacer"></div>`;
}

function mindSearch(q) {
  S.mindSearch = q;
  if (S.mindView === 'cards') renderMindCards(q);
}

function toggleTodayOverlay() {
  const o = $('#today-overlay'); if (!o) return;
  o.classList.toggle('hidden');
  if (!o.classList.contains('hidden')) {
    const todayNotes = VAULT_NOTES.filter(n => n.date === '2026-03-19');
    const typeColors = {Research:'#89b4fa',Vision:'#cba6f7',Architecture:'#f9e2af',Report:'#f38ba8',Code:'#a6e3a1',Operations:'#fab387'};
    o.innerHTML = `
      <h3>What changed today?
        <button class="close-btn" onclick="toggleTodayOverlay()">✕</button>
      </h3>
      <p style="font-size:12px;color:var(--text-3);margin-bottom:16px">${todayNotes.length} notes modified or created today</p>
      ${todayNotes.map(n => {
        const a = ga(n.agent);
        const tc = typeColors[n.type]||'#6c7086';
        return `<div class="today-item">
          <div class="today-dot" style="background:${tc}"></div>
          <div style="flex:1">
            <div style="font-size:12px;font-weight:600">${n.title}</div>
            <div style="font-size:11px;color:var(--text-3)">${a?.emoji} ${a?.name} · ${n.type}</div>
          </div>
          <button class="chip" onclick="showNoteModal_id('${n.id}');toggleTodayOverlay()">Open</button>
        </div>`;
      }).join('')}`;
  }
}

function quickCapture() {
  const m = $('#capture-modal'); if (m) m.classList.remove('hidden');
  setTimeout(() => $('#capture-title')?.focus(), 50);
}
function closeCapture() { $('#capture-modal')?.classList.add('hidden'); }
function saveCapture() {
  const title = $('#capture-title')?.value.trim();
  const body = $('#capture-body')?.value.trim();
  if (!title) { toast('⚠️','Please enter a title'); return; }
  VAULT_NOTES.unshift({
    id: 'vc'+Date.now(), title, summary: body||'No content.', type:'Research',
    confidence: 50, backlinks: 0, agent: 'righthand', date: '2026-03-19', tags: ['capture']
  });
  closeCapture();
  toast('📚', 'Saved to vault');
  addXP(15, 'note captured');
  if (S.mindView === 'cards') renderMindCards();
  $('#capture-title').value = '';
  $('#capture-body').value = '';
}

// ── PULSE ─────────────────────────────────────────────────────────────────────
function rPulse() {
  const c = $('#pulse-inner'); if (!c) return;
  const totalTokens = AGENTS.reduce((s,a) => s+a.tokens, 0);
  const todayCost = COST_DATA[COST_DATA.length-1];
  const costTotal = Object.entries(todayCost).filter(([k])=>k!=='day').reduce((s,[,v])=>s+v,0);
  const activeAgents = AGENTS.filter(a=>a.status==='active').length;

  c.innerHTML = `
    <div class="pulse-metrics">
      <div class="pulse-metric">
        <div class="pulse-metric-value" style="color:var(--green)">$${costTotal.toFixed(2)}</div>
        <div class="pulse-metric-label">Cost Today</div>
        <div class="pulse-metric-delta" style="color:var(--text-3)">Budget: $10.00</div>
      </div>
      <div class="pulse-metric">
        <div class="pulse-metric-value" style="color:var(--blue)">${activeAgents}</div>
        <div class="pulse-metric-label">Active Agents</div>
        <div class="pulse-metric-delta" style="color:var(--text-3)">${AGENTS.length} total</div>
      </div>
      <div class="pulse-metric">
        <div class="pulse-metric-value" style="color:var(--accent)">${S.growth.total}</div>
        <div class="pulse-metric-label">Tasks Completed</div>
        <div class="pulse-metric-delta" style="color:var(--green)">▲ 12 today</div>
      </div>
    </div>
    <div class="pulse-grid">
      ${renderAgentHealth()}
      ${renderCostChart()}
      ${renderCronStatus()}
      ${renderErrorLog()}
      ${renderSystemLoad()}
      ${renderQuickFix()}
    </div>`;
}

function renderAgentHealth() {
  const rows = AGENTS.map(a => {
    const pct = Math.round(a.fitness*100);
    const barColor = pct>=85?'var(--green)':pct>=70?'var(--yellow)':'var(--red)';
    return `<div class="agent-health-row">
      <div class="ah-avatar" style="background:${a.color}">${a.emoji}</div>
      <div class="ah-info">
        <div class="ah-name">${a.name}</div>
        <div class="ah-task">${a.status==='active'?a.task:'Idle · '+a.role}</div>
      </div>
      <div class="status-dot ${a.status==='active'?'online':'idle'}"></div>
      <div class="ah-bar-wrap">
        <div class="ah-bar"><div class="ah-fill" style="width:${pct}%;background:${barColor}"></div></div>
        <div class="ah-pct">${pct}%</div>
      </div>
    </div>`;
  }).join('');
  return `<div class="pulse-card pulse-card-full">
    <div class="pulse-card-title">Agent Health <span class="badge" style="background:rgba(166,227,161,0.12);color:var(--green)">${AGENTS.filter(a=>a.status==='active').length} online</span></div>
    ${rows}
  </div>`;
}

function renderCostChart() {
  const colors = {righthand:'#f9e2af',researcher:'#89b4fa',coder:'#a6e3a1',vault:'#cba6f7',other:'#fab387'};
  const maxTotal = Math.max(...COST_DATA.map(d => Object.entries(d).filter(([k])=>k!=='day').reduce((s,[,v])=>s+v,0)));
  const bars = COST_DATA.map(d => {
    const total = Object.entries(d).filter(([k])=>k!=='day').reduce((s,[,v])=>s+v,0);
    const h = Math.round((total/maxTotal)*88);
    const segs = Object.entries(d).filter(([k])=>k!=='day').map(([k,v])=>{
      const sh = Math.round((v/total)*h);
      return `<div class="cost-bar-seg" style="height:${sh}px;background:${colors[k]||'#6c7086'}"></div>`;
    }).join('');
    return `<div class="cost-bar-col">
      <div class="cost-bar-stack" style="height:${h}px">${segs}</div>
      <div class="cost-bar-label">${d.day}</div>
    </div>`;
  }).join('');
  return `<div class="pulse-card">
    <div class="pulse-card-title">Cost Waterfall</div>
    <div class="cost-chart">${bars}</div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
      ${Object.entries(colors).map(([k,c])=>`<span style="font-size:10px;color:${c}">● ${k}</span>`).join('')}
    </div>
  </div>`;
}

function renderCronStatus() {
  const rows = CRONS.map(c => `<div class="cron-row">
    <div class="cron-dot" style="background:${c.ok?'var(--green)':'var(--red)'}"></div>
    <div class="cron-name">${c.n}</div>
    <div class="cron-sched">${c.s}</div>
  </div>`).join('');
  const failing = CRONS.filter(c=>!c.ok).length;
  return `<div class="pulse-card">
    <div class="pulse-card-title">Cron Jobs <span class="badge" style="background:${failing?'rgba(243,139,168,0.12)':'rgba(166,227,161,0.12)'};color:${failing?'var(--red)':'var(--green)'}">${failing ? failing+' failing' : 'all OK'}</span></div>
    <div class="cron-grid">${rows}</div>
  </div>`;
}

function renderErrorLog() {
  const errors = STREAM_EVENTS.filter(e => e.level === 'error' || e.level === 'warn').slice(0,6);
  const rows = errors.map(e => `<div class="error-row">
    <span style="color:${e.level==='error'?'var(--red)':'var(--yellow)'};flex-shrink:0">${e.level==='error'?'ERR':'WRN'}</span>
    <span style="color:var(--text-2)">${esc(e.text)}</span>
  </div>`).join('');
  return `<div class="pulse-card">
    <div class="pulse-card-title">Error Log <span class="badge" style="background:rgba(243,139,168,0.12);color:var(--red)">${STREAM_EVENTS.filter(e=>e.level==='error').length} errors</span></div>
    ${rows}
  </div>`;
}

function renderSystemLoad() {
  const metrics = [
    {label:'CPU',pct:34,color:'var(--blue)'},
    {label:'Memory',pct:61,color:'var(--peach)'},
    {label:'Disk',pct:94,color:'var(--red)'},
    {label:'Tokens',pct:Math.round(AGENTS.reduce((s,a)=>s+a.tokens,0)/1000),color:'var(--accent)'},
  ];
  const rows = metrics.map(m => `<div class="load-row">
    <div class="load-label">${m.label}</div>
    <div class="load-bar-outer"><div class="load-bar-inner" style="width:${Math.min(m.pct,100)}%;background:${m.color}"></div></div>
    <div class="load-pct">${m.pct}${m.label==='Tokens'?'k':'%'}</div>
  </div>`).join('');
  return `<div class="pulse-card">
    <div class="pulse-card-title">System Load</div>
    ${rows}
    <div style="font-size:11px;color:var(--red);margin-top:8px">⚠ Disk at 94% — cleanup needed</div>
  </div>`;
}

function renderQuickFix() {
  return `<div class="pulse-card">
    <div class="pulse-card-title">Quick Actions</div>
    <div class="quick-fix-row">
      <button class="btn-quickfix" onclick="pulseAction('restart')">🔄 Restart Gateway</button>
      <button class="btn-quickfix" onclick="pulseAction('clear-queue')">🧹 Clear Queue</button>
      <button class="btn-quickfix" onclick="pulseAction('restart-watchdog')">🐕 Fix Watchdog</button>
      <button class="btn-quickfix" onclick="pulseAction('cleanup-disk')">💾 Cleanup Disk</button>
      <button class="btn-quickfix" onclick="nav('stream')">📡 View Logs</button>
    </div>
  </div>`;
}

function pulseAction(action) {
  const msgs = {
    'restart':'🔄 Gateway restarting…',
    'clear-queue':'🧹 Queue cleared',
    'restart-watchdog':'🐕 Watchdog restarting on :8484…',
    'cleanup-disk':'💾 Disk cleanup scheduled'
  };
  toast('⚙️', msgs[action] || action);
  addXP(10, action);
  if (action === 'restart-watchdog') {
    const cron = CRONS.find(c=>c.n==='session-watchdog');
    if (cron) {
      setTimeout(() => { cron.ok = true; toast('✅','Watchdog restarted successfully'); rPulse(); }, 2000);
    }
  }
}

// ── BOARD ─────────────────────────────────────────────────────────────────────
const BOARD_COLS = [
  {id:'inbox',  label:'Inbox',       color:'var(--text-3)'},
  {id:'queued', label:'Queued',      color:'var(--blue)'},
  {id:'active', label:'In Progress', color:'var(--yellow)'},
  {id:'review', label:'Review',      color:'var(--peach)'},
  {id:'done',   label:'Done',        color:'var(--green)'},
];

function rBoard() {
  const w = $('#board-wrap'); if (!w) return;
  w.innerHTML = BOARD_COLS.map(col => {
    const cards = BOARD_CARDS[col.id] || [];
    const cardHtml = cards.map(card => {
      const a = AGENTS.find(ag => ag.id === card.agent);
      const prioClass = card.priority?.toLowerCase() || 'p2';
      return `<div class="board-card" onclick="boardMoveCard('${card.id}','${col.id}')">
        <div class="board-card-title">${esc(card.title)}</div>
        <div class="board-card-meta">
          <span class="board-priority ${prioClass}">${card.priority}</span>
          <span class="board-card-agent">${a?.emoji||'🤖'} ${a?.name||card.agent}</span>
        </div>
        ${card.progress !== undefined ? `<div class="board-card-progress">
          <div class="board-prog-bar"><div class="board-prog-fill" style="width:${card.progress}%"></div></div>
          <div style="font-size:10px;color:var(--text-3);margin-top:2px">${card.progress}%</div>
        </div>` : ''}
      </div>`;
    }).join('');
    return `<div class="board-col">
      <div class="board-col-header">
        <span style="color:${col.color}">${col.label}</span>
        <span class="board-col-count">${cards.length}</span>
      </div>
      <div class="board-col-body" id="bc-${col.id}">${cardHtml}
        <div style="text-align:center;padding:8px;color:var(--text-3);font-size:11px;cursor:pointer" onclick="boardAddCard('${col.id}')">+ Add card</div>
      </div>
    </div>`;
  }).join('');
}

function boardMoveCard(cardId, currentCol) {
  // Find the card and show a move dialog
  const colOrder = ['inbox','queued','active','review','done'];
  const curIdx = colOrder.indexOf(currentCol);
  const nextCol = colOrder[curIdx+1];
  if (!nextCol) { toast('✅','Already in Done'); return; }
  // Move card
  let card;
  for (const col of colOrder) {
    const idx = (BOARD_CARDS[col]||[]).findIndex(c=>c.id===cardId);
    if (idx>=0) { card = BOARD_CARDS[col].splice(idx,1)[0]; break; }
  }
  if (!card) return;
  if (!BOARD_CARDS[nextCol]) BOARD_CARDS[nextCol] = [];
  BOARD_CARDS[nextCol].push(card);
  toast('📋', `Moved to ${BOARD_COLS.find(c=>c.id===nextCol)?.label||nextCol}`);
  addXP(10, 'card moved');
  rBoard();
}

function boardAddCard(col) {
  const title = prompt('Card title:');
  if (!title) return;
  const id = 'bc' + Date.now();
  if (!BOARD_CARDS[col]) BOARD_CARDS[col] = [];
  BOARD_CARDS[col].push({id, title, priority:'P2', agent:'righthand', tags:[]});
  addXP(10, 'card added');
  rBoard();
}

// ── STREAM ────────────────────────────────────────────────────────────────────
let streamAutoScroll = true;

function rStream() {
  // Populate agent filter
  const sel = $('#stream-agent');
  if (sel && sel.options.length <= 1) {
    AGENTS.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id; opt.textContent = `${a.emoji} ${a.name}`;
      sel.appendChild(opt);
    });
  }
  renderStreamLog();

  const log = $('#stream-log');
  if (log) {
    log.onscroll = () => {
      streamAutoScroll = (log.scrollTop + log.clientHeight) >= (log.scrollHeight - 20);
    };
  }
}

function renderStreamLog(events) {
  const log = $('#stream-log'); if (!log) return;
  let evs = events || filterStreamEvents();
  log.innerHTML = evs.map(e => {
    const a = ga(e.agent);
    const cls = e.level === 'error' ? 'stream-line stream-error' : e.level === 'warn' ? 'stream-line stream-warn' : 'stream-line';
    return `<div class="${cls}">
      <span class="stream-time">${e.time}</span>
      <span class="stream-level ${e.level}">${e.level.toUpperCase()}</span>
      <span class="stream-agent" title="${a?.name||e.agent}">${a?.emoji||''} ${a?.name?.split(' ')[0]||e.agent}</span>
      <span class="stream-text">${esc(e.text)}</span>
    </div>`;
  }).join('');
  if (streamAutoScroll) log.scrollTop = log.scrollHeight;
}

function filterStreamEvents() {
  const agentF = $('#stream-agent')?.value || 'all';
  const search = $('#stream-search')?.value || '';
  let evs = STREAM_EVENTS.filter(e => S.streamLevels.has(e.level));
  if (agentF !== 'all') evs = evs.filter(e => e.agent === agentF);
  if (search) {
    try {
      const re = new RegExp(search, 'i');
      evs = evs.filter(e => re.test(e.text) || re.test(e.agent));
    } catch { evs = evs.filter(e => e.text.toLowerCase().includes(search.toLowerCase())); }
  }
  return evs;
}

function streamFilter() {
  renderStreamLog();
}

function toggleLevel(level, btn) {
  if (S.streamLevels.has(level)) S.streamLevels.delete(level);
  else S.streamLevels.add(level);
  btn?.classList.toggle('active', S.streamLevels.has(level));
  renderStreamLog();
}
