/* ================================================================
   浮光-Luminos 实时绑定层 (realtime-binding.js)
   ---------------------------------------------------------------
   把 RealtimeHub 收到的表变更事件，映射到各业务模块的刷新函数。
   单独成文件，避免在业务模块里散落订阅代码，便于维护与关闭。

   依赖：realtime.js（须先加载）、各业务脚本（须先加载）
   ================================================================ */
(function () {
  'use strict';

  function ready() {
    return typeof window.RealtimeHub !== 'undefined';
  }

  // 等待 RealtimeHub 就绪（脚本加载顺序兜底）
  function whenReady(cb) {
    if (ready()) return cb();
    var tries = 0;
    var t = setInterval(function () {
      if (ready()) { clearInterval(t); cb(); }
      else if (++tries > 40) { clearInterval(t); } // ~10s 后放弃
    }, 250);
  }

  whenReady(function () {
    var Hub = window.RealtimeHub;

    /* ---------- 1. 舰长记录 records ----------
       管理员：刷新统计卡片 + 记录列表
       游客：仅刷新自己的记录列表（render 内部已按 guestName 过滤） */
    Hub.on(['records'], function () {
      try {
        if (window.role === 'admin' && typeof renderStats === 'function') renderStats();
        if (typeof render === 'function') render();
      } catch (e) {
        console.warn('[Realtime] records refresh error', e);
      }
    }, { id: 'records', debounce: 250 });

    /* ---------- 2. 续舰名单 renew_captains ----------
       首页名字墙始终刷新；若"续舰名单管理"弹窗打开，一并刷新列表 */
    Hub.on(['renew_captains'], function () {
      try {
        if (typeof window.loadNameWall === 'function') window.loadNameWall();
        var rm = document.getElementById('rm');
        if (rm && rm.classList.contains('show') && typeof renderRenewAdmin === 'function') {
          renderRenewAdmin();
        }
      } catch (e) {
        console.warn('[Realtime] renew_captains refresh error', e);
      }
    }, { id: 'renew_captains', debounce: 200 });

    /* ---------- 3. 匿名投稿 cotton_posts ----------
       仅当投稿弹窗打开且管理员处于"看投稿"页时刷新，避免无谓查询 */
    Hub.on(['cotton_posts'], function () {
      try {
        if (typeof window.ccRealtimeRefresh === 'function') window.ccRealtimeRefresh();
      } catch (e) {
        console.warn('[Realtime] cotton_posts refresh error', e);
      }
    }, { id: 'cotton_posts', debounce: 300 });

    /* ---------- 4. 往期舰礼 gift_images ----------
       舰礼弹窗打开时重新加载并渲染 */
    Hub.on(['gift_images'], function () {
      try {
        var m = document.getElementById('giftModal');
        if (m && m.classList.contains('show') && typeof window.giftRealtimeRefresh === 'function') {
          window.giftRealtimeRefresh();
        }
      } catch (e) {
        console.warn('[Realtime] gift_images refresh error', e);
      }
    }, { id: 'gift_images', debounce: 250 });

    /* ---------- 5. 歌单 playlists / playlist_songs ----------
       歌单弹窗打开时，交由 playlist.js 的全局钩子刷新（若提供） */
    Hub.on(['playlists', 'playlist_songs'], function () {
      try {
        if (typeof window.plRealtimeRefresh === 'function') window.plRealtimeRefresh();
      } catch (e) {
        console.warn('[Realtime] playlist refresh error', e);
      }
    }, { id: 'playlists', debounce: 300 });

    /* ---------- 6. 大富翁棋盘 monopoly_boards ----------
       静默刷新云端缓存，不打断正在进行中的游戏 */
    Hub.on(['monopoly_boards'], function () {
      try {
        if (typeof window.gmMonoRealtimeRefresh === 'function') window.gmMonoRealtimeRefresh();
      } catch (e) {
        console.warn('[Realtime] monopoly_boards refresh error', e);
      }
    }, { id: 'monopoly_boards', debounce: 400 });

    console.log('[Realtime] bindings registered');
  });
})();
