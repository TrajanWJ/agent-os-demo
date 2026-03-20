/* Agent OS — explore.js — Documentation, Guides, Info Hovers & Onboarding */
'use strict';

// ═══════════════════════════════════════════════════════════
// EXPLORE / DOCUMENTATION PAGE
// ═══════════════════════════════════════════════════════════

function renderExplore() {
  const el = document.getElementById('explore-content');
  if (!el) return;

  el.innerHTML = `
    <!-- Getting Started -->
    <section class="docs-section docs-hero">
      <div class="docs-hero-inner">
        <div class="docs-hero-icon">🤖</div>
        <h2 class="docs-hero-title">Welcome to Agent OS</h2>
        <p class="docs-hero-subtitle">Your cockpit for managing AI agents. Monitor, direct, and collaborate with a team of specialized agents that work for you around the clock.</p>
        <div class="docs-hero-actions">
          <button class="docs-btn docs-btn-primary" onclick="startGuidedTour()">🚀 Take the Tour</button>
          <button class="docs-btn docs-btn-secondary" onclick="scrollToSection('docs-concepts')">📖 Key Concepts</button>
          <button class="docs-btn docs-btn-secondary" onclick="scrollToSection('docs-shortcuts')">⌨️ Shortcuts</button>
        </div>
      </div>
    </section>

    <!-- What is Agent OS -->
    <section class="docs-section" id="docs-what-is">
      <h3 class="docs-section-title">💡 What is Agent OS?</h3>
      <div class="docs-text-block">
        <p>Agent OS is a <strong>web-based control center</strong> for your AI agent system. Think of it as mission control — you see everything your agents are doing, can give them tasks, review their proposals, search your knowledge vault, and keep the whole system healthy.</p>
        <p>Instead of managing agents through a terminal or chat interface alone, Agent OS gives you a visual, real-time dashboard with pages for every aspect of agent operations.</p>
      </div>
    </section>

    <!-- Architecture Overview -->
    <section class="docs-section" id="docs-architecture">
      <h3 class="docs-section-title">🏗️ Architecture</h3>
      <div class="docs-arch-diagram">
        <div class="docs-arch-row docs-arch-top">
          <div class="docs-arch-box docs-arch-you">
            <div class="docs-arch-box-icon">🖥️</div>
            <div class="docs-arch-box-label">WebUI</div>
            <div class="docs-arch-box-sub">(You)</div>
          </div>
          <div class="docs-arch-arrow">⟷</div>
          <div class="docs-arch-box docs-arch-bridge">
            <div class="docs-arch-box-icon">🌉</div>
            <div class="docs-arch-box-label">Bridge</div>
            <div class="docs-arch-box-sub">(API)</div>
          </div>
          <div class="docs-arch-arrow">⟷</div>
          <div class="docs-arch-box docs-arch-gateway">
            <div class="docs-arch-box-icon">⚡</div>
            <div class="docs-arch-box-label">OpenClaw</div>
            <div class="docs-arch-box-sub">(Gateway)</div>
          </div>
        </div>
        <div class="docs-arch-connector">│</div>
        <div class="docs-arch-row docs-arch-bottom">
          <div class="docs-arch-box docs-arch-service">
            <div class="docs-arch-box-icon">💬</div>
            <div class="docs-arch-box-label">Discord</div>
          </div>
          <div class="docs-arch-box docs-arch-service">
            <div class="docs-arch-box-icon">📚</div>
            <div class="docs-arch-box-label">Vault</div>
          </div>
          <div class="docs-arch-box docs-arch-service">
            <div class="docs-arch-box-icon">📋</div>
            <div class="docs-arch-box-label">Dispatch</div>
          </div>
        </div>
      </div>
      <div class="docs-arch-legend">
        <span><strong>WebUI</strong> — this app, where you monitor and control everything</span>
        <span><strong>Bridge</strong> — local API server that connects the UI to your agent system</span>
        <span><strong>OpenClaw Gateway</strong> — the agent runtime that manages sessions, tools, and agents</span>
      </div>
    </section>

    <!-- Agent Roster -->
    <section class="docs-section" id="docs-agents">
      <h3 class="docs-section-title">🤖 Agent Roster</h3>
      <p class="docs-section-intro">Your agent team — each specialist handles a different domain.</p>
      <div class="docs-agent-grid">
        ${renderAgentRosterCards()}
      </div>
    </section>

    <!-- Key Concepts -->
    <section class="docs-section" id="docs-concepts">
      <h3 class="docs-section-title">📖 Key Concepts</h3>
      <div class="docs-concept-grid">
        <div class="docs-concept-card">
          <div class="docs-concept-icon">📋</div>
          <h4>Proposals</h4>
          <p>Suggestions from agents that need your approval. Agents scan the system and propose improvements, fixes, or new tasks. You approve, defer, or reject them.</p>
        </div>
        <div class="docs-concept-card">
          <div class="docs-concept-icon">📡</div>
          <h4>The Stream</h4>
          <p>A real-time feed of everything happening — task completions, errors, vault writes, agent activity. Your live operational view.</p>
        </div>
        <div class="docs-concept-card">
          <div class="docs-concept-icon">📨</div>
          <h4>Dispatch</h4>
          <p>The task routing engine. When you create a task or approve a proposal, dispatch assigns it to the right agent based on capabilities and load.</p>
        </div>
        <div class="docs-concept-card">
          <div class="docs-concept-icon">📚</div>
          <h4>Vault</h4>
          <p>Your knowledge base — an Obsidian-compatible collection of notes. Agents read from and write to the vault to maintain shared knowledge.</p>
        </div>
        <div class="docs-concept-card">
          <div class="docs-concept-icon">🌉</div>
          <h4>Bridge</h4>
          <p>The local API server that connects this web UI to your OpenClaw gateway. It streams live data and proxies your commands.</p>
        </div>
        <div class="docs-concept-card">
          <div class="docs-concept-icon">🛡️</div>
          <h4>Roles & Autonomy</h4>
          <p>Each agent has a role with defined capabilities and autonomy level. You control how much freedom each agent has — from observer to full autopilot.</p>
        </div>
      </div>
    </section>

    <!-- Feature Directory -->
    <section class="docs-section" id="docs-features">
      <h3 class="docs-section-title">🗺️ Feature Directory</h3>
      <p class="docs-section-intro">Every page in Agent OS — click to navigate.</p>
      <div class="docs-feature-grid">
        ${renderFeatureDirectory()}
      </div>
    </section>

    <!-- Keyboard Shortcuts -->
    <section class="docs-section" id="docs-shortcuts">
      <h3 class="docs-section-title">⌨️ Keyboard Shortcuts</h3>
      <p class="docs-section-intro">Power-user shortcuts for fast navigation. Press <kbd>?</kbd> anywhere to see this list.</p>
      <div class="docs-shortcuts-grid">
        ${renderShortcutsReference()}
      </div>
    </section>

    <!-- Tips & Tricks -->
    <section class="docs-section" id="docs-tips">
      <h3 class="docs-section-title">💡 Tips & Tricks</h3>
      <div class="docs-tips-list">
        <div class="docs-tip">
          <span class="docs-tip-icon">⌘</span>
          <div>
            <strong>The Omnibus</strong>
            <p>The search bar at the top works like Spotlight — type anything to search pages, agents, vault notes, or run commands. Prefix with <kbd>&gt;</kbd> for actions.</p>
          </div>
        </div>
        <div class="docs-tip">
          <span class="docs-tip-icon">📬</span>
          <div>
            <strong>Inbox Zero</strong>
            <p>The Inbox is your primary action center. Use <kbd>j</kbd>/<kbd>k</kbd> to fly through items and <kbd>a</kbd> to approve. Batch approve safe items to stay on top of things.</p>
          </div>
        </div>
        <div class="docs-tip">
          <span class="docs-tip-icon">🔔</span>
          <div>
            <strong>Notifications</strong>
            <p>Enable browser notifications to get alerts when agents need your attention, even when you're in another tab.</p>
          </div>
        </div>
        <div class="docs-tip">
          <span class="docs-tip-icon">🧠</span>
          <div>
            <strong>Mind Graph</strong>
            <p>The knowledge graph in Mind → Graph visualizes connections between vault notes. Click nodes to read them, drag to rearrange.</p>
          </div>
        </div>
        <div class="docs-tip">
          <span class="docs-tip-icon">👁️</span>
          <div>
            <strong>Workbench</strong>
            <p>Watch agents work in real-time. The Workbench shows live tool calls, file edits, and agent reasoning as it happens.</p>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderAgentRosterCards() {
  const agents = [
    { emoji: '🤝', name: 'Right Hand', role: 'Orchestrator', color: '#E8A838', desc: 'The main agent — handles direct requests, routes work to specialists, and manages the overall system.' },
    { emoji: '💻', name: 'Coder', role: 'Developer', color: '#89b4fa', desc: 'Builds features, fixes bugs, writes scripts. Full file and execution access for implementation work.' },
    { emoji: '🔬', name: 'Researcher', role: 'Analyst', color: '#a6e3a1', desc: 'Web research, source evaluation, competitive analysis. Returns structured reports with cited sources.' },
    { emoji: '⚙️', name: 'Ops', role: 'Infrastructure', color: '#fab387', desc: 'System health, service management, cron jobs, performance monitoring. The most reliable agent.' },
    { emoji: '🔧', name: 'Utility', role: 'General Purpose', color: '#94e2d5', desc: 'Vault cleanup, knowledge organization, scraping, file operations. The Swiss army knife.' },
    { emoji: '😈', name: "Devil's Advocate", role: 'Critic', color: '#f38ba8', desc: 'Adversarial reviews, critiques, and pre-mortems. Read-only — finds weaknesses, never writes fixes.' },
  ];

  return agents.map(a => `
    <div class="docs-agent-card" style="--agent-accent: ${a.color}">
      <div class="docs-agent-header">
        <span class="docs-agent-emoji">${a.emoji}</span>
        <div>
          <div class="docs-agent-name">${a.name}</div>
          <div class="docs-agent-role">${a.role}</div>
        </div>
      </div>
      <p class="docs-agent-desc">${a.desc}</p>
    </div>
  `).join('');
}

function renderFeatureDirectory() {
  const features = [
    { page: 'feed', icon: '📡', name: 'Stream', desc: 'Real-time feed of all agent activity, task completions, and system events.', features: ['Live updates', 'Filter by type', 'Batch actions', 'Timeline view'] },
    { page: 'inbox', icon: '📬', name: 'Inbox', desc: 'Items from agents that need your attention — approve, reject, or reply.', features: ['Category tabs', 'Keyboard navigation', 'Bulk actions', 'Snooze'] },
    { page: 'queue', icon: '📋', name: 'Proposals', desc: 'Agent suggestions waiting for your decision. Approve to create tasks.', features: ['Priority filter', 'Batch approve', 'Pipeline view', 'Auto-scan'] },
    { page: 'briefing', icon: '📜', name: 'Briefing', desc: 'Daily status document auto-generated from live system data.', features: ['Auto-refresh', 'Key metrics', 'Agent summaries', 'Action items'] },
    { page: 'workbench', icon: '👁️', name: 'Workbench', desc: 'Watch agents work in real-time — see tool calls and reasoning live.', features: ['Live streaming', 'Agent selection', 'Watch all mode', 'Activity log'] },
    { page: 'talk', icon: '💬', name: 'Talk', desc: 'Discord channels mirrored here — read and send messages.', features: ['Channel list', 'Threads', 'Pinned messages', 'Emoji reactions'] },
    { page: 'rooms', icon: '🏠', name: 'Rooms', desc: 'Multi-agent conversations — talk to groups of agents about topics.', features: ['Create rooms', 'Agent selection', 'Persistent context', 'Purpose tags'] },
    { page: 'tasks', icon: '✅', name: 'Tasks', desc: 'View and manage all agent tasks with details, priority, and status.', features: ['Quick add', 'Priority levels', 'Agent assignment', 'Detail panel'] },
    { page: 'projects', icon: '📁', name: 'Projects', desc: 'Active projects with linked tasks, missions, and vault notes.', features: ['Project cards', 'Linked tasks', 'Health status', 'Activity feed'] },
    { page: 'missions', icon: '🎯', name: 'Missions', desc: 'Long-term goals tracked as hill charts — see what\'s climbing.', features: ['Hill charts', 'Decision log', 'Status tracking', 'Linked plans'] },
    { page: 'pipelines', icon: '🔀', name: 'Pipelines', desc: 'Visual workflow pipelines — watch work flow through stages.', features: ['Stage visualization', 'Item tracking', 'Throughput stats', 'Drag-n-drop'] },
    { page: 'mind', icon: '🧠', name: 'Mind', desc: 'Your knowledge vault — search, browse, and visualize notes.', features: ['Full-text search', 'Folder browser', 'Knowledge graph', 'Insights'] },
    { page: 'roles', icon: '🛡️', name: 'Roles', desc: 'Manage agent capabilities, autonomy levels, and behavior rules.', features: ['Capability toggles', 'Autonomy slider', 'Escalation rules', 'Guardrails'] },
    { page: 'records', icon: '📊', name: 'Records', desc: 'Universal entity browser — agents, tasks, proposals, services.', features: ['Type filters', 'Detail view', 'Cross-linking', 'Export'] },
    { page: 'pulse', icon: '⚙️', name: 'System', desc: 'Health metrics, services, workflow pipeline, and cost tracking.', features: ['Service status', 'Cost tracking', 'Cron schedule', 'System logs'] },
  ];

  return features.map(f => `
    <div class="docs-feature-card" onclick="nav('${f.page}')">
      <div class="docs-feature-header">
        <span class="docs-feature-icon">${f.icon}</span>
        <span class="docs-feature-name">${f.name}</span>
      </div>
      <p class="docs-feature-desc">${f.desc}</p>
      <div class="docs-feature-tags">
        ${f.features.map(ft => `<span class="docs-feature-tag">${ft}</span>`).join('')}
      </div>
    </div>
  `).join('');
}

function renderShortcutsReference() {
  // Pull from the existing SHORTCUT_SECTIONS if available
  const sections = (typeof SHORTCUT_SECTIONS !== 'undefined') ? SHORTCUT_SECTIONS : [
    { title: 'Navigation', shortcuts: [
      { keys: ['⌘', 'K'], desc: 'Command palette' },
      { keys: ['1–6'], desc: 'Switch pages' },
      { keys: ['g', 'i'], desc: 'Go to Inbox' },
      { keys: ['g', 't'], desc: 'Go to Tasks' },
      { keys: ['g', 'm'], desc: 'Go to Mind' },
    ]},
    { title: 'Stream', shortcuts: [
      { keys: ['j / k'], desc: 'Navigate items' },
      { keys: ['Enter'], desc: 'Expand item' },
      { keys: ['a'], desc: 'Approve' },
      { keys: ['r'], desc: 'Reject' },
    ]},
    { title: 'General', shortcuts: [
      { keys: ['?'], desc: 'Show shortcuts help' },
      { keys: ['Esc'], desc: 'Close overlay / go back' },
    ]},
  ];

  return sections.map(section => `
    <div class="docs-shortcut-section">
      <h4 class="docs-shortcut-title">${section.title}</h4>
      ${section.shortcuts.map(s => `
        <div class="docs-shortcut-row">
          <span class="docs-shortcut-keys">${s.keys.map(k => `<kbd>${k}</kbd>`).join('')}</span>
          <span class="docs-shortcut-desc">${s.desc}</span>
        </div>
      `).join('')}
    </div>
  `).join('');
}

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}


// ═══════════════════════════════════════════════════════════
// GLOBAL INFO HOVER / TOOLTIP SYSTEM (data-tip)
// ═══════════════════════════════════════════════════════════

(function initTooltipSystem() {
  let tipEl = null;

  function showTooltip(target, text) {
    if (tipEl) tipEl.remove();
    tipEl = document.createElement('div');
    tipEl.className = 'info-tooltip';
    tipEl.textContent = text;
    document.body.appendChild(tipEl);

    const rect = target.getBoundingClientRect();
    const tipRect = tipEl.getBoundingClientRect();

    // Position above by default, flip below if no room
    let top = rect.top - tipRect.height - 8;
    let left = rect.left + (rect.width / 2) - (tipRect.width / 2);

    if (top < 4) {
      top = rect.bottom + 8;
      tipEl.classList.add('info-tooltip-below');
    }

    // Keep within viewport
    if (left < 4) left = 4;
    if (left + tipRect.width > window.innerWidth - 4) {
      left = window.innerWidth - tipRect.width - 4;
    }

    tipEl.style.top = top + 'px';
    tipEl.style.left = left + 'px';
    tipEl.style.opacity = '1';
  }

  function hideTooltip() {
    if (tipEl) { tipEl.remove(); tipEl = null; }
  }

  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest('[data-tip]');
    if (!el) return;
    showTooltip(el, el.dataset.tip);
  });

  document.addEventListener('mouseout', (e) => {
    const el = e.target.closest('[data-tip]');
    if (!el) return;
    // Check if we're moving to a child of the same element
    if (el.contains(e.relatedTarget)) return;
    hideTooltip();
  });

  // Hide on scroll
  document.addEventListener('scroll', hideTooltip, true);
})();


// ═══════════════════════════════════════════════════════════
// FIRST-RUN ONBOARDING WALKTHROUGH (5-step spotlight)
// ═══════════════════════════════════════════════════════════

const ONBOARDING_STEPS = [
  {
    title: 'Welcome to Agent OS 👋',
    text: 'This is your cockpit for managing AI agents. Let\'s take a quick tour of the main features.',
    target: null, // No spotlight — centered intro
  },
  {
    title: 'The Stream',
    text: 'Everything happening in your agent system shows up here in real-time — task completions, errors, vault writes, and more.',
    target: '#view-feed',
    fallback: '#stream-list',
  },
  {
    title: 'Meet Your Agents',
    text: 'This bar shows which agents are active and what they\'re working on. Click any agent to see their live activity.',
    target: '#agent-status-bar',
    fallback: '#topbar-agents',
  },
  {
    title: 'The Omnibus',
    text: 'Your universal command bar. Type anything to search, or press ⌘K to open it. Prefix with > for actions.',
    target: '#omnibus-container',
    fallback: '#omnibus-pill',
  },
  {
    title: 'You\'re Ready! 🚀',
    text: 'Explore the sidebar to discover all pages. Press ? anytime for keyboard shortcuts. Check the Explore page for full documentation.',
    target: null, // Centered outro
  },
];

let onboardingStep = 0;
let onboardingActive = false;

function startGuidedTour() {
  onboardingStep = 0;
  onboardingActive = true;
  // Navigate to feed first so targets exist
  if (typeof nav === 'function' && currentPage !== 'feed') {
    // Use the original nav to avoid recursion
    const origNav = nav;
    origNav('feed');
  }
  setTimeout(() => showOnboardingStep(0), 300);
}

function startOnboarding() {
  if (localStorage.getItem('agentOS-onboardingDone')) return;
  // Don't show if tutorial overlay is already showing
  if (document.getElementById('tutorial-overlay')) return;
  startGuidedTour();
}

function showOnboardingStep(step) {
  // Remove existing
  const existing = document.getElementById('onboarding-overlay');
  if (existing) existing.remove();

  if (step >= ONBOARDING_STEPS.length) {
    finishOnboarding();
    return;
  }

  const s = ONBOARDING_STEPS[step];
  onboardingStep = step;

  const overlay = document.createElement('div');
  overlay.id = 'onboarding-overlay';
  overlay.className = 'onboarding-overlay';

  let targetEl = null;
  if (s.target) {
    targetEl = document.querySelector(s.target);
    if (!targetEl && s.fallback) targetEl = document.querySelector(s.fallback);
  }

  if (targetEl) {
    // Spotlight mode — cut out around target
    const rect = targetEl.getBoundingClientRect();
    const pad = 8;

    overlay.innerHTML = `
      <svg class="onboarding-spotlight-svg" viewBox="0 0 ${window.innerWidth} ${window.innerHeight}">
        <defs>
          <mask id="onboarding-mask">
            <rect width="100%" height="100%" fill="white"/>
            <rect x="${rect.left - pad}" y="${rect.top - pad}" width="${rect.width + pad * 2}" height="${rect.height + pad * 2}" rx="12" fill="black"/>
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.7)" mask="url(#onboarding-mask)"/>
      </svg>
      <div class="onboarding-card" style="${getCardPosition(rect)}">
        <div class="onboarding-step-indicator">${step + 1} / ${ONBOARDING_STEPS.length}</div>
        <h3 class="onboarding-title">${s.title}</h3>
        <p class="onboarding-text">${s.text}</p>
        <div class="onboarding-actions">
          <button class="onboarding-skip" onclick="finishOnboarding()">Skip</button>
          <button class="onboarding-next" onclick="showOnboardingStep(${step + 1})">${step === ONBOARDING_STEPS.length - 1 ? 'Finish' : 'Next →'}</button>
        </div>
      </div>
    `;
  } else {
    // Centered card mode (intro/outro)
    overlay.innerHTML = `
      <div class="onboarding-backdrop"></div>
      <div class="onboarding-card onboarding-card-centered">
        <div class="onboarding-step-indicator">${step + 1} / ${ONBOARDING_STEPS.length}</div>
        <h3 class="onboarding-title">${s.title}</h3>
        <p class="onboarding-text">${s.text}</p>
        <div class="onboarding-actions">
          <button class="onboarding-skip" onclick="finishOnboarding()">Skip</button>
          <button class="onboarding-next" onclick="showOnboardingStep(${step + 1})">${step === ONBOARDING_STEPS.length - 1 ? "Let's Go!" : 'Next →'}</button>
        </div>
      </div>
    `;
  }

  document.body.appendChild(overlay);
}

function getCardPosition(rect) {
  const cardW = 340;
  const cardH = 180;
  const gap = 16;

  // Try below target
  if (rect.bottom + gap + cardH < window.innerHeight) {
    return `top: ${rect.bottom + gap}px; left: ${Math.max(16, Math.min(rect.left, window.innerWidth - cardW - 16))}px;`;
  }
  // Try above target
  if (rect.top - gap - cardH > 0) {
    return `top: ${rect.top - gap - cardH}px; left: ${Math.max(16, Math.min(rect.left, window.innerWidth - cardW - 16))}px;`;
  }
  // Fallback: center
  return `top: 50%; left: 50%; transform: translate(-50%, -50%);`;
}

function finishOnboarding() {
  onboardingActive = false;
  localStorage.setItem('agentOS-onboardingDone', '1');
  const overlay = document.getElementById('onboarding-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s ease';
    setTimeout(() => overlay.remove(), 300);
  }
}

// ═══════════════════════════════════════════════════════════
// APPLY DATA-TIP ATTRIBUTES TO EXISTING UI
// ═══════════════════════════════════════════════════════════

function applyGlobalDataTips() {
  const tips = [
    // Agent status bar
    { sel: '#agent-status-bar', tip: 'Agent status bar — shows which agents are active and their current tasks' },
    // Quick stats
    { sel: '#qs-active', tip: 'Number of tasks currently being worked on by agents', parent: true },
    { sel: '#qs-completed', tip: 'Tasks completed by agents today', parent: true },
    { sel: '#qs-proposals', tip: 'Pending proposals waiting for your review', parent: true },
    { sel: '#qs-errors', tip: 'Errors encountered today — click to filter the stream', parent: true },
    { sel: '#qs-vault', tip: 'Vault notes created or updated today', parent: true },
    { sel: '#qs-load', tip: 'Current system CPU/memory load', parent: true },
    // Stream filter chips
    { sel: '#stream-filter-bar', tip: 'Filter the stream by event type — click a chip to focus' },
    // Omnibus
    { sel: '#omnibus-pill', tip: 'Universal search — type anything or press ⌘K. Prefix with > for actions.' },
    // Connection status
    { sel: '#topbar-connection-status', tip: 'Bridge connection status — green means live data is flowing' },
    // Topbar agents
    { sel: '#topbar-agents', tip: 'Active agent count — click for details' },
    // XP badge
    { sel: '#xp-badge', tip: 'Your Agent OS level — earn XP by completing tasks and reviews' },
    // Notification button
    { sel: '#notif-btn', tip: 'Notifications — items needing your attention' },
    // Sidebar sections
    { sel: '.sidebar-agents', tip: 'Number of agents currently active', query: true },
    { sel: '.sidebar-xp', tip: 'Your level and XP progress', query: true },
    // Proposals
    { sel: '#auto-gen-btn', tip: 'Run a system scan to generate new improvement proposals' },
    { sel: '#batch-approve-safe', tip: 'Approve all low-risk proposals at once' },
  ];

  tips.forEach(t => {
    let el;
    if (t.query) {
      el = document.querySelector(t.sel);
    } else {
      el = document.querySelector(t.sel);
    }
    if (!el) return;

    const target = t.parent ? el.parentElement : el;
    if (target && !target.hasAttribute('data-tip')) {
      target.setAttribute('data-tip', t.tip);
    }
  });
}

// Run after DOM ready
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(applyGlobalDataTips, 500);

  // Show onboarding on first visit (after tutorial dismiss or if no tutorial)
  setTimeout(() => {
    if (!localStorage.getItem('agentOS-onboardingDone') && !localStorage.getItem('agentOS-tutorialDismissed')) {
      // Let the tutorial run first — onboarding will run on second visit
    } else if (!localStorage.getItem('agentOS-onboardingDone')) {
      startOnboarding();
    }
  }, 2000);
});

// Re-apply tips after page navigation (some elements render lazily)
const _origNavExplore = typeof nav === 'function' ? nav : null;
if (_origNavExplore) {
  const _navBeforeExplore = nav;
  nav = function(page) {
    _navBeforeExplore(page);
    setTimeout(applyGlobalDataTips, 500);
  };
}
