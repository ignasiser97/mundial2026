const SUPABASE_URL = 'https://zdghmnaiuqcqoezvaxum.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpkZ2htbmFpdXFjcW9lenZheHVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNDkxMDEsImV4cCI6MjA5NTYyNTEwMX0.o9Y_dKF2fqVkjROW4iOMQ5rE_FH3TXZJPWctkALPbw0';
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let qnlUser    = null;
let qnlSubTab  = 'apostar';
let qnlBets    = {};
let qnlLoaded  = false;

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
  const kickoffUTC = Date.UTC(y, mo-1, d, h-2, mn);
  return now.getTime() < kickoffUTC - 5*60*1000;
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

async function loadQuiniela() {
  const wrap = document.getElementById('qnl-inner');
  if (!wrap) return;

  if (qnlLoaded && qnlUser) { renderQnlContainer(); return; }

  wrap.innerHTML = '<div class="empty">Cargando…</div>';

  const uid  = localStorage.getItem('qnl_uid');
  const name = localStorage.getItem('qnl_name');

  if (uid && name) {
    const { data } = await db.from('users').select('*').eq('id', uid).maybeSingle();
    if (data) {
      qnlUser = data;
      await loadMyBets();
      qnlLoaded = true;
      renderQnlContainer();
      return;
    }
  }
  renderQnlRegistration();
}

async function qnlRegister() {
  const input = document.getElementById('qnl-name-input');
  const name  = (input?.value || '').trim();
  if (!name) { input?.focus(); return; }

  const btn = document.getElementById('qnl-reg-btn');
  btn.disabled = true;
  btn.textContent = 'Entrando…';

  const { data, error } = await db.from('users').insert({ name }).select().maybeSingle();
  if (error || !data) {
    btn.disabled = false;
    btn.textContent = 'Entrar';
    alert('Error al registrarse. Inténtalo de nuevo.');
    return;
  }

  qnlUser = data;
  localStorage.setItem('qnl_uid',  data.id);
  localStorage.setItem('qnl_name', data.name);
  qnlLoaded = true;
  renderQnlContainer();
}

function qnlLogout() {
  if (!confirm('¿Cambiar de usuario? En este dispositivo perderás el acceso a tu cuenta.')) return;
  localStorage.removeItem('qnl_uid');
  localStorage.removeItem('qnl_name');
  qnlUser   = null;
  qnlBets   = {};
  qnlLoaded = false;
  renderQnlRegistration();
}

async function loadMyBets() {
  if (!qnlUser) return;
  const { data } = await db.from('bets').select('*').eq('user_id', qnlUser.id);
  qnlBets = {};
  (data || []).forEach(b => { qnlBets[b.match_id] = b; });
}

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
  document.querySelectorAll('.qnl-stab').forEach((b,i) => {
    b.classList.toggle('active', ['apostar','misapuestas','clasificacion'][i] === sub);
  });
  renderQnlSubTab();
}

async function renderQnlSubTab() {
  const el = document.getElementById('qnl-subcontent');
  if (!el) return;
  if (qnlSubTab === 'apostar')       { await loadMyBets(); renderApostar(el); }
  else if (qnlSubTab === 'misapuestas')  renderMisApuestas(el);
  else if (qnlSubTab === 'clasificacion') {
    el.innerHTML = '<div class="empty">Cargando clasificación…</div>';
    await renderClasificacion(el);
  }
}

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
          <button class="bet-submit" onclick="submitBet('${mid}')">
            ${saved ? '✎ Actualizar' : '+ Apostar'}
          </button>
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
        <div class="bet-actions"><span class="bet-saved">✓ Apuesta guardada</span></div>`;
    } else {
      body = `
        <div class="bet-score-row" style="opacity:.45">
          <span class="bet-team">${home}</span>
          <span style="font-family:'Bebas Neue';font-size:28px;color:var(--muted)">-</span>
          <span class="bet-dash">-</span>
          <span style="font-family:'Bebas Neue';font-size:28px;color:var(--muted)">-</span>
          <span class="bet-team">${away}</span>
        </div>
        <div class="bet-actions"><span class="bet-closed">${started ? 'Partido en juego' : 'Apuestas cerradas'}</span></div>`;
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

function renderMisApuestas(el) {
  const myBets = Object.values(qnlBets);
  if (!myBets.length) {
    el.innerHTML = '<div class="empty">Todavía no has hecho ninguna apuesta.</div>';
    return;
  }

  const lookup = {};
  MATCHES.forEach(m => { lookup[matchId(m)] = m; });

  const cards = myBets.map(b => {
    const m = lookup[b.match_id];
    if (!m) return '';
    const parts = m[2].split('·')[0].split(' vs ');
    const home = parts[0]?.trim() || '';
    const away = parts[1]?.trim() || '';
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
      </div>`;
  }).filter(Boolean).join('');

  el.innerHTML = cards || '<div class="empty">No se encontraron apuestas.</div>';
}

async function renderClasificacion(el) {
  const [{ data: users }, { data: bets }] = await Promise.all([
    db.from('users').select('id, name'),
    db.from('bets').select('user_id'),
  ]);

  if (!users?.length) {
    el.innerHTML = '<div class="empty">Aún no hay participantes.</div>';
    return;
  }

  const betCount = {};
  (bets || []).forEach(b => { betCount[b.user_id] = (betCount[b.user_id] || 0) + 1; });

  const board = users
    .map(u => ({ id: u.id, name: u.name, apuestas: betCount[u.id] || 0, pts: 0 }))
    .sort((a,b) => b.apuestas - a.apuestas || a.name.localeCompare(b.name));

  const rows = board.map((u,i) => {
    const isMe = u.id === qnlUser?.id;
    return `<tr${isMe?' class="me"':''}>
      <td class="lb-rank">${i+1}</td>
      <td class="lb-name">${u.name}${isMe?' 👈':''}</td>
      <td>${u.apuestas}</td>
      <td class="lb-pts">${u.pts}</td>
    </tr>`;
  }).join('');

  el.innerHTML = `
    <p style="font-size:11px;color:var(--muted);margin-bottom:12px">
      Los puntos se activarán cuando haya resultados.
    </p>
    <table class="lb-table">
      <thead><tr>
        <th>#</th>
        <th class="lb-name">Nombre</th>
        <th>Apuestas</th>
        <th>Pts</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
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
