// Tengyunzi service worker -- network-first.
//
// Rule: while the network is reachable, the user always gets what the server
// has right now. The cache exists only as an offline fallback, never as the
// primary source for HTML/CSS/JS. That way a deploy can never leave someone
// stuck on an old build, and correctness does not depend on remembering to bump
// SW_VERSION by hand.
//
// Two things make an update land promptly:
//   1. vercel.json serves /sw.js with "Cache-Control: no-cache", so the browser
//      revalidates this file on every navigation instead of reusing an HTTP
//      cached copy for up to 24h.
//   2. skipWaiting + clients.claim below, so a new worker takes over without
//      waiting for every tab to close.
//
// SW_VERSION only controls cache housekeeping: changing it drops every previous
// cache on activate. scripts/stamp_sw_version.py rewrites the line below.
const SW_VERSION = '20260724-1839-6eb6bca';

const RUNTIME_CACHE = `tengyunzi-runtime-${SW_VERSION}`;

// A dedicated page rather than /index.html: falling back to the homepage leaves
// the address bar showing the page the user asked for while the body shows
// something else, which reads as a broken site rather than as being offline.
const OFFLINE_FALLBACK = '/offline.html';

// Long-lived, content-stable assets. vercel.json already serves these with a
// long max-age, so serving them from cache first costs nothing in freshness and
// saves a round trip.
const CACHE_FIRST_PREFIXES = ['/fonts/', '/images/'];

// Pages that must never be served from a cache: they are per-user or
// operational surfaces where a stale render is worse than an error.
const NEVER_CACHE_PATHS = ['/tengyunzi-admin.html', '/koc-dashboard.html'];

// Keep the runtime cache from growing without bound on a 40-page site.
const MAX_RUNTIME_ENTRIES = 80;

// Bail out to the cache rather than hanging on a dead-but-not-closed socket --
// the classic captive-portal / subway-tunnel case where fetch() never settles.
const NETWORK_TIMEOUT_MS = 5000;

self.addEventListener('install', (event) => {
  // Only the offline fallback is precached. Everything else lands in the cache
  // as a by-product of being fetched, so there is no asset list to keep in sync
  // with the HTML (the old list had gone stale and mostly never matched, since
  // pages request /foo.css?v=… while the list held bare /foo.css).
  event.waitUntil(
    caches.open(RUNTIME_CACHE)
      .then((cache) => cache.add(OFFLINE_FALLBACK))
      .catch(() => null)
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== RUNTIME_CACHE).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// Lets a page trigger an immediate takeover (js/pwa-register.js uses this).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

async function trimCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_RUNTIME_ENTRIES) return;
  // keys() is insertion-ordered, so the head is the least recently added.
  await Promise.all(keys.slice(0, keys.length - MAX_RUNTIME_ENTRIES).map((key) => cache.delete(key)));
}

// Takes a response that the caller has ALREADY cloned. Cloning in here would be
// too late: the first await hands control back to the page, which consumes the
// body, and a later clone() then throws "body is already used" -- silently
// leaving the cache empty and the offline fallback non-functional.
async function putInCache(request, responseCopy) {
  if (!responseCopy || !responseCopy.ok || responseCopy.type !== 'basic') return;
  const cache = await caches.open(RUNTIME_CACHE);
  await cache.put(request, responseCopy);
  await trimCache(cache);
}

function fetchWithTimeout(request) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('network_timeout')), NETWORK_TIMEOUT_MS);
    fetch(request).then(
      (response) => { clearTimeout(timer); resolve(response); },
      (error) => { clearTimeout(timer); reject(error); }
    );
  });
}

async function networkFirst(request, isNavigation) {
  try {
    const response = await fetchWithTimeout(request);
    // Clone synchronously, then cache in the background: a failed cache write
    // must not fail the response the page is waiting on.
    putInCache(request, response.clone()).catch(() => {});
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (isNavigation) {
      const fallback = await caches.match(OFFLINE_FALLBACK);
      if (fallback) return fallback;
    }
    throw error;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  putInCache(request, response.clone()).catch(() => {});
  return response;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Supabase edge functions and auth are same-origin only in local dev, but the
  // guard is cheap and keeps authenticated responses out of the cache entirely.
  if (url.hostname.includes('supabase.co') || url.pathname.startsWith('/functions/v1/')) return;
  if (NEVER_CACHE_PATHS.includes(url.pathname)) return;

  if (CACHE_FIRST_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request, request.mode === 'navigate'));
});
