let SQUADS_DATA = null;
let sqdDid = 0;
let sqdClubListenerAdded = false;
let sqdPendingTeam = null;

const SQUAD_NAMES_ES = {
  "Algeria":"Argelia","Argentina":"Argentina","Australia":"Australia",
  "Austria":"Austria","Belgium":"Bélgica","Bosnia and Herzegovina":"Bosnia",
  "Brazil":"Brasil","Canada":"Canadá","Cape Verde":"Cabo Verde",
  "Colombia":"Colombia","Croatia":"Croacia","Curaçao":"Curazao",
  "Czech Republic":"Rep. Checa","DR Congo":"RD Congo","Ecuador":"Ecuador",
  "Egypt":"Egipto","England":"Inglaterra","France":"Francia",
  "Germany":"Alemania","Ghana":"Ghana","Haiti":"Haití",
  "Iran":"RI de Irán","Iraq":"Irak","Ivory Coast":"Costa de Marfil",
  "Japan":"Japón","Jordan":"Jordania","Mexico":"México",
  "Morocco":"Marruecos","Netherlands":"Países Bajos","New Zealand":"Nueva Zelanda",
  "Norway":"Noruega","Panama":"Panamá","Paraguay":"Paraguay",
  "Portugal":"Portugal","Qatar":"Catar","Saudi Arabia":"Arabia Saudí",
  "Scotland":"Escocia","Senegal":"Senegal","South Africa":"Sudáfrica",
  "South Korea":"Corea del Sur","Spain":"España","Sweden":"Suecia",
  "Switzerland":"Suiza","Tunisia":"Túnez","Turkey":"Turquía",
  "United States":"Estados Unidos","Uruguay":"Uruguay","Uzbekistan":"Uzbekistán",
};

const POS_ES    = { GK:'Porteros', DF:'Defensas', MF:'Centrocampistas', FW:'Delanteros' };
const POS_ORDER = ['GK','DF','MF','FW'];
const MONTHS_SHORT_SQD = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];

function sqdNameES(en) { return SQUAD_NAMES_ES[en] || en; }
function sqdFlag(en)   { return FLAGS_MAP[sqdNameES(en)] || ''; }
function sqdCleanName(name) { return name.replace(/\s*\(\s*captain\s*\)/i,'').trim(); }
function sqdIsCaptain(name) { return /captain/i.test(name); }
function sqdFormatDob(dob) {
  if (!dob) return '—';
  const [y,m,d] = dob.split('-');
  return `${parseInt(d)} ${MONTHS_SHORT_SQD[parseInt(m)-1]}. ${y}`;
}

async function loadSquads() {
  if (SQUADS_DATA) return SQUADS_DATA;
  const res = await fetch('./squads.json?t=' + Date.now());
  if (!res.ok) throw new Error(res.status);
  SQUADS_DATA = await res.json();
  return SQUADS_DATA;
}

async function initSquads() {
  const wrap = document.getElementById('sqd-content');
  try {
    const data = await loadSquads();
    renderSquadsShell(data);
  if (sqdPendingTeam) {
      const en = sqdPendingTeam;
      sqdPendingTeam = null;
      sqdApplyCountry(en);
    }
  } catch(e) {
    wrap.innerHTML = '<p class="empty">No se pudieron cargar los convocados.</p>';
  }
}

function sqdApplyCountry(enName) {
  const sel = document.getElementById('sqd-country');
  if (!sel) return;
  sel.value = enName;
  sqdClubSelect('', '');
  document.getElementById('sqd-search').value = '';
  renderCountrySquad(enName);
}

function sqdGoToTeam(esName) {
  const enName = Object.entries(SQUAD_NAMES_ES).find(([,es]) => es === esName)?.[0];
  if (!enName) return;
  if (SQUADS_DATA && document.getElementById('sqd-country')) {
    switchTab('sqd');
    sqdApplyCountry(enName);
  } else {
    sqdPendingTeam = enName;
    switchTab('sqd');
  }
  window.scrollTo(0, 0);
}

function renderSquadsShell(data) {
  const teams = Object.keys(data.by_team).sort((a,b) =>
    sqdNameES(a).localeCompare(sqdNameES(b), 'es'));

  const clubs = [...new Set(
    data.players.map(p => p.club).filter(Boolean)
  )].sort((a,b) => a.localeCompare(b, 'es'));

  const countryOpts = teams.map(t => {
    const sel = t === 'Spain' ? ' selected' : '';
    return `<option value="${t}"${sel}>${sqdFlag(t)} ${sqdNameES(t)}</option>`;
  }).join('');

  document.getElementById('sqd-content').innerHTML = `
    <div class="sqd-filters">
      <select class="sqd-select" id="sqd-country" onchange="sqdSelectCountry(this.value)">
        <option value="">🌍 País…</option>
        ${countryOpts}
      </select>
      <div class="ts-wrap sqd-club-wrap" id="sqd-club-wrap">
        <input class="ts-input" id="sqd-club-input" type="text"
               placeholder="🏟 Club…"
               oninput="sqdClubFilter()" onfocus="sqdClubOpen()"
               onkeydown="sqdClubKey(event)" autocomplete="off">
        <ul class="ts-dropdown hidden" id="sqd-club-dropdown"></ul>
      </div>
      <input class="sqd-search-input" id="sqd-search" type="text"
             placeholder="🔍 Jugador…"
             oninput="sqdSearchPlayer(this.value)" autocomplete="off">
    </div>
    <div id="sqd-result"></div>`;

  // Poblar dropdown de clubes
  const dd = document.getElementById('sqd-club-dropdown');
  const allLi = document.createElement('li');
  allLi.textContent = 'Todos los clubes';
  allLi.onclick = () => sqdClubSelect('', '');
  dd.appendChild(allLi);
  for (const c of clubs) {
    const li = document.createElement('li');
    li.textContent = c;
    li.dataset.value = c;
    li.onclick = () => sqdClubSelect(c, c);
    dd.appendChild(li);
  }

  // Cerrar dropdown al clicar fuera (una sola vez)
  if (!sqdClubListenerAdded) {
    sqdClubListenerAdded = true;
    document.addEventListener('click', e => {
      const wrap = document.getElementById('sqd-club-wrap');
      if (wrap && !wrap.contains(e.target))
        document.getElementById('sqd-club-dropdown')?.classList.add('hidden');
    });
  }

  renderCountrySquad('Spain');
}

// ── Club dropdown ──────────────────────────────────────────────
function sqdClubFilter() {
  filterDropdown('sqd-club-input', 'sqd-club-dropdown');
  if (!document.getElementById('sqd-club-input').value) sqdSelectClub('');
}
function sqdClubOpen() { openDropdown('sqd-club-dropdown'); }
function sqdClubKey(e) { if (e.key === 'Escape') closeDropdown('sqd-club-dropdown'); }
function sqdClubSelect(club, label) {
  const input = document.getElementById('sqd-club-input');
  input.value = label ?? '';
  input.placeholder = label ? '' : '🏟 Club…';
  closeDropdown('sqd-club-dropdown');
  sqdSelectClub(club);
}

// ── Filtros ────────────────────────────────────────────────────
function sqdSelectCountry(teamEn) {
  sqdClubSelect('', '');
  document.getElementById('sqd-search').value = '';
  if (!teamEn) { document.getElementById('sqd-result').innerHTML = ''; return; }
  renderCountrySquad(teamEn);
}

function sqdSelectClub(club) {
  document.getElementById('sqd-country').value = '';
  document.getElementById('sqd-search').value = '';
  if (!club) { document.getElementById('sqd-result').innerHTML = ''; return; }
  renderClubResults(club);
}

function sqdSearchPlayer(raw) {
  const q = raw.trim().toLowerCase();
  document.getElementById('sqd-country').value = '';
  sqdClubSelect('', '');
  if (!q) { document.getElementById('sqd-result').innerHTML = ''; return; }
  renderPlayerResults(q);
}

// ── Toggle detalle ─────────────────────────────────────────────
function sqdToggle(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const opening = el.classList.contains('hidden');
  el.classList.toggle('hidden');
  el.previousElementSibling?.querySelector('.sqd-chevron')
    ?.classList.toggle('sqd-chevron-open', opening);
}

// ── Render helpers ─────────────────────────────────────────────
function sqdPlayerRow(p, showCountry = false) {
  const name = sqdCleanName(p.name);
  const cap  = sqdIsCaptain(p.name) ? '<span class="sqd-cap">C</span>' : '';
  const pos  = p.position || '?';
  const did  = `sqd-d-${sqdDid++}`;

  const mainRow = showCountry
    ? `<div class="sqd-row sqd-search-row sqd-clickable" onclick="sqdToggle('${did}')">
        <span class="sqd-badge sqd-b-${pos.toLowerCase()}">${pos}</span>
        <div class="sqd-search-info">
          <span class="sqd-name">${name}${cap}</span>
          <span class="sqd-search-sub">${p.club || '—'} · ${sqdFlag(p.team)} ${sqdNameES(p.team)}</span>
        </div>
        <span class="sqd-chevron">›</span>
      </div>`
    : `<div class="sqd-row sqd-clickable" onclick="sqdToggle('${did}')">
        <span class="sqd-shirt">${p.shirt_number ?? '—'}</span>
        <span class="sqd-badge sqd-b-${pos.toLowerCase()}">${pos}</span>
        <span class="sqd-name">${name}${cap}</span>
        <span class="sqd-club">${p.club || '—'}</span>
        <span class="sqd-chevron">›</span>
      </div>`;

  const detailRow = `<div class="sqd-detail hidden" id="${did}">
    <div class="sqd-detail-inner">
      <span>Nacimiento: <strong>${sqdFormatDob(p.date_of_birth)}${p.age ? ` (${p.age} años)` : ''}</strong></span>
      <span>Internacionales: <strong>${p.caps ?? '—'}</strong></span>
      <span>Goles selección: <strong>${p.goals ?? '—'}</strong></span>
    </div>
  </div>`;

  return mainRow + detailRow;
}

function renderCountrySquad(teamEn) {
  sqdDid = 0;
  const players = SQUADS_DATA.by_team[teamEn] || [];
  const byPos = {};
  POS_ORDER.forEach(p => byPos[p] = []);
  players.forEach(p => { (byPos[p.position] ?? byPos['FW']).push(p); });

  let html = `<div class="sqd-team-header">
    <span class="sqd-team-flag">${sqdFlag(teamEn)}</span>
    <span class="sqd-team-name">${sqdNameES(teamEn)}</span>
    <span class="sqd-team-count">${players.length} jugadores</span>
  </div>`;

  for (const pos of POS_ORDER) {
    const group = byPos[pos].sort((a,b) => (a.shirt_number??99) - (b.shirt_number??99));
    if (!group.length) continue;
    html += `<div class="sqd-pos-section">
      <div class="sqd-pos-header sqd-ph-${pos.toLowerCase()}">${POS_ES[pos]}</div>`;
    for (const p of group) html += sqdPlayerRow(p, false);
    html += `</div>`;
  }

  document.getElementById('sqd-result').innerHTML = html;
}

function renderClubResults(club) {
  sqdDid = 0;
  const matches = SQUADS_DATA.players.filter(p => p.club === club);
  if (!matches.length) {
    document.getElementById('sqd-result').innerHTML = '<p class="empty" style="padding:24px 16px">Sin resultados.</p>';
    return;
  }
  let html = `<div class="sqd-search-meta">${club} · ${matches.length} jugador${matches.length !== 1 ? 'es' : ''}</div><div class="sqd-search-list">`;
  for (const p of matches) html += sqdPlayerRow(p, true);
  document.getElementById('sqd-result').innerHTML = html + '</div>';
}

function renderPlayerResults(q) {
  sqdDid = 0;
  const matches = SQUADS_DATA.players.filter(p =>
    sqdCleanName(p.name).toLowerCase().includes(q)
  );
  if (!matches.length) {
    document.getElementById('sqd-result').innerHTML = '<p class="empty" style="padding:24px 16px">Sin resultados.</p>';
    return;
  }
  let html = `<div class="sqd-search-meta">${matches.length} resultado${matches.length !== 1 ? 's' : ''}</div><div class="sqd-search-list">`;
  for (const p of matches) html += sqdPlayerRow(p, true);
  document.getElementById('sqd-result').innerHTML = html + '</div>';
}
