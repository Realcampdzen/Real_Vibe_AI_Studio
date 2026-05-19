// Glass UI Wellness Bro - safe health assistant for public site chat
class GlassUIHealth {
    constructor() {
        this.name = 'Wellness Bro';
        this.avatar = 'images/wellness-bro-avatar-384.webp';
        this.isVisible = false;
        this.responses = [
            'Привет! Я Wellness Bro, ассистент по здоровью 🩺 Помогаю понимать анализы, вести дневники, готовить вопросы врачу и держать курс без паники. Я не врач и не назначаю лечение.',
            'Могу помочь с дневником самочувствия: сон, питание, симптомы, давление, лекарства по назначению врача и вопросы к следующему приёму.',
            'Если есть боль в груди, признаки инсульта, сильная одышка, потеря сознания, кровотечение или резкое ухудшение, лучше сразу обращаться в экстренную помощь.',
            'Могу предварительно разобрать показатели анализа простыми словами и подсказать, что обсудить с врачом. Финальные выводы остаются за специалистом.',
            'Для health-проекта можно сделать такого ассистента с безопасными сценариями, consent, лимитами и без хранения медицинских сообщений. Напишите @Stivanovv.'
        ];
        this.init();
    }

    init() {
        this.createFloatingButton();
        this.createChatWidget();
    }

    createFloatingButton() {
        this.floatingButton = document.createElement('div');
        this.floatingButton.className = 'glass-ui-floating-button glass-ui-health-button';
        this.floatingButton.dataset.tooltip = 'Wellness Bro • ассистент по здоровью';
        this.floatingButton.setAttribute('role', 'button');
        this.floatingButton.setAttribute('tabindex', '0');
        this.floatingButton.setAttribute('aria-label', 'Открыть чат Wellness Bro');

        this.floatingButton.appendChild(this.createButtonBackground());
        this.floatingButton.appendChild(this.createAvatarOrIcon());
        this.floatingButton.appendChild(this.createBadge());

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
        const avatar = document.createElement('img');
        avatar.className = 'glass-ui-floating-avatar';
        avatar.src = this.avatar;
        avatar.alt = this.name;
        return avatar;
    }

    createBadge() {
        const badge = document.createElement('div');
        badge.className = 'glass-ui-notification-badge glass-online-badge glass-health-notification-badge';
        badge.setAttribute('aria-label', 'Wellness Bro на связи');
        badge.title = 'На связи';
        return badge;
    }

    createChatWidget() {
        this.glassWidget = new GlassUIWidget({
            botName: this.name,
            botAvatar: this.avatar,
            themeClass: 'glass-theme-health',
            statusText: 'Ассистент по здоровью',
            welcomeMessage: 'Привет! Я Wellness Bro 🩺 Помогаю понимать анализы, вести дневники, разбирать питание и готовить вопросы по терапии для врача. Диагнозы и назначения остаются за специалистом.',
            placeholder: 'Анализы, питание, дневник...',
            quickQuestions: ['Разобрать анализы', 'Дневник самочувствия', 'Питание и режим', 'Вопросы врачу'],
            position: { bottom: '100px', right: '20px' },
            onSendMessage: this.handleMessage.bind(this),
            onClose: this.hideChat.bind(this)
        });
    }

    async handleMessage(message) {
        try {
            const apiBase = (window.__AI_API_BASE__ || '').replace(/\/$/, '');
            const endpoint = apiBase ? `${apiBase}/api/health/chat` : '/api/health/chat';
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
                return reply || this.getFallbackResponse(message);
            } catch (fetchError) {
                window.clearTimeout(timeoutId);
                throw fetchError;
            }
        } catch (error) {
            if (error?.isUserVisible) {
                throw error;
            }

            return this.getFallbackResponse(message);
        }
    }

    getFallbackResponse(message = '') {
        const lowerMessage = message.toLowerCase();
        if (
            lowerMessage.includes('боль в груди') ||
            lowerMessage.includes('инсульт') ||
            lowerMessage.includes('потер') && lowerMessage.includes('созн') ||
            lowerMessage.includes('кровотеч') ||
            lowerMessage.includes('задыха') ||
            lowerMessage.includes('суицид') ||
            lowerMessage.includes('анафилак')
        ) {
            return 'Это может быть срочная ситуация. Пожалуйста, обратитесь в скорую или экстренную помощь. Бот не заменяет врача и не подходит для угрозы жизни.';
        }
        if (lowerMessage.includes('анализ') || lowerMessage.includes('справк')) {
            return 'Могу помочь составить список вопросов по анализу или справке: показатель, референс лаборатории, дата, симптомы, лекарства и что именно уточнить у врача. Диагнозы и назначения делает врач.';
        }
        if (lowerMessage.includes('симптом')) {
            return 'Для подготовки к врачу удобно записать: когда началось, где и как ощущается, что усиливает, температуру, давление, лекарства, аллергии и сопутствующие симптомы. При резком ухудшении лучше обращаться за медицинской помощью.';
        }
        if (lowerMessage.includes('сто') || lowerMessage.includes('сколько') || lowerMessage.includes('заявк') || lowerMessage.includes('health-бот')) {
            return 'Health-бота лучше проектировать отдельно: безопасный промпт, лимиты, consent, отсутствие хранения медицинского текста, дневники, напоминания и понятные сценарии эскалации к врачу. Для оценки напишите @Stivanovv.';
        }
        if (lowerMessage.includes('что умеешь') || lowerMessage.includes('умеешь')) {
            return 'Я умею помогать с подготовкой к врачу, чек-листами симптомов, вопросами по медицинским документам и демонстрацией безопасного health-бота. Не ставлю диагнозы и не назначаю лечение.';
        }
        return this.responses[Math.floor(Math.random() * this.responses.length)];
    }

    closeOtherChats() {
        if (window.glassUIBroCat?.isVisible) window.glassUIBroCat.hideChat();
        if (window.glassUIValyusha?.isVisible) window.glassUIValyusha.hideChat();
        if (window.glassUIHipych?.isVisible && window.glassUIHipych !== this) window.glassUIHipych.hideChat();
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

function initGlassUIHealth() {
    if (!window.glassUIHealth) {
        window.glassUIHealth = new GlassUIHealth();
    }
    window.glassUIHipych = window.glassUIHealth;
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlassUIHealth);
} else {
    initGlassUIHealth();
}
