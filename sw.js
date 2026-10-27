// Cache simples: o app abre mesmo sem internet. Os dados vêm da rede quando há.
// Ao mudar arquivos, aumente a versão abaixo para forçar a atualização.
const CACHE = "eras-v3";
const FILES = ["./", "index.html", "css/app.css", "js/app.js", "js/config.js", "js/data.js", "js/store.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Rede primeiro para os arquivos do app (pega edições na hora); cache se estiver offline.
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then((r) => {
      const copy = r.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy));
      return r;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match("index.html")))
  );
});
