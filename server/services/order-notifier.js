import config from '../config/env.js';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function buildOrderMessage(order) {
  const lines = [
    '<b>Новая заявка из корзины Real Vibe</b>',
    '',
    `<b>Заказ:</b> ${escapeHtml(order.shortId)}`,
    `<b>Клиент:</b> ${escapeHtml(order.customerName)}`,
    `<b>Контакт:</b> ${escapeHtml(order.contact)}`,
  ];

  if (order.message) {
    lines.push(`<b>Комментарий:</b> ${escapeHtml(order.message)}`);
  }

  lines.push('', '<b>Услуги:</b>');
  for (const item of order.items || []) {
    const notes = item.notes ? ` — ${escapeHtml(item.notes)}` : '';
    lines.push(`• ${escapeHtml(item.serviceTitle)} (${escapeHtml(item.priceLabel)}) x${item.quantity}${notes}`);
  }

  return lines.join('\n');
}

export async function notifyOrderCreated(order) {
  if (!config.orders.telegramBotToken || !config.orders.telegramChatId) {
    return { status: 'skipped', error: 'telegram_not_configured' };
  }

  const response = await fetch(`https://api.telegram.org/bot${config.orders.telegramBotToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: config.orders.telegramChatId,
      text: buildOrderMessage(order),
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    const error = new Error(`Telegram notification failed: ${response.status}`);
    error.detail = text.slice(0, 300);
    throw error;
  }

  return { status: 'sent' };
}
