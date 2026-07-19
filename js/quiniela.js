function betRow(home, away, centerHtml, cls, teamClickable) {
  const hf = FLAGS_MAP[home] || '';
  const af = FLAGS_MAP[away] || '';
  const rowCls = cls ? `bet-score-row ${cls}` : 'bet-score-row';
  const hn = teamClickable
    ? `<span class="bsr-tname bsr-tname--link" onclick="showTeamPopup('${home.replace(/'/g,"\\'")}')">${home}</span>`
    : `<span class="bsr-tname">${home}</span>`;
  const an = teamClickable
    ? `<span class="bsr-tname bsr-tname--link" onclick="showTeamPopup('${away.replace(/'/g,"\\'")}')">${away}</span>`
    : `<span class="bsr-tname">${away}</span>`;
  return `<div class="${rowCls}">
    <div class="bsr-home">${hf ? `<span class="bsr-flag">${hf}</span>` : ''}${hn}</div>
    <div class="bsr-center">${centerHtml}</div>
    <div class="bsr-away">${an}${af ? `<span class="bsr-flag">${af}</span>` : ''}</div>
  </div>`;
}

const SUPABASE_URL = 'https://zdghmnaiuqcqoezvaxum.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZ2htbmFpdXFjcW9lenZheHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNDkxMDEsImV4cCI6MjA5NTYyNTEwMX0.o9Y_dKF2fqVkjROW4iOMQ5rE_FH3TXZJPWctkALPbw0';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const GROUPS = [
  {
    id:      'cachorros',
    name:    'Cachorros',
    salt:    'mundial26',
    hash:    'b24ba0c12cce455ff311de58f936c129e1eea744e6cf37d0f93afb59ee1cfbc6',
    members: ['Nacho','Sergio','Edu','Alex','Javi','Jorge','Martín','Martinez','Ghobas','Portero','Gonza','Antonio'],
  },
  {
    id:      'pracas',
    name:    'Prrrrrrrraaaaaacaaas🐶👑👑👑',
    salt:    'mundial26',
    hash:    '2f5f36432f865d91bb992b083081db3e5c96ffe37f806f5149be701b8703cde3',
    members: ['Crossfitero 1','Crossfitero 2','Gutcemaniaco','Xaxofon2000','Chiqui Ibai','Mª Escudero','JAME JAMENEI','AFELLAY','The Small One','xNanoXz'],
  },
  {
    id:      'qbiertos',
    name:    "Q'biertos",
    salt:    'mundial26',
    hash:    '56c7cc5f6de23d66c22a945954c1658797f3a7a50389b5a04481f1417ecfa814',
    members: ['Jimmy','Maraca','Banery','Qiling','Negro','Joker Pelon','Nyom Ballon D\'or'],
  },
];

const ADMIN_HASH = 'f353bf263d36c03aa634957ae550b9d24fb8ee38ca4b672ed61997d4934cb29d';
const ADMIN_SALT = 'admin26';
let qnlAdminUnlocked = false;

let qnlUser         = null;
let qnlGroup        = null;
let qnlMode         = 'home';   // 'home' | 'partidos' | 'torneo'
let qnlSubTab       = 'apostar';
let qnlTorneoSub    = 'apuesta';
let qnlBets         = {};
let qnlLoaded       = false;
let qnlTorneoBet    = null;
let qnlBetsDirty    = true;
let qnlGroupUserIds = null;

const SPAIN_ROUNDS = [
  'Fase de grupos', '1/32 de final', 'Octavos de final',
  'Cuartos de final', 'Semifinal', 'Finalista', 'Campeón 🏆',
];

const ALL_TEAMS = [...new Set(
  MATCHES.filter(m => m[7] === 'groups')
    .flatMap(m => m[2].split('·')[0].trim().split(' vs ').map(t => t.trim()))
)].sort((a, b) => a.localeCompare(b, 'es'));

function isTorneoOpen() {
  return false; // cerrado el 15 jun — apuestas de torneo bloqueadas
}

// ── Helpers ────────────────────────────────────────────────────

// Devuelve la fecha de hoy en hora española ('YYYY-MM-DD')
function spainToday() {
  return new Intl.DateTimeFormat('sv', { timeZone:'Europe/Madrid' }).format(new Date());
}

// Convierte fecha+hora española a milisegundos UTC (respeta CET/CEST)
function spainToUTC(dateStr, timeStr) {
  const [y,mo,d] = dateStr.split('-').map(Number);
  const [h,mn]   = timeStr.split(':').map(Number);
  // Calcular offset de Madrid en esa fecha usando un mediodía de referencia
  const refUTC   = Date.UTC(y, mo-1, d, 12);
  const refSpain = new Date(refUTC).toLocaleString('sv', { timeZone:'Europe/Madrid' });
  const offsetH  = parseInt(refSpain.slice(11, 13)) - 12; // +1 CET o +2 CEST
  return Date.UTC(y, mo-1, d, h - offsetH, mn);
}

function isBetOpen(m) {
  const today = spainToday();
  const [y, mo, d] = today.split('-').map(Number);
  const limit = new Date(Date.UTC(y, mo - 1, d + 2)).toISOString().slice(0, 10);
  if (m[0] > limit) return false;
  return Date.now() < spainToUTC(m[0], m[1]) - 5*60*1000;
}

function isMatchStarted(m) {
  return Date.now() >= spainToUTC(m[0], m[1]);
}

function todayMatchesCEST() {
  const today = spainToday();
  return MATCHES.filter(m => m[0] === today);
}

function nextUpcomingMatch() {
  const now = Date.now();
  return MATCHES.find(m => spainToUTC(m[0], m[1]) > now);
}

// 3 pts resultado exacto · 1 pt ganador correcto · 0 pts fallo
// Eliminatorias: 3 pts si marcador exacto a 90 min (home_90/away_90), 1 pt clasificado correcto, 0 pts fallo
function calcPoints(bet, result, double = false) {
  if (!result || result.status === 'live') return null;
  let pts;
  if (result.phase === 'knockout') {
    const h90 = result.home_90 ?? result.home_score;
    const a90 = result.away_90 ?? result.away_score;
    const betWin = bet.qualifier
      || (bet.home_score > bet.away_score ? 'home' : bet.home_score < bet.away_score ? 'away' : null);
    const winner = result.winner ?? (h90 > a90 ? 'home' : h90 < a90 ? 'away' : null);
    const qualifierOk = betWin && betWin === winner ? 1 : 0;
    if (bet.home_score === h90 && bet.away_score === a90) pts = 3 + qualifierOk;
    else pts = qualifierOk;
  } else {
    if (bet.home_score === result.home_score && bet.away_score === result.away_score) pts = 3;
    else {
      const bOut = Math.sign(bet.home_score - bet.away_score);
      const rOut = Math.sign(result.home_score - result.away_score);
      pts = bOut === rOut ? 1 : 0;
    }
  }
  return double ? pts * 2 : pts;
}

function selectQualifier(mid, team) {
  const el = document.getElementById('bq-' + mid);
  if (!el) return;
  el.setAttribute('data-qualifier', team);
  el.querySelectorAll('.bq-btn').forEach((btn, i) => {
    btn.classList.toggle('bq-active', (i === 0 && team === 'home') || (i === 1 && team === 'away'));
  });
}

function updateQualifierFromScore(mid) {
  const h = parseInt(document.getElementById('h-' + mid)?.value) || 0;
  const a = parseInt(document.getElementById('a-' + mid)?.value) || 0;
  if (h > a) selectQualifier(mid, 'home');
  else if (a > h) selectQualifier(mid, 'away');
}

let _spainMatchIds = null;
function isSpainMatch(mid) {
  if (!_spainMatchIds) {
    _spainMatchIds = new Set(MATCHES.filter(m => m[6] === 1).map(m => matchId(m)));
  }
  return _spainMatchIds.has(mid);
}

function showToast(msg) {
  const existing = document.getElementById('qnl-toast');
  if (existing) existing.remove();
  const t = document.createElement('div');
  t.id = 'qnl-toast';
  t.textContent = msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2500);
}

function ptsLabel(pts) {
  if (pts === null || pts === undefined) return '';
  if (pts === 0) return '<span class="gb-pts-miss">0 pts</span>';
  const isExact = pts >= 3;
  return `<span class="${isExact ? 'gb-pts-exact' : 'gb-pts-win'}">+${pts}${isExact ? ' exacto!' : ' ganador'}</span>`;
}

// ── Auth ───────────────────────────────────────────────────────

async function hashStr(s) {
  const data = new TextEncoder().encode(s);
  const buf  = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function loadQuiniela() {
  const wrap = document.getElementById('qnl-inner');
  if (!wrap) return;
  renderQnlAdmin();
  if (qnlLoaded && qnlUser) { renderQnlContainer(); return; }
  wrap.innerHTML = '<div class="empty">Cargando…</div>';
  getStandingsData().then(d => buildFullSlotMap(d));
  showKnockoutRulesBanner();
  const uid = localStorage.getItem('qnl_uid');
  const gid = localStorage.getItem('qnl_gid');
  if (uid && gid) {
    const group = GROUPS.find(g => g.id === gid);
    if (group) {
      const { data } = await db.from('users').select('*').eq('id', uid).maybeSingle();
      if (data) {
        qnlUser  = data;
        qnlGroup = group;
        qnlBetsDirty = true;
        await loadMyBets();
        qnlLoaded = true;
        renderQnlContainer();
        return;
      }
    }
    localStorage.removeItem('qnl_uid');
    localStorage.removeItem('qnl_gid');
  }
  renderQnlGroupSelect();
}

function renderQnlGroupSelect() {
  const wrap = document.getElementById('qnl-inner');
  if (!wrap) return;
  const cards = GROUPS.map(g =>
    `<button class="qnl-group-card" onclick="qnlSelectGroup('${g.id}')">${g.name}</button>`
  ).join('');
  wrap.innerHTML = `
    <div class="qnl-register">
      <h2>Quiniela</h2>
      <p>Selecciona tu grupo e introduce la contraseña para acceder.</p>
      <div class="qnl-groups-list">${cards}</div>
      <div class="qnl-create-group">
        ¿Quieres crear tu propio grupo?<br>
        <a href="mailto:ignasiser97@gmail.com">Contáctame</a> y lo montamos.
      </div>
    </div>`;
}

function qnlSelectGroup(gid) {
  qnlGroup = GROUPS.find(g => g.id === gid);
  if (!qnlGroup) return;
  renderQnlPassScreen();
}

function renderQnlPassScreen() {
  const wrap = document.getElementById('qnl-inner');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="qnl-register">
      <button class="qnl-back" onclick="renderQnlGroupSelect()">← Grupos</button>
      <h2>${qnlGroup.name}</h2>
      <p>Introduce la contraseña del grupo para acceder.</p>
      <input class="qnl-input" id="qnl-grp-pass" type="password"
             placeholder="Contraseña del grupo" autocomplete="off"
             onkeydown="if(event.key==='Enter') qnlCheckPass()">
      <button class="qnl-btn" id="qnl-pass-btn" onclick="qnlCheckPass()">Entrar</button>
      <div class="qnl-error" id="qnl-pass-err"></div>
    </div>`;
  setTimeout(() => document.getElementById('qnl-grp-pass')?.focus(), 50);
}

async function qnlCheckPass() {
  const input = document.getElementById('qnl-grp-pass');
  const val   = input?.value.trim().toLowerCase();
  if (!val) return;
  const btn = document.getElementById('qnl-pass-btn');
  btn.disabled = true; btn.textContent = 'Comprobando…';
  const hash = await hashStr(val + qnlGroup.salt);
  if (hash !== qnlGroup.hash) {
    btn.disabled = false; btn.textContent = 'Entrar';
    document.getElementById('qnl-pass-err').textContent = 'Contraseña incorrecta.';
    input.value = ''; input.focus();
    return;
  }
  renderQnlPickerScreen();
}

function renderQnlPickerScreen() {
  const wrap = document.getElementById('qnl-inner');
  if (!wrap) return;
  const buttons = qnlGroup.members.map(name =>
    `<button class="qnl-picker-btn" onclick="qnlPickFriend('${name.replace(/'/g, "\\'")}')">${escHtml(name)}</button>`
  ).join('');
  wrap.innerHTML = `
    <div class="qnl-register">
      <button class="qnl-back" onclick="renderQnlGroupSelect()">← Grupos</button>
      <h2>¿Quién eres?</h2>
      <p>Elige tu nombre. Solo necesitas hacerlo una vez.</p>
      <div class="qnl-picker-grid">${buttons}</div>
      <div class="qnl-error" id="qnl-pick-err" style="margin-top:14px"></div>
    </div>`;
}

async function qnlPickFriend(name) {
  document.querySelectorAll('.qnl-picker-btn').forEach(b => b.disabled = true);
  const errEl = document.getElementById('qnl-pick-err');

  // Busca por nombre + grupo; migra legacy: group_id null o UUID huérfano (no coincide con ningún grupo conocido)
  const knownIds = new Set(GROUPS.map(g => g.id));
  let { data: existing } = await db.from('users').select('*').eq('name', name).eq('group_id', qnlGroup.id).maybeSingle();
  if (!existing) {
    const { data: legacy } = await db.from('users').select('*').eq('name', name).maybeSingle();
    if (legacy && (legacy.group_id === null || !knownIds.has(legacy.group_id))) {
      await db.from('users').update({ group_id: qnlGroup.id }).eq('id', legacy.id);
      existing = { ...legacy, group_id: qnlGroup.id };
    }
  }
  if (existing) {
    qnlUser = existing;
  } else {
    const { data, error } = await db.from('users').insert({ name, group_id: qnlGroup.id }).select().maybeSingle();
    if (error || !data) {
      if (errEl) errEl.textContent = error?.message || error?.code || 'Error desconocido';
      document.querySelectorAll('.qnl-picker-btn').forEach(b => b.disabled = false);
      return;
    }
    qnlUser = data;
  }

  localStorage.setItem('qnl_uid', qnlUser.id);
  localStorage.setItem('qnl_gid', qnlGroup.id);
  await loadMyBets();
  qnlLoaded = true;
  renderQnlContainer();
}

function qnlLogout() {
  if (!confirm('¿Cambiar de usuario?')) return;
  if (_urgentInterval) { clearInterval(_urgentInterval); _urgentInterval = null; }
  localStorage.removeItem('qnl_uid');
  localStorage.removeItem('qnl_gid');
  qnlUser         = null;
  qnlGroup        = null;
  qnlBets         = {};
  qnlLoaded       = false;
  qnlGroupUserIds = null;
  renderQnlGroupSelect();
}

async function loadMyBets() {
  if (!qnlUser || !qnlBetsDirty) return;
  const { data } = await db.from('bets').select('*').eq('user_id', qnlUser.id);
  qnlBets = {};
  (data || []).forEach(b => { qnlBets[b.match_id] = b; });
  for (const [oldId, newId] of Object.entries(OLD_THIRD_PLACE_BET_IDS)) {
    if (qnlBets[oldId] && !qnlBets[newId]) {
      qnlBets[newId] = { ...qnlBets[oldId], match_id: newId };
    }
    delete qnlBets[oldId];
  }
  qnlBetsDirty = false;
}

async function ensureGroupUserIds() {
  if (qnlGroupUserIds) return qnlGroupUserIds;
  const { data } = await db.from('users').select('id').eq('group_id', qnlGroup.id);
  qnlGroupUserIds = (data || []).map(u => u.id);
  return qnlGroupUserIds;
}

// ── Render shell ───────────────────────────────────────────────

function renderQnlContainer() {
  const wrap = document.getElementById('qnl-inner');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="qnl-header">
      <span class="qnl-user">Hola, ${escHtml(qnlUser.name)} 👋</span>
      <div class="qnl-header-actions"><button class="qnl-logout" onclick="qnlLogout()">Cambiar usuario</button></div>
    </div>
    <div id="qnl-mode-content"></div>`;
  renderQnlModeContent();
}

function renderQnlModeContent() {
  const el = document.getElementById('qnl-mode-content');
  if (!el) return;
  if (qnlMode === 'home')     renderQnlHome(el);
  else if (qnlMode === 'partidos') renderPartidosMode(el);
  else if (qnlMode === 'torneo')   renderTorneoMode(el);
}

function switchQnlMode(mode) {
  qnlMode = mode;
  renderQnlModeContent();
}

// ── Home: urgente + dos botones grandes ───────────────────────

let _urgentInterval = null;

function renderQnlHome(el) {
  if (_urgentInterval) { clearInterval(_urgentInterval); _urgentInterval = null; }

  // Partidos hoy con apuesta aún abierta y sin apostar
  const pending = MATCHES.filter(m => isBetOpen(m) && !qnlBets[matchId(m)])
    .sort((a, b) => spainToUTC(a[0], a[1]) - spainToUTC(b[0], b[1]));

  const next   = pending[0] || null;
  const extras = pending.length - 1;

  let urgentHtml = '';
  if (next) {
    const [home, away] = resolveTeams(next);
    const hf = FLAGS_MAP[home] || '';
    const af = FLAGS_MAP[away] || '';
    const subLabel = extras > 0
      ? `+${extras} partido${extras > 1 ? 's' : ''} más sin apostar hoy`
      : 'Sin apostar · toca para ir a Partidos';
    urgentHtml = `
      <div class="qnl-urgent" onclick="switchQnlMode('partidos')">
        <div class="qnl-urgent-left">
          <div class="qnl-urgent-match">${hf} ${home} – ${away} ${af}</div>
          <div class="qnl-urgent-sub">${subLabel}</div>
        </div>
        <span class="qnl-urgent-cd" id="qnl-urgent-cd">…</span>
        <span class="qnl-urgent-arrow">›</span>
      </div>`;
  }

  el.innerHTML = `
    ${urgentHtml}
    <div class="qnl-mode-grid">
      <button class="qnl-mode-card" onclick="switchQnlMode('partidos')">
        <div class="qnl-mode-icon">⚽</div>
        <div class="qnl-mode-title">Partidos</div>
        <div class="qnl-mode-desc">Apuesta el resultado de cada partido día a día</div>
      </button>
      <button class="qnl-mode-card" onclick="switchQnlMode('torneo')">
        <div class="qnl-mode-icon">🏆</div>
        <div class="qnl-mode-title">Torneo</div>
        <div class="qnl-mode-desc">Predice el campeón, goleador, sorpresa y más</div>
      </button>
    </div>`;

  if (next) startUrgentCountdown(next);
}

function startUrgentCountdown(m) {
  const deadline = spainToUTC(m[0], m[1]) - 5 * 60 * 1000;

  function tick() {
    const cdEl = document.getElementById('qnl-urgent-cd');
    if (!cdEl) { clearInterval(_urgentInterval); _urgentInterval = null; return; }
    const diff = deadline - Date.now();
    if (diff <= 0) {
      clearInterval(_urgentInterval); _urgentInterval = null;
      cdEl.closest('.qnl-urgent')?.remove();
      return;
    }
    const h = Math.floor(diff / 3600000);
    const min = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    cdEl.textContent = h > 0
      ? `${h}h ${String(min).padStart(2, '0')}m`
      : `${min}m ${String(s).padStart(2, '0')}s`;
  }

  tick();
  _urgentInterval = setInterval(tick, 1000);
}

// ── Modo Partidos ──────────────────────────────────────────────

function renderPartidosMode(el) {
  el.innerHTML = `
    <button class="qnl-back" onclick="switchQnlMode('home')">← Inicio</button>
    <div class="qnl-subtabs">
      <button class="qnl-stab ${qnlSubTab==='apostar'?'active':''}"       onclick="qnlSwitchSub('apostar')">Apostar</button>
      <button class="qnl-stab ${qnlSubTab==='misapuestas'?'active':''}"   onclick="qnlSwitchSub('misapuestas')">Mis apuestas</button>
      <button class="qnl-stab ${qnlSubTab==='clasificacion'?'active':''}" onclick="qnlSwitchSub('clasificacion')">Clasificación</button>
    </div>
    <div id="qnl-subcontent"></div>`;
  renderQnlSubTab();
}

async function qnlSwitchSub(sub) {
  if (qnlSubTab === 'apostar' && sub !== 'apostar') {
    const hasUnsaved = [...document.querySelectorAll('.bet-score-input')]
      .some(inp => inp.value !== '' && !inp.disabled && !inp.closest('.hidden'));
    if (hasUnsaved && !confirm('Tienes una apuesta sin guardar. ¿Salir igualmente?')) return;
  }
  qnlSubTab = sub;
  document.querySelectorAll('.qnl-stab').forEach((b, i) =>
    b.classList.toggle('active', ['apostar','misapuestas','clasificacion'][i] === sub)
  );
  renderQnlSubTab();
}

// ── Modo Torneo ────────────────────────────────────────────────

function renderTorneoMode(el) {
  el.innerHTML = `
    <button class="qnl-back" onclick="switchQnlMode('home')">← Inicio</button>
    <div class="qnl-subtabs">
      <button class="qnl-stab ${qnlTorneoSub==='apuesta'?'active':''}"        onclick="qnlTorneoSwitchSub('apuesta')">Mi apuesta</button>
      <button class="qnl-stab ${qnlTorneoSub==='clasificacion'?'active':''}"  onclick="qnlTorneoSwitchSub('clasificacion')">Clasificación</button>
    </div>
    <div id="qnl-torneo-content"><div class="empty">Cargando…</div></div>`;
  renderTorneoSubTab();
}

async function qnlTorneoSwitchSub(sub) {
  qnlTorneoSub = sub;
  document.querySelectorAll('.qnl-stab').forEach((b, i) =>
    b.classList.toggle('active', ['apuesta','clasificacion'][i] === sub)
  );
  renderTorneoSubTab();
}

async function renderTorneoSubTab() {
  const el = document.getElementById('qnl-torneo-content');
  if (!el) return;
  el.innerHTML = '<div class="empty">Cargando…</div>';
  if (qnlTorneoSub === 'apuesta')            await renderTorneoApuesta(el);
  else if (qnlTorneoSub === 'clasificacion') await renderTorneoClasificacion(el);
}

function teamOptions(selected = '') {
  return ALL_TEAMS.map(t =>
    `<option value="${t}"${t === selected ? ' selected' : ''}>${t}</option>`
  ).join('');
}

async function renderTorneoApuesta(el) {
  if (!qnlTorneoBet) {
    const { data } = await db.from('tournament_bets').select('*').eq('user_id', qnlUser.id).maybeSingle();
    qnlTorneoBet = data || false;
  }
  const data = qnlTorneoBet || null;
  const b = data || {};
  const open = isTorneoOpen();

  const roundOpts = SPAIN_ROUNDS.map(r =>
    `<option value="${r}"${r === b.spain_round ? ' selected' : ''}>${r}</option>`
  ).join('');

  const savedMsg = data
    ? `<div class="torneo-saved-msg">✓ Apuesta guardada${!open ? ' · Cerrada' : ''}</div>` : '';

  el.innerHTML = `
    ${savedMsg}
    <div class="torneo-form">
      <div class="torneo-field">
        <label class="torneo-label">🏆 Campeón <span class="torneo-pts">5 pts</span></label>
        <select class="qnl-input" id="tb-winner" ${!open?'disabled':''}>
          <option value="">-- Elige un equipo --</option>${teamOptions(b.winner)}
        </select>
      </div>
      <div class="torneo-field">
        <label class="torneo-label">🥈 Finalista <span class="torneo-pts">3 pts</span></label>
        <select class="qnl-input" id="tb-finalist" ${!open?'disabled':''}>
          <option value="">-- Elige un equipo --</option>${teamOptions(b.finalist)}
        </select>
      </div>
      <div class="torneo-field">
        <label class="torneo-label">🇪🇸 España llega hasta… <span class="torneo-pts">2 pts</span></label>
        <select class="qnl-input" id="tb-spain" ${!open?'disabled':''}>
          <option value="">-- Elige fase --</option>${roundOpts}
        </select>
      </div>
      <div class="torneo-field">
        <label class="torneo-label">👟 Máximo goleador <span class="torneo-pts">3 pts</span></label>
        <input class="qnl-input" id="tb-scorer" type="text" placeholder="Nombre del jugador"
          value="${escHtml(b.top_scorer||'')}" maxlength="40" ${!open?'disabled':''}>
      </div>
      <div class="torneo-field">
        <label class="torneo-label">🧤 Mejor portero (Guante de Oro) <span class="torneo-pts">2 pts</span></label>
        <input class="qnl-input" id="tb-keeper" type="text" placeholder="Nombre del portero"
          value="${escHtml(b.best_keeper||'')}" maxlength="40" ${!open?'disabled':''}>
      </div>
      <div class="torneo-field">
        <label class="torneo-label">⭐ Sorpresa del torneo <span class="torneo-pts">2 pts</span></label>
        <select class="qnl-input" id="tb-surprise" ${!open?'disabled':''}>
          <option value="">-- Elige un equipo --</option>${teamOptions(b.surprise)}
        </select>
      </div>
      ${open
        ? `<button class="qnl-btn" style="margin-top:8px" onclick="saveTorneoBet()">
             ${data ? '✎ Actualizar apuesta' : '+ Guardar apuesta'}
           </button>`
        : `<p style="text-align:center;font-size:12px;color:var(--muted);margin-top:12px">
             Las apuestas cerraron al inicio del torneo.
           </p>`
      }
      <div class="qnl-error" id="torneo-err"></div>
    </div>`;
}

async function saveTorneoBet() {
  const winner   = document.getElementById('tb-winner')?.value;
  const finalist = document.getElementById('tb-finalist')?.value;
  const spain    = document.getElementById('tb-spain')?.value;
  const scorer   = document.getElementById('tb-scorer')?.value.trim();
  const keeper   = document.getElementById('tb-keeper')?.value.trim();
  const surprise = document.getElementById('tb-surprise')?.value;

  if (!winner || !finalist || !spain || !scorer || !keeper || !surprise) {
    document.getElementById('torneo-err').textContent = 'Rellena todos los campos.';
    return;
  }
  if (winner === finalist) {
    document.getElementById('torneo-err').textContent = 'El campeón y el finalista no pueden ser el mismo equipo.';
    return;
  }

  const { error } = await db.from('tournament_bets').upsert(
    { user_id: qnlUser.id, winner, finalist, spain_round: spain, top_scorer: scorer, best_keeper: keeper, surprise, updated_at: new Date().toISOString() },
    { onConflict: 'user_id' }
  );
  if (error) { document.getElementById('torneo-err').textContent = 'Error al guardar.'; return; }
  qnlTorneoBet = { winner, finalist, spain_round: spain, top_scorer: scorer, best_keeper: keeper, surprise };
  showToast('✓ Apuesta de torneo guardada');
  const el = document.getElementById('qnl-torneo-content');
  if (el) await renderTorneoApuesta(el);
}

// Calcula puntos de torneo: campeón +5, finalista +3, España +2, goleador +3, portero +2, sorpresa +2
// res[field] puede ser string o array de aliases (para cubrir variantes ortográficas)
function matchesTorneoField(betVal, resVal) {
  if (!betVal || !resVal) return false;
  const norm = s => (s||'').toLowerCase().trim();
  const aliases = Array.isArray(resVal) ? resVal : [resVal];
  return aliases.some(a => a && norm(a) === norm(betVal));
}

function calcTorneoPoints(bet, res) {
  if (!res || !bet) return null;
  const pts = {};
  if (matchesTorneoField(bet.winner,      res.winner))      pts.winner      = 5;
  if (matchesTorneoField(bet.finalist,    res.finalist))    pts.finalist    = 3;
  if (matchesTorneoField(bet.spain_round, res.spain_round)) pts.spain_round = 2;
  if (matchesTorneoField(bet.top_scorer,  res.top_scorer))  pts.top_scorer  = 3;
  if (matchesTorneoField(bet.best_keeper, res.best_keeper)) pts.best_keeper = 2;
  if (matchesTorneoField(bet.surprise,    res.surprise))    pts.surprise    = 2;
  return pts;
}

function torneoTotal(pts) {
  return pts ? Object.values(pts).reduce((a, b) => a + b, 0) : 0;
}

async function getTournamentResults() {
  try {
    const res = await fetch('./tournament_results.json?t=' + Date.now());
    return res.ok ? res.json() : null;
  } catch { return null; }
}

async function renderTorneoClasificacion(el) {
  const [{ data: users }, { data: bets }, results] = await Promise.all([
    db.from('users').select('id, name, group_id'),
    db.from('tournament_bets').select('*'),
    getTournamentResults(),
  ]);

  const toggle = `
    <div class="lb-scope-bar">
      <button class="lb-scope-btn${torneoLbScope==='group'?' active':''}" onclick="setTorneoLbScope('group')">Mi grupo</button>
      <button class="lb-scope-btn${torneoLbScope==='all'?' active':''}" onclick="setTorneoLbScope('all')">Todos</button>
    </div>`;

  if (!bets?.length) {
    el.innerHTML = `${toggle}<div class="empty">Nadie ha hecho su apuesta de torneo aún.</div>`;
    return;
  }

  const betByUser = {};
  bets.forEach(b => { betByUser[b.user_id] = b; });

  const torneoStarted = Date.now() >= MUNDIAL_START_MS;
  const hasResults    = results && Object.values(results).some(v => {
    const aliases = Array.isArray(v) ? v : [v];
    return aliases.some(a => a && a !== '');
  });

  const FIELDS = [
    { key:'winner',      label:'🏆 Campeón',  pts:5 },
    { key:'finalist',    label:'🥈 Finalista', pts:3 },
    { key:'spain_round', label:'🇪🇸 España',   pts:2 },
    { key:'top_scorer',  label:'👟 Goleador',  pts:3 },
    { key:'best_keeper', label:'🧤 Portero',   pts:2 },
    { key:'surprise',    label:'⭐ Sorpresa',  pts:2 },
  ];

  const usersWithBets = (users || []).filter(u => {
    if (!betByUser[u.id]) return false;
    return torneoLbScope === 'group' ? u.group_id === qnlGroup?.id : true;
  });
  const scored = usersWithBets.map(u => {
    const b   = betByUser[u.id];
    const pts = hasResults ? calcTorneoPoints(b, results) : null;
    return { u, b, pts, total: torneoTotal(pts) };
  }).sort((a, b) => b.total - a.total || a.u.name.localeCompare(b.u.name));

  const rows = scored.map(({ u, b, pts }) => {
    const isMe = u.id === qnlUser?.id;
    const show = torneoStarted || isMe;
    const total = torneoTotal(pts);
    const groupBadge = torneoLbScope === 'all'
      ? `<span class="lb-group-badge">${GROUPS.find(g => g.id === u.group_id)?.id || '?'}</span>`
      : '';

    const details = show
      ? `<div class="torneo-lb-grid">
          ${FIELDS.map(f => {
            const val    = b[f.key] || '—';
            const earned = pts?.[f.key];
            const hit    = earned != null;
            return `<span class="torneo-lb-item">
              <span class="torneo-lb-cat">${f.label}</span>
              <span style="${hit ? 'color:var(--pos)' : ''}">${escHtml(val)}</span>
              ${hit ? `<span class="torneo-lb-pts">+${earned}</span>` : ''}
            </span>`;
          }).join('')}
        </div>`
      : `<div style="font-size:11px;color:var(--muted);margin-top:4px">Apuesta enviada · Se revela al inicio del torneo</div>`;

    return `<div class="torneo-lb-row${isMe ? ' me' : ''}">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div class="torneo-lb-name">${escHtml(u.name)}${isMe ? ' 👈' : ''}${groupBadge}</div>
        ${hasResults && show ? `<div class="torneo-total-pts">${total} pts</div>` : ''}
      </div>
      ${details}
    </div>`;
  }).join('');

  const note = hasResults
    ? ''
    : torneoStarted
      ? `<p style="font-size:11px;color:var(--muted);margin-bottom:14px;text-align:center">Puntos pendientes de resultados oficiales.</p>`
      : `<p style="font-size:11px;color:var(--muted);margin-bottom:14px;text-align:center">Las predicciones se revelan cuando empiece el primer partido.</p>`;

  el.innerHTML = `${toggle}${note}<div class="torneo-lb">${rows}</div>`;
}


async function renderQnlSubTab() {
  const el = document.getElementById('qnl-subcontent');
  if (!el) return;
  if (qnlSubTab === 'apostar') {
    await loadMyBets();
    await renderApostar(el);
  } else if (qnlSubTab === 'misapuestas') {
    el.innerHTML = '<div class="empty">Cargando…</div>';
    await renderMisApuestas(el);
  } else if (qnlSubTab === 'clasificacion') {
    el.innerHTML = '<div class="empty">Cargando clasificación…</div>';
    await renderClasificacion(el);
  }
}

// ── Popup resultados de equipo ─────────────────────────────────

const PHASE_LABEL = { groups:'Fase de grupos', r32:'1/32 de final', r16:'Octavos', qf:'Cuartos', sf:'Semis', '3p':'3er y 4º puesto', final:'Final' };

async function showTeamPopup(team) {
  const results = await getMatchResults();
  const flag = FLAGS_MAP[team] || '';

  const played = [], upcoming = [];
  for (const m of MATCHES) {
    const [home, away] = resolveTeams(m);
    if (home !== team && away !== team) continue;
    const mid = matchId(m);
    const r = results[mid];
    if (r && r.status !== 'live') {
      const isHome = home === team;
      const gs = isHome ? r.home : r.away;
      const gc = isHome ? r.away : r.home;
      const rival = isHome ? away : home;
      const rivalFlag = FLAGS_MAP[rival] || '';
      const outcome = gs > gc ? 'win' : gs < gc ? 'loss' : 'draw';
      played.push({ m, rival, rivalFlag, outcome, score: `${r.home}–${r.away}` });
    } else {
      upcoming.push({ m, rival: home === team ? away : home });
    }
  }

  const phaseFor = m => PHASE_LABEL[m[7]] || m[7];
  const groupFor = m => { const g = m[2].match(/Grupo ([A-Z])/); return g ? `Grupo ${g[1]}` : phaseFor(m); };

  const playedRows = played.map(({ m, rival, rivalFlag, outcome, score }) => {
    const cls = outcome === 'win' ? 'tpop-win' : outcome === 'loss' ? 'tpop-loss' : 'tpop-draw';
    const label = m[7] === 'groups' ? groupFor(m) : phaseFor(m);
    return `<div class="tpop-row">
      <span class="tpop-phase">${label}</span>
      <span class="tpop-rival">${rivalFlag} ${rival}</span>
      <span class="tpop-score ${cls}">${score}</span>
    </div>`;
  }).join('');

  const upcomingRows = upcoming.map(({ m, rival }) => {
    const rivalFlag = FLAGS_MAP[rival] || '';
    const label = m[7] === 'groups' ? groupFor(m) : phaseFor(m);
    return `<div class="tpop-row tpop-row--upcoming">
      <span class="tpop-phase">${label}</span>
      <span class="tpop-rival">${rivalFlag} ${rival}</span>
      <span class="tpop-score" style="color:var(--muted)">${m[1]}</span>
    </div>`;
  }).join('');

  const body = (played.length ? `<div class="tpop-section-title">Jugados</div>${playedRows}` : '') +
               (upcoming.length ? `<div class="tpop-section-title">Próximos</div>${upcomingRows}` : '');

  const overlay = document.createElement('div');
  overlay.id = 'team-popup-overlay';
  overlay.innerHTML = `
    <div class="tpop-card">
      <div class="tpop-header">
        <span class="tpop-flag">${flag}</span>
        <span class="tpop-team">${team}</span>
      </div>
      <div class="tpop-body">${body || '<div style="color:var(--muted);font-size:13px">Sin partidos registrados</div>'}</div>
      <button class="sq-btn" style="margin-top:20px" onclick="document.getElementById('team-popup-overlay').remove()">Cerrar</button>
    </div>`;
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

// ── Líder del grupo en eliminatorias ──────────────────────────

let _koLeaderId = null;

function computeLeaderId(allBets, matchResultsMap, groupUserIds) {
  const pts = {};
  groupUserIds.forEach(uid => { pts[uid] = 0; });
  const seenBets = new Set();
  (allBets || []).forEach(b => {
    if (!Object.prototype.hasOwnProperty.call(pts, b.user_id)) return;
    const normalMid = OLD_THIRD_PLACE_BET_IDS[b.match_id] ?? b.match_id;
    const dedupeKey = `${b.user_id}|${normalMid}`;
    if (seenBets.has(dedupeKey)) return;
    seenBets.add(dedupeKey);
    const r = matchResultsMap[b.match_id];
    if (!r || r.status !== 'ft') return;
    const result = { home_score: r.home_90 ?? r.home, away_score: r.away_90 ?? r.away, status: r.status, phase: r.phase, winner: r.winner };
    const p = calcPoints(b, result, isSpainMatch(normalMid));
    if (p !== null) pts[b.user_id] += p;
  });
  let leaderId = null, maxPts = -1;
  Object.entries(pts).forEach(([uid, p]) => { if (p > maxPts) { maxPts = p; leaderId = uid; } });
  return leaderId;
}

function showKnockoutRulesBanner() {
  const KEY = 'knockout-rules-v1';
  if (localStorage.getItem(KEY)) return;
  const overlay = document.createElement('div');
  overlay.id = 'sabiasque-overlay';
  overlay.innerHTML = `
    <div class="sq-card">
      <div class="sq-eyebrow" style="letter-spacing:1px">ELIMINATORIAS — NUEVAS REGLAS</div>
      <div class="sq-title">EL PASA IMPORTA</div>
      <div class="sq-fact" style="text-align:left">
        El marcador se apuesta <strong>a 90 minutos</strong> — sin prórroga ni penaltis.<br><br>
        ✓ Exacto a 90 min → <strong>3 pts</strong><br>
        ✓ Aciertas quién pasa → <strong>1 pt</strong><br>
        ✗ Fallo → <strong>0 pts</strong><br><br>
        Si puede acabar en empate, usa el botón <strong>"Pasa"</strong> para indicar quién avanza aunque sea por penaltis.<br><br>
        👀 <strong>El líder del grupo tiene las cartas boca arriba.</strong> Su apuesta es visible para todos antes de que arranque el partido. Las del resto permanecen ocultas hasta el cierre.
      </div>
      <button class="sq-btn" onclick="
        localStorage.setItem('${KEY}','1');
        document.getElementById('sabiasque-overlay').remove();
      ">✓ Entendido</button>
    </div>`;
  document.body.appendChild(overlay);
}

// ── Apostar ────────────────────────────────────────────────────

async function renderApostar(el) {
  const today = spainToday();
  // Fetch more candidate dates to compensate for fully-finished days
  const candidateDates = [...new Set(
    MATCHES.filter(m => m[0] >= today).map(m => m[0])
  )].sort().slice(0, 6);

  if (!candidateDates.length) {
    el.innerHTML = '<div class="empty">El torneo ha finalizado.</div>';
    return;
  }

  const candidateIds = candidateDates
    .flatMap(date => MATCHES.filter(m => m[0] === date))
    .map(m => matchId(m));

  // Include old slot IDs so bets placed before bracket was confirmed still show up
  const oldCandidateIds = Object.entries(OLD_THIRD_PLACE_BET_IDS)
    .filter(([, newId]) => candidateIds.includes(newId))
    .map(([oldId]) => oldId);
  const allCandidateIds = oldCandidateIds.length ? [...candidateIds, ...oldCandidateIds] : candidateIds;

  const groupUserIds = await ensureGroupUserIds();
  const [{ data: groupBetsRaw }, { data: allGroupBetsRaw }, matchResultsMap] = await Promise.all([
    db.from('bets').select('match_id, home_score, away_score, qualifier, user_id, users(name)').in('match_id', allCandidateIds),
    db.from('bets').select('user_id, match_id, home_score, away_score, qualifier').in('user_id', groupUserIds),
    getMatchResults(),
  ]);
  _koLeaderId = computeLeaderId(allGroupBetsRaw, matchResultsMap, groupUserIds);

  const isFinished = mid => matchResultsMap[mid]?.status === 'ft';

  // Skip dates where every match is already finished
  const upcomingDates = candidateDates.filter(date =>
    MATCHES.filter(m => m[0] === date).some(m => !isFinished(matchId(m)))
  ).slice(0, 3);

  if (!upcomingDates.length) {
    el.innerHTML = '<div class="empty">El torneo ha finalizado.</div>';
    return;
  }

  const groupBetsMap = {};
  (groupBetsRaw || []).filter(b => groupUserIds.includes(b.user_id)).forEach(b => {
    if (!groupBetsMap[b.match_id]) groupBetsMap[b.match_id] = [];
    groupBetsMap[b.match_id].push(b);
  });
  // Merge bets stored under old slot IDs into their current match ID bucket
  for (const [oldId, newId] of Object.entries(OLD_THIRD_PLACE_BET_IDS)) {
    if (!groupBetsMap[oldId]) continue;
    if (!groupBetsMap[newId]) groupBetsMap[newId] = [];
    for (const b of groupBetsMap[oldId]) {
      if (!groupBetsMap[newId].some(x => x.user_id === b.user_id)) {
        groupBetsMap[newId].push(b);
      }
    }
    delete groupBetsMap[oldId];
  }

  const memberCount = qnlGroup?.members?.length || 0;

  const sections = upcomingDates.map(date => {
    const label = date === today ? `Hoy · ${fmtDate(date)}` : fmtDate(date);
    const cards = MATCHES.filter(m => m[0] === date && !isFinished(matchId(m))).sort((a,b)=>a[1].localeCompare(b[1])).map(m => {
      const mid        = matchId(m);
      const isKnockout = m[7] !== 'groups';
      const saved   = qnlBets[mid];
      const open    = isBetOpen(m);
      const started = isMatchStarted(m);
      const [home, away] = resolveTeams(m);
      const bets    = groupBetsMap[mid] || [];

      const badge = `<span class="bet-count-badge">${bets.length}/${memberCount}</span>`;

      let dropContent;
      if (!bets.length) {
        dropContent = `<div style="font-size:12px;color:var(--muted);text-align:center;padding:2px 0">Nadie ha apostado aún</div>`;
      } else {
        const rows = bets.map(b => {
          const isLeader = isKnockout && b.user_id === _koLeaderId;
          const showScore = started || isLeader;
          const score = showScore
            ? `<span class="bdrop-score">${b.home_score} – ${b.away_score}</span>`
            : `<span class="bdrop-hidden">oculto</span>`;
          const crown = isLeader && !started ? ' 👑' : '';
          return `<div class="bdrop-row"><span>${escHtml(b.users.name)}${crown}</span>${score}</div>`;
        }).join('');
        const note = !started
          ? (isKnockout
              ? `<div class="bdrop-note">Solo el líder 👑 tiene el marcador visible antes del pitido</div>`
              : `<div class="bdrop-note">Los marcadores se revelan al inicio del partido</div>`)
          : '';
        dropContent = rows + note;
      }

      const verGrupoBtn = (started || isKnockout)
        ? `<button class="bet-toggle-bets" onclick="toggleGroupBets('${mid}',this)">Ver grupo</button>`
        : '';

      // Helper: input de marcador (con oninput para qualifier en eliminatorias)
      const inp = (id, val) => `<input class="bet-score-input" type="number" min="0" max="20" id="${id}" value="${val}" placeholder="0"${isKnockout ? ` oninput="updateQualifierFromScore('${mid}')"` : ''}>`;
      // Helper: selector de clasificado editable (solo eliminatorias)
      const qEdit = (curQ) => {
        if (!isKnockout) return '';
        const hf = FLAGS_MAP[home] || '', af = FLAGS_MAP[away] || '';
        return `<div class="bq-row" id="bq-${mid}" data-qualifier="${curQ || ''}">
          <span class="bq-label">¿Pasa?</span>
          <button class="bq-btn${curQ === 'home' ? ' bq-active' : ''}" onclick="selectQualifier('${mid}','home')">${hf} ${home}</button>
          <button class="bq-btn${curQ === 'away' ? ' bq-active' : ''}" onclick="selectQualifier('${mid}','away')">${af} ${away}</button>
        </div>`;
      };
      // Helper: selector de clasificado en modo lectura (solo eliminatorias)
      const qRead = (curQ) => {
        if (!isKnockout || !curQ) return '';
        const name = curQ === 'home' ? home : away;
        const flag = curQ === 'home' ? (FLAGS_MAP[home] || '') : (FLAGS_MAP[away] || '');
        return `<div class="bq-row"><span class="bq-label">Pasa:</span><span class="bq-val">${flag} ${name}</span></div>`;
      };

      let body;
      if (open && saved) {
        // Apuesta guardada + plazo abierto: lectura por defecto, edición al pulsar
        body = `
          <div id="ro-${mid}">
            ${betRow(home, away, `<span class="bsr-score">${saved.home_score}</span><span class="bet-dash">–</span><span class="bsr-score">${saved.away_score}</span>`, null, true)}
            ${qRead(saved.qualifier)}
            <div class="bet-actions">
              <span class="bet-saved">✓ Apuesta guardada</span>
              <button class="bet-toggle-bets" onclick="enableBetEdit('${mid}')">✎ Editar</button>
            </div>
          </div>
          <div id="ed-${mid}" class="hidden">
            ${betRow(home, away, `${inp('h-' + mid, saved.home_score)}<span class="bet-dash">–</span>${inp('a-' + mid, saved.away_score)}`)}
            ${qEdit(saved.qualifier)}
            <div class="bet-actions">
              <button class="bet-submit" onclick="submitBet('${mid}')">✓ Guardar</button>
              <button class="bet-toggle-bets" onclick="cancelBetEdit('${mid}')">✕ Cancelar</button>
            </div>
            <div class="bet-lock-info">Cierra 5 min antes del pitido</div>
          </div>`;
      } else if (open) {
        // Sin apuesta previa: inputs directamente
        body = `
          ${betRow(home, away, `${inp('h-' + mid, '')}<span class="bet-dash">–</span>${inp('a-' + mid, '')}`, null, true)}
          ${qEdit(null)}
          <div class="bet-actions">
            <button class="bet-submit" onclick="submitBet('${mid}')">+ Apostar</button>
          </div>
          <div class="bet-lock-info">Cierra 5 min antes del pitido</div>`;
      } else if (saved) {
        body = `
          ${betRow(home, away, `<span class="bsr-score">${saved.home_score}</span><span class="bet-dash">–</span><span class="bsr-score">${saved.away_score}</span>`, null, true)}
          ${qRead(saved.qualifier)}
          <div class="bet-actions"><span class="bet-saved">✓ Apuesta guardada</span>${verGrupoBtn}</div>
          <div id="gbets-${mid}" class="hidden"></div>`;
      } else {
        body = `
          ${betRow(home, away, `<span class="bsr-score" style="color:var(--muted)">–</span><span class="bet-dash">–</span><span class="bsr-score" style="color:var(--muted)">–</span>`, 'opacity45', true)}
          <div class="bet-actions"><span class="bet-closed">${started ? 'Partido en juego' : 'Apuestas cerradas'}</span>${verGrupoBtn}</div>
          <div id="gbets-${mid}" class="hidden"></div>`;
      }

      const doubleBadge = m[6] === 1 ? `<span class="bet-double-badge">🇪🇸 ×2</span>` : '';

      return `
        <div class="bet-card${m[6] === 1 ? ' spain-double' : ''}">
          ${badge}${doubleBadge}
          <div class="bet-card-header" onclick="toggleBetDropdown('${mid}')">
            <div class="bet-meta"><span class="${isNight(m[1])?'night':''}">${m[1]}${isNight(m[1])?' 🌙':''}</span> · ${m[3].split(',').pop().trim()}</div>
          </div>
          <div id="bdrop-${mid}" class="bet-dropdown hidden">${dropContent}</div>
          ${body}
        </div>`;
    }).join('');

    return `<div class="bet-day-label">${label}</div>${cards}`;
  }).join('');

  el.innerHTML = sections;

  // Hint one-time: click en equipo → popup resultados
  const HINT_KEY = 'hint-qnl-team';
  if (!localStorage.getItem(HINT_KEY)) {
    const hint = document.createElement('div');
    hint.className = 'hint-banner';
    hint.innerHTML = `<div class="hint-lines"><div class="hint-line">💡 Pulsa el nombre de un equipo para ver sus resultados en el torneo</div></div><button class="hint-close" onclick="dismissHint('${HINT_KEY}',this.parentElement)">✕</button>`;
    el.prepend(hint);
    setTimeout(() => dismissHint(HINT_KEY, hint), 6000);
  }

  // Programar re-render cuando empiece el próximo partido abierto
  const nextKickoff = upcomingDates
    .flatMap(date => MATCHES.filter(m => m[0] === date))
    .filter(m => isBetOpen(m))
    .map(m => spainToUTC(m[0], m[1]) - 5 * 60 * 1000)
    .filter(t => t > Date.now())
    .sort()[0];
  if (nextKickoff) {
    setTimeout(() => {
      const subEl = document.getElementById('qnl-subcontent');
      if (subEl && qnlSubTab === 'apostar') renderApostar(subEl);
    }, nextKickoff - Date.now() + 1000);
  }
}

function toggleBetDropdown(mid) {
  document.getElementById('bdrop-' + mid)?.classList.toggle('hidden');
}

async function toggleGroupBets(mid, btn) {
  const el = document.getElementById('gbets-' + mid);
  if (!el.classList.contains('hidden')) {
    el.classList.add('hidden');
    btn.textContent = 'Ver grupo';
    return;
  }

  btn.textContent = 'Cargando…';
  const matchObj = MATCHES.find(m => matchId(m) === mid);
  const betOpen  = matchObj ? isBetOpen(matchObj) : false;
  const double   = isSpainMatch(mid);

  const [groupUserIds, resultsMap] = await Promise.all([
    ensureGroupUserIds(),
    getMatchResults(),
  ]);
  const oldMids = Object.entries(OLD_THIRD_PLACE_BET_IDS).filter(([, v]) => v === mid).map(([k]) => k);
  const midsToQuery = oldMids.length ? [mid, ...oldMids] : [mid];
  const { data: betsRaw } = await db.from('bets')
    .select('home_score, away_score, qualifier, user_id, users(name)')
    .in('match_id', midsToQuery)
    .in('user_id', groupUserIds);
  // Deduplicate: prefer bet under current ID if user has both
  const seenUsers = new Set();
  const bets = (betsRaw || []).sort(b => b.match_id === mid ? -1 : 1).filter(b => {
    if (seenUsers.has(b.user_id)) return false;
    seenUsers.add(b.user_id);
    return true;
  });
  const raw_r = resultsMap[mid];
  const result = raw_r ? {
    home_score: raw_r.home_90 ?? raw_r.home,
    away_score: raw_r.away_90 ?? raw_r.away,
    status: raw_r.status,
    phase: raw_r.phase,
    winner: raw_r.winner,
  } : null;

  if (!bets?.length) {
    el.innerHTML = '<div class="group-bets-list"><p style="font-size:12px;color:var(--muted);text-align:center;padding:4px">Nadie ha apostado en este partido</p></div>';
    el.classList.remove('hidden');
    btn.textContent = 'Ocultar';
    return;
  }

  const isLiveResult = result?.status === 'live';
  const [matchHome, matchAway] = matchObj ? resolveTeams(matchObj) : ['', ''];
  const _rWinner = result?.winner ?? (result?.phase === 'knockout' && result?.status === 'ft'
    ? (result.home_score > result.away_score ? 'home' : result.home_score < result.away_score ? 'away' : null)
    : null);
  const advLabel = result?.phase === 'knockout' && _rWinner && !isLiveResult
    ? ` · Pasa: <strong>${_rWinner === 'home' ? matchHome : matchAway}</strong>`
    : '';
  const resultHeader = result
    ? `<div style="font-size:11px;color:${isLiveResult?'var(--pos)':'var(--muted)'};text-align:center;margin-bottom:8px">
         ${isLiveResult ? '● En vivo' : 'Resultado'}: <strong style="color:var(--text)">${result.home_score} – ${result.away_score}</strong>${advLabel}
       </div>`
    : '';

  const isKnockoutMatch = matchObj?.phase === 'knockout' || (matchObj && matchObj[7] !== 'groups');
  const rows = bets
    .sort((a, b) => {
      const pA = calcPoints(a, result, double) ?? -1;
      const pB = calcPoints(b, result, double) ?? -1;
      return pB - pA;
    })
    .map(b => {
      const isMe     = b.user_id === qnlUser?.id;
      const isLeader = isKnockoutMatch && b.user_id === _koLeaderId;
      const pts      = calcPoints(b, result, double);
      const showScore = !betOpen || isMe || isLeader;
      const qualStr = result?.phase === 'knockout' && showScore
        ? ` · pasa: ${b.qualifier ? (b.qualifier === 'home' ? matchHome : matchAway) : '?'}`
        : '';
      const crown = isLeader && betOpen ? ' 👑' : '';
      const score = showScore
        ? `${b.home_score} – ${b.away_score}${qualStr}`
        : `<span style="color:var(--muted)">? – ?</span>`;
      return `<div class="group-bet-row">
        <span class="gb-name">${escHtml(b.users.name)}${isMe ? ' 👈' : ''}${crown}</span>
        <span class="gb-score">${score}</span>
        ${pts !== null ? ptsLabel(pts) : ''}
      </div>`;
    }).join('');

  el.innerHTML = `<div class="group-bets-list">${resultHeader}${rows}</div>`;
  el.classList.remove('hidden');
  btn.textContent = 'Ocultar';
}

function enableBetEdit(mid) {
  document.getElementById('ro-' + mid)?.classList.add('hidden');
  document.getElementById('ed-' + mid)?.classList.remove('hidden');
}

function cancelBetEdit(mid) {
  document.getElementById('ro-' + mid)?.classList.remove('hidden');
  document.getElementById('ed-' + mid)?.classList.add('hidden');
}

// NOTA: Ejecutar en Supabase: ALTER TABLE bets ADD COLUMN IF NOT EXISTS qualifier TEXT;
async function submitBet(mid) {
  const hEl = document.getElementById('h-' + mid);
  const aEl = document.getElementById('a-' + mid);
  const home_score = parseInt(hEl?.value, 10);
  const away_score = parseInt(aEl?.value, 10);

  if (isNaN(home_score) || isNaN(away_score) || home_score < 0 || away_score < 0) {
    alert('Introduce un resultado válido (números ≥ 0).');
    return;
  }
  const m = MATCHES.find(x => matchId(x) === mid);
  if (!m || !isBetOpen(m)) {
    alert('Las apuestas para este partido ya están cerradas.');
    return;
  }

  // Gestión del clasificado en eliminatorias
  const isKnockout = m[7] !== 'groups';
  let qualifier = null;
  if (isKnockout) {
    const bqEl = document.getElementById('bq-' + mid);
    qualifier = bqEl?.getAttribute('data-qualifier') || null;
    // Auto-derivar clasificado a partir del marcador si no es empate
    if (!qualifier) {
      if (home_score > away_score) qualifier = 'home';
      else if (away_score > home_score) qualifier = 'away';
    }
    // Empate sin clasificado seleccionado: pedir al usuario
    if (!qualifier) {
      alert('En eliminatorias con empate a 90 min debes seleccionar quién pasa (ET/penaltis).');
      return;
    }
  }

  const btn = document.querySelector(`[onclick="submitBet('${mid}')"]`);
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }
  // Borrar apuestas bajo IDs viejos para este partido (evita doble puntuación)
  const oldIds = Object.entries(OLD_THIRD_PLACE_BET_IDS)
    .filter(([, v]) => v === mid).map(([k]) => k);
  if (oldIds.length) {
    await db.from('bets').delete().eq('user_id', qnlUser.id).in('match_id', oldIds);
  }
  const payload = { user_id: qnlUser.id, match_id: mid, home_score, away_score };
  if (isKnockout) payload.qualifier = qualifier;
  const { error } = await db.from('bets').upsert(payload, { onConflict: 'user_id,match_id' });
  if (error) { alert('Error al guardar. Inténtalo de nuevo.'); return; }
  qnlBets[mid] = { match_id: mid, home_score, away_score, qualifier };
  qnlBetsDirty = true;
  showToast('✓ Apuesta guardada');
  const el = document.getElementById('qnl-subcontent');
  if (el) await renderApostar(el);
}

// ── Mis apuestas ───────────────────────────────────────────────

async function renderMisApuestas(el) {
  qnlBetsDirty = true;
  await loadMyBets();
  const myBets = Object.values(qnlBets);
  if (!myBets.length) {
    el.innerHTML = '<div class="empty">Todavía no has hecho ninguna apuesta.</div>';
    return;
  }

  const raw = await getMatchResults();
  const resultMap = {};
  Object.entries(raw).forEach(([id, r]) => {
    resultMap[id] = {
      home_score: r.home_90 ?? r.home,
      away_score: r.away_90 ?? r.away,
      status: r.status,
      phase: r.phase,
      winner: r.winner,
    };
  });

  const lookup = {};
  MATCHES.forEach(m => { lookup[matchId(m)] = m; });
  for (const [oldId, newId] of Object.entries(OLD_THIRD_PLACE_BET_IDS)) {
    if (!lookup[oldId] && lookup[newId]) lookup[oldId] = lookup[newId];
  }

  const hot = [], past = [];
  myBets.forEach(b => {
    const m = lookup[b.match_id];
    if (!m) return;
    (isMatchStarted(m) ? past : hot).push(b);
  });
  hot.sort((a, b) => {
    const ma = lookup[a.match_id], mb = lookup[b.match_id];
    return (ma[0] + ma[1]).localeCompare(mb[0] + mb[1]);
  });
  past.sort((a, b) => {
    const ma = lookup[a.match_id], mb = lookup[b.match_id];
    return (mb[0] + mb[1]).localeCompare(ma[0] + ma[1]);
  });

  const hotCards = hot.map(b => {
    const m    = lookup[b.match_id];
    const mid  = b.match_id;
    const open = isBetOpen(m);
    const [home, away] = resolveTeams(m);
    const hasBet = b.home_score !== undefined && b.home_score !== null;
    const isKnockoutHot = m[7] !== 'groups';

    const inpHot = (id, val) => `<input class="bet-score-input" type="number" min="0" max="20" id="${id}" value="${val}" placeholder="0"${isKnockoutHot ? ` oninput="updateQualifierFromScore('${mid}')"` : ''}>`;
    const qEditHot = (curQ) => {
      if (!isKnockoutHot) return '';
      const hf = FLAGS_MAP[home] || '', af = FLAGS_MAP[away] || '';
      return `<div class="bq-row" id="bq-${mid}" data-qualifier="${curQ || ''}">
        <span class="bq-label">¿Pasa?</span>
        <button class="bq-btn${curQ === 'home' ? ' bq-active' : ''}" onclick="selectQualifier('${mid}','home')">${hf} ${home}</button>
        <button class="bq-btn${curQ === 'away' ? ' bq-active' : ''}" onclick="selectQualifier('${mid}','away')">${af} ${away}</button>
      </div>`;
    };
    const qReadHot = (curQ) => {
      if (!isKnockoutHot || !curQ) return '';
      const name = curQ === 'home' ? home : away;
      const flag = curQ === 'home' ? (FLAGS_MAP[home] || '') : (FLAGS_MAP[away] || '');
      return `<div class="bq-row"><span class="bq-label">Pasa:</span><span class="bq-val">${flag} ${name}</span></div>`;
    };

    // Primera vez sin apuesta y ventana abierta → formulario
    const body = (!hasBet && open) ? `
        ${betRow(home, away, `${inpHot('h-' + mid, '')}<span class="bet-dash">–</span>${inpHot('a-' + mid, '')}`)}
        ${qEditHot(null)}
        <div class="bet-actions">
          <button class="bet-submit" onclick="submitBet('${mid}')">+ Apostar</button>
        </div>
        <div class="bet-lock-info">Cierra 5 min antes del pitido</div>` : `
        ${betRow(home, away, `<span class="bsr-score">${b.home_score ?? '–'}</span><span class="bet-dash">–</span><span class="bsr-score">${b.away_score ?? '–'}</span>`)}
        ${qReadHot(b.qualifier)}
        <div class="bet-actions">
          ${hasBet ? '<span class="bet-saved">✓ Apuesta guardada</span>' : `<span class="bet-closed">Apuestas cerradas</span>`}
        </div>`;
    return `
      <div class="bet-card" style="border-color:rgba(232,200,74,.35)">
        <div class="bet-meta">${fmtDate(m[0])} · <span class="${isNight(m[1])?'night':''}">${m[1]}${isNight(m[1])?' 🌙':''}</span></div>
        ${body}
      </div>`;
  }).join('');

  const pastCards = past.map(b => {
    const m        = lookup[b.match_id];
    const [home, away] = resolveTeams(m);
    const result   = resultMap[b.match_id];
    const double   = m[6] === 1;
    const pts      = calcPoints(b, result, double);
    const started  = isMatchStarted(m);

    const doubleBadge = double ? `<span class="bet-double-badge">🇪🇸 ×2</span>` : '';
    const isLiveBet = result?.status === 'live';
    const isKO = result?.phase === 'knockout';
    const koWinner = result?.winner ?? (isKO && result?.status === 'ft'
      ? (result.home_score > result.away_score ? 'home' : result.home_score < result.away_score ? 'away' : null)
      : null);
    const betQualHtml = isKO && b.qualifier
      ? `<div class="bq-row"><span class="bq-label">Apostaste pasa:</span><span class="bq-val">${b.qualifier === 'home' ? (FLAGS_MAP[home] || '') + ' ' + home : (FLAGS_MAP[away] || '') + ' ' + away}</span></div>`
      : '';
    const advHtml = isKO && koWinner && !isLiveBet
      ? ` · pasa ${koWinner === 'home' ? (FLAGS_MAP[home] || '') + ' ' + home : (FLAGS_MAP[away] || '') + ' ' + away}`
      : '';
    const resultSection = result ? `
      <div class="bet-result-row">
        <span class="bet-result-label" style="${isLiveBet?'color:var(--pos)':''}">${isLiveBet?'● En vivo':'Resultado'}</span>
        <span class="bet-result-score">${result.home_score} – ${result.away_score}${advHtml}</span>
        ${ptsLabel(pts)}
      </div>` : '';

    const verGrupo = started ? `
      <div class="bet-actions" style="margin-top:10px">
        <button class="bet-toggle-bets" onclick="toggleGroupBets('${b.match_id}',this)">Ver apuestas del grupo</button>
      </div>
      <div id="gbets-${b.match_id}" class="hidden"></div>` : '';

    return `
      <div class="bet-card${double ? ' spain-double' : ''}">
        ${doubleBadge}
        <div class="bet-meta">${fmtDate(m[0])} · <span class="${isNight(m[1])?'night':''}">${m[1]}${isNight(m[1])?' 🌙':''}</span></div>
        ${betRow(home, away, `<span class="bsr-score">${b.home_score}</span><span class="bet-dash">–</span><span class="bsr-score">${b.away_score}</span>`)}
        ${betQualHtml}
        ${resultSection}${verGrupo}
      </div>`;
  }).join('');

  let html = '';
  if (hot.length) html += `<div class="mis-section-title">🔥 Apuestas calientes</div>${hotCards}`;
  html += `<div class="mis-section-title"${hot.length ? ' style="margin-top:20px"' : ''}>📋 Apuestas pasadas</div>`;
  html += pastCards || '<div class="empty" style="margin-bottom:12px">Aún no tienes apuestas pasadas.</div>';

  el.innerHTML = html;
}

// ── Clasificación ──────────────────────────────────────────────

let lbScope = 'group';
let torneoLbScope = 'group';

async function setLbScope(scope) {
  lbScope = scope;
  const el = document.getElementById('qnl-subcontent');
  if (!el) return;
  el.innerHTML = '<div class="empty">Cargando clasificación…</div>';
  await renderClasificacion(el);
}

async function setTorneoLbScope(scope) {
  torneoLbScope = scope;
  const el = document.getElementById('qnl-torneo-content');
  if (!el) return;
  el.innerHTML = '<div class="empty">Cargando…</div>';
  await renderTorneoClasificacion(el);
}

async function fetchAllBets() {
  const PAGE = 1000;
  let all = [], page = 0;
  while (true) {
    const { data } = await db.from('bets')
      .select('user_id, match_id, home_score, away_score, qualifier')
      .range(page * PAGE, (page + 1) * PAGE - 1);
    if (!data?.length) break;
    all = all.concat(data);
    if (data.length < PAGE) break;
    page++;
  }
  return all;
}

async function renderClasificacion(el) {
  const [[{ data: allUsers }, raw], bets] = await Promise.all([
    Promise.all([
      db.from('users').select('id, name, group_id'),
      getMatchResults(),
    ]),
    fetchAllBets(),
  ]);

  if (!allUsers?.length) {
    el.innerHTML = '<div class="empty">Aún no hay participantes.</div>';
    return;
  }

  const users = lbScope === 'group'
    ? allUsers.filter(u => u.group_id === qnlGroup?.id)
    : allUsers;

  const toggle = `
    <div class="lb-scope-bar">
      <button class="lb-scope-btn${lbScope==='group'?' active':''}" onclick="setLbScope('group')">Mi grupo</button>
      <button class="lb-scope-btn${lbScope==='all'?' active':''}" onclick="setLbScope('all')">Todos</button>
    </div>`;

  const resultMap = {};
  Object.entries(raw).forEach(([id, r]) => {
    resultMap[id] = {
      home_score: r.home_90 ?? r.home,
      away_score: r.away_90 ?? r.away,
      status: r.status,
      phase: r.phase,
      winner: r.winner,
    };
  });
  const hasResults = Object.keys(raw).length > 0;

  const stats = {};
  users.forEach(u => { stats[u.id] = { id: u.id, name: u.name, group_id: u.group_id, apuestas: 0, exactos: 0, ganadores: 0, pts: 0 }; });
  // Deduplicar: si un usuario tiene bet bajo ID viejo Y nuevo, contar solo una vez
  const seenBets = new Set();
  (bets || []).forEach(b => {
    if (!stats[b.user_id]) return;
    const normalMid = OLD_THIRD_PLACE_BET_IDS[b.match_id] ?? b.match_id;
    const dedupeKey = `${b.user_id}|${normalMid}`;
    if (seenBets.has(dedupeKey)) return;
    seenBets.add(dedupeKey);
    stats[b.user_id].apuestas++;
    const r = resultMap[b.match_id];
    if (r) {
      const double   = isSpainMatch(normalMid);
      const pts      = calcPoints(b, r, double);
      const basePts  = double ? pts / 2 : pts;
      stats[b.user_id].pts += pts;
      if (basePts >= 3) stats[b.user_id].exactos++;
      if (basePts === 1) stats[b.user_id].ganadores++;
    }
  });

  const board = Object.values(stats)
    .sort((a,b) => b.pts - a.pts || b.exactos - a.exactos || b.ganadores - a.ganadores || b.apuestas - a.apuestas || a.name.localeCompare(b.name));

  const rows = board.map((u, i) => {
    const isMe = u.id === qnlUser?.id;
    const groupBadge = lbScope === 'all'
      ? `<span class="lb-group-badge">${GROUPS.find(g => g.id === u.group_id)?.id || '?'}</span>`
      : '';
    return `<tr${isMe ? ' class="me"' : ''}>
      <td class="lb-rank">${i+1}</td>
      <td class="lb-name">${escHtml(u.name)}${isMe ? ' 👈' : ''}${groupBadge}</td>
      <td>${u.apuestas}</td>
      <td>${u.exactos}</td>
      <td>${u.ganadores}</td>
      <td class="lb-pts">${u.pts}</td>
    </tr>`;
  }).join('');

  const note = !hasResults
    ? `<p style="font-size:11px;color:var(--muted);margin-bottom:12px">Los puntos se activarán cuando haya resultados.</p>`
    : '';

  el.innerHTML = `
    ${toggle}
    ${note}
    <table class="lb-table">
      <thead><tr>
        <th>#</th>
        <th class="lb-name">Nombre</th>
        <th title="Apuestas realizadas">Ap.</th>
        <th title="Resultados exactos (3-4 pts)">✓✓</th>
        <th title="Ganador correcto (1 pt)">✓</th>
        <th>Pts</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ── Admin: login + backup ──────────────────────────────────────

function renderQnlAdmin() {
  const el = document.getElementById('qnl-admin-section');
  if (!el) return;
  if (qnlAdminUnlocked) {
    el.innerHTML = `
      <div class="qnl-admin-section">
        <button class="qnl-admin-export" onclick="exportBackup(this)">↓ Descargar backup completo</button>
      </div>`;
    return;
  }
  el.innerHTML = `
    <div class="qnl-admin-section">
      <button class="qnl-admin-toggle" onclick="qnlShowAdminForm()">admin</button>
    </div>`;
}

function qnlShowAdminForm() {
  const el = document.getElementById('qnl-admin-section');
  if (!el) return;
  el.innerHTML = `
    <div class="qnl-admin-section">
      <div class="qnl-admin-form">
        <input type="password" class="qnl-admin-input" id="qnl-admin-pass" placeholder="Contraseña admin"
          onkeydown="if(event.key==='Enter')qnlAdminLogin()">
        <button class="qnl-admin-submit" onclick="qnlAdminLogin()">Entrar</button>
      </div>
      <div class="qnl-admin-err" id="qnl-admin-err"></div>
    </div>`;
  document.getElementById('qnl-admin-pass')?.focus();
}

async function qnlAdminLogin() {
  const val = document.getElementById('qnl-admin-pass')?.value;
  if (!val) return;
  const hash = await hashStr(val + ADMIN_SALT);
  if (hash !== ADMIN_HASH) {
    document.getElementById('qnl-admin-err').textContent = 'Contraseña incorrecta.';
    return;
  }
  qnlAdminUnlocked = true;
  renderQnlAdmin();
}

async function exportBackup(btn) {
  if (btn) { btn.disabled = true; btn.textContent = 'Exportando…'; }

  const [usersRes, betsRes, torneoRes] = await Promise.all([
    db.from('users').select('*'),
    db.from('bets').select('*'),
    db.from('tournament_bets').select('*'),
  ]);

  const userMap = {};
  (usersRes.data || []).forEach(u => { userMap[u.id] = u; });

  const backup = { exported: new Date().toISOString(), groups: {} };
  GROUPS.forEach(g => { backup.groups[g.id] = { name: g.name, users: {} }; });

  (usersRes.data || []).forEach(u => {
    const gid = u.group_id || 'sin_grupo';
    if (!backup.groups[gid]) backup.groups[gid] = { name: gid, users: {} };
    backup.groups[gid].users[u.name] = { bets: {}, torneo: null };
  });

  (betsRes.data || []).forEach(b => {
    const u = userMap[b.user_id];
    if (!u) return;
    const gid = u.group_id || 'sin_grupo';
    if (!backup.groups[gid]?.users[u.name]) return;
    backup.groups[gid].users[u.name].bets[b.match_id] = { home: b.home_score, away: b.away_score };
  });

  (torneoRes.data || []).forEach(t => {
    const u = userMap[t.user_id];
    if (!u) return;
    const gid = u.group_id || 'sin_grupo';
    if (!backup.groups[gid]?.users[u.name]) return;
    backup.groups[gid].users[u.name].torneo = {
      winner: t.winner, finalist: t.finalist, spain_round: t.spain_round,
      top_scorer: t.top_scorer, best_keeper: t.best_keeper, surprise: t.surprise,
    };
  });

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_apuestas_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);

  if (btn) { btn.disabled = false; btn.textContent = 'Backup'; }
  showToast('Backup descargado');
}
