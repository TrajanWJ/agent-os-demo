/* Agent OS v7 — app5.js — Inbox + Rooms + Briefing */
'use strict';

// ═══════════════════════════════════════════════════════════
// PAGE REGISTRATION
// ═══════════════════════════════════════════════════════════

PAGE_TITLES.inbox = 'Inbox';
PAGE_TITLES.rooms = 'Rooms';
PAGE_TITLES.briefing = 'Briefing';

// ═══════════════════════════════════════════════════════════
// SHARED: AGENTS LOOKUP (reuse global AGENTS from data.js)
// ═══════════════════════════════════════════════════════════

const INBOX_AGENTS = {
  righthand:  { emoji: '🤝', name: 'Right Hand',       color: '#E8A838' },
  researcher: { emoji: '🔬', name: 'Researcher',       color: '#2BA89E' },
  coder:      { emoji: '💻', name: 'Coder',            color: '#57A773' },
  ops:        { emoji: '⚙️', name: 'Ops',              color: '#6C7A89' },
  devil:      { emoji: '😈', name: "Devil's Advocate", color: '#C0392B' },
  utility:    { emoji: '🔧', name: 'Utility',          color: '#8E44AD' },
  security:   { emoji: '🔒', name: 'Security',         color: '#E67E22' },
  vault:      { emoji: '📚', name: 'Vault Keeper',     color: '#3498DB' },
};
function iga(id) { return INBOX_AGENTS[id] || ga(id) || { emoji: '🤖', name: id || 'System', color: '#cba6f7' }; }

// ═══════════════════════════════════════════════════════════
// PAGE 1: INBOX — Premium Shared Agent Inbox (Superhuman-inspired)
// ═══════════════════════════════════════════════════════════

const INBOX_CATEGORIES = [
  { id: 'all',       label: 'All',          icon: '',   key: '1' },
  { id: 'urgent',    label: '🔴 Urgent',    icon: '🔴', key: '2' },
  { id: 'proposals', label: '📋 Proposals', icon: '📋', key: '3' },
  { id: 'questions', label: '❓ Questions', icon: '❓', key: '4' },
  { id: 'reports',   label: '📊 Reports',   icon: '📊', key: '5' },
  { id: 'done',      label: '✅ Done',      icon: '✅', key: '6' },
];

let inboxItems = [];
let inboxFilter = 'all';
let inboxSelectedId = null;
let inboxFocusIdx = -1;
let inboxSearchQuery = '';
let inboxSortMode = 'newest';
let inboxSelectedIds = new Set();
let inboxContextVisible = true;
let inboxLabels = {};   // id -> [label strings]
let inboxDoneItems = []; // items moved to Done

// Priority system
const INBOX_PRIORITIES = {
  P0: { label: 'P0', color: '#f38ba8', bg: 'rgba(243,139,168,0.15)' },
  P1: { label: 'P1', color: '#fab387', bg: 'rgba(250,179,135,0.15)' },
  P2: { label: 'P2', color: '#f9e2af', bg: 'rgba(249,226,175,0.15)' },
  P3: { label: 'P3', color: '#a6e3a1', bg: 'rgba(166,227,161,0.15)' },
};

function getItemPriority(item) {
  if (item._priority) return item._priority;
  if (item.priority === 'urgent') return 'P0';
  return 'P3';
}

function getCategoryForItem(item) {
  if (item.category === 'urgent') return 'urgent';
  if (item.category === 'proposals' || item._type === 'proposal') return 'proposals';
  if (item.category === 'questions' || item._type === 'feed_question') return 'questions';
  if (item.category === 'reports') return 'reports';
  return item.category || 'proposals';
}

// Seed data
function seedInboxItems() {
  if (localStorage.getItem('inbox-cleared')) return [];
  return [
    {
      id: 'inb_1', agent: 'researcher', category: 'proposals', priority: 'normal', _priority: 'P2', unread: true,
      subject: 'Competitive Analysis Report — Phase 2 Complete',
      preview: 'Finished deep-dive on Devin, LangSmith, and Cursor. 47 pages with scoring matrix.',
      body: `## Competitive Analysis — Phase 2\n\nCompleted deep-dive analysis of three key competitors:\n\n**Devin** — Most autonomous but lacks human oversight controls. Confidence: 0.85\n**LangSmith** — Best observability but no orchestration layer. Confidence: 0.91\n**Cursor** — Best UX but limited to code tasks. Confidence: 0.88\n\nKey finding: No existing tool combines real-time orchestration + knowledge graph + CLI + comms. This is the gap Agent OS fills.\n\n### Recommendation\nFocus differentiation on the **human-in-the-loop** paradigm. All competitors optimize for full autonomy — we optimize for augmented control.\n\nFull report: \`vault/Research/Competitive-Analysis-Phase2.md\``,
      time: new Date(Date.now() - 25 * 60000).toISOString(),
      mission: 'Market Intelligence',
      confidence: 0.88,
      linkedItems: ['vault/Research/Competitive-Analysis-Phase2.md'],
      thread: [
        { sender: 'researcher', content: 'Report ready for your review. I\'ve flagged 3 areas where I\'m less confident.', time: new Date(Date.now() - 25 * 60000).toISOString() },
      ]
    },
    {
      id: 'inb_2', agent: 'coder', category: 'proposals', priority: 'urgent', _priority: 'P1', unread: true,
      subject: 'Proposal: Refactor dispatch engine to async pipeline',
      preview: 'Current synchronous dispatch is causing queue backups. Proposing async redesign.',
      body: `## Proposal: Async Dispatch Pipeline\n\n**Problem:** Current dispatch engine processes tasks synchronously. At peak load (>5 concurrent agents), the queue backs up by 30-60 seconds.\n\n**Solution:** Refactor to an async pipeline with:\n- Event-driven task queue (using Node.js worker threads)\n- Backpressure handling with configurable concurrency limit\n- Circuit breaker for failing agents\n\n**Estimated effort:** 4-6 hours\n**Risk:** Medium — touches core dispatch logic\n**Tokens:** ~15K estimated\n\nShall I proceed?`,
      time: new Date(Date.now() - 45 * 60000).toISOString(),
      mission: 'Infrastructure',
      confidence: 0.78,
      thread: []
    },
    {
      id: 'inb_3', agent: 'ops', category: 'urgent', priority: 'urgent', _priority: 'P0', unread: true,
      subject: '⚠️ Disk usage at 87% — approaching threshold',
      preview: 'Agent logs and session artifacts consuming 12GB. Cleanup recommended.',
      body: `## System Alert: Disk Usage\n\n**Current:** 87% of 50GB used\n**Threshold:** 90% (auto-alert)\n**Primary culprits:**\n- Agent session logs: 5.2GB (\`~/.openclaw/sessions/\`)\n- Claude Code artifacts: 4.1GB (\`~/.claude/\`)\n- Build caches: 2.8GB\n\n### Recommended Actions\n1. Archive sessions older than 7 days → \`/archive/\`\n2. Clear Claude Code build cache\n3. Rotate agent logs (keep last 3 days)\n\nI can execute cleanup automatically with your approval. Estimated space recovery: **8.4GB**.`,
      time: new Date(Date.now() - 12 * 60000).toISOString(),
      mission: null,
      thread: [
        { sender: 'ops', content: 'Detected during scheduled health check. No immediate danger but we should act within 24h.', time: new Date(Date.now() - 12 * 60000).toISOString() },
      ]
    },
    {
      id: 'inb_4', agent: 'devil', category: 'questions', priority: 'normal', _priority: 'P2', unread: true,
      subject: 'Question: Should I red-team the new auth flow before launch?',
      preview: 'OAuth Guardian v4 was deployed yesterday. I can run adversarial testing.',
      body: `## Red Team Request\n\nOAuth Guardian v4 was deployed yesterday. I notice it hasn't been adversarially tested yet.\n\nI can run the following checks:\n- Token refresh race conditions\n- Expired token handling edge cases\n- Multi-store sync conflict scenarios\n- Browser auto-login fallback reliability\n\nEstimated time: 2 hours. Estimated tokens: ~8K.\n\nShould I proceed? If yes, should I prioritize any specific area?`,
      time: new Date(Date.now() - 90 * 60000).toISOString(),
      mission: 'Security Hardening',
      thread: []
    },
    {
      id: 'inb_5', agent: 'righthand', category: 'reports', priority: 'normal', _priority: 'P3', unread: false,
      subject: 'Daily Summary — March 20, 2026',
      preview: '14 tasks completed, 3 proposals resolved, 2 vault notes created.',
      body: `## Daily Summary\n\n**Tasks Completed:** 14\n**Proposals Resolved:** 3 (2 approved, 1 deferred)\n**Vault Notes:** 2 new, 5 updated\n**Errors:** 1 (session watchdog — resolved)\n**Token Usage:** 42.3K / 100K budget\n\n### Highlights\n- Competitive analysis phase 2 completed\n- Dispatch engine concurrency fix deployed\n- Knowledge graph density up 23% this week\n\n### Open Items\n- Disk cleanup pending approval\n- Red team request from Devil's Advocate\n- Async dispatch proposal needs decision`,
      time: new Date(Date.now() - 3 * 3600000).toISOString(),
      mission: null,
      thread: []
    },
    {
      id: 'inb_6', agent: 'utility', category: 'proposals', priority: 'normal', _priority: 'P2', unread: true,
      subject: 'Vault reorganization complete — review new structure',
      preview: 'Moved 23 notes to new category structure. 4 orphaned notes found.',
      body: `## Vault Reorganization\n\nCompleted the planned vault cleanup:\n\n**Moved:** 23 notes to new category structure\n**Merged:** 6 duplicate entries\n**Orphaned:** 4 notes with no backlinks (listed below)\n**New cross-links:** 12 created\n\n### Orphaned Notes\n1. \`vault/Scratch/old-prompt-ideas.md\`\n2. \`vault/Research/abandoned-tool-eval.md\`\n3. \`vault/Ops/deprecated-cron-config.md\`\n4. \`vault/Code/unused-snippet-collection.md\`\n\nShould I archive these or attempt to link them?`,
      time: new Date(Date.now() - 2 * 3600000).toISOString(),
      mission: 'Knowledge Management',
      linkedItems: ['vault/Scratch/old-prompt-ideas.md', 'vault/Research/abandoned-tool-eval.md'],
      thread: []
    },
    {
      id: 'inb_7', agent: 'coder', category: 'proposals', priority: 'normal', _priority: 'P2', unread: true,
      subject: 'PR ready: cross-channel-backlinker v2.1',
      preview: 'Added rate limiting and retry logic. All tests passing.',
      body: `## Pull Request: cross-channel-backlinker v2.1\n\n**Changes:**\n- Added rate limiting (max 3 req/s to Discord API)\n- Retry logic with exponential backoff\n- Better error messages for failed link resolutions\n- Unit tests for all new paths (12 tests added)\n\n**Test Results:**\n\`\`\`\n✓ 47 tests passed\n✗ 0 failed\nCoverage: 84%\n\`\`\`\n\n**Files changed:** 4 (156 additions, 23 deletions)\n\nReady for review and merge.`,
      time: new Date(Date.now() - 4 * 3600000).toISOString(),
      mission: 'Infrastructure',
      confidence: 0.92,
      thread: [
        { sender: 'coder', content: 'This addresses the rate limit storm that Devil\'s Advocate flagged.', time: new Date(Date.now() - 4 * 3600000).toISOString() },
        { sender: 'devil', content: 'Reviewed the retry logic. Looks solid. Approve from my side.', time: new Date(Date.now() - 3.5 * 3600000).toISOString() },
      ]
    },
    {
      id: 'inb_8', agent: 'researcher', category: 'questions', priority: 'normal', _priority: 'P3', unread: false,
      subject: 'Which model tier for deep competitor teardown?',
      preview: 'Standard vs Heavy tier for the Devin deep-dive. Cost difference is ~$2.',
      body: `## Model Tier Decision\n\nI'm about to start the deep-dive on Devin (most autonomous competitor).\n\n**Standard tier:** ~$1.20, good for structured analysis\n**Heavy tier:** ~$3.40, better for nuanced competitive insights\n\nThe analysis involves:\n- Architecture inference from public docs\n- Feature gap analysis against Agent OS\n- Speculative capability assessment\n\nHeavy tier would give better results on the speculative parts. Your call.`,
      time: new Date(Date.now() - 5 * 3600000).toISOString(),
      mission: 'Market Intelligence',
      thread: []
    },
    {
      id: 'inb_9', agent: 'ops', category: 'reports', priority: 'normal', _priority: 'P3', unread: false,
      subject: 'Infrastructure audit — Q1 complete',
      preview: 'No critical vulnerabilities. 3 minor recommendations.',
      body: `## Q1 Infrastructure Audit\n\n**Result: PASS** ✅\n\n**Findings:**\n- No critical vulnerabilities\n- SSH keys: current and properly rotated\n- Firewall rules: appropriate\n- Services: all healthy\n\n**Recommendations:**\n1. Rotate API keys (last rotation: 47 days ago)\n2. Update Node.js to 22.x LTS (currently 18.x)\n3. Consider adding disk usage monitoring cron\n\n**Next audit:** Q2 (scheduled for June)`,
      time: new Date(Date.now() - 8 * 3600000).toISOString(),
      mission: 'Security Hardening',
      thread: []
    },
    {
      id: 'inb_10', agent: 'righthand', category: 'proposals', priority: 'normal', _priority: 'P3', unread: true,
      subject: 'Proposal: Add weekly knowledge graph report to briefing',
      preview: 'Auto-generate vault health metrics every Monday morning.',
      body: `## Proposal: Weekly Knowledge Graph Report\n\n**What:** Automatically generate a vault health report every Monday at 06:00 UTC.\n\n**Contents:**\n- Note count delta (new, modified, deleted)\n- Cross-link density change\n- Orphaned notes list\n- Most-linked nodes (top 10)\n- Confidence distribution histogram\n\n**Implementation:** Cron job → QMD query → Markdown report → Vault + Briefing\n\n**Effort:** ~1 hour to set up\n**Ongoing cost:** ~500 tokens/week\n\nThis gives you a weekly pulse on knowledge quality without manual checking.`,
      time: new Date(Date.now() - 6 * 3600000).toISOString(),
      mission: 'Knowledge Management',
      confidence: 0.85,
      thread: []
    },
  ];
}

let inboxPollTimer = null;

async function fetchRealInboxItems() {
  const items = [];
  const baseUrl = (typeof Bridge !== 'undefined' && Bridge.baseUrl) ? Bridge.baseUrl : '';
  try {
    const proposals = await fetch(`${baseUrl}/api/proposals?status=pending`).then(r => r.ok ? r.json() : []).catch(() => []);
    proposals.forEach(p => {
      items.push({
        id: p.id || 'prop_' + Date.now(),
        agent: p.source || p.source_agent || 'righthand',
        category: 'proposals',
        priority: (p.priority || 'P3') <= 'P2' ? 'urgent' : 'normal',
        _priority: p.priority || 'P3',
        unread: true,
        subject: p.title || 'Proposal',
        preview: (p.body || p.description || '').substring(0, 100),
        body: p.body || p.description || '',
        time: p.created_at || new Date().toISOString(),
        mission: null,
        thread: [],
        _proposalId: p.id,
        _type: 'proposal',
        confidence: p.confidence || null,
      });
    });
    const tasks = await fetch(`${baseUrl}/api/tasks/active`).then(r => r.ok ? r.json() : []).catch(() => []);
    tasks.forEach(t => {
      items.push({
        id: t.id || 'task_' + Date.now(),
        agent: t.agent || 'coder',
        category: 'proposals',
        priority: (t.priority || 'P3') <= 'P2' ? 'urgent' : 'normal',
        _priority: t.priority || 'P3',
        unread: true,
        subject: `Active: ${t.title || t.task || 'Task'}`,
        preview: (t.description || t.context || '').substring(0, 100),
        body: t.description || t.context || `Task ${t.id} is currently active.`,
        time: t.created_at || t.created || new Date().toISOString(),
        mission: null,
        thread: [],
        _taskId: t.id,
        _type: 'task',
      });
    });
    const feed = await fetch(`${baseUrl}/api/feed?limit=10`).then(r => r.ok ? r.json() : []).catch(() => []);
    feed.forEach(f => {
      if (f.type === 'error' || f.type === 'system_alert') {
        items.push({
          id: f.id || 'feed_' + Date.now(), agent: f.agent || 'ops', category: 'urgent',
          priority: 'urgent', _priority: 'P0', unread: true,
          subject: `⚠️ ${f.content || f.summary || 'System Alert'}`,
          preview: (f.detail || f.content || '').substring(0, 100),
          body: f.detail || f.content || '',
          time: f.timestamp || new Date().toISOString(),
          mission: null, thread: [], _feedId: f.id, _type: 'feed_error',
        });
      } else if (f.type === 'question_asked' || f.type === 'queue_item_created') {
        items.push({
          id: f.id || 'feed_' + Date.now(), agent: f.agent || 'righthand', category: 'questions',
          priority: 'normal', _priority: 'P2', unread: true,
          subject: f.content || f.summary || 'Question',
          preview: (f.detail || f.content || '').substring(0, 100),
          body: f.detail || f.content || '',
          time: f.timestamp || new Date().toISOString(),
          mission: null, thread: [], _feedId: f.id, _type: 'feed_question',
        });
      }
    });
    items.sort((a, b) => {
      if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
      if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
      return new Date(b.time) - new Date(a.time);
    });
    return items;
  } catch (e) {
    console.error('[Inbox] Failed to fetch real data:', e);
    return null;
  }
}

// ── Snooze System ──────────────────────────────────────────

function snoozeItem(id, duration) {
  const item = inboxItems.find(i => i.id === id);
  if (!item) return;
  const snoozed = JSON.parse(localStorage.getItem('inbox-snoozed') || '{}');
  snoozed[id] = Date.now() + duration;
  localStorage.setItem('inbox-snoozed', JSON.stringify(snoozed));
  inboxItems = inboxItems.filter(i => i.id !== id);
  if (inboxSelectedId === id) {
    const filtered = getFilteredInboxItems();
    inboxSelectedId = filtered.length > 0 ? filtered[0].id : null;
  }
  const labels = { 3600000: '1 hour', 14400000: '4 hours', 86400000: 'tomorrow', 604800000: 'next week' };
  toast(`⏸️ Snoozed for ${labels[duration] || formatDurationMs(duration)}`, 'info');
  renderInbox();
  renderInboxContext();
  hideSnoozeDropdown();
}

function snoozeSelectedItem(duration) {
  if (inboxSelectedId) snoozeItem(inboxSelectedId, duration);
}

function formatDurationMs(ms) {
  if (ms < 3600000) return Math.round(ms / 60000) + 'm';
  if (ms < 86400000) return Math.round(ms / 3600000) + 'h';
  return Math.round(ms / 86400000) + 'd';
}

// Check snoozed items every minute
setInterval(() => {
  const snoozed = JSON.parse(localStorage.getItem('inbox-snoozed') || '{}');
  const now = Date.now();
  let changed = false;
  Object.entries(snoozed).forEach(([id, until]) => {
    if (now >= until) {
      delete snoozed[id];
      changed = true;
    }
  });
  if (changed) {
    localStorage.setItem('inbox-snoozed', JSON.stringify(snoozed));
    if (currentPage === 'inbox') fetchRealInboxItems().then(items => {
      if (items && items.length > 0) { inboxItems = items; renderInbox(); }
    });
  }
}, 60000);

function showSnoozeDropdown() {
  const dd = document.getElementById('inbox-snooze-dropdown');
  if (!dd) return;
  dd.classList.remove('hidden');
  // Position near the snooze button in action bar
  const btn = document.querySelector('.inbox-action-btn.snooze');
  if (btn) {
    const rect = btn.getBoundingClientRect();
    dd.style.bottom = (window.innerHeight - rect.top + 4) + 'px';
    dd.style.left = rect.left + 'px';
  }
}

function hideSnoozeDropdown() {
  const dd = document.getElementById('inbox-snooze-dropdown');
  if (dd) dd.classList.add('hidden');
}

// ── Init & Polling ─────────────────────────────────────────

async function initInbox() {
  if (localStorage.getItem('inbox-cleared')) {
    inboxItems = [];
    renderInbox();
    return;
  }
  // Load labels from localStorage
  try { inboxLabels = JSON.parse(localStorage.getItem('inbox-labels') || '{}'); } catch { inboxLabels = {}; }
  try { inboxDoneItems = JSON.parse(localStorage.getItem('inbox-done') || '[]'); } catch { inboxDoneItems = []; }

  const realItems = await fetchRealInboxItems();
  if (realItems && realItems.length > 0) {
    inboxItems = realItems;
  } else {
    inboxItems = [];
  }

  // Filter out snoozed items
  const snoozed = JSON.parse(localStorage.getItem('inbox-snoozed') || '{}');
  const now = Date.now();
  inboxItems = inboxItems.filter(i => !snoozed[i.id] || now >= snoozed[i.id]);

  renderInbox();
  renderInboxContext();

  if (!inboxPollTimer) {
    inboxPollTimer = setInterval(async () => {
      if (!shouldPoll()) return;
      if (currentPage !== 'inbox') return;
      const updated = await fetchRealInboxItems();
      if (updated && updated.length > 0) {
        const readIds = new Set(inboxItems.filter(i => !i.unread).map(i => i.id));
        const snoozedNow = JSON.parse(localStorage.getItem('inbox-snoozed') || '{}');
        updated.forEach(item => { if (readIds.has(item.id)) item.unread = false; });
        inboxItems = updated.filter(i => !snoozedNow[i.id] || Date.now() >= snoozedNow[i.id]);
        renderInboxList();
      }
    }, 15000);
  }
}

// ── Render: Main ───────────────────────────────────────────

function renderInbox() {
  renderInboxCategoryTabs();
  renderInboxList();
  renderInboxDetail();
}

function renderInboxCategoryTabs() {
  const container = document.getElementById('inbox-category-tabs');
  if (!container) return;
  const counts = getInboxCategoryCounts();
  container.innerHTML = INBOX_CATEGORIES.map(c => `
    <button class="inbox-cat-tab${inboxFilter === c.id ? ' active' : ''}" onclick="setInboxFilter('${c.id}')" data-cat="${c.id}">
      <span class="inbox-cat-label">${c.label}</span>
      ${counts[c.id] ? `<span class="inbox-cat-count">${counts[c.id]}</span>` : ''}
    </button>
  `).join('');
}

function getInboxCategoryCounts() {
  const counts = { all: inboxItems.length, done: inboxDoneItems.length };
  INBOX_CATEGORIES.forEach(c => {
    if (c.id !== 'all' && c.id !== 'done') counts[c.id] = inboxItems.filter(i => getCategoryForItem(i) === c.id).length;
  });
  return counts;
}

function getFilteredInboxItems() {
  // Done tab shows done items
  if (inboxFilter === 'done') return inboxDoneItems;

  let items = [...inboxItems];

  // Filter by category
  if (inboxFilter !== 'all') {
    items = items.filter(i => getCategoryForItem(i) === inboxFilter);
  }

  // Search filter
  if (inboxSearchQuery) {
    const q = inboxSearchQuery.toLowerCase();
    items = items.filter(i =>
      (i.subject || '').toLowerCase().includes(q) ||
      (i.preview || '').toLowerCase().includes(q) ||
      (i.agent || '').toLowerCase().includes(q)
    );
  }

  // Sort
  switch (inboxSortMode) {
    case 'priority':
      items.sort((a, b) => {
        const pa = (getItemPriority(a) || 'P3').charCodeAt(1);
        const pb = (getItemPriority(b) || 'P3').charCodeAt(1);
        if (pa !== pb) return pa - pb;
        return new Date(b.time) - new Date(a.time);
      });
      break;
    case 'agent':
      items.sort((a, b) => (a.agent || '').localeCompare(b.agent || '') || new Date(b.time) - new Date(a.time));
      break;
    default: // newest
      items.sort((a, b) => {
        if (a.unread !== b.unread) return b.unread ? 1 : -1;
        return new Date(b.time) - new Date(a.time);
      });
  }
  return items;
}

function renderInboxList() {
  const container = document.getElementById('inbox-items-list');
  if (!container) return;

  const filtered = getFilteredInboxItems();
  const isDone = inboxFilter === 'done';

  if (filtered.length === 0) {
    const emptyMsg = inboxSearchQuery
      ? { icon: '🔍', title: 'No results', desc: `No items matching "${inboxSearchQuery}". Try a different search.` }
      : isDone
        ? { icon: '📭', title: 'No completed items', desc: 'Items you approve or dismiss will appear here.' }
        : { icon: '🎉', title: 'All caught up!', desc: 'Your agents are handling everything.' };

    container.innerHTML = `
      <div class="inbox-empty-state">
        <div class="inbox-empty-icon">${emptyMsg.icon}</div>
        <div class="inbox-empty-title">${emptyMsg.title}</div>
        <div class="inbox-empty-desc">${emptyMsg.desc}</div>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((item, idx) => {
    const agent = iga(item.agent);
    const timeStr = formatInboxTime(item.time);
    const isSelected = item.id === inboxSelectedId;
    const isChecked = inboxSelectedIds.has(item.id);
    const prio = INBOX_PRIORITIES[getItemPriority(item)] || INBOX_PRIORITIES.P3;
    const catLabel = getCategoryForItem(item);
    const labels = inboxLabels[item.id] || [];

    return `
      <div class="inbox-card${item.unread ? ' unread' : ''}${isSelected ? ' selected' : ''}${isDone ? ' done' : ''}"
           data-id="${item.id}" data-idx="${idx}"
           onclick="selectInboxItem('${item.id}')"
           onmouseenter="this.querySelector('.inbox-card-actions').style.opacity='1'"
           onmouseleave="this.querySelector('.inbox-card-actions').style.opacity='0'">
        <div class="inbox-card-checkbox${isChecked ? ' checked' : ''}" onclick="event.stopPropagation();toggleInboxSelect('${item.id}')">
          ${isChecked ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>' : ''}
        </div>
        <div class="inbox-card-content">
          <div class="inbox-card-row1">
            <span class="inbox-card-agent" style="color:${agent.color}">${agent.emoji} ${agent.name}</span>
            <span class="inbox-card-time">${timeStr}</span>
          </div>
          <div class="inbox-card-row2">
            ${item.unread ? '<span class="inbox-unread-dot"></span>' : ''}
            <span class="inbox-card-subject">${item.subject}</span>
          </div>
          <div class="inbox-card-row3">${item.preview}</div>
          <div class="inbox-card-row4">
            <span class="inbox-priority-badge" style="background:${prio.bg};color:${prio.color}">${prio.label}</span>
            <span class="inbox-cat-badge">${catLabel}</span>
            ${labels.map(l => `<span class="inbox-label-badge">${l}</span>`).join('')}
          </div>
        </div>
        <div class="inbox-card-actions" style="opacity:0">
          <button class="inbox-qa" title="Approve (a)" onclick="event.stopPropagation();inboxAction('${item.id}','approve')">✅</button>
          <button class="inbox-qa" title="Dismiss (x)" onclick="event.stopPropagation();inboxAction('${item.id}','dismiss')">❌</button>
          <button class="inbox-qa" title="Snooze (s)" onclick="event.stopPropagation();snoozeItem('${item.id}',3600000)">⏸️</button>
          <button class="inbox-qa" title="Delete (d)" onclick="event.stopPropagation();inboxAction('${item.id}','delete')">🗑️</button>
        </div>
      </div>
    `;
  }).join('');

  // Scroll selected into view
  if (inboxSelectedId) {
    const sel = container.querySelector('.inbox-card.selected');
    if (sel) sel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
}

function renderInboxDetail() {
  const container = document.getElementById('inbox-detail-panel');
  if (!container) return;

  if (!inboxSelectedId) {
    container.innerHTML = `
      <div class="inbox-detail-empty">
        <div class="inbox-detail-empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" stroke-width="1" stroke-linecap="round">
            <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
          </svg>
        </div>
        <div class="inbox-detail-empty-title">Select an item to view</div>
        <div class="inbox-detail-empty-sub">Use <kbd>j</kbd>/<kbd>k</kbd> to navigate · <kbd>?</kbd> for all shortcuts</div>
      </div>
    `;
    return;
  }

  // Check both active and done items
  let item = inboxItems.find(i => i.id === inboxSelectedId);
  if (!item) item = inboxDoneItems.find(i => i.id === inboxSelectedId);
  if (!item) return;

  const agent = iga(item.agent);
  const timeStr = new Date(item.time).toLocaleString();
  const prio = INBOX_PRIORITIES[getItemPriority(item)] || INBOX_PRIORITIES.P3;
  const catLabel = getCategoryForItem(item);
  const renderedBody = renderInboxMarkdown(item.body);

  // Confidence bar
  const confidenceHTML = item.confidence ? `
    <div class="inbox-confidence-bar">
      <span class="inbox-confidence-label">Confidence</span>
      <div class="inbox-confidence-track">
        <div class="inbox-confidence-fill" style="width:${Math.round(item.confidence * 100)}%;background:${item.confidence > 0.8 ? '#a6e3a1' : item.confidence > 0.6 ? '#f9e2af' : '#f38ba8'}"></div>
      </div>
      <span class="inbox-confidence-value">${Math.round(item.confidence * 100)}%</span>
    </div>
  ` : '';

  // Thread
  const threadHTML = (item.thread && item.thread.length > 0) ? `
    <div class="inbox-thread-section">
      <div class="inbox-thread-title">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        Thread (${item.thread.length})
      </div>
      ${item.thread.map(t => {
        const ta = t.sender === 'user' ? { emoji: '🧑', name: 'You', color: '#cba6f7' } : iga(t.sender);
        return `
          <div class="inbox-thread-msg">
            <div class="inbox-thread-avatar" style="background:${ta.color}15;color:${ta.color}">${ta.emoji}</div>
            <div class="inbox-thread-body">
              <div class="inbox-thread-header">
                <span class="inbox-thread-name" style="color:${ta.color}">${ta.name}</span>
                <span class="inbox-thread-time">${formatInboxTime(t.time)}</span>
              </div>
              <div class="inbox-thread-text">${t.content}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  ` : '';

  // Linked items
  const linkedHTML = (item.linkedItems && item.linkedItems.length > 0) ? `
    <div class="inbox-linked-section">
      <div class="inbox-linked-title">🔗 Linked Items</div>
      ${item.linkedItems.map(l => `<div class="inbox-linked-item"><code>${l}</code></div>`).join('')}
    </div>
  ` : '';

  const isDone = item._doneAction;

  container.innerHTML = `
    <div class="inbox-detail-scroll">
      <div class="inbox-detail-header">
        <div class="inbox-detail-header-row1">
          <div class="inbox-detail-agent-info">
            <div class="inbox-detail-avatar" style="background:${agent.color}15;color:${agent.color}">${agent.emoji}</div>
            <div class="inbox-detail-agent-meta">
              <span class="inbox-detail-agent-name" style="color:${agent.color}">${agent.name}</span>
              <span class="inbox-detail-time">${timeStr}</span>
            </div>
          </div>
          <div class="inbox-detail-badges">
            <span class="inbox-priority-badge" style="background:${prio.bg};color:${prio.color}">${prio.label}</span>
            <span class="inbox-cat-badge">${catLabel}</span>
            ${item.mission ? `<span class="inbox-mission-badge">🎯 ${item.mission}</span>` : ''}
          </div>
        </div>
        <h2 class="inbox-detail-subject">${item.subject}</h2>
      </div>

      ${confidenceHTML}

      <div class="inbox-detail-body">${renderedBody}</div>

      ${threadHTML}
      ${linkedHTML}

      <div class="inbox-reply-section">
        <div class="inbox-reply-row">
          <input type="text" class="inbox-reply-input" id="inbox-reply-input"
            placeholder="Reply to ${agent.name}..."
            onkeydown="if(event.key==='Enter'){inboxReply('${item.id}');event.preventDefault();}">
          <button class="inbox-reply-send" onclick="inboxReply('${item.id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>
      </div>
    </div>

    ${isDone ? `<div class="inbox-action-bar done-bar">
      <span class="inbox-done-label">${item._doneAction === 'approve' ? '✅ Approved' : item._doneAction === 'dismiss' ? '❌ Dismissed' : '🗑️ Deleted'}</span>
    </div>` : `<div class="inbox-action-bar">
      <button class="inbox-action-btn approve" onclick="inboxAction('${item.id}','approve')">
        <span>✅ Approve</span><kbd>a</kbd>
      </button>
      <button class="inbox-action-btn dismiss" onclick="inboxAction('${item.id}','dismiss')">
        <span>❌ Dismiss</span><kbd>x</kbd>
      </button>
      <button class="inbox-action-btn snooze" onclick="showSnoozeDropdown()">
        <span>⏸️ Snooze</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M7 10l5 5 5-5z"/></svg>
      </button>
      <button class="inbox-action-btn reply-btn" onclick="document.getElementById('inbox-reply-input')?.focus()">
        <span>↩️ Reply</span><kbd>r</kbd>
      </button>
      <button class="inbox-action-btn forward" onclick="inboxAction('${item.id}','forward')">
        <span>→ Forward</span>
      </button>
      <button class="inbox-action-btn delete" onclick="inboxAction('${item.id}','delete')">
        <span>🗑️</span><kbd>d</kbd>
      </button>
    </div>`}
  `;

  // Mark as read
  if (item.unread) {
    item.unread = false;
    renderInboxList();
  }

  // Update context sidebar
  renderInboxContext();
}

function renderInboxContext() {
  const body = document.getElementById('inbox-context-body');
  if (!body) return;

  if (!inboxSelectedId) {
    body.innerHTML = '<div class="inbox-ctx-empty">Select an item to see context</div>';
    return;
  }

  let item = inboxItems.find(i => i.id === inboxSelectedId);
  if (!item) item = inboxDoneItems.find(i => i.id === inboxSelectedId);
  if (!item) return;

  const agent = iga(item.agent);

  // Agent reliability score (simulated)
  const reliabilityScores = { righthand: 98, researcher: 92, coder: 95, ops: 97, devil: 89, utility: 88 };
  const reliability = reliabilityScores[item.agent] || 85;

  // Related items from same agent
  const relatedFromAgent = inboxItems
    .filter(i => i.agent === item.agent && i.id !== item.id)
    .slice(0, 3);

  // Timeline
  const timelineEvents = [];
  timelineEvents.push({ time: item.time, label: 'Created', icon: '📥' });
  if (item.thread && item.thread.length > 0) {
    item.thread.forEach(t => {
      timelineEvents.push({ time: t.time, label: `${iga(t.sender).name} replied`, icon: '💬' });
    });
  }

  const labels = inboxLabels[item.id] || [];

  body.innerHTML = `
    <div class="inbox-ctx-section">
      <div class="inbox-ctx-section-title">Agent</div>
      <div class="inbox-ctx-agent-card">
        <div class="inbox-ctx-agent-avatar" style="background:${agent.color}15;color:${agent.color}">${agent.emoji}</div>
        <div class="inbox-ctx-agent-info">
          <div class="inbox-ctx-agent-name" style="color:${agent.color}">${agent.name}</div>
          <div class="inbox-ctx-agent-reliability">
            <span>Reliability</span>
            <div class="inbox-ctx-reliability-bar"><div class="inbox-ctx-reliability-fill" style="width:${reliability}%;background:${reliability > 90 ? '#a6e3a1' : '#f9e2af'}"></div></div>
            <span>${reliability}%</span>
          </div>
        </div>
      </div>
    </div>

    ${relatedFromAgent.length > 0 ? `
    <div class="inbox-ctx-section">
      <div class="inbox-ctx-section-title">Related (${agent.name})</div>
      ${relatedFromAgent.map(r => `
        <div class="inbox-ctx-related-item" onclick="selectInboxItem('${r.id}')">
          <span class="inbox-ctx-related-subject">${r.subject.substring(0, 40)}${r.subject.length > 40 ? '...' : ''}</span>
          <span class="inbox-ctx-related-time">${formatInboxTime(r.time)}</span>
        </div>
      `).join('')}
    </div>` : ''}

    <div class="inbox-ctx-section">
      <div class="inbox-ctx-section-title">Timeline</div>
      <div class="inbox-ctx-timeline">
        ${timelineEvents.map(e => `
          <div class="inbox-ctx-timeline-item">
            <span class="inbox-ctx-timeline-icon">${e.icon}</span>
            <span class="inbox-ctx-timeline-label">${e.label}</span>
            <span class="inbox-ctx-timeline-time">${formatInboxTime(e.time)}</span>
          </div>
        `).join('')}
      </div>
    </div>

    <div class="inbox-ctx-section">
      <div class="inbox-ctx-section-title">Labels</div>
      <div class="inbox-ctx-labels">
        ${labels.map(l => `<span class="inbox-ctx-label">${l} <button onclick="removeInboxLabel('${item.id}','${l}')">×</button></span>`).join('')}
        <button class="inbox-ctx-add-label" onclick="addInboxLabel('${item.id}')">+ Add label</button>
      </div>
    </div>
  `;
}

// ── Markdown renderer ──────────────────────────────────────

function renderInboxMarkdown(text) {
  if (!text) return '';
  let html = text;
  html = html.replace(/^### (.+)$/gm, '<h4 class="inbox-md-h3">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 class="inbox-md-h2">$1</h3>');
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => `<pre class="inbox-md-code"><code>${code.replace(/</g,'&lt;').replace(/>/g,'&gt;').trim()}</code></pre>`);
  html = html.replace(/`([^`]+)`/g, '<code class="inbox-md-inline">$1</code>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, match => `<ul>${match}</ul>`);
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  return `<p>${html}</p>`;
}

// ── Time formatter ─────────────────────────────────────────

function formatInboxTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'now';
  if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
  if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// ── Search / Sort / Filter ─────────────────────────────────

function filterInboxSearch(query) {
  inboxSearchQuery = query;
  renderInboxList();
}

function setInboxFilter(filter) {
  inboxFilter = filter;
  inboxSelectedId = null;
  inboxSelectedIds.clear();
  renderInbox();
}

function setInboxSort(mode) {
  inboxSortMode = mode;
  document.querySelectorAll('.inbox-sort-option').forEach(el => {
    el.classList.toggle('active', el.dataset.sort === mode);
  });
  toggleInboxSort(); // close menu
  renderInboxList();
}

function toggleInboxSort() {
  const menu = document.getElementById('inbox-sort-menu');
  if (menu) menu.classList.toggle('hidden');
}

// ── Selection & Bulk Actions ───────────────────────────────

function toggleInboxSelect(id) {
  if (inboxSelectedIds.has(id)) inboxSelectedIds.delete(id);
  else inboxSelectedIds.add(id);
  updateBulkBar();
  renderInboxList();
}

function inboxClearSelection() {
  inboxSelectedIds.clear();
  updateBulkBar();
  renderInboxList();
}

function updateBulkBar() {
  const bar = document.getElementById('inbox-bulk-bar');
  const count = document.getElementById('inbox-bulk-count');
  if (!bar) return;
  if (inboxSelectedIds.size > 0) {
    bar.classList.remove('hidden');
    if (count) count.textContent = `${inboxSelectedIds.size} selected`;
  } else {
    bar.classList.add('hidden');
  }
}

async function inboxBulkAction(action) {
  const ids = [...inboxSelectedIds];
  for (const id of ids) {
    await inboxAction(id, action);
  }
  inboxSelectedIds.clear();
  updateBulkBar();
}

// ── Select item ────────────────────────────────────────────

function selectInboxItem(id) {
  inboxSelectedId = id;
  inboxFocusIdx = getFilteredInboxItems().findIndex(i => i.id === id);
  renderInboxDetail();
  renderInboxList();
  renderInboxContext();
}

// ── Mark all read ──────────────────────────────────────────

function markAllInboxRead() {
  const baseUrl = (typeof Bridge !== 'undefined' && Bridge.baseUrl) ? Bridge.baseUrl : '';
  inboxItems.forEach(i => {
    i.unread = false;
    fetch(`${baseUrl}/api/inbox/${i.id}/action`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark-read' }),
    }).catch(() => {});
  });
  toast('✓ All marked as read', 'success');
  renderInbox();
  const badge = document.getElementById('inbox-badge');
  if (badge) { badge.textContent = ''; badge.style.display = 'none'; }
}

// ── Labels ─────────────────────────────────────────────────

function addInboxLabel(id) {
  const label = prompt('Add label:');
  if (!label || !label.trim()) return;
  if (!inboxLabels[id]) inboxLabels[id] = [];
  if (!inboxLabels[id].includes(label.trim())) {
    inboxLabels[id].push(label.trim());
    localStorage.setItem('inbox-labels', JSON.stringify(inboxLabels));
    renderInboxContext();
  }
}

function removeInboxLabel(id, label) {
  if (!inboxLabels[id]) return;
  inboxLabels[id] = inboxLabels[id].filter(l => l !== label);
  localStorage.setItem('inbox-labels', JSON.stringify(inboxLabels));
  renderInboxContext();
}

// ── Context sidebar toggle ─────────────────────────────────

function toggleInboxContext() {
  const panel = document.getElementById('inbox-context-panel');
  if (!panel) return;
  inboxContextVisible = !inboxContextVisible;
  panel.classList.toggle('collapsed', !inboxContextVisible);
}

// ── Actions ────────────────────────────────────────────────

async function inboxAction(id, action) {
  const item = inboxItems.find(i => i.id === id);
  if (!item) return;
  const agent = iga(item.agent);
  const baseUrl = (typeof Bridge !== 'undefined' && Bridge.baseUrl) ? Bridge.baseUrl : '';

  // Animate item out
  const el = document.querySelector(`.inbox-card[data-id="${id}"]`);
  if (el) {
    el.style.transition = 'all 0.25s ease';
    el.style.transform = 'translateX(60px)';
    el.style.opacity = '0';
    el.style.maxHeight = '0';
    el.style.padding = '0';
    el.style.margin = '0';
  }

  await new Promise(r => setTimeout(r, 250));

  switch (action) {
    case 'approve':
      if (item._proposalId || item._type === 'proposal') {
        try {
          await fetch(`${baseUrl}/api/proposals/${item._proposalId || id}/resolve`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'approve' }),
          });
        } catch {}
      } else {
        fetch(`${baseUrl}/api/inbox/${id}/action`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'approve' }),
        }).catch(() => {});
      }
      toast(`✅ Approved — ${agent.name} notified`, 'success');
      addXP(10, 'inbox approve');
      moveInboxToDone(id, 'approve');
      break;

    case 'dismiss':
      if (item._proposalId || item._type === 'proposal') {
        try {
          await fetch(`${baseUrl}/api/proposals/${item._proposalId || id}/resolve`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'dismiss' }),
          });
        } catch {}
      } else {
        fetch(`${baseUrl}/api/inbox/${id}/action`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reject' }),
        }).catch(() => {});
      }
      toast('❌ Dismissed', 'info');
      moveInboxToDone(id, 'dismiss');
      break;

    case 'forward':
      try {
        await fetch(`${baseUrl}/api/tasks`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: item.subject, description: item.body || item.preview,
            agent: null, priority: item.priority === 'urgent' ? 'P1' : 'P3',
          }),
        });
        toast(`→ Forwarded as dispatch task`, 'success');
        moveInboxToDone(id, 'forward');
      } catch (e) {
        toast(`❌ Forward failed: ${e.message}`, 'error');
      }
      break;

    case 'delete':
      fetch(`${baseUrl}/api/inbox/${id}/action`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive' }),
      }).catch(() => {});
      toast('🗑️ Deleted', 'info');
      removeInboxItem(id);
      break;
  }
}

function moveInboxToDone(id, action) {
  const item = inboxItems.find(i => i.id === id);
  if (item) {
    item._doneAction = action;
    item._doneTime = new Date().toISOString();
    inboxDoneItems.unshift(item);
    // Keep max 50 done items
    if (inboxDoneItems.length > 50) inboxDoneItems = inboxDoneItems.slice(0, 50);
    localStorage.setItem('inbox-done', JSON.stringify(inboxDoneItems));
  }
  removeInboxItem(id);
}

function removeInboxItem(id) {
  inboxItems = inboxItems.filter(i => i.id !== id);
  if (inboxSelectedId === id) {
    const filtered = getFilteredInboxItems();
    inboxSelectedId = filtered.length > 0 ? filtered[0].id : null;
  }
  renderInbox();
  renderInboxContext();
}

// ── Reply ──────────────────────────────────────────────────

async function inboxReply(id) {
  const input = document.getElementById('inbox-reply-input');
  if (!input || !input.value.trim()) return;
  const text = input.value.trim();
  const item = inboxItems.find(i => i.id === id);
  if (!item) return;
  const baseUrl = (typeof Bridge !== 'undefined' && Bridge.baseUrl) ? Bridge.baseUrl : '';

  if (!item.thread) item.thread = [];
  item.thread.push({ sender: 'user', content: text, time: new Date().toISOString() });
  input.value = '';
  renderInboxDetail();

  try {
    await fetch(`${baseUrl}/api/agent/message`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, agent: item.agent, context: `inbox-reply:${id}` }),
    });
    toast('📨 Reply sent', 'success');
    addXP(5, 'inbox reply');
  } catch {}

  try {
    const resp = await fetch(`${baseUrl}/api/agent/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: text, agent: item.agent, context: `inbox-reply:${id}`, page: 'inbox' }),
    });
    if (resp.ok) {
      item.thread.push({ sender: item.agent, content: '🔄 Dispatched to agent. Response will appear in the feed.', time: new Date().toISOString() });
      if (inboxSelectedId === id) renderInboxDetail();
    }
  } catch {
    setTimeout(() => {
      const responses = ['Got it, I\'ll take that into account.', 'Understood. Adjusting my approach.', 'Acknowledged. Will proceed accordingly.'];
      item.thread.push({ sender: item.agent, content: responses[Math.floor(Math.random() * responses.length)], time: new Date().toISOString() });
      if (inboxSelectedId === id) renderInboxDetail();
    }, 1500);
  }
}

// ── Keyboard Navigation ────────────────────────────────────

document.addEventListener('keydown', e => {
  if (currentPage !== 'inbox') return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (typeof paletteOpen !== 'undefined' && paletteOpen) return;

  const items = getFilteredInboxItems();

  switch (e.key) {
    case 'j':
      e.preventDefault();
      if (items.length === 0) return;
      inboxFocusIdx = Math.min(inboxFocusIdx + 1, items.length - 1);
      selectInboxItem(items[inboxFocusIdx].id);
      break;
    case 'k':
      e.preventDefault();
      if (items.length === 0) return;
      inboxFocusIdx = Math.max(inboxFocusIdx - 1, 0);
      selectInboxItem(items[inboxFocusIdx].id);
      break;
    case 'Enter':
      if (inboxFocusIdx >= 0 && items[inboxFocusIdx]) selectInboxItem(items[inboxFocusIdx].id);
      break;
    case 'a':
      e.preventDefault();
      if (inboxSelectedId) inboxAction(inboxSelectedId, 'approve');
      break;
    case 'x':
      e.preventDefault();
      if (inboxSelectedId) inboxAction(inboxSelectedId, 'dismiss');
      break;
    case 'r':
      e.preventDefault();
      if (inboxSelectedId) {
        const ri = document.getElementById('inbox-reply-input');
        if (ri) ri.focus();
      }
      break;
    case 's':
      e.preventDefault();
      if (inboxSelectedId) showSnoozeDropdown();
      break;
    case 'd':
      e.preventDefault();
      if (inboxSelectedId) inboxAction(inboxSelectedId, 'delete');
      break;
    case '/':
      e.preventDefault();
      document.getElementById('inbox-search-input')?.focus();
      break;
    case 'Escape':
      hideSnoozeDropdown();
      document.getElementById('inbox-shortcuts-modal')?.classList.add('hidden');
      inboxSelectedId = null;
      renderInboxDetail();
      renderInboxContext();
      break;
    case '?':
      e.preventDefault();
      document.getElementById('inbox-shortcuts-modal')?.classList.toggle('hidden');
      break;
    case '1': case '2': case '3': case '4': case '5': case '6':
      e.preventDefault();
      const catIdx = parseInt(e.key) - 1;
      if (INBOX_CATEGORIES[catIdx]) setInboxFilter(INBOX_CATEGORIES[catIdx].id);
      break;
  }
});



// ═══════════════════════════════════════════════════════════
// PAGE 2: ROOMS — Agent Groupchats
// ═══════════════════════════════════════════════════════════

let rooms = [];
let roomsCurrentId = null;
let roomsModalOpen = false;

const ROOM_RESPONSES = {
  build: {
    agents: ['coder', 'ops'],
    triggers: {
      'bug|fix|broken|error': ["I'll look into that. Can you share the error or which file?", "Let me check — what's the expected behavior?", "On it. Can you paste the stack trace or error output?"],
      'build|deploy|ship': ["I can start on that. Want me to create a dispatch task?", "Ready to build. Should I prototype first or go straight to implementation?", "I'll set up the build pipeline. Any specific requirements?"],
      'test|check': ["Running checks now. I'll report back.", "What specifically should I verify?", "On it — I'll run the test suite and flag anything failing."],
      'refactor|clean|optimize': ["I can refactor that. Which parts feel most fragile?", "Let me profile it first, then we'll know where to optimize."],
      default: ["Got it. I'll coordinate with Ops on implementation.", "Noted. Working on it.", "Understood. I'll get started and update you with progress."]
    }
  },
  research: {
    agents: ['researcher'],
    triggers: {
      'find|search|look': ["I'll dig into that. Give me a few minutes.", "Searching now — any specific sources to prioritize?", "On it. I'll check primary sources first."],
      'compare|vs|alternative': ["I'll build a comparison. What criteria matter most?", "Good question. Let me analyze the tradeoffs.", "I'll put together a side-by-side. Give me a moment."],
      'summarize|summary|tldr': ["I'll condense that down. How detailed do you want it?", "Working on a summary now."],
      default: ["Interesting. Let me research that and come back with findings.", "I'll look into it.", "Let me dig into the literature on that."]
    }
  },
  security: {
    agents: ['devil', 'security'],
    triggers: {
      'risk|danger|vuln': ["Let me run a threat assessment.", "Where's the attack surface? I need specifics.", "I'll map out the risk vectors. Stand by."],
      'review|audit': ["I'll tear this apart. Expect pushback — that's my job.", "Send me the code or config. I'll find the holes.", "Starting adversarial review now."],
      'permission|access|auth': ["Let me check the access controls. This is usually where things break.", "I'll audit the auth flow end to end."],
      default: ["I'll find what's wrong with this. Give me a moment.", "Noted. Running adversarial analysis.", "Let me poke at this and see what breaks."]
    }
  },
  knowledge: {
    agents: ['vault'],
    triggers: {
      'find|search|where': ["Searching the vault now...", "Let me check what we have on that.", "Querying the knowledge base — one moment."],
      'organize|clean|merge': ["I can help reorganize. What's the target structure?", "Which notes need merging?", "I'll audit the current structure and propose changes."],
      'link|connect|relate': ["I'll trace the connections between those notes.", "Let me build a link map for that topic."],
      default: ["Checking the vault for related notes.", "I'll look into our knowledge base.", "Let me see what we've captured on that topic."]
    }
  }
};

function getRoomResponseKey(roomId) {
  if (roomId === 'room_build') return 'build';
  if (roomId === 'room_research') return 'research';
  if (roomId === 'room_security') return 'security';
  if (roomId === 'room_knowledge') return 'knowledge';
  // Custom rooms — try to match by agents
  const room = rooms.find(r => r.id === roomId);
  if (!room) return null;
  for (const [key, val] of Object.entries(ROOM_RESPONSES)) {
    if (val.agents.some(a => room.agents.includes(a))) return key;
  }
  return null;
}

function getTemplateResponse(roomId, text) {
  const key = getRoomResponseKey(roomId);
  if (!key) return "Understood. I'll look into that.";
  const triggers = ROOM_RESPONSES[key].triggers;
  const lowerText = text.toLowerCase();
  for (const [pattern, responses] of Object.entries(triggers)) {
    if (pattern === 'default') continue;
    if (new RegExp(pattern, 'i').test(lowerText)) {
      if (Array.isArray(responses)) return responses[Math.floor(Math.random() * responses.length)];
      return responses;
    }
  }
  const def = triggers.default;
  if (Array.isArray(def)) return def[Math.floor(Math.random() * def.length)];
  return def || "Got it. I'll work on that.";
}

function seedRooms() {
  return [
    {
      id: 'room_build', name: '🔨 Build Room', agents: ['coder', 'ops'],
      purpose: 'Talk to Coder + Ops about implementation', unread: 3,
      messages: [
        { id: 'rm1', sender: 'coder', content: 'Just pushed the async dispatch refactor. Tests passing.', time: new Date(Date.now() - 45 * 60000).toISOString() },
        { id: 'rm2', sender: 'ops', content: 'I see the deploy. Monitoring for any issues on the system side.', time: new Date(Date.now() - 40 * 60000).toISOString() },
        { id: 'rm3', sender: 'coder', content: 'The new rate limiter is capping at 3 req/s as designed. No queue backups so far.', time: new Date(Date.now() - 20 * 60000).toISOString() },
        { id: 'rm4', sender: 'ops', content: 'CPU is steady at 34%. Memory usage dropped slightly — good sign.', time: new Date(Date.now() - 15 * 60000).toISOString() },
      ]
    },
    {
      id: 'room_research', name: '🔬 Research Room', agents: ['researcher'],
      purpose: 'Talk to Researcher about findings', unread: 1,
      messages: [
        { id: 'rr1', sender: 'researcher', content: 'Starting the Devin deep-dive. Their agent framework is interesting but opaque.', time: new Date(Date.now() - 120 * 60000).toISOString() },
        { id: 'rr2', sender: 'researcher', content: "I'll cross-reference with user reports from forums and GitHub issues.", time: new Date(Date.now() - 100 * 60000).toISOString() },
      ]
    },
    {
      id: 'room_security', name: '🛡️ Security Room', agents: ['devil', 'security'],
      purpose: "Talk to Devil's Advocate + Security about risks", unread: 0,
      messages: [
        { id: 'rs1', sender: 'devil', content: "Q1 audit findings are in. I'd recommend rotating API keys immediately.", time: new Date(Date.now() - 6 * 3600000).toISOString() },
        { id: 'rs2', sender: 'security', content: 'Agreed on key rotation. Also want to stress-test the new OAuth flow.', time: new Date(Date.now() - 5.5 * 3600000).toISOString() },
        { id: 'rs3', sender: 'devil', content: "I'll tear apart the OAuth implementation and report back.", time: new Date(Date.now() - 5 * 3600000).toISOString() },
      ]
    },
    {
      id: 'room_knowledge', name: '🧠 Knowledge Room', agents: ['vault'],
      purpose: 'Talk to Vault Keeper about vault organization', unread: 2,
      messages: [
        { id: 'rk1', sender: 'vault', content: 'Vault cleanup done. 23 notes reorganized, 4 orphans found.', time: new Date(Date.now() - 3 * 3600000).toISOString() },
        { id: 'rk2', sender: 'vault', content: 'Proposing a weekly knowledge health report. Draft sent to inbox.', time: new Date(Date.now() - 90 * 60000).toISOString() },
      ]
    },
  ];
}

function initRooms() {
  if (rooms.length === 0) {
    const saved = localStorage.getItem('agent-os-rooms');
    if (saved) {
      try {
        rooms = JSON.parse(saved);
        // Clean up any stale thinking messages from interrupted sessions
        rooms.forEach(r => { r.messages = r.messages.filter(m => !m._thinking); });
      } catch { rooms = seedRooms(); }
    } else {
      rooms = seedRooms();
    }
  }
  renderRooms();
}

function saveRooms() {
  localStorage.setItem('agent-os-rooms', JSON.stringify(rooms));
}

function renderRooms() {
  renderRoomList();
  renderRoomView();
}

function renderRoomList() {
  const container = document.getElementById('rooms-list-panel');
  if (!container) return;

  container.innerHTML = `
    <div class="rooms-list-header">
      <span class="rooms-list-title">Rooms</span>
      <button class="rooms-new-btn" onclick="openNewRoomModal()">+ New Room</button>
    </div>
    <div class="rooms-list-items">
      ${rooms.map(room => {
        const agentEmojis = room.agents.map(a => iga(a).emoji).join(' ');
        const lastMsg = room.messages.length > 0 ? room.messages[room.messages.length - 1] : null;
        const lastPreview = lastMsg ? `${iga(lastMsg.sender).name}: ${lastMsg.content.substring(0, 40)}...` : 'No messages yet';
        const isSelected = room.id === roomsCurrentId;
        return `
          <div class="rooms-list-item${isSelected ? ' selected' : ''}" onclick="selectRoom('${room.id}')">
            <div class="rooms-item-top">
              <span class="rooms-item-name">${room.name}</span>
              ${room.unread > 0 ? `<span class="rooms-item-unread">${room.unread}</span>` : ''}
            </div>
            <div class="rooms-item-agents">${agentEmojis}</div>
            <div class="rooms-item-preview">${lastPreview}</div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderRoomView() {
  const container = document.getElementById('rooms-view-panel');
  if (!container) return;

  if (!roomsCurrentId) {
    container.innerHTML = `
      <div class="rooms-view-empty">
        <div style="font-size:48px;margin-bottom:12px">💬</div>
        <div style="font-size:16px;font-weight:600;color:var(--text-dim)">Select a room</div>
        <div style="font-size:13px;color:var(--text-muted);margin-top:4px">Choose a room from the sidebar to start chatting</div>
      </div>
    `;
    return;
  }

  const room = rooms.find(r => r.id === roomsCurrentId);
  if (!room) return;

  const agentRow = room.agents.map(a => {
    const ag = iga(a);
    return `<span class="rooms-member-chip" style="color:${ag.color}" title="${ag.name}">${ag.emoji} ${ag.name}</span>`;
  }).join('');

  const messagesHTML = room.messages.map(msg => {
    const sender = msg.sender === 'user' ? { emoji: '🧑', name: 'You', color: '#cba6f7' } : iga(msg.sender);
    const isUser = msg.sender === 'user';
    const isThinking = msg._thinking;
    return `
      <div class="rooms-message${isUser ? ' rooms-msg-user' : ''}${isThinking ? ' rooms-msg-thinking' : ''}">
        <div class="rooms-msg-avatar" style="background:${sender.color}20;border-color:${sender.color}">${sender.emoji}</div>
        <div class="rooms-msg-body">
          <div class="rooms-msg-header">
            <span class="rooms-msg-name" style="color:${sender.color}">${sender.name}</span>
            <span class="rooms-msg-time">${formatInboxTime(msg.time)}</span>
          </div>
          <div class="rooms-msg-text${isThinking ? ' thinking-text' : ''}">${isThinking ? '<span class="thinking-dots">Thinking<span>.</span><span>.</span><span>.</span></span>' : msg.content}</div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="rooms-view-header">
      <div class="rooms-view-header-top">
        <div class="rooms-view-title">${room.name}</div>
        <button class="rooms-clear-btn" onclick="clearRoomMessages()" title="Clear messages">🗑️ Clear</button>
      </div>
      <div class="rooms-view-members">${agentRow}</div>
      <div class="rooms-view-purpose">${room.purpose}</div>
    </div>
    <div class="rooms-messages-area" id="rooms-messages-area">
      ${messagesHTML}
    </div>
    <div class="rooms-input-bar">
      <textarea class="rooms-input" id="rooms-input" rows="1"
        placeholder="Message ${room.name}..."
        onkeydown="handleRoomInputKey(event)"
        oninput="autoResizeRoomInput(this)"></textarea>
      <button class="rooms-send-btn" onclick="sendRoomMessage()">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1.724 1.053a.5.5 0 0 1 .553-.05l12 6.5a.5.5 0 0 1 0 .894l-12 6.5A.5.5 0 0 1 1.5 14.5v-5l7-1.5-7-1.5v-5a.5.5 0 0 1 .224-.447z"/></svg>
      </button>
    </div>
  `;

  // Scroll to bottom
  setTimeout(() => {
    const area = document.getElementById('rooms-messages-area');
    if (area) area.scrollTop = area.scrollHeight;
  }, 50);

  // Clear unread
  if (room.unread > 0) {
    room.unread = 0;
    renderRoomList();
  }
}

function handleRoomInputKey(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendRoomMessage();
  }
}

function autoResizeRoomInput(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function selectRoom(id) {
  roomsCurrentId = id;
  renderRooms();
}

function clearRoomMessages() {
  const room = rooms.find(r => r.id === roomsCurrentId);
  if (!room) return;
  room.messages = [];
  saveRooms();
  renderRoomView();
  toast('Room messages cleared', 'info');
}

function sendRoomMessage() {
  const input = document.getElementById('rooms-input');
  if (!input || !input.value.trim()) return;
  const text = input.value.trim();
  const room = rooms.find(r => r.id === roomsCurrentId);
  if (!room) return;

  // Add user message
  room.messages.push({
    id: 'rmsg_' + Date.now(),
    sender: 'user',
    content: text,
    time: new Date().toISOString(),
  });

  input.value = '';
  input.style.height = 'auto';
  saveRooms();
  renderRoomView();

  // Pick a responding agent from the room
  const respondingAgent = room.agents[Math.floor(Math.random() * room.agents.length)];

  // Add "Thinking..." message
  const thinkingId = 'rmsg_thinking_' + Date.now();
  room.messages.push({
    id: thinkingId,
    sender: respondingAgent,
    content: '',
    time: new Date().toISOString(),
    _thinking: true,
  });
  saveRooms();
  renderRoomView();

  // After 1-2s, replace with real response
  const delay = 1000 + Math.random() * 1000;
  setTimeout(() => {
    const thinkingIdx = room.messages.findIndex(m => m.id === thinkingId);
    if (thinkingIdx === -1) return;

    const response = getTemplateResponse(room.id, text);
    room.messages[thinkingIdx] = {
      id: 'rmsg_' + Date.now(),
      sender: respondingAgent,
      content: response,
      time: new Date().toISOString(),
    };
    saveRooms();
    if (roomsCurrentId === room.id) renderRoomView();
  }, delay);
}

function openNewRoomModal() {
  roomsModalOpen = true;
  const overlay = document.getElementById('rooms-modal-overlay');
  if (overlay) overlay.classList.remove('hidden');
}

function closeNewRoomModal() {
  roomsModalOpen = false;
  const overlay = document.getElementById('rooms-modal-overlay');
  if (overlay) overlay.classList.add('hidden');
  // Reset form
  const nameInput = document.getElementById('new-room-name');
  const purposeInput = document.getElementById('new-room-purpose');
  if (nameInput) nameInput.value = '';
  if (purposeInput) purposeInput.value = '';
  document.querySelectorAll('.new-room-agent-cb').forEach(cb => cb.checked = false);
}

function createRoom() {
  const nameInput = document.getElementById('new-room-name');
  const purposeInput = document.getElementById('new-room-purpose');
  const name = nameInput?.value.trim();
  const purpose = purposeInput?.value.trim();
  if (!name) { toast('Room name is required', 'error'); return; }

  const selectedAgents = [];
  document.querySelectorAll('.new-room-agent-cb:checked').forEach(cb => selectedAgents.push(cb.value));
  if (selectedAgents.length === 0) { toast('Select at least one agent', 'error'); return; }

  const newRoom = {
    id: 'room_' + Date.now(),
    name,
    agents: selectedAgents,
    purpose: purpose || '',
    unread: 0,
    messages: [],
  };

  rooms.push(newRoom);
  saveRooms();
  closeNewRoomModal();
  roomsCurrentId = newRoom.id;
  renderRooms();
  toast(`Created room: ${name}`, 'success');
}



// ═══════════════════════════════════════════════════════════
// PAGE 3: BRIEFING — Comprehensive Daily Status Document
// ═══════════════════════════════════════════════════════════

let briefingRefreshTimer = null;
let briefingLastData = {};
let briefingCollapsed = {};

function initBriefing() {
  renderBriefingDocument();
  if (briefingRefreshTimer) clearInterval(briefingRefreshTimer);
  briefingRefreshTimer = setInterval(() => {
    if (!shouldPoll()) return;
    if (currentPage === 'briefing') renderBriefingDocument();
  }, 30000);
}

// Fetch all real data from bridge endpoints
async function fetchBriefingData() {
  const baseUrl = (typeof Bridge !== 'undefined' && Bridge.baseUrl) ? Bridge.baseUrl : '';
  const fetchJSON = async (url) => {
    try {
      const r = await fetch(baseUrl + url);
      if (r.ok) return await r.json();
    } catch {}
    return null;
  };

  const [systemOverview, systemAgents, systemCrons, systemServices, tasksAll, proposalsAll, proposalsPending, vaultRecent, vaultStats, feedData, discordRecent] = await Promise.all([
    fetchJSON('/api/system/overview'),
    fetchJSON('/api/system/agents'),
    fetchJSON('/api/system/crons'),
    fetchJSON('/api/system/services'),
    fetchJSON('/api/tasks/all'),
    fetchJSON('/api/proposals?status=all'),
    fetchJSON('/api/proposals?status=pending'),
    fetchJSON('/api/vault/recent?limit=20'),
    fetchJSON('/api/vault/stats'),
    fetchJSON('/api/feed?limit=50'),
    fetchJSON('/api/discord/recent?limit=20'),
  ]);

  return { systemOverview, systemAgents, systemCrons, systemServices, tasksAll, proposalsAll, proposalsPending, vaultRecent, vaultStats, feedData, discordRecent };
}

function briefingToggle(sectionId) {
  briefingCollapsed[sectionId] = !briefingCollapsed[sectionId];
  const body = document.getElementById('briefing-section-' + sectionId);
  const icon = document.getElementById('briefing-chevron-' + sectionId);
  if (body) body.style.display = briefingCollapsed[sectionId] ? 'none' : 'block';
  if (icon) icon.textContent = briefingCollapsed[sectionId] ? '▸' : '▾';
}

function briefingCard(id, icon, title, content, alertClass) {
  const collapsed = briefingCollapsed[id];
  return `
    <div class="briefing-card ${alertClass || ''}">
      <div class="briefing-card-header" onclick="briefingToggle('${id}')">
        <span class="briefing-card-icon">${icon}</span>
        <span class="briefing-card-title">${title}</span>
        <span class="briefing-card-chevron" id="briefing-chevron-${id}">${collapsed ? '▸' : '▾'}</span>
      </div>
      <div class="briefing-card-body" id="briefing-section-${id}" style="${collapsed ? 'display:none' : ''}">
        ${content}
      </div>
    </div>
  `;
}

function briefingSkeleton() {
  return `
    <div class="briefing-skeleton">
      <div class="briefing-skeleton-line" style="width:80%"></div>
      <div class="briefing-skeleton-line" style="width:60%"></div>
      <div class="briefing-skeleton-line" style="width:70%"></div>
    </div>
  `;
}

function briefingStatCard(label, value, sub, cls) {
  return `<div class="briefing-stat ${cls || ''}"><div class="briefing-stat-value">${value}</div><div class="briefing-stat-label">${label}</div>${sub ? `<div class="briefing-stat-sub">${sub}</div>` : ''}</div>`;
}

function briefingServiceDot(name, status) {
  const active = (status || '').trim() === 'active';
  const cls = active ? 'briefing-status-ok' : 'briefing-status-error';
  const label = active ? 'online' : 'down';
  return `<span class="briefing-svc"><span class="${cls}">●</span> ${name}: <strong>${label}</strong></span>`;
}

// Render Section 1: System Health
function renderBriefingSystemHealth(data) {
  const sys = data.systemOverview;
  if (!sys) return briefingCard('health', '🖥️', 'System Health', '<p class="briefing-unavailable">System data unavailable</p>');

  const diskPct = parseInt(sys.disk?.percent) || 0;
  const diskAlert = diskPct > 85 ? 'briefing-card-alert' : '';
  const memTotal = sys.memory?.total || 0;
  const memUsed = sys.memory?.used || 0;
  const memPct = memTotal > 0 ? Math.round((memUsed / memTotal) * 100) : 0;

  const stats = `
    <div class="briefing-stats-row">
      ${briefingStatCard('Uptime', sys.uptime || '—')}
      ${briefingStatCard('CPU Load', sys.load ? sys.load.avg1.toFixed(2) : '—', sys.load ? `5m: ${sys.load.avg5.toFixed(2)} · 15m: ${sys.load.avg15.toFixed(2)}` : '')}
      ${briefingStatCard('Memory', `${memPct}%`, `${memUsed}MB / ${memTotal}MB`)}
      ${briefingStatCard('Disk', sys.disk?.percent || '—', `${sys.disk?.used || '?'} / ${sys.disk?.total || '?'}`, diskPct > 85 ? 'briefing-stat-alert' : '')}
    </div>
  `;

  const svcs = sys.services || {};
  const svcList = Object.keys(svcs).length > 0
    ? `<div class="briefing-svc-row">${Object.entries(svcs).map(([n, s]) => briefingServiceDot(n, s)).join('')}</div>`
    : '';

  const diskWarn = diskPct > 85
    ? `<div class="briefing-doc-warning">⚠️ Disk usage at <strong>${diskPct}%</strong> — consider cleanup</div>`
    : '';

  return briefingCard('health', '🖥️', 'System Health', stats + svcList + diskWarn, diskAlert);
}

// Render Section 2: Agent Status
function renderBriefingAgentStatus(data) {
  const knownAgents = [
    { id: 'right-hand', name: 'Right Hand', emoji: '🤝', alwaysActive: true },
    { id: 'researcher', name: 'Researcher', emoji: '🔬' },
    { id: 'coder', name: 'Coder', emoji: '💻' },
    { id: 'ops', name: 'Ops', emoji: '⚙️' },
    { id: 'devils-advocate', name: "Devil's Advocate", emoji: '😈' },
    { id: 'utility', name: 'Utility', emoji: '🔧' },
  ];

  // Bridge agents data: { agentId: { queued: [...], doneCount: N } }
  const bridgeAgents = data.systemAgents || {};

  // Also check global AGENTS array for status
  const globalAgents = (typeof AGENTS !== 'undefined' && Array.isArray(AGENTS)) ? AGENTS : [];

  const rows = knownAgents.map(a => {
    const ba = bridgeAgents[a.id] || {};
    const ga = globalAgents.find(g => g.id === a.id);
    const queued = (ba.queued || []).length;
    const done = ba.doneCount || 0;
    const isActive = a.alwaysActive || queued > 0 || (ga && ga.status === 'active');
    const statusCls = isActive ? 'briefing-agent-active' : 'briefing-agent-idle';
    const statusLabel = isActive ? 'active' : 'idle';
    return `
      <div class="briefing-agent-row">
        <span class="briefing-agent-name">${a.emoji} ${a.name}</span>
        <span class="briefing-agent-status ${statusCls}">${statusLabel}</span>
        <span class="briefing-agent-meta">${done > 0 ? `${done} done` : ''}${queued > 0 ? ` · ${queued} queued` : ''}</span>
      </div>
    `;
  }).join('');

  return briefingCard('agents', '🤖', 'Agent Status', `<div class="briefing-agent-list">${rows}</div>`);
}

// Render Section 3: Work Summary
function renderBriefingWorkSummary(data) {
  const tasks = data.tasksAll;
  if (!tasks) return briefingCard('work', '📊', 'Work Summary', '<p class="briefing-unavailable">Task data unavailable</p>');

  const today = new Date().toISOString().slice(0, 10);
  const allTasks = Array.isArray(tasks) ? tasks : (tasks.active || []).concat(tasks.queued || [], tasks.done || [], tasks.failed || []);

  const active = allTasks.filter(t => t.status === 'active');
  const queued = allTasks.filter(t => t.status === 'queued');
  const done = allTasks.filter(t => t.status === 'done');
  const failed = allTasks.filter(t => t.status === 'failed');

  const doneToday = done.filter(t => (t.completed_at || t.updated_at || '').startsWith(today));

  const stats = `
    <div class="briefing-stats-row">
      ${briefingStatCard('Completed Today', `<span class="briefing-clickable" onclick="nav('tasks')">${doneToday.length}</span>`)}
      ${briefingStatCard('In Progress', `<span class="briefing-clickable" onclick="nav('tasks')">${active.length}</span>`)}
      ${briefingStatCard('Queued', `<span class="briefing-clickable" onclick="nav('tasks')">${queued.length}</span>`)}
      ${briefingStatCard('Failed', `<span class="briefing-clickable" onclick="nav('tasks')" style="${failed.length > 0 ? 'color:var(--red)' : ''}">${failed.length}</span>`, '', failed.length > 0 ? 'briefing-stat-alert' : '')}
    </div>
  `;

  let details = '';
  if (doneToday.length > 0) {
    details += '<div class="briefing-task-list"><strong>Completed today:</strong><ul>' +
      doneToday.slice(0, 5).map(t => `<li>${t.title || t.id}${t.agent ? ` <span class="briefing-agent-tag">${t.agent}</span>` : ''}</li>`).join('') +
      (doneToday.length > 5 ? `<li class="briefing-more">+${doneToday.length - 5} more</li>` : '') +
      '</ul></div>';
  }
  if (active.length > 0) {
    details += '<div class="briefing-task-list"><strong>In progress:</strong><ul>' +
      active.slice(0, 5).map(t => `<li>${t.title || t.id}${t.agent ? ` <span class="briefing-agent-tag">${t.agent}</span>` : ''}</li>`).join('') +
      '</ul></div>';
  }
  if (failed.length > 0) {
    details += '<div class="briefing-task-list briefing-doc-warning"><strong>Failed:</strong><ul>' +
      failed.slice(0, 3).map(t => `<li>${t.title || t.id}${t.error ? `: ${t.error.substring(0, 60)}` : ''}</li>`).join('') +
      '</ul></div>';
  }

  return briefingCard('work', '📊', 'Work Summary', stats + details, failed.length > 0 ? 'briefing-card-warn' : '');
}

// Render Section 4: Proposals
function renderBriefingProposals(data) {
  const allP = data.proposalsAll;
  const pendingP = data.proposalsPending;
  if (!allP && !pendingP) return briefingCard('proposals', '🗳️', 'Proposals', '<p class="briefing-unavailable">Proposal data unavailable</p>');

  const all = Array.isArray(allP) ? allP : [];
  const pending = Array.isArray(pendingP) ? pendingP : all.filter(p => p.status === 'pending');
  const today = new Date().toISOString().slice(0, 10);
  const autoToday = all.filter(p => (p.triage_verdict === 'auto-execute' || p.status === 'auto-approved') && (p.resolved_at || p.created_at || '').startsWith(today));
  const mostRecent = all.length > 0 ? all[0] : null;

  const content = `
    <div class="briefing-stats-row">
      ${briefingStatCard('Pending', `<span class="briefing-clickable" onclick="nav('queue')" style="${pending.length > 0 ? 'color:var(--yellow)' : ''}">${pending.length}</span>`)}
      ${briefingStatCard('Auto-Approved Today', autoToday.length)}
      ${briefingStatCard('Total', all.length)}
    </div>
    ${mostRecent ? `<p class="briefing-recent-item">Latest: "<em class="briefing-clickable" onclick="nav('queue')">${(mostRecent.title || mostRecent.question || 'Untitled').substring(0, 70)}</em>"</p>` : ''}
    ${pending.length > 0 ? `<p><span class="briefing-clickable" onclick="nav('queue')">→ Review ${pending.length} pending decision${pending.length !== 1 ? 's' : ''}</span></p>` : ''}
  `;

  return briefingCard('proposals', '🗳️', 'Proposals', content, pending.length > 0 ? 'briefing-card-attention' : '');
}

// Render Section 5: Vault Activity
function renderBriefingVault(data) {
  const recent = data.vaultRecent;
  const stats = data.vaultStats;
  if (!recent && !stats) return briefingCard('vault', '📚', 'Vault Activity', '<p class="briefing-unavailable">Vault data unavailable</p>');

  const recentNotes = Array.isArray(recent) ? recent : [];
  const today = new Date().toISOString().slice(0, 10);
  const modifiedToday = recentNotes.filter(n => (n.modified || n.mtime || '').startsWith(today));
  const latestNote = recentNotes.length > 0 ? recentNotes[0] : null;
  const totalNotes = stats?.total || stats?.count || stats?.noteCount || recentNotes.length;

  const content = `
    <div class="briefing-stats-row">
      ${briefingStatCard('Modified Today', modifiedToday.length)}
      ${briefingStatCard('Total Notes', totalNotes)}
    </div>
    ${latestNote ? `<p class="briefing-recent-item">Latest: <strong>${latestNote.title || latestNote.name || latestNote.path || '—'}</strong>${latestNote.path ? ` <span class="briefing-path">${latestNote.path}</span>` : ''}</p>` : ''}
  `;

  return briefingCard('vault', '📚', 'Vault Activity', content);
}

// Render Section 6: Discord Activity
function renderBriefingDiscord(data) {
  const msgs = data.discordRecent;
  if (!msgs) return briefingCard('discord', '💬', 'Discord Activity', '<p class="briefing-unavailable">Discord data unavailable</p>');

  const messages = Array.isArray(msgs) ? msgs : [];
  const now = Date.now();
  const hourAgo = now - 3600000;
  const recentMsgs = messages.filter(m => new Date(m.timestamp).getTime() > hourAgo);

  // Channel frequency
  const channelCounts = {};
  messages.forEach(m => {
    const ch = m.channel || 'unknown';
    channelCounts[ch] = (channelCounts[ch] || 0) + 1;
  });
  const mostActive = Object.entries(channelCounts).sort((a, b) => b[1] - a[1])[0];
  const lastMsg = messages.length > 0 ? messages[0] : null;

  const content = `
    <div class="briefing-stats-row">
      ${briefingStatCard('Last Hour', recentMsgs.length)}
      ${briefingStatCard('Most Active', mostActive ? `#${mostActive[0]}` : '—')}
    </div>
    ${lastMsg ? `<p class="briefing-recent-item">Last: <strong>${lastMsg.author || 'Unknown'}</strong>: "${(lastMsg.content || '').substring(0, 80)}${(lastMsg.content || '').length > 80 ? '...' : ''}"</p>` : ''}
  `;

  return briefingCard('discord', '💬', 'Discord Activity', content);
}

// Render Section 7: Schedule / Crons
function renderBriefingSchedule(data) {
  const crons = data.systemCrons;
  
  // Hardcoded known crons as fallback
  const knownCrons = [
    { schedule: '*/30 * * * *', command: 'QMD vault update', type: 'crontab' },
    { schedule: '0 */3 * * *', command: 'Ontology sync', type: 'crontab' },
    { schedule: '0 6 * * *', command: 'Daily healthcheck', type: 'crontab' },
    { schedule: '*/1 * * * *', command: 'Bridge sync', type: 'systemd' },
  ];

  const cronList = (Array.isArray(crons) && crons.length > 0) ? crons : knownCrons;

  const rows = cronList.slice(0, 8).map(c => {
    const sched = c.schedule || c.expression || c.timing || '—';
    const cmd = c.command || c.name || c.description || '—';
    const type = c.type || 'cron';
    return `<div class="briefing-cron-row"><span class="briefing-cron-sched">${sched}</span><span class="briefing-cron-cmd">${cmd}</span><span class="briefing-cron-type">${type}</span></div>`;
  }).join('');

  const source = (Array.isArray(crons) && crons.length > 0) ? '' : '<p class="briefing-unavailable" style="font-size:12px">Showing known crons (live endpoint unavailable)</p>';

  return briefingCard('schedule', '📅', 'Schedule / Crons', `<div class="briefing-cron-list">${rows}</div>${source}`);
}

// Render Section: Active Missions (kept from original)
function renderBriefingMissionsSection() {
  if (typeof MISSION_GOALS !== 'undefined' && MISSION_GOALS.length > 0) {
    const activeMissions = MISSION_GOALS.filter(m => m.status === 'active');
    if (activeMissions.length === 0) return '';

    const content = activeMissions.map(m => {
      const pct = m.progress || 0;
      const agents = (m.agents || []).map(a => iga(a).emoji).join(' ');
      return `
        <div class="briefing-mission-row">
          <strong class="briefing-clickable" onclick="nav('missions')">${m.name || m.title}</strong>
          <div class="briefing-progress-bar"><div class="briefing-progress-fill" style="width:${pct}%"></div></div>
          <span class="briefing-live-value">${pct}%</span>
          ${agents ? `<span class="briefing-mission-agents">${agents}</span>` : ''}
        </div>
      `;
    }).join('');

    return briefingCard('missions', '🎯', 'Active Missions', content);
  }
  return '';
}

async function renderBriefingDocument() {
  const container = document.getElementById('briefing-document');
  if (!container) return;

  // Show loading skeletons
  container.innerHTML = `
    <div class="briefing-doc-greeting">Loading briefing...</div>
    ${briefingSkeleton()}${briefingSkeleton()}${briefingSkeleton()}
  `;

  const data = await fetchBriefingData();
  briefingLastData = data;

  // Time-based greeting
  const hour = new Date().getUTCHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false });

  const doc = `
    <div class="briefing-doc-greeting">${greeting}, Trajan.</div>
    <div class="briefing-doc-date">${dayStr} · ${timeStr} UTC</div>

    ${renderBriefingSystemHealth(data)}
    ${renderBriefingAgentStatus(data)}
    ${renderBriefingWorkSummary(data)}
    ${renderBriefingProposals(data)}
    ${renderBriefingVault(data)}
    ${renderBriefingDiscord(data)}
    ${renderBriefingSchedule(data)}
    ${renderBriefingMissionsSection()}

    <div class="briefing-doc-footer">
      Last refreshed: ${timeStr} UTC · Auto-refreshes every 30s
    </div>
  `;

  container.innerHTML = doc;
}

function refreshBriefing() {
  toast('🔄 Refreshing briefing...', 'info', 1500);
  briefingLastData = {};
  renderBriefingDocument();
}

function dismissBriefingItem(elementId) {
  const el = document.getElementById(elementId);
  if (el) {
    el.style.opacity = '0';
    el.style.transform = 'translateX(100%)';
    el.style.transition = 'all 0.3s ease';
    setTimeout(() => el.remove(), 300);
    toast('Dismissed', 'info');
  }
}


// ═══════════════════════════════════════════════════════════
// NAV INTEGRATION — Hook into nav()
// ═══════════════════════════════════════════════════════════

// We can't easily override nav since it's declared with function, 
// but we can hook into page init by watching for view activation.
// Instead, let's just register init hooks.

// Poll for page changes
let _lastCheckedPage = '';
setInterval(() => {
  if (!shouldPoll()) return;
  if (currentPage !== _lastCheckedPage) {
    _lastCheckedPage = currentPage;
    if (currentPage === 'inbox') initInbox();
    if (currentPage === 'rooms') initRooms();
    if (currentPage === 'briefing') initBriefing();
  }
}, 200);

// Update inbox badge on nav
setInterval(() => {
  if (!shouldPoll()) return;
  const badge = document.getElementById('inbox-badge');
  if (badge) {
    const unread = inboxItems.filter(i => i.unread).length;
    badge.textContent = unread || '';
    badge.style.display = unread > 0 ? '' : 'none';
  }
}, 5000);
