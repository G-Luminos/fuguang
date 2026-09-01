
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
window.role=null; window.guestName=''; window.editingId=null; window.selProvince=null; window.selCity=null;
window.sb = null;

/* ================================================================
   Supabase Init
   ================================================================ */
function initSB() {
  if (typeof supabase === 'undefined') {
    return false;
  }
  window.sb = supabase.createClient(SB_URL, SB_KEY);
  return true;
}

/* ================================================================
   Database Operations
   ================================================================ */
async function dbGetRecords(month) {
  if (!window.sb) return [];
  const { data, error } = await window.sb
    .from('records')
    .select('*')
    .eq('month', month)
    .order('created_at', { ascending: false });
  if (error) { return []; }
  return data || [];
}

async function dbInsertRecord(rec) {
  if (!window.sb) return null;
  const { data, error } = await window.sb
    .from('records')
    .insert(rec)
    .select()
    .single();
  if (error) { return null; }
  return data;
}

async function dbUpdateRecord(id, updates) {
  if (!window.sb) return false;
  const { error } = await window.sb
    .from('records')
    .update(updates)
    .eq('id', id);
  if (error) { return false; }
  return true;
}

async function dbDeleteRecord(id) {
  if (!window.sb) return false;
  const { error } = await window.sb
    .from('records')
    .delete()
    .eq('id', id);
  if (error) { return false; }
  return true;
}

async function dbGetMonths() {
  if (!window.sb) return [];
  const { data, error } = await window.sb
    .from('records')
    .select('month')
    .order('month', { ascending: false });
  if (error) { return []; }
  const months = [...new Set((data||[]).map(r => r.month))];
  return months;
}

/* ============ 续舰名单 (renew_captains) ============ */
async function dbGetRenewCaptains() {
  if (!window.sb) return [];
  const { data, error } = await window.sb
    .from('renew_captains')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) { return []; }
  return data || [];
}

async function dbUpsertRenewCaptain(cap) {
  if (!window.sb) return null;
  const { data, error } = await window.sb
    .from('renew_captains')
    .upsert(cap, { onConflict: 'nickname' })
    .select()
    .single();
  if (error) { return null; }
  return data;
}

async function dbDeleteRenewCaptain(id) {
  if (!window.sb) return false;
  const { error } = await window.sb
    .from('renew_captains')
    .delete()
    .eq('id', id);
  if (error) { return false; }
  return true;
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
    window.role ='admin';
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
  window.role ='guest'; guestName=nm;
  localStorage.setItem(SK+'_role','guest');
  localStorage.setItem(SK+'_gn', guestName);
  closeGuestNick();
  if (!initSB()) return;
  enterApp();
}

function doLogout() {
  window.role =null; guestName='';
  localStorage.removeItem(SK+'_role');
  localStorage.removeItem(SK+'_gn');
  document.getElementById('lp').style.display='';
  document.getElementById('app').classList.remove('show');
  closeAdminLogin();
}

function backToLanding() {
  document.getElementById('lp').style.display='';
  document.getElementById('app').classList.remove('show');
  closeGiftShowcase();
}

function enterApp() {
  document.getElementById('lp').style.display='none';
  document.getElementById('app').classList.add('show');
  const isA = window.role ==='admin';
  document.getElementById('btnHist').style.display = isA ? '' : 'none';
  document.getElementById('btnRenew').style.display = isA ? '' : 'none';
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
  if (window.role === 'admin') await renderStats();
  const list = document.getElementById('gl');
  const recs = await getVisible();
  if (recs.length === 0) {
    const mg = window.role ==='guest' ? '你还没有登记信息，点击右下角 ＋ 添加' : '本月暂无记录';
    list.innerHTML = '<div class="empty"><div class="ic">📋</div><p>'+mg+'</p></div>';
    return;
  }
  const isA = window.role ==='admin';
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
  if (window.role === 'admin') await renderStats();
}

async function getVisible() {
  let recs = await dbGetRecords(getCurMonth());
  if (window.role === 'guest') return recs.filter(r => r.nickname === guestName);
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
      document.getElementById('fauto').checked = !!r.auto_renew;
      refreshAutoRenewUI();
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
    document.getElementById('fn').value = window.role ==='guest' ? guestName : '';
    document.getElementById('fph').value = '';
    document.getElementById('fp').value = '';
    document.getElementById('fc').innerHTML = '<option value="">请先选省份</option>'; document.getElementById('fc').disabled = true;
    document.getElementById('fd').innerHTML = '<option value="">请先选城市</option>'; document.getElementById('fd').disabled = true;
    document.getElementById('fa').value = '';
    document.getElementById('fnote').value = '';
    document.getElementById('fauto').checked = false;
    refreshAutoRenewUI();
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

  const phone_enc = await encrypt(ph);
  const address_enc = await encrypt(fa);
  const auto_renew = document.getElementById('fauto').checked;

  if (editingId) {
    const ok = await dbUpdateRecord(editingId, {
      nickname: n, phone_enc, province: fp, city: fc, district: fd, address_enc, note: fn, auto_renew
    });
    if (ok) {
      if (auto_renew) await syncRenewCaptain(n, ph, fp, fc, fd, fa, fn);
      else await removeRenewCaptainByName(n);
      closeForm(); render(); toast('已更新 ✅','s');
    }
    else { toast('更新失败','e'); }
  } else {
    const rec = {
      nickname: n, phone_enc, province: fp, city: fc, district: fd, address_enc, note: fn,
      month: getCurMonth(), auto_renew
    };
    const result = await dbInsertRecord(rec);
    if (result) {
      if (auto_renew) await syncRenewCaptain(n, ph, fp, fc, fd, fa, fn);
      closeForm(); render(); toast('已添加 ✅','s');
    }
    else { toast('添加失败','e'); }
  }
}

async function syncRenewCaptain(nickname, phone, province, city, district, address, note) {
  if (!window.sb) return;
  const phone_enc = await encrypt(phone);
  const address_enc = await encrypt(address);
  await dbUpsertRenewCaptain({ nickname, phone_enc, province, city, district, address_enc, note });
}

async function removeRenewCaptainByName(nickname) {
  if (!window.sb) return;
  const { data } = await window.sb.from('renew_captains').select('id').eq('nickname', nickname);
  if (data && data.length > 0) {
    await dbDeleteRenewCaptain(data[0].id);
  }
}

function refreshAutoRenewUI() {
  const checked = document.getElementById('fauto').checked;
  const txt = document.getElementById('fautoTxt');
  const label = document.querySelector('.renew-toggle');
  if (label) label.classList.toggle('on', checked);
  if (txt) {
    txt.textContent = checked ? '已开启 · 后续每月自动带出地址' : '未开启 · 仅本月有效';
    txt.style.color = checked ? 'var(--ok)' : '';
  }
}

function onAutoRenewToggle() {
  refreshAutoRenewUI();
  // 从「未勾选」切到「勾选」时，弹提示框
  if (document.getElementById('fauto').checked) {
    openAutoRenewHint();
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
  if (window.role !== 'admin') return;
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
   Renew Captains Admin (续舰名单后台管理)
   ================================================================ */
async function openRenewAdmin() {
  if (window.role !== 'admin') return;
  await renderRenewAdmin();
  document.getElementById('rm').classList.add('show');
  document.getElementById('rn').value = '';
}
function closeRenewAdmin() { document.getElementById('rm').classList.remove('show') }

async function renderRenewAdmin() {
  const caps = await dbGetRenewCaptains();
  const body = document.getElementById('rmBody');
  if (caps.length === 0) {
    body.innerHTML = '<div style="text-align:center;padding:24px;color:#61666D;font-size:13px">暂无续舰名单，添加后这里会显示</div>';
    return;
  }
  body.innerHTML = caps.map(c => {
    return '<div class="hist-item">'+
      '<div><div class="mon">'+esc(c.nickname)+'</div><div class="cnt">'+(c.province?'地址已存':'仅名字')+'</div></div>'+
      '<button onclick="delRenewCaptain(\''+c.id+'\')" style="border-color:var(--err);color:var(--err)">删除</button>'+
    '</div>';
  }).join('');
}

async function addRenewCaptain() {
  if (window.role !== 'admin') return;
  const n = document.getElementById('rn').value.trim();
  if (!n) { toast('请输入昵称','e'); return; }
  const result = await dbUpsertRenewCaptain({ nickname: n });
  if (result) {
    document.getElementById('rn').value = '';
    await renderRenewAdmin();
    toast('已新增 ✅','s');
  } else { toast('新增失败（可能重名）','e'); }
}

async function delRenewCaptain(id) {
  if (window.role !== 'admin') return;
  const ok = await dbDeleteRenewCaptain(id);
  if (ok) {
    await renderRenewAdmin();
    toast('已删除','i');
  } else { toast('删除失败','e'); }
}

async function exportRenewList() {
  if (window.role !== 'admin') return;
  const caps = await dbGetRenewCaptains();
  if (caps.length === 0) { toast('续舰名单为空','e'); return; }
  for (const c of caps) {
    c._phone = await decrypt(c.phone_enc || '');
    c._address = await decrypt(c.address_enc || '');
  }
  // 复用柔造格式导出
  doExport(caps, '续舰名单');
}

/* ================================================================
   Export
   ================================================================ */
async function exportData() {
  if (window.role !== 'admin') return;
  const recs = await dbGetRecords(getCurMonth());
  for (const r of recs) {
    r._phone = await decrypt(r.phone_enc || '');
    r._address = await decrypt(r.address_enc || '');
  }
  // 合并续舰名单（自动续舰的人一起导出，避免漏发）
  const caps = await dbGetRenewCaptains();
  const merged = recs.slice();
  for (const c of caps) {
    c._phone = await decrypt(c.phone_enc || '');
    c._address = await decrypt(c.address_enc || '');
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
   Name Wall - 首页背景续舰名单名字墙（跟随鼠标摆动）
   ================================================================ */
window.renderNameWall = async function() {
  const wall = document.getElementById('nameWall');
  if (!wall) return;
  const caps = await dbGetRenewCaptains();
  if (caps.length === 0) { wall.innerHTML = ''; return; }
  const w = window.innerWidth, h = window.innerHeight;
  wall.innerHTML = caps.map((c, i) => {
    const left = 8 + ((i * 37) % 84);
    const top = 12 + ((i * 53) % 72);
    const size = 14 + ((i * 7) % 12);
    const dur = 6 + ((i * 3) % 6);
    const delay = (i * 0.8) % 5;
    return '<span class="nw-name" data-i="'+i+'" style="left:'+left+'%;top:'+top+'%;font-size:'+size+'px;animation-duration:'+dur+'s;animation-delay:'+delay+'s">'+esc(c.nickname)+'</span>';
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

(function() {
  // 始终初始化 Supabase，匿名投稿等非登录功能也需要
  initSB();
  // 加载首页背景名字墙（续舰名单）
  window.loadNameWall();
  const r = localStorage.getItem(SK+'_role');
  if (r === 'admin') {
    window.role = 'admin';
    enterApp();
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
