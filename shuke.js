/* ================================================================
   舒克养成·开箱打卡小游戏
   Shuke Pet & Gacha Check-in Game
   纯前端 MVP · localStorage 存档
   ================================================================ */
(function () {
  'use strict';

  /* ============ 存档 Key ============ */
  const SAVE_KEY = 'shuke_save_v1';

  /* ============ 数值配置（集中管理，便于调整） ============ */
  const CONFIG = {
    initialCoins: 100,       // 初始猫毛球
    initialFood: 3,          // 初始猫粮
    gachaCost: 50,           // 开一箱消耗
    prodBaseRate: 10,        // 挂机产出 猫毛球/小时
    prodCapBase: 200,        // 满仓基础上限
    prodCapPerLevel: 20,     // 每级提升上限
    streakBonusPerDay: 0.10, // 连签每天 +10%
    streakBonusMax: 1.00,    // 加成上限 +100%
    petDailyLimit: 3,        // 每日撸猫次数
    petExp: 5,               // 每次撸猫经验
    petCoins: 3,             // 每次撸猫猫毛球
    feedExp: 50,             // 喂猫经验
    feedFoodCost: 1,         // 喂猫消耗猫粮
    expBase: 80,             // 1→2 所需经验
    expGrowth: 40,           // 每级递增经验
    ssrPity: 30,             // SSR 保底箱数
    rates: { normal: 0.60, rare: 0.25, epic: 0.10, ssr: 0.05 },
    exchange: [
      { id: 'g1', name: '虚拟抵扣券', cost: 5000,  icon: '🎟️' },
      { id: 'g2', name: '定制表情包', cost: 8000,  icon: '😸' },
      { id: 'g3', name: '舒克立牌(虚拟)', cost: 12000, icon: '🪧' },
      { id: 'g4', name: '舰长专属头像框', cost: 20000, icon: '🖼️' }
    ]
  };

  /* ============ 图鉴数据 ============ */
  const SKINS = [
    { id: 's_01', name: '原初舒克', rarity: 'default', need: 0,  emoji: '🐈‍⬛' },
    { id: 's_02', name: '星空舒克', rarity: 'rare',    need: 5,  emoji: '🌌' },
    { id: 's_03', name: '圣诞舒克', rarity: 'epic',    need: 5,  emoji: '🎄' },
    { id: 's_04', name: '樱花舒克', rarity: 'epic',    need: 5,  emoji: '🌸' },
    { id: 's_05', name: '金龙舒克', rarity: 'ssr',     need: 5,  emoji: '🐉' }
  ];
  const EMOJIS = [
    { id: 'e_01', name: '卖萌',   need: 3, emoji: '🥺' },
    { id: 'e_02', name: '打哈欠', need: 3, emoji: '🥱' },
    { id: 'e_03', name: '傲娇',   need: 3, emoji: '😼' },
    { id: 'e_04', name: '干饭',   need: 3, emoji: '🍚' }
  ];
  const ITEMS = [
    { id: 'a_01', name: '蝴蝶结',   need: 5, emoji: '🎀' },
    { id: 'a_02', name: '铃铛项圈', need: 5, emoji: '🔔' },
    { id: 'a_03', name: '墨镜',     need: 5, emoji: '🕶️' },
    { id: 'a_04', name: '小皇冠',   need: 5, emoji: '👑' }
  ];

  const RARITY = {
    default: { label: '默认', color: '#8A8F98', glow: 'rgba(138,143,152,.4)' },
    normal:  { label: '普通', color: '#A0A6B0', glow: 'rgba(160,166,176,.4)' },
    rare:    { label: '稀有', color: '#4FA3FF', glow: 'rgba(79,163,255,.55)' },
    epic:    { label: '史诗', color: '#B678FF', glow: 'rgba(182,120,255,.55)' },
    ssr:     { label: '传说', color: '#FFB23E', glow: 'rgba(255,178,62,.6)' }
  };

  const MOODS = [
    '今天也要好好吃饭哦~',
    '摸摸头，舒克最喜欢你了',
    '困了...想睡个午觉',
    '喵~今天的猫毛球攒了吗',
    '舒克在等你回家',
    '外面下雨了，还好有你在',
    '想和你一起看星星',
    '今天也要元气满满喵！'
  ];

  /* ============ 默认存档 ============ */
  function defaultSave() {
    return {
      user: { name: '小粉丝', level: 1, exp: 0, coins: CONFIG.initialCoins, points: 0, food: CONFIG.initialFood },
      checkin: { lastDate: '', streak: 0, monthMap: {} },
      shuke: { skin: 's_01', equipped: [], collection: { s_01: 0 } },
      gacha: { pityCounter: 0, totalOpened: 0 },
      claimedCoins: 0,
      lastProdTime: Date.now(),
      petToday: { date: '', count: 0 },
      exchanged: {}
    };
  }

  /* ============ Storage 模块（预留后端接口） ============ */
  const Storage = {
    get() {
      try {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) return defaultSave();
        const parsed = JSON.parse(raw);
        // 合并默认值，防止字段缺失
        return deepMerge(defaultSave(), parsed);
      } catch (e) {
        return defaultSave();
      }
    },
    set(save) {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(save));
      } catch (e) { /* ignore */ }
    }
  };

  function deepMerge(base, patch) {
    const out = JSON.parse(JSON.stringify(base));
    if (!patch || typeof patch !== 'object') return out;
    for (const k in patch) {
      if (patch[k] && typeof patch[k] === 'object' && !Array.isArray(patch[k]) && base[k] && typeof base[k] === 'object') {
        out[k] = deepMerge(base[k], patch[k]);
      } else {
        out[k] = patch[k];
      }
    }
    return out;
  }

  /* ============ 全局状态 ============ */
  let SAVE = Storage.get();
  let currentPage = 'home';

  /* ============ 工具 ============ */
  function $(id) { return document.getElementById(id); }
  function esc(s) { const d = document.createElement('div'); d.textContent = (s == null ? '' : String(s)); return d.innerHTML; }
  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function monthKey() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  }
  function todayMood() {
    // 当天固定一句（基于日期哈希）
    const t = todayStr();
    let h = 0;
    for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
    return MOODS[h % MOODS.length];
  }
  function save() { Storage.set(SAVE); }

  /* ============ 等级 / 经验 ============ */
  function expToNext(level) { return CONFIG.expBase + (level - 1) * CONFIG.expGrowth; }
  function addExp(n) {
    SAVE.user.exp += n;
    let leveled = false;
    while (SAVE.user.exp >= expToNext(SAVE.user.level)) {
      SAVE.user.exp -= expToNext(SAVE.user.level);
      SAVE.user.level++;
      leveled = true;
      // 升级送积分
      SAVE.user.points += 10;
    }
    return leveled;
  }

  /* ============ 签到 ============ */
  function doCheckin() {
    const t = todayStr();
    const ck = SAVE.checkin;
    const yesterday = new Date(Date.now() - 86400000);
    const yStr = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0');

    // 连续判定
    if (ck.lastDate === yStr) {
      ck.streak = (ck.streak || 0) + 1;
    } else if (ck.lastDate === t) {
      // 已签到
      return { already: true };
    } else {
      ck.streak = 1;
    }
    ck.lastDate = t;
    const day = String(new Date().getDate());
    ck.monthMap[day] = true;

    // 签到奖励：基础 20 猫毛球 + 连签加成积分
    const coinReward = 20;
    SAVE.user.coins += coinReward;
    SAVE.user.points += 5 + Math.min(ck.streak, 30);
    SAVE.user.food += 1;
    save();
    return { already: false, coinReward, streak: ck.streak };
  }

  function streakBonus() {
    const ck = SAVE.checkin;
    const bonus = Math.min(ck.streak || 0, 10) * CONFIG.streakBonusPerDay;
    return Math.min(bonus, CONFIG.streakBonusMax);
  }

  /* ============ 挂机产出 ============ */
  function prodCap() { return CONFIG.prodCapBase + (SAVE.user.level - 1) * CONFIG.prodCapPerLevel; }
  function prodRate() { return CONFIG.prodBaseRate * (1 + streakBonus()); }

  function updateProduction() {
    const now = Date.now();
    const elapsedHours = (now - SAVE.lastProdTime) / 3600000;
    if (elapsedHours <= 0) return;
    const earned = elapsedHours * prodRate();
    SAVE.claimedCoins = Math.min(prodCap(), SAVE.claimedCoins + earned);
    SAVE.lastProdTime = now;
    save();
  }

  function claimProduction() {
    updateProduction();
    if (SAVE.claimedCoins < 1) { toast('还没有可领取的猫毛球哦'); return; }
    const amount = Math.floor(SAVE.claimedCoins);
    SAVE.user.coins += amount;
    SAVE.claimedCoins = 0;
    SAVE.lastProdTime = Date.now();
    save();
    toast('领取了 ' + amount + ' 猫毛球 🧶');
    renderHome();
  }

  /* ============ 撸猫 / 喂猫 ============ */
  function doPet() {
    const t = todayStr();
    if (SAVE.petToday.date !== t) { SAVE.petToday.date = t; SAVE.petToday.count = 0; }
    if (SAVE.petToday.count >= CONFIG.petDailyLimit) { toast('今天已经撸够啦，舒克很满足~'); return; }
    SAVE.petToday.count++;
    SAVE.user.coins += CONFIG.petCoins;
    const leveled = addExp(CONFIG.petExp);
    SAVE.user.points += 1;
    save();
    toast(leveled ? '舒克升级啦！✨' : '撸猫成功 +' + CONFIG.petCoins + '🧶 +' + CONFIG.petExp + '经验');
    playPetAnim();
    renderHome();
  }

  function doFeed() {
    if (SAVE.user.food < CONFIG.feedFoodCost) { toast('猫粮不够啦，去开箱或签到获取吧'); return; }
    SAVE.user.food -= CONFIG.feedFoodCost;
    const leveled = addExp(CONFIG.feedExp);
    SAVE.user.points += 2;
    save();
    toast(leveled ? '舒克升级啦！✨' : '喂猫成功 +' + CONFIG.feedExp + '经验');
    playFeedAnim();
    renderHome();
  }

  /* ============ 开箱 ============ */
  function rollRarity() {
    const r = Math.random();
    if (SAVE.gacha.pityCounter >= CONFIG.ssrPity) {
      SAVE.gacha.pityCounter = 0;
      return 'ssr';
    }
    let acc = 0;
    const order = ['normal', 'rare', 'epic', 'ssr'];
    for (const k of order) {
      acc += CONFIG.rates[k];
      if (r < acc) {
        SAVE.gacha.pityCounter = (k === 'ssr') ? 0 : SAVE.gacha.pityCounter + 1;
        return k;
      }
    }
    SAVE.gacha.pityCounter++;
    return 'normal';
  }

  function pickDrop(rarity) {
    if (rarity === 'ssr') {
      return { type: 'ssr_skin', item: SKINS[4], label: '传说皮肤碎片', rarity: 'ssr' };
    }
    if (rarity === 'epic') {
      if (Math.random() < 0.7) {
        const skins = SKINS.filter(s => s.need > 0 && s.rarity !== 'ssr');
        const s = skins[Math.floor(Math.random() * skins.length)];
        return { type: 'skin', item: s, label: '皮肤碎片 · ' + s.name, rarity: 'epic' };
      }
      return { type: 'food', amount: 3, label: '猫粮 x3', rarity: 'epic' };
    }
    if (rarity === 'rare') {
      if (Math.random() < 0.6) {
        const a = ITEMS[Math.floor(Math.random() * ITEMS.length)];
        return { type: 'item', item: a, label: '装扮碎片 · ' + a.name, rarity: 'rare' };
      }
      const amt = 20 + Math.floor(Math.random() * 21);
      return { type: 'coins', amount: amt, label: '猫毛球 x' + amt, rarity: 'rare' };
    }
    // normal
    const roll = Math.random();
    if (roll < 0.4) {
      const amt = 5 + Math.floor(Math.random() * 11);
      return { type: 'coins', amount: amt, label: '猫毛球 x' + amt, rarity: 'normal' };
    } else if (roll < 0.7) {
      return { type: 'food', amount: 1, label: '猫粮 x1', rarity: 'normal' };
    } else {
      const e = EMOJIS[Math.floor(Math.random() * EMOJIS.length)];
      return { type: 'emoji', item: e, label: '表情碎片 · ' + e.name, rarity: 'normal' };
    }
  }

  function applyDrop(drop) {
    switch (drop.type) {
      case 'coins': SAVE.user.coins += drop.amount; break;
      case 'food': SAVE.user.food += drop.amount; break;
      case 'emoji':
      case 'item':
      case 'skin':
      case 'ssr_skin':
        const id = drop.item.id;
        SAVE.shuke.collection[id] = (SAVE.shuke.collection[id] || 0) + 1;
        break;
    }
  }

  function doGacha() {
    if (SAVE.user.coins < CONFIG.gachaCost) { toast('猫毛球不够，需要 ' + CONFIG.gachaCost + ' 个'); return; }
    SAVE.user.coins -= CONFIG.gachaCost;
    const rarity = rollRarity();
    const drop = pickDrop(rarity);
    applyDrop(drop);
    SAVE.gacha.totalOpened++;
    SAVE.user.points += 5;
    save();
    showGachaResult(rarity, drop);
  }

  /* ============ 图鉴 / 合成 ============ */
  function canCraft(item) {
    return (SAVE.shuke.collection[item.id] || 0) >= item.need;
  }
  function isOwned(itemId) {
    return SAVE.shuke.skin === itemId || SAVE.shuke.equipped.indexOf(itemId) >= 0;
  }
  function craftSkin(id) {
    const s = SKINS.find(x => x.id === id);
    if (!s || s.need === 0) return;
    if (isOwned(id)) { toast('已经拥有啦'); return; }
    if (!canCraft(s)) { toast('碎片不足，需要 ' + s.need + ' 个碎片'); return; }
    SAVE.shuke.collection[id] -= s.need;
    SAVE.shuke.skin = id;
    save();
    toast('成功合成并换上「' + s.name + '」！🎉');
    renderCollection();
    renderHome();
  }
  function equipSkin(id) {
    const s = SKINS.find(x => x.id === id);
    if (!s) return;
    if (s.need > 0 && !isOwned(id)) { toast('尚未拥有该皮肤'); return; }
    SAVE.shuke.skin = id;
    save();
    toast('已换上「' + s.name + '」');
    renderCollection();
    renderHome();
  }

  /* ============ 兑换 ============ */
  function doExchange(id) {
    const g = CONFIG.exchange.find(x => x.id === id);
    if (!g) return;
    if (SAVE.exchanged[id]) { toast('已经兑换过啦'); return; }
    if (SAVE.user.points < g.cost) { toast('积分不足，需要 ' + g.cost); return; }
    SAVE.user.points -= g.cost;
    SAVE.exchanged[id] = true;
    save();
    toast('兑换成功：「' + g.name + '」🎉');
    renderExchange();
    renderHome();
  }

  /* ============ 排行榜（本地模拟） ============ */
  function getLeaderboard() {
    const bots = [
      { name: '光光', pts: 12800 },
      { name: '奶芙', pts: 9600 },
      { name: '橘子汽水', pts: 8100 },
      { name: '小猫咪咪', pts: 6400 },
      { name: '星野', pts: 5200 }
    ];
    const me = { name: SAVE.user.name, pts: SAVE.user.points, me: true };
    const list = bots.concat([me]);
    list.sort((a, b) => b.pts - a.pts);
    return list;
  }

  /* ============ Toast ============ */
  let toastTimer = null;
  function toast(msg) {
    const el = $('skToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  /* ============ 动画 ============ */
  function playPetAnim() {
    const cat = $('skCat');
    if (!cat) return;
    cat.classList.add('petting');
    setTimeout(() => cat.classList.remove('petting'), 500);
    spawnHeart();
  }
  function playFeedAnim() {
    const cat = $('skCat');
    if (!cat) return;
    cat.classList.add('feeding');
    setTimeout(() => cat.classList.remove('feeding'), 700);
    spawnHeart();
  }
  function spawnHeart() {
    const area = $('skCatWrap');
    if (!area) return;
    const h = document.createElement('span');
    h.className = 'sk-heart';
    h.textContent = '💗';
    h.style.left = (30 + Math.random() * 40) + '%';
    area.appendChild(h);
    setTimeout(() => h.remove(), 1200);
  }

  function showGachaResult(rarity, drop) {
    const overlay = $('skGachaOverlay');
    if (!overlay) return;
    const r = RARITY[rarity];
    $('skGachaIcon').textContent = drop.emoji || (drop.type === 'coins' ? '🧶' : drop.type === 'food' ? '🍖' : '✨');
    $('skGachaIcon').style.color = r.color;
    $('skGachaIcon').style.textShadow = '0 0 24px ' + r.glow;
    $('skGachaRarity').textContent = r.label;
    $('skGachaRarity').style.color = r.color;
    $('skGachaName').textContent = drop.label;
    overlay.classList.add('show');
  }
  function closeGachaResult() {
    const overlay = $('skGachaOverlay');
    if (overlay) overlay.classList.remove('show');
    renderHome();
    renderGacha();
  }

  /* ============ 导航 ============ */
  function switchPage(page) {
    currentPage = page;
    document.querySelectorAll('.sk-page').forEach(p => p.classList.remove('active'));
    const target = $('sk-page-' + page);
    if (target) target.classList.add('active');
    document.querySelectorAll('.sk-tab').forEach(t => t.classList.toggle('active', t.dataset.page === page));
    // 渲染
    if (page === 'home') renderHome();
    if (page === 'checkin') renderCheckin();
    if (page === 'gacha') renderGacha();
    if (page === 'collection') renderCollection();
    if (page === 'exchange') renderExchange();
    if (page === 'rank') renderRank();
  }

  /* ============ 渲染 ============ */
  function renderHome() {
    updateProduction();
    const u = SAVE.user;
    const cap = prodCap();
    $('skName').textContent = u.name;
    $('skLevel').textContent = 'Lv.' + u.level;
    $('skMood').textContent = todayMood();
    $('skCoins').textContent = u.coins;
    $('skPoints').textContent = u.points;
    $('skFood').textContent = u.food;
    // 经验条
    const cur = u.exp, need = expToNext(u.level);
    $('skExpBar').style.width = (cur / need * 100) + '%';
    $('skExpText').textContent = cur + ' / ' + need;
    // 挂机
    $('skProdCap').textContent = cap;
    const claimed = Math.floor(SAVE.claimedCoins);
    $('skProdAmount').textContent = claimed;
    $('skProdBtn').disabled = claimed < 1;
    // 撸猫
    const left = Math.max(0, CONFIG.petDailyLimit - SAVE.petToday.count);
    $('skPetBtn').textContent = '撸猫 (' + left + '/' + CONFIG.petDailyLimit + ')';
    $('skPetBtn').disabled = left <= 0;
    // 皮肤
    const skin = SKINS.find(s => s.id === SAVE.shuke.skin) || SKINS[0];
    $('skCat').textContent = skin.emoji;
    // 连签加成
    $('skStreak').textContent = '连签 ' + (SAVE.checkin.streak || 0) + ' 天 · 产出 +' + Math.round(streakBonus() * 100) + '%';
  }

  function renderCheckin() {
    const ck = SAVE.checkin;
    $('skStreakNum').textContent = ck.streak || 0;
    $('skStreakBonus').textContent = '+' + Math.round(streakBonus() * 100) + '%';
    const today = new Date().getDate();
    const year = new Date().getFullYear(), month = new Date().getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let grid = '';
    for (let d = 1; d <= daysInMonth; d++) {
      const done = ck.monthMap[String(d)];
      const cls = 'sk-day' + (done ? ' done' : '') + (d === today ? ' today' : '');
      grid += '<div class="' + cls + '">' + d + '</div>';
    }
    $('skCheckinGrid').innerHTML = grid;
    $('skCheckinBtn').disabled = ck.lastDate === todayStr();
    $('skCheckinBtn').textContent = ck.lastDate === todayStr() ? '今日已签到 ✅' : '签到领奖励';
  }

  function renderGacha() {
    $('skGachaCost').textContent = CONFIG.gachaCost;
    const remain = Math.max(0, CONFIG.ssrPity - SAVE.gacha.pityCounter);
    $('skPity').textContent = remain;
    $('skPityBar').style.width = (SAVE.gacha.pityCounter / CONFIG.ssrPity * 100) + '%';
    $('skTotalOpened').textContent = SAVE.gacha.totalOpened || 0;
  }

  function renderCollection() {
    const col = SAVE.shuke.collection;
    // 皮肤
    let skinHtml = '';
    SKINS.forEach(s => {
      const owned = isOwned(s.id);
      const cnt = col[s.id] || 0;
      const can = canCraft(s);
      const r = RARITY[s.rarity];
      let action;
      if (s.need === 0 || owned) {
        action = '<button class="sk-craft-btn" onclick="SK.equipSkin(\'' + s.id + '\')">' + (SAVE.shuke.skin === s.id ? '使用中' : '换上') + '</button>';
      } else if (can) {
        action = '<button class="sk-craft-btn ready" onclick="SK.craftSkin(\'' + s.id + '\')">合成</button>';
      } else {
        action = '<button class="sk-craft-btn" disabled>' + cnt + '/' + s.need + '</button>';
      }
      skinHtml += '<div class="sk-col-item" style="border-color:' + r.color + '44">'
        + '<div class="sk-col-icon" style="color:' + r.color + ';text-shadow:0 0 16px ' + r.glow + '">' + (owned ? s.emoji : '❓') + '</div>'
        + '<div class="sk-col-name" style="color:' + r.color + '">' + s.name + '</div>'
        + '<div class="sk-col-tag">' + r.label + '</div>'
        + action
        + '</div>';
    });
    $('skSkins').innerHTML = skinHtml;

    // 表情 + 装扮
    let otherHtml = '';
    EMOJIS.forEach(e => {
      const cnt = col[e.id] || 0;
      const owned = cnt >= e.need;
      otherHtml += '<div class="sk-col-item">'
        + '<div class="sk-col-icon">' + (owned ? e.emoji : '❓') + '</div>'
        + '<div class="sk-col-name">' + e.name + '</div>'
        + '<div class="sk-col-tag">' + cnt + '/' + e.need + '</div>'
        + '</div>';
    });
    ITEMS.forEach(a => {
      const cnt = col[a.id] || 0;
      const owned = cnt >= a.need;
      otherHtml += '<div class="sk-col-item">'
        + '<div class="sk-col-icon">' + (owned ? a.emoji : '❓') + '</div>'
        + '<div class="sk-col-name">' + a.name + '</div>'
        + '<div class="sk-col-tag">' + cnt + '/' + a.need + '</div>'
        + '</div>';
    });
    $('skOthers').innerHTML = otherHtml;
  }

  function renderExchange() {
    let html = '';
    CONFIG.exchange.forEach(g => {
      const done = SAVE.exchanged[g.id];
      const enough = SAVE.user.points >= g.cost;
      html += '<div class="sk-ex-item">'
        + '<div class="sk-ex-icon">' + g.icon + '</div>'
        + '<div class="sk-ex-info"><div class="sk-ex-name">' + g.name + '</div>'
        + '<div class="sk-ex-cost">' + g.cost + ' 积分</div></div>'
        + '<button class="sk-ex-btn" ' + (done || !enough ? 'disabled' : '') + ' onclick="SK.doExchange(\'' + g.id + '\')">'
        + (done ? '已兑换' : '兑换') + '</button>'
        + '</div>';
    });
    $('skExchangeList').innerHTML = html;
    $('skPointsBig').textContent = SAVE.user.points;
  }

  function renderRank() {
    const list = getLeaderboard();
    let html = '';
    list.forEach((p, i) => {
      const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : (i + 1);
      html += '<div class="sk-rank-item' + (p.me ? ' me' : '') + '">'
        + '<div class="sk-rank-no">' + medal + '</div>'
        + '<div class="sk-rank-name">' + esc(p.name) + (p.me ? ' (我)' : '') + '</div>'
        + '<div class="sk-rank-pts">' + p.pts + '</div>'
        + '</div>';
    });
    $('skRankList').innerHTML = html;
  }

  /* ============ 初始化 ============ */
  function init() {
    // 挂载到 window 供 onclick 使用（必须先执行，避免 SK is not defined）
    window.SK = {
      switchPage, doPet, doFeed, doGacha, claimProduction, doCheckin,
      craftSkin, equipSkin, doExchange, closeGachaResult
    };
    // 名字设置
    const savedName = SAVE.user.name;
    $('skName').textContent = savedName;
    // 绑定事件（也可用 onclick，这里用委托确保稳健）
    document.querySelectorAll('.sk-tab').forEach(t => {
      t.addEventListener('click', () => switchPage(t.dataset.page));
    });
    // 改名
    const nameInput = $('skName');
    // 首次进入：若名字为默认，提示可改（在"我的"页提供改名）
    $('skUserName').value = savedName;
    $('skSaveName').addEventListener('click', () => {
      const nm = $('skUserName').value.trim();
      if (!nm) { toast('名字不能为空'); return; }
      SAVE.user.name = nm;
      save();
      toast('名字已保存');
      renderHome();
    });
    // 每天首次进入自动签到
    const ckRes = doCheckin();
    if (!ckRes.already) {
      setTimeout(() => toast('签到成功！连签 ' + ckRes.streak + ' 天 +' + ckRes.coinReward + '🧶'), 600);
    }
    updateProduction();
    renderHome();
    // 定时刷新挂机
    setInterval(() => { if (currentPage === 'home') renderHome(); }, 30000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
