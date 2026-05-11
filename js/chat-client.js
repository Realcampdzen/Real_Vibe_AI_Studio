(() => {
    'use strict';

    const API_BASE = '';
    const OWNER_TOKEN_STORAGE_KEY = 'rv_owner_token';

    const removeOwnerTokenFromUrl = () => {
        const url = new URL(window.location.href);
        if (!url.searchParams.has(OWNER_TOKEN_STORAGE_KEY)) {
            return;
        }

        url.searchParams.delete(OWNER_TOKEN_STORAGE_KEY);
        window.history.replaceState({}, '', url.toString());
    };

    const discardBrowserOwnerToken = () => {
        try {
            window.localStorage.removeItem(OWNER_TOKEN_STORAGE_KEY);
        } catch (error) {
            // localStorage can be unavailable in private or restricted contexts.
        }

        removeOwnerTokenFromUrl();
    };

    const getChatHeaders = () => ({
        'Content-Type': 'application/json'
    });

    const createChatError = (message) => {
        const error = new Error(message);
        error.isUserVisible = true;
        return error;
    };

    const getErrorMessage = (status, payload) => {
        if (status === 429) {
            if (payload?.code === 'chat_daily_limit') {
                return 'На сегодня лимит сообщений исчерпан. Напишите напрямую в Telegram @Stivanovv.';
            }

            return 'Слишком много сообщений подряд. Подождите минуту и попробуйте снова.';
        }

        if (status === 400) {
            return payload?.error || 'Сообщение не отправлено: проверьте текст и попробуйте еще раз.';
        }

        if (status >= 500) {
            return 'Сервис временно недоступен. Попробуйте позже или напишите в Telegram @Stivanovv.';
        }

        return payload?.error || 'Сейчас не получилось отправить сообщение. Попробуйте позже или напишите в Telegram @Stivanovv.';
    };

    const readJson = async (response) => {
        try {
            return await response.json();
        } catch (error) {
            return {};
        }
    };

    const parseChatResponse = async (response) => {
        const payload = await readJson(response);

        if (!response.ok) {
            throw createChatError(getErrorMessage(response.status, payload));
        }

        const reply = payload.reply || payload.response;
        if (!reply || typeof reply !== 'string') {
            throw createChatError('Ответ сервиса пустой. Попробуйте еще раз или напишите в Telegram @Stivanovv.');
        }

        return reply.trim();
    };

    discardBrowserOwnerToken();

    window.RealVibeChat = {
        API_BASE,
        getHeaders: getChatHeaders,
        parseResponse: parseChatResponse
    };
})();
