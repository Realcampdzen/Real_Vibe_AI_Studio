/**
 * Emoji normalization and stripping for social media output.
 * Self-contained version for @real-vibe/shared (no cf-api dependency).
 */

const EMOJI_STRIP_RE =
  /(?:[#*0-9]\uFE0F?\u20E3|[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}]|\u200D|\uFE0F|\uFE0E|\u20E3)/gu
const LEADING_EMOJI_RE =
  /^(?:[#*0-9]\uFE0F?\u20E3|[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2300}-\u{23FF}])(?:\uFE0F|\uFE0E)?(?:[\u{1F3FB}-\u{1F3FF}])?/u

export function tidyAfterEmojiStrip(value: string): string {
  return String(value || '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+([»"')\],.!?:;])/g, '$1')
    .trim()
}

export function stripEmojiChars(value: string): string {
  return tidyAfterEmojiStrip(String(value || '').replace(EMOJI_STRIP_RE, ''))
}

export function normalizeParagraphEmoji(value: string, opts: { allowLeadingEmoji: boolean }): { text: string; leadingEmoji: string } {
  const t = String(value || '').trim()
  if (!t) return { text: '', leadingEmoji: '' }

  const m = opts.allowLeadingEmoji ? t.match(LEADING_EMOJI_RE) : null
  const leadingEmoji = m ? m[0] : ''

  const body = stripEmojiChars(t)
  if (!body) return { text: leadingEmoji, leadingEmoji }
  if (!leadingEmoji) return { text: body, leadingEmoji: '' }

  return { text: tidyAfterEmojiStrip(`${leadingEmoji} ${body}`), leadingEmoji }
}

/**
 * Strip forbidden emojis from text.
 * Takes a list of forbidden emojis as parameter (no dependency on constants).
 */
export function stripForbiddenEmojis(text: string, forbiddenEmojis: string[] = []): string {
  let cleaned = text
  for (const emoji of forbiddenEmojis) {
    cleaned = cleaned.replace(new RegExp(emoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '')
  }
  return cleaned
}
