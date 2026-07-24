const CACHE_NAME = 'tengyunzi-english-v8-20260722-seo-performance';
const STATIC_ASSETS = [
  '/index.html',
  '/tengyunzi-readings.html',
  '/tengyunzi-bundle.html',
  '/tengyunzi-annual-forecast.html',
  '/tengyunzi-report.html',
  '/tengyunzi-whats-inside.html',
  '/tengyunzi-free-resources.html',
  '/tengyunzi-blog.html',
  '/tengyunzi-account.html',
  '/tengyunzi-newsletter.html',
  '/robots.txt',
  '/sitemap.xml',
  '/tengyunzi-newsletter.css',
  '/tengyunzi-sales.css',
  '/tengyunzi-bundle.css',
  '/tengyunzi-annual-forecast.css',
  '/tengyunzi-product.css',
  '/tengyunzi-shell.css',
  '/tengyunzi-fonts.css',
  '/fonts/noto-sans-latin.woff2',
  '/fonts/noto-serif-latin.woff2',
  '/images/resources/bazi-foundations-cover.webp',
  '/images/resources/timing-calendar-cover.webp',
  '/js/bazi.js',
  '/js/tengyunzi-shell.js',
  '/js/tengyunzi-auth.js',
  '/js/tengyunzi-report.js',
  '/js/newsletter.js',
  '/js/daily-almanac.js',
  '/js/order-intake.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => (
      Promise.all(STATIC_ASSETS.map((asset) => cache.add(asset).catch(() => null)))
    ))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || url.hostname.includes('supabase.co')) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(async () => (
          (await caches.match(event.request)) || (await caches.match('/index.html'))
        ))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const refresh = fetch(event.request).then((response) => {
        if (response.ok && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
      return cached || refresh;
    })
  );
});
