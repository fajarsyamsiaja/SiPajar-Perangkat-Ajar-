/* SiPajar service worker: aplikasi bisa dibuka tanpa internet setelah dikunjungi sekali.
   Ubah VERSI setiap kali index.html diperbarui agar pengguna menerima versi terbaru. */
const VERSI = "sipajar-v1";
const LOKAL = ["./", "./index.html", "./manifest.json", "./icons/icon-192.png", "./icons/icon-512.png", "./icons/icon-maskable-512.png"];
const LUAR = ["https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js"];

self.addEventListener("install", e => {
  e.waitUntil((async () => {
    const c = await caches.open(VERSI);
    await Promise.all(LOKAL.map(u => c.add(u).catch(() => {})));
    await Promise.all(LUAR.map(u => c.add(new Request(u, { mode: "no-cors" })).catch(() => {})));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const k = await caches.keys();
    await Promise.all(k.filter(n => n !== VERSI).map(n => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.protocol !== "http:" && u.protocol !== "https:") return;
  // Halaman: coba jaringan dulu (agar update cepat), jika offline pakai cache.
  if (r.mode === "navigate") {
    e.respondWith((async () => {
      try {
        const res = await fetch(r);
        const c = await caches.open(VERSI);
        c.put("./index.html", res.clone());
        return res;
      } catch (_) {
        return (await caches.match("./index.html")) || (await caches.match("./"));
      }
    })());
    return;
  }
  // File lain: cache dulu, perbarui di latar belakang.
  e.respondWith((async () => {
    const c = await caches.open(VERSI);
    const ada = await c.match(r);
    const ambil = fetch(r).then(res => { if (res && (res.ok || res.type === "opaque")) c.put(r, res.clone()); return res; }).catch(() => ada);
    return ada || ambil;
  })());
});
