// ── Match Detail Modal ─────────────────────────────────────────
// Muestra stats, eventos y alineaciones de un partido en directo o terminado.

const ESPN_SUMMARY = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/summary';

let _detailInterval = null;

const EVENT_ICONS = { goal:'⚽', yellowcard:'🟨', redcard:'🟥', yellowredcard:'🟥', substitution:'↕️' };

function mdClose() {
  clearInterval(_detailInterval);
  _detailInterval = null;
  document.getElementById('match-detail-overlay')?.remove();
}

async function showMatchDetail(mid) {
  const eventId = _liveEventIds?.[mid];
  const result  = _liveResults?.[mid] || null;

  // Crear overlay vacío mientras carga
  let overlay = document.getElementById('match-detail-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'match-detail-overlay';
    overlay.innerHTML = `
      <div class="md-sheet">
        <div class="md-handle" onclick="mdClose()"></div>
        <div id="md-content"><div class="empty" style="padding:40px">Cargando…</div></div>
      </div>`;
    overlay.addEventListener('click', e => { if (e.target === overlay) mdClose(); });
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('open'));
  }

  await _renderDetail(mid, eventId);

  // Auto-refresh si está en vivo
  if (result?.status === 'live' && eventId && !_detailInterval) {
    _detailInterval = setInterval(async () => {
      if (!document.getElementById('match-detail-overlay')) {
        clearInterval(_detailInterval); _detailInterval = null; return;
      }
      await refreshLiveResults();
      await _renderDetail(mid, eventId);
    }, 30_000);
  }
}

async function _renderDetail(mid, eventId) {
  const el = document.getElementById('md-content');
  if (!el) return;

  // Datos del partido de MATCHES
  const m = MATCHES.find(mx => matchId(mx) === mid);
  if (!m) { el.innerHTML = '<div class="empty">Partido no encontrado.</div>'; return; }

  const [homeTeam, awayTeam] = matchTeams(m);
  const hf = FLAGS_MAP[homeTeam] || '';
  const af = FLAGS_MAP[awayTeam] || '';
  const result = (await getMatchResults())[mid];

  // Header siempre visible con los datos que ya tenemos
  const isLive = result?.status === 'live';
  const score  = result ? `${result.home} – ${result.away}` : '– – –';
  const clockHtml = isLive
    ? `<div class="md-clock">${result.clock || ''}${result.periodName ? ` · ${result.periodName}` : ''}</div>`
    : result?.status === 'ft' ? '<div class="md-clock">Partido finalizado</div>' : '';

  // Si no hay event ID, solo mostramos score básico
  if (!eventId) {
    el.innerHTML = mdHeaderHtml(hf, homeTeam, score, awayTeam, af, clockHtml) +
      `<div class="empty" style="padding:24px">Estadísticas disponibles solo en partidos en vivo.</div>`;
    return;
  }

  // Fetch summary de ESPN
  let summary;
  try {
    const res = await fetch(`${ESPN_SUMMARY}?event=${eventId}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(res.status);
    summary = await res.json();
  } catch {
    el.innerHTML = mdHeaderHtml(hf, homeTeam, score, awayTeam, af, clockHtml) +
      `<div class="empty" style="padding:24px">No se pudieron cargar las estadísticas.</div>`;
    return;
  }

  el.innerHTML =
    mdHeaderHtml(hf, homeTeam, score, awayTeam, af, clockHtml) +
    mdStatsHtml(summary, homeTeam, awayTeam) +
    mdEventsHtml(summary, homeTeam, awayTeam) +
    mdLineupsHtml(summary, homeTeam, awayTeam, hf, af);
}

function mdHeaderHtml(hf, home, score, away, af, clockHtml) {
  return `
  <div class="md-header">
    <div class="md-hteam"><div class="md-hflag">${hf}</div><div class="md-hname">${home}</div></div>
    <div class="md-score">${score}</div>
    <div class="md-hteam"><div class="md-hflag">${af}</div><div class="md-hname">${away}</div></div>
  </div>
  ${clockHtml}`;
}

function mdStatsHtml(summary, homeTeam, awayTeam) {
  const teams = summary.boxscore?.teams || [];
  const homeStats = teams.find(t => {
    const name = t.team?.displayName || '';
    return NAMES_ES[name] === homeTeam || name === homeTeam;
  })?.statistics || [];
  const awayStats = teams.find(t => {
    const name = t.team?.displayName || '';
    return NAMES_ES[name] === awayTeam || name === awayTeam;
  })?.statistics || [];

  const getStat = (arr, name) => arr.find(s => s.label?.toLowerCase() === name.toLowerCase() || s.name?.toLowerCase() === name.toLowerCase())?.displayValue || '0';

  const STAT_KEYS = [
    { key: 'possession', label: 'Posesión', pct: true },
    { key: 'shots',      label: 'Tiros' },
    { key: 'on goal',    label: 'A puerta' },
    { key: 'corner kicks', label: 'Córners' },
    { key: 'fouls',      label: 'Faltas' },
    { key: 'offsides',   label: 'Fueras de juego' },
  ];

  const rows = STAT_KEYS.map(({ key, label, pct }) => {
    const hv = parseFloat(getStat(homeStats, key)) || 0;
    const av = parseFloat(getStat(awayStats, key)) || 0;
    const total = hv + av || 1;
    const hPct = pct ? hv : Math.round(hv / total * 100);
    const aPct = pct ? av : Math.round(av / total * 100);
    return `<div class="md-stat-row">
      <span class="md-stat-val">${pct ? hv + '%' : Math.round(hv)}</span>
      <div class="md-stat-bar">
        <div class="md-stat-fill home" style="width:${hPct}%"></div>
        <div class="md-stat-fill away" style="width:${aPct}%"></div>
      </div>
      <span class="md-stat-val right">${pct ? av + '%' : Math.round(av)}</span>
      <span class="md-stat-label">${label}</span>
    </div>`;
  }).join('');

  return `<div class="md-section"><div class="md-section-title">Estadísticas</div>${rows}</div>`;
}

function mdEventsHtml(summary, homeTeam, awayTeam) {
  const SHOW_TYPES = new Set(['goal','yellowcard','redcard','yellowredcard','substitution']);
  const events = (summary.keyEvents || []).filter(ke => {
    const type = ke.type?.type?.toLowerCase() || '';
    const text = ke.type?.text?.toLowerCase() || '';
    return SHOW_TYPES.has(type) ||
      text.includes('goal') || text.includes('yellow') || text.includes('red') || text.includes('substitut');
  });

  if (!events.length) return '';

  const rows = events.map(ke => {
    const type  = ke.type?.type?.toLowerCase() || '';
    const text  = ke.type?.text?.toLowerCase() || '';
    const icon  = EVENT_ICONS[type] ||
      (text.includes('goal') ? '⚽' : text.includes('yellow') ? '🟨' : text.includes('red') ? '🟥' : text.includes('sub') ? '↕️' : '•');
    const min   = ke.clock?.displayValue || '';
    const parts = ke.participants || [];
    const player = parts[0]?.athlete?.displayName || '';
    const player2 = parts[1]?.athlete?.displayName || '';  // asistente / sale
    const teamEn = ke.team?.displayName || '';
    const teamEs = NAMES_ES[teamEn] || teamEn;
    const isHome = teamEs === homeTeam;

    const sub2 = type === 'substitution' && player2 ? `<span class="md-ev-sub2">↑ ${player2}</span>` : '';
    const assist = type === 'goal' && player2 ? `<span class="md-ev-sub2">🅰️ ${player2}</span>` : '';

    return `<div class="md-ev-row ${isHome ? 'home' : 'away'}">
      ${isHome ? `<div class="md-ev-info"><span class="md-ev-player">${player}</span>${assist}${sub2}</div>` : '<div></div>'}
      <div class="md-ev-center"><span class="md-ev-icon">${icon}</span><span class="md-ev-min">${min}</span></div>
      ${!isHome ? `<div class="md-ev-info right"><span class="md-ev-player">${player}</span>${assist}${sub2}</div>` : '<div></div>'}
    </div>`;
  }).join('');

  return `<div class="md-section"><div class="md-section-title">Eventos</div>${rows}</div>`;
}

function mdLineupsHtml(summary, homeTeam, awayTeam, hf, af) {
  const rosters = summary.rosters || [];
  const homeRoster = rosters.find(r => {
    const n = r.team?.displayName || '';
    return NAMES_ES[n] === homeTeam || n === homeTeam;
  })?.roster || [];
  const awayRoster = rosters.find(r => {
    const n = r.team?.displayName || '';
    return NAMES_ES[n] === awayTeam || n === awayTeam;
  })?.roster || [];

  if (!homeRoster.length && !awayRoster.length) return '';

  const starter  = p => p.starter;
  const playerRow = p => {
    const name = p.athlete?.displayName || '';
    const num  = p.jersey || '';
    const pos  = p.position?.abbreviation || '';
    return `<div class="md-pl"><span class="md-pl-num">${num}</span><span class="md-pl-name">${name}</span><span class="md-pl-pos">${pos}</span></div>`;
  };

  const homeStarters = homeRoster.filter(starter).map(playerRow).join('');
  const awayStarters = awayRoster.filter(starter).map(playerRow).join('');
  const homeSubs     = homeRoster.filter(p => !p.starter).map(playerRow).join('');
  const awaySubs     = awayRoster.filter(p => !p.starter).map(playerRow).join('');

  return `<div class="md-section">
    <div class="md-section-title">Alineaciones</div>
    <div class="md-lineups">
      <div class="md-lineup-col">
        <div class="md-lineup-team">${hf} ${homeTeam}</div>
        ${homeStarters}
        ${homeSubs ? `<div class="md-sub-header">Suplentes</div>${homeSubs}` : ''}
      </div>
      <div class="md-lineup-col">
        <div class="md-lineup-team">${af} ${awayTeam}</div>
        ${awayStarters}
        ${awaySubs ? `<div class="md-sub-header">Suplentes</div>${awaySubs}` : ''}
      </div>
    </div>
  </div>`;
}
