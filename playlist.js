/* ================================================================
   浮光歌单 - Playlist Viewer (V3 - 歌手分组版)
   按歌手分组展示 + 搜索 + 随机选歌
   数据源: songs_data.js (SONGS_DATA + SONG_TAGS)
   ================================================================ */

(function() {
  'use strict';

  /* ===== 状态 ===== */
  var plSongs = [];
  var plCustom = [];
  var plPendingCover = '';
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
    plLoaded = true;
    reloadSongs();
  }

  /** 内置歌单 + 自定义歌单合并；自定义的排在最前 */
  function reloadSongs() {
    plSongs = (typeof SONGS_DATA !== 'undefined' ? SONGS_DATA : []).slice();
    if (!window.sb || typeof window.sb.from !== 'function') { renderPlaylist(); return; }
    window.sb.from('playlist_custom').select('*').order('created_at', { ascending: false }).then(function(res) {
      var rows = (res && res.data) || [];
      plCustom = rows.map(function(r) {
        return {
          id: r.id,
          name: r.name,
          artists: r.artist ? [r.artist] : ['未知歌手'],
          artist_str: r.artist || '未知歌手',
          lang: r.lang || '',
          genre: '',
          cover: r.cover || '',
          album_name: r.album || '',
          duration_ms: r.duration_ms || 0,
          custom: true
        };
      });
      plSongs = plCustom.concat(plSongs);
      renderPlaylist();
    }).catch(function() { renderPlaylist(); });
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
    html += '<button class="pl-sort-btn pl-add-btn" onclick="openPlAdd()">＋ 加歌</button>';
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
        '<div class="pl-song-name">' + escHtml(song.name) +
          (song.custom ? '<span class="pl-custom-tag">自定义</span>' : '') + '</div>' +
        '<div class="pl-song-meta">' +
          '<span>' + escHtml(song.artist_str) + '</span>' +
          (song.lang ? '<span>' + escHtml(song.lang) + '</span>' : '') +
          (song.album_name ? '<span>' + escHtml(song.album_name) + '</span>' : '') +
          (duration ? '<span>⏱ ' + duration + '</span>' : '') +
        '</div>' +
      '</div>' +
      (song.custom ? '<button class="pl-del-btn" title="删除" onclick="plDelSong(\'' + song.id + '\')">✕</button>' : '') +
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

  /* ===== 自定义加歌 ===== */
  function parseDur(v) {
    if (!v) return 0;
    var m = v.match(/^(\d{1,2}):(\d{1,2})$/);
    if (m) return (parseInt(m[1], 10) * 60 + parseInt(m[2], 10)) * 1000;
    var n = parseInt(v.replace(/\D/g, ''), 10);
    return isNaN(n) ? 0 : n * 1000;
  }

  function bindCoverFile() {
    var f = $('plCoverFile');
    if (!f || f.dataset.bound) return;
    f.dataset.bound = '1';
    f.addEventListener('change', function() {
      var file = f.files && f.files[0];
      if (!file) return;
      if (typeof window.MediaUtil === 'undefined' || !window.MediaUtil.blobToDataUrl) {
        if (window.toast) toast('图片组件还没准备好', 'e');
        return;
      }
      window.MediaUtil.blobToDataUrl(file, { maxDim: 320, maxBytes: 90000 }).then(function(url) {
        plPendingCover = url;
        var prev = $('plCoverPrev');
        if (prev) prev.innerHTML = '<img src="' + url + '">';
        var inp = $('plAddCover');
        if (inp) inp.value = '';
      }).catch(function() {
        if (window.toast) toast('这张图片读取失败', 'e');
      });
    });
  }

  window.openPlAdd = function() {
    plPendingCover = '';
    ['plAddName', 'plAddArtist', 'plAddAlbum', 'plAddCover', 'plAddLang', 'plAddDur'].forEach(function(id) {
      var el = $(id); if (el) el.value = '';
    });
    var prev = $('plCoverPrev'); if (prev) prev.innerHTML = '🎵';
    bindCoverFile();
    var ov = $('plAddOverlay'); if (ov) ov.classList.add('show');
    setTimeout(function() { var n = $('plAddName'); if (n) n.focus(); }, 220);
  };

  window.closePlAdd = function() {
    var o = $('plAddOverlay'); if (o) o.classList.remove('show');
  };

  window.plCoverPreview = function(url) {
    plPendingCover = '';
    var prev = $('plCoverPrev');
    if (!prev) return;
    if (!url) { prev.innerHTML = '🎵'; return; }
    prev.innerHTML = '<img src="' + escAttr(url) + '" onerror="this.parentNode.innerHTML=\'🎵\'">';
  };

  window.plSubmitAdd = function() {
    var name = ((($('plAddName') || {}).value) || '').trim();
    if (!name) { if (window.toast) toast('先填个歌名吧', 'e'); return; }
    var cover = plPendingCover || (((($('plAddCover') || {}).value) || '').trim());
    var btn = $('plAddOk');
    if (btn) btn.disabled = true;
    if (!window.sb || typeof window.sb.rpc !== 'function') {
      if (btn) btn.disabled = false;
      if (window.toast) toast('还没连上云端，稍后再试', 'e');
      return;
    }
    window.sb.rpc('playlist_add', {
      p_name: name,
      p_artist: (((($('plAddArtist') || {}).value) || '').trim()),
      p_album: (((($('plAddAlbum') || {}).value) || '').trim()),
      p_cover: cover,
      p_lang: (((($('plAddLang') || {}).value) || '').trim()),
      p_duration: parseDur(((($('plAddDur') || {}).value) || '').trim()),
      p_added_by: window.role === 'admin' ? '小光' : '粉丝'
    }).then(function(r) {
      if (btn) btn.disabled = false;
      if (r && r.error) { if (window.toast) toast('保存失败：' + r.error.message, 'e'); return; }
      window.closePlAdd();
      if (window.toast) toast('已加入歌单 🎵', 's');
      reloadSongs();
    }).catch(function(e) {
      if (btn) btn.disabled = false;
      if (window.toast) toast('保存失败：' + (e && e.message || '网络错误'), 'e');
    });
  };

  window.plDelSong = function(id) {
    if (window.role !== 'admin') {
      if (window.showFox) {
        window.showFox('这首歌是小光的宝贝 🦊', '想删歌得小光自己来哦～ 你可以先记住歌名，戳ta说一声，ta马上帮你换掉。');
      }
      return;
    }
    var m = $('cm'), d = $('cd');
    if (!m || !d) return;
    m.textContent = '要从歌单里删掉这首歌吗？';
    d.classList.add('show');
    $('cok').onclick = function() {
      d.classList.remove('show');
      window.adminRpc('playlist_del', { p_id: id }).then(function(r) {
        if (r && r.ok) {
          if (window.toast) toast('已删除', 'i');
          reloadSongs();
        } else if (window.toast) {
          toast('删除失败：' + ((r && r.error) || '未知错误'), 'e');
        }
      });
    };
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
