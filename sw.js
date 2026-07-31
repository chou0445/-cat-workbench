// 猫咪工作台 - Service Worker (PWA)
const CACHE_NAME = 'cat-workbench-v5';
const BASE = self.registration ? self.registration.scope : '/';

self.addEventListener('install', event => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // 同源请求：网络优先，失败再用缓存
  if (url.origin === self.location.origin) {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match(event.request))
    );
  }
  // 跨域请求（Gist、图片）：网络优先，失败用缓存
  else {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request)).then(response => response || new Response('', { status: 504 }))
    );
  }
});

// 接收来自页面的消息，强制刷新
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
