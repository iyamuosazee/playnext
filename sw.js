const CACHE='playnext-v3-competition';
const ASSETS=['./','./index.html','./styles.css','./v21.css','./live-teams.css','./players.css','./competition.css','./app-v21.js','./alerts.js','./live-teams.js','./players.js','./competition.js','./session-menu.js','./manifest.json'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>e.respondWith(fetch(e.request).catch(()=>caches.match(e.request))));
