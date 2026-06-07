const MUNDIAL_START_MS = new Date('2026-06-11T19:00:00Z').getTime();

// ← true = preview del home en vivo (para pruebas antes del torneo)
//   false = comportamiento real: cuenta atrás hasta la fecha, live después
const HOME_PREVIEW_STARTED = false;

let _homeInterval = null;
let _liveInterval = null;

const BALL_SVG = `<svg class="ball-svg" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
  <defs><clipPath id="bc"><circle cx="30" cy="30" r="26.5"/></clipPath></defs>
  <circle cx="30" cy="30" r="27" fill="#f0f0f0" stroke="#111" stroke-width="1.5"/>
  <g clip-path="url(#bc)" fill="#111">
    <polygon points="30,20 38,25 35,34 25,34 22,25"/>
    <polygon points="30,6 37,9 37,17 23,17 23,9"/>
    <polygon points="43,13 51,19 49,28 42,29 38,21"/>
    <polygon points="44,40 49,50 43,55 35,52 34,42"/>
    <polygon points="30,54 24,53 21,45 30,41 39,45 36,53"/>
    <polygon points="16,40 26,42 25,52 17,55 11,50"/>
    <polygon points="9,13 22,21 18,29 11,28 9,19"/>
  </g>
</svg>`;

function renderHome() {
  const el = document.getElementById('home-content');
  if (!el) return;
  if (_homeInterval) { clearInterval(_homeInterval); _homeInterval = null; }
  if (_liveInterval) { clearInterval(_liveInterval); _liveInterval = null; }

  if (HOME_PREVIEW_STARTED || Date.now() >= MUNDIAL_START_MS) {
    renderHomeLive(el);
    return;
  }

  tick();
  _homeInterval = setInterval(tick, 1000);

  function tick() {
    const diff = MUNDIAL_START_MS - Date.now();

    if (diff <= 0) {
      clearInterval(_homeInterval); _homeInterval = null;
      renderHomeLive(el);
      return;
    }

    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000)  / 60000);
    const s = Math.floor((diff % 60000)    / 1000);

    if (!el.querySelector('.home-num')) {
      el.innerHTML = `
        <div class="home-countdown">
          <div class="home-badge">EMPIEZA EL</div>
          <div class="home-date">11 JUNIO 2026</div>
          <div class="home-units">
            <div class="home-unit"><span class="home-num" id="cd-d"></span><span class="home-label">días</span></div>
            <span class="home-sep">:</span>
            <div class="home-unit"><span class="home-num" id="cd-h"></span><span class="home-label">horas</span></div>
            <span class="home-sep">:</span>
            <div class="home-unit"><span class="home-num" id="cd-m"></span><span class="home-label">min</span></div>
            <span class="home-sep">:</span>
            <div class="home-unit"><span class="home-num" id="cd-s"></span><span class="home-label">seg</span></div>
          </div>
          <div class="home-sub home-sub-link" onclick="switchTab('cal'); requestAnimationFrame(() => cpSelect('2026-06-11'))">México vs Sudáfrica · Estadio Azteca →</div>
          <div class="ball-track">${BALL_SVG}</div>
        </div>`;
    }

    document.getElementById('cd-d').textContent = String(d).padStart(2,'0');
    document.getElementById('cd-h').textContent = String(h).padStart(2,'0');
    document.getElementById('cd-m').textContent = String(m).padStart(2,'0');
    document.getElementById('cd-s').textContent = String(s).padStart(2,'0');
  }
}

async function renderHomeLive(el) {
  el.innerHTML = '<div class="empty" style="margin-top:48px">Cargando…</div>';

  await refreshLiveResults();
  const [results, oddsData] = await Promise.all([getMatchResults(), getOddsData()]);
  const allOdds = oddsData.odds || {};
  const today = spainToday();
  const now = Date.now();

  const todayMatches = MATCHES.filter(m => viewDate(m[0], m[1]) === today);
  const nextMatch = MATCHES.find(m => spainToUTC(m[0], m[1]) > now);

  // Día del torneo (Día 1 = 11 jun)
  const startDay = new Date('2026-06-11T00:00:00Z');
  const todayUTC = new Date(today + 'T00:00:00Z');
  const dayNum   = Math.floor((todayUTC - startDay) / 86400000) + 1;

  // Fase actual: la del último partido ya iniciado
  const startedMatches = MATCHES.filter(m => spainToUTC(m[0], m[1]) <= now);
  const currentPhase   = startedMatches.length
    ? (PHASES[startedMatches[startedMatches.length - 1][7]] || 'Fase de grupos')
    : 'Fase de grupos';

  const header = `
    <div class="home-live-header">
      <div class="home-badge">MUNDIAL 2026</div>
      <div class="home-live-day">DÍA ${dayNum > 0 ? dayNum : '—'} · ${currentPhase.toUpperCase()}</div>
    </div>`;

  let matchSection = '';
  if (todayMatches.length) {
    const cards = todayMatches.map(m => _homeLiveRow(m, results, allOdds)).join('');
    matchSection = `
      <div class="home-section-label">Partidos de hoy</div>
      <div class="home-live-matches">${cards}</div>`;
  } else if (nextMatch) {
    const [home, away] = matchTeams(nextMatch);
    const hf = FLAGS_MAP[home] || '';
    const af = FLAGS_MAP[away] || '';
    matchSection = `
      <div class="home-section-label">Próximo partido</div>
      <div class="home-next-card">
        <div class="home-next-teams">${hf} ${home} – ${away} ${af}</div>
        <div class="home-next-when">${fmtDate(nextMatch[0])} · ${nextMatch[1]}</div>
      </div>`;
  } else {
    matchSection = `<div class="empty" style="margin:40px 0">El torneo ha finalizado. ¡Hasta 2030! ⚽</div>`;
  }

  const links = `
    <div class="home-quick-links">
      <button class="home-ql-btn" onclick="switchTab('qnl')">⚽<span>Apuestas</span></button>
      <button class="home-ql-btn" onclick="switchTab('grp')">📊<span>Grupos</span></button>
      <button class="home-ql-btn" onclick="switchTab('cal')">📅<span>Calendario</span></button>
    </div>`;

  el.innerHTML = header + matchSection + links;

  // Auto-refresh while any match is in the ~130-min live window
  const nowTs = Date.now();
  const hasLive = MATCHES.some(m => {
    const start = spainToUTC(m[0], m[1]);
    return start <= nowTs && nowTs < start + 130 * 60 * 1000;
  });
  if (hasLive && !_liveInterval) {
    _liveInterval = setInterval(async () => {
      const target = document.getElementById('home-content');
      if (target) await renderHomeLive(target);
    }, 60_000);
  } else if (!hasLive && _liveInterval) {
    clearInterval(_liveInterval); _liveInterval = null;
  }
}

function _homeLiveRow(m, results, allOdds) {
  const mid    = matchId(m);
  const result = results[mid];
  const [homeTeam, awayTeam] = matchTeams(m);
  const hf      = FLAGS_MAP[homeTeam] || '';
  const af      = FLAGS_MAP[awayTeam] || '';
  const night   = isNight(m[1]);
  const started = Date.now() >= spainToUTC(m[0], m[1]);

  const isLive = result?.status === 'live';
  const centerHtml = result
    ? `<div class="mrow-result"><span class="mrow-score-num">${result.home}</span><span class="mrow-rdash">–</span><span class="mrow-score-num">${result.away}</span></div><div class="mrow-fin${isLive?' live':''}">${isLive?'● EN VIVO':'FIN'}</div>`
    : started
      ? `<div class="mrow-time" style="color:var(--pos)">EN VIVO</div><div class="mrow-sub">● EN DIRECTO</div>`
      : `<div class="mrow-time${night?' night':''}">${m[1]}</div><div class="mrow-sub">ESP${night?' 🌙':''}</div>`;

  const o = !result && !started && allOdds[mid];
  const oddsHtml = o ? `<div class="odds-row">${oddsChips(o)}</div>` : '';

  const flags  = m[6];
  const rowCls = ['match-row match-row-link', flags===1?'spain':flags===2?'spain-pos':''].filter(Boolean).join(' ');
  const vd = viewDate(m[0], m[1]);

  return `<div class="${rowCls}" onclick="switchTab('cal');requestAnimationFrame(()=>cpSelect('${vd}'))">
    <div class="mrow-home">
      ${hf ? `<span class="mrow-flag">${hf}</span>` : ''}
      <span class="mrow-tname">${homeTeam}</span>
    </div>
    <div class="mrow-center">${centerHtml}</div>
    <div class="mrow-away">
      <span class="mrow-tname">${awayTeam}</span>
      ${af ? `<span class="mrow-flag">${af}</span>` : ''}
    </div>
    <div class="mrow-meta">${m[3].split(',')[0]} · ${PHASES[m[7]]||m[7]}</div>
    ${oddsHtml}
  </div>`;
}
