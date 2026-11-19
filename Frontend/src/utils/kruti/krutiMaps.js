/**
 * Kruti Dev 010 (KRDV010.TTF) glyph tables.
 *
 * Kruti Dev is a *legacy* font: it re-draws Latin/Windows-1252 code points as
 * Hindi glyphs. Typing "d" with the font shows क, "D" shows क्, "k" shows ा …
 * The tables below were verified by rendering every code point of the supplied
 * KRDV010.TTF (see README → "Kruti Dev encoding layer").
 *
 * The keyboard positions are the Remington (typewriter) layout used in the
 * exercises of the PDF.
 */

/** Full consonants that have a single key. */
export const FULL_CONSONANT = {
  'क': 'd',
  'ख': '[k',
  'ग': 'x',
  'घ': '?k',
  'ङ': '³',
  'च': 'p',
  'छ': 'N',
  'ज': 't',
  'झ': '>',
  'ञ': '¥',
  'ट': 'V',
  'ठ': 'B',
  'ड': 'M',
  'ढ': '<',
  'ण': '.k',
  'त': 'r',
  'थ': 'Fk',
  'द': 'n',
  'ध': '/k',
  'न': 'u',
  'प': 'i',
  'फ': 'Q',
  'ब': 'c',
  'भ': 'Hk',
  'म': 'e',
  'य': ';',
  'र': 'j',
  'ल': 'y',
  'ळ': 'G',
  'व': 'o',
  'श': "'k",
  'ष': '"k',
  'स': 'l',
  'ह': 'g',
}

/** Half forms that have their own key (usually Shift + the consonant key). */
export const HALF_CONSONANT = {
  'क': 'D',
  'ख': '[',
  'ग': 'X',
  'घ': '?',
  'च': 'P',
  'ज': 'T',
  'झ': '÷',
  'ण': '.',
  'त': 'R',
  'थ': 'F',
  'ध': '/',
  'न': 'U',
  'प': 'I',
  'ब': 'C',
  'भ': 'H',
  'म': 'E',
  'ल': 'Y',
  'व': 'O',
  'श': "'",
  'ष': '"',
  'स': 'L',
}

/**
 * Conjuncts that are a single key / glyph on the Remington layout.
 * `full` is used when the conjunct is the last consonant of a syllable,
 * `half` when another consonant follows.
 * `display` entries are nicer ligature glyphs from the font that cannot be typed
 * directly on a US keyboard; the input layer turns the typable sequence into the
 * ligature automatically (see ligatures.js), so what the learner sees while
 * typing matches the reference.
 */
export const CONJUNCTS = [
  { u: 'क्ष', full: '{k', half: '{' },
  { u: 'त्र', full: '=', half: '=~' },
  { u: 'ज्ञ', full: 'K', half: 'K~' },
  { u: 'श्र', full: 'J', half: 'J~' },
  { u: 'द्ध', full: ')', half: ')~' },
  { u: 'द्य', full: '|', half: '|~' },
  { u: 'द्व', full: '}', half: '}~' },
  { u: 'द्द', full: 'n~n', half: 'n~n~', display: 'í' },
  { u: 'ट्ट', full: 'V~V', half: 'V~V~', display: 'ê' },
  { u: 'ट्ठ', full: 'V~B', half: 'V~B~', display: 'ë' },
  { u: 'ड्ड', full: 'M~M', half: 'M~M~', display: 'ì' },
  { u: 'ड्ढ', full: 'M~<', half: 'M~<~', display: 'ï' },
  { u: 'ह्न', full: 'g~u', half: 'g~u~', display: 'à' },
  { u: 'ह्य', full: 'g~;', half: 'g~;~', display: 'á' },
  { u: 'ह्म', full: 'g~e', half: 'g~e~', display: 'ã' },
]

/** Consonants whose rakar (्र) uses the special ª glyph in display mode. */
export const CARET_RAKAR = new Set(['ट', 'ठ', 'ड', 'ढ', 'छ'])

/** Dependent vowel signs and other marks */
export const MATRA = {
  'ा': 'k',
  'ि': 'f',
  'ी': 'h',
  'ु': 'q',
  'ू': 'w',
  'ृ': '`',
  'े': 's',
  'ै': 'S',
  'ो': 'ks',
  'ौ': 'kS',
  'ॉ': 'kW',
  'ॅ': 'W',
  'ं': 'a',
  'ँ': '¡',
  'ः': '%',
  '़': '+',
  '्': '~',
}

/** Independent vowels. ऊ has a dedicated glyph (Å); typists may also type उ + ू (m w). */
export const VOWEL = {
  'अ': 'v',
  'आ': 'vk',
  'इ': 'b',
  'ई': 'bZ',
  'उ': 'm',
  'ऊ': 'mw',
  'ऋ': '_',
  'ए': ',',
  'ऐ': ',s',
  'ओ': 'vks',
  'औ': 'vkS',
  'ऑ': 'vkW',
  'ऍ': 'vW',
}

/** Unicode punctuation / symbols -> Kruti Dev code */
export const PUNCT = {
  '।': 'A',
  '॥': 'AA',
  ',': ']',
  '-': '&',
  '?': '\\',
  ';': '(',
  '.': '-',
  '/': '@',
  '+': '$',
  '(': '¼',
  ')': '½',
  '‘': '^',
  '’': '*',
  "'": '*',
  '“': 'ß',
  '”': 'Þ',
  '"': 'Þ',
  // Windows-1252 punctuation is re-drawn as Hindi glyphs by the font
  // (— is कृ, – is दृ, … is ३), so map it to the font's own symbols
  '—': '&',
  '–': '&',
  '…': '---',
  ':': '%',
  'ऽ': '·',
  '॰': 'ñ',
  '०': 'å',
  '१': 'ƒ',
  '२': '„',
  '३': '…',
  '४': '†',
  '५': '‡',
  '६': 'ˆ',
  '७': '‰',
  '८': 'Š',
  '९': '‹',
}

/* --------------------------------------------------------------------------
 * Decoder tables (Kruti Dev -> Unicode). Longest sequences are matched first.
 * type: cons | half | vowel | matra | mod | reph | rakar | virama | nukta | iMatra | postYa | punct
 * ------------------------------------------------------------------------ */
const T = (type, u, extra = {}) => ({ type, u, ...extra })

export const DECODE = {
  // independent vowels (multi-key sequences first)
  vkW: T('vowel', 'ऑ'),
  vks: T('vowel', 'ओ'),
  vkS: T('vowel', 'औ'),
  vk: T('vowel', 'आ'),
  vW: T('vowel', 'ऍ'),
  v: T('vowel', 'अ'),
  bZ: T('vowel', 'ई'),
  'Ã': T('vowel', 'ई'),
  b: T('vowel', 'इ'),
  mw: T('vowel', 'ऊ'),
  'Å': T('vowel', 'ऊ'),
  m: T('vowel', 'उ'),
  ',s': T('vowel', 'ऐ'),
  ',': T('vowel', 'ए'),
  _: T('vowel', 'ऋ'),

  // full consonants
  d: T('cons', 'क'),
  x: T('cons', 'ग'),
  'Ä': T('cons', 'घ'),
  '³': T('cons', 'ङ'),
  p: T('cons', 'च'),
  N: T('cons', 'छ'),
  t: T('cons', 'ज'),
  '>': T('cons', 'झ'),
  '¥': T('cons', 'ञ'),
  '´': T('cons', 'ञ'),
  V: T('cons', 'ट'),
  B: T('cons', 'ठ'),
  M: T('cons', 'ड'),
  '<': T('cons', 'ढ'),
  r: T('cons', 'त'),
  n: T('cons', 'द'),
  u: T('cons', 'न'),
  i: T('cons', 'प'),
  Q: T('cons', 'फ'),
  c: T('cons', 'ब'),
  'Ò': T('cons', 'भ'),
  e: T('cons', 'म'),
  ';': T('cons', 'य'),
  j: T('cons', 'र'),
  y: T('cons', 'ल'),
  G: T('cons', 'ळ'),
  o: T('cons', 'व'),
  'Ü': T('cons', 'श'),
  l: T('cons', 'स'),
  g: T('cons', 'ह'),
  // conjunct glyphs
  '=': T('cons', 'त्र'),
  K: T('cons', 'ज्ञ'),
  J: T('cons', 'श्र'),
  ')': T('cons', 'द्ध'),
  '|': T('cons', 'द्य'),
  '}': T('cons', 'द्व'),
  'ô': T('cons', 'क्क'),
  'ä': T('cons', 'क्त'),
  'é': T('cons', 'न्न'),
  'à': T('cons', 'ह्न'),
  'á': T('cons', 'ह्य'),
  'ã': T('cons', 'ह्म'),
  'í': T('cons', 'द्द'),
  'Ì': T('cons', 'द्द'),
  'ê': T('cons', 'ट्ट'),
  'Í': T('cons', 'ट्ट'),
  'ë': T('cons', 'ट्ठ'),
  'Î': T('cons', 'ट्ठ'),
  'ì': T('cons', 'ड्ड'),
  'Ï': T('cons', 'ड्ड'),
  'ï': T('cons', 'ड्ढ'),
  'Ô': T('cons', 'ड्ढ'),
  'Ø': T('cons', 'क्र'),
  'æ': T('cons', 'द्र'),
  'ç': T('cons', 'प्र'),
  'Á': T('cons', 'प्र'),
  'Ý': T('cons', 'फ्र'),
  'î': T('cons', 'छ्य'),
  // consonant + matra glyphs
  '#': T('cons', 'र', { matra: 'ु' }),
  ':': T('cons', 'र', { matra: 'ू' }),
  'Ñ': T('cons', 'क', { matra: 'ृ' }),
  '—': T('cons', 'क', { matra: 'ृ' }),
  '–': T('cons', 'द', { matra: 'ृ' }),
  'â': T('cons', 'ह', { matra: 'ृ' }),

  // half consonants
  D: T('half', 'क्'),
  '[': T('half', 'ख्'),
  X: T('half', 'ग्'),
  '?': T('half', 'घ्'),
  P: T('half', 'च्'),
  T: T('half', 'ज्'),
  '÷': T('half', 'झ्'),
  'Ö': T('half', 'झ्'),
  '.': T('half', 'ण्'),
  R: T('half', 'त्'),
  F: T('half', 'थ्'),
  '/': T('half', 'ध्'),
  'Ë': T('half', 'ध्'),
  U: T('half', 'न्'),
  I: T('half', 'प्'),
  '¶': T('half', 'फ्'),
  C: T('half', 'ब्'),
  H: T('half', 'भ्'),
  E: T('half', 'म्'),
  '¸': T('half', 'य्'),
  Y: T('half', 'ल्'),
  O: T('half', 'व्'),
  "'": T('half', 'श्'),
  '"': T('half', 'ष्'),
  L: T('half', 'स्'),
  '{': T('half', 'क्ष्'),
  '«': T('half', 'त्र्'),
  'º': T('half', 'ह्'),
  'Ù': T('half', 'त्त्'),

  // matras
  ks: T('matra', 'ो'),
  kS: T('matra', 'ौ'),
  kW: T('matra', 'ॉ'),
  '‚': T('matra', 'ॉ'),
  k: T('matra', 'ा'),
  h: T('matra', 'ी'),
  q: T('matra', 'ु'),
  w: T('matra', 'ू'),
  '`': T('matra', 'ृ'),
  s: T('matra', 'े'),
  S: T('matra', 'ै'),
  W: T('matra', 'ॅ'),
  'È': T('matra', 'ी', { mod: 'ं' }),
  f: T('iMatra', 'ि'),

  // modifiers
  a: T('mod', 'ं'),
  '¡': T('mod', 'ँ'),
  '%': T('mod', 'ः'),

  Z: T('reph', 'र्'),
  z: T('rakar', '्र'),
  'ª': T('rakar', '्र'),
  '~': T('virama', '्'),
  '+': T('nukta', '़'),
  'Ó': T('postYa', '्य'),

  // punctuation
  A: T('punct', '।'),
  ']': T('punct', ','),
  '&': T('punct', '-'),
  '\\': T('punct', '?'),
  '(': T('punct', ';'),
  '-': T('punct', '.'),
  '@': T('punct', '/'),
  $: T('punct', '+'),
  '^': T('punct', '‘'),
  '*': T('punct', '’'),
  'ß': T('punct', '“'),
  'Þ': T('punct', '”'),
  '¼': T('punct', '('),
  '½': T('punct', ')'),
  '·': T('punct', 'ऽ'),
  'ñ': T('punct', '॰'),
  'Û': T('punct', '•'),
  'å': T('punct', '०'),
  'ƒ': T('punct', '१'),
  '„': T('punct', '२'),
  '…': T('punct', '३'),
  '†': T('punct', '४'),
  '‡': T('punct', '५'),
  'ˆ': T('punct', '६'),
  '‰': T('punct', '७'),
  'Š': T('punct', '८'),
  '‹': T('punct', '९'),
}

export const DECODE_MAX_LEN = Math.max(...Object.keys(DECODE).map((k) => k.length))
