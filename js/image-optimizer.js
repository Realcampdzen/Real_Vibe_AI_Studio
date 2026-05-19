/**
 * Image Optimizer - WebP поддержка и responsive images
 * Оптимизирует загрузку изображений для мобильных устройств
 */

class ImageOptimizer {
  constructor() {
    this.isMobile = window.innerWidth <= 768;
    this.webpSupported = false;
    this.init();
  }

  async init() {
    // Проверка поддержки WebP
    await this.checkWebPSupport();
    
    // Оптимизация аватаров
    this.optimizeAvatars();
    
    // Оптимизация изображений в карточках услуг
    this.optimizeServiceImages();
    
    // Оптимизация изображений в портфолио
    this.optimizePortfolioImages();
    
    // Lazy loading для всех изображений
    this.setupLazyLoading();
  }

  /**
   * Проверка поддержки WebP
   */
  async checkWebPSupport() {
    return new Promise((resolve) => {
      const webP = new Image();
      webP.onload = webP.onerror = () => {
        this.webpSupported = (webP.height === 2);
        document.documentElement.classList.add(
          this.webpSupported ? 'webp-supported' : 'webp-not-supported'
        );
        resolve();
      };
      webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
    });
  }

  /**
   * Оптимизация аватаров с WebP и responsive images
   */
  optimizeAvatars() {
    const avatars = [
      { selector: '.bro-cat-avatar, .btn-bro-avatar', 
        desktop: 'images/bro-avatar.jpg',
        mobile: 'images/bro-avatar-mobile.jpg',
        webp: 'images/bro-avatar.webp',
        webpMobile: 'images/bro-avatar-mobile.webp' },
      { selector: '.assistant-avatar[src*="НейроВалюша"]', 
        desktop: 'public/НейроВалюша_аватар.jpg',
        mobile: 'public/НейроВалюша_аватар-mobile.jpg',
        webp: 'public/НейроВалюша_аватар.webp',
        webpMobile: 'public/НейроВалюша_аватар-mobile.webp' }
    ];

    avatars.forEach(({ selector, desktop, mobile, webp, webpMobile }) => {
      const elements = document.querySelectorAll(selector);
      
      elements.forEach(element => {
        // Если это img элемент
        if (element.tagName === 'IMG') {
          this.convertToPicture(element, desktop, mobile, webp, webpMobile);
        } 
        // Если это background-image
        else if (element.style.backgroundImage || getComputedStyle(element).backgroundImage !== 'none') {
          this.optimizeBackgroundImage(element, desktop, mobile, webp, webpMobile);
        }
      });
    });
  }

  /**
   * Конвертация img в picture с responsive sources
   */
  convertToPicture(img, desktop, mobile, webp, webpMobile) {
    // Пропускаем если уже picture
    if (img.parentNode.tagName === 'PICTURE') return;

    const picture = document.createElement('picture');
    const parent = img.parentNode;
    
    // WebP источники
    if (this.webpSupported) {
      // Mobile WebP
      const mobileWebPSource = document.createElement('source');
      mobileWebPSource.srcset = webpMobile || webp;
      mobileWebPSource.media = '(max-width: 768px)';
      mobileWebPSource.type = 'image/webp';
      picture.appendChild(mobileWebPSource);
      
      // Desktop WebP
      const desktopWebPSource = document.createElement('source');
      desktopWebPSource.srcset = webp;
      desktopWebPSource.type = 'image/webp';
      picture.appendChild(desktopWebPSource);
    }
    
    // Fallback источники (JPEG)
    const mobileSource = document.createElement('source');
    mobileSource.srcset = mobile || desktop;
    mobileSource.media = '(max-width: 768px)';
    picture.appendChild(mobileSource);
    
    // Оригинальный img как fallback
    img.loading = 'lazy';
    img.decoding = 'async';
    if (!img.src) {
      img.src = desktop;
    }
    picture.appendChild(img);
    
    parent.replaceChild(picture, img);
  }

  /**
   * Оптимизация background-image
   */
  optimizeBackgroundImage(element, desktop, mobile, webp, webpMobile) {
    const imageUrl = this.isMobile && mobile ? mobile : desktop;
    const finalUrl = this.webpSupported && webp ? webp : imageUrl;
    
    element.style.backgroundImage = `url('${finalUrl}')`;
    element.style.backgroundSize = 'cover';
    element.style.backgroundPosition = 'center';
    element.style.backgroundRepeat = 'no-repeat';
  }

  /**
   * Оптимизация изображений в карточках услуг
   */
  optimizeServiceImages() {
    const serviceImages = document.querySelectorAll('.service-simple-bg-image');
    
    serviceImages.forEach(img => {
      const card = img.closest('.service-simple-card');
      const isCriticalService =
        card?.closest('.services-primary') &&
        (card.dataset.serviceId === '0' || card.dataset.serviceId === '11');

      if (isCriticalService || img.dataset.critical === 'true') {
        img.loading = 'eager';
        img.fetchPriority = 'high';
        img.setAttribute('fetchpriority', 'high');
        img.dataset.critical = 'true';
      } else {
        img.loading = img.getAttribute('loading') || 'lazy';
        if (!img.getAttribute('fetchpriority')) {
          img.fetchPriority = 'low';
          img.setAttribute('fetchpriority', 'low');
        }
      }
      img.decoding = 'async';

      const markReady = () => card?.classList.add('is-media-ready');
      if (img.complete && img.naturalWidth > 0) {
        markReady();
      } else {
        img.addEventListener('load', markReady, { once: true });
        img.addEventListener('error', markReady, { once: true });
      }
      
      // Создаем responsive image если есть разные размеры
      const src = img.src || img.getAttribute('src');
      if (src && !img.parentNode.querySelector('source')) {
        // Можно добавить логику для создания picture элементов
        // если будут созданы мобильные версии изображений
      }
    });
  }

  /**
   * Оптимизация изображений в портфолио
   */
  optimizePortfolioImages() {
    const portfolioImages = document.querySelectorAll('.projects-reel-image');
    
    portfolioImages.forEach(img => {
      img.loading = 'eager';
      img.fetchPriority = 'low';
      img.decoding = 'async';
    });
  }

  /**
   * Lazy loading для всех изображений
   */
  setupLazyLoading() {
    const images = document.querySelectorAll('img:not([loading])');
    
    // Нативные lazy loading для поддерживающих браузеров
    if ('loading' in HTMLImageElement.prototype) {
      images.forEach(img => {
        if (!img.hasAttribute('loading')) {
          img.loading = 'lazy';
        }
      });
    } 
    // IntersectionObserver для старых браузеров
    else if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
            }
            imageObserver.unobserve(img);
          }
        });
      }, {
        rootMargin: '50px'
      });

      images.forEach(img => {
        if (img.dataset.src) {
          imageObserver.observe(img);
        } else {
          // Если нет data-src, просто добавляем loading="lazy"
          img.loading = 'lazy';
        }
      });
    }
  }

  /**
   * Предзагрузка критических изображений
   */
  preloadCriticalImages() {
    const criticalImages = [
      'images/bro-avatar.jpg',
      'images/wellness-bro-avatar-384.webp'
    ];

    criticalImages.forEach(src => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = src;
      document.head.appendChild(link);
    });
  }
}

// Инициализация при загрузке DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.imageOptimizer = new ImageOptimizer();
  });
} else {
  window.imageOptimizer = new ImageOptimizer();
}

// Экспорт для использования в других модулях
window.ImageOptimizer = ImageOptimizer;

