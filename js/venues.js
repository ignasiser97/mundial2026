// x = 18 + (125 - |lon|) * 5.8   y = 16 + (52 - lat) * 6.1
// label: [dx, dy, anchor]  — offset respecto al punto
const VENUE_COORDS = {
  'BC Place':                 { x: 20,  y: 34,  label:'Vancouver',      lx: 6,   ly:-2,  a:'start' },
  'BMO Field':                { x: 268, y: 69,  label:'Toronto',        lx:-6,   ly:-5,  a:'end'   },
  'Lumen Field':              { x: 24,  y: 48,  label:'Seattle',        lx: 6,   ly: 4,  a:'start' },
  "Levi's Stadium":           { x: 22,  y: 107, label:'San Francisco',  lx: 6,   ly:-2,  a:'start' },
  'SoFi Stadium':             { x: 40,  y: 124, label:'Los Ángeles',    lx: 6,   ly: 4,  a:'start' },
  'Arrowhead Stadium':        { x: 182, y: 100, label:'Kansas City',    lx: 6,   ly:-2,  a:'start' },
  'AT&T Stadium':             { x: 170, y: 128, label:'Dallas',         lx:-6,   ly:-4,  a:'end'   },
  'NRG Stadium':              { x: 178, y: 146, label:'Houston',        lx: 6,   ly: 4,  a:'start' },
  'Mercedes-Benz Stadium':    { x: 236, y: 124, label:'Atlanta',        lx: 6,   ly:-2,  a:'start' },
  'Hard Rock Stadium':        { x: 252, y: 162, label:'Miami',          lx: 6,   ly: 4,  a:'start' },
  'Gillette Stadium':         { x: 304, y: 76,  label:'Boston',         lx:-6,   ly:-4,  a:'end'   },
  'Lincoln Financial Field':  { x: 288, y: 89,  label:'Filadelfia',     lx:-6,   ly: 4,  a:'end'   },
  'MetLife Stadium':          { x: 294, y: 82,  label:'Nueva Jersey',   lx:-6,   ly:-4,  a:'end'   },
  'Estadio Akron':            { x: 126, y: 196, label:'Guadalajara',    lx:-6,   ly:-3,  a:'end'   },
  'Estadio Azteca':           { x: 148, y: 208, label:'Ciudad de México',lx: 6,  ly: 4,  a:'start' },
  'Estadio BBVA':             { x: 156, y: 168, label:'Monterrey',      lx: 6,   ly:-2,  a:'start' },
};

function venueMap() {
  const items = VENUES.map(v => {
    const c = VENUE_COORDS[v.name];
    if (!c) return '';
    const col  = v.country === 'México' ? '#f97316' : v.country === 'Canadá' ? '#ef4444' : '#e8c84a';
    const dot  = `<circle cx="${c.x}" cy="${c.y}" r="3.5" fill="${col}" stroke="#0d1525" stroke-width="1"/>`;
    const text = `<text x="${c.x + c.lx}" y="${c.y + c.ly}" text-anchor="${c.a}"
      font-size="6.5" fill="${col}" font-family="'DM Sans',sans-serif" opacity=".85">${c.label}</text>`;
    return dot + text;
  }).join('');

  return `
  <div class="venue-map-wrap">
    <svg viewBox="0 0 340 230" xmlns="http://www.w3.org/2000/svg" class="venue-map-svg">
      <rect width="340" height="230" fill="#0d1525" rx="8"/>
      <line x1="15" y1="38"  x2="305" y2="38"  stroke="#1e2d45" stroke-width=".8" stroke-dasharray="4,3"/>
      <line x1="40" y1="134" x2="168" y2="134" stroke="#1e2d45" stroke-width=".8" stroke-dasharray="4,3"/>
      <text x="170" y="26"  text-anchor="middle" font-size="7.5" fill="#2e3f58" font-family="'Bebas Neue',sans-serif" letter-spacing="2">CANADÁ</text>
      <text x="175" y="90"  text-anchor="middle" font-size="7.5" fill="#2e3f58" font-family="'Bebas Neue',sans-serif" letter-spacing="2">EE.UU.</text>
      <text x="118" y="155" text-anchor="middle" font-size="7.5" fill="#2e3f58" font-family="'Bebas Neue',sans-serif" letter-spacing="2">MÉXICO</text>
      ${items}
    </svg>
    <div class="venue-map-legend">
      <span><span class="vml-dot" style="background:#f97316"></span>México</span>
      <span><span class="vml-dot" style="background:#ef4444"></span>Canadá</span>
      <span><span class="vml-dot" style="background:#e8c84a"></span>EE.UU.</span>
    </div>
  </div>`;
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

function renderVenues() {
  const el = document.getElementById('venues-content');
  if (!el) return;

  const countries = ['México','Canadá','EE.UU.'];
  let html = venueMap();

  for (const country of countries) {
    const list = VENUES.filter(v => v.country === country);
    html += `<div class="venues-country">
      <div class="venues-country-title">${list[0].flag} ${country}</div>
      <div class="venues-grid">`;
    for (const v of list) {
      const pct = Math.round(parseInt(v.cap.replace('.','')) / MAX_CAP * 100);
      html += `
        <div class="venue-card">
          <div class="venue-name">${v.name}</div>
          <div class="venue-city">${v.city}</div>
          <div class="venue-cap-bar"><div class="venue-cap-fill" style="width:${pct}%"></div></div>
          <div class="venue-meta">
            <span>${v.cap} esp.</span>
            <span class="venue-matches">${v.matches} partidos</span>
          </div>
        </div>`;
    }
    html += `</div></div>`;
  }

  el.innerHTML = html;
}
