// Glass UI Кот Бро - дружелюбный кот-помощник
class GlassUIBroCat {
    constructor() {
        this.name = 'Кот Бро';
        this.avatar = 'images/bro-avatar.jpg';
        this.isVisible = false;
        this.responses = [
            '🐱 Мяу! Я Кот Бро - рыжий персона-бот этого сайта!',
            '😸 Видишь, как я общаюсь? Хочешь себе такого же мемного помощника?',
            '🎪 Я живое доказательство того, что AI-боты могут быть крутыми!',
            '💰 От 18,000₽ - и у тебя будет свой харизматичный помощник!',
            '🚀 Я изменил этот сайт, сделал его живым и интересным!',
            '😺 Мой секрет - характер! Клиенты не уходят, а остаются поболтать!',
            '🎯 Хочешь +200% к конверсии? Заказывай своего Кота Бро!',
            '🤖 Я не просто болтаю - я работаю! Продажи через эмоции!',
            '⭐ Окупаюсь за месяц! Мой хозяин уже в плюсе! Мурр.',
            '🎭 Заказать клона: @Stivanovv - и твой бизнес оживет!'
        ];
        this.init();
    }

    init() {
        this.createFloatingButton();
        this.createChatWidget();
    }

    createFloatingButton() {
        this.floatingButton = document.createElement('div');
        this.floatingButton.className = 'glass-ui-floating-button glass-ui-bro-cat-button';
        this.floatingButton.dataset.tooltip = 'Кот Бро • мемный AI-гид';
        this.floatingButton.setAttribute('role', 'button');
        this.floatingButton.setAttribute('tabindex', '0');
        this.floatingButton.setAttribute('aria-label', 'Открыть чат Кота Бро');

        this.floatingButton.appendChild(this.createButtonBackground());
        this.floatingButton.appendChild(this.createAvatarOrIcon());
        this.floatingButton.appendChild(this.createBadge('🐱'));

        this.floatingButton.addEventListener('click', () => {
            this.toggleChat();
            this.addCatClickEffect();
        });
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
        icon.textContent = '🐱';
        return icon;
    }

    createBadge(text) {
        const badge = document.createElement('div');
        badge.className = 'glass-ui-notification-badge glass-cat-notification-badge';
        badge.textContent = text;
        return badge;
    }

    createChatWidget() {
        this.glassWidget = new GlassUIWidget({
            botName: this.name,
            botAvatar: this.avatar,
            themeClass: 'glass-theme-bro-cat',
            welcomeMessage: 'Мяу! Я Кот Бро, рыжий персона-бот Real Vibe. Показываю, как AI-персонаж может оживить сайт и соцсети. 🐱',
            placeholder: 'Спроси Кота Бро про персона-ботов...',
            quickQuestions: ['Сколько стоит?', 'Что вы делаете?', 'Хочу заявку'],
            position: { bottom: '200px', right: '20px' },
            onSendMessage: this.handleMessage.bind(this),
            onClose: this.handleClose.bind(this)
        });
    }

    addCatClickEffect() {
        const effects = ['🐾', '😸', '💫', '✨', '🌟'];
        const clickEffect = document.createElement('div');
        clickEffect.className = 'cat-click-effect';
        clickEffect.textContent = effects[Math.floor(Math.random() * effects.length)];

        const rect = this.floatingButton.getBoundingClientRect();
        clickEffect.style.left = `${rect.left + rect.width / 2}px`;
        clickEffect.style.top = `${rect.top + rect.height / 2}px`;
        document.body.appendChild(clickEffect);
        window.setTimeout(() => clickEffect.remove(), 1000);
    }

    async handleMessage(message) {
        try {
            const apiBase = (window.__AI_API_BASE__ || '').replace(/\/$/, '');
            const endpoint = apiBase ? `${apiBase}/chat` : '/chat';
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
        if (lowerMessage.includes('привет') || lowerMessage.includes('здравствуй')) {
            return 'Мяу! 🐱 Я Бро, рыжий и пушистый персона-бот! Что хочешь узнать?';
        }
        if (lowerMessage.includes('сколько') || lowerMessage.includes('сто')) {
            return 'Цена зависит от задачи: простой бот, персона-бот, сайт или контент-пакет считаются по-разному. Напиши @Stivanovv — быстро разберём вводные и дадим вилку.';
        }
        if (lowerMessage.includes('что вы') || lowerMessage.includes('делаете')) {
            return 'Real Vibe делает AI-видео, ботов, GPT-ассистентов, сайты, музыку, озвучку и визуальный контент. Я могу подсказать направление, но для заявки лучше писать @Stivanovv.';
        }
        if (lowerMessage.includes('заявк') || lowerMessage.includes('хочу')) {
            return 'Мяу, заявка — это просто: напиши @Stivanovv в Telegram и коротко опиши задачу, сроки и желаемый результат.';
        }
        if (lowerMessage.includes('кот') || lowerMessage.includes('бро')) return this.responses[1];
        if (lowerMessage.includes('бот') || lowerMessage.includes('персона')) {
            return 'Мяу! 🐱 Персона-боты — это AI с характером. Они отвечают, вовлекают и помогают клиентам быстрее дойти до заявки.';
        }
        if (lowerMessage.includes('недвижимость') || lowerMessage.includes('квартир')) {
            return 'Мр-мяу! 🏠 Я показываю, как персона-боты оживляют соцсети и помогают выбирать предложения без скучной анкеты.';
        }
        return this.responses[Math.floor(Math.random() * this.responses.length)];
    }

    handleClose() {
        this.hideChat();
    }

    closeOtherChats() {
        if (window.glassUIHipych?.isVisible) window.glassUIHipych.hideChat();
        if (window.glassUIValyusha?.isVisible) window.glassUIValyusha.hideChat();
    }

    showChat() {
        this.closeOtherChats();
        this.isVisible = true;
        this.glassWidget.show();
        this.floatingButton.classList.add('is-active');
        this.floatingButton.querySelector('.glass-ui-notification-badge')?.classList.add('is-hidden');
    }

    hideChat() {
        this.isVisible = false;
        this.glassWidget.hide();
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
        this.glassWidget?.destroy();
    }
}

function initGlassUIBroCat() {
    if (!window.glassUIBroCat) {
        window.glassUIBroCat = new GlassUIBroCat();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlassUIBroCat);
} else {
    initGlassUIBroCat();
}
