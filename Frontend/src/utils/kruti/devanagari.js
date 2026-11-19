/**
 * Devanagari character classes and an akshara (orthographic syllable) segmenter.
 *
 * Why not Intl.Segmenter / string indexes?
 *  - A single visible Hindi "letter" such as क्षि, र्म or स्त्र is made of several
 *    Unicode code points (consonants, virama, matras, nukta ...).
 *  - Intl.Segmenter grapheme rules for Indic conjuncts differ between ICU versions,
 *    which would make the typing engine behave differently in different browsers.
 *  This segmenter is deterministic everywhere and is used both for comparison and
 *  for the Unicode -> Kruti Dev conversion.
 */

export const VIRAMA = '्' // ्
export const NUKTA = '़' // ़
export const ZWJ = '‍'
export const ZWNJ = '‌'
export const I_MATRA = 'ि' // ि

const cp = (ch) => (ch ? ch.codePointAt(0) : -1)

export const isConsonant = (ch) => {
  const c = cp(ch)
  return (c >= 0x0915 && c <= 0x0939) || (c >= 0x0958 && c <= 0x095f)
}

/** Dependent vowel signs (matras) */
export const isMatra = (ch) => {
  const c = cp(ch)
  return (
    (c >= 0x093e && c <= 0x094c) ||
    c === 0x0962 ||
    c === 0x0963 ||
    c === 0x093a ||
    c === 0x093b ||
    c === 0x094e ||
    c === 0x094f ||
    (c >= 0x0955 && c <= 0x0957)
  )
}

/** Candrabindu, anusvara, visarga */
export const isModifier = (ch) => {
  const c = cp(ch)
  return c >= 0x0900 && c <= 0x0903
}

export const isIndependentVowel = (ch) => {
  const c = cp(ch)
  return (c >= 0x0904 && c <= 0x0914) || c === 0x0960 || c === 0x0961 || (c >= 0x0972 && c <= 0x0977)
}

export const isDevanagari = (ch) => {
  const c = cp(ch)
  return c >= 0x0900 && c <= 0x097f
}

/**
 * Normalise text for comparison:
 *  - NFC (this also decomposes nukta letters such as ज़ U+095B into ज + ़, because
 *    those code points are composition exclusions; both typed and reference text
 *    therefore end up in the same form)
 *  - remove ZWJ / ZWNJ (invisible joiners produced by some IMEs)
 *  - ASCII colon directly after a Devanagari letter -> visarga (ः)
 *  - ASCII pipe used as danda -> ।
 *  - normalise non-breaking spaces to normal spaces
 */
export function normalizeHindi(text = '') {
  let s = String(text).normalize('NFC')
  s = s.replace(/[\u200C\u200D]/g, '')
  s = s.replace(/\u00A0/g, ' ')
  s = s.replace(/([ऀ-ॿ]):/g, '$1ः')
  s = s.replace(/\|/g, '।')
  // NFC keeps precomposed ऩ ऱ ऴ; decompose them so they compare equal to the
  // base + nukta sequence produced by the Kruti Dev decoder.
  s = s.replace(/ऩ/g, 'ऩ').replace(/ऱ/g, 'ऱ').replace(/ऴ/g, 'ऴ')
  return s
}

/**
 * Split Devanagari text into aksharas.
 *  "क्षत्रिय सर्वत्र" -> ["क्ष","त्रि","य"," ","स","र्व","त्र"]
 *  A standalone matra (as used in the keyboard drills e.g. "ि4ि") is its own cluster.
 *  An independent vowel may carry one matra (drill text "अिि" -> ["अि","ि"]).
 */
export function segmentAksharas(input = '') {
  const chars = Array.from(input)
  const out = []
  let i = 0
  const n = chars.length
  const takeMarks = () => {
    // nukta may follow directly
    while (i < n && chars[i] === NUKTA) i++
    // at most one dependent vowel sign
    if (i < n && isMatra(chars[i])) i++
    // any number of modifiers (ं ँ ः) and stray nuktas
    while (i < n && (isModifier(chars[i]) || chars[i] === NUKTA)) i++
  }
  while (i < n) {
    const start = i
    const ch = chars[i]
    if (isConsonant(ch)) {
      i++
      if (chars[i] === NUKTA) i++
      // conjunct chain: C (्‍ C)*
      while (i < n && chars[i] === VIRAMA) {
        let j = i + 1
        while (j < n && (chars[j] === ZWJ || chars[j] === ZWNJ)) j++
        if (j < n && isConsonant(chars[j])) {
          i = j + 1
          if (chars[i] === NUKTA) i++
        } else {
          i = j // halant at end of syllable (e.g. महान्)
          break
        }
      }
      if (chars[i - 1] !== VIRAMA) takeMarks()
      else while (i < n && isModifier(chars[i])) i++
    } else if (isIndependentVowel(ch) || isMatra(ch)) {
      i++
      if (isIndependentVowel(ch)) takeMarks()
      else while (i < n && isModifier(chars[i])) i++
    } else if (isModifier(ch)) {
      i++
      while (i < n && isModifier(chars[i])) i++
    } else {
      i++
    }
    out.push(chars.slice(start, i).join(''))
  }
  return out
}

/** Consonant skeleton of a cluster (strip matras/modifiers) – used to classify matra errors */
export function clusterBase(cluster = '') {
  return Array.from(cluster)
    .filter((c) => !isMatra(c) && !isModifier(c))
    .join('')
}

export function clusterMatras(cluster = '') {
  return Array.from(cluster)
    .filter((c) => isMatra(c) || isModifier(c))
    .join('')
}
