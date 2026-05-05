/**
 * Env/utility functions used across VK, TG, and badge logic.
 */

export function nowTs(): number {
  return Date.now()
}

export function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

export function isTruthyEnvFlag(v: unknown): boolean {
  if (typeof v !== 'string') return false
  const t = v.trim().toLowerCase()
  if (!t) return false
  return t === '1' || t === 'true' || t === 'yes' || t === 'y' || t === 'on'
}

export function clipOneLine(value: unknown, max: number): string {
  const text = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : ''
  if (!text) return ''
  if (text.length <= max) return text
  return `${text.slice(0, max).trim()}…`
}

export async function sleep(ms: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, ms))
}
