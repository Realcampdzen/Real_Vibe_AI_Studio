/**
 * Агентный чат — OpenAI с function calling.
 * Бот может вызывать tools (услуги, портфолио, цены, заявки)
 * и использовать результаты в ответе.
 */
import { openai, isConnected } from '../services/openai-client.js';
import { stripMarkdown } from '../services/text-cleaner.js';
import { TOOL_DEFINITIONS, TOOL_HANDLERS } from './tools.js';
import { logger } from '../middleware/logging.js';

const MAX_TOOL_ROUNDS = 3; // Максимум циклов tool calling

/**
 * Выполняет агентный чат с tool calling loop.
 * @param {string} systemPrompt - Системный промпт бота
 * @param {string} userMessage - Сообщение пользователя
 * @param {object} [opts] - Опции
 * @returns {Promise<string>} Финальный ответ бота
 */
export async function agentChat(systemPrompt, userMessage, opts = {}) {
  if (!isConnected() || !openai) return null;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const response = await openai.chat.completions.create({
      model: opts.model || 'gpt-5-mini',
      messages,
      tools: TOOL_DEFINITIONS,
      tool_choice: round === 0 ? 'auto' : 'auto',
      max_completion_tokens: opts.maxTokens || 1000,
    });

    const choice = response.choices?.[0];
    if (!choice) return null;

    const message = choice.message;
    messages.push(message);

    // Если нет tool calls — финальный ответ
    if (!message.tool_calls || message.tool_calls.length === 0) {
      return stripMarkdown(message.content || '');
    }

    // Выполняем все tool calls
    for (const toolCall of message.tool_calls) {
      const fn = toolCall.function;
      const handler = TOOL_HANDLERS[fn.name];

      if (!handler) {
        logger.warn(`Unknown tool: ${fn.name}`);
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({ error: `Unknown tool: ${fn.name}` }),
        });
        continue;
      }

      try {
        const args = JSON.parse(fn.arguments || '{}');
        const result = handler(args);
        logger.info('Tool call completed', { tool: fn.name });

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result),
        });
      } catch (err) {
        logger.error(`Tool ${fn.name} error:`, { error: err.message });
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({ error: err.message }),
        });
      }
    }
  }

  // Если исчерпали раунды — последний ответ
  const finalResponse = await openai.chat.completions.create({
    model: opts.model || 'gpt-5-mini',
    messages,
    max_completion_tokens: opts.maxTokens || 1000,
  });

  return stripMarkdown(finalResponse.choices?.[0]?.message?.content || '');
}
