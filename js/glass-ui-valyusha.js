// Glass UI НейроVалюша — дружелюбная вожатая Реального Лагеря
class GlassUIValyusha {
    constructor() {
        this.name = 'НейроVалюша';
        this.avatar = 'public/НейроВалюша_аватар.jpg';
        this.isVisible = false;
        this.responses = [
            'Привет! Я НейроVалюша — дружелюбная вожатая Реального Лагеря. Здесь дети прокачивают 4К навыки и изучают нейросети! 💜✨',
            'Люблю помогать ребятам вникать в программу лагеря и находить своё призвание. Хочешь рассказать, что тебя вдохновляет? 💜',
            'В Реальном Лагере мы учим быть вожатыми, создавать проекты и вести сообщества. Погнали в команду мечты! 🎯',
            'Я могу поддержать, подсказать упражнения или помочь с нейропроектом. Просто спроси! 📚✨',
            'Наша миссия — чтобы каждый ребёнок почувствовал себя лидером и создателем будущего. Уже хочется shine-ить? 🌟',
            'Я продвигаю ценности лагеря в соцсетях и в жизни: уважение, творчество и заботу. Давай делиться теплом! 🤗',
            'Хочешь узнать, как мы внедряем AI в детские программы и медиа? Расскажу все фишки! 🤖💬',
            'Люблю писать тёплые комментарии в ВК и Telegram сообществах лагеря. Присоединяйся к нашему доброму движению! 💌',
            'Вожатый — это человек, который помогает раскрыть талант. В Реальном Лагере этому можно научиться. Хочешь попробовать? 🏕️',
            'Если тебе нужно вдохновение для поста или проекта лагеря — давай brainstorm вместе! 💜🧠'
        ];
        this.init();
    }

    init() {
        this.createFloatingButton();
        this.createChatWidget();
    }

    createFloatingButton() {
        this.floatingButton = document.createElement('div');
        this.floatingButton.className = 'glass-ui-floating-button glass-ui-valyusha-button';
        this.floatingButton.dataset.tooltip = 'НейроVалюша • вожатая Реального Лагеря';
        this.floatingButton.setAttribute('role', 'button');
        this.floatingButton.setAttribute('tabindex', '0');
        this.floatingButton.setAttribute('aria-label', 'Открыть чат НейроВалюши');

        this.floatingButton.appendChild(this.createButtonBackground());
        this.floatingButton.appendChild(this.createAvatarOrIcon());
        this.floatingButton.appendChild(this.createBadge('✨'));

        this.floatingButton.addEventListener('click', () => {
            this.toggleChat();
            this.addValyushaSparkle();
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
        icon.textContent = '💜';
        return icon;
    }

    createBadge(text) {
        const badge = document.createElement('div');
        badge.className = 'glass-ui-notification-badge glass-valyusha-notification-badge';
        badge.textContent = text;
        return badge;
    }

    createChatWidget() {
        this.glassWidget = new GlassUIWidget({
            botName: this.name,
            botAvatar: this.avatar,
            themeClass: 'glass-theme-valyusha',
            welcomeMessage: 'Привет! Я НейроВалюша, дружелюбная AI-вожатая Реального Лагеря. Помогаю говорить о развитии, 4К навыках и живых персона-ботах. 💜',
            placeholder: 'Спроси НейроВалюшу про лагерь или AI...',
            position: { bottom: '280px', right: '20px' },
            onSendMessage: this.handleMessage.bind(this),
            onClose: this.hideChat.bind(this)
        });
    }

    addValyushaSparkle() {
        const sparkles = ['✨', '🌟', '💜', '⭐'];
        const sparkle = document.createElement('div');
        sparkle.className = 'valyusha-sparkle';
        sparkle.textContent = sparkles[Math.floor(Math.random() * sparkles.length)];

        const rect = this.floatingButton.getBoundingClientRect();
        sparkle.style.left = `${rect.left + rect.width / 2}px`;
        sparkle.style.top = `${rect.top + rect.height / 2}px`;
        document.body.appendChild(sparkle);
        window.setTimeout(() => sparkle.remove(), 1000);
    }

    async handleMessage(message) {
        try {
            const apiBase = (window.__AI_API_BASE__ || '').replace(/\/$/, '');
            const endpoint = apiBase ? `${apiBase}/api/valyusha/chat` : '/api/valyusha/chat';
            const controller = new AbortController();
            const timeoutId = window.setTimeout(() => controller.abort(), 60000);

            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: window.RealVibeChat?.getHeaders?.() || { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        message,
                        userId: `user-${Date.now()}`
                    }),
                    signal: controller.signal
                });
                window.clearTimeout(timeoutId);

                const reply = window.RealVibeChat?.parseResponse
                    ? await window.RealVibeChat.parseResponse(response)
                    : (await response.json()).reply;
                return reply || this.getFallbackResponse();
            } catch (fetchError) {
                window.clearTimeout(timeoutId);
                throw fetchError;
            }
        } catch (error) {
            if (error?.isUserVisible) {
                throw error;
            }

            return this.getFallbackResponse();
        }
    }

    getFallbackResponse() {
        const apiBase = (window.__AI_API_BASE__ || '').replace(/\/$/, '');
        const host = apiBase ? apiBase.replace(/^https?:\/\//, '') : window.location.host || 'AI API';
        return `Сейчас я не могу подключиться к AI-сервису (${host}). Попробуй обновить страницу или зайти позже. Если проблема повторяется — напиши @Stivanovv.`;
    }

    closeOtherChats() {
        if (window.glassUIBroCat?.isVisible) window.glassUIBroCat.hideChat();
        if (window.glassUIHipych?.isVisible) window.glassUIHipych.hideChat();
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

function initGlassUIValyusha() {
    if (!window.glassUIValyusha) {
        window.glassUIValyusha = new GlassUIValyusha();
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlassUIValyusha);
} else {
    initGlassUIValyusha();
}
