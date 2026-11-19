import { unicodeToKruti, krutiToUnicode, LIGATURES } from './kruti/index.js'

/** Windows-1252 code for a Kruti Dev glyph code point (what Alt+0nnn types) */
const CP1252 = {
  '‚': 130, 'ƒ': 131, '„': 132, '…': 133, '†': 134, '‡': 135, 'ˆ': 136, '‰': 137, 'Š': 138, '‹': 139, 'Œ': 140,
  '‘': 145, '’': 146, '“': 147, '”': 148, '•': 149, '–': 150, '—': 151, '˜': 152, '™': 153, 'š': 154, '›': 155,
  'œ': 156, 'Ÿ': 159,
}
function cp1252(ch) {
  const c = ch.codePointAt(0)
  if (c >= 0xa0 && c <= 0xff) return c
  return CP1252[ch] ?? null
}

/** easier ways to get the glyph without an Alt code (app shortcuts / auto-ligatures) */
const EASY = { '¡': 'Alt + W' }
for (const [typed, glyph] of LIGATURES) {
  // "Vz" -> "Vª": the useful part is the rakar mark ª, typed with z after ट/ठ/ड/ढ/छ
  if (glyph.length === 2 && glyph[1] === 'ª') EASY['ª'] = 'z (ट, ठ, ड, ढ, छ के बाद)'
  else if (glyph.length === 1) EASY[glyph] = typed.split('').join(' ')
}

/**
 * Characters of a line that the Kruti Dev font draws from code points that a US
 * keyboard cannot type directly: they need Alt + numeric keypad code (Num Lock on),
 * or the easier sequence the app turns into the same glyph.
 * @returns {{ glyph, meaning, altCode, easy }[]}
 */
export function altCharactersFor(text) {
  const display = unicodeToKruti(text) // display encoding = what the font shows
  const seen = new Set()
  const out = []
  for (const ch of display) {
    const code = ch.codePointAt(0)
    if (code < 0x7f || seen.has(ch)) continue
    seen.add(ch)
    const n = cp1252(ch)
    out.push({
      glyph: ch,
      meaning: krutiToUnicode(ch),
      altCode: n ? `Alt + 0${n}` : '—',
      easy: EASY[ch] || '—',
    })
  }
  return out
}
