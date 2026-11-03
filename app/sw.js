// quick-Pip-26 service worker: offline app shell + cached map tiles.
// Bump VERSION when you ship changes so clients pick them up.
const VERSION = 'qp26-v1.0.0';
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'css/pipboy.css',
  'vendor/preact-htm.module.js', 'vendor/leaflet.js', 'vendor/leaflet.css', 'vendor/fonts/ShareTechMono.woff2',
  'js/main.js', 'js/store.js', 'js/data.js', 'js/game.js', 'js/health.js', 'js/icons.js', 'js/ui.js', 'js/sfx.js', 'js/radio.js',
  'js/screens/stat.js', 'js/screens/quest.js', 'js/screens/items.js', 'js/screens/map.js', 'js/screens/data.js', 'js/screens/settings.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png',
];
const TILES = 'qp26-tiles';
const MAX_TILES = 800;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== TILES).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trimTiles() {
  const c = await caches.open(TILES);
  const keys = await c.keys();
  for (let i = 0; i < keys.length - MAX_TILES; i++) await c.delete(keys[i]);
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Map tiles: cache-first so visited areas work offline.
  if (url.hostname === 'tile.openstreetmap.org') {
    e.respondWith(caches.open(TILES).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') { c.put(req, res.clone()); if (Math.random() < 0.05) trimTiles(); }
      return res;
    }).catch(() => new Response('', { status: 504 })));
    return;
  }

  if (url.origin !== location.origin) return;

  // Navigations: network first, fall back to cached shell.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => {
      caches.open(VERSION).then(c => c.put('index.html', res.clone()));
      return res;
    }).catch(() => caches.match('index.html')));
    return;
  }

  // Everything else: stale-while-revalidate.
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(req, { ignoreSearch: true });
    const net = fetch(req).then(res => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(cs => (cs[0] ? cs[0].focus() : self.clients.openWindow('./'))));
});
