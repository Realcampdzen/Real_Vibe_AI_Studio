/**
 * Pull to Refresh - Стандартный мобильный жест обновления
 */

class PullToRefresh {
  constructor() {
    this.startY = 0;
    this.currentY = 0;
    this.threshold = 80;
    this.maxPull = 120;
    this.isPulling = false;
    this.isRefreshing = false;
    this.init();
  }

  init() {
    // Только на мобильных устройствах
    if (window.innerWidth > 768) return;
    
    this.createRefreshIndicator();
    this.setupTouchEvents();
  }

  /**
   * Создание индикатора обновления
   */
  createRefreshIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'pull-to-refresh-indicator';
    indicator.className = 'pull-to-refresh-indicator';
    const icon = document.createElement('div');
    icon.className = 'pull-to-refresh-icon';
    const iconGlyph = document.createElement('i');
    iconGlyph.className = 'fas fa-arrow-down';
    icon.appendChild(iconGlyph);
    const text = document.createElement('div');
    text.className = 'pull-to-refresh-text';
    text.textContent = 'Потяните для обновления';
    indicator.appendChild(icon);
    indicator.appendChild(text);
    document.body.appendChild(indicator);
    this.indicator = indicator;
  }

  /**
   * Настройка touch событий
   */
  setupTouchEvents() {
    let touchStartY = 0;
    let touchCurrentY = 0;
    let isAtTop = false;

    const isBlockedByOverlay = (target) => {
      return Boolean(
        document.body.classList.contains('mobile-nav-open') ||
        document.documentElement.classList.contains('mobile-nav-open') ||
        document.getElementById('mobile-nav')?.classList.contains('active') ||
        target?.closest?.('.mobile-nav, .glass-ui-widget')
      );
    };

    document.addEventListener('touchstart', (e) => {
      if (isBlockedByOverlay(e.target)) {
        isAtTop = false;
        this.isPulling = false;
        return;
      }

      // Проверяем, что мы в самом верху страницы
      isAtTop = window.scrollY === 0;
      
      if (isAtTop && !this.isRefreshing) {
        touchStartY = e.touches[0].clientY;
        this.startY = touchStartY;
      }
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (isBlockedByOverlay(e.target)) {
        if (this.isPulling) this.resetIndicator();
        this.isPulling = false;
        return;
      }

      if (!isAtTop || this.isRefreshing) return;
      
      touchCurrentY = e.touches[0].clientY;
      const distance = touchCurrentY - touchStartY;
      
      if (distance > 0 && window.scrollY === 0) {
        e.preventDefault(); // Предотвращаем скролл страницы
        
        this.currentY = distance;
        this.isPulling = true;
        this.updateIndicator(distance);
      }
    }, { passive: false });

    document.addEventListener('touchend', () => {
      if (!this.isPulling) return;

      if (isBlockedByOverlay(document.activeElement)) {
        this.resetIndicator();
        this.isPulling = false;
        this.startY = 0;
        this.currentY = 0;
        return;
      }
      
      if (this.currentY > this.threshold) {
        this.triggerRefresh();
      } else {
        this.resetIndicator();
      }
      
      this.isPulling = false;
      this.startY = 0;
      this.currentY = 0;
    }, { passive: true });
  }

  /**
   * Обновление индикатора
   */
  updateIndicator(distance) {
    if (!this.indicator) return;
    
    const progress = Math.min(distance / this.threshold, 1);
    const pullDistance = Math.min(distance, this.maxPull);
    
    // Позиция индикатора
    this.indicator.style.transform = `translateY(${pullDistance}px)`;
    this.indicator.style.opacity = progress;
    
    // Вращение иконки
    const icon = this.indicator.querySelector('.pull-to-refresh-icon');
    if (icon) {
      const rotation = progress >= 1 ? 180 : progress * 180;
      icon.style.transform = `rotate(${rotation}deg)`;
    }
    
    // Текст
    const text = this.indicator.querySelector('.pull-to-refresh-text');
    if (text) {
      if (progress >= 1) {
        text.textContent = 'Отпустите для обновления';
      } else {
        text.textContent = 'Потяните для обновления';
      }
    }
    
    // Показываем индикатор
    if (!this.indicator.classList.contains('active')) {
      this.indicator.classList.add('active');
    }
  }

  /**
   * Сброс индикатора
   */
  resetIndicator() {
    if (!this.indicator) return;
    
    this.indicator.style.transform = 'translateY(0)';
    this.indicator.style.opacity = '0';
    this.indicator.classList.remove('active');
    
    const icon = this.indicator.querySelector('.pull-to-refresh-icon');
    if (icon) {
      icon.style.transform = 'rotate(0deg)';
    }
  }

  /**
   * Запуск обновления
   */
  async triggerRefresh() {
    if (this.isRefreshing) return;
    
    this.isRefreshing = true;
    this.indicator.classList.add('refreshing');
    
    const icon = this.indicator.querySelector('.pull-to-refresh-icon');
    if (icon) {
      const spinner = document.createElement('i');
      spinner.className = 'fas fa-spinner fa-spin';
      icon.replaceChildren(spinner);
    }
    
    const text = this.indicator.querySelector('.pull-to-refresh-text');
    if (text) {
      text.textContent = 'Обновление...';
    }
    
    // Haptic feedback
    if (window.HapticFeedback) {
      window.HapticFeedback.medium();
    }
    
    try {
      // Обновление страницы
      await this.refreshContent();
      
      // Успешное обновление
      if (text) {
        text.textContent = 'Обновлено!';
      }
      
      setTimeout(() => {
        this.resetIndicator();
        this.isRefreshing = false;
      }, 1000);
    } catch (error) {
      console.error('Ошибка обновления:', error);
      
      if (text) {
        text.textContent = 'Ошибка обновления';
      }
      
      setTimeout(() => {
        this.resetIndicator();
        this.isRefreshing = false;
      }, 2000);
    }
  }

  /**
   * Обновление контента
   */
  async refreshContent() {
    // Можно добавить кастомную логику обновления
    // Например, перезагрузка данных через API
    
    // По умолчанию просто перезагружаем страницу
    return new Promise((resolve) => {
      // Небольшая задержка для визуального эффекта
      setTimeout(() => {
        window.location.reload();
        resolve();
      }, 500);
    });
  }
}

// Инициализация при загрузке DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.pullToRefresh = new PullToRefresh();
  });
} else {
  window.pullToRefresh = new PullToRefresh();
}

// Экспорт для использования в других модулях
window.PullToRefresh = PullToRefresh;

