// ═══════════════════════════════════════════════════════════
// ACTIVITY TIMELINE — Unified chronological view
// ═══════════════════════════════════════════════════════════

let timelineActive = false;
let timelineEvents = [];
let timelineLoading = false;
let timelineOldestTs = null;
let timelinePollTimer = null;

const TIMELINE_SOURCE_COLORS = {
  dispatch: '#89b4fa',   // blue
  discord:  '#cba6f7',   // purple
  vault:    '#a6e3a1',   // green
  system:   '#fab387',   // orange
  proposal: '#f5c2e7',   // pink
};

const TIMELINE_SOURCE_ICONS = {
  dispatch: '⚡',
  discord:  '💬',
  vault:    '📚',
  system:   '⚙️',
  proposal: '📋',
};

const TIMELINE_TYPE_ICONS = {
  task_created:      '📋',
  task_completed:    '✅',
  task_failed:       '❌',
  proposal_created:  '📋',
  proposal_resolved: '🏛️',
  discord_message:   '💬',
  vault_write:       '📝',
  system_event:      '⚙️',
  system_alert:      '🔴',
  system_heartbeat:  '💓',
};

function toggleTimelineView() {
  timelineActive = !timelineActive;
  const btn = document.getElementById('timeline-toggle-btn');
  const streamList = document.getElementById('stream-list');
  const timelineView = document.getElementById('timeline-view');
  const batchBar = document.getElementById('stream-batch-bar');

  if (btn) btn.classList.toggle('active', timelineActive);

  if (timelineActive) {
    if (streamList) streamList.style.display = 'none';
    if (timelineView) timelineView.style.display = '';
    if (batchBar) batchBar.style.display = 'none';
    // Dim other filter chips
    document.querySelectorAll('.stream-chip:not(.timeline-toggle)').forEach(c => {
      c.style.opacity = '0.4';
      c.style.pointerEvents = 'none';
    });
    loadTimeline();
    if (!timelinePollTimer) {
      timelinePollTimer = setInterval(pollTimeline, 8000);
    }
  } else {
    if (streamList) streamList.style.display = '';
    if (timelineView) timelineView.style.display = 'none';
    document.querySelectorAll('.stream-chip:not(.timeline-toggle)').forEach(c => {
      c.style.opacity = '';
      c.style.pointerEvents = '';
    });
    if (timelinePollTimer) {
      clearInterval(timelinePollTimer);
      timelinePollTimer = null;
    }
  }
}

async function loadTimeline(append) {
  if (timelineLoading) return;
  timelineLoading = true;
  const view = document.getElementById('timeline-view');
  if (!view) { timelineLoading = false; return; }

  if (!append) {
    view.innerHTML = '<div class="timeline-loading"><div class="typing-dots"><span></span><span></span><span></span></div> Loading timeline...</div>';
  }

  try {
    let url = '/api/timeline?limit=100';
    if (append && timelineOldestTs) {
      url += '&before=' + encodeURIComponent(timelineOldestTs);
    }
    const r = await fetch(url);
    if (!r.ok) throw new Error('Failed to load timeline');
    const events = await r.json();

    if (append) {
      // Dedupe
      const existingIds = new Set(timelineEvents.map(e => e.id));
      const newEvents = events.filter(e => !existingIds.has(e.id));
      timelineEvents = [...timelineEvents, ...newEvents];
    } else {
      timelineEvents = events;
    }

    if (timelineEvents.length > 0) {
      timelineOldestTs = timelineEvents[timelineEvents.length - 1].timestamp;
    }

    renderTimeline();
  } catch (err) {
    if (!append) {
      view.innerHTML = '<div class="timeline-empty">Failed to load timeline</div>';
    }
  }

  timelineLoading = false;
}

async function pollTimeline() {
  if (!timelineActive) return;
  try {
    const r = await fetch('/api/timeline?limit=30');
    if (!r.ok) return;
    const events = await r.json();
    const existingIds = new Set(timelineEvents.map(e => e.id));
    const newEvents = events.filter(e => !existingIds.has(e.id));
    if (newEvents.length > 0) {
      timelineEvents = [...newEvents, ...timelineEvents];
      renderTimeline();
    }
  } catch { /* silent */ }
}

function renderTimeline() {
  const view = document.getElementById('timeline-view');
  if (!view) return;

  if (timelineEvents.length === 0) {
    view.innerHTML = `<div class="timeline-empty">
      <div class="timeline-empty-icon">🕐</div>
      <div class="timeline-empty-title">No activity yet</div>
      <div class="timeline-empty-desc">Events from dispatches, Discord, vault, and system will appear here</div>
    </div>`;
    return;
  }

  // Group events by hour blocks
  const grouped = groupByHour(timelineEvents);
  // Also detect rapid clusters for auto-grouping
  const html = [];

  // "Now" marker
  html.push(`<div class="tl-now-marker">
    <div class="tl-now-pulse"></div>
    <span class="tl-now-label">Now</span>
    <span class="tl-now-time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
  </div>`);

  for (const group of grouped) {
    // Hour header
    html.push(`<div class="tl-hour-marker">
      <span class="tl-hour-label">${group.label}</span>
      <span class="tl-hour-count">${group.events.length} event${group.events.length !== 1 ? 's' : ''}</span>
    </div>`);

    // Detect rapid clusters within this hour
    const rendered = renderEventsWithClusters(group.events);
    html.push(rendered);
  }

  // Load more sentinel
  html.push(`<div class="tl-load-more" id="tl-load-more" onclick="loadTimeline(true)">Load earlier events</div>`);

  view.innerHTML = `<div class="tl-container">${html.join('')}</div>`;

  // Setup infinite scroll
  setupTimelineScroll();
}

function groupByHour(events) {
  const groups = new Map();
  const now = new Date();

  for (const evt of events) {
    const d = new Date(evt.timestamp);
    const hourKey = d.toISOString().slice(0, 13); // YYYY-MM-DDTHH
    if (!groups.has(hourKey)) {
      const isToday = d.toDateString() === now.toDateString();
      const isYesterday = new Date(now - 86400000).toDateString() === d.toDateString();
      let dayPart = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
      if (isToday) dayPart = 'Today';
      else if (isYesterday) dayPart = 'Yesterday';
      const hourPart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      groups.set(hourKey, {
        label: `${dayPart} · ${hourPart.replace(/:00/, ':00')}`,
        hour: hourKey,
        events: [],
      });
    }
    groups.get(hourKey).events.push(evt);
  }

  return Array.from(groups.values());
}

function renderEventsWithClusters(events) {
  const html = [];
  let i = 0;

  while (i < events.length) {
    // Look ahead for rapid clusters (same source, within 2 minutes)
    let clusterEnd = i + 1;
    while (clusterEnd < events.length) {
      const tDiff = Math.abs(new Date(events[i].timestamp) - new Date(events[clusterEnd].timestamp));
      if (tDiff > 120000 || events[clusterEnd].source !== events[i].source) break;
      clusterEnd++;
    }

    const clusterSize = clusterEnd - i;
    if (clusterSize >= 3) {
      // Render as cluster
      const cluster = events.slice(i, clusterEnd);
      const source = cluster[0].source;
      const color = TIMELINE_SOURCE_COLORS[source] || '#6c7086';
      const icon = TIMELINE_SOURCE_ICONS[source] || '📋';
      const timeRange = formatTimelineTime(cluster[cluster.length - 1].timestamp) + ' — ' + formatTimelineTime(cluster[0].timestamp);

      html.push(`<div class="tl-cluster" data-source="${source}">
        <div class="tl-dot" style="background:${color}"></div>
        <div class="tl-cluster-header" onclick="this.parentElement.classList.toggle('expanded')">
          <span class="tl-cluster-icon">${icon}</span>
          <span class="tl-cluster-title">${clusterSize} ${source} events in ${formatDuration(Math.abs(new Date(cluster[0].timestamp) - new Date(cluster[cluster.length - 1].timestamp)))}</span>
          <span class="tl-cluster-time">${timeRange}</span>
          <span class="tl-cluster-expand">▸</span>
        </div>
        <div class="tl-cluster-body">
          ${cluster.map(e => renderTimelineEvent(e, true)).join('')}
        </div>
      </div>`);
      i = clusterEnd;
    } else {
      html.push(renderTimelineEvent(events[i], false));
      i++;
    }
  }

  return html.join('');
}

function renderTimelineEvent(evt, inCluster) {
  const source = evt.source || 'system';
  const color = TIMELINE_SOURCE_COLORS[source] || '#6c7086';
  const icon = TIMELINE_TYPE_ICONS[evt.type] || TIMELINE_SOURCE_ICONS[source] || '📋';
  const time = formatTimelineTime(evt.timestamp);
  const agentInfo = typeof ga === 'function' ? ga(evt.agent) : null;
  const agentName = agentInfo ? agentInfo.name : (evt.agent || 'System');
  const agentEmoji = agentInfo ? agentInfo.emoji : '🤖';
  const agentColor = agentInfo ? agentInfo.color : '#6c7086';

  // Determine click navigation
  let clickAction = '';
  if (evt.linked_entities && evt.linked_entities.length > 0) {
    const le = evt.linked_entities[0];
    const safeId = (le.id || '').replace(/'/g, "\\'");
    const safeTitle = (evt.title || '').replace(/'/g, "\\'").slice(0, 50);
    if (le.type === 'task') clickAction = `onclick="goToEntity('task','${safeId}','${safeTitle}')"`;
    else if (le.type === 'proposal') clickAction = `onclick="goToEntity('proposal','${safeId}','${safeTitle}')"`;
    else if (le.type === 'note') clickAction = `onclick="goToEntity('note','${safeId}','${safeTitle}')"`;
  }

  const detailText = evt.detail ? evt.detail.replace(/</g, '&lt;').replace(/>/g, '&gt;').slice(0, 300) : '';

  return `<div class="tl-event${inCluster ? ' tl-event-clustered' : ''}" data-source="${source}" data-id="${evt.id}" ${clickAction} style="cursor:${clickAction ? 'pointer' : 'default'}">
    ${!inCluster ? `<div class="tl-dot" style="background:${color}"></div>` : ''}
    <div class="tl-event-content">
      <div class="tl-event-header">
        <span class="tl-event-icon">${icon}</span>
        <span class="tl-event-title">${(evt.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>
        <span class="tl-event-time">${time}</span>
      </div>
      ${detailText ? `<div class="tl-event-detail">${detailText}</div>` : ''}
      <div class="tl-event-meta">
        <span class="tl-event-agent" style="color:${agentColor}">${agentEmoji} ${agentName}</span>
        <span class="tl-event-source" style="background:${color}20;color:${color}">${TIMELINE_SOURCE_ICONS[source] || ''} ${source}</span>
        ${evt.status ? `<span class="tl-event-status tl-status-${evt.status}">${evt.status}</span>` : ''}
        ${evt.priority ? `<span class="tl-event-priority">${evt.priority}</span>` : ''}
        ${evt.confidence != null ? `<span class="tl-event-confidence">${Math.round(evt.confidence * 100)}%</span>` : ''}
        ${evt.linked_entities && evt.linked_entities.length > 0 ? evt.linked_entities.map(le => `<span class="tl-linked-entity" title="${le.type}: ${le.id}">🔗 ${le.type}</span>`).join('') : ''}
      </div>
    </div>
  </div>`;
}

function formatTimelineTime(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

function formatDuration(ms) {
  if (ms < 60000) return Math.round(ms / 1000) + 's';
  if (ms < 3600000) return Math.round(ms / 60000) + ' min';
  return Math.round(ms / 3600000) + 'h';
}

function setupTimelineScroll() {
  const view = document.getElementById('timeline-view');
  if (!view || view._scrollSetup) return;
  view._scrollSetup = true;

  view.addEventListener('scroll', () => {
    if (timelineLoading) return;
    const threshold = view.scrollHeight - view.scrollTop - view.clientHeight;
    if (threshold < 200) {
      loadTimeline(true);
    }
  });
}
