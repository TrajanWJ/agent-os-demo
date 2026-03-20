/* Agent OS — notifications.js — Browser Push Notifications + Notification Center */
'use strict';

// ═══════════════════════════════════════════════════════════
// NOTIFICATION CENTER — Enhanced in-app notification system
// ═══════════════════════════════════════════════════════════

const NotificationCenter = {
  MAX_ITEMS: 20,
  _items: [],
  _unreadCount: 0,

  // ── Init ──────────────────────────────────────────────────
  init() {
    this._loadFromStorage();
    this._renderBadge();
    this._initPermissionBanner();
  },

  // ── Permission Banner ─────────────────────────────────────
  _initPermissionBanner() {
    const banner = document.getElementById('notif-permission-banner');
    if (!banner) return;

    // Don't show if already granted, denied, or dismissed
    if (typeof Notification === 'undefined') { banner.style.display = 'none'; return; }
    if (Notification.permission === 'granted') { banner.style.display = 'none'; return; }
    if (Notification.permission === 'denied') { banner.style.display = 'none'; return; }
    if (localStorage.getItem('notif_banner_dismissed') === '1') { banner.style.display = 'none'; return; }

    banner.style.display = '';
  },

  enableNotifications() {
    const banner = document.getElementById('notif-permission-banner');
    if (typeof Notification === 'undefined') {
      if (banner) banner.style.display = 'none';
      toast('Notifications not supported in this browser', 'error');
      return;
    }
    Notification.requestPermission().then(perm => {
      if (banner) banner.style.display = 'none';
      if (perm === 'granted') {
        localStorage.setItem('notif_permission', 'granted');
        toast('🔔 Notifications enabled!', 'success');
      } else {
        localStorage.setItem('notif_banner_dismissed', '1');
        toast('Notifications disabled — you can re-enable in browser settings', 'info');
      }
    });
  },

  dismissBanner() {
    const banner = document.getElementById('notif-permission-banner');
    if (banner) banner.style.display = 'none';
    localStorage.setItem('notif_banner_dismissed', '1');
  },

  // ── Add Notification ──────────────────────────────────────
  add(title, body, options = {}) {
    const item = {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      icon: options.icon || '🔔',
      title: title,
      body: (body || '').substring(0, 200),
      time: Date.now(),
      page: options.page || null,
      read: false,
      priority: options.priority || 'medium', // high, medium, low
    };

    this._items.unshift(item);
    if (this._items.length > this.MAX_ITEMS) {
      this._items = this._items.slice(0, this.MAX_ITEMS);
    }
    this._unreadCount = this._items.filter(n => !n.read).length;

    this._saveToStorage();
    this._renderBadge();

    // Update the dropdown if it's currently open
    const panel = document.getElementById('notif-panel');
    if (panel && !panel.classList.contains('hidden')) {
      this.renderPanel();
    }

    // Also call the legacy addNotification for compatibility
    if (typeof notifications !== 'undefined') {
      notifications.unshift({ title, desc: item.body, icon: item.icon, time: new Date().toLocaleTimeString() });
    }

    return item;
  },

  // ── Browser Push Notification ─────────────────────────────
  send(title, body, options = {}) {
    // Always add to in-app notification center
    const item = this.add(title, body, options);

    // Send browser push notification
    if (typeof Notification === 'undefined') return item;
    if (Notification.permission !== 'granted') return item;

    // Don't send browser notification when tab is focused (unless forced)
    if (document.hasFocus() && !options.force) return item;

    try {
      const n = new Notification(title, {
        body: (body || '').substring(0, 200),
        icon: options.browserIcon || '/favicon.ico',
        tag: options.tag || 'agent-os-' + Date.now(),
        silent: options.silent || false,
      });

      n.onclick = () => {
        window.focus();
        if (options.page && typeof nav === 'function') nav(options.page);
        n.close();
      };

      // Auto-close after 8 seconds
      setTimeout(() => { try { n.close(); } catch(e) {} }, 8000);
    } catch (e) {
      console.warn('[Notifications] Browser notification failed:', e);
    }

    return item;
  },

  // ── Mark Read ─────────────────────────────────────────────
  markRead(id) {
    const item = this._items.find(n => n.id === id);
    if (item) item.read = true;
    this._unreadCount = this._items.filter(n => !n.read).length;
    this._saveToStorage();
    this._renderBadge();
  },

  markAllRead() {
    this._items.forEach(n => { n.read = true; });
    this._unreadCount = 0;
    this._saveToStorage();
    this._renderBadge();
    this.renderPanel();
  },

  // ── Clear All ─────────────────────────────────────────────
  clearAll() {
    this._items = [];
    this._unreadCount = 0;
    this._saveToStorage();
    this._renderBadge();
    this.renderPanel();
  },

  // ── Toggle Panel ──────────────────────────────────────────
  toggle() {
    const panel = document.getElementById('notif-panel');
    if (!panel) return;
    panel.classList.toggle('hidden');
    if (!panel.classList.contains('hidden')) {
      this.renderPanel();
    }
  },

  // ── Render ────────────────────────────────────────────────
  _renderBadge() {
    const badge = document.getElementById('notif-count');
    if (!badge) return;
    badge.textContent = this._unreadCount > 0 ? String(this._unreadCount) : '';
    badge.style.display = this._unreadCount > 0 ? '' : 'none';
  },

  renderPanel() {
    const list = document.getElementById('notif-list');
    if (!list) return;

    if (this._items.length === 0) {
      list.innerHTML = '<div class="notif-empty">No notifications</div>';
      return;
    }

    list.innerHTML = this._items.map(n => {
      const ago = this._timeAgo(n.time);
      const unreadClass = n.read ? '' : ' notif-item-unread';
      const clickNav = n.page ? ` onclick="NotificationCenter.markRead('${n.id}');nav('${n.page}');NotificationCenter.toggle();"` : ` onclick="NotificationCenter.markRead('${n.id}');"`;
      return `<div class="notif-item${unreadClass}" data-notif-id="${n.id}"${clickNav}>
        <span class="notif-icon">${n.icon}</span>
        <div class="notif-body">
          <div class="notif-title">${this._escapeHtml(n.title)}</div>
          <div class="notif-desc">${this._escapeHtml(n.body)}</div>
        </div>
        <div class="notif-time">${ago}</div>
      </div>`;
    }).join('');
  },

  // ── Persistence ───────────────────────────────────────────
  _saveToStorage() {
    try {
      localStorage.setItem('notif_center_items', JSON.stringify(this._items));
    } catch (e) { /* quota exceeded, ignore */ }
  },

  _loadFromStorage() {
    try {
      const raw = localStorage.getItem('notif_center_items');
      if (raw) {
        this._items = JSON.parse(raw);
        // Prune old items (older than 24h)
        const cutoff = Date.now() - 86400000;
        this._items = this._items.filter(n => n.time > cutoff);
        if (this._items.length > this.MAX_ITEMS) {
          this._items = this._items.slice(0, this.MAX_ITEMS);
        }
      }
    } catch (e) {
      this._items = [];
    }
    this._unreadCount = this._items.filter(n => !n.read).length;
  },

  // ── Helpers ───────────────────────────────────────────────
  _timeAgo(ts) {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'just now';
    if (diff < 3600) return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    return Math.floor(diff / 86400) + 'd ago';
  },

  _escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  },
};


// ═══════════════════════════════════════════════════════════
// GLOBAL SHORTCUT — sendNotification()
// ═══════════════════════════════════════════════════════════

function sendNotification(title, body, options = {}) {
  return NotificationCenter.send(title, body, options);
}


// ═══════════════════════════════════════════════════════════
// WIRE: WebSocket Event → Notification
// ═══════════════════════════════════════════════════════════

function wireNotificationsToBridge() {
  if (typeof Bridge === 'undefined') return;

  // ── High priority (always notify) ──
  Bridge.on('error', (msg) => {
    const data = msg.data || msg;
    sendNotification('⚠️ Agent Error', data.content || data.message || 'An error occurred', {
      icon: '🚨',
      page: 'feed',
      tag: 'agent-error-' + (data.id || Date.now()),
      priority: 'high',
      force: true,
    });
  });

  Bridge.on('proposal', (msg) => {
    const data = msg.data || msg;
    if (data.status === 'pending' || data._status === 'pending') {
      sendNotification('📋 Proposal Needs Decision', data.title || data.question || 'New proposal pending', {
        icon: '📋',
        page: 'queue',
        tag: 'proposal-' + (data.id || Date.now()),
        priority: 'high',
        force: true,
      });
    }
  });

  Bridge.on('question', (msg) => {
    const data = msg.data || msg;
    sendNotification('❓ Agent Question', data.content || data.question || 'An agent needs your input', {
      icon: '❓',
      page: 'queue',
      tag: 'question-' + (data.id || Date.now()),
      priority: 'high',
      force: true,
    });
  });

  // ── Feed events (check type for high-priority items) ──
  Bridge.on('feed', (msg) => {
    const data = msg.data || msg;
    const type = data.type || '';
    const content = data.content || data.summary || '';

    // High priority: errors
    if (type === 'error' || data.severity === 'error') {
      sendNotification('⚠️ Agent Error', content, {
        icon: '🚨', page: 'feed', priority: 'high', force: true,
        tag: 'feed-error-' + (data.id || Date.now()),
      });
      return;
    }

    // High priority: disk warning
    if (type === 'system' && /disk.*9[0-9]%|disk.*100%/i.test(content)) {
      sendNotification('💾 Disk Space Warning', content, {
        icon: '💾', page: 'pulse', priority: 'high', force: true,
        tag: 'disk-warning',
      });
      return;
    }

    // Medium priority: task completed (only when tab hidden)
    if (type === 'task_completed' || type === 'completed') {
      sendNotification('✅ Task Completed', content, {
        icon: '✅', page: 'feed', priority: 'medium',
        tag: 'task-done-' + (data.id || Date.now()),
      });
      return;
    }

    // Medium priority: vault note written
    if (type === 'vault_write' || type === 'vault') {
      sendNotification('📚 Vault Note Written', content, {
        icon: '📚', page: 'mind', priority: 'medium',
        tag: 'vault-' + (data.id || Date.now()),
      });
      return;
    }
  });

  // ── Medium priority: Discord message in concierge channel ──
  Bridge.on('message', (msg) => {
    const data = msg.data || msg;
    // Only notify for messages not from self and when tab is hidden
    if (msg.source === 'self') return;
    const authorName = data.author?.display_name || data.author?.username || 'Someone';
    const content = data.content || '';

    // Check if it's a concierge-like channel
    const channelName = (typeof _liveChannelIdMap !== 'undefined' && _liveChannelIdMap[msg.channel]?.name) || '';
    const isConcierge = /concierge|bridge|general/i.test(channelName);

    if (isConcierge) {
      sendNotification('💬 ' + authorName, content.substring(0, 100), {
        icon: '💬', page: 'talk', priority: 'medium',
        tag: 'discord-msg-' + (data.id || Date.now()),
      });
    }
  });

  // ── System health events ──
  Bridge.on('system', (msg) => {
    const data = msg.data || msg;
    if (data.disk_percent && data.disk_percent > 90) {
      sendNotification('💾 Disk > 90%', `Disk usage at ${data.disk_percent}%`, {
        icon: '💾', page: 'pulse', priority: 'high', force: true,
        tag: 'disk-warning',
      });
    }
  });
}


// ═══════════════════════════════════════════════════════════
// OVERRIDE: Existing notification functions for compatibility
// ═══════════════════════════════════════════════════════════

// Override toggleNotifications to use NotificationCenter
if (typeof window !== 'undefined') {
  window.toggleNotifications = function() {
    NotificationCenter.toggle();
  };
  window.clearNotifications = function() {
    NotificationCenter.clearAll();
  };
  // Override addNotification to route through NotificationCenter
  const _origAddNotification = window.addNotification;
  window.addNotification = function(title, desc, icon) {
    NotificationCenter.add(title, desc, { icon: icon || '🔔' });
  };
}


// ═══════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // Init after a short delay to ensure DOM is ready
  setTimeout(() => {
    NotificationCenter.init();
    wireNotificationsToBridge();
  }, 400);
});
