let grpSubTab    = 'grupos';
let bracketPhase = 'r32';

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

async function loadGroups() {
  const el=document.getElementById('groups-content');
  try{
    const res=await fetch('./standings.json?t='+Date.now());
    if(!res.ok) throw new Error(res.status);
    const data=await res.json();
    const upd=new Date(data.updated);
    document.getElementById('last-updated').textContent=
      'Actualizado: '+upd.toLocaleDateString('es-ES')+' '+
      upd.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
    let html='<div class="groups-grid">';
    for(const [letter,teams] of Object.entries(data.groups)) html+=renderGroup(letter,teams);
    html+='</div>';
    el.innerHTML=html;
  }catch(e){ el.innerHTML='<p class="empty">No se pudieron cargar las clasificaciones.</p>'; }
}

function renderGroup(letter, teams) {
  const rows=teams.map(t=>{
    const dgCls=t.dg>0?'pos':t.dg<0?'neg':'';
    const dg=t.dg>0?'+'+t.dg:t.dg;
    const isSpain=t.team==='España';
    return `<tr${isSpain?' class="spain-row"':''}>
      <td class="tnm">${t.flag||''} ${t.team}</td>
      <td>${t.pj}</td><td class="pts">${t.pts}</td>
      <td>${t.gf}</td><td>${t.gc}</td>
      <td class="${dgCls}">${dg}</td>
    </tr>`;
  }).join('');
  return `<div class="group-card">
    <div class="group-title">Grupo ${letter}</div>
    <table class="standings-table">
      <thead><tr><th>Equipo</th><th>PJ</th><th>Pts</th><th>GF</th><th>GC</th><th>DG</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
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

function bktCard(code, pmap, extra='') {
  const m = pmap[code];
  if (!m) return `<div class="bkt-m${extra?''+extra:''}"><div class="bkt-team">TBD</div><div class="bkt-div"></div><div class="bkt-team">TBD</div></div>`;
  const parts = m[2].split('·')[0].trim().split(' vs ');
  const home  = parts[0]?.trim() || 'TBD';
  const away  = parts[1]?.trim() || 'TBD';
  return `<div class="bkt-m${extra}">
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

let bktMap = {};

function renderBracket() {
  const el = document.getElementById('bracket-content');
  bktMap = buildPMap();

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

  el.innerHTML = `<div class="bkt-scroll"><div class="bkt-tree">${leftHTML}${sf1}${center}${sf2}${rightHTML}</div></div>`;
}
