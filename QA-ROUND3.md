# QA Round 3 — Full Sweep Report

**Date:** 2026-03-20
**Scope:** All pages, all JS files, style consistency, navigation

---

## Syntax Check — All Files ✅

All 21 JS files pass `node --check`:
- app.js, app2.js, app3.js, app4.js, app5.js, app6.js
- bridge.js, data.js, explore.js, help.js, live.js, local-server.js
- mind.js, notifications.js, projects.js, records.js, system.js
- tasks.js, timeline.js, ux.js, workbench.js

---

## Bugs Found & Fixed

### 1. Missing Functions (5 functions called from HTML, never defined)

| Function | Called From | Fix |
|---|---|---|
| `addBoardCard()` | index.html line 586 | Added stub in app.js (legacy board) |
| `closeModal()` | app.js, app2.js (modal close buttons) | Added to app.js — hides `#card-modal` |
| `closeModalIfOutside(event)` | index.html line 1090 | Added to app.js — delegates to `closeModal()` |
| `setTheme(theme)` | index.html lines 635-643 | Added to app.js — sets `data-theme` attribute, saves to localStorage |
| `toggleLevelFilter(level, btn)` | index.html lines 597-600 | Added to app.js — filters stream log lines by level |

### 2. Missing Talk Page Functions (2 functions)

| Function | Called From | Fix |
|---|---|---|
| `expandChannelTopic()` | index.html line 367 | Added to app.js — toggles topic expansion |
| `toggleChannelInfo()` | index.html lines 370, 381 | Added to app.js — toggles channel info panel |

### 3. Missing `workbench` in PAGE_TITLES

`workbench.js` sets `PAGE_TITLES.workbench` but the initial `PAGE_TITLES` object in app.js didn't include it. This meant hash-based routing to `#workbench` could fail. **Fixed:** added `workbench: 'Workbench'` to the initial object.

### 4. Incorrect PAGE_TITLES for Schedule

`schedule` page title was set to `'Briefing'` — should be `'Schedule'`. **Fixed.**

### 5. Duplicate Keyboard Shortcut Handler

`app3.js` had a `keydown` handler mapping `1-5` to pages (`{1:'feed', 2:'talk', 3:'queue', ...}`) that conflicted with `ux.js`'s global handler (`{1:'feed', 2:'inbox', 3:'talk', ...}`). The app3.js version had stale mappings (missing inbox) and no page-specific guards. **Fixed:** removed the duplicate handler from app3.js, keeping ux.js as the single source of truth.

### 6. No Hash-Based Routing (URL didn't update on page switch)

**Problem:** navigating between pages didn't update the URL hash, so browser back/forward and deep linking didn't work.

**Fix:** Added to app.js:
- Nav wrapper that calls `history.replaceState` with `#page` on every navigation
- `hashchange` listener for browser back/forward
- On-load hash detection to navigate to `#page` if present
- `_suppressHashWrite` flag to prevent infinite loops when handling hashchange

### 7. Toast z-index Too Low

Toast container was `z-index: 2000` but modals use `z-index: 9999`, so toasts were hidden behind modals. **Fixed:** set toast container to `z-index: 100000`.

---

## Style Consistency Fixes

### 8. CSS `--radius` Variable Updated

Default `--radius` was `8px`. Per spec, cards should use `border-radius: 12px`. **Fixed:** changed `--radius` to `12px`. This cascades to ~50+ elements using `var(--radius)`.

### 9. Status Dot Size Consistency

All status dots should be 8px. Found inconsistencies:
- `.dash-agent-dot`: was 6px → **fixed to 8px**
- `.conn-dot`: was 7px → **fixed to 8px**
- `.capacity-card`: was `border-radius: 8px` → **fixed to 12px**

All other status dots (`.status-dot`, `.sys-svc-dot`, `.sys-agent-dot`, `.plan-step-status-dot`, `.drawer-status-dot`, `.ctx-status-dot`, `.health-status-dot`, `.agent-dot-active`) were already 8px ✅.

---

## Navigation Audit ✅

### Sidebar Nav Items — All Working

Every page has either:
- Direct init call in `nav()` function, OR
- Nav override wrapper in its respective JS file (app4.js for records/pipelines/roles, app6.js for queue/pulse), OR
- Polling-based page detection (app5.js for inbox/rooms/briefing)

### Page Init Chain

| Page | Init Mechanism | Status |
|---|---|---|
| feed | `renderFeed()` in DOMContentLoaded | ✅ |
| queue | `renderQueue()` in nav + bridge live proposals | ✅ |
| talk | `renderChannelList()` in nav | ✅ |
| tasks | `initTasksPage()` in nav (guarded) | ✅ |
| mind | `initMind()` in nav | ✅ |
| pulse | `renderPulse()` in nav + workflow viz in app6.js | ✅ |
| projects | `initProjectsPage()` in nav (guarded) | ✅ |
| missions | `renderMissions()` in nav | ✅ |
| plans | `renderPlansPage()` in nav (guarded) | ✅ |
| records | `renderRecords()` via app4.js nav wrapper | ✅ |
| pipelines | `renderPipelines()` via app4.js nav wrapper | ✅ |
| roles | `renderRoles()` via app4.js nav wrapper | ✅ |
| schedule | `renderSchedule()` in nav | ✅ |
| inbox | `initInbox()` via app5.js polling (200ms) | ✅ |
| rooms | `initRooms()` via nav + app5.js polling | ✅ |
| briefing | `initBriefing()` via app5.js polling | ✅ |
| workbench | `initWorkbench()` in nav (guarded) | ✅ |
| explore | `renderExplore()` in nav | ✅ |

### Hash Routing — Now Working ✅
### Mobile Menu — Working ✅ (`toggleMobileMenu()` in app3.js)

---

## Nav Override Chain (for reference)

The nav function is wrapped by multiple files in load order:

```
app.js nav() [original]
  → app.js _origNavHash [hash routing]
    → app4.js _origNav4 [records, pipelines, roles]
      → app6.js _origNav6 [task tracker, workflow viz]
        → tasks.js [tasks page init]
          → projects.js [projects page init]
            → bridge.js [bridge live data]
              → explore.js [explore page cleanup]
                → help.js [help tooltip cleanup]
```

---

## Remaining Notes (Not Bugs)

1. **`initRecords` called but undefined:** Guarded with `typeof`, no error. Records renders via `renderRecords()` in app4.js nav wrapper instead.

2. **app5.js uses 200ms polling for page detection** instead of nav wrapper. Works but less efficient. Not a bug.

3. **`approveAndTrack` defined in both app.js and app6.js:** app6.js version (async, enhanced) loads later and correctly overrides the simpler app.js version.

4. **Multiple z-index layers in use:** Modals 9999, toast 100000, briefing overlay 2000, plan chat 900-901. Stacking order is correct after toast fix.

5. **Theme persistence:** `setTheme()` now saves to localStorage and restores on load.

---

## Files Modified

| File | Changes |
|---|---|
| `app.js` | Added 5 missing functions, hash routing, theme restore, `workbench` to PAGE_TITLES, fixed `schedule` title, added `expandChannelTopic` and `toggleChannelInfo` |
| `app3.js` | Removed duplicate keyboard shortcut handler (1 line replaced with comment) |
| `styles.css` | `--radius` 8px→12px, toast z-index 2000→100000, `.dash-agent-dot` 6→8px, `.conn-dot` 7→8px, `.capacity-card` border-radius 8→12px |

**No files deleted. No bridge/services restarted. No git operations.**
