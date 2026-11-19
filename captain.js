
/* ================================================================
   Config - Cloud (WorkBuddy) + Encryption
   ================================================================ */
// 连接配置见 cloud-config.js，window.sb 由该文件的兼容层提供

const ADMIN_U='fuguang';   // 仅用于前端提示，真正的口令校验在服务端 admin_op
const MUNI=['北京市','上海市','天津市','重庆市'];
const SK='luminos_v6';

/* ================================================================
   舰长资料通道（加密完全在服务端）
   ---------------------------------------------------------------
   手机号与地址用 pgp_sym_encrypt 存库，密钥只存在于数据库 app_secret，
   前端代码、页面源码、网络请求里都不再出现密钥。
   - 匿名用户：只能「登记」，写完读不回，连密文都取不到；
   - 管理员：凭口令调用 captain_rpc 才能拿到明文。
   这样即使有人扒走发布包的 JS，也拿不到任何一位舰长的联系方式。
   ================================================================ */
async function capRpc(action, payload) {
  if (typeof window.captainCall !== 'function') return { ok: false, error: '数据通道未就绪' };
  return window.captainCall(action, payload || {});
}
async function capPublic(action, payload) {
  if (typeof window.captainPublic !== 'function') return { ok: false, error: '数据通道未就绪' };
  return window.captainPublic(action, payload || {});
}

/* ================================================================
   狐狸提示（普通人想改资料时的统一回应）
   ================================================================ */
function showFox(title, desc) {
  const t = document.getElementById('foxTitle');
  const d = document.getElementById('foxDesc');
  if (t) t.textContent = title;
  if (d) d.textContent = desc;
  const m = document.getElementById('fox');
  if (m) m.classList.add('show');
}
function closeFox() { const m = document.getElementById('fox'); if (m) m.classList.remove('show'); }
window.showFox = showFox;
window.closeFox = closeFox;

/* ================================================================
   State
   ================================================================ */
window.role=null; window.guestName=''; window.editingId=null;
// window.sb 由 cloud-config.js 提供，此处不可重置，否则会覆盖已建立的云端连接

/* ================================================================
   Cloud Init
   ================================================================ */
function initSB() {
  // cloud-config.js 会在脚本加载时同步安装兼容层
  if (window.sb && typeof window.sb.from === 'function') return true;
  // SDK 尚未就绪（网络较慢）：等它就绪后自动重试一次
  if (typeof window.whenCloudReady === 'function') {
    window.whenCloudReady(function () {
      if (typeof window.loadNameWall === 'function') window.loadNameWall();
      if (typeof window.render === 'function') window.render();
    });
  }
  return false;
}

/* ================================================================
   Database Operations
   ================================================================ */
async function dbGetRecords(month) {
  // 只有管理员能读：服务端校验口令，访客调用一律返回「管理口令已失效」
  if (window.role !== 'admin') return [];
  const res = await capRpc('list', month ? { month } : {});
  if (!res || !res.ok) { reportDbError('captain.list', res && res.error); return []; }
  return (res.rows || []).map(function (r) {
    r._phone = r.phone || '';
    r._address = r.address || '';
    return r;
  });
}

/** 访客/管理员登记：明文只在请求中出现一次，落库前由数据库加密 */
async function dbRegister(payload) {
  window.__lastDbError = '';
  const res = await capPublic('register', payload);
  if (!res || !res.ok) { reportDbError('records.register', res && res.error); return null; }
  return res;
}

/** 统一记录并暴露写库失败原因，避免界面只显示"失败"两个字 */
function reportDbError(where, err) {
  var msg = (err && (err.message || err.error_description || String(err))) || '未知错误';
  if (/Failed to fetch|NetworkError|ERR_|Load failed|network/i.test(msg)) {
    msg = '连不上云服务器，请检查网络后重试；若一直失败，请用最新链接重新打开';
  }
  window.__lastDbError = msg;
  try { console.error('[DB] ' + where + ' 失败：' + msg, err); } catch (e) {}
}

/** 管理写操作统一入口：口令由服务端校验，失败时把真实原因带到界面 */
async function adminWrite(action, table, payload, conflict) {
  if (typeof window.adminOp !== 'function') {
    window.__lastDbError = '管理通道未就绪';
    return { ok: false, error: '管理通道未就绪' };
  }
  const res = await window.adminOp(action, table, payload, conflict);
  if (!res || !res.ok) {
    window.__lastDbError = (res && res.error) || '未知错误';
    try { console.error('[Admin] ' + action + ' ' + table + ' 失败：' + window.__lastDbError); } catch (e) {}
    return { ok: false, error: window.__lastDbError };
  }
  return res;
}

async function dbDeleteRecord(id) {
  const res = await adminWrite('delete', 'records', { id });
  return !!res.ok;
}

async function dbGetMonths() {
  const rows = await dbGetRecords();
  return [...new Set(rows.map(r => r.month).filter(Boolean))].sort().reverse();
}

/* ============ 续舰名单 (renew_captains) ============ */
async function dbGetRenewCaptains() {
  if (window.role !== 'admin') return [];
  const res = await capRpc('renew_list');
  if (!res || !res.ok) return [];
  return (res.rows || []).map(function (r) {
    r._phone = r.phone || '';
    r._address = r.address || '';
    return r;
  });
}

async function dbUpsertRenewCaptain(cap) {
  const res = await capRpc('renew_save', cap);
  return res && res.ok ? res : null;
}

async function dbDeleteRenewCaptain(id) {
  const res = await adminWrite('delete', 'renew_captains', { id });
  return !!res.ok;
}

async function dbUpdateRenewCaptain(id, updates) {
  const res = await capRpc('renew_save', Object.assign({ id }, updates));
  return res && res.ok ? res : null;
}

/* ================================================================
   Utility
   ================================================================ */
function getCurMonth() {
  const n = new Date();
  return n.getFullYear() + '-' + String(n.getMonth()+1).padStart(2,'0');
}

function esc(s) { const d = document.createElement('div'); d.textContent = s||''; return d.innerHTML; }

/* ================================================================
   Auth
   ================================================================ */
function openAdminLogin() { document.getElementById('alm').classList.add('show'); document.getElementById('le').style.display='none' }
function closeAdminLogin() { document.getElementById('alm').classList.remove('show'); document.getElementById('lu').value=''; document.getElementById('lpw').value='' }

async function doLogin() {
  const u = document.getElementById('lu').value.trim();
  const p = document.getElementById('lpw').value;
  const e = document.getElementById('le');
  if (u !== ADMIN_U || !p) {
    e.style.display='block';
    setTimeout(()=>e.style.display='none', 3000);
    return;
  }
  showLoading('⏳ 登录中...');
  try {
    // 口令在服务端比对哈希，前端不再保存任何口令字面量
    if (typeof window.cloudReady === 'function') await window.cloudReady();
    const res = await window.adminLogin(p);
    if (!res || !res.ok) {
      e.textContent = (res && res.error) === '口令错误' ? '口令不正确' : '登录失败：' + ((res && res.error) || '未知错误');
      e.style.display = 'block';
      setTimeout(()=>{ e.style.display='none'; e.textContent='用户名或密码错误'; }, 3000);
      return;
    }
    window.role ='admin';
    localStorage.setItem(SK+'_role','admin');
    closeAdminLogin();
    if (!initSB()) return;
    await enterApp();
    /* 留存巡检：每次管理员登录时清一次超过半年的投稿。
       服务端有 6 天防抖，重复调用会自动跳过，不会反复删。 */
    (async function () {
      if (typeof window.purgeOldPosts !== 'function') return;
      try {
        const r = await window.purgeOldPosts(180, false);
        if (r && r.ok && r.deleted > 0) {
          toast('已按留存策略清理 ' + r.deleted + ' 条半年前的投稿', 'i');
        }
      } catch (e) { /* 清理失败不影响登录 */ }
    })();
  } catch (err) {
    e.textContent = '登录失败：' + (err && err.message || '未知错误');
    e.style.display = 'block';
    setTimeout(()=>{ e.style.display='none'; e.textContent='用户名或密码错误'; }, 3000);
  } finally {
    hideLoading();
  }
}

function doGuest() {
  document.getElementById('gnInput').value='';
  document.getElementById('gne').style.display='none';
  document.getElementById('gnm').classList.add('show');
  setTimeout(()=>document.getElementById('gnInput').focus(), 300);
}
function openGuestNick() { doGuest(); }
function closeGuestNick() { document.getElementById('gnm').classList.remove('show') }

async function submitGuestNick() {
  const nm = document.getElementById('gnInput').value.trim();
  if (!nm) { document.getElementById('gne').style.display='block'; return; }
  window.role ='guest'; guestName=nm;
  localStorage.setItem(SK+'_role','guest');
  localStorage.setItem(SK+'_gn', guestName);
  closeGuestNick();
  if (!initSB()) return;
  showLoading('⏳ 进入中...');
  try { await enterApp(); } finally { hideLoading(); }
}

function backToLanding() {
  document.getElementById('lp').style.display='';
  document.getElementById('app').classList.remove('show');
  const cat = document.getElementById('oneko');
  if (cat && !cat.dataset.userHidden) cat.style.display = '';
  closeGiftShowcase();
}

async function enterApp() {
  document.getElementById('lp').style.display='none';
  document.getElementById('app').classList.add('show');
  // 像素猫会盖住左上角的「返回」，进应用后先收起来
  const cat = document.getElementById('oneko');
  if (cat) cat.style.display = 'none';
  const isA = window.role ==='admin';
  document.getElementById('btnHist').style.display = isA ? '' : 'none';
  document.getElementById('btnRenew').style.display = isA ? '' : 'none';
  document.getElementById('statsRow').style.display = isA ? 'grid' : 'none';
  document.getElementById('srch').style.display = isA ? '' : 'none';
  document.getElementById('gb').style.display = isA ? 'none' : '';
  if (!isA) document.getElementById('guestName').textContent = guestName;
  document.getElementById('hdTitle').textContent = isA ? '舰长信息管理' : '我的资料';
  document.getElementById('hdSub').textContent = isA ? ('管理员 · ' + getCurMonth()) : '🔒 已加密 · 只有小光能看';
  await render();
}

/* ================================================================
   Area Data (loaded from area-data.js)
   ================================================================ */


function initProvinces() {
  const sel = document.getElementById('fp');
  sel.innerHTML = '<option value="">请选择省份</option>';
  Object.keys(AREA_DATA).sort().forEach(p => {
    const opt = document.createElement('option');
    opt.value = p; opt.textContent = p;
    sel.appendChild(opt);
  });
}

/**
 * 通用三级联动：绑定省/市/区三个 select。
 * state 是 { prov, city } 引用对象，表单读取时用 state.prov/state.city。
 */
function bindAreaGroup(provId, cityId, distId, state) {
  const fp = document.getElementById(provId);
  const fc = document.getElementById(cityId);
  const fd = document.getElementById(distId);
  fp.innerHTML = '<option value="">请选择省份</option>';
  Object.keys(AREA_DATA).sort().forEach(p => {
    const o = document.createElement('option'); o.value = p; o.textContent = p;
    fp.appendChild(o);
  });
  fp.addEventListener('change', function () {
    state.prov = fp.value || null;
    state.city = null;
    if (!fp.value) {
      fc.innerHTML = '<option value="">请先选省份</option>'; fc.disabled = true;
      fd.innerHTML = '<option value="">请先选城市</option>'; fd.disabled = true;
      return;
    }
    const val = AREA_DATA[fp.value];
    if (Array.isArray(val)) {
      fc.innerHTML = '<option value="">请选择区</option>'; fc.disabled = false;
      val.forEach(d => { const o = document.createElement('option'); o.value = d; o.textContent = d; fc.appendChild(o); });
      fd.innerHTML = '<option value="">-</option>'; fd.disabled = true;
    } else {
      fc.innerHTML = '<option value="">请选择城市</option>'; fc.disabled = false;
      Object.keys(val).sort().forEach(c => { const o = document.createElement('option'); o.value = c; o.textContent = c; fc.appendChild(o); });
      fd.innerHTML = '<option value="">请先选城市</option>'; fd.disabled = true;
    }
  });
  fc.addEventListener('change', function () {
    state.city = fc.value || null;
    const prov = AREA_DATA[state.prov];
    if (!prov) return;
    if (Array.isArray(prov)) { fd.innerHTML = '<option value="">-</option>'; fd.disabled = true; return; }
    const districts = prov[state.city];
    if (!districts || districts.length === 0) { fd.innerHTML = '<option value="">-</option>'; fd.disabled = true; return; }
    fd.innerHTML = '<option value="">请选择区县</option>'; fd.disabled = false;
    districts.forEach(d => { const o = document.createElement('option'); o.value = d; o.textContent = d; fd.appendChild(o); });
  });
  fd.addEventListener('change', function () {});
}

/** 回填省市区（表单编辑用） */
function fillAreaGroup(fpId, fcId, fdId, r) {
  const fp = document.getElementById(fpId);
  const fc = document.getElementById(fcId);
  const fd = document.getElementById(fdId);
  if (!r.province) { fp.value = ''; return; }
  fp.value = r.province;
  fp.dispatchEvent(new Event('change'));
  const prov = AREA_DATA[r.province];
  if (!prov) return;
  if (r.city) {
    fc.value = r.city;
    fc.dispatchEvent(new Event('change'));
    if (!Array.isArray(prov) && prov[r.city] && prov[r.city].length && r.district) {
      fd.value = r.district;
    }
  }
}

/* ================================================================
   Render
   ================================================================ */
async function render() {
  const list = document.getElementById('gl');
  if (window.role === 'guest') { renderGuestCard(list); return; }
  await renderStats();
  const recs = await getVisible();
  if (recs.length === 0) {
    list.innerHTML = '<div class="empty"><div class="ic">📋</div><p>本月暂无记录</p></div>';
    return;
  }
  const isA = window.role === 'admin';
  recs.sort((a,b) => (b.created_at||'').localeCompare(a.created_at||''));
  list.innerHTML = recs.map(r => {
    const ad = fullAd(r);
    const isRenew = !!r.auto_renew;
    return '<div class="gc'+(isRenew?' gc-renew':'')+'" id="c-'+r.id+'">'+
      '<div class="gc-hd" onclick="toggleD(\''+r.id+'\')">'+
        '<div class="gc-av">'+(r.nickname||'?').charAt(0)+'</div>'+
        '<div class="gc-info">'+
          '<div class="gc-nm">'+esc(r.nickname)+(isRenew?'<span class="gc-renew-tag">自动续费</span>':'')+'</div>'+
          '<div class="gc-meta">📱 '+(r._phone||'未填')+'</div>'+
        '</div>'+
        (isA ? '<div class="gc-act" onclick="event.stopPropagation()"><button onclick="editR(\''+r.id+'\')">✏️</button><button onclick="delR(\''+r.id+'\')">🗑️</button></div>' : '')+
      '</div>'+
      '<div class="gc-dt" id="d-'+r.id+'">'+
        '<p><strong>昵称：</strong>'+esc(r.nickname)+'</p>'+
        '<p><strong>手机：</strong>'+(r._phone||'未填')+'</p>'+
        '<p><strong>地址：</strong>'+(ad||'未填')+'</p>'+
        (r.note ? '<p><strong>备注：</strong>'+esc(r.note)+'</p>' : '')+
        (isRenew ? '<p class="gc-renew-line">🔄 自动续费：下月自动带出地址</p>' : '')+
      '</div>'+
    '</div>';
  }).join('');
}

/* ============ 访客页：只读自己、敏感打码；修改走狐狸提示 ============ */
async function renderGuestCard(list) {
  if (!list) return;
  list.innerHTML = '<div class="guest-lock"><div class="gl-fox">🦊</div><div class="gl-title">小光正在翻保险箱…</div></div>';
  const res = await capPublic('lookup', { nickname: guestName });
  const rows = (res && res.ok && res.rows) || [];
  const curMonth = getCurMonth();
  let cards = '';
  if (rows.length) {
    cards = '<div class="gl-mine">' + rows.map(r => {
      const ad = [r.province, r.city, r.district].filter(Boolean).join(' ');
      const isCur = r.month === curMonth;
      return '<div class="gl-card' + (isCur ? '' : ' gl-old') + '">' +
        '<div class="gl-card-hd"><span class="gl-card-av">' + esc((r.nickname || '?').charAt(0)) + '</span>' +
          '<div><b>' + esc(r.nickname) + '</b><small>' + esc(r.month || '') + (r.auto_renew ? ' · 自动续舰' : '') + (isCur ? '' : ' · 历史') + '</small></div>' +
          (isCur ? '<span class="gl-card-tag">当月</span>' : '<span class="gl-card-tag old">往期</span>') +
        '</div>' +
        '<div class="gl-card-row">📱 ' + (r.phone_mask ? esc(r.phone_mask) : '未填') + '</div>' +
        '<div class="gl-card-row">📍 ' + esc((ad ? ad + ' ' : '') + (r.address_mask || '未填')) + '</div>' +
        '<button class="gl-btn ghost" onclick="askXiaoguang()">💬 改这份资料</button>' +
      '</div>';
    }).join('') + '</div>';
  }
  list.innerHTML =
    '<div class="guest-lock">' +
      '<div class="gl-fox">🦊</div>' +
      '<div class="gl-title">' + (rows.length ? '找到你的登记啦' : '还没登记过哦') + '</div>' +
      '<div class="gl-desc">' + (rows.length
        ? '手机号和地址已经打码，只有小光能看完整版'
        : '点下面「登记一份」，填完就会加密锁好，只有小光能看') + '</div>' +
      '<div class="gl-actions">' +
        '<button class="gl-btn primary" onclick="openForm()">' + (rows.length ? '📝 重新登记一份' : '📝 登记一份') + '</button>' +
        '<button class="gl-btn" onclick="askXiaoguang()">💬 我想改资料</button>' +
      '</div>' +
      '<div class="gl-foot">钥匙只有一把，在小光手里 🗝️</div>' +
    '</div>' + cards;
}

window.askXiaoguang = function () {
  showFox(
    '哎呀，锁上啦 🔒',
    '这份资料被小光收进狐狸窝了，只有ta能开～ 想改手机号或地址，直接戳小光说一声就好，ta会替你改的！'
  );
};

async function getVisible() {
  const recs = await dbGetRecords(getCurMonth());
  const q = (document.getElementById('si').value || '').trim().toLowerCase();
  if (!q) return recs;
  return recs.filter(r =>
    (r.nickname||'').toLowerCase().includes(q) ||
    (r._phone||'').toLowerCase().includes(q) ||
    fullAd(r).toLowerCase().includes(q)
  );
}

async function renderStats() {
  const recs = await dbGetRecords(getCurMonth());
  let phoneCount = 0, addrComplete = 0;
  for (const r of recs) {
    if (r._phone) phoneCount++;
    if (r.province && r.city && r.district) addrComplete++;
  }
  const months = await dbGetMonths();
  document.getElementById('statsRow').innerHTML =
    '<div class="sc"><div class="num">'+recs.length+'</div><div class="lb">本月舰长</div></div>'+
    '<div class="sc"><div class="num" style="color:var(--al)">'+phoneCount+'</div><div class="lb">已填手机</div></div>'+
    '<div class="sc"><div class="num" style="color:var(--ok)">'+addrComplete+'</div><div class="lb">地址完整</div></div>'+
    '<div class="sc"><div class="num" style="color:var(--err)">'+months.length+'</div><div class="lb">历史月份</div></div>';
}

function fullAd(r) {
  const ps = [];
  const im = MUNI.includes(r.province);
  if (r.province) ps.push(r.province);
  if (r.city && !(im && r.city === r.province)) ps.push(r.city);
  if (r.district) ps.push(r.district);
  if (r._address) ps.push(r._address);
  return ps.join(' ');
}

function toggleD(id) { document.getElementById('d-'+id).classList.toggle('show') }

/* ================================================================
   Form
   ================================================================ */
async function openForm(id) {
  // 资料只有管理员能改；普通人点编辑会收到狐狸提示
  if (id && window.role !== 'admin') { window.askXiaoguang(); return; }
  editingId = id || null;
  document.getElementById('ft').textContent = id ? '编辑记录' : '添加记录';
  document.getElementById('fc').innerHTML = '<option value="">请先选省份</option>'; document.getElementById('fc').disabled = true;
  document.getElementById('fd').innerHTML = '<option value="">请先选城市</option>'; document.getElementById('fd').disabled = true;

  if (id) {
    const recs = await dbGetRecords(getCurMonth());
    const r = recs.find(x => x.id === id);
    if (r) {
      document.getElementById('fn').value = r.nickname || '';
      document.getElementById('fph').value = r._phone || '';
      document.getElementById('fa').value = r._address || '';
      document.getElementById('fnote').value = r.note || '';
      setRenewModeRaw(!!r.auto_renew ? 1 : 0);
      fillAreaGroup('fp', 'fc', 'fd', r);
    }
  } else {
    document.getElementById('fn').value = window.role ==='guest' ? guestName : '';
    document.getElementById('fph').value = '';
    document.getElementById('fp').value = '';
    document.getElementById('fc').innerHTML = '<option value="">请先选省份</option>'; document.getElementById('fc').disabled = true;
    document.getElementById('fd').innerHTML = '<option value="">请先选城市</option>'; document.getElementById('fd').disabled = true;
    document.getElementById('fa').value = '';
    document.getElementById('fnote').value = '';
    setRenewModeRaw(0);
    // 访客：带出上次在这台设备上填过的资料（存在本机，不上云）
    if (window.role === 'guest') {
      try {
        const last = JSON.parse(localStorage.getItem(SK + '_last_reg') || 'null');
        if (last && last.nickname === guestName) {
          document.getElementById('fph').value = last.phone || '';
          document.getElementById('fa').value = last.address || '';
          document.getElementById('fnote').value = last.note || '';
          fillAreaGroup('fp', 'fc', 'fd', last);
          if (last.phone || last.address) toast('认出你啦，已带出上次资料 🦊','s');
        }
      } catch (e) {}
    }
  }
  document.getElementById('fm').classList.add('show');
}

function closeForm() { document.getElementById('fm').classList.remove('show'); editingId = null }

async function saveForm() {
  const n = document.getElementById('fn').value.trim();
  const ph = document.getElementById('fph').value.trim();
  const fp = document.getElementById('fp').value;
  const fc = document.getElementById('fc').value;
  const fd = document.getElementById('fd').value;
  const fa = document.getElementById('fa').value.trim();
  const fn = document.getElementById('fnote').value.trim();
  if (!n) { toast('请输入昵称','e'); return; }
  if (!ph) { toast('请输入手机号','e'); return; }
  if (!/^1[3-9]\d{9}$/.test(ph)) { toast('请输入正确的11位手机号','e'); return; }
  if (!fa) { toast('请输入详细地址','e'); return; }

  showLoading('⏳ 保存中...');
  try {
    const auto_renew = document.getElementById('fauto').value === '1';
    const payload = {
      nickname: n, phone: ph, province: fp, city: fc, district: fd,
      address: fa, note: fn, auto_renew
    };

    if (editingId) {
      const res = await capRpc('save', Object.assign({ id: editingId }, payload));
      if (res && res.ok) {
        if (auto_renew) await syncRenewCaptain(n, ph, fp, fc, fd, fa, fn);
        else await removeRenewCaptainByName(n);
        closeForm(); await render(); toast('已更新 ✅','s');
      }
      else { toast('更新失败：' + (window.__lastDbError || (res && res.error) || '未知错误'),'e'); }
    } else {
      const result = await dbRegister(payload);
      if (result) {
        closeForm(); await render();
        if (window.role === 'guest') {
          try {
            localStorage.setItem(SK + '_last_reg', JSON.stringify({
              nickname: n, phone: ph, province: fp, city: fc, district: fd, address: fa, note: fn
            }));
          } catch (e) {}
          showFox('登记好啦 🦊', '资料已经加密送进小光的狐狸窝，ta会看到并安排发货。下次再来会自动带出这次的地址，不用重填～');
        } else {
          toast('已添加 ✅','s');
        }
      }
      else { toast('添加失败：' + (window.__lastDbError || '未知错误'),'e'); }
    }
  } finally {
    hideLoading();
  }
}

async function syncRenewCaptain(nickname, phone, province, city, district, address, note) {
  await dbUpsertRenewCaptain({ nickname, phone, province, city, district, address, note });
}

async function removeRenewCaptainByName(nickname) {
  const caps = await dbGetRenewCaptains();
  const hit = caps.find(c => c.nickname === nickname);
  if (hit) await dbDeleteRenewCaptain(hit.id);
}

function setRenewMode(val) {
  // 用户点击分段按钮
  if (val === 1) {
    openAutoRenewHint(); // 切到自动续舰时弹提示框
  }
  setRenewModeRaw(val);
}

function setRenewModeRaw(val) {
  // 仅设置状态和 UI，不弹框（回填用）
  const seg = document.getElementById('renewSeg');
  const fauto = document.getElementById('fauto');
  const txt = document.getElementById('fautoTxt');
  if (fauto) fauto.value = val ? '1' : '0';
  if (seg) {
    seg.querySelectorAll('.renew-seg-btn').forEach(b => {
      b.classList.toggle('active', parseInt(b.dataset.val, 10) === val);
    });
  }
  if (txt) {
    txt.textContent = val
      ? '自动续舰：后续每月自动带出地址，无需重复填写'
      : '手动填写：本月只填一次，下月需重新填写';
  }
}

function openAutoRenewHint() {
  document.getElementById('arh').classList.add('show');
}

function closeAutoRenewHint() {
  document.getElementById('arh').classList.remove('show');
}

function editR(id) { openForm(id) }

/* ================================================================
   Delete
   ================================================================ */
async function delR(id) {
  if (window.role !== 'admin') return;
  const recs = await dbGetRecords(getCurMonth());
  const r = recs.find(x => x.id === id);
  document.getElementById('cm').textContent = '确定删除「'+(r?r.nickname:'此记录')+'」？';
  document.getElementById('cd').classList.add('show');
  document.getElementById('cok').onclick = async () => {
    showLoading('⏳ 删除中...');
    try {
      const ok = await dbDeleteRecord(id);
      closeConfirm();
      if (ok) { await render(); toast('已删除','i'); }
      else { toast('删除失败','e'); }
    } finally { hideLoading(); }
  };
}
function closeConfirm() { document.getElementById('cd').classList.remove('show') }

/* ================================================================
   History (admin)
   ================================================================ */
async function openHistory() {
  if (window.role !== 'admin') return;
  showLoading('⏳ 加载历史...');
  try {
    const months = await dbGetMonths();
    let html = '';
    if (months.length === 0) {
      html = '<div style="text-align:center;padding:24px;color:#61666D;font-size:13px">暂无历史记录</div>';
    } else {
      for (const m of months) {
        const recs = await dbGetRecords(m);
        html += '<div class="hist-item"><div><div class="mon">'+m+'</div><div class="cnt">'+recs.length+' 条记录</div></div>'+
          '<button onclick="exportHistory(\''+m+'\')">导出 xlsx</button></div>';
      }
    }
    document.getElementById('hmBody').innerHTML = html;
    document.getElementById('hm').classList.add('show');
  } finally { hideLoading(); }
}
function closeHistory() { document.getElementById('hm').classList.remove('show') }

async function exportHistory(m) {
  showLoading('⏳ 导出中...');
  try {
    const recs = await dbGetRecords(m);
    if (recs.length === 0) { toast('该月无数据','e'); return; }
    doExport(recs, m);
  } finally { hideLoading(); }
}

/* ================================================================
   Renew Captains Admin (续舰名单后台管理)
   ================================================================ */
async function openRenewAdmin() {
  if (window.role !== 'admin') return;
  editingRenewId = null;
  cancelRenewForm();
  document.getElementById('rnq').value = '';
  showLoading('⏳ 加载中...');
  try {
    await renderRenewAdmin();
    document.getElementById('rm').classList.add('show');
  } finally { hideLoading(); }
}
function closeRenewAdmin() { document.getElementById('rm').classList.remove('show') }

async function renderRenewAdmin() {
  const caps = await dbGetRenewCaptains();
  const q = (document.getElementById('rnq').value || '').trim().toLowerCase();
  const shown = q ? caps.filter(c => (c.nickname || '').toLowerCase().includes(q)) : caps;
  const body = document.getElementById('rmBody');
  if (caps.length === 0) {
    body.innerHTML = '<div style="text-align:center;padding:24px;color:var(--ts);font-size:13px">暂无续舰名单，点「＋ 新增」添加</div>';
    return;
  }
  if (shown.length === 0) {
    body.innerHTML = '<div style="text-align:center;padding:24px;color:var(--ts);font-size:13px">没有匹配的昵称</div>';
    return;
  }
  body.innerHTML = shown.map(c => {
    const ad = [c.province, c.city, c.district, c._address].filter(Boolean).join(' ');
    return '<div class="hist-item">'+
      '<div style="min-width:0;flex:1"><div class="mon">'+esc(c.nickname)+'</div>'+
      '<div class="cnt">'+(c._phone ? '📱 '+esc(c._phone) : '未填手机')+'</div>'+
      (ad ? '<div class="cnt">📍 '+esc(ad)+'</div>' : '<div class="cnt">未填地址</div>')+
      '</div>'+
      '<div style="display:flex;gap:6px;flex:none">'+
      '<button onclick="editRenewCaptain(\''+c.id+'\')">编辑</button>'+
      '<button onclick="delRenewCaptain(\''+c.id+'\')" style="border-color:var(--err);color:var(--err)">删除</button>'+
      '</div>'+
    '</div>';
  }).join('');
}

var editingRenewId = null;

function openRenewForm() {
  editingRenewId = null;
  document.getElementById('rnFormTitle').textContent = '新增续舰';
  document.getElementById('rn').value = '';
  document.getElementById('rph').value = '';
  document.getElementById('rp').value = '';
  document.getElementById('rc').innerHTML = '<option value="">请先选省份</option>';
  document.getElementById('rc').disabled = true;
  document.getElementById('rd').innerHTML = '<option value="">请先选城市</option>';
  document.getElementById('rd').disabled = true;
  document.getElementById('ra').value = '';
  document.getElementById('rnote').value = '';
  document.getElementById('rmAddBtn').textContent = '保存';
  document.getElementById('rnForm').style.display = '';
  setTimeout(() => document.getElementById('rn').focus(), 200);
}

function cancelRenewForm() {
  editingRenewId = null;
  const f = document.getElementById('rnForm');
  if (f) f.style.display = 'none';
}

async function editRenewCaptain(id) {
  if (window.role !== 'admin') return;
  const caps = await dbGetRenewCaptains();
  const c = caps.find(x => x.id === id);
  if (!c) return;
  editingRenewId = id;
  document.getElementById('rnFormTitle').textContent = '编辑「' + (c.nickname || '') + '」';
  document.getElementById('rn').value = c.nickname || '';
  document.getElementById('rph').value = c._phone || '';
  document.getElementById('ra').value = c._address || '';
  document.getElementById('rnote').value = c.note || '';
  fillAreaGroup('rp', 'rc', 'rd', c);
  document.getElementById('rmAddBtn').textContent = '保存';
  document.getElementById('rnForm').style.display = '';
  setTimeout(() => document.getElementById('rn').focus(), 200);
}

async function addRenewCaptain() {
  if (window.role !== 'admin') return;
  const n = document.getElementById('rn').value.trim();
  const ph = document.getElementById('rph').value.trim();
  const fp = document.getElementById('rp').value;
  const fc = document.getElementById('rc').value;
  const fd = document.getElementById('rd').value;
  const fa = document.getElementById('ra').value.trim();
  const note = document.getElementById('rnote').value.trim();
  if (!n) { toast('请输入昵称','e'); return; }
  if (ph && !/^1[3-9]\d{9}$/.test(ph)) { toast('手机号格式不对','e'); return; }

  showLoading('⏳ 保存中...');
  try {
    const payload = { nickname: n, province: fp, city: fc, district: fd, note };
    if (ph) payload.phone = ph;          // 留空 = 保留原值
    if (fa) payload.address = fa;
    if (editingRenewId) payload.id = editingRenewId;
    const res = await capRpc('renew_save', payload);
    if (res && res.ok) {
      cancelRenewForm();
      await renderRenewAdmin();
      await window.loadNameWall();
      toast(editingRenewId ? '已保存 ✅' : '已新增 ✅','s');
    } else {
      toast('操作失败：' + ((res && res.error) || '未知错误'),'e');
    }
  } finally { hideLoading(); }
}

async function delRenewCaptain(id) {
  if (window.role !== 'admin') return;
  showLoading('⏳ 删除中...');
  try {
    const ok = await dbDeleteRenewCaptain(id);
    if (ok) {
      await renderRenewAdmin();
      await window.loadNameWall();
      toast('已删除','i');
    } else { toast('删除失败','e'); }
  } finally { hideLoading(); }
}

/* ================================================================
   Export
   ================================================================ */
async function exportData() {
  if (window.role !== 'admin') return;
  showLoading('⏳ 导出中...');
  try {
    const recs = await dbGetRecords(getCurMonth());
    // 合并续舰名单（自动续舰的人一起导出，避免漏发）
    const caps = await dbGetRenewCaptains();
    const merged = recs.slice();
    for (const c of caps) {
      // 若本月 records 已有同名，跳过（以 records 为准）
      const dup = merged.find(r => r.nickname === c.nickname);
      if (dup) continue;
      merged.push(c);
    }
    if (merged.length === 0) { toast('本月无数据','e'); return; }
    const comp = merged.filter(r => r._phone && r.province && r.city && r.district);
    if (comp.length < merged.length) {
      document.getElementById('cm').textContent = (merged.length-comp.length)+' 条信息不全，是否只导出 '+comp.length+' 条完整记录？';
      document.getElementById('cd').classList.add('show');
      document.getElementById('cok').onclick = () => { closeConfirm(); doExport(comp, getCurMonth()) };
      return;
    }
    doExport(comp, getCurMonth());
  } finally { hideLoading(); }
}

function doExport(recs, month) {
  month = month || getCurMonth();
  if (typeof XLSX === 'undefined') {
    // 延迟加载 xlsx CDN
    toast('正在加载导出组件...','s');
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    s.onload = function() { doExportXLSX(recs, month); };
    s.onerror = function() { toast('导出组件加载失败，改用CSV','e'); genCSV(recs, month); };
    document.head.appendChild(s);
    return;
  }
  doExportXLSX(recs, month);
}

function doExportXLSX(recs, month) {
  const wb = XLSX.utils.book_new();
  const wd = [['收件人', '手机号', '收件地址']];
  recs.forEach(r => wd.push([r.nickname, r._phone || '', fullAd(r)]));
  const ws = XLSX.utils.aoa_to_sheet(wd);
  ws['!cols'] = [{wch:16},{wch:18},{wch:60}];
  XLSX.utils.book_append_sheet(wb, ws, '舰长地址');
  const blob = new Blob([XLSX.write(wb,{bookType:'xlsx',type:'array'})],{type:'application/octet-stream'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '舰长地址_'+month+'.xlsx';
  a.click(); URL.revokeObjectURL(a.href);
  toast('已导出 '+recs.length+' 条','s');
}

function genCSV(recs, month) {
  month = month || getCurMonth();
  const hd = ['收件人','手机号','收件地址'];
  const rows = recs.map(r => [r.nickname, r._phone||'', fullAd(r)]);
  const ce = v => { v = String(v); return (v.includes(',')||v.includes('"')||v.includes('\n')) ? '"'+v.replace(/"/g,'""')+'"' : v; };
  const lines = [hd.map(ce).join(','), ...rows.map(r => r.map(ce).join(','))];
  const blob = new Blob(['\uFEFF'+lines.join('\r\n')],{type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '舰长地址_'+month+'.csv';
  a.click(); URL.revokeObjectURL(a.href);
  toast('已导出 '+recs.length+' 条（CSV）','s');
}

/* ================================================================
   Toast
   ================================================================ */
function toast(msg, t) {
  t = t || 'i';
  const c = document.getElementById('tc');
  const d = document.createElement('div');
  d.className = 'to ' + (t==='s'?'s':t==='e'?'e':'i');
  d.textContent = msg;
  c.appendChild(d);
  setTimeout(() => d.remove(), 3000);
}

/* ================================================================
   全局 Loading 遮罩（所有保存/提交/删除等异步操作显示）
   ================================================================ */
function showLoading(msg) {
  msg = msg || '⏳ 小光正在努力...';
  let el = document.getElementById('gLoading');
  if (!el) {
    el = document.createElement('div');
    el.id = 'gLoading';
    el.className = 'g-loading';
    el.innerHTML = '<div class="g-loading-box"><div class="g-loading-spinner"></div><p class="g-loading-text">'+msg+'</p></div>';
    document.body.appendChild(el);
  } else {
    const t = el.querySelector('.g-loading-text');
    if (t) t.textContent = msg;
  }
  el.classList.add('show');
}
function hideLoading() {
  const el = document.getElementById('gLoading');
  if (el) el.classList.remove('show');
}
window.showLoading = showLoading;
window.hideLoading = hideLoading;

/* ================================================================
   Keyboard
   ================================================================ */
document.getElementById('lpw').addEventListener('keydown', e => { if(e.key==='Enter') doLogin() });
document.getElementById('lu').addEventListener('keydown', e => { if(e.key==='Enter') document.getElementById('lpw').focus() });
document.getElementById('gnInput').addEventListener('keydown', e => { if(e.key==='Enter') submitGuestNick() });
document.getElementById('fn').addEventListener('blur', function() {
  if (window.role !== 'guest' || editingId) return;
  try {
    const last = JSON.parse(localStorage.getItem(SK + '_last_reg') || 'null');
    if (!last || this.value.trim() !== last.nickname) return;
    if (document.getElementById('fph').value) return; // 已填就不覆盖
    document.getElementById('fph').value = last.phone || '';
    document.getElementById('fa').value = last.address || '';
    document.getElementById('fnote').value = last.note || '';
    fillAreaGroup('fp', 'fc', 'fd', last);
    if (last.phone || last.address) toast('认出你啦，已带出上次资料 🦊','s');
  } catch (e) {}
});

/* ================================================================
   Name Wall - 首页背景续舰名单名字墙（跟随鼠标摆动）
   ================================================================ */
window.renderNameWall = async function() {
  const wall = document.getElementById('nameWall');
  if (!wall) return;
  // 走公开通道，只返回昵称；手机号/地址这类字段一个都不下发
  const res = await capPublic('names');
  const names = (res && res.ok && res.names) || [];
  if (names.length === 0) { wall.innerHTML = ''; return; }
  wall.innerHTML = names.map((nm, i) => {
    const left = 8 + ((i * 37) % 84);
    const top = 12 + ((i * 53) % 72);
    const size = 14 + ((i * 7) % 12);
    const dur = 6 + ((i * 3) % 6);
    const delay = (i * 0.8) % 5;
    return '<span class="nw-name" data-i="'+i+'" style="left:'+left+'%;top:'+top+'%;font-size:'+size+'px;animation-duration:'+dur+'s;animation-delay:'+delay+'s">'+esc(nm)+'</span>';
  }).join('');
};

window.setupNameWallMouse = function() {
  const wall = document.getElementById('nameWall');
  if (!wall) return;
  const names = function(){ return wall.querySelectorAll('.nw-name'); };
  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let raf = null;
  document.addEventListener('mousemove', function(e) {
    mx = e.clientX; my = e.clientY;
    if (!raf) {
      raf = requestAnimationFrame(function() {
        raf = null;
        const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
        const dx = (mx - cx) / cx;
        const dy = (my - cy) / cy;
        names().forEach(function(el) {
          const depth = parseFloat(el.dataset.i || 0);
          const factor = 1 + depth * 0.06;
          const tx = dx * (8 + depth * 2) * factor;
          const ty = dy * (8 + depth * 2) * factor;
          const rx = dy * (3 + depth * 0.4);
          const ry = -dx * (3 + depth * 0.4);
          el.style.transform = 'translate3d('+tx+'px,'+ty+'px,0) rotateX('+rx+'deg) rotateY('+ry+'deg)';
        });
      });
    }
  });
};

window.loadNameWall = function() {
  window.renderNameWall();
  window.setupNameWallMouse();
};

/* ================================================================
   Init
   ================================================================ */
initProvinces();
var recordArea = { prov: null, city: null };
var renewArea = { prov: null, city: null };
bindAreaGroup('fp', 'fc', 'fd', recordArea);
bindAreaGroup('rp', 'rc', 'rd', renewArea);

(function() {
  // 始终初始化 Supabase，匿名投稿等非登录功能也需要
  initSB();
  // 加载首页背景名字墙（续舰名单）
  window.loadNameWall();
  const r = localStorage.getItem(SK+'_role');
  // 管理员身份需要本标签页内仍持有有效口令，否则回登录页重来（口令只存 sessionStorage）
  if (r === 'admin' && typeof window.adminReady === 'function' && window.adminReady()) {
    window.role = 'admin';
    enterApp();
  } else if (r === 'admin') {
    localStorage.removeItem(SK+'_role');
  } else if (r === 'guest') {
    window.role = 'guest';
    guestName = localStorage.getItem(SK+'_gn') || '';
    if (guestName) {
      enterApp();
    } else {
      localStorage.removeItem(SK+'_role');
    }
  }
})();
