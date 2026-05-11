// Glass UI чат-виджет с современными эффектами
class GlassUIWidget {
    constructor(options = {}) {
        this.widgetId = `glass-ui-widget-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        this.botName = options.botName || "AI Assistant";
        this.botAvatar = options.botAvatar || "";
        this.theme = options.theme || "#6ea9d7";
        this.position = options.position || { bottom: '20px', right: '20px' };
        this.welcomeMessage = options.welcomeMessage || `Привет! Я ${this.botName}. На связи. ✨`;
        this.placeholder = options.placeholder || `Напишите сообщение ${this.botName}...`;
        this.onSendMessage = options.onSendMessage || null;
        this.onClose = options.onClose || null;
        this.isVisible = options.isVisible || false;
        this.horizontalOffset = typeof options.horizontalOffset === 'number' ? options.horizontalOffset : 100; // двигаем окно левее плавающей кнопки, но ближе к ней
        this.verticalOffset = typeof options.verticalOffset === 'number' ? options.verticalOffset : 20; // чуть ниже центра
        
        // Вычисляем z-index на основе позиции (чем выше, тем больше z-index)
        const bottomValue = parseInt(this.position.bottom);
        this.zIndex = 10000 + Math.floor(bottomValue / 10); // Хипыч: 10010, Кот Бро: 10025
        
        this.messages = [
            {
                id: '1',
                text: this.welcomeMessage,
                isBot: true,
                timestamp: new Date()
            }
        ];
        
        this.isTyping = false;
        this.container = null;
        
        this.init();
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

    computeWidgetWidth() {
        const viewportWidth = this.getViewportWidth();
        const margin = this.getViewportMargin();
        return Math.min(380, Math.max(280, viewportWidth - margin * 2));
    }

    computeTopOffset() {
        const viewportHeight = this.getViewportHeight();
        const viewportWidth = this.getViewportWidth();
        const margin = this.getViewportMargin();
        const desiredHeight = 600;
        const maxAllowedHeight = Math.max(320, viewportHeight - margin * 2);
        const effectiveHeight = Math.min(desiredHeight, maxAllowedHeight);
        const centeredTop = Math.max(margin, Math.floor((viewportHeight - effectiveHeight) / 2));
        const offsetTop = viewportWidth <= 768
            ? centeredTop
            : centeredTop + (typeof this.verticalOffset === 'number' ? this.verticalOffset : 0);
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
        const offset = typeof this.horizontalOffset === 'number' ? this.horizontalOffset : 0;
        const desiredRight = baseRight + offset;
        const maxRight = Math.max(margin, viewportWidth - widgetWidth - margin);
        const finalRight = Math.min(Math.max(margin, desiredRight), maxRight);
        return finalRight;
    }

    setStatusText(statusText, text, color, animationDuration) {
        const indicator = document.createElement('span');
        indicator.className = 'status-indicator';
        indicator.style.cssText = `
            display: inline-block;
            width: 6px;
            height: 6px;
            background: ${color};
            border-radius: 50%;
            margin-right: 6px;
            animation: statusPulse ${animationDuration} infinite;
        `;
        statusText.replaceChildren(indicator, document.createTextNode(text));
    }

    init() {
        this.createWidget();
        this.setupEventListeners();
        if (this.isVisible) {
            this.show();
        }
    }

    createWidget() {
        // Создаем основной контейнер с Glass UI эффектами
        this.container = document.createElement('div');
        this.container.className = 'glass-ui-widget';
        this.container.id = this.widgetId;
        const computedRight = this.computeRightOffset();
        const computedWidth = this.computeWidgetWidth();
        this.container.style.cssText = `
            position: fixed;
            bottom: auto;
            right: ${computedRight}px;
            width: ${computedWidth}px;
            height: 600px;
            background: rgba(18, 20, 26, 0.94);
            backdrop-filter: none;
            -webkit-backdrop-filter: none;
            border-radius: 24px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            box-shadow: 
                0 18px 42px rgba(0, 0, 0, 0.36),
                inset 0 1px 0 rgba(255, 255, 255, 0.3),
                inset 0 -1px 0 rgba(255, 255, 255, 0.1);
            overflow: hidden;
            display: flex;
            flex-direction: column;
            opacity: 0;
            visibility: hidden;
            transform: translateY(30px) scale(0.9);
            transition: opacity 0.24s ease, transform 0.24s ease, visibility 0.24s ease;
            z-index: ${this.zIndex};
            max-width: calc(100vw - 40px);
            max-height: calc(100vh - 80px);
        `;
        const { top, height } = this.computeTopOffset();
        this.container.style.top = `${top}px`;
        this.container.style.height = `${height}px`;

        // Создаем заголовок с градиентом
        const header = document.createElement('div');
        header.className = 'glass-chat-header';
        header.style.cssText = `
            background: linear-gradient(135deg, ${this.theme}dd, ${this.theme}aa);
            backdrop-filter: none;
            color: white;
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: relative;
            overflow: hidden;
        `;

        // Добавляем анимированный фон в заголовок
        const headerBg = document.createElement('div');
        headerBg.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent);
            animation: none;
            opacity: 0;
        `;
        header.appendChild(headerBg);

        const headerInfo = document.createElement('div');
        headerInfo.style.cssText = `
            display: flex;
            align-items: center;
            gap: 15px;
            position: relative;
            z-index: 1;
        `;

        if (this.botAvatar) {
            const avatarContainer = document.createElement('div');
            avatarContainer.style.cssText = `
                position: relative;
                width: 40px;
                height: 40px;
            `;

            const avatar = document.createElement('img');
            avatar.src = this.botAvatar;
            avatar.alt = this.botName;
            avatar.style.cssText = `
                width: 100%;
                height: 100%;
                border-radius: 50%;
                object-fit: cover;
                border: 2px solid rgba(255, 255, 255, 0.3);
            `;

            const avatarGlow = document.createElement('div');
            avatarGlow.style.cssText = `
                position: absolute;
                top: -2px;
                left: -2px;
                right: -2px;
                bottom: -2px;
                border-radius: 50%;
                background: linear-gradient(45deg, ${this.theme}, transparent, ${this.theme});
                animation: avatarRotate 4s linear infinite;
                z-index: -1;
            `;

            avatarContainer.appendChild(avatarGlow);
            avatarContainer.appendChild(avatar);
            headerInfo.appendChild(avatarContainer);
        }

        const headerText = document.createElement('div');
        const botName = document.createElement('div');
        botName.textContent = this.botName;
        botName.style.cssText = 'font-weight: 700; font-size: 16px;';
        const statusText = document.createElement('div');
        statusText.className = 'glass-status-text';
        statusText.style.cssText = 'font-size: 12px; opacity: 0.9;';
        this.setStatusText(statusText, 'онлайн', '#10b981', '2s');
        headerText.appendChild(botName);
        headerText.appendChild(statusText);
        headerInfo.appendChild(headerText);

        const closeButton = document.createElement('button');
        closeButton.textContent = '✕';
        closeButton.style.cssText = `
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.2);
            color: white;
            font-size: 16px;
            cursor: pointer;
            padding: 8px;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s ease;
            position: relative;
            z-index: 1;
        `;
        closeButton.addEventListener('mouseenter', () => {
            closeButton.style.background = 'rgba(255, 255, 255, 0.2)';
            closeButton.style.transform = 'scale(1.1)';
        });
        closeButton.addEventListener('mouseleave', () => {
            closeButton.style.background = 'rgba(255, 255, 255, 0.1)';
            closeButton.style.transform = 'scale(1)';
        });
        closeButton.addEventListener('click', () => {
            this.hide();
            if (this.onClose) this.onClose();
        });

        header.appendChild(headerInfo);
        header.appendChild(closeButton);

        // Создаем область сообщений с улучшенным дизайном
        const messagesArea = document.createElement('div');
        messagesArea.className = 'glass-messages-area';
        messagesArea.style.cssText = `
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            background: linear-gradient(135deg, 
                rgba(255, 255, 255, 0.05) 0%, 
                rgba(255, 255, 255, 0.02) 100%);
            position: relative;
        `;

        // Добавляем декоративные элементы в фон
        const bgDecor = document.createElement('div');
        bgDecor.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-image: 
                radial-gradient(circle at 20% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 80%, rgba(255, 255, 255, 0.05) 0%, transparent 50%);
            pointer-events: none;
        `;
        messagesArea.appendChild(bgDecor);

        // Создаем контейнер для сообщений
        const messagesList = document.createElement('div');
        messagesList.className = 'glass-messages-list';
        messagesList.style.cssText = `
            position: relative;
            z-index: 1;
        `;
        messagesArea.appendChild(messagesList);

        // Создаем улучшенный индикатор печатания
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'glass-typing-indicator';
        typingIndicator.style.cssText = `
            padding: 15px 20px;
            font-size: 14px;
            color: rgba(255, 255, 255, 0.8);
            font-style: italic;
            display: none;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border-radius: 15px;
            margin: 10px 0;
            border: 1px solid rgba(255, 255, 255, 0.1);
            position: relative;
            z-index: 1;
        `;
        
        const typingDots = document.createElement('span');
        typingDots.appendChild(document.createTextNode(`${this.botName} печатает`));
        const typingEllipsis = document.createElement('span');
        typingEllipsis.textContent = '...';
        typingEllipsis.style.animation = 'typingDots 1.5s infinite';
        typingDots.appendChild(typingEllipsis);
        typingIndicator.appendChild(typingDots);
        messagesArea.appendChild(typingIndicator);

        // Создаем улучшенное поле ввода
        const inputArea = document.createElement('div');
        inputArea.className = 'glass-input-area';
        inputArea.style.cssText = `
            padding: 20px;
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(15px);
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        `;

        const inputContainer = document.createElement('div');
        inputContainer.style.cssText = `
            display: flex;
            gap: 12px;
            align-items: center;
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 25px;
            padding: 8px;
            border: 1px solid rgba(255, 255, 255, 0.2);
            transition: all 0.3s ease;
        `;

        const messageInput = document.createElement('input');
        messageInput.type = 'text';
        messageInput.placeholder = this.placeholder;
        messageInput.className = 'glass-message-input';
        messageInput.id = `${this.widgetId}-input`;
        messageInput.style.cssText = `
            flex: 1;
            padding: 12px 16px;
            border: none;
            border-radius: 20px;
            outline: none;
            font-size: 14px;
            background: transparent;
            color: white;
            transition: all 0.3s ease;
        `;
        messageInput.addEventListener('focus', () => {
            inputContainer.style.borderColor = `${this.theme}80`;
            inputContainer.style.boxShadow = `0 0 20px ${this.theme}40`;
        });
        messageInput.addEventListener('blur', () => {
            inputContainer.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            inputContainer.style.boxShadow = 'none';
        });

        const sendButton = document.createElement('button');
        sendButton.textContent = '🚀';
        sendButton.className = 'glass-send-button';
        sendButton.style.cssText = `
            background: linear-gradient(135deg, ${this.theme}, ${this.theme}dd);
            color: white;
            border: none;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            font-size: 16px;
            box-shadow: 0 4px 15px ${this.theme}40;
        `;
        sendButton.addEventListener('mouseenter', () => {
            sendButton.style.transform = 'scale(1.1) rotate(15deg)';
            sendButton.style.boxShadow = `0 8px 25px ${this.theme}60`;
        });
        sendButton.addEventListener('mouseleave', () => {
            sendButton.style.transform = 'scale(1) rotate(0deg)';
            sendButton.style.boxShadow = `0 4px 15px ${this.theme}40`;
        });

        inputContainer.appendChild(messageInput);
        inputContainer.appendChild(sendButton);
        inputArea.appendChild(inputContainer);

        // Собираем виджет
        this.container.appendChild(header);
        this.container.appendChild(messagesArea);
        this.container.appendChild(inputArea);

        // Добавляем CSS анимации
        this.addGlassUIStyles();

        // Добавляем в DOM
        document.body.appendChild(this.container);

        // Рендерим начальные сообщения
        this.renderMessages();
    }

    addGlassUIStyles() {
        const styles = `
            @keyframes headerShine {
                0%, 100% { transform: translateX(-100%); }
                50% { transform: translateX(100%); }
            }

            @keyframes avatarRotate {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }

            @keyframes statusPulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.5; transform: scale(1.2); }
            }

            @keyframes typingDots {
                0%, 20% { opacity: 0; }
                50% { opacity: 1; }
                100% { opacity: 0; }
            }

            @keyframes messageSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(20px) scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }

            .glass-ui-widget::-webkit-scrollbar {
                width: 6px;
            }

            .glass-ui-widget::-webkit-scrollbar-track {
                background: rgba(255, 255, 255, 0.1);
                border-radius: 3px;
            }

            .glass-ui-widget::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.3);
                border-radius: 3px;
            }

            .glass-ui-widget::-webkit-scrollbar-thumb:hover {
                background: rgba(255, 255, 255, 0.5);
            }

            .glass-messages-area::-webkit-scrollbar {
                width: 4px;
            }

            .glass-messages-area::-webkit-scrollbar-track {
                background: transparent;
            }

            .glass-messages-area::-webkit-scrollbar-thumb {
                background: rgba(255, 255, 255, 0.2);
                border-radius: 2px;
            }

            /* Адаптивные стили для мобильных устройств - БЕЗ ПОЗИЦИОНИРОВАНИЯ */
            @media (max-width: 768px) {
                .glass-ui-widget {
                    max-width: calc(100vw - 20px) !important;
                    max-height: calc(100vh - 100px) !important;
                    border-radius: 20px !important;
                }
                
                .glass-ui-widget .glass-chat-header {
                    padding: 15px !important;
                }
                
                .glass-ui-widget .glass-messages-area {
                    padding: 15px !important;
                }
                
                .glass-ui-widget .glass-input-area {
                    padding: 15px !important;
                }
            }

            @media (max-width: 480px) {
                .glass-ui-widget {
                    max-width: calc(100vw - 10px) !important;
                    max-height: calc(100vh - 80px) !important;
                    border-radius: 16px !important;
                }
                
                .glass-ui-widget .glass-chat-header {
                    padding: 12px !important;
                }
                
                .glass-ui-widget .glass-messages-area {
                    padding: 12px !important;
                }
                
                .glass-ui-widget .glass-input-area {
                    padding: 12px !important;
                }
            }

            /* Сброс всех возможных конфликтующих стилей */
            .glass-ui-widget * {
                box-sizing: border-box;
            }
            
            .glass-ui-widget {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
                line-height: normal !important;
                text-align: left !important;
            }
        `;

        const styleSheet = document.createElement('style');
        styleSheet.textContent = styles;
        document.head.appendChild(styleSheet);
    }

    setupEventListeners() {
        const messageInput = this.container.querySelector('.glass-message-input');
        const sendButton = this.container.querySelector('.glass-send-button');

        if (!messageInput || !sendButton) {
            console.error(`❌ GlassUIWidget: Не найдены элементы для ${this.botName}`, {
                messageInput: !!messageInput,
                sendButton: !!sendButton,
                container: this.container
            });
            return;
        }

        this.boundResetPosition = () => {
            if (this.isVisible) this.resetPosition();
        };
        window.addEventListener('resize', this.boundResetPosition);
        window.addEventListener('orientationchange', this.boundResetPosition);

        const sendMessage = () => {
            const message = messageInput.value.trim();
            if (message) {
                this.handleSendMessage(message);
                messageInput.value = '';
            }
        };

        sendButton.addEventListener('click', sendMessage);
        messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }

    async handleSendMessage(message) {
        // Добавляем сообщение пользователя
        const userMessage = {
            id: Date.now().toString(),
            text: message,
            isBot: false,
            timestamp: new Date()
        };

        this.messages.push(userMessage);
        this.renderMessages();
        this.setTyping(true);

        try {
            if (this.onSendMessage) {
                const botResponse = await this.onSendMessage(message);
                
                const botMessage = {
                    id: (Date.now() + 1).toString(),
                    text: botResponse || "Извините, произошла ошибка. Попробуйте еще раз.",
                    isBot: true,
                    timestamp: new Date()
                };

                this.messages.push(botMessage);
                this.renderMessages();
            }
        } catch (error) {
            console.error('Ошибка отправки сообщения:', error);
            
            const errorMessage = {
                id: (Date.now() + 1).toString(),
                text: "Извините, произошла ошибка. Попробуйте еще раз.",
                isBot: true,
                timestamp: new Date()
            };

            this.messages.push(errorMessage);
            this.renderMessages();
        } finally {
            this.setTyping(false);
        }
    }

    renderMessages() {
        const messagesList = this.container.querySelector('.glass-messages-list');
        messagesList.replaceChildren();

        this.messages.forEach((message, index) => {
            const messageElement = document.createElement('div');
            messageElement.className = `glass-message ${message.isBot ? 'bot-message' : 'user-message'}`;
            
            const messageStyle = message.isBot ? `
                display: flex;
                margin-bottom: 20px;
                align-items: flex-start;
                gap: 12px;
                animation: messageSlideIn 0.4s ease-out ${index * 0.1}s both;
            ` : `
                display: flex;
                margin-bottom: 20px;
                justify-content: flex-end;
                animation: messageSlideIn 0.4s ease-out ${index * 0.1}s both;
            `;
            
            messageElement.style.cssText = messageStyle;

            if (message.isBot && this.botAvatar) {
                const avatar = document.createElement('img');
                avatar.src = this.botAvatar;
                avatar.style.cssText = `
                    width: 28px;
                    height: 28px;
                    border-radius: 50%;
                    object-fit: cover;
                    margin-top: 4px;
                    border: 2px solid rgba(255, 255, 255, 0.3);
                `;
                messageElement.appendChild(avatar);
            }

            const bubble = document.createElement('div');
            bubble.className = 'glass-message-bubble';
            bubble.style.cssText = message.isBot ? `
                background: rgba(255, 255, 255, 0.1);
                backdrop-filter: blur(15px);
                color: white;
                padding: 14px 18px;
                border-radius: 20px 20px 20px 6px;
                max-width: 75%;
                word-wrap: break-word;
                line-height: 1.5;
                border: 1px solid rgba(255, 255, 255, 0.2);
                box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
                position: relative;
                overflow: hidden;
            ` : `
                background: linear-gradient(135deg, ${this.theme}dd, ${this.theme});
                color: white;
                padding: 14px 18px;
                border-radius: 20px 20px 6px 20px;
                max-width: 75%;
                word-wrap: break-word;
                line-height: 1.5;
                box-shadow: 0 4px 15px ${this.theme}40;
                position: relative;
                overflow: hidden;
            `;

            // Добавляем блик для сообщений бота
            if (message.isBot) {
                const shine = document.createElement('div');
                shine.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
                    animation: messageShine 2s ease-in-out infinite;
                `;
                bubble.appendChild(shine);
            }

            const textContent = document.createElement('div');
            textContent.textContent = message.text;
            textContent.style.position = 'relative';
            textContent.style.zIndex = '1';
            bubble.appendChild(textContent);

            messageElement.appendChild(bubble);
            messagesList.appendChild(messageElement);
        });

        // Прокручиваем вниз с анимацией
        setTimeout(() => {
            const messagesArea = this.container.querySelector('.glass-messages-area');
            messagesArea.scrollTo({
                top: messagesArea.scrollHeight,
                behavior: 'smooth'
            });
        }, 100);
    }

    setTyping(isTyping) {
        this.isTyping = isTyping;
        const typingIndicator = this.container.querySelector('.glass-typing-indicator');
        const statusText = this.container.querySelector('.glass-status-text');
        
        if (isTyping) {
            typingIndicator.style.display = 'block';
            this.setStatusText(statusText, 'печатает...', '#fbbf24', '1s');
        } else {
            typingIndicator.style.display = 'none';
            this.setStatusText(statusText, 'онлайн', '#10b981', '2s');
        }
    }

    show() {
        console.log(`%c🔮 GlassUIWidget.show() вызван для ${this.botName}`, 'color: #3b82f6; font-weight: bold;');
        console.log(`%c📍 Позиция: right: ${this.computeRightOffset()}px, z-index: ${this.zIndex}`, 'color: #10b981;');
        
        this.isVisible = true;
        
        // Сбрасываем позиционирование к стандартным значениям
        this.resetPosition();
        
        this.container.style.opacity = '1';
        this.container.style.visibility = 'visible';
        this.container.style.transform = 'translateY(0) scale(1)';
        
        console.log(`%c✅ ${this.botName} чат показан с z-index: ${this.zIndex}`, 'color: #10b981; font-weight: bold;');
        
        // Фокус на поле ввода с задержкой
        setTimeout(() => {
            const input = this.container.querySelector('.glass-message-input');
            if (input) input.focus();
        }, 400);
    }

    hide() {
        this.isVisible = false;
        this.container.style.opacity = '0';
        this.container.style.visibility = 'hidden';
        this.container.style.transform = 'translateY(30px) scale(0.9)';
    }

    resetPosition() {
        console.log(`%c🔄 Сброс позиционирования для ${this.botName}`, 'color: #f97316; font-weight: bold;');
        const computedRight = this.computeRightOffset();
        const computedWidth = this.computeWidgetWidth();
        console.log(`%c📍 Центрируем чат: right: ${computedRight}px, z-index: ${this.zIndex}`, 'color: #fbbf24;');

        const { top, height } = this.computeTopOffset();
        console.log(`%c📐 Итоговая позиция ${this.botName}: top ${top}px, height ${height}px`, 'color: #38bdf8;');
        
        // Принудительно сбрасываем все позиционирующие стили
        this.container.style.setProperty('position', 'fixed', 'important');
        this.container.style.setProperty('top', `${top}px`, 'important');
        this.container.style.setProperty('bottom', 'auto', 'important');
        this.container.style.setProperty('right', `${computedRight}px`, 'important');
        this.container.style.setProperty('left', 'auto', 'important');
        this.container.style.setProperty('width', `${computedWidth}px`, 'important');
        this.container.style.setProperty('height', `${height}px`, 'important');
        this.container.style.setProperty('max-width', `calc(100vw - ${this.getViewportMargin() * 2}px)`, 'important');
        this.container.style.setProperty('max-height', `calc(100vh - ${this.getViewportMargin() * 2}px)`, 'important');
        this.container.style.setProperty('z-index', this.zIndex.toString(), 'important');
        this.container.style.setProperty('transform', 'none', 'important');
        
        console.log(`%c✅ Позиционирование ${this.botName} сброшено с !important (z-index: ${this.zIndex})`, 'color: #10b981;');
        
        // Дополнительная проверка через setTimeout
        setTimeout(() => {
            const computed = window.getComputedStyle(this.container);
            console.log(`%c🔍 Проверка позиции ${this.botName}: bottom=${computed.bottom}, right=${computed.right}, z-index=${computed.zIndex}`, 'color: #8b5cf6;');
        }, 100);
    }

    destroy() {
        if (this.boundResetPosition) {
            window.removeEventListener('resize', this.boundResetPosition);
            window.removeEventListener('orientationchange', this.boundResetPosition);
        }
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}

// Добавляем дополнительные стили для анимаций
const additionalStyles = `
    @keyframes messageShine {
        0%, 100% { transform: translateX(-100%); }
        50% { transform: translateX(100%); }
    }
`;

const additionalStyleSheet = document.createElement('style');
additionalStyleSheet.textContent = additionalStyles;
document.head.appendChild(additionalStyleSheet);

// Экспортируем класс
window.GlassUIWidget = GlassUIWidget; 
