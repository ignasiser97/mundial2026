const VERSION = 'v136';
const CACHE   = 'mundial2026-' + VERSION;

const CORE = [
  './',
  './index.html',
  './manifest.json',
  './logo.png',
  './standings.json',
  './js/matches.js',
  './js/home.js',
  './js/calendar.js',
  './js/groups.js',
  './js/stats.js',
  './js/news.js',
  './js/quiniela.js',
  './js/venues.js',
  './js/app.js',
  './js/push.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)));
  // No skipWaiting — la página decide cuándo activar
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // Solo cachear recursos del mismo origen
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// La página envía SKIP_WAITING cuando el usuario pulsa "Actualizar"
self.addEventListener('message', e => {
  if (e.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('push', e => {
  const data = e.data?.json() ?? {};
  e.waitUntil(
    self.registration.showNotification(data.title ?? 'Mundial 2026', {
      body:  data.body  ?? '',
      icon:  './logo.png',
      badge: './logo.png',
      tag:   data.tag   ?? 'mundial',
      data:  { url: data.url ?? './' },
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      const existing = list.find(c => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return clients.openWindow(e.notification.data?.url ?? './');
    })
  );
});
