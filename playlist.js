/* ================================================================
   浮光歌单 - Playlist Viewer (V3 - 歌手分组版)
   按歌手分组展示 + 搜索 + 随机选歌
   数据源: songs_data.js (SONGS_DATA + SONG_TAGS)
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

    /* 统计栏 */
    html += '<div class="pl-stats-bar">';
    html += '<span class="pl-total">🎵 共 ' + plSongs.length + ' 首</span>';
    html += '<span class="pl-filtered">' + (plActiveTag !== 'all' || plSearchQuery ? '· 显示 ' + plFiltered.length + ' 首' : '') + '</span>';
    html += '</div>';

    /* 搜索栏 */
    html += '<div class="pl-search">';
    html += '<input type="text" id="plSearchInput" placeholder="搜索歌曲 / 歌手..." value="' + escAttr(plSearchQuery) + '" oninput="plOnSearch(this.value)">';
    html += '</div>';

    /* 歌手标签 */
    html += '<div class="pl-tags">';
    if (typeof SONG_TAGS !== 'undefined') {
      for (var i = 0; i < SONG_TAGS.length; i++) {
        var tag = SONG_TAGS[i];
        var cls = plActiveTag === tag.key ? ' active' : '';
        html += '<button class="pl-tag' + cls + '" onclick="plSetTag(\'' + escAttr(tag.key) + '\')">';
        html += tag.icon + ' ' + escHtml(tag.label);
        html += '</button>';
      }
    }
    html += '</div>';

    /* 操作栏 */
    html += '<div class="pl-action-bar">';
    html += '<button class="pl-sort-btn' + (plSortBy === 'name' ? ' active' : '') + '" onclick="plSetSort(\'name\')">按歌名</button>';
    html += '<button class="pl-sort-btn' + (plSortBy === 'artist' ? ' active' : '') + '" onclick="plSetSort(\'artist\')">按歌手</button>';
    html += '<button class="pl-random-btn-inline" onclick="plRandomPick()">🎲 随机选歌</button>';
    html += '</div>';

    /* 歌曲列表 — 按歌手分组 */
    if (plFiltered.length === 0) {
      html += '<div class="pl-empty"><div class="pl-empty-icon">🔍</div><div class="pl-empty-text">没有匹配的歌曲</div></div>';
    } else {
      html += renderGroupedList();
    }

    body.innerHTML = html;
  }

  /* ===== 按歌手分组渲染 ===== */
  function renderGroupedList() {
    var groups = {};
    var tagConfig = getTagConfig(plActiveTag);

    for (var i = 0; i < plFiltered.length; i++) {
      var song = plFiltered[i];
      var groupKey = getGroupKey(song);
      if (!groups[groupKey]) groups[groupKey] = { name: groupKey, songs: [] };
      groups[groupKey].songs.push(song);
    }

    /* 排序分组 */
    var groupList = [];
    for (var key in groups) {
      if (groups.hasOwnProperty(key)) groupList.push(groups[key]);
    }
    groupList.sort(function(a, b) {
      return a.name.localeCompare(b.name, 'zh');
    });

    /* "其他歌手" 排到最后 */
    var otherIdx = -1;
    for (var g = 0; g < groupList.length; g++) {
      if (groupList[g].name === '其他歌手') { otherIdx = g; break; }
    }
    if (otherIdx >= 0) {
      var other = groupList.splice(otherIdx, 1)[0];
      groupList.push(other);
    }

    var html = '';
    var globalIdx = 1;
    for (var gi = 0; gi < groupList.length; gi++) {
      var grp = groupList[gi];
      var isTopArtist = isTopArtistGroup(grp.name);
      html += '<div class="pl-group' + (isTopArtist ? ' pl-group-featured' : '') + '">';
      html += '<div class="pl-group-header">';
      html += '<span class="pl-group-name">' + escHtml(grp.name) + '</span>';
      html += '<span class="pl-group-count">' + grp.songs.length + ' 首</span>';
      html += '</div>';
      html += '<div class="pl-song-list">';
      for (var si = 0; si < grp.songs.length; si++) {
        html += renderSongItem(grp.songs[si], globalIdx++);
      }
      html += '</div>';
      html += '</div>';
    }
    return html;
  }

  /* ===== 分组键 ===== */
  function getGroupKey(song) {
    if (plActiveTag === 'all') {
      /* 全部视图：按第一歌手分组 */
      return song.artists && song.artists.length > 0 ? song.artists[0] : '未知歌手';
    }
    if (plActiveTag === 'other') {
      return song.artists && song.artists.length > 0 ? song.artists[0] : '未知歌手';
    }
    /* 选中具体歌手：不再分子组 */
    return plActiveTag;
  }

  function getTagConfig(key) {
    if (typeof SONG_TAGS === 'undefined') return null;
    for (var i = 0; i < SONG_TAGS.length; i++) {
      if (SONG_TAGS[i].key === key) return SONG_TAGS[i];
    }
    return null;
  }

  function isTopArtistGroup(name) {
    if (typeof SONG_TAGS === 'undefined') return false;
    for (var i = 0; i < SONG_TAGS.length; i++) {
      if (SONG_TAGS[i].key === name) return true;
    }
    return false;
  }

  /* ===== 渲染单首歌曲 ===== */
  function renderSongItem(song, index) {
    var coverHtml = song.cover
      ? '<img src="' + escHtml(song.cover) + '" alt="" loading="lazy" onerror="this.style.display=\'none\';this.parentNode.innerHTML=\'🎵\'">'
      : '🎵';
    var duration = formatDuration(song.duration_ms);

    return '<div class="pl-song-item">' +
      '<div class="pl-song-index">' + index + '</div>' +
      '<div class="pl-song-cover">' + coverHtml + '</div>' +
      '<div class="pl-song-info">' +
        '<div class="pl-song-name">' + escHtml(song.name) + '</div>' +
        '<div class="pl-song-meta">' +
          '<span>' + escHtml(song.artist_str) + '</span>' +
          (song.lang ? '<span>' + escHtml(song.lang) + '</span>' : '') +
          (duration ? '<span>⏱ ' + duration + '</span>' : '') +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ===== 筛选 ===== */
  function applyFilter() {
    plFiltered = plSongs.filter(function(s) {
      if (plActiveTag !== 'all') {
        if (plActiveTag === 'other') {
          /* "其他歌手" = 不在任何 top artist 列表中的歌 */
          if (isSongByTopArtist(s)) return false;
        } else {
          /* 选中具体歌手 */
          if (!isSongByArtist(s, plActiveTag)) return false;
        }
      }
      if (plSearchQuery) {
        var q = plSearchQuery.toLowerCase();
        var searchable = (s.name + ' ' + s.artist_str + ' ' + (s.album_name || '')).toLowerCase();
        if (searchable.indexOf(q) < 0) return false;
      }
      return true;
    });
    plFiltered.sort(function(a, b) {
      var cmp = 0;
      if (plSortBy === 'name') cmp = a.name.localeCompare(b.name, 'zh');
      else if (plSortBy === 'artist') cmp = a.artist_str.localeCompare(b.artist_str, 'zh');
      return plSortAsc ? cmp : -cmp;
    });
  }

  function isSongByArtist(song, artistName) {
    if (!song.artists) return false;
    for (var i = 0; i < song.artists.length; i++) {
      if (song.artists[i] === artistName) return true;
    }
    return false;
  }

  function isSongByTopArtist(song) {
    if (typeof SONG_TAGS === 'undefined') return false;
    if (!song.artists) return false;
    for (var i = 0; i < song.artists.length; i++) {
      for (var j = 0; j < SONG_TAGS.length; j++) {
        if (SONG_TAGS[j].key === song.artists[i] && SONG_TAGS[j].key !== 'all' && SONG_TAGS[j].key !== 'other') {
          return true;
        }
      }
    }
    return false;
  }

  /* ===== 全局函数 ===== */
  window.plOnSearch = function(q) { plSearchQuery = q; renderPlaylist(); };
  window.plSetTag = function(tag) { plActiveTag = tag; renderPlaylist(); };
  window.plSetSort = function(by) {
    if (plSortBy === by) plSortAsc = !plSortAsc;
    else { plSortBy = by; plSortAsc = true; }
    renderPlaylist();
  };

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
      : '<div style="width:80px;height:80px;border-radius:12px;background:linear-gradient(135deg,#FB7299,#FF9CBB);display:flex;align-items:center;justify-content:center;font-size:32px">🎵</div>';

    card.innerHTML =
      '<div style="margin-bottom:12px">' + coverHtml + '</div>' +
      '<div class="pl-random-song">' + escHtml(plRandomSong.name) + '</div>' +
      '<div class="pl-random-artist">' + escHtml(plRandomSong.artist_str) + '</div>' +
      '<div class="pl-random-meta">' +
        '<span>' + escHtml(plRandomSong.lang || '') + '</span>' +
        '<span>' + escHtml(plRandomSong.genre || '') + '</span>' +
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
