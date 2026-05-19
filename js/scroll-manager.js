/**
 * Scroll Manager - Централизованное управление обработчиками прокрутки
 * Оптимизирует производительность, используя throttling и requestAnimationFrame
 */

class ScrollManager {
  constructor() {
    this.handlers = new Set();
    this.isTicking = false;
    this.lastScrollY = 0;
    this.scrollDirection = 'down';
    this.init();
  }

  init() {
    // Используем один обработчик с requestAnimationFrame для всех подписчиков
    window.addEventListener('scroll', () => this.handleScroll(), { passive: true });
    
    // Инициализируем начальное состояние
    this.lastScrollY = window.scrollY;
  }

  /**
   * Главный обработчик прокрутки с оптимизацией
   */
  handleScroll() {
    if (!this.isTicking) {
      requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        this.scrollDirection = currentScrollY > this.lastScrollY ? 'down' : 'up';
        this.lastScrollY = currentScrollY;

        // Вызываем все зарегистрированные обработчики
        this.handlers.forEach(handler => {
          try {
            handler(currentScrollY, this.scrollDirection);
          } catch (error) {
            console.error('Ошибка в обработчике прокрутки:', error);
          }
        });

        this.isTicking = false;
      });
      this.isTicking = true;
    }
  }

  /**
   * Регистрация обработчика прокрутки
   * @param {Function} handler - Функция-обработчик (scrollY, direction)
   * @returns {Function} - Функция для отмены подписки
   */
  subscribe(handler) {
    if (typeof handler !== 'function') {
      console.warn('ScrollManager: handler должен быть функцией');
      return () => {};
    }

    this.handlers.add(handler);
    
    // Вызываем сразу для получения начального состояния
    handler(this.lastScrollY, this.scrollDirection);

    // Возвращаем функцию для отмены подписки
    return () => {
      this.handlers.delete(handler);
    };
  }

  /**
   * Получить текущую позицию прокрутки
   */
  getScrollY() {
    return this.lastScrollY;
  }

  /**
   * Получить направление прокрутки
   */
  getDirection() {
    return this.scrollDirection;
  }

  /**
   * Получить процент прокрутки (0-100)
   */
  getScrollPercent() {
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    if (docHeight <= 0) return 0;
    return Math.min(100, (this.lastScrollY / docHeight) * 100);
  }

  /**
   * Плавная прокрутка к элементу
   */
  scrollToElement(element, options = {}) {
    if (!element) return;
    window.RealVibeHaptics?.markProgrammaticScroll?.(900);

    const defaultOptions = {
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest'
    };

    element.scrollIntoView({ ...defaultOptions, ...options });
  }

  /**
   * Плавная прокрутка к позиции
   */
  scrollToPosition(y, behavior = 'smooth') {
    window.RealVibeHaptics?.markProgrammaticScroll?.(900);
    window.scrollTo({
      top: y,
      behavior: behavior
    });
  }

  /**
   * Очистка всех обработчиков
   */
  destroy() {
    this.handlers.clear();
    // Обработчик scroll останется, но не будет вызывать функции
  }
}

// Создаем глобальный экземпляр
window.scrollManager = new ScrollManager();

// Экспорт для использования в других модулях
window.ScrollManager = ScrollManager;

