#!/usr/bin/env python3
"""Build the new index.html with Supabase backend + AES encryption."""
import sys, re
sys.stdout.reconfigure(encoding='utf-8')

# Read the current file to extract CSS
with open('index.html', 'r', encoding='utf-8') as f:
    old_html = f.read()

css_match = re.search(r'<style>(.*?)</style>', old_html, re.DOTALL)
css = css_match.group(1) if css_match else ''

# Read AREA_DATA
with open('area_data_embed.js', 'r', encoding='utf-8') as f:
    area_data_js = f.read()

# Build new HTML using string concatenation to avoid f-string escaping issues
parts = []

parts.append('''<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0,maximum-scale=1.0,user-scalable=no">
<title>浮光舰长信息登记</title>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<style>
''')

parts.append(css)

parts.append('''
</style>
</head>
<body>

<!-- ===== Landing Page ===== -->
<div class="landing" id="lp">
  <div class="lp"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
  <div style="position:relative;z-index:1">
    <div class="logo">✨ 浮光</div>
    <h2 style="color:#fff;margin:8px 0 4px;font-size:18px;font-weight:500">舰长信息登记</h2>
    <p style="color:rgba(255,255,255,.6);font-size:13px;margin-bottom:32px">Luminos · Captain Gift Registry</p>
    <button class="btn btn-p" onclick="openGuestNick()" style="width:240px;margin-bottom:12px">📝 填写舰长礼物</button>
    <div style="margin-top:24px">
      <span style="color:rgba(255,255,255,.35);font-size:12px;cursor:pointer" onclick="openAdminLogin()">管理入口 ▸</span>
    </div>
  </div>
</div>

<!-- Admin Login Modal -->
<div class="mo" id="alm"><div class="md">
  <h3>管理员登录</h3>
  <div class="fg"><label>账号</label><input id="lu" type="text" placeholder="请输入账号" autocomplete="username"></div>
  <div class="fg"><label>密码</label><input id="lpw" type="password" placeholder="请输入密码" autocomplete="current-password"></div>
  <div id="le" style="color:var(--err);font-size:13px;display:none;text-align:center;margin:8px 0">账号或密码错误</div>
  <div style="display:flex;gap:8px;margin-top:16px">
    <button class="btn" onclick="closeAdminLogin()" style="flex:1">取消</button>
    <button class="btn btn-p" onclick="doLogin()" style="flex:1">登录</button>
  </div>
</div></div>

<!-- Guest Nickname Modal -->
<div class="mo" id="gnm"><div class="md">
  <h3>填写昵称</h3>
  <p style="color:var(--ts);font-size:13px;margin:8px 0 16px">请输入你的昵称，用于标识你的记录</p>
  <div class="fg"><input id="gnInput" type="text" placeholder="你的昵称" maxlength="20"></div>
  <div id="gne" style="color:var(--err);font-size:13px;display:none;margin:8px 0">请输入昵称</div>
  <div style="display:flex;gap:8px;margin-top:16px">
    <button class="btn" onclick="closeGuestNick()" style="flex:1">取消</button>
    <button class="btn btn-p" onclick="submitGuestNick()" style="flex:1">进入</button>
  </div>
</div></div>

<!-- ===== Main App ===== -->
<div class="app" id="app">
  <div class="hd">
    <div style="display:flex;align-items:center;gap:8px">
      <span class="logo-sm">✨</span>
      <div>
        <div id="hdTitle" style="font-weight:600;font-size:15px">舰长信息管理</div>
        <div id="hdSub" style="font-size:11px;color:var(--ts)">管理员 · --</div>
      </div>
    </div>
    <div style="display:flex;gap:6px">
      <button id="btnHist" onclick="openHistory()" style="background:none;border:1px solid var(--bd);border-radius:8px;padding:6px 10px;font-size:12px;color:var(--ts);cursor:pointer">📅 历史</button>
      <button id="btnExport" onclick="exportData()" style="background:none;border:1px solid var(--bd);border-radius:8px;padding:6px 10px;font-size:12px;color:var(--ts);cursor:pointer">📤 导出</button>
      <button onclick="doLogout()" style="background:none;border:none;font-size:18px;cursor:pointer;padding:4px">👋</button>
    </div>
  </div>
  <div id="gb" style="display:none;background:var(--p);color:#fff;padding:10px 16px;font-size:13px;text-align:center">
    当前昵称：<strong id="guestName"></strong>
  </div>
  <div id="statsRow" class="sr"></div>
  <div id="srch" style="padding:8px 16px;display:none">
    <input id="si" type="text" placeholder="搜索昵称/手机/地址..." oninput="render()" style="width:100%;padding:10px 14px;border:1px solid var(--bd);border-radius:10px;font-size:14px;outline:none">
  </div>
  <div id="gl" style="padding:8px 16px 80px"></div>
  <button class="fab" onclick="openForm()">＋</button>
</div>

<!-- Form Modal -->
<div class="mo" id="fm"><div class="md" style="max-height:85vh;overflow-y:auto">
  <h3 id="ft">添加记录</h3>
  <div class="fg"><label>昵称 <span style="color:var(--err)">*</span></label><input id="fn" type="text" placeholder="昵称" maxlength="20"></div>
  <div class="fg"><label>手机号</label><input id="fph" type="tel" placeholder="手机号（加密存储）" maxlength="20"></div>
  <div class="fg"><label>省份</label><select id="fp"><option value="">请选择省份</option></select></div>
  <div class="fg"><label>城市</label><select id="fc" disabled><option value="">请先选省份</option></select></div>
  <div class="fg"><label>区县</label><select id="fd" disabled><option value="">请先选城市</option></select></div>
  <div class="fg"><label>详细地址</label><input id="fa" type="text" placeholder="详细地址（加密存储）"></div>
  <div class="fg"><label>备注</label><textarea id="fnote" rows="2" placeholder="备注（选填）"></textarea></div>
  <div style="display:flex;gap:8px;margin-top:16px">
    <button class="btn" onclick="closeForm()" style="flex:1">取消</button>
    <button class="btn btn-p" onclick="saveForm()" style="flex:1">保存</button>
  </div>
</div></div>

<!-- Confirm Modal -->
<div class="mo" id="cd"><div class="md">
  <h3>确认操作</h3>
  <p id="cm" style="margin:12px 0;font-size:14px;color:var(--ts)"></p>
  <div style="display:flex;gap:8px;margin-top:16px">
    <button class="btn" onclick="closeConfirm()" style="flex:1">取消</button>
    <button class="btn btn-e" id="cok" style="flex:1">确定</button>
  </div>
</div></div>

<!-- History Modal -->
<div class="mo" id="hm"><div class="md">
  <h3>历史月份</h3>
  <div id="hmBody" style="margin-top:12px"></div>
  <button class="btn" onclick="closeHistory()" style="width:100%;margin-top:16px">关闭</button>
</div></div>

<!-- Toast -->
<div id="tc" class="tc"></div>

<script>
''')

# Now add the JS using a separate file read to avoid escaping issues
js_code = r"""
/* ================================================================
   Config - Supabase + Encryption
   ================================================================ */
// ⚠️ 创建 Supabase 项目后，替换以下两个值
const SB_URL = 'https://yiexaopgxcroktltjqoz.supabase.co';
const SB_KEY = 'sb_publishable_O3vb23iYR6lKOjQCpFbhug_Dy_X4DR4';

const ADMIN_U='fuguang', ADMIN_P='5099';
const MUNI=['北京市','上海市','天津市','重庆市'];
const SK='luminos_v6';

/* ================================================================
   AES Encryption (Web Crypto API - browser native)
   ================================================================ */
const ENC_KEY = 'Luminos2026Gift!';

async function getEncKey() {
  const enc = new TextEncoder();
  const keyData = enc.encode(ENC_KEY);
  const key = await crypto.subtle.importKey(
    'raw', keyData, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']
  );
  return key;
}

async function encrypt(text) {
  if (!text) return '';
  try {
    const key = await getEncKey();
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv }, key, enc.encode(text)
    );
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    return btoa(String.fromCharCode(...combined));
  } catch(e) {
    console.error('Encrypt error:', e);
    return text;
  }
}

async function decrypt(cipher) {
  if (!cipher) return '';
  try {
    const key = await getEncKey();
    const raw = Uint8Array.from(atob(cipher), c => c.charCodeAt(0));
    const iv = raw.slice(0, 12);
    const data = raw.slice(12);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv }, key, data
    );
    return new TextDecoder().decode(decrypted);
  } catch(e) {
    console.error('Decrypt error:', e);
    return cipher;
  }
}

/* ================================================================
   State
   ================================================================ */
let role=null, guestName='', editingId=null, selProvince=null, selCity=null;
let sb = null;

/* ================================================================
   Supabase Init
   ================================================================ */
function initSB() {
  if (typeof supabase === 'undefined') {
    console.error('Supabase SDK not loaded');
    toast('数据库连接失败，请刷新重试', 'e');
    return false;
  }
  sb = supabase.createClient(SB_URL, SB_KEY);
  return true;
}

/* ================================================================
   Database Operations
   ================================================================ */
async function dbGetRecords(month) {
  if (!sb) return [];
  const { data, error } = await sb
    .from('records')
    .select('*')
    .eq('month', month)
    .order('created_at', { ascending: false });
  if (error) { console.error('dbGetRecords:', error); return []; }
  return data || [];
}

async function dbInsertRecord(rec) {
  if (!sb) return null;
  const { data, error } = await sb
    .from('records')
    .insert(rec)
    .select()
    .single();
  if (error) { console.error('dbInsertRecord:', error); return null; }
  return data;
}

async function dbUpdateRecord(id, updates) {
  if (!sb) return false;
  const { error } = await sb
    .from('records')
    .update(updates)
    .eq('id', id);
  if (error) { console.error('dbUpdateRecord:', error); return false; }
  return true;
}

async function dbDeleteRecord(id) {
  if (!sb) return false;
  const { error } = await sb
    .from('records')
    .delete()
    .eq('id', id);
  if (error) { console.error('dbDeleteRecord:', error); return false; }
  return true;
}

async function dbGetMonths() {
  if (!sb) return [];
  const { data, error } = await sb
    .from('records')
    .select('month')
    .order('month', { ascending: false });
  if (error) { console.error('dbGetMonths:', error); return []; }
  const months = [...new Set((data||[]).map(r => r.month))];
  return months;
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

function doLogin() {
  const u = document.getElementById('lu').value.trim();
  const p = document.getElementById('lpw').value;
  if (u===ADMIN_U && p===ADMIN_P) {
    role='admin';
    localStorage.setItem(SK+'_role','admin');
    closeAdminLogin();
    if (!initSB()) return;
    enterApp();
  } else {
    const e = document.getElementById('le'); e.style.display='block';
    setTimeout(()=>e.style.display='none', 3000);
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

function submitGuestNick() {
  const nm = document.getElementById('gnInput').value.trim();
  if (!nm) { document.getElementById('gne').style.display='block'; return; }
  role='guest'; guestName=nm;
  localStorage.setItem(SK+'_role','guest');
  localStorage.setItem(SK+'_gn', guestName);
  closeGuestNick();
  if (!initSB()) return;
  enterApp();
}

function doLogout() {
  role=null; guestName='';
  localStorage.removeItem(SK+'_role');
  localStorage.removeItem(SK+'_gn');
  document.getElementById('lp').style.display='';
  document.getElementById('app').classList.remove('show');
  closeAdminLogin();
}

function enterApp() {
  document.getElementById('lp').style.display='none';
  document.getElementById('app').classList.add('show');
  const isA = role==='admin';
  document.getElementById('btnHist').style.display = isA ? '' : 'none';
  document.getElementById('btnExport').style.display = isA ? '' : 'none';
  document.getElementById('statsRow').style.display = isA ? 'grid' : 'none';
  document.getElementById('srch').style.display = isA ? '' : 'none';
  document.getElementById('gb').style.display = isA ? 'none' : '';
  if (!isA) document.getElementById('guestName').textContent = guestName;
  document.getElementById('hdTitle').textContent = isA ? '舰长信息管理' : '我的登记信息';
  document.getElementById('hdSub').textContent = isA ? ('管理员 · ' + getCurMonth()) : '舰长';
  render();
}

/* ================================================================
   Area Data (Embedded)
   ================================================================ */
"""

parts.append(js_code)
parts.append('\n')
parts.append(area_data_js)
parts.append('\n')

parts.append(r"""
function initProvinces() {
  const sel = document.getElementById('fp');
  sel.innerHTML = '<option value="">请选择省份</option>';
  Object.keys(AREA_DATA).sort().forEach(p => {
    const opt = document.createElement('option');
    opt.value = p; opt.textContent = p;
    sel.appendChild(opt);
  });
}

document.getElementById('fp').addEventListener('change', function() {
  const name = this.value;
  selProvince = name || null;
  const fc = document.getElementById('fc');
  const fd = document.getElementById('fd');
  if (!name) {
    fc.innerHTML = '<option value="">请先选省份</option>'; fc.disabled = true;
    fd.innerHTML = '<option value="">请先选城市</option>'; fd.disabled = true;
    selCity = null; return;
  }
  const val = AREA_DATA[name];
  if (Array.isArray(val)) {
    fc.innerHTML = '<option value="">请选择区</option>'; fc.disabled = false;
    val.forEach(d => { const o = document.createElement('option'); o.value=d; o.textContent=d; fc.appendChild(o) });
    fd.innerHTML = '<option value="">-</option>'; fd.disabled = true; selCity = null;
  } else {
    fc.innerHTML = '<option value="">请选择城市</option>'; fc.disabled = false;
    Object.keys(val).sort().forEach(c => { const o = document.createElement('option'); o.value=c; o.textContent=c; fc.appendChild(o) });
    fd.innerHTML = '<option value="">请先选城市</option>'; fd.disabled = true; selCity = null;
  }
});

document.getElementById('fc').addEventListener('change', function() {
  const name = this.value;
  selCity = name || null;
  const fd = document.getElementById('fd');
  const fp = document.getElementById('fp').value;
  if (!name) {
    fd.innerHTML = '<option value="">请先选城市</option>'; fd.disabled = true; return;
  }
  const prov = AREA_DATA[fp];
  if (!prov) return;
  if (Array.isArray(prov)) {
    fd.innerHTML = '<option value="">-</option>'; fd.disabled = true; return;
  }
  const districts = prov[name];
  if (!districts || districts.length === 0) {
    fd.innerHTML = '<option value="">-</option>'; fd.disabled = true; return;
  }
  fd.innerHTML = '<option value="">请选择区县</option>'; fd.disabled = false;
  districts.forEach(d => { const o = document.createElement('option'); o.value=d; o.textContent=d; fd.appendChild(o) });
});

document.getElementById('fd').addEventListener('change', function() {});

/* ================================================================
   Render
   ================================================================ */
async function render() {
  if (role === 'admin') await renderStats();
  const list = document.getElementById('gl');
  const recs = await getVisible();
  if (recs.length === 0) {
    const mg = role==='guest' ? '你还没有登记信息，点击右下角 ＋ 添加' : '本月暂无记录';
    list.innerHTML = '<div class="empty"><div class="ic">📋</div><p>'+mg+'</p></div>';
    return;
  }
  const isA = role==='admin';
  const decrypted = await Promise.all(recs.map(async r => {
    r._phone = await decrypt(r.phone_enc || '');
    r._address = await decrypt(r.address_enc || '');
    return r;
  }));
  decrypted.sort((a,b) => (b.created_at||'').localeCompare(a.created_at||''));
  list.innerHTML = decrypted.map(r => {
    const ad = fullAd(r);
    return '<div class="gc" id="c-'+r.id+'">'+
      '<div class="gc-hd" onclick="toggleD(\''+r.id+'\')">'+
        '<div class="gc-av">'+(r.nickname||'?').charAt(0)+'</div>'+
        '<div class="gc-info">'+
          '<div class="gc-nm">'+esc(r.nickname)+'</div>'+
          '<div class="gc-meta">📱 '+(r._phone||'未填')+'</div>'+
        '</div>'+
        (isA ? '<div class="gc-act" onclick="event.stopPropagation()"><button onclick="editR(\''+r.id+'\')">✏️</button><button onclick="delR(\''+r.id+'\')">🗑️</button></div>' : '')+
      '</div>'+
      '<div class="gc-dt" id="d-'+r.id+'">'+
        '<p><strong>昵称：</strong>'+esc(r.nickname)+'</p>'+
        '<p><strong>手机：</strong>'+(r._phone||'未填')+'</p>'+
        '<p><strong>地址：</strong>'+(ad||'未填')+'</p>'+
        (r.note ? '<p><strong>备注：</strong>'+esc(r.note)+'</p>' : '')+
      '</div>'+
    '</div>';
  }).join('');
  if (role === 'admin') await renderStats();
}

async function getVisible() {
  let recs = await dbGetRecords(getCurMonth());
  if (role === 'guest') return recs.filter(r => r.nickname === guestName);
  const q = document.getElementById('si').value.trim().toLowerCase();
  if (!q) return recs;
  const decrypted = await Promise.all(recs.map(async r => {
    r._phone = await decrypt(r.phone_enc || '');
    r._address = await decrypt(r.address_enc || '');
    return r;
  }));
  return decrypted.filter(r =>
    r.nickname.toLowerCase().includes(q) ||
    (r._phone||'').toLowerCase().includes(q) ||
    fullAd(r).toLowerCase().includes(q)
  );
}

async function renderStats() {
  const recs = await dbGetRecords(getCurMonth());
  let phoneCount = 0, addrComplete = 0;
  for (const r of recs) {
    const ph = await decrypt(r.phone_enc || '');
    if (ph) phoneCount++;
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
  editingId = id || null;
  document.getElementById('ft').textContent = id ? '编辑记录' : '添加记录';
  selProvince = null; selCity = null;
  document.getElementById('fc').innerHTML = '<option value="">请先选省份</option>'; document.getElementById('fc').disabled = true;
  document.getElementById('fd').innerHTML = '<option value="">请先选城市</option>'; document.getElementById('fd').disabled = true;

  if (id) {
    const recs = await dbGetRecords(getCurMonth());
    const r = recs.find(x => x.id === id);
    if (r) {
      document.getElementById('fn').value = r.nickname || '';
      document.getElementById('fph').value = await decrypt(r.phone_enc || '');
      document.getElementById('fa').value = await decrypt(r.address_enc || '');
      document.getElementById('fnote').value = r.note || '';
      if (r.province) {
        document.getElementById('fp').value = r.province;
        selProvince = r.province;
        const prov = AREA_DATA[r.province];
        if (prov) {
          const fc = document.getElementById('fc');
          const fd = document.getElementById('fd');
          if (Array.isArray(prov)) {
            fc.innerHTML = '<option value="">请选择区</option>'; fc.disabled = false;
            prov.forEach(d => { const o = document.createElement('option'); o.value=d; o.textContent=d; fc.appendChild(o) });
            fd.innerHTML = '<option value="">-</option>'; fd.disabled = true;
          } else {
            fc.innerHTML = '<option value="">请选择城市</option>'; fc.disabled = false;
            Object.keys(prov).sort().forEach(c => { const o = document.createElement('option'); o.value=c; o.textContent=c; fc.appendChild(o) });
            fd.innerHTML = '<option value="">请先选城市</option>'; fd.disabled = true;
          }
          if (r.city) {
            document.getElementById('fc').value = r.city;
            selCity = r.city;
            if (!Array.isArray(prov) && prov[r.city]) {
              const districts = prov[r.city];
              if (districts.length > 0) {
                fd.innerHTML = '<option value="">请选择区县</option>'; fd.disabled = false;
                districts.forEach(d => { const o = document.createElement('option'); o.value=d; o.textContent=d; fd.appendChild(o) });
              }
              if (r.district) fd.value = r.district;
            }
          }
        }
      } else {
        document.getElementById('fp').value = '';
      }
    }
  } else {
    document.getElementById('fn').value = role==='guest' ? guestName : '';
    document.getElementById('fph').value = '';
    document.getElementById('fp').value = '';
    document.getElementById('fc').innerHTML = '<option value="">请先选省份</option>'; document.getElementById('fc').disabled = true;
    document.getElementById('fd').innerHTML = '<option value="">请先选城市</option>'; document.getElementById('fd').disabled = true;
    document.getElementById('fa').value = '';
    document.getElementById('fnote').value = '';
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
  if (ph && !/^[\d\-]+$/.test(ph)) { toast('手机号格式不正确','e'); return; }

  const phone_enc = await encrypt(ph);
  const address_enc = await encrypt(fa);

  if (editingId) {
    const ok = await dbUpdateRecord(editingId, {
      nickname: n, phone_enc, province: fp, city: fc, district: fd, address_enc, note: fn
    });
    if (ok) { closeForm(); render(); toast('已更新 ✅','s'); }
    else { toast('更新失败','e'); }
  } else {
    const rec = {
      nickname: n, phone_enc, province: fp, city: fc, district: fd, address_enc, note: fn,
      month: getCurMonth()
    };
    const result = await dbInsertRecord(rec);
    if (result) { closeForm(); render(); toast('已添加 ✅','s'); }
    else { toast('添加失败','e'); }
  }
}

function editR(id) { openForm(id) }

/* ================================================================
   Delete
   ================================================================ */
async function delR(id) {
  if (role !== 'admin') return;
  const recs = await dbGetRecords(getCurMonth());
  const r = recs.find(x => x.id === id);
  document.getElementById('cm').textContent = '确定删除「'+(r?r.nickname:'此记录')+'」？';
  document.getElementById('cd').classList.add('show');
  document.getElementById('cok').onclick = async () => {
    const ok = await dbDeleteRecord(id);
    closeConfirm();
    if (ok) { render(); toast('已删除','i'); }
    else { toast('删除失败','e'); }
  };
}
function closeConfirm() { document.getElementById('cd').classList.remove('show') }

/* ================================================================
   History (admin)
   ================================================================ */
async function openHistory() {
  if (role !== 'admin') return;
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
}
function closeHistory() { document.getElementById('hm').classList.remove('show') }

async function exportHistory(m) {
  const recs = await dbGetRecords(m);
  if (recs.length === 0) { toast('该月无数据','e'); return; }
  for (const r of recs) {
    r._phone = await decrypt(r.phone_enc || '');
    r._address = await decrypt(r.address_enc || '');
  }
  doExport(recs, m);
}

/* ================================================================
   Export
   ================================================================ */
async function exportData() {
  if (role !== 'admin') return;
  const recs = await dbGetRecords(getCurMonth());
  if (recs.length === 0) { toast('本月无数据','e'); return; }
  for (const r of recs) {
    r._phone = await decrypt(r.phone_enc || '');
    r._address = await decrypt(r.address_enc || '');
  }
  const comp = recs.filter(r => r._phone && r.province && r.city && r.district);
  if (comp.length < recs.length) {
    document.getElementById('cm').textContent = (recs.length-comp.length)+' 条信息不全，是否只导出 '+comp.length+' 条完整记录？';
    document.getElementById('cd').classList.add('show');
    document.getElementById('cok').onclick = () => { closeConfirm(); doExport(comp, getCurMonth()) };
    return;
  }
  doExport(comp, getCurMonth());
}

function doExport(recs, month) {
  month = month || getCurMonth();
  if (typeof XLSX === 'undefined') { genCSV(recs, month); return; }
  const wb = XLSX.utils.book_new();
  const wd = [
    ['导入说明','',''],
    ['1.收件地址按【省 市 区 详细地址】填写，标红部分必填','',''],
    ['2.直辖市省市均填市名，如北京市','',''],
    ['3.虚拟号格式：18700000000-1234','',''],
    ['4.单次最多200个地址，超出请分批','',''],
    ['5.导入说明行可保留','',''],
    ['','',''],
    ['收件人','收件人手机号','收件地址']
  ];
  recs.forEach(r => wd.push([r.nickname, r._phone||'', fullAd(r)]));
  const ws = XLSX.utils.aoa_to_sheet(wd);
  ws['!cols'] = [{wch:16},{wch:20},{wch:60}];
  ws['!merges'] = [{s:{r:0,c:0},e:{r:0,c:2}}];
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  const blob = new Blob([XLSX.write(wb,{bookType:'xlsx',type:'array'})],{type:'application/octet-stream'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '柔造发货_'+month+'.xlsx';
  a.click(); URL.revokeObjectURL(a.href);
  toast('已导出 '+recs.length+' 条（柔造 xlsx）','s');
}

function genCSV(recs, month) {
  month = month || getCurMonth();
  const hd = ['收件人','收件人手机号','收件地址'];
  const rows = recs.map(r => [r.nickname, r._phone||'', fullAd(r)]);
  const ce = v => { v = String(v); return (v.includes(',')||v.includes('"')||v.includes('\n')) ? '"'+v.replace(/"/g,'""')+'"' : v; };
  const lines = [hd.map(ce).join(','), ...rows.map(r => r.map(ce).join(','))];
  const blob = new Blob(['\uFEFF'+lines.join('\r\n')],{type:'text/csv;charset=utf-8;'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = '柔造发货_'+month+'.csv';
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
   Keyboard
   ================================================================ */
document.getElementById('lpw').addEventListener('keydown', e => { if(e.key==='Enter') doLogin() });
document.getElementById('lu').addEventListener('keydown', e => { if(e.key==='Enter') document.getElementById('lpw').focus() });
document.getElementById('gnInput').addEventListener('keydown', e => { if(e.key==='Enter') submitGuestNick() });

/* ================================================================
   Init
   ================================================================ */
initProvinces();

(function() {
  const r = localStorage.getItem(SK+'_role');
  if (r === 'admin') {
    role = 'admin';
    if (!initSB()) return;
    enterApp();
  } else if (r === 'guest') {
    role = 'guest';
    guestName = localStorage.getItem(SK+'_gn') || '';
    if (guestName) {
      if (!initSB()) return;
      enterApp();
    } else {
      localStorage.removeItem(SK+'_role');
    }
  }
})();
""")

parts.append('''
</script>
<script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
</body>
</html>''')

new_html = ''.join(parts)

with open('index.html', 'w', encoding='utf-8') as f:
    f.write(new_html)

print(f'Done! New size: {len(new_html)} chars')

# Verify
assert 'SB_URL' in new_html, 'SB_URL not present!'
assert 'encrypt(' in new_html, 'encrypt not present!'
assert 'decrypt(' in new_html, 'decrypt not present!'
assert 'supabase' in new_html, 'supabase not present!'
assert 'AREA_DATA' in new_html, 'AREA_DATA not present!'
assert 'localStorage' not in new_html.split('Config')[1].split('Supabase')[0], 'Old localStorage logic still in data layer!'
print('All verifications passed!')
