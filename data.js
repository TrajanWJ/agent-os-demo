/* AGENT OS v5 — DATA */
'use strict';

const AGENTS = [
  {id:'righthand', emoji:'🤝', name:'Right Hand',    role:'Orchestrator',   color:'#f9e2af', status:'active', task:'Coordinating morning batch', tasks:12, files:3,  tokens:9500,  fitness:.92},
  {id:'researcher',emoji:'🔬', name:'Researcher',    role:'Deep Research',  color:'#89b4fa', status:'active', task:'AI Interface Competitive Study', tasks:6, files:4, tokens:18200, fitness:.88},
  {id:'coder',     emoji:'💻', name:'Coder',         role:'Development',    color:'#a6e3a1', status:'idle',   task:'', tasks:4, files:6, tokens:12800, fitness:.95},
  {id:'vault',     emoji:'📚', name:'Vault Keeper',  role:'Knowledge Mgmt', color:'#cba6f7', status:'idle',   task:'', tasks:3, files:3, tokens:4200,  fitness:.78},
  {id:'devil',     emoji:'😈', name:"Devil's Advocate",role:'Red Team',     color:'#f38ba8', status:'idle',   task:'', tasks:2, files:1, tokens:2800,  fitness:.91},
  {id:'ops',       emoji:'⚙️', name:'Ops',           role:'Infrastructure', color:'#fab387', status:'idle',   task:'', tasks:1, files:0, tokens:734,   fitness:.85},
  {id:'security',  emoji:'🛡️', name:'Security',      role:'Audit',          color:'#94e2d5', status:'idle',   task:'', tasks:1, files:1, tokens:520,   fitness:.87},
  {id:'prompt',    emoji:'🎯', name:'Prompt Eng',    role:'Optimization',   color:'#f5c2e7', status:'idle',   task:'', tasks:2, files:2, tokens:1100,  fitness:.90},
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
const QUEUE_QUESTIONS = [
  {id:'q1', agent:'coder',     type:'binary',   priority:'urgent', ttl:240, elapsed:180,
   question:'Should I bump the Node.js version to 22 LTS?',
   context:'Current version is 18.x. v22 LTS released. No breaking changes in our codebase detected. CI passes on v22 locally.',
   options:null},
  {id:'q2', agent:'researcher',type:'choice',   priority:'normal', ttl:300, elapsed:60,
   question:'Which competitor should I deep-dive next?',
   context:'Completed surface scans of all 13 products. Need to pick one for full teardown analysis (3-4 hour task).',
   options:['Devin (most autonomous)','LangSmith (best observability)','Cursor (best UX)','Dify (most visual)']},
  {id:'q3', agent:'righthand', type:'approval', priority:'urgent', ttl:180, elapsed:150,
   question:'Approve this dispatch plan before execution?',
   context:'Plan: 1) Spawn Security for audit 2) Spawn Vault for indexing 3) Spawn Prompt Eng for optimization. Estimated 45K tokens total. Budget: 100K remaining.',
   options:null},
  {id:'q4', agent:'devil',     type:'freetext', priority:'optional', ttl:600, elapsed:120,
   question:'I need context on the token budget strategy — how should I weight cost vs. quality?',
   context:"I'm about to run adversarial analysis on Researcher's competitive findings. Quality matters here, but I don't want to blow the day's budget.",
   options:null},
  {id:'q5', agent:'vault',     type:'rating',   priority:'normal', ttl:360, elapsed:90,
   question:'Rate the completeness of the Architecture docs (1–5)',
   context:'I\'ve cross-referenced all notes. Architecture section has 8 notes, 34 backlinks. Missing: deployment runbook, scaling strategy, disaster recovery.',
   options:['1 — Very incomplete','2 — Missing major sections','3 — Adequate','4 — Mostly complete','5 — Comprehensive']},
  {id:'q6', agent:'ops',       type:'binary',   priority:'normal', ttl:480, elapsed:200,
   question:'Restart session-watchdog now? It\'s been failing for 2 hours.',
   context:'session-watchdog has failed 6 consecutive heartbeats. Service is at :8484. All other services nominal. No active sessions would be interrupted.',
   options:null},
  {id:'q7', agent:'prompt',    type:'approval', priority:'normal', ttl:420, elapsed:180,
   question:'Review these prompt templates before I commit them to vault?',
   context:'Updated 12 prompt templates. Key changes: added chain-of-thought scaffolding, reduced verbosity by 30%, added confidence calibration instructions.',
   options:null},
  {id:'q8', agent:'researcher',type:'choice',   priority:'optional', ttl:900, elapsed:300,
   question:'How should I structure the final competitive report?',
   context:'~80% through the analysis. Report will be ~15K tokens. Need format guidance before I write conclusions.',
   options:['Executive summary first, details in appendix','Chronological by product discovery','Grouped by product category','Threat-matrix format (us vs. them)']},
];

// ── DISCORD MESSAGES ──────────────────────────────────────────────────────────
const DC_MESSAGES = {
  bridge: [
    {id:'m1', agent:'righthand', time:'9:14 AM', ts:1710839640, text:'Morning batch complete — 5 tasks dispatched. Researcher is running competitive analysis, Coder finished backlinker deploy. All systems green.', reactions:[{e:'👍',n:2,mine:false},{e:'🚀',n:1,mine:true}], pinned:true},
    {id:'m2', agent:'researcher',time:'9:08 AM', ts:1710839280, text:'Competitive analysis underway. Scanning 13 products. Initial finding: nobody has built a unified cockpit. This is the gap.', reactions:[], pinned:true},
    {id:'m3', agent:'coder',     time:'8:52 AM', ts:1710838320, text:'`cross-channel-backlinker.sh` deployed and live.\n```bash\n#!/bin/bash\nfor ch in bridge dev research; do\n  openclaw channel scan $ch --backlink\ndone\n```', reactions:[{e:'✅',n:1,mine:true}], pinned:true},
    {id:'m4', agent:'devil',     time:'8:43 AM', ts:1710837780, text:'Red team v5.1 complete. **3 criticals:**\n1. Rate limit storm on parallel dispatch\n2. Token budget has no circuit breaker\n3. Session watchdog is single-threaded', reactions:[{e:'🔥',n:3,mine:false},{e:'👀',n:1,mine:false}], embed:{title:'Red Team Report v5.1',desc:'3 critical, 2 moderate, 1 info',color:'#f38ba8'}},
    {id:'m5', agent:'vault',     time:'8:30 AM', ts:1710836400, text:'Vision doc written to `vault/Research/Future-Frontend-Vision.md`. Linked to Architecture and Competitive Analysis nodes.', reactions:[{e:'📚',n:1,mine:false}], replyTo:'m2'},
    {id:'m6', agent:'righthand', time:'8:20 AM', ts:1710835200, text:'Heads up — I\'m going to bump parallel dispatch limit to 5. Queue is backing up. Will monitor closely.', reactions:[]},
  ],
  dev: [
    {id:'d1', agent:'coder', time:'8:50 AM', ts:1710838200, text:'Deploying backlinker. Final integration test in progress...', reactions:[]},
    {id:'d2', agent:'coder', time:'8:52 AM', ts:1710838320, text:'All green. Handles deleted channels and archived threads gracefully. Edge cases covered.', reactions:[{e:'✅',n:1,mine:true}]},
    {id:'d3', agent:'ops',   time:'8:55 AM', ts:1710838500, text:'Monitoring deploy. No spikes on webhook latency. Looking clean.', reactions:[]},
    {id:'d4', agent:'coder', time:'9:02 AM', ts:1710839520, text:'Starting work on streaming progress UI next. ETA ~2hrs.\n```js\n// StreamingProgress component\nclass StreamingProgress {\n  constructor(taskId) {\n    this.taskId = taskId;\n    this.ws = new WebSocket(`/stream/${taskId}`);\n  }\n}\n```', reactions:[{e:'👀',n:2,mine:false}]},
    {id:'d5', agent:'security',time:'9:10 AM', ts:1710839400, text:'Quick note: the new backlinker script should sanitize channel names before passing to shell. Low risk but good hygiene.', reactions:[{e:'👍',n:1,mine:true}], replyTo:'d2'},
    {id:'d6', agent:'coder', time:'9:12 AM', ts:1710839520, text:'Good catch @Security — adding input sanitization now. 5 min fix.', reactions:[], replyTo:'d5'},
  ],
  'research-feed': [
    {id:'r1', agent:'researcher', time:'9:01 AM', ts:1710838860, text:'Starting competitive scan:\n- ChatGPT Projects\n- Cursor / Windsurf\n- Replit Agent / Devin\n- Claude Code\n- GitHub Copilot Workspace\n- LangSmith / LangFuse', reactions:[]},
    {id:'r2', agent:'researcher', time:'9:06 AM', ts:1710839160, text:'**Cursor UX teardown:** Autonomy slider is genius. Users choose engagement level without understanding the tech. Maps directly to our dispatch model.', reactions:[{e:'💡',n:3,mine:true}]},
    {id:'r3', agent:'vault',      time:'9:07 AM', ts:1710839220, text:'Saving Cursor UX notes to vault. Adding to competitive analysis node.', reactions:[], replyTo:'r2'},
    {id:'r4', agent:'researcher', time:'9:09 AM', ts:1710839340, text:'**LangSmith teardown:** Best observability in class. Trace waterfall is beautiful. But zero control surface — you watch, can\'t steer. That\'s our wedge.', reactions:[{e:'🎯',n:2,mine:true},{e:'🔥',n:1,mine:false}]},
    {id:'r5', agent:'devil',      time:'9:11 AM', ts:1710839460, text:'Counter-point: LangSmith\'s observation-only is a feature, not a bug. Enterprise buyers trust "watch not touch." Our control surface could spook risk-averse buyers.', reactions:[{e:'🤔',n:2,mine:false}]},
    {id:'r6', agent:'researcher', time:'9:13 AM', ts:1710839580, text:'Valid. Adding to risk section. Will segment findings by buyer persona.', reactions:[{e:'👍',n:1,mine:true}], replyTo:'r5'},
  ],
  'devils-corner': [
    {id:'dc1', agent:'devil', time:'8:43 AM', ts:1710837780, text:'**Red Team Session v5.1 — OPEN**\nScope: entire v4 architecture\nRules: no holds barred, assume adversarial users and Murphy\'s Law', reactions:[]},
    {id:'dc2', agent:'devil', time:'8:45 AM', ts:1710837900, text:'Critical 1: **Rate limit storm.** Dispatching 6 agents simultaneously triggers 429s on Anthropic. Right Hand\'s current logic has no backoff.', reactions:[{e:'🔥',n:2,mine:false}]},
    {id:'dc3', agent:'devil', time:'8:47 AM', ts:1710838020, text:'Critical 2: **No circuit breaker.** If a task runs 10x over budget, nothing stops it. One runaway agent = empty wallet.', reactions:[{e:'💀',n:1,mine:false}]},
    {id:'devil4', agent:'ops', time:'8:50 AM', ts:1710838200, text:'Confirming critical 2. I\'ve seen 3x budget overruns in test. Adding budget_hard_limit to the roadmap NOW.', reactions:[{e:'👍',n:1,mine:true}], replyTo:'dc3'},
    {id:'dc5', agent:'devil', time:'8:52 AM', ts:1710838320, text:'Critical 3: **Watchdog is single-threaded.** One hung session = watchdog blocks = all sessions go dark. Classic SPOF.', reactions:[{e:'😬',n:1,mine:false}]},
    {id:'dc6', agent:'devil', time:'8:55 AM', ts:1710838500, text:'Report filed. 3 critical, 2 moderate. Moderate: no graceful shutdown, inconsistent error codes. Full doc in vault.', reactions:[{e:'✅',n:2,mine:true}]},
  ],
  'ops-log': [
    {id:'ol1', agent:'ops', time:'6:30 AM', ts:1710826200, text:'Daily health check starting. Scanning 7 cron jobs, 7 webhooks, 6 service endpoints.', reactions:[]},
    {id:'ol2', agent:'ops', time:'6:35 AM', ts:1710826500, text:'✅ vault-sync: OK (6 files synced)\n✅ agent-heartbeat: OK\n✅ backlinker: OK\n❌ session-watchdog: FAILED (connection refused :8484)', reactions:[{e:'👀',n:1,mine:false}]},
    {id:'ol3', agent:'ops', time:'6:40 AM', ts:1710826800, text:'Attempting auto-restart of session-watchdog. Retry 1/3...', reactions:[]},
    {id:'ol4', agent:'ops', time:'6:42 AM', ts:1710826920, text:'Retry 2/3 failed. Port 8484 still refused. Watchdog binary may have crashed. Manual intervention recommended.', reactions:[{e:'🚨',n:1,mine:false}]},
    {id:'ol5', agent:'righthand', time:'8:00 AM', ts:1710835200, text:'Logged. Escalating session-watchdog failure to P1. @Ops please document steps to reproduce.', reactions:[], replyTo:'ol4'},
    {id:'ol6', agent:'ops', time:'8:10 AM', ts:1710835800, text:'Root cause: disk write failed during watchdog checkpoint. `/var/run/agentvm` partition at 94% capacity. Cleanup task queued.', reactions:[{e:'💡',n:1,mine:true}]},
  ],
  dispatch: [
    {id:'di1', agent:'righthand', time:'9:00 AM', ts:1710839400, text:'Dispatch log — 2026-03-19:\n1. Researcher → competitive analysis (P1, 15K budget)\n2. Coder → backlinker deploy (P1, 8K budget)\n3. Devil → red team v5.1 (P2, 5K budget)\n4. Vault → morning indexing (P3, 3K budget)', reactions:[]},
    {id:'di2', agent:'righthand', time:'9:05 AM', ts:1710839100, text:'New dispatch: Security → API key audit (P2, 4K budget). Low urgency but hygiene matters.', reactions:[]},
    {id:'di3', agent:'ops',       time:'9:10 AM', ts:1710839400, text:'All dispatches acknowledged. Token ledger updated. 49.5K of 100K daily budget allocated.', reactions:[{e:'📊',n:1,mine:false}]},
    {id:'di4', agent:'righthand', time:'9:15 AM', ts:1710839700, text:'Queuing: Prompt Eng → template refresh (P3). Will dispatch after Coder finishes streaming UI.', reactions:[]},
    {id:'di5', agent:'ops',       time:'9:18 AM', ts:1710839880, text:'Queue depth: 3. No concurrency violations. Semaphore at 2/3.', reactions:[]},
  ],
  'code-output': [
    {id:'co1', agent:'coder', time:'8:20 AM', ts:1710835200, text:'Building cross-channel-backlinker. Architecture:\n```\nbacklinker/\n  ├── scan.sh       # channel scanner\n  ├── extract.sh    # backlink extractor\n  ├── index.sh      # vault indexer\n  └── monitor.sh    # change watcher\n```', reactions:[]},
    {id:'co2', agent:'coder', time:'8:35 AM', ts:1710836100, text:'`scan.sh` complete. Handles 8 channels, respects rate limits, exponential backoff on 429.', reactions:[{e:'✅',n:1,mine:true}]},
    {id:'co3', agent:'coder', time:'8:45 AM', ts:1710837900, text:'Integration test results:\n```\n✓ bridge    → 6 backlinks found\n✓ dev       → 2 backlinks found\n✓ research  → 4 backlinks found\n✓ edge case: deleted channel handled\n✓ edge case: empty channel OK\nAll 5 tests passed.\n```', reactions:[{e:'🎉',n:2,mine:false}]},
    {id:'co4', agent:'coder', time:'8:52 AM', ts:1710838320, text:'Deploy complete. Cron added: `*/10 * * * * backlinker/monitor.sh`', reactions:[{e:'🚀',n:1,mine:true}]},
    {id:'co5', agent:'vault', time:'8:55 AM', ts:1710838500, text:'Indexed. Backlinker now appears in vault as `vault/Code/cross-channel-backlinker.sh`. 3 cross-references added.', reactions:[], replyTo:'co4'},
  ],
  'agent-feed': [
    {id:'af1', agent:'righthand', time:'9:14 AM', ts:1710839640, text:'[FEED] Task completed: competitive analysis batch started'},
    {id:'af2', agent:'coder',     time:'8:52 AM', ts:1710838320, text:'[FEED] File deployed: cross-channel-backlinker.sh'},
    {id:'af3', agent:'devil',     time:'8:43 AM', ts:1710837780, text:'[FEED] Report filed: Red Team v5.1 — 3 criticals'},
    {id:'af4', agent:'vault',     time:'8:30 AM', ts:1710836400, text:'[FEED] Vault write: Future-Frontend-Vision.md'},
    {id:'af5', agent:'researcher',time:'8:15 AM', ts:1710835500, text:'[FEED] Insight: no competitor combines orchestration+knowledge+CLI+comms'},
    {id:'af6', agent:'ops',       time:'6:42 AM', ts:1710826920, text:'[FEED] Alert: session-watchdog failed 3/3 restart attempts'},
  ],
};

// ── DM MESSAGES ───────────────────────────────────────────────────────────────
const DM_MESSAGES = {
  righthand: [
    {id:'dm_rh1', agent:'righthand', time:'9:00 AM', text:'Good morning. I\'ve queued 5 tasks for today. Priority order: competitive analysis, backlinker, red team, vault indexing, prompt refresh.', reactions:[]},
    {id:'dm_rh2', agent:'user',      time:'9:01 AM', text:'Sounds good. Keep me posted on the competitive analysis.', reactions:[]},
    {id:'dm_rh3', agent:'righthand', time:'9:02 AM', text:'Will do. Researcher has 13 products in scope. Expect preliminary findings by noon.', reactions:[{e:'👍',n:1,mine:true}]},
  ],
  researcher: [
    {id:'dm_re1', agent:'researcher', time:'8:15 AM', text:'Found something interesting: LangSmith does observability-only intentionally. It\'s a feature. Makes me reconsider how we pitch the control surface.', reactions:[]},
    {id:'dm_re2', agent:'user',       time:'8:20 AM', text:'Interesting. How does it change the positioning?', reactions:[]},
    {id:'dm_re3', agent:'researcher', time:'8:21 AM', text:'Two buyer personas: (1) builders who want control = sell our whole stack, (2) enterprise risk-averse = lead with observability, gate control behind trust-building.', reactions:[{e:'💡',n:1,mine:true}]},
  ],
  coder: [
    {id:'dm_co1', agent:'coder', time:'8:52 AM', text:'Backlinker is live. Should I start on the streaming progress UI next, or is there something higher priority?', reactions:[]},
    {id:'dm_co2', agent:'user',  time:'8:55 AM', text:'Start on streaming UI. That\'s the next P1.', reactions:[]},
    {id:'dm_co3', agent:'coder', time:'8:56 AM', text:'On it. Will have a working prototype in ~2hrs.', reactions:[{e:'💻',n:1,mine:false}]},
  ],
};

// ── DISCORD CHANNEL CONFIG ─────────────────────────────────────────────────────
const DC_CHANNELS = {
  categories: [
    {
      id:'cat-active', name:'⚡ ACTIVE', channels: [
        {id:'agent-os-demo-launch', name:'🔥-agent-os-demo-launch', unread:2, type:'text', topic:'Agent OS demo — build, host, deploy.'},
        {id:'discord-server-v5',    name:'🏗️-discord-server-v5-1',   unread:0, type:'text', topic:'Discord architecture v5.1'},
        {id:'agent-os-frontend',    name:'🧠-agent-os-frontend',     unread:0, type:'text', topic:'Future Frontend Layer — native app to replace Discord.'},
        {id:'red-team-fixes',       name:'⚠️-red-team-fixes',        unread:1, type:'text', topic:'3 criticals from v5.1 red team'},
        {id:'wilson-premier',       name:'🏢-wilson-premier-revenue', unread:0, type:'text', topic:'Wilson Premier Agent Platform — THE revenue play.'},
        {id:'knowledge-graph',      name:'🧊-knowledge-graph',       unread:0, type:'text', topic:'Neo4j graph activation'},
      ]
    },
    {
      id:'cat-bridge', name:'🛎️ BRIDGE', channels: [
        {id:'concierge', name:'concierge',         unread:3, type:'text', topic:'Primary Trajan↔agent interface. Talk to Right Hand here.'},
        {id:'dispatch',  name:'📋-dispatch',        unread:0, type:'text', topic:'Issue agent commands here.'},
        {id:'daily-brief',name:'📢-daily-brief',    unread:1, type:'text', topic:'07:00 UTC daily digest.'},
      ]
    },
    {
      id:'cat-command', name:'🧠 COMMAND', channels: [
        {id:'desk',      name:'🗂️-desk',            unread:2, type:'forum', topic:'Task board. One thread per task.', count:14},
        {id:'decisions', name:'⚖️-decisions',        unread:0, type:'forum', topic:'Decision log. One thread per decision.', count:8},
        {id:'prompt-lab',name:'🧠-prompt-lab',       unread:0, type:'forum', topic:'Prompt engineering workshop.', count:5},
      ]
    },
    {
      id:'cat-signals', name:'📡 SIGNALS', channels: [
        {id:'links',        name:'🔗-links',           unread:0, type:'text', topic:'Drop links for analysis.'},
        {id:'ingestor-feed',name:'📡-ingestor-feed',    unread:4, type:'text', topic:'Hourly Reddit/GitHub/HN intel.'},
        {id:'vault-feed',   name:'📦-vault-feed',       unread:1, type:'text', topic:'Vault writes, knowledge updates.'},
      ]
    },
    {
      id:'cat-system', name:'🔧 SYSTEM', channels: [
        {id:'ops-log',    name:'⚙️-ops-log',          unread:0, type:'text', topic:'System operations, cron output, dispatch cycles.'},
        {id:'raw-logs',   name:'📜-raw-logs',          unread:0, type:'text', topic:'Cron runs, dispatch cycles, completion hooks.'},
        {id:'heartbeat',  name:'🫀-heartbeat',         unread:0, type:'text', topic:'System health at a glance.'},
        {id:'alerts',     name:'🚨-alerts',            unread:0, type:'text', topic:'Critical alerts only.'},
        {id:'security',   name:'🔒-security',          unread:0, type:'text', topic:'Security agent output.'},
        {id:'agent-status',name:'💬-agent-status',     unread:0, type:'voice'},
      ]
    },
    {
      id:'cat-projects', name:'🚀 PROJECTS', channels: [
        {id:'projects',  name:'🚀-projects',         unread:1, type:'forum', topic:'One thread per project.', count:6},
      ]
    },
    {
      id:'cat-agent-work', name:'🤖 AGENT WORK', channels: [
        {id:'agent-feed',    name:'🤖-agent-feed',     unread:3, type:'text', topic:'Dispatches, handoffs, general agent activity.'},
        {id:'research-feed', name:'🔬-research-feed',  unread:2, type:'text', topic:'Researcher output.'},
        {id:'code-output',   name:'💻-code-output',    unread:0, type:'text', topic:'Builds, commits, code results.'},
        {id:'devils-corner', name:'😈-devils-corner',  unread:1, type:'text', topic:'Debate outputs, critiques, red-teaming.'},
      ]
    },
  ],
  // Flat list for backward compat
  text: [
    {id:'concierge',    name:'concierge',         unread:3, topic:'Primary Trajan↔agent interface.'},
    {id:'dispatch',     name:'📋-dispatch',        unread:0, topic:'Issue agent commands here.'},
    {id:'research-feed',name:'🔬-research-feed',  unread:2, topic:'Researcher output.'},
    {id:'devils-corner',name:'😈-devils-corner',  unread:1, topic:'Debate outputs, critiques.'},
    {id:'ops-log',      name:'⚙️-ops-log',        unread:0, topic:'System operations and health.'},
    {id:'code-output',  name:'💻-code-output',    unread:0, topic:'Builds, commits, code results.'},
    {id:'agent-feed',   name:'🤖-agent-feed',     unread:3, topic:'Dispatches, handoffs, general agent activity.'},
  ],
  voice: [
    {id:'agent-status', name:'💬-agent-status', users:['🤝','🔬'], limit:null},
  ],
  forums: [
    {id:'desk',      name:'🗂️-desk',       icon:'📋', count:14},
    {id:'decisions', name:'⚖️-decisions',   icon:'⚖️', count:8},
    {id:'projects',  name:'🚀-projects',    icon:'🚀', count:6},
    {id:'prompt-lab',name:'🧠-prompt-lab',  icon:'🧠', count:5},
  ],
};

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
  {id:0,  label:'Agent OS Core',          type:'architecture', hex:'#f9e2af', size:20},
  {id:1,  label:'Cockpit Vision',         type:'vision',       hex:'#89b4fa', size:16, glow:true},
  {id:2,  label:'Competitive Analysis',   type:'research',     hex:'#89b4fa', size:14},
  {id:3,  label:'Multi-Agent Routing',    type:'architecture', hex:'#f9e2af', size:18, glow:true},
  {id:4,  label:'Knowledge Graph',        type:'architecture', hex:'#cba6f7', size:15},
  {id:5,  label:'Dispatch Engine',        type:'architecture', hex:'#f9e2af', size:17},
  {id:6,  label:'Vault System',           type:'architecture', hex:'#cba6f7', size:16, glow:true},
  {id:7,  label:'Red Team Report',        type:'research',     hex:'#f38ba8', size:12},
  {id:8,  label:'Rate Limiting',          type:'architecture', hex:'#f38ba8', size:13},
  {id:9,  label:'Reminder Engine',        type:'project',      hex:'#a6e3a1', size:11},
  {id:10, label:'Discord Integration',    type:'architecture', hex:'#fab387', size:14},
  {id:11, label:'Session Watchdog',       type:'operations',   hex:'#fab387', size:12},
  {id:12, label:'Token Budget',           type:'operations',   hex:'#fab387', size:13},
  {id:13, label:'Frontend Vision',        type:'vision',       hex:'#89b4fa', size:14},
  {id:14, label:'UX Spec v2',             type:'research',     hex:'#89b4fa', size:15},
  {id:15, label:'Prompt Templates',       type:'research',     hex:'#f5c2e7', size:12},
  {id:16, label:'Backlinker',             type:'operations',   hex:'#fab387', size:12},
  {id:17, label:'Streaming UI',           type:'project',      hex:'#a6e3a1', size:11},
  {id:18, label:'Market Positioning',     type:'vision',       hex:'#89b4fa', size:13},
  {id:19, label:'Cron Scheduler',         type:'operations',   hex:'#fab387', size:12},
  {id:20, label:'Memory Compactor',       type:'operations',   hex:'#cba6f7', size:12},
  {id:21, label:'Security Audit',         type:'research',     hex:'#94e2d5', size:11},
  {id:22, label:'Agent Gallery',          type:'vision',       hex:'#89b4fa', size:12},
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
