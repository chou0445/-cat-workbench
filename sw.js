// 猫咪工作台 - Service Worker (PWA)
const CACHE_NAME = 'cat-workbench-v8';
const BASE = self.registration ? self.registration.scope : '/';

// 预缓存的核心资源（安装时立即缓存）
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './css/components.css',
  './js/app.js',
  './js/store.js',
  './js/pages-home.js',
  './js/pages-circle.js',
  './js/pages-service.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './offline.html'
];

// 离线回退页面
const OFFLINE_URL = './offline.html';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // 逐个缓存，失败也不阻塞安装
      return Promise.allSettled(
        PRECACHE_URLS.map(url => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
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

  // 导航请求（HTML 页面）：网络优先，失败用缓存，再失败用离线页
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).then(response => {
        if (response && response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() =>
        caches.match(event.request).then(cached =>
          cached || caches.match(OFFLINE_URL).then(offline =>
            offline || new Response('离线模式', { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
          )
        )
      )
    );
    return;
  }

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
    return;
  }

  // 跨域请求（Gist、图片等）：网络优先，失败用缓存
  event.respondWith(
    fetch(event.request).catch(() =>
      caches.match(event.request).then(response =>
        response || new Response('', { status: 504 })
      )
    )
  );
});

// 接收来自页面的消息，强制刷新
self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
