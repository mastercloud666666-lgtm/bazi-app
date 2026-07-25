(function () {
  'use strict';

  // Registers the network-first service worker in public/sw.js.
  //
  // Deliberately does not force a reload when a new worker takes over. The
  // worker is network-first, so an already-open tab is not showing stale
  // content -- reloading under someone mid-way through the birth-details form
  // would cost more than it gains. The new worker claims clients immediately,
  // so the next navigation is served by it.
  if (!('serviceWorker' in navigator)) return;

  // Registration requires a secure context; localhost counts as one.
  if (!window.isSecureContext) return;

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).then(function (registration) {
      // Ask the browser to check for a new sw.js on every page load. Combined
      // with "Cache-Control: no-cache" on /sw.js (see vercel.json) this is what
      // makes a deploy reach existing installs promptly.
      registration.update().catch(function () {});

      registration.addEventListener('updatefound', function () {
        var installing = registration.installing;
        if (!installing) return;
        installing.addEventListener('statechange', function () {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) {
            // A previous worker is still in control; hand over now so the next
            // navigation uses the new one.
            installing.postMessage({ type: 'SKIP_WAITING' });
          }
        });
      });
    }).catch(function () {
      // A failed registration must never break the page.
    });
  });
})();
