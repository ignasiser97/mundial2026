const MUNDIAL_START_MS = new Date('2026-06-11T19:00:00Z').getTime();

// ← true = preview del home en vivo (para pruebas antes del torneo)
//   false = comportamiento real: cuenta atrás hasta la fecha, live después
const HOME_PREVIEW_STARTED = false;

let _homeInterval  = null;
let _liveInterval  = null;
let _liveRendering = false;

let homeLbScope = 'group';

function setHomeLbScope(scope) {
  homeLbScope = scope;
  renderHomeCombinedLb(document.getElementById('home-lb'));
}

async function renderHomeCombinedLb(el) {
  if (!el) return;
  el.innerHTML = '<div class="empty">Cargando…</div>';

  const activeGroup = qnlGroup || (() => {
    try { const gid = localStorage.getItem('qnl_group'); return gid ? GROUPS.find(g => g.id === gid) : null; }
    catch { return null; }
  })();

  const [{ data: allUsers }, raw, bets, { data: tBets }, tResults] = await Promise.all([
    db.from('users').select('id, name, group_id'),
    getMatchResults(),
    fetchAllBets(),
    db.from('tournament_bets').select('*'),
    getTournamentResults(),
  ]);

  if (!allUsers?.length) { el.innerHTML = '<div class="empty">Sin datos.</div>'; return; }

  const users = homeLbScope === 'group' && activeGroup
    ? allUsers.filter(u => u.group_id === activeGroup.id)
    : allUsers;

  const resultMap = {};
  Object.entries(raw || {}).forEach(([id, r]) => {
    resultMap[id] = {
      home_score: r.home_90 ?? r.home,
      away_score: r.away_90 ?? r.away,
      status: r.status,
      phase: r.phase,
      winner: r.winner,
    };
  });

  const stats = {};
  users.forEach(u => { stats[u.id] = { id: u.id, name: u.name, group_id: u.group_id, matchPts: 0, torneoPts: 0 }; });

  const seenBets = new Set();
  (bets || []).forEach(b => {
    if (!stats[b.user_id]) return;
    const normalMid = OLD_THIRD_PLACE_BET_IDS[b.match_id] ?? b.match_id;
    const dedupeKey = `${b.user_id}|${normalMid}`;
    if (seenBets.has(dedupeKey)) return;
    seenBets.add(dedupeKey);
    const r = resultMap[b.match_id];
    if (r) stats[b.user_id].matchPts += calcPoints(b, r, isSpainMatch(normalMid));
  });

  (tBets || []).forEach(tb => {
    if (!stats[tb.user_id]) return;
    const pts = calcTorneoPoints(tb, tResults);
    stats[tb.user_id].torneoPts = pts ? torneoTotal(pts) : 0;
  });

  const board = Object.values(stats)
    .map(u => ({ ...u, total: u.matchPts + u.torneoPts }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));

  const showBadge = homeLbScope === 'all';
  const rows = board.map((u, i) => {
    const isMe = u.id === qnlUser?.id;
    const badge = showBadge ? `<span class="lb-group-badge">${GROUPS.find(g => g.id === u.group_id)?.id || '?'}</span>` : '';
    return `<tr${isMe ? ' class="me"' : ''}>
      <td class="lb-rank">${i + 1}</td>
      <td class="lb-name">${escHtml(u.name)}${isMe ? ' 👈' : ''}${badge}</td>
      <td>${u.matchPts}</td>
      <td>${u.torneoPts > 0 ? '+' + u.torneoPts : '—'}</td>
      <td class="lb-pts">${u.total}</td>
    </tr>`;
  }).join('');

  const toggle = activeGroup ? `
    <div class="lb-scope-bar">
      <button class="lb-scope-btn${homeLbScope === 'group' ? ' active' : ''}" onclick="setHomeLbScope('group')">Mi grupo</button>
      <button class="lb-scope-btn${homeLbScope === 'all' ? ' active' : ''}" onclick="setHomeLbScope('all')">Todos</button>
    </div>` : '';

  el.innerHTML = `${toggle}
    <table class="lb-table">
      <thead><tr>
        <th>#</th><th class="lb-name">Nombre</th>
        <th title="Puntos de partidos">Partidos</th>
        <th title="Puntos de torneo">Torneo</th>
        <th>Total</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}

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
  _liveRendering = true;
  el.innerHTML = '<div class="empty" style="margin-top:48px">Cargando…</div>';

  try {
    await refreshLiveResults();
    const [results, standingsData] = await Promise.all([getMatchResults(), getStandingsData()]);
    buildFullSlotMap(standingsData);
    const today = spainToday();
    const now = Date.now();

    const todayMatches = MATCHES.filter(m => viewDate(m[0], m[1]) === today);
    const nextMatch = MATCHES.find(m => spainToUTC(m[0], m[1]) > now);

    // Día del torneo (Día 1 = 11 jun)
    const startDay = new Date('2026-06-11T00:00:00Z');
    const todayUTC = new Date(today + 'T00:00:00Z');
    const dayNum   = Math.floor((todayUTC - startDay) / 86400000) + 1;

    // Fase actual: primero mira partidos de hoy, luego el último iniciado
    const startedMatches = MATCHES.filter(m => spainToUTC(m[0], m[1]) <= now);
    const phaseSource    = todayMatches.length ? todayMatches : startedMatches;
    const currentPhase   = phaseSource.length
      ? (PHASES[phaseSource[phaseSource.length - 1][7]] || 'Fase de grupos')
      : 'Fase de grupos';

    const header = `
      <div class="home-live-header">
        <div class="home-badge">MUNDIAL 2026</div>
        <div class="home-live-day">DÍA ${dayNum > 0 ? dayNum : '—'} · ${currentPhase.toUpperCase()}</div>
      </div>`;

    // Separar partidos en directo del resto
    const liveMatches  = todayMatches.filter(m => results[matchId(m)]?.status === 'live');
    const otherMatches = todayMatches.filter(m => results[matchId(m)]?.status !== 'live');

    let matchSection = '';
    if (liveMatches.length) {
      const scoreboards = liveMatches.map(m => _homeLiveScoreboard(m, results[matchId(m)])).join('');
      const rest = otherMatches.length
        ? `<div class="home-section-label" style="margin-top:18px">Resto del día</div><div class="home-live-matches">${otherMatches.map(m => _homeLiveRow(m, results)).join('')}</div>`
        : '';
      matchSection = scoreboards + rest;
    } else if (todayMatches.length) {
      const cards = todayMatches.map(m => _homeLiveRow(m, results)).join('');
      matchSection = `
        <div class="home-section-label">Partidos de hoy</div>
        <div class="home-live-matches">${cards}</div>`;
    } else if (nextMatch) {  // (cierre del bloque liveMatches.length > 0 está arriba)
      const [home, away] = resolveTeams(nextMatch);
      const hf = FLAGS_MAP[home] || '';
      const af = FLAGS_MAP[away] || '';
      matchSection = `
        <div class="home-section-label">Próximo partido</div>
        <div class="home-next-card">
          <div class="home-next-teams">${hf} ${home} – ${away} ${af}</div>
          <div class="home-next-when">${fmtDate(nextMatch[0])} · ${nextMatch[1]}</div>
        </div>`;
    } else {
      matchSection = `
        <div style="text-align:center;padding:32px 16px 16px">
          <div style="font-family:'Bebas Neue',sans-serif;font-size:34px;color:var(--accent);letter-spacing:2px">🇪🇸 ESPAÑA 🇪🇸</div>
          <div style="font-size:14px;color:var(--text);margin:10px 0 6px;opacity:.85;line-height:1.5">ha ganado en grande, con un estilo bonito.</div>
          <div style="font-family:'Bebas Neue',sans-serif;font-size:22px;color:var(--pos);letter-spacing:1px">SOMOS CAMPEONES DEL MUNDO</div>
        </div>`;
    }

    const links = `
      <div class="home-quick-links">
        <button class="home-ql-btn" onclick="switchTab('qnl')">⚽<span>Apuestas</span></button>
        <button class="home-ql-btn" onclick="switchTab('grp')">🏆<span>Bracket</span></button>
        <button class="home-ql-btn" onclick="switchTab('cal')">📅<span>Calendario</span></button>
      </div>`;

    el.innerHTML = header + matchSection + links + `
      <div style="margin-top:8px;padding-bottom:24px">
        <div class="home-section-label" style="margin-bottom:8px">Clasificación final</div>
        <div id="home-lb"><div class="empty">Cargando…</div></div>
      </div>`;
    renderHomeCombinedLb(document.getElementById('home-lb'));
  } finally {
    _liveRendering = false;
  }

  // Auto-refresh while any match is in the ~130-min live window
  const nowTs = Date.now();
  const hasLive = MATCHES.some(m => {
    const start = spainToUTC(m[0], m[1]);
    return start <= nowTs && nowTs < start + 130 * 60 * 1000;
  });
  if (hasLive && !_liveInterval) {
    _liveInterval = setInterval(async () => {
      if (_liveRendering) return;
      const target = document.getElementById('home-content');
      if (target) await renderHomeLive(target);
    }, 60_000);
  } else if (!hasLive && _liveInterval) {
    clearInterval(_liveInterval); _liveInterval = null;
  }
}

function _homeLiveRow(m, results) {
  const mid    = matchId(m);
  const result = results[mid];
  const [homeTeam, awayTeam] = resolveTeams(m);
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
  </div>`;
}

function _homeLiveScoreboard(m, result) {
  const [homeTeam, awayTeam] = resolveTeams(m);
  const hf = FLAGS_MAP[homeTeam] || '';
  const af = FLAGS_MAP[awayTeam] || '';

  const periodLabel = result.periodName || (result.period === 1 ? 'Primera parte' : result.period === 2 ? 'Segunda parte' : '');

  const goalsHome = (result.goals || []).filter(g => g.team === homeTeam);
  const goalsAway = (result.goals || []).filter(g => g.team === awayTeam);
  const goalRowHome = goalsHome.map(g => `<span class="hsb-goal">${g.player} ${g.minute}</span>`).join('');
  const goalRowAway = goalsAway.map(g => `<span class="hsb-goal">${g.player} ${g.minute}</span>`).join('');

  const mid = matchId(m);
  return `
  <div class="home-scoreboard" onclick="showMatchDetail('${mid}')">
    <div class="hsb-live-bar">● EN VIVO${result.clock ? ` · ${result.clock}` : ''}${periodLabel ? ` · ${periodLabel}` : ''} <span style="font-size:9px;opacity:.7">· toca para stats</span></div>
    <div class="hsb-body">
      <div class="hsb-team">
        <div class="hsb-flag">${hf}</div>
        <div class="hsb-name">${homeTeam}</div>
        <div class="hsb-goals">${goalRowHome}</div>
      </div>
      <div class="hsb-score">
        <span class="hsb-num">${result.home}</span>
        <span class="hsb-dash">–</span>
        <span class="hsb-num">${result.away}</span>
      </div>
      <div class="hsb-team">
        <div class="hsb-flag">${af}</div>
        <div class="hsb-name">${awayTeam}</div>
        <div class="hsb-goals">${goalRowAway}</div>
      </div>
    </div>
    <div class="hsb-venue">${m[3].split(',')[0]}</div>
  </div>`;
}
