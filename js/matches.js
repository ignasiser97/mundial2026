// [fecha, hora, nombre, sede, país_sede, canales, flags, fase]
//   canales: 'd'=solo DAZN  'dl'=DAZN+La1
//   flags:   0=ninguno  1=España juega  2=España posible
const MATCHES = [
  // ── FASE DE GRUPOS ─────────────────────────────────────────────
  ['2026-06-11','21:00','México vs Sudáfrica · Grupo A',           'Estadio Azteca, Ciudad de México',      'MEX','dl',0,'groups'],
  ['2026-06-12','04:00','Corea del Sur vs Rep. Checa · Grupo A',   'Estadio Akron, Guadalajara',            'MEX','d', 0,'groups'],
  ['2026-06-12','21:00','Canadá vs Bosnia · Grupo B',              'BMO Field, Toronto',                   'CAN','dl',0,'groups'],
  ['2026-06-13','03:00','Estados Unidos vs Paraguay · Grupo D',    'SoFi Stadium, Los Ángeles',             'USA','d', 0,'groups'],
  ['2026-06-13','21:00','Catar vs Suiza · Grupo B',                "Levi's Stadium, San Francisco",        'USA','d', 0,'groups'],
  ['2026-06-14','00:00','Brasil vs Marruecos · Grupo C',           'MetLife Stadium, Nueva Jersey',         'USA','dl',0,'groups'],
  ['2026-06-14','03:00','Haití vs Escocia · Grupo C',              'Gillette Stadium, Boston',              'USA','d', 0,'groups'],
  ['2026-06-14','06:00','Australia vs Turquía · Grupo D',          'BC Place, Vancouver',                  'CAN','d', 0,'groups'],
  ['2026-06-14','19:00','Alemania vs Curazao · Grupo E',           'NRG Stadium, Houston',                  'USA','dl',0,'groups'],
  ['2026-06-14','22:00','Países Bajos vs Japón · Grupo F',         'AT&T Stadium, Dallas',                  'USA','d', 0,'groups'],
  ['2026-06-15','01:00','Costa de Marfil vs Ecuador · Grupo E',    'Lincoln Financial Field, Filadelfia',   'USA','d', 0,'groups'],
  ['2026-06-15','04:00','Suecia vs Túnez · Grupo F',               'Estadio BBVA, Guadalupe',               'MEX','d', 0,'groups'],
  ['2026-06-15','18:00','España vs Cabo Verde · Grupo H',          'Mercedes-Benz Stadium, Atlanta',        'USA','dl',1,'groups'],
  ['2026-06-15','21:00','Bélgica vs Egipto · Grupo G',             'Lumen Field, Seattle',                  'USA','d', 0,'groups'],
  ['2026-06-16','00:00','Arabia Saudí vs Uruguay · Grupo H',       'Hard Rock Stadium, Miami',              'USA','d', 0,'groups'],
  ['2026-06-16','03:00','RI de Irán vs Nueva Zelanda · Grupo G',   'SoFi Stadium, Los Ángeles',             'USA','d', 0,'groups'],
  ['2026-06-16','21:00','Francia vs Senegal · Grupo I',            'MetLife Stadium, Nueva Jersey',         'USA','dl',0,'groups'],
  ['2026-06-17','00:00','Irak vs Noruega · Grupo I',               'Gillette Stadium, Boston',              'USA','d', 0,'groups'],
  ['2026-06-17','03:00','Argentina vs Argelia · Grupo J',          'Arrowhead Stadium, Kansas City',        'USA','d', 0,'groups'],
  ['2026-06-17','06:00','Austria vs Jordania · Grupo J',           "Levi's Stadium, San Francisco",        'USA','d', 0,'groups'],
  ['2026-06-17','19:00','Portugal vs RD Congo · Grupo K',          'NRG Stadium, Houston',                  'USA','d', 0,'groups'],
  ['2026-06-17','22:00','Inglaterra vs Croacia · Grupo L',         'AT&T Stadium, Dallas',                  'USA','dl',0,'groups'],
  ['2026-06-18','01:00','Ghana vs Panamá · Grupo L',               'BMO Field, Toronto',                   'CAN','d', 0,'groups'],
  ['2026-06-18','04:00','Uzbekistán vs Colombia · Grupo K',        'Estadio Azteca, Ciudad de México',      'MEX','d', 0,'groups'],
  ['2026-06-18','18:00','Rep. Checa vs Sudáfrica · Grupo A',       'Mercedes-Benz Stadium, Atlanta',        'USA','d', 0,'groups'],
  ['2026-06-18','21:00','Suiza vs Bosnia · Grupo B',               'SoFi Stadium, Los Ángeles',             'USA','dl',0,'groups'],
  ['2026-06-19','00:00','Canadá vs Catar · Grupo B',               'BC Place, Vancouver',                  'CAN','d', 0,'groups'],
  ['2026-06-19','03:00','México vs Corea del Sur · Grupo A',       'Estadio Akron, Guadalajara',            'MEX','d', 0,'groups'],
  ['2026-06-19','21:00','Estados Unidos vs Australia · Grupo D',   'Lumen Field, Seattle',                  'USA','dl',0,'groups'],
  ['2026-06-20','00:00','Escocia vs Marruecos · Grupo C',          'Lincoln Financial Field, Filadelfia',   'USA','d', 0,'groups'],
  ['2026-06-20','03:00','Brasil vs Haití · Grupo C',               'Gillette Stadium, Boston',              'USA','d', 0,'groups'],
  ['2026-06-20','05:00','Turquía vs Paraguay · Grupo D',           "Levi's Stadium, San Francisco",        'USA','d', 0,'groups'],
  ['2026-06-20','19:00','Países Bajos vs Suecia · Grupo F',        'NRG Stadium, Houston',                  'USA','dl',0,'groups'],
  ['2026-06-20','22:00','Alemania vs Costa de Marfil · Grupo E',   'BMO Field, Toronto',                   'CAN','d', 0,'groups'],
  ['2026-06-21','02:00','Ecuador vs Curazao · Grupo E',            'Arrowhead Stadium, Kansas City',        'USA','d', 0,'groups'],
  ['2026-06-21','06:00','Túnez vs Japón · Grupo F',                'Estadio BBVA, Guadalupe',               'MEX','d', 0,'groups'],
  ['2026-06-21','18:00','España vs Arabia Saudí · Grupo H',        'Mercedes-Benz Stadium, Atlanta',        'USA','dl',1,'groups'],
  ['2026-06-21','21:00','Bélgica vs RI de Irán · Grupo G',          'SoFi Stadium, Los Ángeles',             'USA','d', 0,'groups'],
  ['2026-06-22','00:00','Uruguay vs Cabo Verde · Grupo H',         'Hard Rock Stadium, Miami',              'USA','d', 0,'groups'],
  ['2026-06-22','03:00','Nueva Zelanda vs Egipto · Grupo G',       'BC Place, Vancouver',                  'CAN','d', 0,'groups'],
  ['2026-06-22','19:00','Argentina vs Austria · Grupo J',          'AT&T Stadium, Dallas',                  'USA','dl',0,'groups'],
  ['2026-06-22','23:00','Francia vs Irak · Grupo I',               'Lincoln Financial Field, Filadelfia',   'USA','d', 0,'groups'],
  ['2026-06-23','02:00','Noruega vs Senegal · Grupo I',            'MetLife Stadium, Nueva Jersey',         'USA','d', 0,'groups'],
  ['2026-06-23','05:00','Jordania vs Argelia · Grupo J',           "Levi's Stadium, San Francisco",        'USA','d', 0,'groups'],
  ['2026-06-23','19:00','Portugal vs Uzbekistán · Grupo K',        'NRG Stadium, Houston',                  'USA','d', 0,'groups'],
  ['2026-06-23','22:00','Inglaterra vs Ghana · Grupo L',           'Gillette Stadium, Boston',              'USA','dl',0,'groups'],
  ['2026-06-24','01:00','Panamá vs Croacia · Grupo L',             'BMO Field, Toronto',                   'CAN','d', 0,'groups'],
  ['2026-06-24','04:00','Colombia vs RD Congo · Grupo K',          'Estadio Akron, Guadalajara',            'MEX','d', 0,'groups'],
  ['2026-06-24','21:00','Suiza vs Canadá · Grupo B',               'BC Place, Vancouver',                  'CAN','d', 0,'groups'],
  ['2026-06-24','21:00','Bosnia vs Catar · Grupo B',               'Lumen Field, Seattle',                  'USA','d', 0,'groups'],
  ['2026-06-25','00:00','Escocia vs Brasil · Grupo C',             'Hard Rock Stadium, Miami',              'USA','dl',0,'groups'],
  ['2026-06-25','00:00','Marruecos vs Haití · Grupo C',            'Mercedes-Benz Stadium, Atlanta',        'USA','d', 0,'groups'],
  ['2026-06-25','03:00','Rep. Checa vs México · Grupo A',          'Estadio Azteca, Ciudad de México',      'MEX','d', 0,'groups'],
  ['2026-06-25','03:00','Sudáfrica vs Corea del Sur · Grupo A',    'Estadio BBVA, Guadalupe',               'MEX','d', 0,'groups'],
  ['2026-06-25','22:00','Ecuador vs Alemania · Grupo E',           'MetLife Stadium, Nueva Jersey',         'USA','dl',0,'groups'],
  ['2026-06-25','22:00','Curazao vs Costa de Marfil · Grupo E',    'Lincoln Financial Field, Filadelfia',   'USA','d', 0,'groups'],
  ['2026-06-26','01:00','Túnez vs Países Bajos · Grupo F',         'Arrowhead Stadium, Kansas City',        'USA','d', 0,'groups'],
  ['2026-06-26','01:00','Japón vs Suecia · Grupo F',               'AT&T Stadium, Dallas',                  'USA','d', 0,'groups'],
  ['2026-06-26','04:00','Turquía vs Estados Unidos · Grupo D',     'SoFi Stadium, Los Ángeles',             'USA','d', 0,'groups'],
  ['2026-06-26','04:00','Paraguay vs Australia · Grupo D',         "Levi's Stadium, San Francisco",        'USA','d', 0,'groups'],
  ['2026-06-26','21:00','Noruega vs Francia · Grupo I',            'Gillette Stadium, Boston',              'USA','d', 0,'groups'],
  ['2026-06-26','21:00','Senegal vs Irak · Grupo I',               'BMO Field, Toronto',                   'CAN','d', 0,'groups'],
  ['2026-06-27','02:00','Uruguay vs España · Grupo H',             'Estadio Akron, Guadalajara',            'MEX','dl',1,'groups'],
  ['2026-06-27','02:00','Cabo Verde vs Arabia Saudí · Grupo H',    'NRG Stadium, Houston',                  'USA','d', 0,'groups'],
  ['2026-06-27','05:00','Nueva Zelanda vs Bélgica · Grupo G',      'Lumen Field, Seattle',                  'USA','d', 0,'groups'],
  ['2026-06-27','05:00','Egipto vs RI de Irán · Grupo G',          'BC Place, Vancouver',                  'CAN','d', 0,'groups'],
  ['2026-06-27','23:00','Panamá vs Inglaterra · Grupo L',          'MetLife Stadium, Nueva Jersey',         'USA','d', 0,'groups'],
  ['2026-06-27','23:00','Croacia vs Ghana · Grupo L',              'Lincoln Financial Field, Filadelfia',   'USA','d', 0,'groups'],
  ['2026-06-28','01:30','Colombia vs Portugal · Grupo K',          'Hard Rock Stadium, Miami',              'USA','dl',0,'groups'],
  ['2026-06-28','01:30','RD Congo vs Uzbekistán · Grupo K',        'Mercedes-Benz Stadium, Atlanta',        'USA','d', 0,'groups'],
  ['2026-06-28','04:00','Jordania vs Argentina · Grupo J',         'Arrowhead Stadium, Kansas City',        'USA','d', 0,'groups'],
  ['2026-06-28','04:00','Argelia vs Austria · Grupo J',            'AT&T Stadium, Dallas',                  'USA','d', 0,'groups'],
  // ── DIECISEISAVOS ──────────────────────────────────────────────
  ['2026-06-28','21:00','2º A vs 2º B · 1/32 (P73)',              'SoFi Stadium, Los Ángeles',             'USA','dl',0,'r32'],
  ['2026-06-29','19:00','1º C vs 2º F · 1/32 (P76)',              'NRG Stadium, Houston',                  'USA','dl',0,'r32'],
  ['2026-06-29','22:30','Alemania vs Paraguay · 1/32 (P74)',       'Gillette Stadium, Boston',              'USA','d', 0,'r32'],
  ['2026-06-30','03:00','1º F vs 2º C · 1/32 (P75)',              'Estadio BBVA, Guadalupe',               'MEX','d', 0,'r32'],
  ['2026-06-30','19:00','2º E vs 2º I · 1/32 (P78)',              'AT&T Stadium, Dallas',                  'USA','d', 0,'r32'],
  ['2026-06-30','23:00','Francia vs Suecia · 1/32 (P77)',          'MetLife Stadium, Nueva Jersey',         'USA','dl',0,'r32'],
  ['2026-07-01','03:00','México vs Ecuador · 1/32 (P79)',          'Estadio Azteca, Ciudad de México',      'MEX','d', 0,'r32'],
  ['2026-07-01','18:00','Inglaterra vs RD Congo · 1/32 (P80)',     'Mercedes-Benz Stadium, Atlanta',        'USA','dl',0,'r32'],
  ['2026-07-01','22:00','Bélgica vs Senegal · 1/32 (P82)',         'Lumen Field, Seattle',                  'USA','d', 0,'r32'],
  ['2026-07-02','02:00','Estados Unidos vs Bosnia · 1/32 (P81)',   "Levi's Stadium, San Francisco",        'USA','d', 0,'r32'],
  ['2026-07-02','21:00','1º H vs 2º J · 1/32 (P84)',              'SoFi Stadium, Los Ángeles',             'USA','dl',1,'r32'],
  ['2026-07-04','00:00','1º J vs 2º H · 1/32 (P86)',              'Hard Rock Stadium, Miami',              'USA','dl',0,'r32'],
  ['2026-07-03','01:00','2º K vs 2º L · 1/32 (P83)',              'BMO Field, Toronto',                   'CAN','d', 0,'r32'],
  ['2026-07-04','03:30','Colombia vs Ghana · 1/32 (P87)',          'Arrowhead Stadium, Kansas City',        'USA','d', 0,'r32'],
  ['2026-07-03','05:00','Suiza vs Argelia · 1/32 (P85)',           'BC Place, Vancouver',                  'CAN','d', 0,'r32'],
  ['2026-07-03','20:00','2º D vs 2º G · 1/32 (P88)',              'AT&T Stadium, Dallas',                  'USA','d', 0,'r32'],
  // ── OCTAVOS ────────────────────────────────────────────────────
  ['2026-07-04','19:00','P73 vs P75 · Octavos (P90)',             'NRG Stadium, Houston',                  'USA','dl',0,'r16'],
  ['2026-07-04','23:00','P74 vs P77 · Octavos (P89)',             'Lincoln Financial Field, Filadelfia',   'USA','dl',0,'r16'],
  ['2026-07-05','22:00','P76 vs P78 · Octavos (P91)',             'MetLife Stadium, Nueva Jersey',         'USA','dl',0,'r16'],
  ['2026-07-06','02:00','P79 vs P80 · Octavos (P92)',             'Estadio Azteca, Ciudad de México',      'MEX','dl',0,'r16'],
  ['2026-07-06','21:00','P83 vs P84 · Octavos (P93)',             'AT&T Stadium, Dallas',                  'USA','dl',1,'r16'],
  ['2026-07-07','02:00','P81 vs P82 · Octavos (P94)',             'Lumen Field, Seattle',                  'USA','dl',0,'r16'],
  ['2026-07-07','18:00','P86 vs P88 · Octavos (P95)',             'Mercedes-Benz Stadium, Atlanta',        'USA','dl',0,'r16'],
  ['2026-07-07','22:00','P85 vs P87 · Octavos (P96)',             'BC Place, Vancouver',                  'CAN','dl',0,'r16'],
  // ── CUARTOS ────────────────────────────────────────────────────
  ['2026-07-09','22:00','P89 vs P90 · Cuartos (P97)',             'Gillette Stadium, Boston',              'USA','dl',0,'qf'],
  ['2026-07-10','21:00','P93 vs P94 · Cuartos (P98)',             'SoFi Stadium, Los Ángeles',             'USA','dl',1,'qf'],
  ['2026-07-11','23:00','P91 vs P92 · Cuartos (P99)',             'Hard Rock Stadium, Miami',              'USA','dl',0,'qf'],
  ['2026-07-12','03:00','P95 vs P96 · Cuartos (P100)',            'Arrowhead Stadium, Kansas City',        'USA','dl',0,'qf'],
  // ── SEMIFINALES ────────────────────────────────────────────────
  ['2026-07-14','21:00','P97 vs P98 · Semifinal 1',               'AT&T Stadium, Dallas',                  'USA','dl',2,'sf'],
  ['2026-07-15','21:00','P99 vs P100 · Semifinal 2',              'Mercedes-Benz Stadium, Atlanta',        'USA','dl',0,'sf'],
  // ── TERCER PUESTO + FINAL ──────────────────────────────────────
  ['2026-07-18','23:00','3er y 4º puesto',                         'Hard Rock Stadium, Miami',              'USA','dl',2,'3p'],
  ['2026-07-19','21:00','Gran Final del Mundial 2026',             'MetLife Stadium, Nueva Jersey',         'USA','dl',2,'final'],
];
MATCHES.sort((a, b) => (a[0] + a[1]).localeCompare(b[0] + b[1]));

const PHASES = {
  groups:'Fase de Grupos', r32:'Dieciseisavos de Final',
  r16:'Octavos de Final',  qf:'Cuartos de Final',
  sf:'Semifinales',        '3p':'3er y 4º Puesto', final:'Gran Final',
};

const DAYS_ES   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MONTHS_ES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const MONTHS_FULL = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

function viewDate(date, time) {
  if (+time.split(':')[0] <= 6) {
    const [y,m,d] = date.split('-').map(Number);
    const dt = new Date(Date.UTC(y,m-1,d));
    dt.setUTCDate(dt.getUTCDate()-1);
    return dt.toISOString().slice(0,10);
  }
  return date;
}

function fmtDate(ds) {
  const [y,m,d] = ds.split('-').map(Number);
  const dt = new Date(Date.UTC(y,m-1,d));
  return `${DAYS_ES[dt.getUTCDay()]} ${d} de ${MONTHS_ES[m-1]}`;
}

// ── Shared utilities (usadas en calendar, groups, quiniela) ────

// ID único de partido — mismo formato en toda la app
function matchId(m) {
  const label = m[2].split('·')[0].trim().replace(/\s+vs\s+/g,'_vs_').replace(/\s/g,'');
  return `${m[0]}_${m[1]}_${label}`;
}

// Extrae [local, visitante] de una entrada MATCHES
function matchTeams(m) {
  const parts = m[2].split('·')[0].trim().split(' vs ');
  return [parts[0]?.trim() || '', parts[1]?.trim() || ''];
}

// Construye mapa completo de slots de eliminatorias:
//   '1º A' / '2º A' → { team, flag, provisional } desde grupos
//   'P73', 'P74'... → ganadores en cascada desde matchResults
// FLAGS_MAP debe estar disponible en scope global (calendar.js)
function buildFullSlotMap(data) {
  const map = {};

  // Lookup inverso: nombre sin espacios → nombre original (para decodificar IDs del scraper)
  const noSpaceToTeam = {};
  for (const t of Object.keys(FLAGS_MAP)) noSpaceToTeam[t.replace(/\s/g, '')] = t;

  // 1. Posiciones de grupo
  if (data?.groups) {
    for (const [letter, teams] of Object.entries(data.groups)) {
      const sorted = [...teams].sort((a, b) => b.pts - a.pts || b.dg - a.dg || b.gf - a.gf);
      const done = sorted.every(t => t.pj >= 3);
      if (sorted[0]) map[`1º ${letter}`] = { team: sorted[0].team, flag: sorted[0].flag || '', provisional: !done };
      if (sorted[1]) map[`2º ${letter}`] = { team: sorted[1].team, flag: sorted[1].flag || '', provisional: !done };
    }
  }

  // 2. Resultados de eliminatorias indexados por fecha+hora (stable key)
  const matchResults = data?.matchResults || {};
  const resultByDT = {};
  for (const [mid, result] of Object.entries(matchResults)) {
    if (result.phase !== 'knockout' || result.status !== 'ft') continue;
    const dtKey = mid.substring(0, 16);  // "YYYY-MM-DD_HH:MM"
    const [homeRaw, awayRaw] = mid.substring(17).split('_vs_');
    resultByDT[dtKey] = {
      result,
      homeTeam: noSpaceToTeam[homeRaw] || homeRaw,
      awayTeam: noSpaceToTeam[awayRaw] || awayRaw,
    };
  }

  // 3. Cascada en orden cronológico: ganador de cada partido → slot Pxx
  const koMatches = MATCHES.filter(m => m[7] !== 'groups')
    .sort((a, b) => (a[0]+a[1]).localeCompare(b[0]+b[1]));

  for (const m of koMatches) {
    const pcode = m[2].match(/\(P(\d+)\)/)?.[1];
    if (!pcode) continue;
    const resInfo = resultByDT[`${m[0]}_${m[1]}`];
    if (!resInfo) continue;
    const { result, homeTeam, awayTeam } = resInfo;
    const winner = result.winner === 'home' ? homeTeam : result.winner === 'away' ? awayTeam : null;
    if (winner) map[`P${pcode}`] = { team: winner, flag: FLAGS_MAP[winner] || '', provisional: false };
  }

  _fullSlotMap = map;
  return map;
}

let _fullSlotMap = null;

// Devuelve [homeTeam, awayTeam] resolviendo slots de eliminatorias si el mapa está cargado
function resolveTeams(m) {
  const [homeSlot, awaySlot] = matchTeams(m);
  if (m[7] === 'groups' || !_fullSlotMap) return [homeSlot, awaySlot];
  const he = _fullSlotMap[homeSlot], ae = _fullSlotMap[awaySlot];
  return [he?.team || homeSlot, ae?.team || awaySlot];
}

// Escapa HTML para contenido externo/usuarios
function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ── Standings cache (compartida por groups, stats, calendar) ──
let _standingsData = null;
async function getStandingsData() {
  if (_standingsData !== null) return _standingsData;
  try {
    const res = await fetch('./standings.json?t=' + Date.now());
    _standingsData = await res.json();
  } catch { _standingsData = {}; }
  return _standingsData;
}

let _matchResults  = null;
let _liveResults   = null;  // injected by CF Worker, overrides standings.json for same match
let _liveEventIds  = {};    // { matchId: espnEventId } for live matches

// ← Actualizar tras el primer deploy del Worker
const LIVE_SCORES_URL = 'https://mundial-live-scores.ignasiser97.workers.dev';

async function refreshLiveResults() {
  if (LIVE_SCORES_URL === 'PENDING_WORKER_URL') return;
  try {
    const res = await fetch(LIVE_SCORES_URL, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const data = await res.json();
      _liveResults  = data.matchResults  ?? null;
      _liveEventIds = data.liveEventIds  ?? {};
    }
  } catch { /* keep previous value */ }
}

// Mapa lazy: "YYYY-MM-DD_HH:MM" → placeholder matchId (para partidos eliminatorios)
let _koMatchIdMap = null;
function _getKoMatchIdMap() {
  if (_koMatchIdMap) return _koMatchIdMap;
  _koMatchIdMap = {};
  for (const m of MATCHES) {
    if (m[7] === 'groups') continue;
    _koMatchIdMap[`${m[0]}_${m[1]}`] = matchId(m);
  }
  return _koMatchIdMap;
}

// Apuestas colocadas antes de que se confirmase el bracket usaban '1ºX_vs_3º'.
// Este mapa permite encontrar el partido real y puntuar esas apuestas correctamente.
const OLD_THIRD_PLACE_BET_IDS = {
  '2026-06-29_22:30_1ºE_vs_3º':        '2026-06-29_22:30_Alemania_vs_Paraguay',
  '2026-06-30_23:00_1ºI_vs_3º':        '2026-06-30_23:00_Francia_vs_Suecia',
  '2026-07-01_03:00_1ºA_vs_3º':        '2026-07-01_03:00_México_vs_Ecuador',
  '2026-07-01_18:00_1ºL_vs_3º':        '2026-07-01_18:00_Inglaterra_vs_RDCongo',
  '2026-07-01_22:00_1ºG_vs_3º':        '2026-07-01_22:00_Bélgica_vs_Senegal',
  '2026-07-02_02:00_1ºD_vs_3º':        '2026-07-02_02:00_EstadosUnidos_vs_Bosnia',
  // P86 y P87 tenían fecha un día antes en MATCHES — bridge para apuestas ya guardadas
  '2026-07-03_00:00_1ºJ_vs_2ºH':       '2026-07-04_00:00_1ºJ_vs_2ºH',
  '2026-07-03_03:30_Colombia_vs_Ghana': '2026-07-04_03:30_Colombia_vs_Ghana',
  '2026-07-03_03:30_1ºK_vs_3º':        '2026-07-04_03:30_Colombia_vs_Ghana',
  '2026-07-03_05:00_1ºB_vs_3º':        '2026-07-03_05:00_Suiza_vs_Argelia',
};

// Bridge: añade entrada con placeholder key para que results[matchId(m)] funcione
// en eliminatorias (el scraper usa nombres reales, el frontend usa '2ºA_vs_2ºB')
function _bridgeKoResults(base) {
  const koMap = _getKoMatchIdMap();
  const bridged = { ...base };
  for (const [mid, result] of Object.entries(base)) {
    const dtKey = mid.substring(0, 16);
    const placeholder = koMap[dtKey];
    if (placeholder && !bridged[placeholder]) bridged[placeholder] = result;
  }
  // Bridge antiguas apuestas de terceros → resultado actual
  for (const [oldId, newId] of Object.entries(OLD_THIRD_PLACE_BET_IDS)) {
    if (bridged[newId] && !bridged[oldId]) bridged[oldId] = bridged[newId];
  }
  return bridged;
}

function _mergeLive(base) {
  if (!_liveResults) return base;
  const koMap = _getKoMatchIdMap();
  const merged = { ...base };
  for (const [mid, live] of Object.entries(_liveResults)) {
    if (!merged[mid] || merged[mid].status !== 'ft') merged[mid] = live;
    // Bridge al placeholder key de eliminatorias
    const dtKey = mid.substring(0, 16);
    const placeholder = koMap[dtKey];
    if (placeholder && (!merged[placeholder] || merged[placeholder].status !== 'ft')) {
      merged[placeholder] = live;
    }
  }
  // Bridge live a IDs viejos (apuestas guardadas antes de corrección de fecha/slot)
  for (const [oldId, newId] of Object.entries(OLD_THIRD_PLACE_BET_IDS)) {
    if (merged[newId] && (!merged[oldId] || merged[oldId].status !== 'ft')) {
      merged[oldId] = merged[newId];
    }
  }
  return merged;
}

async function getMatchResults() {
  if (_matchResults !== null) return _mergeLive(_matchResults);
  const data = await getStandingsData();
  _matchResults = _bridgeKoResults(data.matchResults || {});
  return _mergeLive(_matchResults);
}

let _oddsData = null;
async function getOddsData() {
  if (_oddsData !== null) return _oddsData;
  try {
    const res = await fetch('./odds.json');
    _oddsData = await res.json();
  } catch { _oddsData = { odds: {} }; }
  return _oddsData;
}

function clearMatchResultsCache() { _standingsData = null; _matchResults = null; _oddsData = null; _liveResults = null; }

// ── Dropdown helpers (calendar team-search + squads club-search) ──
function filterDropdown(inputId, dropdownId) {
  const q  = document.getElementById(inputId)?.value.toLowerCase() || '';
  const dd = document.getElementById(dropdownId);
  if (!dd) return;
  dd.classList.remove('hidden');
  for (const li of dd.querySelectorAll('li'))
    li.hidden = q !== '' && !li.textContent.toLowerCase().includes(q);
}
function openDropdown(id)  { document.getElementById(id)?.classList.remove('hidden'); }
function closeDropdown(id) { document.getElementById(id)?.classList.add('hidden'); }

function isNight(t) { return +t.split(':')[0] <= 6; }

// ── Odds chips (Calendar + Quiniela) ─────────────────────────
function oddsChips(o) {
  const vals  = [o.home, o.draw, o.away].filter(v => v != null);
  const minV  = Math.min(...vals);
  const chip  = (lbl, val) => {
    if (val == null) return '';
    const fav = val === minV ? ' odds-fav' : '';
    return `<span class="odds-chip${fav}"><span class="odds-lbl">${lbl}</span><span class="odds-num">${val.toFixed(2)}</span></span>`;
  };
  return chip('1', o.home) + chip('X', o.draw) + chip('2', o.away)
    + `<span class="odds-src">${o.bookmaker}</span>`;
}
