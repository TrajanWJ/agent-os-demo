# QA Round 2 — 2026-03-20

## Working ✅
- **Stream**: Renders with real data, live agent status, Discord mirror items
- **Inbox**: Shows "All caught up!" empty state correctly
- **Proposals**: Real proposals from dispatch queue, approve/reject buttons work
- **Briefing**: Loads real system health data, service status
- **Talk**: Discord channels mirrored with real messages, channel list, active sessions
- **Rooms**: Multi-agent conversation rooms render correctly
- **Tasks**: Task list with filters/sort, detail panel with timeline _(was broken, fixed)_
- **Projects**: Project cards with real data, status tracking
- **Plans**: Kanban boards with real plan data _(title was "Missions", fixed)_
- **Missions**: Hill chart with real mission data
- **Pipelines**: Task/Proposal/Mission/Capacity pipeline views _(was broken, fixed)_
- **Mind**: Search, Browse (vault tree), Graph, Reader, Insights tabs all work
- **Roles**: Agent configuration with real agent data, capabilities, autonomy
- **Records**: Table view with tabs (Agents, Tasks, Proposals, Missions, Notes)
- **System**: CPU, Memory, Disk, Uptime with real metrics _(was showing NaN, fixed)_

## Bugs Found & Fixed

### 1. `priority` type mismatch — CRITICAL (broke Tasks + Pipelines pages)
**Root cause**: API returns `priority` as number (3, 4) for some tasks but code assumed string ("P3", "P2"). Calling `.toUpperCase()` or `.toLowerCase()` on a number crashes.
**Files fixed**:
- `tasks.js` — `getTaskPriority()`: added numeric priority mapping (0→P0, 1→P1, etc.) with `String()` guard
- `app2.js` — 3 occurrences of `(priority).toLowerCase()` wrapped with `String()`
- `app3.js` — context panel priority display wrapped with `String()`
- `app4.js` — 2 occurrences in pipeline card rendering wrapped with `String()`
- `bridge.js` — inbox priority mapping wrapped with `String()`

### 2. System dashboard NaN% — MAJOR (System page showed garbage data)
**Root cause**: Bridge `/api/system/overview` returns structured objects (`memory: {total, used, available}`, `disk: {total, used, percent}`, `uptime: "2 days, 12 hours"`) but code called `Math.round()` on the objects directly.
**Fix in `app2.js`**:
- Parse `memory` object → calculate percentage from `used/total`
- Parse `disk.percent` string ("88%") → extract number
- Parse uptime string → convert to seconds
- Pass real totals to display (e.g., "50G / 58G" instead of "176 / 200 GB")
- Also extract `load.avg1/5/15` for CPU load average display

### 3. Plans page title showed "Missions" — MINOR
**Fix**: Changed `PAGE_TITLES.plans` from `'Missions'` to `'Plans'` in `app.js`

### 4. Pipeline cards showed "Untitled" for many tasks — MODERATE
**Root cause**: Some tasks have `description` field but no `title` or `task` field.
**Fix**: Added `t.description` as fallback in title chain: `t.title || t.task || t.description || 'Untitled'` in `app4.js`

### 5. `/api/system/logs` 403 spam — MODERATE (console flooded with errors)
**Root cause**: System logs API returns 403 (not authorized for raw log access) but code retried every poll cycle.
**Fix**: Added `_sysLogsApiFailed` backoff flag in `app2.js` — after first 403, falls back to stream events permanently and stops spamming.

## Syntax Check ✅
All 17 JS files pass `node --check`: app.js, app2.js, app3.js, app4.js, app5.js, app6.js, bridge.js, data.js, help.js, live.js, local-server.js, mind.js, projects.js, records.js, tasks.js, timeline.js, ux.js

## Known Server-Side Issues (not fixed — bridge-side)
- `/api/missions/feed` returns 404 intermittently
- `/api/health` returns 401 without auth (may need bridge endpoint)
- WebSocket connection refused (WS endpoint not running on bridge)
- Some channel message loads return 500 (channel ID mapping issue in bridge)
