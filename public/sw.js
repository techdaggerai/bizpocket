// Evrywher / BizPocket Service Worker — auto-update detection
// This SW is intentionally minimal: its only job is to let the browser
// detect when a new version has been deployed so the client can prompt a refresh.

const CACHE_NAME = 'evrywher-v1';

// Install: activate immediately (don't wait for old tabs to close)
self.addEventListener('install', () => {
  self.skipWaiting();
});

// Activate: claim all clients so the new SW takes effect right away
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      // Clean up any old caches
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      ),
    ])
  );
});

// Fetch: network-first for everything (no stale cached pages)
// Only cache the offline fallback and static assets
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Skip API calls, auth, and Supabase requests — never cache these
  const url = new URL(event.request.url);
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.hostname.includes('supabase')
  ) {
    return;
  }

  // For navigation requests: always go to network (ensures fresh HTML)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match('/').then((r) => r || new Response('Offline', { status: 503 }))
      )
    );
    return;
  }

  // For static assets (_next/static): cache-first (they have hashed filenames)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return response;
          })
      )
    );
    return;
  }
});

// Listen for messages from the client
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
