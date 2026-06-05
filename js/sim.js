// ── Estado ─────────────────────────────────────────────────────
const simScores  = {};   // { key: { home:'', away:'' } }
const SIM_GROUPS = {};   // { 'A': [{key,home,away}, ...] }
const simWinners = {};   // { pid: teamName }
let simActiveGroup  = 'A';
let simMode         = 'groups';   // 'groups' | 'bracket'
let simBracketRound = 'r32';
let simInited       = false;

// ── Estructura bracket ──────────────────────────────────────────
// Slots: '1A','2B' = posición grupo | '3#N' = N-ésimo mejor 3º
//        'PXX','SF1','SF2' = ganador de ese partido
//        'SF1L','SF2L' = perdedor de semifinal (para 3º puesto)
const SIM_BRACKET = [
  // R32
  { pid:'P73',  r:'r32',   s1:'2A',  s2:'2B'  },
  { pid:'P74',  r:'r32',   s1:'1E',  s2:'3#0' },
  { pid:'P75',  r:'r32',   s1:'1F',  s2:'2C'  },
  { pid:'P76',  r:'r32',   s1:'1C',  s2:'2F'  },
  { pid:'P77',  r:'r32',   s1:'1I',  s2:'3#1' },
  { pid:'P78',  r:'r32',   s1:'2E',  s2:'2I'  },
  { pid:'P79',  r:'r32',   s1:'1A',  s2:'3#2' },
  { pid:'P80',  r:'r32',   s1:'1L',  s2:'3#3' },
  { pid:'P81',  r:'r32',   s1:'1D',  s2:'3#4' },
  { pid:'P82',  r:'r32',   s1:'1G',  s2:'3#5' },
  { pid:'P83',  r:'r32',   s1:'2K',  s2:'2L'  },
  { pid:'P84',  r:'r32',   s1:'1H',  s2:'2J'  },
  { pid:'P85',  r:'r32',   s1:'1B',  s2:'3#6' },
  { pid:'P86',  r:'r32',   s1:'1J',  s2:'2H'  },
  { pid:'P87',  r:'r32',   s1:'1K',  s2:'3#7' },
  { pid:'P88',  r:'r32',   s1:'2D',  s2:'2G'  },
  // R16
  { pid:'P89',  r:'r16',   s1:'P74', s2:'P77' },
  { pid:'P90',  r:'r16',   s1:'P73', s2:'P75' },
  { pid:'P91',  r:'r16',   s1:'P76', s2:'P78' },
  { pid:'P92',  r:'r16',   s1:'P79', s2:'P80' },
  { pid:'P93',  r:'r16',   s1:'P83', s2:'P84' },
  { pid:'P94',  r:'r16',   s1:'P81', s2:'P82' },
  { pid:'P95',  r:'r16',   s1:'P86', s2:'P88' },
  { pid:'P96',  r:'r16',   s1:'P85', s2:'P87' },
  // QF
  { pid:'P97',  r:'qf',    s1:'P89', s2:'P90' },
  { pid:'P98',  r:'qf',    s1:'P93', s2:'P94' },
  { pid:'P99',  r:'qf',    s1:'P91', s2:'P92' },
  { pid:'P100', r:'qf',    s1:'P95', s2:'P96' },
  // SF
  { pid:'SF1',  r:'sf',    s1:'P97', s2:'P98'  },
  { pid:'SF2',  r:'sf',    s1:'P99', s2:'P100' },
  // 3er puesto + Final
  { pid:'3P',   r:'final', s1:'SF1L',s2:'SF2L' },
  { pid:'FIN',  r:'final', s1:'SF1', s2:'SF2'  },
];

const SIM_ROUNDS = [
  { id:'r32',   label:'R32'  },
  { id:'r16',   label:'R16'  },
  { id:'qf',    label:'QF'   },
  { id:'sf',    label:'Semis'},
  { id:'final', label:'Final'},
];

const SIM_ROUND_TITLE = {
  r32:'Dieciseisavos de Final', r16:'Octavos de Final',
  qf:'Cuartos de Final', sf:'Semifinales', final:'Final',
};

// ── Init ────────────────────────────────────────────────────────
function simInit() {
  if (simInited) { simSetMode(simMode); return; }
  simInited = true;

  for (const m of MATCHES) {
    if (m[7] !== 'groups') continue;
    const grp = m[2].match(/Grupo ([A-L])/)?.[1];
    if (!grp) continue;
    const [home, away] = matchTeams(m);
    const key = `${m[0]}_${m[1]}_${home}_${away}`;
    if (!SIM_GROUPS[grp]) SIM_GROUPS[grp] = [];
    SIM_GROUPS[grp].push({ key, home, away });
    simScores[key] = { home:'', away:'' };
  }

  renderSimShell();
}

function renderSimShell() {
  const letters = Object.keys(SIM_GROUPS).sort();
  const groupTabs = letters.map(g =>
    `<button class="sim-gtab${g === simActiveGroup ? ' active':''}" onclick="simSetGroup('${g}')">${g}</button>`
  ).join('');

  document.getElementById('sim-content').innerHTML = `
    <div class="sim-mode-bar">
      <button class="sim-mtab${simMode==='groups'?' active':''}" onclick="simSetMode('groups')">Grupos</button>
      <button class="sim-mtab${simMode==='bracket'?' active':''}" onclick="simSetMode('bracket')">Bracket</button>
    </div>
    <div id="sim-groups-section"${simMode!=='groups'?' class="hidden"':''}>
      <div class="sim-note">Desempate simplificado: Pts → DG → GF. Resultados hipotéticos.</div>
      <div class="sim-group-tabs">${groupTabs}</div>
      <div id="sim-group-panel"></div>
      <div class="sim-thirds-wrap">
        <div class="sim-section-title">Mejores terceros <span class="sim-section-sub">(clasifican los 8 primeros)</span></div>
        <div id="sim-thirds"><p class="sim-empty">Introduce resultados para ver el ranking de terceros.</p></div>
      </div>
    </div>
    <div id="sim-bracket-section"${simMode!=='bracket'?' class="hidden"':''}>
      <div id="sim-bracket-inner"></div>
    </div>`;

  if (simMode === 'groups') simSetGroup(simActiveGroup);
  else renderSimBracket();
}

function simSetMode(mode) {
  simMode = mode;
  document.querySelectorAll('.sim-mtab').forEach((b,i) =>
    b.classList.toggle('active', ['groups','bracket'][i] === mode));
  document.getElementById('sim-groups-section').classList.toggle('hidden', mode !== 'groups');
  document.getElementById('sim-bracket-section').classList.toggle('hidden', mode !== 'bracket');
  if (mode === 'bracket') renderSimBracket();
}

// ── Grupos ──────────────────────────────────────────────────────
function simSetGroup(g) {
  simActiveGroup = g;
  document.querySelectorAll('.sim-gtab').forEach(b =>
    b.classList.toggle('active', b.textContent === g));
  renderSimGroupFull(g);
}

function renderSimGroupFull(g) {
  const matches = SIM_GROUPS[g] || [];
  let html = '<div class="sim-group-wrap"><div class="sim-matches">';

  for (const { key, home, away } of matches) {
    const s = simScores[key];
    const hf = FLAGS_MAP[home]||'', af = FLAGS_MAP[away]||'';
    html += `<div class="sim-match-row">
      <span class="sim-team sim-home">${hf} ${home}</span>
      <div class="sim-score-wrap">
        <input class="sim-inp" type="number" min="0" max="99" value="${s.home}" placeholder="—"
               oninput="simScore('${key}','home',this.value,'${g}')">
        <span class="sim-dash">–</span>
        <input class="sim-inp" type="number" min="0" max="99" value="${s.away}" placeholder="—"
               oninput="simScore('${key}','away',this.value,'${g}')">
      </div>
      <span class="sim-team sim-away">${away} ${af}</span>
    </div>`;
  }

  html += `</div><div id="sim-standings-${g}">${simStandingsHTML(g)}</div></div>`;
  document.getElementById('sim-group-panel').innerHTML = html;
  renderSimThirds();
}

function simScore(key, side, val, g) {
  simScores[key][side] = val;
  const el = document.getElementById('sim-standings-' + g);
  if (el) el.innerHTML = simStandingsHTML(g);
  renderSimThirds();
}

// ── Cálculo grupos ──────────────────────────────────────────────
function calcSimStandings(g) {
  const matches = SIM_GROUPS[g] || [];
  const stats = {};
  for (const { home, away } of matches) {
    if (!stats[home]) stats[home] = { pj:0,g:0,e:0,p:0,gf:0,gc:0,dg:0,pts:0 };
    if (!stats[away]) stats[away] = { pj:0,g:0,e:0,p:0,gf:0,gc:0,dg:0,pts:0 };
  }
  for (const { key, home, away } of matches) {
    const s = simScores[key];
    const h = parseInt(s.home), a = parseInt(s.away);
    if (isNaN(h)||isNaN(a)||s.home===''||s.away==='') continue;
    stats[home].pj++; stats[away].pj++;
    stats[home].gf+=h; stats[home].gc+=a; stats[home].dg=stats[home].gf-stats[home].gc;
    stats[away].gf+=a; stats[away].gc+=h; stats[away].dg=stats[away].gf-stats[away].gc;
    if      (h>a) { stats[home].g++; stats[home].pts+=3; stats[away].p++; }
    else if (h<a) { stats[away].g++; stats[away].pts+=3; stats[home].p++; }
    else          { stats[home].e++; stats[home].pts++; stats[away].e++; stats[away].pts++; }
  }
  return Object.entries(stats)
    .map(([team,s])=>({team,...s}))
    .sort((a,b)=>b.pts-a.pts||b.dg-a.dg||b.gf-a.gf||a.team.localeCompare(b.team,'es'));
}

function simStandingsHTML(g) {
  const rows = calcSimStandings(g).map((t,i) => {
    const flag = FLAGS_MAP[t.team]||'';
    const dg = t.pj>0?(t.dg>0?`+${t.dg}`:t.dg):'—';
    const cls = i===0?'sim-q1':i===1?'sim-q2':i===2?'sim-q3':'';
    return `<tr class="${cls}">
      <td class="sim-pos">${i+1}</td>
      <td class="sim-tnm">${flag} ${t.team}</td>
      <td>${t.pj}</td><td>${t.g}</td><td>${t.e}</td><td>${t.p}</td>
      <td>${t.gf}</td><td>${t.gc}</td>
      <td class="sim-dg">${dg}</td>
      <td class="sim-pts">${t.pts}</td>
    </tr>`;
  }).join('');
  return `<table class="sim-table">
    <thead><tr><th>#</th><th style="text-align:left">Equipo</th>
    <th>PJ</th><th>G</th><th>E</th><th>P</th><th>GF</th><th>GC</th><th>DG</th><th>Pts</th></tr></thead>
    <tbody>${rows}</tbody></table>`;
}

function renderSimThirds() {
  const el = document.getElementById('sim-thirds');
  if (!el) return;
  const thirds = getThirds(true);
  if (!thirds.length) {
    el.innerHTML = '<p class="sim-empty">Introduce resultados para ver el ranking de terceros.</p>';
    return;
  }
  const rows = thirds.map((t,i) => {
    const flag = FLAGS_MAP[t.team]||'';
    const dg = t.dg>0?`+${t.dg}`:t.dg;
    return `<tr class="${i<8?'sim-q1':''}">
      <td class="sim-pos">${i+1}</td>
      <td class="sim-tnm">${flag} ${t.team} <span class="sim-gbadge">G.${t.group}</span></td>
      <td class="sim-pts">${t.pts}</td><td class="sim-dg">${dg}</td>
      <td>${t.gf}</td><td>${t.pj}</td>
    </tr>`;
  }).join('');
  el.innerHTML = `<table class="sim-table">
    <thead><tr><th>#</th><th style="text-align:left">Equipo</th>
    <th>Pts</th><th>DG</th><th>GF</th><th>PJ</th></tr></thead>
    <tbody>${rows}</tbody></table>`;
}

// ── Bracket — resolución de slots ───────────────────────────────
function getThirds(withMeta = false) {
  const list = [];
  for (const g of Object.keys(SIM_GROUPS).sort()) {
    const st = calcSimStandings(g);
    if (st.length >= 3 && st[2].pj > 0) list.push({ ...st[2], group: g });
  }
  list.sort((a,b) => b.pts-a.pts || b.dg-a.dg || b.gf-a.gf);
  return withMeta ? list : list.slice(0,8).map(t => t.team);
}

function resolveBracketSlot(slot) {
  if (/^[12][A-L]$/.test(slot)) {
    const pos = parseInt(slot[0]) - 1;
    const st  = calcSimStandings(slot[1]);
    return (st[pos] && st[pos].pj > 0) ? st[pos].team : null;
  }
  if (/^3#\d$/.test(slot)) {
    return getThirds()[parseInt(slot[2])] || null;
  }
  if (/^(P\d+|SF[12])$/.test(slot)) {
    return simWinners[slot] || null;
  }
  if (/^SF[12]L$/.test(slot)) {
    const sfId = slot.slice(0,3);
    const sfm  = SIM_BRACKET.find(m => m.pid === sfId);
    if (!sfm || !simWinners[sfId]) return null;
    const t1 = resolveBracketSlot(sfm.s1), t2 = resolveBracketSlot(sfm.s2);
    return simWinners[sfId] === t1 ? t2 : t1;
  }
  return null;
}

function slotLabel(slot) {
  if (/^1[A-L]$/.test(slot)) return `1º Gr.${slot[1]}`;
  if (/^2[A-L]$/.test(slot)) return `2º Gr.${slot[1]}`;
  if (/^3#\d$/.test(slot)) return `Mejor 3º #${parseInt(slot[2])+1}`;
  const m = SIM_BRACKET.find(x => x.pid === slot.replace('L',''));
  if (m) return `Gan. ${slot.replace(/L$/,' (perd.')}`;
  return slot;
}

function clearDownstream(pid) {
  for (const m of SIM_BRACKET) {
    if (m.s1 === pid || m.s2 === pid ||
        m.s1 === pid+'L' || m.s2 === pid+'L') {
      delete simWinners[m.pid];
      clearDownstream(m.pid);
    }
  }
}

// ── Bracket — picking ───────────────────────────────────────────
function simPickTeam(pid, which) {
  const m = SIM_BRACKET.find(x => x.pid === pid);
  if (!m) return;
  const team = resolveBracketSlot(m[which]);
  if (!team) return;
  if (simWinners[pid] === team) {
    delete simWinners[pid];
    clearDownstream(pid);
  } else {
    clearDownstream(pid);
    simWinners[pid] = team;
  }
  renderSimBracket();
}

// ── Bracket — render ────────────────────────────────────────────
function renderSimBracket() {
  const roundTabs = SIM_ROUNDS.map(r =>
    `<button class="sim-gtab${r.id===simBracketRound?' active':''}" onclick="simSetBracketRound('${r.id}')">${r.label}</button>`
  ).join('');

  const inner = document.getElementById('sim-bracket-inner');
  if (!inner) return;
  inner.innerHTML = `
    <div class="sim-group-tabs">${roundTabs}</div>
    <div class="sim-bkt-note">Selecciona el ganador de cada partido tocando el equipo.</div>
    <div id="sim-bkt-round"></div>`;

  renderSimBracketRound(simBracketRound);
}

function simSetBracketRound(id) {
  simBracketRound = id;
  document.querySelectorAll('#sim-bracket-inner .sim-gtab').forEach((b,i) =>
    b.classList.toggle('active', SIM_ROUNDS[i]?.id === id));
  renderSimBracketRound(id);
}

function renderSimBracketRound(id) {
  const el = document.getElementById('sim-bkt-round');
  if (!el) return;

  const matches = SIM_BRACKET.filter(m => m.r === id);
  let html = `<div class="sim-bkt-title">${SIM_ROUND_TITLE[id]||id}</div>`;

  for (const m of matches) {
    const t1 = resolveBracketSlot(m.s1);
    const t2 = resolveBracketSlot(m.s2);
    const w  = simWinners[m.pid];

    const f1 = t1 ? (FLAGS_MAP[t1]||'') : '';
    const f2 = t2 ? (FLAGS_MAP[t2]||'') : '';

    const n1 = t1 || slotLabel(m.s1);
    const n2 = t2 || slotLabel(m.s2);

    const c1 = !t1 ? 'sim-bkt-tbd' : w===t1 ? 'sim-bkt-win' : w ? 'sim-bkt-lost' : '';
    const c2 = !t2 ? 'sim-bkt-tbd' : w===t2 ? 'sim-bkt-win' : w ? 'sim-bkt-lost' : '';

    const click1 = t1 ? `onclick="simPickTeam('${m.pid}','s1')"` : '';
    const click2 = t2 ? `onclick="simPickTeam('${m.pid}','s2')"` : '';

    // Label especial para 3er puesto
    const matchLabel = m.pid === '3P' ? '3er y 4º Puesto' :
                       m.pid === 'FIN' ? '⭐ Gran Final' : '';

    html += `<div class="sim-bkt-match${m.pid==='FIN'?' sim-bkt-final':''}">
      ${matchLabel ? `<div class="sim-bkt-match-label">${matchLabel}</div>` : ''}
      <div class="sim-bkt-row">
        <div class="sim-bkt-team sim-bkt-left ${c1}" ${click1}>
          ${f1 ? `<span>${f1}</span>` : ''}<span class="sim-bkt-tname">${n1}</span>
        </div>
        <span class="sim-bkt-vs">–</span>
        <div class="sim-bkt-team sim-bkt-right ${c2}" ${click2}>
          <span class="sim-bkt-tname">${n2}</span>${f2 ? `<span>${f2}</span>` : ''}
        </div>
      </div>
    </div>`;
  }

  el.innerHTML = html;
}
