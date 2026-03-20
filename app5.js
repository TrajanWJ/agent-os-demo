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

// Seed data
function seedInboxItems() {
  // Check if inbox was cleared by user
  if (localStorage.getItem('inbox-cleared')) return [];
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

let inboxPollTimer = null;

async function fetchRealInboxItems() {
  const items = [];
  const baseUrl = (typeof Bridge !== 'undefined' && Bridge.baseUrl) ? Bridge.baseUrl : '';

  try {
    // Fetch pending proposals → "Needs Decision" items
    const proposals = await fetch(`${baseUrl}/api/proposals?status=pending`).then(r => r.ok ? r.json() : []).catch(() => []);
    proposals.forEach(p => {
      items.push({
        id: p.id || 'prop_' + Date.now(),
        agent: p.source || p.source_agent || 'righthand',
        category: 'proposals',
        priority: (p.priority || 'P3') <= 'P2' ? 'urgent' : 'normal',
        unread: true,
        subject: p.title || 'Proposal',
        preview: (p.body || p.description || '').substring(0, 100),
        body: p.body || p.description || '',
        time: p.created_at || new Date().toISOString(),
        mission: null,
        thread: [],
        _proposalId: p.id,
        _type: 'proposal',
      });
    });

    // Fetch active tasks → "Active Work" items
    const tasks = await fetch(`${baseUrl}/api/tasks/active`).then(r => r.ok ? r.json() : []).catch(() => []);
    tasks.forEach(t => {
      items.push({
        id: t.id || 'task_' + Date.now(),
        agent: t.agent || 'coder',
        category: 'review',
        priority: (t.priority || 'P3') <= 'P2' ? 'urgent' : 'normal',
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

    // Fetch recent feed events → items that need attention (errors, questions)
    const feed = await fetch(`${baseUrl}/api/feed?limit=10`).then(r => r.ok ? r.json() : []).catch(() => []);
    feed.forEach(f => {
      if (f.type === 'error' || f.type === 'system_alert') {
        items.push({
          id: f.id || 'feed_' + Date.now(),
          agent: f.agent || 'ops',
          category: 'urgent',
          priority: 'urgent',
          unread: true,
          subject: `⚠️ ${f.content || f.summary || 'System Alert'}`,
          preview: (f.detail || f.content || '').substring(0, 100),
          body: f.detail || f.content || '',
          time: f.timestamp || new Date().toISOString(),
          mission: null,
          thread: [],
          _feedId: f.id,
          _type: 'feed_error',
        });
      } else if (f.type === 'question_asked' || f.type === 'queue_item_created') {
        items.push({
          id: f.id || 'feed_' + Date.now(),
          agent: f.agent || 'righthand',
          category: 'questions',
          priority: 'normal',
          unread: true,
          subject: f.content || f.summary || 'Question',
          preview: (f.detail || f.content || '').substring(0, 100),
          body: f.detail || f.content || '',
          time: f.timestamp || new Date().toISOString(),
          mission: null,
          thread: [],
          _feedId: f.id,
          _type: 'feed_question',
        });
      }
    });

    // Sort by urgency: urgent first, then newest
    items.sort((a, b) => {
      if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
      if (b.priority === 'urgent' && a.priority !== 'urgent') return 1;
      return new Date(b.time) - new Date(a.time);
    });

    return items;
  } catch (e) {
    console.error('[Inbox] Failed to fetch real data:', e);
    return null; // null = fallback to seed
  }
}

async function initInbox() {
  // Check if user cleared inbox
  if (localStorage.getItem('inbox-cleared')) {
    inboxItems = [];
    renderInbox();
    return;
  }
  // Try to fetch real data first
  const realItems = await fetchRealInboxItems();
  if (realItems && realItems.length > 0) {
    inboxItems = realItems;
  } else if (inboxItems.length === 0) {
    inboxItems = seedInboxItems();
  }
  renderInbox();

  // Start polling every 15 seconds
  if (!inboxPollTimer) {
    inboxPollTimer = setInterval(async () => {
      if (!shouldPoll()) return;
      if (currentPage !== 'inbox') return;
      const updated = await fetchRealInboxItems();
      if (updated && updated.length > 0) {
        // Merge: keep read state of existing items
        const readIds = new Set(inboxItems.filter(i => !i.unread).map(i => i.id));
        updated.forEach(item => {
          if (readIds.has(item.id)) item.unread = false;
        });
        inboxItems = updated;
        renderInboxList();
      }
    }, 15000);
  }
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
              <span class="inbox-thread-name entity-link entity-agent" style="color:${ta.color}" onclick="event.stopPropagation();goToEntity('agent','${t.sender}','${ta.name}')">${ta.name}</span>
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
          <div class="inbox-detail-agent-name entity-link entity-agent" style="color:${agent.color}" onclick="goToEntity('agent','${item.agent}','${agent.name}')">${agent.name}</div>
          <div class="inbox-detail-time">${timeStr}</div>
        </div>
        ${item.mission ? `<div class="inbox-detail-mission entity-link entity-mission" onclick="goToEntity('mission','${item.mission}','${item.mission}')">🎯 ${item.mission}</div>` : ''}
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
  const baseUrl = (typeof Bridge !== 'undefined' && Bridge.baseUrl) ? Bridge.baseUrl : '';
  inboxItems.forEach(i => {
    i.unread = false;
    // Notify server of read state
    fetch(`${baseUrl}/api/inbox/${i.id}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'mark-read' }),
    }).catch(() => {});
  });
  toast('✓ All items marked as read', 'success');
  renderInbox();
  // Update badge
  const badge = document.getElementById('inbox-badge');
  if (badge) { badge.textContent = ''; badge.style.display = 'none'; }
}

async function inboxAction(id, action) {
  const item = inboxItems.find(i => i.id === id);
  if (!item) return;
  const agent = iga(item.agent);
  const baseUrl = (typeof Bridge !== 'undefined' && Bridge.baseUrl) ? Bridge.baseUrl : '';

  switch (action) {
    case 'approve':
      // If it's a real proposal, resolve via bridge
      if (item._proposalId || item._type === 'proposal') {
        try {
          await fetch(`${baseUrl}/api/proposals/${item._proposalId || id}/resolve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'approve' }),
          });
          toast(`✅ Approved — ${agent.name} notified`, 'success');
          addXP(10, 'inbox approve');
          removeInboxItem(id);
        } catch (e) {
          toast(`❌ Approve failed: ${e.message}`, 'error');
        }
      } else {
        // Generic approval via inbox action endpoint
        fetch(`${baseUrl}/api/inbox/${id}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'approve' }),
        }).catch(() => {});
        toast(`✅ Approved — ${agent.name} notified`, 'success');
        addXP(10, 'inbox approve');
        removeInboxItem(id);
      }
      break;
    case 'reject':
      if (item._proposalId || item._type === 'proposal') {
        try {
          await fetch(`${baseUrl}/api/proposals/${item._proposalId || id}/resolve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'dismiss' }),
          });
          toast('❌ Rejected', 'info');
          removeInboxItem(id);
        } catch (e) {
          toast(`❌ Reject failed: ${e.message}`, 'error');
        }
      } else {
        fetch(`${baseUrl}/api/inbox/${id}/action`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'reject' }),
        }).catch(() => {});
        toast('❌ Rejected', 'info');
        removeInboxItem(id);
      }
      break;
    case 'forward':
      // Create a dispatch task
      try {
        await fetch(`${baseUrl}/api/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: item.subject,
            description: item.body || item.preview,
            agent: null,
            priority: item.priority === 'urgent' ? 'P1' : 'P3',
          }),
        });
        toast(`➡️ Forwarded as dispatch task`, 'success');
        removeInboxItem(id);
      } catch (e) {
        toast(`❌ Forward failed: ${e.message}`, 'error');
      }
      break;
    case 'pin':
      toast('📌 Pinned to vault', 'success');
      break;
    case 'archive':
      fetch(`${baseUrl}/api/inbox/${id}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'archive' }),
      }).catch(() => {});
      toast('🗑️ Archived', 'info');
      removeInboxItem(id);
      break;
  }
}

async function inboxReply(id) {
  const input = document.getElementById('inbox-reply-input');
  if (!input || !input.value.trim()) return;
  const text = input.value.trim();
  const item = inboxItems.find(i => i.id === id);
  if (!item) return;
  const baseUrl = (typeof Bridge !== 'undefined' && Bridge.baseUrl) ? Bridge.baseUrl : '';

  if (!item.thread) item.thread = [];
  item.thread.push({
    sender: 'user',
    content: text,
    time: new Date().toISOString(),
  });

  input.value = '';
  renderInboxDetail();

  // Send to real endpoint: agent message or channel message
  try {
    await fetch(`${baseUrl}/api/agent/message`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        agent: item.agent,
        context: `inbox-reply:${id}`,
      }),
    });
    toast('📨 Reply sent', 'success');
    addXP(5, 'inbox reply');
  } catch (e) {
    toast(`❌ Reply failed: ${e.message}`, 'error');
  }

  // Dispatch to agent for real response
  try {
    const resp = await fetch(`${baseUrl}/api/agent/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        agent: item.agent,
        context: `inbox-reply:${id}`,
        page: 'inbox',
      }),
    });
    if (resp.ok) {
      // Show dispatched status
      item.thread.push({
        sender: item.agent,
        content: '🔄 Dispatched to agent. Response will appear in the feed.',
        time: new Date().toISOString(),
      });
      if (inboxSelectedId === id) renderInboxDetail();
    }
  } catch {
    // Fallback: show simulated response
    setTimeout(() => {
      const responses = [
        'Got it, I\'ll take that into account.',
        'Understood. Adjusting my approach.',
        'Acknowledged. Will proceed accordingly.',
      ];
      item.thread.push({
        sender: item.agent,
        content: responses[Math.floor(Math.random() * responses.length)],
        time: new Date().toISOString(),
      });
      if (inboxSelectedId === id) renderInboxDetail();
    }, 1500);
  }
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

const ROOM_RESPONSES = {
  build: {
    agents: ['coder', 'ops'],
    triggers: {
      'bug|fix|broken|error': "I'll look into that. Can you share the error message or which file is affected?",
      'build|deploy|ship': "I can start working on that. Should I create a dispatch task?",
      'test|check': "Running checks now. I'll report back with results.",
      default: "Got it. I'll coordinate with Ops on implementation."
    }
  },
  research: {
    agents: ['researcher'],
    triggers: {
      'find|search|look up': "I'll research that. Give me a few minutes to scan sources.",
      'compare|vs|alternative': "I'll put together a comparison. What criteria matter most?",
      default: "Interesting question. Let me dig into that and come back with findings."
    }
  },
  security: {
    agents: ['devil', 'security'],
    triggers: {
      'risk|danger|vulnerability': "Let me run a threat assessment on that.",
      'review|audit': "I'll do a critical review. Expect pushback — that's my job.",
      default: "I'll tear this apart and see what holds up."
    }
  },
  knowledge: {
    agents: ['vault'],
    triggers: {
      'find|search|where': "Let me search the vault for that. One moment.",
      'organize|clean|merge': "I can help reorganize. What's the target structure?",
      default: "I'll check the vault. There might be related notes."
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
  for (const [pattern, response] of Object.entries(triggers)) {
    if (pattern === 'default') continue;
    if (new RegExp(pattern, 'i').test(lowerText)) return response;
  }
  return triggers.default || "Got it. I'll work on that.";
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
