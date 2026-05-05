/**
 * Text normalization for outgoing social media messages.
 * Self-contained version for @real-vibe/shared.
 */
import { normalizeParagraphEmoji, stripForbiddenEmojis } from './emoji'
import { truncate } from './memory'

function clampQuestionMarks(value: string): string {
  let seen = false
  return value.replace(/[?？]/g, (m) => {
    if (!seen) {
      seen = true
      return m
    }
    return '.'
  })
}

function limitSentences(value: string, maxSentences: number): string {
  const text = (value || '').trim()
  if (!text) return ''
  const parts = text.match(/[^.!?？]+[.!?？]+|[^.!?？]+$/g) || []
  const sliced = parts.slice(0, maxSentences).join(' ').replace(/\s{2,}/g, ' ').trim()
  return sliced
}

export function normalizeOutgoingText(
  text: string,
  maxChars: number,
  opts?: { ensureEmoji?: boolean; allowMainEmoji?: boolean; forbiddenEmojis?: string[] },
): string {
  let cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/```/g, '')
    .replace(/`/g, '')
    .trim()

  // Remove forbidden emojis if provided
  if (opts?.forbiddenEmojis?.length) {
    cleaned = stripForbiddenEmojis(cleaned, opts.forbiddenEmojis)
  }

  // Remove list markers
  cleaned = cleaned.replace(/^\s*(?:[-*•]\s+|\d+\s*[.)]\s+)/gm, '')

  // Remove "Mini-task:" and everything after
  const miniLabelRe = /^(?:[^A-Za-zА-Яа-я0-9]{0,12}\s*)?(?:мини\s*[-‑–—]?\s*задани[ея]|проверка)\s*:\s*/iu
  const rawLines = cleaned.split('\n')
  const lines = rawLines.map((l) => l.trim()).filter((l) => l.length > 0)

  let miniIndex = -1
  for (let i = 0; i < lines.length; i++) {
    if (miniLabelRe.test(lines[i])) {
      miniIndex = i
      break
    }
  }

  const mainParts = (miniIndex >= 0 ? lines.slice(0, miniIndex) : lines).join(' ')
  const mainText = (mainParts || '').replace(/\s{2,}/g, ' ').trim()

  // Replace "не только …, но и …" with direct listing
  let mainCleaned = mainText.replace(
    /не\s+только\s+([^\n]{1,220}?)\s*[,–—-]?\s*но\s+и\s+([^\n]{1,220}?)(?=\s*(?:[,.!?:;]|\n|$))/giu,
    (_m, left: string, right: string) => {
      const l = String(left || '').trim().replace(/^[\s,–—-]+/, '').replace(/[\s,–—-]+$/, '')
      const r = String(right || '').trim().replace(/^[\s,–—-]+/, '').replace(/[\s,–—-]+$/, '')
      if (!l && !r) return ''
      if (!l) return `и ${r}`
      if (!r) return `и ${l}`
      return `и ${l}, и ${r}`
    },
  )

  const mainLimited = limitSentences(mainCleaned, 3)
  const mainClamped = clampQuestionMarks(mainLimited || 'Принято.')

  const allowMainEmoji = opts?.allowMainEmoji !== false
  const mainEmojiNorm = normalizeParagraphEmoji(mainClamped, { allowLeadingEmoji: allowMainEmoji })

  let mainFinal = mainEmojiNorm.text || 'Принято.'

  if (opts?.ensureEmoji && !mainEmojiNorm.leadingEmoji) {
    const withEmoji = normalizeParagraphEmoji(`💜 ${mainFinal}`, { allowLeadingEmoji: true })
    mainFinal = withEmoji.text || mainFinal
  }

  return truncate(mainFinal, maxChars)
}
