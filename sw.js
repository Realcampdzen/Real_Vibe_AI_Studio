// Service Worker для AI Studio
// Версия кэша
const CACHE_VERSION = 'v1.89-20260520-agent-office-video';
const CACHE_NAME = `ai-studio-${CACHE_VERSION}`;
const STATIC_CACHE = `ai-studio-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `ai-studio-dynamic-${CACHE_VERSION}`;

// Поддержка деплоя в подкаталог (GitHub Pages, stage и т.п.)
const SCOPE_URL = new URL(self.registration.scope);
const BASE_PATH = SCOPE_URL.pathname.replace(/\/$/, '');
const withBase = (path) => (BASE_PATH ? `${BASE_PATH}${path}` : path);

// Ресурсы для кэширования (только локальные, внешние ресурсы кэшируются динамически)
const STATIC_ASSETS = [
  withBase('/'),
  withBase('/index.html'),
  withBase('/admin-prices.html'),
  withBase('/service-detail.html'),
  withBase('/ai-photo-detail.html'),
  withBase('/robots.txt'),
  withBase('/sitemap.xml'),
  withBase('/manifest.json?v=20260520-pwa-standalone'),
  withBase('/public/icons/icon-192.png'),
  withBase('/public/icons/icon-192.png?v=20260520-pwa-standalone'),
  withBase('/public/icons/icon-512.png'),
  withBase('/public/icons/maskable-512.png'),
  withBase('/public/icons/apple-touch-icon.png'),
  withBase('/public/icons/apple-touch-icon.png?v=20260520-pwa-standalone'),
  withBase('/public/og-real-vibe-ai-studio-20260519.jpg'),
  withBase('/css/style.css?v=20260520-agent-office-video'),
  withBase('/css/admin-prices.css?v=20260518-market-prices'),
  withBase('/css/critical-fixes.css?v=20260518-social-preview'),
  withBase('/css/mobile-improvements.css?v=20260520-mobile-commerce'),
  withBase('/css/mobile-improvements.css'),
  withBase('/css/mobile-advanced.css'),
  withBase('/js/hero-reveal.js'),
  withBase('/js/pwa-chrome.js?v=20260520-pwa-standalone'),
  withBase('/js/scroll-manager.js?v=20260519-mobile-premium-recovery'),
  withBase('/js/video-optimizer.js?v=20260519-mobile-premium-recovery'),
  withBase('/js/script.js?v=20260519-mobile-premium-recovery'),
  withBase('/js/page-common.js?v=20260519-mobile-premium-recovery'),
  withBase('/js/haptic-feedback.js?v=20260519-mobile-premium-recovery'),
  withBase('/js/service-prices.js?v=20260518-market-prices'),
  withBase('/js/service-price-bindings.js?v=20260518-market-prices'),
  withBase('/js/service-data.js?v=20260520-agent-office-video'),
  withBase('/js/service-detail-page.js?v=20260519-performance-pass'),
  withBase('/js/admin-prices.js?v=20260518-market-prices'),
  withBase('/js/auth-cart.js?v=20260520-mobile-commerce'),
  withBase('/js/chat-client.js?v=20260512-productux'),
  withBase('/js/chat.js?v=20260512-productux'),
  withBase('/js/services-carousel.js'),
  withBase('/js/performance-loader.js?v=20260519-mobile-premium-recovery'),
  withBase('/js/image-optimizer.js?v=20260519-performance-pass'),
  withBase('/js/mobile-enhancements.js?v=20260519-mobile-premium-recovery'),
  withBase('/js/pull-to-refresh.js?v=20260512-productux'),
  withBase('/js/glass-ui-health.js?v=20260519-performance-pass'),
  withBase('/js/glass-ui-bro-cat.js?v=20260518-wellness-bro-ui'),
  withBase('/js/glass-ui-valyusha.js?v=20260518-wellness-bro-ui'),
  withBase('/chat-components/GlassUIWidget.js?v=20260518-wellness-bro-ui'),
  withBase('/images/wellness-bro-avatar-384.webp'),
  withBase('/images/bro-avatar.jpg'),
  withBase('/images/neon-room.png'),
  withBase('/public/works/polstan/polstan-home-portal-20260519.jpg'),
  withBase('/public/works/services/music/polstan-hero-poster-20260519.jpg')
];

// Установка Service Worker
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Установка');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('📦 Service Worker: Кэширование статических ресурсов');
        // Кэшируем ресурсы с обработкой ошибок для внешних CDN
        return Promise.allSettled(
          STATIC_ASSETS.map(url => {
            return cache.add(url).catch(error => {
              // Игнорируем ошибки для внешних ресурсов (CSP может блокировать)
              if (url.startsWith('http://') || url.startsWith('https://')) {
                console.warn('⚠️ Service Worker: Не удалось кэшировать внешний ресурс', url, error.message);
                return null;
              }
              throw error;
            });
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Установка завершена');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Service Worker: Ошибка установки', error);
        // Продолжаем работу даже при ошибках
        return self.skipWaiting();
      })
  );
});

// Активация Service Worker
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Активация');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Удаляем все старые версии кэша
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE && cacheName !== CACHE_NAME) {
              console.log('🗑️ Service Worker: Удаление старого кэша', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('✅ Service Worker: Активация завершена, версия', CACHE_NAME);
        return self.clients.claim();
      })
  );
});

// Обработка запросов
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // Не трогаем не-GET запросы
  if (request.method !== 'GET') {
    return;
  }

  // HTML (navigation) — network-first, иначе сайт "залипает" на старом index.html
  const accepts = request.headers.get('accept') || '';
  const isHTML = request.mode === 'navigate' || accepts.includes('text/html');
  if (isHTML) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          return (
            caches.match(request) ||
            caches.match(withBase('/index.html'))
          );
        })
    );
    return;
  }

  // Large media must stream directly from the network/CDN. Caching full video
  // responses in Cache Storage causes quota pressure and playback stalls.
  if (isMediaRequest(request, url)) {
    return;
  }

  // Стратегия для статических ресурсов
  if (sameOrigin && isStaticAsset(request.url) && !url.pathname.endsWith('/sw.js')) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        const fetchPromise = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              const copy = networkResponse.clone();
              caches.open(STATIC_CACHE).then((cache) => {
                cache.put(request, copy).catch(() => {});
              });
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        // stale-while-revalidate
        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // Стратегия для изображений
  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(request)
            .then((networkResponse) => {
              // Кэшируем только успешные ответы
              if (networkResponse.status === 200) {
                return caches.open(DYNAMIC_CACHE)
                  .then((cache) => {
                    cache.put(request, networkResponse.clone()).catch(err => {
                      console.warn('⚠️ Service Worker: Не удалось кэшировать изображение', request.url, err.message);
                    });
                    return networkResponse;
                  });
              }
              return networkResponse;
            })
            .catch((error) => {
              // Игнорируем ошибки CSP для внешних ресурсов
              if (error.message.includes('CSP') || error.message.includes('Content Security Policy')) {
                console.warn('⚠️ Service Worker: Ресурс заблокирован CSP', request.url);
                // Позволяем браузеру обработать запрос самостоятельно
                return fetch(request);
              }
              // Возвращаем placeholder изображение только для локальных ресурсов
              if (!request.url.startsWith('http://') && !request.url.startsWith('https://')) {
                return new Response(
                  '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f0f0f0"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#999">Изображение недоступно</text></svg>',
                  { headers: { 'Content-Type': 'image/svg+xml' } }
                );
              }
              throw error;
            });
        })
    );
    return;
  }

  // API responses are stateful and must not be stored in Cache Storage.
  if (url.pathname.includes('/api/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Default: network first, no dynamic caching for arbitrary responses.
  event.respondWith(
    fetch(request)
      .catch((error) => {
        // Игнорируем ошибки CSP для внешних ресурсов
        if (error.message && (error.message.includes('CSP') || error.message.includes('Content Security Policy'))) {
          console.warn('⚠️ Service Worker: Ресурс заблокирован CSP, пропускаем кэширование', request.url);
          // Для внешних ресурсов просто возвращаем ошибку, браузер загрузит их напрямую
          if (request.url.startsWith('http://') || request.url.startsWith('https://')) {
            return fetch(request).catch(() => {
              // Если и прямой fetch не работает, возвращаем ошибку
              return new Response('Resource blocked by CSP', { status: 403 });
            });
          }
        }
        // Если сеть недоступна, возвращаем из кэша
        return caches.match(request);
      })
  );
});

// Обработка сообщений от клиента
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_CACHE_SIZE') {
    getCacheSize().then((size) => {
      event.ports[0].postMessage({ cacheSize: size });
    });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    clearCache().then(() => {
      event.ports[0].postMessage({ success: true });
    });
  }
});

// Обработка push уведомлений
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body || 'У вас новое сообщение от AI Studio',
      icon: '/images/icon-192.png',
      badge: '/images/badge-72.png',
      tag: 'ai-studio-notification',
      renotify: true,
      requireInteraction: true,
      actions: [
        {
          action: 'open',
          title: 'Открыть',
          icon: '/images/action-open.png'
        },
        {
          action: 'close',
          title: 'Закрыть',
          icon: '/images/action-close.png'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'AI Studio', options)
    );
  }
});

// Обработка клика по уведомлению
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Синхронизация в фоне
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(
      syncData()
    );
  }
});

// Вспомогательные функции

function isStaticAsset(url) {
  const staticExtensions = ['.css', '.js', '.json', '.woff', '.woff2', '.ttf', '.eot'];
  return staticExtensions.some(ext => url.includes(ext));
}

function isMediaRequest(request, url) {
  if (request.destination === 'video' || request.destination === 'audio') {
    return true;
  }
  return /\.(mp4|webm|ogg|mp3|wav|m4a)(\?.*)?$/i.test(url.pathname + url.search);
}

async function getCacheSize() {
  const cacheNames = await caches.keys();
  let totalSize = 0;
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const requests = await cache.keys();
    
    for (const request of requests) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }
  
  return totalSize;
}

async function clearCache() {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

async function syncData() {
  try {
    // Здесь можно добавить логику синхронизации данных
    console.log('🔄 Service Worker: Синхронизация данных');
    
    // Например, отправка отложенных сообщений чата
    const pendingMessages = await getStoredMessages();
    if (pendingMessages.length > 0) {
      await sendPendingMessages(pendingMessages);
      await clearStoredMessages();
    }
    
    return Promise.resolve();
  } catch (error) {
    console.error('❌ Service Worker: Ошибка синхронизации', error);
    return Promise.reject(error);
  }
}

async function getStoredMessages() {
  // Получаем сохраненные сообщения из IndexedDB
  return [];
}

async function sendPendingMessages(messages) {
  // Отправляем отложенные сообщения
  for (const message of messages) {
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(message)
      });
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
    }
  }
}

async function clearStoredMessages() {
  // Очищаем сохраненные сообщения
}

console.log('🎯 Service Worker загружен и готов к работе');
