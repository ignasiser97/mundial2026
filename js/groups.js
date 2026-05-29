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
