function toggleStatDetail(id) {
  document.getElementById(id)?.classList.toggle('hidden');
}

async function loadStats() {
  const el=document.getElementById('stats-content');
  try{
    const res=await fetch('./standings.json?t='+Date.now());
    if(!res.ok) throw new Error(res.status);
    const data=await res.json();
    const upd=new Date(data.updated);
    document.getElementById('last-updated-sts').textContent=
      'Actualizado: '+upd.toLocaleDateString('es-ES')+' '+
      upd.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});

    const scorers=data.topScorers||[];
    const assists=data.topAssists||[];

    // pjMap: partidos jugados por equipo (para ratio goles/partido)
    const pjMap={};
    for(const teams of Object.values(data.groups||{}))
      for(const t of teams) pjMap[t.team]=t.pj;

    if(!scorers.length && !assists.length){
      el.innerHTML='<p class="stats-empty">Sin datos todavía.<br>Las estadísticas aparecerán cuando empiece el torneo el <strong>11 de junio</strong>.</p>';
      return;
    }
    el.innerHTML=renderStatsSection('Máximos Goleadores','goals',scorers,pjMap)+
                 renderStatsSection('Máximos Asistentes','assists',assists,pjMap);
  }catch(e){ el.innerHTML='<p class="empty">No se pudieron cargar las estadísticas.</p>'; }
}

function renderStatsSection(title, key, players, pjMap={}) {
  if(!players.length) return '';
  const rows=players.map((p,i)=>{
    const pj=pjMap[p.team]||0;
    const ratio=pj>0?((p[key]||0)/pj).toFixed(2):'—';
    const other=key==='goals'?p.assists:p.goals;
    const sid=`sdetail-${key}-${i}`;
    return `<tr class="stats-player-row" onclick="toggleStatDetail('${sid}')">
      <td class="rank">${i+1}</td>
      <td class="player-name">${p.flag||''} ${p.player}</td>
      <td class="team-name">${p.team}</td>
      <td class="stat-val">${p[key]||0}</td>
    </tr>
    <tr class="stat-detail-row hidden" id="${sid}">
      <td colspan="4"><div class="stat-detail-inner">
        <span>${key==='goals'?'Goles':'Asist.'}/partido: <strong>${ratio}</strong></span>
        <span>${key==='goals'?'Asistencias':'Goles'}: <strong>${other||0}</strong></span>
        <span>Partidos del equipo: <strong>${pj||'—'}</strong></span>
      </div></td>
    </tr>`;
  }).join('');
  return `<div class="stats-section">
    <div class="stats-title">${title}</div>
    <table class="stats-table">
      <thead><tr><th>#</th><th>Jugador</th><th>Equipo</th><th>${key==='goals'?'Goles':'Asist.'}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}
