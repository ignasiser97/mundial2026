let fDate='', fChannel='', fTeam='';

function applyFilters() {
  fChannel = document.getElementById('f-channel').value;
  renderCalendar();
}

// ── Calendar Picker ────────────────────────────────────────────
let cpYear=2026, cpMonth=5;

const matchDays = new Set(MATCHES.map(([d,t])=>viewDate(d,t)));

function cpToggle(e) {
  e.stopPropagation();
  const popup = document.getElementById('cp-popup');
  const isHidden = popup.classList.contains('hidden');
  closeAll();
  if (isHidden) {
    popup.classList.remove('hidden');
    document.getElementById('cp-trigger').classList.add('active');
    cpRender();
  }
}
function cpPrev(e) {
  e.stopPropagation();
  cpMonth--; if(cpMonth<0){cpMonth=11;cpYear--;}
  cpRender();
}
function cpNext(e) {
  e.stopPropagation();
  cpMonth++; if(cpMonth>11){cpMonth=0;cpYear++;}
  cpRender();
}
function cpRender() {
  document.getElementById('cp-month').textContent = `${MONTHS_FULL[cpMonth]} ${cpYear}`;
  const firstDow = (new Date(Date.UTC(cpYear,cpMonth,1)).getUTCDay()+6)%7;
  const daysInMonth = new Date(Date.UTC(cpYear,cpMonth+1,0)).getUTCDate();
  let html='';
  for(let i=0;i<firstDow;i++) html+='<div class="cp-day"></div>';
  for(let d=1;d<=daysInMonth;d++){
    const ds = `${cpYear}-${String(cpMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const hasM = matchDays.has(ds);
    const sel  = ds===fDate;
    const cls  = ['cp-day', hasM?'has-match':'', sel?'selected':''].filter(Boolean).join(' ');
    html += hasM
      ? `<div class="${cls}" onclick="cpSelect('${ds}')">${d}</div>`
      : `<div class="${cls}">${d}</div>`;
  }
  document.getElementById('cp-days').innerHTML = html;
}
function cpSelect(ds) {
  fDate = ds;
  document.getElementById('cp-label').textContent = fmtDate(ds);
  document.getElementById('cp-trigger').classList.add('active');
  document.getElementById('cp-popup').classList.add('hidden');
  document.getElementById('cp-trigger').classList.remove('active');
  document.getElementById('cp-trigger').style.borderColor='var(--accent)';
  cpRender();
  renderCalendar();
}
function cpClear() {
  fDate='';
  document.getElementById('cp-label').textContent='Todas las fechas';
  document.getElementById('cp-trigger').style.borderColor='';
  document.getElementById('cp-popup').classList.add('hidden');
  cpRender();
  renderCalendar();
}

// ── Team Search ────────────────────────────────────────────────
function extractTeams() {
  const FLAGS_MAP = {
    'México':'🇲🇽','Corea del Sur':'🇰🇷','Rep. Checa':'🇨🇿','Sudáfrica':'🇿🇦',
    'Canadá':'🇨🇦','Suiza':'🇨🇭','Bosnia':'🇧🇦','Catar':'🇶🇦',
    'Brasil':'🇧🇷','Marruecos':'🇲🇦','Escocia':'🏴󠁧󠁢󠁳󠁣󠁴󠁿','Haití':'🇭🇹',
    'Estados Unidos':'🇺🇸','Australia':'🇦🇺','Turquía':'🇹🇷','Paraguay':'🇵🇾',
    'Alemania':'🇩🇪','Costa de Marfil':'🇨🇮','Ecuador':'🇪🇨','Curazao':'🇨🇼',
    'Países Bajos':'🇳🇱','Japón':'🇯🇵','Suecia':'🇸🇪','Túnez':'🇹🇳',
    'Bélgica':'🇧🇪','Nueva Zelanda':'🇳🇿','RI de Irán':'🇮🇷','Egipto':'🇪🇬',
    'España':'🇪🇸','Uruguay':'🇺🇾','Arabia Saudí':'🇸🇦','Cabo Verde':'🇨🇻',
    'Francia':'🇫🇷','Senegal':'🇸🇳','Noruega':'🇳🇴','Irak':'🇮🇶',
    'Argentina':'🇦🇷','Austria':'🇦🇹','Argelia':'🇩🇿','Jordania':'🇯🇴',
    'Portugal':'🇵🇹','Colombia':'🇨🇴','RD Congo':'🇨🇩','Uzbekistán':'🇺🇿',
    'Inglaterra':'🏴󠁧󠁢󠁥󠁮󠁧󠁿','Croacia':'🇭🇷','Ghana':'🇬🇭','Panamá':'🇵🇦',
  };
  const seen=new Set(); const list=[];
  for(const [,,label,,,,,phase] of MATCHES){
    if(phase!=='groups') continue;
    const base=label.split(' · ')[0];
    for(const t of base.split(' vs ')){
      const name=t.trim();
      if(name && !seen.has(name)){ seen.add(name); list.push([name, FLAGS_MAP[name]||'']); }
    }
  }
  return list.sort((a,b)=>a[0].localeCompare(b[0],'es'));
}

let tsTeams=[], tsSelected='';

function tsInit() {
  tsTeams = extractTeams();
  const ul = document.getElementById('ts-dropdown');
  const all=document.createElement('li');
  all.textContent='Todos los equipos'; all.dataset.value='';
  all.onclick=()=>tsSelect('','Todos los equipos');
  ul.appendChild(all);
  for(const [name,flag] of tsTeams){
    const li=document.createElement('li');
    li.textContent=`${flag} ${name}`; li.dataset.value=name;
    li.onclick=()=>tsSelect(name,`${flag} ${name}`);
    ul.appendChild(li);
  }
}
function tsFilter() {
  const q=document.getElementById('ts-input').value.toLowerCase();
  const dd=document.getElementById('ts-dropdown');
  dd.classList.remove('hidden');
  for(const li of dd.querySelectorAll('li'))
    li.hidden = q!=='' && !li.textContent.toLowerCase().includes(q);
}
function tsOpen() {
  closeAll();
  document.getElementById('ts-dropdown').classList.remove('hidden');
}
function tsKey(e) {
  if(e.key==='Escape') document.getElementById('ts-dropdown').classList.add('hidden');
}
function tsSelect(value, label) {
  fTeam=value; tsSelected=value;
  document.getElementById('ts-input').value = value ? label : '';
  document.getElementById('ts-input').placeholder = value ? '' : '🔍 Todos los equipos';
  document.getElementById('ts-dropdown').classList.add('hidden');
  applyFilters();
}

// ── Close popups ───────────────────────────────────────────────
function closeAll() {
  document.getElementById('cp-popup').classList.add('hidden');
  document.getElementById('ts-dropdown').classList.add('hidden');
}
document.addEventListener('click', e => {
  if(!document.getElementById('cp-wrap').contains(e.target))
    document.getElementById('cp-popup').classList.add('hidden');
  if(!document.getElementById('ts-wrap').contains(e.target))
    document.getElementById('ts-dropdown').classList.add('hidden');
});

// ── Render calendario ──────────────────────────────────────────
function renderCalendar() {
  const filtered = MATCHES.filter(([date,time,label,,,ch,flags])=>{
    const vd=viewDate(date,time);
    if(fDate && vd!==fDate) return false;
    if(fChannel==='la1' && !ch.includes('l')) return false;
    if(fChannel==='dazn' && ch.includes('l')) return false;
    if(fTeam){
      const isSpain=fTeam==='España';
      if(!label.includes(fTeam) && !(isSpain && (flags===1||flags===2))) return false;
    }
    return true;
  }).sort((a,b)=>new Date(a[0]+'T'+a[1]).getTime()-new Date(b[0]+'T'+b[1]).getTime());

  if(!filtered.length){
    document.getElementById('cal-content').innerHTML='<p class="empty">No hay partidos con estos filtros.</p>';
    return;
  }
  const byDay={};
  for(const m of filtered){
    const vd=viewDate(m[0],m[1]);
    (byDay[vd]=byDay[vd]||[]).push(m);
  }
  let html='', lastPhase='';
  for(const vd of Object.keys(byDay).sort()){
    html+=`<div class="day-header">${fmtDate(vd)}</div>`;
    for(const m of byDay[vd]){
      const [date,time,label,venue,,ch,flags,phase]=m;
      if(phase!==lastPhase){ html+=`<div class="phase-banner">${PHASES[phase]||phase}</div>`; lastPhase=phase; }
      const night=isNight(time);
      const rowCls=['match-row',flags===1?'spain':flags===2?'spain-pos':''].filter(Boolean).join(' ');
      const timeCls='time'+(night?' night':'');
      const spanFlag=flags===1?'🇪🇸 ':flags===2?'⭐ ':'';
      const badges=(ch.includes('d')?'<span class="badge bd">DAZN</span>':'')+(ch.includes('l')?'<span class="badge bl">LA 1</span>':'');
      html+=`<div class="${rowCls}">
        <div class="${timeCls}">${time}<small>ESP${night?' 🌙':''}</small></div>
        <div class="match-info">
          <div class="match-name">${spanFlag}${badges} ${label}</div>
          <div class="match-meta">${venue}</div>
        </div>
      </div>`;
    }
  }
  document.getElementById('cal-content').innerHTML=html;
}
