const CACHE='after-hours-test-v4';const ASSETS=['./','./index.html','./styles.css','./app.js','./private-logic.js','./data/cards.js','./assets/icon.svg','./assets/face.svg','./assets/lap.svg','./assets/side.svg','./assets/standing.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));self.clients.claim()});
self.addEventListener('fetch',e=>{if(e.request.method==='GET'&&new URL(e.request.url).origin===self.location.origin)e.respondWith(caches.match(e.request).then(x=>x||fetch(e.request)))});
