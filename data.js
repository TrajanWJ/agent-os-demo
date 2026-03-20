/* AGENT OS v5 — DATA */
'use strict';

const AGENTS = [
  {id:'righthand', emoji:'🤝', name:'Right Hand',    role:'Orchestrator',   color:'#D4A574', status:'active', task:'Coordinating morning batch', tasks:12, files:3,  tokens:9500,  fitness:.92},
  {id:'researcher',emoji:'🔬', name:'Researcher',    role:'Deep Research',  color:'#5B8AF0', status:'active', task:'AI Interface Competitive Study', tasks:6, files:4, tokens:18200, fitness:.88},
  {id:'coder',     emoji:'💻', name:'Coder',         role:'Development',    color:'#4CAF50', status:'idle',   task:'', tasks:4, files:6, tokens:12800, fitness:.95},
  {id:'vault',     emoji:'📚', name:'Vault Keeper',  role:'Knowledge Mgmt', color:'#9B59B6', status:'idle',   task:'', tasks:3, files:3, tokens:4200,  fitness:.78},
  {id:'devil',     emoji:'😈', name:"Devil's Advocate",role:'Red Team',     color:'#E74C3C', status:'idle',   task:'', tasks:2, files:1, tokens:2800,  fitness:.91},
  {id:'ops',       emoji:'⚙️', name:'Ops',           role:'Infrastructure', color:'#F39C12', status:'idle',   task:'', tasks:1, files:0, tokens:734,   fitness:.85},
  {id:'security',  emoji:'🛡️', name:'Security',      role:'Audit',          color:'#1ABC9C', status:'idle',   task:'', tasks:1, files:1, tokens:520,   fitness:.87},
  {id:'prompt',    emoji:'🎯', name:'Prompt Eng',    role:'Optimization',   color:'#E91E63', status:'idle',   task:'', tasks:2, files:2, tokens:1100,  fitness:.90},
];

// ── FEED EVENTS ───────────────────────────────────────────────────────────────
const FEED_EVENTS = [
  {id:'f1', agent:'righthand', type:'task_started',  time:'9:14 AM', content:'Starting morning coordination batch. Dispatching Researcher for competitive analysis.', pinned:true},
  {id:'f2', agent:'researcher',type:'task_started',  time:'9:08 AM', content:'Beginning competitive landscape scan. Targeting 13 products across 4 categories.'},
  {id:'f3', agent:'coder',     type:'task_completed',time:'8:52 AM', content:'`cross-channel-backlinker.sh` deployed and live. All integration tests passed ✅', urgent:true},
  {id:'f4', agent:'devil',     type:'error',         time:'8:43 AM', content:'Red Team v5.1 — 3 criticals found: rate limit storm on parallel dispatch, missing circuit breaker, single-threaded session watchdog.'},
  {id:'f5', agent:'vault',     type:'vault_write',   time:'8:30 AM', content:'Vision doc written → `vault/Research/Future-Frontend-Vision.md`. Cross-linked to Architecture and Competitive Analysis.'},
  {id:'f6', agent:'researcher',type:'insight',       time:'8:15 AM', content:'Key finding: no existing tool combines real-time orchestration + knowledge graph + CLI + comms. This is the gap Agent OS fills.'},
  {id:'f7', agent:'ops',       type:'error',         time:'8:01 AM', content:'session-watchdog: Connection refused :8484. Retry 2/3 failed. Manual restart may be needed.'},
  {id:'f8', agent:'righthand', type:'question_asked',time:'7:55 AM', content:'Should I increase the parallel dispatch limit from 3 to 5? Current queue is backing up.'},
  {id:'f9', agent:'coder',     type:'file_changed',  time:'7:40 AM', content:'Modified `dispatch-engine.sh` — added semaphore for max-3 concurrency. Resolves rate limit storm.'},
  {id:'f10',agent:'vault',     type:'insight',       time:'7:22 AM', content:'Knowledge graph density increased 23% this week. Most-linked node: "Multi-Agent Routing" with 8 backlinks.'},
  {id:'f11',agent:'security',  type:'task_completed',time:'7:10 AM', content:'Security audit complete. No critical vulnerabilities. Recommend rotating API keys quarterly.'},
  {id:'f12',agent:'prompt',    type:'vault_write',   time:'6:58 AM', content:'Prompt templates v2 saved to vault. Average quality score improved from 72 to 89.'},
  {id:'f13',agent:'researcher',type:'task_completed',time:'6:45 AM', content:'Market scan phase 1 done. 60+ products catalogued. Report in `vault/Research/Competitive-Analysis.md`.'},
  {id:'f14',agent:'ops',       type:'task_started',  time:'6:30 AM', content:'Starting daily infrastructure health check. Scanning all cron jobs, webhooks, and service endpoints.'},
  {id:'f15',agent:'devil',     type:'question_asked',time:'6:15 AM', content:'Researcher\'s confidence score on the "no competitor" claim is 73%. Should I run adversarial search before we ship?'},
];

// ── QUEUE QUESTIONS ───────────────────────────────────────────────────────────
const QUEUE_QUESTIONS = []; // Live proposals loaded from bridge API

// ── DISCORD MESSAGES ──────────────────────────────────────────────────────────
const DC_CHANNELS = {
  categories: [
    {
      id:'⚡ ACTIVE', name:'⚡ ACTIVE', channels: [
        {id:'1484410846422765590', name:'🔧-claw-discord-setup', unread:0, type:'text', topic:'Discord v5 config, wiring, repairs.'},
        {id:'1484411971880226856', name:'ingestor-researcher-dispatcher-propositioner', unread:0, type:'text', topic:'Ingestor, vault-feed, links pipeline wiring.'},
        {id:'1484411979761324183', name:'🔬-self-improvement-loop', unread:0, type:'text', topic:'Self-improvement hook live in 3 scripts.'},
        {id:'1484411982487490701', name:'🤖-agent-os-frontend', unread:0, type:'text', topic:'Native frontend to replace Discord.'},
        {id:'1484432021727084644', name:'📚-links-reads-to-implement', unread:0, type:'text', topic:'Drop links for agents to assess.'},
        {id:'1484435106365046844', name:'🤝-agent-orchestration', unread:0, type:'text', topic:'Multi-agent coordination patterns.'},
      ]
    },
    {
      id:'🛎️ BRIDGE', name:'🛎️ BRIDGE', channels: [
        {id:'1482997518362214422', name:'concierge', unread:0, type:'text', topic:'Talk to Right Hand.'},
        {id:'1484014822642286654', name:'📋-dispatch', unread:0, type:'text', topic:'Issue commands, get results.'},
      ]
    },
    {
      id:'🧠 COMMAND', name:'🧠 COMMAND', channels: [
        {id:'1482996866428964904', name:'🗂️-desk', unread:0, type:'forum', topic:'Task board. One thread per task.'},
        {id:'1482939106223853740', name:'⚖️-decisions', unread:0, type:'forum', topic:'Decision log.'},
        {id:'1484014825670574180', name:'🧠-prompt-lab', unread:0, type:'forum', topic:'Prompt engineering workshop.'},
        {id:'1484031225709723818', name:'📢-daily-brief', unread:0, type:'text', topic:'Morning synthesis.'},
        {id:'1484267485476946112', name:'❓-queue', unread:0, type:'text', topic:'Agent decision queue.'},
      ]
    },
    {
      id:'📡 SIGNALS', name:'📡 SIGNALS', channels: [
        {id:'1482256987700990066', name:'🔗-links', unread:0, type:'text', topic:'Drop links for analysis.'},
        {id:'1482940161808625826', name:'🐙-github-interesting', unread:0, type:'text', topic:'GitHub repo feed.'},
        {id:'1483016902044291186', name:'🤖-agent-feed', unread:0, type:'text', topic:'Agent activity firehose.'},
      ]
    },
    {
      id:'🔧 SYSTEM', name:'🔧 SYSTEM', channels: [
        {id:'1482879662115073166', name:'📊-system-logs', unread:0, type:'text', topic:'System monitoring.'},
        {id:'1484014828434595920', name:'🔒-security', unread:0, type:'text', topic:'Security audit trail.'},
      ]
    },
    {
      id:'🤖 AGENT WORK', name:'🤖 AGENT WORK', channels: [
        {id:'1484014830770716824', name:'🔬-research', unread:0, type:'text', topic:'Research outputs.'},
        {id:'1484014833140244642', name:'💻-code-output', unread:0, type:'text', topic:'Build artifacts.'},
        {id:'1484014835417939990', name:'📚-vault-ops', unread:0, type:'text', topic:'Knowledge management.'},
      ]
    },
    {
      id:'🚀 PROJECTS', name:'🚀 PROJECTS', channels: [
        {id:'1484014838169497660', name:'🚀-project-alpha', unread:0, type:'text', topic:'Active project workspace.'},
      ]
    },
  ],
  text: [
    {id:'1482997518362214422', name:'concierge', unread:0, topic:'Talk to Right Hand.'},
    {id:'1484014822642286654', name:'📋-dispatch', unread:0, topic:'Issue commands.'},
    {id:'1484411982487490701', name:'🤖-agent-os-frontend', unread:0, topic:'Agent OS frontend.'},
    {id:'1483016902044291186', name:'🤖-agent-feed', unread:0, topic:'Agent activity.'},
  ],
  voice: [],
  forums: [
    {id:'1482996866428964904', name:'🗂️-desk', icon:'📋', count:0},
    {id:'1482939106223853740', name:'⚖️-decisions', icon:'⚖️', count:0},
    {id:'1484014825670574180', name:'🧠-prompt-lab', icon:'🧠', count:0},
  ],
};

const DC_MESSAGES = {}; // Real messages loaded from bridge API

const DM_MESSAGES = {}; // Real DMs loaded from bridge API

const DC_PINNED = {
  bridge: ['m1','m2','m3'],
  dev: ['d2'],
};

// ── VAULT NOTES ───────────────────────────────────────────────────────────────
const VAULT_NOTES = [
  {id:'v1',  title:'Competitive Analysis',     summary:'60+ product survey across IDE agents, autonomous agents, orchestration frameworks, and observability tools. Key gap identified: nobody combines real-time orchestration + knowledge graph + CLI + comms.', type:'Research',      confidence:88, backlinks:7, agent:'researcher', date:'2026-03-19', tags:['competitive','research','market']},
  {id:'v2',  title:'Future Frontend Vision',   summary:'North star document for the Agent OS cockpit. Unified control surface: feed + queue + vault + chat + pulse. Social-native interaction model.', type:'Vision',        confidence:92, backlinks:5, agent:'vault',      date:'2026-03-19', tags:['vision','ux','frontend']},
  {id:'v3',  title:'UX Spec v2',               summary:'Complete interaction spec for all 9 pages. Bottom bar on mobile, sidebar on desktop. Queue as killer feature — expiring decision cards.', type:'Research',      confidence:85, backlinks:9, agent:'researcher', date:'2026-03-18', tags:['ux','spec','design']},
  {id:'v4',  title:'Red Team Report v5.1',     summary:'3 critical issues: rate limit storm, no circuit breaker, single-threaded watchdog. 2 moderate: no graceful shutdown, inconsistent error codes.', type:'Report',        confidence:96, backlinks:4, agent:'devil',      date:'2026-03-19', tags:['security','audit','red-team']},
  {id:'v5',  title:'Agent OS Architecture',    summary:'Core system design: multi-agent bus, vault persistence layer, dispatch engine, session watchdog. Sequence diagrams for task lifecycle.', type:'Architecture',  confidence:82, backlinks:11, agent:'righthand',  date:'2026-03-17', tags:['architecture','system','design']},
  {id:'v6',  title:'Multi-Agent Routing',      summary:'How Right Hand routes tasks to specialist agents. Priority queue, capability matching, load balancing across 8 agents.', type:'Architecture',  confidence:79, backlinks:8, agent:'righthand',  date:'2026-03-16', tags:['routing','agents','orchestration']},
  {id:'v7',  title:'Vault System Design',      summary:'Obsidian-style local-first knowledge base. Bidirectional linking, semantic search, confidence scores, agent attribution.', type:'Architecture',  confidence:87, backlinks:6, agent:'vault',      date:'2026-03-15', tags:['vault','knowledge','design']},
  {id:'v8',  title:'cross-channel-backlinker', summary:'Shell script that scans all channels, extracts backlinks, and indexes them in the vault. Runs every 10 minutes via cron.', type:'Code',          confidence:100,backlinks:3, agent:'coder',      date:'2026-03-19', tags:['code','tooling','automation']},
  {id:'v9',  title:'Token Budget Strategy',    summary:'How to allocate the 100K daily token budget across 8 agents. Priority weighting, hard limits, rollover rules.', type:'Operations',    confidence:74, backlinks:5, agent:'ops',        date:'2026-03-18', tags:['tokens','budget','ops']},
  {id:'v10', title:'Rate Limiting Mitigation', summary:'Exponential backoff, request semaphore (max 3 concurrent), per-agent token tracking. Resolves rate limit storm identified in red team.', type:'Architecture',  confidence:81, backlinks:4, agent:'coder',      date:'2026-03-19', tags:['rate-limit','architecture','fix']},
  {id:'v11', title:'Session Watchdog Spec',    summary:'Heartbeat monitoring for all active agent sessions. Restart policy: 3 retries, 30s backoff, escalate to Right Hand on failure.', type:'Operations',    confidence:68, backlinks:3, agent:'ops',        date:'2026-03-17', tags:['watchdog','monitoring','ops']},
  {id:'v12', title:'Prompt Templates v2',      summary:'12 standardized prompt templates. Chain-of-thought scaffolding, 30% verbosity reduction, confidence calibration. Avg quality 72→89.', type:'Research',      confidence:91, backlinks:6, agent:'prompt',     date:'2026-03-19', tags:['prompts','optimization','quality']},
  {id:'v13', title:'Discord Integration',      summary:'Full Discord clone for agent communication. Rich messages, reactions, threads, voice channels, member list with agent activity.', type:'Architecture',  confidence:88, backlinks:5, agent:'coder',      date:'2026-03-18', tags:['discord','integration','comms']},
  {id:'v14', title:'Market Positioning',       summary:'Agent OS fills gap between IDE agents (single-project) and observability tools (watch-only). First unified control surface for multi-agent systems.', type:'Vision',        confidence:84, backlinks:7, agent:'researcher', date:'2026-03-18', tags:['positioning','market','strategy']},
  {id:'v15', title:'Cron Scheduler Design',    summary:'7 scheduled jobs. Heartbeat every 2min, vault sync every 5min, backlinker every 10min. Daily digest at 7am. All managed by Ops.', type:'Operations',    confidence:93, backlinks:4, agent:'ops',        date:'2026-03-16', tags:['cron','scheduling','ops']},
  {id:'v16', title:'Security Audit v1',        summary:'API key rotation policy, input sanitization gaps (backlinker), no critical vulnerabilities. Recommend quarterly key rotation.', type:'Report',        confidence:97, backlinks:2, agent:'security',   date:'2026-03-19', tags:['security','audit','compliance']},
  {id:'v17', title:'Knowledge Graph Theory',   summary:'Force-directed layout with semantic clusters. Heat map for recency. Bidirectional edges for backlinks. Confidence as node size.', type:'Vision',        confidence:76, backlinks:8, agent:'vault',      date:'2026-03-17', tags:['graph','knowledge','theory']},
  {id:'v18', title:'Agent Gallery Design',     summary:'Visual roster of all agents with status, current task, fitness score, token usage. Health dashboard meets team directory.', type:'Vision',        confidence:82, backlinks:6, agent:'righthand',  date:'2026-03-15', tags:['agents','ux','design']},
  {id:'v19', title:'Reminder Engine Spec',     summary:'Time-based task scheduling for agents. Natural language triggers ("every morning", "when coder is idle"). Integration with cron scheduler.', type:'Architecture',  confidence:65, backlinks:3, agent:'coder',      date:'2026-03-14', tags:['reminder','scheduling','feature']},
  {id:'v20', title:'Memory Compactor',         summary:'LCM-style conversation compression. Keeps recent context, compacts old exchanges into summaries. Reduces token usage by ~40%.', type:'Architecture',  confidence:78, backlinks:5, agent:'vault',      date:'2026-03-13', tags:['memory','compression','tokens']},
  {id:'v21', title:'Streaming Progress UI',    summary:'WebSocket-based live task progress. Card expands to show streaming log lines. Status bar, percentage, eta. Currently in development.', type:'Vision',        confidence:70, backlinks:4, agent:'coder',      date:'2026-03-19', tags:['ui','streaming','ux']},
  {id:'v22', title:'Dispatch Engine v3',       summary:'Core task routing: priority queue, agent capability matrix, load balancer, budget allocator. Now with semaphore for max-3 concurrency.', type:'Architecture',  confidence:89, backlinks:7, agent:'righthand',  date:'2026-03-18', tags:['dispatch','architecture','core']},
];

// ── GRAPH NODES ───────────────────────────────────────────────────────────────
const GNODES = [
  {id:0,  label:'Agent OS Core',          type:'architecture', hex:'#D4A574', size:20},
  {id:1,  label:'Cockpit Vision',         type:'vision',       hex:'#5B8AF0', size:16, glow:true},
  {id:2,  label:'Competitive Analysis',   type:'research',     hex:'#5B8AF0', size:14},
  {id:3,  label:'Multi-Agent Routing',    type:'architecture', hex:'#D4A574', size:18, glow:true},
  {id:4,  label:'Knowledge Graph',        type:'architecture', hex:'#9B59B6', size:15},
  {id:5,  label:'Dispatch Engine',        type:'architecture', hex:'#D4A574', size:17},
  {id:6,  label:'Vault System',           type:'architecture', hex:'#9B59B6', size:16, glow:true},
  {id:7,  label:'Red Team Report',        type:'research',     hex:'#E74C3C', size:12},
  {id:8,  label:'Rate Limiting',          type:'architecture', hex:'#E74C3C', size:13},
  {id:9,  label:'Reminder Engine',        type:'project',      hex:'#4CAF50', size:11},
  {id:10, label:'Discord Integration',    type:'architecture', hex:'#F39C12', size:14},
  {id:11, label:'Session Watchdog',       type:'operations',   hex:'#F39C12', size:12},
  {id:12, label:'Token Budget',           type:'operations',   hex:'#F39C12', size:13},
  {id:13, label:'Frontend Vision',        type:'vision',       hex:'#5B8AF0', size:14},
  {id:14, label:'UX Spec v2',             type:'research',     hex:'#5B8AF0', size:15},
  {id:15, label:'Prompt Templates',       type:'research',     hex:'#E91E63', size:12},
  {id:16, label:'Backlinker',             type:'operations',   hex:'#F39C12', size:12},
  {id:17, label:'Streaming UI',           type:'project',      hex:'#4CAF50', size:11},
  {id:18, label:'Market Positioning',     type:'vision',       hex:'#5B8AF0', size:13},
  {id:19, label:'Cron Scheduler',         type:'operations',   hex:'#F39C12', size:12},
  {id:20, label:'Memory Compactor',       type:'operations',   hex:'#9B59B6', size:12},
  {id:21, label:'Security Audit',         type:'research',     hex:'#1ABC9C', size:11},
  {id:22, label:'Agent Gallery',          type:'vision',       hex:'#5B8AF0', size:12},
];
const GEDGES = [[0,1],[0,3],[0,4],[0,5],[0,6],[1,13],[1,18],[1,14],[2,1],[2,7],[2,14],[2,18],[3,5],[3,10],[3,9],[4,6],[4,20],[5,12],[5,8],[5,11],[6,20],[6,16],[7,8],[7,11],[8,12],[9,19],[10,16],[10,3],[11,19],[11,12],[13,22],[13,17],[14,10],[15,5],[16,6],[17,13],[18,2],[19,11],[20,6],[21,8],[22,1]];
const GNOTES_MAP = {0:'Central orchestration — tasks, sessions, vault.',1:'North star: unified cockpit for human-agent collaboration.',3:'Routes tasks to specialist agents via capability matrix.',6:'Persistent storage — indexed, versioned, linked.'};

// ── STREAM EVENTS ─────────────────────────────────────────────────────────────
const STREAM_EVENTS = [
  {id:'s1',  level:'info',  agent:'righthand', time:'9:14:02', text:'Dispatch batch started — 5 tasks queued'},
  {id:'s2',  level:'info',  agent:'researcher',time:'9:13:58', text:'Task accepted: competitive analysis (P1, budget:15K)'},
  {id:'s3',  level:'debug', agent:'ops',       time:'9:13:45', text:'Heartbeat OK — 8 agents registered, 2 active'},
  {id:'s4',  level:'info',  agent:'coder',     time:'9:12:33', text:'Streaming UI design phase started'},
  {id:'s5',  level:'warn',  agent:'ops',       time:'9:11:20', text:'openai-stream latency spike: 1.2s (threshold: 800ms)'},
  {id:'s6',  level:'info',  agent:'righthand', time:'9:10:05', text:'Semaphore acquired: slot 2/3'},
  {id:'s7',  level:'info',  agent:'security',  time:'9:09:47', text:'API key audit started'},
  {id:'s8',  level:'debug', agent:'vault',     time:'9:08:30', text:'Vault sync: 0 changes'},
  {id:'s9',  level:'info',  agent:'researcher',time:'9:07:12', text:'LangSmith teardown complete — notes saved'},
  {id:'s10', level:'info',  agent:'researcher',time:'9:06:00', text:'Cursor UX teardown complete — notes saved'},
  {id:'s11', level:'debug', agent:'ops',       time:'9:05:33', text:'Token ledger: 31.2K / 100K used'},
  {id:'s12', level:'info',  agent:'righthand', time:'9:04:55', text:'Dispatch: Security → API key audit (P2, 4K)'},
  {id:'s13', level:'debug', agent:'ops',       time:'9:03:40', text:'Backlinker: scan cycle complete (6 links found)'},
  {id:'s14', level:'info',  agent:'coder',     time:'9:02:15', text:'Starting streaming progress UI implementation'},
  {id:'s15', level:'error', agent:'ops',       time:'9:01:00', text:'agent-bus latency: 3.1s — possible overload'},
  {id:'s16', level:'info',  agent:'ops',       time:'9:00:30', text:'Dispatch log written for 2026-03-19'},
  {id:'s17', level:'info',  agent:'coder',     time:'8:52:14', text:'Deploy complete: cross-channel-backlinker.sh'},
  {id:'s18', level:'debug', agent:'vault',     time:'8:51:00', text:'Vault indexed: cross-channel-backlinker.sh (3 xrefs)'},
  {id:'s19', level:'info',  agent:'coder',     time:'8:45:30', text:'Integration tests: 5/5 passed'},
  {id:'s20', level:'warn',  agent:'ops',       time:'8:43:11', text:'Disk usage on /var/run/agentvm: 94%'},
  {id:'s21', level:'error', agent:'ops',       time:'8:42:00', text:'session-watchdog: Retry 3/3 failed — manual intervention required'},
  {id:'s22', level:'error', agent:'ops',       time:'8:40:30', text:'session-watchdog: Retry 2/3 failed'},
  {id:'s23', level:'error', agent:'ops',       time:'8:39:00', text:'session-watchdog: Retry 1/3 failed'},
  {id:'s24', level:'warn',  agent:'ops',       time:'8:37:00', text:'session-watchdog: connection refused :8484'},
  {id:'s25', level:'info',  agent:'devil',     time:'8:30:00', text:'Red team session started — scope: v4 architecture'},
  {id:'s26', level:'debug', agent:'ops',       time:'8:28:00', text:'Vault sync: 2 files modified'},
  {id:'s27', level:'info',  agent:'vault',     time:'8:25:00', text:'Vault write: Future-Frontend-Vision.md'},
  {id:'s28', level:'debug', agent:'ops',       time:'8:18:00', text:'Heartbeat OK — 8 agents registered, 3 active'},
  {id:'s29', level:'info',  agent:'researcher',time:'8:15:10', text:'Insight logged: market gap identified'},
  {id:'s30', level:'info',  agent:'ops',       time:'6:30:00', text:'Daily health check started'},
  {id:'s31', level:'info',  agent:'ops',       time:'6:35:15', text:'Health check: 6/7 jobs OK, 1 failed (session-watchdog)'},
  {id:'s32', level:'debug', agent:'ops',       time:'6:28:00', text:'Memory compactor: 12 sessions compacted, 40% reduction'},
];

// ── BOARD CARDS ───────────────────────────────────────────────────────────────
const BOARD_CARDS = {
  inbox: [
    {id:'b1', title:'Set up monitoring alerts',   priority:'P2', agent:'ops',        tags:['ops','monitoring']},
    {id:'b2', title:'Research: Devin deep-dive',  priority:'P2', agent:'researcher', tags:['research']},
    {id:'b3', title:'Voice command prototype',     priority:'P3', agent:'coder',      tags:['feature','ux']},
  ],
  queued: [
    {id:'b4', title:'Budget circuit breaker',     priority:'P1', agent:'coder',      tags:['critical','fix']},
    {id:'b5', title:'Watchdog: fix SPOF',         priority:'P1', agent:'ops',        tags:['critical','ops']},
    {id:'b6', title:'Prompt template refresh',    priority:'P3', agent:'prompt',     tags:['optimization']},
    {id:'b7', title:'Mobile gestures',            priority:'P3', agent:'coder',      tags:['ux','mobile']},
  ],
  active: [
    {id:'b8', title:'AI Interface Competitive Study', priority:'P1', agent:'researcher', progress:67, tags:['research','active']},
    {id:'b9', title:'Streaming Progress UI',      priority:'P1', agent:'coder',      progress:15, tags:['feature','ui']},
  ],
  review: [
    {id:'b10', title:'Red Team Report v5.1',      priority:'P0', agent:'devil',      tags:['review','security']},
    {id:'b11', title:'Prompt Templates v2',        priority:'P2', agent:'prompt',     tags:['review','quality']},
  ],
  done: [
    {id:'b12', title:'Core navigation system',    priority:'P1', agent:'coder',      tags:['done']},
    {id:'b13', title:'Knowledge graph v1',        priority:'P2', agent:'coder',      tags:['done']},
    {id:'b14', title:'cross-channel-backlinker',  priority:'P1', agent:'coder',      tags:['done']},
    {id:'b15', title:'Market scan phase 1',       priority:'P1', agent:'researcher', tags:['done']},
    {id:'b16', title:'UX spec v2',                priority:'P1', agent:'researcher', tags:['done']},
  ],
};

// ── CRONS / HOOKS / ERRORS ────────────────────────────────────────────────────
const CRONS = [
  {n:'agent-heartbeat',s:'*/2 * * * *',  ok:true},
  {n:'vault-sync',     s:'*/5 * * * *',  ok:true},
  {n:'backlinker',     s:'*/10 * * * *', ok:true},
  {n:'daily-digest',   s:'0 7 * * *',    ok:true},
  {n:'memory-compact', s:'0 3 * * *',    ok:true},
  {n:'token-reset',    s:'0 0 * * *',    ok:true},
  {n:'session-watchdog',s:'*/1 * * * *', ok:false},
];

const HOOKS = [
  {n:'discord-inbound', s:'ok',   l:'42ms'},
  {n:'github-events',   s:'ok',   l:'88ms'},
  {n:'telegram-bot',    s:'ok',   l:'67ms'},
  {n:'vault-write',     s:'ok',   l:'31ms'},
  {n:'openai-stream',   s:'warn', l:'1.2s'},
  {n:'anthropic-main',  s:'ok',   l:'95ms'},
  {n:'agent-bus',       s:'warn', l:'3.1s'},
];

const COST_DATA = [
  {day:'Mon', righthand:1.2, researcher:2.4, coder:1.8, vault:0.3, other:0.4},
  {day:'Tue', righthand:1.0, researcher:1.8, coder:2.2, vault:0.4, other:0.6},
  {day:'Wed', righthand:1.4, researcher:3.1, coder:1.5, vault:0.5, other:0.3},
  {day:'Thu', righthand:1.1, researcher:4.2, coder:2.8, vault:0.6, other:0.8},
  {day:'Fri', righthand:0.9, researcher:2.0, coder:1.2, vault:0.4, other:0.5},
  {day:'Sat', righthand:0.5, researcher:0.8, coder:0.3, vault:0.2, other:0.1},
  {day:'Today',righthand:0.4,researcher:1.4, coder:0.8, vault:0.2, other:0.3},
];

const GROWTH = {xp:2840, level:3, total:48, thresholds:[0,500,1500,3000,5000,8000,12000]};
const EMOJIS_LIST = '👍 👎 ❤️ 🔥 👀 ✅ 🚀 💡 🎯 😂 🤔 👏 💪 ⭐ 🙌 💯 😬 💀 🎉 📊 🚨 📚 🧵 🔬 💻'.split(' ');

const AGENT_SESSIONS = [
  {agent:'righthand', task:'Morning coordination batch', duration:'4h 23m', status:'active'},
  {agent:'researcher', task:'Competitive analysis scan', duration:'1h 12m', status:'active'},
];

const SLASH_COMMANDS = [
  {cmd:'/dispatch', desc:'Dispatch task to an agent', usage:'/dispatch <agent> <task>'},
  {cmd:'/status',   desc:'Show agent status',          usage:'/status [agent]'},
  {cmd:'/search',   desc:'Search vault',               usage:'/search <query>'},
  {cmd:'/ask',      desc:'Ask a specific agent',       usage:'/ask <agent> <question>'},
  {cmd:'/pin',      desc:'Pin last message',           usage:'/pin'},
  {cmd:'/thread',   desc:'Start a thread',             usage:'/thread <name>'},
];
