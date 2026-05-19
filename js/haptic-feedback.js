/**
 * Haptic Feedback - tactile feedback for Android mobile browsers/WebViews.
 */

class HapticFeedback {
  constructor() {
    if (window.__rvHapticFeedbackInitialized) return;
    window.__rvHapticFeedbackInitialized = true;

    this.supported = HapticFeedback.hasVibrationApi();
    this.lastTouchAt = 0;
    this.programmaticScrollUntil = 0;
    this.lastSectionKey = '';
    this.lastCardKey = '';
    this.tickObserver = null;
    this.tickTargets = [];
    this.scrollFrame = 0;
    this.init();
  }

  static hasVibrationApi() {
    const connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;
    const reducedMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return Boolean(
      'vibrate' in navigator &&
      !reducedMotion &&
      !(connection && connection.saveData)
    );
  }

  static canVibrate() {
    if (!HapticFeedback.hasVibrationApi()) return false;
    const activation = navigator.userActivation;
    return Boolean(
      window.__rvHapticUserInteracted ||
      !activation ||
      activation.hasBeenActive ||
      activation.isActive
    );
  }

  static canEmit() {
    return HapticFeedback.canVibrate();
  }

  static vibrate(pattern, key = 'generic', cooldown = 160) {
    if (!HapticFeedback.canEmit()) return false;
    const now = performance.now();
    const store = window.__rvHapticLastEmit || (window.__rvHapticLastEmit = {});
    if (store[key] && now - store[key] < cooldown) return false;
    store[key] = now;
    navigator.vibrate(pattern);
    window.__rvHapticEvents = window.__rvHapticEvents || [];
    window.__rvHapticEvents.push({ key, pattern, at: Math.round(now) });
    return true;
  }

  static light() {
    return HapticFeedback.vibrate(10, 'light', 120);
  }

  static medium() {
    return HapticFeedback.vibrate(20, 'medium', 220);
  }

  static heavy() {
    return HapticFeedback.vibrate([10, 50, 10], 'heavy', 450);
  }

  static custom(pattern) {
    return HapticFeedback.vibrate(pattern, 'custom', 160);
  }

  static success() {
    return HapticFeedback.vibrate([10, 30, 10, 30, 10], 'success', 700);
  }

  static error() {
    return HapticFeedback.vibrate([50, 100, 50, 100, 50], 'error', 900);
  }

  static warning() {
    return HapticFeedback.vibrate([20, 40, 20], 'warning', 650);
  }

  init() {
    window.HapticFeedback = HapticFeedback;
    window.RealVibeHaptics = this.createPublicApi();

    if (!this.supported) return;
    this.setupAutoHaptic();
    this.setupScrollTicks();
  }

  createPublicApi() {
    return {
      light: () => HapticFeedback.light(),
      medium: () => HapticFeedback.medium(),
      heavy: () => HapticFeedback.heavy(),
      sectionTick: () => this.sectionTick(),
      cardTick: () => this.cardTick(),
      markProgrammaticScroll: (duration) => this.markProgrammaticScroll(duration),
      getEvents: () => window.__rvHapticEvents || [],
    };
  }

  isBlocked() {
    return (
      performance.now() < this.programmaticScrollUntil ||
      document.body.classList.contains('mobile-nav-open') ||
      document.body.classList.contains('rv-overlay-open') ||
      document.body.classList.contains('rv-cookie-banner-visible') ||
      document.documentElement.classList.contains('mobile-nav-open') ||
      Boolean(document.querySelector('.glass-ui-widget.is-visible'))
    );
  }

  markProgrammaticScroll(duration = 900) {
    this.programmaticScrollUntil = Math.max(
      this.programmaticScrollUntil,
      performance.now() + duration
    );
  }

  sectionTick() {
    if (this.isBlocked()) return false;
    return HapticFeedback.vibrate(10, 'section-scroll', 620);
  }

  cardTick() {
    if (this.isBlocked()) return false;
    return HapticFeedback.vibrate(8, 'card-scroll', 460);
  }

  setupAutoHaptic() {
    document.addEventListener('click', (event) => {
      window.__rvHapticUserInteracted = true;
      const target = event.target.closest('button, .btn-primary, .btn-secondary, .mobile-nav-link, .try-assistant-btn, .service-simple-btn');
      if (target && !target.hasAttribute('data-no-haptic')) {
        HapticFeedback.light();
      }
    }, true);

    let touchStartTime = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    let longPressTimer = 0;

    document.addEventListener('touchstart', (event) => {
      const touch = event.touches[0];
      if (!touch) return;
      window.__rvHapticUserInteracted = true;
      this.lastTouchAt = performance.now();
      touchStartTime = Date.now();
      touchStartX = touch.clientX;
      touchStartY = touch.clientY;
      window.clearTimeout(longPressTimer);
      longPressTimer = window.setTimeout(() => {
        if (!this.isBlocked()) HapticFeedback.medium();
      }, 520);
    }, { passive: true });

    document.addEventListener('touchmove', () => {
      this.lastTouchAt = performance.now();
      window.clearTimeout(longPressTimer);
      longPressTimer = 0;
    }, { passive: true });

    document.addEventListener('touchend', (event) => {
      window.clearTimeout(longPressTimer);
      longPressTimer = 0;
      const touchDuration = Date.now() - touchStartTime;
      const touch = event.changedTouches[0];
      if (!touch || !touchStartX || !touchStartY) return;

      const deltaX = Math.abs(touch.clientX - touchStartX);
      const deltaY = Math.abs(touch.clientY - touchStartY);
      if (touchDuration < 300 && (deltaX > 50 || deltaY > 50) && !this.isBlocked()) {
        HapticFeedback.light();
      }

      touchStartX = 0;
      touchStartY = 0;
    }, { passive: true });
  }

  setupScrollTicks() {
    if (!('IntersectionObserver' in window)) return;

    const selectors = [
      '.service-simple-card',
      '.process-step',
      '#services',
      '#polstan-portal',
      '#benefits',
      '#process',
      '#assistants',
      '.service-detail-hero',
      '.service-detail-card',
    ].join(',');

    const getKey = (element, index) => (
      element.id ||
      element.dataset.serviceId ||
      element.getAttribute('data-service-id') ||
      element.className?.toString?.().trim().replace(/\s+/g, '.') ||
      `${element.tagName.toLowerCase()}-${index}`
    );

    const targets = Array.from(document.querySelectorAll(selectors));
    this.tickTargets = targets;

    const emitCenteredTick = (elements) => {
      if (performance.now() - this.lastTouchAt > 1200 || this.isBlocked()) return;
      const centered = elements
        .map((element) => {
          const rect = element.getBoundingClientRect();
          if (rect.bottom <= 0 || rect.top >= window.innerHeight) return null;
          const center = rect.top + rect.height / 2;
          return {
            element,
            distance: Math.abs(center - window.innerHeight / 2),
          };
        })
        .filter(Boolean)
        .sort((a, b) => a.distance - b.distance)[0];
      if (!centered) return;

      const element = centered.element;
      const key = getKey(element, targets.indexOf(element));
      const isCard = element.matches('.service-simple-card, .process-step, .service-detail-card');

      if (isCard) {
        if (key === this.lastCardKey) return;
        this.lastCardKey = key;
        this.cardTick();
        return;
      }

      if (key === this.lastSectionKey) return;
      this.lastSectionKey = key;
      this.sectionTick();
    };

    this.tickObserver = new IntersectionObserver((entries) => {
      emitCenteredTick(entries.filter((entry) => entry.isIntersecting).map((entry) => entry.target));
    }, {
      threshold: [0.32, 0.5, 0.68],
      rootMargin: '-32% 0px -32% 0px',
    });

    targets.forEach((target) => this.tickObserver.observe(target));

    window.addEventListener('scroll', () => {
      if (this.scrollFrame || performance.now() - this.lastTouchAt > 1200 || this.isBlocked()) return;
      this.scrollFrame = requestAnimationFrame(() => {
        this.scrollFrame = 0;
        emitCenteredTick(this.tickTargets);
      });
    }, { passive: true });
  }
}

function initHapticFeedback() {
  window.HapticFeedback = HapticFeedback;
  if (!window.__rvHapticFeedbackInitialized) {
    new HapticFeedback();
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHapticFeedback, { once: true });
} else {
  initHapticFeedback();
}

window.HapticFeedback = HapticFeedback;
