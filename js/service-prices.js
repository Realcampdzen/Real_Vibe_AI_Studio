(function exposeServicePriceOverrides() {
  window.SERVICE_PRICE_OVERRIDES = {
  "version": 1,
  "updatedAt": "2026-06-03T00:00:00.000Z",
  "services": {
    "ai-video": {
      "title": "AI-видео и рекламные рилсы",
      "price": "от 9 000₽",
      "note": "Входной товарный ролик/Reels от 9 000₽; 15 000₽ за более длинный multi-model ролик; 30 000₽ за сложный ролик 15-25 сек с монтажом."
    },
    "ai-photo": {
      "title": "AI-фото для e-commerce и key visual",
      "price": "от 20 000₽ за сет",
      "note": "Минимальный сет визуалов для карточек, баннеров или key visual."
    },
    "ecom-animation": {
      "title": "ИИ-анимация и инфографика для e-commerce",
      "price": "от 35 000₽",
      "note": "Product loop, товарная сцена или короткая e-commerce инфографика."
    },
    "smm-content": {
      "title": "SMM и контент",
      "price": "от 40 000₽",
      "note": "Месячный или проектный пакет: стратегия, рубрики, тексты, сценарии, AI-шаблоны."
    },
    "music": {
      "title": "Создание музыки",
      "price": "от 20 000₽",
      "note": "Трек, музыкальная тема, джингл или версия под ролик/приложение."
    },
    "sound-design": {
      "title": "Озвучка и саунд-дизайн",
      "price": "от 15 000₽",
      "note": "Озвучка, SFX, аудио-чистка, сведение или звуковое оформление ролика."
    },
    "apps": {
      "title": "MVP, SaaS и приложения с AI-функциями",
      "price": "от 50 000₽ за MVP-модуль",
      "note": "Первый production-ready модуль: архитектура, база/API, роли, Android/PWA, CRM или дашборд."
    },
    "bots": {
      "title": "Telegram-боты с AI, базой и admin-панелью",
      "price": "от 10 000₽",
      "note": "Минимальный порог для бота с AI/БД/admin; сложные боты считать отдельно."
    },
    "websites": {
      "title": "Сайты и веб-сервисы с AI-функциями",
      "price": "от 70 000₽",
      "note": "Премиальный сайт, лендинг или веб-сервис с AI/формами/интеграциями."
    },
    "ai-agents": {
      "title": "AI-агенты и GPT-ассистенты",
      "price": "от 25 000₽",
      "note": "База знаний, сценарии, интеграции, безопасность и тестирование."
    },
    "creative-production": {
      "title": "Creative Direction + AI Production",
      "price": "от 150 000₽",
      "note": "Creative direction, AI production, visual world, сайт/промо и roadmap запуска."
    },
    "agentic-ai-dev": {
      "title": "Codex, Hermes и agentic AI dev",
      "price": "разработка от 30 000₽",
      "note": "Публичный якорь для разработки и агентских экосистем; базовая сборка, модули, Android/PWA, CRM, 1С и rescue считаются отдельными офферами."
    }
  },
  "offers": {
    "ai-video": {
      "product-ad-reel": {
        "title": "Товарный ролик / Reels",
        "price": "от 9 000₽",
        "note": "Реклама товара, упаковки, этикетки или простой промо-задачи."
      },
      "multi-model-reel": {
        "title": "Ролик длиннее и сложнее",
        "price": "15 000₽",
        "note": "Длиннее хронометраж, больше сцен и сборка через несколько нейросетей."
      },
      "complex-edit-15-25": {
        "title": "Сложный ролик 15-25 сек",
        "price": "30 000₽",
        "note": "Сценарий, несколько сцен, монтаж, доводка, звук и версии под площадки."
      },
      "custom-production": {
        "title": "Серия / спецпроект",
        "price": "индивидуально",
        "note": "Клипы, серии роликов, сложная графика, персонажи или пакет запусков считаются отдельно."
      }
    },
    "agentic-ai-dev": {
      "vps-launchpad": {
        "title": "Базовая агентская экосистема",
        "price": "15 000₽",
        "note": "Timeweb VPS, Hermes, подключение клиентской модели или ChatGPT-подписки, локальный Codex app, роли, инструкции и первый рабочий контур."
      },
      "agent-modules-constructor": {
        "title": "Модули агентов как конструктор",
        "price": "5 000 / 10 000 / 15 000 / 30 000₽",
        "note": "SMM, документы, ЭДО/бухгалтерия, 1С, юридический блок, обучение, здоровье, личные и бизнес-ассистенты."
      },
      "telegram-mini-app": {
        "title": "Telegram Mini App",
        "price": "от 30 000₽",
        "note": "Базовый TMA до 3 экранов + API, Telegram auth/initData и мобильный UX."
      },
      "android-pwa-app": {
        "title": "Android / PWA App",
        "price": "от 40 000₽",
        "note": "Manifest, service worker, icons, mobile UX, TWA/Capacitor shell и проверка installable-опыта."
      },
      "delivery-crm-platform": {
        "title": "Доставка / CRM платформа",
        "price": "от 80 000₽",
        "note": "Калькулятор, заказы, tracking, роли, dispatch/admin, база данных и путь к Android-приложению."
      },
      "onec-agent-automation": {
        "title": "1С + agent automation",
        "price": "от 40 000₽",
        "note": "Адаптеры, импорт/экспорт данных, статусы, уведомления и агент для контроля повторяемых операций."
      },
      "portfolio-store-app": {
        "title": "Портфолио-магазин",
        "price": "от 50 000₽",
        "note": "Витрина продуктов, услуг, кейсов, ссылок на демо, заявок и PWA-установки для автора или студии."
      },
      "ai-bot-db-admin": {
        "title": "AI-бот + база + admin",
        "price": "от 10 000₽",
        "note": "Минимальный порог для AI-бота с OpenAI API, БД, заявками и панелью управления."
      },
      "ai-code-rescue": {
        "title": "AI-code rescue",
        "price": "от 7 000₽",
        "note": "Аудит, план фиксов или один небольшой критический фикс после AI-генератора."
      },
      "mvp-saas-module": {
        "title": "MVP / SaaS модуль",
        "price": "от 50 000₽",
        "note": "Считать по ролям, экранам, базе, API и деплою."
      }
    }
  }
};
}());
