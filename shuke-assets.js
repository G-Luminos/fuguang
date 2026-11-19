/* ================================================================
   舒克形象库 —— 共享给桌宠与养成页
   ---------------------------------------------------------------
   图片来源优先级：本机缓存 → 云端 shuke_assets 表 → 默认兜底。
   管理员在「形象管理」里上传后会写库，所有端下次进来自动换。
   ================================================================ */
(function (global) {
  'use strict';

  var CACHE_KEY = 'shuke_assets_cache_v1';
  var META_KEY = 'shuke_assets_meta_v1';
  var cache = {};
  var meta = {};   // id -> updated_at

  try { cache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}'); } catch (e) {}
  try { meta = JSON.parse(localStorage.getItem(META_KEY) || '{}'); } catch (e) {}

  function persist() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
      localStorage.setItem(META_KEY, JSON.stringify(meta));
    } catch (e) {
      // 存不下就清掉重来
      try { localStorage.removeItem(CACHE_KEY); localStorage.removeItem(META_KEY); } catch (e2) {}
      cache = {}; meta = {};
    }
  }

  /** 取某个形象（没加载就返回 null，由调用方兜底） */
  function get(id) { return cache[id] || null; }

  /** 从云端拉元信息，变了才下载图 */
  function refresh(onDone) {
    if (!window.sb) { if (onDone) onDone(); return; }
    window.sb.from('shuke_assets').select('id,updated_at').then(function (r) {
      var rows = (r && r.data) || [];
      var stale = rows.filter(function (row) { return meta[row.id] !== row.updated_at; }).map(function (row) { return row.id; });
      if (!stale.length) { if (onDone) onDone(); return; }
      // 只拉变了的
      Promise.all(stale.map(function (id) {
        return window.sb.from('shuke_assets').select('id,image,updated_at').eq('id', id).single().then(function (rr) {
          if (rr && rr.data && rr.data.image) {
            cache[rr.data.id] = rr.data.image;
            meta[rr.data.id] = rr.data.updated_at;
          }
        }).catch(function () {});
      })).then(function () {
        persist();
        if (onDone) onDone();
      });
    }).catch(function () { if (onDone) onDone(); });
  }

  /** 管理员上传（走口令通道） */
  function save(id, kind, name, dataUrl) {
    if (!window.adminRpc) return Promise.resolve({ ok: false, error: '通道未就绪' });
    return window.adminRpc('asset_save', { p_id: id, p_kind: kind, p_name: name, p_image: dataUrl }).then(function (r) {
      if (r && r.ok) {
        cache[id] = dataUrl;
        meta[id] = new Date().toISOString();
        persist();
      }
      return r;
    });
  }

  /** 列出云端所有形象的元信息（管理台用） */
  function listRemote() {
    if (!window.sb) return Promise.resolve([]);
    return window.sb.from('shuke_assets').select('id,kind,name,updated_at').order('id').then(function (r) {
      return (r && r.data) || [];
    }).catch(function () { return []; });
  }

  global.ShukeAssets = { get: get, refresh: refresh, save: save, listRemote: listRemote };
})(window);
