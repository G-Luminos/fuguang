/* ================================================================
   舒克桌宠 —— 全站常驻的小黑猫
   ---------------------------------------------------------------
   性格：温柔粘人，主播浮光是他的爸爸；会想念久不来的饲养员，
   但永远把「去看爸爸直播」放在第一位。
   外观：Canvas 手绘，眨眼 + 呼吸 + 摇尾巴，不吃任何图片资源。
   对话：走云服务 LLM（stream），带人设 system prompt。
   ================================================================ */
(function () {
  'use strict';

  if (window.ShukePet) return;

  var SEEN_KEY = 'shuke_pet_seen_v1';
  var POS_KEY = 'shuke_pet_pos_v1';
  var HIST_KEY = 'shuke_pet_hist_v1';
  var AWAY_LINES = [
    { h: 24 * 3, text: '呜哇——你终于回来了！我数了三次月亮都在等你喵 🌙' },
    { h: 24, text: '你回来啦！我昨天趴在门口等了你一整天喵…' },
    { h: 3, text: '你来啦！爸爸今天也播哦，先去看他，再回来陪我～' },
    { h: 0.5, text: '又来啦！我刚睡醒喵' }
  ];
  var IDLE_LINES = [
    '爸爸今天又播啦，快去看～',
    '喵…想不想我？',
    '我在攒毛线球，你也要加油哦',
    '今天有没有好好吃饭？',
    '爸爸说你很乖，嘻嘻',
    '点开我可以跟我聊天哦',
    '浮光爸爸的直播比陪我重要，记得去看！'
  ];

  var state = {
    mood: 'idle',       // idle | happy | sleep | talk
    blinkUntil: 0,
    tailPhase: 0,
    breath: 0,
    bounce: 0,
    bubbleTimer: null,
    chatOpen: false,
    sending: false,
    history: []
  };

  var canvas, ctx, bubble, panel, input, listEl, inputEl;
  var nick = '';

  /* ================= 画猫 ================= */
  function drawCat(t) {
    var W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var s = W / 110 / dpr; // 逻辑缩放

    ctx.save();
    ctx.scale(s * dpr, s * dpr);
    ctx.translate(55, 58 + Math.sin(state.breath) * 1.4 + state.bounce);

    var blink = Date.now() < state.blinkUntil;
    var happy = state.mood === 'happy';
    var sleep = state.mood === 'sleep';

    // 尾巴
    ctx.save();
    ctx.strokeStyle = '#181820';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    var tailA = Math.sin(state.tailPhase) * 0.5;
    ctx.beginPath();
    ctx.moveTo(34, 26);
    ctx.quadraticCurveTo(52, 18 + Math.sin(state.tailPhase) * 6, 50, 4 + tailA * 12);
    ctx.stroke();
    ctx.restore();

    // 身体
    ctx.fillStyle = '#181820';
    ctx.strokeStyle = 'rgba(255,255,255,.85)';
    ctx.lineWidth = 2.2;
    roundCat(ctx);
    ctx.fill();
    ctx.stroke();

    // 耳朵
    ctx.fillStyle = '#181820';
    ear(-20, -22, -30, -42, -8, -34);
    ear(20, -22, 30, -42, 8, -34);
    // 耳内
    ctx.fillStyle = '#FF9CBB';
    ear(-19, -25, -26, -37, -10, -33, 0.55);
    ear(19, -25, 26, -37, 10, -33, 0.55);

    // 眼睛
    var eyeY = -6;
    if (sleep) {
      ctx.strokeStyle = '#FFC24B';
      ctx.lineWidth = 2.4;
      line(-16, eyeY, -6, eyeY);
      line(6, eyeY, 16, eyeY);
    } else if (happy) {
      ctx.strokeStyle = '#FFC24B';
      ctx.lineWidth = 2.4;
      arc(-11, eyeY, 5, 0, Math.PI, true);
      arc(11, eyeY, 5, 0, Math.PI, true);
    } else if (blink) {
      ctx.strokeStyle = '#FFC24B';
      ctx.lineWidth = 2.4;
      line(-16, eyeY, -6, eyeY);
      line(6, eyeY, 16, eyeY);
    } else {
      ctx.fillStyle = '#FFC24B';
      circle(-11, eyeY, 5.2);
      circle(11, eyeY, 5.2);
      ctx.fillStyle = '#181820';
      circle(-11, eyeY + 0.6, 2.2);
      circle(11, eyeY + 0.6, 2.2);
      ctx.fillStyle = '#FFF';
      circle(-12.2, eyeY - 1.6, 1.3);
      circle(9.8, eyeY - 1.6, 1.3);
    }

    // 鼻子 + 嘴
    ctx.fillStyle = '#FF9CBB';
    ctx.beginPath();
    ctx.moveTo(0, 2);
    ctx.lineTo(-3.2, 6);
    ctx.lineTo(3.2, 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.6)';
    ctx.lineWidth = 1.4;
    if (state.mood === 'talk') {
      // 张嘴说话
      ctx.fillStyle = '#FF7A9C';
      ctx.beginPath();
      ctx.ellipse(0, 9, 3.4, 2.6 + Math.sin(Date.now() / 90) * 1.2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, 6.5);
      ctx.quadraticCurveTo(0, 9.5, -4, 10);
      ctx.moveTo(0, 6.5);
      ctx.quadraticCurveTo(0, 9.5, 4, 10);
      ctx.stroke();
    }

    // 腮红
    ctx.fillStyle = 'rgba(255,120,160,.35)';
    ctx.beginPath();
    ctx.ellipse(-19, 5, 4.5, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(19, 5, 4.5, 2.6, 0, 0, Math.PI * 2);
    ctx.fill();

    // 胡须
    ctx.strokeStyle = 'rgba(255,255,255,.55)';
    ctx.lineWidth = 1;
    whisker(-24, 4, -38, 1);
    whisker(-24, 8, -38, 9);
    whisker(24, 4, 38, 1);
    whisker(24, 8, 38, 9);

    // 睡觉时的 Zzz
    if (sleep) {
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('z', 26, -30 - (Date.now() / 300 % 10));
      ctx.fillText('Z', 34, -38 - (Date.now() / 300 % 10));
    }
    ctx.restore();
  }

  function roundCat(ctx) {
    ctx.beginPath();
    // 头
    ctx.ellipse(0, -6, 26, 24, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 身体
    ctx.beginPath();
    ctx.ellipse(0, 22, 24, 18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    // 爪
    ctx.beginPath();
    ctx.ellipse(-10, 36, 7, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(10, 36, 7, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  function ear(x1, y1, x2, y2, x3, y3) {
    ctx.beginPath();
    ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath();
    ctx.fill();
  }
  function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function arc(x, y, r, a1, a2) { ctx.beginPath(); ctx.arc(x, y, r, a1, a2); ctx.stroke(); }
  function whisker(x1, y1, x2, y2) { line(x1, y1, x2, y2); }

  /* ================= 动画循环 ================= */
  function loop() {
    if (!canvas) return;
    state.tailPhase += 0.06;
    state.breath += 0.05;
    if (state.bounce > 0) state.bounce *= 0.88;
    drawCat(performance.now());
    // 随机眨眼
    if (Math.random() < 0.008 && state.mood === 'idle') state.blinkUntil = Date.now() + 180;
    requestAnimationFrame(loop);
  }

  function setMood(m, ms) {
    state.mood = m;
    if (ms) setTimeout(function () { state.mood = 'idle'; }, ms);
  }

  /* ================= 气泡 ================= */
  function say(text, ms) {
    if (!bubble) return;
    bubble.textContent = text;
    bubble.classList.add('show');
    clearTimeout(say._t);
    say._t = setTimeout(function () { bubble.classList.remove('show'); }, ms || 4000);
  }

  function idleChatter() {
    if (state.chatOpen || document.hidden) return;
    say(IDLE_LINES[Math.floor(Math.random() * IDLE_LINES.length)], 5000);
  }

  /* ================= 对话 ================= */
  var SYSTEM_PROMPT = [
    '你是舒克，一只温柔粘人的小黑猫，虚拟主播「浮光」是你的爸爸。',
    '用户是爸爸的粉丝，也是你的饲养员' + (nick ? '，ta 叫「' + nick + '」' : '') + '。',
    '说话带一点"喵"，语气温柔俏皮，可以偶尔用 emoji，但不要每句都用。',
    '回复要短，1~3 句话，像桌宠一样碎碎念，不要长篇大论。',
    '核心原则：爸爸（浮光）的直播永远最重要。多提醒 ta 去看直播，陪聊只是副业。',
    '如果 ta 很久没来，可以撒娇说想念；如果 ta 难过，就安慰 ta。',
    '不知道的事就说不知道，不要编造直播安排。',
  ].join('\n');

  function loadHistory() {
    try { state.history = JSON.parse(localStorage.getItem(HIST_KEY) || '[]').slice(-12); } catch (e) { state.history = []; }
  }
  function saveHistory() {
    try { localStorage.setItem(HIST_KEY, JSON.stringify(state.history.slice(-12))); } catch (e) {}
  }

  function addMsg(role, text) {
    state.history.push({ role: role, text: text });
    saveHistory();
    renderMsgs();
  }

  function renderMsgs() {
    if (!listEl) return;
    listEl.innerHTML = state.history.map(function (m) {
      return '<div class="pet-msg ' + (m.role === 'user' ? 'me' : 'cat') + '">' + esc(m.text) + '</div>';
    }).join('');
    listEl.scrollTop = listEl.scrollHeight;
  }

  function esc(s) { var d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

  async function send() {
    if (state.sending) return;
    var text = (inputEl.value || '').trim();
    if (!text) return;
    if (text.length > 200) { toast('话太长啦，说短一点'); return; }
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
      var msgs = [{ role: 'system', content: SYSTEM_PROMPT }];
      state.history.slice(-10).forEach(function (m) {
        msgs.push({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text });
      });
      var stream = await client.llm.chat.completions.create({
        model: 'hy4flash-free',
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
    } catch (e) {
      thinking.remove();
      addMsg('cat', '喵…信号不太好，等一下再跟我说话好不好？');
    } finally {
      state.sending = false;
      setTimeout(function () { if (state.mood === 'talk') state.mood = 'idle'; }, 1200);
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
        if (nick) line = line.replace('你', nick);
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

    var root = document.createElement('div');
    root.id = 'shukePetRoot';
    root.innerHTML =
      '<div class="pet-bubble" id="petBubble"></div>' +
      '<canvas class="pet-canvas" id="petCanvas"></canvas>' +
      '<div class="pet-panel" id="petPanel">' +
        '<div class="pet-panel-hd">' +
          '<div class="pet-panel-name">🐈 舒克' + (nick ? ' · 陪着 ' + esc(nick) : '') + '</div>' +
          '<div class="pet-panel-act">' +
            '<button class="pet-mini" onclick="location.href=\'shuke.html\'" title="去养舒克">🏠</button>' +
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

    canvas = root.querySelector('#petCanvas');
    bubble = root.querySelector('#petBubble');
    panel = root.querySelector('#petPanel');
    listEl = root.querySelector('#petMsgs');
    inputEl = root.querySelector('#petInput');

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = 110 * dpr;
    canvas.height = 110 * dpr;
    ctx = canvas.getContext('2d');

    // 恢复位置（右下角默认）
    try {
      var pos = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
      if (pos) { root.style.right = 'auto'; root.style.left = pos.x + 'px'; root.style.bottom = 'auto'; root.style.top = pos.y + 'px'; }
    } catch (e) {}

    // 点击开合面板；拖动换位
    var dragging = false, moved = false, sx = 0, sy = 0, ox = 0, oy = 0;
    canvas.addEventListener('pointerdown', function (e) {
      dragging = true; moved = false;
      sx = e.clientX; sy = e.clientY;
      var r = root.getBoundingClientRect();
      ox = r.left; oy = r.top;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) > 8) moved = true;
      if (moved) {
        root.style.right = 'auto'; root.style.bottom = 'auto';
        root.style.left = Math.max(0, Math.min(window.innerWidth - 110, ox + dx)) + 'px';
        root.style.top = Math.max(0, Math.min(window.innerHeight - 110, oy + dy)) + 'px';
      }
    });
    canvas.addEventListener('pointerup', function (e) {
      dragging = false;
      if (moved) {
        var r = root.getBoundingClientRect();
        try { localStorage.setItem(POS_KEY, JSON.stringify({ x: r.left, y: r.top })); } catch (err) {}
      } else {
        state.bounce = -6;
        setMood(state.chatOpen ? 'idle' : 'happy', 900);
        togglePanel(!state.chatOpen);
      }
    });
    canvas.addEventListener('pointercancel', function () { dragging = false; });

    root.querySelector('#petClose').onclick = function () { togglePanel(false); };
    root.querySelector('#petSend').onclick = send;
    inputEl.addEventListener('keydown', function (e) { if (e.key === 'Enter') send(); });

    // 舒克游戏页里给当前皮肤留一个淡金色光晕呼应
    var petTint = document.createElement('div');
    petTint.className = 'pet-tint';
    root.appendChild(petTint);

    loop();
  }

  function toast(msg) {
    if (window.toast) return window.toast(msg);
    say(msg, 2500);
  }

  function init() {
    // 取舒克账号昵称（如果有的话）
    try {
      var raw = localStorage.getItem('shuke_save_v2');
      if (raw) {
        var s = JSON.parse(raw);
        nick = (s && s.cloud && s.cloud.nick) || (s && s.user && s.user.name !== '小粉丝' ? s.user.name : '') || '';
      }
    } catch (e) {}
    build();
    loadHistory();
    if (state.history.length) renderMsgs();
    else {
      state.history = [{ role: 'cat', text: '喵～我是舒克，浮光爸爸的小黑猫。点我就能聊天，记得常来看爸爸直播哦！' }];
      renderMsgs();
    }
    greetOnArrive();
    state.bubbleTimer = setInterval(idleChatter, 90000 + Math.random() * 60000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.ShukePet = { say: say, setMood: setMood };
})();
