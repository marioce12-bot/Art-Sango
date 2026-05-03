const CACHE_NAME = 'artsango-v3';
const DEFAULT_NOTIFICATION_ICON = './icon.svg';
const PRECACHE = [
  './',
  './index.html',
  './marketplace.html',
  './produit-detail.html',
  './panier.html',
  './checkout.html',
  './dashboard-artisan.html',
  './dashboard-client.html',
  './commandes.html',
  './produit-nouveau.html',
  './ai-studio.html',
  './boutique-vendeur.html',
  './connexion.html',
  './connexion-client.html',
  './inscription-artisan.html',
  './mobile-nav.js',
  './platform-logo.js',
  './icon.svg',
  './sw-register.js',
  './manifest.webmanifest',
  './messaging-service.js'
];

function readPushPayload(event) {
  if (!event.data) return {};
  try {
    return event.data.json();
  } catch {
    try {
      return JSON.parse(event.data.text());
    } catch {
      return {};
    }
  }
}

self.addEventListener('push', (event) => {
  const payload = readPushPayload(event);
  const title = payload.title || 'ArtSango';
  const body = payload.body || '';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: payload.icon || DEFAULT_NOTIFICATION_ICON,
      badge: payload.badge || DEFAULT_NOTIFICATION_ICON,
      tag: payload.tag || `artsango-${payload.kind || 'push'}-${Date.now()}`,
      data: {
        ...(payload.data || {}),
        url: payload.url || payload.data?.url || './index.html',
        kind: payload.kind || payload.data?.kind || '',
        title: payload.title || '',
      },
      requireInteraction: true,
    })
  );
});

// ═════════════════════════════════════════════════════════════
// 🔔 Notification Click Handler
// ═════════════════════════════════════════════════════════════
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || './messagerie.html';

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      const target = clientList.find((c) => c.url.includes(targetUrl.split('?')[0]));
      if (target) {
        target.focus();
        if (typeof target.navigate === 'function') return target.navigate(targetUrl);
        return target;
      }
      return clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : Promise.resolve())))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const req = event.request;
  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isNavigate = req.mode === 'navigate';

  // HTML pages: network-first with timeout fallback to cache
  if (isNavigate) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const networkPromise = fetch(req);
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4500));
        const response = await Promise.race([networkPromise, timeoutPromise]);
        if (response && response.ok) cache.put(req, response.clone());
        return response;
      } catch {
        const cached = await cache.match(req);
        if (cached) return cached;
        const byPath = await cache.match(url.pathname);
        if (byPath) return byPath;
        return cache.match('./index.html');
      }
    })());
    return;
  }

  // Same-origin static files: cache-first + revalidate
  if (isSameOrigin) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      if (cached) {
        fetch(req).then((fresh) => {
          if (fresh && fresh.ok) cache.put(req, fresh.clone());
        }).catch(() => {});
        return cached;
      }
      try {
        const fresh = await fetch(req);
        if (fresh && fresh.ok) cache.put(req, fresh.clone());
        return fresh;
      } catch {
        return caches.match('./index.html');
      }
    })());
    return;
  }

  // Third-party (fonts/firebase): stale-while-revalidate
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    if (cached) {
      fetch(req).then((fresh) => {
        if (fresh && (fresh.ok || fresh.type === 'opaque')) cache.put(req, fresh.clone());
      }).catch(() => {});
      return cached;
    }
    try {
      const fresh = await fetch(req);
      if (fresh && (fresh.ok || fresh.type === 'opaque')) cache.put(req, fresh.clone());
      return fresh;
    } catch {
      return new Response('', { status: 504, statusText: 'Gateway Timeout' });
    }
  })());
});
