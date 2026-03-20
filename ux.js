/* Agent OS — ux.js — UX Utilities: Loading States, Keyboard Shortcuts, Confirmations */
'use strict';

// ═══════════════════════════════════════════════════════════
// LOADING SKELETONS
// ═══════════════════════════════════════════════════════════

function showLoading(containerId, count = 3) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.innerHTML = Array(count).fill(
    '<div class="skeleton" style="height:60px;margin-bottom:8px;border-radius:8px"></div>'
  ).join('');
}

function showCardLoading(containerId, count = 3) {
  const c = document.getElementById(containerId);
  if (!c) return;
  c.innerHTML = Array(count).fill(`
    <div class="skeleton-card" style="margin-bottom:10px">
      <div class="skeleton skeleton-avatar"></div>
      <div class="skeleton-body">
        <div class="skeleton skeleton-line short"></div>
        <div class="skeleton skeleton-line long"></div>
        <div class="skeleton skeleton-line medium"></div>
      </div>
    </div>
  `).join('');
}

/**
 * Show skeleton placeholder cards inside a container element.
 * @param {HTMLElement|string} container - DOM element or ID string
 * @param {number} count - Number of skeleton cards to show
 */
function showSkeletons(container, count = 3) {
  const el = typeof container === 'string' ? document.getElementById(container) : container;
  if (!el) return;
  el.innerHTML = Array.from({ length: count }, () => `
    <div class="skeleton-card">
      <div class="skeleton skeleton-avatar"></div>
      <div class="skeleton-body">
        <div class="skeleton skeleton-line short"></div>
        <div class="skeleton skeleton-line long"></div>
        <div class="skeleton skeleton-line medium"></div>
      </div>
    </div>
  `).join('');
}

// ═══════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS OVERLAY (Enhanced — sectioned help modal)
// ═══════════════════════════════════════════════════════════

let shortcutOverlayOpen = false;

const SHORTCUT_SECTIONS = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: ['⌘', 'K'], desc: 'Command palette' },
      { keys: ['1–6'], desc: 'Switch pages (Stream, Inbox, Talk, Tasks, Mind, System)' },
      { keys: ['g', 'i'], desc: 'Go to Inbox' },
      { keys: ['g', 't'], desc: 'Go to Tasks' },
      { keys: ['g', 'm'], desc: 'Go to Mind' },
      { keys: ['g', 'p'], desc: 'Go to Pulse / System' },
      { keys: ['g', 's'], desc: 'Go to Stream' },
      { keys: ['g', 'k'], desc: 'Go to Talk' },
    ]
  },
  {
    title: 'Stream',
    shortcuts: [
      { keys: ['j / k'], desc: 'Navigate items' },
      { keys: ['Enter'], desc: 'Expand item' },
      { keys: ['a'], desc: 'Approve' },
      { keys: ['r'], desc: 'Reject' },
      { keys: ['d'], desc: 'Defer' },
      { keys: ['f'], desc: 'Cycle filter' },
    ]
  },
  {
    title: 'Inbox',
    shortcuts: [
      { keys: ['j / k'], desc: 'Navigate items' },
      { keys: ['Enter'], desc: 'Open detail' },
      { keys: ['a'], desc: 'Approve' },
      { keys: ['x'], desc: 'Dismiss' },
      { keys: ['r'], desc: 'Reply' },
      { keys: ['s'], desc: 'Snooze' },
      { keys: ['d'], desc: 'Delete' },
      { keys: ['/'], desc: 'Search inbox' },
    ]
  },
  {
    title: 'Mind',
    shortcuts: [
      { keys: ['/'], desc: 'Focus search' },
      { keys: ['1–5'], desc: 'Switch tabs' },
    ]
  },
  {
    title: 'General',
    shortcuts: [
      { keys: ['?'], desc: 'Show this help' },
      { keys: ['Esc'], desc: 'Close overlay / go back' },
    ]
  },
];

function showShortcutOverlay() {
  if (shortcutOverlayOpen) { hideShortcutOverlay(); return; }
  shortcutOverlayOpen = true;

  const overlay = document.createElement('div');
  overlay.id = 'shortcut-overlay';
  overlay.className = 'shortcut-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) hideShortcutOverlay(); };

  const sectionsHTML = SHORTCUT_SECTIONS.map(section => {
    const rows = section.shortcuts.map(s => {
      const keysHTML = s.keys.map(k => `<kbd>${k}</kbd>`).join('');
      return `<div class="shortcut-row"><span class="shortcut-desc">${s.desc}</span><span class="shortcut-keys">${keysHTML}</span></div>`;
    }).join('');
    return `<div class="shortcut-section"><div class="shortcut-section-title">${section.title}</div>${rows}</div>`;
  }).join('');

  overlay.innerHTML = `
    <div class="shortcut-card">
      <h3>⌨️ Keyboard Shortcuts</h3>
      <div class="shortcut-list">${sectionsHTML}</div>
      <button class="shortcut-close" onclick="hideShortcutOverlay()">Close <kbd>Esc</kbd></button>
    </div>
  `;

  document.body.appendChild(overlay);
}

function hideShortcutOverlay() {
  shortcutOverlayOpen = false;
  const overlay = document.getElementById('shortcut-overlay');
  if (overlay) {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.15s ease';
    setTimeout(() => overlay.remove(), 150);
  }
}

// ═══════════════════════════════════════════════════════════
// CONFIRMATION DIALOGS (for destructive actions)
// ═══════════════════════════════════════════════════════════

function showConfirm(title, message, onConfirm, confirmLabel = 'Confirm', isDanger = false) {
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };

  overlay.innerHTML = `
    <div class="confirm-dialog">
      <h4>${title}</h4>
      <p>${message}</p>
      <div class="confirm-actions">
        <button class="btn-secondary" onclick="this.closest('.confirm-overlay').remove()">Cancel</button>
        <button class="${isDanger ? 'btn-danger' : 'btn-primary'}" id="confirm-action-btn">${confirmLabel}</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  overlay.querySelector('#confirm-action-btn').onclick = () => {
    overlay.remove();
    if (onConfirm) onConfirm();
  };

  // Escape to close
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      overlay.remove();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
}

// ═══════════════════════════════════════════════════════════
// GLOBAL KEYBOARD SYSTEM — Single handler for all pages
// ═══════════════════════════════════════════════════════════

// "g" prefix tracking for vim-style "go" shortcuts (g i → Inbox, g t → Tasks, etc.)
let _goPrefixActive = false;
let _goPrefixTimer = null;

function _activateGoPrefix() {
  _goPrefixActive = true;
  clearTimeout(_goPrefixTimer);
  _goPrefixTimer = setTimeout(() => { _goPrefixActive = false; }, 800);
}

function _handleGoKey(key) {
  _goPrefixActive = false;
  clearTimeout(_goPrefixTimer);
  const goMap = {
    's': 'feed', 'i': 'inbox', 'k': 'talk', 't': 'tasks',
    'm': 'mind', 'p': 'pulse', 'q': 'queue', 'r': 'rooms',
    'b': 'briefing', 'j': 'projects', 'n': 'missions',
  };
  if (goMap[key] && typeof nav === 'function') {
    nav(goMap[key]);
    return true;
  }
  return false;
}

document.addEventListener('keydown', (e) => {
  // ── Always handle ⌘K regardless of focus ──
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    if (typeof paletteOpen !== 'undefined' && paletteOpen) {
      if (typeof closeCommandPalette === 'function') closeCommandPalette();
    } else {
      if (typeof openCommandPalette === 'function') openCommandPalette();
    }
    return;
  }

  // ── Escape: close overlays in priority order ──
  if (e.key === 'Escape') {
    if (shortcutOverlayOpen) { e.preventDefault(); hideShortcutOverlay(); return; }
    if (typeof paletteOpen !== 'undefined' && paletteOpen) { if (typeof closeCommandPalette === 'function') closeCommandPalette(); return; }
    // Let page-specific handlers deal with other Escape usage
    return;
  }

  // ── Don't fire in inputs/textareas ──
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

  // ── Don't fire if command palette is open ──
  if (typeof paletteOpen !== 'undefined' && paletteOpen) return;

  // ── "g" prefix handler ──
  if (_goPrefixActive && !e.ctrlKey && !e.metaKey && !e.altKey) {
    if (_handleGoKey(e.key)) { e.preventDefault(); return; }
    _goPrefixActive = false; // invalid second key, cancel
  }

  if (e.key === 'g' && !e.ctrlKey && !e.metaKey && !e.altKey && !shortcutOverlayOpen) {
    _activateGoPrefix();
    return;
  }

  // ── ? — show keyboard help (skip on inbox which has its own ? handler) ──
  if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
    const cp2 = typeof currentPage !== 'undefined' ? currentPage : '';
    if (cp2 !== 'inbox') {
      e.preventDefault();
      showShortcutOverlay();
      return;
    }
  }

  // ── Number keys — page navigation (only when not on pages that use numbers) ──
  const cp = typeof currentPage !== 'undefined' ? currentPage : '';
  // Inbox and Mind use number keys for their own tabs — skip global nav
  if (cp !== 'inbox' && cp !== 'mind') {
    const pageMap = { '1': 'feed', '2': 'inbox', '3': 'talk', '4': 'tasks', '5': 'mind', '6': 'pulse' };
    if (pageMap[e.key] && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      if (typeof nav === 'function') nav(pageMap[e.key]);
      return;
    }
  }

  // ── f — cycle stream filter (feed page only) ──
  if (e.key === 'f' && cp === 'feed' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    const chips = document.querySelectorAll('.stream-chip');
    if (chips.length > 0) {
      let activeIdx = -1;
      chips.forEach((c, i) => { if (c.classList.contains('active')) activeIdx = i; });
      const nextIdx = (activeIdx + 1) % chips.length;
      chips[nextIdx].click();
    }
    return;
  }
});
