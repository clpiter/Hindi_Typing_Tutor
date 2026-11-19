import {
  VIRAMA,
  NUKTA,
  I_MATRA,
  isConsonant,
  isMatra,
  isModifier,
  isIndependentVowel,
  normalizeHindi,
  segmentAksharas,
} from './devanagari.js'
import {
  FULL_CONSONANT,
  HALF_CONSONANT,
  CONJUNCTS,
  CARET_RAKAR,
  MATRA,
  VOWEL,
  PUNCT,
} from './krutiMaps.js'

/**
 * Convert canonical Unicode Hindi into Kruti Dev 010 codes.
 *
 * mode:
 *   'typable' – only characters that can be typed on a US keyboard (used for
 *               hints, the "next key" highlight and the keystroke sequence)
 *   'display' – may use the font's ligature glyphs (द्द, ह्न, हृ, ऊ, ँ, ट्र …)
 *               for the nicest rendering of reference text.
 *
 * Kruti Dev specifics handled here:
 *   • ि is written BEFORE the whole consonant cluster   (स्थिति -> fLFkfr)
 *   • reph र् is written AFTER the syllable              (कर्म -> deZ)
 *   • rakar ्र is a mark after the consonant             (प्र -> iz)
 *   • consonants without a half glyph use halant ~       (द्+म -> n~e)
 *   • ख श ष ण थ ध घ भ क्ष are half glyph + ा             (श -> 'k)
 */
export function unicodeToKruti(text = '', { mode = 'display' } = {}) {
  const display = mode === 'display'
  const clusters = segmentAksharas(normalizeHindi(text))
  return clusters.map((c) => encodeCluster(c, display)).join('')
}

/** Encode each akshara separately – used to colour individual aksharas */
export function unicodeToKrutiClusters(text = '', { mode = 'display' } = {}) {
  const display = mode === 'display'
  return segmentAksharas(normalizeHindi(text)).map((u) => ({ u, k: encodeCluster(u, display) }))
}

function parseConsonantCluster(chars) {
  // returns { consonants:[{ch,nukta}], trailingHalant, matra, mods, extraNukta }
  const consonants = []
  let i = 0
  let trailingHalant = false
  while (i < chars.length && isConsonant(chars[i])) {
    const item = { ch: chars[i], nukta: false }
    i++
    if (chars[i] === NUKTA) {
      item.nukta = true
      i++
    }
    consonants.push(item)
    if (chars[i] === VIRAMA) {
      if (isConsonant(chars[i + 1])) {
        i++
        continue
      }
      trailingHalant = true
      i++
      break
    }
    break
  }
  let matra = ''
  let mods = ''
  for (; i < chars.length; i++) {
    const c = chars[i]
    if (isMatra(c) && !matra) matra = c
    else if (isModifier(c)) mods += c
    else if (c === NUKTA && consonants.length) consonants[consonants.length - 1].nukta = true
    else mods += c // anything unexpected is kept in order
  }
  return { consonants, trailingHalant, matra, mods }
}

function matchConjunct(consonants, k) {
  for (const cj of CONJUNCTS) {
    const parts = cj.u.split(VIRAMA)
    if (k + parts.length > consonants.length) continue
    let ok = true
    for (let p = 0; p < parts.length; p++) {
      if (consonants[k + p].ch !== parts[p] || consonants[k + p].nukta) {
        ok = false
        break
      }
    }
    if (ok) return { cj, len: parts.length }
  }
  return null
}

function fullOf(item) {
  const base = FULL_CONSONANT[item.ch] ?? item.ch
  return item.nukta ? base + MATRA[NUKTA] : base
}

function halfOf(item) {
  if (item.nukta) return fullOf(item) + MATRA[VIRAMA]
  if (HALF_CONSONANT[item.ch]) return HALF_CONSONANT[item.ch]
  return (FULL_CONSONANT[item.ch] ?? item.ch) + MATRA[VIRAMA]
}

function encodeConsonants(consonants, trailingHalant, display) {
  let out = ''
  let k = 0
  while (k < consonants.length) {
    const isLastGroupEnd = (len) => k + len === consonants.length
    // rakar: C + ् + र at the end of a conjunct
    const next = consonants[k + 1]
    const isRakar =
      next && next.ch === 'र' && !next.nukta && k + 2 === consonants.length && !trailingHalant

    const conj = matchConjunct(consonants, k)
    if (conj && !(isRakar && conj.len === 1)) {
      const { cj, len } = conj
      const atEnd = isLastGroupEnd(len)
      const rakarAfter =
        consonants[k + len] && consonants[k + len].ch === 'र' && k + len + 1 === consonants.length && !trailingHalant
      if (rakarAfter) {
        out += (display && cj.display ? cj.display : cj.full) + 'z'
        k += len + 1
        continue
      }
      if (atEnd) out += display && cj.display ? cj.display : cj.full
      else out += display && cj.display ? cj.display + '~' : cj.half
      k += len
      continue
    }

    const item = consonants[k]
    if (isRakar) {
      if (item.ch === 'श' && !item.nukta) out += 'J'
      else if (item.ch === 'त' && !item.nukta) out += '='
      else out += fullOf(item) + (display && CARET_RAKAR.has(item.ch) ? 'ª' : 'z')
      k += 2
      continue
    }
    if (k === consonants.length - 1) {
      out += fullOf(item)
      if (trailingHalant) out += MATRA[VIRAMA]
    } else {
      out += halfOf(item)
    }
    k++
  }
  return out
}

function encodeMarks(matra, mods, display) {
  let m = matra ? MATRA[matra] ?? matra : ''
  let tail = ''
  for (const c of mods) {
    if (c === 'ँ') tail += display ? '¡' : '¡'
    else tail += MATRA[c] ?? PUNCT[c] ?? c
  }
  return { m, tail }
}

function encodeCluster(cluster, display) {
  const chars = Array.from(cluster)
  const first = chars[0]

  if (isConsonant(first)) {
    const parsed = parseConsonantCluster(chars)
    let { consonants } = parsed
    let reph = false
    if (consonants.length > 1 && consonants[0].ch === 'र' && !consonants[0].nukta) {
      reph = true
      consonants = consonants.slice(1)
    }
    const iMatra = parsed.matra === I_MATRA
    const matra = iMatra ? '' : parsed.matra

    // रु / रू have dedicated keys
    if (consonants.length === 1 && consonants[0].ch === 'र' && !consonants[0].nukta && !parsed.trailingHalant) {
      if (matra === 'ु' || matra === 'ू') {
        const { tail } = encodeMarks('', parsed.mods, display)
        return (matra === 'ु' ? '#' : ':') + (reph ? 'Z' : '') + tail
      }
    }
    // हृ has a ligature glyph
    let consStr
    let m
    if (
      display &&
      consonants.length === 1 &&
      consonants[0].ch === 'ह' &&
      !consonants[0].nukta &&
      matra === 'ृ'
    ) {
      consStr = 'â'
      m = ''
    } else {
      consStr = encodeConsonants(consonants, parsed.trailingHalant, display)
      m = encodeMarks(matra, '', display).m
    }
    const { tail } = encodeMarks('', parsed.mods, display)
    return (iMatra ? 'f' : '') + consStr + m + (reph ? 'Z' : '') + tail
  }

  if (isIndependentVowel(first)) {
    let v = VOWEL[first] ?? first
    if (first === 'ऊ' && display) v = 'Å'
    const rest = chars.slice(1)
    const matra = rest.find((c) => isMatra(c)) || ''
    const mods = rest.filter((c) => !isMatra(c)).join('')
    const iMatra = matra === I_MATRA
    const { m, tail } = encodeMarks(iMatra ? '' : matra, mods, display)
    return (iMatra ? 'f' : '') + v + m + tail
  }

  if (isMatra(first) || isModifier(first)) {
    // standalone matra (keyboard drills such as "ि4ि")
    return chars.map((c) => MATRA[c] ?? c).join('')
  }

  // punctuation, digits, spaces – and a stray nukta / halant without a consonant
  return chars.map((c) => PUNCT[c] ?? MATRA[c] ?? c).join('')
}
