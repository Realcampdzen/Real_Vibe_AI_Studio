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
  const isDetailPage = document.body && document.body.classList.contains('detail-page');
  const shouldAutoStartChat = !isDetailPage;

  const loadedScripts = new Set();
  const loadedStyles = new Set();
  const assistantLaunchers = [
    {
      id: 'health',
      globalName: 'glassUIHealth',
      className: 'glass-ui-health-button',
      label: 'Открыть чат Wellness Bro',
      tooltip: 'Wellness Bro • ассистент по здоровью',
      avatar: 'images/wellness-bro-avatar-384.webp',
    },
    {
      id: 'broCat',
      globalName: 'glassUIBroCat',
      className: 'glass-ui-bro-cat-button',
      label: 'Открыть чат Кота Бро',
      tooltip: 'Кот Бро • мемный AI-гид',
      avatar: 'images/bro-avatar.jpg',
    },
    {
      id: 'valyusha',
      globalName: 'glassUIValyusha',
      className: 'glass-ui-valyusha-button',
      label: 'Открыть чат НейроВалюши',
      tooltip: 'НейроVалюша • вожатая Реального Лагеря',
      avatar: 'public/НейроВалюша_аватар.jpg',
    },
  ];
  let assistantBundlePromise = null;

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
        img.classList.contains('service-simple-bg-image') ||
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
      loadScript('js/image-optimizer.js?v=20260519-performance-pass');
      loadScript('js/skeleton-loader.js');
    }, 120);
  }

  // Snow effect removed (seasonal)

  let deferredStarted = false;
  let chatWakeBound = false;

  function createAssistantLaunchers() {
    if (!shouldAutoStartChat || document.querySelector('[data-rv-assistant-launcher]')) return;

    assistantLaunchers.forEach((config) => {
      const button = document.createElement('div');
      button.className = `glass-ui-floating-button ${config.className} rv-assistant-launcher`;
      button.dataset.rvAssistantLauncher = config.id;
      button.dataset.tooltip = config.tooltip;
      button.setAttribute('role', 'button');
      button.setAttribute('tabindex', '0');
      button.setAttribute('aria-label', config.label);

      const background = document.createElement('div');
      background.className = 'glass-ui-floating-button-bg';
      button.appendChild(background);

      const avatar = document.createElement('img');
      avatar.className = 'glass-ui-floating-avatar';
      avatar.src = config.avatar;
      avatar.alt = '';
      avatar.loading = 'lazy';
      avatar.decoding = 'async';
      button.appendChild(avatar);

      const badge = document.createElement('div');
      badge.className = 'glass-ui-notification-badge glass-online-badge';
      button.appendChild(badge);

      const open = () => loadAssistantBundle(config.id);
      button.addEventListener('click', open);
      button.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        open();
      });

      document.body.appendChild(button);
    });
  }

  function removeAssistantLaunchers() {
    document
      .querySelectorAll('[data-rv-assistant-launcher]')
      .forEach((element) => element.remove());
  }

  function loadAssistantBundle(openId) {
    removeAssistantLaunchers();
    if (!assistantBundlePromise) {
      const chatReady = window.RealVibeChat
        ? Promise.resolve()
        : loadScript('js/chat-client.js?v=20260512-productux');

      assistantBundlePromise = chatReady
        .then(() => loadScript('chat-components/GlassUIWidget.js?v=20260521-front-perf-scroll-socials'))
        .then(() =>
          Promise.all([
            loadScript('js/glass-ui-health.js?v=20260521-front-perf-scroll-socials'),
            loadScript('js/glass-ui-bro-cat.js?v=20260521-front-perf-scroll-socials'),
            loadScript('js/glass-ui-valyusha.js?v=20260521-front-perf-scroll-socials'),
          ])
        )
        .catch((err) => {
          assistantBundlePromise = null;
          createAssistantLaunchers();
          console.warn('[perf-loader] Glass UI skipped', err);
        });
    }

    return assistantBundlePromise.then(() => {
      const config = assistantLaunchers.find((item) => item.id === openId);
      const instance = config ? window[config.globalName] : null;
      instance?.showChat?.();
    });
  }

  function startDeferredExtras() {
    if (deferredStarted) return;
    deferredStarted = true;

    // Mobile helpers
    if (isMobile) {
      schedule(() => loadScript('js/mobile-enhancements.js?v=20260519-mobile-premium-recovery'), 220);
      schedule(() => loadScript('js/pull-to-refresh.js?v=20260512-productux'), 260);
      schedule(() => loadScript('js/haptic-feedback.js?v=20260519-mobile-premium-recovery'), 300);
    }

    createAssistantLaunchers();
  }

  function bindChatWakeEvents() {
    if (chatWakeBound || deferredStarted) return;
    chatWakeBound = true;

    const start = () => startDeferredExtras();
    const events = ['pointerdown', 'keydown', 'touchstart'];
    events.forEach((eventName) => {
      window.addEventListener(eventName, start, { once: true, passive: true });
    });
  }

  function scheduleDeferredStart(delayMs) {
    if (delayMs > 0) {
      setTimeout(() => schedule(() => startDeferredExtras(), 250), delayMs);
      return;
    }
    schedule(() => startDeferredExtras(), 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      runCoreOptimizers();
      bindChatWakeEvents();
      if (shouldAutoStartChat) {
        schedule(() => createAssistantLaunchers(), 900);
      }
    });
  } else {
    runCoreOptimizers();
    bindChatWakeEvents();
    if (shouldAutoStartChat) {
      schedule(() => createAssistantLaunchers(), 900);
    }
  }

  window.addEventListener('load', () => {
    bindChatWakeEvents();
    if (shouldAutoStartChat) {
      schedule(() => createAssistantLaunchers(), 900);
    }
  }, { once: true });
})();
