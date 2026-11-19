export {
  normalizeHindi,
  segmentAksharas,
  isDevanagari,
  clusterBase,
} from './devanagari.js'
export { unicodeToKruti, unicodeToKrutiClusters } from './unicodeToKruti.js'
export { krutiToUnicode, tokenizeKruti } from './krutiToUnicode.js'
export { applyLigatures, removeLigatures, applyLigaturesAtCaret, LIGATURES } from './ligatures.js'
export { compareLine, isCompatiblePrefix, detectLineEnd, ERROR_LABELS } from './compare.js'
export {
  KEYBOARD_ROWS,
  CHAR_TO_KEY,
  describeKey,
  keysForSequence,
  FINGER_NAMES,
  HAND_NAMES,
  ROW_NAMES,
} from './keymap.js'

import { krutiToUnicode } from './krutiToUnicode.js'
import { normalizeHindi } from './devanagari.js'
import { unicodeToKruti } from './unicodeToKruti.js'
import { removeLigatures } from './ligatures.js'

/** Turn whatever is in the input box into Unicode for comparison */
export function typedToUnicode(raw, mode) {
  return mode === 'kruti' ? krutiToUnicode(raw) : normalizeHindi(raw)
}

/**
 * The next Kruti Dev character the learner should type, or null.
 * Returns { ch } or { backspace: true } when the typed keys diverge from the
 * expected key sequence.
 */
export function nextExpectedKey(reference, raw) {
  const expected = unicodeToKruti(reference, { mode: 'typable' })
  const typed = removeLigatures(raw)
  if (expected.startsWith(typed)) {
    return typed.length < expected.length ? { ch: expected[typed.length] } : null
  }
  // the learner may have used an alternative but equivalent key sequence
  if (krutiToUnicode(typed) === krutiToUnicode(expected.slice(0, typed.length))) {
    return { ch: expected[typed.length] ?? null }
  }
  return { backspace: true }
}
export { typedHighlights } from './highlight.js'
