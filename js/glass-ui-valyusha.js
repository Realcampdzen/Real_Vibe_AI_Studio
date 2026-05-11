// Glass UI НейроVалюша — дружелюбная вожатая Реального Лагеря
class GlassUIValyusha {
    constructor() {
        this.name = "НейроVалюша";
        this.avatar = "public/НейроВалюша_аватар.jpg";
        this.themePrimary = "#a855f7";
        this.themeSecondary = "#ec4899";
        this.themeGradient = `linear-gradient(135deg, ${this.themePrimary}dd, ${this.themeSecondary})`;
        this.isVisible = false;

        this.responses = [
            "Привет! Я НейроVалюша — дружелюбная вожатая Реального Лагеря. Здесь дети прокачивают 4К навыки и изучают нейросети! 💜✨",
            "Люблю помогать ребятам вникать в программу лагеря и находить своё призвание. Хочешь рассказать, что тебя вдохновляет? 💜",
            "В Реальном Лагере мы учим быть вожатыми, создавать проекты и вести сообщества. Погнали в команду мечты! 🎯",
            "Я могу поддержать, подсказать упражнения или помочь с нейропроектом. Просто спроси! 📚✨",
            "Наша миссия — чтобы каждый ребёнок почувствовал себя лидером и создателем будущего. Уже хочется shine'ить? 🌟",
            "Я продвигаю ценности лагеря в соцсетях и в жизни: уважение, творчество и заботу. Давай делиться теплом! 🤗",
            "Хочешь узнать, как мы внедряем AI в детские программы и медиа? Расскажу все фишки! 🤖💬",
            "Люблю писать тёплые комментарии в ВК и Telegram сообществах лагеря. Присоединяйся к нашему доброму движению! 💌",
            "Вожатый — это человек, который помогает раскрыть талант. В Реальном Лагере этому можно научиться. Хочешь попробовать? 🏕️",
            "Если тебе нужно вдохновение для поста или проекта лагеря — давай brainstorm вместе! 💜🧠"
        ];

        this.init();
    }

    init() {
        this.addGlassUIStyles();
        this.createFloatingButton();
        this.createChatWidget();
    }

    createFloatingButton() {
        this.floatingButton = document.createElement('div');
        this.floatingButton.className = 'glass-ui-valyusha-button';
        this.floatingButton.style.cssText = `
            position: fixed;
            bottom: 180px;
            right: 20px;
            width: 70px;
            height: 70px;
            background: ${this.themeGradient};
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
            border-radius: 50%;
            border: 2px solid rgba(255, 255, 255, 0.3);
            box-shadow:
                0 10px 24px rgba(168, 85, 247, 0.34),
                inset 0 2px 0 rgba(255, 255, 255, 0.3),
                inset 0 -2px 0 rgba(0, 0, 0, 0.1);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.2s ease, filter 0.2s ease, background 0.2s ease;
            z-index: 1004;
            overflow: hidden;
            animation: none;
        `;
        this.floatingButton.dataset.tooltip = 'НейроVалюша • вожатая Реального Лагеря';

        const buttonBg = document.createElement('div');
        buttonBg.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.2), transparent);
            animation: none;
            opacity: 0;
            border-radius: 50%;
        `;
        this.floatingButton.appendChild(buttonBg);

        if (this.avatar) {
            const avatarImg = document.createElement('img');
            avatarImg.src = this.avatar;
            avatarImg.alt = this.name;
            avatarImg.style.cssText = `
                width: 64px;
                height: 64px;
                border-radius: 50%;
                object-fit: cover;
                position: relative;
                z-index: 1;
                border: 2px solid rgba(255, 255, 255, 0.5);
                box-shadow: 0 8px 20px rgba(147, 51, 234, 0.35);
            `;
            this.floatingButton.appendChild(avatarImg);
        } else {
            const icon = document.createElement('div');
            icon.textContent = '💜';
            icon.style.cssText = `
                font-size: 28px;
                position: relative;
                z-index: 1;
                animation: valyushaHeartBeat 2.2s ease-in-out infinite;
            `;
            this.floatingButton.appendChild(icon);
        }

        const notificationBadge = document.createElement('div');
        notificationBadge.className = 'glass-valyusha-notification-badge';
        notificationBadge.style.cssText = `
            position: absolute;
            top: -5px;
            right: -5px;
            width: 20px;
            height: 20px;
            background: linear-gradient(135deg, #f472b6, #d946ef);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
            color: white;
            border: 2px solid rgba(255, 255, 255, 0.8);
            animation: none;
            box-shadow: 0 0 6px rgba(236, 72, 153, 0.45);
        `;
        notificationBadge.textContent = '✨';
        this.floatingButton.appendChild(notificationBadge);

        this.floatingButton.addEventListener('mouseenter', () => {
            this.floatingButton.classList.add('glass-ui-valyusha-hover');
        });

        this.floatingButton.addEventListener('mouseleave', () => {
            this.floatingButton.classList.remove('glass-ui-valyusha-hover');
        });

        this.floatingButton.addEventListener('click', () => {
            this.toggleChat();
            this.addValyushaSparkle();
        });

        document.body.appendChild(this.floatingButton);
    }

    createChatWidget() {
        console.log('%c💜 Создание чат-виджета НейроVалюши...', 'color: #a855f7; font-weight: bold;');

        this.glassWidget = new GlassUIWidget({
            botName: this.name,
            botAvatar: this.avatar,
            theme: this.themePrimary,
            accent: this.themeSecondary,
            welcomeMessage: "Привет! Я НейроВалюша, дружелюбная AI-вожатая Реального Лагеря. Помогаю говорить о развитии, 4К навыках и живых персона-ботах. 💜",
            placeholder: "Спроси НейроВалюшу про лагерь или AI...",
            position: { bottom: '280px', right: '20px' },
            onSendMessage: this.handleMessage.bind(this),
            onClose: this.hideChat.bind(this)
        });

        console.log('%c✅ Чат-виджет НейроVалюши создан с позицией: bottom: 280px, right: 20px', 'color: #10b981;');
    }

    addGlassUIStyles() {
        const styles = `
            @keyframes valyushaFloat {
                0%, 100% {
                    transform: translateY(0px) rotate(0deg);
                    filter: hue-rotate(0deg);
                }
                33% {
                    transform: translateY(-6px) rotate(-2deg);
                    filter: hue-rotate(8deg);
                }
                66% {
                    transform: translateY(-3px) rotate(1deg);
                    filter: hue-rotate(15deg);
                }
            }

            @keyframes valyushaShine {
                0%, 100% {
                    transform: translateX(-100%) rotate(45deg) scale(0.8);
                    opacity: 0;
                }
                50% {
                    transform: translateX(100%) rotate(45deg) scale(1.2);
                    opacity: 1;
                }
            }

            @keyframes valyushaBadgePulse {
                0%, 100% {
                    transform: scale(1) rotate(0deg);
                    box-shadow: 0 0 0 0 rgba(236, 72, 153, 0.7);
                }
                50% {
                    transform: scale(1.3) rotate(180deg);
                    box-shadow: 0 0 0 8px rgba(236, 72, 153, 0);
                }
            }

            @keyframes valyushaHeartBeat {
                0%, 100% { transform: rotate(0deg); }
                25% { transform: rotate(-5deg) scale(1.1); }
                75% { transform: rotate(5deg) scale(0.9); }
            }

            .glass-ui-valyusha-button::before {
                content: '';
                position: absolute;
                top: -2px;
                left: -2px;
                right: -2px;
                bottom: -2px;
                background: linear-gradient(45deg, ${this.themePrimary}, transparent, ${this.themeSecondary});
                border-radius: 50%;
                z-index: -1;
                animation: none;
                opacity: 0.55;
            }

            @keyframes valyushaBorderRotate {
                from { transform: rotate(0deg) scale(1); }
                50% { transform: rotate(180deg) scale(1.05); }
                to { transform: rotate(360deg) scale(1); }
            }

            .glass-ui-valyusha-button.glass-ui-valyusha-hover {
                box-shadow:
                    0 14px 32px rgba(168, 85, 247, 0.48),
                    0 0 18px rgba(236, 72, 153, 0.28),
                    inset 0 2px 0 rgba(255, 255, 255, 0.5),
                    inset 0 -2px 0 rgba(0, 0, 0, 0.2) !important;
                filter: brightness(1.08) !important;
            }

            .glass-ui-valyusha-button.glass-ui-valyusha-hover::after {
                content: '';
                position: absolute;
                top: -20px;
                left: -20px;
                right: -20px;
                bottom: -20px;
                border-radius: 50%;
                background: radial-gradient(circle, rgba(236, 72, 153, 0.7) 0%, rgba(236, 72, 153, 0.3) 40%, transparent 70%) !important;
                filter: none !important;
                opacity: 0.35;
                z-index: -2;
            }
            .valyusha-sparkle {
                position: absolute;
                pointer-events: none;
                font-size: 18px;
                color: white;
                animation: valyushaSparklePop 1s ease-out forwards;
                z-index: 10005;
                text-shadow: 0 0 10px rgba(236, 72, 153, 0.8);
            }

            @keyframes valyushaSparklePop {
                0% { transform: scale(0) rotate(0deg); opacity: 1; }
                50% { transform: scale(1.4) rotate(180deg); opacity: 0.8; }
                100% { transform: scale(2) rotate(360deg); opacity: 0; }
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    addValyushaSparkle() {
        const sparkles = ['✨', '🌟', '💜', '⭐'];
        const sparkle = document.createElement('div');
        sparkle.className = 'valyusha-sparkle';
        sparkle.textContent = sparkles[Math.floor(Math.random() * sparkles.length)];

        const rect = this.floatingButton.getBoundingClientRect();
        sparkle.style.left = (rect.left + rect.width / 2) + 'px';
        sparkle.style.top = (rect.top + rect.height / 2) + 'px';

        document.body.appendChild(sparkle);

        setTimeout(() => {
            if (sparkle.parentNode) {
                sparkle.parentNode.removeChild(sparkle);
            }
        }, 1000);
    }

    async handleMessage(message) {
        try {
            const requestBody = {
                message: message,
                userId: 'user-' + Date.now()
            };

            const apiBase = (window.__AI_API_BASE__ || '').replace(/\/$/, '');
            const endpoint = apiBase ? `${apiBase}/api/valyusha/chat` : '/api/valyusha/chat';

            // Добавляем таймаут 60 секунд для запроса
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 секунд
            
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: window.RealVibeChat?.getHeaders?.() || { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody),
                    signal: controller.signal
                });

                clearTimeout(timeoutId);

                if (response.status === 429 && window.RealVibeChat?.parseResponse) {
                    return await window.RealVibeChat.parseResponse(response);
                }

                if (!response.ok) {
                    await response.text().catch(() => '');
                    console.error('💜 НейроВалюша: ошибка HTTP:', response.status);
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                
                const reply = data.reply || data.response;
                if (reply && typeof reply === 'string' && reply.trim().length > 0) {
                    return reply;
                } else {
                    console.warn('💜 НейроВалюша: ответ пустой или некорректный, используем fallback.');
                    return this.getFallbackResponse(message);
                }
            } catch (fetchError) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    console.error('💜 НейроВалюша: запрос превысил таймаут (60 секунд)');
                    throw new Error('Запрос превысил время ожидания');
                }
                throw fetchError;
            }
        } catch (error) {
            console.error('💜 Ошибка при запросе к НейроВалюше:', error.message);
            // Fail-closed: без "выдуманных" ответов. Показываем явную проблему с API.
            return this.getFallbackResponse(message);
        }
    }

    getFallbackResponse(message) {
        const apiBase = (window.__AI_API_BASE__ || '').replace(/\/$/, '');
        const host = apiBase ? apiBase.replace(/^https?:\/\//, '') : window.location.host || 'AI API';
        return `Сейчас я не могу подключиться к AI‑сервису (${host}). Похоже, ошибка соединения — поэтому я не буду выдумывать ответ.\n\nПопробуй обновить страницу (Ctrl+F5) или зайти позже. Если проблема повторяется — напиши @Stivanovv.`;
    }

    closeOtherChats() {
        if (window.glassUIBroCat && window.glassUIBroCat.isVisible) {
            window.glassUIBroCat.hideChat();
        }

        if (window.glassUIHipych && window.glassUIHipych.isVisible) {
            window.glassUIHipych.hideChat();
        }

        const oldChatOverlay = document.getElementById('chat-overlay');
        if (oldChatOverlay && !oldChatOverlay.classList.contains('hidden')) {
            oldChatOverlay.classList.add('hidden');
        }
    }

    showChat() {
        console.log('%c💜 НейроVалюша: showChat() вызван', 'color: #d946ef; font-weight: bold;');

        this.closeOtherChats();
        this.isVisible = true;

        if (this.glassWidget) {
            this.glassWidget.show();
        }

        const badge = this.floatingButton.querySelector('.glass-valyusha-notification-badge');
        if (badge) {
            badge.style.display = 'none';
        }

        this.floatingButton.style.background = this.themeGradient;
        this.floatingButton.style.filter = 'brightness(1.1)';

        console.log('%c✅ НейроVалюша: чат показан', 'color: #10b981; font-weight: bold;');
    }

    hideChat() {
        console.log('%c💜 НейроVалюша: hideChat() вызван', 'color: #a855f7; font-weight: bold;');

        this.isVisible = false;

        if (this.glassWidget) {
            this.glassWidget.hide();
        }

        this.floatingButton.style.background = this.themeGradient;
        this.floatingButton.style.filter = 'brightness(1)';

        console.log('%c✅ НейроVалюша: чат скрыт', 'color: #10b981; font-weight: bold;');
    }

    toggleChat() {
        if (this.isVisible) {
            this.hideChat();
        } else {
            this.showChat();
        }
    }

    destroy() {
        if (this.floatingButton && this.floatingButton.parentNode) {
            this.floatingButton.parentNode.removeChild(this.floatingButton);
        }
        if (this.glassWidget) {
            this.glassWidget.destroy();
        }
    }
}

function initGlassUIValyusha() {
    if (!window.glassUIValyusha) {
        window.glassUIValyusha = new GlassUIValyusha();

        console.log('%c💜 Glass UI НейроVалюша загружена!', 'color: #d946ef; font-size: 16px; font-weight: bold;');
        console.log('%c✨ Вожатские glass эффекты активны', 'color: #a855f7; font-size: 12px;');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlassUIValyusha);
} else {
    initGlassUIValyusha();
}

