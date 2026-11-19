/* ================================================================
   舒克宇宙 · Shuke Universe
   ---------------------------------------------------------------
   玩点结构：
   1) 抓毛线（主动）——30 秒接毛线/鱼，连击翻倍，消耗体力，是主要收入
   2) 打工（挂机）——离线也在涨，上限随等级，每天回来收
   3) 开箱（收集）——皮肤碎片 / 装扮 / 猫粮，30 抽保底传说
   4) 签到 + 每日任务（习惯）——连签加成产出，任务给积分
   5) 排行（社交）——云端真实积分榜
   账号存档走 shuke_* 系列 RPC，密码只在服务端比对哈希。
   ================================================================ */
(function () {
  'use strict';

  var SAVE_KEY = 'shuke_save_v2';
  var OLD_KEY = 'shuke_save_v1';
  var TOKEN_KEY = 'shuke_token';

  /* ================= 配置 ================= */
  var CONFIG = {
    gachaCost: 60,
    gacha10Cost: 540,
    pity: 30,
    idleRateBase: 10,          // 每小时猫毛球
    idleCapBase: 200,
    idleCapPerLevel: 20,
    idleMaxHours: 12,          // 最长攒 12 小时
    petDailyLimit: 3,
    petCoins: 3,
    petExp: 5,
    feedFoodCost: 1,
    feedExp: 50,
    energyMax: 10,
    energyRegenMs: 6 * 60 * 1000,
    playSeconds: 30,
    playDailyDouble: 3,
    expBase: 80,
    expGrowth: 40,
    rates: { normal: 0.60, rare: 0.25, epic: 0.10, ssr: 0.05 },
    shop: [
      { id: 'g1', name: '虚拟抵扣券', cost: 900, icon: '🎟️', desc: '直播间下单立减' },
      { id: 'g2', name: '定制表情包', cost: 2200, icon: '😸', desc: '点图投稿，小光来画' },
      { id: 'g3', name: '舒克立牌（虚拟）', cost: 4200, icon: '🪧', desc: '专属编号' },
      { id: 'g4', name: '舰长专属头像框', cost: 8000, icon: '🖼️', desc: '限定款' },
      { id: 'g5', name: '1 小时专属陪玩', cost: 16000, icon: '🎮', desc: '和小光开黑' }
    ]
  };

  /* ================= 皮肤 / 装扮 ================= */
  var SKINS = [
    { id: 's_01', name: '原初舒克', rarity: 'default', need: 0, emoji: '🐈', bonus: 0,    desc: '刚睡醒的样子' },
    { id: 's_02', name: '星空舒克', rarity: 'rare',    need: 6, emoji: '🌌',    bonus: 0.05, desc: '毛里藏着星星' },
    { id: 's_03', name: '樱花舒克', rarity: 'epic',    need: 10, emoji: '🌸',   bonus: 0.08, desc: '春天限定' },
    { id: 's_04', name: '赛博舒克', rarity: 'epic',    need: 12, emoji: '🤖',   bonus: 0.10, desc: '机械猫耳会发光' },
    { id: 's_05', name: '金龙舒克', rarity: 'ssr',     need: 20, emoji: '🐉',   bonus: 0.15, desc: '传说级，出货率 5%' }
  ];
  var ITEMS = [
    { id: 'a_01', name: '蝴蝶结',   need: 4, emoji: '🎀' },
    { id: 'a_02', name: '铃铛项圈', need: 4, emoji: '🔔' },
    { id: 'a_03', name: '墨镜',     need: 5, emoji: '🕶️' },
    { id: 'a_04', name: '小皇冠',   need: 6, emoji: '👑' },
    { id: 'a_05', name: '耳机',     need: 5, emoji: '🎧' },
    { id: 'a_06', name: '围巾',     need: 4, emoji: '🧣' }
  ];
  var EMOJIS = [
    { id: 'e_01', name: '卖萌', need: 3, emoji: '🥺' },
    { id: 'e_02', name: '打哈欠', need: 3, emoji: '🥱' },
    { id: 'e_03', name: '傲娇', need: 4, emoji: '😼' },
    { id: 'e_04', name: '干饭', need: 4, emoji: '🍚' }
  ];
  var RARITY = {
    default: { label: '默认', color: '#8A8F98', glow: 'rgba(138,143,152,.4)' },
    normal:  { label: '普通', color: '#A0A6B0', glow: 'rgba(160,166,176,.4)' },
    rare:    { label: '稀有', color: '#4FA3FF', glow: 'rgba(79,163,255,.55)' },
    epic:    { label: '史诗', color: '#B678FF', glow: 'rgba(182,120,255,.55)' },
    ssr:     { label: '传说', color: '#FFB23E', glow: 'rgba(255,178,62,.62)' }
  };
  var MOODS = [
    '今天也要好好吃饭哦~', '摸摸头，舒克最喜欢你了', '困了…想睡个午觉',
    '喵~今天的毛线团攒了吗', '舒克在等你回家', '外面下雨了，还好有你在',
    '想和你一起看星星', '今天也要元气满满喵！', '毛线球给你，别难过啦'
  ];

  /* ================= 存档 ================= */
  function todayStr() {
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function pad(n) { return String(n).padStart(2, '0'); }

  function defaultSave() {
    return {
      v: 2,
      user: { name: '小粉丝', level: 1, exp: 0, coins: 120, points: 0, food: 3 },
      checkin: { last: '', streak: 0, days: {} },
      shuke: { skin: 's_01', owned: ['s_01'], shards: {} },
      gacha: { pity: 0, opened: 0 },
      energy: { v: 10, at: Date.now() },
      idle: { pending: 0, at: Date.now() },
      pet: { date: '', count: 0 },
      play: { date: '', games: 0, best: 0, bestCombo: 0 },
      tasks: { date: '', progress: { play: 0, open: 0, pet: 0 }, claimed: {} },
      exchanged: {},
      cloud: { nick: '' }
    };
  }

  function merge(base, patch) {
    var out = JSON.parse(JSON.stringify(base));
    if (!patch || typeof patch !== 'object') return out;
    Object.keys(patch).forEach(function (k) {
      var v = patch[k];
      if (v && typeof v === 'object' && !Array.isArray(v) && out[k] && typeof out[k] === 'object' && !Array.isArray(out[k])) {
        out[k] = merge(out[k], v);
      } else {
        out[k] = v;
      }
    });
    return out;
  }

  function migrateOld() {
    var raw = null;
    try { raw = localStorage.getItem(OLD_KEY); } catch (e) {}
    if (!raw) return null;
    try {
      var o = JSON.parse(raw);
      var s = defaultSave();
      if (o.user) {
        s.user.name = o.user.name || s.user.name;
        s.user.level = Math.max(1, o.user.level || 1);
        s.user.exp = o.user.exp || 0;
        s.user.coins = Math.max(s.user.coins, o.user.coins || 0);
        s.user.points = o.user.points || 0;
        s.user.food = o.user.food || s.user.food;
      }
      if (o.checkin) { s.checkin.streak = o.checkin.streak || 0; s.checkin.last = o.checkin.lastDate || ''; }
      if (o.shuke) {
        s.shuke.skin = o.shuke.skin || 's_01';
        s.shuke.owned = ['s_01'];
        if (o.shuke.skin && o.shuke.skin !== 's_01') s.shuke.owned.push(o.shuke.skin);
        if (o.shuke.equipped && o.shuke.equipped.length) {
          o.shuke.equipped.forEach(function (id) { if (s.shuke.owned.indexOf(id) < 0) s.shuke.owned.push(id); });
        }
        if (o.shuke.collection) {
          Object.keys(o.shuke.collection).forEach(function (k) { s.shuke.shards[k] = o.shuke.collection[k]; });
        }
      }
      if (o.gacha) { s.gacha.pity = o.gacha.pityCounter || 0; s.gacha.opened = o.gacha.totalOpened || 0; }
      if (o.exchanged) s.exchanged = o.exchanged;
      if (o.claimedCoins) s.idle.pending = 0;
      return s;
    } catch (e) { return null; }
  }

  function loadSave() {
    try {
      var raw = localStorage.getItem(SAVE_KEY);
      if (raw) return merge(defaultSave(), JSON.parse(raw));
    } catch (e) {}
    var old = migrateOld();
    if (old) { saveLocal(old); return old; }
    return defaultSave();
  }
  function saveLocal(s) {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(s)); } catch (e) {}
  }

  var SAVE = loadSave();
  var token = '';
  try { token = localStorage.getItem(TOKEN_KEY) || ''; } catch (e) {}
  var myRank = null, serverTotal = 0;
  var currentPage = 'home';
  var authMode = 'login';
  var syncing = false, syncTimer = null;

  /* ================= 工具 ================= */
  function $(id) { return document.getElementById(id); }
  function esc(s) { var d = document.createElement('div'); d.textContent = (s == null ? '' : String(s)); return d.innerHTML; }
  function nfmt(n) { return Number(n || 0).toLocaleString('zh-CN'); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  var toastTimer = null;
  function toast(msg) {
    var el = $('skToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2200);
  }

  /* ================= 等级 ================= */
  function expNeed(lv) { return CONFIG.expBase + (lv - 1) * CONFIG.expGrowth; }
  function addExp(n) {
    SAVE.user.exp += n;
    var up = 0;
    while (SAVE.user.exp >= expNeed(SAVE.user.level) && SAVE.user.level < 99) {
      SAVE.user.exp -= expNeed(SAVE.user.level);
      SAVE.user.level++;
      up++;
      SAVE.user.points += 10;
    }
    if (up > 0) toast('🎉 升级啦！Lv.' + SAVE.user.level + '（+' + (up * 10) + ' 积分）');
    return up > 0;
  }

  /* ================= 实时数值 ================= */
  function streakBonus() { return Math.min((SAVE.checkin.streak || 0) * 0.1, 1); }
  function skinBonus() {
    var s = SKINS.filter(function (x) { return x.id === SAVE.shuke.skin; })[0];
    return s ? s.bonus : 0;
  }
  function idleRate() {
    return CONFIG.idleRateBase * (1 + streakBonus()) * (1 + skinBonus());
  }
  function idleCap() {
    return CONFIG.idleCapBase + (SAVE.user.level - 1) * CONFIG.idleCapPerLevel;
  }
  function tickIdle() {
    var now = Date.now();
    var hours = Math.min((now - SAVE.idle.at) / 3600000, CONFIG.idleMaxHours);
    if (hours > 0) {
      SAVE.idle.pending = Math.min(idleCap(), SAVE.idle.pending + hours * idleRate());
      SAVE.idle.at = now;
    }
  }
  function tickEnergy() {
    var now = Date.now();
    if (SAVE.energy.v >= CONFIG.energyMax) { SAVE.energy.at = now; return; }
    var gained = Math.floor((now - SAVE.energy.at) / CONFIG.energyRegenMs);
    if (gained > 0) {
      SAVE.energy.v = Math.min(CONFIG.energyMax, SAVE.energy.v + gained);
      SAVE.energy.at = SAVE.energy.v >= CONFIG.energyMax ? now : SAVE.energy.at + gained * CONFIG.energyRegenMs;
    }
  }

  /* ================= 云端存档 ================= */
  function scheduleSync() {
    saveLocal(SAVE);
    if (!token) return;
    clearTimeout(syncTimer);
    syncTimer = setTimeout(pushSave, 1500);
  }
  function pushSave() {
    if (!token || syncing || !window.sb) return;
    syncing = true;
    window.sb.rpc('shuke_sync', {
      p_token: token,
      p_save: SAVE,
      p_points: SAVE.user.points,
      p_level: SAVE.user.level,
      p_skin: SAVE.shuke.skin,
      p_best: SAVE.play.bestCombo || 0,
      p_opens: SAVE.gacha.opened || 0
    }).then(function (r) {
      syncing = false;
      var d = r && r.data;
      if (d && d.ok) {
        myRank = d.rank; serverTotal = d.total;
        renderAcct();
      } else if (d && !d.ok && d.error) {
        // token 失效：静默退出登录状态，避免一直报错
        if (String(d.error).indexOf('过期') >= 0) logout(true);
      }
    }).catch(function () { syncing = false; });
  }

  function pullRemote() {
    if (!token || !window.sb) return Promise.resolve(false);
    return window.sb.rpc('shuke_me', { p_token: token }).then(function (r) {
      var d = r && r.data;
      if (!d || !d.ok) return false;
      myRank = d.rank; serverTotal = d.total;
      var remote = d.save && Object.keys(d.save).length ? merge(defaultSave(), d.save) : null;
      if (remote && (remote.gacha.opened > 0 || remote.user.points > 0 || remote.user.level > 1)) {
        SAVE = remote;
      }
      SAVE.user.name = d.player.nickname;
      SAVE.cloud.nick = d.player.nickname;
      saveLocal(SAVE);
      return true;
    }).catch(function () { return false; });
  }

  /* ================= 签到 ================= */
  function canCheckin() { return SAVE.checkin.last !== todayStr(); }

  function doCheckin() {
    var t = todayStr();
    if (SAVE.checkin.last === t) { toast('今天已经签过啦，明天再来~'); return false; }
    var y = new Date(Date.now() - 86400000);
    var yStr = y.getFullYear() + '-' + pad(y.getMonth() + 1) + '-' + pad(y.getDate());
    SAVE.checkin.streak = (SAVE.checkin.last === yStr) ? (SAVE.checkin.streak || 0) + 1 : 1;
    SAVE.checkin.last = t;
    SAVE.checkin.days[t] = true;
    var coins = 20 + Math.min(SAVE.checkin.streak, 10) * 5;
    var pts = 5 + Math.min(SAVE.checkin.streak, 10) * 2;
    SAVE.user.coins += coins;
    SAVE.user.points += pts;
    SAVE.user.food += 1;
    if (SAVE.checkin.streak % 7 === 0) { SAVE.user.coins += 100; toast('连签 7 天！额外 +100 🧶'); }
    scheduleSync();
    toast('签到成功 +' + coins + '🧶 +' + pts + '⭐（连签 ' + SAVE.checkin.streak + ' 天）');
    return true;
  }

  /* ================= 每日任务 ================= */
  function resetDaily() {
    var t = todayStr();
    if (SAVE.tasks.date !== t) {
      SAVE.tasks = { date: t, progress: { play: 0, open: 0, pet: 0 }, claimed: {} };
    }
    if (SAVE.play.date !== t) { SAVE.play.date = t; SAVE.play.games = 0; }
    if (SAVE.pet.date !== t) { SAVE.pet.date = t; SAVE.pet.count = 0; }
  }
  var TASKS = [
    { id: 'play', name: '抓 1 局毛线团', need: 1, coins: 25, pts: 10, icon: '🧶' },
    { id: 'open', name: '开 1 次盲盒', need: 1, coins: 30, pts: 10, icon: '🎁' },
    { id: 'pet', name: '撸猫 3 次', need: 3, coins: 20, pts: 10, icon: '🤲' }
  ];
  function taskDone(t) { return (SAVE.tasks.progress[t.id] || 0) >= t.need; }
  function claimTask(id) {
    var t = TASKS.filter(function (x) { return x.id === id; })[0];
    if (!t) return;
    if (SAVE.tasks.claimed[id]) { toast('这个任务已经领过啦'); return; }
    if (!taskDone(t)) { toast('还没完成哦'); return; }
    SAVE.tasks.claimed[id] = true;
    SAVE.user.coins += t.coins;
    SAVE.user.points += t.pts;
    scheduleSync();
    toast('任务奖励 +' + t.coins + '🧶 +' + t.pts + '⭐');
    renderTasks();
  }

  /* ================= 撸猫 / 喂猫 ================= */
  function doPet() {
    resetDaily();
    if (SAVE.pet.count >= CONFIG.petDailyLimit) { toast('今天撸够啦，舒克很满足~'); return; }
    SAVE.pet.count++;
    SAVE.user.coins += CONFIG.petCoins;
    SAVE.tasks.progress.pet = SAVE.pet.count;
    addExp(CONFIG.petExp);
    SAVE.user.points += 1;
    scheduleSync();
    animCat('pet');
    heart();
    toast('撸猫 +' + CONFIG.petCoins + '🧶 +' + CONFIG.petExp + ' 经验');
    renderHome();
  }

  function doFeed() {
    if (SAVE.user.food < CONFIG.feedFoodCost) { toast('猫粮不够啦，开箱或签到能拿到'); return; }
    SAVE.user.food -= CONFIG.feedFoodCost;
    addExp(CONFIG.feedExp);
    SAVE.user.points += 2;
    scheduleSync();
    animCat('feed');
    heart();
    toast('喂饱啦 +' + CONFIG.feedExp + ' 经验');
    renderHome();
  }

  function animCat(cls) {
    var cat = $('skCat');
    if (!cat) return;
    cat.classList.add(cls);
    setTimeout(function () { cat.classList.remove(cls); }, 800);
  }
  function heart() {
    var wrap = document.querySelector('.sk-hero');
    if (!wrap) return;
    var h = document.createElement('span');
    h.className = 'sk-heart';
    h.textContent = ['💗', '💖', '✨', '🐾'][Math.floor(Math.random() * 4)];
    h.style.left = (34 + Math.random() * 32) + '%';
    h.style.top = '44%';
    wrap.appendChild(h);
    setTimeout(function () { h.remove(); }, 1100);
  }

  /* ================= 挂机 ================= */
  function claimIdle() {
    tickIdle();
    var amt = Math.floor(SAVE.idle.pending);
    if (amt < 1) { toast('还没攒够，再等等~'); return; }
    SAVE.user.coins += amt;
    SAVE.idle.pending = 0;
    SAVE.idle.at = Date.now();
    scheduleSync();
    toast('收到 ' + amt + ' 猫毛球 🧶');
    renderHome();
  }

  /* ================= 开箱 ================= */
  function rollRarity() {
    if (SAVE.gacha.pity >= CONFIG.pity) { SAVE.gacha.pity = 0; return 'ssr'; }
    var r = Math.random(), acc = 0;
    var order = ['normal', 'rare', 'epic', 'ssr'];
    for (var i = 0; i < order.length; i++) {
      acc += CONFIG.rates[order[i]];
      if (r < acc) {
        SAVE.gacha.pity = order[i] === 'ssr' ? 0 : SAVE.gacha.pity + 1;
        return order[i];
      }
    }
    SAVE.gacha.pity++;
    return 'normal';
  }

  function pickDrop(rarity) {
    if (rarity === 'ssr') return { type: 'shard', id: 's_05', emoji: '🐉', name: '金龙碎片', qty: 2, rarity: 'ssr' };
    if (rarity === 'epic') {
      if (Math.random() < 0.75) {
        var pool = ['s_03', 's_04'];
        var id = pool[Math.floor(Math.random() * pool.length)];
        var s = SKINS.filter(function (x) { return x.id === id; })[0];
        return { type: 'shard', id: id, emoji: s.emoji, name: s.name + '碎片', qty: 2, rarity: 'epic' };
      }
      return { type: 'coins', qty: 80, emoji: '🧶', name: '猫毛球 x80', rarity: 'epic' };
    }
    if (rarity === 'rare') {
      var r = Math.random();
      if (r < 0.45) return { type: 'shard', id: 's_02', emoji: '🌌', name: '星空碎片', qty: 1, rarity: 'rare' };
      if (r < 0.75) {
        var it = ITEMS[Math.floor(Math.random() * ITEMS.length)];
        return { type: 'shard', id: it.id, emoji: it.emoji, name: it.name + '碎片', qty: 1, rarity: 'rare' };
      }
      return { type: 'food', qty: 2, emoji: '🍖', name: '猫粮 x2', rarity: 'rare' };
    }
    var n = Math.random();
    if (n < 0.35) return { type: 'coins', qty: 25, emoji: '🧶', name: '猫毛球 x25', rarity: 'normal' };
    if (n < 0.6) return { type: 'food', qty: 1, emoji: '🍖', name: '猫粮 x1', rarity: 'normal' };
    var e = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
    return { type: 'shard', id: e.id, emoji: e.emoji, name: e.name + '碎片', qty: 1, rarity: 'normal' };
  }

  function applyDrop(d) {
    if (d.type === 'coins') SAVE.user.coins += d.qty;
    else if (d.type === 'food') SAVE.user.food += d.qty;
    else {
      SAVE.shuke.shards[d.id] = (SAVE.shuke.shards[d.id] || 0) + d.qty;
      // 碎片集齐即自动解锁（皮肤与装扮都算）
      var meta = findMeta(d.id);
      if (meta && meta.need > 0 && (SAVE.shuke.shards[d.id] || 0) >= meta.need && SAVE.shuke.owned.indexOf(d.id) < 0 && d.id.indexOf('s_') === 0) {
        SAVE.shuke.owned.push(d.id);
      }
    }
  }
  function findMeta(id) {
    return SKINS.concat(ITEMS, EMOJIS).filter(function (x) { return x.id === id; })[0];
  }

  function doGacha(times) {
    resetDaily();
    var n = times === 10 ? 10 : 1;
    var cost = n === 10 ? CONFIG.gacha10Cost : CONFIG.gachaCost;
    if (SAVE.user.coins < cost) { toast('猫毛球不够，去抓毛线赚一点吧'); return; }
    SAVE.user.coins -= cost;
    var drops = [], best = 'normal';
    for (var i = 0; i < n; i++) {
      var rar = rollRarity();
      var d = pickDrop(rar);
      applyDrop(d);
      drops.push(d);
      if (rankOf(rar) > rankOf(best)) best = rar;
    }
    // 十连保底：至少一个史诗
    if (n === 10 && rankOf(best) < rankOf('epic')) {
      var bonus = { type: 'shard', id: 's_03', emoji: '🌸', name: '樱花碎片', qty: 2, rarity: 'epic' };
      applyDrop(bonus); drops.push(bonus); best = 'epic';
    }
    SAVE.gacha.opened += n;
    SAVE.user.points += n * 2;
    SAVE.tasks.progress.open = (SAVE.tasks.progress.open || 0) + 1;
    scheduleSync();
    burstBox();
    showResult(best, drops);
    renderHome(); renderGacha();
  }
  function rankOf(r) { return ['normal', 'rare', 'epic', 'ssr'].indexOf(r); }

  function burstBox() {
    var box = $('skBox');
    if (!box) return;
    box.classList.add('open');
    setTimeout(function () { box.classList.remove('open'); }, 600);
  }

  function showResult(best, drops) {
    var r = RARITY[best] || RARITY.normal;
    var first = drops.filter(function (d) { return d.rarity === best; })[0] || drops[0];
    $('skResRarity').textContent = r.label + ' · ' + drops.length + ' 件';
    $('skResRarity').style.color = r.color;
    $('skResIcon').textContent = first.emoji || '✨';
    $('skResIcon').style.color = r.color;
    $('skResName').textContent = first.name;
    var extra = drops.filter(function (d) { return d !== first; }).map(function (d) { return d.emoji; }).join(' ');
    $('skResMulti').textContent = drops.length > 1 ? ('其余：' + extra) : '';
    $('skResultBox').style.borderColor = r.color + '66';
    $('skResultBox').style.boxShadow = '0 0 60px ' + r.glow;
    $('skResultModal').classList.add('show');
  }
  function closeResult() { $('skResultModal').classList.remove('show'); }

  /* ================= 合成 / 装备 ================= */
  function canCraft(s) { return (SAVE.shuke.shards[s.id] || 0) >= s.need; }
  function isOwned(s) { return SAVE.shuke.owned.indexOf(s.id) >= 0; }

  function craftSkin(id) {
    var s = SKINS.filter(function (x) { return x.id === id; })[0];
    if (!s || s.need === 0) return;
    if (isOwned(s)) { toast('已经拥有啦'); return; }
    if (!canCraft(s)) { toast('碎片不足：' + (SAVE.shuke.shards[id] || 0) + '/' + s.need); return; }
    SAVE.shuke.shards[id] -= s.need;
    SAVE.shuke.owned.push(id);
    SAVE.shuke.skin = id;
    scheduleSync();
    toast('合出「' + s.name + '」并换上了！🎉');
    renderCollection(); renderHome();
  }
  function equipSkin(id) {
    if (SAVE.shuke.owned.indexOf(id) < 0) { toast('还没有这款皮肤'); return; }
    SAVE.shuke.skin = id;
    scheduleSync();
    toast('已换上');
    renderCollection(); renderHome();
  }

  /* ================= 商店 ================= */
  function buy(id) {
    var g = CONFIG.shop.filter(function (x) { return x.id === id; })[0];
    if (!g) return;
    if (SAVE.exchanged[id]) { toast('已经兑换过啦'); return; }
    if (SAVE.user.points < g.cost) { toast('积分不够，还差 ' + (g.cost - SAVE.user.points)); return; }
    SAVE.user.points -= g.cost;
    SAVE.exchanged[id] = { at: new Date().toISOString(), name: g.name, cost: g.cost };
    scheduleSync();
    toast('兑换成功：' + g.name + '，截图给小光核销');
    renderShop(); renderHome();
  }

  /* ================= 排行榜 ================= */
  function loadLeaderboard() {
    var box = $('skRankList');
    if (box) box.innerHTML = '<div class="sk-loading">加载中…</div>';
    if (!window.sb) { if (box) box.innerHTML = '<div class="sk-loading">还没连上云端</div>'; return; }
    window.sb.rpc('shuke_lb', { p_limit: 30 }).then(function (r) {
      var d = r && r.data;
      if (!d || !d.ok) { box.innerHTML = '<div class="sk-loading">榜单加载失败</div>'; return; }
      serverTotal = d.total;
      var rows = d.rows || [];
      if (!rows.length) { box.innerHTML = '<div class="sk-loading">还没有人上榜，来当第一个吧</div>'; return; }
      box.innerHTML = rows.map(function (p) {
        var medal = p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : p.rank === 3 ? '🥉' : p.rank;
        var skin = SKINS.filter(function (s) { return s.id === p.skin; })[0] || SKINS[0];
        var me = SAVE.cloud.nick && p.nickname === SAVE.cloud.nick;
        return '<div class="sk-rank-row' + (me ? ' me' : '') + '">' +
          '<div class="sk-rank-no' + (p.rank <= 3 ? ' top' : '') + '">' + medal + '</div>' +
          '<div class="sk-rank-av">' + skin.emoji + '</div>' +
          '<div class="sk-rank-name">' + esc(p.nickname) + '<span class="sk-rank-lv">Lv.' + p.level + '</span></div>' +
          '<div class="sk-rank-pts">' + nfmt(p.points) + '</div>' +
        '</div>';
      }).join('');
      $('skTotalPlayers').textContent = nfmt(d.total);
      $('skMyRank').textContent = myRank ? ('#' + myRank) : '—';
      $('skMyPts').textContent = nfmt(SAVE.user.points);
      $('skRankHint').textContent = myRank ? ('我的名次 #' + myRank) : '登录后上榜';
    }).catch(function () {
      if (box) box.innerHTML = '<div class="sk-loading">榜单加载失败</div>';
    });
  }

  /* ================= 账号 ================= */
  function openAuth() {
    authMode = 'login';
    setAuthMode('login');
    $('skAuthNick').value = SAVE.cloud.nick || '';
    $('skAuthPass').value = '';
    $('skAuthErr').textContent = '';
    $('skAuthModal').classList.add('show');
  }
  function closeAuth() {
    $('skAuthModal').classList.remove('show');
    if (!token) toast('可以先随便玩，登录后存档才会上云');
  }
  function setAuthMode(mode) {
    authMode = mode;
    $('skTabLogin').classList.toggle('active', mode === 'login');
    $('skTabReg').classList.toggle('active', mode === 'register');
    $('skAuthTitle').textContent = mode === 'login' ? '欢迎回来' : '取个名字吧';
    $('skAuthSub').textContent = mode === 'login' ? '登录后存档上云、能上排行榜' : '注册后存档跟着账号走，换设备不丢';
    $('skAuthSubmit').textContent = mode === 'login' ? '登录' : '注册并开始';
  }

  function submitAuth() {
    var nick = $('skAuthNick').value.trim();
    var pass = $('skAuthPass').value;
    var err = $('skAuthErr');
    err.textContent = '';
    if (nick.length < 2) { err.textContent = '昵称至少 2 个字'; return; }
    if (pass.length < 4) { err.textContent = '密码至少 4 位'; return; }
    if (!window.sb) { err.textContent = '还没连上云端，稍后再试'; return; }
    var btn = $('skAuthSubmit');
    btn.disabled = true; btn.textContent = '处理中…';

    var fn = authMode === 'login' ? 'shuke_login' : 'shuke_register';
    window.sb.rpc(fn, { p_nick: nick, p_pass: pass }).then(function (r) {
      btn.disabled = false;
      var d = r && r.data;
      if (r && r.error) { err.textContent = r.error.message || '请求失败'; btn.textContent = authMode === 'login' ? '登录' : '注册并开始'; return; }
      if (!d || !d.ok) { err.textContent = (d && d.error) || '失败，稍后再试'; btn.textContent = authMode === 'login' ? '登录' : '注册并开始'; return; }
      token = d.token;
      try { localStorage.setItem(TOKEN_KEY, token); } catch (e) {}
      SAVE.cloud.nick = d.player.nickname;
      SAVE.user.name = d.player.nickname;
      if (authMode === 'login' && d.save && Object.keys(d.save).length) {
        var remote = merge(defaultSave(), d.save);
        // 本地有进度、云端是空存档时不要把本地覆盖掉
        if ((remote.gacha.opened || 0) > 0 || (remote.user.level || 1) > 1) {
          SAVE = remote;
          SAVE.user.name = d.player.nickname;
        }
      }
      closeAuth();
      renderAll();
      pushSave();
      loadLeaderboard();
      toast(authMode === 'login' ? '登录成功，存档已同步 ☁️' : '注册成功，开始养舒克吧 🐈‍⬛');
    }).catch(function (e) {
      btn.disabled = false;
      btn.textContent = authMode === 'login' ? '登录' : '注册并开始';
      err.textContent = (e && e.message) || '网络错误';
    });
  }

  function logout(silent) {
    token = '';
    try { localStorage.removeItem(TOKEN_KEY); } catch (e) {}
    SAVE.cloud.nick = '';
    myRank = null;
    saveLocal(SAVE);
    renderAcct(); renderMe();
    if (!silent) toast('已退出登录，存档还在本机');
  }

  /* ================= 渲染 ================= */
  function renderHome() {
    tickIdle(); tickEnergy(); resetDaily();
    $('skName').textContent = SAVE.user.name;
    $('skLevel').textContent = 'Lv.' + SAVE.user.level;
    $('skMood').textContent = MOODS[hashStr(todayStr()) % MOODS.length];
    $('skCoins').textContent = nfmt(SAVE.user.coins);
    $('skPoints').textContent = nfmt(SAVE.user.points);
    $('skEnergy').textContent = SAVE.energy.v;

    var need = expNeed(SAVE.user.level);
    $('skExpBar').style.width = clamp(SAVE.user.exp / need * 100, 0, 100) + '%';
    $('skExpText').textContent = SAVE.user.exp + '/' + need;
    $('skStreak').textContent = '🔥 连签 ' + (SAVE.checkin.streak || 0) + ' 天 · 产出 +' + Math.round(streakBonus() * 100) + '%';

    var skin = SKINS.filter(function (s) { return s.id === SAVE.shuke.skin; })[0] || SKINS[0];
    $('skCat').textContent = skin.emoji;
    $('skLogo').textContent = skin.emoji;

    $('skPetLeft').textContent = Math.max(0, CONFIG.petDailyLimit - SAVE.pet.count) + '/' + CONFIG.petDailyLimit;
    $('skFoodLeft').textContent = SAVE.user.food + ' 粮';

    var pend = Math.floor(SAVE.idle.pending);
    $('skIdleAmount').textContent = nfmt(pend);
    $('skIdleCap').textContent = nfmt(idleCap());
    $('skIdleRate').textContent = '+' + idleRate().toFixed(1) + '/时';
    $('skIdleBar').style.width = clamp(SAVE.idle.pending / idleCap() * 100, 0, 100) + '%';
    $('skIdleBtn').disabled = pend < 1;

    $('skCheckinHint').textContent = canCheckin() ? '今天还没签' : ('已签 · 连 ' + SAVE.checkin.streak + ' 天');
    var doneCount = TASKS.filter(function (t) { return SAVE.tasks.claimed[t.id]; }).length;
    $('skTaskHint').textContent = doneCount + '/3 已领';
    $('skRankHint').textContent = myRank ? ('我的名次 #' + myRank) : '登录后上榜';
    $('skEnergyBig').textContent = SAVE.energy.v;
  }

  function renderGacha() {
    var col = collectionPct();
    $('skGachaCost').textContent = CONFIG.gachaCost;
    $('skGacha10').textContent = CONFIG.gacha10Cost;
    $('skPity').textContent = Math.max(0, CONFIG.pity - SAVE.gacha.pity);
    $('skPityBar').style.width = (SAVE.gacha.pity / CONFIG.pity * 100) + '%';
    $('skOpened').textContent = SAVE.gacha.opened;
    $('skColPct').textContent = col + '%';
    $('skDraw1').disabled = SAVE.user.coins < CONFIG.gachaCost;
    $('skDraw10').disabled = SAVE.user.coins < CONFIG.gacha10Cost;
  }

  function collectionPct() {
    var all = SKINS.filter(function (s) { return s.need > 0; }).length + ITEMS.length + EMOJIS.length;
    var got = SAVE.shuke.owned.filter(function (id) { return id.indexOf('s_') === 0 && id !== 's_01'; }).length;
    ITEMS.concat(EMOJIS).forEach(function (x) { if ((SAVE.shuke.shards[x.id] || 0) >= x.need) got++; });
    return Math.round(got / all * 100);
  }

  function renderCollection() {
    var html = SKINS.map(function (s) {
      var owned = isOwned(s), cur = SAVE.shuke.skin === s.id, shard = SAVE.shuke.shards[s.id] || 0;
      var r = RARITY[s.rarity];
      var btn;
      if (s.need === 0) btn = '<button class="sk-skin-btn' + (cur ? ' cur' : '') + '" onclick="SK.equip(\'' + s.id + '\')">' + (cur ? '使用中' : '换上') + '</button>';
      else if (!owned) btn = '<button class="sk-skin-btn' + (canCraft(s) ? ' ready' : '') + '" ' + (canCraft(s) ? '' : 'disabled') + ' onclick="SK.craft(\'' + s.id + '\')">' + (canCraft(s) ? '合成' : (shard + '/' + s.need)) + '</button>';
      else btn = '<button class="sk-skin-btn' + (cur ? ' cur' : '') + '" onclick="SK.equip(\'' + s.id + '\')">' + (cur ? '使用中' : '换上') + '</button>';
      return '<div class="sk-skin' + (owned ? ' owned' : '') + (cur ? ' equipped' : '') + '" style="--r:' + r.color + ';--g:' + r.glow + '">' +
        '<div class="sk-skin-ico">' + (owned ? s.emoji : '❔') + '</div>' +
        '<div class="sk-skin-name">' + s.name + '</div>' +
        '<div class="sk-skin-rar">' + r.label + '</div>' +
        '<div class="sk-skin-bonus">' + (s.bonus > 0 ? '产出 +' + Math.round(s.bonus * 100) + '%' : '&nbsp;') + '</div>' +
        btn + '</div>';
    }).join('');
    $('skSkins').innerHTML = html;
    $('skSkinCount').textContent = SAVE.shuke.owned.length + '/' + SKINS.length;

    $('skItems').innerHTML = ITEMS.concat(EMOJIS).map(function (x) {
      var cnt = SAVE.shuke.shards[x.id] || 0;
      var got = cnt >= x.need;
      return '<div class="sk-item">' +
        '<div class="sk-item-ico" style="--grey:' + (got ? 0 : 1) + ';--op:' + (got ? 1 : .45) + '">' + x.emoji + '</div>' +
        '<div class="sk-item-name">' + x.name + '</div>' +
        '<div class="sk-item-cnt">' + cnt + '/' + x.need + '</div></div>';
    }).join('');
  }

  function renderRank() {
    $('skMyRank').textContent = myRank ? ('#' + myRank) : '—';
    $('skMyPts').textContent = nfmt(SAVE.user.points);
    $('skTotalPlayers').textContent = nfmt(serverTotal);
  }

  function renderMe() {
    $('skMeName').textContent = SAVE.cloud.nick || (SAVE.user.name + '（本地）');
    $('skMeLevel').textContent = 'Lv.' + SAVE.user.level;
    $('skMePoints').textContent = nfmt(SAVE.user.points);
    $('skMeCombo').textContent = SAVE.play.bestCombo || 0;
    $('skMeOpens').textContent = SAVE.gacha.opened || 0;
    $('skMeOutBtn').style.display = token ? '' : 'none';
    $('skMeAuthBtn').style.display = token ? 'none' : '';
    $('skBest').textContent = SAVE.play.best || 0;
    $('skBestCombo').textContent = SAVE.play.bestCombo || 0;
  }

  function renderAcct() {
    var box = $('skAcct');
    if (!box) return;
    if (token && SAVE.cloud.nick) {
      box.classList.add('on');
      $('skAcctTxt').textContent = '☁️ ' + SAVE.cloud.nick + (myRank ? ' · 全服第 ' + myRank + ' 名' : ' · 已登录');
      $('skAcctBtn').textContent = '退出';
      $('skAcctBtn').className = 'sk-acct-btn ghost';
      $('skAcctBtn').onclick = function () { SK.logout(); };
    } else {
      box.classList.remove('on');
      $('skAcctTxt').textContent = '本地模式 · 登录后可上排行榜';
      $('skAcctBtn').textContent = '登录 / 注册';
      $('skAcctBtn').className = 'sk-acct-btn';
      $('skAcctBtn').onclick = function () { SK.openAuth(); };
    }
  }

  function renderAll() {
    renderHome(); renderGacha(); renderCollection(); renderRank(); renderMe(); renderAcct();
  }

  function hashStr(s) {
    var h = 0;
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }

  /* ================= 弹层内容 ================= */
  function openSheet(title, bodyHtml) {
    $('skSheetTitle').textContent = title;
    $('skSheetBody').innerHTML = bodyHtml;
    $('skSheetModal').classList.add('show');
  }
  function closeSheet() { $('skSheetModal').classList.remove('show'); }

  function openCheckin() {
    var d = new Date();
    var y = d.getFullYear(), m = d.getMonth();
    var total = new Date(y, m + 1, 0).getDate();
    var grid = '';
    for (var i = 1; i <= total; i++) {
      var key = y + '-' + pad(m + 1) + '-' + pad(i);
      var done = SAVE.checkin.days[key];
      var isToday = i === d.getDate();
      grid += '<div class="sk-day' + (done ? ' done' : '') + (isToday ? ' today' : '') + '">' + i + '</div>';
    }
    var coins = 20 + Math.min((SAVE.checkin.streak || 0) + 1, 10) * 5;
    var pts = 5 + Math.min((SAVE.checkin.streak || 0) + 1, 10) * 2;
    openSheet('📅 每日签到',
      '<div class="sk-reward-row">' +
        '<div class="sk-reward"><b>+' + coins + '</b><small>猫毛球</small></div>' +
        '<div class="sk-reward"><b>+' + pts + '</b><small>积分</small></div>' +
        '<div class="sk-reward"><b>+1</b><small>猫粮</small></div>' +
      '</div>' +
      '<div class="sk-checkin-grid">' + grid + '</div>' +
      '<button class="sk-btn primary" style="width:100%" ' + (canCheckin() ? '' : 'disabled') + ' onclick="SK.checkin()">' +
        (canCheckin() ? '签 · 连签第 ' + ((SAVE.checkin.streak || 0) + 1) + ' 天' : '今日已签到 ✅') + '</button>' +
      '<p style="font-size:11px;color:var(--ts);text-align:center;margin-top:10px">连签 +10% 产出，断签从 1 重来</p>');
  }

  function renderTasks() {
    var html = TASKS.map(function (t) {
      var cur = Math.min(SAVE.tasks.progress[t.id] || 0, t.need);
      var done = taskDone(t), claimed = SAVE.tasks.claimed[t.id];
      return '<div class="sk-task">' +
        '<div class="sk-shop-ico">' + t.icon + '</div>' +
        '<div class="sk-task-info">' +
          '<div class="sk-task-name">' + t.name + '</div>' +
          '<div class="sk-task-prog">' + cur + '/' + t.need + ' · +' + t.coins + '🧶 +' + t.pts + '⭐</div>' +
          '<div class="sk-task-bar"><div style="width:' + (cur / t.need * 100) + '%"></div></div>' +
        '</div>' +
        '<button class="sk-task-btn" ' + (done && !claimed ? '' : 'disabled') + ' onclick="SK.claimTask(\'' + t.id + '\')">' +
          (claimed ? '已领' : done ? '领取' : '进行中') + '</button>' +
      '</div>';
    }).join('');
    $('skSheetBody').innerHTML = html +
      '<p style="font-size:11px;color:var(--ts);text-align:center;margin-top:8px">每天 0 点重置，3 个全领 = 75🧶 + 30⭐</p>';
  }

  function openTasks() {
    resetDaily();
    openSheet('✅ 今日任务', '<div id="skTaskList"></div>');
    renderTasks();
  }

  function renderShop() {
    var html = CONFIG.shop.map(function (g) {
      var got = SAVE.exchanged[g.id];
      var enough = SAVE.user.points >= g.cost;
      return '<div class="sk-shop-item">' +
        '<div class="sk-shop-ico">' + g.icon + '</div>' +
        '<div class="sk-shop-info"><div class="sk-shop-name">' + g.name + '</div>' +
          '<div class="sk-shop-cost">' + nfmt(g.cost) + ' 积分 · ' + g.desc + '</div></div>' +
        '<button class="sk-shop-btn" ' + (got || !enough ? 'disabled' : '') + ' onclick="SK.buy(\'' + g.id + '\')">' +
          (got ? '已兑换' : enough ? '兑换' : '积分不足') + '</button>' +
      '</div>';
    }).join('');
    $('skSheetBody').innerHTML = html +
      '<p style="font-size:11px;color:var(--ts);text-align:center;margin-top:8px">我的积分：<b style="color:var(--gold)">' + nfmt(SAVE.user.points) + '</b> · 兑换后截图给小光核销</p>';
  }

  function openShop() { openSheet('🎁 积分商店', ''); renderShop(); }

  /* ================= 抓毛线（Canvas 小游戏） ================= */
  var G = {
    running: false, raf: 0, ctx: null, canvas: null,
    t: 0, score: 0, combo: 0, comboTimer: 0, mult: 1,
    catX: 0.5, items: [], spawnAcc: 0, last: 0, catchFx: []
  };

  function fitGame() {
    var cv = $('skGame');
    if (!cv) return;
    var rect = cv.getBoundingClientRect();
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.max(300, Math.round(rect.width * dpr));
    cv.height = Math.max(400, Math.round(rect.height * dpr));
    G.canvas = cv;
    G.ctx = cv.getContext('2d');
    G.dpr = dpr;
  }

  function startGame() {
    resetDaily();
    tickEnergy();
    if (SAVE.energy.v < 1) { toast('体力不足，等一会儿或去商店'); return; }
    SAVE.energy.v -= 1;
    SAVE.energy.at = Date.now();
    scheduleSync();

    if (!G.canvas) fitGame();
    G.running = true;
    G.t = CONFIG.playSeconds;
    G.score = 0; G.combo = 0; G.mult = 1; G.maxCombo = 0; G.items = []; G.spawnAcc = 0; G.catchFx = [];
    G.catX = 0.5;
    G.last = performance.now();

    $('skStageOverlay').classList.add('hide');
    $('skHud').classList.add('show');
    $('skScore').textContent = '0';
    $('skTimeLeft').textContent = CONFIG.playSeconds;
    $('skCombo').classList.remove('on');
    if (G.raf) cancelAnimationFrame(G.raf);
    G.raf = requestAnimationFrame(gameLoop);
  }

  function endGame() {
    G.running = false;
    if (G.raf) cancelAnimationFrame(G.raf);
    $('skHud').classList.remove('show');
    var double = SAVE.play.games < CONFIG.playDailyDouble;
    var coins = Math.round(G.score * 2 * (double ? 2 : 1) * (1 + streakBonus() * 0.5));
    var pts = Math.max(1, Math.round(G.score / 20));
    SAVE.user.coins += coins;
    SAVE.user.points += pts;
    SAVE.play.games++;
    SAVE.play.best = Math.max(SAVE.play.best || 0, G.score);
    SAVE.play.bestCombo = Math.max(SAVE.play.bestCombo || 0, G.maxCombo || 0);
    SAVE.tasks.progress.play = (SAVE.tasks.progress.play || 0) + 1;
    addExp(10 + Math.round(G.score / 10));
    scheduleSync();

    $('skStageOverlay').classList.remove('hide');
    $('skStageOverlay').innerHTML =
      '<div class="sk-stage-ico">' + (G.score > 40 ? '🎉' : '🐾') + '</div>' +
      '<div class="sk-stage-title">本局 ' + G.score + ' 分' + (double ? ' · 双倍' : '') + '</div>' +
      '<div class="sk-stage-desc">获得 <b>' + coins + ' 🧶</b> 和 <b>' + pts + ' ⭐</b><br>最高连击 ' + (G.maxCombo || 0) + '</div>' +
      '<button class="sk-btn primary" id="skStartBtn" onclick="SK.startGame()">再来一局 · 1⚡</button>' +
      '<div class="sk-stage-tip">' + (SAVE.play.games < CONFIG.playDailyDouble ? '今天还有 ' + (CONFIG.playDailyDouble - SAVE.play.games) + ' 局双倍' : '今天的双倍用完了') + '</div>';
    renderAll();
    if (myRank) pushSave();
    loadLeaderboard();
  }

  function spawnItem() {
    var r = Math.random();
    var type = 'yarn', pts = 1;
    if (r < 0.12) { type = 'bomb'; pts = 0; }
    else if (r < 0.42) { type = 'fish'; pts = 3; }
    else if (r < 0.48) { type = 'star'; pts = 6; }
    G.items.push({
      x: 0.1 + Math.random() * 0.8,
      y: -0.06,
      vy: 0.42 + Math.random() * 0.22 + (1 - G.t / CONFIG.playSeconds) * 0.25,
      type: type, pts: pts, rot: Math.random() * 6.28
    });
  }

  function gameLoop(now) {
    if (!G.running) return;
    var dt = Math.min((now - G.last) / 1000, 0.05);
    G.last = now;
    G.t -= dt;

    var W = G.canvas.width, H = G.canvas.height;
    var ctx = G.ctx;
    ctx.clearRect(0, 0, W, H);

    // 背景光带
    var grd = ctx.createLinearGradient(0, 0, 0, H);
    grd.addColorStop(0, 'rgba(155,107,255,.18)');
    grd.addColorStop(0.6, 'rgba(20,8,40,0)');
    grd.addColorStop(1, 'rgba(255,107,157,.16)');
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, W, H);

    // 生成
    G.spawnAcc += dt;
    var interval = 0.62 - Math.min(0.3, (CONFIG.playSeconds - G.t) * 0.008);
    if (G.spawnAcc >= interval) { G.spawnAcc = 0; spawnItem(); }

    var catY = H - 90 * G.dpr;
    var catX = G.catX * W;
    var basketW = 92 * G.dpr;

    // 绘制物体
    for (var i = G.items.length - 1; i >= 0; i--) {
      var it = G.items[i];
      it.y += it.vy * dt;
      it.rot += dt * 1.6;
      var x = it.x * W, y = it.y * H;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(it.rot) * 0.25);
      ctx.font = (34 * G.dpr) + 'px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      var glyph = it.type === 'bomb' ? '💣' : it.type === 'fish' ? '🐟' : it.type === 'star' ? '⭐' : '🧶';
      ctx.fillText(glyph, 0, 0);
      ctx.restore();

      // 接住
      if (y > catY - 20 * G.dpr && y < catY + 50 * G.dpr && Math.abs(x - catX) < basketW / 2) {
        G.items.splice(i, 1);
        if (it.type === 'bomb') {
          G.combo = 0; G.mult = 1;
          G.score = Math.max(0, G.score - 5);
          G.catchFx.push({ x: x, y: y, life: 0.5, text: '-5 💥', color: '#FF5C7A' });
        } else {
          G.combo++;
          G.maxCombo = Math.max(G.maxCombo || 0, G.combo);
          G.mult = Math.min(5, 1 + Math.floor(G.combo / 5));
          G.score += it.pts * G.mult;
          G.catchFx.push({ x: x, y: y, life: 0.5, text: '+' + (it.pts * G.mult), color: '#FFC24B' });
        }
        $('skScore').textContent = G.score;
        $('skCombo').textContent = 'x' + G.mult + (G.combo > 1 ? ' · ' + G.combo + ' 连' : '');
        $('skCombo').classList.toggle('on', G.combo > 1);
        continue;
      }
      if (it.y > 1.1) G.items.splice(i, 1);
    }

    // 猫（篮子）
    ctx.save();
    ctx.font = (52 * G.dpr) + 'px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🐈‍⬛', catX, catY);
    ctx.restore();

    // 接住特效
    for (var j = G.catchFx.length - 1; j >= 0; j--) {
      var fx = G.catchFx[j];
      fx.life -= dt;
      if (fx.life <= 0) { G.catchFx.splice(j, 1); continue; }
      ctx.save();
      ctx.globalAlpha = Math.max(0, fx.life * 2);
      ctx.fillStyle = fx.color;
      ctx.font = 'bold ' + (18 * G.dpr) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(fx.text, fx.x, fx.y - (0.5 - fx.life) * 60);
      ctx.restore();
    }

    $('skTimeLeft').textContent = Math.max(0, Math.ceil(G.t));
    if (G.t <= 0) { endGame(); return; }
    G.raf = requestAnimationFrame(gameLoop);
  }

  function bindGameInput() {
    var cv = $('skGame');
    if (!cv) return;
    function move(e) {
      var rect = cv.getBoundingClientRect();
      var cx = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      G.catX = clamp(cx / rect.width, 0.06, 0.94);
    }
    cv.addEventListener('pointermove', move, { passive: true });
    cv.addEventListener('pointerdown', move, { passive: true });
    cv.addEventListener('touchmove', move, { passive: true });
    window.addEventListener('resize', function () { if (!G.running) fitGame(); });
  }

  /* ================= 星空背景 ================= */
  function initStars() {
    var cv = $('skStars');
    if (!cv) return;
    var ctx = cv.getContext('2d');
    var stars = [];
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = window.innerWidth * dpr;
      cv.height = window.innerHeight * dpr;
      stars = [];
      var count = Math.round(window.innerWidth * window.innerHeight / 12000);
      for (var i = 0; i < count; i++) {
        stars.push({
          x: Math.random(), y: Math.random(),
          r: Math.random() * 1.5 + 0.3,
          a: Math.random() * 0.6 + 0.15,
          sp: Math.random() * 0.00008 + 0.00002,
          ph: Math.random() * 6.28
        });
      }
    }
    resize();
    window.addEventListener('resize', resize);
    var t0 = 0;
    function loop(ts) {
      if (ts - t0 > 33) {
        t0 = ts;
        ctx.clearRect(0, 0, cv.width, cv.height);
        for (var i = 0; i < stars.length; i++) {
          var s = stars[i];
          s.y -= s.sp * 1000;
          if (s.y < -0.02) { s.y = 1.02; s.x = Math.random(); }
          var alpha = s.a * (0.6 + 0.4 * Math.sin(ts / 900 + s.ph));
          ctx.beginPath();
          ctx.arc(s.x * cv.width, s.y * cv.height, s.r * (window.devicePixelRatio || 1), 0, 6.283);
          ctx.fillStyle = 'rgba(220,210,255,' + alpha.toFixed(3) + ')';
          ctx.fill();
        }
      }
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  /* ================= 导航 ================= */
  function switchPage(page) {
    currentPage = page;
    document.querySelectorAll('.sk-page').forEach(function (p) { p.classList.remove('active'); });
    var el = $('sk-page-' + page);
    if (el) el.classList.add('active');
    document.querySelectorAll('.sk-tab').forEach(function (t) {
      t.classList.toggle('active', t.dataset.page === page);
    });
    if (page === 'home') renderHome();
    if (page === 'gacha') renderGacha();
    if (page === 'collection') renderCollection();
    if (page === 'rank') { renderRank(); loadLeaderboard(); }
    if (page === 'me') renderMe();
    if (page === 'play') {
      setTimeout(fitGame, 30);
      if (!G.running) fitGame();
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /* ================= 初始化 ================= */
  function init() {
    window.SK = {
      switchPage: switchPage,
      doPet: doPet, doFeed: doFeed, claimIdle: claimIdle,
      openCheckin: openCheckin, openTasks: openTasks, openShop: openShop,
      closeSheet: closeSheet, checkin: function () { if (doCheckin()) { openCheckin(); renderHome(); } },
      claimTask: claimTask, buy: buy,
      doGacha: doGacha, closeResult: closeResult,
      craft: craftSkin, equip: equipSkin,
      startGame: startGame,
      openAuth: openAuth, closeAuth: closeAuth, authMode: setAuthMode,
      submitAuth: submitAuth, logout: logout,
      loadLeaderboard: loadLeaderboard
    };

    document.querySelectorAll('.sk-tab').forEach(function (t) {
      t.addEventListener('click', function () { switchPage(t.dataset.page); });
    });
    $('skTabLogin').onclick = function () { setAuthMode('login'); };
    $('skTabReg').onclick = function () { setAuthMode('register'); };
    $('skAuthPass').addEventListener('keydown', function (e) { if (e.key === 'Enter') submitAuth(); });
    $('skCat').addEventListener('click', doPet);

    bindGameInput();
    fitGame();
    initStars();
    resetDaily();
    tickIdle(); tickEnergy();

    // 云端存档
    if (window.whenCloudReady) {
      window.whenCloudReady(function () {
        if (token) {
          pullRemote().then(function () { renderAll(); loadLeaderboard(); });
        } else {
          loadLeaderboard();
        }
      });
    }
    if (!window.sb && window.cloudReady) {
      window.cloudReady().then(function () { if (token) pullRemote().then(renderAll); });
    }

    renderAll();
    loadLeaderboard();

    // 定时刷新挂机 / 体力 / 定时同步
    setInterval(function () {
      tickIdle(); tickEnergy();
      if (currentPage === 'home') renderHome();
      if (currentPage === 'play') $('skEnergyBig').textContent = SAVE.energy.v;
    }, 15000);
    setInterval(function () { if (token) pushSave(); }, 45000);

    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') { saveLocal(SAVE); if (token) pushSave(); }
      else { tickIdle(); if (currentPage === 'home') renderHome(); }
    });
    window.addEventListener('pagehide', function () { saveLocal(SAVE); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
