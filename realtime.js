/* ================================================================
   浮光-Luminos 实时同步中枢 (RealtimeHub)
   ---------------------------------------------------------------
   迁移到 WorkBuddy 云服务后，后端不再提供 WebSocket 变更推送通道，
   因此这里改用「轻量轮询 + 差异比对」实现同样的效果，对外 API 与
   之前完全一致，业务模块无需改动。

   工作方式：
   - 只轮询「当前有订阅者的表」，无人在意的表不产生请求
   - 每张表只取 id + 时间戳列，比对签名（行数/更新时间变化才算变更）
   - 首轮只建立基线，不触发刷新，避免页面刚打开就全量重渲染
   - 页面切到后台自动暂停，切回前台立即补查一次
   - 网络中断标记离线，恢复后自动继续
   - 统一状态徽标 + CustomEvent + 结构化日志

   对外 API：
   RealtimeHub.start()                   启动（幂等）
   RealtimeHub.stop()                    停止
   RealtimeHub.on(tables, handler, opts) 注册订阅，返回取消函数
   RealtimeHub.getStatus()               当前状态
   RealtimeHub.isConnected()             是否同步中
   RealtimeHub.mute(ms)                  短暂静默（本地写库避免自我刷新）
   RealtimeHub.pollNow()                 立即执行一次比对（可选）

   opts:
   - debounce: 防抖毫秒数，默认 180
   - pollMs:   该订阅建议的轮询间隔（取全局最小值），默认 0
   ================================================================ */
(function (global) {
  'use strict';

  var VERSION = '2.0.0';
  var POLL_MS = 7000;        // 全局基础轮询间隔
  var MIN_POLL_MS = 3000;    // 订阅可压低到的最小间隔

  // 每张表用于「变更指纹」的列：id 集合 + 最后更新时间
  var FINGERPRINT = {
    records: 'id,updated_at',
    renew_captains: 'id,updated_at',
    cotton_posts: 'id,created_at',
    gift_images: 'id,created_at',
    playlists: 'id,updated_at',
    playlist_songs: 'id,created_at',
    monopoly_boards: 'id,updated_at'
  };

  var STATUS = {
    IDLE: 'idle',
    CONNECTING: 'connecting',
    CONNECTED: 'connected',
    RECONNECTING: 'reconnecting',
    OFFLINE: 'offline',
    UNAVAILABLE: 'unavailable',
    STOPPED: 'stopped'
  };

  var STATUS_TEXT = {
    idle: '同步待命',
    connecting: '同步连接中',
    connected: '实时同步中',
    reconnecting: '同步重连中',
    offline: '已离线',
    unavailable: '同步不可用',
    stopped: '同步已停止'
  };

  var state = {
    status: STATUS.IDLE,
    started: false,
    subs: [],
    timer: null,
    polling: false,
    signatures: {},   // table -> 指纹字符串
    ready: {},        // table -> 是否已建立基线
    failCount: 0,
    muteUntil: 0,
    eventCount: 0,
    lastEventAt: 0,
    lastRoundAt: 0
  };

  function log(level, message, extra) {
    var payload = { module: 'SyncHub', v: VERSION, level: level, msg: message };
    if (extra) {
      Object.keys(extra).forEach(function (k) { payload[k] = extra[k]; });
    }
    try {
      if (level === 'error' && console.error) console.error(JSON.stringify(payload));
      else if (level === 'warn' && console.warn) console.warn(JSON.stringify(payload));
      else if (console.log) console.log(JSON.stringify(payload));
    } catch (e) { /* 忽略日志异常 */ }
  }

  function getSb() {
    if (global.sb && typeof global.sb.from === 'function') return global.sb;
    return null;
  }

  function setStatus(next, reason) {
    if (state.status === next && !reason) return;
    state.status = next;
    var text = STATUS_TEXT[next] || next;

    var badge = document.getElementById('rtStatus');
    if (badge) {
      badge.setAttribute('data-status', next);
      var label = badge.querySelector('.rt-text');
      if (label) label.textContent = text;
      badge.title = '数据同步状态：' + text + (reason ? '（' + reason + '）' : '');
    }

    try {
      document.dispatchEvent(new CustomEvent('luminos:realtime-status', {
        detail: { status: next, text: text, reason: reason || '' }
      }));
    } catch (e) { /* 老浏览器忽略 */ }

    log(next === STATUS.CONNECTED ? 'info' : 'warn', 'status -> ' + text, {
      status: next, reason: reason || ''
    });
  }

  /* ---------- 订阅分发 ---------- */
  function fireHandler(sub, payload) {
    if (sub.debounceTimer) clearTimeout(sub.debounceTimer);
    sub.debounceTimer = setTimeout(function () {
      sub.debounceTimer = null;
      if (Date.now() < state.muteUntil) return;
      try {
        sub.handler(payload);
      } catch (err) {
        log('error', 'handler threw', { id: sub.id, error: String((err && err.message) || err) });
      }
    }, sub.debounce);
  }

  function dispatchTableEvent(table) {
    state.eventCount++;
    state.lastEventAt = Date.now();
    state.subs.forEach(function (sub) {
      if (sub.tables.indexOf(table) >= 0) {
        fireHandler(sub, { source: 'poll', table: table, eventType: 'CHANGE' });
      }
    });
    log('info', 'change detected', { table: table });
  }

  /* ---------- 需要轮询的表（有订阅者才算） ---------- */
  function activeTables() {
    var set = {};
    state.subs.forEach(function (sub) {
      sub.tables.forEach(function (t) {
        if (FINGERPRINT[t]) set[t] = true;
      });
    });
    return Object.keys(set);
  }

  function currentInterval() {
    var ms = POLL_MS;
    state.subs.forEach(function (sub) {
      if (sub.pollMs > 0 && sub.pollMs < ms) ms = sub.pollMs;
    });
    return Math.max(MIN_POLL_MS, ms);
  }

  function buildSignature(rows) {
    if (!Array.isArray(rows)) return '0';
    var parts = rows.map(function (r) {
      return r.id + '@' + (r.updated_at || r.created_at || '');
    });
    parts.sort();
    return rows.length + '|' + parts.join(',');
  }

  /* ---------- 单表单轮比对 ---------- */
  function pollTable(sb, table) {
    return sb
      .from(table)
      .select(FINGERPRINT[table])
      .then(function (res) {
        if (res && res.error) throw res.error;
        var sig = buildSignature(res && res.data);
        var prev = state.signatures[table];
        state.signatures[table] = sig;

        if (!state.ready[table]) {
          state.ready[table] = true;   // 首轮只建基线
          return;
        }
        if (prev !== undefined && prev !== sig) {
          dispatchTableEvent(table);
        }
      });
  }

  /* ---------- 一轮轮询 ---------- */
  function pollRound() {
    if (state.polling || !state.started) return;
    var sb = getSb();
    if (!sb) {
      setStatus(STATUS.CONNECTING, 'client not ready');
      return;
    }

    var tables = activeTables();
    if (tables.length === 0) {
      setStatus(STATUS.CONNECTED);
      return;
    }

    state.polling = true;
    var failed = 0;

    Promise.all(tables.map(function (t) {
      return pollTable(sb, t).catch(function (err) {
        failed++;
        log('warn', 'poll table failed', { table: t, error: String((err && err.message) || err) });
      });
    })).then(function () {
      state.polling = false;
      state.lastRoundAt = Date.now();

      if (failed === 0) {
        state.failCount = 0;
        setStatus(STATUS.CONNECTED);
      } else {
        state.failCount++;
        if (!global.navigator || global.navigator.onLine !== false) {
          if (state.failCount >= 2) setStatus(STATUS.RECONNECTING, 'poll failed x' + state.failCount);
        } else {
          setStatus(STATUS.OFFLINE, 'network offline');
        }
      }
    });
  }

  function startTimer() {
    stopTimer();
    state.timer = setInterval(pollRound, currentInterval());
  }

  function stopTimer() {
    if (state.timer) {
      clearInterval(state.timer);
      state.timer = null;
    }
  }

  /* ---------- 页面可见性 / 网络状态 ---------- */
  function onVisibilityChange() {
    if (!state.started) return;
    if (document.visibilityState === 'visible') {
      log('info', 'page visible, poll now', {});
      pollRound();
      startTimer();
    } else {
      log('info', 'page hidden, pause polling', {});
      stopTimer();
    }
  }

  function onOnline() {
    if (!state.started) return;
    log('info', 'network online', {});
    state.failCount = 0;
    pollRound();
    startTimer();
  }

  function onOffline() {
    if (!state.started) return;
    setStatus(STATUS.OFFLINE, 'network offline');
  }

  var RealtimeHub = {
    version: VERSION,
    STATUS: STATUS,

    on: function (tables, handler, opts) {
      opts = opts || {};
      var list = Array.isArray(tables) ? tables.slice() : [tables];
      var id = opts.id || 'sub-' + (state.subs.length + 1);
      var sub = {
        id: id,
        tables: list,
        handler: typeof handler === 'function' ? handler : function () {},
        debounce: typeof opts.debounce === 'number' ? opts.debounce : 180,
        pollMs: typeof opts.pollMs === 'number' ? opts.pollMs : 0,
        debounceTimer: null
      };
      state.subs.push(sub);
      log('info', 'subscriber added', { id: id, tables: list.join(',') });
      return function unsubscribe() {
        if (sub.debounceTimer) clearTimeout(sub.debounceTimer);
        var idx = state.subs.indexOf(sub);
        if (idx >= 0) state.subs.splice(idx, 1);
        log('info', 'subscriber removed', { id: id });
      };
    },

    start: function () {
      if (state.started) return;
      state.started = true;
      document.addEventListener('visibilitychange', onVisibilityChange);
      global.addEventListener('online', onOnline);
      global.addEventListener('offline', onOffline);
      setStatus(STATUS.CONNECTING, 'starting');
      pollRound();
      startTimer();
      log('info', 'started', { version: VERSION, interval: currentInterval() });
    },

    stop: function () {
      if (!state.started) return;
      state.started = false;
      stopTimer();
      state.subs.forEach(function (sub) {
        if (sub.debounceTimer) clearTimeout(sub.debounceTimer);
      });
      document.removeEventListener('visibilitychange', onVisibilityChange);
      global.removeEventListener('online', onOnline);
      global.removeEventListener('offline', onOffline);
      setStatus(STATUS.STOPPED);
      log('info', 'stopped', {});
    },

    getStatus: function () { return state.status; },
    isConnected: function () { return state.status === STATUS.CONNECTED; },

    pollNow: function () { pollRound(); },

    mute: function (ms) {
      state.muteUntil = Date.now() + (typeof ms === 'number' ? ms : 800);
    },

    stats: function () {
      return {
        version: VERSION,
        status: state.status,
        interval: currentInterval(),
        subscribers: state.subs.length,
        tables: activeTables(),
        eventCount: state.eventCount,
        lastEventAt: state.lastEventAt,
        lastRoundAt: state.lastRoundAt
      };
    }
  };

  global.RealtimeHub = RealtimeHub;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { RealtimeHub.start(); });
  } else {
    RealtimeHub.start();
  }
})(window);
