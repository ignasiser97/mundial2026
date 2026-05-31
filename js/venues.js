const VENUE_LATLON = {
  'BC Place':                 [49.28, -123.11],
  'BMO Field':                [43.63,  -79.42],
  'Lumen Field':              [47.60, -122.33],
  "Levi's Stadium":           [37.40, -121.97],
  'SoFi Stadium':             [33.95, -118.34],
  'Arrowhead Stadium':        [39.05,  -94.48],
  'AT&T Stadium':             [32.75,  -97.09],
  'NRG Stadium':              [29.69,  -95.41],
  'Mercedes-Benz Stadium':    [33.76,  -84.40],
  'Hard Rock Stadium':        [25.96,  -80.24],
  'Gillette Stadium':         [42.09,  -71.26],
  'Lincoln Financial Field':  [39.90,  -75.17],
  'MetLife Stadium':          [40.81,  -74.07],
  'Estadio Akron':            [20.69, -103.47],
  'Estadio Azteca':           [19.30,  -99.15],
  'Estadio BBVA':             [25.67, -100.31],
};

let _leafletMap = null;

// Sedes donde España juega en fase de grupos (flags === 1)
const SPAIN_GROUP_VENUES = new Set(
  MATCHES.filter(m => m[6] === 1 && m[7] === 'groups').map(m => m[3].split(',')[0].trim())
);

function makeMarkerIcon(type) {
  // type: 'normal' | 'final' | 'spain'
  const size  = 22;
  const color = type === 'final' ? '#e8c84a' : '#ef4444';
  const glow  = type === 'final'
    ? '0 0 6px #e8c84a, 0 0 12px rgba(232,200,74,.4)'
    : '0 0 6px #ef4444, 0 0 12px rgba(239,68,68,.4)';
  const ring = `position:relative;display:inline-flex;align-items:center;justify-content:center;
    width:${size+8}px;height:${size+8}px;border-radius:50%;
    border:2px solid ${color};box-shadow:${glow};`;
  const html = (type !== 'normal')
    ? `<span style="${ring}"><span style="font-size:${size}px;line-height:1">⚽</span></span>`
    : `<span style="font-size:${size}px;line-height:1;filter:drop-shadow(0 1px 3px rgba(0,0,0,.9))">⚽</span>`;
  const s = type !== 'normal' ? size + 10 : size;
  return L.divIcon({
    html,
    className: '',
    iconSize:   [s, s],
    iconAnchor: [s / 2, s / 2],
    popupAnchor:[0, -s / 2 - 2],
  });
}

function initVenueMap() {
  if (_leafletMap) { _leafletMap.invalidateSize(); return; }
  const el = document.getElementById('venue-map-container');
  if (!el || typeof L === 'undefined') return;

  _leafletMap = L.map('venue-map-container', {
    center: [36, -95],
    zoom: 3,
    scrollWheelZoom: false,
    zoomControl: true,
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OSM</a> © <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(_leafletMap);

  VENUES.forEach(v => {
    const ll = VENUE_LATLON[v.name];
    if (!ll) return;
    const isFinal = v.name === 'MetLife Stadium';
    const isSpain = SPAIN_GROUP_VENUES.has(v.name);
    const type  = isFinal ? 'final' : isSpain ? 'spain' : 'normal';
    const icon  = makeMarkerIcon(type);
    const badge = isFinal
      ? `<div style="color:#e8c84a;font-weight:700;font-size:11px;margin-bottom:4px">🏆 SEDE DE LA FINAL · 19 jul 2026</div>`
      : isSpain
      ? `<div style="color:#ef4444;font-weight:700;font-size:11px;margin-bottom:4px">🇪🇸 España · Fase de grupos</div>`
      : '';
    L.marker(ll, { icon })
      .bindPopup(`${badge}<strong>${v.name}</strong>${v.city}, ${v.flag} ${v.country}<br>${v.team}<br>${v.cap} esp. · <span style="color:#e8c84a;font-weight:600">${v.matches} partidos</span>`)
      .addTo(_leafletMap);
  });

  // Leyenda
  const legend = L.control({ position: 'bottomleft' });
  legend.onAdd = () => {
    const d = L.DomUtil.create('div');
    d.style.cssText = 'background:#141e30;border:1px solid #1e2d45;border-radius:6px;padding:6px 10px;font-family:DM Sans,sans-serif;font-size:11px;color:#e8eaf0;line-height:1.8';
    d.innerHTML =
      `<div><span style="display:inline-block;width:10px;height:10px;border-radius:50%;border:2px solid #e8c84a;box-shadow:0 0 5px #e8c84a;margin-right:6px;vertical-align:middle"></span>Sede de la Final</div>` +
      `<div><span style="display:inline-block;width:10px;height:10px;border-radius:50%;border:2px solid #ef4444;box-shadow:0 0 5px #ef4444;margin-right:6px;vertical-align:middle"></span>España · Fase de grupos</div>`;
    return d;
  };
  legend.addTo(_leafletMap);
}

const VENUES = [
  // México
  { name:'Estadio Azteca',          city:'Ciudad de México', country:'México', flag:'🇲🇽', cap:'83.000', matches:0, team:'Club América · Cruz Azul' },
  { name:'Estadio Akron',           city:'Guadalajara',      country:'México', flag:'🇲🇽', cap:'49.850', matches:0, team:'Chivas de Guadalajara' },
  { name:'Estadio BBVA',            city:'Guadalupe',        country:'México', flag:'🇲🇽', cap:'53.500', matches:0, team:'CF Monterrey (Rayados)' },
  // Canadá
  { name:'BC Place',                city:'Vancouver',        country:'Canadá', flag:'🇨🇦', cap:'54.500', matches:0, team:'Vancouver Whitecaps FC' },
  { name:'BMO Field',               city:'Toronto',          country:'Canadá', flag:'🇨🇦', cap:'45.000', matches:0, team:'Toronto FC' },
  // EE.UU.
  { name:'MetLife Stadium',         city:'Nueva Jersey',     country:'EE.UU.', flag:'🇺🇸', cap:'82.500', matches:0, team:'NY Giants · NY Jets' },
  { name:'SoFi Stadium',            city:'Los Ángeles',      country:'EE.UU.', flag:'🇺🇸', cap:'70.000', matches:0, team:'LA Rams · LA Chargers' },
  { name:'AT&T Stadium',            city:'Dallas',           country:'EE.UU.', flag:'🇺🇸', cap:'80.000', matches:0, team:'Dallas Cowboys' },
  { name:"Levi's Stadium",          city:'San Francisco',    country:'EE.UU.', flag:'🇺🇸', cap:'68.500', matches:0, team:'San Francisco 49ers' },
  { name:'Lumen Field',             city:'Seattle',          country:'EE.UU.', flag:'🇺🇸', cap:'68.740', matches:0, team:'Seattle Seahawks · Seattle Sounders' },
  { name:'Hard Rock Stadium',       city:'Miami',            country:'EE.UU.', flag:'🇺🇸', cap:'65.326', matches:0, team:'Miami Dolphins' },
  { name:'Mercedes-Benz Stadium',   city:'Atlanta',          country:'EE.UU.', flag:'🇺🇸', cap:'71.000', matches:0, team:'Atlanta Falcons · Atlanta United' },
  { name:'Gillette Stadium',        city:'Boston',           country:'EE.UU.', flag:'🇺🇸', cap:'65.878', matches:0, team:'New England Patriots · Revolution' },
  { name:'NRG Stadium',             city:'Houston',          country:'EE.UU.', flag:'🇺🇸', cap:'72.220', matches:0, team:'Houston Texans' },
  { name:'Arrowhead Stadium',       city:'Kansas City',      country:'EE.UU.', flag:'🇺🇸', cap:'76.416', matches:0, team:'Kansas City Chiefs' },
  { name:'Lincoln Financial Field', city:'Filadelfia',       country:'EE.UU.', flag:'🇺🇸', cap:'69.596', matches:0, team:'Philadelphia Eagles' },
];

// Contar partidos por sede
MATCHES.forEach(m => {
  const venueName = m[3].split(',')[0].trim();
  const v = VENUES.find(v => v.name === venueName);
  if (v) v.matches++;
});

const MAX_CAP = 83000;

// Precalcular partidos por sede
const MATCHES_BY_VENUE = {};
MATCHES.forEach(m => {
  const key = m[3].split(',')[0].trim();
  (MATCHES_BY_VENUE[key] = MATCHES_BY_VENUE[key] || []).push(m);
});

function venueMatchesHtml(venueName) {
  const list = MATCHES_BY_VENUE[venueName] || [];
  if (!list.length) return '<p style="font-size:11px;color:var(--muted);padding:6px 0">Sin partidos asignados</p>';
  return list.map(m => {
    const [date, time, label,, , ch, flags, phase] = m;
    const matchName = label.split('·')[0].trim();
    const phaseName = PHASES[phase] || phase;
    const isSpain   = flags === 1 || flags === 2;
    const badges    = (ch.includes('d') ? '<span class="badge bd">DAZN</span> ' : '') +
                      (ch.includes('l') ? '<span class="badge bl">LA 1</span> ' : '');
    return `<div class="venue-match-row${isSpain ? ' venue-match-spain' : ''}">
      <span class="venue-match-date">${fmtDate(date)} · ${time}</span>
      <span class="venue-match-name">${isSpain ? '🇪🇸 ' : ''}${matchName}</span>
      <span class="venue-match-phase">${badges}${phaseName}</span>
    </div>`;
  }).join('');
}

function toggleVenueMatches(id) {
  const el  = document.getElementById('vm-' + id);
  const btn = document.getElementById('vmb-' + id);
  const open = el.classList.toggle('hidden');
  btn.textContent = open ? 'Ver partidos ▾' : 'Ocultar ▴';
}

function renderVenues() {
  const el = document.getElementById('venues-content');
  if (!el) return;

  const countries = ['México','Canadá','EE.UU.'];
  let html = '<div id="venue-map-container"></div>';

  for (const country of countries) {
    const list = VENUES.filter(v => v.country === country);
    html += `<div class="venues-country"><div class="venues-country-title">${list[0].flag} ${country}</div><div class="venues-grid">`;
    for (const v of list) {
      const pct        = Math.round(parseInt(v.cap.replace('.','')) / MAX_CAP * 100);
      const finalBadge = v.name === 'MetLife Stadium' ? `<span class="venue-final-badge">🏆 Final</span>` : '';
      const vid        = v.name.replace(/\s+/g, '-');
      html += `
        <div class="venue-card">
          <div class="venue-name">${v.name} ${finalBadge}</div>
          <div class="venue-city">${v.city}</div>
          <div class="venue-team">${v.team}</div>
          <div class="venue-cap-bar"><div class="venue-cap-fill" style="width:${pct}%"></div></div>
          <div class="venue-meta">
            <span>${v.cap} esp.</span>
            <span class="venue-matches">${v.matches} partidos</span>
            <button class="venue-toggle-btn" id="vmb-${vid}" onclick="toggleVenueMatches('${vid}')">Ver partidos ▾</button>
          </div>
          <div class="hidden venue-matches-list" id="vm-${vid}">${venueMatchesHtml(v.name)}</div>
        </div>`;
    }
    html += `</div></div>`;
  }

  el.innerHTML = html;
  setTimeout(initVenueMap, 50);
}
