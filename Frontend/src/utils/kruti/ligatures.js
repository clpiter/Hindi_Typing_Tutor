/**
 * Input-layer ligatures for the Kruti Dev keyboard mode.
 *
 * Some Kruti Dev glyphs (ऊ, हृ, द्द, ट्ट, ह्न …) live on code points that cannot
 * be typed on a US keyboard without Alt-codes. When the learner types the
 * equivalent key sequence we replace it with the ligature glyph, so the text in
 * the input box looks exactly like the reference text. The replacement never
 * changes meaning: krutiToUnicode() decodes both forms to the same Unicode.
 */
export const LIGATURES = [
  ['mw', 'Å'], // उ + ू  -> ऊ
  ['g`', 'â'], // ह + ृ  -> हृ
  ['n~n', 'í'], // द्द
  ['V~V', 'ê'], // ट्ट
  ['V~B', 'ë'], // ट्ठ
  ['M~M', 'ì'], // ड्ड
  ['M~<', 'ï'], // ड्ढ
  ['g~u', 'à'], // ह्न
  ['g~;', 'á'], // ह्य
  ['g~e', 'ã'], // ह्म
  ['Vz', 'Vª'], // ट्र
  ['Bz', 'Bª'], // ठ्र
  ['Mz', 'Mª'], // ड्र
  ['<z', '<ª'], // ढ्र
  ['Nz', 'Nª'], // छ्र
]

export function applyLigatures(raw = '') {
  let s = raw
  for (const [from, to] of LIGATURES) s = s.split(from).join(to)
  return s
}

/** Reverse of applyLigatures – gives the key sequence that was typed */
export function removeLigatures(text = '') {
  let s = text
  for (const [from, to] of LIGATURES) s = s.split(to).join(from)
  return s
}

/**
 * Apply ligatures around a caret so the caret stays where the user expects.
 * Returns { value, caret }.
 */
export function applyLigaturesAtCaret(value, caret) {
  const before = applyLigatures(value.slice(0, caret))
  const after = applyLigatures(value.slice(caret))
  const joined = applyLigatures(before + after)
  // if a ligature spans the caret boundary the joined string differs; keep caret at end of "before"
  return { value: joined, caret: Math.min(before.length, joined.length) }
}
