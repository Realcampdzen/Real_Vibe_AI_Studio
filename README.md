# Реальный Vайб AI Studio

Сайт-витрина и рабочий репозиторий Real Vibe AI Studio: AI-контент, creative direction, SMM, музыка, озвучка, сайты, боты, AI-агенты и agentic full-stack development.

Публичный сайт: [real-vibe.studio](https://real-vibe.studio/)

## Навигация по документации

- [AGENTS.md](AGENTS.md) - быстрый старт для Codex/AI-агентов в этом репо.
- [docs/business-services-guide.md](docs/business-services-guide.md) - бизнес-гайд: позиционирование, услуги, цены, ресурсы, квалификация заявок.
- [docs/technical-operations-guide.md](docs/technical-operations-guide.md) - технический гайд: структура сайта, данные услуг, медиа, SEO, деплой, проверки.
- [docs/release-runbook.md](docs/release-runbook.md) - релизный runbook и порядок безопасного выката.

## Что продает студия

Источник правды по услугам находится в [js/service-data.js](js/service-data.js). Главная страница использует не весь каталог линейно, а воронку: сначала самые сильные направления, затем CTA и остальные услуги.

| ID | Slug | Услуга | Ценовой якорь |
|---:|---|---|---|
| 0 | `ai-video` | AI-видео и рекламные рилсы | от 80 000 руб. |
| 11 | `agentic-ai-dev` | Вайбкодинг / Agentic AI Dev | разработка от 30 000 руб. |
| 3 | `smm-content` | SMM и контент | от 40 000 руб. |
| 10 | `creative-production` | Creative Direction + AI Production | от 150 000 руб. |
| 4 | `music` | Создание музыки | от 20 000 руб. |
| 5 | `sound-design` | Озвучка и саунд-дизайн | от 15 000 руб. |
| 6 | `apps` | MVP, SaaS и приложения с AI-функциями | от 50 000 руб. за MVP-модуль |
| 7 | `bots` | Telegram-боты с AI, базой данных и admin-панелью | от 10 000 руб. |
| 8 | `websites` | Сайты и веб-сервисы с AI-функциями | от 70 000 руб. |
| 9 | `ai-agents` | AI-агенты и GPT-ассистенты | от 25 000 руб. |
| 1 | `ai-photo` | AI-фото для e-commerce и key visual | от 20 000 руб. за сет |
| 2 | `ecom-animation` | AI-анимация и инфографика для e-commerce | от 35 000 руб. |

## Архитектура

```text
.
├── index.html                 # Главная страница и воронка услуг
├── service-detail.html        # Универсальная detail-страница услуг
├── css/                       # Основные стили, адаптив, визуальные блоки
├── js/
│   ├── service-data.js        # Каталог услуг, SEO, цены, медиа, related services
│   ├── service-prices.js      # Публичные price-overrides из price-book
│   └── service-detail-page.js # Рендер detail-страниц из service-data
├── data/service-prices.json   # Редактируемый price-book для сайта и корзины
├── public/works/services/     # Обложки, detail-изображения, постеры и видео услуг
├── server/                    # Express API для локальной разработки и ботов
├── cf-api/                    # Cloudflare Workers для production-интеграций
├── packages/shared/           # Общие модули
├── openai-proxy/              # Прокси к OpenAI API
└── docs/                      # Бизнес, техдокументация, релизные заметки
```

## Быстрый старт

```bash
npm install
npm run dev:simple
```

Статический сайт будет доступен локально на `http://localhost:3001`.

Для API-сервера:

```bash
npm run dev
```

Перед запуском серверных сценариев нужен `.env` на основе `.env.example`. Секреты не коммитятся.

Локальный редактор цен:

```text
http://localhost:3000/admin-prices.html
```

Он сохраняет изменения в `data/service-prices.json` и обновляет `js/service-prices.js`.

## Проверки

Минимальная проверка перед сдачей изменений:

```bash
npm run check
```

Для изменений главной, service cards, detail-страниц, SEO или медиа дополнительно проверяются:

- `index.html`;
- `service-detail.html?id=0..11`;
- старые alias-ссылки, если менялись редиректы;
- отсутствие битых изображений и видео;
- social preview: `og:title`, `og:description`, `og:image`, `twitter:image`.

## Деплой

Patch deploy на VPS:

```bash
npm run deploy:vps:patch
```

Важно: текущий deploy-скрипт собирает пакет из Git `HEAD`. Если нужно выкатить локальные изменения, сначала их надо осознанно закоммитить, затем запускать деплой.

После деплоя проверяются production-страницы:

```bash
curl -I https://real-vibe.studio/
curl -I https://real-vibe.studio/service-detail.html?id=11
```

## Правила для агентов

- Начинай с [AGENTS.md](AGENTS.md), затем открывай бизнес- и технический гайды.
- Не меняй порядок услуг без синхронизации `index.html`, `js/service-data.js` и документации.
- Не возвращай старый demo/showreel-блок с карточками "AI-видео для бренда", "Кликните play" и повторяющимися плейсхолдерами.
- Не публикуй локальные пути, токены, ключи, database URLs, private IP, данные клиентов и внутренние черновики в публичных HTML/meta.
- После изменений HTML/CSS/JS/media обновляй cache-buster и `sw.js`, если это влияет на production-кеш.
