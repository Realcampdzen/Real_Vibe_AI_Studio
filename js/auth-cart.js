(function initRealVibeAuthCart() {
  const state = {
    csrfToken: '',
    user: null,
    providers: { google: false, telegram: false, telegramBotUsername: '' },
    cart: { items: [], itemCount: 0 },
    apiAvailable: true,
    activeAuthTab: 'login',
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

  function openModal(element) {
    if (!element) return;
    element.hidden = false;
    element.setAttribute('aria-hidden', 'false');
    document.body.classList.add('rv-overlay-open');
    requestAnimationFrame(() => element.classList.add('is-open'));
  }

  function closeModal(element) {
    if (!element) return;
    element.classList.remove('is-open');
    element.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('rv-overlay-open');
    window.setTimeout(() => {
      if (!element.classList.contains('is-open')) element.hidden = true;
    }, 180);
  }

  function openAuth(tab = 'login') {
    state.activeAuthTab = tab;
    renderAuthState();
    openModal(refs.authModal);
    refs.authModal?.querySelector('input')?.focus();
  }

  function openCart() {
    renderCart();
    openModal(refs.cartDrawer);
  }

  function closeOverlays() {
    closeModal(refs.authModal);
    closeModal(refs.cartDrawer);
  }

  function makeIcon(className) {
    const icon = createElement('i');
    className.split(/\s+/).filter(Boolean).forEach((part) => icon.classList.add(part));
    return icon;
  }

  function addHeaderControls() {
    document.querySelectorAll('.nav-right').forEach((nav) => {
      if (nav.querySelector('[data-rv-cart-open]')) return;

      const account = appendChildren(createElement('button', {
        className: 'nav-icon-btn rv-nav-action',
        attrs: { type: 'button', 'data-rv-auth-open': '', 'aria-label': 'Аккаунт' },
      }), [makeIcon('fas fa-user')]);
      const cart = appendChildren(createElement('button', {
        className: 'nav-icon-btn rv-nav-action rv-cart-nav-btn',
        attrs: { type: 'button', 'data-rv-cart-open': '', 'aria-label': 'Корзина' },
      }), [
        makeIcon('fas fa-bag-shopping'),
        createElement('span', { className: 'rv-cart-count', text: '0' }),
      ]);

      const mobileButton = nav.querySelector('.mobile-menu-btn');
      nav.insertBefore(account, mobileButton || null);
      nav.insertBefore(cart, mobileButton || null);
    });

    document.querySelectorAll('.mobile-nav-actions').forEach((actions) => {
      if (actions.querySelector('[data-rv-cart-open]')) return;
      appendChildren(actions, [
        appendChildren(createElement('button', {
          className: 'mobile-nav-chip rv-mobile-action',
          attrs: { type: 'button', 'data-rv-auth-open': '' },
        }), [makeIcon('fas fa-user'), createElement('span', { text: 'Аккаунт' })]),
        appendChildren(createElement('button', {
          className: 'mobile-nav-chip rv-mobile-action',
          attrs: { type: 'button', 'data-rv-cart-open': '' },
        }), [
          makeIcon('fas fa-bag-shopping'),
          createElement('span', { text: 'Корзина' }),
          createElement('span', { className: 'rv-cart-count', text: '0' }),
        ]),
      ]);
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
      fields.push(createElement('input', {
        className: 'rv-field',
        attrs: { name: 'name', autocomplete: 'name', placeholder: 'Имя', maxlength: '120' },
      }));
    }
    fields.push(
      createElement('input', {
        className: 'rv-field',
        attrs: { name: 'email', type: 'email', autocomplete: 'email', placeholder: 'Email', required: '' },
      }),
      createElement('input', {
        className: 'rv-field',
        attrs: {
          name: 'password',
          type: 'password',
          autocomplete: isRegister ? 'new-password' : 'current-password',
          placeholder: 'Пароль',
          required: '',
          minlength: isRegister ? '8' : '1',
        },
      }),
    );

    appendChildren(form, [
      ...fields,
      createElement('button', {
        className: 'btn-primary rv-auth-submit',
        text: isRegister ? 'Создать аккаунт' : 'Войти',
        attrs: { type: 'submit' },
      }),
    ]);
    return form;
  }

  function buildAuthModal() {
    refs.authModal = createElement('div', {
      className: 'rv-modal-shell rv-auth-modal',
      attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-hidden': 'true' },
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

    appendChildren(panel, [
      close,
      createElement('p', { className: 'rv-panel-kicker', text: 'Личный кабинет' }),
      createElement('h2', { className: 'rv-panel-title', text: 'Заявки и корзина' }),
      tabs,
      refs.authContent,
    ]);
    refs.authModal.appendChild(panel);
    document.body.appendChild(refs.authModal);
  }

  function renderTelegramWidget() {
    refs.telegramMount.replaceChildren();
    if (!state.providers.telegram || !state.providers.telegramBotUsername) {
      refs.telegramMount.appendChild(createElement('p', {
        className: 'rv-muted',
        text: 'Telegram вход появится после настройки бота.',
      }));
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
      button.setAttribute('aria-label', state.user ? `Аккаунт: ${state.user.name || state.user.email || 'профиль'}` : 'Войти');
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
        createElement('p', { className: 'rv-account-name', text: state.user.name || state.user.email || 'Аккаунт' }),
        createElement('p', { className: 'rv-muted', text: state.user.email || 'Вход выполнен через внешний аккаунт.' }),
        createElement('button', {
          className: 'btn-secondary rv-logout-btn',
          text: 'Выйти',
          attrs: { type: 'button', 'data-rv-logout': '' },
        }),
      ]));
      return;
    }

    const form = createAuthForm(state.activeAuthTab);
    const social = appendChildren(createElement('div', { className: 'rv-social-auth' }), [
      createElement('button', {
        className: 'btn-secondary rv-google-btn',
        text: 'Войти через Google',
        attrs: {
          type: 'button',
          'data-rv-google': '',
          disabled: state.providers.google ? undefined : 'disabled',
        },
      }),
      refs.telegramMount,
    ]);
    refs.authContent.appendChild(form);
    refs.authContent.appendChild(social);
    renderTelegramWidget();
  }

  function buildCartDrawer() {
    refs.cartDrawer = createElement('div', {
      className: 'rv-modal-shell rv-cart-shell',
      attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-hidden': 'true' },
    });
    refs.cartDrawer.hidden = true;

    refs.cartPanel = createElement('aside', { className: 'rv-cart-panel' });
    const close = appendChildren(createElement('button', {
      className: 'rv-icon-close',
      attrs: { type: 'button', 'data-rv-close': '', 'aria-label': 'Закрыть' },
    }), [makeIcon('fas fa-times')]);
    refs.cartList = createElement('div', { className: 'rv-cart-list' });
    refs.cartCheckout = createElement('div', { className: 'rv-cart-checkout' });

    appendChildren(refs.cartPanel, [
      close,
      createElement('p', { className: 'rv-panel-kicker', text: 'Корзина-заявка' }),
      createElement('h2', { className: 'rv-panel-title', text: 'Выбранные услуги' }),
      refs.cartList,
      refs.cartCheckout,
    ]);
    refs.cartDrawer.appendChild(refs.cartPanel);
    document.body.appendChild(refs.cartDrawer);
  }

  function createCartItem(item) {
    const card = createElement('article', { className: 'rv-cart-item' });
    const copy = appendChildren(createElement('div', { className: 'rv-cart-item-copy' }), [
      createElement('a', {
        className: 'rv-cart-item-title',
        text: item.title,
        attrs: { href: item.url || '#' },
      }),
      createElement('span', { className: 'rv-cart-item-price', text: item.priceLabel }),
    ]);
    const actions = appendChildren(createElement('div', { className: 'rv-cart-item-actions' }), [
      createElement('button', { className: 'rv-stepper-btn', text: '-', attrs: { type: 'button', 'data-cart-dec': item.id, 'aria-label': 'Уменьшить' } }),
      createElement('span', { className: 'rv-cart-qty', text: item.quantity }),
      createElement('button', { className: 'rv-stepper-btn', text: '+', attrs: { type: 'button', 'data-cart-inc': item.id, 'aria-label': 'Увеличить' } }),
      appendChildren(createElement('button', { className: 'rv-remove-btn', attrs: { type: 'button', 'data-cart-remove': item.id, 'aria-label': 'Удалить' } }), [makeIcon('fas fa-trash')]),
    ]);
    return appendChildren(card, [copy, actions]);
  }

  function createCheckoutForm() {
    const form = createElement('form', { className: 'rv-checkout-form', attrs: { 'data-checkout-form': '' } });
    appendChildren(form, [
      createElement('input', {
        className: 'rv-field',
        attrs: { name: 'customerName', placeholder: 'Имя', required: '', maxlength: '120', value: state.user?.name || '' },
      }),
      createElement('input', {
        className: 'rv-field',
        attrs: { name: 'contact', placeholder: 'Telegram, телефон или email', required: '', maxlength: '180', value: state.user?.email || '' },
      }),
      createElement('textarea', {
        className: 'rv-field rv-textarea',
        attrs: { name: 'message', placeholder: 'Коротко о задаче', maxlength: '1000', rows: '4' },
      }),
      createElement('button', { className: 'btn-primary rv-checkout-btn', text: 'Отправить заявку', attrs: { type: 'submit' } }),
    ]);
    return form;
  }

  function renderCart() {
    document.querySelectorAll('.rv-cart-count').forEach((badge) => {
      const count = state.cart?.itemCount || 0;
      badge.textContent = String(count);
      badge.classList.toggle('is-empty', count === 0);
    });

    if (!refs.cartList || !refs.cartCheckout) return;
    refs.cartList.replaceChildren();
    refs.cartCheckout.replaceChildren();

    if (!state.apiAvailable) {
      refs.cartList.appendChild(createElement('p', { className: 'rv-muted', text: 'Корзина временно недоступна.' }));
      return;
    }

    const items = state.cart?.items || [];
    if (items.length === 0) {
      refs.cartList.appendChild(createElement('p', { className: 'rv-muted', text: 'Выберите услуги, чтобы собрать заявку.' }));
      return;
    }

    appendChildren(refs.cartList, items.map(createCartItem));
    if (state.user) {
      refs.cartCheckout.appendChild(createCheckoutForm());
    } else {
      refs.cartCheckout.appendChild(appendChildren(createElement('div', { className: 'rv-login-required' }), [
        createElement('p', { className: 'rv-muted', text: 'Войдите, чтобы отправить заявку.' }),
        createElement('button', { className: 'btn-secondary', text: 'Войти', attrs: { type: 'button', 'data-rv-auth-open': '' } }),
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
      }), [makeIcon('fas fa-plus'), createElement('span', { text: 'В заявку' })]);
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
    try {
      const payload = await apiFetch('/api/cart/items', {
        method: 'POST',
        body: { serviceId, quantity: 1 },
      });
      state.cart = payload.cart;
      renderCart();
      openCart();
      showToast('Услуга добавлена в заявку');
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
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const session = await apiFetch(endpoint, { method: 'POST', body: data });
      state.csrfToken = session.csrfToken || state.csrfToken;
      state.user = session.user || null;
      state.providers = session.providers || state.providers;
      await loadCart();
      renderAuthState();
      closeModal(refs.authModal);
      showToast('Вход выполнен');
    } catch (error) {
      showToast(error.message || 'Не удалось войти');
    } finally {
      submit.disabled = false;
    }
  }

  async function logout() {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
      state.user = null;
      state.csrfToken = '';
      await loadSession();
      await loadCart();
      renderAuthState();
      showToast('Вы вышли из аккаунта');
    } catch (error) {
      showToast(error.message || 'Не удалось выйти');
    }
  }

  async function updateItem(itemId, patch) {
    try {
      const payload = await apiFetch(`/api/cart/items/${encodeURIComponent(itemId)}`, {
        method: 'PATCH',
        body: patch,
      });
      state.cart = payload.cart;
      renderCart();
    } catch (error) {
      showToast(error.message || 'Не удалось обновить корзину');
    }
  }

  async function removeItem(itemId) {
    try {
      const payload = await apiFetch(`/api/cart/items/${encodeURIComponent(itemId)}`, {
        method: 'DELETE',
      });
      state.cart = payload.cart;
      renderCart();
    } catch (error) {
      showToast(error.message || 'Не удалось удалить позицию');
    }
  }

  async function submitCheckout(form) {
    const submit = form.querySelector('button[type="submit"]');
    submit.disabled = true;
    try {
      const payload = await apiFetch('/api/orders', {
        method: 'POST',
        body: Object.fromEntries(new FormData(form).entries()),
      });
      state.cart = payload.cart;
      renderCart();
      showToast(`Заявка ${payload.order.shortId} отправлена`);
    } catch (error) {
      if (error.status === 401) {
        openAuth('login');
      }
      showToast(error.message || 'Не удалось отправить заявку');
    } finally {
      submit.disabled = false;
    }
  }

  function findCartItem(itemId) {
    return (state.cart?.items || []).find((item) => item.id === itemId);
  }

  function wireEvents() {
    document.addEventListener('click', (event) => {
      const close = event.target.closest('[data-rv-close]');
      if (close || event.target === refs.authModal || event.target === refs.cartDrawer) {
        closeOverlays();
        return;
      }

      const auth = event.target.closest('[data-rv-auth-open]');
      if (auth) {
        event.preventDefault();
        openAuth('login');
        return;
      }

      const cart = event.target.closest('[data-rv-cart-open]');
      if (cart) {
        event.preventDefault();
        openCart();
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

      const google = event.target.closest('[data-rv-google]');
      if (google && state.providers.google) {
        window.location.href = `/api/auth/google/start?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`;
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
      }
    });

    document.addEventListener('submit', (event) => {
      const authForm = event.target.closest('[data-auth-form]');
      if (authForm) {
        event.preventDefault();
        submitAuthForm(authForm);
        return;
      }

      const checkoutForm = event.target.closest('[data-checkout-form]');
      if (checkoutForm) {
        event.preventDefault();
        submitCheckout(checkoutForm);
      }
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
    if (authParam === 'google_error' || authParam === 'telegram_error') {
      showToast('Внешний вход не завершился');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
