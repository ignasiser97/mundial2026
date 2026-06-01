const MUNDIAL_START_MS = new Date('2026-06-11T19:00:00Z').getTime();

let _homeInterval = null;

const BALL_SVG = `<svg class="ball-svg" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
  <defs><clipPath id="bc"><circle cx="30" cy="30" r="26.5"/></clipPath></defs>
  <circle cx="30" cy="30" r="27" fill="#f0f0f0" stroke="#111" stroke-width="1.5"/>
  <g clip-path="url(#bc)" fill="#111">
    <polygon points="30,20 38,25 35,34 25,34 22,25"/>
    <polygon points="30,6 37,9 37,17 23,17 23,9"/>
    <polygon points="43,13 51,19 49,28 42,29 38,21"/>
    <polygon points="44,40 49,50 43,55 35,52 34,42"/>
    <polygon points="30,54 24,53 21,45 30,41 39,45 36,53"/>
    <polygon points="16,40 26,42 25,52 17,55 11,50"/>
    <polygon points="9,13 22,21 18,29 11,28 9,19"/>
  </g>
</svg>`;

function renderHome() {
  const el = document.getElementById('home-content');
  if (!el) return;
  if (_homeInterval) { clearInterval(_homeInterval); _homeInterval = null; }
  tick();
  _homeInterval = setInterval(tick, 1000);

  function tick() {
    const diff = MUNDIAL_START_MS - Date.now();

    if (diff <= 0) {
      clearInterval(_homeInterval); _homeInterval = null;
      el.innerHTML = `
        <div class="home-countdown">
          <div class="home-title">EL MUNDIAL HA COMENZADO</div>
          <div class="home-sub">¡Disfruta del torneo!</div>
        </div>`;
      return;
    }

    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000)  / 60000);
    const s = Math.floor((diff % 60000)    / 1000);

    if (!el.querySelector('.home-num')) {
      el.innerHTML = `
        <div class="home-countdown">
          <div class="home-badge">EMPIEZA EL</div>
          <div class="home-date">11 JUNIO 2026</div>
          <div class="home-units">
            <div class="home-unit"><span class="home-num" id="cd-d"></span><span class="home-label">días</span></div>
            <span class="home-sep">:</span>
            <div class="home-unit"><span class="home-num" id="cd-h"></span><span class="home-label">horas</span></div>
            <span class="home-sep">:</span>
            <div class="home-unit"><span class="home-num" id="cd-m"></span><span class="home-label">min</span></div>
            <span class="home-sep">:</span>
            <div class="home-unit"><span class="home-num" id="cd-s"></span><span class="home-label">seg</span></div>
          </div>
          <div class="home-sub home-sub-link" onclick="switchTab('cal'); requestAnimationFrame(() => cpSelect('2026-06-11'))">México vs Sudáfrica · Estadio Azteca →</div>
          <div class="ball-track">${BALL_SVG}</div>
        </div>`;
    }

    document.getElementById('cd-d').textContent = String(d).padStart(2,'0');
    document.getElementById('cd-h').textContent = String(h).padStart(2,'0');
    document.getElementById('cd-m').textContent = String(m).padStart(2,'0');
    document.getElementById('cd-s').textContent = String(s).padStart(2,'0');
  }
}
