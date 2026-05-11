/**
 * Skeleton Loader - Показывает skeleton во время загрузки контента
 * Улучшает perceived performance
 */

class SkeletonLoader {
  constructor() {
    this.skeletons = new Map();
    this.init();
  }

  init() {
    // Создаем skeleton для hero секции
    this.createHeroSkeleton();
    
    // Создаем skeleton для карточек услуг
    this.createServicesSkeleton();
    
    // Создаем skeleton для портфолио
    this.createPortfolioSkeleton();
    
    // Скрываем skeleton когда контент загружен
    this.hideSkeletonsOnLoad();
  }

  /**
   * Создание skeleton для hero секции
   */
  createHeroSkeleton() {
    const hero = document.querySelector('.hero');
    if (!hero) return;

    const heroReel = document.querySelector('.hero-reel');
    if (!heroReel) return;

    // Проверяем, загружено ли видео
    const heroVideo = document.getElementById('hero-reel-video');
    if (heroVideo && heroVideo.readyState >= 2) {
      return; // Видео уже загружено
    }

    const skeleton = document.createElement('div');
    skeleton.className = 'skeleton skeleton-hero';
    const video = document.createElement('div');
    video.className = 'skeleton-video';
    const content = document.createElement('div');
    content.className = 'skeleton-content';
    const title = document.createElement('div');
    title.className = 'skeleton-title';
    const text = document.createElement('div');
    text.className = 'skeleton-text';
    const buttons = document.createElement('div');
    buttons.className = 'skeleton-buttons';
    const primaryButton = document.createElement('div');
    primaryButton.className = 'skeleton-button';
    const secondaryButton = document.createElement('div');
    secondaryButton.className = 'skeleton-button';
    buttons.appendChild(primaryButton);
    buttons.appendChild(secondaryButton);
    content.appendChild(title);
    content.appendChild(text);
    content.appendChild(buttons);
    skeleton.appendChild(video);
    skeleton.appendChild(content);

    heroReel.style.position = 'relative';
    heroReel.appendChild(skeleton);
    this.skeletons.set('hero', skeleton);

    // Скрываем когда видео загрузится
    if (heroVideo) {
      heroVideo.addEventListener('canplay', () => {
        this.hideSkeleton('hero');
      }, { once: true });
    }
  }

  /**
   * Создание skeleton для карточек услуг
   */
  createServicesSkeleton() {
    const servicesGrid = document.querySelector('.services-simple-grid');
    if (!servicesGrid) return;

    // Проверяем, есть ли уже карточки
    const existingCards = servicesGrid.querySelectorAll('.service-simple-card');
    if (existingCards.length > 0) return;

    // Создаем skeleton карточки
    const skeletonRow = document.createElement('div');
    skeletonRow.className = 'skeleton-row';
    
    for (let i = 0; i < 4; i++) {
      const skeletonCard = document.createElement('div');
      skeletonCard.className = 'skeleton skeleton-service-card';
      const image = document.createElement('div');
      image.className = 'skeleton-image';
      const footer = document.createElement('div');
      footer.className = 'skeleton-footer';
      skeletonCard.appendChild(image);
      skeletonCard.appendChild(footer);
      skeletonRow.appendChild(skeletonCard);
    }

    servicesGrid.appendChild(skeletonRow);
    this.skeletons.set('services', skeletonRow);

    // Скрываем когда карточки загрузятся
    // Проверяем динамически, так как карточки могут загрузиться позже
    const checkInterval = setInterval(() => {
      const currentCards = servicesGrid.querySelectorAll('.service-simple-card');
      if (currentCards.length > 0) {
        this.hideSkeleton('services');
        clearInterval(checkInterval);
      }
    }, 100);
  }

  /**
   * Создание skeleton для портфолио
   */
  createPortfolioSkeleton() {
    const portfolioGrid = document.querySelector('.projects-reel-grid');
    if (!portfolioGrid) return;

    const existingCards = portfolioGrid.querySelectorAll('.projects-reel-card');
    if (existingCards.length > 0) return;

    const skeletonRow = document.createElement('div');
    skeletonRow.className = 'skeleton-row skeleton-portfolio';
    
    for (let i = 0; i < 6; i++) {
      const skeletonCard = document.createElement('div');
      skeletonCard.className = 'skeleton skeleton-portfolio-card';
      const image = document.createElement('div');
      image.className = 'skeleton-image';
      const text = document.createElement('div');
      text.className = 'skeleton-text short';
      skeletonCard.appendChild(image);
      skeletonCard.appendChild(text);
      skeletonRow.appendChild(skeletonCard);
    }

    portfolioGrid.appendChild(skeletonRow);
    this.skeletons.set('portfolio', skeletonRow);

    // Скрываем когда карточки загрузятся
    const checkInterval = setInterval(() => {
      if (portfolioGrid.querySelectorAll('.projects-reel-card').length > 0) {
        this.hideSkeleton('portfolio');
        clearInterval(checkInterval);
      }
    }, 100);
  }

  /**
   * Скрытие skeleton
   */
  hideSkeleton(key) {
    const skeleton = this.skeletons.get(key);
    if (!skeleton) return;

    skeleton.style.opacity = '0';
    skeleton.style.transition = 'opacity 0.3s ease';
    
    setTimeout(() => {
      skeleton.remove();
      this.skeletons.delete(key);
    }, 300);
  }

  /**
   * Скрытие всех skeleton при загрузке
   */
  hideSkeletonsOnLoad() {
    window.addEventListener('load', () => {
      // Скрываем все skeleton через небольшую задержку
      setTimeout(() => {
        this.skeletons.forEach((skeleton, key) => {
          this.hideSkeleton(key);
        });
      }, 500);
    });
  }

  /**
   * Показать skeleton для конкретного элемента
   */
  showSkeletonForElement(element, type = 'default') {
    const skeleton = document.createElement('div');
    skeleton.className = `skeleton skeleton-${type}`;
    
    const parent = element.parentNode;
    const nextSibling = element.nextSibling;
    
    parent.insertBefore(skeleton, nextSibling);
    element.style.display = 'none';
    
    return {
      hide: () => {
        skeleton.style.opacity = '0';
        setTimeout(() => {
          skeleton.remove();
          element.style.display = '';
        }, 300);
      }
    };
  }
}

// Инициализация при загрузке DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.skeletonLoader = new SkeletonLoader();
  });
} else {
  window.skeletonLoader = new SkeletonLoader();
}

// Экспорт для использования в других модулях
window.SkeletonLoader = SkeletonLoader;

