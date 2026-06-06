/* ================================================================
   歌单展示 - Playlist Viewer (V2 - 静态数据版)
   本地歌曲数据 + 分类展示 + 随机歌曲 + 搜索
   不再依赖酷狗分享链接或 Supabase 歌单表
   ================================================================ */

(function() {
  'use strict';

  /* ===== 状态 ===== */
  var plSongs = [];
  var plFiltered = [];
  var plActiveTag = 'all';
  var plSearchQuery = '';
  var plSortBy = 'name';
  var plSortAsc = true;
  var plPage = 1;
  var plPageSize = 50;
  var plRandomSong = null;
  var plLoaded = false;

  function $(id) { return document.getElementById(id); }

  /* ===== 打开歌单 ===== */
  window.openPlaylist = function() {
    var overlay = $('plOverlay');
    if (overlay) {
      overlay.classList.add('show');
      if (!plLoaded) loadSongs();
      else renderPlaylist();
    }
  };

  window.closePlaylist = function() {
    var overlay = $('plOverlay');
    if (overlay) overlay.classList.remove('show');
    closeRandomSong();
  };

  /* ===== 加载歌曲数据 ===== */
  function loadSongs() {
    var body = $('plBody');
    if (!body) return;
    body.innerHTML = '<div class="pl-loading show"><div class="pl-spinner"></div><div>🎵 加载歌单中...</div></div>';
    if (typeof SONGS_DATA === 'undefined') {
      var script = document.createElement('script');
      script.src = 'songs_data.js';
      script.onload = function() { initSongs(); };
      script.onerror = function() {
        body.innerHTML = '<div class="pl-empty"><div class="pl-empty-icon">😵</div><div class="pl-empty-text">歌单数据加载失败</div></div>';
      };
      document.head.appendChild(script);
    } else {
      initSongs();
    }
  }

  function initSongs() {
    plSongs = SONGS_DATA || [];
    plLoaded = true;
    renderPlaylist();
  }

  /* ===== 渲染主界面 ===== */
  function renderPlaylist() {
    var body = $('plBody');
    if (!body) return;
    applyFilter();
    var html = '';

    html += '<div class="pl-stats-bar">';
    html += '<span class="pl-total">🎵 共 ' + plSongs.length + ' 首</span>';
    html += '<span class="pl-filtered">' + (plActiveTag !== 'all' || plSearchQuery ? '显示 ' + plFiltered.length + ' 首' : '') + '</span>';
    html += '</div>';

    html += '<div class="pl-search">';
    html += '<input type="text" id="plSearchInput" placeholder="搜索歌曲/歌手/专辑..." value="' + escAttr(plSearchQuery) + '" oninput="plOnSearch(this.value)">';
    html += '</div>';

    html += '<div class="pl-tags">';
    if (typeof SONG_TAGS !== 'undefined') {
      for (var i = 0; i < SONG_TAGS.length; i++) {
        var tag = SONG_TAGS[i];
        var cls = plActiveTag === tag.key ? ' active' : '';
        html += '<button class="pl-tag' + cls + '" onclick="plSetTag(\'' + tag.key + '\')">';
        html += tag.icon + ' ' + tag.label;
        html += '</button>';
      }
    }
    html += '</div>';

    html += '<div class="pl-sort-bar">';
    html += '<span>排序：</span>';
    html += '<button class="pl-sort-btn' + (plSortBy === 'name' ? ' active' : '') + '" onclick="plSetSort(\'name\')">歌名</button>';
    html += '<button class="pl-sort-btn' + (plSortBy === 'artist' ? ' active' : '') + '" onclick="plSetSort(\'artist\')">歌手</button>';
    html += '<button class="pl-sort-btn' + (plSortBy === 'bpm' ? ' active' : '') + '" onclick="plSetSort(\'bpm\')">BPM</button>';
    html += '<button class="pl-random-btn-inline" onclick="plRandomPick()">🎲 随机</button>';
    html += '</div>';

    if (plFiltered.length === 0) {
      html += '<div class="pl-empty"><div class="pl-empty-icon">🔍</div><div class="pl-empty-text">没有匹配的歌曲</div></div>';
    } else {
      var start = (plPage - 1) * plPageSize;
      var end = Math.min(start + plPageSize, plFiltered.length);
      var pageSongs = plFiltered.slice(start, end);

      html += '<div class="pl-song-list">';
      for (var i = 0; i < pageSongs.length; i++) {
        html += renderSongItem(pageSongs[i], start + i + 1);
      }
      html += '</div>';

      if (plFiltered.length > plPageSize) {
        var totalPages = Math.ceil(plFiltered.length / plPageSize);
        html += '<div class="pl-pagination">';
        if (plPage > 1) html += '<button class="pl-page-btn" onclick="plSetPage(' + (plPage - 1) + ')">‹ 上一页</button>';
        html += '<span class="pl-page-info">' + plPage + ' / ' + totalPages + '</span>';
        if (plPage < totalPages) html += '<button class="pl-page-btn" onclick="plSetPage(' + (plPage + 1) + ')">下一页 ›</button>';
        html += '</div>';
      }
    }

    body.innerHTML = html;
  }

  /* ===== 渲染单首歌曲 ===== */
  function renderSongItem(song, index) {
    var coverHtml = song.cover
      ? '<img src="' + escHtml(song.cover) + '" alt="" loading="lazy" onerror="this.style.display=\'none\';this.parentNode.innerHTML=\'🎵\'">'
      : '🎵';
    var duration = formatDuration(song.duration_ms);
    var suffixHtml = song.suffix ? '<span class="pl-song-suffix">' + escHtml(song.suffix) + '</span>' : '';
    var genreTag = song.genre !== '流行' ? '<span class="pl-song-genre">' + escHtml(song.genre) + '</span>' : '';

    return '<div class="pl-song-item">' +
      '<div class="pl-song-index">' + index + '</div>' +
      '<div class="pl-song-cover">' + coverHtml + '</div>' +
      '<div class="pl-song-info">' +
        '<div class="pl-song-name">' + escHtml(song.name) + suffixHtml + '</div>' +
        '<div class="pl-song-meta">' +
          '<span class="pl-song-artist">' + escHtml(song.artist_str) + '</span>' +
          (song.album_name ? '<span class="pl-song-album">💿 ' + escHtml(song.album_name) + '</span>' : '') +
          (duration ? '<span class="pl-song-duration">⏱ ' + duration + '</span>' : '') +
          (song.bpm > 0 ? '<span class="pl-song-bpm">🎯 ' + song.bpm + '</span>' : '') +
        '</div>' +
        '<div class="pl-song-tags">' +
          '<span class="pl-song-lang">' + escHtml(song.lang) + '</span>' +
          genreTag +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ===== 筛选 ===== */
  function applyFilter() {
    plFiltered = plSongs.filter(function(s) {
      if (plActiveTag !== 'all') {
        var tag = plActiveTag;
        if (s.lang !== tag && s.genre !== tag) return false;
      }
      if (plSearchQuery) {
        var q = plSearchQuery.toLowerCase();
        var searchable = (s.name + ' ' + s.artist_str + ' ' + (s.album_name || '') + ' ' + s.suffix).toLowerCase();
        if (searchable.indexOf(q) < 0) return false;
      }
      return true;
    });
    plFiltered.sort(function(a, b) {
      var cmp = 0;
      if (plSortBy === 'name') cmp = a.name.localeCompare(b.name, 'zh');
      else if (plSortBy === 'artist') cmp = a.artist_str.localeCompare(b.artist_str, 'zh');
      else if (plSortBy === 'bpm') cmp = (a.bpm || 0) - (b.bpm || 0);
      return plSortAsc ? cmp : -cmp;
    });
    if (plPage > Math.ceil(plFiltered.length / plPageSize)) plPage = 1;
  }

  /* ===== 全局函数 ===== */
  window.plOnSearch = function(q) { plSearchQuery = q; plPage = 1; renderPlaylist(); };
  window.plSetTag = function(tag) { plActiveTag = tag; plPage = 1; renderPlaylist(); };
  window.plSetSort = function(by) {
    if (plSortBy === by) plSortAsc = !plSortAsc;
    else { plSortBy = by; plSortAsc = true; }
    renderPlaylist();
  };
  window.plSetPage = function(p) { plPage = p; renderPlaylist(); var body = $('plBody'); if (body) body.scrollTop = 0; };

  /* ===== 随机歌曲 ===== */
  window.plRandomPick = function() {
    if (plSongs.length === 0) return;
    plRandomSong = plSongs[Math.floor(Math.random() * plSongs.length)];
    var overlay = $('plRandomOverlay');
    if (!overlay) return;
    var card = overlay.querySelector('.pl-random-card');
    if (!card) return;

    var coverHtml = plRandomSong.cover
      ? '<img src="' + escHtml(plRandomSong.cover).replace('/480/', '/150/') + '" alt="" style="width:80px;height:80px;border-radius:12px;object-fit:cover" onerror="this.style.display=\'none\'">'
      : '<div style="width:80px;height:80px;border-radius:12px;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;font-size:32px">🎵</div>';

    card.innerHTML =
      '<div style="margin-bottom:12px">' + coverHtml + '</div>' +
      '<div class="pl-random-song">' + escHtml(plRandomSong.name) + '</div>' +
      '<div class="pl-random-artist">' + escHtml(plRandomSong.artist_str) + '</div>' +
      (plRandomSong.suffix ? '<div class="pl-random-suffix">' + escHtml(plRandomSong.suffix) + '</div>' : '') +
      '<div class="pl-random-meta">' +
        '<span>' + escHtml(plRandomSong.lang) + '</span>' +
        '<span>' + escHtml(plRandomSong.genre) + '</span>' +
        (plRandomSong.bpm > 0 ? '<span>BPM ' + plRandomSong.bpm + '</span>' : '') +
      '</div>' +
      '<div class="pl-random-actions">' +
        '<button class="pl-random-btn primary" onclick="plRandomPick()">🎲 再来一首</button>' +
        '<button class="pl-random-btn secondary" onclick="closeRandomSong()">关闭</button>' +
      '</div>';

    overlay.classList.add('show');
  };

  window.closeRandomSong = function() {
    var overlay = $('plRandomOverlay');
    if (overlay) overlay.classList.remove('show');
    plRandomSong = null;
  };

  /* ===== 工具 ===== */
  function escHtml(s) { if (!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function escAttr(s) { if (!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function formatDuration(ms) {
    if (!ms || ms <= 0) return '';
    var sec = Math.round(ms / 1000);
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

})();
