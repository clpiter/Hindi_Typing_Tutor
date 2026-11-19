import { segmentAksharas, normalizeHindi } from './devanagari.js'
import { krutiToUnicode } from './krutiToUnicode.js'

/**
 * Colour the learner's own typed text (inside the input box).
 *
 * The comparison works on Unicode aksharas, but the box shows the raw keys
 * (Kruti Dev codes). Each raw key is mapped to the akshara it belongs to by
 * decoding growing prefixes of its word: the akshara index of key k is
 * (number of aksharas in decode(word[0..k])) − 1. So "f d" (कि) are both in
 * akshara 0, and a reph "Z" typed after "e" belongs to the akshara र्म.
 * The overlay therefore renders the exact raw string and lines up with the caret.
 *
 * Returns [{ text, status }] with status: correct | current | error
 */
export function typedHighlights(raw, mode, comparison) {
  if (!raw || !comparison) return []
  const decode = (s) => (mode === 'kruti' ? krutiToUnicode(s) : normalizeHindi(s))

  // statuses of the reference aksharas, grouped by word
  const perWord = []
  for (const c of comparison.clusters) {
    if (c.isSpace) continue
    ;(perWord[c.wordIndex] ||= []).push(c.status)
  }

  const segs = []
  const push = (text, status) => {
    const last = segs[segs.length - 1]
    if (last && last.status === status) last.text += text
    else segs.push({ text, status })
  }
  const toClass = (s) => (s === 'correct' ? 'correct' : s === 'incorrect' || s === 'missing' || s === 'extra' ? 'error' : 'current')

  const rawWords = raw.split(' ')
  let wi = -1 // index among non-empty words (extra spaces are skipped, as in compareLine)
  rawWords.forEach((w, ri) => {
    const isLast = ri === rawWords.length - 1
    const counted = w !== '' || isLast
    if (ri > 0) {
      // the space typed before this word
      if (!counted) push(' ', 'error') // double space
      else push(' ', wi + 1 < perWord.length ? 'correct' : 'error')
    }
    if (!counted) return
    wi += 1
    const statuses = perWord[wi]
    const chars = Array.from(w)
    const total = segmentAksharas(decode(w)).length
    for (let k = 0; k < chars.length; k++) {
      if (!statuses) {
        push(chars[k], 'error') // a whole extra word
        continue
      }
      const idx = Math.min(Math.max(0, segmentAksharas(decode(chars.slice(0, k + 1).join(''))).length - 1), Math.max(0, total - 1))
      push(chars[k], idx < statuses.length ? toClass(statuses[idx]) : 'error')
    }
  })
  return segs
}
