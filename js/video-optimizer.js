/**
 * Video Optimizer - Адаптивные видео источники и оптимизация загрузки
 * Оптимизирует загрузку видео для мобильных устройств
 */

class VideoOptimizer {
  constructor() {
    this.isMobile = window.matchMedia
      ? window.matchMedia('(max-width: 900px)').matches
      : window.innerWidth <= 768;
    this.isYandex =
      navigator.userAgent &&
      /YaBrowser|Yandex/i.test(navigator.userAgent);
    this.connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;
    this.saveData = !!(this.connection && this.connection.saveData);
    this.slowNetwork =
      this.connection &&
      ['slow-2g', '2g', '3g'].includes(this.connection.effectiveType);
    this.prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.heroVideo = document.getElementById('hero-reel-video');
    this.autoPlayDesktop = this.heroVideo
      ? this.heroVideo.dataset.autoplayDesktop !== 'false'
      : true;
    this.init();
  }

  normalizeSrc(src) {
    if (!src) return '';
    try {
      return encodeURI(src);
    } catch (e) {
      console.warn('Не удалось нормализовать src видео', src, e);
      return src;
    }
  }

  getHeroSources(video) {
    const desktopRaw =
      video.dataset.desktopSrc ||
      video.getAttribute('src') ||
      video.querySelector('source')?.src ||
      'public/works/шоурил.mp4';
    const mobileRaw =
      video.dataset.mobileSrc ||
      video.querySelector('source[data-mobile]')?.src ||
      '';

    return {
      desktop: this.normalizeSrc(desktopRaw),
      mobile: mobileRaw ? this.normalizeSrc(mobileRaw) : ''
    };
  }

  ensureHeroAttributes(video) {
    // На мобиле используем metadata для экономии трафика
    const preloadMode =
      this.isMobile
        ? 'metadata'
        : (this.isYandex || (!this.slowNetwork && !this.saveData))
          ? 'auto'
          : 'metadata';

    video.setAttribute('preload', preloadMode);
    video.preload = preloadMode;

    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.muted = true;
    video.setAttribute('muted', '');
    video.defaultMuted = true;

    // На мобиле автозапуск включён, но с metadata preload видео
    // начнёт играть позже (после загрузки первого фрейма)
    const shouldAutoplay = this.autoPlayDesktop;
    video.autoplay = shouldAutoplay;
    if (shouldAutoplay) {
      video.setAttribute('autoplay', '');
    } else {
      video.removeAttribute('autoplay');
    }
  }

  ensurePlayback(video) {
    let played = false;

    // Убеждаемся, что видео muted для автозапуска
    if (!video.muted) {
      video.muted = true;
      video.setAttribute('muted', '');
    }

    const attemptPlay = () => {
      if (played || video.ended) return;
      
      // Проверяем, что видео не на паузе и не закончилось
      if (!video.paused && video.currentTime > 0) {
        played = true;
        return;
      }

      const playPromise = video.play();
      if (playPromise && playPromise.catch) {
        playPromise
          .then(() => {

          })
          .catch((err) => {
            console.warn('⚠️ Автовоспроизведение ограничено браузером:', err?.name || err);
            // Продолжаем попытки даже при ошибке
          });
      }
    };

    const markPlayed = () => {
      played = true;
    };

    video.addEventListener('play', markPlayed, { once: true });
    video.addEventListener('playing', markPlayed, { once: true });

    // Немедленная попытка, если видео уже готово
    if (video.readyState >= 2) {
      attemptPlay();
    } else {
      // Пробуем сразу после загрузки метаданных
      video.addEventListener('loadedmetadata', attemptPlay, { once: true });
      video.addEventListener('loadeddata', attemptPlay, { once: true });
      video.addEventListener('canplay', attemptPlay, { once: true });
      video.addEventListener('canplaythrough', attemptPlay, { once: true });
    }

    // Гарантия запуска после первого взаимодействия
    const resumeOnInteract = () => {
      attemptPlay();
    };
    video.addEventListener('pointerdown', resumeOnInteract, { once: true });
    video.addEventListener('touchstart', resumeOnInteract, { once: true });

    // Повторные попытки для капризных браузеров (например, Яндекс)
    setTimeout(attemptPlay, 100);
    setTimeout(attemptPlay, 500);
    setTimeout(attemptPlay, 1000);
    setTimeout(attemptPlay, 2000);
    
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') attemptPlay();
    });
    
    video.addEventListener('mouseenter', attemptPlay, { once: true });
    video.addEventListener('stalled', attemptPlay);
    video.addEventListener('suspend', attemptPlay);

    // Брутфорс-фоллбек: несколько попыток с интервалом
    let retries = 0;
    const retryInterval = setInterval(() => {
      if (played || (!video.paused && !video.ended && video.currentTime > 0)) {
        clearInterval(retryInterval);
        return;
      }
      attemptPlay();
      retries += 1;
      if (retries >= 8) {
        clearInterval(retryInterval);
        console.warn('⚠️ Превышено количество попыток автозапуска видео');
      }
    }, 800);
  }

  init() {
    // Оптимизация hero видео
    this.optimizeHeroVideo();
    this.initHeroControls();
    
    // Lazy loading для видео в портфолио
    this.setupLazyLoading();
    
    // Предзагрузка стратегия
    this.setupPreloadStrategy();
    
    // Обработка ошибок загрузки
    this.setupErrorHandling();

    // Сетевые ограничения
    this.optimizeForSlowConnection();
  }

  /**
   * Оптимизация hero видео с адаптивными источниками
   */
  optimizeHeroVideo() {
    const heroVideo =
      this.heroVideo || document.getElementById('hero-reel-video');
    if (!heroVideo) {
      console.warn('⚠️ Hero видео не найдено на странице');
      return;
    }
    this.heroVideo = heroVideo;


    // Проверяем, есть ли уже адаптивные источники
    if (heroVideo.querySelector('source[media]')) {
      this.ensureHeroAttributes(heroVideo);
      this.ensurePlayback(heroVideo);
      return; // Уже настроено
    }

    const { desktop, mobile } = this.getHeroSources(heroVideo);

    // Сначала очищаем старые источники
    heroVideo.removeAttribute('src');
    const existingSources = heroVideo.querySelectorAll('source');
    existingSources.forEach((s) => s.remove());

    // Desktop источник (fallback)
    const desktopSource = document.createElement('source');
    desktopSource.src = desktop || 'public/works/шоурил.mp4';
    desktopSource.type = 'video/mp4';
    desktopSource.setAttribute('data-quality', 'desktop');

    // Мобильный источник (если указан)
    if (mobile) {
      const mobileSource = document.createElement('source');
      mobileSource.src = mobile;
      mobileSource.type = 'video/mp4';
      mobileSource.media = '(max-width: 900px)';
      mobileSource.setAttribute('data-mobile', 'true');
      heroVideo.appendChild(mobileSource);
    }

    heroVideo.appendChild(desktopSource);

    // Добавляем poster изображение если его нет (с проверкой существования)
    const posterUrl =
      heroVideo.getAttribute('poster') ||
      heroVideo.dataset.poster ||
      'public/works/hero-poster.jpg';
    heroVideo.setAttribute('poster', posterUrl);

    this.ensureHeroAttributes(heroVideo);

    // Запускаем сразу, не ждём requestAnimationFrame
    const initVideo = () => {
      heroVideo.load();
      
      // Убеждаемся, что видео muted для автозапуска
      heroVideo.muted = true;
      heroVideo.setAttribute('muted', '');
      
      // Всегда пытаемся запустить видео, даже если autoplay не сработал
      // Это критичный элемент дизайна, должен запускаться всегда
      this.ensurePlayback(heroVideo);
      
      // Явно запускаем для Яндекса и других браузеров
      if (this.isYandex) {
        heroVideo.play().catch(() => {});
        setTimeout(() => heroVideo.play().catch(() => {}), 300);
        setTimeout(() => heroVideo.play().catch(() => {}), 800);
      }
      
      // Дополнительные попытки для всех браузеров
      heroVideo.addEventListener('loadeddata', () => {
        heroVideo.play().catch(() => {});
      }, { once: true });
      
      heroVideo.addEventListener('canplay', () => {
        heroVideo.play().catch(() => {});
      }, { once: true });
      
      heroVideo.addEventListener('canplaythrough', () => {
        heroVideo.play().catch(() => {});
      }, { once: true });
    };

    // Запускаем сразу, если DOM готов
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initVideo, { once: true });
    } else {
      // Используем requestAnimationFrame для синхронизации с рендерингом
      requestAnimationFrame(initVideo);
    }
  }

  initHeroControls() {
    const video = this.heroVideo || document.getElementById('hero-reel-video');
    const controls = document.getElementById('hero-controls');
    if (!video || !controls) return;

    this.heroVideo = video;

    const playBtn = document.getElementById('hero-control-play');
    const restartBtn = document.getElementById('hero-control-restart');
    const volumeBtn = document.getElementById('hero-control-volume');
    const qualityBtn = document.getElementById('hero-control-quality');
    const speedBtn = document.getElementById('hero-control-speed');
    const speedLabel = document.getElementById('hero-speed-label');
    const fullscreenBtn = document.getElementById('hero-control-fullscreen');
    const progressTrack = document.getElementById('hero-progress-track');
    const progressFill = document.getElementById('hero-progress-fill');
    const progressTime = document.getElementById('hero-progress-time');
    const heroContainer = document.getElementById('hero-reel-container');
    const isTouch =
      'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0;
    let hideControlsTimeout = null;
    const speedMenu = document.getElementById('hero-speed-menu');
    const qualityMenu = document.getElementById('hero-quality-menu');

    const speedSteps = [1, 1.25, 1.5, 0.75];
    let speedIndex = 0;
    let qualityIndex = 0;
    const qualityStates = ['AUTO', 'HD', 'SD'];

    const formatTime = (time) => {
      if (!isFinite(time)) return '00:00';
      const m = Math.floor(time / 60)
        .toString()
        .padStart(2, '0');
      const s = Math.floor(time % 60)
        .toString()
        .padStart(2, '0');
      return `${m}:${s}`;
    };

    const syncPlayState = () => {
      if (!playBtn) return;
      const icon = playBtn.querySelector('i');
      if (video.paused) {
        icon.className = 'fas fa-play';
        playBtn.setAttribute('aria-label', 'Воспроизвести');
      } else {
        icon.className = 'fas fa-pause';
        playBtn.setAttribute('aria-label', 'Пауза');
      }
    };

    const updateProgress = () => {
      if (!progressFill || !progressTrack || !progressTime) return;
      const duration = video.duration || 0;
      const current = video.currentTime || 0;
      const percent = duration ? Math.min(100, (current / duration) * 100) : 0;
      progressFill.style.width = `${percent}%`;
      progressTrack.setAttribute('aria-valuenow', percent.toFixed(1));
      progressTime.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
    };

    const updateVolumeIcon = () => {
      if (!volumeBtn) return;
      const icon = volumeBtn.querySelector('i');
      if (!icon) return;
      icon.className = video.muted || video.volume === 0 ? 'fas fa-volume-mute' : 'fas fa-volume-up';
    };

    const updateSpeedLabel = () => {
      if (speedLabel) speedLabel.textContent = `${video.playbackRate.toFixed(2).replace(/\.00$/, '')}x`.replace('.50', '.5');
    };

    const updateFullscreenIcon = () => {
      if (fullscreenBtn) {
        const icon = fullscreenBtn.querySelector('i');
        if (icon) {
          const inFs = !!document.fullscreenElement;
          icon.className = inFs ? 'fas fa-compress' : 'fas fa-expand';
        }
      }

      // Прячем надписи и кнопки в герое, когда видео раскрыто на весь экран
      if (heroContainer) {
        const inFs = !!document.fullscreenElement;
        const isHeroFs =
          document.fullscreenElement === heroContainer ||
          document.fullscreenElement === video;

        if (inFs && isHeroFs) {
          heroContainer.classList.add('hero-fullscreen-active');
        } else {
          heroContainer.classList.remove('hero-fullscreen-active');
        }
      }
    };

    const updateQualityLabel = () => {
      if (!qualityBtn) return;
      const icon = qualityBtn.querySelector('i');
      if (!icon) return;
      icon.className = 'fas fa-cog';
      qualityBtn.title = `Качество: ${qualityStates[qualityIndex]}`;
    };

    const scheduleHideControls = () => {
      if (!controls) return;
      clearTimeout(hideControlsTimeout);
      hideControlsTimeout = setTimeout(() => {
        const hovering =
          controls.matches(':hover') || heroContainer?.matches(':hover');
        if (hovering) {
          scheduleHideControls();
          return;
        }
        controls.classList.remove('is-active');
      }, 2400);
    };

    const bumpControls = () => {
      if (!controls) return;
      controls.classList.add('is-active');
      scheduleHideControls();
    };

    const hideMenus = () => {
      speedMenu?.classList.remove('visible');
      qualityMenu?.classList.remove('visible');
    };

    const toggleMenu = (menuEl) => {
      if (!menuEl) return;
      const willShow = !menuEl.classList.contains('visible');
      hideMenus();
      if (willShow) {
        menuEl.classList.add('visible');
      }
    };

    const seekTo = (clientX) => {
      const rect = progressTrack.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      const duration = video.duration || 0;
      video.currentTime = ratio * duration;
    };

    playBtn?.addEventListener('click', () => {
      if (video.paused) {
        video.play();
      } else {
        video.pause();
      }
      bumpControls();
    });

    restartBtn?.addEventListener('click', () => {
      video.currentTime = 0;
      video.play();
      bumpControls();
    });

    volumeBtn?.addEventListener('click', () => {
      video.muted = !video.muted;
      updateVolumeIcon();
      bumpControls();
    });

    speedBtn?.addEventListener('click', () => {
      toggleMenu(speedMenu);
      bumpControls();
    });

    qualityBtn?.addEventListener('click', () => {
      toggleMenu(qualityMenu);
      bumpControls();
    });

    speedMenu?.addEventListener('click', (e) => {
      const target = e.target.closest('[data-speed]');
      if (!target) return;
      const value = parseFloat(target.dataset.speed || '1');
      video.playbackRate = value;
      speedIndex = Math.max(0, speedSteps.indexOf(value));
      updateSpeedLabel();
      hideMenus();
      bumpControls();
    });

    qualityMenu?.addEventListener('click', (e) => {
      const target = e.target.closest('[data-quality]');
      if (!target) return;
      const quality = target.dataset.quality || 'auto';
      qualityIndex = Math.max(0, qualityStates.indexOf(quality.toUpperCase()));
      updateQualityLabel();
      hideMenus();
      bumpControls();
    });

    fullscreenBtn?.addEventListener('click', () => {
      const target = heroContainer || video;
      const inFs = !!document.fullscreenElement;
      if (!inFs && target?.requestFullscreen) {
        target.requestFullscreen();
      } else if (inFs && document.exitFullscreen) {
        document.exitFullscreen();
      }
      bumpControls();
    });

    document.addEventListener('fullscreenchange', updateFullscreenIcon);

    progressTrack?.addEventListener('click', (e) => {
      seekTo(e.clientX);
      bumpControls();
    });

    progressTrack?.addEventListener('keydown', (e) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const step = video.duration ? video.duration * 0.02 : 1;
      if (e.key === 'ArrowLeft') video.currentTime = Math.max(0, video.currentTime - step);
      if (e.key === 'ArrowRight') video.currentTime = Math.min(video.duration, video.currentTime + step);
      if (e.key === 'Home') video.currentTime = 0;
      if (e.key === 'End') video.currentTime = video.duration || video.currentTime;
      bumpControls();
    });

    video.addEventListener('loadedmetadata', updateProgress);
    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('play', syncPlayState);
    video.addEventListener('pause', syncPlayState);
    video.addEventListener('ended', syncPlayState);
    video.addEventListener('volumechange', updateVolumeIcon);

    // Начальная синхронизация
    syncPlayState();
    updateProgress();
    updateVolumeIcon();
    updateSpeedLabel();
    updateFullscreenIcon();
    updateQualityLabel();

    if (!isTouch) {
      const moveHandler = () => bumpControls();
      heroContainer?.addEventListener('mousemove', moveHandler);
      controls?.addEventListener('mousemove', moveHandler);
      controls?.addEventListener('focusin', bumpControls);
      controls?.addEventListener('mouseleave', scheduleHideControls);
      heroContainer?.addEventListener('mouseleave', scheduleHideControls);
      bumpControls();
    } else {
      // На тач-устройствах показываем контролы по тапу и автоскрываем их
      const tapHandler = () => {
        bumpControls();
      };
      heroContainer?.addEventListener('click', tapHandler);
      video.addEventListener('click', tapHandler);
    }

    document.addEventListener('click', (e) => {
      if (
        e.target.closest('#hero-control-speed') ||
        e.target.closest('#hero-control-quality') ||
        e.target.closest('#hero-speed-menu') ||
        e.target.closest('#hero-quality-menu')
      ) {
        return;
      }
      hideMenus();
    });
  }

  /**
   * Lazy loading для видео в портфолио
   */
  setupLazyLoading() {
    const portfolioVideos = document.querySelectorAll('.projects-reel-video');
    
    if ('IntersectionObserver' in window) {
      const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const video = entry.target;
            this.loadVideo(video);
            videoObserver.unobserve(video);
          }
        });
      }, {
        rootMargin: '50px' // Начинаем загрузку за 50px до появления
      });

      portfolioVideos.forEach(video => {
        // Не устанавливаем poster автоматически - он должен быть указан в HTML
        // если файл существует. Это предотвращает 404 ошибки для несуществующих файлов.
        
        // Обрабатываем ошибки загрузки poster, чтобы они не засоряли консоль
        if (video.hasAttribute('poster')) {
          const posterUrl = video.getAttribute('poster');
          video.addEventListener('error', (e) => {
            // Если ошибка связана с poster, просто игнорируем её
            if (e.target === video && video.networkState === video.NETWORK_NO_SOURCE) {
              // Это может быть ошибка poster, но не критично
              return;
            }
          }, { once: true });
        }
        
        video.setAttribute('preload', 'none'); // Не загружаем до появления
        videoObserver.observe(video);
      });
    } else {
      // Fallback для старых браузеров
      portfolioVideos.forEach(video => {
        this.loadVideo(video);
      });
    }
  }

  /**
   * Загрузка видео
   */
  loadVideo(video) {
    if (video.readyState === 0) {
      video.load();
    }
  }

  /**
   * Стратегия предзагрузки
   */
  setupPreloadStrategy() {
    // Предзагружаем poster изображение для hero видео
    const heroVideo =
      this.heroVideo || document.getElementById('hero-reel-video');
    if (heroVideo) this.heroVideo = heroVideo;
    if (heroVideo && heroVideo.hasAttribute('poster')) {
      const posterUrl = heroVideo.getAttribute('poster');
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = posterUrl;
      document.head.appendChild(link);
    }

    // На мобильных предзагружаем только после загрузки страницы
    if (this.isMobile) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const heroVideo =
            this.heroVideo || document.getElementById('hero-reel-video');
          if (!heroVideo) return;
          if (this.saveData || this.slowNetwork) return;
          heroVideo.setAttribute('preload', 'auto');
          heroVideo.preload = 'auto';
          heroVideo.load();
        }, 1000); // Задержка 1 секунда
      });
    }
  }

  /**
   * Обработка ошибок загрузки видео
   */
  setupErrorHandling() {
    const videos = document.querySelectorAll('video');
    
    videos.forEach(video => {
      video.addEventListener('error', (e) => {
        const desktopSource = video.querySelector('source[data-quality="desktop"]');
        const mobileSources = video.querySelectorAll('source[data-mobile]');
        const isHero = video.id === 'hero-reel-video';

        // Для hero сначала пытаемся упасть на desktop, если мобильный не загрузился
        if (isHero && desktopSource && !video.dataset.heroFallbackTried) {
          video.dataset.heroFallbackTried = 'true';
          mobileSources.forEach((s) => s.remove());
          video.load();
          const playPromise = video.play();
          if (playPromise && playPromise.catch) {
            playPromise.catch(() => {});
          }
          console.warn('Hero video: mobile источник недоступен, переключаемся на desktop');
          return;
        }

        console.warn('Ошибка загрузки видео:', video.src || video.currentSrc);
        
        // Показываем poster изображение при ошибке
        if (video.hasAttribute('poster')) {
          const poster = video.getAttribute('poster');
          const img = document.createElement('img');
          img.src = poster;
          img.alt = 'Видео недоступно';
          img.style.width = '100%';
          img.style.height = '100%';
          img.style.objectFit = 'cover';
          
          video.parentNode.insertBefore(img, video);
          video.style.display = 'none';
        }
      });

      // Показываем индикатор загрузки
      video.addEventListener('loadstart', () => {
        this.showLoadingIndicator(video);
      });

      video.addEventListener('canplay', () => {
        this.hideLoadingIndicator(video);
      });
    });
  }

  /**
   * Показать индикатор загрузки
   */
  showLoadingIndicator(video) {
    if (video.parentNode.querySelector('.video-loading')) return;
    
    const indicator = document.createElement('div');
    indicator.className = 'video-loading';
    indicator.innerHTML = '<div class="video-loading-spinner"></div>';
    video.parentNode.appendChild(indicator);
  }

  /**
   * Скрыть индикатор загрузки
   */
  hideLoadingIndicator(video) {
    const indicator = video.parentNode.querySelector('.video-loading');
    if (indicator) {
      indicator.remove();
    }
  }

  /**
   * Оптимизация для медленных соединений
   */
  optimizeForSlowConnection() {
    // Автовоспроизведение сохраняем даже на медленных сетях (требование заказчика).
    // Ограничиваемся только лёгким preload на слабых соединениях (выставляется в ensureHeroAttributes).
  }
}

// Инициализация при загрузке DOM (защита от дублирования)
if (!window.videoOptimizerInitialized) {
  window.videoOptimizerInitialized = true;
  
  const initVideoOptimizer = () => {
    if (window.videoOptimizer) {
      console.warn('⚠️ VideoOptimizer уже инициализирован, пропускаем повторную инициализацию');
      return;
    }

    window.videoOptimizer = new VideoOptimizer();

  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVideoOptimizer);
  } else {
    // Если DOM уже готов, запускаем сразу
    initVideoOptimizer();
  }
} else {
  console.warn('⚠️ Попытка повторной инициализации VideoOptimizer заблокирована');
}

// Экспорт для использования в других модулях
window.VideoOptimizer = VideoOptimizer;
