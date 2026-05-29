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

function renderVenues() {
  const el = document.getElementById('venues-content');
  if (!el) return;

  const countries = ['México','Canadá','EE.UU.'];
  let html = '';

  for (const country of countries) {
    const list = VENUES.filter(v => v.country === country);
    html += `<div class="venues-country">
      <div class="venues-country-title">${list[0].flag} ${country}</div>
      <div class="venues-grid">`;
    for (const v of list) {
      html += `
        <div class="venue-card">
          <div class="venue-name">${v.name}</div>
          <div class="venue-city">${v.city}</div>
          <div class="venue-meta">
            <span>${v.cap} espectadores</span>
            <span class="venue-matches">${v.matches} partidos</span>
          </div>
        </div>`;
    }
    html += `</div></div>`;
  }

  el.innerHTML = html;
}
