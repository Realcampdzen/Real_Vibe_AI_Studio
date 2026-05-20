/**
 * Данные всех услуг AI Studio.
 * Один источник правды для главной страницы, detail-страниц и SEO.
 */

const SERVICE_ASSET_ROOT = 'public/works/services';

function serviceAsset(slug, fileName) {
  return `${SERVICE_ASSET_ROOT}/${slug}/${fileName}`;
}

function imageMedia(slug, fileName, title, description) {
  return {
    type: 'image',
    src: serviceAsset(slug, fileName),
    title,
    description,
  };
}

function videoMedia(slug, fileName, posterName, title, description, playlist = []) {
  const media = {
    type: 'video',
    src: serviceAsset(slug, fileName),
    poster: posterName ? serviceAsset(slug, posterName) : '',
    title,
    description,
  };
  if (Array.isArray(playlist) && playlist.length > 1) {
    media.playlist = playlist;
  }
  return media;
}

const AI_VIDEO_SEEDANCE_FILE = 'seedance2_Video_20260520_050120.mp4';
const AI_VIDEO_SEEDANCE_PART2_FILE = 'seedance2_Video_20260520_050120-part2.mp4';
const AI_VIDEO_SEEDANCE_POSTER = 'seedance2_Video_20260520_050120-poster.jpg';
const AI_VIDEO_SEEDANCE_SEQUENCE = [
  serviceAsset('ai-video', AI_VIDEO_SEEDANCE_FILE),
  serviceAsset('ai-video', AI_VIDEO_SEEDANCE_PART2_FILE),
];

const commonStart = [
  {
    title: 'Бриф и цель',
    description: 'Разбираем задачу, аудиторию, площадки, материалы и желаемый результат.',
  },
  {
    title: 'Концепция и визуальная система',
    description: 'Фиксируем формат, стиль, референсы, структуру результата и критерии приёмки.',
  },
  {
    title: 'Производство и сборка',
    description: 'Создаём материалы, собираем финальную версию и показываем промежуточные варианты.',
  },
  {
    title: 'Финал и передача',
    description: 'Готовим файлы под нужные площадки, вносим правки и передаём результат для запуска.',
  },
];

const SERVICES_DATA = [
  {
    id: 0,
    slug: 'ai-video',
    title: '🎬 AI-видео и рекламные рилсы',
    cardTitle: 'ПРОДАЮЩИЕ РЕКЛАМНЫЕ РОЛИКИ С AI',
    cardBenefit: 'Ролики под рекламу, Reels, клипы и запуск продукта',
    description: 'Создаём рекламные ролики, клипы и вертикальные видео на базе AI-инструментов с режиссурой, монтажом и звуком.',
    features: [
      'Концепция и сценарий под задачу',
      'Генерация сцен в актуальных AI-моделях',
      'Монтаж, цвет, титры и графика',
      'Музыка, озвучка и SFX из нашей студии',
    ],
    price: 'от 80 000₽',
    backgroundImage: serviceAsset('ai-video', AI_VIDEO_SEEDANCE_POSTER),
    avatarImage: serviceAsset('ai-video', 'detail-1.jpg'),
    heroVideo: serviceAsset('ai-video', AI_VIDEO_SEEDANCE_FILE),
    heroVideoPlaylist: AI_VIDEO_SEEDANCE_SEQUENCE,
    heroPoster: serviceAsset('ai-video', AI_VIDEO_SEEDANCE_POSTER),
    detailMedia: [
      videoMedia('ai-video', AI_VIDEO_SEEDANCE_FILE, AI_VIDEO_SEEDANCE_POSTER, 'AI-видео', 'Два последовательных куска одной сцены для первого впечатления и презентации возможностей AI-продакшна.', AI_VIDEO_SEEDANCE_SEQUENCE),
      imageMedia('ai-video', 'detail-2.jpg', 'Кадры под рекламу', 'Визуалы для промо, digital-кампаний и посадочных страниц.'),
      imageMedia('ai-video', 'detail-3.jpg', 'Бренд-визуал', 'Запоминающийся кадр, который можно использовать как постер или баннер.'),
    ],
    relatedServiceIds: [2, 4, 5],
    seoTitle: 'AI-видео и рекламные ролики | Реальный Vайб AI Studio',
    seoDescription: 'AI-видео, рекламные рилсы, клипы, шоурилы и промо-ролики под ключ: идея, генерация сцен, монтаж, музыка и звук.',
    buttonText: 'Обсудить ролик',
    buttonIcon: 'fab fa-telegram',
    detailTitle: 'AI-видео для рекламы, клипов и соцсетей',
    lead: 'Делаем ролики, которые выглядят как полноценный продакшн, но собираются быстрее и гибче за счёт AI-инструментов. Берём на себя идею, сценарий, генерацию кадров, монтаж, музыку, озвучку и подготовку форматов под площадки.',
    useCasesTitle: 'Для каких задач',
    useCases: [
      { title: 'Рекламные ролики и промо', description: 'Короткие видео для запусков, лендингов, таргета и презентаций продукта.' },
      { title: 'Reels, Shorts и VK-клипы', description: 'Вертикальный контент, который можно быстро тестировать в соцсетях.' },
      { title: 'Клипы и визуалайзеры', description: 'Музыкальные и атмосферные видео с единым визуальным стилем.' },
      { title: 'Объясняющие ролики', description: 'Сцены, графика и монтаж для сложных продуктов, услуг и идей.' },
    ],
    whatWeDoTitle: 'Как мы работаем',
    whatWeDo: commonStart,
    formatsTitle: 'Форматы',
    formats: ['Вертикальные ролики 9:16', 'Горизонтальные промо 16:9', 'Короткие рекламные cut-down версии', 'Постеры и кадры для баннеров'],
    whatYouGet: [
      'Готовый ролик под нужные площадки.',
      'Пакет постеров и кадров для промо.',
      'Возможность масштабировать концепцию в серию роликов.',
    ],
  },
  {
    id: 1,
    slug: 'ai-photo',
    title: '📸 AI-фото для e-commerce и key visual',
    cardTitle: 'AI ФОТО',
    cardBenefit: 'Визуалы для карточек, баннеров, рекламы и key visual',
    description: 'Генерируем и доводим AI-фото для брендов, e-commerce, digital-баннеров, кампаний и соцсетей.',
    features: [
      'Предметные и имиджевые визуалы',
      'Key visual для кампаний',
      'Кадры под маркетплейсы и соцсети',
      'Подготовка форматов под размещение',
    ],
    price: 'от 20 000₽ за сет',
    backgroundImage: serviceAsset('ai-photo', 'cover.jpg'),
    avatarImage: serviceAsset('ai-photo', 'detail-1.jpg'),
    heroVideo: '',
    heroPoster: serviceAsset('ai-photo', 'teaser-poster.jpg'),
    detailMedia: [
      imageMedia('ai-photo', 'detail-1.jpg', 'Предметный сет', 'Визуалы под e-commerce, каталог и рекламные баннеры.'),
      imageMedia('ai-photo', 'detail-2.jpg', 'Имиджевый кадр', 'Атмосферный визуал для кампании или соцсетей.'),
      imageMedia('ai-photo', 'detail-3.jpg', 'Обложка', 'Кадр для первого экрана, карточки услуги или лендинга.'),
    ],
    relatedServiceIds: [2, 0, 8],
    seoTitle: 'AI-фото и key visual | Реальный Vайб AI Studio',
    seoDescription: 'AI-фото для e-commerce, рекламы, баннеров, карточек товаров, key visual и визуальных кампаний.',
    buttonText: 'Заказать визуалы',
    buttonIcon: 'fab fa-telegram',
    detailTitle: 'AI-фото и визуальный контент под задачу бренда',
    lead: 'Создаём изображения, которые можно использовать в рекламе, карточках товаров, презентациях, баннерах и соцсетях. Помогаем сформулировать визуальную идею, собрать референсы, сгенерировать серии и подготовить финальные форматы.',
    useCasesTitle: 'Что делаем',
    useCases: [
      { title: 'E-commerce и карточки товаров', description: 'Кадры для товаров, витрин, маркетплейсов и каталогов.' },
      { title: 'Digital-баннеры и key visual', description: 'Главный визуал кампании и его адаптации под разные форматы.' },
      { title: 'Контент для соцсетей', description: 'Серии изображений для постов, сторис, обложек и анонсов.' },
    ],
    whatWeDoTitle: 'Как мы работаем',
    whatWeDo: commonStart,
    formatsTitle: 'Форматы',
    formats: ['16:9 для сайта и баннеров', '1:1 и 4:5 для соцсетей', '9:16 для сторис и Reels', 'Сеты изображений в едином стиле'],
    whatYouGet: [
      'Готовые AI-визуалы под размещение.',
      'Отобранные варианты без случайных артефактов.',
      'Адаптации под нужные площадки и размеры.',
    ],
  },
  {
    id: 2,
    slug: 'ecom-animation',
    title: '✨ ИИ-анимация и инфографика для e-commerce',
    cardTitle: 'ИИ АНИМАЦИЯ И ИНФОГРАФИКА ДЛЯ E-COM',
    cardBenefit: 'Движение, товарные сцены и понятная визуальная подача',
    description: 'Делаем товарную анимацию, короткие product loops и визуальную инфографику для e-commerce и рекламы.',
    features: [
      'Анимация товара и материалов',
      'Короткие loops для карточек и соцсетей',
      'Визуальное объяснение преимуществ',
      'Постеры и кадры под баннеры',
    ],
    price: 'от 35 000₽',
    backgroundImage: serviceAsset('ecom-animation', 'cover.jpg'),
    avatarImage: serviceAsset('ecom-animation', 'detail-1.jpg'),
    heroVideo: serviceAsset('ecom-animation', 'teaser.mp4'),
    heroPoster: serviceAsset('ecom-animation', 'teaser-poster.jpg'),
    detailMedia: [
      videoMedia('ecom-animation', 'teaser.mp4', 'teaser-poster.jpg', 'Product loop', 'Короткое движение продукта для рекламы и витрин.'),
      imageMedia('ecom-animation', 'detail-1.jpg', 'Товарная сцена', 'Чистая композиция для карточки и баннера.'),
      imageMedia('ecom-animation', 'detail-2.jpg', 'Серия визуалов', 'Несколько кадров в одном стиле для кампании.'),
    ],
    relatedServiceIds: [1, 0, 3],
    seoTitle: 'ИИ-анимация и инфографика для e-commerce | Реальный Vайб AI Studio',
    seoDescription: 'AI-анимация товаров, product loops, визуальная инфографика и рекламные материалы для e-commerce.',
    buttonText: 'Обсудить анимацию',
    buttonIcon: 'fab fa-telegram',
    detailTitle: 'ИИ-анимация и инфографика для e-commerce',
    lead: 'Показываем продукт в движении: упаковку, фактуру, сценарий использования, преимущества и визуальную историю. Такой контент помогает карточке товара, лендингу или рекламному объявлению быстрее объяснить ценность.',
    useCasesTitle: 'Где это работает',
    useCases: [
      { title: 'Карточки товаров', description: 'Короткие loops и кадры для маркетплейсов, каталога и сайта.' },
      { title: 'Запуски и акции', description: 'Визуалы для кампаний, где продукт нужно показать эффектно и быстро.' },
      { title: 'Соцсети и performance', description: 'Версии под Reels, Shorts, VK-клипы и рекламные кабинеты.' },
    ],
    whatWeDoTitle: 'Как мы работаем',
    whatWeDo: commonStart,
    formatsTitle: 'Форматы',
    formats: ['Короткие loops 4-8 секунд', 'Постеры 16:9 и 1:1', 'Вертикальные версии 9:16', 'Набор кадров для баннеров'],
    whatYouGet: [
      'Движение продукта без полноценной съёмки.',
      'Кадры и ролики под рекламные тесты.',
      'Единую визуальную систему для товара или линейки.',
    ],
  },
  {
    id: 3,
    slug: 'smm-content',
    title: '📝 SMM и контент',
    cardTitle: 'SMM И КОНТЕНТ',
    cardBenefit: 'Контент-план, тексты, сценарии и регулярные публикации',
    description: 'Выстраиваем систему контента: стратегия, рубрикатор, тексты, сценарии видео, нейросети как рабочий инструмент.',
    features: [
      'Контент-стратегия и рубрикатор',
      'Тексты, сценарии и сторителлинг',
      'Ведение и продюсирование соцсетей',
      'AI-шаблоны для ускорения команды',
    ],
    price: 'от 40 000₽',
    backgroundImage: serviceAsset('smm-content', 'cover-smm-manager-2026.jpg'),
    avatarImage: serviceAsset('smm-content', 'detail-1.jpg'),
    heroVideo: '',
    heroPoster: serviceAsset('smm-content', 'teaser-poster.jpg'),
    detailMedia: [
      imageMedia('smm-content', 'detail-1.jpg', 'Контент-стратегия', 'Командный стол, рубрикатор и план публикаций.'),
      imageMedia('smm-content', 'detail-2.jpg', 'Сценарии и форматы', 'Пакет тем, обложек, сторис и коротких роликов.'),
      imageMedia('smm-content', 'detail-3.jpg', 'Контент-командный центр', 'Система, в которой идеи превращаются в регулярный выпуск.'),
    ],
    relatedServiceIds: [1, 2, 10],
    seoTitle: 'SMM и контент-стратегия | Реальный Вайб AI Studio',
    seoDescription: 'SMM, контент-стратегия, тексты, сценарии, рубрикатор, ведение соцсетей и AI-инструменты для команды.',
    buttonText: 'Обсудить контент',
    buttonIcon: 'fab fa-telegram',
    detailTitle: 'SMM и контент-стратегия под ключ',
    lead: 'Помогаем проектам выстроить понятную систему контента, а не «постить по настроению». Стратегия, рубрики, тексты, сценарии, визуальные форматы и рабочие AI-шаблоны складываются в регулярный выпуск.',
    aboutPersonTitle: 'Кто отвечает за направление',
    aboutPerson: {
      name: 'Степан Иванов',
      points: [
        'автор и редактор с опытом работы на федеральном телевидении;',
        'лауреат премии ТЭФИ;',
        'создатель образовательных и креативных проектов, где нейросети используются как инструмент производства.',
      ],
    },
    useCasesTitle: 'Что входит в услугу',
    useCases: [
      { title: 'Стратегия и позиционирование', description: 'Цели, аудитория, роль площадок, ключевые смыслы и tone of voice.' },
      { title: 'Контент-архитектура', description: 'Рубрикатор, регулярные форматы, сценарии и календарь выпусков.' },
      { title: 'Тексты и сценарии', description: 'Посты, статьи, сторис-цепочки, Reels-сценарии, рассылки и редактура.' },
      { title: 'AI как рабочий инструмент', description: 'Промпты, шаблоны и процессы, которые ускоряют команду без потери авторского стиля.' },
    ],
    whatWeDoTitle: 'Как мы работаем',
    whatWeDo: commonStart,
    formatsTitle: 'Форматы',
    formats: ['Контент-стратегия', 'Контент-план на 4-8 недель', 'Пакет постов и сценариев', 'AI-шаблоны для команды'],
    whatYouGet: [
      'Систему контента с понятной логикой.',
      'Регулярные материалы под выбранные площадки.',
      'Редакторский контроль и понятный tone of voice.',
    ],
  },
  {
    id: 4,
    slug: 'music',
    title: '🎵 Создание музыки',
    cardTitle: 'СОЗДАНИЕ МУЗЫКИ',
    cardBenefit: 'Треки, темы, джинглы и музыкальная айдентика',
    description: 'Авторская музыка для игр, видео, рекламы, подкастов, приложений и творческих проектов.',
    features: [
      'Саундтреки и темы',
      'Музыка для роликов и рекламы',
      'Джинглы и музыкальная айдентика',
      'Файлы и версии под площадки',
    ],
    price: 'от 20 000₽',
    backgroundImage: serviceAsset('music', 'polstan-hero-poster-20260519.jpg'),
    avatarImage: serviceAsset('music', 'detail-1.jpg'),
    heroVideo: serviceAsset('music', 'polstan-hero-concert-desktop-20260519.mp4'),
    heroMobileVideo: serviceAsset('music', 'polstan-hero-concert-mobile-20260519.mp4'),
    heroPoster: serviceAsset('music', 'polstan-hero-poster-20260519.jpg'),
    detailMedia: [
      imageMedia('music', 'detail-1.jpg', 'Композиторская студия', 'Рабочее место, где рождается музыкальная тема проекта.'),
      imageMedia('music', 'detail-2.jpg', 'Музыкальная атмосфера', 'Настроение и фактура будущего трека.'),
      imageMedia('music', 'detail-3.jpg', 'Финальный звук', 'Подготовка версии под ролик, игру или бренд.'),
    ],
    relatedServiceIds: [5, 0, 10],
    seoTitle: 'Создание музыки для проектов | Реальный Vайб AI Studio',
    seoDescription: 'Авторская музыка, саундтреки, джинглы, музыкальная айдентика и треки для видео, рекламы, игр и приложений.',
    buttonText: 'Обсудить музыку',
    buttonIcon: 'fab fa-telegram',
    detailTitle: 'Авторская музыка под ваш проект',
    lead: 'Пишем музыку, которая работает на эмоцию, ритм и драматургию продукта: от короткого джингла до полноценного саундтрека для ролика, игры или серии контента.',
    useCasesTitle: 'Что мы пишем',
    useCases: [
      { title: 'Музыка для видео и рекламы', description: 'Треки, подложки, акценты и версии под монтаж.' },
      { title: 'Музыка для игр и приложений', description: 'Темы, лупы, стемы, сигналы интерфейса и атмосферные слои.' },
      { title: 'Музыкальная айдентика', description: 'Короткие мотивы и звуковые логотипы для бренда.' },
    ],
    whatWeDoTitle: 'Как мы работаем',
    whatWeDo: commonStart,
    formatsTitle: 'Форматы',
    formats: ['Полная версия трека', 'Короткие cut-down версии', 'Лупы и стемы', 'Интро, аутро и джинглы'],
    whatYouGet: [
      'Музыку, написанную под конкретную задачу.',
      'Файлы в нужных форматах и длительностях.',
      'Возможность развивать музыкальную систему проекта дальше.',
    ],
  },
  {
    id: 5,
    slug: 'sound-design',
    title: '🎙️ Озвучка и саунд-дизайн',
    cardTitle: 'ОЗВУЧКА И САУНДДИЗАЙН',
    cardBenefit: 'Голос, SFX и чистый звук под площадки',
    description: 'Профессиональная озвучка, обработка, саунд-дизайн и звуковые эффекты для видео, игр, курсов и приложений.',
    features: [
      'Озвучка роликов и курсов',
      'SFX для интерфейсов, игр и видео',
      'Очистка, сведение и мастеринг',
      'Подготовка под нужные площадки',
    ],
    price: 'от 15 000₽',
    backgroundImage: serviceAsset('sound-design', 'cover.jpg'),
    avatarImage: serviceAsset('sound-design', 'detail-1.jpg'),
    heroVideo: '',
    heroPoster: serviceAsset('sound-design', 'teaser-poster.jpg'),
    detailMedia: [
      imageMedia('sound-design', 'detail-1.jpg', 'Студийная запись', 'Голос и дикторская подача под формат проекта.'),
      imageMedia('sound-design', 'detail-2.jpg', 'Саунд-дизайн', 'Сборка атмосферы, эффектов и интерфейсных звуков.'),
      imageMedia('sound-design', 'detail-3.jpg', 'Финальное сведение', 'Чистый, выровненный звук для публикации.'),
    ],
    relatedServiceIds: [4, 0, 6],
    seoTitle: 'Озвучка и саунд-дизайн | Реальный Vайб AI Studio',
    seoDescription: 'Озвучка, voice-over, саунд-дизайн, SFX, обработка и подготовка звука для видео, игр, курсов и приложений.',
    buttonText: 'Обсудить звук',
    buttonIcon: 'fab fa-telegram',
    detailTitle: 'Озвучка и саунд-дизайн под ключ',
    lead: 'Делаем так, чтобы проект звучал профессионально: голос, SFX, атмосферы, интерфейсные звуки, очистка, сведение и подготовка под публикацию.',
    useCasesTitle: 'Что мы делаем',
    useCases: [
      { title: 'Озвучка и voice-over', description: 'Рекламные ролики, курсы, инструкции, подкасты и презентации.' },
      { title: 'Саунд-дизайн и SFX', description: 'Звуки интерфейса, окружения, действий, переходов и спецэффектов.' },
      { title: 'Обработка и улучшение звука', description: 'Очистка, выравнивание громкости, сведение и мастеринг.' },
    ],
    whatWeDoTitle: 'Как мы работаем',
    whatWeDo: commonStart,
    formatsTitle: 'Форматы',
    formats: ['Voice-over', 'Пакеты SFX', 'Звуки интерфейса', 'Финальные WAV/MP3/OGG-файлы'],
    whatYouGet: [
      'Профессионально подготовленный звук.',
      'Пакет файлов под вашу платформу.',
      'Возможность дополнять проект новыми репликами и эффектами.',
    ],
  },
  {
    id: 6,
    slug: 'apps',
    title: '📱 MVP, SaaS и приложения с AI-функциями',
    cardTitle: 'MVP И SAAS-ПЛАТФОРМЫ С AI',
    cardBenefit: 'От прототипа до рабочего продукта с архитектурой, базой и деплоем',
    description: 'Проектируем и разрабатываем MVP, SaaS, CRM, дашборды и приложения с AI-логикой, ролями, базой данных и frontend-дизайном через Open Design, Codex и GPT Pro.',
    features: [
      'Open Design + Codex/GPT Pro для UX-прототипов',
      'React/Next.js, TypeScript и аккуратный UX',
      'FastAPI, Django или Node.js backend',
      'PostgreSQL/Supabase, роли и дашборды',
      'Деплой, тестирование и стабилизация',
    ],
    price: 'от 50 000₽ за MVP-модуль',
    backgroundImage: serviceAsset('apps', 'cover-ai-app-product-2026.jpg'),
    avatarImage: serviceAsset('apps', 'detail-1.jpg'),
    heroVideo: '',
    heroPoster: serviceAsset('apps', 'teaser-poster.jpg'),
    detailMedia: [
      imageMedia('apps', 'detail-1.jpg', 'Прототип приложения', 'Экранные сценарии и умные функции в одном продукте.'),
      imageMedia('apps', 'detail-2.jpg', 'Мобильный UX', 'Интерфейс под реальные действия пользователя.'),
      imageMedia('apps', 'detail-3.jpg', 'AI-функции', 'Ассистенты, подсказки и автоматизация внутри приложения.'),
    ],
    relatedServiceIds: [11, 8, 9],
    seoTitle: 'MVP, SaaS и приложения с AI-функциями | Реальный Вайб AI Studio',
    seoDescription: 'Разработка MVP, SaaS, CRM, дашбордов и приложений с AI-функциями, Open Design прототипированием, базой данных, ролями пользователей и деплоем.',
    buttonText: 'Обсудить MVP',
    buttonIcon: 'fab fa-telegram',
    detailTitle: 'MVP, SaaS и приложения с AI-функциями',
    lead: 'Берём идею, сырой прототип или уже начатый AI-код и доводим до рабочего продукта: архитектура, интерфейс, backend, база данных, роли, деплой и безопасный первый релиз. Для frontend-части используем Open Design вместе с Codex и GPT Pro: быстро собираем проверяемые UX-варианты, работаем от дизайн-систем и раньше видим слабые места интерфейса.',
    useCasesTitle: 'Что разрабатываем',
    useCases: [
      { title: 'MVP и SaaS-платформы', description: 'Авторизация, роли пользователей, дашборды, бизнес-логика, платежи и интеграции.' },
      { title: 'CRM и внутренние сервисы', description: 'Инструменты для команды: заявки, клиенты, задачи, статусы, аналитика и админка.' },
      { title: 'AI-функции внутри продукта', description: 'Генерация, анализ, поиск по базе знаний, ассистенты, workflow и автоматизация.' },
    ],
    whatWeDoTitle: 'Как мы работаем',
    whatWeDo: [
      { title: 'Разбор идеи и безопасный первый этап', description: 'Фиксируем главный сценарий, роли, данные, риски и минимальный модуль для запуска.' },
      { title: 'Архитектура и UX', description: 'Проектируем экраны, состояние, API, базу данных и границы будущего расширения.' },
      { title: 'Open Design loop', description: 'Через Open Design, Codex и GPT Pro быстро проверяем визуальные направления, компоненты и сценарии до тяжёлой разработки.' },
      { title: 'Разработка и интеграции', description: 'Собираем frontend, backend, AI-логику, базу, админку и внешние API.' },
      { title: 'Проверка, деплой и handoff', description: 'Прогоняем проверки, исправляем критичные места, деплоим и передаём понятную структуру проекта.' },
    ],
    formatsTitle: 'Возможности',
    formats: ['Авторизация и роли', 'Дашборды и admin-панель', 'Open Design прототипы', 'PostgreSQL/Supabase', 'OpenAI API и Telegram Bot API'],
    whatYouGet: [
      'Рабочий модуль или MVP, который можно показывать клиентам, команде или инвесторам.',
      'Проверенный frontend-направление до финальной сборки: меньше случайного AI-UI, больше системности.',
      'Код на TypeScript/Python/Node.js без случайной AI-хаотичности.',
      'Понятный план следующих этапов: что масштабировать, что стабилизировать, что запускать.',
    ],
  },
  {
    id: 7,
    slug: 'bots',
    title: '🤖 Telegram-боты с AI, базой и admin-панелью',
    cardTitle: 'TELEGRAM-БОТЫ С AI И БАЗОЙ',
    cardBenefit: 'Боты для заявок, поддержки, контента, оплат и внутренних процессов',
    description: 'Создаём Telegram-ботов и AI-ботов с базой данных, админ-панелью, сценариями, OpenAI API и интеграциями под реальные задачи бизнеса.',
    features: [
      'Telegram Bot API и сценарии диалогов',
      'AI-логика, база данных и история обращений',
      'Admin-панель, роли и уведомления',
      'Оплаты, заявки, CRM и внешние API',
    ],
    price: 'от 10 000₽',
    backgroundImage: serviceAsset('bots', 'cover.jpg'),
    avatarImage: serviceAsset('bots', 'detail-1.jpg'),
    heroVideo: '',
    heroPoster: serviceAsset('bots', 'teaser-poster.jpg'),
    detailMedia: [
      imageMedia('bots', 'detail-1.jpg', 'Диалоговые сценарии', 'Ветки, ответы и логика, которые ведут пользователя к действию.'),
      imageMedia('bots', 'detail-2.jpg', 'Поддержка и заявки', 'Бот разгружает команду и не теряет обращения.'),
      imageMedia('bots', 'detail-3.jpg', 'Бренд-бот', 'Персонаж, tone of voice и правила общения под проект.'),
    ],
    relatedServiceIds: [11, 9, 6],
    seoTitle: 'Telegram-боты с AI, базой и admin-панелью | Реальный Vайб AI Studio',
    seoDescription: 'Разработка Telegram-ботов с AI, базой данных, admin-панелью, платежами, заявками, CRM и интеграциями.',
    buttonText: 'Заказать бота',
    buttonIcon: 'fab fa-telegram',
    detailTitle: 'Telegram-боты с AI, базой данных и admin-панелью',
    lead: 'Делаем не “бота с кнопками”, а рабочий инструмент: пользовательский сценарий, база данных, админка, AI-ответы, уведомления, оплаты и понятный код, который можно развивать.',
    useCasesTitle: 'Для чего подходят',
    useCases: [
      { title: 'Заявки и продажи', description: 'Сбор лидов, квизы, расчёты, консультации, уведомления и передача в CRM.' },
      { title: 'Поддержка клиентов', description: 'FAQ, статусы, запись, помощь с выбором и разгрузка команды.' },
      { title: 'AI-бот с памятью', description: 'Ответы на основе базы знаний, истории пользователя и правил вашего проекта.' },
      { title: 'Внутренний бот команды', description: 'Задачи, отчёты, напоминания, доступы и быстрый интерфейс к внутренним процессам.' },
    ],
    whatWeDoTitle: 'Как мы работаем',
    whatWeDo: commonStart,
    formatsTitle: 'Форматы',
    formats: ['Telegram Bot API', 'AI-логика OpenAI API', 'PostgreSQL/Supabase', 'Admin-панель и роли'],
    whatYouGet: [
      'Бота, который решает конкретный сценарий, а не просто отвечает на сообщения.',
      'Базу данных, админскую часть и интеграции по задаче.',
      'Чистую архитектуру для развития после первого запуска.',
    ],
  },
  {
    id: 8,
    slug: 'websites',
    title: '💻 Сайты и веб-сервисы с AI-функциями',
    cardTitle: 'САЙТЫ И ВЕБ-СЕРВИСЫ С AI',
    cardBenefit: 'Лендинги, кабинеты, сервисы и AI-интеграции под бизнес-задачу',
    description: 'Делаем сайты, лендинги и веб-сервисы с современным дизайном, быстрым frontend, Open Design прототипированием, формами, аналитикой, AI-чатом и интеграциями.',
    features: [
      'Лендинги, витрины и сервисные страницы',
      'Open Design + Codex/GPT Pro для сильного UI',
      'React/Next.js, адаптивный UI и скорость',
      'Формы, квизы, заявки, аналитика',
      'AI-чат, личные кабинеты и интеграции',
    ],
    price: 'от 70 000₽',
    backgroundImage: serviceAsset('websites', 'cover-white-monitor.jpg'),
    avatarImage: serviceAsset('websites', 'detail-1.jpg'),
    heroVideo: '',
    heroPoster: serviceAsset('websites', 'teaser-poster.jpg'),
    detailMedia: [
      imageMedia('websites', 'detail-1.jpg', 'Сайт под задачу', 'Структура, визуал и сценарий пользователя.'),
      imageMedia('websites', 'detail-2.jpg', 'Адаптивный интерфейс', 'Десктоп, планшет и мобильный опыт в единой системе.'),
      imageMedia('websites', 'detail-3.jpg', 'AI-функции', 'Формы, чат, ассистенты и интеграции вокруг сайта.'),
    ],
    relatedServiceIds: [11, 6, 9],
    seoTitle: 'Сайты и веб-сервисы с AI-функциями | Реальный Vайб AI Studio',
    seoDescription: 'Разработка лендингов, сайтов, веб-сервисов, личных кабинетов и AI-функций на React, Next.js, Open Design, Codex и современных API.',
    buttonText: 'Обсудить сайт',
    buttonIcon: 'fab fa-telegram',
    detailTitle: 'Сайты, лендинги и веб-сервисы с AI-функциями',
    lead: 'Собираем цифровую витрину или веб-сервис так, чтобы он был не только красивым, но и рабочим: структура, адаптивный UI, заявки, интеграции, AI-ассистент и понятный путь пользователя. Open Design с Codex и GPT Pro помогает быстро сравнивать визуальные направления, собирать прототипы в sandbox-preview и переносить лучшие решения в production-код.',
    useCasesTitle: 'Какие сайты делаем',
    useCases: [
      { title: 'Лендинги под продукт или услугу', description: 'Страница с понятным предложением, визуалом и заявкой.' },
      { title: 'Сайты компаний и личные сайты', description: 'Многостраничная структура, услуги, портфолио, кейсы, блог и контакты.' },
      { title: 'Веб-сервисы и кабинеты', description: 'Личный кабинет, заявки, данные, роли, админка и интеграции с внешними API.' },
      { title: 'Спецпосадочные под трафик', description: 'Страницы под рекламу, запуск, акцию, мероприятие или творческий проект.' },
    ],
    whatWeDoTitle: 'Как мы работаем',
    whatWeDo: commonStart,
    formatsTitle: 'Что умеют сайты',
    formats: ['Open Design прототип', 'React/Next.js', 'Адаптивная вёрстка', 'Заявки и квизы', 'AI-чат или ассистент'],
    whatYouGet: [
      'Готовый сайт, который можно запускать в рекламу.',
      'Визуал и структуру под задачи бизнеса, проверенные через быстрый design/dev loop.',
      'Базу для дальнейшего развития проекта.',
    ],
  },
  {
    id: 9,
    slug: 'ai-agents',
    title: '🧠 AI-агенты для бизнеса и GPT-ассистенты',
    cardTitle: 'AI-АГЕНТЫ ДЛЯ БИЗНЕСА',
    cardBenefit: 'Ассистенты, workflow и базы знаний под реальные процессы',
    description: 'Создаём GPT-ассистентов и AI-агентов для бизнеса: база знаний, инструкции, workflow, проверка входных данных и помощь команде.',
    features: [
      'Роль, инструкции, память и ограничения',
      'База знаний, документы и стандарты',
      'Workflow, проверки и черновики решений',
      'Тестовые сценарии и обучение команды',
    ],
    price: 'от 25 000₽',
    backgroundImage: serviceAsset('ai-agents', 'cover.jpg'),
    avatarImage: serviceAsset('ai-agents', 'detail-1.jpg'),
    heroVideo: '',
    heroPoster: serviceAsset('ai-agents', 'teaser-poster.jpg'),
    detailMedia: [
      imageMedia('ai-agents', 'detail-1.jpg', 'База знаний', 'Материалы превращаются в рабочего цифрового помощника.'),
      imageMedia('ai-agents', 'detail-2.jpg', 'Workflow-агент', 'Помощник ведёт задачи, маршруты и повторяемые процессы.'),
      imageMedia('ai-agents', 'detail-3.jpg', 'GPT-ассистент', 'Настроенная роль, знания и инструкции для ежедневной работы.'),
    ],
    relatedServiceIds: [11, 7, 6],
    seoTitle: 'AI-агенты для бизнеса и GPT-ассистенты | Реальный Vайб AI Studio',
    seoDescription: 'AI-агенты, GPT-ассистенты, базы знаний, workflow, инструкции, автоматизация задач и помощники для бизнеса.',
    buttonText: 'Собрать ассистента',
    buttonIcon: 'fab fa-telegram',
    detailTitle: 'AI-агенты и GPT-ассистенты под бизнес-процессы',
    lead: 'Настраиваем цифровых помощников, которые знают ваши материалы, работают по правилам и помогают команде: отвечают на вопросы, готовят черновики, проверяют входные данные и поддерживают повторяемые процессы.',
    useCasesTitle: 'Каких ассистентов делаем',
    useCases: [
      { title: 'Ассистент по базе знаний', description: 'Ответы по регламентам, продуктам, инструкциям и внутренним документам.' },
      { title: 'Маркетинговый GPT', description: 'Черновики постов, сценариев, писем и адаптаций под площадки.' },
      { title: 'Обучающий помощник', description: 'Тьютор по курсу, программе или сложной теме.' },
      { title: 'Workflow-агент', description: 'Помощник для повторяемых задач, маршрутизации, проверки входных данных и подготовки результата.' },
    ],
    whatWeDoTitle: 'Как мы работаем',
    whatWeDo: commonStart,
    formatsTitle: 'Форматы',
    formats: ['Custom GPT', 'AI-агент под процесс', 'Ассистент базы знаний', 'Workflow и approval-gates'],
    whatYouGet: [
      'Настроенного помощника под вашу задачу.',
      'Структурированные материалы и правила поведения.',
      'Инструкции и тестовые сценарии для использования.',
    ],
  },
  {
    id: 10,
    slug: 'creative-production',
    title: '🚀 Creative Direction + AI Production',
    cardTitle: 'CREATIVE DIRECTION + AI PRODUCTION',
    cardBenefit: 'Визуальный мир, сайт, релиз, мерч и промо-материалы проекта',
    description: 'Продюсируем творческие проекты как цельную вселенную: идея, creative direction, key visual, сайт, релиз, тур, мерч, контент и запуск.',
    features: [
      'Creative direction и визуальный мир',
      'AI key visual, промо и контент-система',
      'Сайт, релиз, тур, мерч и digital-витрина',
      'План запуска, production roadmap и координация',
    ],
    price: 'от 150 000₽',
    backgroundImage: serviceAsset('creative-production', 'dominia-key-visual.webp'),
    avatarImage: serviceAsset('creative-production', 'dominia-world.png'),
    heroVideo: serviceAsset('creative-production', 'dominia-hero-transition.mp4'),
    heroPoster: serviceAsset('creative-production', 'dominia-world.png'),
    detailMedia: [
      videoMedia('creative-production', 'dominia-hero-transition.mp4', 'dominia-world.png', 'DOMINIA scrollytelling', 'Лёгкий hero-transition для ощущения мира проекта без тяжёлого концертного видео.'),
      imageMedia('creative-production', 'dominia-key-visual.webp', 'Key visual DOMINIA', 'Группа, портал и визуальный код проекта в одном cinematic-кадре.'),
      imageMedia('creative-production', 'dominia-world.png', 'Визуальная вселенная', 'Мир проекта, который можно развивать в сайт, тур, мерч и промо.'),
      imageMedia('creative-production', 'dominia-site-desktop.png', 'Digital-витрина', 'Сайт как центр релиза, концертов, галереи, дискографии, новостей и мерча.'),
      imageMedia('creative-production', 'dominia-discography.jpg', 'Релиз и архив', 'Обложки, афиши и музыкальные материалы складываются в единую историю.'),
    ],
    relatedServiceIds: [0, 3, 4],
    seoTitle: 'Creative Direction и AI Production для творческих проектов | Реальный Vайб AI Studio',
    seoDescription: 'Creative direction, AI production, key visual, сайт, релиз, тур, мерч, контент и промо-материалы для творческих проектов.',
    buttonText: 'Обсудить проект',
    buttonIcon: 'fab fa-telegram',
    detailTitle: 'Creative Direction + AI Production для творческих проектов',
    lead: 'Помогаем собрать проект как цельный мир: идея, визуальный язык, AI key visual, сайт, релиз, тур, мерч, звук, ролики, контент и план запуска. DOMINIA показывает этот формат на реальном музыкальном проекте.',
    useCasesTitle: 'Когда это нужно',
    useCases: [
      { title: 'Музыкальный или творческий релиз', description: 'Нужны visual world, сайт, обложки, афиши, промо, контент и digital-точка сборки.' },
      { title: 'Спецпроект или медиаистория', description: 'Клип, серия роликов, персонажи, промо-материалы, сайт и сценарий запуска.' },
      { title: 'Упаковка автора или бренда', description: 'Визуальная система, tone of voice, контент и понятное присутствие на площадках.' },
    ],
    whatWeDoTitle: 'Как мы работаем',
    whatWeDo: [
      { title: 'Creative direction', description: 'Фиксируем образ проекта, аудиторию, эмоциональный вектор, visual world и ключевые референсы.' },
      { title: 'AI production и материалы', description: 'Создаём key visual, сцены, промо-кадры, обложки, контент и форматы под площадки.' },
      { title: 'Digital-витрина', description: 'Собираем сайт, разделы релиза, событий, галереи, мерча, новостей и контактов.' },
      { title: 'Запуск и развитие', description: 'Готовим production roadmap, контент-план, версии материалов и следующий цикл проекта.' },
    ],
    formatsTitle: 'Что может входить',
    formats: ['Creative direction', 'AI key visual', 'Сайт или лендинг', 'Релиз, тур, мерч и SMM-пакет'],
    whatYouGet: [
      'Визуальный мир проекта, который можно развивать в разных форматах.',
      'Сайт, промо-материалы и контент-систему вместо разрозненных файлов.',
      'План запуска, где creative, production и digital работают вместе.',
    ],
    caseStudiesTitle: 'Кейс внутри направления',
    caseStudies: [
      {
        title: 'DOMINIA — digital-вселенная музыкального проекта',
        description: 'Из музыкального проекта собрана премиальная online-витрина: cinematic hero, scrollytelling, дискография, концерты, галерея, новости, мерч и аудио.',
        points: ['AI key visual и visual world', 'React/Vite сайт с fullscreen canvas hero', 'Релиз The Prophecy, тур 2026 и merch-раздел'],
      },
    ],
  },
  {
    id: 11,
    slug: 'agentic-ai-dev',
    title: '🧑‍💻 Вайбкодинг и agentic AI dev',
    cardTitle: 'ВАЙБКОДИНГ И AGENTIC AI DEV',
    cardBenefit: 'VPS, MVP, SaaS, TMA, AI-боты и стабилизация AI-кода до production',
    description: 'Agentic full-stack разработка под ключ: беру идею, сырой прототип или сломанный AI-код и довожу до стабильного релиза с Open Design, Codex, GPT Pro и собственным VPS-контуром.',
    features: [
      'TypeScript, React, Next.js, Zustand',
      'Open Design, Codex и GPT Pro для UI/UX',
      'Python FastAPI/Django или Node.js backend',
      'Timeweb VPS, PostgreSQL, Supabase, Docker, Vercel',
      'OpenAI API, Telegram Bot API и agentic workflow',
    ],
    price: 'разработка от 30 000₽',
    backgroundImage: serviceAsset('agentic-ai-dev', 'cover-hermes-product-2026.jpg'),
    avatarImage: serviceAsset('agentic-ai-dev', 'detail-1.jpg'),
    heroVideo: serviceAsset('agentic-ai-dev', 'agent-office-showcase-20260520.mp4'),
    heroMobileVideo: serviceAsset('agentic-ai-dev', 'agent-office-showcase-mobile-20260520.mp4'),
    heroPoster: serviceAsset('agentic-ai-dev', 'cover-hermes-office-2026.jpg'),
    detailMedia: [
      videoMedia('agentic-ai-dev', 'agent-office-showcase-20260520.mp4', 'cover-hermes-office-2026.jpg', 'Hermes agents office live', '54-секундный showcase из записи экрана: живой офис агентов, роли, рабочие зоны и product workflow.'),
      imageMedia('agentic-ai-dev', 'cover-hermes-office-2026.jpg', 'Hermes agents office', 'Визуальная метафора агентного офиса: роли, рабочие зоны и связанный product workflow.'),
      imageMedia('agentic-ai-dev', 'hero-command-center.jpg', 'Agentic command center', 'Канбан, Hermes-агенты, Claw3D-офис и production-пайплайн в одном визуальном proof-of-work.'),
      imageMedia('agentic-ai-dev', 'detail-1.jpg', 'Kanban + workflow', 'Контроль задач, статусов, ролей и approval-gates для безопасной разработки.'),
      imageMedia('agentic-ai-dev', 'detail-2.jpg', 'Roadmaps и архитектура', 'Дорожные карты, продуктовая память, стандарты и связанный план развития.'),
      imageMedia('agentic-ai-dev', 'detail-3.jpg', 'Freelance OS', 'CRM и рабочая витрина возможностей: лиды, анализ, предложения и запуск проекта.'),
    ],
    relatedServiceIds: [6, 7, 8],
    seoTitle: 'Вайбкодинг и Agentic AI Dev | Реальный Vайб AI Studio',
    seoDescription: 'Agentic full-stack разработка: VPS Launchpad на Timeweb, MVP, SaaS, Telegram Mini Apps, AI-боты, Open Design frontend loop, стабилизация Cursor/Lovable/v0 и production-ready AI-код.',
    buttonText: 'Разобрать задачу',
    buttonIcon: 'fab fa-telegram',
    detailTitle: 'Agentic Full-Stack Developer / Вайбкодер',
    lead: 'Я не просто генерирую код через нейросети. Проектирую архитектуру, стабилизирую AI-код и довожу сложные веб-проекты до рабочего релиза: frontend, backend, база, API, VPS, деплой и понятный следующий этап. Для frontend и сайтов использую Open Design вместе с Codex и GPT Pro: дизайн-системы, быстрые прототипы, sandbox-preview и инженерную проверку перед релизом.',
    useCasesTitle: 'С какими задачами приходят',
    useCases: [
      { title: 'Telegram Mini App для бизнеса', description: 'TMA до 3 экранов, API, авторизация initData, база данных, платежи и мобильный UX внутри Telegram.' },
      { title: 'AI-бот с базой и admin-панелью', description: 'Telegram-бот или веб-ассистент с OpenAI API, PostgreSQL/Supabase, ролями, заявками и управлением.' },
      { title: 'VPS Launchpad на Timeweb', description: 'Помогаю арендовать и настроить облачный сервер, домен, SSL, deploy-контур и основу для сайта, web app, ботов или агентной платформы.' },
      { title: 'MVP веб-сервиса или SaaS', description: 'Авторизация, дашборды, роли, API, база, деплой и модульная архитектура для роста.' },
      { title: 'Стабилизация Cursor, Lovable, v0, Bolt', description: 'Аудит, типизация, state, БД, секреты, сборка, деплой и исправление критичных ошибок.' },
    ],
    whatWeDoTitle: 'Как довожу до релиза',
    whatWeDo: [
      { title: 'Бесплатный первичный разбор', description: 'Смотрю задачу, текущий код или идею и предлагаю безопасный первый этап.' },
      { title: 'Аудит и архитектура', description: 'Фиксирую стек, данные, роли, API, риски, сборку, деплой и границы MVP.' },
      { title: 'Open Design прототипирование', description: 'Собираю UI-направления в agentic design loop: Codex/GPT Pro, дизайн-системы, live-preview и критика интерфейса до разработки.' },
      { title: 'VPS и deploy-контур', description: 'Настраиваю Timeweb VPS, домен, SSL, окружение, Docker/Node/Python runtime и базовый путь к дальнейшему развитию продукта.' },
      { title: 'Agentic implementation', description: 'Использую AI-агентов как ускоритель, но оставляю инженерный контроль за архитектурой, тестами и качеством.' },
      { title: 'Release hardening', description: 'Убираю хаос AI-кода, выношу секреты, чиню state/типизацию/БД, прогоняю проверки и деплою.' },
    ],
    formatsTitle: 'Стек и форматы',
    formats: ['Open Design / Codex / GPT Pro', 'React / Next.js / TypeScript', 'FastAPI / Django / Node.js', 'Timeweb VPS / PostgreSQL / Supabase / Docker / Vercel', 'OpenAI API / Telegram Bot API'],
    whatYouGet: [
      'Рабочий production-ready этап, а не “почти готовый” прототип.',
      'Более зрелый frontend: интерфейс проходит через дизайн-системы, preview и критику до финальной сборки.',
      'Понятную архитектуру, которую можно развивать после запуска.',
      'Собственную техническую площадку: сервер, домен, SSL и deploy-контур, где можно дальше развивать сайт, приложение или агентный офис.',
      'Код, который можно поддерживать, показывать инвесторам и подключать к реальному бизнесу.',
    ],
    offersTitle: 'Быстрые офферы',
    offers: [
      { id: 'vps-launchpad', title: 'VPS Launchpad', price: 'от 30 000₽', description: 'Timeweb VPS, домен, SSL, deploy-контур и базовая площадка под сайт, web app, ботов или AI-агентов.' },
      { id: 'telegram-mini-app', title: 'Telegram Mini App', price: 'от 30 000₽', description: 'Базовый TMA до 3 экранов + API, авторизация и мобильный UX внутри Telegram.' },
      { id: 'ai-bot-db-admin', title: 'AI-бот + база + admin', price: 'от 10 000₽', description: 'Бот с OpenAI API, базой данных, сценариями, заявками и панелью управления.' },
      { id: 'ai-code-rescue', title: 'AI-code rescue', price: 'от 7 000₽', description: 'Аудит и стабилизация проекта после Cursor, Lovable, Bolt, v0 или другого AI-генератора.' },
      { id: 'mvp-saas-module', title: 'MVP / SaaS модуль', price: 'от 50 000₽', description: 'Авторизация, первый дашборд, база, роли, API и deploy-ready структура.' },
    ],
    proofPointsTitle: 'Proof-of-work',
    proofPoints: [
      'Флагманский опыт: SaaS-платформа для реального бизнеса с 8 ролями и 15+ дашбордами.',
      'Hermes / Agent OS: agentic control plane, kanban, roadmaps, library, approval-gated workflow.',
      'Hermes Office VPS: агентный офис и сайт, развернутые на облачном сервере как база для дальнейшего развития AI-инструмента.',
      'Freelance OS: CRM-воронка, анализ лидов, proposal drafts и перевод сделки в проект.',
      'Open Design + Codex/GPT Pro: быстрые UI-прототипы, дизайн-системы, sandbox-preview и меньше случайного AI-интерфейса.',
    ],
    caseStudiesTitle: 'Кейсы и системы',
    caseStudies: [
      {
        title: 'Hermes Agent OS',
        description: 'Мультиагентная рабочая среда с задачами, ролями, workflow, roadmaps, библиотекой знаний и human approval.',
        points: ['Kanban + workflow engine', 'Product memory и standards registry', 'VPS/deploy контур и Telegram-агенты'],
      },
      {
        title: 'Hermes Office VPS / VPS Launchpad',
        description: 'Собственная облачная площадка под сайт, web app и агентный офис: сервер, домен, SSL, deploy, база для авторизации, личного кабинета, корзины и оплат.',
        points: ['Timeweb VPS setup', 'Домен, SSL и deploy-контур', 'Платформа для дальнейшего вайбкодинга'],
      },
      {
        title: 'Freelance OS / Showcase',
        description: 'Система для фриланс-заказов: источники, лиды, fit analysis, proposal drafts, CRM-статусы и запуск проекта.',
        points: ['Лиды и фильтры', 'Анализ и предложения', 'Переход из сделки в production'],
      },
    ],
  },
];

function applyServicePriceOverrides(services) {
  if (typeof window === 'undefined' || !window.SERVICE_PRICE_OVERRIDES) return;

  const priceBook = window.SERVICE_PRICE_OVERRIDES;
  services.forEach((service) => {
    const servicePrice = priceBook.services?.[service.slug]?.price;
    if (servicePrice) {
      service.price = servicePrice;
    }

    if (!Array.isArray(service.offers)) return;
    service.offers.forEach((offer) => {
      const offerId = offer.id || offer.slug;
      if (!offerId) return;
      const offerPrice = priceBook.offers?.[service.slug]?.[offerId]?.price;
      if (offerPrice) {
        offer.price = offerPrice;
      }
    });
  });
}

applyServicePriceOverrides(SERVICES_DATA);

/**
 * Получить данные услуги по ID.
 * @param {number|string} id - ID услуги.
 * @returns {Object|null} Данные услуги или null если не найдена.
 */
function getServiceById(id) {
  const serviceId = parseInt(id, 10);
  if (Number.isNaN(serviceId)) return null;
  return SERVICES_DATA.find((service) => service.id === serviceId) || null;
}

function getAllServices() {
  return SERVICES_DATA.slice();
}

if (typeof window !== 'undefined') {
  window.SERVICES_DATA = SERVICES_DATA;
  window.getServiceById = getServiceById;
  window.getAllServices = getAllServices;
}
