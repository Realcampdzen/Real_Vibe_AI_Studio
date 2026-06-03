// AI Studio - Enhanced Interactive Features

// Build marker (helps debug cache/service worker issues)
window.__AI_STUDIO_BUILD = '20260523-shop-cart-icon';

// API base. Empty value means same-origin, which is the production VPS default.
// Override before this script if needed: window.__AI_API_BASE__ = 'http://localhost:3000'
window.__AI_API_BASE__ = (window.__AI_API_BASE__ || '').replace(/\/$/, '');

const CONTACTS = {
    phone: { href: 'tel:+79319671483', display: '+7 931 967 14 83' },
    email: { href: 'mailto:polstan1986@gmail.com', display: 'polstan1986@gmail.com' },
    telegram: { href: 'https://t.me/Stivanovv', handle: '@Stivanovv' },
    telegramCommunity: { href: 'https://t.me/RealVibeAI', display: 'Telegram-сообщество' },
    whatsapp: { href: 'https://wa.me/79319671483' },
    vk: { href: 'https://vk.com/club238913969', display: 'VK' },
    primary: { href: 'tel:+79319671483' }
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
    if (!['http:', 'https:'].includes(window.location.protocol)) return;
    if (['localhost', '127.0.0.1', '0.0.0.0'].includes(window.location.hostname)) return;

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
        try {
            const blob = new Blob([body], { type: 'application/json' });
            if (navigator.sendBeacon(ANALYTICS_ENDPOINT, blob)) return;
        } catch {
            // Ignore analytics transport failures; UI initialization must continue.
        }
    }

    try {
        fetch(ANALYTICS_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            keepalive: true,
        }).catch(() => {});
    } catch {
        // Ignore analytics transport failures; UI initialization must continue.
    }
}

window.RealVibeAnalytics = {
    track: trackEvent,
};

function applyContactConfig() {
    const linkMap = {
        primary: CONTACTS.primary,
        telegram: CONTACTS.telegram,
        telegramCommunity: CONTACTS.telegramCommunity,
        whatsapp: CONTACTS.whatsapp,
        phone: CONTACTS.phone,
        email: CONTACTS.email,
        vk: CONTACTS.vk
    };

    document.querySelectorAll('[data-contact-link]').forEach((element) => {
        const key = element.getAttribute('data-contact-link');
        const config = linkMap[key];
        if (!config || !config.href) return;
        if (element.closest('.service-simple-card') && element.tagName.toLowerCase() !== 'a') return;

        const tag = element.tagName.toLowerCase();
        if (tag === 'a') {
            element.setAttribute('href', config.href);
        } else {
            element.addEventListener('click', () => {
                window.location.href = config.href;
            });
            element.setAttribute('data-contact-href', config.href);
        }
    });

    const textMap = {
        phone: CONTACTS.phone.display,
        email: CONTACTS.email.display,
        telegram: CONTACTS.telegram.handle || CONTACTS.telegram.display,
        telegramHandle: CONTACTS.telegram.handle || CONTACTS.telegram.display,
        telegramCommunity: CONTACTS.telegramCommunity.display,
        vk: CONTACTS.vk.display
    };

    document.querySelectorAll('[data-contact-text]').forEach((element) => {
        const key = element.getAttribute('data-contact-text');
        const textValue = textMap[key];
        if (textValue) {
            element.textContent = textValue;
        }
    });
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

    document.querySelectorAll('.service-simple-card[data-service-id], .service-simple-card[data-detail-href]').forEach((card) => {
        const href = resolveCardHref(card);
        if (!href) return;
        card.setAttribute('role', 'link');
        card.setAttribute('tabindex', '0');
        card.setAttribute('data-card-href', href);

        const label = card.querySelector('.service-simple-footer')?.textContent?.trim();
        if (label && !card.getAttribute('aria-label')) {
            card.setAttribute('aria-label', `Подробнее: ${label}`);
        }
    });

    window.handleServiceCardClick = function handleServiceCardClick(event, cardOrServiceId) {
        if (
            event.target.closest('a') ||
            event.target.closest('button')
        ) {
            return;
        }

        const card = typeof cardOrServiceId === 'object'
            ? cardOrServiceId
            : event.target.closest('.service-simple-card');
        const href = card?.getAttribute?.('data-card-href') || (card ? resolveCardHref(card) : `service-detail.html?id=${encodeURIComponent(cardOrServiceId)}`);
        if (!href) return;

        trackEvent('service_card_click', {
            serviceId: card?.dataset?.serviceId,
            target: href,
        });
        window.location.href = href;
    };

    document.addEventListener('click', (event) => {
        const card = event.target.closest('.service-simple-card[data-service-id], .service-simple-card[data-detail-href]');
        if (!card) return;
        window.handleServiceCardClick(event, card);
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        const card = event.target.closest?.('.service-simple-card[data-service-id], .service-simple-card[data-detail-href]');
        if (!card || event.target !== card) return;

        event.preventDefault();
        trackEvent('service_card_click', {
            serviceId: card.dataset.serviceId,
            target: card.getAttribute('data-card-href') || resolveCardHref(card),
        });
        window.location.href = card.getAttribute('data-card-href') || resolveCardHref(card);
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

    const hideBanner = () => {
        banner.classList.remove('visible');
        banner.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('rv-cookie-banner-visible');
    };

    const showBanner = () => {
        banner.classList.add('visible');
        banner.setAttribute('aria-hidden', 'false');
        document.body.classList.add('rv-cookie-banner-visible');
    };

    const persistConsent = () => {
        try {
            localStorage.setItem(storageKey, 'true');
        } catch (error) {
            console.warn('Не удалось сохранить согласие с cookie:', error);
        }
    };

    const shouldShow = () => {
        try {
            return localStorage.getItem(storageKey) !== 'true';
        } catch (error) {
            console.warn('Не удалось прочитать флаг cookie согласия:', error);
            return true;
        }
    };

    banner.setAttribute('aria-hidden', 'true');

    if (shouldShow()) {
        showBanner();
    }

    acceptBtn.addEventListener('click', () => {
        persistConsent();
        hideBanner();
    });
}

// toggleSection removed — no matching HTML elements exist
  
// Smooth scrolling for navigation links
function scrollToSection(sectionId) {
  const element = document.getElementById(sectionId);
  if (element) {
    window.RealVibeHaptics?.markProgrammaticScroll?.(900);
    if (window.scrollManager) {
      window.scrollManager.scrollToElement(element, { block: 'start' });
    } else {
      const header = document.querySelector('.navbar, .site-header');
      const headerHeight = header ? Math.ceil(header.getBoundingClientRect().height) : 0;
      const extraGap = window.innerWidth <= 900 ? 12 : 18;
      const targetTop = element.getBoundingClientRect().top + window.scrollY - headerHeight - extraGap;
      window.scrollTo({
        top: Math.max(0, targetTop),
        behavior: 'smooth',
      });
    }
  }
}

// Animated Counter
function animateCounter(element, target, duration = 2000) {
  const start = 0;
  const increment = target / (duration / 16);
  let current = start;
  
  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      current = target;
      clearInterval(timer);
    }
    element.textContent = Math.floor(current);
  }, 16);
}

// Testimonials Slider
function initTestimonialsSlider() {
  const cards = document.querySelectorAll('.testimonial-card');
  const buttons = document.querySelectorAll('.testimonial-btn');
  let currentSlide = 0;
  
  function showSlide(index) {
    cards.forEach((card, i) => {
      card.classList.toggle('active', i === index);
    });
    
    buttons.forEach((btn, i) => {
      btn.classList.toggle('active', i === index);
    });
  }
  
  function nextSlide() {
    currentSlide = (currentSlide + 1) % cards.length;
    showSlide(currentSlide);
  }
  
  // Button click handlers
  buttons.forEach((btn, index) => {
    btn.addEventListener('click', () => {
      currentSlide = index;
      showSlide(currentSlide);
    });
  });
  
  // Auto-rotate testimonials
  setInterval(nextSlide, 5000);
}

// Mobile Menu Toggle
function initMobileMenu() {
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const mobileNav = document.getElementById('mobile-nav');
  const mobileNavClose = document.querySelector('.mobile-nav-close');
  
  if (!mobileMenuBtn || !mobileNav) return;

  let scrollYBeforeOpen = 0;
  let lastFocusedElement = null;
  let transitionTimer = 0;
  let closeCleanupTimer = 0;
  let isTransitioning = false;
  const suppressedWidgetsSelector = '.glass-ui-floating-button, .glass-ui-health-button, .glass-ui-hipych-button, .glass-ui-bro-cat-button, .glass-ui-valyusha-button, .glass-ui-widget';
  const transitionMs = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 360;
  const shouldAutoFocusClose = !('ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0);

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
    document.body.classList.add('no-scroll');
    document.documentElement.classList.add('mobile-nav-open');
    document.body.classList.add('mobile-nav-open');
  };

  const unlockScroll = ({ restoreScroll = true } = {}) => {
    document.body.classList.remove('no-scroll');
    document.documentElement.classList.remove('mobile-nav-open');
    document.body.classList.remove('mobile-nav-open');
    document.body.style.removeProperty('--rv-mobile-nav-scroll-top');
    if (restoreScroll) {
      window.scrollTo(0, scrollYBeforeOpen);
    }
  };

  const normalizeNavPath = (path) => {
    const normalized = path.replace(/\/index\.html$/i, '/');
    return normalized || '/';
  };

  const getSamePageTarget = (link) => {
    const rawHref = link.getAttribute('href') || '';
    if (!rawHref) return null;

    let url;
    try {
      url = new URL(rawHref, window.location.href);
    } catch {
      return null;
    }

    const currentPath = normalizeNavPath(window.location.pathname);
    const targetPath = normalizeNavPath(url.pathname);
    if (url.origin !== window.location.origin || targetPath !== currentPath || !url.hash) {
      return null;
    }

    const targetId = decodeURIComponent(url.hash.slice(1));
    if (!targetId || !document.getElementById(targetId)) return null;

    return {
      hash: url.hash,
      targetId,
    };
  };
  
  const openMenu = () => {
    if (mobileNav.classList.contains('active') || isTransitioning) return;
    window.clearTimeout(closeCleanupTimer);
    lastFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    mobileNav.classList.remove('rv-force-hidden');
    setButtonState(true);
    mobileNav.classList.add('active');
    mobileNav.setAttribute('aria-hidden', 'false');
    lockScroll();
    suppressWidgets(true);
    markTransitioning();
    if (shouldAutoFocusClose) {
      requestAnimationFrame(() => {
        mobileNavClose?.focus({ preventScroll: true });
      });
    }
  };

  const closeMenu = (options = {}) => {
    const {
      immediate = false,
      restoreFocus = true,
      restoreScroll = true,
      onClosed = null,
    } = options;

    if (!mobileNav.classList.contains('active')) {
      if (typeof onClosed === 'function') onClosed();
      return;
    }

    window.clearTimeout(transitionTimer);
    window.clearTimeout(closeCleanupTimer);
    isTransitioning = false;
    setButtonState(false);
    mobileNav.classList.remove('active');
    mobileNav.classList.toggle('rv-force-hidden', immediate);
    mobileNav.setAttribute('aria-hidden', 'true');
    const finishClose = () => {
      unlockScroll({ restoreScroll });
      suppressWidgets(false);
      if (restoreFocus && lastFocusedElement?.isConnected) {
        lastFocusedElement.focus({ preventScroll: true });
      }
      if (typeof onClosed === 'function') onClosed();
    };
    if (immediate) {
      finishClose();
      window.setTimeout(() => mobileNav.classList.remove('rv-force-hidden'), 120);
    } else {
      closeCleanupTimer = window.setTimeout(finishClose, transitionMs);
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
  
  if (mobileNavClose) {
    mobileNavClose.addEventListener('click', closeMenu);
  }

  // Mobile section links need to close the modal before scrolling.
  document.querySelectorAll('.mobile-nav-link').forEach(link => {
    link.addEventListener('click', (event) => {
      const samePageTarget = getSamePageTarget(link);
      if (!samePageTarget) return;

      event.preventDefault();
      closeMenu({
        restoreFocus: false,
        restoreScroll: false,
        onClosed: () => {
          window.history.pushState(null, '', `${window.location.pathname}${window.location.search}${samePageTarget.hash}`);
          requestAnimationFrame(() => {
            scrollToSection(samePageTarget.targetId);
          });
        },
      });
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && mobileNav.classList.contains('active')) {
      closeMenu();
    }
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 900 && mobileNav.classList.contains('active')) {
      closeMenu({ immediate: true, restoreFocus: false });
    }
  });
}

// Scroll Progress Bar
function updateScrollProgress() {
  const scrollProgress = document.getElementById('scroll-progress');
  if (!scrollProgress) return;
  
  const scrollPercent = window.scrollManager ? window.scrollManager.getScrollPercent() : 0;
  scrollProgress.style.width = scrollPercent + '%';
}

// Back to Top Button
function initBackToTop() {
  const backToTopButtons = Array.from(document.querySelectorAll('#back-to-top, .back-to-top'));
  const backToTopBtn = document.getElementById('back-to-top') || backToTopButtons[0];
  if (!backToTopBtn) return;

  backToTopButtons.forEach((button) => {
    if (button === backToTopBtn) return;
    button.remove();
  });

  backToTopBtn.id = 'back-to-top';
  backToTopBtn.classList.add('back-to-top');
  backToTopBtn.setAttribute('aria-label', backToTopBtn.getAttribute('aria-label') || 'Наверх');
  backToTopBtn.setAttribute('type', backToTopBtn.getAttribute('type') || 'button');
  
  // Используем ScrollManager для оптимизации
  if (window.scrollManager) {
    window.scrollManager.subscribe((scrollY) => {
      if (scrollY > 300) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    });
  } else {
    // Fallback для старых браузеров
    window.addEventListener('scroll', () => {
      if (window.pageYOffset > 300) {
        backToTopBtn.classList.add('visible');
      } else {
        backToTopBtn.classList.remove('visible');
      }
    }, { passive: true });
  }
  
  backToTopBtn.addEventListener('click', () => {
    if (window.scrollManager) {
      window.scrollManager.scrollToPosition(0);
    } else {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  });
}

function initMobileFloatingChromePolicy() {
  if (window.__rvMobileFloatingChromePolicyInitialized) return;
  window.__rvMobileFloatingChromePolicyInitialized = true;

  const mobileQuery = window.matchMedia('(max-width: 900px)');
  const clearFloatingDockSuppression = () => {
    document.body.classList.remove('rv-mobile-scroll-chrome-hidden', 'rv-mobile-dense-zone');
  };

  clearFloatingDockSuppression();
  window.addEventListener('pageshow', clearFloatingDockSuppression);
  window.addEventListener('resize', clearFloatingDockSuppression, { passive: true });
  mobileQuery.addEventListener?.('change', clearFloatingDockSuppression);
}

function initCodexOfficeCaseChromePolicy() {
  if (window.__rvCodexOfficeCaseChromePolicyInitialized) return;
  window.__rvCodexOfficeCaseChromePolicyInitialized = true;

  const section = document.getElementById('codex-office-case');
  const widgetsSelector = '.glass-ui-floating-button, .glass-ui-health-button, .glass-ui-hipych-button, .glass-ui-bro-cat-button, .glass-ui-valyusha-button, .glass-ui-widget, .back-to-top';
  if (!section) return;

  const setSuppressed = (shouldSuppress) => {
    document.body.classList.toggle('rv-codex-office-case-active', shouldSuppress);
    document.querySelectorAll(widgetsSelector).forEach((widget) => {
      widget.classList.toggle('is-suppressed', shouldSuppress);
    });
  };

  if (!('IntersectionObserver' in window)) {
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    const shouldSuppress = entries.some((entry) => entry.isIntersecting && entry.intersectionRatio > 0.18);
    setSuppressed(shouldSuppress);
  }, {
    rootMargin: '-12% 0px -18% 0px',
    threshold: [0, 0.18, 0.45],
  });

  observer.observe(section);
}

// Tilt Effect for Cards
function initTiltEffect() {
  const tiltElements = document.querySelectorAll('[data-tilt]');
  
  tiltElements.forEach(element => {
    element.addEventListener('mouseenter', () => {
      element.style.transition = 'transform 0.1s ease';
    });
    
    element.addEventListener('mousemove', (e) => {
      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      
      const rotateX = (y - centerY) / 10;
      const rotateY = (centerX - x) / 10;
      
      element.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.05, 1.05, 1.05)`;
    });
    
    element.addEventListener('mouseleave', () => {
      element.style.transition = 'transform 0.3s ease';
      element.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    });
  });
}

// Preloader с реальным отслеживанием загрузки
function initPreloader() {
  const preloader = document.getElementById('preloader');
  const progressBar = document.querySelector('.loading-progress');
  const progressContainer = document.querySelector('.loading-bar');
  const statusText = document.querySelector('.preloader-hint');
  const criticalLogos = document.querySelectorAll('.nav-logo .logo-image');
  
  if (!preloader) {
    return;
  }

  criticalLogos.forEach((logo) => {
    logo.setAttribute('loading', 'eager');
    logo.setAttribute('decoding', 'async');
    logo.setAttribute('fetchpriority', 'high');
  });

  if (progressContainer) {
    progressContainer.setAttribute('role', 'progressbar');
    progressContainer.setAttribute('aria-valuemin', '0');
    progressContainer.setAttribute('aria-valuemax', '100');
    progressContainer.setAttribute('aria-valuenow', '0');
    progressContainer.setAttribute('aria-label', 'Загрузка страницы');
  }
  if (statusText && !statusText.textContent.trim()) {
    statusText.textContent = 'Подгружаем медиа...';
  }
  
  let isComplete = false;
  let currentProgress = 0;
  const startTime = Date.now();
  const minDisplayTime = 800; // Минимум 0.8 секунды
  
  // Функция обновления прогресс-бара (только увеличивает, не уменьшает)
  function updateProgress(progress) {
    if (progressBar) {
      // Прогресс только увеличивается, не уменьшается
      currentProgress = Math.max(currentProgress, Math.min(progress, 100));
      progressBar.style.width = currentProgress + '%';
    }
    if (progressContainer) {
      progressContainer.setAttribute('aria-valuenow', String(Math.round(currentProgress)));
    }
    if (statusText) {
      if (currentProgress < 30) {
        statusText.textContent = 'Подгружаем медиа...';
      } else if (currentProgress < 60) {
        statusText.textContent = 'Настраиваем интерфейс...';
      } else if (currentProgress < 90) {
        statusText.textContent = 'Оптимизируем анимации...';
      } else {
        statusText.textContent = 'Почти готово!';
      }
    }
  }
  
  // Функция скрытия прелоадера
  function hidePreloaderNow() {
    if (isComplete || !preloader) return;
    isComplete = true;
    
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, minDisplayTime - elapsed);
    
    updateProgress(100);
    
    setTimeout(() => {
      if (preloader) {
        preloader.classList.add('hidden');
        setTimeout(() => {
          if (preloader && preloader.parentNode) {
            preloader.remove();
          }
        }, 500);
      }
    }, remaining);
  }
  
  // Принудительный таймаут - максимум 3 секунды
  const forceHideTimeout = setTimeout(() => {
    hidePreloaderNow();
  }, 3000);
  
  // Начальный прогресс
  updateProgress(10);
  
  // Отслеживание загрузки изображений (исключаем видео)
  try {
    const images = document.querySelectorAll('img');
    let loadedImages = 0;
    let totalImages = 0;
    
    // Подсчитываем только изображения, которые не внутри video
    images.forEach(img => {
      if (!img.closest('video')) {
        totalImages++;
      }
    });
    
    if (totalImages > 0) {
      images.forEach(img => {
        // Пропускаем изображения внутри video
        if (img.closest('video')) {
          return;
        }
        
        if (img.complete && img.naturalHeight !== 0) {
          loadedImages++;
        } else {
          const onLoad = () => {
            loadedImages++;
            // Прогресс от 10% до 60% за изображения
            const imageProgress = 10 + (loadedImages / totalImages) * 50;
            updateProgress(imageProgress);
          };
          img.addEventListener('load', onLoad, { once: true });
          img.addEventListener('error', onLoad, { once: true });
        }
      });
      
      // Устанавливаем начальный прогресс для уже загруженных изображений
      if (loadedImages > 0) {
        const imageProgress = 10 + (loadedImages / totalImages) * 50;
        updateProgress(imageProgress);
      }
    } else {
      // Если нет изображений, сразу переходим к следующему этапу
      updateProgress(30);
    }
  } catch (e) {
    // Игнорируем ошибки, но устанавливаем минимальный прогресс
    updateProgress(30);
  }
  
  // Отслеживание загрузки шрифтов (после изображений, 60-75%)
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(() => {
      updateProgress(75);
    }).catch(() => {
      updateProgress(75);
    });
  } else {
    // Если шрифты не поддерживаются, устанавливаем прогресс с небольшой задержкой
    setTimeout(() => {
      if (!isComplete) {
        updateProgress(75);
      }
    }, 200);
  }
  
  // Проверка готовности страницы
  function checkComplete() {
    clearTimeout(forceHideTimeout);
    updateProgress(90);
    hidePreloaderNow();
  }
  
  // Множественные проверки для надежности
  if (document.readyState === 'complete') {
    // Если страница уже загружена, даем время показать прогресс
    updateProgress(85);
    setTimeout(() => {
      checkComplete();
    }, 100);
  } else {
    // Слушаем событие load
    const onLoad = () => {
      updateProgress(85);
      checkComplete();
    };
    window.addEventListener('load', onLoad, { once: true });
    
    // Также слушаем DOMContentLoaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        updateProgress(65);
      }, { once: true });
    }
  }
  
  // Дополнительная проверка через 1.5 секунды
  setTimeout(() => {
    if (!isComplete) {
      updateProgress(90);
      checkComplete();
    }
  }, 1500);
}

// Старая функция для обратной совместимости
function hidePreloader() {
  const preloader = document.getElementById('preloader');
  if (preloader) {
    setTimeout(() => {
      preloader.classList.add('hidden');
      setTimeout(() => {
        preloader.remove();
      }, 500);
    }, 2000);
  }
}

// Предзагрузка изображений для элементов, которые скоро появятся
function preloadImagesForUpcomingElements() {
  const animatedElements = document.querySelectorAll(
    '.service-card, .service-simple-card, .stat-card, .contact-card, .stats-grid, ' +
    '.highlight-service-card, .benefit-card, .projects-banner-inner, .projects-reel-card, ' +
    '.portfolio-card, .assistant-card, .testimonial-card, .value-card'
  );
  
  const viewportHeight = window.innerHeight;
  const isMobile = window.matchMedia('(max-width: 900px)').matches;
  const preloadDistance = isMobile ? viewportHeight * 1.2 : viewportHeight * 3;
  
  animatedElements.forEach(el => {
    const rect = el.getBoundingClientRect();
    const isNearViewport = rect.top < preloadDistance && rect.top > -viewportHeight;
    
    if (isNearViewport) {
      const images = el.querySelectorAll('img[loading="lazy"]');
      images.forEach(img => {
        if (img.classList.contains('service-simple-bg-image')) return;
        if (isMobile && (img.closest('.process-step') || img.closest('.assistant-card'))) return;
        // Меняем на eager для предзагрузки
        img.loading = 'eager';
        // Принудительно загружаем изображение
        if (img.src && !img.complete) {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.as = 'image';
          link.href = img.src;
          document.head.appendChild(link);
        }
      });
    }
  });
}

function initDeferredMobileImages() {
  const deferredImages = Array.from(document.querySelectorAll('img[data-mobile-lazy-src]'));
  if (!deferredImages.length) return;

  const loadImage = (img) => {
    const src = img.dataset.mobileLazySrc;
    if (!src) return;
    img.src = src;
    img.removeAttribute('data-mobile-lazy-src');
  };

  if (!window.matchMedia('(max-width: 900px)').matches || !('IntersectionObserver' in window)) {
    deferredImages.forEach(loadImage);
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      loadImage(entry.target);
      observer.unobserve(entry.target);
    });
  }, { rootMargin: '160px 0px' });

  deferredImages.forEach((img) => observer.observe(img));
}

// Main DOMContentLoaded Event
document.addEventListener('DOMContentLoaded', () => {
  const isDetailPage = document.body.classList.contains('detail-page');
  // New Year seasonal code removed (no matching HTML elements)

  initDeferredMobileImages();
  
  // Предзагружаем изображения для элементов, которые скоро появятся
  if (!isDetailPage) {
    preloadImagesForUpcomingElements();
  }
  
  // Инициализировать прелоадер с реальным отслеживанием загрузки
  initPreloader();

  applyContactConfig();
  initServiceCardNavigation();
  initDataActionButtons();
  trackEvent('page_view');

  document.addEventListener('click', (event) => {
    const link = event.target.closest('[data-contact-link]');
    if (!link) return;
    if (link.closest('.service-simple-card') && link.tagName.toLowerCase() !== 'a') return;
    trackEvent('cta_click', {
      target: link.getAttribute('data-contact-link') || link.getAttribute('href') || '',
    });
  });
  
  // Initialize mobile menu
  initMobileMenu();
  
  // Initialize homepage-only interactive sections
  if (!isDetailPage) {
    initTestimonialsSlider();
  }
  
  // Initialize back to top button
  initBackToTop();
  initMobileFloatingChromePolicy();
  
  // Initialize tilt effect
  if (!isDetailPage) {
    initTiltEffect();
  }
  
  // Navbar scroll effect - используем ScrollManager для оптимизации
  const navbar = document.querySelector('.navbar');
  
  if (window.scrollManager) {
    // Подписываемся на события прокрутки через ScrollManager
    window.scrollManager.subscribe((scrollY) => {
      updateScrollProgress();
      
      if (!navbar) return;
      if (scrollY > 50) {
        navbar.classList.add('navbar-solid');
      } else {
        navbar.classList.remove('navbar-solid');
      }
    });
  } else {
    // Fallback для старых браузеров
    window.addEventListener('scroll', () => {
      updateScrollProgress();
      
      if (!navbar) return;
      if (window.scrollY > 50) {
        navbar.classList.add('navbar-solid');
      } else {
        navbar.classList.remove('navbar-solid');
      }
    }, { passive: true });
  }

  // Navigation links smooth scrolling
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const targetId = link.getAttribute('href').substring(1);
      scrollToSection(targetId);
    });
  });

  // Scroll reveal animations are handled by initScrollRevealV2() (single source of truth).

  // Add ripple effect to buttons
  document.querySelectorAll('button, .btn-primary, .btn-secondary').forEach(button => {
    button.addEventListener('click', function(e) {
      const ripple = document.createElement('span');
      const rect = this.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;
      
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = x + 'px';
      ripple.style.top = y + 'px';
      ripple.classList.add('ripple');
      
      this.appendChild(ripple);
      
      setTimeout(() => {
        ripple.remove();
      }, 600);
    });
  });

  // Projects reel video play on click
  if (!isDetailPage) {
    document.querySelectorAll('.projects-reel-card').forEach(card => {
      const video = card.querySelector('.projects-reel-video');
      const playBtn = card.querySelector('.projects-reel-play');

      if (!video || !playBtn) return;

      function togglePlay() {
        if (video.paused) {
          video.muted = false;
          if (window.videoOptimizer?.ensureLazyVideoSource) {
            window.videoOptimizer.ensureLazyVideoSource(video);
          } else if (video.dataset.src && video.dataset.sourceAttached !== '1') {
            const source = document.createElement('source');
            source.src = video.dataset.src;
            source.type = video.dataset.type || 'video/mp4';
            video.appendChild(source);
            video.dataset.sourceAttached = '1';
          }
          video.preload = 'auto';
          if (video.networkState === HTMLMediaElement.NETWORK_EMPTY) {
            video.load();
          }
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      }

      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePlay();
      });

      card.addEventListener('click', togglePlay);
    });
  }

  initCookieBanner();

  if (!isDetailPage) {
    // Hero enter animation
    initHeroEnterAnimation();

    // Process scroll animation
    initProcessScrollAnimation();

    initCodexOfficeCaseChromePolicy();
  }

  // Scroll reveal animations (single system)
  initScrollRevealV2();
});

// Scroll reveal animations (covers new sections even if legacy observer missed them)
let scrollRevealInitialized = false;

function initScrollRevealV2(force = false) {
  if (scrollRevealInitialized && !force) return;
  scrollRevealInitialized = true;

  try {
    // NOTE: We do NOT fully disable scroll-reveal when prefers-reduced-motion is enabled.
    // In real-world setups this led to "no animations anywhere except process section".
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia('(max-width: 900px)').matches;
    const isDesktop = !isMobile;
    const hasHashAnchor = Boolean(window.location.hash);
    const selectors = [
      '[data-animate]',
      '.animate-on-scroll',
      '.service-card',
      '.service-simple-card',
      '.stat-card',
      '.contact-card',
      '.highlight-service-card',
      '.section-title',
      '.section-subtitle',
      '.section-description',
      '.projects-banner-inner',
      '.projects-banner-title',
      '.projects-reel-card',
      '.portfolio-card',
      '.assistant-card',
      '.testimonial-card',
      '.value-card',
      '.benefits-grid > *',
      '.services-grid > *',
      '.testimonials-grid > *',
      '.assistants-grid > *',
      '.projects-grid > *',
      '.portfolio-grid > *',
      '.cta-panel',
      '.cta-copy > *'
    ];

    // Defensive selector collection: if any selector is invalid in a given browser,
    // we still animate the rest (prevents total reveal shutdown).
    const candidateSet = new Set();
    selectors.forEach((selector) => {
      try {
        document.querySelectorAll(selector).forEach((el) => candidateSet.add(el));
      } catch (e) {
        // Keep going; one bad selector must not kill all animations
        console.warn('[scroll-reveal] invalid selector skipped:', selector, e && e.message ? e.message : e);
      }
    });
    const candidates = Array.from(candidateSet);
    const prepared = [];

    const prepareElement = (el, index = 0) => {
      if (!el || el.dataset.scrollRevealReady === '1') return;
      if (el.dataset.animate === 'off') return;
      if (el.classList.contains('hero') || el.closest('.hero')) return;
      if (el.classList.contains('process-step') || el.closest('.process-step')) return;
      el.dataset.scrollRevealReady = '1';
      if (prefersReducedMotion) {
        el.dataset.scrollRevealed = '1';
        el.classList.add('is-visible');
        el.classList.remove(
          'section-hidden',
          'scroll-animate',
          'scroll-animate--visible',
          'reveal-base',
          'reveal-base--left',
          'reveal-base--right',
          'reveal-show'
        );
        return;
      }
      // Ensure no leftover classes from previous systems
      el.classList.remove('scroll-animate', 'scroll-animate--visible');
      el.classList.remove('reveal-base', 'reveal-base--left', 'reveal-base--right', 'reveal-show');

      // Directional reveal: alternate left/right (like process-step), unless overridden
      const directionAttr = el.dataset.animateDirection || el.getAttribute('data-animate-direction');
      const direction = directionAttr || (index % 2 === 0 ? 'left' : 'right');
      el.dataset.animateDirection = direction;
      const sideClass = direction === 'right' ? 'reveal-base--right' : 'reveal-base--left';
      el.classList.add('reveal-base', sideClass);
      prepared.push(el);
    };

    candidates.forEach((el, index) => prepareElement(el, index));
    if (prepared.length === 0) return;

    const revealElement = (el) => {
      if (!el || el.dataset.scrollRevealed === '1') return;
      el.dataset.scrollRevealed = '1';
      el.dataset.scrollRevealAt = String(Math.round(performance.now()));
      el.classList.add('is-visible');
      el.classList.remove(
        'section-hidden',
        'section-visible',
        'scroll-animate',
        'scroll-animate--visible',
        'reveal-show'
      );

      // Animate counters when they come into view (once)
      const counters = el.querySelectorAll('[data-target]');
      counters.forEach((counter) => {
        if (counter.dataset.counterAnimated === '1') return;
        const target = parseInt(counter.getAttribute('data-target'), 10);
        if (Number.isFinite(target)) {
          counter.dataset.counterAnimated = '1';
          animateCounter(counter, target);
        }
      });

      // Cleanup: remove reveal classes after animation so hover transforms work normally
      const cleanup = () => {
        if (el.dataset.scrollRevealCleaned === '1') return;
        el.dataset.scrollRevealCleaned = '1';
        el.classList.remove('reveal-base', 'reveal-base--left', 'reveal-base--right');
        el.removeEventListener('transitionend', onEnd);
      };
      const onEnd = (e) => {
        if (e && e.propertyName && e.propertyName !== 'transform') return;
        cleanup();
      };
      el.addEventListener('transitionend', onEnd);
      setTimeout(cleanup, 900);
    };

    const showVisibleImmediately = () => {
      if (prefersReducedMotion) return;
      const visible = prepared
        .filter((el) => {
          const rect = el.getBoundingClientRect();
          return rect.top < window.innerHeight && rect.bottom > 0;
        })
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
      const stagger = isMobile ? 48 : 46;
      const baseDelay = isMobile && hasHashAnchor ? 90 : 0;
      visible.forEach((el, index) => {
        setTimeout(() => revealElement(el), baseDelay + Math.min(index, 4) * stagger);
      });
    };

    if (!('IntersectionObserver' in window)) {
      prepared.forEach(revealElement);
      return;
    }

    let revealQueue = [];
    let revealFrame = 0;

    const observer = new IntersectionObserver((entries) => {
      let hasIntersecting = false;
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          hasIntersecting = true;
          revealQueue.push(entry.target);
          try {
            observer.unobserve(entry.target);
          } catch (e) {}
        }
      });

      if (hasIntersecting && !revealFrame) {
        revealFrame = requestAnimationFrame(() => {
          const queue = Array.from(new Set(revealQueue))
            .filter((target) => target && target.dataset.scrollRevealed !== '1')
            .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
          const stagger = isMobile ? 48 : 48;
          queue.forEach((target, index) => {
            setTimeout(() => {
              revealElement(target);
            }, Math.min(index, 4) * stagger);
          });
          revealQueue = [];
          revealFrame = 0;
        });
      }
    }, {
      threshold: 0.01,
      rootMargin: isMobile ? '0px 0px 14% 0px' : '0px 0px 18% 0px'
    });


    prepared.forEach((el) => observer.observe(el));
    // One pass for elements already in viewport (avoid hidden gaps on load)
    requestAnimationFrame(showVisibleImmediately);

    // Реакция на динамически добавленные блоки
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach(({ addedNodes }) => {
        addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          const matchedSelf = selectors.some((selector) => node.matches?.(selector));
          const targets = matchedSelf ? [node] : Array.from(node.querySelectorAll?.(selectors.join(',')) || []);
          targets.forEach((target, idx) => {
            prepareElement(target, idx);
            if (target.dataset.scrollRevealReady === '1') {
              observer.observe(target);
            }
          });
        });
      });
    });

    mutationObserver.observe(document.body, { childList: true, subtree: true });
  } catch (error) {
    console.error('Ошибка инициализации scroll reveal анимаций:', error);
  }
}

// Фолбек: если скрипт загрузился после DOMContentLoaded, гарантируем запуск
if ((document.readyState === 'complete' || document.readyState === 'interactive') && !scrollRevealInitialized) {
  initScrollRevealV2();
}

// Hero Animation Initialization (OLD - disabled, using initHeroEnterAnimation instead)
// function initHeroAnimation() {
//   const hero = document.querySelector('.hero');
//   if (!hero) return;
//   hero.classList.add('hero-animate-ready');
//   const observer = new IntersectionObserver((entries) => {
//     entries.forEach(entry => {
//       if (entry.isIntersecting) {
//         setTimeout(() => {
//           hero.classList.add('hero-in-view');
//         }, 50);
//         observer.unobserve(hero);
//       }
//     });
//   }, { threshold: 0.1 });
//   observer.observe(hero);
// }

// Hero enter animation
function initHeroEnterAnimation() {
  const hero = document.querySelector('.hero');
  if (!hero) {
    return;
  }
  
  const heroContent = hero.querySelector('.hero-content');
  if (!heroContent) {
    return;
  }
  
  const children = heroContent.children;

  
  hero.classList.add('hero-enter');

}

// Process scroll animation
function initProcessScrollAnimation() {
  const steps = document.querySelectorAll('.process-step');

  
  if (!steps.length) {
    return;
  }
  const isMobile = window.matchMedia('(max-width: 900px)').matches;

  // Чередуем лево/право
  steps.forEach((step, index) => {
    const sideClass = index % 2 === 0 ? 'process-step--left' : 'process-step--right';
    step.classList.add(sideClass);
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      const step = entry.target;
      const index = Array.from(steps).indexOf(step);
      const delay = Math.min(index, 3) * (isMobile ? 45 : 80);



      setTimeout(() => {
        step.classList.add('is-visible');
      }, delay);

      observer.unobserve(step);
    });
  }, {
    threshold: 0.01,
    rootMargin: isMobile ? '0px 0px 22% 0px' : '0px 0px 12% 0px'
  });

  steps.forEach((step) => observer.observe(step));

}
