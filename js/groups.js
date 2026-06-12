let grpSubTab    = 'grupos';
let bracketPhase = 'r32';
let grpLoaded    = false;

const BRACKET_PHASES = [
  { key:'r32',   label:'1/32'   },
  { key:'r16',   label:'Octavos' },
  { key:'qf',    label:'Cuartos' },
  { key:'sf',    label:'Semis'   },
  { key:'3p',    label:'3º/4º'  },
  { key:'final', label:'Final'   },
];

// ── Sub-tabs ───────────────────────────────────────────────────

function grpSwitchSub(sub) {
  grpSubTab = sub;
  document.querySelectorAll('.grp-stab').forEach((b,i) =>
    b.classList.toggle('active', ['grupos','bracket'][i] === sub)
  );
  document.getElementById('grp-sub-grupos').classList.toggle('hidden', sub !== 'grupos');
  document.getElementById('grp-sub-bracket').classList.toggle('hidden', sub !== 'bracket');
  if (sub === 'bracket') renderBracket();
}

// ── Grupos ─────────────────────────────────────────────────────

let grpActiveLetter = '';

async function loadGroups() {
  const el = document.getElementById('groups-content');
  try {
    const data = await getStandingsData();
    if (!data?.groups) throw new Error('no data');
    const upd  = new Date(data.updated);
    document.getElementById('last-updated').textContent =
      'Actualizado: ' + upd.toLocaleDateString('es-ES') + ' ' +
      upd.toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' });

    const letters = Object.keys(data.groups);
    renderGroupChips(letters);

    let html = '<div class="groups-grid">';
    for (const [letter, teams] of Object.entries(data.groups)) html += renderGroup(letter, teams);
    html += '</div>';
    el.innerHTML = html;
  } catch(e) {
    el.innerHTML = '<p class="empty">No se pudieron cargar las clasificaciones.</p>';
  }
}

function renderGroupChips(letters) {
  const bar = document.getElementById('grp-filter-bar');
  if (!bar) return;
  const chips = ['<button class="grp-letter-chip active" data-letter="" onclick="grpFilterLetter(\'\')">Todos</button>',
    ...letters.map(l =>
      `<button class="grp-letter-chip" data-letter="${l}" onclick="grpFilterLetter('${l}')">${l}</button>`)
  ].join('');
  bar.innerHTML = chips +
    `<input class="grp-team-input" id="grp-team-input" type="text"
       placeholder="🔍 Buscar equipo" autocomplete="off"
       oninput="grpTeamSearch(this.value)">`;
  bar.classList.remove('hidden');
}

function grpFilterLetter(letter) {
  grpActiveLetter = letter;
  // limpiar búsqueda de equipo
  const inp = document.getElementById('grp-team-input');
  if (inp) inp.value = '';
  document.querySelectorAll('.grp-letter-chip').forEach(c =>
    c.classList.toggle('active', c.dataset.letter === letter)
  );
  document.querySelectorAll('#groups-content .group-card').forEach(card =>
    card.classList.toggle('hidden', !!letter && card.id !== 'group-' + letter)
  );
  const grid = document.querySelector('#groups-content .groups-grid');
  if (grid) grid.style.gridTemplateColumns = letter ? '1fr' : '';
}

function grpTeamSearch(val) {
  const q = val.trim().toLowerCase();
  // limpiar chips de letra
  grpActiveLetter = '';
  document.querySelectorAll('.grp-letter-chip').forEach(c => c.classList.remove('active'));

  let visible = 0;
  document.querySelectorAll('#groups-content .group-card').forEach(card => {
    const match = !q || [...card.querySelectorAll('td.tnm')]
      .some(td => td.textContent.toLowerCase().includes(q));
    card.classList.toggle('hidden', !match);
    if (match) visible++;
  });
  const grid = document.querySelector('#groups-content .groups-grid');
  if (grid) grid.style.gridTemplateColumns = visible === 1 ? '1fr' : '';
}

function teamMatchesHtml(team) {
  const ms = MATCHES.filter(m => {
    if (m[7] !== 'groups') return false;
    return m[2].split('·')[0].split(' vs ').map(s => s.trim()).includes(team);
  });
  if (!ms.length) return '<div style="font-size:11px;color:var(--muted);padding:4px 0">Sin partidos</div>';
  return '<div class="tpanel-inner">' + ms.map(m => {
    const [date, time, , venue, , ch] = m;
    const [home, away] = matchTeams(m);
    const rival = home === team ? away : home;
    const rivalFlag = FLAGS_MAP[rival] || '';
    const night = isNight(time);
    const badges = (ch.includes('d') ? '<span class="badge bd">DAZN</span>' : '') +
                   (ch.includes('l') ? '<span class="badge bl">LA 1</span>' : '');
    return `<div class="tpanel-row">
      <span class="tpanel-time${night ? ' night' : ''}">${time}</span>
      <span class="tpanel-date">${fmtDate(date)}</span>
      <span class="tpanel-rival">${rivalFlag} ${rival}</span>
      <span class="tpanel-meta">${venue.split(',')[0]} ${badges}</span>
    </div>`;
  }).join('') + '</div>';
}

function toggleTeamPanel(team) {
  const id = 'tpanel-' + team.replace(/[^a-zA-Z0-9]/g, '_');
  document.getElementById(id)?.classList.toggle('hidden');
}

function renderGroup(letter, teams) {
  const sorted = [...teams].sort((a, b) =>
    b.pts - a.pts || b.dg - a.dg || b.gf - a.gf || a.team.localeCompare(b.team, 'es')
  );
  const rows = sorted.map((t, idx) => {
    const dgVal = t.dg ?? 0;
    const dgCls = dgVal > 0 ? 'pos' : dgVal < 0 ? 'neg' : '';
    const dg    = dgVal > 0 ? '+' + dgVal : dgVal;
    const isSpain = t.team === 'España';
    const topCls = idx < 2 ? ' top2' : '';
    const safeid = t.team.replace(/[^a-zA-Z0-9]/g, '_');
    const rowCls = ['grp-team-row', isSpain ? 'spain-row' : '', topCls.trim()].filter(Boolean).join(' ');
    const escapedTeam = t.team.replace(/'/g, "\\'");
    return `<tr class="${rowCls}" onclick="toggleTeamPanel('${escapedTeam}')">
      <td class="tnm">${t.flag||''} ${t.team}</td>
      <td>${t.pj}</td><td class="pts">${t.pts}</td>
      <td>${t.gf}</td><td>${t.gc}</td>
      <td class="${dgCls}">${dg}</td>
    </tr>
    <tr class="team-panel hidden" id="tpanel-${safeid}">
      <td colspan="6">${teamMatchesHtml(t.team)}</td>
    </tr>`;
  }).join('');
  return `<div class="group-card" id="group-${letter}">
    <div class="group-title">Grupo ${letter}</div>
    <table class="standings-table">
      <thead><tr><th>Equipo</th><th>PJ</th><th>Pts</th><th>GF</th><th>GC</th><th>DG</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

// ── Navegación bracket → grupo ─────────────────────────────────

function navigateToGroup(letter) {
  switchTab('grp');
  grpSwitchSub('grupos');
  if (!grpLoaded) {
    grpLoaded = true;
    loadGroups().then(() => scrollToGroup(letter));
  } else {
    scrollToGroup(letter);
  }
}

function scrollToGroup(letter) {
  // limpiar filtro activo para que el grupo sea visible
  grpFilterLetter('');
  setTimeout(() => {
    document.getElementById('group-' + letter)?.scrollIntoView({ behavior:'smooth', block:'center' });
  }, 80);
}

// ── Bracket visual ─────────────────────────────────────────────

// Estructura del árbol: LEFT[ronda][grupo][match_code]
const BKT_LEFT = [
  [ ['P73','P75'], ['P74','P77'], ['P83','P84'], ['P81','P82'] ],  // R32
  [ ['P90','P89'], ['P93','P94'] ],                                // R16
  [ ['P97','P98'] ],                                               // QF
];
const BKT_RIGHT = [
  [ ['P99','P100'] ],                                              // QF
  [ ['P91','P92'], ['P95','P96'] ],                                // R16
  [ ['P76','P78'], ['P79','P80'], ['P86','P88'], ['P85','P87'] ],  // R32
];
const BKT_LEFT_LABELS  = ['1/32','Octavos','Cuartos','Semis'];
const BKT_RIGHT_LABELS = ['Cuartos','Octavos','1/32'];

function buildPMap() {
  const map = {};
  for (const m of MATCHES) {
    const c = m[2].match(/\(P(\d+)\)$/);
    if (c) { map['P'+c[1]] = m; continue; }
    if (m[7]==='sf')    { m[2].includes('1') ? map['SF1']=m : map['SF2']=m; }
    if (m[7]==='final') map['FIN']=m;
    if (m[7]==='3p')    map['3P']=m;
  }
  return map;
}

function bktGoToDate(date) {
  switchTab('cal');
  requestAnimationFrame(() => cpSelect(date));
}

let bktMap = {};
let bktSlotMap = {};  // '1º A' → {team, flag, pj}

function buildBktSlotMap(groups) {
  const map = {};
  for (const [letter, teams] of Object.entries(groups)) {
    const sorted = [...teams].sort((a, b) =>
      b.pts - a.pts || b.dg - a.dg || b.gf - a.gf
    );
    if (sorted[0]) map[`1º ${letter}`] = sorted[0];
    if (sorted[1]) map[`2º ${letter}`] = sorted[1];
  }
  return map;
}

function bktSlotLabel(slot) {
  const entry = bktSlotMap[slot];
  const letter = slot.match(/[A-L]$/) ? slot.slice(-1) : null;
  const nav = letter ? ` onclick="navigateToGroup('${letter}')"` : '';
  if (!entry) {
    return letter
      ? `<span class="bkt-nav-link"${nav}>${slot}</span>`
      : slot;
  }
  const prov  = entry.pj < 3;
  const label = `${entry.flag || ''} ${entry.team}${prov ? '<span class="bkt-prov"> ~</span>' : ''}`;
  return letter
    ? `<span class="bkt-nav-link"${nav}>${label}</span>`
    : label;
}

function bktCard(code, pmap, extra='') {
  const m = pmap[code];
  if (!m) return `<div class="bkt-m${extra}"><div class="bkt-team">-</div><div class="bkt-div"></div><div class="bkt-team">-</div></div>`;
  const isR32 = m[7] === 'r32';
  let home = '-', away = '-';
  if (isR32) {
    [home, away] = matchTeams(m).map(bktSlotLabel);
  }
  return `<div class="bkt-m${extra} clickable" onclick="bktGoToDate('${m[0]}')">
    <div class="bkt-team">${home}</div>
    <div class="bkt-div"></div>
    <div class="bkt-team">${away}</div>
    <div class="bkt-date">${m[1]} · ${m[0].slice(5).replace('-','/')}</div>
  </div>`;
}

function bktColumn(rounds, labels, side) {
  return rounds.map((groups, ri) => {
    const grpsHTML = groups.map(grp =>
      `<div class="bkt-grp ${side}">${grp.map(c => bktCard(c, bktMap)).join('')}</div>`
    ).join('');
    return `<div class="bkt-col-wrap">
      <div class="bkt-rlabel">${labels[ri]||''}</div>
      <div class="bkt-col">${grpsHTML}</div>
    </div>`;
  }).join('');
}

async function renderBracket() {
  const el = document.getElementById('bracket-content');
  bktMap = buildPMap();

  try {
    const data = await getStandingsData();
    bktSlotMap = buildBktSlotMap(data?.groups || {});
  } catch { bktSlotMap = {}; }

  const leftHTML  = bktColumn(BKT_LEFT,  BKT_LEFT_LABELS,  'l');
  const rightHTML = bktColumn(BKT_RIGHT, BKT_RIGHT_LABELS, 'r');

  // SF + FINAL center
  const sf1 = `<div class="bkt-col-wrap">
    <div class="bkt-rlabel">${BKT_LEFT_LABELS[3]}</div>
    <div class="bkt-col">
      <div class="bkt-solo l">${bktCard('SF1', bktMap, ' sf')}</div>
    </div>
  </div>`;

  const center = `<div class="bkt-center">
    <div class="bkt-clabel">Final</div>
    ${bktCard('FIN', bktMap, ' fin')}
    <div class="bkt-clabel muted">3er Puesto</div>
    ${bktCard('3P', bktMap, ' tp')}
  </div>`;

  const sf2 = `<div class="bkt-col-wrap">
    <div class="bkt-rlabel">Semis</div>
    <div class="bkt-col">
      <div class="bkt-solo r">${bktCard('SF2', bktMap, ' sf')}</div>
    </div>
  </div>`;

  el.innerHTML = `
    <div class="bkt-scroll"><div class="bkt-tree">${leftHTML}${sf1}${center}${sf2}${rightHTML}</div></div>
    <p class="bkt-scroll-hint">← desliza para ver el cuadro completo →</p>
    <p style="font-size:11px;color:var(--muted);padding:4px 14px 20px;line-height:1.6">
      * <strong style="color:var(--text)">3º</strong> = uno de los 8 mejores terceros entre los 12 grupos.
      FIFA asigna qué tercero va a cada cruce una vez terminada la fase de grupos.
    </p>`;
}
