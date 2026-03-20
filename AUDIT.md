# Agent OS Frontend Audit — 2026-03-20

## Critical (Crash/Break)

1. **[app2.js:37-103] Legacy Mind page references ~15 non-existent HTML IDs.** `initMindLegacy()` / `setMindMode()` / `renderVaultCards()` reference `mind-filter-pills`, `mind-sort`, `mind-search`, `mind-graph`, `mind-cards`, `mind-timeline`, `mind-filters`, `vault-cards-grid`, `mind-note-count`, `mind-note-detail`, `graph-canvas`, `graph-detail`, `graph-tooltip`, `graph-lock-btn`. None of these exist in `index.html` — the HTML was rewritten for `mind.js` (tab-based panels like `mind-panel-search`, `mind-panel-graph`, etc.) but `app2.js` still has 500+ lines of dead legacy Mind code targeting the old DOM. If any code path calls `setMindMode()` or `initMindLegacy()`, it will fail silently (all `$()` calls return null). The old `initGraph()` in app2.js would crash if invoked because `$('graph-canvas')` is null — the real canvas is `mind-graph-canvas`.

2. **[app2.js:414] `$('graph-detail')` → null.** The old graph detail panel ID `graph-detail` doesn't exist in `index.html`. The actual ID is `mind-graph-detail`. Any click on the old graph code path → `Cannot read properties of null`.

3. **[app2.js:440] `$('vault-cards-grid')` → null.** `renderVaultCards()` writes to an element that doesn't exist. Called from `setMindMode('cards')` — dead path, but still a crash if reached.

4. **[app2.js:484] `$('mind-note-detail')` → null.** `openVaultNote()` on mobile tries to render into a non-existent element. The new Mind page uses `mind-panel-reader` / `mind-reader-content` instead.

5. **[app.js:1569] `currentChannel = 'bridge'` — no such channel in live data.** On startup, `currentChannel` is hardcoded to `'bridge'`. But `DC_CHANNELS.categories` has no channel with ID `'bridge'` — the closest is `'concierge'`. When Bridge goes live and replaces `DC_CHANNELS`, the fallback `'bridge'` will match nothing. Bridge.js line ~786 tries to detect this (`!/^\d+$/.test(currentChannel)`) and auto-switch, but only when navigating to Talk — on first load if you're already on Talk, you get no messages and `#bridge` in the header.

6. **[help.js:344-345] `nav` overwrite creates a bare global, not `window.nav`.** `const _origNavHelp = nav; nav = function(page) { ... }` — this captures `nav` at file parse time (after app6.js loads, which already wrapped `window.nav`). But `help.js` writes to the local `nav` variable, NOT `window.nav`. Since it's top-level and `'use strict'`, this actually works in browsers (top-level declarations go on window) — but the pattern is fragile and different from the other wrappers that explicitly use `window.nav =`.

7. **[tasks.js:623-636] `_origNav` captured but never used.** Line 623: `const _origNav = nav;` captures the current nav, then lines 625-636 do a separate IIFE that captures `window.nav` into `origNav` and wraps it. The top-level `_origNav` is dead code and the naming collision with the IIFE's `origNav` is confusing.

## Major (Feature Broken)

1. **[Multiple files] 5-layer `nav()` wrapping chain — fragile, order-dependent.** `nav()` is wrapped by: app6.js → tasks.js → bridge.js → help.js (load order). Each captures the previous version. If any file loads out of order or fails to parse, the entire chain breaks. No defensive checking — if `_origNav6` is somehow undefined, `_origNav6(page)` will throw.

2. **[app.js vs bridge.js] `sendMessage()` wrapped conditionally, but `_origSendMessage` is captured at parse time.** bridge.js line 471: `const _origSendMessage = typeof sendMessage === 'function' ? sendMessage : null;` — this is captured but never actually used. The actual wrapping on line 473 captures `window.sendMessage` into `_realSendMessage`. The unused `_origSendMessage` is dead code.

3. **[app6.js:296-303] `makeStreamItem` monkey-patch may fail.** `_origMakeStreamItem` captures `makeStreamItem` at parse time. But `makeStreamItem` is defined in `app.js` which loads before `app6.js`, so this should work. However, the patched version replaces `window.makeStreamItem` — if any code caches a reference to `makeStreamItem` before `app6.js` loads, it will use the unpatched version and Discord mirror items won't render correctly.

4. **[app5.js:248-265] Inbox poller runs even when not on inbox page** — the check `if (currentPage !== 'inbox') return;` prevents rendering but still fires `fetchRealInboxItems()` every 15s regardless. This creates unnecessary API calls.

5. **[app6.js:210-215] Task tracker polls `/api/tasks/*` every 10s unconditionally** after first visit to queue page. `startTaskTracker()` is called on DOMContentLoaded (line 416) AND when navigating to queue. The DOMContentLoaded call means it starts immediately on page load, hitting 4 endpoints (`/api/tasks/active`, `/api/tasks/queue`, `/api/tasks/done`, `/api/tasks/failed`) every 10 seconds forever, even when viewing Feed or Mind.

6. **[app6.js:292, bridge.js:637, app.js:369, tasks.js:611, app5.js:1213-1223, app3.js:1787, app4.js:384] Polling storm — at least 12 concurrent intervals.** Combined, these pollers can generate 20+ API requests every 10 seconds: stream poll (5s), task tracker (10s), discord mirror (30s), proposal refresh (30s), inbox poll (15s), missions refresh (15s), pipelines refresh (15s), workflow viz (15s), badge poll (30s), plus 6 simulation timers. No coordination, no debouncing, no pause when tab is hidden.

7. **[app2.js + mind.js] Duplicate graph implementations.** `app2.js` has a complete force-directed graph (lines 107-430) with `initGraph()`, `runGraphSim()`, `drawGraph()`, and all interaction handlers. `mind.js` has a completely separate graph implementation (lines 256-490) with `initMindGraph()`, `runMindGraphSim()`, `drawMindGraph()`. Both use different state variables (`graphNodes` vs `mindGraphNodes`, `graphCanvas` vs `mindGraphCanvas`). The `mind.js` version is the active one (connected to actual DOM), the `app2.js` version is entirely dead code.

8. **[app3.js:626-790] Simulation engine creates fake data even when Bridge is live.** `startSimulation()` runs on DOMContentLoaded and continuously generates fake chat messages, feed events, agent status changes, and queue items every 8-35 seconds. When Bridge provides real data, these simulated events get mixed in — fake messages appear in real Discord channels, fake status changes override real agent states.

9. **[bridge.js:473-479] `sendMessage` wrapper has a conditional that can't be false at wrap time.** The `if (typeof window !== 'undefined' && typeof window.sendMessage === 'function')` guard is evaluated at script parse time. Since `app.js` loads before `bridge.js`, `window.sendMessage` always exists. But the wrapping only activates when `Bridge.liveMode` is true — the `_realSendMessage` call in the else branch will execute the original `sendMessage` which appends to `DC_MESSAGES` (mock data). If Bridge.liveMode is true but the channel ID hasn't been resolved to a numeric Discord ID, the message falls through to mock data instead of throwing an error.

10. **[data.js] `DC_MESSAGES` uses channel key `'bridge'` but `DC_CHANNELS` has no channel with ID `'bridge'`.** The categories list uses IDs like `'concierge'`, `'dispatch'`, `'research-feed'` etc. But `DC_MESSAGES` has a key `'bridge'` with 6 messages. The Talk view defaults to `currentChannel = 'bridge'` but this phantom channel doesn't appear in the channel list. Users see messages in `#bridge` but can't find it in the sidebar.

## Minor (Polish/UX)

1. **[app.js:2665] `renderDashboard()` fetches 3 API endpoints** (`/api/system/overview`, `/api/feed`, `/api/proposals`) every time the feed page is shown, even if data was fetched seconds ago. No caching or staleness check.

2. **[app.js:398] `renderStreamItems()` does full DOM rebuild on every call** — `list.innerHTML = ''` then re-creates all elements. With 50+ stream items, this causes visible flicker. Should diff or use `DocumentFragment`.

3. **[mind.js:111] `doMindSearch()` uses raw string interpolation in fetch URL.** `q=${encodeURIComponent(q)}` is fine, but the bridge URL construction `${bridgeUrl}/api/vault/search` could produce `//api/...` if `bridgeUrl` is empty string (which it defaults to when same-origin).

4. **[app2.js:631-830] Pulse/System page uses entirely seed data** — `renderPulse()` references `CRONS`, `HOOKS`, `COST_DATA` directly. No Bridge integration for system metrics. Cost chart values are hardcoded.

5. **[app3.js:296-380] Config page uses `Math.random()` for slider values.** Agent autonomy, verbosity, creativity are all `Math.floor(Math.random() * 5) + N`. These re-randomize every time the config page is rendered.

6. **[app5.js:67-180] Inbox seed data has hardcoded relative timestamps** like `Date.now() - 25 * 60000`. These will always show "25m ago" relative to page load, which is correct — but the seed data content references "March 20, 2026" which will be wrong on other dates.

7. **[mind.js:170-180] `timeAgo()` function defined in mind.js conflicts with `timeAgo()` in app.js:1009.** Both are global functions — the mind.js version (loaded after app.js) silently overwrites the app.js version. They have slightly different implementations (mind.js doesn't handle negative diff).

8. **[Multiple] `escHtml()` called in mind.js but defined... also in mind.js.** This is fine, but `formatSize()` is also called in mind.js (line 286) — need to verify it's defined.

## Dead Code / Conflicts

1. **[app2.js:1-540] ~540 lines of dead legacy Mind code.** `initMindLegacy()`, `renderMindFilterPills()`, `setMindFilter()`, `applyMindSort()`, `getFilteredNotes()`, `setMindMode()`, the entire old `initGraph()`/`runGraphSim()`/`drawGraph()` suite, `renderVaultCards()`, `updateNoteCount()`, `openVaultNote()`, `renderNoteDetailContent()`, `closeMobileNoteDetail()`, `closeModal()`. All reference HTML IDs that no longer exist. The new `mind.js` replaces all of this functionality.

2. **[app2.js] `mindMode`, `mindFilter`, `mindSortBy` state variables** — shadows nothing but unused since `mind.js` has its own `mindTab`, `mindBrowseSort`, etc.

3. **[bridge.js:471] `_origSendMessage`** — captured but never used.

4. **[bridge.js:779] `_origNavBridge`** — captured but never used (the actual wrapping uses `_realNavBridge`).

5. **[tasks.js:623] `const _origNav = nav`** — captured at top level but the actual wrapping happens inside the IIFE on line 628.

6. **[app2.js:630] `renderTimeline()` function** referenced in `setMindMode()` and `setMindFilter()` but **never defined** anywhere. If `setMindMode('timeline')` were ever called, it would crash with `renderTimeline is not defined`.

7. **[app4.js:1045-1050] `_origNav4` wraps but doesn't assign to `window.nav`.** Lines do `const _origNav4 = nav; ... _origNav4(page);` but never actually creates a new `nav` — this code appears to be an incomplete wrapper that was never finished. The surrounding code just calls `_origNav4(page)` directly in some launch-related function, not as a nav wrapper.

8. **[data.js:全体] All seed data (`AGENTS`, `FEED_EVENTS`, `QUEUE_QUESTIONS`, `DC_MESSAGES`, `VAULT_NOTES`, `STREAM_EVENTS`, `BOARD_CARDS`, etc.)** is loaded unconditionally and persists in memory even when Bridge provides live data. The Bridge layer mutates these arrays in-place (e.g., `DC_CHANNELS.categories = ...`) but never clears old entries from `FEED_EVENTS` or `STREAM_EVENTS`.

9. **[app.js:1524] `generateQueueCard()`** generates fake queue items on a 30s interval (via simulation). These appear mixed with real proposals when Bridge is live.

10. **[app2.js:948-1040] `renderStream()` / `addStreamEvent()` / `filterStream()`** — this is the old raw log stream (view-stream). The HTML still has `view-stream` but there's no nav link to it. The function is only reachable via `nav('stream')` which is redirected to `'feed'` on line 33 of app.js. 100% dead code path.

11. **[app2.js:832-947] `renderBoard()`** — the kanban board. `nav('board')` redirects to `'feed'`. Dead code, unreachable.

12. **[app3.js:1-295] Command page** — `nav('command')` redirects to `'feed'`. The `view-command` HTML exists but is unreachable. ~295 lines of dead code.

13. **[app3.js:296-380] Config page** — `nav('config')` redirects to `'feed'`. Dead code.

## Recommended Fix Priority

1. **Kill the simulation engine when Bridge is live** — This is the #1 user-facing bug. When connected to real Discord data, fake messages, fake agent status changes, and fake queue items contaminate the real data. Fix: add a `if (Bridge.liveMode) return;` guard to every simulation interval callback, or call `clearInterval` on all `simTimers` when `bridgeGoLive()` runs.

2. **Delete legacy Mind code from app2.js (lines 1-540)** — 540 lines of dead code referencing non-existent DOM elements. It won't crash today (because `$()` returns null and functions guard with `if (!container) return`), but it's a maintenance trap. The entire Mind page is now in `mind.js`.

3. **Consolidate the `nav()` wrapping chain into a single event-driven system** — 5 files wrapping `nav()` in sequence is extremely fragile. Replace with an `EventBus.on('nav', ...)` pattern where each module registers its own handler. This also eliminates the risk of wrap-order bugs.

4. **Add `document.hidden` / `visibilitychange` guards to all pollers** — 12+ concurrent intervals generating 20+ API requests per 10 seconds, even when the tab is hidden. Add a global pause mechanism that stops all polling when the tab isn't visible.

5. **Fix the `currentChannel = 'bridge'` phantom channel** — Either add a `'bridge'` channel to `DC_CHANNELS`, or change the default to `'concierge'` which actually exists in the data. Also fix `DC_MESSAGES` to use consistent channel IDs.

6. **Stop task tracker from polling on DOMContentLoaded** — `startTaskTracker()` on line 416 of app6.js shouldn't fire until the user actually visits the queue or tasks page. Currently it fires 2 seconds after page load and never stops.

7. **Delete remaining dead code** — Command page (~295 lines), Config page (~85 lines), Board page (~115 lines), old Stream page (~90 lines). That's ~600 more lines of unreachable code on top of the 540 from the Mind page. ~1140 lines total dead code across app2.js and app3.js.

8. **Fix `timeAgo()` collision** — mind.js silently overwrites the version in app.js. Either namespace them or ensure one canonical implementation.
