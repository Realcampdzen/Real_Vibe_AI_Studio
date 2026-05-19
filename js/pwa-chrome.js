(function initRealVibePwaChrome() {
  const root = document.documentElement;
  const displayModeQueries = [
    window.matchMedia('(display-mode: standalone)'),
    window.matchMedia('(display-mode: fullscreen)'),
    window.matchMedia('(display-mode: minimal-ui)'),
  ];

  const isIosStandalone = () => window.navigator.standalone === true;
  const isStandalone = () => isIosStandalone() || displayModeQueries.some((query) => query.matches);

  function syncDisplayModeClasses() {
    const standalone = isStandalone();
    root.classList.toggle('rv-standalone', standalone);
    root.classList.toggle('rv-ios-standalone', isIosStandalone());
    root.classList.toggle('rv-browser-tab', !standalone);
  }

  displayModeQueries.forEach((query) => {
    if (query.addEventListener) {
      query.addEventListener('change', syncDisplayModeClasses);
    } else if (query.addListener) {
      query.addListener(syncDisplayModeClasses);
    }
  });

  window.addEventListener('pageshow', syncDisplayModeClasses);
  document.addEventListener('visibilitychange', syncDisplayModeClasses);
  syncDisplayModeClasses();

  if (!('serviceWorker' in navigator) || window.location.protocol === 'file:') return;

  const registerServiceWorker = () => {
    navigator.serviceWorker.register('sw.js?v=20260520-pwa-standalone', { scope: './' })
      .then((registration) => {
        registration.update?.().catch(() => {});
      })
      .catch(() => {});
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', registerServiceWorker, { once: true });
  } else {
    registerServiceWorker();
  }
})();
