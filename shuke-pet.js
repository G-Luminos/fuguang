/* ================================================================
   舒克桌宠 —— 全站常驻的小黑猫（图集版）
   ---------------------------------------------------------------
   性格：温柔粘人的小孩子，主播浮光是他的爸爸；会想念久不来的饲养员，
   直播永远排第一（但只会偶尔提，不唠叨）。
   外观：云端形象库（管理员可在后台更换），本机缓存。
   对话：走云服务 LLM（stream），带人设 system prompt。
   ================================================================ */
(function () {
  'use strict';

  if (window.ShukePet) return;

  var SEEN_KEY = 'shuke_pet_seen_v1';
  var POS_KEY = 'shuke_pet_pos_v1';
  var HIST_KEY = 'shuke_pet_hist_v1';
  var TITLE_KEY = 'shuke_pet_title_v1';

  var AWAY_LINES = [
    { h: 24 * 3, text: '呜哇——{name}终于回来了！我数了三次月亮都在等你喵 🌙' },
    { h: 24, text: '{name}昨天说过会来看我的，真的来啦！我好开心喵～' },
    { h: 3, text: '{name}你来啦！我今天乖乖的哦' },
    { h: 0.5, text: '又来啦！我刚睡醒喵' }
  ];
  var IDLE_LINES = [
    '喵…想不想我？',
    '我在攒毛线球，你也要加油哦',
    '今天有没有好好吃饭？',
    '点开我可以跟我聊天哦',
    '爸爸说你很乖，嘻嘻',
    '想被摸摸头…',
    '我在这里陪你喵'
  ];
  var LIVE_LINES = [
    '对了，爸爸今天在播哦，有空去看看他～',
    '爸爸开播的话记得去看，我在这里等你回来'
  ];

  var state = {
    mood: 'idle',
    chatOpen: false,
    sending: false,
    history: [],
    lastInteract: Date.now(),
    liveTick: 0
  };

  var root, bubble, panel, listEl, inputEl, catWrap;
  var nick = '';
  var title = '';

  var MOODS = ['idle', 'happy', 'sleep', 'talk', 'love'];
  var MOOD_IMG = { idle: 'pet_idle', happy: 'pet_happy', sleep: 'pet_sleep', talk: 'pet_talk', love: 'pet_love' };

  /* ================= 外观 ================= */
  function applyMood(m) {
    state.mood = m;
    if (!catWrap) return;
    MOODS.forEach(function (k) {
      var img = catWrap.querySelector('[data-mood="' + k + '"]');
      if (img) img.classList.toggle('on', k === m);
    });
  }

  function refreshImages() {
    if (!catWrap) return;
    var assets = window.ShukeAssets;
    MOODS.forEach(function (k) {
      var img = catWrap.querySelector('[data-mood="' + k + '"]');
      var url = assets && assets.get(MOOD_IMG[k]);
      if (img && url) img.src = url;
    });
  }

  function setMood(m, ms) {
    applyMood(m);
    if (ms) setTimeout(function () { if (state.mood === m) applyMood('idle'); }, ms);
  }

  /* ================= 气泡 ================= */
  function say(text, ms, action) {
    if (!bubble) return;
    bubble.innerHTML = esc(text) + (action ? '<div class="pet-bubble-act"><button>' + esc(action.label) + '</button></div>' : '');
    bubble.classList.add('show');
    if (action) {
      bubble.querySelector('button').onclick = function () {
        bubble.classList.remove('show');
        action.fn();
      };
    }
    clearTimeout(say._t);
    say._t = setTimeout(function () { bubble.classList.remove('show'); }, ms || 4000);
  }

  function gameState() {
    try { return JSON.parse(localStorage.getItem('shuke_save_v2') || 'null'); } catch (e) { return null; }
  }
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  function idleChatter() {
    if (state.chatOpen || document.hidden) return;
    state.liveTick++;
    var g = gameState();
    // 懂游戏的引导（有存档才说）
    if (g && g.checkin) {
      var t = todayStr();
      if (g.checkin.last !== t) {
        say('今天还没签到哦，签完有猫毛球，我给你留了小惊喜喵', 6000, { label: '去签到', fn: function () { location.href = 'shuke.html'; } });
        return;
      }
      if (g.tasks && g.tasks.date === t) {
        var done = (g.tasks.claimed && Object.keys(g.tasks.claimed).length) || 0;
        if (done < 3) {
          say('今天任务还没做完呢，做完有积分可以换礼物哦', 6000, { label: '去看看', fn: function () { location.href = 'shuke.html'; } });
          return;
        }
      }
      if (g.play && (g.play.games || 0) < 3) {
        say('今天还有毛线局没玩完，来陪我玩嘛～', 6000, { label: '去玩', fn: function () { location.href = 'shuke.html'; } });
        return;
      }
      // 碎片快够了就提醒
      if (g.shuke && g.shuke.shards) {
        var near = Object.keys(g.shuke.shards).find(function (id) {
          var need = (window.ShukeSkinNeed && window.ShukeSkinNeed[id]) || 0;
          return need > 0 && g.shuke.shards[id] >= need - 3 && g.shuke.shards[id] < need;
        });
        if (near) {
          say('有个皮肤快集齐啦，再开几盒就出来了喵', 6000, { label: '去开箱', fn: function () { location.href = 'shuke.html'; } });
          return;
        }
      }
    }
    // 无聊撒娇钩子
    if (Date.now() - state.lastInteract > 120000 && !state.chatOpen) {
      say('姐姐，我好无聊呀…陪我玩一会儿好不好？', 6000, { label: '陪你玩', fn: function () { togglePanel(true); } });
      return;
    }
    var pool = IDLE_LINES;
    if (state.liveTick % 4 === 0) pool = LIVE_LINES;
    say(pool[Math.floor(Math.random() * pool.length)], 5000);
  }

  /* ================= 对话 ================= */
  function systemPrompt() {
    var t = title || '朋友';
    return [
      '你是舒克，一只温柔粘人的小黑猫，主播「浮光」是你的爸爸。',
      '背景故事：你是爸爸在一个雨夜捡回来的小黑猫，小时候被丢在路边淋了很久的雨，所以特别怕一个人待着，特别黏人。',
      '用户是养你的人，你喊ta「' + t + '」' + (nick ? '（名字：' + nick + '）' : '') + '。',
      '性格：像小孩子，软乎乎，会撒娇，偶尔带"喵"但不每句都带；你继承了爸爸的臭美，换到新皮肤会特别开心。',
      '你很怕孤独，ta久不来你会委屈，但不会怪ta，只会更想ta。',
      '你很懂「舒克养成」这个游戏：会提醒签到、每日任务、抓毛线双倍、碎片还差多少，会邀请ta一起玩，赢了会替ta骄傲。',
      '核心原则：爸爸（浮光）的直播最重要，但只在合适的时候偶尔提一次（大约四五句话提一次就够），别每句都说。',
      '回复很短，1~2 句，像桌宠碎碎念，不要长篇大论。',
      '你很喜欢' + t + '，会想ta，但更希望ta开心。ta难过时先安慰。',
      '每天ta第一次跟你聊天，你会送ta 10 个猫毛球（游戏里的货币），这是你说的算的小秘密。',
      '如果ta说要走了，记得跟ta约定"明天见"。',
      '不知道的事就说不确定，别编造直播安排。'
    ].join('\n');
  }

  function loadHistory() {
    try { state.history = JSON.parse(localStorage.getItem(HIST_KEY) || '[]').slice(-12); } catch (e) { state.history = []; }
  }
  function saveHistory() {
    try { localStorage.setItem(HIST_KEY, JSON.stringify(state.history.slice(-12))); } catch (e) {}
  }
  function esc(s) { var d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

  function addMsg(role, text) {
    state.history.push({ role: role, text: text });
    saveHistory();
    renderMsgs();
  }

  function renderMsgs() {
    if (!listEl) return;
    var html = state.history.map(function (m) {
      return '<div class="pet-msg ' + (m.role === 'user' ? 'me' : 'cat') + '">' + esc(m.text) + '</div>';
    }).join('');
    if (!title) {
      html += '<div class="pet-title-ask">' +
        '<div class="pet-msg cat">对了，你希望我怎么喊你呀？</div>' +
        '<div class="pet-title-btns">' +
          '<button data-t="姐姐">姐姐</button>' +
          '<button data-t="哥哥">哥哥</button>' +
        '</div></div>';
    }
    listEl.innerHTML = html;
    listEl.querySelectorAll('.pet-title-btns button').forEach(function (b) {
      b.onclick = function () {
        title = b.dataset.t;
        try { localStorage.setItem(TITLE_KEY, title); } catch (e) {}
        addMsg('user', title);
        addMsg('cat', '好耶！那以后你就是我的' + title + '啦，我会想你的喵～');
        renderMsgs();
      };
    });
    listEl.scrollTop = listEl.scrollHeight;
  }

  async function send() {
    if (state.sending) return;
    var text = (inputEl.value || '').trim();
    if (!text) return;
    if (text.length > 200) { say('话太长啦，说短一点喵', 2500); return; }
    inputEl.value = '';
    addMsg('user', text);
    state.sending = true;
    setMood('talk');
    var thinking = document.createElement('div');
    thinking.className = 'pet-msg cat pending';
    thinking.textContent = '…';
    listEl.appendChild(thinking);
    listEl.scrollTop = listEl.scrollHeight;

    try {
      var client = window.WBCloud;
      if (!client || !client.llm) throw new Error('云端还没连上');
      var msgs = [{ role: 'system', content: systemPrompt() }];
      state.history.slice(-10).forEach(function (m) {
        msgs.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text });
      });
      var stream = await client.llm.chat.completions.create({
        model: 'fast-model',
        stream: true,
        messages: msgs
      });
      thinking.remove();
      var catMsg = document.createElement('div');
      catMsg.className = 'pet-msg cat';
      catMsg.textContent = '';
      listEl.appendChild(catMsg);
      var full = '';
      for await (var chunk of stream) {
        var delta = chunk && chunk.choices && chunk.choices[0] && chunk.choices[0].delta && chunk.choices[0].delta.content;
        if (delta) { full += delta; catMsg.textContent = full; listEl.scrollTop = listEl.scrollHeight; }
      }
      full = (full || '').trim() || '喵？我刚才走神了，再说一次？';
      state.history.push({ role: 'cat', text: full });
      saveHistory();
      renderMsgs();
      setMood('happy', 1600);
      maybeDailyReward();
    } catch (e) {
      thinking.remove();
      addMsg('cat', '喵…信号不太好，等一下再跟我说话好不好？');
    } finally {
      state.sending = false;
      setTimeout(function () { if (state.mood === 'talk') applyMood('idle'); }, 1200);
    }
  }

  /* ================= 见面问候 ================= */
  function greetOnArrive() {
    var now = Date.now();
    var last = 0;
    try { last = parseInt(localStorage.getItem(SEEN_KEY) || '0', 10) || 0; } catch (e) {}
    try { localStorage.setItem(SEEN_KEY, String(now)); } catch (e) {}
    if (!last) return;
    var hours = (now - last) / 3600000;
    for (var i = 0; i < AWAY_LINES.length; i++) {
      if (hours >= AWAY_LINES[i].h) {
        var line = AWAY_LINES[i].text;
        var who = title || nick || '你';
        line = line.replace(/\{name\}/g, who);
        setTimeout(function () { say(line, 6500); }, 1200);
        return;
      }
    }
  }

  /* ================= 面板 ================= */
  function togglePanel(open) {
    state.chatOpen = open;
    panel.classList.toggle('show', open);
    if (open) {
      renderMsgs();
      setTimeout(function () { inputEl.focus(); }, 300);
    }
  }

  /* ================= 初始化 ================= */
  function build() {
    if (document.getElementById('shukePetRoot')) return;

    root = document.createElement('div');
    root.id = 'shukePetRoot';
    var imgsHtml = MOODS.map(function (k) {
      return '<img class="pet-img" data-mood="' + k + '" alt="舒克">';
    }).join('');
    root.innerHTML =
      '<div class="pet-bubble" id="petBubble"></div>' +
      '<div class="pet-cat" id="petCat">' + imgsHtml + '</div>' +
      '<div class="pet-panel" id="petPanel">' +
        '<div class="pet-panel-hd">' +
          '<div class="pet-panel-name">🐈 舒克' + (nick ? ' · 陪着 ' + esc(nick) : '') + '</div>' +
          '<div class="pet-panel-act">' +
            '<button class="pet-mini" id="petHome" title="去养舒克">🏠</button>' +
            '<button class="pet-mini" id="petClose">✕</button>' +
          '</div>' +
        '</div>' +
        '<div class="pet-msgs" id="petMsgs"></div>' +
        '<div class="pet-input">' +
          '<input id="petInput" maxlength="200" placeholder="跟舒克说点什么…">' +
          '<button id="petSend">发送</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(root);

    catWrap = root.querySelector('#petCat');
    bubble = root.querySelector('#petBubble');
    panel = root.querySelector('#petPanel');
    listEl = root.querySelector('#petMsgs');
    inputEl = root.querySelector('#petInput');

    try {
      var pos = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
      if (pos) { root.style.right = 'auto'; root.style.left = pos.x + 'px'; root.style.bottom = 'auto'; root.style.top = pos.y + 'px'; }
    } catch (e) {}

    var dragging = false, moved = false, sx = 0, sy = 0, ox = 0, oy = 0;
    catWrap.addEventListener('pointerdown', function (e) {
      dragging = true; moved = false;
      sx = e.clientX; sy = e.clientY;
      var r = root.getBoundingClientRect();
      ox = r.left; oy = r.top;
      catWrap.setPointerCapture(e.pointerId);
    });
    catWrap.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) > 8) moved = true;
      if (moved) {
        root.style.right = 'auto'; root.style.bottom = 'auto';
        root.style.left = Math.max(0, Math.min(window.innerWidth - 110, ox + dx)) + 'px';
        root.style.top = Math.max(0, Math.min(window.innerHeight - 110, oy + dy)) + 'px';
      }
    });
    catWrap.addEventListener('pointerup', function (e) {
      dragging = false;
      state.lastInteract = Date.now();
      if (moved) {
        var r = root.getBoundingClientRect();
        try { localStorage.setItem(POS_KEY, JSON.stringify({ x: r.left, y: r.top })); } catch (err) {}
      } else {
        setMood(state.chatOpen ? 'idle' : 'love', 900);
        togglePanel(!state.chatOpen);
      }
    });
    catWrap.addEventListener('pointercancel', function () { dragging = false; });

    root.querySelector('#petClose').onclick = function () { togglePanel(false); };
    root.querySelector('#petHome').onclick = function () { location.href = 'shuke.html'; };
    root.querySelector('#petSend').onclick = send;
    inputEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); });

    applyMood('idle');
    refreshImages();

    if (window.ShukeAssets) window.ShukeAssets.refresh(refreshImages);
  }

  function init() {
    try {
      var raw = localStorage.getItem('shuke_save_v2');
      if (raw) {
        var s = JSON.parse(raw);
        nick = (s && s.cloud && s.cloud.nick) || (s && s.user && s.user.name !== '小粉丝' ? s.user.name : '') || '';
      }
    } catch (e) {}
    try { title = localStorage.getItem(TITLE_KEY) || ''; } catch (e) {}
    build();
    loadHistory();
    if (state.history.length) renderMsgs();
    else {
      state.history = [{ role: 'cat', text: '喵～我是舒克，浮光爸爸的小黑猫。点我就能聊天哦！' }];
      renderMsgs();
    }
    greetOnArrive();
    setInterval(idleChatter, 90000 + Math.random() * 60000);
    setInterval(function () {
      if (!state.chatOpen && Date.now() - state.lastInteract > 180000) applyMood('sleep');
    }, 30000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  /* ================= 联动：每日聊天奖励 ================= */
  function maybeDailyReward() {
    var t = todayStr();
    // 在舒克页：走游戏内存里的存档，避免被覆盖
    if (window.ShukeGame && window.ShukeGame.dailyChatReward) {
      if (window.ShukeGame.dailyChatReward()) say('送你 10 个猫毛球，这是我们的小秘密喵', 4000);
      return;
    }
    try {
      var raw = localStorage.getItem('shuke_save_v2');
      var g = raw ? JSON.parse(raw) : null;
      if (!g) return;
      g.play = g.play || {};
      if (g.play.chatRewardDate === t) return;
      g.play.chatRewardDate = t;
      g.user = g.user || {};
      g.user.coins = (g.user.coins || 0) + 15;
      g.user.points = (g.user.points || 0) + 5;
      localStorage.setItem('shuke_save_v2', JSON.stringify(g));
      say('送你 10 个猫毛球，这是我们的小秘密喵', 4000);
    } catch (e) {}
  }

  /* ================= 联动：游戏事件通知 ================= */
  var NOTIFY = {
    craft: '新衣服好帅！跟爸爸一样臭美喵～',
    equip: '换上新衣服啦！好看好看',
    checkin: '签到成功！今天也有奖励喵',
    level: '升级啦！我为你骄傲',
    game: null
  };
  function gameNotify(kind, info) {
    if (kind === 'game') {
      var sc = (info && info.score) || 0;
      say(sc > 50 ? '哇 ' + sc + ' 分！你太厉害了' : '玩得不错，下次再陪我玩嘛', 4000);
      return;
    }
    var line = NOTIFY[kind];
    if (line) { say(line, 4500); setMood('happy', 1500); }
  }

  window.ShukePet = { say: say, setMood: setMood, refresh: refreshImages, gameNotify: gameNotify };
})();
