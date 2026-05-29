function renderHome() {
  const el = document.getElementById('home-content');
  if (!el) return;
  tick();
  setInterval(tick, 1000);

  function tick() {
    const now    = Date.now();
    const target = new Date('2026-06-11T19:00:00Z').getTime(); // 21:00 Madrid (CEST)
    const diff   = target - now;

    if (diff <= 0) {
      el.innerHTML = `
        <div class="home-countdown">
          <div class="home-title">EL MUNDIAL HA COMENZADO</div>
          <div class="home-sub">¡Disfruta del torneo!</div>
        </div>`;
      return;
    }

    const d  = Math.floor(diff / 86400000);
    const h  = Math.floor((diff % 86400000) / 3600000);
    const m  = Math.floor((diff % 3600000)  / 60000);
    const s  = Math.floor((diff % 60000)    / 1000);

    el.innerHTML = `
      <div class="home-countdown">
        <div class="home-badge">EMPIEZA EL</div>
        <div class="home-date">11 JUNIO 2026</div>
        <div class="home-units">
          <div class="home-unit"><span class="home-num">${String(d).padStart(2,'0')}</span><span class="home-label">días</span></div>
          <span class="home-sep">:</span>
          <div class="home-unit"><span class="home-num">${String(h).padStart(2,'0')}</span><span class="home-label">horas</span></div>
          <span class="home-sep">:</span>
          <div class="home-unit"><span class="home-num">${String(m).padStart(2,'0')}</span><span class="home-label">min</span></div>
          <span class="home-sep">:</span>
          <div class="home-unit"><span class="home-num">${String(s).padStart(2,'0')}</span><span class="home-label">seg</span></div>
        </div>
        <div class="home-sub">México vs Sudáfrica · Estadio Azteca</div>
      </div>`;
  }
}
