import { DECODE, DECODE_MAX_LEN } from './krutiMaps.js'
import { normalizeHindi, VIRAMA, NUKTA } from './devanagari.js'

/**
 * Tokenise a Kruti Dev string using longest-match on the DECODE table.
 * A "k" (ा) typed right after a half consonant completes that consonant
 * (D + k = क, ' + k = श) – exactly like on the Remington typewriter.
 */
export function tokenizeKruti(input = '') {
  const s = String(input)
  const tokens = []
  let i = 0
  while (i < s.length) {
    const prev = tokens[tokens.length - 1]
    if (s[i] === 'k' && prev && prev.type === 'half') {
      tokens.push({ type: 'complete', raw: 'k' })
      i++
      continue
    }
    let matched = null
    for (let len = Math.min(DECODE_MAX_LEN, s.length - i); len > 0; len--) {
      const chunk = s.substr(i, len)
      if (DECODE[chunk]) {
        matched = { ...DECODE[chunk], raw: chunk }
        break
      }
    }
    if (!matched) matched = { type: 'literal', u: s[i], raw: s[i] }
    tokens.push(matched)
    i += matched.raw.length
  }
  return tokens
}

/**
 * Convert a Kruti Dev 010 encoded string to Unicode Hindi (NFC-normalised).
 */
export function krutiToUnicode(input = '') {
  const tokens = tokenizeKruti(input)
  const items = [] // { kind:'syl'|'text', cons, vowel, i, matra, mods, reph, open }
  let cur = null // syllable currently receiving marks
  let pendingI = false

  const flushPendingI = () => {
    if (pendingI) {
      items.push({ kind: 'text', text: 'ि' })
      pendingI = false
    }
  }
  const newSyllable = (props) => {
    const s = { kind: 'syl', cons: '', vowel: '', i: false, matra: '', mods: '', reph: false, open: false, ...props }
    if (pendingI) {
      s.i = true
      pendingI = false
    }
    items.push(s)
    cur = s
    return s
  }

  for (const t of tokens) {
    switch (t.type) {
      case 'iMatra':
        if (pendingI) flushPendingI()
        pendingI = true
        break
      case 'half':
        if (cur && cur.open) cur.cons += t.u
        else newSyllable({ cons: t.u, open: true })
        break
      case 'complete':
        if (cur && cur.open && cur.cons.endsWith(VIRAMA)) {
          cur.cons = cur.cons.slice(0, -1)
          cur.open = false
        } else {
          attachMatra('ा')
        }
        break
      case 'cons':
        if (cur && cur.open && !cur.matra) {
          cur.cons += t.u
          cur.open = false
        } else {
          newSyllable({ cons: t.u })
        }
        if (t.matra) cur.matra += t.matra
        break
      case 'vowel':
        newSyllable({ vowel: t.u })
        break
      case 'virama':
        if (cur && cur.cons && !cur.matra && !cur.mods) {
          if (!cur.cons.endsWith(VIRAMA)) cur.cons += VIRAMA
          cur.open = true
        } else {
          closeCurrent()
          items.push({ kind: 'text', text: VIRAMA })
        }
        break
      case 'nukta':
        if (cur && cur.cons) {
          // nukta belongs directly after the last consonant (before a trailing virama)
          if (cur.cons.endsWith(VIRAMA)) cur.cons = cur.cons.slice(0, -1) + NUKTA + VIRAMA
          else cur.cons += NUKTA
        } else {
          closeCurrent()
          items.push({ kind: 'text', text: NUKTA })
        }
        break
      case 'rakar':
        if (cur && cur.cons) {
          if (cur.cons.endsWith(VIRAMA)) cur.cons = cur.cons.slice(0, -1)
          cur.cons += '्र'
          cur.open = false
        } else {
          closeCurrent()
          items.push({ kind: 'text', text: '्र' })
        }
        break
      case 'postYa':
        if (cur && cur.cons) {
          cur.cons = (cur.cons.endsWith(VIRAMA) ? cur.cons.slice(0, -1) : cur.cons) + '्य'
          cur.open = false
        } else items.push({ kind: 'text', text: '्य' })
        break
      case 'reph':
        if (cur && cur.cons) cur.reph = true
        else {
          closeCurrent()
          items.push({ kind: 'text', text: 'र्' })
        }
        break
      case 'matra':
        attachMatra(t.u)
        if (t.mod) attachMod(t.mod)
        break
      case 'mod':
        attachMod(t.u)
        break
      default:
        // punctuation, digits, spaces, unknown characters
        closeCurrent()
        flushPendingI()
        items.push({ kind: 'text', text: t.u })
    }
  }
  flushPendingI()

  function closeCurrent() {
    cur = null
  }
  function attachMatra(m) {
    if (cur) {
      // ा followed by ॅ (k W typed in two steps) is ॉ
      if (m === 'ॅ' && cur.matra.endsWith('ा')) {
        cur.matra = cur.matra.slice(0, -1) + 'ॉ'
        return
      }
      if (cur.open && cur.cons.endsWith(VIRAMA) && m === 'ा') {
        cur.cons = cur.cons.slice(0, -1)
        cur.open = false
        return
      }
      cur.matra += m
      cur.open = false
    } else {
      flushPendingI()
      items.push({ kind: 'text', text: m })
    }
  }
  function attachMod(m) {
    if (cur) cur.mods += m
    else {
      flushPendingI()
      items.push({ kind: 'text', text: m })
    }
  }

  const out = items
    .map((it) => {
      if (it.kind === 'text') return it.text
      const base = it.vowel || it.cons
      return (it.reph ? 'र्' : '') + base + (it.i ? 'ि' : '') + it.matra + it.mods
    })
    .join('')
  return normalizeHindi(out)
}
