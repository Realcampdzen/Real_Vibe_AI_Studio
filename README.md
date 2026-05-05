# 🎨 Реальный Vайб AI Studio

Сайт-витрина студии [real-vibe.studio](https://real-vibe.studio) — продажа услуг по созданию AI-контента и цифровых продуктов.

## Что продаёт студия

| Услуга | Описание |
|---|---|
| 🎬 AI-видео | Продающие рекламные ролики, сгенерированные нейросетями |
| 📸 AI-фото | Фотоконтент для брендов и соцсетей |
| 🎞 AI-анимация | Инфографика и анимация для e-commerce |
| 🤖 AI-боты | Telegram/VK боты с персональным характером |
| 🎤 Озвучка и саунддизайн | AI-озвучка, музыка, звуковое оформление |
| 🎵 Создание музыки | Генерация треков нейросетями |
| 👤 AI-аватары | Цифровые персонажи для бренда |
| 🧠 Кастомные GPTs | Персональные GPT-ассистенты под задачи бизнеса |
| 🌐 Создание сайтов | Сайты с AI-функциями (вайбкодинг) |
| 📱 SMM | AI-контент для соцсетей |

## Демо AI-ассистенты (на сайте)

Живые демонстрации AI-ботов студии — можно попробовать прямо на сайте:

| Бот | ID | Роль |
|---|---|---|
| 🐱 Кот Бро | `bro-cat` | Рыжий кот-вожатый, главный талисман сайта |
| 🎮 Хипыч AI | `hipych-ai` | Геймер-стример, демо-ассистент |
| 💜 НейроVалюша | `valyusha` | Педагог-мастер, работает в VK и Telegram |

## Архитектура

```
├── index.html                 # Главная страница (витрина)
├── css/                       # Стили (style.css 218KB + mobile)
├── js/                        # Интерактив (21 скрипт)
├── public/works/              # Портфолио: видео, фото, обложки
│
├── server/                    # Express.js API (локальная разработка)
│   ├── index.js               # Entry point
│   ├── config/env.js          # Конфигурация
│   ├── middleware/             # Security, rate-limit, logging
│   ├── routes/chat.js         # Чат-эндпоинты для ботов
│   ├── services/              # OpenAI client, text processing
│   └── bots/                  # Промпты, фолбеки, реестр ботов
│
├── cf-api/                    # Cloudflare Workers (прод)
│   └── src/neurovalyusha/     # НейроВалюша — соцсети бот
│       ├── vk/                # VK Callback API
│       ├── telegram/          # Telegram webhook
│       └── badge/ shared/     # Badge scoring, промпт-билдеры
│
├── packages/shared/           # Общие модули (openai, kv, memory)
├── openai-proxy/              # Прокси к OpenAI API (прод)
└── vk-autocomment-module/     # VK автокомментирование
```

## Быстрый старт

```bash
# 1. Установка
git clone https://github.com/Realcampdzen/Real_Vibe_AI_Studio_New.git
cd Real_Vibe_AI_Studio_New
npm install

# 2. Конфигурация
cp .env.example .env
# Заполнить .env своими API-ключами

# 3. Запуск
npm run dev              # Модульный сервер (server/index.js)
npm run dev:simple       # Только фронтенд без AI (порт 3001)
```

Сайт откроется на `http://localhost:3000`

## API

```
POST /chat                     # Чат с Котом Бро (по умолчанию)
POST /api/chat/:botId          # Чат с любым ботом по ID
POST /api/hipych/chat          # Хипыч AI
POST /api/valyusha/chat        # НейроVалюша
GET  /health                   # Health check
GET  /api/bots/status          # Статус всех ботов
```

## Стек

- **Фронтенд**: Vanilla JS + CSS, PWA-ready
- **Бэкенд**: Express.js 5, Node.js 22
- **AI**: OpenAI GPT-4o-mini
- **Безопасность**: Helmet, CORS, rate limiting, Joi
- **Логирование**: Winston
- **Прод**: Cloudflare Workers + KV, NIC.RU хостинг