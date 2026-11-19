/* ================================================================
   浮光-Luminos 云服务接入层 (cloud-config.js)
   ---------------------------------------------------------------
   原应用使用 Supabase（项目已被暂停/回收，域名不可解析），现已迁移到
   WorkBuddy 云服务。本文件负责：

   1. 初始化 WorkBuddy 云客户端（Database / Auth / Storage / LLM 共用）
   2. 暴露与 supabase-js 同形的 window.sb 兼容层，业务代码零改动
      - sb.from(table).select()/insert()/update()/delete()/upsert()
      - 返回结构同样是 { data, error }
   3. SDK 加载失败时自动重新加载一次，并给出可读的错误提示

   注意：新后端不提供对象存储的「公开桶」，媒体文件改为内嵌到数据库
   （见 media-util.js），因此兼容层不再提供 storage 接口。
   ================================================================ */
(function (global) {
  'use strict';

  var CONFIG = {
    endpoint: 'https://fuguang-luminos.app.workbuddy.host',
    publishableKey: 'wbpk_mT8nq5xvmBV3Doioqn4lCd_Mnldeo7jeJs2M7ZYIEd1Kp6Ne06e13h9',
    oauthRelayBaseUrl: 'https://www.workbuddy.cn/v2/as/genie-baas/oauth'
  };

  // 锁定精确版本：@dev 这类浮动标签一旦上游发版，全站可能直接白屏且无预警
  // 升级时手动改这里的版本号，并回归验证（登录/读写/投稿）
  // 多 CDN 兜底：jsDelivr 在国内偶发不可达，失败后自动换 unpkg，避免整站停在"加载中"
  var SDK_VERSION = '0.1.4';
  var SDK_PATH = '/npm/@tencent-ai/workbuddy-cloud-sdk@' + SDK_VERSION + '/lib/index.global.js';
  var SDK_URLS = [
    'https://cdn.jsdelivr.net' + SDK_PATH,
    'https://unpkg.com/@tencent-ai/workbuddy-cloud-sdk@' + SDK_VERSION + '/lib/index.global.js'
  ];
  // index.html 已经加载过第一个地址，兜底从第二个开始
  var sdkIdx = 1;

  var state = {
    client: null,
    bridge: null,
    error: null
  };

  var waiters = [];

  function log(level, message, extra) {
    var payload = { module: 'CloudConfig', level: level, msg: message };
    if (extra) {
      Object.keys(extra).forEach(function (k) { payload[k] = extra[k]; });
    }
    try {
      if (level === 'error' && console.error) console.error(JSON.stringify(payload));
      else if (level === 'warn' && console.warn) console.warn(JSON.stringify(payload));
      else if (console.log) console.log(JSON.stringify(payload));
    } catch (e) { /* 忽略 */ }
  }

  /* ---------- 安装 supabase 兼容层 ---------- */
  function installBridge(client) {
    var bridge = {
      from: function (table) { return client.database.from(table); },
      rpc: function () {
        return client.database.rpc.apply(client.database, arguments);
      }
    };

    global.WBCloud = client;
    global.sb = bridge;
    state.client = client;
    state.bridge = bridge;

    log('info', 'cloud client ready', { endpoint: CONFIG.endpoint });
    flushWaiters();
  }

  function flushWaiters() {
    var list = waiters.slice();
    waiters.length = 0;
    list.forEach(function (fn) {
      try { fn(state.client); } catch (e) { log('error', 'waiter threw', { error: String(e && e.message || e) }); }
    });
  }

  function buildClient() {
    if (!global.WorkBuddyCloud || typeof global.WorkBuddyCloud.createWorkBuddyCloud !== 'function') {
      return null;
    }
    try {
      return global.WorkBuddyCloud.createWorkBuddyCloud({
        endpoint: CONFIG.endpoint,
        oauthRelayBaseUrl: CONFIG.oauthRelayBaseUrl,
        publishableKey: CONFIG.publishableKey
      });
    } catch (e) {
      state.error = e;
      log('error', 'create client failed', { error: String(e && e.message || e) });
      return null;
    }
  }

  /* ---------- SDK 未就绪时按 CDN 列表依次兜底重载 ---------- */
  function reloadSdk() {
    if (sdkIdx >= SDK_URLS.length) {
      log('error', 'sdk unavailable on all cdns', { tried: SDK_URLS });
      return;
    }
    var url = SDK_URLS[sdkIdx];
    log('warn', 'sdk missing, loading fallback', { url: url, attempt: sdkIdx + 1 });
    try {
      var s = document.createElement('script');
      s.src = url;
      s.async = true;
      s.onload = function () {
        var c = buildClient();
        if (c) { installBridge(c); return; }
        sdkIdx++;
        reloadSdk();
      };
      s.onerror = function () {
        log('error', 'sdk load failed', { url: url });
        sdkIdx++;
        reloadSdk();
      };
      document.head.appendChild(s);
    } catch (e) {
      log('error', 'sdk reload threw', { error: String(e && e.message || e) });
      sdkIdx++;
      reloadSdk();
    }
  }

  /* ---------- 初始化 ---------- */
  var client = buildClient();
  if (client) {
    installBridge(client);
  } else {
    log('warn', 'WorkBuddyCloud global not found at load time', {});
    reloadSdk();
  }

  /* ---------- 对外接口 ---------- */
  global.CloudConfig = CONFIG;

  global.getCloudClient = function () { return state.client; };

  /** 等待客户端就绪（已就绪则立即回调） */
  global.whenCloudReady = function (fn) {
    if (typeof fn !== 'function') return;
    if (state.client) return fn(state.client);
    waiters.push(fn);
  };

  /** 返回 Promise，便于 await */
  global.cloudReady = function () {
    return new Promise(function (resolve) {
      whenCloudReady(resolve);
    });
  };

  /** 供业务层展示的可读错误 */
  global.getCloudError = function () {
    return state.error ? String(state.error.message || state.error) : '';
  };

  log('info', 'cloud-config loaded', { hasClient: !!state.client });
})(window);
