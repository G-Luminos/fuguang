/* ================================================================
   浮光小游戏中心 - Games JS
   数字炸弹 / 3D掷骰子 / 狐狐大富翁
   狐狸主题 · Supabase云端存储 · 投屏友好
   ================================================================ */

(function() {
  'use strict';

  /* ===== 工具函数 ===== */
  function $(id) { return document.getElementById(id); }
  function esc(s) { if(!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function escA(s) { if(!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }

  /* ================================================================
     Game Center
     ================================================================ */

  window.openGameCenter = function() {
    var el = $('gmOverlay');
    if (!el) return;
    el.classList.add('show');
    renderGameCenter();
  };

  window.closeGameCenter = function() {
    var el = $('gmOverlay');
    if (el) el.classList.remove('show');
  };

  function renderGameCenter() {
    var body = $('gmBody');
    if (!body) return;
    showFullGame(false);
    body.innerHTML = ''
    + '<div class="gm-game-list">'
    + '  <div class="gm-game-card" onclick="gmLaunchBomb()">'
    + '    <div class="gm-game-icon gm-bomb">💣</div>'
    + '    <div class="gm-game-info">'
    + '      <div class="gm-game-name">🦊 数字炸弹</div>'
    + '      <div class="gm-game-desc">猜数字，踩中炸弹就爆炸～光光爆炸喽！</div>'
    + '    </div><div class="gm-game-arrow">›</div>'
    + '  </div>'
    + '  <div class="gm-game-card" onclick="gmLaunchDice()">'
    + '    <div class="gm-game-icon gm-dice">🎲</div>'
    + '    <div class="gm-game-info">'
    + '      <div class="gm-game-name">🦊 掷骰子</div>'
    + '      <div class="gm-game-desc">3D骰子，抽奖专用～中奖按点数给奖励</div>'
    + '    </div><div class="gm-game-arrow">›</div>'
    + '  </div>'
    + '  <div class="gm-game-card" onclick="gmLaunchMonopoly()">'
    + '    <div class="gm-game-icon gm-monopoly">🦊</div>'
    + '    <div class="gm-game-info">'
    + '      <div class="gm-game-name">🦊 狐狐大富翁</div>'
    + '      <div class="gm-game-desc">走格子冒险，关卡可编辑～</div>'
    + '    </div><div class="gm-game-arrow">›</div>'
    + '  </div>'
    + '</div>';
  }

  function showFullGame(show) {
    var el = $('gmGameFull');
    if (!el) return;
    if (show) el.classList.add('show');
    else el.classList.remove('show');
  }

  window.gmBackToCenter = function() {
    mpEditing = false;
    mpMoving = false;
    showFullGame(false);
    renderGameCenter();
  };

  /* ================================================================
     Game 1: 数字炸弹
     ================================================================ */
  var nbTarget = 0, nbMin = 1, nbMax = 50, nbGuessed = {};
  var nbGameOver = false;

  window.gmLaunchBomb = function() {
    gmCurrentGame = 'bomb';
    nbGameOver = false;
    var body = $('gmGameBody');
    if (!body) return;
    showFullGame(true);
    $('gmGameTitle').innerHTML = '🦊 数字炸弹';
    body.innerHTML = renderBombInit();
  };

  function renderBombInit() {
    return ''
    + '<div class="gnb-setup">'
    + '  <span class="gnb-fox">🦊💣</span>'
    + '  <h3>数字炸弹</h3>'
    + '  <p>在范围内猜一个数字，踩中炸弹就💥</p>'
    + '  <div class="gnb-input-group">'
    + '    <label>范围 1 ~</label>'
    + '    <input type="number" id="nbRange" value="50" min="10" max="200" step="10">'
    + '  </div>'
    + '  <button class="gnb-btn-start" onclick="gmBombStart()">🦊 开始游戏</button>'
    + '</div>';
  }

  window.gmBombStart = function() {
    var r = parseInt($('nbRange').value) || 50;
    if (r < 10) r = 10; if (r > 200) r = 200;
    nbMax = r; nbMin = 1; nbGuessed = {};
    nbTarget = Math.floor(Math.random() * nbMax) + 1;
    nbGameOver = false;
    renderBombPlay();
  };

  function renderBombPlay() {
    var body = $('gmGameBody');
    if (!body) return;

    var show = [];
    var range = nbMax - nbMin + 1;
    if (range <= 12) {
      for (var i = nbMin; i <= nbMax; i++) show.push(i);
    } else {
      var mid = Math.floor((nbMin + nbMax) / 2);
      var used = {};
      for (var i = nbMin; i <= Math.min(nbMax, nbMin + 3); i++) { show.push(i); used[i] = true; }
      for (var i = mid - 1; i <= mid + 1; i++) { if (i >= nbMin && i <= nbMax && !used[i]) { show.push(i); used[i] = true; } }
      for (var i = Math.max(nbMin, nbMax - 2); i <= nbMax; i++) { if (!used[i]) show.push(i); }
    }
    var padHtml = '';
    for (var p = 0; p < show.length; p++) {
      var n = show[p];
      var cls = nbGuessed[n] ? ' gnb-disabled' : '';
      padHtml += '<button class="gnb-num' + cls + '" onclick="gmBombGuess(' + n + ')">' + n + '</button>';
    }
    var histHtml = '';
    var keys = Object.keys(nbGuessed);
    if (keys.length > 0) {
      var last6 = keys.slice(-6);
      for (var h = 0; h < last6.length; h++) {
        histHtml += '<span>' + last6[h] + '</span> ';
      }
    }

    body.innerHTML = ''
    + '<div class="gnb-play">'
    + '  <div class="gnb-bomb-icon">🦊💣</div>'
    + '  <div class="gnb-range">'
    + '    <div class="gnb-range-label">当前范围</div>'
    + '    <div class="gnb-range-nums">'
    + '      <span class="gnb-lo">' + nbMin + '</span>'
    + '      <span class="gnb-sep">→</span>'
    + '      <span class="gnb-hi">' + nbMax + '</span>'
    + '    </div>'
    + '  </div>'
    + '  <div class="gnb-prompt">选一个数字，不要踩到炸弹哦~</div>'
    + '  <div class="gnb-custom-input">'
    + '    <input type="number" id="nbCustom" placeholder="输入数字" min="' + nbMin + '" max="' + nbMax + '">'
    + '    <button onclick="gmBombCustomGuess()">猜！</button>'
    + '  </div>'
    + '  <div class="gnb-numpad">' + padHtml + '</div>'
    + (histHtml ? '<div class="gnb-history">已猜：' + histHtml + '</div>' : '')
    + '</div>';
  }

  window.gmBombGuess = function(n) {
    if (nbGameOver) return;
    if (nbGuessed[n]) return;
    nbGuessed[n] = true;
    if (n === nbTarget) { showBombResult(true, n); return; }
    if (n < nbTarget) nbMin = Math.max(nbMin, n + 1);
    else nbMax = Math.min(nbMax, n - 1);
    if (nbMin > nbMax) { showBombResult(true, nbTarget); return; }
    renderBombPlay();
  };

  window.gmBombCustomGuess = function() {
    if (nbGameOver) return;
    var inp = $('nbCustom');
    if (!inp) return;
    var n = parseInt(inp.value);
    if (isNaN(n) || n < nbMin || n > nbMax) { inp.style.borderColor = '#EF4444'; return; }
    inp.style.borderColor = '';
    inp.value = '';
    gmBombGuess(n);
  };

  function showBombResult(isBomb, num) {
    nbGameOver = true;
    var el = $('gnbExplosion');
    if (!el) return;
    if (isBomb) {
      $('gnbBoomFox').textContent = '🦊💥';
      $('gnbBoomText').textContent = '光光爆炸喽！';
      $('gnbBoomSub').textContent = '炸弹数字是 ' + num;
    } else {
      $('gnbBoomFox').textContent = '🦊✨';
      $('gnbBoomText').textContent = '安全！';
      $('gnbBoomSub').textContent = '猜中了 ' + num;
    }
    el.classList.add('show');
  }

  window.gmBombCloseExplosion = function() {
    $('gnbExplosion').classList.remove('show');
    gmBombStart();
  };

  window.gmBombRestart = function() {
    gmLaunchBomb();
  };

  /* ----- 全局重来 ----- */
  var gmCurrentGame = '';
  window.gmRestartGame = function() {
    if (gmCurrentGame === 'bomb') gmLaunchBomb();
    else if (gmCurrentGame === 'dice') gmLaunchDice();
    else if (gmCurrentGame === 'monopoly') gmLaunchMonopoly();
  };

  /* ================================================================
     Game 2: 3D掷骰子
     ================================================================ */
  var dcRolling = false;
  var dcBombFace = 6;
  /* Face rotation: value → [rotateX, rotateY] in degrees */
  var dcFaceRot = {
    1: [   0,   0],
    2: [   0, -90],
    3: [ -90,   0],
    4: [  90,   0],
    5: [   0,  90],
    6: [ 180,   0]
  };

  window.gmLaunchDice = function() {
    gmCurrentGame = 'dice';
    var body = $('gmGameBody');
    if (!body) return;
    showFullGame(true);
    $('gmGameTitle').innerHTML = '🦊 掷骰子';
    body.innerHTML = renderDiceUI();
  };

  /* OBS-safe wrapper: ensure full-game container is visible during roll */
  function ensureGameFullVisible() {
    var el = $('gmGameFull');
    if (el && !el.classList.contains('show')) {
      el.classList.add('show');
    }
  }

  function renderDiceUI() {
    var bombBtnHtml = '';
    for (var f = 1; f <= 6; f++) {
      var isBomb = (f === dcBombFace);
      bombBtnHtml += '<button onclick="gmDiceSetBomb(' + f + ')" style="'
        + 'width:40px;height:40px;border-radius:50%;'
        + 'border:2px solid ' + (isBomb ? '#EF4444' : 'rgba(255,255,255,.2)') + ';'
        + 'background:' + (isBomb ? 'rgba(239,68,68,.25)' : 'rgba(255,255,255,.06)') + ';'
        + 'color:' + (isBomb ? '#EF4444' : 'rgba(255,255,255,.6)') + ';'
        + 'font-size:' + (isBomb ? '18px' : '13px') + ';font-weight:bold;cursor:pointer;'
        + 'font-family:inherit;transition:all .2s;line-height:36px;text-align:center;padding:0;'
        + 'margin:0 2px'
        + '">' + (isBomb ? '💣' : f) + '</button>';
    }

    return ''
    + '<div class="gdc-container">'
    + '  <span class="gdc-fox">🦊</span>'
    + '  <div class="gdc-scene">'
    + '    <div class="gdc-cube" id="dcCube">'
    + '      ' + makeFace(1, 'front')
    + '      ' + makeFace(2, 'right')
    + '      ' + makeFace(3, 'top')
    + '      ' + makeFace(4, 'bottom')
    + '      ' + makeFace(5, 'left')
    + '      ' + makeFace(6, 'back')
    + '    </div>'
    + '  </div>'
    + '  <div class="gdc-result" id="dcResult">'
    + '    <div class="gdc-result-label">🦊 来掷一下吧~</div>'
    + '  </div>'
    + '  <button class="gdc-roll-btn" id="dcRollBtn" onclick="gmDiceRoll()">'
    + '    🎲 掷骰子'
    + '  </button>'
    + '  <div class="gdc-settings">'
    + '    <div class="gdc-mode-toggle" style="text-align:center">'
    + '      <div style="margin-bottom:4px;font-size:12px;color:rgba(255,255,255,.5)">选择炸弹面：</div>'
    + '      <div style="display:flex;justify-content:center;gap:2px">' + bombBtnHtml + '</div>'
    + '    </div>'
    + '    <div class="gdc-rewards show" id="dcRewards">'
    + '      <div class="gdc-reward-hint">每面奖励(1-6点，含炸弹面的兑奖结果)：</div>'
    + '      ' + makeRewardInputs() + ''
    + '    </div>'
    + '  </div>'
    + '</div>';
  }

  function makeFace(val, pos) {
    var isBomb = (val === dcBombFace);
    var cls = 'gdc-face ' + pos + (isBomb ? ' gdc-bomb-face' : '');
    if (val === 1) {
      return '<div class="' + cls + '"><span class="gdc-fox-face">🦊</span>' + (isBomb ? '<span style="position:absolute;top:-4px;right:-4px;font-size:12px;">💣</span>' : '') + '</div>';
    }
    var dotMap = {
      2: ['a','c'],
      3: ['a','e','i'],
      4: ['a','c','g','i'],
      5: ['a','c','e','g','i'],
      6: ['a','c','d','f','g','i']
    };
    var dots = dotMap[val] || [];
    var dotsHtml = '';
    for (var j = 0; j < dots.length; j++) {
      dotsHtml += '<div class="gdc-dot" style="grid-area:' + dots[j] + '"></div>';
    }
    return '<div class="' + cls + '">'
      + '<div class="gdc-dots" style="grid-template-areas:'
      + '\'a b c\' \'d e f\' \'g h i\'">'
      + dotsHtml
      + '</div>'
      + (isBomb ? '<span style="position:absolute;top:-2px;right:-2px;font-size:10px;z-index:2;filter:drop-shadow(0 0 2px rgba(239,68,68,.6))">💣</span>' : '')
      + '</div>';
  }

  function makeRewardInputs() {
    var defaults = [
      '🦊 狐狐jio印奖！', '好事成双～', '三生有幸！',
      '四季平安！', '五福临门！', '💥 光光爆炸喽！'
    ];
    var html = '';
    for (var i = 1; i <= 6; i++) {
      var isBomb = (i === dcBombFace);
      html += '<div class="gdc-reward-item">'
        + '<span>' + i + (isBomb ? '💣' : '') + '</span>'
        + '<input id="dcReward' + i + '" value="' + escA(defaults[i-1]) + '" placeholder="点数' + i + '奖励" style="font-size:15px;min-height:32px;color:#e0e0e0;background:rgba(255,255,255,.06)">'
        + '</div>';
    }
    return html;
  }

  window.gmDiceSetBomb = function(face) {
    if (dcRolling) return;
    dcBombFace = face;
    var body = $('gmGameBody');
    if (body) body.innerHTML = renderDiceUI();
  };

  window.gmDiceRoll = function() {
    if (dcRolling) return;
    dcRolling = true;
    var btn = $('dcRollBtn');
    if (btn) btn.disabled = true;

    var result = Math.floor(Math.random() * 6) + 1;
    var rot = dcFaceRot[result];
    var extraX = (Math.floor(Math.random() * 2) + 3) * 360;
    var extraY = (Math.floor(Math.random() * 2) + 2) * 360;

    var cube = $('dcCube');
    if (!cube) { dcRolling = false; return; }

    cube.classList.remove('rolling');
    cube.style.transform = 'rotateX(' + (Math.random()*360) + 'deg) rotateY(' + (Math.random()*360) + 'deg)';
    void cube.offsetWidth;
    cube.classList.add('rolling');

    setTimeout(function() {
      cube.classList.remove('rolling');
      cube.style.transition = 'transform .5s cubic-bezier(.34,1.56,.64,1)';
      cube.style.transform = 'rotateX(' + (rot[0] + extraX) + 'deg) rotateY(' + (rot[1] + extraY) + 'deg)';

      var rewardEl = $('dcReward' + result);
      var rewardText = rewardEl ? rewardEl.value : '';
      var isBomb = (result === dcBombFace);

      var resultDiv = $('dcResult');
      if (resultDiv) {
        resultDiv.innerHTML = ''
        + '<div class="gdc-result-value' + (isBomb ? ' gdc-bomb-val' : '') + '">' + result + '</div>'
        + '<div class="gdc-result-label">' + esc(rewardText || ('点数 ' + result)) + '</div>';

        if (isBomb) {
          setTimeout(function() {
            showDiceBombPopup(result, rewardText);
          }, 400);
        }
      }

      dcRolling = false;
      if (btn) btn.disabled = false;

      setTimeout(function() {
        cube.style.transition = 'transform .6s cubic-bezier(.34,1.56,.64,1)';
      }, 600);
    }, 900);
  };

  function showDiceBombPopup(result, rewardText) {
    var el = $('gdcBombPopup');
    if (!el) return;
    $('gdcBombFoxIcon').textContent = '🦊💥';
    $('gdcBombText').textContent = '光光爆炸喽！';
    $('gdcBombSub').textContent = '掷出了 ' + result + ' 点（炸弹面）—— ' + (rewardText || '');
    el.classList.add('show');
  }

  window.gmDiceCloseBomb = function() {
    $('gdcBombPopup').classList.remove('show');
  };

  window.gmDiceBackToCenter = function() {
    showFullGame(false);
    renderGameCenter();
  };

  /* ================================================================
     Game 3: 狐狐大富翁
     ================================================================ */
  var mpTiles = cloneDefaultTiles();
  var mpPos = 0;
  var mpDice = 0;
  var mpEditing = false;
  var mpMoving = false;
  var mpCurrentBoardName = '__default__';
  var mpEditIdx = -1; // currently editing tile index
  var mpCachedBoards = {};

  var mpPresetEmojis = ['🏁','🌲','🌸','🌙','⭐','🍗','🎁','💣','😈','❓','🎉','✨','🔥','💎','🎪','🎯','🌈','🦊','🐾','🍀','👑','💫','🧩','🎈'];

  var SELECT_STYLE = 'font-size:14px;min-height:28px;padding:4px 8px;color:#e0e0e0;background:#2a2a3a;border:1px solid rgba(255,255,255,.15);border-radius:6px;cursor:pointer;font-family:inherit;max-width:100px;outline:none';
  var INPUT_STYLE = 'font-size:14px;min-height:28px;padding:4px 8px;color:#e0e0e0;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:6px;font-family:inherit;outline:none';

  function cloneDefaultTiles() {
    return [
      { type:'start', emoji:'🏁', label:'起点' },
      { type:'normal', emoji:'🌲', label:'森林小道' },
      { type:'penalty', emoji:'😈', label:'狐狸陷阱\n后退2格' },
      { type:'normal', emoji:'🌸', label:'樱花路' },
      { type:'reward', emoji:'🍗', label:'幸运鸡腿\n前进2格' },
      { type:'normal', emoji:'🌙', label:'月光台' },
      { type:'bomb', emoji:'💣', label:'光光炸弹\n退回起点' },
      { type:'normal', emoji:'⭐', label:'星星桥' },
      { type:'reward', emoji:'🎁', label:'惊喜礼盒\n再掷一次' },
      { type:'end', emoji:'🏆', label:'终点' },
    ];
  }

  /* --- Supabase-backed board storage --- */
  async function getMonoBoards() {
    if (!window.sb) return {};
    try {
      var res = await window.sb.from('monopoly_boards').select('name,tiles,author');
      if (res.error) throw res.error;
      var boards = {};
      (res.data || []).forEach(function(r) {
        boards[r.name] = r.tiles;
        if (r.author) boards[r.name]._author = r.author;
      });
      return boards;
    } catch(e) { console.warn('getMonoBoards:', e); return {}; }
  }

  async function saveMonoBoards(boards) {
    if (!window.sb) return;
    try {
      var rows = [];
      Object.keys(boards).forEach(function(name) {
        var b = boards[name];
        var author = (b._author || '');
        var cleanTiles = JSON.parse(JSON.stringify(b));
        rows.push({ name: name, tiles: cleanTiles, author: author });
      });
      var res = await window.sb.from('monopoly_boards').upsert(rows, { onConflict: 'name' });
      if (res.error) { console.warn('saveMonoBoards:', res.error); return; }
      // 直接更新缓存，省掉第二次select往返
      mpCachedBoards = boards;
      updateSyncStatus();
    } catch(e) { console.warn('saveMonoBoards:', e); }
  }

  async function deleteMonoBoard(name) {
    if (!window.sb || !name) return;
    try {
      var res = await window.sb.from('monopoly_boards').delete().eq('name', name);
      if (res.error) { console.warn('deleteMonoBoard:', res.error); return; }
      // 直接更新缓存
      delete mpCachedBoards[name];
      updateSyncStatus();
    } catch(e) { console.warn('deleteMonoBoard:', e); }
  }

  async function mpRefreshBoards() {
    mpCachedBoards = await getMonoBoards();
    updateSyncStatus();
  }

  function updateSyncStatus() {
    var el = $('mpSyncStatus');
    if (!el) return;
    el.textContent = '☁️ 已同步';
    el.className = 'gmp-sync-status';
  }

  window.gmLaunchMonopoly = async function() {
    gmCurrentGame = 'monopoly';
    mpEditing = false; mpMoving = false; mpPos = 0; mpDice = 0; mpEditIdx = -1;
    var body = $('gmGameBody');
    if (!body) return;
    showFullGame(true);
    $('gmGameTitle').innerHTML = '🦊 狐狐大富翁';
    await mpRefreshBoards();
    body.innerHTML = renderMonopolyUI();
  };

  function renderMonopolyUI() {
    var gridCols = Math.min(mpTiles.length, 6);
    var html = ''
    + '<div class="gmp-container" style="position:relative;overflow:hidden">'
    + mpBgPattern();

    /* Board */
    html += '<div class="gmp-board" style="grid-template-columns:repeat(' + gridCols + ',1fr);position:relative;z-index:1">';
    for (var i = 0; i < mpTiles.length; i++) {
      var t = mpTiles[i];
      var isStart = (t.type === 'start');
      var isEnd = (t.type === 'end');
      var isLast = (i === mpTiles.length - 1);
      var cls = 'gmp-tile gmp-t-' + t.type;
      if (i === mpPos) cls += ' gmp-current';
      if (mpEditing) cls += ' editing';

      /* Insert button before last tile (end) and optionally between tiles */
      if (mpEditing && isLast) {
        html += '<button class="gmp-insert-btn" onclick="gmMonoInsertTile(' + i + ')" title="在终点前插入新格子">+</button>';
      }

      html += '<div class="' + cls + '" onclick="' + (mpEditing ? 'gmMonoEditTile(' + i + ')' : 'gmMonoClick(' + i + ')') + '">'
        + '<span class="gmp-tile-emoji">' + esc(t.emoji) + '</span>'
        + '<span class="gmp-tile-label">' + esc(t.label).replace(/\n/g,' ') + '</span>'
        + (i === mpPos ? '<span class="gmp-player">🦊</span>' : '');

      /* Edit overlay */
      if (mpEditing) {
        html += '<div class="gmp-tile-edit-overlay">'
          + '<button class="gmp-edit-icon" onclick="event.stopPropagation();gmMonoEditTile(' + i + ')" title="编辑">✏️</button>';
        if (!isStart && !isEnd) {
          html += '<button class="gmp-del-icon" onclick="event.stopPropagation();gmMonoDeleteTile(' + i + ')" title="删除">×</button>';
        }
        html += '</div>';
      }

      html += '</div>';
    }
    html += '</div>';

    /* Controls — hidden when editing */
    if (!mpEditing) {
      html += '<div class="gmp-controls" style="position:relative;z-index:1">'
        + '<div class="gmp-dice-display" id="mpDice">' + (mpDice > 0 ? mpDice : '?') + '</div>'
        + '<button class="gmp-roll-btn" id="mpRollBtn" onclick="gmMonoRoll()"'
        + (mpMoving ? ' disabled style="opacity:.5;pointer-events:none"' : '')
        + '>'
        + (mpDice > 0 ? '🎲 走' + mpDice + '步' : '🎲 掷骰子')
        + '</button>'
        + '</div>'
        + '<div class="gmp-pos" style="position:relative;z-index:1">🦊 位置：第' + (mpPos + 1) + '格 '
        + esc(mpTiles[mpPos].label).replace(/\n/g,' ') + '</div>';
    }

    /* Edit toggle */
    html += '<div style="margin-top:12px;text-align:center;position:relative;z-index:1">'
      + '<button class="gmp-edit-btn' + (mpEditing ? ' active' : '') + '" onclick="gmMonoToggleEdit()">'
      + (mpEditing ? '✓ 完成编辑' : '✏️ 编辑棋盘')
      + '</button></div>';

    /* Board Manager (save/load) — only when editing */
    if (mpEditing) {
      html += '<div style="position:relative;z-index:1">' + mpSaveLoadUI() + '</div>';
    }

    html += '</div>';
    return html;
  }

  function mpBgPattern() {
    var stars = [
      '✨','⭐','🌟','🦊','💫','🌙','❄','💎','🎀'
    ];
    var items = '';
    for (var s = 0; s < 16; s++) {
      var icon = stars[s % stars.length];
      var top = (s * 37 + 11) % 100;
      var left = (s * 53 + 7) % 100;
      var size = 12 + (s % 3) * 4;
      var op = 0.06 + (s % 5) * 0.03;
      var rot = (s * 27) % 360;
      items += '<span style="position:absolute;top:' + top + '%;left:' + left
        + '%;font-size:' + size + 'px;opacity:' + op
        + ';transform:rotate(' + rot + 'deg);pointer-events:none">' + icon + '</span>';
    }
    return '<div style="position:absolute;inset:0;pointer-events:none;z-index:0;overflow:hidden">' + items + '</div>'
      + '<div style="position:absolute;inset:0;pointer-events:none;z-index:0;background:'
      + 'radial-gradient(ellipse at 20% 80%, rgba(255,154,86,.06) 0%, transparent 50%),'
      + 'radial-gradient(ellipse at 80% 20%, rgba(255,192,203,.05) 0%, transparent 50%),'
      + 'radial-gradient(ellipse at 60% 60%, rgba(173,216,230,.04) 0%, transparent 50%)'
      + '"></div>';
  }

  function mpSaveLoadUI() {
    var boards = mpCachedBoards;
    var boardNames = Object.keys(boards);
    var isAdmin = (typeof window.role !== 'undefined' && window.role === 'admin');
    var html = ''
    + '<div class="gmp-board-manager">'
    + '  <select id="mpBoardSelect" onchange="gmMonoLoadBoard(this.value)" style="flex:1;min-width:140px;padding:8px 10px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:#2a2a3a;color:#e0e0e0;font-size:13px;font-family:inherit;cursor:pointer;outline:none;min-height:36px">'
    + '    <option value="__default__"' + (mpCurrentBoardName === '__default__' ? ' selected' : '') + '>🦊 默认棋盘</option>';
    for (var b = 0; b < boardNames.length; b++) {
      var bn = boardNames[b];
      var bt = boards[bn];
      var author = bt && bt._author ? ' — ' + bt._author : '';
      html += '<option value="' + escA(bn) + '"' + (mpCurrentBoardName === bn ? ' selected' : '') + '>' + esc(bn) + author + '</option>';
    }
    html += '  </select>'
      + '  <button class="gmp-ep-save-btn" onclick="gmMonoSaveBoard()">💾 保存棋盘</button>';
    if (isAdmin) {
      html += '  <button class="gmp-ep-del-btn" onclick="gmMonoDeleteBoard()">🗑 删除棋盘</button>';
    }
    html += '  <span class="gmp-sync-status" id="mpSyncStatus">☁️ 已同步</span>';
    html += '</div>';
    return html;
  }

  /* ================================================================
     Edit Popup Functions
     ================================================================ */

  /* Open edit popup for tile at index */
  window.gmMonoEditTile = function(idx) {
    if (!mpEditing) return;
    mpEditIdx = idx;
    var t = mpTiles[idx];
    var isStart = (t.type === 'start');
    var isEnd = (t.type === 'end');

    var popup = $('gmpEditPopup');
    if (!popup) return;

    $('gmpEditTitle').textContent = '编辑第' + (idx + 1) + '格';

    /* Type selector: hide start/end for non-start/end; lock start/end types */
    var typeSel = $('gmpEditType');
    if (isStart) {
      typeSel.value = 'start';
      typeSel.style.display = 'none';
    } else if (isEnd) {
      typeSel.value = 'end';
      typeSel.style.display = 'none';
    } else {
      typeSel.style.display = '';
      typeSel.value = t.type;
      /* Hide start/end options for middle tiles */
      var opts = typeSel.options;
      for (var o = 0; o < opts.length; o++) {
        if (opts[o].value === 'start' || opts[o].value === 'end') {
          opts[o].disabled = true;
        } else {
          opts[o].disabled = false;
        }
      }
    }

    /* Emoji */
    $('gmpEditEmoji').value = t.emoji;

    /* Label */
    $('gmpEditLabel').value = t.label;

    /* Emoji picker */
    renderEmojiPicker(t.emoji);

    /* Delete button visibility */
    var delBtn = $('gmpEditDelete');
    if (isStart || isEnd) {
      delBtn.style.display = 'none';
    } else {
      delBtn.style.display = '';
    }

    popup.classList.add('show');
  };

  /* Render emoji picker grid in popup */
  function renderEmojiPicker(currentEmoji) {
    var picker = $('gmpEditEmojiPicker');
    if (!picker) return;
    var html = '';
    for (var k = 0; k < mpPresetEmojis.length; k++) {
      var e = mpPresetEmojis[k];
      var isActive = (e === currentEmoji);
      html += '<button class="gmp-ep-emoji-btn' + (isActive ? ' active' : '') + '" onclick="gmMonoPickEmoji(\'' + e + '\')">' + e + '</button>';
    }
    picker.innerHTML = html;
  }

  /* Pick emoji from picker */
  window.gmMonoPickEmoji = function(emoji) {
    var inp = $('gmpEditEmoji');
    if (inp) inp.value = emoji;
    renderEmojiPicker(emoji);
  };

  /* Update emoji picker highlight when typing */
  window.gmMonoEmojiPickerUpdate = function() {
    var inp = $('gmpEditEmoji');
    if (inp) renderEmojiPicker(inp.value);
  };

  /* Save tile from popup */
  window.gmMonoSaveTile = function() {
    if (mpEditIdx < 0) return;
    var t = mpTiles[mpEditIdx];
    var isStart = (t.type === 'start');
    var isEnd = (t.type === 'end');

    var newType = isStart ? 'start' : (isEnd ? 'end' : $('gmpEditType').value);
    var newEmoji = $('gmpEditEmoji').value || t.emoji;
    var newLabel = $('gmpEditLabel').value || t.label;

    mpTiles[mpEditIdx].type = newType;
    mpTiles[mpEditIdx].emoji = newEmoji;
    mpTiles[mpEditIdx].label = newLabel;

    gmMonoCloseEditPopup();
    $('gmGameBody').innerHTML = renderMonopolyUI();
  };

  /* Delete tile from popup */
  window.gmMonoPopupDelete = function() {
    if (mpEditIdx <= 0 || mpEditIdx >= mpTiles.length - 1) return;
    gmMonoDeleteTile(mpEditIdx);
  };

  /* Close edit popup */
  window.gmMonoCloseEditPopup = function() {
    mpEditIdx = -1;
    var popup = $('gmpEditPopup');
    if (popup) popup.classList.remove('show');
  };

  /* Delete tile by index (from board overlay) */
  window.gmMonoDeleteTile = function(idx) {
    if (!mpEditing) return;
    if (idx <= 0 || idx >= mpTiles.length - 1) return;
    mpTiles.splice(idx, 1);
    if (mpPos >= mpTiles.length) mpPos = mpTiles.length - 1;
    gmMonoCloseEditPopup();
    $('gmGameBody').innerHTML = renderMonopolyUI();
  };

  /* Insert tile before index */
  window.gmMonoInsertTile = function(idx) {
    if (!mpEditing) return;
    mpTiles.splice(idx, 0, { type:'normal', emoji:'❓', label:'新格子' });
    $('gmGameBody').innerHTML = renderMonopolyUI();
  };

  /* ================================================================
     Save / Load / Delete Board
     ================================================================ */

  /* Save current board — opens styled popup instead of ugly prompt */
  /* Save board loading overlay */
  function showMpSaving(msg) {
    var el = $('mpSavingOverlay');
    if (!el) return;
    $('mpSavingText').textContent = msg || '⏳ 小光正在努力...';
    el.classList.add('show');
  }
  function hideMpSaving() {
    var el = $('mpSavingOverlay');
    if (el) el.classList.remove('show');
  }

  window.gmMonoSaveBoard = async function() {
    if (mpCurrentBoardName !== '__default__') {
      showMpSaving('⏳ 正在保存棋盘...');
      var boards2 = mpCachedBoards;
      var existing = boards2[mpCurrentBoardName];
      var author = existing ? existing._author : '';
      boards2[mpCurrentBoardName] = JSON.parse(JSON.stringify(mpTiles));
      boards2[mpCurrentBoardName]._author = author;
      setSyncStatus('🔄 同步中...', 'syncing');
      await saveMonoBoards(boards2);
      hideMpSaving();
      $('gmGameBody').innerHTML = renderMonopolyUI();
    } else {
      var popup = $('gmpSavePopup');
      if (!popup) return;
      $('gmpSaveName').value = '';
      $('gmpSaveAuthor').value = '';
      popup.classList.add('show');
      setTimeout(function() { $('gmpSaveName').focus(); }, 200);
    }
  };

  window.gmMonoConfirmSaveBoard = async function() {
    var name = ($('gmpSaveName').value || '').trim();
    if (!name) { $('gmpSaveName').style.borderColor = '#EF4444'; return; }
    if (name === '__default__') name = name + '_copy';
    var author = ($('gmpSaveAuthor').value || '').trim();
    gmMonoCloseSavePopup();
    showMpSaving('⏳ 正在保存棋盘到云端...');
    var boards = mpCachedBoards;
    boards[name] = JSON.parse(JSON.stringify(mpTiles));
    if (author) boards[name]._author = author;
    setSyncStatus('🔄 同步中...', 'syncing');
    await saveMonoBoards(boards);
    mpCurrentBoardName = name;
    hideMpSaving();
    $('gmGameBody').innerHTML = renderMonopolyUI();
  };

  window.gmMonoCloseSavePopup = function() {
    var popup = $('gmpSavePopup');
    if (popup) popup.classList.remove('show');
    $('gmpSaveName').style.borderColor = '';
  };

  /* Load board from dropdown */
  window.gmMonoLoadBoard = function(name) {
    if (!name) return;
    if (mpMoving) return;
    if (name === '__default__') {
      mpTiles = cloneDefaultTiles();
    } else {
      var boards = mpCachedBoards;
      if (boards[name]) {
        mpTiles = JSON.parse(JSON.stringify(boards[name]));
      } else return;
    }
    mpPos = 0;
    mpDice = 0;
    mpEditIdx = -1;
    mpCurrentBoardName = name;
    $('gmGameBody').innerHTML = renderMonopolyUI();
  };

  /* Delete selected board — admin only */
  window.gmMonoDeleteBoard = async function() {
    var isAdmin = (typeof window.role !== 'undefined' && window.role === 'admin');
    if (!isAdmin) return;
    var sel = $('mpBoardSelect');
    if (!sel) return;
    var name = sel.value;
    if (!name || name === '__default__') return;
    var boards = mpCachedBoards;
    if (!boards[name]) return;
    if (!confirm('确定要删除棋盘「' + name + '」吗？此操作不可撤销。')) return;
    showMpSaving('🗑 正在删除棋盘...');
    setSyncStatus('🔄 同步中...', 'syncing');
    delete boards[name];
    await deleteMonoBoard(name);
    mpCurrentBoardName = '__default__';
    hideMpSaving();
    $('gmGameBody').innerHTML = renderMonopolyUI();
  };

  function setSyncStatus(text, cls) {
    var el = $('mpSyncStatus');
    if (!el) return;
    el.textContent = text;
    el.className = 'gmp-sync-status' + (cls ? ' ' + cls : '');
  }

  window.gmMonoRoll = function() {
    if (mpMoving) return;
    if (mpDice > 0) {
      mpMoving = true;
      var steps = mpDice;
      mpDice = 0;
      var targetPos = Math.min(mpTiles.length - 1, mpPos + steps);
      animateFoxMove(targetPos);
    } else {
      mpDice = Math.floor(Math.random() * 6) + 1;
      $('gmGameBody').innerHTML = renderMonopolyUI();
      /* Auto-move fox after showing dice */
      setTimeout(function() { if (!mpMoving && !mpEditing) window.gmMonoRoll(); }, 300);
    }
  };

  function animateFoxMove(targetPos) {
    var startPos = mpPos;
    var step = 0;
    var totalSteps = targetPos - startPos;

    if (totalSteps <= 0) {
      mpMoving = false;
      $('gmGameBody').innerHTML = renderMonopolyUI();
      setTimeout(function() { applyMonoEffect(startPos, targetPos); }, 300);
      return;
    }

    function doStep() {
      step++;
      mpPos = startPos + step;
      $('gmGameBody').innerHTML = renderMonopolyUI();
      if (step < totalSteps) {
        setTimeout(doStep, 200);
      } else {
        mpMoving = false;
        $('gmGameBody').innerHTML = renderMonopolyUI();
        setTimeout(function() { applyMonoEffect(startPos, targetPos); }, 400);
      }
    }
    doStep();
  }

  function applyMonoEffect(from, to) {
    var t = mpTiles[to];
    if (t.type === 'penalty') {
      showMonoPopup('😿', '掉进陷阱了！', t.label.replace(/\n/g,' · '), function() {
        if (t.label.indexOf('后退') >= 0) {
          mpPos = Math.max(0, to - 2);
          $('gmGameBody').innerHTML = renderMonopolyUI();
        } else if (t.label.indexOf('停一轮') >= 0) {
          /* Just stay */
        } else {
          mpPos = Math.max(0, to - 1);
          $('gmGameBody').innerHTML = renderMonopolyUI();
        }
      });
    } else if (t.type === 'bomb') {
      showMonoPopup('🦊💥', '光光爆炸喽！', t.label.replace(/\n/g,' · '), function() {
        if (t.label.indexOf('退回起点') >= 0) {
          mpPos = 0;
          $('gmGameBody').innerHTML = renderMonopolyUI();
        } else {
          mpPos = Math.max(0, to - 3);
          $('gmGameBody').innerHTML = renderMonopolyUI();
        }
      });
    } else if (t.type === 'reward') {
      showMonoPopup('🎉', '运气真好！', t.label.replace(/\n/g,' · '), function() {
        if (t.label.indexOf('前进') >= 0) {
          mpPos = Math.min(mpTiles.length - 1, to + 2);
        } else if (t.label.indexOf('再掷一次') >= 0 || t.label.indexOf('再掷') >= 0) {
          mpDice = 0;
        } else {
          mpPos = Math.min(mpTiles.length - 1, to + 1);
        }
        $('gmGameBody').innerHTML = renderMonopolyUI();
      });
    } else if (t.type === 'end') {
      showMonoPopup('🏆', '到达终点！', '恭喜完成狐狐大富翁之旅！');
    }
  }

  function showMonoPopup(icon, title, sub, cb) {
    var el = $('gmpPopup');
    if (!el) return;
    $('gmpPopupIcon').textContent = icon;
    $('gmpPopupText').textContent = title;
    $('gmpPopupSub').textContent = sub;
    el._cb = cb;
    el.classList.add('show');
  }

  window.gmMonoPopupClose = function() {
    var el = $('gmpPopup');
    if (!el) return;
    el.classList.remove('show');
    if (el._cb) { var cb = el._cb; el._cb = null; cb(); }
  };

  window.gmMonoClick = function(i) {
    if (mpEditing) return;
    if (mpMoving) return;
    var t = mpTiles[i];
    if (i === mpPos && t.type !== 'start' && t.type !== 'end') return;
    showMonoPopup(t.emoji, t.label.replace(/\n/g,' · '), '第' + (i+1) + '格 · ' + (t.type==='reward'?'奖励':t.type==='penalty'?'惩罚':t.type==='bomb'?'💣炸弹':t.type==='start'?'起点':t.type==='end'?'终点':'普通'));
  };

  window.gmMonoToggleEdit = function() {
    mpEditing = !mpEditing;
    mpEditIdx = -1;
    gmMonoCloseEditPopup();
    $('gmGameBody').innerHTML = renderMonopolyUI();
  };

  /* Removed: gmMonoSet, gmMonoDel, gmMonoAdd, gmMonoSetEmoji — replaced by popup editor */

})();
