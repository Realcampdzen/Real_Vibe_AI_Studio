// Lightweight common runtime for detail/static pages.
(function initRealVibeCommon() {
  window.__AI_API_BASE__ = (window.__AI_API_BASE__ || '').replace(/\/$/, '');

  const CONTACTS = {
    phone: { href: 'tel:+79319671483', display: '+7 931 967 14 83' },
    email: { href: 'mailto:polstan1986@gmail.com', display: 'polstan1986@gmail.com' },
    telegram: { href: 'https://t.me/Stivanovv', handle: '@Stivanovv' },
    whatsapp: { href: 'https://wa.me/79319671483' },
    vk: { href: 'https://vk.com' },
    youtube: { href: 'https://youtube.com' },
    tiktok: { href: 'https://www.tiktok.com' },
    primary: { href: 'tel:+79319671483' },
  };

  const ANALYTICS_ENDPOINT = '/api/analytics/event';
  const ANALYTICS_TYPES = new Set([
    'page_view',
    'service_card_click',
    'cta_click',
    'chat_open',
    'chat_send_result',
  ]);

  function trackEvent(type, details = {}) {
    if (!ANALYTICS_TYPES.has(type)) return;

    const payload = {
      type,
      page: window.location.pathname,
      serviceId: details.serviceId,
      target: details.target,
      botId: details.botId,
      status: details.status,
    };

    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(ANALYTICS_ENDPOINT, blob)) return;
    }

    fetch(ANALYTICS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => {});
  }

  function applyContactConfig() {
    const textMap = {
      phone: CONTACTS.phone.display,
      email: CONTACTS.email.display,
      telegram: CONTACTS.telegram.handle,
      telegramHandle: CONTACTS.telegram.handle,
    };

    document.querySelectorAll('[data-contact-link]').forEach((element) => {
      const key = element.getAttribute('data-contact-link');
      const config = CONTACTS[key];
      if (!config?.href) return;
      if (element.closest('.service-simple-card') && element.tagName.toLowerCase() !== 'a') return;

      if (element.tagName.toLowerCase() === 'a') {
        element.setAttribute('href', config.href);
      } else {
        element.setAttribute('data-contact-href', config.href);
        element.addEventListener('click', () => {
          window.location.href = config.href;
        });
      }
    });

    document.querySelectorAll('[data-contact-text]').forEach((element) => {
      const key = element.getAttribute('data-contact-text');
      if (textMap[key]) element.textContent = textMap[key];
    });
  }

  function scrollToSection(sectionId) {
    const element = document.getElementById(sectionId);
    if (!element) return;

    if (window.scrollManager) {
      window.scrollManager.scrollToElement(element, { block: 'start' });
      return;
    }

    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function initServiceCardNavigation() {
    if (window.__serviceCardNavigationInitialized) return;
    window.__serviceCardNavigationInitialized = true;

    const resolveCardHref = (card) => {
      const explicitHref = card.getAttribute('data-detail-href');
      if (explicitHref) return explicitHref;
      if (card.dataset.serviceId !== undefined) {
        return `service-detail.html?id=${encodeURIComponent(card.dataset.serviceId)}`;
      }
      return '';
    };

    const prepareServiceCard = (card) => {
      const href = resolveCardHref(card);
      if (!href) return;

      card.setAttribute('role', 'link');
      card.setAttribute('tabindex', '0');
      card.setAttribute('data-card-href', href);

      const label = card.querySelector('.service-simple-footer')?.textContent?.trim();
      if (label && !card.getAttribute('aria-label')) {
        card.setAttribute('aria-label', `Подробнее: ${label}`);
      }
    };

    document.querySelectorAll('.service-simple-card[data-service-id], .service-simple-card[data-detail-href]')
      .forEach(prepareServiceCard);

    document.addEventListener('click', (event) => {
      const card = event.target.closest('.service-simple-card[data-service-id], .service-simple-card[data-detail-href]');
      if (!card) return;
      if (
        event.target.closest('a') ||
        event.target.closest('button')
      ) {
        return;
      }

      const href = card.getAttribute('data-card-href') || resolveCardHref(card);
      if (!href) return;

      trackEvent('service_card_click', {
        serviceId: card.dataset.serviceId,
        target: href,
      });
      window.location.href = href;
    });

    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const card = event.target.closest?.('.service-simple-card[data-service-id], .service-simple-card[data-detail-href]');
      if (!card || event.target !== card) return;

      const href = card.getAttribute('data-card-href') || resolveCardHref(card);
      if (!href) return;

      event.preventDefault();
      trackEvent('service_card_click', {
        serviceId: card.dataset.serviceId,
        target: href,
      });
      window.location.href = href;
    });
  }

  function initDataActionButtons() {
    document.addEventListener('click', (event) => {
      const action = event.target.closest('[data-scroll-target], [data-location-href], [data-stop-propagation]');
      if (!action) return;

      if (action.hasAttribute('data-stop-propagation')) {
        event.stopPropagation();
      }

      const scrollTarget = action.getAttribute('data-scroll-target');
      if (scrollTarget) {
        event.preventDefault();
        scrollToSection(scrollTarget);
        return;
      }

      const locationHref = action.getAttribute('data-location-href');
      if (locationHref) {
        event.preventDefault();
        window.location.href = locationHref;
      }
    });
  }

  function initCookieBanner() {
    const banner = document.getElementById('cookie-banner');
    const acceptBtn = document.getElementById('cookie-accept');
    const storageKey = 'rv-cookie-consent';
    if (!banner || !acceptBtn) return;

    function readConsent() {
      try {
        return localStorage.getItem(storageKey) === 'true';
      } catch {
        return false;
      }
    }

    function hideBanner() {
      banner.classList.remove('visible');
      banner.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('rv-cookie-banner-visible');
    }

    banner.setAttribute('aria-hidden', 'true');
    if (!readConsent()) {
      banner.classList.add('visible');
      banner.setAttribute('aria-hidden', 'false');
      document.body.classList.add('rv-cookie-banner-visible');
    }

    acceptBtn.addEventListener('click', () => {
      try {
        localStorage.setItem(storageKey, 'true');
      } catch {}
      hideBanner();
    });
  }

  function initPreloader() {
    const preloader = document.getElementById('preloader');
    const progressBar = document.querySelector('.loading-progress');
    if (!preloader) return;

    if (progressBar) progressBar.style.width = '100%';
    window.addEventListener('load', () => {
      preloader.classList.add('hidden');
      setTimeout(() => preloader.remove(), 500);
    }, { once: true });

    setTimeout(() => {
      preloader.classList.add('hidden');
      setTimeout(() => preloader.remove(), 500);
    }, 1600);
  }

  function initMobileMenu() {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileNav = document.getElementById('mobile-nav');
    const mobileNavClose = document.querySelector('.mobile-nav-close');
    if (!mobileMenuBtn || !mobileNav) return;

    let scrollYBeforeOpen = 0;
    let lastFocusedElement = null;
    let transitionTimer = 0;
    let isTransitioning = false;
    const suppressedWidgetsSelector = '.glass-ui-floating-button, .glass-ui-health-button, .glass-ui-hipych-button, .glass-ui-bro-cat-button, .glass-ui-valyusha-button, .glass-ui-widget';
    const transitionMs = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 360;

    const suppressWidgets = (shouldSuppress) => {
      document.querySelectorAll(suppressedWidgetsSelector).forEach((widget) => {
        widget.classList.toggle('is-suppressed', shouldSuppress);
      });
    };

    const markTransitioning = () => {
      window.clearTimeout(transitionTimer);
      isTransitioning = transitionMs > 0;
      if (transitionMs > 0) {
        transitionTimer = window.setTimeout(() => {
          isTransitioning = false;
        }, transitionMs);
      }
    };

    const setButtonState = (isOpen) => {
      mobileMenuBtn.classList.toggle('active', isOpen);
      mobileMenuBtn.setAttribute('aria-expanded', String(isOpen));
      mobileMenuBtn.setAttribute('aria-label', isOpen ? 'Закрыть меню' : 'Открыть меню');
    };

    const lockScroll = () => {
      scrollYBeforeOpen = window.scrollY || document.documentElement.scrollTop || 0;
      document.body.style.setProperty('--rv-mobile-nav-scroll-top', `-${scrollYBeforeOpen}px`);
      document.documentElement.classList.add('mobile-nav-open');
      document.body.classList.add('mobile-nav-open', 'no-scroll');
    };

    const unlockScroll = () => {
      document.documentElement.classList.remove('mobile-nav-open');
      document.body.classList.remove('mobile-nav-open', 'no-scroll');
      document.body.style.removeProperty('--rv-mobile-nav-scroll-top');
      window.scrollTo(0, scrollYBeforeOpen);
    };

    const openMenu = () => {
      if (mobileNav.classList.contains('active') || isTransitioning) return;
      lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      mobileNav.classList.remove('rv-force-hidden');
      setButtonState(true);
      mobileNav.classList.add('active');
      mobileNav.setAttribute('aria-hidden', 'false');
      lockScroll();
      suppressWidgets(true);
      markTransitioning();
      requestAnimationFrame(() => {
        mobileNavClose?.focus({ preventScroll: true });
      });
    };

    const closeMenu = (options = {}) => {
      const { immediate = false, restoreFocus = true, restoreScroll = true } = options;
      if (!mobileNav.classList.contains('active')) return;
      window.clearTimeout(transitionTimer);
      isTransitioning = false;
      setButtonState(false);
      mobileNav.classList.remove('active');
      mobileNav.classList.toggle('rv-force-hidden', immediate);
      mobileNav.setAttribute('aria-hidden', 'true');
      if (restoreScroll) unlockScroll();
      suppressWidgets(false);
      if (restoreFocus && lastFocusedElement?.isConnected) {
        lastFocusedElement.focus({ preventScroll: true });
      }
      if (immediate) {
        window.setTimeout(() => mobileNav.classList.remove('rv-force-hidden'), 120);
      } else {
        markTransitioning();
      }
    };

    setButtonState(false);
    mobileNav.setAttribute('aria-hidden', 'true');
    window.RealVibeMobileNav = {
      open: openMenu,
      close: closeMenu,
      toggle: () => {
        if (mobileNav.classList.contains('active')) {
          closeMenu();
        } else if (!isTransitioning) {
          openMenu();
        }
      },
      isOpen: () => mobileNav.classList.contains('active'),
    };

    mobileMenuBtn.addEventListener('click', () => {
      window.RealVibeMobileNav.toggle();
    });
    mobileNavClose?.addEventListener('click', closeMenu);

    document.querySelectorAll('.mobile-nav-link').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && mobileNav.classList.contains('active')) closeMenu();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 900 && mobileNav.classList.contains('active')) {
        closeMenu({ immediate: true, restoreFocus: false });
      }
    });
  }

  function updateScrollProgress() {
    const scrollProgress = document.getElementById('scroll-progress');
    if (!scrollProgress) return;
    const percent = window.scrollManager ? window.scrollManager.getScrollPercent() : 0;
    scrollProgress.style.width = `${percent}%`;
  }

  function initBackToTop() {
    const backToTopBtn = document.getElementById('back-to-top');
    if (!backToTopBtn) return;

    const updateButton = (scrollY) => {
      backToTopBtn.classList.toggle('visible', scrollY > 300);
    };

    if (window.scrollManager) {
      window.scrollManager.subscribe(updateButton);
    } else {
      window.addEventListener('scroll', () => updateButton(window.pageYOffset), { passive: true });
    }

    backToTopBtn.addEventListener('click', () => {
      if (window.scrollManager) {
        window.scrollManager.scrollToPosition(0);
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  }

  function initNavigation() {
    const navbar = document.querySelector('.navbar');
    const update = (scrollY) => {
      updateScrollProgress();
      navbar?.classList.toggle('navbar-solid', scrollY > 50);
    };

    if (window.scrollManager) {
      window.scrollManager.subscribe(update);
    } else {
      window.addEventListener('scroll', () => update(window.scrollY), { passive: true });
    }

    document.querySelectorAll('.nav-link, .mobile-nav-link').forEach((link) => {
      link.addEventListener('click', (event) => {
        const href = link.getAttribute('href') || '';
        if (!href.startsWith('#')) return;
        event.preventDefault();
        scrollToSection(href.slice(1));
      });
    });
  }

  function initRipple() {
    document.querySelectorAll('button, .btn-primary, .btn-secondary, .service-detail-cta-btn').forEach((button) => {
      button.addEventListener('click', function onRippleClick(event) {
        const ripple = document.createElement('span');
        const rect = this.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = `${size}px`;
        ripple.style.height = `${size}px`;
        ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
        ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
        ripple.classList.add('ripple');
        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
      });
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyContactConfig();
    initServiceCardNavigation();
    initDataActionButtons();
    initCookieBanner();
    initPreloader();
    initMobileMenu();
    initBackToTop();
    initNavigation();
    initRipple();
    trackEvent('page_view');

    document.addEventListener('click', (event) => {
      const link = event.target.closest('[data-contact-link]');
      if (!link) return;
      if (link.closest('.service-simple-card') && link.tagName.toLowerCase() !== 'a') return;
      trackEvent('cta_click', {
        target: link.getAttribute('data-contact-link') || link.getAttribute('href') || '',
      });
    });
  });

  window.RealVibeCommon = {
    applyContactConfig,
    scrollToSection,
    trackEvent,
  };

  window.RealVibeAnalytics = {
    track: trackEvent,
  };
})();
