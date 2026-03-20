#!/usr/bin/env node
// Local server: serves frontend + proxies /api to bridge (same origin, no CORS)
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '8090', 10);
const BRIDGE = process.env.BRIDGE_URL || 'http://127.0.0.1:18790';

const app = express();
app.use(express.json());

// ── Stream API (local, before proxy) ──────────────────────

// In-memory action log for stream items
const streamActions = [];
const agentMessages = [];

// GET /api/stream — unified feed combining all sources
app.get('/api/stream', async (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const filter = req.query.filter || 'all';
  const items = [];

  // Try to fetch from bridge endpoints and merge
  const fetchJSON = async (url) => {
    try {
      const r = await fetch(`${BRIDGE}${url}`);
      if (r.ok) return await r.json();
    } catch { /* bridge may be down */ }
    return null;
  };

  const [feed, proposals, queue, agents, overview] = await Promise.all([
    fetchJSON('/api/events?limit=30'),
    fetchJSON('/api/proposals?status=pending'),
    fetchJSON('/api/queue'),
    fetchJSON('/api/agents'),
    fetchJSON('/api/overview'),
  ]);

  // Merge feed events
  if (Array.isArray(feed)) {
    feed.forEach(e => items.push({
      id: e.id || 'evt_' + Date.now() + Math.random(),
      type: mapEventType(e.type),
      streamType: e.type,
      agent: e.agent || 'system',
      title: e.summary || e.type,
      detail: e.detail || '',
      time: e.timestamp || new Date().toISOString(),
      severity: e.severity || 'info',
      source: 'feed',
      read: false,
    }));
  }

  // Merge proposals
  if (Array.isArray(proposals)) {
    proposals.forEach(p => items.push({
      id: p.id || 'prop_' + Date.now() + Math.random(),
      type: 'proposal',
      streamType: 'proposal',
      agent: p.agent || p.source || 'system',
      title: p.title || p.question || 'Proposal',
      detail: p.context || p.description || '',
      time: p.created_at || p._createdAt || new Date().toISOString(),
      severity: 'action',
      confidence: p.confidence || p._confidence || 0,
      priority: p.priority || p._priority || 'P2',
      linkedMission: p.linked_mission || p._linkedMission || null,
      source: 'proposal',
      read: false,
    }));
  }

  // Merge queue items
  if (queue && Array.isArray(queue.items)) {
    queue.items.forEach(q => items.push({
      id: q.id,
      type: 'question',
      streamType: 'question',
      agent: q.agent || 'system',
      title: q.question,
      detail: q.context || '',
      time: q.created_at || new Date().toISOString(),
      severity: 'action',
      choices: q.choices || null,
      source: 'queue',
      read: false,
    }));
  }

  // Merge agent status
  if (Array.isArray(agents)) {
    agents.forEach(a => {
      if (a.status === 'active' && a.task) {
        items.push({
          id: 'agent_' + a.id + '_' + Date.now(),
          type: 'activity',
          streamType: 'agent_activity',
          agent: a.id || a.name,
          title: `Working: ${a.task}`,
          detail: '',
          time: new Date().toISOString(),
          severity: 'info',
          source: 'agents',
          read: false,
        });
      }
    });
  }

  // Merge system health from overview
  if (overview && overview.system) {
    const s = overview.system;
    if (s.cpu > 80 || (s.disk && s.disk.percent > 90) || (s.memory && s.memory.percent > 90)) {
      items.push({
        id: 'sys_health_' + Date.now(),
        type: 'system',
        streamType: 'system_health',
        agent: 'system',
        title: `System alert: CPU ${Math.round(s.cpu)}% | Mem ${s.memory?.percent || '?'}% | Disk ${s.disk?.percent || '?'}%`,
        detail: '',
        time: new Date().toISOString(),
        severity: s.cpu > 90 ? 'error' : 'warn',
        source: 'system',
        read: false,
      });
    }
  }

  // Sort by time (newest first), with action items boosted
  items.sort((a, b) => {
    const aAction = ['proposal', 'question', 'error'].includes(a.type) ? 1 : 0;
    const bAction = ['proposal', 'question', 'error'].includes(b.type) ? 1 : 0;
    if (aAction !== bAction) return bAction - aAction;
    return new Date(b.time) - new Date(a.time);
  });

  // Filter
  let filtered = items;
  if (filter === 'action') filtered = items.filter(i => ['proposal', 'question', 'error'].includes(i.type));
  else if (filter === 'completed') filtered = items.filter(i => i.streamType === 'task_complete' || i.type === 'completion');
  else if (filter === 'conversations') filtered = items.filter(i => i.type === 'activity' || i.type === 'question');
  else if (filter === 'errors') filtered = items.filter(i => i.severity === 'error' || i.severity === 'warn');

  res.json(filtered.slice(0, limit));
});

// POST /api/stream/:id/action — perform action on stream item
app.post('/api/stream/:id/action', async (req, res) => {
  const { id } = req.params;
  const { action, value } = req.body;

  streamActions.push({ id, action, value, timestamp: new Date().toISOString() });

  // Forward to bridge if applicable
  if (action === 'approve' || action === 'reject' || action === 'defer') {
    try {
      await fetch(`${BRIDGE}/api/proposals/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, value }),
      });
    } catch { /* bridge may be down */ }
  }

  if (action === 'reply' && value) {
    agentMessages.push({ streamItemId: id, message: value, timestamp: new Date().toISOString() });
  }

  res.json({ ok: true, id, action, timestamp: new Date().toISOString() });
});

// POST /api/agent/message — send a message/instruction to a specific agent
app.post('/api/agent/message', (req, res) => {
  const { message, agent, context, plan, task } = req.body;
  const entry = {
    id: 'msg_' + Date.now(),
    agent: agent || 'righthand',
    message,
    context: context || '',
    plan: plan || null,
    task: task || null,
    timestamp: new Date().toISOString(),
  };
  agentMessages.push(entry);

  // Try forwarding to bridge
  fetch(`${BRIDGE}/api/agent/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req.body),
  }).catch(() => {});

  res.json({ ok: true, ...entry });
});

// GET /api/agents/:id/activity — last 20 feed events for this agent
app.get('/api/agents/:id/activity', (req, res) => {
  const agentId = req.params.id;
  const mockEvents = [
    { time: new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}), content: 'Processed dispatch queue', type: 'task_completed' },
    { time: new Date(Date.now() - 300000).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}), content: 'Wrote vault note', type: 'vault_write' },
    { time: new Date(Date.now() - 600000).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}), content: 'Searched web for context', type: 'task_started' },
    { time: new Date(Date.now() - 900000).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}), content: 'Modified config file', type: 'file_changed' },
    { time: new Date(Date.now() - 1200000).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}), content: 'Completed analysis task', type: 'task_completed' },
  ];
  res.json({ agentId, events: mockEvents });
});

// POST /api/agents/:id/pause — pause agent
app.post('/api/agents/:id/pause', (req, res) => {
  console.log(`[Agent Paused] ${req.params.id}`);
  res.json({ ok: true, agentId: req.params.id, status: 'paused' });
});

// POST /api/tasks — create task
app.post('/api/tasks', (req, res) => {
  const { title, agent, priority, description } = req.body || {};
  const id = 'task-' + Date.now();
  console.log(`[Task Created] ${title} → ${agent || 'unassigned'} (${priority || 'P3'})`);
  res.json({ ok: true, id, title, agent, priority });
});

// ── Records API (local) ───────────────────────────────────

// In-memory stores for records comments and roles
const recordComments = {};
const rolesStore = [];

app.get('/api/records/:type', async (req, res) => {
  const { type } = req.params;
  const fetchJSON = async (url) => {
    try { const r = await fetch(`${BRIDGE}${url}`); if (r.ok) return await r.json(); } catch {} return null;
  };
  let items = [];
  switch (type) {
    case 'agents': items = (await fetchJSON('/api/agents')) || []; break;
    case 'tasks': {
      const [q, p] = await Promise.all([fetchJSON('/api/queue'), fetchJSON('/api/plans')]);
      if (q?.items) items.push(...q.items);
      if (Array.isArray(p)) p.forEach(plan => { if (plan.tasks) items.push(...plan.tasks); });
      break;
    }
    case 'missions': items = (await fetchJSON('/api/missions/goals')) || []; break;
    case 'vault': items = (await fetchJSON('/api/vault/recent')) || []; break;
    case 'proposals': items = (await fetchJSON('/api/proposals')) || []; break;
    case 'services': items = (await fetchJSON('/api/system')) || []; break;
    default: break;
  }
  res.json(items);
});

app.get('/api/records/:type/:id', async (req, res) => {
  const { type, id } = req.params;
  const comments = recordComments[`${type}:${id}`] || [];
  res.json({ id, type, comments, related: [] });
});

app.post('/api/records/:type/:id/comment', (req, res) => {
  const { type, id } = req.params;
  const { text } = req.body;
  const key = `${type}:${id}`;
  if (!recordComments[key]) recordComments[key] = [];
  const comment = { id: 'cmt_' + Date.now(), text, timestamp: new Date().toISOString() };
  recordComments[key].push(comment);
  res.json({ ok: true, comment });
});

app.put('/api/records/:type/:id', (req, res) => {
  res.json({ ok: true, id: req.params.id, updated: req.body });
});

// ── Pipeline API (local) ──────────────────────────────────

app.get('/api/pipeline/:type', async (req, res) => {
  const { type } = req.params;
  const fetchJSON = async (url) => {
    try { const r = await fetch(`${BRIDGE}${url}`); if (r.ok) return await r.json(); } catch {} return null;
  };
  let items = [];
  switch (type) {
    case 'tasks': items = ((await fetchJSON('/api/queue'))?.items) || []; break;
    case 'proposals': items = (await fetchJSON('/api/proposals')) || []; break;
    case 'missions': items = (await fetchJSON('/api/missions/goals')) || []; break;
    default: break;
  }
  res.json(items.map(i => ({ ...i, stage: i.status || 'inbox' })));
});

app.post('/api/pipeline/:type/:id/advance', (req, res) => {
  const { type, id } = req.params;
  res.json({ ok: true, type, id, advanced: true, timestamp: new Date().toISOString() });
});

// ── Roles API (local) ─────────────────────────────────────

app.get('/api/roles', (req, res) => { res.json(rolesStore); });
app.post('/api/roles', (req, res) => {
  const role = { id: 'role_' + Date.now(), ...req.body, created_at: new Date().toISOString() };
  rolesStore.push(role);
  res.json(role);
});
app.put('/api/roles/:id', (req, res) => {
  const idx = rolesStore.findIndex(r => r.id === req.params.id);
  if (idx >= 0) { rolesStore[idx] = { ...rolesStore[idx], ...req.body }; res.json(rolesStore[idx]); }
  else res.status(404).json({ error: 'Not found' });
});
app.get('/api/roles/:id/agents', (req, res) => {
  const role = rolesStore.find(r => r.id === req.params.id);
  res.json(role?.agents || []);
});
app.post('/api/roles/:id/agents', (req, res) => {
  const role = rolesStore.find(r => r.id === req.params.id);
  if (role) {
    if (!role.agents) role.agents = [];
    role.agents.push(req.body.agentId);
    res.json({ ok: true });
  } else res.status(404).json({ error: 'Not found' });
});

function mapEventType(type) {
  const map = {
    task_complete: 'completion', task_completed: 'completion',
    task_failed: 'error', task_started: 'activity',
    error: 'error', system_alert: 'system', system_warning: 'system',
    vault_write: 'vault', queue_item_created: 'question',
    queue_answered: 'completion', queue_auto_resolved: 'completion',
    discord_sync: 'activity', insight: 'activity',
    file_changed: 'activity', question_asked: 'question',
  };
  return map[type] || 'activity';
}

// ── Inbox API (local) ─────────────────────────────────────

// In-memory inbox store (seed with some items)
const inboxStore = [
  { id: 'inb_1', agent: 'researcher', category: 'review', priority: 'normal', unread: true, subject: 'Competitive Analysis Report', preview: 'Phase 2 complete', body: 'Report ready.', time: new Date().toISOString(), thread: [] },
  { id: 'inb_2', agent: 'coder', category: 'proposals', priority: 'urgent', unread: true, subject: 'Proposal: Async dispatch', preview: 'Sync dispatch causing backups', body: 'Proposal details.', time: new Date().toISOString(), thread: [] },
];

app.get('/api/inbox', (req, res) => {
  res.json(inboxStore);
});

app.post('/api/inbox/:id/action', (req, res) => {
  const { id } = req.params;
  const { action, value } = req.body;
  console.log(`[Inbox Action] ${id}: ${action}${value ? ' — ' + value : ''}`);
  
  if (action === 'archive' || action === 'approve' || action === 'reject') {
    const idx = inboxStore.findIndex(i => i.id === id);
    if (idx !== -1) inboxStore.splice(idx, 1);
  }

  res.json({ ok: true, id, action, timestamp: new Date().toISOString() });
});

// ── Rooms API (local) ─────────────────────────────────────

const roomStore = [
  { id: 'room_build', name: 'Build Room', agents: ['coder', 'ops', 'righthand'], purpose: 'Sprint coordination', messages: [] },
  { id: 'room_research', name: 'Research Room', agents: ['researcher', 'devil'], purpose: 'Competitive analysis', messages: [] },
];

app.get('/api/rooms', (req, res) => {
  res.json(roomStore.map(r => ({ ...r, messages: undefined, messageCount: r.messages.length })));
});

app.post('/api/rooms', (req, res) => {
  const { name, agents, purpose } = req.body;
  const room = { id: 'room_' + Date.now(), name, agents: agents || [], purpose: purpose || '', messages: [] };
  roomStore.push(room);
  res.json({ ok: true, room: { ...room, messages: undefined } });
});

app.get('/api/rooms/:id/messages', (req, res) => {
  const room = roomStore.find(r => r.id === req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json(room.messages);
});

app.post('/api/rooms/:id/messages', (req, res) => {
  const room = roomStore.find(r => r.id === req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found' });
  const { content, sender } = req.body;
  const msg = { id: 'rmsg_' + Date.now(), sender: sender || 'user', content, time: new Date().toISOString() };
  room.messages.push(msg);

  // Simulate agent response
  const agentResponses = [
    'Got it, working on it.', 'Understood.', 'I\'ll factor that in.', 'On it.',
    'Acknowledged.', 'Good point.', 'Noted — adjusting.', 'Will do.',
  ];
  const respondingAgent = room.agents[Math.floor(Math.random() * room.agents.length)];
  const agentMsg = {
    id: 'rmsg_' + (Date.now() + 1),
    sender: respondingAgent,
    content: agentResponses[Math.floor(Math.random() * agentResponses.length)],
    time: new Date(Date.now() + 1500).toISOString(),
  };
  room.messages.push(agentMsg);

  res.json({ ok: true, userMessage: msg, agentResponse: agentMsg });
});

// Proxy /api/* to bridge (after local endpoints)
app.use('/api', createProxyMiddleware({
  target: BRIDGE,
  changeOrigin: true,
  ws: true,
}));

// Serve static frontend
app.use(express.static(__dirname));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Agent OS frontend: http://localhost:${PORT}`);
  console.log(`Bridge proxy: ${BRIDGE}`);
});
