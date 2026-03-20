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

// ═══════════════════════════════════════════════════════════
// KEYBOARD SHORTCUTS OVERLAY
// ═══════════════════════════════════════════════════════════

let shortcutOverlayOpen = false;

const SHORTCUTS = [
  { keys: ['⌘', 'K'], desc: 'Command palette / Omnibus' },
  { keys: ['/'], desc: 'Focus search' },
  { divider: true },
  { keys: ['j'], desc: 'Next item' },
  { keys: ['k'], desc: 'Previous item' },
  { keys: ['Enter'], desc: 'Open / expand selected' },
  { divider: true },
  { keys: ['a'], desc: 'Approve (Stream, Inbox, Proposals)' },
  { keys: ['r'], desc: 'Reject' },
  { keys: ['d'], desc: 'Defer / dismiss' },
  { divider: true },
  { keys: ['?'], desc: 'Show this help' },
  { keys: ['Esc'], desc: 'Close overlay / cancel' },
];

function showShortcutOverlay() {
  if (shortcutOverlayOpen) { hideShortcutOverlay(); return; }
  shortcutOverlayOpen = true;

  const overlay = document.createElement('div');
  overlay.id = 'shortcut-overlay';
  overlay.className = 'shortcut-overlay';
  overlay.onclick = (e) => { if (e.target === overlay) hideShortcutOverlay(); };

  const rows = SHORTCUTS.map(s => {
    if (s.divider) return '<div class="shortcut-divider"></div>';
    const keysHTML = s.keys.map(k => `<kbd>${k}</kbd>`).join('');
    return `
      <div class="shortcut-row">
        <span class="shortcut-desc">${s.desc}</span>
        <span class="shortcut-keys">${keysHTML}</span>
      </div>
    `;
  }).join('');

  overlay.innerHTML = `
    <div class="shortcut-card">
      <h3>⌨️ Keyboard Shortcuts</h3>
      <div class="shortcut-list">${rows}</div>
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
// GLOBAL KEYBOARD SHORTCUT LISTENER — "?" shows shortcuts
// ═══════════════════════════════════════════════════════════

document.addEventListener('keydown', (e) => {
  // Don't fire in inputs
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  // Don't fire if command palette is open
  if (typeof paletteOpen !== 'undefined' && paletteOpen) return;

  if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    showShortcutOverlay();
  }

  if (e.key === 'Escape' && shortcutOverlayOpen) {
    e.preventDefault();
    hideShortcutOverlay();
  }
});
