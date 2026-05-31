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

function makeMarkerIcon(emoji, size) {
  return L.divIcon({
    html: `<span style="font-size:${size}px;line-height:1;filter:drop-shadow(0 1px 3px rgba(0,0,0,.9))">${emoji}</span>`,
    className: '',
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor:[0, -size / 2 - 2],
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
    const icon    = makeMarkerIcon(isFinal ? '🏆' : '⚽', isFinal ? 26 : 20);
    const finalBadge = isFinal
      ? `<div style="color:#e8c84a;font-weight:700;font-size:11px;margin-bottom:4px">🏆 SEDE DE LA FINAL · 19 jul 2026</div>`
      : '';
    L.marker(ll, { icon })
      .bindPopup(`${finalBadge}<strong>${v.name}</strong>${v.city}, ${v.flag} ${v.country}<br>${v.cap} espectadores · <span style="color:#e8c84a;font-weight:600">${v.matches} partidos</span>`)
      .addTo(_leafletMap);
  });
}

const VENUES = [
  // México
  { name:'Estadio Azteca',      city:'Ciudad de México', country:'México',  flag:'🇲🇽', cap:'83.000', matches: 0 },
  { name:'Estadio Akron',       city:'Guadalajara',      country:'México',  flag:'🇲🇽', cap:'49.850', matches: 0 },
  { name:'Estadio BBVA',        city:'Guadalupe',        country:'México',  flag:'🇲🇽', cap:'53.500', matches: 0 },
  // Canadá
  { name:'BC Place',            city:'Vancouver',        country:'Canadá',  flag:'🇨🇦', cap:'54.500', matches: 0 },
  { name:'BMO Field',           city:'Toronto',          country:'Canadá',  flag:'🇨🇦', cap:'45.000', matches: 0 },
  // EE.UU.
  { name:'MetLife Stadium',     city:'Nueva Jersey',     country:'EE.UU.',  flag:'🇺🇸', cap:'82.500', matches: 0 },
  { name:'SoFi Stadium',        city:'Los Ángeles',      country:'EE.UU.',  flag:'🇺🇸', cap:'70.000', matches: 0 },
  { name:'AT&T Stadium',        city:'Dallas',           country:'EE.UU.',  flag:'🇺🇸', cap:'80.000', matches: 0 },
  { name:"Levi's Stadium",      city:'San Francisco',    country:'EE.UU.',  flag:'🇺🇸', cap:'68.500', matches: 0 },
  { name:'Lumen Field',         city:'Seattle',          country:'EE.UU.',  flag:'🇺🇸', cap:'68.740', matches: 0 },
  { name:'Hard Rock Stadium',   city:'Miami',            country:'EE.UU.',  flag:'🇺🇸', cap:'65.326', matches: 0 },
  { name:'Mercedes-Benz Stadium',city:'Atlanta',         country:'EE.UU.',  flag:'🇺🇸', cap:'71.000', matches: 0 },
  { name:'Gillette Stadium',    city:'Boston',           country:'EE.UU.',  flag:'🇺🇸', cap:'65.878', matches: 0 },
  { name:'NRG Stadium',         city:'Houston',          country:'EE.UU.',  flag:'🇺🇸', cap:'72.220', matches: 0 },
  { name:'Arrowhead Stadium',   city:'Kansas City',      country:'EE.UU.',  flag:'🇺🇸', cap:'76.416', matches: 0 },
  { name:'Lincoln Financial Field', city:'Filadelfia',   country:'EE.UU.',  flag:'🇺🇸', cap:'69.596', matches: 0 },
];

// Contar partidos por sede
MATCHES.forEach(m => {
  const venueName = m[3].split(',')[0].trim();
  const v = VENUES.find(v => v.name === venueName);
  if (v) v.matches++;
});

const MAX_CAP = 83000;
let venSubTab = 'mapa';

function venSwitchSub(sub) {
  venSubTab = sub;
  document.querySelectorAll('.ven-stab').forEach((b, i) =>
    b.classList.toggle('active', ['mapa','espana'][i] === sub)
  );
  document.getElementById('ven-sub-mapa').classList.toggle('hidden', sub !== 'mapa');
  document.getElementById('ven-sub-espana').classList.toggle('hidden', sub !== 'espana');
  if (sub === 'mapa') initVenueMap();
}

function renderVenues() {
  const el = document.getElementById('venues-content');
  if (!el) return;

  const countries = ['México','Canadá','EE.UU.'];
  let sedesHtml = '<div id="venue-map-container"></div>';
  for (const country of countries) {
    const list = VENUES.filter(v => v.country === country);
    sedesHtml += `<div class="venues-country"><div class="venues-country-title">${list[0].flag} ${country}</div><div class="venues-grid">`;
    for (const v of list) {
      const pct = Math.round(parseInt(v.cap.replace('.','')) / MAX_CAP * 100);
      const finalBadge = v.name === 'MetLife Stadium'
        ? `<span class="venue-final-badge">🏆 Final</span>` : '';
      sedesHtml += `
        <div class="venue-card">
          <div class="venue-name">${v.name} ${finalBadge}</div>
          <div class="venue-city">${v.city}</div>
          <div class="venue-cap-bar"><div class="venue-cap-fill" style="width:${pct}%"></div></div>
          <div class="venue-meta"><span>${v.cap} esp.</span><span class="venue-matches">${v.matches} partidos</span></div>
        </div>`;
    }
    sedesHtml += `</div></div>`;
  }

  el.innerHTML = `
    <div class="ven-sub-espana-html" id="ven-sub-mapa">${sedesHtml}</div>
    <div class="hidden" id="ven-sub-espana">${renderSpainMatches()}</div>`;

  setTimeout(initVenueMap, 50);
}

function renderSpainMatches() {
  const spainMatches = MATCHES.filter(m => m[6] === 1 || m[6] === 2);
  const cards = spainMatches.map(m => {
    const [date, time, label, venue,, ch, flags, phase] = m;
    const isPossible = flags === 2;
    const parts = label.split('·')[0].trim().split(' vs ');
    const home = parts[0]?.trim() || '';
    const away = parts[1]?.trim() || '';
    const phaseName = PHASES[phase] || phase;
    const badges = (ch.includes('d') ? '<span class="badge bd">DAZN</span>' : '') +
                   (ch.includes('l') ? '<span class="badge bl">LA 1</span>' : '');
    return `
      <div class="venue-card${isPossible ? ' venue-card-possible' : ''}">
        <div class="venue-name">🇪🇸 ${home} vs ${away}</div>
        <div class="venue-city">${venue}</div>
        <div class="venue-meta">
          <span>${fmtDate(date)} · ${time}</span>
          <span>${badges} ${isPossible ? '<span class="venue-possible">si clasifica</span>' : phaseName}</span>
        </div>
      </div>`;
  }).join('');

  return `<div class="venues-wrap-inner"><div class="venues-grid">${cards}</div></div>`;
}
