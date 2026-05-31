const SUPABASE_URL = 'https://zdghmnaiuqcqoezvaxum.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZ2htbmFpdXFjcW9lenZheHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNDkxMDEsImV4cCI6MjA5NTYyNTEwMX0.o9Y_dKF2fqVkjROW4iOMQ5rE_FH3TXZJPWctkALPbw0';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const GROUPS = [
  {
    id:      'cachorros',
    name:    'Cachorros',
    salt:    'mundial26',
    hash:    'b24ba0c12cce455ff311de58f936c129e1eea744e6cf37d0f93afb59ee1cfbc6',
    members: ['Nacho','Sergio','Edu','Alex','Javi','Jorge','Martín','Martinez','Ghobas','Portero','Gonza'],
  },
];

let qnlUser       = null;
let qnlGroup      = null;
let qnlMode       = 'home';   // 'home' | 'partidos' | 'torneo'
let qnlSubTab     = 'apostar';
let qnlTorneoSub  = 'apuesta';
let qnlBets       = {};
let qnlLoaded     = false;
let qnlTorneoBet  = null;
let qnlBetsDirty  = true;

const SPAIN_ROUNDS = [
  'Fase de grupos', '1/32 de final', 'Octavos de final',
  'Cuartos de final', 'Semifinal', 'Finalista', 'Campeón 🏆',
];

const ALL_TEAMS = [...new Set(
  MATCHES.filter(m => m[7] === 'groups')
    .flatMap(m => m[2].split('·')[0].trim().split(' vs ').map(t => t.trim()))
)].sort((a, b) => a.localeCompare(b, 'es'));

function isTorneoOpen() {
  return Date.now() < MUNDIAL_START_MS;
}

// ── Helpers ────────────────────────────────────────────────────

function matchId(m) {
  const label = m[2].split('·')[0].trim().replace(/\s+vs\s+/g,'_vs_').replace(/\s/g,'');
  return `${m[0]}_${m[1]}_${label}`;
}

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
  // El primer partido (11 jun) se puede apostar desde cualquier día antes del pitido
  // El resto solo se puede apostar el mismo día del partido
  if (m[0] !== spainToday() && m[0] > '2026-06-11') return false;
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
function calcPoints(bet, result) {
  if (!result) return null;
  if (bet.home_score === result.home_score && bet.away_score === result.away_score) return 3;
  const bOut = Math.sign(bet.home_score - bet.away_score);
  const rOut = Math.sign(result.home_score - result.away_score);
  return bOut === rOut ? 1 : 0;
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
  if (pts === 3) return '<span class="gb-pts-exact">+3 exacto!</span>';
  if (pts === 1) return '<span class="gb-pts-win">+1 ganador</span>';
  if (pts === 0) return '<span class="gb-pts-miss">0 pts</span>';
  return '';
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
  if (qnlLoaded && qnlUser) { renderQnlContainer(); return; }
  wrap.innerHTML = '<div class="empty">Cargando…</div>';
  const uid = localStorage.getItem('qnl_uid');
  const gid = localStorage.getItem('qnl_gid');
  if (uid && gid) {
    const group = GROUPS.find(g => g.id === gid);
    if (group) {
      const { data } = await db.from('users').select('*').eq('id', uid).maybeSingle();
      if (data) {
        qnlUser  = data;
        qnlGroup = group;
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
    `<button class="qnl-picker-btn" onclick="qnlPickFriend('${name}')">${name}</button>`
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

  const { data: existing } = await db.from('users').select('*').eq('name', name).maybeSingle();
  if (existing) {
    qnlUser = existing;
  } else {
    const { data, error } = await db.from('users').insert({ name }).select().maybeSingle();
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
  localStorage.removeItem('qnl_uid');
  localStorage.removeItem('qnl_gid');
  qnlUser   = null;
  qnlGroup  = null;
  qnlBets   = {};
  qnlLoaded = false;
  renderQnlGroupSelect();
}

async function loadMyBets() {
  if (!qnlUser || !qnlBetsDirty) return;
  const { data } = await db.from('bets').select('*').eq('user_id', qnlUser.id);
  qnlBets = {};
  (data || []).forEach(b => { qnlBets[b.match_id] = b; });
  qnlBetsDirty = false;
}

// ── Render shell ───────────────────────────────────────────────

function renderQnlContainer() {
  const wrap = document.getElementById('qnl-inner');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="qnl-header">
      <span class="qnl-user">Hola, ${qnlUser.name} 👋</span>
      <button class="qnl-logout" onclick="qnlLogout()">Cambiar usuario</button>
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

// ── Home: dos botones grandes ──────────────────────────────────

function renderQnlHome(el) {
  el.innerHTML = `
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
  if (qnlTorneoSub === 'apuesta')       await renderTorneoApuesta(el);
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
          value="${b.top_scorer||''}" maxlength="40" ${!open?'disabled':''}>
      </div>
      <div class="torneo-field">
        <label class="torneo-label">🧤 Mejor portero (Guante de Oro) <span class="torneo-pts">2 pts</span></label>
        <input class="qnl-input" id="tb-keeper" type="text" placeholder="Nombre del portero"
          value="${b.best_keeper||''}" maxlength="40" ${!open?'disabled':''}>
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

async function renderTorneoClasificacion(el) {
  const [{ data: users }, { data: bets }] = await Promise.all([
    db.from('users').select('id, name'),
    db.from('tournament_bets').select('*'),
  ]);

  if (!bets?.length) {
    el.innerHTML = '<div class="empty">Nadie ha hecho su apuesta de torneo aún.</div>';
    return;
  }

  const betByUser = {};
  bets.forEach(b => { betByUser[b.user_id] = b; });

  const torneoStarted = Date.now() >= MUNDIAL_START_MS;

  const rows = (users || [])
    .filter(u => betByUser[u.id])
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(u => {
      const b    = betByUser[u.id];
      const isMe = u.id === qnlUser?.id;
      const details = (torneoStarted || isMe)
        ? `<div class="torneo-lb-grid">
            <span class="torneo-lb-item"><span class="torneo-lb-cat">🏆 Campeón</span>${b.winner||'—'}</span>
            <span class="torneo-lb-item"><span class="torneo-lb-cat">🥈 Finalista</span>${b.finalist||'—'}</span>
            <span class="torneo-lb-item"><span class="torneo-lb-cat">🇪🇸 España</span>${b.spain_round||'—'}</span>
            <span class="torneo-lb-item"><span class="torneo-lb-cat">👟 Goleador</span>${b.top_scorer||'—'}</span>
            <span class="torneo-lb-item"><span class="torneo-lb-cat">🧤 Portero</span>${b.best_keeper||'—'}</span>
            <span class="torneo-lb-item"><span class="torneo-lb-cat">⭐ Sorpresa</span>${b.surprise||'—'}</span>
          </div>`
        : `<div style="font-size:11px;color:var(--muted);margin-top:4px">Apuesta enviada · Se revela al inicio del torneo</div>`;
      return `<div class="torneo-lb-row${isMe ? ' me' : ''}">
        <div class="torneo-lb-name">${u.name}${isMe ? ' 👈' : ''}</div>
        ${details}
      </div>`;
    }).join('');

  const note = torneoStarted
    ? `<p style="font-size:11px;color:var(--muted);margin-bottom:14px;text-align:center">Los puntos se activarán al finalizar el torneo.</p>`
    : `<p style="font-size:11px;color:var(--muted);margin-bottom:14px;text-align:center">Las predicciones se revelan cuando empiece el primer partido.</p>`;

  el.innerHTML = `${note}<div class="torneo-lb">${rows}</div>`;
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

// ── Apostar ────────────────────────────────────────────────────

async function renderApostar(el) {
  const today = spainToday();
  const upcomingDates = [...new Set(
    MATCHES.filter(m => m[0] >= today).map(m => m[0])
  )].sort().slice(0, 3);

  if (!upcomingDates.length) {
    el.innerHTML = '<div class="empty">El torneo ha finalizado.</div>';
    return;
  }

  const displayedIds = upcomingDates
    .flatMap(date => MATCHES.filter(m => m[0] === date))
    .map(m => matchId(m));

  const { data: groupBetsRaw } = await db
    .from('bets')
    .select('match_id, home_score, away_score, users(name)')
    .in('match_id', displayedIds);

  const groupBetsMap = {};
  (groupBetsRaw || []).forEach(b => {
    if (!groupBetsMap[b.match_id]) groupBetsMap[b.match_id] = [];
    groupBetsMap[b.match_id].push(b);
  });

  const memberCount = qnlGroup?.members?.length || 0;

  const sections = upcomingDates.map(date => {
    const label = date === today ? `Hoy · ${fmtDate(date)}` : fmtDate(date);
    const cards = MATCHES.filter(m => m[0] === date).map(m => {
      const mid     = matchId(m);
      const saved   = qnlBets[mid];
      const open    = isBetOpen(m);
      const started = isMatchStarted(m);
      const parts   = m[2].split('·')[0].split(' vs ');
      const home    = parts[0]?.trim() || '';
      const away    = parts[1]?.trim() || '';
      const bets    = groupBetsMap[mid] || [];

      const badge = `<span class="bet-count-badge">${bets.length}/${memberCount}</span>`;

      let dropContent;
      if (!bets.length) {
        dropContent = `<div style="font-size:12px;color:var(--muted);text-align:center;padding:2px 0">Nadie ha apostado aún</div>`;
      } else {
        const rows = bets.map(b => {
          const score = started
            ? `<span class="bdrop-score">${b.home_score} – ${b.away_score}</span>`
            : `<span class="bdrop-hidden">oculto</span>`;
          return `<div class="bdrop-row"><span>${b.users.name}</span>${score}</div>`;
        }).join('');
        const note = !started
          ? `<div class="bdrop-note">Los marcadores se revelan al inicio del partido</div>`
          : '';
        dropContent = rows + note;
      }

      const verGrupoBtn = started
        ? `<button class="bet-toggle-bets" onclick="toggleGroupBets('${mid}',this)">Ver grupo</button>`
        : '';

      let body;
      if (open && saved) {
        // Apuesta guardada + plazo abierto: lectura por defecto, edición al pulsar
        body = `
          <div id="ro-${mid}">
            <div class="bet-score-row">
              <span class="bet-team">${home}</span>
              <span style="font-family:'Bebas Neue';font-size:28px;color:var(--accent)">${saved.home_score}</span>
              <span class="bet-dash">-</span>
              <span style="font-family:'Bebas Neue';font-size:28px;color:var(--accent)">${saved.away_score}</span>
              <span class="bet-team">${away}</span>
            </div>
            <div class="bet-actions">
              <span class="bet-saved">✓ Apuesta guardada</span>
              <button class="bet-toggle-bets" onclick="enableBetEdit('${mid}')">✎ Editar</button>
            </div>
          </div>
          <div id="ed-${mid}" class="hidden">
            <div class="bet-score-row">
              <span class="bet-team">${home}</span>
              <input class="bet-score-input" type="number" min="0" max="20"
                     id="h-${mid}" value="${saved.home_score}" placeholder="0">
              <span class="bet-dash">-</span>
              <input class="bet-score-input" type="number" min="0" max="20"
                     id="a-${mid}" value="${saved.away_score}" placeholder="0">
              <span class="bet-team">${away}</span>
            </div>
            <div class="bet-actions">
              <button class="bet-submit" onclick="submitBet('${mid}')">✓ Guardar</button>
              <button class="bet-toggle-bets" onclick="cancelBetEdit('${mid}')">✕ Cancelar</button>
            </div>
            <div class="bet-lock-info">Cierra 5 min antes del pitido</div>
          </div>`;
      } else if (open) {
        // Sin apuesta previa: inputs directamente
        body = `
          <div class="bet-score-row">
            <span class="bet-team">${home}</span>
            <input class="bet-score-input" type="number" min="0" max="20"
                   id="h-${mid}" value="" placeholder="0">
            <span class="bet-dash">-</span>
            <input class="bet-score-input" type="number" min="0" max="20"
                   id="a-${mid}" value="" placeholder="0">
            <span class="bet-team">${away}</span>
          </div>
          <div class="bet-actions">
            <button class="bet-submit" onclick="submitBet('${mid}')">+ Apostar</button>
          </div>
          <div class="bet-lock-info">Cierra 5 min antes del pitido</div>`;
      } else if (saved) {
        body = `
          <div class="bet-score-row">
            <span class="bet-team">${home}</span>
            <span style="font-family:'Bebas Neue';font-size:28px;color:var(--accent)">${saved.home_score}</span>
            <span class="bet-dash">-</span>
            <span style="font-family:'Bebas Neue';font-size:28px;color:var(--accent)">${saved.away_score}</span>
            <span class="bet-team">${away}</span>
          </div>
          <div class="bet-actions"><span class="bet-saved">✓ Apuesta guardada</span>${verGrupoBtn}</div>
          <div id="gbets-${mid}" class="hidden"></div>`;
      } else {
        body = `
          <div class="bet-score-row" style="opacity:.45">
            <span class="bet-team">${home}</span>
            <span style="font-family:'Bebas Neue';font-size:28px;color:var(--muted)">-</span>
            <span class="bet-dash">-</span>
            <span style="font-family:'Bebas Neue';font-size:28px;color:var(--muted)">-</span>
            <span class="bet-team">${away}</span>
          </div>
          <div class="bet-actions"><span class="bet-closed">${started ? 'Partido en juego' : 'Apuestas cerradas'}</span>${verGrupoBtn}</div>
          <div id="gbets-${mid}" class="hidden"></div>`;
      }

      return `
        <div class="bet-card">
          ${badge}
          <div class="bet-card-header" onclick="toggleBetDropdown('${mid}')">
            <div class="bet-match-name">${home} vs ${away}</div>
            <div class="bet-meta">${m[1]} · ${m[3].split(',').pop().trim()}</div>
          </div>
          <div id="bdrop-${mid}" class="bet-dropdown hidden">${dropContent}</div>
          ${body}
        </div>`;
    }).join('');

    return `<div class="bet-day-label">${label}</div>${cards}`;
  }).join('');

  el.innerHTML = sections;
}

function toggleBetDropdown(mid) {
  document.getElementById('bdrop-' + mid)?.classList.toggle('hidden');
}

let _matchResults = null; // cache de standings.json matchResults

async function getMatchResults() {
  if (_matchResults) return _matchResults;
  try {
    const res = await fetch('./standings.json?t=' + Date.now());
    const data = await res.json();
    _matchResults = data.matchResults || {};
  } catch { _matchResults = {}; }
  return _matchResults;
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

  const [{ data: bets }, resultsMap] = await Promise.all([
    db.from('bets').select('home_score, away_score, user_id, users(name)').eq('match_id', mid),
    getMatchResults(),
  ]);
  const result = resultsMap[mid] ? { home_score: resultsMap[mid].home, away_score: resultsMap[mid].away } : null;

  if (!bets?.length) {
    el.innerHTML = '<div class="group-bets-list"><p style="font-size:12px;color:var(--muted);text-align:center;padding:4px">Nadie ha apostado en este partido</p></div>';
    el.classList.remove('hidden');
    btn.textContent = 'Ocultar';
    return;
  }

  const resultHeader = result
    ? `<div style="font-size:11px;color:var(--muted);text-align:center;margin-bottom:8px">
         Resultado: <strong style="color:var(--text)">${result.home_score} – ${result.away_score}</strong>
       </div>`
    : '';

  const rows = bets
    .sort((a, b) => {
      const pA = calcPoints(a, result) ?? -1;
      const pB = calcPoints(b, result) ?? -1;
      return pB - pA;
    })
    .map(b => {
      const isMe  = b.user_id === qnlUser?.id;
      const pts   = calcPoints(b, result);
      // Ocultar marcadores mientras las apuestas siguen abiertas, excepto la propia apuesta
      const score = (!betOpen || isMe)
        ? `${b.home_score} – ${b.away_score}`
        : `<span style="color:var(--muted)">? – ?</span>`;
      return `<div class="group-bet-row">
        <span class="gb-name">${b.users.name}${isMe ? ' 👈' : ''}</span>
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
  const btn = document.querySelector(`[onclick="submitBet('${mid}')"]`);
  if (btn) { btn.disabled = true; btn.textContent = 'Guardando…'; }
  const { error } = await db.from('bets').upsert(
    { user_id: qnlUser.id, match_id: mid, home_score, away_score },
    { onConflict: 'user_id,match_id' }
  );
  if (error) { alert('Error al guardar. Inténtalo de nuevo.'); return; }
  qnlBets[mid] = { match_id: mid, home_score, away_score };
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
    resultMap[id] = { home_score: r.home, away_score: r.away };
  });

  const lookup = {};
  MATCHES.forEach(m => { lookup[matchId(m)] = m; });

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
    const [home, away] = m[2].split('·')[0].split(' vs ').map(s => s.trim());
    const hasBet = b.home_score !== undefined && b.home_score !== null;

    // Primera vez sin apuesta y ventana abierta → formulario
    const body = (!hasBet && open) ? `
        <div class="bet-score-row" style="margin-top:10px">
          <span class="bet-team">${home}</span>
          <input class="bet-score-input" type="number" min="0" max="20"
                 id="h-${mid}" value="" placeholder="0">
          <span class="bet-dash">-</span>
          <input class="bet-score-input" type="number" min="0" max="20"
                 id="a-${mid}" value="" placeholder="0">
          <span class="bet-team">${away}</span>
        </div>
        <div class="bet-actions">
          <button class="bet-submit" onclick="submitBet('${mid}')">+ Apostar</button>
        </div>
        <div class="bet-lock-info">Cierra 5 min antes del pitido</div>` : `
        <div class="bet-score-row" style="margin-top:10px">
          <span class="bet-team">${home}</span>
          <span style="font-family:'Bebas Neue';font-size:28px;color:var(--accent)">${b.home_score ?? '–'}</span>
          <span class="bet-dash">-</span>
          <span style="font-family:'Bebas Neue';font-size:28px;color:var(--accent)">${b.away_score ?? '–'}</span>
          <span class="bet-team">${away}</span>
        </div>
        <div class="bet-actions">
          ${hasBet ? '<span class="bet-saved">✓ Apuesta guardada</span>' : `<span class="bet-closed">Apuestas cerradas</span>`}
        </div>`;
    return `
      <div class="bet-card" style="border-color:rgba(232,200,74,.35)">
        <div class="bet-match-name">${home} vs ${away}</div>
        <div class="bet-meta">${fmtDate(m[0])} · ${m[1]}</div>
        ${body}
      </div>`;
  }).join('');

  const pastCards = past.map(b => {
    const m       = lookup[b.match_id];
    const [home, away] = m[2].split('·')[0].split(' vs ').map(s => s.trim());
    const result  = resultMap[b.match_id];
    const pts     = calcPoints(b, result);
    const started = isMatchStarted(m);

    const resultSection = result ? `
      <div class="bet-result-row">
        <span style="color:var(--muted)">Resultado: <strong style="color:var(--text)">${result.home_score} – ${result.away_score}</strong></span>
        ${ptsLabel(pts)}
      </div>` : '';

    const verGrupo = started ? `
      <div class="bet-actions" style="margin-top:10px">
        <button class="bet-toggle-bets" onclick="toggleGroupBets('${b.match_id}',this)">Ver apuestas del grupo</button>
      </div>
      <div id="gbets-${b.match_id}" class="hidden"></div>` : '';

    return `
      <div class="bet-card">
        <div class="bet-match-name">${home} vs ${away}</div>
        <div class="bet-meta">${fmtDate(m[0])} · ${m[1]}</div>
        <div class="bet-score-row" style="margin-top:10px">
          <span class="bet-team">${home}</span>
          <span style="font-family:'Bebas Neue';font-size:28px;color:var(--accent)">${b.home_score}</span>
          <span class="bet-dash">-</span>
          <span style="font-family:'Bebas Neue';font-size:28px;color:var(--accent)">${b.away_score}</span>
          <span class="bet-team">${away}</span>
        </div>
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

async function renderClasificacion(el) {
  const [{ data: users }, { data: bets }, raw] = await Promise.all([
    db.from('users').select('id, name'),
    db.from('bets').select('user_id, match_id, home_score, away_score'),
    getMatchResults(),
  ]);

  if (!users?.length) {
    el.innerHTML = '<div class="empty">Aún no hay participantes.</div>';
    return;
  }

  const resultMap = {};
  Object.entries(raw).forEach(([id, r]) => {
    resultMap[id] = { home_score: r.home, away_score: r.away };
  });
  const hasResults = Object.keys(raw).length > 0;

  const stats = {};
  (users || []).forEach(u => { stats[u.id] = { id: u.id, name: u.name, apuestas: 0, exactos: 0, pts: 0 }; });
  (bets || []).forEach(b => {
    if (!stats[b.user_id]) return;
    stats[b.user_id].apuestas++;
    const r = resultMap[b.match_id];
    if (r) {
      const pts = calcPoints(b, r);
      stats[b.user_id].pts += pts;
      if (pts === 3) stats[b.user_id].exactos++;
    }
  });

  const board = Object.values(stats)
    .sort((a,b) => b.pts - a.pts || b.exactos - a.exactos || b.apuestas - a.apuestas || a.name.localeCompare(b.name));

  const rows = board.map((u, i) => {
    const isMe = u.id === qnlUser?.id;
    return `<tr${isMe ? ' class="me"' : ''}>
      <td class="lb-rank">${i+1}</td>
      <td class="lb-name">${u.name}${isMe ? ' 👈' : ''}</td>
      <td>${u.apuestas}</td>
      <td>${u.exactos}</td>
      <td class="lb-pts">${u.pts}</td>
    </tr>`;
  }).join('');

  const note = !hasResults
    ? `<p style="font-size:11px;color:var(--muted);margin-bottom:12px">Los puntos se activarán cuando haya resultados.</p>`
    : '';

  el.innerHTML = `
    ${note}
    <table class="lb-table">
      <thead><tr>
        <th>#</th>
        <th class="lb-name">Nombre</th>
        <th title="Apuestas realizadas">Ap.</th>
        <th title="Resultados exactos">✓✓</th>
        <th>Pts</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}
