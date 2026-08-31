/**
 * Snaps — minimal service worker.
 * Amaç: "Ana ekrana ekle" (installability) + çevrimdışı basit kabuk.
 * Strateji: ağ öncelikli. Ağ başarısızsa önbellekten dön; navigasyonlarda
 * son çare olarak önbellekteki index.html. Uygulama verisi (localStorage /
 * Firestore) SW'den bağımsızdır.
 */
const CACHE = 'snaps-v1';
const SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;      // sadece kendi origin'imiz
  if (url.pathname.startsWith('/api/')) return;          // API asla önbelleğe alınmaz

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && (res.type === 'basic')) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        if (req.mode === 'navigate') {
          return (await caches.match('/index.html')) || (await caches.match('/')) || Response.error();
        }
        return Response.error();
      })
  );
});
