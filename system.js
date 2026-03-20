/* Agent OS v5 — system.js — Real System Dashboard
   Wires Pulse page to real bridge API endpoints:
   /api/system/overview, /api/system/services, /api/system/logs,
   /api/system/crons, /api/system/processes
*/
'use strict';

// ═══════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════

let _sysLoadHistory = [];         // last 5 CPU load readings
let _sysSelectedLogService = null; // service for live log viewer
let _sysLogFilter = '';            // search within logs
let _sysLogAutoRefresh = null;     // timer for log auto-refresh
let _sysOverviewTimer = null;      // 15s overview refresh
let _sysProcessTimer = null;       // 30s process refresh
let _sysLogLines = [];             // cached log lines
let _sysProcesses = [];            // cached processes

// ═══════════════════════════════════════════════════════════
// CRON EXPRESSION PARSER
// ═══════════════════════════════════════════════════════════

function _parseCronToHuman(expr) {
  if (!expr) return expr;
  const p = expr.trim().split(/\s+/);
  if (p.length < 5) return expr;
  const [min, hr, dom, mon, dow] = p;

  // */N patterns
  if (min.startsWith('*/') && hr === '*' && dom === '*' && mon === '*' && dow === '*') {
    const n = parseInt(min.slice(2));
    if (n === 1) return 'Every minute';
    return `Every ${n} minutes`;
  }
  // Specific minute, every hour
  if (/^\d+$/.test(min) && hr === '*' && dom === '*') {
    return `Every hour at :${min.padStart(2, '0')}`;
  }
  // Specific time daily
  if (/^\d+$/.test(min) && /^\d+$/.test(hr) && dom === '*' && mon === '*' && dow === '*') {
    return `Daily at ${hr.padStart(2, '0')}:${min.padStart(2, '0')}`;
  }
  // */N hours
  if (min === '0' && hr.startsWith('*/')) {
    const n = parseInt(hr.slice(2));
    return `Every ${n} hours`;
  }
  return expr;
}

function _cronTypeColor(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('nudge') || n.includes('heartbeat') || n.includes('watchdog')) return '#89b4fa'; // blue
  if (n.includes('sync') || n.includes('vault') || n.includes('backlink')) return '#a6e3a1'; // green
  if (n.includes('clean') || n.includes('compact') || n.includes('reset') || n.includes('prune')) return '#fab387'; // orange
  if (n.includes('digest') || n.includes('report')) return '#cba6f7'; // purple
  return '#6c7086'; // neutral
}

// ═══════════════════════════════════════════════════════════
// OVERVIEW — replaces _renderDashboardHeader with real data
// ═══════════════════════════════════════════════════════════

async function _sysLoadOverview() {
  const el = $('sys-dashboard-header');
  if (!el) return;

  let data = null;
  try {
    if (typeof Bridge !== 'undefined' && Bridge.liveMode) {
      data = await Bridge.getSystemOverview();
    }
  } catch (e) {
    console.warn('[System] Overview fetch failed:', e.message);
  }

  if (!data) {
    // Fallback: keep existing rendering from app2.js
    if (typeof _renderDashboardHeader === 'function') _renderDashboardHeader();
    return;
  }

  // Parse uptime
  let uptimeSec = 0;
  if (typeof data.uptime === 'string') {
    const d = data.uptime.match(/(\d+)\s*day/);
    const h = data.uptime.match(/(\d+)\s*hour/);
    const m = data.uptime.match(/(\d+)\s*min/);
    uptimeSec = ((d ? +d[1] : 0) * 86400) + ((h ? +h[1] : 0) * 3600) + ((m ? +m[1] : 0) * 60);
  } else if (typeof data.uptime === 'number') {
    uptimeSec = data.uptime;
  }

  // Parse CPU
  let cpuPct = 0;
  if (data.load) {
    cpuPct = Math.min(100, Math.round((data.load.avg1 || data.load['1m'] || 0) / 6 * 100));
    _sysLoadHistory.push(cpuPct);
    if (_sysLoadHistory.length > 5) _sysLoadHistory = _sysLoadHistory.slice(-5);
  } else if (data.cpu !== undefined) {
    cpuPct = Math.round(data.cpu);
    _sysLoadHistory.push(cpuPct);
    if (_sysLoadHistory.length > 5) _sysLoadHistory = _sysLoadHistory.slice(-5);
  }

  // Parse memory
  let memPct = 0, memUsed = '', memTotal = '';
  if (data.memory && typeof data.memory === 'object') {
    memPct = data.memory.percent || Math.round((data.memory.used / data.memory.total) * 100) || 0;
    memUsed = data.memory.used >= 1024 ? (data.memory.used / 1024).toFixed(1) + ' GB' : data.memory.used + ' MB';
    memTotal = data.memory.total >= 1024 ? (data.memory.total / 1024).toFixed(0) + ' GB' : data.memory.total + ' MB';
  }

  // Parse disk
  let diskPct = 0, diskUsed = '', diskTotal = '', diskAvail = '';
  if (data.disk && typeof data.disk === 'object') {
    diskPct = parseInt(String(data.disk.percent || '0').replace('%', ''), 10);
    diskUsed = data.disk.used || '';
    diskTotal = data.disk.total || '';
    diskAvail = data.disk.available || data.disk.avail || '';
  }

  // Load avg labels
  const loadAvg = data.load || {};
  const avgStr = `${(loadAvg.avg1 || loadAvg['1m'] || 0).toFixed(2)} / ${(loadAvg.avg5 || loadAvg['5m'] || 0).toFixed(2)} / ${(loadAvg.avg15 || loadAvg['15m'] || 0).toFixed(2)}`;

  // Service count from overview
  let svcRunning = 0, svcTotal = 0;
  if (Array.isArray(data.services)) {
    svcTotal = data.services.length;
    svcRunning = data.services.filter(s => s.status === 'active' || s.status === 'running').length;
  }

  // Disk danger
  const diskDanger = diskPct > 85;
  const diskWarn = diskPct > 75;

  // CPU bar chart (last 5 readings)
  const cpuBarHtml = _sysLoadHistory.map((v, i) => {
    const opacity = 0.4 + (i / Math.max(_sysLoadHistory.length - 1, 1)) * 0.6;
    const color = v > 80 ? '#f38ba8' : v > 60 ? '#fab387' : '#cba6f7';
    return `<div class="sys-cpu-bar" style="height:${Math.max(v, 3)}%;background:${color};opacity:${opacity.toFixed(2)}"></div>`;
  }).join('');

  // Memory progress bar
  const memColor = memPct > 85 ? '#f38ba8' : memPct > 70 ? '#fab387' : '#89b4fa';

  // Disk progress bar
  const diskColor = diskDanger ? '#f38ba8' : diskWarn ? '#fab387' : '#a6e3a1';

  el.innerHTML = `
    <div class="sys-stat-card">
      <div class="sys-card-top">
        <span class="sys-card-label">Uptime</span>
        <span class="sys-card-trend" style="color:var(--green)">●</span>
      </div>
      <div class="sys-card-value">${_fmtUptime(uptimeSec)}</div>
      <div class="sys-card-sub">since last restart</div>
      <div class="sys-card-spark" style="font-size:11px;color:var(--green)">✓ healthy</div>
    </div>
    <div class="sys-stat-card">
      <div class="sys-card-top">
        <span class="sys-card-label">CPU Load</span>
        <span class="sys-card-trend">${cpuPct}%</span>
      </div>
      <div class="sys-cpu-chart">${cpuBarHtml}</div>
      <div class="sys-card-sub">${avgStr}</div>
    </div>
    <div class="sys-stat-card">
      <div class="sys-card-top">
        <span class="sys-card-label">Memory</span>
        <span class="sys-card-trend">${memPct}%</span>
      </div>
      <div class="sys-progress-bar"><div class="sys-progress-fill" style="width:${memPct}%;background:${memColor}"></div></div>
      <div class="sys-card-sub">${memUsed} / ${memTotal}</div>
    </div>
    <div class="sys-stat-card ${diskDanger ? 'sys-card-danger' : diskWarn ? 'sys-card-warn' : ''}">
      <div class="sys-card-top">
        <span class="sys-card-label">Disk</span>
        <span class="sys-card-trend">${diskDanger ? '⚠' : ''} ${diskPct}%</span>
      </div>
      <div class="sys-progress-bar"><div class="sys-progress-fill" style="width:${diskPct}%;background:${diskColor}"></div></div>
      <div class="sys-card-sub">${diskUsed} / ${diskTotal}${diskAvail ? ' (' + diskAvail + ' free)' : ''}</div>
    </div>
  `;

  // Disk warning banner
  _renderDiskWarning(diskPct, diskAvail);

  // Update service count badge
  const badge = $('sys-services-count');
  if (badge && svcTotal) badge.textContent = `${svcRunning}/${svcTotal} running`;
}

// ═══════════════════════════════════════════════════════════
// DISK WARNING BANNER
// ═══════════════════════════════════════════════════════════

function _renderDiskWarning(pct, avail) {
  let banner = $('sys-disk-warning');
  if (pct <= 85) {
    if (banner) banner.remove();
    return;
  }
  if (!banner) {
    banner = document.createElement('div');
    banner.id = 'sys-disk-warning';
    banner.className = 'sys-disk-warning-banner';
    const header = $('sys-dashboard-header');
    if (header) header.parentNode.insertBefore(banner, header.nextSibling);
  }
  banner.innerHTML = `
    <span class="sys-disk-warn-text">⚠️ Disk at ${pct}%${avail ? ' — ' + avail + ' remaining' : ''}</span>
    <button class="sys-disk-cleanup-btn" onclick="requestDiskCleanup()">🧹 Run cleanup</button>
  `;
}

function requestDiskCleanup() {
  toast('🧹 Cleanup requested — agent will process', 'success');
  const bridgeUrl = (typeof Bridge !== 'undefined' && Bridge.baseUrl) ? Bridge.baseUrl : '';
  fetch(`${bridgeUrl}/api/agent/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Run disk cleanup — prune docker, logs, tmp', context: 'system-action' }),
  }).catch(() => {});
}

// ═══════════════════════════════════════════════════════════
// SERVICE STATUS — real data with detail expansion
// ═══════════════════════════════════════════════════════════

async function _sysLoadServices() {
  const grid = $('sys-services-grid');
  if (!grid) return;

  let services = null;
  try {
    if (typeof Bridge !== 'undefined' && Bridge.liveMode) {
      services = await Bridge.getSystemServices();
    }
  } catch (e) {
    console.warn('[System] Services fetch failed:', e.message);
  }

  if (!Array.isArray(services) || services.length === 0) {
    // Fall back to original renderer
    if (typeof _renderServiceStatus === 'function') _renderServiceStatus();
    return;
  }

  // Highlight the 4 key services + show others
  const keyIds = ['openclaw-gateway', 'oauth-guardian', 'agent-os-bridge', 'bridge-sync'];
  const keySvcs = keyIds.map(id => services.find(s => s.name === id || s.id === id)).filter(Boolean);
  const otherSvcs = services.filter(s => !keyIds.includes(s.name) && !keyIds.includes(s.id));
  const allSvcs = [...keySvcs, ...otherSvcs];

  const badge = $('sys-services-count');
  const running = allSvcs.filter(s => s.status === 'active' || s.status === 'running').length;
  if (badge) badge.textContent = `${running}/${allSvcs.length} running`;

  grid.innerHTML = allSvcs.map(s => {
    const isUp = s.status === 'active' || s.status === 'running';
    const isFailed = s.status === 'failed';
    const expanded = _sysExpandedService === (s.name || s.id);
    const svcId = s.name || s.id;
    const dotClass = isFailed ? 'sys-svc-dot-failed' : isUp ? 'sys-svc-dot-up' : 'sys-svc-dot-down';
    const cardClass = isFailed ? 'sys-svc-failed' : !isUp ? 'sys-svc-down' : '';

    let detailHtml = '';
    if (expanded) {
      detailHtml = `
        <div class="sys-svc-detail" id="sys-svc-detail-${svcId}">
          <div class="sys-svc-detail-row"><span>Status:</span><span style="color:${isFailed ? 'var(--red)' : isUp ? 'var(--green)' : 'var(--yellow)'}">${s.status}</span></div>
          ${s.pid ? `<div class="sys-svc-detail-row"><span>PID:</span><span>${s.pid}</span></div>` : ''}
          ${s.uptime ? `<div class="sys-svc-detail-row"><span>Uptime:</span><span>${s.uptime}</span></div>` : ''}
          ${s.memory ? `<div class="sys-svc-detail-row"><span>Memory:</span><span>${s.memory}</span></div>` : ''}
          <div class="sys-svc-log-preview" id="sys-svc-log-${svcId}">
            <div style="padding:8px;color:var(--text-muted);font-size:11px;">Loading logs...</div>
          </div>
          <div class="sys-svc-detail-actions">
            <button class="sys-svc-restart-btn" onclick="event.stopPropagation();restartService('${svcId}')">🔄 Restart</button>
            <button class="sys-svc-log-btn" onclick="event.stopPropagation();selectLogService('${svcId}')">📜 Full Logs</button>
          </div>
        </div>`;
    }

    return `
      <div class="sys-svc-card ${cardClass} ${expanded ? 'sys-svc-expanded' : ''}" onclick="toggleServiceDetail('${svcId}')">
        <div class="sys-svc-row">
          <span class="sys-svc-dot ${dotClass}"></span>
          <span class="sys-svc-name">${s.display_name || s.name || s.id}</span>
          <span class="sys-svc-uptime">${isUp ? (s.uptime || 'active') : s.status}</span>
        </div>
        ${detailHtml}
      </div>`;
  }).join('');

  // Load logs for expanded service
  if (_sysExpandedService) {
    _loadServiceLogs(_sysExpandedService);
  }
}

async function _loadServiceLogs(svcId) {
  const container = $(`sys-svc-log-${svcId}`);
  if (!container) return;
  try {
    const lines = await Bridge.getSystemLogs(svcId, 20);
    if (Array.isArray(lines) && lines.length > 0) {
      container.innerHTML = lines.map(l => {
        const text = typeof l === 'string' ? l : (l.text || l.message || JSON.stringify(l));
        return `<div class="sys-svc-log-line">${_escHtml(text)}</div>`;
      }).join('');
      container.scrollTop = container.scrollHeight;
    } else {
      container.innerHTML = '<div style="padding:8px;color:var(--text-muted);font-size:11px;">No logs available</div>';
    }
  } catch {
    container.innerHTML = '<div style="padding:8px;color:var(--red);font-size:11px;">Failed to load logs</div>';
  }
}

function _escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ═══════════════════════════════════════════════════════════
// LIVE LOG VIEWER — terminal aesthetic
// ═══════════════════════════════════════════════════════════

function selectLogService(svcId) {
  _sysSelectedLogService = svcId;
  _sysLogLines = [];
  _renderLogViewer();
  _refreshLogs();
  _startLogAutoRefresh();
  // Scroll to log viewer
  const el = $('sys-live-log-section');
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function _renderLogViewer() {
  const section = $('sys-live-log-section');
  if (!section) return;

  if (!_sysSelectedLogService) {
    section.classList.add('hidden');
    return;
  }

  section.classList.remove('hidden');
  const titleEl = $('sys-live-log-title');
  if (titleEl) titleEl.textContent = `Live Logs: ${_sysSelectedLogService}`;
}

async function _refreshLogs() {
  if (!_sysSelectedLogService) return;
  const container = $('sys-live-log-output');
  if (!container) return;

  try {
    const lines = await Bridge.getSystemLogs(_sysSelectedLogService, 50);
    if (!Array.isArray(lines)) return;

    const newLines = lines.map(l => typeof l === 'string' ? l : (l.text || l.message || JSON.stringify(l)));

    // Detect new lines by comparing with cached
    const prevCount = _sysLogLines.length;
    _sysLogLines = newLines;

    // Apply filter
    const filtered = _sysLogFilter
      ? newLines.filter(l => l.toLowerCase().includes(_sysLogFilter.toLowerCase()))
      : newLines;

    container.innerHTML = filtered.map((line, i) => {
      const isNew = i >= prevCount && prevCount > 0;
      return `<div class="sys-terminal-line ${isNew ? 'sys-terminal-new' : ''}">${_escHtml(line)}</div>`;
    }).join('');

    if (!_sysLogPaused) {
      container.scrollTop = container.scrollHeight;
    }
  } catch (e) {
    console.warn('[System] Log refresh failed:', e.message);
  }
}

function filterLogs(query) {
  _sysLogFilter = query;
  _refreshLogs();
}

function _startLogAutoRefresh() {
  _stopLogAutoRefresh();
  _sysLogAutoRefresh = setInterval(() => {
    if (!shouldPoll()) return;
    if (_sysLogPaused) return;
    _refreshLogs();
  }, 10000);
}

function _stopLogAutoRefresh() {
  if (_sysLogAutoRefresh) {
    clearInterval(_sysLogAutoRefresh);
    _sysLogAutoRefresh = null;
  }
}

function refreshLogsNow() {
  _refreshLogs();
  toast('📜 Logs refreshed', 'info', 1500);
}

function closeLogViewer() {
  _sysSelectedLogService = null;
  _stopLogAutoRefresh();
  const section = $('sys-live-log-section');
  if (section) section.classList.add('hidden');
}

// ═══════════════════════════════════════════════════════════
// CRON SCHEDULE — real data with human-readable expressions
// ═══════════════════════════════════════════════════════════

async function _sysLoadCrons() {
  const el = $('sys-crons');
  if (!el) return;

  let crons = null;
  try {
    if (typeof Bridge !== 'undefined' && Bridge.liveMode) {
      crons = await Bridge.getSystemCrons();
    }
  } catch (e) {
    console.warn('[System] Crons fetch failed:', e.message);
  }

  if (!Array.isArray(crons) || crons.length === 0) {
    // Use existing CRONS from data.js via original renderer
    if (typeof _renderCronSchedule === 'function') _renderCronSchedule();
    return;
  }

  el.innerHTML = `<div class="sys-cron-timeline">${crons.map(c => {
    const name = c.name || c.command || '—';
    const schedule = c.schedule || c.expression || c.s || '';
    const human = _parseCronToHuman(schedule);
    const color = _cronTypeColor(name);
    const lastRun = c.last_run || c.lastRun || null;
    const isOk = c.status !== 'failed' && c.ok !== false;

    return `
      <div class="sys-cron-item ${isOk ? '' : 'sys-cron-fail'}">
        <div class="sys-cron-left">
          <span class="sys-cron-type-dot" style="background:${color}"></span>
          <span class="sys-cron-name">${_escHtml(name)}</span>
        </div>
        <span class="sys-cron-human">${human}</span>
        <span class="sys-cron-sched">${schedule}</span>
        ${lastRun ? `<span class="sys-cron-last">last: ${lastRun}</span>` : ''}
      </div>`;
  }).join('')}</div>`;
}

// ═══════════════════════════════════════════════════════════
// PROCESS MONITOR — top 15 by memory
// ═══════════════════════════════════════════════════════════

async function _sysLoadProcesses() {
  const el = $('sys-process-monitor');
  if (!el) return;

  try {
    if (typeof Bridge !== 'undefined' && Bridge.liveMode) {
      const procs = await Bridge.getSystemProcesses();
      if (Array.isArray(procs) && procs.length > 0) {
        _sysProcesses = procs.slice(0, 15);
        _drawProcessMonitor(el);
        return;
      }
    }
  } catch (e) {
    console.warn('[System] Processes fetch failed:', e.message);
  }

  el.innerHTML = '<div style="padding:16px;color:var(--text-muted);font-size:12px;">Connect bridge to view processes</div>';
}

function _drawProcessMonitor(el) {
  if (!_sysProcesses.length) {
    el.innerHTML = '<div style="padding:16px;color:var(--text-muted);font-size:12px;">No process data</div>';
    return;
  }

  const maxMem = Math.max(..._sysProcesses.map(p => parseFloat(p.mem || p.memory || p['%mem'] || 0)), 0.1);

  el.innerHTML = `
    <div class="sys-proc-list">
      <div class="sys-proc-header">
        <span class="sys-proc-h-pid">PID</span>
        <span class="sys-proc-h-name">Name</span>
        <span class="sys-proc-h-bar">Memory</span>
        <span class="sys-proc-h-cpu">CPU%</span>
        <span class="sys-proc-h-mem">MEM%</span>
      </div>
      ${_sysProcesses.map(p => {
        const pid = p.pid || '—';
        const name = p.name || p.command || p.comm || '—';
        const memPct = parseFloat(p.mem || p.memory || p['%mem'] || 0);
        const cpuPct = parseFloat(p.cpu || p['%cpu'] || 0);
        const barWidth = (memPct / maxMem) * 100;
        const barColor = memPct > 10 ? '#f38ba8' : memPct > 5 ? '#fab387' : '#89b4fa';

        return `
          <div class="sys-proc-row">
            <span class="sys-proc-pid">${pid}</span>
            <span class="sys-proc-name" title="${_escHtml(name)}">${_escHtml(name)}</span>
            <span class="sys-proc-bar-wrap">
              <div class="sys-proc-bar" style="width:${barWidth}%;background:${barColor}"></div>
            </span>
            <span class="sys-proc-cpu">${cpuPct.toFixed(1)}</span>
            <span class="sys-proc-mem">${memPct.toFixed(1)}</span>
          </div>`;
      }).join('')}
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════
// MAIN ORCHESTRATOR — replaces renderPulse calls
// ═══════════════════════════════════════════════════════════

function renderSystemDashboard() {
  // Load all sections with real data
  _sysLoadOverview();
  _sysLoadServices();
  _sysLoadCrons();
  _sysLoadProcesses();

  // Keep existing renderers for sections we don't replace
  if (typeof _renderAgentStatusTable === 'function') _renderAgentStatusTable();
  if (typeof _renderWorkflowPipeline === 'function') _renderWorkflowPipeline();
  if (typeof _renderCostTracking === 'function') _renderCostTracking();

  // Render log viewer state
  _renderLogViewer();

  // Start auto-refresh timers
  _startSystemTimers();
}

function _startSystemTimers() {
  _stopSystemTimers();

  // Overview: 15s
  _sysOverviewTimer = setInterval(() => {
    if (!shouldPoll()) return;
    if (typeof currentPage !== 'undefined' && currentPage !== 'pulse') return;
    _sysLoadOverview();
    _sysLoadServices();
  }, 15000);

  // Processes: 30s
  _sysProcessTimer = setInterval(() => {
    if (!shouldPoll()) return;
    if (typeof currentPage !== 'undefined' && currentPage !== 'pulse') return;
    _sysLoadProcesses();
  }, 30000);
}

function _stopSystemTimers() {
  if (_sysOverviewTimer) { clearInterval(_sysOverviewTimer); _sysOverviewTimer = null; }
  if (_sysProcessTimer) { clearInterval(_sysProcessTimer); _sysProcessTimer = null; }
  _stopLogAutoRefresh();
}

// ═══════════════════════════════════════════════════════════
// HOOK — Override renderPulse to use real data
// ═══════════════════════════════════════════════════════════

// Capture original renderPulse from app2.js using a closure to avoid hoisting issues
(function() {
  const _origRenderPulse = typeof window.renderPulse === 'function' ? window.renderPulse : null;

  window.renderPulse = function renderPulse() {
    // If bridge is live, use real data rendering
    if (typeof Bridge !== 'undefined' && Bridge.liveMode) {
      renderSystemDashboard();
    } else if (_origRenderPulse) {
      // Fallback to original
      _origRenderPulse();
      // Still try to load processes and log viewer
      _renderLogViewer();
    }
  };
})();

// Stop timers when leaving pulse page
if (typeof window !== 'undefined') {
  const _sysOrigNav = window.nav;
  if (_sysOrigNav) {
    // We hook nav but must be careful not to double-hook
    const _navHookId = '_sysNavHooked';
    if (!window[_navHookId]) {
      window[_navHookId] = true;
      const _realNav = window.nav;
      window.nav = function(page) {
        _realNav.call(this, page);
        if (page !== 'pulse') {
          _stopSystemTimers();
        }
      };
    }
  }
}
