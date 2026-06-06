/* ================================================================
   歌单展示 - Playlist Viewer
   酷狗歌单同步 + 分类展示 + 随机歌曲
   - 管理员粘贴链接同步歌单到 Supabase
   - 游客浏览歌单，按分类筛选
   - 随机歌曲推荐
   ================================================================ */

(function() {
  'use strict';

  /* ===== 配置 ===== */
  var TABLE_PLAYLISTS = 'playlists';
  var TABLE_SONGS = 'playlist_songs';

  /* ===== 状态 ===== */
  var plPlaylists = [];     // 所有歌单
  var plCurrentPlaylist = null; // 当前查看的歌单
  var plCurrentSongs = [];  // 当前歌单的歌曲
  var plFilteredSongs = []; // 筛选后的歌曲
  var plActiveTag = 'all';  // 当前选中的标签
  var plRandomSong = null;  // 随机歌曲
  var plSyncing = false;    // 同步中
  var plView = 'list';      // list | detail

  /* ===== DOM ===== */
  function $(id) { return document.getElementById(id) }

  /* ===== 初始化 Supabase ===== */
  function getSB() {
    if (!window.sb && typeof supabase !== 'undefined') {
      window.sb = supabase.createClient('https://yiexaopgxcroktltjqoz.supabase.co', 'sb_publishable_O3vb23iYR6lKOjQCpFbhug_Dy_X4DR4');
    }
    return window.sb;
  }

  /* ===== 打开歌单 ===== */
  window.openPlaylist = function() {
    var overlay = $('plOverlay');
    if (overlay) {
      overlay.classList.add('show');
      plView = 'list';
      renderPlaylistList();
    }
  };

  /* ===== 关闭歌单 ===== */
  window.closePlaylist = function() {
    var overlay = $('plOverlay');
    if (overlay) overlay.classList.remove('show');
    closeRandomSong();
    plView = 'list';
    plCurrentPlaylist = null;
    plCurrentSongs = [];
    plFilteredSongs = [];
  };

  /* ===== 渲染歌单列表 ===== */
  async function renderPlaylistList() {
    var body = $('plBody');
    if (!body) return;
    body.innerHTML = '<div class="pl-loading show"><div class="pl-spinner"></div><div>🎵 小光正在加载歌单...</div></div>';

    var sb = getSB();
    if (!sb) {
      body.innerHTML = '<div class="pl-empty"><div class="pl-empty-icon">😵</div><div class="pl-empty-text">加载失败，请刷新重试</div></div>';
      return;
    }

    try {
      // 获取所有歌单
      var { data: playlists, error } = await sb
        .from(TABLE_PLAYLISTS)
        .select('*')
        .order('sort_order', { ascending: true });

      if (error) throw error;
      plPlaylists = playlists || [];

      // 管理员显示同步区域
      var isAdmin = window.role === 'admin';
      var html = '';

      if (isAdmin) {
        html += renderAdminSync();
      }

      if (plPlaylists.length === 0) {
        html += '<div class="pl-empty"><div class="pl-empty-icon">🎵</div><div class="pl-empty-text">还没有歌单' + (isAdmin ? '，粘贴酷狗链接同步吧' : '') + '</div></div>';
      } else {
        for (var i = 0; i < plPlaylists.length; i++) {
          html += renderPlaylistCard(plPlaylists[i]);
        }
      }

      body.innerHTML = html;
      bindPlaylistListEvents();
    } catch(e) {
      console.error('加载歌单失败:', e);
      body.innerHTML = '<div class="pl-empty"><div class="pl-empty-icon">😵</div><div class="pl-empty-text">加载失败: ' + e.message + '</div></div>';
    }
  }

  /* ===== 渲染歌单卡片 ===== */
  function renderPlaylistCard(pl) {
    var coverHtml = pl.cover_url
      ? '<img src="' + escHtml(pl.cover_url) + '" alt="" onerror="this.style.display=\'none\';this.parentNode.innerHTML=\'🎵\'">'
      : '🎵';
    var songCount = pl.song_count || 0;
    var updatedAt = pl.updated_at ? formatTime(pl.updated_at) : '';
    return '<div class="pl-playlist-card" data-pl-id="' + pl.id + '">' +
      '<div class="pl-card-top">' +
        '<div class="pl-card-cover">' + coverHtml + '</div>' +
        '<div class="pl-card-info">' +
          '<div class="pl-card-name">' + escHtml(pl.name) + '</div>' +
          '<div class="pl-card-meta">' +
            '<span>🎵 ' + songCount + ' 首</span>' +
            (updatedAt ? '<span>🕐 ' + updatedAt + '</span>' : '') +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ===== 渲染管理员同步区 ===== */
  function renderAdminSync() {
    var html = '<div class="pl-admin">' +
      '<div class="pl-admin-title">🔄 同步歌单（管理员）</div>' +
      '<div class="pl-admin-row">' +
        '<input class="pl-admin-input" id="plSyncUrl" type="text" placeholder="粘贴酷狗歌单分享链接，如 https://t1.kugou.com/...">' +
        '<button class="pl-admin-btn" id="plSyncBtn" onclick="plDoSync()">同步</button>' +
      '</div>' +
      '<div class="pl-admin-extras">' +
        '<div class="pl-admin-field"><label>歌单名称</label><input id="plSyncName" type="text" placeholder="留空自动获取"></div>' +
        '<div class="pl-admin-field"><label>歌单封面（图片链接）</label><input id="plSyncCover" type="text" placeholder="自定义封面图"></div>' +
      '</div>' +
      '<div id="plSyncStatus"></div>' +
    '</div>';

    // 已有歌单管理
    if (plPlaylists.length > 0) {
      html += '<div style="margin-bottom:12px">';
      for (var i = 0; i < plPlaylists.length; i++) {
        var pl = plPlaylists[i];
        html += '<div class="pl-manage-item">' +
          '<span class="pl-manage-name">' + escHtml(pl.name) + '</span>' +
          '<span class="pl-manage-count">' + (pl.song_count || 0) + '首</span>' +
          '<button onclick="plDeletePlaylist(\'' + pl.id + '\')" title="删除">🗑️</button>' +
        '</div>';
      }
      html += '</div>';
    }

    return html;
  }

  /* ===== 绑定列表事件 ===== */
  function bindPlaylistListEvents() {
    var cards = document.querySelectorAll('.pl-playlist-card');
    for (var i = 0; i < cards.length; i++) {
      cards[i].addEventListener('click', function() {
        var plId = this.getAttribute('data-pl-id');
        openPlaylistDetail(plId);
      });
    }
  }

  /* ===== 打开歌单详情 ===== */
  async function openPlaylistDetail(plId) {
    var body = $('plBody');
    if (!body) return;
    body.innerHTML = '<div class="pl-loading show"><div class="pl-spinner"></div><div>🎵 加载歌曲中...</div></div>';

    var sb = getSB();
    if (!sb) return;

    try {
      // 获取歌单信息
      var { data: playlist } = await sb.from(TABLE_PLAYLISTS).select('*').eq('id', plId).single();
      if (!playlist) { body.innerHTML = '<div class="pl-empty">歌单不存在</div>'; return; }
      plCurrentPlaylist = playlist;

      // 获取歌曲
      var { data: songs } = await sb.from(TABLE_SONGS).select('*').eq('playlist_id', plId).order('sort_order', { ascending: true });
      plCurrentSongs = songs || [];
      plFilteredSongs = plCurrentSongs.slice();
      plActiveTag = 'all';

      plView = 'detail';
      renderDetail();
    } catch(e) {
      console.error('加载歌单详情失败:', e);
      body.innerHTML = '<div class="pl-empty">加载失败</div>';
    }
  }

  /* ===== 渲染详情 ===== */
  function renderDetail() {
    var body = $('plBody');
    var pl = plCurrentPlaylist;
    if (!pl || !body) return;

    var coverHtml = pl.cover_url
      ? '<img src="' + escHtml(pl.cover_url) + '" alt="" onerror="this.style.display=\'none\';this.parentNode.innerHTML=\'🎵\'">'
      : '🎵';

    var totalDur = 0;
    for (var i = 0; i < plCurrentSongs.length; i++) {
      totalDur += (plCurrentSongs[i].duration || 0);
    }

    var html = '<div class="pl-detail show">' +
      '<div class="pl-detail-header">' +
        '<div class="pl-detail-cover">' + coverHtml + '</div>' +
        '<div class="pl-detail-info">' +
          '<div class="pl-detail-name">' + escHtml(pl.name) + '</div>' +
          '<div class="pl-detail-stats">' +
            '<span>🎵 ' + plCurrentSongs.length + ' 首</span>' +
            '<span>⏱️ ' + formatDuration(totalDur) + '</span>' +
            (pl.source_url ? '<span>🔗 酷狗</span>' : '') +
          '</div>' +
        '</div>' +
      '</div>' +

      '<div class="pl-detail-actions">' +
        '<button class="pl-btn-random" onclick="plRandomPick()">🎲 随机一首</button>' +
        '<button class="pl-btn-back" onclick="plBackToList()">← 返回</button>' +
      '</div>' +

      renderTags() +

      '<ul class="pl-song-list">' +
        renderSongList() +
      '</ul>' +
    '</div>';

    body.innerHTML = html;
    bindTagEvents();
  }

  /* ===== 渲染分类标签 ===== */
  function renderTags() {
    // 统计标签
    var tags = { 'all': plCurrentSongs.length };
    for (var i = 0; i < plCurrentSongs.length; i++) {
      var s = plCurrentSongs[i];
      var songTags = getSongTags(s);
      for (var j = 0; j < songTags.length; j++) {
        if (!tags[songTags[j]]) tags[songTags[j]] = 0;
        tags[songTags[j]]++;
      }
    }

    var html = '<div class="pl-tags">';
    var tagIcons = { 'all': '🎵', '中文': '🇨🇳', '英文': '🇬🇧', '日文': '🇯🇵', '韩文': '🇰🇷', '粤语': '🗣️', '摇滚': '🎸', '民谣': '🪕', '流行': '🎤', '电子': '🎹', '说唱': '🎧', 'R&B': '🎷', '古典': '🎻', '轻音乐': '🌙', '治愈': '💚', '伤感': '💙', '欢快': '💛', '安静': '🤍', '热血': '❤️‍🔥' };

    var tagList = Object.keys(tags).sort(function(a, b) {
      if (a === 'all') return -1;
      if (b === 'all') return 1;
      return tags[b] - tags[a];
    });

    for (var i = 0; i < tagList.length; i++) {
      var tag = tagList[i];
      var icon = tagIcons[tag] || '🏷️';
      html += '<button class="pl-tag' + (plActiveTag === tag ? ' active' : '') + '" data-tag="' + escHtml(tag) + '">' + icon + ' ' + escHtml(tag) + ' (' + tags[tag] + ')</button>';
    }
    html += '</div>';
    return html;
  }

  /* ===== 获取歌曲标签 ===== */
  function getSongTags(song) {
    var tags = [];
    var name = (song.song_name || '').toLowerCase();
    var artist = (song.author_name || '').toLowerCase();
    var combined = name + ' ' + artist;

    // 语种判断
    if (/[\u4e00-\u9fff]/.test(song.song_name || '')) {
      // 含中文字符
      if (isCantonese(song.song_name, song.author_name)) {
        tags.push('粤语');
      } else {
        tags.push('中文');
      }
    }
    if (/[a-zA-Z]{3,}/.test(song.song_name || '')) {
      if (/[\u3040-\u309f\u30a0-\u30ff]/.test(song.song_name || '')) {
        tags.push('日文');
      } else if (/[\uac00-\ud7af]/.test(song.song_name || '')) {
        tags.push('韩文');
      } else {
        tags.push('英文');
      }
    }

    // 曲风判断（基于歌手和歌名关键词）
    var rockArtists = ['万能青年旅店', '逃跑计划', '痛仰', '新裤子', '二手玫瑰', '唐朝', '黑豹', '超载', '谢天笑', '花儿', '反光镜'];
    var folkArtists = ['陶喆', '陈粒', '赵雷', '李志', '宋冬野', '花粥', '陈鸿宇', '房东的猫', '程璧', '莫西子诗', '安河桥'];
    var rapArtists = ['GAI', 'VAVA', '那吾克热', '艾热', '法老', 'PG One', 'TY', '谢帝'];
    var electronicArtists = ['DJ', 'Alan Walker', 'Marshmello', 'David Guetta', 'Skrillex'];

    for (var i = 0; i < rockArtists.length; i++) {
      if (artist.indexOf(rockArtists[i].toLowerCase()) >= 0) { tags.push('摇滚'); break; }
    }
    for (var i = 0; i < folkArtists.length; i++) {
      if (artist.indexOf(folkArtists[i].toLowerCase()) >= 0) { tags.push('民谣'); break; }
    }
    for (var i = 0; i < rapArtists.length; i++) {
      if (artist.indexOf(rapArtists[i].toLowerCase()) >= 0) { tags.push('说唱'); break; }
    }

    // 基于歌名关键词
    if (/摇滚|rock|metal|punk/i.test(combined)) tags.push('摇滚');
    if (/民谣|folk|acoustic/i.test(combined)) tags.push('民谣');
    if (/说唱|rap|hip.?hop/i.test(combined)) tags.push('说唱');
    if (/电音|electro|edm|house|techno|dubstep|dj/i.test(combined)) tags.push('电子');
    if (/r&b|rnb|soul|jazz|blues|funk/i.test(combined)) tags.push('R&B');
    if (/古典|classical|钢琴|piano|交响/i.test(combined)) tags.push('古典');
    if (/轻音乐|pure|instrumental|纯音乐|bgm/i.test(combined)) tags.push('轻音乐');
    if (/流行|pop/i.test(combined)) tags.push('流行');

    // 心情判断
    if (/治愈|温柔|暖|暖阳|阳光|温柔|warm/i.test(combined)) tags.push('治愈');
    if (/伤|泪|哭|痛|孤独|寂寞|miss|cry|sad|broken/i.test(combined)) tags.push('伤感');
    if (/欢|笑|快乐|happy|dance|派对|jump|up/i.test(combined)) tags.push('欢快');
    if (/安静|夜|晚|静|夜|dream|sleep|quiet|night/i.test(combined)) tags.push('安静');
    if (/热血|燃|fight|war|fire|hero|strong/i.test(combined)) tags.push('热血');

    // 如果没有标签，默认流行
    if (tags.length === 0) tags.push('流行');

    return tags;
  }

  /* ===== 粤语判断 ===== */
  function isCantonese(songName, artistName) {
    var cantoneseArtists = ['陈奕迅', '张学友', '容祖儿', '杨千嬅', '古巨基', '谢安琪', '张敬轩', '侧田', '卫兰', '邓紫棋', 'Twins', '李克勤', '黄耀明', '王菲', 'Beyond', '谭咏麟', '张国荣', '梅艳芳', '许冠杰', '林子祥', '陈慧娴', '刘德华', '郭富城', '黎明'];
    for (var i = 0; i < cantoneseArtists.length; i++) {
      if ((artistName || '').indexOf(cantoneseArtists[i]) >= 0) return true;
    }
    return false;
  }

  /* ===== 渲染歌曲列表 ===== */
  function renderSongList() {
    var html = '';
    var highlightId = plRandomSong ? plRandomSong.id : null;

    for (var i = 0; i < plFilteredSongs.length; i++) {
      var s = plFilteredSongs[i];
      var dur = formatDuration(s.duration || 0);
      var isHL = s.id === highlightId;
      html += '<li class="pl-song-item' + (isHL ? ' highlight' : '') + '">' +
        '<span class="pl-song-idx">' + (i + 1) + '</span>' +
        '<div class="pl-song-info">' +
          '<div class="pl-song-name">' + escHtml(s.song_name || '未知') + '</div>' +
          '<div class="pl-song-artist">' + escHtml(s.author_name || '未知歌手') + '</div>' +
        '</div>' +
        '<span class="pl-song-dur">' + dur + '</span>' +
      '</li>';
    }
    return html;
  }

  /* ===== 标签筛选 ===== */
  function bindTagEvents() {
    var tags = document.querySelectorAll('.pl-tag');
    for (var i = 0; i < tags.length; i++) {
      tags[i].addEventListener('click', function() {
        plActiveTag = this.getAttribute('data-tag');
        filterSongs();
        // 更新标签样式
        var allTags = document.querySelectorAll('.pl-tag');
        for (var j = 0; j < allTags.length; j++) {
          allTags[j].classList.toggle('active', allTags[j].getAttribute('data-tag') === plActiveTag);
        }
        // 更新歌曲列表
        var list = document.querySelector('.pl-song-list');
        if (list) list.innerHTML = renderSongList();
      });
    }
  }

  function filterSongs() {
    if (plActiveTag === 'all') {
      plFilteredSongs = plCurrentSongs.slice();
    } else {
      plFilteredSongs = [];
      for (var i = 0; i < plCurrentSongs.length; i++) {
        var tags = getSongTags(plCurrentSongs[i]);
        if (tags.indexOf(plActiveTag) >= 0) {
          plFilteredSongs.push(plCurrentSongs[i]);
        }
      }
    }
  }

  /* ===== 返回列表 ===== */
  window.plBackToList = function() {
    plView = 'list';
    plCurrentPlaylist = null;
    plCurrentSongs = [];
    plFilteredSongs = [];
    plRandomSong = null;
    renderPlaylistList();
  };

  /* ===== 随机歌曲 ===== */
  window.plRandomPick = function() {
    var pool = plFilteredSongs.length > 0 ? plFilteredSongs : plCurrentSongs;
    if (pool.length === 0) return;
    var idx = Math.floor(Math.random() * pool.length);
    plRandomSong = pool[idx];

    // 更新歌曲列表高亮
    var items = document.querySelectorAll('.pl-song-item');
    for (var i = 0; i < items.length; i++) {
      items[i].classList.remove('highlight');
    }

    // 显示随机歌曲弹窗
    var overlay = $('plRandomOverlay');
    if (overlay) {
      var card = overlay.querySelector('.pl-random-card');
      card.innerHTML =
        '<div class="pl-random-icon">🎵</div>' +
        '<div class="pl-random-song">' + escHtml(plRandomSong.song_name || '未知') + '</div>' +
        '<div class="pl-random-artist">' + escHtml(plRandomSong.author_name || '未知歌手') + '</div>' +
        (plRandomSong.album_name ? '<div class="pl-random-album">💿 ' + escHtml(plRandomSong.album_name) + '</div>' : '') +
        '<div class="pl-random-actions">' +
          '<button class="pl-random-btn primary" onclick="plRandomPick()">🎲 再来一首</button>' +
          '<button class="pl-random-btn secondary" onclick="closeRandomSong()">关闭</button>' +
        '</div>';
      overlay.classList.add('show');
    }
  };

  window.closeRandomSong = function() {
    var overlay = $('plRandomOverlay');
    if (overlay) overlay.classList.remove('show');
  };

  /* ===== 同步歌单 ===== */
  window.plDoSync = async function() {
    var urlInput = $('plSyncUrl');
    var nameInput = $('plSyncName');
    var coverInput = $('plSyncCover');
    var statusDiv = $('plSyncStatus');
    var btn = $('plSyncBtn');

    if (!urlInput || !urlInput.value.trim()) {
      if (statusDiv) statusDiv.innerHTML = '<div class="pl-sync-status err">❌ 请输入酷狗歌单分享链接</div>';
      return;
    }

    var url = urlInput.value.trim();
    plSyncing = true;
    if (btn) btn.disabled = true;
    if (statusDiv) statusDiv.innerHTML = '<div class="pl-sync-status">⏳ 正在解析歌单...</div>';

    try {
      // 通过我们的后端代理解析歌单
      var result = await fetchPlaylistFromKugou(url);

      if (!result || !result.songs || result.songs.length === 0) {
        throw new Error('未获取到歌曲数据');
      }

      var playlistName = (nameInput && nameInput.value.trim()) || result.name || '我的歌单';
      var coverUrl = (coverInput && coverInput.value.trim()) || result.cover || '';

      if (statusDiv) statusDiv.innerHTML = '<div class="pl-sync-status">⏳ 正在保存到数据库 (' + result.songs.length + ' 首)...</div>';

      var sb = getSB();
      if (!sb) throw new Error('数据库连接失败');

      // 创建歌单记录
      var { data: newPl, error: plError } = await sb
        .from(TABLE_PLAYLISTS)
        .insert({
          name: playlistName,
          cover_url: coverUrl,
          source_url: url,
          song_count: result.songs.length,
          sort_order: plPlaylists.length
        })
        .select()
        .single();

      if (plError) throw plError;

      // 批量插入歌曲
      var songRecords = [];
      for (var i = 0; i < result.songs.length; i++) {
        var s = result.songs[i];
        songRecords.push({
          playlist_id: newPl.id,
          song_name: s.song_name || s.audio_name || '',
          author_name: s.author_name || '',
          album_name: s.album_name || '',
          album_id: s.album_id || '',
          hash: s.hash || '',
          duration: s.timelength || 0,
          sort_order: i
        });
      }

      // 分批插入（每批100条）
      for (var batch = 0; batch < songRecords.length; batch += 100) {
        var batchData = songRecords.slice(batch, batch + 100);
        var { error: songError } = await sb.from(TABLE_SONGS).insert(batchData);
        if (songError) {
          console.error('插入歌曲失败:', songError);
          // 尝试继续
        }
      }

      if (statusDiv) statusDiv.innerHTML = '<div class="pl-sync-status ok">✅ 同步成功！' + result.songs.length + ' 首歌曲已添加</div>';

      // 清空输入
      if (urlInput) urlInput.value = '';
      if (nameInput) nameInput.value = '';
      if (coverInput) coverInput.value = '';

      // 刷新列表
      setTimeout(function() { renderPlaylistList(); }, 800);

    } catch(e) {
      console.error('同步歌单失败:', e);
      if (statusDiv) statusDiv.innerHTML = '<div class="pl-sync-status err">❌ 同步失败: ' + escHtml(e.message) + '</div>';
    } finally {
      plSyncing = false;
      if (btn) btn.disabled = false;
    }
  };

  /* ===== 从酷狗获取歌单 ===== */
  async function fetchPlaylistFromKugou(shareUrl) {
    // 通过 Supabase Edge Function 或直接 fetch 解析
    // 由于浏览器跨域限制，我们用一个简单的 CORS 代理
    // 方案：先尝试直接fetch，再尝试代理

    var proxyUrls = [
      'https://api.allorigins.win/raw?url=',
      'https://corsproxy.io/?',
    ];

    var html = null;

    // 尝试直接 fetch
    try {
      var resp = await fetch(shareUrl, {
        headers: { 'Accept': 'text/html' },
        redirect: 'follow'
      });
      if (resp.ok) {
        html = await resp.text();
      }
    } catch(e) {
      // CORS 限制，需要代理
    }

    // 如果直接 fetch 失败，尝试代理
    if (!html || html.indexOf('dataFromSmarty') < 0) {
      for (var i = 0; i < proxyUrls.length; i++) {
        try {
          var proxyUrl = proxyUrls[i] + encodeURIComponent(shareUrl);
          var resp = await fetch(proxyUrl, { redirect: 'follow' });
          if (resp.ok) {
            html = await resp.text();
            if (html.indexOf('dataFromSmarty') >= 0) break;
          }
        } catch(e) {
          continue;
        }
      }
    }

    if (!html || html.indexOf('dataFromSmarty') < 0) {
      throw new Error('无法解析歌单链接，请确认链接有效');
    }

    // 提取 dataFromSmarty
    var matchIdx = html.indexOf('dataFromSmarty');
    if (matchIdx < 0) throw new Error('页面中未找到歌单数据');

    // 找到等号后的 [ 开始位置
    var startIdx = html.indexOf('[', matchIdx);
    if (startIdx < 0) throw new Error('歌单数据格式异常');

    // 用括号计数法找到完整的 JSON 数组
    var depth = 0;
    var endIdx = startIdx;
    for (var i = startIdx; i < html.length; i++) {
      if (html[i] === '[') depth++;
      else if (html[i] === ']') {
        depth--;
        if (depth === 0) { endIdx = i + 1; break; }
      }
    }

    var jsonStr = html.substring(startIdx, endIdx);
    var songs = JSON.parse(jsonStr);

    // 提取歌单名（从标题）
    var name = '';
    var titleMatch = html.match(/<title>(.*?)<\/title>/);
    if (titleMatch) {
      name = titleMatch[1].split('_')[0].split('|')[0].trim();
    }

    // 提取封面
    var cover = '';
    var coverMatch = html.match(/class="cover[^"]*"[^>]*?src="([^"]+)"/);
    if (coverMatch) cover = coverMatch[1];

    return { name: name, cover: cover, songs: songs };
  }

  /* ===== 删除歌单 ===== */
  window.plDeletePlaylist = async function(plId) {
    if (!confirm('确定删除此歌单？歌曲将一并删除。')) return;
    var sb = getSB();
    if (!sb) return;

    try {
      // 先删歌曲
      await sb.from(TABLE_SONGS).delete().eq('playlist_id', plId);
      // 再删歌单
      await sb.from(TABLE_PLAYLISTS).delete().eq('id', plId);
      renderPlaylistList();
    } catch(e) {
      alert('删除失败: ' + e.message);
    }
  };

  /* ===== 工具函数 ===== */
  function escHtml(str) {
    var d = document.createElement('div');
    d.textContent = str || '';
    return d.innerHTML;
  }

  function formatDuration(ms) {
    var sec = Math.floor(ms / 1000);
    var h = Math.floor(sec / 3600);
    var m = Math.floor((sec % 3600) / 60);
    var s = sec % 60;
    if (h > 0) return h + ':' + pad(m) + ':' + pad(s);
    return m + ':' + pad(s);
  }

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function formatTime(isoStr) {
    if (!isoStr) return '';
    var d = new Date(isoStr);
    var now = new Date();
    var diff = now - d;
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
    if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
    if (diff < 604800000) return Math.floor(diff / 86400000) + '天前';
    return (d.getMonth() + 1) + '/' + d.getDate();
  }

})();
