const SUPABASE_URL = 'https://zdghmnaiuqcqoezvaxum.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZ2htbmFpdXFjcW9lenZheHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNDkxMDEsImV4cCI6MjA5NTYyNTEwMX0.o9Y_dKF2fqVkjROW4iOMQ5rE_FH3TXZJPWctkALPbw0';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const GROUPS = [
  {
    id:      'cachorros',
    name:    'Cachorros',
    salt:    'mundial26',
    hash:    '211939a94e7efb9ad5a16c120f91e23a03976b898395e49a5cd26cc40b65fb7e',
    members: ['Nacho','Sergio','Edu','Alex','Javi','Jorge','Martín','Martinez','Ghobas','Portero','Gonza'],
  },
];

let qnlUser    = null;
let qnlGroup   = null;
let qnlSubTab  = 'apostar';
let qnlBets    = {};
let qnlLoaded  = false;

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
  const offsetH  = parseInt(refSpain.split('T')[1]) - 12; // +1 CET o +2 CEST
  return Date.UTC(y, mo-1, d, h - offsetH, mn);
}

function isBetOpen(m) {
  if (m[0] !== spainToday()) return false;
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
  if (!qnlUser) return;
  const { data } = await db.from('bets').select('*').eq('user_id', qnlUser.id);
  qnlBets = {};
  (data || []).forEach(b => { qnlBets[b.match_id] = b; });
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
    <div class="qnl-subtabs">
      <button class="qnl-stab ${qnlSubTab==='apostar'?'active':''}"        onclick="qnlSwitchSub('apostar')">Apostar</button>
      <button class="qnl-stab ${qnlSubTab==='misapuestas'?'active':''}"    onclick="qnlSwitchSub('misapuestas')">Mis apuestas</button>
      <button class="qnl-stab ${qnlSubTab==='clasificacion'?'active':''}"  onclick="qnlSwitchSub('clasificacion')">Clasificación</button>
    </div>
    <div id="qnl-subcontent"></div>`;
  renderQnlSubTab();
}

async function qnlSwitchSub(sub) {
  qnlSubTab = sub;
  document.querySelectorAll('.qnl-stab').forEach((b,i) =>
    b.classList.toggle('active', ['apostar','misapuestas','clasificacion'][i] === sub)
  );
  renderQnlSubTab();
}

async function renderQnlSubTab() {
  const el = document.getElementById('qnl-subcontent');
  if (!el) return;
  if (qnlSubTab === 'apostar') {
    await loadMyBets();
    renderApostar(el);
  } else if (qnlSubTab === 'misapuestas') {
    el.innerHTML = '<div class="empty">Cargando…</div>';
    await renderMisApuestas(el);
  } else if (qnlSubTab === 'clasificacion') {
    el.innerHTML = '<div class="empty">Cargando clasificación…</div>';
    await renderClasificacion(el);
  }
}

// ── Apostar ────────────────────────────────────────────────────

function renderApostar(el) {
  const today = todayMatchesCEST();
  if (!today.length) {
    const next = nextUpcomingMatch();
    let nextHtml = '';
    if (next) {
      const parts = next[2].split('·')[0].split(' vs ');
      const home = parts[0]?.trim() || '';
      const away = parts[1]?.trim() || '';
      nextHtml = `<div class="bet-card" style="margin-top:16px;border-color:rgba(232,200,74,.3)">
        <div style="font-size:10px;color:var(--accent);font-family:'Bebas Neue',sans-serif;letter-spacing:1px;margin-bottom:8px">Próximo partido</div>
        <div class="bet-match-name">${home} vs ${away}</div>
        <div class="bet-meta">${fmtDate(next[0])} · ${next[1]}</div>
      </div>`;
    }
    el.innerHTML = `<div class="empty">No hay partidos hoy.<br>Las apuestas abren el día del partido.</div>${nextHtml}`;
    return;
  }

  const cards = today.map(m => {
    const mid     = matchId(m);
    const saved   = qnlBets[mid];
    const open    = isBetOpen(m);
    const started = isMatchStarted(m);
    const parts   = m[2].split('·')[0].split(' vs ');
    const home    = parts[0]?.trim() || '';
    const away    = parts[1]?.trim() || '';

    const verGrupoBtn = started
      ? `<button class="bet-toggle-bets" onclick="toggleGroupBets('${mid}',this)">Ver grupo</button>`
      : '';

    let body;
    if (open) {
      body = `
        <div class="bet-score-row">
          <span class="bet-team">${home}</span>
          <input class="bet-score-input" type="number" min="0" max="20"
                 id="h-${mid}" value="${saved?.home_score ?? ''}" placeholder="0">
          <span class="bet-dash">-</span>
          <input class="bet-score-input" type="number" min="0" max="20"
                 id="a-${mid}" value="${saved?.away_score ?? ''}" placeholder="0">
          <span class="bet-team">${away}</span>
        </div>
        <div class="bet-actions">
          <button class="bet-submit" onclick="submitBet('${mid}')">${saved ? '✎ Actualizar' : '+ Apostar'}</button>
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
        <div class="bet-match-name">${home} vs ${away}</div>
        <div class="bet-meta">${m[1]} · ${m[3].split(',').pop().trim()}</div>
        ${body}
      </div>`;
  }).join('');

  el.innerHTML = cards;
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
    .sort((a,b) => {
      const pA = calcPoints(a, result) ?? -1;
      const pB = calcPoints(b, result) ?? -1;
      return pB - pA;
    })
    .map(b => {
      const isMe = b.user_id === qnlUser?.id;
      const pts  = calcPoints(b, result);
      return `<div class="group-bet-row">
        <span class="gb-name">${b.users.name}${isMe ? ' 👈' : ''}</span>
        <span class="gb-score">${b.home_score} – ${b.away_score}</span>
        ${pts !== null ? ptsLabel(pts) : ''}
      </div>`;
    }).join('');

  el.innerHTML = `<div class="group-bets-list">${resultHeader}${rows}</div>`;
  el.classList.remove('hidden');
  btn.textContent = 'Ocultar';
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
  const { error } = await db.from('bets').upsert(
    { user_id: qnlUser.id, match_id: mid, home_score, away_score },
    { onConflict: 'user_id,match_id' }
  );
  if (error) { alert('Error al guardar. Inténtalo de nuevo.'); return; }
  qnlBets[mid] = { match_id: mid, home_score, away_score };
  showToast('✓ Apuesta guardada');
  const el = document.getElementById('qnl-subcontent');
  if (el) renderApostar(el);
}

// ── Mis apuestas ───────────────────────────────────────────────

async function renderMisApuestas(el) {
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

  const cards = myBets.map(b => {
    const m = lookup[b.match_id];
    if (!m) return '';
    const parts = m[2].split('·')[0].split(' vs ');
    const home = parts[0]?.trim() || '';
    const away = parts[1]?.trim() || '';
    const result = resultMap[b.match_id];
    const pts = calcPoints(b, result);

    const resultSection = result ? `
      <div class="bet-result-row">
        <span style="color:var(--muted)">Resultado: <strong style="color:var(--text)">${result.home_score} – ${result.away_score}</strong></span>
        ${ptsLabel(pts)}
      </div>` : '';

    const started = isMatchStarted(m);
    const verGrupo = started ? `
      <div class="bet-actions" style="margin-top:10px">
        <button class="bet-toggle-bets" onclick="toggleGroupBets('${b.match_id}',this)">Ver apuestas del grupo</button>
      </div>
      <div id="gbets-${b.match_id}" class="hidden"></div>` : '';

    return `
      <div class="bet-card">
        <div class="bet-match-name">${home} vs ${away}</div>
        <div class="bet-meta">${m[0]} · ${m[1]}</div>
        <div class="bet-score-row" style="margin-top:10px">
          <span class="bet-team">${home}</span>
          <span style="font-family:'Bebas Neue';font-size:28px;color:var(--accent)">${b.home_score}</span>
          <span class="bet-dash">-</span>
          <span style="font-family:'Bebas Neue';font-size:28px;color:var(--accent)">${b.away_score}</span>
          <span class="bet-team">${away}</span>
        </div>
        ${resultSection}${verGrupo}
      </div>`;
  }).filter(Boolean).join('');

  el.innerHTML = cards || '<div class="empty">No se encontraron apuestas.</div>';
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
