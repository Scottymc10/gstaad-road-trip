/* Six Days to Gstaad — offline service worker.
   Precaches the two pages + icons on install, caches fonts and other assets
   on first load, and serves everything from cache when there's no signal. */
const CACHE = "gstaad-v1";
const CORE = [
  "./",
  "index.html",
  "roadbook.html",
  "icon-guide.png",
  "icon-roadbook.png",
  "manifest.webmanifest"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const isDocument = request.mode === "navigate" || request.destination === "document";

  if (isDocument) {
    // Network-first for pages: fresh when online, cached copy when offline.
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then(hit => hit || caches.match("index.html")))
    );
    return;
  }

  // Cache-first for assets (fonts, icons, styles): fast, and available offline.
  event.respondWith(
    caches.match(request).then(hit => {
      if (hit) return hit;
      return fetch(request).then(response => {
        if (response && (response.status === 200 || response.type === "opaque")) {
          const copy = response.clone();
          caches.open(CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
