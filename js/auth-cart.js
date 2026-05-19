(function initRealVibeAuthCart() {
  const state = {
    csrfToken: '',
    user: null,
    providers: { google: false, yandex: false, vk: false, telegram: false, telegramBotUsername: '' },
    cart: { items: [], itemCount: 0 },
    apiAvailable: true,
    activeAuthTab: 'login',
    returnToCart: false,
    lastOrder: null,
    cartBusy: false,
    orders: [],
    ordersLoaded: false,
    activeOrderId: null,
  };

  const refs = {};
  const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

  function createElement(tagName, options = {}) {
    const element = document.createElement(tagName);
    if (options.className) element.className = options.className;
    if (options.text !== undefined) element.textContent = String(options.text);
    if (options.attrs) {
      Object.entries(options.attrs).forEach(([name, value]) => {
        if (value !== undefined && value !== null) {
          element.setAttribute(name, String(value));
        }
      });
    }
    return element;
  }

  function appendChildren(parent, children) {
    children.filter(Boolean).forEach((child) => parent.appendChild(child));
    return parent;
  }

  function showToast(message) {
    if (!refs.toast) return;
    refs.toast.textContent = message;
    refs.toast.classList.add('is-visible');
    window.clearTimeout(refs.toastTimer);
    refs.toastTimer = window.setTimeout(() => {
      refs.toast?.classList.remove('is-visible');
    }, 3200);
  }

  async function apiFetch(path, options = {}) {
    const method = String(options.method || 'GET').toUpperCase();
    const headers = new Headers(options.headers || {});
    let body = options.body;

    if (body && typeof body === 'object' && !(body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
      body = JSON.stringify(body);
    }
    if (!safeMethods.has(method) && state.csrfToken) {
      headers.set('X-RV-CSRF', state.csrfToken);
    }

    const response = await fetch(path, {
      ...options,
      method,
      headers,
      body,
      credentials: 'same-origin',
    });

    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json') ? await response.json() : null;
    if (!response.ok) {
      const error = new Error(payload?.error || 'Сервис временно недоступен');
      error.status = response.status;
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  async function loadSession() {
    const session = await apiFetch('/api/auth/session');
    state.csrfToken = session.csrfToken || '';
    state.user = session.user || null;
    state.providers = session.providers || state.providers;
    state.apiAvailable = session.available !== false && Boolean(session.csrfToken);
    renderAuthState();
  }

  async function loadCart() {
    const payload = await apiFetch('/api/cart');
    state.cart = payload.cart || { items: [], itemCount: 0 };
    state.apiAvailable = payload.available !== false && state.apiAvailable;
    renderCart();
  }

  async function loadOrders({ force = false } = {}) {
    if (!state.user) {
      state.orders = [];
      state.ordersLoaded = false;
      return;
    }
    if (state.ordersLoaded && !force) return;
    const payload = await apiFetch('/api/orders/my');
    state.orders = payload.orders || [];
    state.ordersLoaded = true;
  }

  function openModal(element) {
    if (!element) return;
    element.hidden = false;
    element.setAttribute('aria-hidden', 'false');
    document.body.classList.add('rv-overlay-open');
    requestAnimationFrame(() => element.classList.add('is-open'));
  }

  function hasOpenOverlay(exceptElement = null) {
    return [refs.authModal, refs.cartDrawer, refs.accountDrawer].some((element) => {
      return element && element !== exceptElement && element.classList.contains('is-open');
    });
  }

  function closeModal(element) {
    if (!element) return;
    element.classList.remove('is-open');
    element.setAttribute('aria-hidden', 'true');
    if (!hasOpenOverlay(element)) {
      document.body.classList.remove('rv-overlay-open');
    }
    window.setTimeout(() => {
      if (!element.classList.contains('is-open')) element.hidden = true;
    }, 180);
  }

  function openAuth(tab = 'login') {
    state.returnToCart = refs.cartDrawer?.classList.contains('is-open') || state.returnToCart;
    state.activeAuthTab = tab;
    renderAuthState();
    closeModal(refs.cartDrawer);
    closeModal(refs.accountDrawer);
    openModal(refs.authModal);
    refs.authModal?.querySelector('input')?.focus();
  }

  function openCart() {
    closeModal(refs.authModal);
    closeModal(refs.accountDrawer);
    renderCart();
    openModal(refs.cartDrawer);
  }

  async function openAccount() {
    if (!state.user) {
      openAuth('login');
      return;
    }
    closeModal(refs.authModal);
    closeModal(refs.cartDrawer);
    renderAccount();
    openModal(refs.accountDrawer);
    try {
      await loadOrders();
      renderAccount();
    } catch (error) {
      renderAccount(error.message || 'Не удалось загрузить заявки');
    }
  }

  function closeOverlays() {
    closeModal(refs.authModal);
    closeModal(refs.cartDrawer);
    closeModal(refs.accountDrawer);
  }

  function makeIcon(className) {
    const icon = createElement('i');
    className.split(/\s+/).filter(Boolean).forEach((part) => icon.classList.add(part));
    return icon;
  }

  function serviceWord(count) {
    const value = Math.abs(Number(count) || 0);
    const lastTwo = value % 100;
    const last = value % 10;
    if (lastTwo >= 11 && lastTwo <= 14) return 'услуг';
    if (last === 1) return 'услуга';
    if (last >= 2 && last <= 4) return 'услуги';
    return 'услуг';
  }

  function setCartBusy(busy) {
    state.cartBusy = Boolean(busy);
    refs.cartPanel?.classList.toggle('is-busy', state.cartBusy);
    refs.cartPanel?.querySelectorAll('[data-cart-inc], [data-cart-dec], [data-cart-remove], [data-cart-clear], [data-cart-notes]')
      .forEach((control) => {
        control.disabled = state.cartBusy;
      });
  }

  function continueShopping() {
    closeOverlays();
    if (window.location.pathname.endsWith('service-detail.html') || window.location.pathname.endsWith('ai-photo-detail.html')) {
      window.location.href = 'index.html#services';
      return;
    }
    document.getElementById('services')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (!window.location.hash || window.location.hash !== '#services') {
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#services`);
    }
  }

  function closeMobileNav() {
    const nav = document.getElementById('mobile-nav');
    if (window.RealVibeMobileNav?.isOpen?.()) {
      window.RealVibeMobileNav.close({ immediate: true, restoreFocus: false });
    } else {
      nav?.classList.remove('active');
      nav?.setAttribute('aria-hidden', 'true');
      document.getElementById('mobile-menu-btn')?.setAttribute('aria-expanded', 'false');
      document.getElementById('mobile-menu-btn')?.setAttribute('aria-label', 'Открыть меню');
    }
    nav?.classList.add('rv-force-hidden');
    window.setTimeout(() => nav?.classList.remove('rv-force-hidden'), 360);
    document.getElementById('mobile-menu-btn')?.classList.remove('active');
    document.documentElement.classList.remove('mobile-nav-open');
    document.body.classList.remove('mobile-nav-open', 'no-scroll');
    document.body.style.removeProperty('--rv-mobile-nav-scroll-top');
  }

  function makeNavAction({ className, iconClass, label, attrs }) {
    return appendChildren(createElement('button', {
      className: `rv-nav-action ${className}`,
      attrs: { type: 'button', ...attrs },
    }), [
      appendChildren(createElement('span', { className: 'rv-nav-action-icon' }), [makeIcon(iconClass)]),
      createElement('span', { className: 'rv-nav-action-label', text: label }),
    ]);
  }

  function addHeaderControls() {
    document.querySelectorAll('.nav-right').forEach((nav) => {
      if (nav.querySelector('[data-rv-cart-open]')) return;

      const cluster = createElement('div', { className: 'rv-nav-cluster', attrs: { 'aria-label': 'Аккаунт и корзина' } });
      const account = makeNavAction({
        className: 'rv-account-nav-btn',
        iconClass: 'fas fa-user',
        label: 'Вход',
        attrs: { 'data-rv-auth-open': '', 'aria-label': 'Войти', title: 'Вход' },
      });
      const cart = appendChildren(makeNavAction({
        className: 'rv-cart-nav-btn',
        iconClass: 'fas fa-bag-shopping',
        label: 'Корзина',
        attrs: { 'data-rv-cart-open': '', 'aria-label': 'Открыть корзину', title: 'Корзина' },
      }), [
        createElement('span', { className: 'rv-cart-count is-empty', text: '0', attrs: { 'aria-hidden': 'true' } }),
      ]);
      appendChildren(cluster, [account, cart]);

      const mobileButton = nav.querySelector('.mobile-menu-btn');
      nav.insertBefore(cluster, mobileButton || null);
    });

    document.querySelectorAll('.mobile-nav').forEach((nav) => {
      if (nav.querySelector('.rv-mobile-commerce')) return;
      const commerce = appendChildren(createElement('div', {
        className: 'rv-mobile-commerce',
        attrs: { 'aria-label': 'Аккаунт и корзина' },
      }), [
        appendChildren(createElement('button', {
          className: 'rv-mobile-commerce-btn rv-mobile-account-btn',
          attrs: { type: 'button', 'data-rv-auth-open': '', 'aria-label': 'Войти в аккаунт' },
        }), [
          appendChildren(createElement('span', { className: 'rv-mobile-commerce-icon' }), [makeIcon('fas fa-user')]),
          appendChildren(createElement('span', { className: 'rv-mobile-commerce-copy' }), [
            createElement('span', { className: 'rv-mobile-commerce-title', text: 'Войти' }),
            createElement('span', { className: 'rv-mobile-commerce-subtitle', text: 'Для финального шага' }),
          ]),
        ]),
        appendChildren(createElement('button', {
          className: 'rv-mobile-commerce-btn rv-mobile-cart-btn',
          attrs: { type: 'button', 'data-rv-cart-open': '', 'aria-label': 'Открыть корзину' },
        }), [
          appendChildren(createElement('span', { className: 'rv-mobile-commerce-icon' }), [makeIcon('fas fa-bag-shopping')]),
          appendChildren(createElement('span', { className: 'rv-mobile-commerce-copy' }), [
            createElement('span', { className: 'rv-mobile-commerce-title', text: 'Корзина' }),
            createElement('span', { className: 'rv-mobile-commerce-subtitle', text: 'Пока пусто' }),
          ]),
          createElement('span', { className: 'rv-cart-count is-empty', text: '0', attrs: { 'aria-hidden': 'true' } }),
        ]),
      ]);
      nav.querySelector('.mobile-nav-header')?.insertAdjacentElement('afterend', commerce);
    });
  }

  function createFieldWrap(label, field) {
    return appendChildren(createElement('label', { className: 'rv-field-wrap' }), [
      createElement('span', { className: 'rv-field-label', text: label }),
      field,
    ]);
  }

  function createFormError() {
    return createElement('p', { className: 'rv-form-error', attrs: { 'aria-live': 'polite' } });
  }

  function setFormError(form, message = '') {
    const error = form?.querySelector('.rv-form-error');
    if (!error) return;
    error.textContent = message;
    error.hidden = !message;
  }

  function setFormBusy(form, busy) {
    if (!form) return;
    form.setAttribute('aria-busy', busy ? 'true' : 'false');
    form.querySelectorAll('input, textarea, button').forEach((control) => {
      control.disabled = busy;
    });
  }

  function createAuthForm(type) {
    const isRegister = type === 'register';
    const form = createElement('form', {
      className: `rv-auth-form rv-auth-form-${type}`,
      attrs: { 'data-auth-form': type },
    });

    const fields = [];
    if (isRegister) {
      fields.push(createFieldWrap('Имя', createElement('input', {
        className: 'rv-field',
        attrs: { name: 'name', autocomplete: 'name', placeholder: 'Имя', maxlength: '120' },
      })));
    }
    fields.push(
      createFieldWrap('Email', createElement('input', {
        className: 'rv-field',
        attrs: { name: 'email', type: 'email', autocomplete: 'email', placeholder: 'Email', required: '' },
      })),
      createFieldWrap('Пароль', createElement('input', {
        className: 'rv-field',
        attrs: {
          name: 'password',
          type: 'password',
          autocomplete: isRegister ? 'new-password' : 'current-password',
          placeholder: 'Пароль',
          required: '',
          minlength: isRegister ? '8' : '1',
        },
      })),
    );

    appendChildren(form, [
      ...fields,
      createFormError(),
      createElement('button', {
        className: 'btn-primary rv-auth-submit',
        text: isRegister ? 'Создать аккаунт' : 'Войти',
        attrs: { type: 'submit' },
      }),
    ]);
    return form;
  }

  function createOAuthButton(provider, iconClass, label) {
    return appendChildren(createElement('button', {
      className: `btn-secondary rv-oauth-btn rv-${provider}-btn`,
      attrs: { type: 'button', 'data-rv-oauth': provider },
    }), [makeIcon(iconClass), createElement('span', { text: label })]);
  }

  function buildAuthModal() {
    refs.authModal = createElement('div', {
      className: 'rv-modal-shell rv-auth-modal',
      attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-hidden': 'true', 'aria-labelledby': 'rv-auth-title' },
    });
    refs.authModal.hidden = true;

    const panel = createElement('section', { className: 'rv-auth-panel' });
    const close = appendChildren(createElement('button', {
      className: 'rv-icon-close',
      attrs: { type: 'button', 'data-rv-close': '', 'aria-label': 'Закрыть' },
    }), [makeIcon('fas fa-times')]);

    const tabs = appendChildren(createElement('div', { className: 'rv-auth-tabs' }), [
      createElement('button', { className: 'rv-auth-tab', text: 'Вход', attrs: { type: 'button', 'data-auth-tab': 'login' } }),
      createElement('button', { className: 'rv-auth-tab', text: 'Регистрация', attrs: { type: 'button', 'data-auth-tab': 'register' } }),
    ]);

    refs.authContent = createElement('div', { className: 'rv-auth-content' });
    refs.telegramMount = createElement('div', { className: 'rv-telegram-login' });

    const header = appendChildren(createElement('div', { className: 'rv-panel-header' }), [
      appendChildren(createElement('span', { className: 'rv-panel-icon' }), [makeIcon('fas fa-user-check')]),
      appendChildren(createElement('div', { className: 'rv-panel-heading' }), [
        createElement('p', { className: 'rv-panel-kicker', text: 'Личный кабинет' }),
        createElement('h2', { className: 'rv-panel-title', text: 'Аккаунт и корзина', attrs: { id: 'rv-auth-title' } }),
        createElement('p', { className: 'rv-panel-desc', text: 'Вход нужен на финальном шаге, чтобы сохранить заявку и историю обращений.' }),
      ]),
    ]);

    appendChildren(panel, [
      close,
      header,
      tabs,
      refs.authContent,
    ]);
    refs.authModal.appendChild(panel);
    document.body.appendChild(refs.authModal);
  }

  function buildAccountDrawer() {
    refs.accountDrawer = createElement('div', {
      className: 'rv-modal-shell rv-account-shell',
      attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-hidden': 'true', 'aria-labelledby': 'rv-account-title' },
    });
    refs.accountDrawer.hidden = true;

    refs.accountPanel = createElement('aside', { className: 'rv-account-panel' });
    refs.accountContent = createElement('div', { className: 'rv-account-content' });
    const close = appendChildren(createElement('button', {
      className: 'rv-icon-close',
      attrs: { type: 'button', 'data-rv-close': '', 'aria-label': 'Закрыть' },
    }), [makeIcon('fas fa-times')]);
    const header = appendChildren(createElement('div', { className: 'rv-panel-header rv-account-header' }), [
      appendChildren(createElement('span', { className: 'rv-panel-icon' }), [makeIcon('fas fa-user-check')]),
      appendChildren(createElement('div', { className: 'rv-panel-heading' }), [
        createElement('p', { className: 'rv-panel-kicker', text: 'Личный кабинет' }),
        createElement('h2', { className: 'rv-panel-title', text: 'Профиль и заявки', attrs: { id: 'rv-account-title' } }),
        createElement('p', { className: 'rv-panel-desc', text: 'Контакт сохранится для следующих заявок, а история останется здесь.' }),
      ]),
    ]);

    appendChildren(refs.accountPanel, [close, header, refs.accountContent]);
    refs.accountDrawer.appendChild(refs.accountPanel);
    document.body.appendChild(refs.accountDrawer);
  }

  function renderTelegramWidget() {
    refs.telegramMount.replaceChildren();
    if (!state.providers.telegram || !state.providers.telegramBotUsername) {
      return;
    }

    const script = createElement('script', {
      attrs: {
        src: 'https://telegram.org/js/telegram-widget.js?22',
        async: 'async',
        'data-telegram-login': state.providers.telegramBotUsername,
        'data-size': 'large',
        'data-radius': '10',
        'data-userpic': 'false',
        'data-auth-url': `${window.location.origin}/api/auth/telegram/callback?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`,
        'data-request-access': 'write',
      },
    });
    refs.telegramMount.appendChild(script);
  }

  function renderAuthState() {
    document.querySelectorAll('[data-rv-auth-open]').forEach((button) => {
      const label = state.user ? (state.user.name || state.user.email || 'Аккаунт') : 'Войти';
      button.setAttribute('aria-label', state.user ? `Аккаунт: ${label}` : 'Войти');
      button.setAttribute('title', state.user ? 'Аккаунт' : 'Вход');
      button.classList.toggle('is-authenticated', Boolean(state.user));
      const navLabel = button.querySelector('.rv-nav-action-label');
      if (navLabel) navLabel.textContent = state.user ? 'Аккаунт' : 'Вход';
      const mobileTitle = button.querySelector('.rv-mobile-commerce-title');
      if (mobileTitle) mobileTitle.textContent = state.user ? 'Аккаунт' : 'Войти';
      const mobileSubtitle = button.querySelector('.rv-mobile-commerce-subtitle');
      if (mobileSubtitle) mobileSubtitle.textContent = state.user ? label : 'Для финального шага';
    });

    if (!refs.authContent) return;
    refs.authContent.replaceChildren();
    refs.authModal?.querySelectorAll('[data-auth-tab]').forEach((tab) => {
      tab.classList.toggle('is-active', tab.getAttribute('data-auth-tab') === state.activeAuthTab);
    });

    if (!state.apiAvailable) {
      refs.authContent.appendChild(createElement('p', {
        className: 'rv-muted',
        text: 'Личный кабинет временно недоступен.',
      }));
      return;
    }

    if (state.user) {
      refs.authContent.appendChild(appendChildren(createElement('div', { className: 'rv-account-state' }), [
        appendChildren(createElement('div', { className: 'rv-account-summary' }), [
          appendChildren(createElement('span', { className: 'rv-account-avatar' }), [makeIcon('fas fa-user')]),
          appendChildren(createElement('div', { className: 'rv-account-copy' }), [
            createElement('p', { className: 'rv-account-name', text: state.user.name || state.user.email || 'Аккаунт' }),
            createElement('p', { className: 'rv-muted', text: state.user.email || 'Вход выполнен через внешний аккаунт.' }),
          ]),
        ]),
        createElement('button', {
          className: 'btn-secondary rv-open-cart-btn',
          text: 'Открыть корзину',
          attrs: { type: 'button', 'data-rv-cart-open': '' },
        }),
        createElement('button', {
          className: 'btn-secondary rv-logout-btn',
          text: 'Выйти',
          attrs: { type: 'button', 'data-rv-logout': '' },
        }),
      ]));
      return;
    }

    const form = createAuthForm(state.activeAuthTab);
    const oauthButtons = [
      state.providers.google ? createOAuthButton('google', 'fab fa-google', 'Войти через Google') : null,
      state.providers.yandex ? createOAuthButton('yandex', 'fab fa-yandex', 'Войти через Яндекс') : null,
      state.providers.vk ? createOAuthButton('vk', 'fab fa-vk', 'Войти через VK ID') : null,
    ].filter(Boolean);
    const social = appendChildren(createElement('div', { className: 'rv-social-auth' }), [
      createElement('p', { className: 'rv-muted', text: 'Можно войти быстрее через внешний аккаунт.' }),
      ...oauthButtons,
      refs.telegramMount,
    ]);
    refs.authContent.appendChild(form);
    if (oauthButtons.length || state.providers.telegram) refs.authContent.appendChild(social);
    renderTelegramWidget();
  }

  function formatOrderDate(value) {
    if (!value) return '';
    try {
      return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value));
    } catch {
      return '';
    }
  }

  function createProfileForm() {
    const form = createElement('form', { className: 'rv-profile-form', attrs: { 'data-profile-form': '' } });
    appendChildren(form, [
      appendChildren(createElement('div', { className: 'rv-account-section-head' }), [
        createElement('h3', { className: 'rv-account-section-title', text: 'Профиль' }),
        createElement('p', { className: 'rv-muted', text: state.user?.email || 'Вход через внешний аккаунт' }),
      ]),
      createFieldWrap('Имя', createElement('input', {
        className: 'rv-field',
        attrs: {
          name: 'name',
          autocomplete: 'name',
          maxlength: '120',
          required: '',
          value: state.user?.name || '',
        },
      })),
      createFieldWrap('Основной контакт', createElement('input', {
        className: 'rv-field',
        attrs: {
          name: 'defaultContact',
          autocomplete: 'email tel',
          maxlength: '180',
          placeholder: 'Telegram, телефон или email',
          value: state.user?.defaultContact || '',
        },
      })),
      createFormError(),
      createElement('button', {
        className: 'btn-primary rv-profile-submit',
        text: 'Сохранить профиль',
        attrs: { type: 'submit' },
      }),
    ]);
    return form;
  }

  function createOrderCard(order) {
    const isOpen = state.activeOrderId === order.id;
    const card = createElement('article', { className: `rv-order-card${isOpen ? ' is-open' : ''}` });
    const items = order.items || [];
    const statusText = order.notificationStatus === 'sent' ? 'Уведомление отправлено' : 'Заявка сохранена';
    const toggle = appendChildren(createElement('button', {
      className: 'rv-order-toggle',
      attrs: {
        type: 'button',
        'data-order-toggle': order.id,
        'aria-expanded': isOpen ? 'true' : 'false',
      },
    }), [
      appendChildren(createElement('span', { className: 'rv-order-main' }), [
        createElement('span', { className: 'rv-order-title', text: `Заявка ${order.shortId || ''}`.trim() }),
        createElement('span', { className: 'rv-order-meta', text: `${formatOrderDate(order.createdAt)} · ${items.length} ${items.length === 1 ? 'услуга' : 'услуги'}` }),
      ]),
      createElement('span', { className: 'rv-order-status', text: statusText }),
    ]);
    const details = appendChildren(createElement('div', { className: 'rv-order-details', attrs: { hidden: isOpen ? undefined : '' } }), [
      createElement('p', { className: 'rv-muted', text: order.message || 'Комментарий не указан.' }),
      appendChildren(createElement('div', { className: 'rv-order-items' }), items.map((item) => (
        appendChildren(createElement('div', { className: 'rv-order-item' }), [
          createElement('span', { className: 'rv-order-item-title', text: item.serviceTitle }),
          createElement('span', { className: 'rv-order-item-qty', text: `${item.quantity} × ${item.priceLabel}` }),
        ])
      ))),
      createElement('button', {
        className: 'btn-secondary rv-repeat-order-btn',
        text: 'Повторить',
        attrs: { type: 'button', 'data-order-repeat': order.id },
      }),
    ]);

    return appendChildren(card, [toggle, details]);
  }

  function renderAccount(errorMessage = '') {
    if (!refs.accountContent) return;
    refs.accountContent.replaceChildren();

    if (!state.user) {
      refs.accountContent.appendChild(appendChildren(createElement('div', { className: 'rv-empty-state' }), [
        appendChildren(createElement('span', { className: 'rv-empty-icon' }), [makeIcon('fas fa-user')]),
        createElement('h3', { className: 'rv-empty-title', text: 'Войдите в аккаунт' }),
        createElement('p', { className: 'rv-muted', text: 'После входа здесь появятся профиль и история заявок.' }),
        createElement('button', { className: 'btn-secondary', text: 'Войти', attrs: { type: 'button', 'data-rv-auth-open': '' } }),
      ]));
      return;
    }

    refs.accountContent.appendChild(createProfileForm());
    const ordersBlock = appendChildren(createElement('section', { className: 'rv-orders-section' }), [
      appendChildren(createElement('div', { className: 'rv-account-section-head' }), [
        createElement('h3', { className: 'rv-account-section-title', text: 'История заявок' }),
        createElement('p', {
          className: 'rv-muted',
          text: state.ordersLoaded ? `${state.orders.length} ${state.orders.length === 1 ? 'заявка' : 'заявок'}` : 'Загружаем заявки...',
        }),
      ]),
    ]);

    if (errorMessage) {
      ordersBlock.appendChild(createElement('p', { className: 'rv-form-error', text: errorMessage }));
    } else if (!state.ordersLoaded) {
      ordersBlock.appendChild(createElement('p', { className: 'rv-muted', text: 'История появится через несколько секунд.' }));
    } else if (state.orders.length === 0) {
      ordersBlock.appendChild(appendChildren(createElement('div', { className: 'rv-orders-empty' }), [
        createElement('p', { className: 'rv-muted', text: 'Заявок пока нет. Соберите первую корзину и отправьте brief.' }),
        createElement('button', { className: 'btn-secondary', text: 'Открыть корзину', attrs: { type: 'button', 'data-rv-cart-open': '' } }),
      ]));
    } else {
      appendChildren(ordersBlock, state.orders.map(createOrderCard));
    }
    refs.accountContent.appendChild(ordersBlock);
  }

  function buildCartDrawer() {
    refs.cartDrawer = createElement('div', {
      className: 'rv-modal-shell rv-cart-shell',
      attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-hidden': 'true', 'aria-labelledby': 'rv-cart-title' },
    });
    refs.cartDrawer.hidden = true;

    refs.cartPanel = createElement('aside', { className: 'rv-cart-panel' });
    const close = appendChildren(createElement('button', {
      className: 'rv-icon-close',
      attrs: { type: 'button', 'data-rv-close': '', 'aria-label': 'Закрыть' },
    }), [makeIcon('fas fa-times')]);
    refs.cartList = createElement('div', { className: 'rv-cart-list' });
    refs.cartCheckout = createElement('div', { className: 'rv-cart-checkout' });
    refs.cartToolbar = createElement('div', { className: 'rv-cart-toolbar' });
    refs.cartSummary = createElement('p', { className: 'rv-cart-summary', text: 'Выберите услуги, чтобы собрать корзину.' });
    refs.cartSteps = appendChildren(createElement('div', { className: 'rv-cart-steps', attrs: { 'aria-label': 'Этапы оформления' } }), [
      createElement('span', { className: 'rv-cart-step', text: 'Услуги', attrs: { 'data-cart-step': 'items' } }),
      createElement('span', { className: 'rv-cart-step', text: 'Вход', attrs: { 'data-cart-step': 'auth' } }),
      createElement('span', { className: 'rv-cart-step', text: 'Оформление', attrs: { 'data-cart-step': 'checkout' } }),
    ]);
    const header = appendChildren(createElement('div', { className: 'rv-panel-header rv-cart-header' }), [
      appendChildren(createElement('span', { className: 'rv-panel-icon' }), [makeIcon('fas fa-bag-shopping')]),
      appendChildren(createElement('div', { className: 'rv-panel-heading' }), [
        createElement('p', { className: 'rv-panel-kicker', text: 'Корзина' }),
        createElement('h2', { className: 'rv-panel-title', text: 'Корзина услуг', attrs: { id: 'rv-cart-title' } }),
        refs.cartSummary,
      ]),
    ]);

    appendChildren(refs.cartPanel, [
      close,
      header,
      refs.cartSteps,
      refs.cartToolbar,
      refs.cartList,
      refs.cartCheckout,
    ]);
    refs.cartDrawer.appendChild(refs.cartPanel);
    document.body.appendChild(refs.cartDrawer);
  }

  function createCartItem(item) {
    const isMax = item.quantity >= 9;
    const card = createElement('article', { className: 'rv-cart-item', attrs: { 'data-cart-item': item.id } });
    const copy = appendChildren(createElement('div', { className: 'rv-cart-item-copy' }), [
      createElement('a', {
        className: 'rv-cart-item-title',
        text: item.title,
        attrs: { href: item.url || '#' },
      }),
      appendChildren(createElement('div', { className: 'rv-cart-item-meta' }), [
        createElement('span', { className: 'rv-cart-item-price', text: item.priceLabel }),
        createElement('span', { className: 'rv-cart-item-qty-label', text: `${item.quantity} ${serviceWord(item.quantity)}` }),
      ]),
    ]);
    const actions = appendChildren(createElement('div', { className: 'rv-cart-item-actions' }), [
      appendChildren(createElement('button', {
        className: 'rv-stepper-btn',
        attrs: {
          type: 'button',
          'data-cart-dec': item.id,
          'aria-label': item.quantity <= 1 ? 'Удалить позицию' : 'Уменьшить количество',
          disabled: state.cartBusy ? 'disabled' : undefined,
        },
      }), [makeIcon('fas fa-minus')]),
      createElement('span', { className: 'rv-cart-qty', text: item.quantity }),
      appendChildren(createElement('button', {
        className: 'rv-stepper-btn',
        attrs: {
          type: 'button',
          'data-cart-inc': item.id,
          'aria-label': isMax ? 'Максимум 9' : 'Увеличить количество',
          title: isMax ? 'Максимум 9' : 'Увеличить',
          disabled: state.cartBusy || isMax ? 'disabled' : undefined,
        },
      }), [makeIcon('fas fa-plus')]),
      appendChildren(createElement('button', {
        className: 'rv-remove-btn',
        attrs: { type: 'button', 'data-cart-remove': item.id, 'aria-label': 'Удалить позицию', disabled: state.cartBusy ? 'disabled' : undefined },
      }), [makeIcon('fas fa-trash')]),
    ]);
    const notes = createElement('textarea', {
      className: 'rv-field rv-cart-note',
      attrs: {
        'data-cart-notes': item.id,
        placeholder: 'Комментарий к этой услуге',
        maxlength: '500',
        rows: '2',
        disabled: state.cartBusy ? 'disabled' : undefined,
      },
    });
    notes.value = item.notes || '';
    const noteWrap = appendChildren(createElement('label', { className: 'rv-cart-note-wrap' }), [
      createElement('span', { className: 'rv-field-label', text: 'Комментарий к услуге' }),
      notes,
    ]);
    return appendChildren(card, [copy, actions, noteWrap]);
  }

  function createCheckoutForm() {
    const form = createElement('form', { className: 'rv-checkout-form', attrs: { 'data-checkout-form': '' } });
    const defaultContact = state.user?.defaultContact || state.user?.email || '';
    appendChildren(form, [
      appendChildren(createElement('div', { className: 'rv-checkout-heading' }), [
        createElement('p', { className: 'rv-panel-kicker', text: 'Финальный шаг' }),
        createElement('h3', { className: 'rv-checkout-title', text: 'Контакты для связи' }),
        createElement('p', { className: 'rv-muted', text: 'Это не оплата: заявка сохранится, а мы ответим в удобном канале.' }),
      ]),
      createFieldWrap('Имя', createElement('input', {
        className: 'rv-field',
        attrs: { name: 'customerName', placeholder: 'Имя', required: '', maxlength: '120', value: state.user?.name || '' },
      })),
      createFieldWrap('Контакт', createElement('input', {
        className: 'rv-field',
        attrs: { name: 'contact', placeholder: 'Telegram, телефон или email', required: '', maxlength: '180', value: defaultContact },
      })),
      createFieldWrap('Задача', createElement('textarea', {
        className: 'rv-field rv-textarea',
        attrs: { name: 'message', placeholder: 'Коротко о задаче', maxlength: '1000', rows: '4' },
      })),
      appendChildren(createElement('label', { className: 'rv-check-wrap' }), [
        createElement('input', { attrs: { type: 'checkbox', name: 'saveContact', checked: 'checked' } }),
        createElement('span', { text: 'Сохранить контакт в профиле' }),
      ]),
      createFormError(),
      createElement('button', { className: 'btn-primary rv-checkout-btn', text: 'Отправить заявку', attrs: { type: 'submit' } }),
    ]);
    return form;
  }

  function createEmptyCartState() {
    return appendChildren(createElement('div', { className: 'rv-empty-state' }), [
      appendChildren(createElement('span', { className: 'rv-empty-icon' }), [makeIcon('fas fa-bag-shopping')]),
      createElement('h3', { className: 'rv-empty-title', text: 'Корзина пока пустая' }),
      createElement('p', { className: 'rv-muted', text: 'Добавьте одну или несколько услуг, а потом отправьте brief без оплаты.' }),
      createElement('button', { className: 'btn-secondary rv-empty-link', text: 'К услугам', attrs: { type: 'button', 'data-rv-continue-shopping': '' } }),
    ]);
  }

  function createOrderSuccessState(order) {
    return appendChildren(createElement('div', { className: 'rv-order-success' }), [
      appendChildren(createElement('span', { className: 'rv-success-icon' }), [makeIcon('fas fa-check')]),
      createElement('p', { className: 'rv-panel-kicker', text: `Заявка ${order.shortId || ''}`.trim() }),
      createElement('h3', { className: 'rv-success-title', text: 'Заявка отправлена' }),
      createElement('p', {
        className: 'rv-muted',
        text: order.notificationStatus === 'sent'
          ? 'Уведомление уже ушло в Telegram. Мы свяжемся по указанному контакту.'
          : 'Заявка сохранена в базе. Если уведомление не дошло, она всё равно останется в истории.',
      }),
      appendChildren(createElement('div', { className: 'rv-cart-success-actions' }), [
        createElement('button', { className: 'btn-secondary rv-empty-link', text: 'История заявок', attrs: { type: 'button', 'data-rv-auth-open': '' } }),
        createElement('button', { className: 'btn-secondary rv-empty-link', text: 'Добавить услуги', attrs: { type: 'button', 'data-rv-continue-shopping': '' } }),
      ]),
    ]);
  }

  function renderCart() {
    document.querySelectorAll('.rv-cart-count').forEach((badge) => {
      const count = state.cart?.itemCount || 0;
      badge.textContent = String(count);
      badge.classList.toggle('is-empty', count === 0);
      badge.setAttribute('aria-hidden', count === 0 ? 'true' : 'false');
    });
    document.querySelectorAll('[data-rv-cart-open]').forEach((button) => {
      const count = state.cart?.itemCount || 0;
      button.setAttribute('aria-label', count ? `Открыть корзину, услуг: ${count}` : 'Открыть корзину');
      button.setAttribute('title', count ? `Корзина: ${count}` : 'Корзина');
      const subtitle = button.querySelector('.rv-mobile-commerce-subtitle');
      if (subtitle) subtitle.textContent = count ? `${count} ${count === 1 ? 'услуга' : 'услуги'} выбрано` : 'Пока пусто';
    });

    if (!refs.cartList || !refs.cartCheckout) return;
    refs.cartList.replaceChildren();
    refs.cartCheckout.replaceChildren();
    refs.cartToolbar?.replaceChildren();

    if (!state.apiAvailable) {
      refs.cartList.appendChild(createElement('p', { className: 'rv-muted', text: 'Корзина временно недоступна.' }));
      return;
    }

    const items = state.cart?.items || [];
    const hasItems = items.length > 0;
    const currentStep = !hasItems ? 'items' : state.user ? 'checkout' : 'auth';
    refs.cartSteps?.querySelectorAll('[data-cart-step]').forEach((step) => {
      const key = step.getAttribute('data-cart-step');
      step.classList.toggle('is-active', key === currentStep);
      step.classList.toggle('is-complete', (key === 'items' && hasItems) || (key === 'auth' && hasItems && Boolean(state.user)));
    });
    if (refs.cartSummary) {
      refs.cartSummary.textContent = hasItems
        ? `${state.cart.itemCount} ${serviceWord(state.cart.itemCount)} в корзине`
        : 'Выберите услуги, чтобы собрать корзину.';
    }

    if (hasItems && refs.cartToolbar) {
      appendChildren(refs.cartToolbar, [
        appendChildren(createElement('div', { className: 'rv-cart-mini-summary' }), [
          appendChildren(createElement('span', { className: 'rv-cart-mini-icon' }), [makeIcon('fas fa-list-check')]),
          appendChildren(createElement('div'), [
            createElement('strong', { text: `${state.cart.itemCount} ${serviceWord(state.cart.itemCount)}` }),
            createElement('span', { text: 'Заявка без оплаты, стоимость уточняем после брифа' }),
          ]),
        ]),
        appendChildren(createElement('div', { className: 'rv-cart-toolbar-actions' }), [
          createElement('button', {
            className: 'btn-secondary rv-cart-soft-btn',
            text: 'Добавить услуги',
            attrs: { type: 'button', 'data-rv-continue-shopping': '' },
          }),
          createElement('button', {
            className: 'btn-secondary rv-cart-soft-btn rv-cart-clear-btn',
            text: 'Очистить',
            attrs: { type: 'button', 'data-cart-clear': '', disabled: state.cartBusy ? 'disabled' : undefined },
          }),
        ]),
      ]);
    }

    if (items.length === 0) {
      refs.cartList.appendChild(state.lastOrder ? createOrderSuccessState(state.lastOrder) : createEmptyCartState());
      return;
    }

    appendChildren(refs.cartList, items.map(createCartItem));
    if (state.user) {
      refs.cartCheckout.appendChild(createCheckoutForm());
    } else {
      refs.cartCheckout.appendChild(appendChildren(createElement('div', { className: 'rv-login-required' }), [
        appendChildren(createElement('span', { className: 'rv-login-icon' }), [makeIcon('fas fa-lock')]),
        createElement('h3', { className: 'rv-login-title', text: 'Войдите, чтобы отправить заявку' }),
        createElement('p', { className: 'rv-muted', text: 'Корзина сохранится, после входа вы вернетесь к оформлению.' }),
        appendChildren(createElement('div', { className: 'rv-cart-login-actions' }), [
          createElement('button', { className: 'btn-secondary', text: 'Войти и продолжить', attrs: { type: 'button', 'data-rv-auth-open': '' } }),
          createElement('button', { className: 'btn-secondary rv-cart-soft-btn', text: 'Добавить услуги', attrs: { type: 'button', 'data-rv-continue-shopping': '' } }),
        ]),
      ]));
    }
  }

  function buildToast() {
    refs.toast = createElement('div', { className: 'rv-toast', attrs: { 'aria-live': 'polite' } });
    document.body.appendChild(refs.toast);
  }

  function buildShell() {
    addHeaderControls();
    buildAuthModal();
    buildAccountDrawer();
    buildCartDrawer();
    buildToast();
  }

  function injectServiceButtons(root = document) {
    root.querySelectorAll?.('.service-simple-card[data-service-id]').forEach((card) => {
      if (card.querySelector('[data-cart-service-id]')) return;
      const serviceId = card.getAttribute('data-service-id');
      const content = card.querySelector('.service-simple-content') || card;
      const button = appendChildren(createElement('button', {
        className: 'service-cart-action',
        attrs: {
          type: 'button',
          'data-cart-service-id': serviceId,
          'data-stop-propagation': '',
          'aria-label': 'Добавить услугу в корзину',
        },
      }), [makeIcon('fas fa-plus'), createElement('span', { text: 'В корзину' })]);
      content.appendChild(button);
    });

    const serviceId = new URLSearchParams(window.location.search).get('id');
    if (serviceId !== null) {
      document.querySelectorAll('.service-detail-cta-btn, .service-detail-card .service-btn').forEach((button) => {
        button.removeAttribute('href');
        button.removeAttribute('data-contact-link');
        button.setAttribute('role', 'button');
        button.setAttribute('data-cart-service-id', serviceId);
        button.textContent = 'Добавить в корзину';
      });
    }
  }

  async function addServiceToCart(serviceId) {
    if (!state.apiAvailable) {
      showToast('Корзина временно недоступна');
      return;
    }
    state.lastOrder = null;
    try {
      const payload = await apiFetch('/api/cart/items', {
        method: 'POST',
        body: { serviceId, quantity: 1 },
      });
      state.cart = payload.cart;
      renderCart();
      openCart();
    } catch (error) {
      if (error.status === 403) {
        await loadSession();
        return addServiceToCart(serviceId);
      }
      showToast(error.message || 'Не удалось добавить услугу');
    }
  }

  async function submitAuthForm(form) {
    const type = form.getAttribute('data-auth-form');
    const data = Object.fromEntries(new FormData(form).entries());
    const endpoint = type === 'register' ? '/api/auth/register' : '/api/auth/login';
    setFormError(form);
    setFormBusy(form, true);
    try {
      const session = await apiFetch(endpoint, { method: 'POST', body: data });
      state.csrfToken = session.csrfToken || state.csrfToken;
      state.user = session.user || null;
      state.providers = session.providers || state.providers;
      state.ordersLoaded = false;
      await loadCart();
      renderAuthState();
      closeModal(refs.authModal);
      if (state.returnToCart) {
        state.returnToCart = false;
        openCart();
      }
      showToast('Вход выполнен');
    } catch (error) {
      setFormError(form, error.message || 'Не удалось войти');
      showToast(error.message || 'Не удалось войти');
    } finally {
      setFormBusy(form, false);
    }
  }

  async function submitProfileForm(form) {
    const data = Object.fromEntries(new FormData(form).entries());
    setFormError(form);
    setFormBusy(form, true);
    try {
      const payload = await apiFetch('/api/account/profile', {
        method: 'PATCH',
        body: {
          name: data.name || '',
          defaultContact: data.defaultContact || '',
        },
      });
      state.user = payload.user || state.user;
      renderAuthState();
      renderAccount();
      showToast('Профиль сохранен');
    } catch (error) {
      setFormError(form, error.message || 'Не удалось сохранить профиль');
    } finally {
      setFormBusy(form, false);
    }
  }

  async function logout() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
      state.user = null;
      state.csrfToken = '';
      state.orders = [];
      state.ordersLoaded = false;
      closeModal(refs.accountDrawer);
      await loadSession();
      await loadCart();
      renderAuthState();
      showToast('Вы вышли из аккаунта');
    } catch (error) {
      showToast(error.message || 'Не удалось выйти');
    }
  }

  async function updateItem(itemId, patch) {
    setCartBusy(true);
    try {
      const payload = await apiFetch(`/api/cart/items/${encodeURIComponent(itemId)}`, {
        method: 'PATCH',
        body: patch,
      });
      state.cart = payload.cart;
      state.lastOrder = null;
      renderCart();
    } catch (error) {
      showToast(error.message || 'Не удалось обновить корзину');
    } finally {
      setCartBusy(false);
    }
  }

  async function removeItem(itemId) {
    setCartBusy(true);
    try {
      const payload = await apiFetch(`/api/cart/items/${encodeURIComponent(itemId)}`, {
        method: 'DELETE',
      });
      state.cart = payload.cart;
      state.lastOrder = null;
      renderCart();
    } catch (error) {
      showToast(error.message || 'Не удалось удалить позицию');
    } finally {
      setCartBusy(false);
    }
  }

  async function clearCart() {
    if (!state.cart?.items?.length || state.cartBusy) return;
    setCartBusy(true);
    try {
      const payload = await apiFetch('/api/cart/items', { method: 'DELETE' });
      state.cart = payload.cart;
      state.lastOrder = null;
      renderCart();
    } catch (error) {
      showToast(error.message || 'Не удалось очистить корзину');
    } finally {
      setCartBusy(false);
    }
  }

  async function submitCheckout(form) {
    const body = Object.fromEntries(new FormData(form).entries());
    body.saveContact = Boolean(body.saveContact);
    setFormError(form);
    setFormBusy(form, true);
    try {
      const payload = await apiFetch('/api/orders', {
        method: 'POST',
        body,
      });
      state.cart = payload.cart;
      state.lastOrder = payload.order || null;
      if (body.saveContact && state.user) {
        state.user = { ...state.user, defaultContact: body.contact || state.user.defaultContact || '' };
      }
      state.ordersLoaded = false;
      renderCart();
      showToast(`Заявка ${payload.order.shortId} отправлена`);
    } catch (error) {
      if (error.status === 401) {
        openAuth('login');
      }
      setFormError(form, error.message || 'Не удалось отправить заявку');
      showToast(error.message || 'Не удалось отправить заявку');
    } finally {
      setFormBusy(form, false);
    }
  }

  async function repeatOrder(orderId) {
    try {
      const payload = await apiFetch(`/api/orders/${encodeURIComponent(orderId)}/repeat`, { method: 'POST' });
      state.cart = payload.cart;
      state.lastOrder = null;
      renderCart();
      closeModal(refs.accountDrawer);
      openCart();
      showToast(payload.skippedServices?.length ? 'Доступные услуги добавлены в корзину' : 'Услуги добавлены в корзину');
    } catch (error) {
      showToast(error.message || 'Не удалось повторить заявку');
    }
  }

  function findCartItem(itemId) {
    return (state.cart?.items || []).find((item) => item.id === itemId);
  }

  function wireEvents() {
    document.addEventListener('click', (event) => {
      const close = event.target.closest('[data-rv-close]');
      if (close || event.target === refs.authModal || event.target === refs.cartDrawer || event.target === refs.accountDrawer) {
        closeOverlays();
        return;
      }

      const auth = event.target.closest('[data-rv-auth-open]');
      if (auth) {
        event.preventDefault();
        closeMobileNav();
        if (state.user) {
          openAccount();
        } else {
          openAuth('login');
        }
        return;
      }

      const cart = event.target.closest('[data-rv-cart-open]');
      if (cart) {
        event.preventDefault();
        closeMobileNav();
        openCart();
        return;
      }

      const continueCart = event.target.closest('[data-rv-continue-shopping]');
      if (continueCart) {
        event.preventDefault();
        continueShopping();
        return;
      }

      const add = event.target.closest('[data-cart-service-id]');
      if (add) {
        event.preventDefault();
        event.stopPropagation();
        addServiceToCart(add.getAttribute('data-cart-service-id'));
        return;
      }

      const tab = event.target.closest('[data-auth-tab]');
      if (tab) {
        state.activeAuthTab = tab.getAttribute('data-auth-tab') || 'login';
        renderAuthState();
        return;
      }

      const oauth = event.target.closest('[data-rv-oauth]');
      if (oauth) {
        const provider = oauth.getAttribute('data-rv-oauth');
        if (provider && state.providers[provider]) {
          window.location.href = `/api/auth/${provider}/start?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`;
        }
        return;
      }

      if (event.target.closest('[data-rv-logout]')) {
        logout();
        return;
      }

      const inc = event.target.closest('[data-cart-inc]');
      if (inc) {
        const item = findCartItem(inc.getAttribute('data-cart-inc'));
        if (item) updateItem(item.id, { quantity: item.quantity + 1 });
        return;
      }

      const dec = event.target.closest('[data-cart-dec]');
      if (dec) {
        const item = findCartItem(dec.getAttribute('data-cart-dec'));
        if (item) updateItem(item.id, { quantity: item.quantity - 1 });
        return;
      }

      const remove = event.target.closest('[data-cart-remove]');
      if (remove) {
        removeItem(remove.getAttribute('data-cart-remove'));
        return;
      }

      if (event.target.closest('[data-cart-clear]')) {
        clearCart();
        return;
      }

      const orderToggle = event.target.closest('[data-order-toggle]');
      if (orderToggle) {
        const orderId = orderToggle.getAttribute('data-order-toggle');
        state.activeOrderId = state.activeOrderId === orderId ? null : orderId;
        renderAccount();
        return;
      }

      const repeat = event.target.closest('[data-order-repeat]');
      if (repeat) {
        repeatOrder(repeat.getAttribute('data-order-repeat'));
      }
    });

    document.addEventListener('submit', (event) => {
      const authForm = event.target.closest('[data-auth-form]');
      if (authForm) {
        event.preventDefault();
        submitAuthForm(authForm);
        return;
      }

      const profileForm = event.target.closest('[data-profile-form]');
      if (profileForm) {
        event.preventDefault();
        submitProfileForm(profileForm);
        return;
      }

      const checkoutForm = event.target.closest('[data-checkout-form]');
      if (checkoutForm) {
        event.preventDefault();
        submitCheckout(checkoutForm);
      }
    });

    document.addEventListener('change', (event) => {
      const notes = event.target.closest('[data-cart-notes]');
      if (!notes) return;
      const itemId = notes.getAttribute('data-cart-notes');
      const item = findCartItem(itemId);
      const nextNotes = String(notes.value || '').trim();
      if (!item || nextNotes === (item.notes || '')) return;
      updateItem(item.id, { notes: nextNotes });
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') closeOverlays();
    });

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) injectServiceButtons(node);
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  async function init() {
    buildShell();
    injectServiceButtons();
    wireEvents();

    try {
      await loadSession();
      await loadCart();
    } catch {
      state.apiAvailable = false;
      renderAuthState();
      renderCart();
    }

    const authParam = new URLSearchParams(window.location.search).get('auth');
    if (['google_error', 'google_state_error', 'telegram_error', 'yandex_error', 'vk_error'].includes(authParam)) {
      showToast('Внешний вход не завершился');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
