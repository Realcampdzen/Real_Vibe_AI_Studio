/**
 * Owner-only bridge to the deployed Hermes wellness core agent.
 * Public site visitors never reach this adapter; they stay on safe site agents.
 */
import config from '../config/env.js';

function parseHermesReply(payload) {
  const choices = payload?.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    return '';
  }

  const message = choices[0]?.message;
  if (message && typeof message.content === 'string') {
    return message.content;
  }

  return '';
}

export function isWellnessHealthAgentConfigured() {
  return Boolean(config.hermes.wellnessGatewayUrl && config.hermes.wellnessApiKey);
}

export async function callWellnessHealthAgent(userMessage) {
  if (!isWellnessHealthAgentConfigured()) {
    return '';
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.hermes.wellnessTimeoutMs);

  try {
    const response = await fetch(config.hermes.wellnessGatewayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.hermes.wellnessApiKey}`,
      },
      body: JSON.stringify({
        model: config.hermes.wellnessModel,
        messages: [
          {
            role: 'user',
            content: [
              'Ты отвечаешь владельцу сайта через owner-only режим Real Vibe Studio.',
              'Сохраняй медицинские ограничения: не ставь диагнозы, не назначай лечение, при острых симптомах отправляй к врачу или в экстренную помощь.',
              String(userMessage || ''),
            ].join('\n\n'),
          },
        ],
        stream: false,
      }),
      signal: controller.signal,
    });

    const raw = await response.text();
    if (!response.ok) {
      const error = new Error(`Hermes wellness route HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }

    const payload = raw ? JSON.parse(raw) : {};
    return parseHermesReply(payload).trim();
  } finally {
    clearTimeout(timeout);
  }
}
