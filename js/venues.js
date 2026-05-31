// Coordenadas SVG derivadas de lat/lon reales (viewBox 340x230)
// x = 15 + (125 - |lon|) * 5.5   y = 20 + (52 - lat) * 5.88
const VENUE_COORDS = {
  'BC Place':                 { x: 26,  y: 36  },
  'BMO Field':                { x: 266, y: 69  },
  'Lumen Field':              { x: 30,  y: 46  },
  "Levi's Stadium":           { x: 32,  y: 105 },
  'SoFi Stadium':             { x: 52,  y: 127 },
  'Arrowhead Stadium':        { x: 182, y: 96  },
  'AT&T Stadium':             { x: 170, y: 133 },
  'NRG Stadium':              { x: 178, y: 151 },
  'Mercedes-Benz Stadium':    { x: 238, y: 128 },
  'Hard Rock Stadium':        { x: 261, y: 174 },
  'Gillette Stadium':         { x: 310, y: 78  },
  'Lincoln Financial Field':  { x: 289, y: 91  },
  'MetLife Stadium':          { x: 295, y: 86  },
  'Estadio Akron':            { x: 134, y: 204 },
  'Estadio Azteca':           { x: 158, y: 212 },
  'Estadio BBVA':             { x: 151, y: 175 },
};

function venueMap() {
  const dots = VENUES.map(v => {
    const c = VENUE_COORDS[v.name];
    if (!c) return '';
    const col = v.country === 'México' ? '#f97316' : v.country === 'Canadá' ? '#ef4444' : '#e8c84a';
    return `<circle cx="${c.x}" cy="${c.y}" r="4" fill="${col}" stroke="#0a0e1a" stroke-width="1.2" opacity=".9"/>`;
  }).join('');

  return `
  <div class="venue-map-wrap">
    <svg viewBox="0 0 340 230" xmlns="http://www.w3.org/2000/svg" class="venue-map-svg">
      <rect width="340" height="230" fill="#0d1525" rx="8"/>
      <!-- border US-Canada ~49N -->
      <line x1="15" y1="38" x2="310" y2="38" stroke="#1e2d45" stroke-width="1" stroke-dasharray="4,3"/>
      <!-- border US-Mexico rough -->
      <line x1="52" y1="130" x2="175" y2="130" stroke="#1e2d45" stroke-width="1" stroke-dasharray="4,3"/>
      <!-- country labels -->
      <text x="155" y="28" text-anchor="middle" font-size="8" fill="#4a5a78" font-family="'Bebas Neue',sans-serif" letter-spacing="2">CANADÁ</text>
      <text x="175" y="88" text-anchor="middle" font-size="8" fill="#4a5a78" font-family="'Bebas Neue',sans-serif" letter-spacing="2">EE.UU.</text>
      <text x="148" y="160" text-anchor="middle" font-size="8" fill="#4a5a78" font-family="'Bebas Neue',sans-serif" letter-spacing="2">MÉXICO</text>
      ${dots}
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
