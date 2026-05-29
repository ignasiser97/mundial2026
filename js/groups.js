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

// ── Bracket ────────────────────────────────────────────────────

function renderBracket() {
  const el = document.getElementById('bracket-content');

  const chips = BRACKET_PHASES.map(p =>
    `<button class="bp-chip ${p.key===bracketPhase?'active':''}" onclick="setBracketPhase('${p.key}')">${p.label}</button>`
  ).join('');

  const matches = MATCHES.filter(m => m[7] === bracketPhase);

  const cards = matches.map(m => {
    const parts = m[2].split('·')[0].split(' vs ');
    const home  = parts[0]?.trim() || '';
    const away  = parts[1]?.trim() || '';
    const night = isNight(m[1]);
    const chBadges = (m[5].includes('d') ? '<span class="badge bd">DAZN</span>' : '') +
                     (m[5].includes('l') ? '<span class="badge bl">LA 1</span>' : '');
    return `
      <div class="bracket-match-card">
        <div class="bm-date">${fmtDate(m[0])} · ${m[1]} ESP${night?' 🌙':''} ${chBadges}</div>
        <div class="bm-teams">
          <span class="bm-team">${home}</span>
          <span class="bm-vs">VS</span>
          <span class="bm-team away">${away}</span>
        </div>
        <div class="bm-venue">${m[3]}</div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div class="bracket-phases">${chips}</div>
    <div class="bracket-list">
      ${cards || '<div class="empty">No hay partidos en esta fase.</div>'}
    </div>`;
}

function setBracketPhase(phase) {
  bracketPhase = phase;
  renderBracket();
}
