const API_BASE = (window.__AI_API_BASE__ || '').replace(/\/$/, '');
const OPENAI_API_URL = API_BASE ? `${API_BASE}/chat` : '/chat';
const OWNER_TOKEN_STORAGE_KEY = 'rv_owner_token';

function discardBrowserOwnerToken() {
  const url = new URL(window.location.href);
  const hadOwnerToken = url.searchParams.has(OWNER_TOKEN_STORAGE_KEY);

  try {
    window.localStorage.removeItem(OWNER_TOKEN_STORAGE_KEY);
  } catch (error) {
    // Ignore storage access errors in private/restricted contexts.
  }

  if (hadOwnerToken) {
    url.searchParams.delete(OWNER_TOKEN_STORAGE_KEY);
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}${url.hash}`);
  }
}

function getChatHeaders() {
  return { 'Content-Type': 'application/json' };
}

async function parseChatResponse(response) {
  const data = await response.json().catch(() => ({}));

  if (response.status === 429 && data.code === 'chat_daily_limit') {
    return data.error || 'На сегодня лимит ответов этого бота исчерпан. Попробуй завтра.';
  }

  if (!response.ok) {
    throw new Error(data.error || 'Сервер недоступен');
  }

  return (data.reply || data.response || '').trim();
}

discardBrowserOwnerToken();

window.RealVibeChat = {
  getHeaders: getChatHeaders,
  parseResponse: parseChatResponse,
};

// Проверяем, загружается ли аватар кота Бро
function checkBroAvatarLoading() {
  const img = new Image();
  img.onload = function() {
    console.log('✅ Аватар кота Бро загружен успешно');
  };
  img.onerror = function() {
    console.warn('⚠️ Аватар кота Бро не найден, используем fallback');
    // Добавляем класс fallback ко всем аватарам кота
    const avatars = document.querySelectorAll('.chat-avatar, .message-avatar, .btn-bro-avatar');
    avatars.forEach(avatar => {
      if (!avatar.textContent || avatar.classList.contains('btn-bro-avatar')) { // Для аватаров кота и кнопки
        avatar.classList.add('fallback');
        if (!avatar.classList.contains('btn-bro-avatar')) {
          avatar.textContent = '🐱';
        }
      }
    });
  };
  img.src = 'images/bro-avatar.jpg';
}

// Fallback ответы для случаев, когда сервер недоступен
const FALLBACK_RESPONSES = {
  // Знакомство и личность
  'привет': '🐱 Мяу! Я Кот Бро - рыжий захватчик этого сайта! *потягивается*\n\nЯ тут не просто для красоты - я настоящий AI-гид студии! Умею:\n🎯 Рассказывать о проектах с юмором\n😸 Подкалывать клиентов (но мило)\n🤖 Объяснять сложные штуки простыми словами\n\nХочешь себе такого же мемного помощника? От 18 000₽ и он будет твоим! 🚀\n\nА пока давай поболтаем - что интересует? *мурчит*',
  
  'кто ты': '😸 Я Кот Бро - официальный захватчик AI Studio! *гордо поднимает хвост*\n\nМоя история:\n🏠 Пришел к Степану "в гости"\n💻 Увидел сайт - решил остаться\n🎭 Стал главным мемным гидом\n🤖 Теперь показываю, как работают AI-боты\n\nВидишь, как я общаюсь? Хочешь себе такого же харизматичного помощника?\n💰 Стоимость: от 18 000₽\n⚡ Срок: 2 недели\n\nТвой бот тоже может стать звездой! Заказать: @Stivanovv 🌟',
  
  // Демонстрация возможностей
  'что умеешь': '🎪 О, сейчас покажу свои суперспособности! *разминает лапки*\n\n**Что я умею прямо сейчас:**\n🎭 Веду диалог с характером\n💡 Объясняю услуги студии\n😂 Подкалываю, но мило\n📊 Помню контекст разговора\n🎯 Направляю к нужным услугам\n\n**А еще я:**\n✨ Работаю 24/7 без перерывов\n🧠 Учусь на каждом диалоге\n💬 Интегрируюсь в Telegram/сайт\n📱 Адаптируюсь под любой бизнес\n\nВпечатлен? Хочешь себе такого же умного помощника?\n💰 От 18 000₽ - и у тебя будет свой AI-персонаж!\n\nЗаказать клона: @Stivanovv 🚀',
  
  // Продажа через опыт
  'цена': '💰 Ха! Ты спрашиваешь у меня цену? *ухмыляется*\n\nЯ же живой пример того, что получишь!\n\n**Видишь, как я работаю?**\n🎭 Личность и характер\n💬 Умные ответы\n😸 Эмоциональная связь\n🎯 Продажи через общение\n\n**Хочешь себе такого же?**\n🤖 Простой бот: от 12 000₽\n🧠 Умный как я: от 18 000₽\n⭐ Супер-персонаж: от 25 000₽\n\nОкупается за месяц! Мой хозяин уже в плюсе 😎\n\nЗаказать своего "Кота Бро": @Stivanovv',
  
  'стоимость': '🎯 Слушай, я же не просто болтаю - я РАБОТАЮ! *показывает лапкой на экран*\n\nПосмотри на наш диалог:\n✅ Я тебя заинтересовал?\n✅ Ты продолжаешь общаться?\n✅ Узнаешь о студии?\n✅ Хочешь заказать бота?\n\nВОТ ЭТО И ЕСТЬ РЕЗУЛЬТАТ! 🎪\n\n**Инвестиция в такого помощника:**\n💰 18-25 тыс₽ за разработку\n📈 +200% к конверсии\n⏰ Работает 24/7\n💸 Окупается за месяц\n\nЯ живое доказательство эффективности! Заказать: @Stivanovv 🚀',
  
  // Кейсы и примеры
  'пример': '📚 Хочешь кейс? Вот МОЯ история успеха! *садится важно*\n\n**ДО меня:**\n😴 Сайт был скучный\n📉 Клиенты быстро уходили\n💤 Никто не задавал вопросы\n\n**ПОСЛЕ моего появления:**\n🎪 Сайт ожил и стал интересным\n📈 Время на сайте +300%\n💬 Клиенты активно общаются\n💰 Заявок стало в 2 раза больше\n\n**Секрет успеха:**\n🎭 Я не продаю - я развлекаю\n😸 Клиенты расслабляются\n🤝 Доверие растет естественно\n💡 Покупка становится желанной\n\nХочешь такой же результат? Твой бот может быть еще круче!\nЗаказать: @Stivanovv 🌟',
  
  // Технические возможности
  'технологии': '🤖 Ой, технические подробности? *потягивается*\n\nЯ работаю на:\n🧠 GPT-4 для умных ответов\n💾 Собственной базе знаний\n⚡ Node.js бэкенде\n🎨 React интерфейсе\n\nНо главное - у меня есть ДУША! 😸\n\n**Что это дает:**\n✨ Живые диалоги\n🎯 Точные ответы\n📱 Работа везде\n🔄 Постоянное обучение\n\nТехнологии - это основа, а характер - это то, что продает!\nХочешь своего персонажа? @Stivanovv 🚀',
  
  // Вопросы о сроках
  'срок': '⏰ Сроки? Ха! Меня создавали 2 недели! *гордо*\n\n**Этапы моего рождения:**\n📝 1-3 дня: придумали характер\n🧠 4-7 дней: обучили мозги\n🎨 8-10 дней: сделали красивым\n🔧 11-14 дней: интегрировали\n\n**Твой бот будет готов так же быстро:**\n🤖 Простой: 1 неделя\n🧠 Умный как я: 2 недели\n⭐ Супер-персонаж: 3 недели\n\nНачнем завтра - и через 2 недели у тебя будет свой AI-помощник!\nЗаказать: @Stivanovv ⚡',
  
  // Общие вопросы
  'помощь': '🤝 Помощь? Да я уже помогаю! *подмигивает*\n\nСмотри, что происходит:\n💬 Мы общаемся (ты не скучаешь)\n🎯 Ты узнаешь о студии (информация)\n😸 Тебе нравится мой стиль (эмоции)\n💡 Ты думаешь о заказе (результат)\n\nЭТО И ЕСТЬ РАБОТА AI-ПОМОЩНИКА! 🎪\n\nХочешь, чтобы твои клиенты так же:\n✅ Задерживались на сайте\n✅ Получали информацию с удовольствием\n✅ Доверяли твоему бренду\n✅ Чаще делали заказы\n\nЗаказать своего помощника: @Stivanovv 🚀',
  
  // Дефолтный ответ
  'default': '🤔 Хм, интересный вопрос! *почесывает за ухом*\n\nЗнаешь, я могу болтать на любые темы, но главное - я показываю, КАК работает хороший AI-бот!\n\n**Видишь мою магию?**\n🎭 Я живой и интересный\n💬 Отвечаю по теме\n😸 Создаю настроение\n🎯 Веду к цели\n\nТакой же помощник нужен твоему бизнесу!\n💰 От 18 000₽\n⏰ За 2 недели\n📈 Окупится за месяц\n\nОбсудить проект: @Stivanovv 🚀\n\nА пока - задавай любые вопросы! *мурчит*'
};

function getFallbackResponse(message) {
  const lowerMessage = message.toLowerCase();
  
  // Проверяем ключевые слова в порядке приоритета
  if (lowerMessage.includes('привет') || lowerMessage.includes('здравствуй') || lowerMessage.includes('добро')) {
    return FALLBACK_RESPONSES.привет;
  }
  
  if (lowerMessage.includes('кто ты') || lowerMessage.includes('что ты') || lowerMessage.includes('расскажи о себе')) {
    return FALLBACK_RESPONSES['кто ты'];
  }
  
  if (lowerMessage.includes('что умеешь') || lowerMessage.includes('возможности') || lowerMessage.includes('функции')) {
    return FALLBACK_RESPONSES['что умеешь'];
  }
  
  if (lowerMessage.includes('пример') || lowerMessage.includes('кейс') || lowerMessage.includes('результат')) {
    return FALLBACK_RESPONSES.пример;
  }
  
  if (lowerMessage.includes('цена') || lowerMessage.includes('сколько стоит')) {
    return FALLBACK_RESPONSES.цена;
  }
  
  if (lowerMessage.includes('стоимость') || lowerMessage.includes('прайс')) {
    return FALLBACK_RESPONSES.стоимость;
  }
  
  if (lowerMessage.includes('срок') || lowerMessage.includes('время') || lowerMessage.includes('когда')) {
    return FALLBACK_RESPONSES.срок;
  }
  
  if (lowerMessage.includes('технологии') || lowerMessage.includes('как работаешь') || lowerMessage.includes('gpt')) {
    return FALLBACK_RESPONSES.технологии;
  }
  
  if (lowerMessage.includes('помощь') || lowerMessage.includes('помоги') || lowerMessage.includes('что делать')) {
    return FALLBACK_RESPONSES.помощь;
  }
  
  // Если ничего не найдено, возвращаем дефолтный ответ
  return FALLBACK_RESPONSES.default;
}

async function sendMessageToBro(message) {
  try {
    const response = await fetch(OPENAI_API_URL, {
      method: 'POST',
      headers: getChatHeaders(),
      body: JSON.stringify({ message })
    });

    return await parseChatResponse(response);
  } catch (error) {
    // Если сервер недоступен, используем fallback
    console.log('Используем fallback ответ:', error.message);
    return getFallbackResponse(message).replace(/\*\*/g, '').replace(/\*/g, '');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const openChatBtn = document.getElementById('open-chat');
  const openChatBtn2 = document.getElementById('open-chat-2');
  const openHipychBtn = document.getElementById('open-hipych-chat');
  const openHipychBtn2 = document.getElementById('open-hipych-chat-2');
  const closeChatBtn = document.getElementById('close-chat');
  const chatOverlay = document.getElementById('chat-overlay');
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const chatSend = document.getElementById('chat-send');

  // Open chat functions
  function openChat() {
    // Открываем Glass UI виджет Кота Бро вместо старого чата
    if (window.glassUIBroCat) {
      window.glassUIBroCat.showChat();
    } else {
      // Fallback к старому чату если Glass UI не загружен
      document.body.classList.add('glass-ui-fallback');
      chatOverlay.classList.remove('hidden');
      chatInput.focus();
    }
  }

  // Open Hipych chat function
  function openHipychChat() {
    if (window.glassUIHipych) {
      window.glassUIHipych.showChat();
    } else {
      console.log('Хипыч не загружен');
    }
  }

  // Event listeners for opening chat
  if (openChatBtn) openChatBtn.addEventListener('click', openChat);
  if (openChatBtn2) openChatBtn2.addEventListener('click', openChat);
  if (openHipychBtn) openHipychBtn.addEventListener('click', openHipychChat);
  if (openHipychBtn2) openHipychBtn2.addEventListener('click', openHipychChat);

  // Close chat
  if (closeChatBtn) {
    closeChatBtn.addEventListener('click', () => {
      chatOverlay.classList.add('hidden');
    });
  }

  // Close chat on overlay click
  if (chatOverlay) {
    chatOverlay.addEventListener('click', (e) => {
      if (e.target === chatOverlay) {
        chatOverlay.classList.add('hidden');
      }
    });
  }

  // Send message function
  const sendMessage = async () => {
    const userMessage = chatInput.value.trim();
    if (!userMessage) return;

    // Add user message
    addMessage(userMessage, 'user');
    chatInput.value = '';

    // Add typing indicator
    const typingDiv = addTypingIndicator();

    try {
      const broReply = await sendMessageToBro(userMessage);
      // Remove typing indicator
      if (typingDiv && typingDiv.parentNode) {
        chatMessages.removeChild(typingDiv);
      }
      // Add AI response
      addMessage(broReply, 'assistant');
    } catch (err) {
      // Remove typing indicator
      if (typingDiv && typingDiv.parentNode) {
        chatMessages.removeChild(typingDiv);
      }
      // Add error message
      addMessage(`Извините, произошла ошибка: ${err.message}. Попробуйте написать в Telegram @Stivanovv`, 'assistant', true);
    }
  };

  // Add message to chat
  const addMessage = (message, sender, isError = false) => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    
    // Для кота Бро используем изображение, для пользователя - эмодзи
    if (sender === 'assistant') {
      // Аватар устанавливается через CSS background-image
      avatar.replaceChildren();
    } else {
      avatar.textContent = '👤';
    }
    
    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = message;
    
    if (isError) {
      content.classList.add('is-error');
    }
    
    messageDiv.classList.add('chat-message-enter');
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    
    chatMessages.appendChild(messageDiv);
    
    // Animate message appearance
    requestAnimationFrame(() => {
      messageDiv.classList.add('is-visible');
    });
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
  };

  // Add typing indicator
  const addTypingIndicator = () => {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-message assistant typing-indicator';
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.replaceChildren();
    
    const content = document.createElement('div');
    content.className = 'message-content';
    const dots = document.createElement('span');
    dots.className = 'typing-dots';
    dots.textContent = '●●●';
    content.appendChild(dots);
    content.classList.add('is-muted');
    
    typingDiv.appendChild(avatar);
    typingDiv.appendChild(content);
    
    chatMessages.appendChild(typingDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    return typingDiv;
  };

  // Send message on button click
  if (chatSend) {
    chatSend.addEventListener('click', sendMessage);
  }

  // Send message on Enter press
  if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
  }

  // Add welcome message animation
  setTimeout(() => {
    const firstMessage = document.querySelector('.chat-message.assistant');
    if (firstMessage) {
      firstMessage.classList.add('chat-message-enter');
      requestAnimationFrame(() => {
        firstMessage.classList.add('is-visible');
      });
    }
  }, 500);

  // Проверяем загрузку аватара кота Бро
  checkBroAvatarLoading();
});
