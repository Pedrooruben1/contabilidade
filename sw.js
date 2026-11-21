// O nome da cache acompanha a versão da app (VERSION em app.js). Há um teste que obriga a coincidirem.
const CACHE = 'contabilidade-v28';
const FILES = ['./', 'index.html', 'style.css', 'app.js', 'analise.js', 'desafios.js', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'fonts/manrope-latin-500-normal.woff2', 'fonts/manrope-latin-700-normal.woff2', 'fonts/manrope-latin-800-normal.woff2'];
// Cada ficheiro é guardado em separado: se algum faltar no servidor, os outros ficam na mesma disponíveis offline.
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(f => c.add(new Request(f, { cache: 'reload' })).catch(() => null))))); self.skipWaiting(); });
self.addEventListener('activate', e => {
  // Apaga só as caches antigas DA POUPANÇA (a origem do GitHub Pages é partilhada por todos os sites do mesmo utilizador).
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith('contabilidade-') && k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (new URL(e.request.url).origin !== self.location.origin) return; // pedidos para fora (o contador) seguem direto, sem cache
  e.respondWith(
    // cache: 'no-cache' = o navegador reconfirma com o servidor (pedido condicional) em vez de usar uma cópia com até 10 minutos (GitHub Pages)
    fetch(e.request, { cache: 'no-cache' }).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); } return r; }) // só guarda respostas válidas (nunca um erro 404)
      .catch(() => caches.match(e.request).then(r => r || caches.match('index.html')))
  );
});
