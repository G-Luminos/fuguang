/* ================================================================
   形象管理（管理员）—— 桌宠姿态 + 图鉴皮肤
   ---------------------------------------------------------------
   入口：管理员首页「🎨 形象」按钮。
   上传的图片压缩到 512px / ~260KB 后写入云端 shuke_assets，
   全端下次打开自动换（本机有缓存，变了才重新下载）。
   ================================================================ */
(function () {
  'use strict';

  var PET_LIST = [
    { id: 'pet_idle', name: '待机 · 乖巧坐姿' },
    { id: 'pet_happy', name: '开心 · 蹦跳' },
    { id: 'pet_sleep', name: '睡觉 · 蜷缩' },
    { id: 'pet_talk', name: '说话 · 打招呼' },
    { id: 'pet_love', name: '摸头 · 享受' }
  ];
  var SKIN_LIST = [
    { id: 'skin_s_01', name: '原初舒克' },
    { id: 'skin_s_02', name: '星空舒克' },
    { id: 'skin_s_07', name: '雾凇舒克' },
    { id: 'skin_s_03', name: '樱花舒克' },
    { id: 'skin_s_04', name: '赛博舒克' },
    { id: 'skin_s_08', name: '熔岩舒克' },
    { id: 'skin_s_05', name: '金龙舒克' },
    { id: 'skin_s_09', name: '星穹舒克' },
    { id: 'skin_s_10', name: '微光舒克' }
  ];

  function esc(s) { var d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

  function rowHtml(item, kind) {
    var url = window.ShukeAssets && window.ShukeAssets.get(item.id);
    return '<div class="am-row" data-id="' + item.id + '">' +
      '<div class="am-preview">' + (url ? '<img src="' + url + '">' : '<span class="am-ph">🐈</span>') + '</div>' +
      '<div class="am-info"><b>' + esc(item.name) + '</b><small>' + esc(item.id) + (url ? '' : ' · 未设置') + '</small></div>' +
      '<button class="am-up" data-id="' + item.id + '" data-kind="' + kind + '" data-name="' + esc(item.name) + '">更换</button>' +
    '</div>';
  }

  function render() {
    var body = document.getElementById('amBody');
    if (!body) return;
    body.innerHTML =
      '<div class="am-sec">🐈 桌宠姿态</div>' +
      PET_LIST.map(function (x) { return rowHtml(x, 'pet'); }).join('') +
      '<div class="am-sec">📖 图鉴皮肤</div>' +
      SKIN_LIST.map(function (x) { return rowHtml(x, 'skin'); }).join('');
    body.querySelectorAll('.am-up').forEach(function (btn) {
      btn.onclick = function () { pickImage(btn.dataset.id, btn.dataset.kind, btn.dataset.name); };
    });
  }

  function pickImage(id, kind, name) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = function () {
      var f = input.files && input.files[0];
      if (!f) return;
      if (!window.MediaUtil) { toast('图片组件没准备好'); return; }
      showLoading('⏳ 处理图片中...');
      window.MediaUtil.blobToDataUrl(f, { maxDim: 512, maxBytes: 260000 }).then(function (dataUrl) {
        return window.ShukeAssets.save(id, kind, name, dataUrl);
      }).then(function (r) {
        hideLoading();
        if (r && r.ok) {
          toast('已更新「' + name + '」 ✅', 's');
          render();
          if (window.ShukePet && window.ShukePet.refresh) window.ShukePet.refresh();
        } else {
          toast('保存失败：' + ((r && r.error) || '未知错误'), 'e');
        }
      }).catch(function (e) {
        hideLoading();
        toast('处理失败：' + (e && e.message || ''), 'e');
      });
    };
    input.click();
  }

  window.openAssetAdmin = function () {
    if (window.role !== 'admin') { toast('只有管理员能改形象', 'e'); return; }
    var m = document.getElementById('am');
    if (!m) return;
    render();
    m.classList.add('show');
  };
  window.closeAssetAdmin = function () {
    var m = document.getElementById('am');
    if (m) m.classList.remove('show');
  };
})();
