import { segmentAksharas, normalizeHindi, clusterBase, VIRAMA } from './devanagari.js'

/**
 * Typing comparison engine.
 *
 * Both texts are compared as Unicode aksharas (see segmentAksharas), never as
 * raw string indexes and never as raw Kruti Dev codes. Kruti Dev input is first
 * decoded with krutiToUnicode(), so alternative key sequences that produce the
 * same Hindi text (e.g. "d" and "Dk" for क) are treated as identical.
 *
 * The line is aligned word by word, so one missing letter does not turn the rest
 * of the line red.
 *
 * Cluster statuses:
 *   correct   – typed and matches (green)
 *   incorrect – typed but wrong (red underline)            error type: character | matra
 *   current   – the akshara being typed right now that is still a valid prefix
 *               of the expected akshara (neutral; e.g. after typing only "f" for कि)
 *   missing   – skipped (the learner moved on to the next word)  (red underline)
 *   pending   – not yet typed (neutral)
 * extras  – typed aksharas that do not exist in the reference (red)
 */

// Decompositions used ONLY for the "is this a valid prefix while typing" check.
// Kruti Dev builds some letters from several keys (ो = ा + े, ई = इ + reph glyph …).
const PREFIX_DECOMP = [
  ['ओ', 'अाे'],
  ['औ', 'अाै'],
  ['ऑ', 'अाॅ'],
  ['आ', 'अा'],
  ['ई', 'इ\u0001'],
  ['ऐ', 'ए\u0002'],
  ['ऊ', 'उू'],
  ['ो', 'ाे'],
  ['ौ', 'ाै'],
  ['ॉ', 'ाॅ'],
]
function decomp(s) {
  let r = s
  for (const [a, b] of PREFIX_DECOMP) r = r.split(a).join(b)
  return r
}

/** Is `typed` a plausible unfinished version of `expected`? */
export function isCompatiblePrefix(typed, expected) {
  if (!typed) return true
  if (typed === expected) return true
  let t = decomp(typed).replace(/ि/g, '')
  let e = decomp(expected).replace(/ि/g, '')
  // reph is typed after the consonant in Kruti Dev
  if (e.startsWith('र्') && !t.startsWith('र्')) e = e.slice(2)
  // a half letter typed so far (क्) is the start of क / क्ष / क्त …
  if (t.endsWith(VIRAMA)) t = t.slice(0, -1)
  return e.startsWith(t)
}

function classifyMismatch(expected, typed) {
  if (expected === ' ' || typed === ' ') return 'space'
  const eb = clusterBase(expected)
  const tb = clusterBase(typed)
  if (eb && eb === tb) return 'matra'
  return 'character'
}

/**
 * @param {string} reference  canonical Unicode text
 * @param {string} typedText   Unicode text typed so far (already decoded)
 * @param {{ final?: boolean }} opts  final=true treats the last akshara as finished
 */
export function compareLine(reference, typedText, opts = {}) {
  const ref = normalizeHindi(reference).trim()
  const typedRaw = normalizeHindi(typedText)
  const refWords = ref.split(' ')
  // Extra (double / leading) spaces are reported as space errors but removed for
  // alignment, so the following words are still compared with the right words.
  const rawWords = typedRaw.split(' ')
  const typedWords = rawWords.filter((w, i) => w !== '' || i === rawWords.length - 1)
  const extraSpaces = rawWords.filter((w, i) => w === '' && i !== rawWords.length - 1).length
  const typingStarted = typedRaw.length > 0

  const clusters = [] // per reference akshara (including spaces)
  const extras = [] // { afterIndex, text, type }
  const errors = [] // { type, expected, actual, wordIndex }

  const lastTypedWord = typedWords.length - 1

  refWords.forEach((word, wi) => {
    const refCl = segmentAksharas(word)
    const hasTypedWord = typingStarted && wi < typedWords.length
    const typedCl = hasTypedWord ? segmentAksharas(typedWords[wi]) : []
    const isActiveWord = hasTypedWord && wi === lastTypedWord && !opts.final
    const passedWord = hasTypedWord && wi < lastTypedWord

    refCl.forEach((rc, ci) => {
      const tc = typedCl[ci]
      let status
      if (tc === undefined) {
        status = passedWord || (opts.final && hasTypedWord) ? 'missing' : 'pending'
        if (status === 'missing') errors.push({ type: 'missing', expected: rc, actual: '', wordIndex: wi })
      } else if (tc === rc) {
        status = 'correct'
      } else if (isActiveWord && ci === typedCl.length - 1 && isCompatiblePrefix(tc, rc)) {
        status = 'current'
      } else {
        status = 'incorrect'
        errors.push({ type: classifyMismatch(rc, tc), expected: rc, actual: tc, wordIndex: wi })
      }
      clusters.push({ ref: rc, typed: tc ?? '', status, wordIndex: wi })
    })

    // extra aksharas typed inside this word
    if (typedCl.length > refCl.length) {
      const extra = typedCl.slice(refCl.length).join('')
      extras.push({ afterIndex: clusters.length - 1, text: extra, type: 'extra' })
      errors.push({ type: 'extra', expected: '', actual: extra, wordIndex: wi })
    }

    // word separator
    if (wi < refWords.length - 1) {
      let status = 'pending'
      if (typingStarted && wi < lastTypedWord) status = 'correct'
      clusters.push({ ref: ' ', typed: status === 'correct' ? ' ' : '', status, wordIndex: wi, isSpace: true })
    }
  })

  // more words typed than the reference has
  if (typingStarted && typedWords.length > refWords.length) {
    const extraWords = typedWords.slice(refWords.length)
    const extraText = extraWords.join(' ')
    if (extraText.trim().length) {
      extras.push({ afterIndex: clusters.length - 1, text: ' ' + extraText, type: 'extra' })
      errors.push({ type: 'extra', expected: '', actual: extraText, wordIndex: refWords.length })
    }
  }

  for (let k = 0; k < extraSpaces; k++) {
    errors.push({ type: 'space', expected: ' ', actual: '  ', wordIndex: -1 })
  }

  // word-order detection: a typed word that is wrong here but matches another reference word
  typedWords.forEach((w, wi) => {
    if (!w || wi >= refWords.length || w === refWords[wi]) return
    if (wi === lastTypedWord && !opts.final) return
    const elsewhere = refWords.findIndex((rw, ri) => ri !== wi && rw === w)
    if (elsewhere !== -1) errors.push({ type: 'wordOrder', expected: refWords[wi], actual: w, wordIndex: wi })
  })

  const counts = {
    correct: clusters.filter((c) => c.status === 'correct' && !c.isSpace).length,
    incorrect: clusters.filter((c) => c.status === 'incorrect').length,
    missing: clusters.filter((c) => c.status === 'missing').length,
    extra: extras.length,
    space: errors.filter((e) => e.type === 'space').length,
    total: clusters.filter((c) => !c.isSpace).length,
  }
  const errorCount = counts.incorrect + counts.missing + counts.extra + counts.space

  const isComplete = normalizeHindi(typedText).replace(/\s+$/, '') === ref
  const progress = counts.total ? counts.correct / counts.total : 0

  return {
    clusters,
    extras,
    errors,
    counts,
    errorCount,
    hasErrors: errorCount > 0,
    isComplete,
    progress,
  }
}

/** Human-readable (Hindi) labels for error types */
export const ERROR_LABELS = {
  character: 'गलत अक्षर',
  matra: 'गलत मात्रा',
  missing: 'छूटा अक्षर',
  extra: 'अतिरिक्त अक्षर',
  space: 'गलत रिक्त स्थान',
  wordOrder: 'गलत शब्द क्रम',
}

/**
 * Has the learner reached the end of the line? (checked when Space/Enter is pressed)
 *
 * The line does not have to be correct. The end is detected when
 *   1. the typed text equals the reference (exact), or
 *   2. as many words were typed as the reference has (wordCount), or
 *   3. as many aksharas were typed as the reference has (length), or
 *   4. the last typed word is the reference's last word and at least 70 % of the
 *      line was typed (lastWord) – the 70 % guard stops drills whose last word
 *      also appears earlier (e.g. "कहिकि यसारीर कहिकि यसारीर …") from ending early.
 * @returns {{ ended: boolean, reason?: 'exact'|'wordCount'|'length'|'lastWord' }}
 */
export function detectLineEnd(reference, typedText) {
  const ref = normalizeHindi(reference).trim()
  const typed = normalizeHindi(typedText).trim()
  if (!typed) return { ended: false }
  if (typed === ref) return { ended: true, reason: 'exact' }
  const refWords = ref.split(/\s+/)
  const typedWords = typed.split(/\s+/)
  if (typedWords.length >= refWords.length) return { ended: true, reason: 'wordCount' }
  // count aksharas word by word: joining the words first would merge separate
  // signs of key drills (क + ि → कि, श् + य → श्य) and end the line too early
  const aksharaCount = (words) => words.reduce((n, w) => n + segmentAksharas(w).length, 0)
  const refLen = aksharaCount(refWords)
  const typedLen = aksharaCount(typedWords)
  if (typedLen >= refLen) return { ended: true, reason: 'length' }
  if (typedWords[typedWords.length - 1] === refWords[refWords.length - 1] && typedLen >= 0.7 * refLen) {
    return { ended: true, reason: 'lastWord' }
  }
  return { ended: false }
}
