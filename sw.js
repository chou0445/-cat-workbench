// 猫咪工作台 - Service Worker (PWA)
const CACHE_NAME = 'cat-workbench-v4';
const BASE = self.registration ? self.registration.scope : '/';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './css/components.css',
  './js/store.js',
  './js/charts.js',
  './js/router.js',
  './js/app.js',
  './js/pages-home.js',
  './js/pages-service.js',
  './js/pages-circle.js',
  './data/videos.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', event => {
  // 只缓存同源请求
  if (event.request.method !== 'GET') return;
  
  const url = new URL(event.request.url);
  
  // 同源请求：缓存优先
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        const fetchPromise = fetch(event.request).then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
  // 跨域请求（如 Gist、图片）：网络优先，失败用缓存
  else {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request)).then(response => response || new Response('', { status: 504 }))
    );
  }
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});
