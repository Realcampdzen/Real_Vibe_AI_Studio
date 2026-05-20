// Glass UI chat widget. Static styling lives in css/style.css so strict style CSP can be enforced.
class GlassUIWidget {
    constructor(options = {}) {
        this.widgetId = `glass-ui-widget-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        this.botName = options.botName || 'AI Assistant';
        this.botAvatar = options.botAvatar || '';
        this.themeClass = options.themeClass || this.resolveThemeClass(options.theme, this.botName);
        this.position = options.position || { bottom: '20px', right: '20px' };
        this.welcomeMessage = options.welcomeMessage || `Привет! Я ${this.botName}. На связи.`;
        this.placeholder = options.placeholder || `Напишите сообщение ${this.botName}...`;
        this.idleStatusText = options.statusText || 'онлайн';
        this.busyStatusText = options.busyStatusText || 'печатает...';
        this.onSendMessage = options.onSendMessage || null;
        this.onClose = options.onClose || null;
        this.quickQuestions = Array.isArray(options.quickQuestions)
            ? options.quickQuestions.filter((item) => typeof item === 'string' && item.trim()).slice(0, 4)
            : [];
        this.isVisible = Boolean(options.isVisible);
        this.horizontalOffset = typeof options.horizontalOffset === 'number' ? options.horizontalOffset : 100;
        this.verticalOffset = typeof options.verticalOffset === 'number' ? options.verticalOffset : 20;
        this.isKeyboardMode = false;
        this.viewportRaf = 0;

        const bottomValue = parseInt(this.position.bottom, 10) || 0;
        this.zIndex = 10000 + Math.floor(bottomValue / 10);
        this.isTyping = false;
        this.messages = [{
            id: '1',
            text: this.welcomeMessage,
            isBot: true,
            timestamp: new Date()
        }];

        this.container = null;
        this.inputContainer = null;
        this.messageInput = null;
        this.sendButton = null;
        this.messagesList = null;
        this.messagesArea = null;
        this.typingIndicator = null;
        this.statusText = null;

        this.init();
    }

    resolveThemeClass(theme, botName) {
        const name = String(botName || '').toLowerCase();
        const normalizedTheme = String(theme || '').toLowerCase();
        if (name.includes('здоров') || name.includes('health') || name.includes('wellness') || normalizedTheme === '#14b8a6') return 'glass-theme-health';
        if (name.includes('хипыч') || normalizedTheme === '#3b82f6') return 'glass-theme-hipych';
        if (name.includes('кот') || normalizedTheme === '#f97316') return 'glass-theme-bro-cat';
        if (name.includes('валюш') || normalizedTheme === '#a855f7') return 'glass-theme-valyusha';
        return 'glass-theme-default';
    }

    createElement(tag, className, text) {
        const element = document.createElement(tag);
        if (className) element.className = className;
        if (text !== undefined) element.textContent = text;
        return element;
    }

    getViewportMargin() {
        const viewportWidth = this.getViewportWidth();
        if (viewportWidth <= 480) return 10;
        if (viewportWidth <= 768) return 20;
        return 40;
    }

    getViewportWidth() {
        const widths = [window.innerWidth, document.documentElement.clientWidth]
            .filter((value) => Number.isFinite(value) && value > 0);
        return widths.length ? Math.min(...widths) : 0;
    }

    getViewportHeight() {
        const heights = [window.innerHeight, document.documentElement.clientHeight]
            .filter((value) => Number.isFinite(value) && value > 0);
        return heights.length ? Math.min(...heights) : 0;
    }

    isMobileViewport() {
        return this.getViewportWidth() <= 900 || (navigator.maxTouchPoints || 0) > 0;
    }

    updateMobileViewportVars() {
        if (!this.isMobileViewport()) return;

        const visualViewport = window.visualViewport;
        const viewportHeight = visualViewport?.height || window.innerHeight || document.documentElement.clientHeight || 0;
        const viewportWidth = visualViewport?.width || window.innerWidth || document.documentElement.clientWidth || 0;
        const offsetTop = Math.max(0, visualViewport?.offsetTop || 0);
        const layoutHeight = window.innerHeight || document.documentElement.clientHeight || viewportHeight;
        const keyboardInset = Math.max(0, layoutHeight - viewportHeight - offsetTop);
        const rootStyle = document.documentElement.style;

        rootStyle.setProperty('--rv-visual-viewport-height', `${Math.round(viewportHeight)}px`);
        rootStyle.setProperty('--rv-visual-viewport-width', `${Math.round(viewportWidth)}px`);
        rootStyle.setProperty('--rv-visual-viewport-offset-top', `${Math.round(offsetTop)}px`);
        rootStyle.setProperty('--rv-keyboard-inset-bottom', `${Math.round(keyboardInset)}px`);
    }

    scheduleViewportSync() {
        if (this.viewportRaf) return;
        this.viewportRaf = window.requestAnimationFrame(() => {
            this.viewportRaf = 0;
            this.updateMobileViewportVars();
            if (this.isVisible && !this.isKeyboardMode) {
                this.applyPosition();
            }
        });
    }

    setKeyboardMode(isActive) {
        if (!this.isMobileViewport()) return;
        this.isKeyboardMode = Boolean(isActive);
        this.updateMobileViewportVars();

        document.documentElement.classList.toggle('rv-chat-keyboard-open', this.isKeyboardMode);
        document.body?.classList.toggle('rv-chat-keyboard-open', this.isKeyboardMode);
        this.container?.classList.toggle('is-keyboard-active', this.isKeyboardMode);
    }

    computeWidgetWidth() {
        const viewportWidth = this.getViewportWidth();
        const margin = this.getViewportMargin();
        return Math.min(360, Math.max(280, viewportWidth - margin * 2));
    }

    computeTopOffset() {
        const viewportHeight = this.getViewportHeight();
        const viewportWidth = this.getViewportWidth();
        const margin = this.getViewportMargin();
        const desiredHeight = 500;
        const maxAllowedHeight = Math.max(320, viewportHeight - margin * 2);
        const effectiveHeight = Math.min(desiredHeight, maxAllowedHeight);
        const centeredTop = Math.max(margin, Math.floor((viewportHeight - effectiveHeight) / 2));
        const offsetTop = viewportWidth <= 768
            ? centeredTop
            : centeredTop + this.verticalOffset;
        const maxTop = Math.max(margin, viewportHeight - effectiveHeight - margin);
        const finalTop = Math.min(Math.max(margin, offsetTop), maxTop);
        return { top: finalTop, height: effectiveHeight };
    }

    computeRightOffset() {
        const viewportWidth = this.getViewportWidth();
        const margin = this.getViewportMargin();
        const widgetWidth = this.computeWidgetWidth();

        if (viewportWidth <= 768) {
            return Math.max(margin, viewportWidth - widgetWidth - margin);
        }

        const baseRight = typeof this.position.right === 'string'
            ? parseInt(this.position.right, 10) || 0
            : (Number(this.position.right) || 0);
        const desiredRight = baseRight + this.horizontalOffset;
        const maxRight = Math.max(margin, viewportWidth - widgetWidth - margin);
        return Math.min(Math.max(margin, desiredRight), maxRight);
    }

    setStatusText(text, isTyping = false) {
        if (!this.statusText) return;
        const indicator = this.createElement('span', `status-indicator${isTyping ? ' status-indicator--typing' : ''}`);
        this.statusText.replaceChildren(indicator, document.createTextNode(text));
    }

    init() {
        this.createWidget();
        this.setupEventListeners();
        if (this.isVisible) {
            this.show();
        }
    }

    createWidget() {
        this.container = this.createElement('div', `glass-ui-widget ${this.themeClass}`);
        this.container.id = this.widgetId;
        this.applyPosition();

        const header = this.createElement('div', 'glass-chat-header');
        header.appendChild(this.createElement('div', 'glass-chat-header-shine'));

        const headerInfo = this.createElement('div', 'glass-chat-header-info');
        if (this.botAvatar) {
            const avatarContainer = this.createElement('div', 'glass-chat-avatar-wrap');
            avatarContainer.appendChild(this.createElement('div', 'glass-chat-avatar-glow'));

            const avatar = this.createElement('img', 'glass-chat-avatar');
            avatar.src = this.botAvatar;
            avatar.alt = this.botName;
            avatarContainer.appendChild(avatar);
            headerInfo.appendChild(avatarContainer);
        }

        const headerText = this.createElement('div', 'glass-chat-title');
        headerText.appendChild(this.createElement('div', 'glass-chat-name', this.botName));
        this.statusText = this.createElement('div', 'glass-status-text');
        this.setStatusText(this.idleStatusText);
        headerText.appendChild(this.statusText);
        headerInfo.appendChild(headerText);

        const closeButton = this.createElement('button', 'glass-chat-close', '×');
        closeButton.type = 'button';
        closeButton.setAttribute('aria-label', `Закрыть чат ${this.botName}`);
        closeButton.addEventListener('click', () => {
            this.hide();
            if (this.onClose) this.onClose();
        });

        header.appendChild(headerInfo);
        header.appendChild(closeButton);

        this.messagesArea = this.createElement('div', 'glass-messages-area');
        this.messagesArea.appendChild(this.createElement('div', 'glass-messages-bg-decor'));
        this.messagesList = this.createElement('div', 'glass-messages-list');
        this.messagesArea.appendChild(this.messagesList);

        this.typingIndicator = this.createElement('div', 'glass-typing-indicator');
        const typingDots = this.createElement('span');
        typingDots.appendChild(document.createTextNode(`${this.botName} печатает`));
        typingDots.appendChild(this.createElement('span', 'glass-typing-ellipsis', '...'));
        this.typingIndicator.appendChild(typingDots);
        this.messagesArea.appendChild(this.typingIndicator);

        const inputArea = this.createElement('div', 'glass-input-area');
        if (this.quickQuestions.length) {
            inputArea.appendChild(this.createQuickQuestions());
        }

        this.inputContainer = this.createElement('div', 'glass-input-container');
        this.messageInput = this.createElement('input', 'glass-message-input');
        this.messageInput.type = 'text';
        this.messageInput.placeholder = this.placeholder;
        this.messageInput.id = `${this.widgetId}-input`;
        this.messageInput.autocomplete = 'off';

        this.sendButton = this.createElement('button', 'glass-send-button', '➤');
        this.sendButton.type = 'button';
        this.sendButton.setAttribute('aria-label', `Отправить сообщение ${this.botName}`);

        this.inputContainer.appendChild(this.messageInput);
        this.inputContainer.appendChild(this.sendButton);
        inputArea.appendChild(this.inputContainer);

        this.container.appendChild(header);
        this.container.appendChild(this.messagesArea);
        this.container.appendChild(inputArea);
        document.body.appendChild(this.container);
        this.renderMessages();
    }

    createQuickQuestions() {
        const wrapper = this.createElement('div', 'glass-quick-questions');
        this.quickQuestions.forEach((question) => {
            const button = this.createElement('button', 'glass-quick-question', question);
            button.type = 'button';
            button.addEventListener('click', () => {
                if (this.isTyping) return;
                this.handleSendMessage(question);
            });
            wrapper.appendChild(button);
        });
        return wrapper;
    }

    setupEventListeners() {
        if (!this.messageInput || !this.sendButton) return;

        this.boundResetPosition = () => this.scheduleViewportSync();
        window.addEventListener('resize', this.boundResetPosition);
        window.addEventListener('orientationchange', this.boundResetPosition);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', this.boundResetPosition);
            window.visualViewport.addEventListener('scroll', this.boundResetPosition);
        }

        const sendMessage = () => {
            const message = this.messageInput.value.trim();
            if (!message) {
                this.flagInvalidInput();
                return;
            }
            if (this.isTyping) return;
            this.handleSendMessage(message);
            this.messageInput.value = '';
        };

        this.sendButton.addEventListener('click', sendMessage);
        this.messageInput.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                sendMessage();
            }
        });
        this.messageInput.addEventListener('input', () => {
            this.inputContainer?.classList.remove('is-invalid');
        });
        this.messageInput.addEventListener('focus', () => {
            this.setKeyboardMode(true);
            window.setTimeout(() => {
                this.messagesArea?.scrollTo({ top: this.messagesArea.scrollHeight, behavior: 'auto' });
            }, 80);
        });
        this.messageInput.addEventListener('blur', () => {
            window.setTimeout(() => {
                if (document.activeElement !== this.messageInput) {
                    this.setKeyboardMode(false);
                    if (this.isVisible) this.applyPosition();
                }
            }, 120);
        });
    }

    flagInvalidInput() {
        if (!this.inputContainer || !this.messageInput) return;
        this.inputContainer.classList.add('is-invalid');
        this.messageInput.focus();
        window.setTimeout(() => this.inputContainer?.classList.remove('is-invalid'), 900);
    }

    setBusy(isBusy) {
        this.isTyping = isBusy;
        this.container.classList.toggle('is-busy', isBusy);
        if (this.messageInput) this.messageInput.disabled = isBusy;
        if (this.sendButton) this.sendButton.disabled = isBusy;
        if (this.typingIndicator) this.typingIndicator.classList.toggle('is-visible', isBusy);
        this.setStatusText(isBusy ? this.busyStatusText : this.idleStatusText, isBusy);
    }

    async handleSendMessage(message) {
        const sentMessage = message.trim();
        this.messages.push({
            id: Date.now().toString(),
            text: sentMessage,
            isBot: false,
            timestamp: new Date()
        });
        this.renderMessages();
        this.setBusy(true);

        try {
            const botResponse = this.onSendMessage
                ? await this.onSendMessage(message)
                : 'Сейчас этот бот недоступен. Попробуйте позже.';

            this.messages.push({
                id: (Date.now() + 1).toString(),
                text: botResponse || 'Ответ пустой. Попробуйте переформулировать вопрос.',
                isBot: true,
                timestamp: new Date()
            });
            window.RealVibeAnalytics?.track?.('chat_send_result', {
                botId: this.botName,
                status: 'success',
            });
        } catch (error) {
            this.messages.push({
                id: (Date.now() + 1).toString(),
                text: error?.isUserVisible
                    ? error.message
                    : 'Сейчас не получилось отправить сообщение. Проверьте соединение или напишите в Telegram @Stivanovv.',
                isBot: true,
                isError: true,
                retryText: sentMessage,
                timestamp: new Date()
            });
            window.RealVibeAnalytics?.track?.('chat_send_result', {
                botId: this.botName,
                status: 'error',
            });
        } finally {
            this.setBusy(false);
            this.renderMessages();
        }
    }

    renderMessages() {
        if (!this.messagesList) return;
        this.messagesList.replaceChildren();

        this.messages.forEach((message) => {
            const messageElement = this.createElement(
                'div',
                `glass-message ${message.isBot ? 'bot-message' : 'user-message'}`
            );

            if (message.isBot && this.botAvatar) {
                const avatar = this.createElement('img', 'glass-message-avatar');
                avatar.src = this.botAvatar;
                avatar.alt = this.botName;
                messageElement.appendChild(avatar);
            }

            const bubble = this.createElement(
                'div',
                `glass-message-bubble${message.isError ? ' glass-message-bubble--error' : ''}`
            );
            bubble.appendChild(this.createElement('div', 'glass-message-text', message.text));
            if (message.isError) {
                const actions = this.createElement('div', 'glass-message-actions');
                const retryButton = this.createElement('button', 'glass-message-action', 'Повторить');
                retryButton.type = 'button';
                retryButton.addEventListener('click', () => {
                    if (!this.isTyping && message.retryText) {
                        this.handleSendMessage(message.retryText);
                    }
                });

                const contactLink = this.createElement('a', 'glass-message-action', 'Telegram');
                contactLink.href = 'https://t.me/Stivanovv';
                contactLink.target = '_blank';
                contactLink.rel = 'noopener';
                contactLink.setAttribute('data-contact-link', 'telegram');
                actions.appendChild(retryButton);
                actions.appendChild(contactLink);
                bubble.appendChild(actions);
            }
            messageElement.appendChild(bubble);
            this.messagesList.appendChild(messageElement);
        });

        window.setTimeout(() => {
            if (!this.messagesArea) return;
            this.messagesArea.scrollTo({
                top: this.messagesArea.scrollHeight,
                behavior: 'smooth'
            });
        }, 80);
    }

    show() {
        this.isVisible = true;
        this.applyPosition();
        this.container.classList.add('is-visible');
        window.RealVibeAnalytics?.track?.('chat_open', {
            botId: this.botName,
        });
        if (!this.isMobileViewport()) {
            window.setTimeout(() => {
                if (this.messageInput) this.messageInput.focus();
            }, 240);
        }
    }

    hide() {
        this.isVisible = false;
        if (document.activeElement === this.messageInput) {
            this.messageInput.blur();
        }
        this.setKeyboardMode(false);
        this.container.classList.remove('is-visible');
    }

    applyPosition() {
        if (!this.container) return;

        const computedRight = this.computeRightOffset();
        const computedWidth = this.computeWidgetWidth();
        const { top, height } = this.computeTopOffset();
        const margin = this.getViewportMargin();

        this.container.style.setProperty('top', `${top}px`);
        this.container.style.setProperty('right', `${computedRight}px`);
        this.container.style.setProperty('width', `${computedWidth}px`);
        this.container.style.setProperty('height', `${height}px`);
        this.container.style.setProperty('max-width', `calc(100vw - ${margin * 2}px)`);
        this.container.style.setProperty('max-height', `calc(100vh - ${margin * 2}px)`);
        this.container.style.setProperty('z-index', this.zIndex.toString());
    }

    destroy() {
        if (this.boundResetPosition) {
            window.removeEventListener('resize', this.boundResetPosition);
            window.removeEventListener('orientationchange', this.boundResetPosition);
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', this.boundResetPosition);
                window.visualViewport.removeEventListener('scroll', this.boundResetPosition);
            }
        }
        if (this.viewportRaf) {
            window.cancelAnimationFrame(this.viewportRaf);
            this.viewportRaf = 0;
        }
        this.setKeyboardMode(false);
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}

window.GlassUIWidget = GlassUIWidget;
