const NEWS_SOURCES = [
  { id:'marca', name:'Marca',           url:'https://www.marca.com/rss/futbol/mundial.xml' },
  { id:'as',    name:'AS',              url:'https://as.com/rss/futbol/mundial.xml' },
  { id:'md',    name:'Mundo Deportivo', url:'https://www.mundodeportivo.com/rss/futbol/mundial.xml' },
];
const RSS2JSON = 'https://api.rss2json.com/v1/api.json?rss_url=';

let newsFilter = '';
let allNews    = [];

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function timeAgo(date) {
  const s = (Date.now() - date.getTime()) / 1000;
  if (s < 60)    return 'ahora mismo';
  if (s < 3600)  return `hace ${Math.floor(s/60)} min`;
  if (s < 86400) return `hace ${Math.floor(s/3600)} h`;
  return `hace ${Math.floor(s/86400)} d`;
}

async function fetchSource(src) {
  try {
    const res  = await fetch(RSS2JSON + encodeURIComponent(src.url));
    const data = await res.json();
    if (data.status !== 'ok') return [];
    return data.items
      .map(i => ({
        title:     i.title || '',
        link:      i.link  || '#',
        date:      new Date(i.pubDate || Date.now()),
        thumb:     i.thumbnail || i.enclosure?.link || '',
        sourceId:  src.id,
        sourceName:src.name,
      }));
  } catch { return []; }
}

async function loadNews(force=false) {
  const el = document.getElementById('news-content');
  if (!force && allNews.length) { renderNews(); return; }

  el.innerHTML = '<div class="empty">Cargando noticias…</div>';
  const results = await Promise.all(NEWS_SOURCES.map(fetchSource));
  allNews = results.flat()
    .sort((a,b) => b.date - a.date)
    .filter((item,i,arr) => !arr.slice(0,i).some(p => p.title.slice(0,40) === item.title.slice(0,40)));

  document.getElementById('news-updated').textContent =
    allNews.length ? `${allNews.length} artículos · ${new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}` : '';

  renderSourceChips();
  renderNews();
}

function renderSourceChips() {
  const counts = {};
  NEWS_SOURCES.forEach(s => { counts[s.id] = allNews.filter(n=>n.sourceId===s.id).length; });
  const el = document.getElementById('news-sources');
  const all = `<button class="ns-chip ${newsFilter===''?'active':''}" onclick="newsSetFilter('')">Todas (${allNews.length})</button>`;
  const chips = NEWS_SOURCES
    .filter(s => counts[s.id] > 0)
    .map(s => `<button class="ns-chip ${newsFilter===s.id?'active':''}" onclick="newsSetFilter('${s.id}')">${s.name} (${counts[s.id]})</button>`)
    .join('');
  el.innerHTML = all + chips;
}

function newsSetFilter(id) {
  newsFilter = id;
  renderSourceChips();
  renderNews();
}

function renderNews() {
  const items = newsFilter ? allNews.filter(n=>n.sourceId===newsFilter) : allNews;
  if (!items.length) {
    document.getElementById('news-content').innerHTML =
      '<p class="empty">No se encontraron noticias del Mundial.</p>';
    return;
  }
  const html = items.map(n => `
    <a class="news-card" href="${escHtml(n.link)}" target="_blank" rel="noopener">
      ${n.thumb ? `<img class="news-thumb" src="${escHtml(n.thumb)}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}
      <div class="news-body">
        <div class="news-title">${escHtml(n.title)}</div>
        <div class="news-meta">
          <span class="news-source">${escHtml(n.sourceName)}</span>
          <span>${timeAgo(n.date)}</span>
        </div>
      </div>
    </a>`).join('');
  document.getElementById('news-content').innerHTML = `<div class="news-list">${html}</div>`;
}
