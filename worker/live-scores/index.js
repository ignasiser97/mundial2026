// Cloudflare Worker — Live Scores Proxy
// Fetches from ESPN unofficial API, caches 60s at the CF edge.
// Deploy: wrangler deploy (from this directory)

const NAMES_ES = {
  'Mexico': 'México', 'South Korea': 'Corea del Sur', 'Czech Republic': 'Rep. Checa',
  'South Africa': 'Sudáfrica', 'Canada': 'Canadá', 'Switzerland': 'Suiza',
  'Bosnia': 'Bosnia', 'Qatar': 'Catar', 'Brazil': 'Brasil', 'Morocco': 'Marruecos',
  'Scotland': 'Escocia', 'Haiti': 'Haití', 'United States': 'Estados Unidos',
  'USA': 'Estados Unidos', 'Australia': 'Australia', 'Turkey': 'Turquía', 'Turkiye': 'Turquía', 'Türkiye': 'Turquía',
  'Paraguay': 'Paraguay', 'Germany': 'Alemania', "Ivory Coast": 'Costa de Marfil',
  "Côte d'Ivoire": 'Costa de Marfil', 'Ecuador': 'Ecuador', 'Curacao': 'Curazao', 'Curaçao': 'Curazao',
  'Netherlands': 'Países Bajos', 'Japan': 'Japón', 'Sweden': 'Suecia',
  'Tunisia': 'Túnez', 'Belgium': 'Bélgica', 'New Zealand': 'Nueva Zelanda',
  'Iran': 'RI de Irán', 'IR Iran': 'RI de Irán',
  'Czechia': 'Rep. Checa', 'Bosnia-Herzegovina': 'Bosnia', 'Egypt': 'Egipto', 'Spain': 'España', 'Uruguay': 'Uruguay',
  'Saudi Arabia': 'Arabia Saudí', 'Cape Verde': 'Cabo Verde', 'France': 'Francia',
  'Senegal': 'Senegal', 'Norway': 'Noruega', 'Iraq': 'Irak', 'Argentina': 'Argentina',
  'Austria': 'Austria', 'Algeria': 'Argelia', 'Jordan': 'Jordania',
  'Portugal': 'Portugal', 'Colombia': 'Colombia', 'DR Congo': 'RD Congo',
  'Congo DR': 'RD Congo', 'Democratic Republic of Congo': 'RD Congo', 'Uzbekistan': 'Uzbekistán',
  'England': 'Inglaterra', 'Croatia': 'Croacia', 'Ghana': 'Ghana', 'Panama': 'Panamá',
};

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

// Same algorithm as matchId() in matches.js
function toMatchId(homeEs, awayEs, dateStr, timeStr) {
  const label = `${homeEs} vs ${awayEs}`.replace(/\s+vs\s+/g, '_vs_').replace(/\s/g, '');
  return `${dateStr}_${timeStr}_${label}`;
}

// Convert UTC date to Spain timezone strings
function toSpainDateTime(isoDate) {
  const dt = new Date(isoDate);
  const fmt = new Intl.DateTimeFormat('sv', {
    timeZone: 'Europe/Madrid',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
  const parts = fmt.formatToParts(dt);
  const get = t => parts.find(p => p.type === t)?.value ?? '';
  return {
    date: `${get('year')}-${get('month')}-${get('day')}`,
    time: `${get('hour')}:${get('minute')}`,
  };
}

async function fetchFromESPN() {
  // Try WC-specific endpoint first, fall back to full soccer scoreboard
  const endpoints = [
    'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard',
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible)' },
        cf: { cacheEverything: false },
      });
      if (res.ok) return { data: await res.json(), wc_only: true };
    } catch { /* try next */ }
  }
  return null;
}

function parseESPN({ data, wc_only }) {
  const matchResults = {};
  const events = data.events ?? [];

  for (const event of events) {
    // When using the general endpoint, filter to World Cup only
    if (!wc_only) {
      const leagueName = (event.league?.name ?? data.leagues?.[0]?.name ?? '').toLowerCase();
      if (!leagueName.includes('world cup')) continue;
    }

    const comp = event.competitions?.[0];
    if (!comp) continue;

    const state = comp.status?.type?.state; // 'pre' | 'in' | 'post'
    if (!state || state === 'pre') continue;

    const home = comp.competitors?.find(c => c.homeAway === 'home');
    const away = comp.competitors?.find(c => c.homeAway === 'away');
    if (!home?.team?.displayName || !away?.team?.displayName) continue;

    const homeEs = NAMES_ES[home.team.displayName] ?? home.team.displayName;
    const awayEs = NAMES_ES[away.team.displayName] ?? away.team.displayName;
    const { date, time } = toSpainDateTime(event.date);
    const mid = toMatchId(homeEs, awayEs, date, time);

    matchResults[mid] = {
      home:   parseInt(home.score || '0', 10),
      away:   parseInt(away.score || '0', 10),
      status: state === 'in' ? 'live' : 'ft',
    };
  }

  return matchResults;
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    // Edge cache key (shared across all users)
    const cache    = caches.default;
    const cacheKey = new Request('https://cache.internal/live-scores/v2');
    const cached   = await cache.match(cacheKey);
    if (cached) {
      const r = new Response(cached.body, cached);
      r.headers.set('X-Cache', 'HIT');
      return r;
    }

    const result       = await fetchFromESPN();
    const matchResults = result ? parseESPN(result) : {};

    const body = JSON.stringify({ matchResults, ts: Date.now() });
    const response = new Response(body, {
      headers: {
        'Content-Type': 'application/json',
        ...CORS,
        'Cache-Control': 'public, max-age=60',
      },
    });

    ctx.waitUntil(cache.put(cacheKey, response.clone()));
    return response;
  },
};
