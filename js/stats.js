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

    if(!scorers.length && !assists.length){
      el.innerHTML='<p class="stats-empty">Sin datos todavía.<br>Las estadísticas aparecerán cuando empiece el torneo el <strong>11 de junio</strong>.</p>';
      return;
    }
    el.innerHTML=renderStatsSection('Máximos Goleadores','goals',scorers)+
                 renderStatsSection('Máximos Asistentes','assists',assists);
  }catch(e){ el.innerHTML='<p class="empty">No se pudieron cargar las estadísticas.</p>'; }
}

function renderStatsSection(title, key, players) {
  if(!players.length) return '';
  const rows=players.map((p,i)=>`<tr>
    <td class="rank">${i+1}</td>
    <td class="player-name">${p.flag||''} ${p.player}</td>
    <td class="team-name">${p.team}</td>
    <td class="stat-val">${p[key]||0}</td>
  </tr>`).join('');
  return `<div class="stats-section">
    <div class="stats-title">${title}</div>
    <table class="stats-table">
      <thead><tr><th>#</th><th>Jugador</th><th>Equipo</th><th>${key==='goals'?'Goles':'Asist.'}</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}
