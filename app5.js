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
};
function iga(id) { return INBOX_AGENTS[id] || ga(id) || { emoji: '🤖', name: id || 'System', color: '#cba6f7' }; }

// ═══════════════════════════════════════════════════════════
// PAGE 1: INBOX — Shared Agent Inbox
// ═══════════════════════════════════════════════════════════

const INBOX_CATEGORIES = [
  { id: 'all',       label: 'All',        icon: '' },
  { id: 'urgent',    label: '🔴 Urgent',  icon: '🔴' },
  { id: 'questions', label: '💬 Questions',icon: '💬' },
  { id: 'review',    label: '✅ Review',   icon: '✅' },
  { id: 'proposals', label: '📋 Proposals',icon: '📋' },
  { id: 'reports',   label: '📝 Reports',  icon: '📝' },
];

let inboxItems = [];
let inboxFilter = 'all';
let inboxSelectedId = null;
let inboxFocusIdx = -1;

// Seed data
function seedInboxItems() {
  return [
    {
      id: 'inb_1', agent: 'researcher', category: 'review', priority: 'normal', unread: true,
      subject: 'Competitive Analysis Report — Phase 2 Complete',
      preview: 'Finished deep-dive on Devin, LangSmith, and Cursor. 47 pages with scoring matrix.',
      body: `## Competitive Analysis — Phase 2\n\nCompleted deep-dive analysis of three key competitors:\n\n**Devin** — Most autonomous but lacks human oversight controls. Confidence: 0.85\n**LangSmith** — Best observability but no orchestration layer. Confidence: 0.91\n**Cursor** — Best UX but limited to code tasks. Confidence: 0.88\n\nKey finding: No existing tool combines real-time orchestration + knowledge graph + CLI + comms. This is the gap Agent OS fills.\n\n### Recommendation\nFocus differentiation on the **human-in-the-loop** paradigm. All competitors optimize for full autonomy — we optimize for augmented control.\n\nFull report: \`vault/Research/Competitive-Analysis-Phase2.md\``,
      time: new Date(Date.now() - 25 * 60000).toISOString(),
      mission: 'Market Intelligence',
      thread: [
        { sender: 'researcher', content: 'Report ready for your review. I\'ve flagged 3 areas where I\'m less confident.', time: new Date(Date.now() - 25 * 60000).toISOString() },
      ]
    },
    {
      id: 'inb_2', agent: 'coder', category: 'proposals', priority: 'urgent', unread: true,
      subject: 'Proposal: Refactor dispatch engine to async pipeline',
      preview: 'Current synchronous dispatch is causing queue backups. Proposing async redesign.',
      body: `## Proposal: Async Dispatch Pipeline\n\n**Problem:** Current dispatch engine processes tasks synchronously. At peak load (>5 concurrent agents), the queue backs up by 30-60 seconds.\n\n**Solution:** Refactor to an async pipeline with:\n- Event-driven task queue (using Node.js worker threads)\n- Backpressure handling with configurable concurrency limit\n- Circuit breaker for failing agents\n\n**Estimated effort:** 4-6 hours\n**Risk:** Medium — touches core dispatch logic\n**Tokens:** ~15K estimated\n\nShall I proceed?`,
      time: new Date(Date.now() - 45 * 60000).toISOString(),
      mission: 'Infrastructure',
      thread: []
    },
    {
      id: 'inb_3', agent: 'ops', category: 'urgent', priority: 'urgent', unread: true,
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
      id: 'inb_4', agent: 'devil', category: 'questions', priority: 'normal', unread: true,
      subject: 'Question: Should I red-team the new auth flow before launch?',
      preview: 'OAuth Guardian v4 was deployed yesterday. I can run adversarial testing.',
      body: `## Red Team Request\n\nOAuth Guardian v4 was deployed yesterday. I notice it hasn't been adversarially tested yet.\n\nI can run the following checks:\n- Token refresh race conditions\n- Expired token handling edge cases\n- Multi-store sync conflict scenarios\n- Browser auto-login fallback reliability\n\nEstimated time: 2 hours. Estimated tokens: ~8K.\n\nShould I proceed? If yes, should I prioritize any specific area?`,
      time: new Date(Date.now() - 90 * 60000).toISOString(),
      mission: 'Security Hardening',
      thread: []
    },
    {
      id: 'inb_5', agent: 'righthand', category: 'reports', priority: 'normal', unread: false,
      subject: 'Daily Summary — March 20, 2026',
      preview: '14 tasks completed, 3 proposals resolved, 2 vault notes created.',
      body: `## Daily Summary\n\n**Tasks Completed:** 14\n**Proposals Resolved:** 3 (2 approved, 1 deferred)\n**Vault Notes:** 2 new, 5 updated\n**Errors:** 1 (session watchdog — resolved)\n**Token Usage:** 42.3K / 100K budget\n\n### Highlights\n- Competitive analysis phase 2 completed\n- Dispatch engine concurrency fix deployed\n- Knowledge graph density up 23% this week\n\n### Open Items\n- Disk cleanup pending approval\n- Red team request from Devil's Advocate\n- Async dispatch proposal needs decision`,
      time: new Date(Date.now() - 3 * 3600000).toISOString(),
      mission: null,
      thread: []
    },
    {
      id: 'inb_6', agent: 'utility', category: 'review', priority: 'normal', unread: true,
      subject: 'Vault reorganization complete — review new structure',
      preview: 'Moved 23 notes to new category structure. 4 orphaned notes found.',
      body: `## Vault Reorganization\n\nCompleted the planned vault cleanup:\n\n**Moved:** 23 notes to new category structure\n**Merged:** 6 duplicate entries\n**Orphaned:** 4 notes with no backlinks (listed below)\n**New cross-links:** 12 created\n\n### Orphaned Notes\n1. \`vault/Scratch/old-prompt-ideas.md\`\n2. \`vault/Research/abandoned-tool-eval.md\`\n3. \`vault/Ops/deprecated-cron-config.md\`\n4. \`vault/Code/unused-snippet-collection.md\`\n\nShould I archive these or attempt to link them?`,
      time: new Date(Date.now() - 2 * 3600000).toISOString(),
      mission: 'Knowledge Management',
      thread: []
    },
    {
      id: 'inb_7', agent: 'coder', category: 'review', priority: 'normal', unread: true,
      subject: 'PR ready: cross-channel-backlinker v2.1',
      preview: 'Added rate limiting and retry logic. All tests passing.',
      body: `## Pull Request: cross-channel-backlinker v2.1\n\n**Changes:**\n- Added rate limiting (max 3 req/s to Discord API)\n- Retry logic with exponential backoff\n- Better error messages for failed link resolutions\n- Unit tests for all new paths (12 tests added)\n\n**Test Results:**\n\`\`\`\n✓ 47 tests passed\n✗ 0 failed\nCoverage: 84%\n\`\`\`\n\n**Files changed:** 4 (156 additions, 23 deletions)\n\nReady for review and merge.`,
      time: new Date(Date.now() - 4 * 3600000).toISOString(),
      mission: 'Infrastructure',
      thread: [
        { sender: 'coder', content: 'This addresses the rate limit storm that Devil\'s Advocate flagged.', time: new Date(Date.now() - 4 * 3600000).toISOString() },
        { sender: 'devil', content: 'Reviewed the retry logic. Looks solid. Approve from my side.', time: new Date(Date.now() - 3.5 * 3600000).toISOString() },
      ]
    },
    {
      id: 'inb_8', agent: 'researcher', category: 'questions', priority: 'normal', unread: false,
      subject: 'Which model tier for deep competitor teardown?',
      preview: 'Standard vs Heavy tier for the Devin deep-dive. Cost difference is ~$2.',
      body: `## Model Tier Decision\n\nI'm about to start the deep-dive on Devin (most autonomous competitor).\n\n**Standard tier:** ~$1.20, good for structured analysis\n**Heavy tier:** ~$3.40, better for nuanced competitive insights\n\nThe analysis involves:\n- Architecture inference from public docs\n- Feature gap analysis against Agent OS\n- Speculative capability assessment\n\nHeavy tier would give better results on the speculative parts. Your call.`,
      time: new Date(Date.now() - 5 * 3600000).toISOString(),
      mission: 'Market Intelligence',
      thread: []
    },
    {
      id: 'inb_9', agent: 'ops', category: 'reports', priority: 'normal', unread: false,
      subject: 'Infrastructure audit — Q1 complete',
      preview: 'No critical vulnerabilities. 3 minor recommendations.',
      body: `## Q1 Infrastructure Audit\n\n**Result: PASS** ✅\n\n**Findings:**\n- No critical vulnerabilities\n- SSH keys: current and properly rotated\n- Firewall rules: appropriate\n- Services: all healthy\n\n**Recommendations:**\n1. Rotate API keys (last rotation: 47 days ago)\n2. Update Node.js to 22.x LTS (currently 18.x)\n3. Consider adding disk usage monitoring cron\n\n**Next audit:** Q2 (scheduled for June)`,
      time: new Date(Date.now() - 8 * 3600000).toISOString(),
      mission: 'Security Hardening',
      thread: []
    },
    {
      id: 'inb_10', agent: 'righthand', category: 'proposals', priority: 'normal', unread: true,
      subject: 'Proposal: Add weekly knowledge graph report to briefing',
      preview: 'Auto-generate vault health metrics every Monday morning.',
      body: `## Proposal: Weekly Knowledge Graph Report\n\n**What:** Automatically generate a vault health report every Monday at 06:00 UTC.\n\n**Contents:**\n- Note count delta (new, modified, deleted)\n- Cross-link density change\n- Orphaned notes list\n- Most-linked nodes (top 10)\n- Confidence distribution histogram\n\n**Implementation:** Cron job → QMD query → Markdown report → Vault + Briefing\n\n**Effort:** ~1 hour to set up\n**Ongoing cost:** ~500 tokens/week\n\nThis gives you a weekly pulse on knowledge quality without manual checking.`,
      time: new Date(Date.now() - 6 * 3600000).toISOString(),
      mission: 'Knowledge Management',
      thread: []
    },
  ];
}

function initInbox() {
  if (inboxItems.length === 0) {
    inboxItems = seedInboxItems();
  }
  renderInbox();
}

function renderInbox() {
  renderInboxList();
  renderInboxDetail();
}

function getInboxCategoryCounts() {
  const counts = { all: inboxItems.length };
  INBOX_CATEGORIES.forEach(c => {
    if (c.id !== 'all') counts[c.id] = inboxItems.filter(i => i.category === c.id).length;
  });
  return counts;
}

function getFilteredInboxItems() {
  let items = inboxItems;
  if (inboxFilter !== 'all') {
    items = items.filter(i => i.category === inboxFilter);
  }
  // Sort: unread first, then newest
  items.sort((a, b) => {
    if (a.unread !== b.unread) return b.unread ? 1 : -1;
    return new Date(b.time) - new Date(a.time);
  });
  return items;
}

function renderInboxList() {
  const container = document.getElementById('inbox-list-panel');
  if (!container) return;

  const counts = getInboxCategoryCounts();
  const filtered = getFilteredInboxItems();
  const unreadCount = inboxItems.filter(i => i.unread).length;

  container.innerHTML = `
    <div class="inbox-list-header">
      <div class="inbox-filter-tabs">
        ${INBOX_CATEGORIES.map(c => `
          <button class="inbox-filter-tab${inboxFilter === c.id ? ' active' : ''}" onclick="setInboxFilter('${c.id}')">
            ${c.label}
            ${counts[c.id] ? `<span class="inbox-tab-badge">${counts[c.id]}</span>` : ''}
          </button>
        `).join('')}
      </div>
      <button class="inbox-mark-all-btn" onclick="markAllInboxRead()" title="Mark All Read">
        ✓ Mark All Read ${unreadCount > 0 ? `(${unreadCount})` : ''}
      </button>
    </div>
    <div class="inbox-items-list">
      ${filtered.length === 0 ? `<div class="inbox-empty-state">
        <div style="font-size:32px;margin-bottom:8px">📭</div>
        <div style="font-size:14px;font-weight:600;color:var(--text-dim)">Inbox zero!</div>
        <div style="font-size:12px;color:var(--text-muted)">Nothing needs your attention right now.</div>
      </div>` : filtered.map((item, idx) => {
        const agent = iga(item.agent);
        const timeStr = formatInboxTime(item.time);
        const isSelected = item.id === inboxSelectedId;
        const priorityDot = item.priority === 'urgent' ? '<span class="inbox-priority-dot urgent"></span>' : '';
        return `
          <div class="inbox-item${item.unread ? ' unread' : ''}${isSelected ? ' selected' : ''}" 
               data-id="${item.id}" onclick="selectInboxItem('${item.id}')" data-idx="${idx}">
            <div class="inbox-item-avatar" style="background:${agent.color}20;border-color:${agent.color}">${agent.emoji}</div>
            <div class="inbox-item-body">
              <div class="inbox-item-top-row">
                <span class="inbox-item-subject">${item.subject}</span>
                ${priorityDot}
              </div>
              <div class="inbox-item-preview">${item.preview}</div>
            </div>
            <div class="inbox-item-meta">
              <span class="inbox-item-time">${timeStr}</span>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

function renderInboxDetail() {
  const container = document.getElementById('inbox-detail-panel');
  if (!container) return;

  if (!inboxSelectedId) {
    container.innerHTML = `
      <div class="inbox-detail-empty">
        <div style="font-size:48px;margin-bottom:12px">📬</div>
        <div style="font-size:16px;font-weight:600;color:var(--text-dim)">Select an item</div>
        <div style="font-size:13px;color:var(--text-muted);margin-top:4px">Click an item from the list to view details</div>
        <div style="font-size:12px;color:var(--text-muted);margin-top:16px">Keyboard: <kbd>j</kbd>/<kbd>k</kbd> navigate, <kbd>Enter</kbd> open, <kbd>a</kbd> approve, <kbd>r</kbd> reject</div>
      </div>
    `;
    return;
  }

  const item = inboxItems.find(i => i.id === inboxSelectedId);
  if (!item) return;

  const agent = iga(item.agent);
  const timeStr = new Date(item.time).toLocaleString();

  // Render markdown-ish body
  const renderedBody = renderInboxMarkdown(item.body);

  // Thread
  const threadHTML = (item.thread && item.thread.length > 0) ? `
    <div class="inbox-thread-section">
      <div class="inbox-thread-title">💬 Thread (${item.thread.length})</div>
      ${item.thread.map(t => {
        const ta = iga(t.sender);
        return `
          <div class="inbox-thread-msg">
            <div class="inbox-thread-avatar" style="background:${ta.color}20;border-color:${ta.color}">${ta.emoji}</div>
            <div class="inbox-thread-body">
              <span class="inbox-thread-name" style="color:${ta.color}">${ta.name}</span>
              <span class="inbox-thread-time">${formatInboxTime(t.time)}</span>
              <div class="inbox-thread-text">${t.content}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  ` : '';

  container.innerHTML = `
    <div class="inbox-detail-header">
      <div class="inbox-detail-agent">
        <div class="inbox-detail-avatar" style="background:${agent.color}20;border-color:${agent.color}">${agent.emoji}</div>
        <div>
          <div class="inbox-detail-agent-name" style="color:${agent.color}">${agent.name}</div>
          <div class="inbox-detail-time">${timeStr}</div>
        </div>
        ${item.mission ? `<div class="inbox-detail-mission">🎯 ${item.mission}</div>` : ''}
      </div>
      <h2 class="inbox-detail-subject">${item.subject}</h2>
    </div>
    <div class="inbox-detail-body">${renderedBody}</div>
    ${threadHTML}
    <div class="inbox-reply-section">
      <div class="inbox-reply-input-row">
        <input type="text" class="inbox-reply-input" id="inbox-reply-input" placeholder="Reply to ${agent.name}..." 
               onkeydown="if(event.key==='Enter'){inboxReply('${item.id}');event.preventDefault();}">
        <button class="inbox-reply-send" onclick="inboxReply('${item.id}')">Send</button>
      </div>
    </div>
    <div class="inbox-action-bar">
      <button class="inbox-action-btn approve" onclick="inboxAction('${item.id}','approve')">✅ Approve</button>
      <button class="inbox-action-btn reject" onclick="inboxAction('${item.id}','reject')">❌ Reject</button>
      <button class="inbox-action-btn reply" onclick="document.getElementById('inbox-reply-input').focus()">💬 Reply</button>
      <button class="inbox-action-btn forward" onclick="inboxAction('${item.id}','forward')">➡️ Forward</button>
      <button class="inbox-action-btn pin" onclick="inboxAction('${item.id}','pin')">📌 Pin</button>
      <button class="inbox-action-btn archive" onclick="inboxAction('${item.id}','archive')">🗑️ Archive</button>
    </div>
  `;

  // Mark as read
  if (item.unread) {
    item.unread = false;
    renderInboxList();
  }
}

function renderInboxMarkdown(text) {
  if (!text) return '';
  let html = text;
  // Headers
  html = html.replace(/^### (.+)$/gm, '<h4 class="inbox-md-h3">$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3 class="inbox-md-h2">$1</h3>');
  // Code blocks
  html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => `<pre class="inbox-md-code"><code>${code.replace(/</g,'&lt;').replace(/>/g,'&gt;').trim()}</code></pre>`);
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code class="inbox-md-inline">$1</code>');
  // Bold
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Lists
  html = html.replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, match => `<ul>${match}</ul>`);
  // Numbered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');
  // Newlines
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  return `<p>${html}</p>`;
}

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

function setInboxFilter(filter) {
  inboxFilter = filter;
  inboxSelectedId = null;
  renderInbox();
}

function selectInboxItem(id) {
  inboxSelectedId = id;
  inboxFocusIdx = getFilteredInboxItems().findIndex(i => i.id === id);
  renderInbox();
}

function markAllInboxRead() {
  inboxItems.forEach(i => i.unread = false);
  toast('✓ All items marked as read', 'success');
  renderInbox();
}

function inboxAction(id, action) {
  const item = inboxItems.find(i => i.id === id);
  if (!item) return;
  const agent = iga(item.agent);

  fetch('/api/inbox/' + id + '/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  }).catch(() => {});

  switch (action) {
    case 'approve':
      toast(`✅ Approved — ${agent.name} notified`, 'success');
      addXP(10, 'inbox approve');
      removeInboxItem(id);
      break;
    case 'reject':
      const reason = prompt('Rejection reason (optional):');
      toast(`❌ Rejected${reason ? ': ' + reason : ''}`, 'info');
      removeInboxItem(id);
      break;
    case 'forward':
      const targets = Object.keys(INBOX_AGENTS).filter(a => a !== item.agent);
      const targetId = targets[Math.floor(Math.random() * targets.length)];
      const target = iga(targetId);
      toast(`➡️ Forwarded to ${target.emoji} ${target.name}`, 'success');
      item.agent = targetId;
      renderInbox();
      break;
    case 'pin':
      toast('📌 Pinned to vault', 'success');
      break;
    case 'archive':
      toast('🗑️ Archived', 'info');
      removeInboxItem(id);
      break;
  }
}

function inboxReply(id) {
  const input = document.getElementById('inbox-reply-input');
  if (!input || !input.value.trim()) return;
  const text = input.value.trim();
  const item = inboxItems.find(i => i.id === id);
  if (!item) return;

  if (!item.thread) item.thread = [];
  item.thread.push({
    sender: 'user',
    content: text,
    time: new Date().toISOString(),
  });

  input.value = '';
  toast('💬 Reply sent', 'success');
  addXP(5, 'inbox reply');
  renderInboxDetail();

  // Simulate agent response after 1-2s
  setTimeout(() => {
    const responses = [
      'Got it, I\'ll take that into account.',
      'Understood. Adjusting my approach.',
      'Thanks for the feedback. Updated.',
      'Acknowledged. Will proceed accordingly.',
      'Noted. I\'ll factor this in.',
    ];
    item.thread.push({
      sender: item.agent,
      content: responses[Math.floor(Math.random() * responses.length)],
      time: new Date().toISOString(),
    });
    if (inboxSelectedId === id) renderInboxDetail();
  }, 1500 + Math.random() * 1500);
}

function removeInboxItem(id) {
  inboxItems = inboxItems.filter(i => i.id !== id);
  if (inboxSelectedId === id) {
    inboxSelectedId = inboxItems.length > 0 ? inboxItems[0].id : null;
  }
  renderInbox();
}

// Keyboard shortcuts for inbox
document.addEventListener('keydown', e => {
  if (currentPage !== 'inbox') return;
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  if (typeof paletteOpen !== 'undefined' && paletteOpen) return;

  const items = getFilteredInboxItems();
  if (items.length === 0) return;

  switch (e.key) {
    case 'j':
      e.preventDefault();
      inboxFocusIdx = Math.min(inboxFocusIdx + 1, items.length - 1);
      selectInboxItem(items[inboxFocusIdx].id);
      break;
    case 'k':
      e.preventDefault();
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
    case 'r':
      e.preventDefault();
      if (inboxSelectedId) inboxAction(inboxSelectedId, 'reject');
      break;
    case 'f':
      e.preventDefault();
      if (inboxSelectedId) inboxAction(inboxSelectedId, 'forward');
      break;
  }
});


// ═══════════════════════════════════════════════════════════
// PAGE 2: ROOMS — Agent Groupchats
// ═══════════════════════════════════════════════════════════

let rooms = [];
let roomsCurrentId = null;
let roomsModalOpen = false;

function seedRooms() {
  return [
    {
      id: 'room_build', name: '🏗️ Build Room', agents: ['coder', 'ops', 'righthand'],
      purpose: 'Frontend sprint coordination', unread: 3,
      messages: [
        { id: 'rm1', sender: 'coder', content: 'Just pushed the async dispatch refactor. Tests passing.', time: new Date(Date.now() - 45 * 60000).toISOString() },
        { id: 'rm2', sender: 'ops', content: 'I see the deploy. Monitoring for any issues on the system side.', time: new Date(Date.now() - 40 * 60000).toISOString() },
        { id: 'rm3', sender: 'righthand', content: 'Good work. Let\'s review performance metrics in 30 minutes.', time: new Date(Date.now() - 35 * 60000).toISOString() },
        { id: 'rm4', sender: 'coder', content: 'The new rate limiter is capping at 3 req/s as designed. No queue backups so far.', time: new Date(Date.now() - 20 * 60000).toISOString() },
        { id: 'rm5', sender: 'ops', content: 'CPU is steady at 34%. Memory usage dropped slightly — good sign.', time: new Date(Date.now() - 15 * 60000).toISOString() },
      ]
    },
    {
      id: 'room_research', name: '🔍 Research Room', agents: ['researcher', 'devil'],
      purpose: 'Competitive analysis discussion', unread: 1,
      messages: [
        { id: 'rr1', sender: 'researcher', content: 'Starting the Devin deep-dive. Their agent framework is interesting but opaque.', time: new Date(Date.now() - 120 * 60000).toISOString() },
        { id: 'rr2', sender: 'devil', content: 'Be careful with their marketing claims. I\'d verify any "autonomous" benchmarks independently.', time: new Date(Date.now() - 110 * 60000).toISOString() },
        { id: 'rr3', sender: 'researcher', content: 'Good point. I\'ll cross-reference with user reports from forums and GitHub issues.', time: new Date(Date.now() - 100 * 60000).toISOString() },
      ]
    },
    {
      id: 'room_security', name: '🛡️ Security Review', agents: ['devil', 'ops'],
      purpose: 'System audit and hardening', unread: 0,
      messages: [
        { id: 'rs1', sender: 'ops', content: 'Q1 audit is clean. No critical vulns. Recommend rotating API keys.', time: new Date(Date.now() - 6 * 3600000).toISOString() },
        { id: 'rs2', sender: 'devil', content: 'Agreed on key rotation. Also want to stress-test the new OAuth flow.', time: new Date(Date.now() - 5.5 * 3600000).toISOString() },
        { id: 'rs3', sender: 'ops', content: 'I\'ll set up a staging environment for the OAuth tests. Give me 30 minutes.', time: new Date(Date.now() - 5 * 3600000).toISOString() },
      ]
    },
    {
      id: 'room_knowledge', name: '📚 Knowledge Room', agents: ['researcher', 'utility', 'righthand'],
      purpose: 'Vault organization and gaps', unread: 2,
      messages: [
        { id: 'rk1', sender: 'utility', content: 'Vault cleanup done. 23 notes reorganized, 4 orphans found.', time: new Date(Date.now() - 3 * 3600000).toISOString() },
        { id: 'rk2', sender: 'researcher', content: 'I can write bridge notes for 2 of those orphans. They connect to my competitive analysis.', time: new Date(Date.now() - 2.5 * 3600000).toISOString() },
        { id: 'rk3', sender: 'righthand', content: 'Do it. Let\'s get orphan count to zero. The graph density matters.', time: new Date(Date.now() - 2 * 3600000).toISOString() },
        { id: 'rk4', sender: 'utility', content: 'Also proposing a weekly knowledge health report. Draft proposal sent to inbox.', time: new Date(Date.now() - 90 * 60000).toISOString() },
      ]
    },
  ];
}

function initRooms() {
  if (rooms.length === 0) {
    const saved = localStorage.getItem('agent-os-rooms');
    if (saved) {
      try { rooms = JSON.parse(saved); } catch { rooms = seedRooms(); }
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
        <div style="font-size:13px;color:var(--text-muted);margin-top:4px">Or create a new one with the + button</div>
      </div>
    `;
    return;
  }

  const room = rooms.find(r => r.id === roomsCurrentId);
  if (!room) return;

  const agentRow = room.agents.map(a => {
    const ag = iga(a);
    return `<span class="rooms-member-chip" style="color:${ag.color}" title="${ag.name}">${ag.emoji}</span>`;
  }).join('');

  const messagesHTML = room.messages.map(msg => {
    const sender = msg.sender === 'user' ? { emoji: '🧑', name: 'You', color: '#cba6f7' } : iga(msg.sender);
    const isUser = msg.sender === 'user';
    return `
      <div class="rooms-message${isUser ? ' rooms-msg-user' : ''}">
        <div class="rooms-msg-avatar" style="background:${sender.color}20;border-color:${sender.color}">${sender.emoji}</div>
        <div class="rooms-msg-body">
          <div class="rooms-msg-header">
            <span class="rooms-msg-name" style="color:${sender.color}">${sender.name}</span>
            <span class="rooms-msg-time">${formatInboxTime(msg.time)}</span>
          </div>
          <div class="rooms-msg-text">${msg.content}</div>
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div class="rooms-view-header">
      <div class="rooms-view-title">${room.name}</div>
      <div class="rooms-view-members">${agentRow}</div>
      <div class="rooms-view-purpose">${room.purpose}</div>
    </div>
    <div class="rooms-messages-area" id="rooms-messages-area">
      ${messagesHTML}
    </div>
    <div class="rooms-input-bar">
      <input type="text" class="rooms-input" id="rooms-input" 
        placeholder="Message ${room.name}... (@ to mention)"
        onkeydown="if(event.key==='Enter'){sendRoomMessage();event.preventDefault();}">
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
  room.unread = 0;
  renderRoomList();
}

function selectRoom(id) {
  roomsCurrentId = id;
  renderRooms();
}

function sendRoomMessage() {
  const input = document.getElementById('rooms-input');
  if (!input || !input.value.trim()) return;
  const text = input.value.trim();
  const room = rooms.find(r => r.id === roomsCurrentId);
  if (!room) return;

  room.messages.push({
    id: 'rmsg_' + Date.now(),
    sender: 'user',
    content: text,
    time: new Date().toISOString(),
  });

  input.value = '';
  saveRooms();
  renderRoomView();

  // Simulate agent response
  setTimeout(() => {
    const respondingAgent = room.agents[Math.floor(Math.random() * room.agents.length)];
    const ag = iga(respondingAgent);
    const lowerText = text.toLowerCase();

    let responsePool;
    if (lowerText.includes('status') || lowerText.includes('update')) {
      responsePool = [
        `Current progress is on track. No blockers.`,
        `Working through the queue. Should have results in ~20 minutes.`,
        `All clear on my end. Let me pull up the latest metrics.`,
      ];
    } else if (lowerText.includes('?')) {
      responsePool = [
        `Good question. Let me check and get back to you.`,
        `I have some thoughts on this — give me a moment to organize them.`,
        `That depends on a few factors. Let me analyze.`,
      ];
    } else {
      responsePool = [
        `Understood. I'll incorporate that.`,
        `On it. Will update when there's progress.`,
        `Noted. Adjusting my approach.`,
        `Got it. That aligns with what I was thinking.`,
        `Acknowledged. Let me factor this in.`,
      ];
    }

    room.messages.push({
      id: 'rmsg_' + Date.now(),
      sender: respondingAgent,
      content: responsePool[Math.floor(Math.random() * responsePool.length)],
      time: new Date().toISOString(),
    });
    saveRooms();
    if (roomsCurrentId === room.id) renderRoomView();
  }, 1000 + Math.random() * 2000);
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
// PAGE 3: BRIEFING — Living Document
// ═══════════════════════════════════════════════════════════

let briefingRefreshTimer = null;
let briefingLastData = {};

function initBriefing() {
  renderBriefingDocument();
  // Auto-refresh every 30 seconds
  if (briefingRefreshTimer) clearInterval(briefingRefreshTimer);
  briefingRefreshTimer = setInterval(() => {
    if (currentPage === 'briefing') renderBriefingDocument();
  }, 30000);
}

async function fetchBriefingData() {
  const fetchJSON = async (url) => {
    try {
      const r = await fetch(url);
      if (r.ok) return await r.json();
    } catch {}
    return null;
  };

  const [feedData, proposalsData, systemData, agentsData] = await Promise.all([
    fetchJSON('/api/feed?limit=50').catch(() => null),
    fetchJSON('/api/proposals').catch(() => null),
    fetchJSON('/api/system').catch(() => null),
    fetchJSON('/api/agents').catch(() => null),
  ]);

  return { feed: feedData, proposals: proposalsData, system: systemData, agents: agentsData };
}

async function renderBriefingDocument() {
  const container = document.getElementById('briefing-document');
  if (!container) return;

  const data = await fetchBriefingData();

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const dayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Agent stats from global AGENTS
  const activeAgents = AGENTS.filter(a => a.status === 'active');
  const idleAgents = AGENTS.filter(a => a.status !== 'active');

  // Task completions from feed
  const tasksDone = feedEvents.filter(e => e.type === 'task_completed');
  const errors = feedEvents.filter(e => e.type === 'error');
  const vaultWrites = feedEvents.filter(e => e.type === 'vault_write');
  const questions = feedEvents.filter(e => e.type === 'question_asked');

  // Pending proposals
  const pendingProposals = queueCards.filter(q => !q._status || q._status === 'pending');
  const autoApproved = queueCards.filter(q => q._status === 'auto-approved');

  // Agent summaries
  const agentSummaries = AGENTS.map(a => {
    const agentTasks = tasksDone.filter(t => t.agent === a.id);
    const lastTask = agentTasks.length > 0 ? agentTasks[0].content : null;
    return { ...a, taskCount: agentTasks.length, lastTask };
  }).filter(a => a.taskCount > 0);

  // System health
  const systemOk = errors.length === 0;

  // Build document
  const doc = `
    <div class="briefing-doc-greeting">${greeting}, Trajan.</div>
    <div class="briefing-doc-date">It's ${dayStr}.</div>
    <p>
      <span class="briefing-live-value">${activeAgents.length}</span> agents are active, 
      <span class="briefing-live-value">${idleAgents.length}</span> are idle.
    </p>

    <div class="briefing-doc-divider">━━━ Since You Were Last Here ━━━</div>

    ${agentSummaries.length > 0 ? agentSummaries.map(a => `
      <p>${a.emoji} <strong>${a.name}</strong> completed <span class="briefing-live-value">${a.taskCount}</span> tasks${a.lastTask ? `, including "<em>${a.lastTask.substring(0, 60)}${a.lastTask.length > 60 ? '...' : ''}</em>"` : ''}.</p>
    `).join('') : '<p>No task completions recorded yet today.</p>'}

    <p><span class="briefing-live-value">${autoApproved.length}</span> proposals were auto-approved. 
    <span class="briefing-live-value">${pendingProposals.length}</span> are waiting for your decision.</p>

    <p><span class="briefing-live-value">${vaultWrites.length}</span> vault notes were created or updated.</p>

    ${errors.length > 0 ? `
      <p class="briefing-doc-warning">⚠️ <span class="briefing-live-value">${errors.length}</span> errors occurred. 
      Most recent: "<em>${errors[0].content.substring(0, 80)}</em>".</p>
    ` : '<p>No errors. Systems nominal. ✅</p>'}

    <div class="briefing-doc-divider">━━━ What Needs Your Attention ━━━</div>

    <p>You have <span class="briefing-live-value briefing-clickable" onclick="nav('inbox')">${pendingProposals.length}</span> pending decisions.
    ${pendingProposals.length > 0 ? ` Highest priority: "<em class="briefing-clickable" onclick="nav('queue')">${(pendingProposals[0].question || pendingProposals[0].title || 'Untitled').substring(0, 50)}</em>" from ${iga(pendingProposals[0].agent || pendingProposals[0]._source).emoji} ${iga(pendingProposals[0].agent || pendingProposals[0]._source).name}.` : ''}</p>

    <p><span class="briefing-live-value">${questions.length}</span> agents have questions waiting.
    ${questions.length > 0 ? ` Most urgent: "<em class="briefing-clickable" onclick="nav('feed')">${questions[0].content.substring(0, 50)}</em>" from ${iga(questions[0].agent).emoji} ${iga(questions[0].agent).name}.` : ''}</p>

    ${inboxItems.filter(i => i.unread).length > 0 ? `<p><span class="briefing-live-value briefing-clickable" onclick="nav('inbox')">${inboxItems.filter(i => i.unread).length}</span> inbox items unread.</p>` : ''}

    <div class="briefing-doc-divider">━━━ Active Missions ━━━</div>

    ${renderBriefingMissions()}

    <div class="briefing-doc-divider">━━━ System Health ━━━</div>

    <p>
      Gateway: <span class="briefing-live-value briefing-status-ok">●</span> online. 
      Bridge: <span class="briefing-live-value briefing-status-ok">●</span> connected.
    </p>
    <p>
      Disk: <span class="briefing-live-value">~87%</span>. 
      Memory: <span class="briefing-live-value">42%</span>. 
      Load: <span class="briefing-live-value">0.34</span>.
    </p>
    ${!systemOk ? '<p class="briefing-doc-warning">⚠️ Errors detected — check System page.</p>' : ''}

    <div class="briefing-doc-divider">━━━ Suggested Focus ━━━</div>

    <p>Based on pending work and urgency, consider focusing on: 
    <strong class="briefing-clickable" onclick="nav('${pendingProposals.length > 0 ? 'queue' : 'feed'}')">${
      pendingProposals.length > 0 
        ? (pendingProposals[0].question || pendingProposals[0].title || 'pending proposals').substring(0, 60)
        : 'reviewing the feed for updates'
    }</strong>.</p>
    <p style="color:var(--text-muted);font-size:14px">${
      pendingProposals.length > 0 
        ? `${pendingProposals.length} decision${pendingProposals.length !== 1 ? 's' : ''} waiting — oldest is ${formatInboxTime(pendingProposals[pendingProposals.length-1]._createdAt || pendingProposals[pendingProposals.length-1].time || new Date().toISOString())} old.`
        : 'All caught up. Good time for strategic thinking or vault review.'
    }</p>
  `;

  container.innerHTML = doc;
}

function renderBriefingMissions() {
  // Use MISSION_GOALS from data.js if available
  if (typeof MISSION_GOALS !== 'undefined' && MISSION_GOALS.length > 0) {
    return MISSION_GOALS.filter(m => m.status === 'active').map(m => {
      const pct = m.progress || Math.floor(Math.random() * 60 + 20);
      const agents = (m.agents || []).map(a => iga(a).emoji).join(' ');
      const velocity = Math.random() > 0.3 ? 'On track' : 'Slowing — velocity dropped 20%';
      return `
        <p><strong class="briefing-clickable" onclick="nav('missions')">${m.name || m.title}</strong> — 
        <span class="briefing-live-value">${pct}%</span> complete, 
        ${agents ? agents + ' working on it.' : ''}</p>
        <p style="color:var(--text-muted);font-size:14px;margin-top:-8px">${velocity}</p>
      `;
    }).join('') || '<p>No active missions.</p>';
  }

  // Fallback static missions
  return `
    <p><strong class="briefing-clickable" onclick="nav('missions')">Market Intelligence</strong> — 
    <span class="briefing-live-value">65%</span> complete, 🔬🤝 working on it.</p>
    <p style="color:var(--text-muted);font-size:14px;margin-top:-8px">On track</p>

    <p><strong class="briefing-clickable" onclick="nav('missions')">Infrastructure Hardening</strong> — 
    <span class="briefing-live-value">40%</span> complete, ⚙️😈 working on it.</p>
    <p style="color:var(--text-muted);font-size:14px;margin-top:-8px">On track</p>

    <p><strong class="briefing-clickable" onclick="nav('missions')">Knowledge Management</strong> — 
    <span class="briefing-live-value">78%</span> complete, 🔧🔬🤝 working on it.</p>
    <p style="color:var(--text-muted);font-size:14px;margin-top:-8px">On track</p>
  `;
}

function refreshBriefing() {
  toast('🔄 Refreshing briefing...', 'info', 1500);
  renderBriefingDocument();
}


// ═══════════════════════════════════════════════════════════
// NAV INTEGRATION — Hook into nav()
// ═══════════════════════════════════════════════════════════

const _origNav = nav;
// We can't easily override nav since it's declared with function, 
// but we can hook into page init by watching for view activation.
// Instead, let's just register init hooks.

// Poll for page changes
let _lastCheckedPage = '';
setInterval(() => {
  if (currentPage !== _lastCheckedPage) {
    _lastCheckedPage = currentPage;
    if (currentPage === 'inbox') initInbox();
    if (currentPage === 'rooms') initRooms();
    if (currentPage === 'briefing') initBriefing();
  }
}, 200);

// Update inbox badge on nav
setInterval(() => {
  const badge = document.getElementById('inbox-badge');
  if (badge) {
    const unread = inboxItems.filter(i => i.unread).length;
    badge.textContent = unread || '';
    badge.style.display = unread > 0 ? '' : 'none';
  }
}, 5000);
