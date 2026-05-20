(function initRealVibePwaChrome() {
  const HOTFIX_VERSION = '20260520-desktop-header-icons';
  const SW_URL = `sw.js?v=${HOTFIX_VERSION}`;
  const CACHE_RESET_KEY = `rv-cache-reset-${HOTFIX_VERSION}`;
  const CONTROLLER_RELOAD_KEY = `rv-sw-controller-reload-${HOTFIX_VERSION}`;
  const LEGACY_RELOAD_KEY = `rv-sw-legacy-reload-${HOTFIX_VERSION}`;

  const root = document.documentElement;
  const displayModeQueries = [
    window.matchMedia('(display-mode: standalone)'),
    window.matchMedia('(display-mode: fullscreen)'),
    window.matchMedia('(display-mode: minimal-ui)'),
  ];
  const mobileQuery = window.matchMedia('(max-width: 900px)');
  let deferredInstallPrompt = null;
  let installWrap = null;
  let installButton = null;

  const isIosStandalone = () => window.navigator.standalone === true;
  const isStandalone = () => isIosStandalone() || displayModeQueries.some((query) => query.matches);
  const isMobileLike = () => mobileQuery.matches || (navigator.maxTouchPoints || 0) > 0;

  function safeStorageGet(storage, key) {
    try {
      return storage?.getItem(key) || '';
    } catch (error) {
      return '';
    }
  }

  function safeStorageSet(storage, key, value) {
    try {
      storage?.setItem(key, value);
    } catch (error) {
      // Storage can be blocked in private or embedded contexts.
    }
  }

  function syncDisplayModeClasses() {
    const standalone = isStandalone();
    root.classList.toggle('rv-standalone', standalone);
    root.classList.toggle('rv-ios-standalone', isIosStandalone());
    root.classList.toggle('rv-browser-tab', !standalone);
    syncInstallButton();
  }

  displayModeQueries.forEach((query) => {
    if (query.addEventListener) {
      query.addEventListener('change', syncDisplayModeClasses);
    } else if (query.addListener) {
      query.addListener(syncDisplayModeClasses);
    }
  });
  if (mobileQuery.addEventListener) {
    mobileQuery.addEventListener('change', syncDisplayModeClasses);
  } else if (mobileQuery.addListener) {
    mobileQuery.addListener(syncDisplayModeClasses);
  }

  window.addEventListener('pageshow', syncDisplayModeClasses);
  document.addEventListener('visibilitychange', syncDisplayModeClasses);
  syncDisplayModeClasses();

  function createInstallButton() {
    if (installWrap) return installWrap;

    const nav = document.getElementById('mobile-nav');
    const header = nav?.querySelector('.mobile-nav-header');
    if (!nav || !header) return null;

    installWrap = document.createElement('div');
    installWrap.className = 'rv-pwa-install';
    installWrap.hidden = true;

    installButton = document.createElement('button');
    installButton.className = 'rv-pwa-install-btn';
    installButton.type = 'button';
    installButton.setAttribute('aria-label', 'Установить приложение');
    installButton.innerHTML = [
      '<span class="rv-pwa-install-icon" aria-hidden="true"><i class="fas fa-mobile-screen-button"></i></span>',
      '<span class="rv-pwa-install-copy">',
      '<span class="rv-pwa-install-title">Установить приложение</span>',
      '<span class="rv-pwa-install-subtitle">Откроется без панели Chrome</span>',
      '</span>',
      '<span class="rv-pwa-install-arrow" aria-hidden="true">+</span>',
    ].join('');

    installButton.addEventListener('click', async () => {
      if (!deferredInstallPrompt) return;
      installButton.disabled = true;
      try {
        await deferredInstallPrompt.prompt();
        const choice = await deferredInstallPrompt.userChoice?.catch(() => null);
        if (choice?.outcome === 'accepted') {
          safeStorageSet(localStorage, 'rv-pwa-installed', '1');
        }
      } catch (error) {
        // Chrome can reject prompt() if it was already consumed.
      } finally {
        deferredInstallPrompt = null;
        installButton.disabled = false;
        syncInstallButton();
      }
    });

    installWrap.appendChild(installButton);
    const commerce = nav.querySelector('.rv-mobile-commerce');
    (commerce || header).insertAdjacentElement('afterend', installWrap);
    return installWrap;
  }

  function syncInstallButton() {
    const shouldShow = Boolean(deferredInstallPrompt) && !isStandalone() && isMobileLike();
    root.classList.toggle('rv-pwa-install-available', shouldShow);
    if (!installWrap && shouldShow) createInstallButton();
    if (!installWrap) return;
    installWrap.hidden = !shouldShow;
    installWrap.classList.toggle('is-visible', shouldShow);
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    createInstallButton();
    syncInstallButton();
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    safeStorageSet(localStorage, 'rv-pwa-installed', '1');
    syncInstallButton();
  });

  if (!('serviceWorker' in navigator) || window.location.protocol === 'file:') return;

  function clearOldCachesOnce() {
    if (!('caches' in window)) return Promise.resolve();
    if (safeStorageGet(localStorage, CACHE_RESET_KEY) === '1') return Promise.resolve();
    safeStorageSet(localStorage, CACHE_RESET_KEY, '1');

    return caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => cacheName.startsWith('ai-studio-'))
            .map((cacheName) => caches.delete(cacheName))
        );
      })
      .catch(() => {});
  }

  function requestSkipWaiting(worker) {
    if (!worker) return;
    try {
      worker.postMessage({ type: 'SKIP_WAITING' });
    } catch (error) {
      // Ignore unavailable worker channels.
    }
  }

  function wireControllerReload() {
    if (safeStorageGet(sessionStorage, CONTROLLER_RELOAD_KEY) === '1') return;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (safeStorageGet(sessionStorage, CONTROLLER_RELOAD_KEY) === '1') return;
      safeStorageSet(sessionStorage, CONTROLLER_RELOAD_KEY, '1');
      window.location.reload();
    }, { once: true });
  }

  function watchInstallingWorker(worker) {
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) {
        requestSkipWaiting(worker);
      }
    });
  }

  function reloadLegacyRegistrationOnce(registration) {
    const activeUrl = registration?.active?.scriptURL || '';
    if (!navigator.serviceWorker.controller || !activeUrl || activeUrl.includes(HOTFIX_VERSION)) {
      return Promise.resolve();
    }
    if (safeStorageGet(sessionStorage, LEGACY_RELOAD_KEY) === '1') {
      return Promise.resolve();
    }

    safeStorageSet(sessionStorage, LEGACY_RELOAD_KEY, '1');
    return registration.unregister()
      .then(() => navigator.serviceWorker.register(SW_URL, { scope: './' }))
      .then(() => {
        window.location.reload();
      })
      .catch(() => {});
  }

  const registerServiceWorker = () => {
    const hadController = Boolean(navigator.serviceWorker.controller);
    if (hadController) wireControllerReload();

    navigator.serviceWorker.register(SW_URL, { scope: './' })
      .then((registration) => {
        watchInstallingWorker(registration.installing);
        registration.addEventListener('updatefound', () => {
          watchInstallingWorker(registration.installing);
        });
        if (registration.waiting && hadController) {
          requestSkipWaiting(registration.waiting);
        }
        return clearOldCachesOnce()
          .then(() => registration.update?.())
          .then(() => {
            if (registration.waiting && hadController) {
              requestSkipWaiting(registration.waiting);
            }
            window.setTimeout(() => {
              navigator.serviceWorker.getRegistration('./')
                .then((currentRegistration) => reloadLegacyRegistrationOnce(currentRegistration))
                .catch(() => {});
            }, 1800);
          });
      })
      .catch(() => {});
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerServiceWorker, { once: true });
  } else {
    registerServiceWorker();
  }
})();
