// ── Pull to refresh ────────────────────────────────────────────
(function(){
  const el = document.createElement('div');
  el.id = 'ptr-indicator';
  el.textContent = '↓ Tira para actualizar';
  document.body.prepend(el);

  const H = 52, THRESHOLD = 72;
  let startY = 0, pulling = false, triggered = false;

  document.addEventListener('touchstart', e => {
    if (window.scrollY === 0) {
      startY = e.touches[0].clientY;
      pulling = true;
      triggered = false;
      el.classList.remove('snap');
    }
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (!pulling) return;
    const dy = Math.max(0, e.touches[0].clientY - startY);
    const travel = Math.min(dy * 0.5, H + 20);
    el.style.transform = `translateY(${travel - H}px)`;
    triggered = dy > THRESHOLD;
    el.textContent = triggered ? '↑ Suelta para actualizar' : '↓ Tira para actualizar';
  }, { passive: true });

  document.addEventListener('touchend', () => {
    if (!pulling) return;
    pulling = false;
    el.classList.add('snap');
    el.style.transform = `translateY(-${H}px)`;
    if (!triggered) return;
    clearMatchResultsCache();
    const tab = document.querySelector('.tab-btn.active')?.dataset.tab;
    if      (tab === 'grp') { tabLoaded.grp=false; loadGroups(); }
    else if (tab === 'sts') { tabLoaded.sts=false; loadStats(); }
    else if (tab === 'nws') { loadNews(true); }
    else if (tab === 'qnl') { qnlLoaded=false; loadQuiniela(); }
    else                    { renderCalendar(); }
  });
})();

// ── Service Worker ─────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateBanner(reg);
        }
      });
    });
  });

  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) { refreshing = true; window.location.reload(); }
  });
}

function showUpdateBanner(reg) {
  if (document.getElementById('update-banner')) return;
  const el = document.createElement('div');
  el.id = 'update-banner';
  el.innerHTML = `<span>Nueva versión disponible</span><button onclick="applyUpdate()">Actualizar</button>`;
  document.body.appendChild(el);
  window._swReg = reg;
}

function applyUpdate() {
  window._swReg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
  document.getElementById('update-banner')?.remove();
}

// ── Tabs ───────────────────────────────────────────────────────
const tabLoaded = { grp: false, sts: false, nws: false, ven: false, sqd: false, sim: false };
const MORE_TABS  = new Set(['sts','sim','nws','ven']);

function switchTab(tab) {
  const inMore = MORE_TABS.has(tab);
  document.querySelectorAll('.tab-btn').forEach(b => {
    if (b.id === 'more-btn') b.classList.toggle('active', inMore);
    else b.classList.toggle('active', b.dataset.tab === tab);
  });
  document.querySelectorAll('.more-item').forEach(b =>
    b.classList.toggle('more-item-active', b.dataset.tab === tab));
  ['hom','cal','grp','sts','sim','sqd','nws','qnl','ven'].forEach(t => {
    const el = document.getElementById(t + '-tab');
    if (t === tab) {
      el.classList.remove('hidden');
      el.classList.remove('tab-fade');
      void el.offsetWidth;
      el.classList.add('tab-fade');
    } else {
      el.classList.add('hidden');
    }
  });
  showHint(tab);
  if (tab === 'grp' && !tabLoaded.grp) { tabLoaded.grp = true; loadGroups(); }
  if (tab === 'sts' && !tabLoaded.sts) { tabLoaded.sts = true; loadStats(); }
  if (tab === 'sim' && !tabLoaded.sim) { tabLoaded.sim = true; simInit(); }
  if (tab === 'sqd' && !tabLoaded.sqd) { tabLoaded.sqd = true; initSquads(); }
  if (tab === 'nws' && !tabLoaded.nws) { tabLoaded.nws = true; loadNews(); }
  if (tab === 'qnl') { loadQuiniela(); }
  if (tab === 'ven' && !tabLoaded.ven) { tabLoaded.ven = true; renderVenues(); }
  else if (tab === 'ven') { initVenueMap(); }
}

// ── Hints de primer uso ────────────────────────────────────────
const HINTS = {
  cal: [
    '💡 Pulsa el nombre de un equipo para ver su convocatoria',
    '💡 Pulsa "Grupo X →" en un partido para saltar a su clasificación',
  ],
  grp: [
    '💡 Pulsa un equipo en la clasificación para ver sus 3 partidos del grupo',
    '💡 Bracket: pulsa cualquier tarjeta para saltar al Calendario en esa fecha',
  ],
  sim: [
    '💡 Pon marcadores hipotéticos y ve quién clasifica en tiempo real hasta la Gran Final',
  ],
  sqd: [
    '💡 Pulsa cualquier jugador para ver edad, internacionales y goles con su selección',
    '💡 Busca por club para ver todos los convocados del Mundial en ese equipo',
  ],
  qnl: [
    '💡 Pulsa un partido para ver lo que apostó cada miembro del grupo',
  ],
};

function showHint(tab) {
  const lines = HINTS[tab];
  const key   = 'hint-' + tab;
  if (!lines || localStorage.getItem(key)) return;

  const tabEl = document.getElementById(tab + '-tab');
  if (!tabEl || tabEl.querySelector('.hint-banner')) return;

  const items = lines.map(t => `<div class="hint-line">${t}</div>`).join('');
  const div = document.createElement('div');
  div.className = 'hint-banner';
  div.innerHTML = `<div class="hint-lines">${items}</div><button class="hint-close" onclick="dismissHint('${key}',this.parentElement)">✕</button>`;
  tabEl.prepend(div);

  setTimeout(() => dismissHint(key, div), 6000);
}

function dismissHint(key, el) {
  if (!el || !el.parentElement) return;
  localStorage.setItem(key, '1');
  el.classList.add('hint-out');
  setTimeout(() => el.remove(), 300);
}

function toggleMoreMenu() {
  const menu     = document.getElementById('more-menu');
  const backdrop = document.getElementById('more-backdrop');
  const opening  = !menu.classList.contains('more-open');
  menu.classList.toggle('more-open', opening);
  backdrop.classList.toggle('hidden', !opening);
}

function closeMoreMenu() {
  document.getElementById('more-menu').classList.remove('more-open');
  document.getElementById('more-backdrop').classList.add('hidden');
}

// ── Filtro España ──────────────────────────────────────────────
let fSpain = false;

function toggleSpainFilter() {
  fSpain = !fSpain;
  document.getElementById('spain-chip').classList.toggle('active', fSpain);
  if (fSpain) {
    fTeam = 'España';
    tsSelected = 'España';
    document.getElementById('ts-input').value = '';
    document.getElementById('ts-input').placeholder = '🔍 Todos los equipos';
    fDate = '';
    document.getElementById('cp-label').textContent = 'Todas las fechas';
    document.getElementById('cp-trigger').style.borderColor = '';
    cpRender();
  } else {
    fTeam = '';
    tsSelected = '';
  }
  renderCalendar();
}

// ── Banner día España ──────────────────────────────────────────
function showSpainDayBanner() {
  const SPAIN_DATE = '2026-06-15';
  const KEY        = 'spain_day_ack_' + SPAIN_DATE;
  const today      = new Intl.DateTimeFormat('sv', { timeZone:'Europe/Madrid' }).format(new Date());
  if (today !== SPAIN_DATE || localStorage.getItem(KEY)) return;

  const overlay = document.createElement('div');
  overlay.id = 'spain-day-overlay';
  overlay.innerHTML = `
    <div class="spain-day-card">
      <div class="spain-day-flag">🇪🇸</div>
      <div class="spain-day-title">HOY ES<br>DÍA GRANDE</div>
      <div class="spain-day-sub">Hoy empieza el camino<br>a la historia</div>
      <div class="spain-day-match">España vs Cabo Verde · 18:00</div>
      <button class="spain-day-btn" onclick="
        localStorage.setItem('${KEY}', '1');
        document.getElementById('spain-day-overlay').remove();
      ">✋ Yo estuve aquí</button>
    </div>`;
  document.body.appendChild(overlay);
}

// ── Banner ¿Sabías que? ────────────────────────────────────────
const SABIASQUE = [
  'El Mundial 2026 es el primero en la historia disputado en 3 países: Estados Unidos, Canadá y México.',
  'Con 48 selecciones y 104 partidos, este es el Mundial más grande de la historia. El anterior tenía 32 equipos y 64 partidos.',
  'Brasil es el único país que ha participado en todos los Mundiales de fútbol de la historia, todos los que se han celebrado.',
  'El estadio MetLife de Nueva Jersey, sede de la final, tiene capacidad para más de 82.000 espectadores.',
  'El Estadio Azteca de Ciudad de México es el único en haber albergado dos finales mundialistas: 1970 y 1986.',
  'Just Fontaine marcó 13 goles en el Mundial de Suecia 1958 con Francia. Sigue siendo el récord de goles en una sola edición.',
  'Miroslav Klose es el máximo goleador de la historia del Mundial con 16 goles en cuatro ediciones (2002-2014).',
  'El gol más rápido en la historia del Mundial lo marcó Hakan Şükür (Turquía) a los 11 segundos contra Corea del Sur en 2002.',
  'Pelé es el único jugador en ganar tres Mundiales: 1958, 1962 y 1970, todos con Brasil.',
  'La primera Copa del Mundo se celebró en Uruguay en 1930. Solo participaron 13 países y el torneo duró 3 semanas.',
  'El árbitro italiano Giovanni Lo Bello fue nombrado para pitar la final de 1970, pero un cambio de última hora lo dejó fuera.',
  'Italia y Brasil son los únicos países que han ganado el Mundial en casa de una potencia rival (Italia en 1934 y 1938, Brasil buscó el suyo en 1950 pero perdió).',
  'La selección alemana es la única que ha disputado finales del Mundial tanto con el nombre de "Alemania Occidental" como de "Alemania".',
  'En el Mundial de 1950, Uruguay eliminó a Brasil en el Maracaná ante 200.000 espectadores. El silencio del estadio se escuchó en toda la ciudad.',
  'La "Mano de Dios" de Maradona contra Inglaterra en 1986 sigue siendo uno de los momentos más polémicos de la historia del fútbol.',
  'El "Gol del Siglo" de Maradona en ese mismo partido de 1986 fue elegido el mejor gol del Mundial en una votación de 2002.',
  'Gordon Banks realizó en 1970 la considerada mejor parada de la historia: negó el gol a Pelé en el aire cuando el remate parecía imposible de detener.',
  'España ganó el Mundial de 2010 sin haber marcado un solo gol en la primera parte de la final. Iniesta decidió en el minuto 116.',
  'El Mundial 2026 contará con 16 sedes en total: 11 en Estados Unidos, 3 en México y 2 en Canadá.',
  'Canadá celebra un Mundial de fútbol por primera vez en su historia.',
  'Estados Unidos ya organizó el Mundial en 1994, cuando batió todos los récords de asistencia de la historia del torneo.',
  'La selección con más títulos mundiales es Brasil con 5 (1958, 1962, 1970, 1994, 2002).',
  'Francia e Italia han ganado el Mundial en casa de otro campeón: Francia en 1998 (sede propia) e Italia en España (1982).',
  'El primer gol de la historia del Mundial lo marcó Lucien Laurent (Francia) el 13 de julio de 1930 contra México.',
  'El penalti más famoso de un Mundial fue el de Roberto Baggio en la final de 1994 contra Brasil, que decidió el título para los cariocas.',
  'En el Mundial de 2014, Alemania goleó 7-1 a Brasil en su propia casa. Fue el resultado más abultado en una semifinal.',
  'El jugador más joven en marcar en un Mundial es Pelé, con 17 años y 239 días en 1958.',
  'El jugador más mayor en marcar en un Mundial es Faryd Mondragón (Colombia), que marcó con 43 años en 2014.',
  'La camiseta de Maradona en el "Gol del Siglo" de 1986 fue subastada en 2022 por más de 9 millones de dólares.',
  'Solo 8 selecciones han ganado un Mundial: Brasil, Alemania, Italia, Argentina, Francia, Uruguay, Inglaterra y España.',
  'El único jugador en marcar en 5 ediciones del Mundial es Cristiano Ronaldo (2006, 2010, 2014, 2018, 2022).',
  'Ronaldo Nazario marcó 8 goles en el Mundial de 2002 con Brasil, siendo la estrella del torneo con 23 años.',
  'El balón oficial del Mundial 2026 se llama "Fevernova" ... bueno, el del 2026 aún está por confirmar su nombre oficial.',
  'El primer estadio cubierto en albergar un Mundial es el SoFi Stadium de Los Ángeles, sede del 2026.',
  'La final del Mundial 2026 se jugará el 19 de julio en el MetLife Stadium de East Rutherford, Nueva Jersey.',
  'El récord de asistencia a un partido del Mundial es de 173.850 espectadores en el Uruguay-Brasil de 1950 en el Maracaná.',
  'Alemania disputó la final del Mundial en 4 ediciones consecutivas entre 1982 y 1990, ganando en 1990.',
  'La única vez que el anfitrión perdió en la primera ronda fue Sudáfrica en 2010, aunque pasó la fase de grupos.',
  'El Mundial de 2026 usará por primera vez tecnología semiautomática de fuera de juego en todos los partidos.',
  'España es la única selección europea que ha ganado el Mundial en suelo americano (Sudáfrica 2010 fue en África).',
];

function showSabiasQueBanner() {
  const today = new Intl.DateTimeFormat('sv', { timeZone:'Europe/Madrid' }).format(new Date());
  const KEY   = 'sabiasque_' + today;
  if (localStorage.getItem(KEY)) return;

  // Índice basado en el día del torneo
  const start  = new Date('2026-06-11T00:00:00Z');
  const dayIdx = Math.max(0, Math.floor((Date.now() - start) / 86400000)) % SABIASQUE.length;
  const fact   = SABIASQUE[dayIdx];

  const overlay = document.createElement('div');
  overlay.id = 'sabiasque-overlay';
  overlay.innerHTML = `
    <div class="sq-card">
      <div class="sq-eyebrow">⚽ MUNDIAL 2026</div>
      <div class="sq-title">¿Sabías que…?</div>
      <div class="sq-fact">${fact}</div>
      <button class="sq-btn" onclick="
        localStorage.setItem('${KEY}','1');
        document.getElementById('sabiasque-overlay').remove();
      ">¡Lo sabía! →</button>
    </div>`;
  document.body.appendChild(overlay);
}

// ── Meme Sergio ────────────────────────────────────────────────

function showMemeSergio() {
  const KEY = 'meme-sergio-v1';
  if (localStorage.getItem(KEY)) return;
  const overlay = document.createElement('div');
  overlay.id = 'sabiasque-overlay';
  overlay.innerHTML = `
    <div class="sq-card">
      <div class="sq-eyebrow" style="color:var(--neg);letter-spacing:1px">#TodosSomosSergio</div>
      <div class="sq-title" style="font-size:28px;line-height:1.1">54 intentos.<br>0 exactos.</div>
      <div class="sq-fact">Sergio no predice el fútbol, lo siente.</div>
      <button class="sq-btn" onclick="
        localStorage.setItem('${KEY}','1');
        document.getElementById('sabiasque-overlay').remove();
      ">🫂 Ánimo, Sergio</button>
    </div>`;
  document.body.appendChild(overlay);
}

// ── Init ───────────────────────────────────────────────────────
tsInit();
cpRender();
renderHome();
renderCalendar();
showSpainDayBanner();
showSabiasQueBanner();
showMemeSergio();
