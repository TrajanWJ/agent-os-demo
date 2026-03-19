/* AGENT OS v5 — COMMAND + CONFIG + SIMULATION + INIT */
'use strict';

// ── COMMAND PALETTE ───────────────────────────────────────────────────────────
const CMD_ITEMS = [
  // Navigation
  {icon:'🏠', title:'Go to Feed',       sub:'Main activity stream', badge:'Nav',  action:()=>nav('feed')},
  {icon:'❓', title:'Go to Queue',      sub:'Expiring decision cards', badge:'Nav', action:()=>nav('queue')},
  {icon:'💬', title:'Go to Talk',       sub:'Discord-style chat', badge:'Nav', action:()=>nav('talk')},
  {icon:'🧠', title:'Go to Mind',       sub:'Knowledge vault', badge:'Nav', action:()=>nav('mind')},
  {icon:'⚡', title:'Go to Pulse',      sub:'System vitals', badge:'Nav', action:()=>nav('pulse')},
  {icon:'📋', title:'Go to Board',      sub:'Kanban board', badge:'Nav', action:()=>nav('board')},
  {icon:'📡', title:'Go to Stream',     sub:'Real-time event log', badge:'Nav', action:()=>nav('stream')},
  {icon:'⚙️', title:'Go to Config',     sub:'Agent settings', badge:'Nav', action:()=>nav('config')},
  // Actions
  {icon:'🚀', title:'Dispatch Researcher', sub:'Start competitive analysis', badge:'>', action:()=>{spawnAgent('researcher','Competitive analysis');closeCommand();}},
  {icon:'🚀', title:'Dispatch Coder',      sub:'Start a coding task', badge:'>',       action:()=>{spawnAgent('coder','Streaming UI');closeCommand();}},
  {icon:'🔄', title:'Restart Watchdog',    sub:'Fix session-watchdog service', badge:'!', action:()=>{pulseAction('restart-watchdog');closeCommand();}},
  {icon:'🧹', title:'Clear Queue',         sub:'Clear all pending decisions', badge:'!', action:()=>{pulseAction('clear-queue');closeCommand();}},
  // Vault
  {icon:'📚', title:'Search Vault',         sub:'Search all vault notes', badge:'/vault', action:()=>{nav('mind');setMindView('cards',null);setTimeout(()=>{const s=$('#mind-search');if(s)s.focus();},200);closeCommand();}},
  {icon:'＋', title:'Quick Capture',        sub:'Add a note to vault', badge:'/capture', action:()=>{quickCapture();closeCommand();}},
  // Agents
  {icon:'🤝', title:'Chat with Right Hand', sub:'Open DM', badge:'@', action:()=>{nav('talk');setTimeout(()=>{dcSelectServer('dm');dcSelectDM('righthand');},50);closeCommand();}},
  {icon:'🔬', title:'Chat with Researcher', sub:'Open DM', badge:'@', action:()=>{nav('talk');setTimeout(()=>{dcSelectServer('dm');dcSelectDM('researcher');},50);closeCommand();}},
  {icon:'💻', title:'Chat with Coder',      sub:'Open DM', badge:'@', action:()=>{nav('talk');setTimeout(()=>{dcSelectServer('dm');dcSelectDM('coder');},50);closeCommand();}},
];

function openCommand() {
  const o = $('#command-overlay'); if (!o) return;
  o.classList.remove('hidden');
  const inp = $('#command-input');
  if (inp) { inp.value = ''; inp.focus(); }
  commandSearch('');
}

function closeCommand() {
  $('#command-overlay')?.classList.add('hidden');
}

function commandSearch(q) {
  const res = $('#command-results'); if (!res) return;
  const query = q.toLowerCase().trim();

  let items = CMD_ITEMS;
  if (query.startsWith('>')) {
    const sub = query.slice(1).trim();
    items = CMD_ITEMS.filter(i => i.badge.startsWith('>') || i.title.toLowerCase().includes(sub) || i.sub.toLowerCase().includes(sub));
  } else if (query.startsWith('@')) {
    const sub = query.slice(1).trim();
    items = CMD_ITEMS.filter(i => i.badge === '@' || (sub && i.title.toLowerCase().includes(sub)));
  } else if (query.startsWith('/')) {
    const sub = query.slice(1).trim();
    items = CMD_ITEMS.filter(i => i.badge.startsWith('/') || (sub && i.title.toLowerCase().includes(sub)));
  } else if (query.startsWith('!')) {
    items = CMD_ITEMS.filter(i => i.badge === '!');
  } else if (query) {
    items = CMD_ITEMS.filter(i => i.title.toLowerCase().includes(query) || i.sub.toLowerCase().includes(query) || i.icon.includes(query));
  }

  S.cmdSelected = 0;
  res.innerHTML = items.slice(0,8).map((item, i) => `
    <div class="command-result ${i===0?'selected':''}" onclick="cmdExec(${CMD_ITEMS.indexOf(item)})">
      <div class="command-result-icon">${item.icon}</div>
      <div class="command-result-body">
        <div class="command-result-title">${esc(item.title)}</div>
        <div class="command-result-sub">${esc(item.sub)}</div>
      </div>
      <div class="command-result-badge">${esc(item.badge)}</div>
    </div>`).join('') || '<div style="padding:16px;text-align:center;color:var(--text-3);font-size:12px">No results</div>';
}

function commandKey(e) {
  const items = $$('#command-results .command-result');
  if (e.key === 'ArrowDown') { e.preventDefault(); S.cmdSelected = Math.min(S.cmdSelected+1, items.length-1); cmdHighlight(items); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); S.cmdSelected = Math.max(S.cmdSelected-1, 0); cmdHighlight(items); }
  else if (e.key === 'Enter') { e.preventDefault(); if (items[S.cmdSelected]) items[S.cmdSelected].click(); }
  else if (e.key === 'Escape') closeCommand();
}

function cmdHighlight(items) {
  items.forEach((el,i) => el.classList.toggle('selected', i===S.cmdSelected));
  items[S.cmdSelected]?.scrollIntoView({block:'nearest'});
}

function cmdExec(idx) {
  const item = CMD_ITEMS[idx];
  if (!item) return;
  S.cmdHistory.unshift(item.title);
  if (S.cmdHistory.length > 10) S.cmdHistory.pop();
  item.action();
  addXP(5, `command: ${item.title}`);
}

function rCommand() {
  const inp = $('#command-page-input');
  if (inp) { inp.value = ''; commandPageSearch(''); }
  renderCommandHistory();
}

function commandPageSearch(q) {
  const res = $('#command-page-results'); if (!res) return;
  if (!q) { res.innerHTML = renderCommandGroups(); return; }
  const query = q.toLowerCase();
  const items = CMD_ITEMS.filter(i => i.title.toLowerCase().includes(query) || i.sub.toLowerCase().includes(query));
  res.innerHTML = items.map((item, i) => `
    <div class="command-result" onclick="cmdExec(${CMD_ITEMS.indexOf(item)});$('#command-page-input').value=''">
      <div class="command-result-icon">${item.icon}</div>
      <div class="command-result-body">
        <div class="command-result-title">${esc(item.title)}</div>
        <div class="command-result-sub">${esc(item.sub)}</div>
      </div>
      <div class="command-result-badge">${esc(item.badge)}</div>
    </div>`).join('') || '<div style="padding:16px;text-align:center;color:var(--text-3);font-size:12px">No results</div>';
}

function renderCommandGroups() {
  const groups = [
    {label:'Navigation', filter: i => i.badge === 'Nav'},
    {label:'Actions', filter: i => i.badge === '>' || i.badge === '!'},
    {label:'Agents', filter: i => i.badge === '@'},
  ];
  return groups.map(g => {
    const items = CMD_ITEMS.filter(g.filter);
    if (!items.length) return '';
    return `<div class="command-section-label">${g.label}</div>` +
      items.map(item => `
        <div class="command-result" onclick="cmdExec(${CMD_ITEMS.indexOf(item)})">
          <div class="command-result-icon">${item.icon}</div>
          <div class="command-result-body">
            <div class="command-result-title">${esc(item.title)}</div>
            <div class="command-result-sub">${esc(item.sub)}</div>
          </div>
          <div class="command-result-badge">${esc(item.badge)}</div>
        </div>`).join('');
  }).join('');
}

function renderCommandHistory() {
  const h = $('#command-history'); if (!h) return;
  h.innerHTML = S.cmdHistory.map(c => `
    <div class="command-history-item" onclick="$('#command-page-input').value='${esc(c)}';commandPageSearch('${esc(c)}')">
      <span>🕐</span><span>${esc(c)}</span>
    </div>`).join('');
}

// ── CONFIG ────────────────────────────────────────────────────────────────────
const CONFIG_STATE = {
  autonomy: 72, verbosity: 55, creativity: 68, costAlert: true, darkMode: true, notifications: true, autoResolve: true,
};

function rConfig() {
  const c = $('#config-inner'); if (!c) return;
  c.innerHTML = `
    <h2 style="font-size:18px;font-weight:800;margin-bottom:20px">Configuration</h2>

    <div class="config-section">
      <div class="config-section-title">Agent Behavior</div>
      ${renderSlider('autonomy','Autonomy','How much agents act without asking',0,100,'%')}
      ${renderSlider('verbosity','Verbosity','How much agents explain their actions',0,100,'%')}
      ${renderSlider('creativity','Creativity','Temperature / risk-taking in responses',0,100,'%')}
    </div>

    <div class="config-section">
      <div class="config-section-title">System</div>
      ${renderToggle('costAlert','Cost Alerts','Notify when daily budget exceeds 80%')}
      ${renderToggle('darkMode','Dark Mode','Catppuccin Mocha theme')}
      ${renderToggle('notifications','Notifications','Toast + badge notifications')}
      ${renderToggle('autoResolve','Auto-resolve Queue','Auto-answer queue items when timer expires')}
    </div>

    <div class="config-section">
      <div class="config-section-title">Dispatch Rules</div>
      <div style="font-size:12px;color:var(--text-2);margin-bottom:12px">Rules that control how Right Hand routes tasks</div>
      ${[
        {label:'Max concurrent agents',value:'3',icon:'🔢'},
        {label:'Default priority',value:'P2',icon:'🎯'},
        {label:'Token budget/task',value:'15,000',icon:'💰'},
        {label:'Retry on failure',value:'3x',icon:'🔄'},
      ].map(r=>`<div class="config-row">
        <div class="config-label"><div class="config-label-name">${r.icon} ${r.label}</div></div>
        <div style="font-size:12px;color:var(--text-2);background:var(--bg-overlay);padding:4px 10px;border-radius:var(--r-sm);cursor:pointer" onclick="toast('⚙️','Edit dispatch rules')">${r.value}</div>
      </div>`).join('')}
    </div>

    <div class="config-section">
      <div class="config-section-title">Installed Skills</div>
      ${[
        {name:'agent-factory',     icon:'🏭', ver:'v2.1.0'},
        {name:'context-evolution', icon:'🧬', ver:'v1.3.2'},
        {name:'discord-rich-output',icon:'💬',ver:'v1.0.5'},
        {name:'feedback-loop',     icon:'🔄', ver:'v0.9.1'},
        {name:'prompt-compiler',   icon:'⚡', ver:'v1.2.0'},
        {name:'pr-review',         icon:'🔍', ver:'v1.1.3'},
      ].map(s=>`<div class="skill-item">
        <div class="skill-icon">${s.icon}</div>
        <div class="skill-info"><div class="skill-name">${s.name}</div><div class="skill-ver">${s.ver}</div></div>
        <button class="chip" style="font-size:10px;padding:2px 8px" onclick="toast('📦','Updated ${s.name}')">Update</button>
      </div>`).join('')}
      <button class="btn-primary" style="margin-top:12px;width:100%" onclick="toast('🔍','Opening ClawHub…')">+ Browse ClawHub</button>
    </div>`;
}

function renderSlider(key, label, desc, min, max, unit) {
  const val = CONFIG_STATE[key];
  return `<div class="config-row">
    <div class="config-label">
      <div class="config-label-name">${label}</div>
      <div class="config-label-desc">${desc}</div>
    </div>
    <input type="range" class="config-slider" min="${min}" max="${max}" value="${val}" oninput="configSlider('${key}',this.value,this.nextElementSibling)"/>
    <div class="config-slider-val">${val}${unit}</div>
  </div>`;
}

function configSlider(key, val, display) {
  CONFIG_STATE[key] = +val;
  if (display) display.textContent = val + (key==='autonomy'||key==='verbosity'||key==='creativity' ? '%' : '');
}

function renderToggle(key, label, desc) {
  const on = CONFIG_STATE[key];
  return `<div class="config-row">
    <div class="config-label">
      <div class="config-label-name">${label}</div>
      <div class="config-label-desc">${desc}</div>
    </div>
    <div class="config-toggle ${on?'on':''}" id="tog-${key}" onclick="configToggle('${key}')"></div>
  </div>`;
}

function configToggle(key) {
  CONFIG_STATE[key] = !CONFIG_STATE[key];
  const el = $(`#tog-${key}`); if (el) el.classList.toggle('on', CONFIG_STATE[key]);
  toast(CONFIG_STATE[key]?'✅':'❌', key + ' ' + (CONFIG_STATE[key]?'enabled':'disabled'));
}

// ── SIMULATION ────────────────────────────────────────────────────────────────
const QUEUE_TEMPLATES = [
  {type:'binary',   question:'Should I deploy this to production?', context:'All tests pass. No breaking changes detected. Staging looks clean.', priority:'urgent', agent:'coder'},
  {type:'choice',   question:'Which approach for the streaming UI?', context:'Three options available. Each has tradeoffs.',
   options:['WebSocket (real-time)','Server-Sent Events (simpler)','Polling (most compatible)'], priority:'normal', agent:'coder'},
  {type:'binary',   question:'Found a related paper. Should I add it to vault?', context:'Paper: "Multi-Agent Coordination Patterns in LLMs" — 2025, 12 pages.', priority:'optional', agent:'researcher'},
  {type:'freetext', question:'How should I prioritize the remaining tasks?', context:'3 P1s and 5 P2s in queue. Estimated tokens: 45K. Daily budget: 60K remaining.', priority:'normal', agent:'righthand'},
  {type:'rating',   question:'Rate the quality of this research output (1-5)', context:'Researcher completed deep-dive on Cursor UX. 8 pages, 14 insights, 6 recommendations.',
   options:['1','2','3','4','5'], priority:'optional', agent:'researcher'},
  {type:'approval', question:'Ready to commit these prompt template changes?', context:'12 templates updated. Quality scores improved. Staging review complete.',
   options:null, priority:'normal', agent:'prompt'},
];

function spawnAgent(id, task) {
  const a = ga(id); if (!a) return;
  a.status = 'active'; a.task = task || 'Running task…';
  updActiveCount();
  toast(a.emoji, `${a.name} activated`);
  addNotif(a.emoji, `${a.name}: started "${task}"`);
  addXP(25, `dispatched ${a.name}`);
  // Auto-idle after 30-60s
  setTimeout(() => {
    a.status = 'idle'; a.task = '';
    updActiveCount();
    addNotif('✅', `${a.name}: task complete`);
    FEED_EVENTS.unshift({id:'sim'+Date.now(), agent:id, type:'task_completed', time:new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}), content:`Completed: ${task}`});
    if (S.view === 'feed') rFeed();
    if (S.view === 'pulse') rPulse();
  }, 30000 + Math.random()*30000);
}

function simAddQueueCard() {
  const tmpl = QUEUE_TEMPLATES[Math.floor(Math.random()*QUEUE_TEMPLATES.length)];
  const newCard = {...tmpl, id:'sq'+Date.now(), ttl: 120+Math.floor(Math.random()*180), elapsed:0, _elapsed:0, _answered:false, _expired:false, _rating:0, _choice:null};
  if (!S.qCards) S.qCards = [];
  S.qCards.push(newCard);
  const badge = $('#queue-badge');
  if (badge) badge.textContent = (S.qCards||[]).filter(q=>!q._answered&&!q._expired).length;
  addNotif('❓', `New question: ${newCard.question.substring(0,50)}…`);
  if (S.view === 'queue') renderQueueCards();
}

function simAddFeedEvent() {
  const types = ['task_started','task_completed','file_changed','insight','vault_write'];
  const type = types[Math.floor(Math.random()*types.length)];
  const agents = AGENTS.filter(a=>a.status==='active');
  const agent = agents.length ? agents[Math.floor(Math.random()*agents.length)] : AGENTS[0];
  const contents = {
    task_started:  'Starting new analysis task. Estimated completion: 5-10 minutes.',
    task_completed:'Task completed successfully. Results saved to vault.',
    file_changed:  'Modified `dispatch-engine.sh` — improved error handling.',
    insight:       'Interesting pattern detected: correlation between token usage and task complexity.',
    vault_write:   'New note written to vault. Cross-references updated.',
  };
  FEED_EVENTS.unshift({
    id:'sim'+Date.now(), agent:agent.id, type, time:new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}),
    content: contents[type]||'Activity logged.'
  });
  if (FEED_EVENTS.length > 50) FEED_EVENTS.pop();
  if (S.view === 'feed') rFeed();

  // Add to stream
  STREAM_EVENTS.unshift({id:'ss'+Date.now(), level:'info', agent:agent.id, time:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'}), text:`[SIM] ${type}: ${agent.name}`});
  if (S.view === 'stream') renderStreamLog();
}

function simAgentToggle() {
  const idleAgents = AGENTS.filter(a => a.status === 'idle');
  const activeAgents = AGENTS.filter(a => a.status === 'active');
  if (Math.random() < 0.4 && idleAgents.length > 0) {
    const a = idleAgents[Math.floor(Math.random()*idleAgents.length)];
    const tasks = ['Analyzing patterns','Cross-referencing vault','Optimizing prompts','Scanning for errors','Running health check'];
    a.status = 'active'; a.task = tasks[Math.floor(Math.random()*tasks.length)];
  } else if (activeAgents.length > 2) {
    const a = activeAgents[Math.floor(Math.random()*activeAgents.length)];
    if (a.id !== 'righthand' && a.id !== 'researcher') { a.status = 'idle'; a.task = ''; }
  }
  updActiveCount();
  if (S.view === 'pulse') rPulse();
  if (S.view === 'feed') renderFeedTyping();
  if (S.view === 'talk') rDcMemberList();
}

// ── KEYBOARD SHORTCUTS ────────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    const o = $('#command-overlay');
    if (o.classList.contains('hidden')) openCommand();
    else closeCommand();
  }
  if (e.key === 'Escape') {
    closeCommand();
    $('#notif-panel')?.classList.add('hidden');
    $('#capture-modal')?.classList.add('hidden');
    $('#note-modal')?.classList.add('hidden');
  }
  // Board: 'n' key for new card
  if (e.key === 'n' && S.view === 'board' && !e.target.matches('input,textarea')) {
    boardAddCard('inbox');
  }
});

// Close panels on outside click
document.addEventListener('click', e => {
  const notifPanel = $('#notif-panel');
  const notifBtn = $('#notif-btn');
  if (notifPanel && !notifPanel.contains(e.target) && !notifBtn?.contains(e.target)) {
    notifPanel.classList.add('hidden');
  }
});

// ── MAIN SIMULATION LOOP ──────────────────────────────────────────────────────
function startSim() {
  // Queue card timer tick every second
  setInterval(qTick, 1000);

  // Task timer countdown
  setInterval(() => {
    if (S.timerSec > 0) S.timerSec--;
    else S.timerSec = 300 + Math.floor(Math.random()*300);
  }, 1000);

  // Feed events every 15-25s
  setInterval(() => simAddFeedEvent(), 15000 + Math.random()*10000);

  // Queue questions every 25-35s
  setInterval(() => simAddQueueCard(), 25000 + Math.random()*10000);

  // Agent status changes every 12-20s
  setInterval(() => simAgentToggle(), 12000 + Math.random()*8000);

  // Stream events (add new lines every few seconds when on stream page)
  setInterval(() => {
    if (S.view === 'stream') {
      const a = AGENTS[Math.floor(Math.random()*AGENTS.length)];
      const levels = ['debug','debug','info','info','info','warn'];
      const level = levels[Math.floor(Math.random()*levels.length)];
      const msgs = ['Heartbeat OK','Vault sync: 0 changes','Token ledger updated','Task queue depth: 2','Semaphore: 1/3 slots used'];
      STREAM_EVENTS.unshift({
        id:'rt'+Date.now(), level, agent:a.id,
        time: new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}),
        text: msgs[Math.floor(Math.random()*msgs.length)]
      });
      if (STREAM_EVENTS.length > 100) STREAM_EVENTS.pop();
      if (streamAutoScroll) renderStreamLog();
    }
  }, 3000);

  // Badge update
  setInterval(() => {
    const badge = $('#queue-badge');
    if (badge && S.qCards) {
      const cnt = S.qCards.filter(q=>!q._answered&&!q._expired).length;
      badge.textContent = cnt;
      badge.style.display = cnt > 0 ? '' : 'none';
    }
  }, 2000);
}

// ── INIT ──────────────────────────────────────────────────────────────────────
function init() {
  // Initial queue state
  S.qCards = QUEUE_QUESTIONS.map(q => ({...q, _elapsed: q.elapsed, _answered: false, _expired: false, _rating: 0, _choice: null}));

  // Growth display
  updGrowth();
  updActiveCount();

  // Initial notifs
  addNotif('🔴', 'session-watchdog has been failing for 2h');
  addNotif('❓', '8 queue items awaiting your decision');
  addNotif('✅', 'cross-channel-backlinker deployed successfully');

  // Render initial view
  rFeed();

  // Start simulation
  startSim();

  // Resize handler for graph
  window.addEventListener('resize', () => {
    if (S.view === 'mind' && S.mindView === 'graph') {
      mindGraphNodes = null;
      initMindGraph();
    }
  });

  console.log('🤖 Agent OS v5 initialized. ⌘K for command palette.');
}

// Run when DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
