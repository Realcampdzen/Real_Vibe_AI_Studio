/**
 * @real-vibe/shared — общие модули между cf-api и vk-autocomment-module.
 * Единственная реализация: openai, kv, memory, утилиты.
 */

// Типы
export type { OpenAIChatMessage } from './openai'
export type { MemoryMessage } from './memory'

// OpenAI
export { callOpenAIChat } from './openai'

// KV
export { kvGetJson, kvPutJson, kvPutText, kvGetText, kvIsDuplicate } from './kv'

// Memory
export { getConversationMemory, appendConversationMemory, truncate } from './memory'

// Env utils
export { nowTs, isNonEmptyString, isTruthyEnvFlag, clipOneLine, sleep } from './env-utils'

// Emoji
export { stripEmojiChars, normalizeParagraphEmoji, stripForbiddenEmojis, tidyAfterEmojiStrip } from './emoji'

// Text normalizer
export { normalizeOutgoingText } from './text-normalizer'
