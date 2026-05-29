const SUPABASE_URL = 'https://zdghmnaiuqcqoezvaxum.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZ2htbmFpdXFjcW9lenZheHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNDkxMDEsImV4cCI6MjA5NTYyNTEwMX0.o9Y_dKF2fqVkjROW4iOMQ5rE_FH3TXZJPWctkALPbw0';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let qnlUser    = null;
let qnlSubTab  = 'apostar';
let qnlBets    = {};
let qnlLoaded  = false;

// ── Helpers ────────────────────────────────────────────────────

function matchId(m) {
  const label = m[2].split('·')[0].trim().replace(/\s+vs\s+/g,'_vs_').replace(/\s/g,'');
  return `${m[0]}_${m[1]}_${label}`;
}

function isBetOpen(m) {
  const now = new Date();
  const todayCEST = new Date(now.getTime() + 2*3600*1000).toISOString().slice(0,10);
  if (m[0] !== todayCEST) return false;
  const [h,mn] = m[1].split(':').map(Number);
  const [y,mo,d] = m[0].split('-').map(Number);
  return now.getTime() < Date.UTC(y, mo-1, d, h-2, mn) - 5*60*1000;
}

function isMatchStarted(m) {
  const now = new Date();
  const [h,mn] = m[1].split(':').map(Number);
  const [y,mo,d] = m[0].split('-').map(Number);
  return now.getTime() >= Date.UTC(y, mo-1, d, h-2, mn);
}

function todayMatchesCEST() {
  const todayCEST = new Date(Date.now() + 2*3600*1000).toISOString().slice(0,10);
  return MATCHES.filter(m => m[0] === todayCEST);
}

// 3 pts resultado exacto · 1 pt ganador correcto · 0 pts fallo
function calcPoints(bet, result) {
  if (!result) return null;
  if (bet.home_score === result.home_score && bet.away_score === result.away_score) return 3;
  const bOut = Math.sign(bet.home_score - bet.away_score);
  const rOut = Math.sign(result.home_score - result.away_score);
  return bOut === rOut ? 1 : 0;
}

function ptsLabel(pts) {
  if (pts === 3) return '<span class="gb-pts-exact">+3 exacto!</span>';
  if (pts === 1) return '<span class="gb-pts-win">+1 ganador</span>';
  if (pts === 0) return '<span class="gb-pts-miss">0 pts</span>';
  return '';
}

// ── Auth ───────────────────────────────────────────────────────

let qnlAuthMode = 'login'; // 'login' | 'register'

async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(password + salt);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
}

async function loadQuiniela() {
  const wrap = document.getElementById('qnl-inner');
  if (!wrap) return;
  if (qnlLoaded && qnlUser) { renderQnlContainer(); return; }
  wrap.innerHTML = '<div class="empty">Cargando…</div>';
  const uid = localStorage.getItem('qnl_uid');
  if (uid) {
    const { data } = await db.from('users').select('*').eq('id', uid).maybeSingle();
    if (data) {
      qnlUser = data;
      await loadMyBets();
      qnlLoaded = true;
      renderQnlContainer();
      return;
    }
  }
  renderQnlAuth();
}

function renderQnlAuth() {
  const wrap = document.getElementById('qnl-inner');
  if (!wrap) return;
  const isLogin = qnlAuthMode === 'login';
  wrap.innerHTML = `
    <div class="qnl-register">
      <h2>Quiniela Cachorros</h2>
      <div class="qnl-auth-tabs">
        <button class="qnl-auth-tab ${isLogin ? 'active' : ''}" onclick="qnlSetAuthMode('login')">Entrar</button>
        <button class="qnl-auth-tab ${!isLogin ? 'active' : ''}" onclick="qnlSetAuthMode('register')">Registrarse</button>
      </div>
      <label class="qnl-label">Nombre</label>
      <input class="qnl-input" id="qnl-name" type="text" placeholder="Tu nombre o alias"
             maxlength="24" autocomplete="username" onkeydown="qnlAuthKey(event)">
      <label class="qnl-label">Contraseña</label>
      <input class="qnl-input" id="qnl-pass" type="password" placeholder="••••••••"
             autocomplete="${isLogin ? 'current-password' : 'new-password'}" onkeydown="qnlAuthKey(event)" style="margin-top:0">
      ${!isLogin ? `
      <label class="qnl-label">Confirmar contraseña</label>
      <input class="qnl-input" id="qnl-pass2" type="password" placeholder="••••••••"
             autocomplete="new-password" onkeydown="qnlAuthKey(event)" style="margin-top:0">` : ''}
      <button class="qnl-btn" id="qnl-auth-btn" onclick="${isLogin ? 'qnlLogin()' : 'qnlRegister()'}">
        ${isLogin ? 'Entrar' : 'Crear cuenta'}
      </button>
      <div class="qnl-error" id="qnl-error"></div>
    </div>`;
}

function qnlSetAuthMode(mode) {
  qnlAuthMode = mode;
  renderQnlAuth();
}

function qnlAuthKey(e) {
  if (e.key === 'Enter') qnlAuthMode === 'login' ? qnlLogin() : qnlRegister();
}

function qnlAuthError(msg) {
  const el = document.getElementById('qnl-error');
  if (el) el.textContent = msg;
  const btn = document.getElementById('qnl-auth-btn');
  if (btn) { btn.disabled = false; btn.textContent = qnlAuthMode === 'login' ? 'Entrar' : 'Crear cuenta'; }
}

async function qnlLogin() {
  const name = document.getElementById('qnl-name')?.value.trim();
  const pass = document.getElementById('qnl-pass')?.value;
  if (!name || !pass) { qnlAuthError('Rellena nombre y contraseña.'); return; }

  const btn = document.getElementById('qnl-auth-btn');
  btn.disabled = true; btn.textContent = 'Entrando…';

  const { data: user } = await db.from('users')
    .select('id, name, password_hash, salt')
    .eq('name', name)
    .maybeSingle();

  if (!user) { qnlAuthError('Usuario no encontrado.'); return; }

  const hash = await hashPassword(pass, user.salt);
  if (hash !== user.password_hash) { qnlAuthError('Contraseña incorrecta.'); return; }

  qnlUser = user;
  localStorage.setItem('qnl_uid', user.id);
  await loadMyBets();
  qnlLoaded = true;
  renderQnlContainer();
}

async function qnlRegister() {
  const name  = document.getElementById('qnl-name')?.value.trim();
  const pass  = document.getElementById('qnl-pass')?.value;
  const pass2 = document.getElementById('qnl-pass2')?.value;

  if (!name)             { qnlAuthError('Escribe un nombre.'); return; }
  if (!pass)             { qnlAuthError('Escribe una contraseña.'); return; }
  if (pass.length < 4)   { qnlAuthError('La contraseña debe tener al menos 4 caracteres.'); return; }
  if (pass !== pass2)    { qnlAuthError('Las contraseñas no coinciden.'); return; }

  const btn = document.getElementById('qnl-auth-btn');
  btn.disabled = true; btn.textContent = 'Creando cuenta…';

  const { data: existing } = await db.from('users').select('id').eq('name', name).maybeSingle();
  if (existing) { qnlAuthError('Ese nombre ya está en uso. Prueba con otro.'); return; }

  const salt = crypto.randomUUID();
  const password_hash = await hashPassword(pass, salt);

  const { data, error } = await db.from('users')
    .insert({ name, password_hash, salt })
    .select()
    .maybeSingle();

  if (error || !data) { qnlAuthError('Error al crear la cuenta. Inténtalo de nuevo.'); return; }

  qnlUser = data;
  localStorage.setItem('qnl_uid', data.id);
  qnlLoaded = true;
  renderQnlContainer();
}

function qnlLogout() {
  if (!confirm('¿Cerrar sesión?')) return;
  localStorage.removeItem('qnl_uid');
  qnlUser   = null;
  qnlBets   = {};
  qnlLoaded = false;
  qnlAuthMode = 'login';
  renderQnlAuth();
}

async function loadMyBets() {
  if (!qnlUser) return;
  const { data } = await db.from('bets').select('*').eq('user_id', qnlUser.id);
  qnlBets = {};
  (data || []).forEach(b => { qnlBets[b.match_id] = b; });
}

// ── Render shell ───────────────────────────────────────────────

function renderQnlRegistration() {
  const wrap = document.getElementById('qnl-inner');
  if (!wrap) return;
  wrap.innerHTML = `
    <div class="qnl-register">
      <h2>Quiniela Cachorros</h2>
      <p>Escribe tu nombre para apostar en cada partido<br>y ver la clasificación del grupo.</p>
      <input class="qnl-input" id="qnl-name-input" type="text"
             placeholder="Tu nombre o alias" maxlength="24" autocomplete="off"
             onkeydown="if(event.key==='Enter') qnlRegister()">
      <button class="qnl-btn" id="qnl-reg-btn" onclick="qnlRegister()">Entrar</button>
    </div>`;
}

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
    el.innerHTML = '<div class="empty">No hay partidos hoy.<br>Las apuestas abren el día del partido.</div>';
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
        ${resultSection}
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
