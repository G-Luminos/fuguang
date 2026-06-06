/* ================================================================
   棉花糖投稿 - Cotton Candy Submissions
   每周四粉丝念投稿功能
   独立模块，不影响其他功能
   ================================================================ */

(function() {
  'use strict';

  /* ===== 配置 ===== */
  const MAX_TEXT = 1500;            // 文字字数上限
  const MAX_IMAGES = 6;             // 图片数量上限
  const MAX_IMAGE_SIZE = 5 * 1024 * 1024;  // 单张图片 5MB
  const MAX_VIDEO_SIZE = 50 * 1024 * 1024;  // 单个视频 50MB
  const MAX_TOTAL_MEDIA = 6;        // 图片+视频总数上限
  const STORAGE_BUCKET = 'cotton-media';  // Supabase Storage 桶名
  const TABLE_NAME = 'cotton_posts';      // Supabase 表名

  /* ===== 状态 ===== */
  let ccFiles = [];    // 待上传文件列表 [{file, type, previewUrl}]
  let ccSubmitting = false;

  /* ===== DOM 引用 ===== */
  function getOverlay() { return document.getElementById('ccOverlay') }
  function getTabForm() { return document.getElementById('ccTabForm') }
  function getTabList() { return document.getElementById('ccTabList') }
  function getContentForm() { return document.getElementById('ccContentForm') }
  function getContentList() { return document.getElementById('ccContentList') }
  function getTextarea() { return document.getElementById('ccText') }
  function getCharCount() { return document.getElementById('ccCharCount') }
  function getPreview() { return document.getElementById('ccPreview') }
  function getUploadArea() { return document.getElementById('ccUploadArea') }
  function getFileInput() { return document.getElementById('ccFileInput') }
  function getSubmitBtn() { return document.getElementById('ccSubmit') }

  /* ===== 打开/关闭 ===== */
  window.openCottonCandy = function() {
    if (!window.sb) {
      if (typeof supabase !== 'undefined') {
        window.sb = supabase.createClient(
          document.querySelector('script[src*="supabase"]') ? 'https://yiexaopgxcroktltjqoz.supabase.co' : '',
          ''
        );
      }
    }
    resetForm();
    switchTab('form');
    getOverlay().classList.add('show');
    loadPosts();
  };

  window.closeCottonCandy = function() {
    getOverlay().classList.remove('show');
    cleanupPreviews();
  };

  /* ===== Tab 切换 ===== */
  function switchTab(tab) {
    const tabForm = getTabForm();
    const tabList = getTabList();
    const contentForm = getContentForm();
    const contentList = getContentList();
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

  window.ccSwitchTab = function(tab) { switchTab(tab) };

  /* ===== 表单重置 ===== */
  function resetForm() {
    if (getTextarea()) getTextarea().value = '';
    updateCharCount();
    ccFiles = [];
    cleanupPreviews();
    renderPreview();
    if (getSubmitBtn()) getSubmitBtn().disabled = false;
    ccSubmitting = false;
  }

  function cleanupPreviews() {
    ccFiles.forEach(f => {
      if (f.previewUrl) URL.revokeObjectURL(f.previewUrl);
    });
  }

  /* ===== 字数统计 ===== */
  function updateCharCount() {
    const ta = getTextarea();
    const cnt = getCharCount();
    if (!ta || !cnt) return;
    const len = ta.value.length;
    cnt.textContent = len + '/' + MAX_TEXT;
    cnt.classList.toggle('over', len > MAX_TEXT);
  }

  /* ===== 文件选择 ===== */
  window.ccTriggerUpload = function() {
    getFileInput().click();
  };

  window.ccOnFilesSelected = function(e) {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    // 检查总数
    const remaining = MAX_TOTAL_MEDIA - ccFiles.length;
    if (remaining <= 0) {
      showToast('最多上传 ' + MAX_TOTAL_MEDIA + ' 个文件', 'e');
      e.target.value = '';
      return;
    }

    const toAdd = files.slice(0, remaining);

    for (const file of toAdd) {
      if (file.type.startsWith('image/')) {
        if (file.size > MAX_IMAGE_SIZE) {
          showToast('图片不能超过 5MB：' + file.name, 'e');
          continue;
        }
        ccFiles.push({
          file,
          type: 'image',
          previewUrl: URL.createObjectURL(file)
        });
      } else if (file.type.startsWith('video/')) {
        if (file.size > MAX_VIDEO_SIZE) {
          showToast('视频不能超过 50MB：' + file.name, 'e');
          continue;
        }
        ccFiles.push({
          file,
          type: 'video',
          previewUrl: URL.createObjectURL(file)
        });
      } else {
        showToast('不支持的文件类型：' + file.name, 'e');
      }
    }

    renderPreview();
    e.target.value = '';
  };

  /* ===== 渲染预览 ===== */
  function renderPreview() {
    const container = getPreview();
    if (!container) return;
    container.innerHTML = '';

    ccFiles.forEach((item, idx) => {
      const div = document.createElement('div');
      div.className = 'cc-preview-item';

      if (item.type === 'image') {
        div.innerHTML = '<img src="' + item.previewUrl + '" alt="预览">' +
          '<button class="cc-remove" onclick="ccRemoveFile(' + idx + ')">✕</button>';
      } else {
        div.innerHTML = '<video src="' + item.previewUrl + '" muted></video>' +
          '<span class="cc-video-badge">视频</span>' +
          '<button class="cc-remove" onclick="ccRemoveFile(' + idx + ')">✕</button>';
      }
      container.appendChild(div);
    });
  }

  /* ===== 删除文件 ===== */
  window.ccRemoveFile = function(idx) {
    if (ccFiles[idx] && ccFiles[idx].previewUrl) {
      URL.revokeObjectURL(ccFiles[idx].previewUrl);
    }
    ccFiles.splice(idx, 1);
    renderPreview();
  };

  /* ===== 上传媒体到 Supabase Storage ===== */
  async function uploadMedia(file, postId) {
    const ext = file.name.split('.').pop() || 'bin';
    const safeName = postId + '_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    const path = 'posts/' + safeName;

    const { data, error } = await window.sb
      .storage
      .from(STORAGE_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (error) {
      console.error('Upload media error:', error);
      return null;
    }

    // 获取公开 URL
    const { data: urlData } = window.sb
      .storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);

    return urlData?.publicUrl || null;
  }

  /* ===== 提交投稿 ===== */
  window.ccSubmit = async function() {
    if (ccSubmitting) return;

    const text = getTextarea().value.trim();
    if (!text && ccFiles.length === 0) {
      showToast('请输入文字或上传图片/视频', 'e');
      return;
    }
    if (text.length > MAX_TEXT) {
      showToast('文字超过 ' + MAX_TEXT + ' 字限制', 'e');
      return;
    }

    ccSubmitting = true;
    getSubmitBtn().disabled = true;
    getSubmitBtn().textContent = '投稿中...';

    try {
      // 先插入记录获取 ID
      const { data: post, error: insertErr } = await window.sb
        .from(TABLE_NAME)
        .insert({
          content: text,
          media_urls: [],
          author_hash: generateAuthorHash()
        })
        .select()
        .single();

      if (insertErr) {
        console.error('Insert post error:', insertErr);
        showToast('投稿失败，请稍后重试', 'e');
        return;
      }

      // 上传媒体文件
      const mediaUrls = [];
      for (const item of ccFiles) {
        const url = await uploadMedia(item.file, post.id);
        if (url) mediaUrls.push(url);
      }

      // 更新记录添加媒体 URL
      if (mediaUrls.length > 0) {
        const { error: updateErr } = await window.sb
          .from(TABLE_NAME)
          .update({ media_urls: mediaUrls })
          .eq('id', post.id);
        if (updateErr) console.error('Update media URLs error:', updateErr);
      }

      showToast('投稿成功 🎉', 's');
      resetForm();
      switchTab('list');

    } catch (err) {
      console.error('Submit error:', err);
      showToast('投稿失败，请稍后重试', 'e');
    } finally {
      ccSubmitting = false;
      getSubmitBtn().disabled = false;
      getSubmitBtn().textContent = '🍬 投稿';
    }
  };

  /* ===== 生成匿名作者标识 ===== */
  function generateAuthorHash() {
    // 使用 localStorage 存储一个随机标识，用于区分不同匿名用户
    let hash = localStorage.getItem('cc_author');
    if (!hash) {
      hash = 'anon_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
      localStorage.setItem('cc_author', hash);
    }
    return hash;
  }

  /* ===== 加载投稿列表 ===== */
  async function loadPosts() {
    const container = getContentList();
    if (!container) return;

    container.innerHTML = '<div class="cc-empty"><div class="cc-empty-icon">🍬</div><p>加载中...</p></div>';

    try {
      // 查询最近的投稿，按时间倒序，限制50条
      const { data: posts, error } = await window.sb
        .from(TABLE_NAME)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        console.error('Load posts error:', error);
        container.innerHTML = '<div class="cc-empty"><div class="cc-empty-icon">😔</div><p>加载失败，请重试</p></div>';
        return;
      }

      if (!posts || posts.length === 0) {
        container.innerHTML = '<div class="cc-empty"><div class="cc-empty-icon">🍬</div><p>还没有投稿，来写第一条吧~</p></div>';
        return;
      }

      container.innerHTML = posts.map(renderPostCard).join('');

    } catch (err) {
      console.error('Load posts error:', err);
      container.innerHTML = '<div class="cc-empty"><div class="cc-empty-icon">😔</div><p>加载失败</p></div>';
    }
  }

  /* ===== 渲染单条投稿卡片 ===== */
  function renderPostCard(post) {
    const time = formatTime(post.created_at);
    const avatar = '🍬';
    const name = '匿名棉花糖';

    let mediaHtml = '';
    if (post.media_urls && post.media_urls.length > 0) {
      mediaHtml = '<div class="cc-card-media">' +
        post.media_urls.map(url => {
          if (url.match(/\.(mp4|webm|mov)(\?|$)/i)) {
            return '<video src="' + escHtml(url) + '" controls preload="metadata" style="width:180px;height:120px;border-radius:8px;object-fit:cover"></video>';
          }
          return '<img src="' + escHtml(url) + '" alt="投稿图片" onclick="ccLightbox(this.src)" loading="lazy">';
        }).join('') +
        '</div>';
    }

    return '<div class="cc-card">' +
      '<div class="cc-card-meta">' +
        '<div class="cc-card-author">' +
          '<div class="cc-card-avatar">' + avatar + '</div>' +
          '<span class="cc-card-name">' + name + '</span>' +
        '</div>' +
        '<span class="cc-card-time">' + time + '</span>' +
      '</div>' +
      (post.content ? '<div class="cc-card-text">' + escHtml(post.content) + '</div>' : '') +
      mediaHtml +
    '</div>';
  }

  /* ===== 灯箱 ===== */
  window.ccLightbox = function(src) {
    const lb = document.getElementById('ccLightbox');
    const img = lb.querySelector('img');
    img.src = src;
    lb.classList.add('show');
  };

  window.ccCloseLightbox = function() {
    const lb = document.getElementById('ccLightbox');
    lb.classList.remove('show');
  };

  /* ===== 工具函数 ===== */
  function escHtml(s) {
    const d = document.createElement('div');
    d.textContent = s || '';
    return d.innerHTML;
  }

  function formatTime(iso) {
    if (!iso) return '';
    const d = new Date(iso);
    const now = new Date();
    const diff = now - d;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + ' 分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + ' 小时前';
    if (diff < 604800000) return Math.floor(diff / 86400000) + ' 天前';
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function showToast(msg, type) {
    // 复用主应用的 toast 函数
    if (typeof toast === 'function') {
      toast(msg, type);
    } else {
      // 降级方案
      const tc = document.getElementById('tc');
      if (!tc) return;
      const d = document.createElement('div');
      d.className = 'to ' + (type === 's' ? 's' : type === 'e' ? 'e' : 'i');
      d.textContent = msg;
      tc.appendChild(d);
      setTimeout(() => d.remove(), 3000);
    }
  }

  /* ===== 初始化事件绑定 ===== */
  document.addEventListener('DOMContentLoaded', function() {
    const ta = getTextarea();
    if (ta) {
      ta.addEventListener('input', updateCharCount);
      ta.setAttribute('maxlength', MAX_TEXT + 100); // 允许少量超出以显示提示
    }
  });

})();
