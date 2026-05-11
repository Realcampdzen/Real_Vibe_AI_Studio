/**
 * SSE (Server-Sent Events) streaming для чат-ботов.
 * Ответ бота появляется по токенам в реальном времени.
 */
import { openai, isConnected } from '../services/openai-client.js';
import { TOOL_DEFINITIONS, TOOL_HANDLERS } from './tools.js';
import { logger } from '../middleware/logging.js';

const MAX_TOOL_ROUNDS = 3;

/**
 * Стримит ответ бота через SSE.
 * @param {import('express').Response} res - Express response (SSE)
 * @param {string} systemPrompt - Системный промпт
 * @param {string} userMessage - Сообщение пользователя
 */
export async function streamAgentChat(res, systemPrompt, userMessage, opts = {}) {
  if (!isConnected() || !openai) {
    res.write(`data: ${JSON.stringify({ type: 'error', content: 'AI unavailable' })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
    return;
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage },
  ];

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      // Non-streaming call to check for tool calls first
      const checkResponse = await openai.chat.completions.create({
        model: opts.model || 'gpt-5-mini',
        messages,
        tools: TOOL_DEFINITIONS,
        tool_choice: 'auto',
        max_completion_tokens: opts.maxTokens || 1000,
      });

      const choice = checkResponse.choices?.[0];
      if (!choice) break;

      const message = choice.message;

      // If tool calls — execute them, then continue loop
      if (message.tool_calls && message.tool_calls.length > 0) {
        messages.push(message);

        for (const toolCall of message.tool_calls) {
          const handler = TOOL_HANDLERS[toolCall.function.name];
          if (!handler) continue;

          try {
            const args = JSON.parse(toolCall.function.arguments || '{}');
            const result = handler(args);
            logger.info('Stream tool call completed', { tool: toolCall.function.name });

            // Notify client about tool usage
            res.write(`data: ${JSON.stringify({ type: 'tool', name: toolCall.function.name, args })}\n\n`);

            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(result),
            });
          } catch (err) {
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify({ error: err.message }),
            });
          }
        }
        continue; // Next round
      }

      // No tool calls — stream the final response
      break;
    }

    // Stream the final text response
    const stream = await openai.chat.completions.create({
      model: opts.model || 'gpt-5-mini',
      messages,
      max_completion_tokens: opts.maxTokens || 1000,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices?.[0]?.delta?.content;
      if (delta) {
        res.write(`data: ${JSON.stringify({ type: 'text', content: delta })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    logger.error('Stream error:', { error: err.message });
    res.write(`data: ${JSON.stringify({ type: 'error', content: err.message })}\n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  }
}
