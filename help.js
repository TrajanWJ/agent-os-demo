/* Agent OS — help.js — Contextual Help System + Documentation */
'use strict';

// ═══════════════════════════════════════════════════════════
// TOOLTIP SYSTEM
// ═══════════════════════════════════════════════════════════

function addHelp(selector, text, mode) {
  // mode: 'id' (default), 'query', 'class'
  let el;
  if (mode === 'query') {
    el = document.querySelector(selector);
  } else if (mode === 'class') {
    el = document.querySelector('.' + selector);
  } else {
    el = document.getElementById(selector);
  }
  if (!el) return;
  // Don't add duplicate help icons
  if (el.querySelector('.help-icon')) return;
  const help = document.createElement('span');
  help.className = 'help-icon';
  help.innerHTML = 'ℹ️';
  help.setAttribute('data-tooltip', text);
  help.addEventListener('click', e => e.stopPropagation());
  el.appendChild(help);
}

function addHelpToAll(selector, text) {
  document.querySelectorAll(selector).forEach(el => {
    if (el.querySelector('.help-icon')) return;
    const help = document.createElement('span');
    help.className = 'help-icon';
    help.innerHTML = 'ℹ️';
    help.setAttribute('data-tooltip', text);
    help.addEventListener('click', e => e.stopPropagation());
    el.appendChild(help);
  });
}

// ═══════════════════════════════════════════════════════════
// PAGE SUBTITLES
// ═══════════════════════════════════════════════════════════

const PAGE_SUBTITLES = {
  feed:      'Everything happening in your agent system, as it happens',
  inbox:     'Items from agents that need your attention — approve, reject, or reply',
  talk:      'Discord channels mirrored here — read and send messages',
  rooms:     'Multi-agent conversations — talk to groups of agents about specific topics',
  queue:     'Agent suggestions waiting for your decision. Approve to create tasks.',
  mind:      'Your knowledge vault — search, browse, visualize, and maintain 752 notes',
  missions:  'Long-term goals tracked as hill charts — see what\'s climbing and what\'s coasting',
  pipelines: 'Visual workflow showing tasks moving through stages',
  roles:     'Define what each agent can do, how autonomous they are, and when to escalate',
  records:   'Browse every object in the system — agents, tasks, missions, notes, services',
  pulse:     'Health metrics, services, workflow pipeline, and cost tracking',
  briefing:  'Your daily status document — auto-generated from live system data',
  schedule:  'Agent calendar & task timeline',
  plans:     'Agent-managed Kanban boards',
  explore:   'Search everything across Agent OS',
};

function injectPageSubtitles() {
  // Add subtitles to view headers that already exist
  document.querySelectorAll('.view-header').forEach(header => {
    const view = header.closest('.view');
    if (!view) return;
    const viewId = view.id.replace('view-', '');
    const subtitle = PAGE_SUBTITLES[viewId];
    if (!subtitle) return;
    // Check if subtitle already injected
    if (header.querySelector('.view-subtitle-help')) return;
    const existing = header.querySelector('.view-subtitle');
    if (existing) {
      existing.textContent = subtitle;
      existing.classList.add('view-subtitle-help');
    }
  });

  // For pages without a .view-header, inject subtitle below the page title
  // Feed/Stream page — inject into dash-grid area
  const feedView = document.getElementById('view-feed');
  if (feedView && !feedView.querySelector('.page-subtitle-injected')) {
    const dashGrid = feedView.querySelector('.dash-grid');
    if (dashGrid) {
      const sub = document.createElement('div');
      sub.className = 'page-subtitle-injected';
      sub.textContent = PAGE_SUBTITLES.feed;
      dashGrid.insertBefore(sub, dashGrid.firstChild);
    }
  }
}

// ═══════════════════════════════════════════════════════════
// SECTION HELP HOVERS — Applied per page
// ═══════════════════════════════════════════════════════════

function applyStreamHelp() {
  addHelp('dash-agents', 'Shows which agents are currently active and their tasks', 'id');
  addHelp('stream-filter-bar', 'Filter the stream by event type', 'id');
  // Discord mirror items get tagged when rendered — we apply a class-based rule
  addHelpToAll('.discord-mirror-item .stream-item-type-badge', '📡 Messages from the Discord agent-feed channel');
}

function applyInboxHelp() {
  // Filter tabs
  const filterHeader = document.querySelector('.inbox-list-header');
  if (filterHeader && !filterHeader.querySelector('.help-icon')) {
    addHelp('.inbox-list-header', 'Filter by category — Urgent items need immediate action', 'query');
  }

  // Keyboard shortcuts hint in detail empty state
  const detailEmpty = document.querySelector('.inbox-detail-empty');
  if (detailEmpty && !detailEmpty.querySelector('.inbox-kb-legend')) {
    const legend = document.createElement('div');
    legend.className = 'inbox-kb-legend';
    legend.style.cssText = 'margin-top:16px;font-size:12px;color:var(--text-muted);line-height:2';
    legend.innerHTML = '⌨️ <kbd>j</kbd>/<kbd>k</kbd> to navigate · <kbd>Enter</kbd> to open · <kbd>a</kbd> to approve · <kbd>r</kbd> to reject';
    detailEmpty.appendChild(legend);
  }
}

function applyMindHelp() {
  // Tab help
  const tabs = document.querySelectorAll('.mind-tab-btn');
  const tabHelp = {
    search:   'Full-text search across all 752 vault notes',
    browse:   'Navigate the vault folder structure',
    graph:    'Interactive knowledge graph showing connections between notes',
    insights: 'Vault health metrics — contradictions, gaps, orphan notes',
    reader:   'Read and edit vault notes',
  };
  tabs.forEach(tab => {
    const key = tab.dataset.tab;
    if (key && tabHelp[key] && !tab.querySelector('.help-icon')) {
      const help = document.createElement('span');
      help.className = 'help-icon';
      help.innerHTML = 'ℹ️';
      help.setAttribute('data-tooltip', tabHelp[key]);
      help.addEventListener('click', e => e.stopPropagation());
      tab.appendChild(help);
    }
  });
}

function applySystemHelp() {
  // Workflow pipeline
  const workflowSection = document.querySelector('#view-pulse .pulse-section-wide .section-title');
  if (workflowSection && !workflowSection.querySelector('.help-icon')) {
    const help = document.createElement('span');
    help.className = 'help-icon';
    help.innerHTML = 'ℹ️';
    help.setAttribute('data-tooltip', 'Real-time counts of items at each stage: Proposed → Queued → Working → Done');
    help.addEventListener('click', e => e.stopPropagation());
    workflowSection.appendChild(help);
  }

  // Metric cards
  const metricCards = document.querySelectorAll('#view-pulse .metric-card');
  const metricHelp = [
    'Total AI API costs for today — tracks spending across all agents',
    'Number of agents currently running tasks',
    'Tasks completed today across all agents',
  ];
  metricCards.forEach((card, i) => {
    if (metricHelp[i] && !card.querySelector('.help-icon')) {
      const help = document.createElement('span');
      help.className = 'help-icon';
      help.innerHTML = 'ℹ️';
      help.setAttribute('data-tooltip', metricHelp[i]);
      help.addEventListener('click', e => e.stopPropagation());
      card.appendChild(help);
    }
  });
}

function applyRolesHelp() {
  // Autonomy slider
  const autonomySlider = document.querySelector('.role-autonomy-slider');
  if (autonomySlider && !autonomySlider.parentElement.querySelector('.help-icon')) {
    const help = document.createElement('span');
    help.className = 'help-icon';
    help.innerHTML = 'ℹ️';
    help.setAttribute('data-tooltip', 'How much freedom this role has. Observer=read-only, Autopilot=full autonomy');
    help.addEventListener('click', e => e.stopPropagation());
    autonomySlider.parentElement.insertBefore(help, autonomySlider);
  }

  // Capability toggles
  const capHelp = {
    'code.read':    'Can read source code files',
    'code.write':   'Can create and modify code files',
    'vault.read':   'Can read vault knowledge notes',
    'vault.write':  'Can create and update vault notes',
    'exec':         'Can execute shell commands on the system',
    'web.search':   'Can search the web for information',
    'web.fetch':    'Can fetch and read web pages',
    'dispatch':     'Can create and assign tasks to other agents',
    'system.read':  'Can read system metrics and service status',
    'system.write': 'Can modify system configuration and services',
  };
  document.querySelectorAll('.role-cap-name').forEach(el => {
    const capName = el.textContent.trim();
    if (capHelp[capName] && !el.parentElement.querySelector('.help-icon')) {
      const help = document.createElement('span');
      help.className = 'help-icon';
      help.innerHTML = 'ℹ️';
      help.setAttribute('data-tooltip', capHelp[capName]);
      help.addEventListener('click', e => e.stopPropagation());
      el.parentElement.appendChild(help);
    }
  });
}

function applyProposalsHelp() {
  const scanBtn = document.getElementById('auto-gen-btn');
  if (scanBtn && !scanBtn.parentElement.querySelector('.help-icon')) {
    addHelp('proposals-topbar-right', 'Scan analyzes your system for improvement opportunities and generates proposals', 'query');
  }
}

// ═══════════════════════════════════════════════════════════
// EMPTY STATE MESSAGES
// ═══════════════════════════════════════════════════════════

function injectEmptyStates() {
  // Inbox empty
  const inboxEmpty = document.querySelector('.inbox-empty-state');
  if (inboxEmpty && !inboxEmpty.dataset.helpDone) {
    inboxEmpty.innerHTML = `
      <div style="font-size:48px;margin-bottom:12px">🎉</div>
      <div style="font-size:18px;font-weight:700;color:var(--text)">All caught up!</div>
      <div style="font-size:13px;color:var(--text-muted);margin-top:6px">No items need your attention. Agents are handling everything.</div>
    `;
    inboxEmpty.dataset.helpDone = '1';
  }

  // Proposals empty (already has one, enhance it)
  const queueEmpty = document.getElementById('queue-empty');
  if (queueEmpty && !queueEmpty.dataset.helpDone) {
    queueEmpty.innerHTML = `
      <div class="empty-icon">🎯</div>
      <div class="empty-title">No pending proposals</div>
      <div class="empty-desc">Click <strong>⚡ Run Scan Now</strong> to generate new improvement proposals from your system.</div>
    `;
    queueEmpty.dataset.helpDone = '1';
  }

  // Mind search empty
  const searchResults = document.getElementById('mind-search-results');
  if (searchResults && searchResults.children.length === 0 && !searchResults.dataset.helpDone) {
    const hint = document.createElement('div');
    hint.className = 'mind-empty help-empty-hint';
    hint.innerHTML = `
      <div style="font-size:36px;margin-bottom:8px">🔍</div>
      <div style="font-size:14px;color:var(--text-dim)">Search your vault of 752 notes</div>
      <div style="font-size:12px;color:var(--text-muted);margin-top:4px">Try searching for a topic, agent name, or concept</div>
    `;
    searchResults.appendChild(hint);
    searchResults.dataset.helpDone = '1';
  }
}

// ═══════════════════════════════════════════════════════════
// FIRST-TIME TUTORIAL OVERLAY
// ═══════════════════════════════════════════════════════════

function showTutorialOverlay() {
  if (localStorage.getItem('agentOS-tutorialDismissed')) return;

  const overlay = document.createElement('div');
  overlay.id = 'tutorial-overlay';
  overlay.className = 'tutorial-overlay';
  overlay.innerHTML = `
    <div class="tutorial-card">
      <div class="tutorial-header">
        <span style="font-size:32px">🤖</span>
        <h2>Welcome to Agent OS</h2>
        <p>Your cockpit for managing AI agents</p>
      </div>
      <div class="tutorial-highlights">
        <div class="tutorial-highlight">
          <span class="tutorial-highlight-icon">⚡</span>
          <div>
            <strong>Stream</strong>
            <p>Stay informed — everything happening in your system appears here</p>
          </div>
        </div>
        <div class="tutorial-highlight">
          <span class="tutorial-highlight-icon">📬</span>
          <div>
            <strong>Inbox</strong>
            <p>Take action — approve proposals, answer questions, review work</p>
          </div>
        </div>
        <div class="tutorial-highlight">
          <span class="tutorial-highlight-icon">🧠</span>
          <div>
            <strong>Mind</strong>
            <p>Your knowledge vault — 752 notes, searchable and visualized</p>
          </div>
        </div>
      </div>
      <div class="tutorial-tips">
        <div class="tutorial-tip">💡 Press <kbd>⌘K</kbd> anywhere to open the command bar</div>
        <div class="tutorial-tip">💡 Use <kbd>j</kbd>/<kbd>k</kbd> to navigate items in the Stream</div>
        <div class="tutorial-tip">💡 Click any agent emoji to see their live activity</div>
      </div>
      <button class="tutorial-dismiss" onclick="dismissTutorial()">Got it — let's go! 🚀</button>
    </div>
  `;
  document.body.appendChild(overlay);
}

function dismissTutorial() {
  localStorage.setItem('agentOS-tutorialDismissed', '1');
  const overlay = document.getElementById('tutorial-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s ease';
    setTimeout(() => overlay.remove(), 300);
  }
}

// ═══════════════════════════════════════════════════════════
// HELP APPLICATION — Runs on page navigation
// ═══════════════════════════════════════════════════════════

function applyPageHelp(page) {
  // Small delay to let page render
  setTimeout(() => {
    switch (page) {
      case 'feed':      applyStreamHelp(); break;
      case 'inbox':     applyInboxHelp(); break;
      case 'mind':      applyMindHelp(); break;
      case 'pulse':     applySystemHelp(); break;
      case 'roles':     applyRolesHelp(); break;
      case 'queue':     applyProposalsHelp(); break;
    }
  }, 300);
}

// Hook into nav() to apply help on page change
const _origNav = nav;
nav = function(page) {
  _origNav(page);
  applyPageHelp(page);
};

// ═══════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // Inject subtitles
  injectPageSubtitles();

  // Inject empty states
  injectEmptyStates();

  // Apply help for the initial page (feed)
  applyPageHelp('feed');

  // Show tutorial on first visit
  setTimeout(showTutorialOverlay, 1000);
});

// Also run when Lucide icons finish (they render async)
if (typeof lucide !== 'undefined') {
  const _origCreateIcons = lucide.createIcons;
  lucide.createIcons = function() {
    _origCreateIcons.apply(this, arguments);
    setTimeout(() => {
      injectPageSubtitles();
      applyPageHelp(currentPage || 'feed');
    }, 200);
  };
}
