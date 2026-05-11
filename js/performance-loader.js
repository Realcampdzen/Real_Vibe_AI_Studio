// Lightweight loader that defers non-critical assets to speed up first paint
(function () {
  const idle =
    window.requestIdleCallback ||
    function (cb, opts) {
      return setTimeout(cb, (opts && opts.timeout) || 200);
    };

  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection;
  const saveData = !!(connection && connection.saveData);
  const slowNetwork =
    connection &&
    ['slow-2g', '2g'].includes(connection.effectiveType);
  const prefersReducedMotion =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile =
    window.matchMedia &&
    window.matchMedia('(max-width: 900px)').matches;

  const loadedScripts = new Set();
  const loadedStyles = new Set();

  function loadScript(src) {
    if (loadedScripts.has(src)) return Promise.resolve();
    if (document.querySelector(`script[src="${src}"]`)) {
      loadedScripts.add(src);
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.defer = true;
      script.onload = () => {
        loadedScripts.add(src);
        resolve();
      };
      script.onerror = (err) => {
        console.warn('[perf-loader] script failed', src, err);
        resolve();
      };
      document.body.appendChild(script);
    });
  }

  function loadStyle(href, media) {
    if (loadedStyles.has(href)) return Promise.resolve();

    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = href;
      if (media) link.media = media;
      link.onload = () => {
        loadedStyles.add(href);
        resolve();
      };
      link.onerror = (err) => {
        console.warn('[perf-loader] style failed', href, err);
        resolve();
      };
      document.head.appendChild(link);
    });
  }

  function lazyImages() {
    document.querySelectorAll('img:not([loading])').forEach((img) => {
      if (
        (img.dataset && img.dataset.critical === 'true') ||
        img.classList.contains('logo-image') ||
        img.closest('header')
      ) {
        return;
      }
      
      // Проверяем, находится ли изображение в первых 2 экранах
      const rect = img.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const isAboveFold = rect.top < viewportHeight * 2.5;
      
      // Не используем lazy loading для изображений, которые скоро появятся
      // Это предотвращает "люк" - пустые контейнеры
      if (!isAboveFold) {
        img.loading = 'lazy';
      } else {
        // Для изображений выше fold используем eager loading
        img.loading = 'eager';
      }
      
      if (!img.getAttribute('decoding')) {
        img.setAttribute('decoding', 'async');
      }
    });
  }

  function schedule(task, timeout) {
    idle(task, { timeout: timeout || 300 });
  }

  function runCoreOptimizers() {
    lazyImages();
    // video-optimizer.js загружается напрямую в index.html, не нужно загружать здесь
    schedule(() => {
      loadScript('js/image-optimizer.js');
      loadScript('js/skeleton-loader.js');
    }, 120);
  }

  // Snow effect removed (seasonal)

  let deferredStarted = false;

  function startDeferredExtras() {
    if (deferredStarted) return;
    deferredStarted = true;

    // Mobile helpers
    if (isMobile) {
    schedule(() => loadScript('js/mobile-enhancements.js?v=20260510-bots-cache-fix'), 220);
    schedule(() => loadScript('js/pull-to-refresh.js?v=20260506-mobile-hero-nav'), 260);
      schedule(() => loadScript('js/haptic-feedback.js'), 300);
    }

    // Glass UI widgets
    schedule(() => {
      const chatReady = window.RealVibeChat
        ? Promise.resolve()
        : loadScript('js/chat.js?v=20260511-security');

      chatReady
        .then(() => loadScript('chat-components/GlassUIWidget.js?v=20260511-security'))
        .then(() =>
          Promise.all([
            loadScript('js/glass-ui-hipych.js?v=20260511-security'),
            loadScript('js/glass-ui-bro-cat.js?v=20260511-security'),
            loadScript('js/glass-ui-valyusha.js?v=20260511-security'),
          ])
        )
        .catch((err) => {
          console.warn('[perf-loader] Glass UI skipped', err);
        });
    }, 240);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      runCoreOptimizers();
      schedule(() => startDeferredExtras(), 120);
    });
  } else {
    runCoreOptimizers();
    schedule(() => startDeferredExtras(), 120);
  }

  window.addEventListener('load', startDeferredExtras);
})();
