// Offline-Cache: Antwort sofort aus dem Cache, im Hintergrund aktualisieren.
// Bei Änderungen an den Dateien VERSION hochzählen. Das Protokoll selbst liegt nicht im Cache.
const VERSION = "v3";
const DATEIEN = [
  "./", "index.html", "manifest.webmanifest", "css/app.css",
  "js/app.js", "js/speicher.js", "js/auswertung.js", "js/zeit.js", "js/csv.js",
  "js/tier.js", "js/abzeichen.js", "js/icons.js", "js/effekte.js",
  "fonts/nunito-var.woff2", "fonts/grandstander-800.woff2",
  "icons/icon-192.png", "icons/apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  // "reload" umgeht den HTTP-Cache, damit nie alte und neue Dateien gemischt im Cache landen
  e.waitUntil(caches.open(VERSION)
    .then((c) => c.addAll(DATEIEN.map((url) => new Request(url, { cache: "reload" }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET" || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const alt = await cache.match(e.request, { ignoreSearch: true });
      const neu = fetch(e.request.mode === "navigate" ? e.request : new Request(e.request, { cache: "no-cache" }))
        .then((antwort) => { if (antwort.ok) cache.put(e.request, antwort.clone()); return antwort; })
        .catch(() => alt);
      return alt || neu;
    }),
  );
});
