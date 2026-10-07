/* Purview Gurukul offline service worker.
   Bump VER on any release to invalidate old caches. */
const PRE = "purview-gurukul-";
const VER = PRE + "v18";
const RT  = VER + "-rt";
const APP = ["./", "./index.html", "./basics.js", "./scenarios.js", "./calls.js", "./sources.js", "./sops.js", "./manifest.webmanifest",
             "./icon-192.png?v=2", "./icon-512.png?v=2", "./icon-maskable-512.png?v=2",
             "./icon-180.png?v=2", "./favicon-32.png?v=2", "./favicon-16.png?v=2"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VER).then(c => c.addAll(APP)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k.startsWith(PRE) && k !== VER && k !== RT).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Page loads: network-first so updates arrive,
  // cached copy when offline.
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(r => {
        const cp = r.clone();
        caches.open(VER).then(c => c.put(req.mode === "navigate" ? "./index.html" : req, cp));
        return r;
      }).catch(() => caches.match(req).then(hit => hit || caches.match("./index.html")))
    );
    return;
  }

  // Same-origin assets (icons, manifest): cache first.
  if (url.origin === location.origin) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(r => {
        const cp = r.clone();
        caches.open(VER).then(c => c.put(req, cp));
        return r;
      }))
    );
    return;
  }

  // Google Fonts: cached, refresh in background.
  if (/fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
    e.respondWith(
      caches.open(RT).then(async c => {
        const hit = await c.match(req);
        const net = fetch(req).then(r => { c.put(req, r.clone()); return r; }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
