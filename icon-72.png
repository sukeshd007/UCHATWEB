// public/sw.js — UChat Service Worker
// Caches the app shell + all R2 media (images, videos, voice notes) for offline.

const APP_VERSION   = 'uchat-v2.0.0';
const STATIC_CACHE  = `${APP_VERSION}-static`;
const MEDIA_CACHE   = `${APP_VERSION}-media`;
const DYNAMIC_CACHE = `${APP_VERSION}-dynamic`;

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(STATIC_CACHE)
      .then(c => c.addAll(PRECACHE_ASSETS).catch(err => console.warn('[SW] Pre-cache error:', err)))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('uchat-') && k !== STATIC_CACHE && k !== MEDIA_CACHE && k !== DYNAMIC_CACHE)
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // ── App shell: cache-first ────────────────────────────────────────────────
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(request).then(hit => hit || fetchAndCache(request, DYNAMIC_CACHE))
    );
    return;
  }

  // ── R2 / Cloudflare Worker media: cache-first, fallback to network ─────────
  const isWorker = url.pathname.startsWith('/file/');
  const isMedia  = /\.(jpg|jpeg|png|gif|webp|mp4|webm|mov|mp3|webm|ogg)$/i.test(url.pathname);

  if (isWorker || isMedia) {
    e.respondWith(
      caches.match(request).then(hit => {
        if (hit) return hit;
        return fetch(request).then(res => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(MEDIA_CACHE).then(c => c.put(request, clone));
          }
          return res;
        }).catch(() => caches.match(request)); // if totally offline, try cache again
      })
    );
    return;
  }

  // ── Firebase/Firestore API: network-only (Firestore has its own offline layer) ─
  if (url.hostname.includes('firestore.googleapis.com') || url.hostname.includes('firebase')) return;

  // ── Everything else: stale-while-revalidate ───────────────────────────────
  e.respondWith(
    caches.match(request).then(cached => {
      const network = fetch(request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(DYNAMIC_CACHE).then(c => c.put(request, clone));
        }
        return res;
      });
      return cached || network;
    })
  );
});

async function fetchAndCache(request, cacheName) {
  try {
    const res = await fetch(request);
    if (res && res.status === 200) {
      const clone = res.clone();
      caches.open(cacheName).then(c => c.put(request, clone));
    }
    return res;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Return offline page for navigation requests
    if (request.mode === 'navigate') return caches.match('/index.html');
    return new Response('Offline', { status: 503 });
  }
}

// ── Background sync: drain outbox when reconnected ────────────────────────────
self.addEventListener('sync', (e) => {
  if (e.tag === 'sync-outbox') {
    e.waitUntil(
      self.clients.matchAll().then(clients =>
        clients.forEach(c => c.postMessage({ type: 'SYNC_OUTBOX' }))
      )
    );
  }
});

// ── Push notifications ────────────────────────────────────────────────────────
self.addEventListener('push', (e) => {
  if (!e.data) return;
  const data = e.data.json();
  e.waitUntil(
    self.registration.showNotification(data.title || 'UChat', {
      body:  data.body  || 'New message',
      icon:  '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      data:  data.url ? { url: data.url } : {},
      vibrate: [100, 50, 100],
    })
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = e.notification.data?.url || '/';
  e.waitUntil(clients.openWindow(url));
});
