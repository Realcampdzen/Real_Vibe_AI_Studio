/**
 * Managed video loading for hero/detail reels and lazy portfolio clips.
 */

class VideoOptimizer {
  constructor() {
    this.connection =
      navigator.connection ||
      navigator.mozConnection ||
      navigator.webkitConnection;
    this.prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.mobileQuery = window.matchMedia
      ? window.matchMedia('(max-width: 900px)')
      : null;
    this.states = new WeakMap();
    this.heroVideo = document.getElementById('hero-reel-video');
    this.heroOffscreenPauseDelayMs = 1200;
    this.resumeAttemptMinGapMs = 700;
    this.viewportRefreshQueued = false;
    this.init();
  }

  init() {
    this.refresh();
    this.initHeroControls();
    this.setupPortfolioLazyLoading();
    this.observeDynamicVideos();

    document.addEventListener('visibilitychange', () => {
      this.refreshVisiblePlayback();
    });
    window.addEventListener('pageshow', () => this.refreshVisiblePlayback());
    window.addEventListener('focus', () => this.refreshVisiblePlayback());
    this.setupViewportPlaybackRefresh();
  }

  normalizeSrc(src) {
    if (!src) return '';
    try {
      return encodeURI(decodeURI(src));
    } catch (e) {
      return src;
    }
  }

  isPrimaryHero(video) {
    return video?.id === 'hero-reel-video';
  }

  isElementVisible(element, threshold = 0.15) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const visibleHeight = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
    const visibleWidth = Math.min(rect.right, window.innerWidth) - Math.max(rect.left, 0);
    if (visibleHeight <= 0 || visibleWidth <= 0) return false;
    const area = rect.width * rect.height;
    if (!area) return false;
    return (visibleHeight * visibleWidth) / area >= threshold;
  }

  suppressInternalPause(video, duration = 1800) {
    const state = this.states.get(video);
    if (!state) return;
    const until = performance.now() + duration;
    state.suppressPauseUntil = Math.max(state.suppressPauseUntil || 0, until);
  }

  clearVisibilityPause(state) {
    if (state?.visibilityPauseTimer) {
      clearTimeout(state.visibilityPauseTimer);
      state.visibilityPauseTimer = null;
    }
  }

  pauseVideoInternally(video) {
    const state = this.states.get(video);
    if (!state || video.paused) return;

    state.controllerPaused = true;
    state.pausedByVisibility = true;
    this.suppressInternalPause(video);
    video.pause();
    state.pausedByVisibility = false;
  }

  canAutoplayVisible(video, state) {
    if (!video || !state) return false;
    if (!state.shouldAutoplay || state.userPaused) return false;
    if (document.visibilityState !== 'visible' || video.error) return false;

    const threshold = this.isPrimaryHero(video) ? 0.1 : 0.15;
    if (!state.visible && !this.isElementVisible(video, threshold)) return false;
    return true;
  }

  scheduleGuardedResume(video, reason = 'resume', delay = 0) {
    const state = this.states.get(video);
    if (!state) return;

    if (state.resumeTimer) {
      clearTimeout(state.resumeTimer);
    }

    state.resumeTimer = setTimeout(() => {
      state.resumeTimer = null;
      this.guardedResume(video, reason);
    }, delay);
  }

  guardedResume(video, reason = 'resume') {
    const state = this.states.get(video);
    if (!this.canAutoplayVisible(video, state) || !video.paused) return;

    const now = performance.now();
    if (state.lastResumeAttempt && now - state.lastResumeAttempt < this.resumeAttemptMinGapMs) {
      return;
    }

    state.lastResumeAttempt = now;
    this.playVideo(video);
  }

  scheduleVisibilityPause(video) {
    const state = this.states.get(video);
    if (!state) return;

    this.clearVisibilityPause(state);
    const delay = this.isPrimaryHero(video) ? this.heroOffscreenPauseDelayMs : 0;

    state.visibilityPauseTimer = setTimeout(() => {
      state.visibilityPauseTimer = null;

      const threshold = this.isPrimaryHero(video) ? 0.1 : 0.01;
      if (this.isElementVisible(video, threshold)) {
        state.visible = true;
        this.scheduleGuardedResume(video, 'visibility-recheck');
        return;
      }

      state.visible = false;
      state.wasPlayingBeforeHidden = !video.paused;
      this.pauseVideoInternally(video);
    }, delay);
  }

  setupViewportPlaybackRefresh() {
    const schedule = () => {
      if (this.viewportRefreshQueued) return;
      this.viewportRefreshQueued = true;
      requestAnimationFrame(() => {
        this.viewportRefreshQueued = false;
        this.refreshVisiblePlayback({ refreshDom: false });
      });
    };

    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
  }

  prepareLazyVideoSource(video) {
    const source = video.querySelector('source[src]');
    if (source && !video.dataset.src) {
      video.dataset.src = source.getAttribute('src') || '';
      video.dataset.type = source.type || 'video/mp4';
    }
    if (source) source.remove();
    video.removeAttribute('src');
    if (!video.dataset.sourceAttached) {
      video.dataset.sourceAttached = video.dataset.src ? '0' : '1';
    }
  }

  ensureLazyVideoSource(video) {
    if (!video || video.dataset.sourceAttached === '1') return;
    if (video.getAttribute('src') || video.querySelector('source[src]')) {
      video.dataset.sourceAttached = '1';
      return;
    }
    const src = video.dataset.src;
    if (!src) return;
    const source = document.createElement('source');
    source.src = this.normalizeSrc(src);
    source.type = video.dataset.type || 'video/mp4';
    video.appendChild(source);
    video.dataset.sourceAttached = '1';
  }

  isMobile() {
    return this.mobileQuery ? this.mobileQuery.matches : window.innerWidth <= 900;
  }

  networkAllowsAutoPreload() {
    if (!this.connection) return true;
    if (this.connection.saveData) return false;
    return !['slow-2g', '2g', '3g'].includes(this.connection.effectiveType);
  }

  refresh() {
    document
      .querySelectorAll('video[data-managed-video], #hero-reel-video, .hero-reel video')
      .forEach((video) => this.setupManagedVideo(video));
  }

  observeDynamicVideos() {
    if (!('MutationObserver' in window)) return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach(({ addedNodes }) => {
        addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.matches?.('video')) {
            this.setupManagedVideo(node);
          }
          node
            .querySelectorAll?.('video[data-managed-video], #hero-reel-video, .hero-reel video')
            .forEach((video) => this.setupManagedVideo(video));
        });
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  getSourceConfig(video) {
    const desktopMp4 =
      video.dataset.desktopSrc ||
      video.querySelector('source[type="video/mp4"]:not([media])')?.getAttribute('src') ||
      video.querySelector('source[type="video/mp4"]')?.getAttribute('src') ||
      video.getAttribute('src') ||
      '';
    const desktopWebm = video.dataset.desktopWebmSrc || '';
    const mobileMp4 = video.dataset.mobileSrc || '';

    if (!desktopMp4 && !desktopWebm && !mobileMp4) return null;

    return {
      desktopMp4: this.normalizeSrc(desktopMp4),
      desktopWebm: this.normalizeSrc(desktopWebm),
      mobileMp4: this.normalizeSrc(mobileMp4),
    };
  }

  applySources(video, { load = true } = {}) {
    if (video.dataset.sourcesApplied === '1') return;
    const sources = this.getSourceConfig(video);
    if (!sources) return;

    const existingSrc = video.currentSrc || video.getAttribute('src') || '';
    const preferred = this.isMobile()
      ? sources.mobileMp4 || sources.desktopMp4 || sources.desktopWebm
      : sources.desktopWebm || sources.desktopMp4 || sources.mobileMp4;

    if (existingSrc && preferred && existingSrc.includes(preferred)) {
      video.dataset.sourcesApplied = '1';
      return;
    }

    video.removeAttribute('src');
    video.querySelectorAll('source').forEach((source) => source.remove());

    if (sources.mobileMp4) {
      const mobile = document.createElement('source');
      mobile.src = sources.mobileMp4;
      mobile.type = 'video/mp4';
      mobile.media = '(max-width: 900px)';
      mobile.dataset.mobile = 'true';
      video.appendChild(mobile);
    }

    if (sources.desktopWebm) {
      const webm = document.createElement('source');
      webm.src = sources.desktopWebm;
      webm.type = 'video/webm';
      webm.dataset.quality = 'desktop';
      video.appendChild(webm);
    }

    if (sources.desktopMp4) {
      const mp4 = document.createElement('source');
      mp4.src = sources.desktopMp4;
      mp4.type = 'video/mp4';
      mp4.dataset.quality = 'desktop';
      video.appendChild(mp4);
    }

    video.dataset.sourcesApplied = '1';
    if (load) {
      this.suppressInternalPause(video);
      video.load();
    }
  }

  setupManagedVideo(video) {
    if (!video || video.dataset.videoOptimizerReady === '1') return;

    video.dataset.videoOptimizerReady = '1';
    if (video.id === 'hero-reel-video') this.heroVideo = video;

    const shouldAutoplay = video.dataset.autoplayDesktop !== 'false';
    const state = {
      visible: false,
      userPaused: !shouldAutoplay,
      shouldAutoplay,
      pausedByVisibility: false,
      wasPlayingBeforeHidden: false,
      suppressPauseUntil: 0,
      visibilityPauseTimer: null,
      resumeTimer: null,
      lastResumeAttempt: 0,
      controllerPaused: false,
    };
    this.states.set(video, state);

    video.preload = 'metadata';
    video.setAttribute('preload', 'metadata');
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.defaultMuted = true;
    video.muted = true;
    video.setAttribute('muted', '');

    if (shouldAutoplay) {
      video.autoplay = true;
      video.setAttribute('autoplay', '');
    } else {
      video.autoplay = false;
      video.removeAttribute('autoplay');
    }

    this.setupManagedVideoEvents(video);
    this.observeVideoVisibility(video);

    if (this.isPrimaryHero(video) || this.isElementVisible(video)) {
      this.applySources(video);
    }
  }

  setupManagedVideoEvents(video) {
    video.addEventListener('play', () => {
      const state = this.states.get(video);
      if (state) {
        state.userPaused = false;
        state.controllerPaused = false;
      }
      this.hideLoadingIndicator(video);
    });

    video.addEventListener('pause', () => {
      const state = this.states.get(video);
      if (!state) return;
      if (state.controllerPaused) return;
      if (state.suppressPauseUntil && performance.now() < state.suppressPauseUntil) return;
      if (
        !state.pausedByVisibility &&
        state.visible &&
        document.visibilityState === 'visible'
      ) {
        if (this.isPrimaryHero(video) && state.shouldAutoplay && !state.userPaused && !video.error) {
          this.scheduleGuardedResume(video, 'unexpected-pause', 250);
          return;
        }
        state.userPaused = true;
      }
    });

    video.addEventListener('waiting', () => this.showLoadingIndicator(video));
    video.addEventListener('stalled', () => this.showLoadingIndicator(video));
    video.addEventListener('canplay', () => {
      this.hideLoadingIndicator(video);
      const state = this.states.get(video);
      if (state?.visible && state.shouldAutoplay && !state.userPaused) {
        this.scheduleGuardedResume(video, 'canplay');
      }
    });
    video.addEventListener('playing', () => this.hideLoadingIndicator(video));
  }

  observeVideoVisibility(video) {
    if (!('IntersectionObserver' in window)) {
      this.handleVideoVisibility(video, true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          this.handleVideoVisibility(video, entry.isIntersecting);
        });
      },
      {
        threshold: video.id === 'hero-reel-video' ? 0.25 : 0.15,
        rootMargin: video.id === 'hero-reel-video' ? '0px' : '200px 0px',
      }
    );

    observer.observe(video);
  }

  handleVideoVisibility(video, isVisible) {
    const state = this.states.get(video);
    if (!state) return;

    if (!isVisible) {
      this.scheduleVisibilityPause(video);
      return;
    }

    this.clearVisibilityPause(state);
    state.visible = true;
    state.wasPlayingBeforeHidden = false;

    if (this.networkAllowsAutoPreload()) {
      if (video.dataset.sourcesApplied !== '1') {
        this.applySources(video, { load: false });
      }
      video.preload = 'auto';
      video.setAttribute('preload', 'auto');
      if (video.networkState === HTMLMediaElement.NETWORK_EMPTY) {
        this.suppressInternalPause(video);
        video.load();
      }
    }

    if (
      state.shouldAutoplay &&
      !state.userPaused &&
      !this.prefersReducedMotion &&
      document.visibilityState === 'visible'
    ) {
      this.scheduleGuardedResume(video, 'visible');
    }
  }

  playVideo(video) {
    if (!video || document.visibilityState === 'hidden') return Promise.resolve();

    if (video.dataset.sourcesApplied !== '1') {
      this.applySources(video, { load: false });
    }

    if (video.networkState === HTMLMediaElement.NETWORK_EMPTY) {
      this.suppressInternalPause(video);
      video.load();
    }

    const playPromise = video.play();
    if (!playPromise || !playPromise.catch) return Promise.resolve();

    return playPromise.catch((err) => {
      if (err?.name !== 'AbortError') {
        console.warn('Video playback was blocked:', err?.name || err);
      }
    });
  }

  refreshVisiblePlayback({ refreshDom = true } = {}) {
    if (refreshDom) this.refresh();
    document
      .querySelectorAll('video[data-video-optimizer-ready="1"]')
      .forEach((video) => {
        const state = this.states.get(video);
        if (!state) return;
        if (document.visibilityState === 'hidden') {
          this.clearVisibilityPause(state);
          state.wasPlayingBeforeHidden = !video.paused;
          this.pauseVideoInternally(video);
          return;
        }
        const isVisible = this.isElementVisible(video, this.isPrimaryHero(video) ? 0.1 : 0.15);
        if (isVisible) {
          this.clearVisibilityPause(state);
          state.visible = true;
        } else if (state.visible) {
          this.scheduleVisibilityPause(video);
        }
        if (state.visible && state.shouldAutoplay && !state.userPaused) {
          this.scheduleGuardedResume(video, 'refresh');
        }
      });
  }

  initHeroControls() {
    const video = this.heroVideo || document.getElementById('hero-reel-video');
    const controls = document.getElementById('hero-controls');
    if (!video || !controls) return;

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
    const speedMenu = document.getElementById('hero-speed-menu');
    const qualityMenu = document.getElementById('hero-quality-menu');
    const isTouch = 'ontouchstart' in window || (navigator.maxTouchPoints || 0) > 0;
    const qualityStates = ['AUTO', 'HD', 'SD'];
    let qualityIndex = 0;
    let hideControlsTimeout = null;

    const getState = () => this.states.get(video);
    const formatTime = (time) => {
      if (!Number.isFinite(time)) return '00:00';
      const minutes = Math.floor(time / 60).toString().padStart(2, '0');
      const seconds = Math.floor(time % 60).toString().padStart(2, '0');
      return `${minutes}:${seconds}`;
    };
    const controlsAreUseful = () => {
      const state = getState();
      return (
        !!document.fullscreenElement ||
        !!state?.visible ||
        controls.classList.contains('is-active') ||
        !!controls.matches(':hover') ||
        !!heroContainer?.matches(':hover')
      );
    };
    const syncPlayState = () => {
      const icon = playBtn?.querySelector('i');
      if (!icon || !playBtn) return;
      icon.className = video.paused ? 'fas fa-play' : 'fas fa-pause';
      playBtn.setAttribute('aria-label', video.paused ? 'Воспроизвести' : 'Пауза');
    };
    const updateProgress = (force = false) => {
      if (!force && !controlsAreUseful()) return;
      if (!progressFill || !progressTrack || !progressTime) return;
      const duration = video.duration || 0;
      const current = video.currentTime || 0;
      const percent = duration ? Math.min(100, (current / duration) * 100) : 0;
      progressFill.style.width = `${percent}%`;
      progressTrack.setAttribute('aria-valuenow', percent.toFixed(1));
      progressTime.textContent = `${formatTime(current)} / ${formatTime(duration)}`;
    };
    const updateVolumeIcon = () => {
      const icon = volumeBtn?.querySelector('i');
      if (!icon) return;
      icon.className = video.muted || video.volume === 0 ? 'fas fa-volume-mute' : 'fas fa-volume-up';
      volumeBtn.setAttribute('aria-pressed', (!video.muted && video.volume > 0).toString());
      volumeBtn.setAttribute('aria-label', video.muted || video.volume === 0 ? 'Включить звук' : 'Выключить звук');
    };
    const updateSpeedLabel = () => {
      if (!speedLabel) return;
      speedLabel.textContent = `${video.playbackRate.toFixed(2).replace(/\.00$/, '')}x`.replace('.50', '.5');
    };
    const updateFullscreenIcon = () => {
      const icon = fullscreenBtn?.querySelector('i');
      if (icon) icon.className = document.fullscreenElement ? 'fas fa-compress' : 'fas fa-expand';
      const isHeroFullscreen =
        document.fullscreenElement === heroContainer || document.fullscreenElement === video;
      heroContainer?.classList.toggle('hero-fullscreen-active', !!isHeroFullscreen);
    };
    const updateQualityLabel = () => {
      if (!qualityBtn) return;
      qualityBtn.title = `Качество: ${qualityStates[qualityIndex]}`;
    };
    const hideMenus = () => {
      speedMenu?.classList.remove('visible');
      qualityMenu?.classList.remove('visible');
    };
    const scheduleHideControls = () => {
      clearTimeout(hideControlsTimeout);
      hideControlsTimeout = setTimeout(() => {
        const hovering = controls.matches(':hover') || heroContainer?.matches(':hover');
        if (hovering) {
          scheduleHideControls();
          return;
        }
        controls.classList.remove('is-active');
      }, 2400);
    };
    const bumpControls = () => {
      controls.classList.add('is-active');
      updateProgress(true);
      scheduleHideControls();
    };
    const toggleMenu = (menuEl) => {
      if (!menuEl) return;
      const willShow = !menuEl.classList.contains('visible');
      hideMenus();
      if (willShow) menuEl.classList.add('visible');
    };
    const seekTo = (clientX) => {
      if (!progressTrack || !video.duration) return;
      const rect = progressTrack.getBoundingClientRect();
      const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
      video.currentTime = ratio * video.duration;
    };
    const toggleSoundFromSurface = (event) => {
      if (
        event.target.closest('button') ||
        event.target.closest('a') ||
        event.target.closest('#hero-controls') ||
        event.target.closest('.hero-menu')
      ) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      video.muted = !video.muted;
      if (!video.muted) {
        video.volume = 1;
        this.playVideo(video);
      }
      updateVolumeIcon();
      bumpControls();
    };

    playBtn?.addEventListener('click', () => {
      const state = getState();
      if (video.paused) {
        if (state) state.userPaused = false;
        this.playVideo(video);
      } else {
        if (state) state.userPaused = true;
        video.pause();
      }
      bumpControls();
    });
    restartBtn?.addEventListener('click', () => {
      const state = getState();
      if (state) state.userPaused = false;
      video.currentTime = 0;
      this.playVideo(video);
      bumpControls();
    });
    volumeBtn?.addEventListener('click', () => {
      video.muted = !video.muted;
      if (!video.muted) {
        video.volume = 1;
        this.playVideo(video);
      }
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
    fullscreenBtn?.addEventListener('click', () => {
      const target = heroContainer || video;
      if (!document.fullscreenElement && target?.requestFullscreen) {
        target.requestFullscreen();
      } else if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen();
      }
      bumpControls();
    });
    progressTrack?.addEventListener('click', (event) => {
      seekTo(event.clientX);
      bumpControls();
    });
    progressTrack?.addEventListener('keydown', (event) => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const step = video.duration ? video.duration * 0.02 : 1;
      if (event.key === 'ArrowLeft') video.currentTime = Math.max(0, video.currentTime - step);
      if (event.key === 'ArrowRight') video.currentTime = Math.min(video.duration, video.currentTime + step);
      if (event.key === 'Home') video.currentTime = 0;
      if (event.key === 'End') video.currentTime = video.duration || video.currentTime;
      bumpControls();
    });
    speedMenu?.addEventListener('click', (event) => {
      const target = event.target.closest('[data-speed]');
      if (!target) return;
      video.playbackRate = parseFloat(target.dataset.speed || '1');
      updateSpeedLabel();
      hideMenus();
      bumpControls();
    });
    qualityMenu?.addEventListener('click', (event) => {
      const target = event.target.closest('[data-quality]');
      if (!target) return;
      qualityIndex = Math.max(0, qualityStates.indexOf((target.dataset.quality || 'auto').toUpperCase()));
      updateQualityLabel();
      hideMenus();
      bumpControls();
    });
    document.addEventListener('fullscreenchange', updateFullscreenIcon);
    document.addEventListener('click', (event) => {
      if (
        event.target.closest('#hero-control-speed') ||
        event.target.closest('#hero-control-quality') ||
        event.target.closest('#hero-speed-menu') ||
        event.target.closest('#hero-quality-menu')
      ) {
        return;
      }
      hideMenus();
    });

    video.addEventListener('loadedmetadata', () => updateProgress(true));
    video.addEventListener('durationchange', () => updateProgress(true));
    video.addEventListener('timeupdate', () => updateProgress(false));
    video.addEventListener('play', syncPlayState);
    video.addEventListener('pause', syncPlayState);
    video.addEventListener('ended', syncPlayState);
    video.addEventListener('volumechange', updateVolumeIcon);
    heroContainer?.addEventListener('click', toggleSoundFromSurface);

    if (!isTouch) {
      const moveHandler = () => bumpControls();
      heroContainer?.addEventListener('mousemove', moveHandler);
      controls.addEventListener('mousemove', moveHandler);
      controls.addEventListener('focusin', bumpControls);
      controls.addEventListener('mouseleave', scheduleHideControls);
      heroContainer?.addEventListener('mouseleave', scheduleHideControls);
      bumpControls();
    } else {
      heroContainer?.addEventListener('pointerdown', () => bumpControls(), { passive: true });
    }

    syncPlayState();
    updateProgress(true);
    updateVolumeIcon();
    updateSpeedLabel();
    updateFullscreenIcon();
    updateQualityLabel();
  }

  setupPortfolioLazyLoading() {
    const videos = document.querySelectorAll('.projects-reel-video');
    videos.forEach((video) => {
      this.prepareLazyVideoSource(video);
      video.preload = 'none';
      video.setAttribute('preload', 'none');
    });

    if (!('IntersectionObserver' in window)) {
      videos.forEach((video) => {
        this.ensureLazyVideoSource(video);
        video.preload = 'metadata';
        video.setAttribute('preload', 'metadata');
      });
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const video = entry.target;
          this.ensureLazyVideoSource(video);
          video.preload = 'metadata';
          video.setAttribute('preload', 'metadata');
          if (video.networkState === HTMLMediaElement.NETWORK_EMPTY) {
            video.load();
          }
          observer.unobserve(video);
        });
      },
      { rootMargin: '250px 0px' }
    );

    videos.forEach((video) => observer.observe(video));
  }

  showLoadingIndicator(video) {
    if (!video.parentNode || video.parentNode.querySelector('.video-loading')) return;
    const indicator = document.createElement('div');
    indicator.className = 'video-loading';
    indicator.appendChild(document.createElement('div')).className = 'video-loading-spinner';
    video.parentNode.appendChild(indicator);
  }

  hideLoadingIndicator(video) {
    const indicator = video.parentNode?.querySelector('.video-loading');
    if (indicator) indicator.remove();
  }
}

if (!window.videoOptimizerInitialized) {
  window.videoOptimizerInitialized = true;
  const initVideoOptimizer = () => {
    if (!window.videoOptimizer) {
      window.videoOptimizer = new VideoOptimizer();
    } else {
      window.videoOptimizer.refresh();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVideoOptimizer, { once: true });
  } else {
    initVideoOptimizer();
  }
}

window.VideoOptimizer = VideoOptimizer;
