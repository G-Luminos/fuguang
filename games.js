/* ================================================================
   浮光小游戏中心 - Games JS
   数字炸弹 / 3D掷骰子 / 狐狐大富翁
   狐狸主题 · 无存储 · 投屏友好
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
    showFullGame(false);
    renderGameCenter();
  };

  /* ================================================================
     Game 1: 数字炸弹
     ================================================================ */
  var nbTarget = 0, nbMin = 1, nbMax = 50, nbGuessed = {};

  window.gmLaunchBomb = function() {
    gmCurrentGame = 'bomb';
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
    renderBombPlay();
  };

  function renderBombPlay() {
    var body = $('gmGameBody');
    if (!body) return;

    var pad = '';
    /* Show 12 nearest guessable numbers */
    var show = []; var range = nbMax - nbMin + 1;
    if (range <= 12) {
      for (var i = nbMin; i <= nbMax; i++) show.push(i);
    } else {
      /* Show min area + mid area + max area */
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
    /* Custom input */
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
    if (nbGuessed[n]) return;
    nbGuessed[n] = true;
    if (n === nbTarget) { showBombResult(true, n); return; }
    if (n < nbTarget) nbMin = Math.max(nbMin, n + 1);
    else nbMax = Math.min(nbMax, n - 1);
    if (nbMin > nbMax) { showBombResult(true, nbTarget); return; }
    renderBombPlay();
  };

  window.gmBombCustomGuess = function() {
    var inp = $('nbCustom');
    if (!inp) return;
    var n = parseInt(inp.value);
    if (isNaN(n) || n < nbMin || n > nbMax) { inp.style.borderColor = '#EF4444'; return; }
    inp.style.borderColor = '';
    inp.value = '';
    gmBombGuess(n);
  };

  function showBombResult(isBomb, num) {
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
  var dcBombFace = 3;  /* face 3 (value=4) is the bomb by default; user can change */
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

  function renderDiceUI() {
    return ''
    + '<div class="gdc-container">'
    + '  <span class="gdc-fox">🦊</span>'
    + '  <div class="gdc-scene">'
    + '    <div class="gdc-cube" id="dcCube">'
    + '      ' + makeFace(1, 'front')  /* 狐狸脚印 */
    + '      ' + makeFace(2, 'right')
    + '      ' + makeFace(3, 'top')
    + '      ' + makeFace(4, 'bottom')  /* 默认炸弹面 */
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
    + '    <div class="gdc-mode-toggle">'
    + '      <button class="gdc-mode-btn active" onclick="gmDiceSetBomb(' + dcBombFace + ',this)">💣炸弹面:' + dcBombFace + '</button>'
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
      /* Face 1: fox paw */
      return '<div class="' + cls + '"><span class="gdc-fox-face">🦊</span></div>';
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
    /* 9-cell grid areas: a b c / d e f / g h i */
    return '<div class="' + cls + '">'
      + '<div class="gdc-dots" style="grid-template-areas:'
      + '\'a b c\' \'d e f\' \'g h i\'">'
      + dotsHtml
      + '</div></div>';
  }

  function makeRewardInputs() {
    var defaults = [
      '🦊 狐狐jio印奖！', '好事成双～', '三生有幸！',
      '💥 光光爆炸喽！', '五福临门！', '六六大顺！'
    ];
    var html = '';
    for (var i = 1; i <= 6; i++) {
      var isBomb = (i === dcBombFace);
      html += '<div class="gdc-reward-item">'
        + '<span>' + i + (isBomb ? '💣' : '') + '</span>'
        + '<input id="dcReward' + i + '" value="' + escA(defaults[i-1]) + '" placeholder="点数' + i + '奖励">'
        + '</div>';
    }
    return html;
  }

  window.gmDiceSetBomb = function(face, btn) {
    if (dcRolling) return;
    dcBombFace = face;
    /* Re-render dice UI */
    var body = $('gmGameBody');
    if (body) body.innerHTML = renderDiceUI();
  };

  window.gmDiceRoll = function() {
    if (dcRolling) return;
    dcRolling = true;
    var btn = $('dcRollBtn');
    if (btn) btn.disabled = true;

    /* Determine result */
    var result = Math.floor(Math.random() * 6) + 1;
    var rot = dcFaceRot[result];
    var extraX = (Math.floor(Math.random() * 2) + 3) * 360;
    var extraY = (Math.floor(Math.random() * 2) + 2) * 360;

    var cube = $('dcCube');
    if (!cube) { dcRolling = false; return; }

    /* Start animation */
    cube.classList.remove('rolling');
    cube.style.transform = 'rotateX(' + (Math.random()*360) + 'deg) rotateY(' + (Math.random()*360) + 'deg)';
    void cube.offsetWidth;
    cube.classList.add('rolling');

    /* After animation */
    setTimeout(function() {
      cube.classList.remove('rolling');
      cube.style.transition = 'transform .5s cubic-bezier(.34,1.56,.64,1)';
      cube.style.transform = 'rotateX(' + (rot[0] + extraX) + 'deg) rotateY(' + (rot[1] + extraY) + 'deg)';

      /* Show result */
      var rewardEl = $('dcReward' + result);
      var rewardText = rewardEl ? rewardEl.value : '';
      var isBomb = (result === dcBombFace);

      var resultDiv = $('dcResult');
      if (resultDiv) {
        resultDiv.innerHTML = ''
        + '<div class="gdc-result-value' + (isBomb ? ' gdc-bomb-val' : '') + '">' + result + '</div>'
        + '<div class="gdc-result-label">' + esc(rewardText || ('点数 ' + result)) + '</div>';

        if (isBomb) {
          /* Show bomb popup */
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
  /* 默认棋盘（10格，可编辑） */
  var mpTiles = [
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
  var mpPos = 0;
  var mpDice = 0;
  var mpEditing = false;

  window.gmLaunchMonopoly = function() {
    gmCurrentGame = 'monopoly';
    var body = $('gmGameBody');
    if (!body) return;
    showFullGame(true);
    $('gmGameTitle').innerHTML = '🦊 狐狐大富翁';
    body.innerHTML = renderMonopolyUI();
  };

  function renderMonopolyUI() {
    var gridCols = Math.min(mpTiles.length, 6);
    var html = '<div class="gmp-container">';

    /* Board */
    html += '<div class="gmp-board" style="grid-template-columns:repeat(' + gridCols + ',1fr)">';
    for (var i = 0; i < mpTiles.length; i++) {
      var t = mpTiles[i];
      var cls = 'gmp-tile gmp-t-' + t.type;
      if (i === mpPos) cls += ' gmp-current';
      html += '<div class="' + cls + '" onclick="gmMonoClick(' + i + ')">'
        + '<span class="gmp-tile-emoji">' + esc(t.emoji) + '</span>'
        + '<span class="gmp-tile-label">' + esc(t.label).replace(/\n/g,' ') + '</span>'
        + (i === mpPos ? '<span class="gmp-player">🦊</span>' : '')
        + '</div>';
    }
    html += '</div>';

    /* Controls */
    html += '<div class="gmp-controls">'
      + '<div class="gmp-dice-display" id="mpDice">' + (mpDice > 0 ? mpDice : '?') + '</div>'
      + '<button class="gmp-roll-btn" id="mpRollBtn" onclick="gmMonoRoll()">'
      + (mpDice > 0 ? '🎲 走' + mpDice + '步' : '🎲 掷骰子')
      + '</button>'
      + '</div>'
      + '<div class="gmp-pos">🦊 位置：第' + (mpPos + 1) + '格 ' + esc(mpTiles[mpPos].label).replace(/\n/g,' ') + '</div>';

    /* Edit toggle */
    html += '<div style="margin-top:12px;text-align:center">'
      + '<button class="gmp-edit-btn' + (mpEditing ? ' active' : '') + '" onclick="gmMonoToggleEdit()">'
      + (mpEditing ? '✓ 完成编辑' : '✏️ 编辑棋盘')
      + '</button></div>';

    /* Editor */
    html += '<div class="gmp-editor' + (mpEditing ? ' show' : '') + '" id="mpEditor">'
      + '<div class="gmp-editor-title">🦊 编辑棋盘格子</div>'
      + '<div class="gmp-editor-grid">';
    for (var j = 0; j < mpTiles.length; j++) {
      var t = mpTiles[j];
      var canDelete = (j > 0 && j < mpTiles.length - 1);
      html += '<div class="gmp-editor-item">'
        + '<span>' + (j + 1) + '</span>'
        + '<select onchange="gmMonoSet(' + j + ',\'type\',this.value)" value="' + t.type + '">'
        + '<option value="normal"' + (t.type==='normal'?' selected':'') + '>普通</option>'
        + '<option value="reward"' + (t.type==='reward'?' selected':'') + '>奖励</option>'
        + '<option value="penalty"' + (t.type==='penalty'?' selected':'') + '>惩罚</option>'
        + '<option value="bomb"' + (t.type==='bomb'?' selected':'') + '>💣炸弹</option>'
        + '<option value="start"' + (t.type==='start'?' selected':'') + '>起点</option>'
        + '<option value="end"' + (t.type==='end'?' selected':'') + '>终点</option>'
        + '</select>'
        + '<input value="' + escA(t.emoji) + '" onchange="gmMonoSet(' + j + ',\'emoji\',this.value)" style="width:32px;text-align:center" maxlength="2">'
        + '<input value="' + escA(t.label) + '" onchange="gmMonoSet(' + j + ',\'label\',this.value)" placeholder="名称/效果">'
        + (canDelete ? '<button onclick="gmMonoDel(' + j + ')" style="background:none;border:none;color:#EF4444;cursor:pointer;font-size:16px">×</button>' : '')
        + '</div>';
    }
    html += '</div>'
      + '<button onclick="gmMonoAdd()" style="margin-top:8px;width:100%;padding:8px;border:1px dashed rgba(255,255,255,.2);border-radius:8px;background:none;color:rgba(255,255,255,.5);cursor:pointer;font-family:inherit;font-size:12px">+ 添加格子</button>'
      + '</div>';

    html += '</div>';
    return html;
  }

  window.gmMonoRoll = function() {
    if (mpDice > 0) {
      /* Move */
      var oldPos = mpPos;
      mpPos += mpDice;
      if (mpPos >= mpTiles.length - 1) mpPos = mpTiles.length - 1;
      mpDice = 0;
      $('gmGameBody').innerHTML = renderMonopolyUI();
      /* Apply landing effect */
      setTimeout(function() { applyMonoEffect(oldPos, mpPos); }, 300);
    } else {
      /* Roll */
      mpDice = Math.floor(Math.random() * 6) + 1;
      $('gmGameBody').innerHTML = renderMonopolyUI();
    }
  };

  function applyMonoEffect(from, to) {
    var t = mpTiles[to];
    if (t.type === 'penalty') {
      showMonoPopup('😿', '掉进陷阱了！', t.label.replace(/\n/g,' · '), function() {
        if (t.label.indexOf('后退2格') >= 0 || t.label.indexOf('后退') >= 0) {
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
        if (t.label.indexOf('前进2格') >= 0 || t.label.indexOf('前进') >= 0) {
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
    var t = mpTiles[i];
    if (i === mpPos && t.type !== 'start' && t.type !== 'end') return;
    showMonoPopup(t.emoji, t.label.replace(/\n/g,' · '), '第' + (i+1) + '格 · ' + (t.type==='reward'?'奖励':t.type==='penalty'?'惩罚':t.type==='bomb'?'💣炸弹':t.type==='start'?'起点':t.type==='end'?'终点':'普通'));
  };

  window.gmMonoToggleEdit = function() {
    mpEditing = !mpEditing;
    $('gmGameBody').innerHTML = renderMonopolyUI();
  };

  window.gmMonoSet = function(idx, field, val) {
    if (!mpEditing) return;
    mpTiles[idx][field] = val;
    $('gmGameBody').innerHTML = renderMonopolyUI();
  };

  window.gmMonoDel = function(idx) {
    if (!mpEditing) return;
    if (idx <= 0 || idx >= mpTiles.length - 1) return;
    mpTiles.splice(idx, 1);
    if (mpPos >= mpTiles.length) mpPos = mpTiles.length - 1;
    $('gmGameBody').innerHTML = renderMonopolyUI();
  };

  window.gmMonoAdd = function() {
    if (!mpEditing) return;
    mpTiles.splice(mpTiles.length - 1, 0, { type:'normal', emoji:'❓', label:'新格子' });
    $('gmGameBody').innerHTML = renderMonopolyUI();
  };

})();
