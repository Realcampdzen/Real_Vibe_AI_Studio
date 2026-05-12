// Glass UI Хипыч - AI помощник для стримеров и сообществ
class GlassUIHipych {
    constructor() {
        this.name = 'Хипыч';
        this.avatar = 'images/hipych-avatar.jpg';
        this.isVisible = false;
        this.responses = [
            'Привет! Я Хипыч - твой стримерский админ! 🎥✨',
            'Помогу с настройкой стрима и техническими вопросами! 🔧',
            'Нужна помощь с OBS? Я знаю все секреты! 📹',
            'Давай настроим твой канал на максимум! 🚀',
            'Проблемы с железом? Расскажи, разберемся! 💻',
            'Я помогу оптимизировать твой стрим для лучшего качества! ⚡',
            'Хочешь больше зрителей? Поделюсь фишками! 📈',
            'Техподдержка 24/7 - это про меня! 🛠️',
            'Настройка донатов, алертов, ботов - все умею! 💰',
            'Вместе сделаем твой стрим профессиональным! 🎬'
        ];
        this.init();
    }

    init() {
        this.createFloatingButton();
        this.createChatWidget();
    }

    createFloatingButton() {
        this.floatingButton = document.createElement('div');
        this.floatingButton.className = 'glass-ui-floating-button glass-ui-hipych-button';
        this.floatingButton.dataset.tooltip = 'Хипыч • техподдержка 24/7';
        this.floatingButton.setAttribute('role', 'button');
        this.floatingButton.setAttribute('tabindex', '0');
        this.floatingButton.setAttribute('aria-label', 'Открыть чат Хипыча');

        this.floatingButton.appendChild(this.createButtonBackground());
        this.floatingButton.appendChild(this.createAvatarOrIcon());
        this.floatingButton.appendChild(this.createBadge('👍', 'glass-notification-badge'));

        this.floatingButton.addEventListener('click', () => this.toggleChat());
        this.floatingButton.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                this.toggleChat();
            }
        });

        document.body.appendChild(this.floatingButton);
    }

    createButtonBackground() {
        const background = document.createElement('div');
        background.className = 'glass-ui-floating-button-bg';
        return background;
    }

    createAvatarOrIcon() {
        if (this.avatar) {
            const avatar = document.createElement('img');
            avatar.className = 'glass-ui-floating-avatar';
            avatar.src = this.avatar;
            avatar.alt = this.name;
            return avatar;
        }

        const icon = document.createElement('div');
        icon.className = 'glass-ui-floating-icon';
        icon.textContent = '🤖';
        return icon;
    }

    createBadge(text, className) {
        const badge = document.createElement('div');
        badge.className = `glass-ui-notification-badge ${className}`;
        badge.textContent = text;
        return badge;
    }

    createChatWidget() {
        this.chatWidget = new GlassUIWidget({
            botName: this.name,
            botAvatar: this.avatar,
            themeClass: 'glass-theme-hipych',
            welcomeMessage: 'Го! Я Хипыч, геймерский AI-персонаж для стримеров и сообществ. Могу рассказать, как оживлять Telegram и контент. 🎮',
            placeholder: 'Спроси Хипыча про стримы и AI-ботов...',
            quickQuestions: ['Сколько стоит?', 'Что вы делаете?', 'Хочу заявку'],
            position: { bottom: '100px', right: '20px' },
            onSendMessage: (message) => this.handleMessage(message),
            onClose: () => this.hideChat(),
            isVisible: false
        });
    }

    async handleMessage(message) {
        try {
            const apiBase = (window.__AI_API_BASE__ || '').replace(/\/$/, '');
            const endpoint = apiBase ? `${apiBase}/api/hipych/chat` : '/api/hipych/chat';
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: window.RealVibeChat?.getHeaders?.() || { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    userId: `user-${Date.now()}`
                })
            });

            const reply = window.RealVibeChat?.parseResponse
                ? await window.RealVibeChat.parseResponse(response)
                : (await response.json()).reply;
            return reply || this.getFallbackResponse(message);
        } catch (error) {
            if (error?.isUserVisible) {
                throw error;
            }

            return this.getFallbackResponse(message);
        }
    }

    getFallbackResponse(message) {
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('привет') || lowerMessage.includes('здравствуй')) return this.responses[0];
        if (lowerMessage.includes('сколько') || lowerMessage.includes('сто')) {
            return 'Стоимость зависит от формата: бот, сайт, GPT или контент. Напиши @Stivanovv в Telegram — быстро уточним задачу и дадим вилку по срокам и бюджету.';
        }
        if (lowerMessage.includes('что вы') || lowerMessage.includes('делаете')) {
            return 'Мы делаем AI-контент, персона-ботов, GPT-ассистентов, сайты с AI-функциями, музыку и озвучку. Самый быстрый старт — выбрать услугу на сайте или написать @Stivanovv.';
        }
        if (lowerMessage.includes('заявк') || lowerMessage.includes('хочу')) {
            return 'Отлично. Напиши @Stivanovv в Telegram: что нужно сделать, для какого проекта и какие сроки. Дальше предложим понятный следующий шаг.';
        }
        if (lowerMessage.includes('стрим') || lowerMessage.includes('настрой')) return this.responses[2];
        if (lowerMessage.includes('бот') || lowerMessage.includes('персона')) {
            return 'Го! 🎮 Персона-боты с AI — это имба! Оживляют соцсети, модерируют чат и помогают продавать без скучных скриптов.';
        }
        return this.responses[Math.floor(Math.random() * this.responses.length)];
    }

    closeOtherChats() {
        if (window.glassUIBroCat?.isVisible) window.glassUIBroCat.hideChat();
        if (window.glassUIValyusha?.isVisible) window.glassUIValyusha.hideChat();
    }

    showChat() {
        this.closeOtherChats();
        this.isVisible = true;
        this.chatWidget.show();
        this.floatingButton.classList.add('is-active');
        this.floatingButton.querySelector('.glass-ui-notification-badge')?.classList.add('is-hidden');
    }

    hideChat() {
        this.isVisible = false;
        this.chatWidget.hide();
        this.floatingButton.classList.remove('is-active');
    }

    toggleChat() {
        if (this.isVisible) {
            this.hideChat();
        } else {
            this.showChat();
        }
    }

    destroy() {
        this.floatingButton?.remove();
        this.chatWidget?.destroy();
    }
}

function initGlassUIHipych() {
    if (!window.glassUIHipych) {
        window.glassUIHipych = new GlassUIHipych();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlassUIHipych);
} else {
    initGlassUIHipych();
}
