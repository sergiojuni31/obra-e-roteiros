const VERSAO = 'oc-v1';
const ARQUIVOS = [
  './', './index.html', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO)
    .then(c => Promise.allSettled(ARQUIVOS.map(u => c.add(u))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co')) return; // dados e login nunca vão para o cache

  // Página: tenta a internet primeiro (pega atualizações); sem internet, usa a cópia
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(r => {
      const cp = r.clone(); caches.open(VERSAO).then(c => c.put('./index.html', cp)); return r;
    }).catch(() => caches.match('./index.html')));
    return;
  }

  // Demais arquivos: cache primeiro, internet se não tiver
  e.respondWith(caches.match(req).then(h => h || fetch(req).then(r => {
    if (r.ok && (url.origin === location.origin || url.hostname === 'cdn.jsdelivr.net')) {
      const cp = r.clone(); caches.open(VERSAO).then(c => c.put(req, cp));
    }
    return r;
  })));
});
