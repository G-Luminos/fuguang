/* ================================================================
   棉花糖投稿 - Cotton Candy Submissions
   每周四粉丝念投稿功能
   独立模块，不影响其他功能
   - 匿名投稿（游客可投，仅管理员可看）
   - 全屏演示模式（自定义起始位置，周筛选，投屏区域）
   - 图片/视频点击放大
   - Loading 动画
   ================================================================ */

(function() {
  'use strict';

  /* ===== 配置 ===== */
  var MAX_TEXT = 1500;
  var MAX_TOTAL_MEDIA = 6;
  var MAX_IMAGE_SIZE = 5 * 1024 * 1024;
  var MAX_VIDEO_SIZE = 50 * 1024 * 1024;
  var STORAGE_BUCKET = 'cotton-media';
  var TABLE_NAME = 'cotton_posts';

  /* ===== 状态 ===== */
  var ccFiles = [];
  var ccSubmitting = false;
  var ccPosts = [];       // 当前筛选后的投稿列表
  var ccAllPosts = [];    // 全部投稿
  var ccCurrentIdx = 0;
  var ccPresentMode = false;
  var ccPresentStartIdx = 0; // 自定义起始位置
  var ccWeekFilter = '';     // 周筛选

  /* ===== Loading ===== */
  function showLoading() {
    var el = document.getElementById('ccLoading');
    if (el) el.classList.add('show');
  }
  function hideLoading() {
    var el = document.getElementById('ccLoading');
    if (el) el.classList.remove('show');
  }

  /* ===== DOM 引用 ===== */
  function $(id) { return document.getElementById(id) }

  /* ===== 打开/关闭 ===== */
  window.openCottonCandy = function() {
    if (!window.sb) return;
    resetForm();
    var isAdmin = window.role === 'admin';
    if (isAdmin) {
      $('ccTabList').style.display = '';
      switchTab('list');
    } else {
      $('ccTabList').style.display = 'none';
      switchTab('form');
    }
    $('ccOverlay').classList.add('show');
    if (isAdmin) loadPosts();
  };

  window.closeCottonCandy = function() {
    $('ccOverlay').classList.remove('show');
    cleanupPreviews();
    exitPresent();
  };

  /* ===== Tab ===== */
  function switchTab(tab) {
    var tabForm = $('ccTabForm');
    var tabList = $('ccTabList');
    var contentForm = $('ccContentForm');
    var contentList = $('ccContentList');
    if (tab === 'form') {
      tabForm.classList.add('active');
      tabList.classList.remove('active');
      contentForm.style.display = '';
      contentList.style.display = 'none';
    } else {
      tabForm.classList.remove('active');
      tabList.classList.add('active');
      contentForm.style.display = 'none';
      contentList.style.display = '';
      loadPosts();
    }
  }
  window.ccSwitchTab = function(t) { switchTab(t) };

  /* ===== 表单重置 ===== */
  function resetForm() {
    var ta = $('ccText');
    if (ta) ta.value = '';
    updateCharCount();
    ccFiles = [];
    cleanupPreviews();
    renderPreview();
    var btn = $('ccSubmit');
    if (btn) { btn.disabled = false; btn.textContent = '\u{1F48E} 投稿'; }
    ccSubmitting = false;
  }

  function cleanupPreviews() {
    ccFiles.forEach(function(f) { if (f.previewUrl) URL.revokeObjectURL(f.previewUrl); });
  }

  /* ===== 字数 ===== */
  function updateCharCount() {
    var ta = $('ccText'), cnt = $('ccCharCount');
    if (!ta || !cnt) return;
    var len = ta.value.length;
    cnt.textContent = len + '/' + MAX_TEXT;
    cnt.classList.toggle('over', len > MAX_TEXT);
  }

  /* ===== 文件选择 ===== */
  window.ccTriggerUpload = function() { $('ccFileInput').click() };

  window.ccOnFilesSelected = function(e) {
    var files = Array.from(e.target.files);
    if (!files.length) return;
    var remaining = MAX_TOTAL_MEDIA - ccFiles.length;
    if (remaining <= 0) { showToast('最多上传 ' + MAX_TOTAL_MEDIA + ' 个文件', 'e'); e.target.value = ''; return; }
    var toAdd = files.slice(0, remaining);
    for (var i = 0; i < toAdd.length; i++) {
      var file = toAdd[i];
      if (file.type.startsWith('image/')) {
        if (file.size > MAX_IMAGE_SIZE) { showToast('图片不能超过 5MB：' + file.name, 'e'); continue; }
        ccFiles.push({ file: file, type: 'image', previewUrl: URL.createObjectURL(file) });
      } else if (file.type.startsWith('video/')) {
        if (file.size > MAX_VIDEO_SIZE) { showToast('视频不能超过 50MB：' + file.name, 'e'); continue; }
        ccFiles.push({ file: file, type: 'video', previewUrl: URL.createObjectURL(file) });
      } else {
        showToast('不支持的文件类型：' + file.name, 'e');
      }
    }
    renderPreview();
    e.target.value = '';
  };

  /* ===== 渲染预览 ===== */
  function renderPreview() {
    var c = $('ccPreview');
    if (!c) return;
    c.innerHTML = '';
    ccFiles.forEach(function(item, idx) {
      var div = document.createElement('div');
      div.className = 'cc-preview-item';
      if (item.type === 'image') {
        div.innerHTML = '<img src="' + item.previewUrl + '" alt="预览"><button class="cc-remove" onclick="ccRemoveFile(' + idx + ')">\u2715</button>';
      } else {
        div.innerHTML = '<video src="' + item.previewUrl + '" muted></video><span class="cc-video-badge">视频</span><button class="cc-remove" onclick="ccRemoveFile(' + idx + ')">\u2715</button>';
      }
      c.appendChild(div);
    });
  }

  window.ccRemoveFile = function(idx) {
    if (ccFiles[idx] && ccFiles[idx].previewUrl) URL.revokeObjectURL(ccFiles[idx].previewUrl);
    ccFiles.splice(idx, 1);
    renderPreview();
  };

  /* ===== 上传媒体 ===== */
  async function uploadMedia(file, postId) {
    var ext = file.name.split('.').pop() || 'bin';
    var safeName = postId + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    var path = 'posts/' + safeName;
    var result = await window.sb.storage.from(STORAGE_BUCKET).upload(path, file, {
      cacheControl: '3600', upsert: false, contentType: file.type
    });
    if (result.error) return null;
    var urlData = window.sb.storage.from(STORAGE_BUCKET).getPublicUrl(path);
    return urlData.data ? urlData.data.publicUrl : null;
  }

  /* ===== 提交投稿 ===== */
  window.ccSubmit = async function() {
    if (ccSubmitting) return;
    var text = $('ccText').value.trim();
    if (!text && ccFiles.length === 0) { showToast('请输入文字或上传图片/视频', 'e'); return; }
    if (text.length > MAX_TEXT) { showToast('文字超过 ' + MAX_TEXT + ' 字限制', 'e'); return; }

    ccSubmitting = true;
    var btn = $('ccSubmit');
    btn.disabled = true;
    btn.innerHTML = '<span class="cc-loading-inline">\u23F3 小光正在努力...</span>';

    showLoading();
    try {
      var insertResult = await window.sb.from(TABLE_NAME).insert({
        content: text, media_urls: [], author_hash: generateAuthorHash()
      }).select().single();

      if (insertResult.error) { showToast('投稿失败，请稍后重试', 'e'); return; }

      var mediaUrls = [];
      for (var i = 0; i < ccFiles.length; i++) {
        var url = await uploadMedia(ccFiles[i].file, insertResult.data.id);
        if (url) mediaUrls.push(url);
      }

      if (mediaUrls.length > 0) {
        await window.sb.from(TABLE_NAME).update({ media_urls: mediaUrls }).eq('id', insertResult.data.id);
      }

      showToast('投稿成功 \u2728', 's');
      resetForm();
      if (window.role === 'admin') switchTab('list');
    } catch (err) {
      showToast('投稿失败，请稍后重试', 'e');
    } finally {
      ccSubmitting = false;
      hideLoading();
      btn.disabled = false;
      btn.textContent = '\u{1F48E} 投稿';
    }
  };

  /* ===== 匿名标识 ===== */
  function generateAuthorHash() {
    var hash = localStorage.getItem('cc_author');
    if (!hash) {
      hash = 'anon_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
      localStorage.setItem('cc_author', hash);
    }
    return hash;
  }

  /* ===== 周筛选工具 ===== */
  function getWeekRange(dateStr) {
    var d = new Date(dateStr);
    var day = d.getDay();
    var diff = d.getDate() - day + (day === 0 ? -6 : 1); // 周一为起始
    var mon = new Date(d.setDate(diff));
    var sun = new Date(mon);
    sun.setDate(mon.getDate() + 6);
    return {
      start: new Date(mon.getFullYear(), mon.getMonth(), mon.getDate()),
      end: new Date(sun.getFullYear(), sun.getMonth(), sun.getDate(), 23, 59, 59),
      label: formatDate(mon) + ' ~ ' + formatDate(sun)
    };
  }

  function formatDate(d) {
    return (d.getMonth() + 1) + '/' + d.getDate();
  }

  function getDistinctWeeks(posts) {
    var seen = {};
    var weeks = [];
    for (var i = 0; i < posts.length; i++) {
      var w = getWeekRange(posts[i].created_at);
      if (!seen[w.label]) {
        seen[w.label] = true;
        weeks.push(w);
      }
    }
    return weeks;
  }

  function filterByWeek(posts, weekLabel) {
    if (!weekLabel) return posts;
    return posts.filter(function(p) {
      var w = getWeekRange(p.created_at);
      return w.label === weekLabel;
    });
  }

  /* ===== 加载投稿（仅管理员） ===== */
  async function loadPosts() {
    var container = $('ccContentList');
    if (!container) return;
    container.innerHTML = '<div class="cc-empty"><div class="cc-loading-spinner"><p>\u23F3 小光正在努力...</p></div></div>';

    try {
      var result = await window.sb.from(TABLE_NAME).select('*').order('created_at', { ascending: false }).limit(200);
      if (result.error) {
        container.innerHTML = '<div class="cc-empty"><div class="cc-empty-icon">\uD83D\uDE14</div><p>加载失败，请重试</p></div>';
        return;
      }
      ccAllPosts = result.data || [];
      if (ccAllPosts.length === 0) {
        container.innerHTML = '<div class="cc-empty"><div class="cc-empty-icon">\u2709\uFE0F</div><p>还没有投稿</p></div>';
        return;
      }
      applyWeekFilter();
    } catch (err) {
      container.innerHTML = '<div class="cc-empty"><div class="cc-empty-icon">\uD83D\uDE14</div><p>加载失败</p></div>';
    }
  }

  /* ===== 应用周筛选 ===== */
  function applyWeekFilter() {
    ccPosts = filterByWeek(ccAllPosts, ccWeekFilter);
    renderPostList();
  }

  /* ===== 渲染投稿列表 ===== */
  function renderPostList() {
    var container = $('ccContentList');
    var isAdmin = window.role === 'admin';
    var html = '';

    if (isAdmin) {
      // 管理员栏：周筛选 + 计数 + 演示按钮
      var weeks = getDistinctWeeks(ccAllPosts);
      var weekOptions = '<option value="">全部时间</option>';
      for (var w = 0; w < weeks.length; w++) {
        var sel = ccWeekFilter === weeks[w].label ? ' selected' : '';
        weekOptions += '<option value="' + escHtml(weeks[w].label) + '"' + sel + '>第' + (w + 1) + '周 (' + escHtml(weeks[w].label) + ')</option>';
      }

      html += '<div class="cc-admin-bar">' +
        '<div class="cc-admin-left">' +
          '<select class="cc-week-select" onchange="ccChangeWeek(this.value)">' + weekOptions + '</select>' +
          '<span class="cc-admin-count">' + ccPosts.length + ' 条</span>' +
        '</div>' +
        '<button class="cc-present-btn" onclick="ccShowPresentDialog()">\uD83D\uDDA5\uFE0F 投屏演示</button>' +
      '</div>';
    }

    if (ccPosts.length === 0) {
      html += '<div class="cc-empty"><div class="cc-empty-icon">\u2709\uFE0F</div><p>该时间段暂无投稿</p></div>';
    } else {
      html += ccPosts.map(function(post, idx) {
        return renderPostCard(post, idx);
      }).join('');
    }

    container.innerHTML = html;
  }

  window.ccChangeWeek = function(val) {
    ccWeekFilter = val;
    applyWeekFilter();
  };

  /* ===== 渲染单条投稿 ===== */
  function renderPostCard(post, idx) {
    var time = formatTime(post.created_at);
    var mediaHtml = '';
    if (post.media_urls && post.media_urls.length > 0) {
      mediaHtml = '<div class="cc-card-media">' +
        post.media_urls.map(function(url) {
          var isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(url);
          if (isVideo) {
            return '<video src="' + escHtml(url) + '" controls preload="metadata" onclick="ccMediaFullscreen(this)"></video>';
          }
          return '<img src="' + escHtml(url) + '" alt="投稿图片" onclick="ccMediaFullscreen(this)" loading="lazy" onerror="this.style.display=\'none\'">';
        }).join('') +
      '</div>';
    }

    return '<div class="cc-card" data-idx="' + (idx !== undefined ? idx : '') + '">' +
      '<div class="cc-card-meta">' +
        '<div class="cc-card-author">' +
          '<div class="cc-card-avatar">\u2709\uFE0F</div>' +
          '<span class="cc-card-name">匿名棉花糖</span>' +
        '</div>' +
        '<span class="cc-card-time">' + time + '</span>' +
      '</div>' +
      (post.content ? '<div class="cc-card-text">' + escHtml(post.content) + '</div>' : '') +
      mediaHtml +
    '</div>';
  }

  /* ===== 媒体全屏查看 ===== */
  window.ccMediaFullscreen = function(el) {
    var lb = $('ccMediaView');
    if (!lb) return;
    var container = lb.querySelector('.cc-mv-content');
    if (el.tagName === 'VIDEO') {
      container.innerHTML = '<video src="' + el.src + '" controls autoplay style="max-width:90vw;max-height:80vh;border-radius:8px"></video>';
    } else {
      container.innerHTML = '<img src="' + el.src + '" alt="大图" style="max-width:90vw;max-height:80vh;object-fit:contain;border-radius:8px;cursor:zoom-out" onclick="ccCloseMediaView()">';
    }
    lb.classList.add('show');
  };

  window.ccCloseMediaView = function() {
    var lb = $('ccMediaView');
    if (!lb) return;
    lb.classList.remove('show');
    var container = lb.querySelector('.cc-mv-content');
    var v = container.querySelector('video');
    if (v) v.pause();
    container.innerHTML = '';
  };

  /* ===== 投屏演示 - 自定义起始位置 ===== */
  window.ccShowPresentDialog = function() {
    if (ccPosts.length === 0) { showToast('没有投稿可演示', 'e'); return; }

    // 如果只有少量投稿，直接开始
    if (ccPosts.length <= 5) {
      ccPresentStartIdx = 0;
      ccEnterPresent();
      return;
    }

    // 显示起始位置选择对话框
    var dialog = $('ccPresentDialog');
    if (!dialog) return;

    var select = dialog.querySelector('.cc-start-select');
    if (select) {
      select.innerHTML = '';
      for (var i = 0; i < ccPosts.length; i++) {
        var opt = document.createElement('option');
        opt.value = i;
        var p = ccPosts[i];
        var preview = (p.content || '').substring(0, 20);
        if (preview.length < (p.content || '').length) preview += '...';
        var t = formatTime(p.created_at);
        opt.textContent = '#' + (i + 1) + ' ' + t + ' - ' + preview;
        select.appendChild(opt);
      }
      select.value = '0';
    }
    dialog.classList.add('show');
  };

  window.ccConfirmPresent = function() {
    var dialog = $('ccPresentDialog');
    var select = dialog ? dialog.querySelector('.cc-start-select') : null;
    ccPresentStartIdx = select ? parseInt(select.value, 10) : 0;
    dialog.classList.remove('show');
    ccEnterPresent();
  };

  window.ccCancelPresentDialog = function() {
    var dialog = $('ccPresentDialog');
    if (dialog) dialog.classList.remove('show');
  };

  /* ===== 投屏演示模式 ===== */
  function ccEnterPresent() {
    ccCurrentIdx = ccPresentStartIdx;
    ccPresentMode = true;
    var el = $('ccPresent');
    el.classList.add('show');
    renderPresentSlide();
  }

  window.ccEnterPresent = ccEnterPresent;

  window.exitPresent = exitPresent;
  function exitPresent() {
    ccPresentMode = false;
    var el = $('ccPresent');
    if (el) el.classList.remove('show');
  }

  window.ccExitPresent = function() { exitPresent() };

  window.ccPrevSlide = function() {
    if (ccCurrentIdx > 0) { ccCurrentIdx--; renderPresentSlide(); }
  };

  window.ccNextSlide = function() {
    if (ccCurrentIdx < ccPosts.length - 1) { ccCurrentIdx++; renderPresentSlide(); }
  };

  function renderPresentSlide() {
    var post = ccPosts[ccCurrentIdx];
    if (!post) return;
    var counter = $('ccPresentCounter');
    var content = $('ccPresentContent');
    if (counter) counter.textContent = (ccCurrentIdx + 1) + ' / ' + ccPosts.length;

    var time = formatTime(post.created_at);
    var mediaHtml = '';
    if (post.media_urls && post.media_urls.length > 0) {
      mediaHtml = '<div class="cc-present-media">' +
        post.media_urls.map(function(url) {
          var isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(url);
          if (isVideo) {
            return '<video src="' + escHtml(url) + '" controls preload="metadata" onclick="ccPresentMediaFull(this)"></video>';
          }
          return '<img src="' + escHtml(url) + '" alt="投稿图片" onclick="ccPresentMediaFull(this)" loading="lazy" onerror="this.style.display=\'none\'">';
        }).join('') +
      '</div>';
    }

    content.innerHTML =
      '<div class="cc-present-card">' +
        '<div class="cc-present-meta">' +
          '<span class="cc-present-author">\u2709\uFE0F 匿名棉花糖</span>' +
          '<span class="cc-present-time">' + time + '</span>' +
        '</div>' +
        (post.content ? '<div class="cc-present-text">' + escHtml(post.content) + '</div>' : '') +
        mediaHtml +
      '</div>';

    // 投屏捕获区域更新
    updateCaptureArea();
  }

  /* ===== 投屏捕获区域 ===== */
  function updateCaptureArea() {
    var capture = $('ccCapture');
    if (!capture) return;
    var content = $('ccPresentContent');
    if (content) capture.innerHTML = content.innerHTML;
  }

  /* ===== 投屏媒体全屏 ===== */
  window.ccPresentMediaFull = function(el) {
    var lb = $('ccMediaView');
    if (!lb) return;
    var container = lb.querySelector('.cc-mv-content');
    if (el.tagName === 'VIDEO') {
      container.innerHTML = '<video src="' + el.src + '" controls autoplay style="max-width:90vw;max-height:80vh;border-radius:8px"></video>';
    } else {
      container.innerHTML = '<img src="' + el.src + '" alt="大图" style="max-width:90vw;max-height:80vh;object-fit:contain;border-radius:8px;cursor:zoom-out" onclick="ccCloseMediaView()">';
    }
    lb.classList.add('show');
  };

  /* ===== 键盘控制 ===== */
  document.addEventListener('keydown', function(e) {
    if (!ccPresentMode) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); ccPrevSlide(); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); ccNextSlide(); }
    else if (e.key === 'Escape') { exitPresent(); }
  });

  /* ===== 工具函数 ===== */
  function escHtml(s) { var d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML }

  function formatTime(iso) {
    if (!iso) return '';
    var d = new Date(iso), now = new Date(), diff = now - d;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
    if (diff < 604800000) return Math.floor(diff / 86400000) + ' 天前';
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function showToast(msg, type) {
    if (typeof toast === 'function') toast(msg, type);
    else {
      var tc = $('tc');
      if (!tc) return;
      var d = document.createElement('div');
      d.className = 'to ' + (type === 's' ? 's' : type === 'e' ? 'e' : 'i');
      d.textContent = msg;
      tc.appendChild(d);
      setTimeout(function() { d.remove() }, 3000);
    }
  }

  /* ===== 初始化 ===== */
  document.addEventListener('DOMContentLoaded', function() {
    var ta = $('ccText');
    if (ta) {
      ta.addEventListener('input', updateCharCount);
      ta.setAttribute('maxlength', MAX_TEXT + 100);
    }
  });

})();
