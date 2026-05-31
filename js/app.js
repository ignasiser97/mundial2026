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
    const tab = document.querySelector('.tab-btn.active')?.dataset.tab;
    if      (tab === 'grp') { grpLoaded=false; loadGroups(); }
    else if (tab === 'sts') { stsLoaded=false; loadStats(); }
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
let grpLoaded=false, stsLoaded=false, nwsLoaded=false, venLoaded=false;

function switchTab(tab){
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  ['hom','cal','grp','sts','nws','qnl','ven'].forEach(t=>{
    const el=document.getElementById(t+'-tab');
    if(t===tab){
      el.classList.remove('hidden');
      el.classList.remove('tab-fade');
      void el.offsetWidth; // reflow para reiniciar animación
      el.classList.add('tab-fade');
    } else {
      el.classList.add('hidden');
    }
  });
  if(tab==='grp' && !grpLoaded){ grpLoaded=true; loadGroups(); }
  if(tab==='sts' && !stsLoaded){ stsLoaded=true; loadStats(); }
  if(tab==='nws' && !nwsLoaded){ nwsLoaded=true; loadNews(); }
  if(tab==='qnl'){ loadQuiniela(); }
  if(tab==='ven' && !venLoaded){ venLoaded=true; renderVenues(); }
}

// ── Filtro España ──────────────────────────────────────────────
let fSpain = false;

function toggleSpainFilter() {
  fSpain = !fSpain;
  document.getElementById('spain-chip').classList.toggle('active', fSpain);
  if (fSpain) {
    fTeam = 'España';
    document.getElementById('ts-input').value = '';
    document.getElementById('ts-input').placeholder = '🔍 Todos los equipos';
    fDate = '';
    document.getElementById('cp-label').textContent = 'Todas las fechas';
    document.getElementById('cp-trigger').style.borderColor = '';
  } else {
    fTeam = '';
  }
  renderCalendar();
}

// ── Init ───────────────────────────────────────────────────────
tsInit();
cpRender();
renderHome();
renderCalendar();
