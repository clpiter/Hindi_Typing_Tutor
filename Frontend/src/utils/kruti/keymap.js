/**
 * Physical keyboard model for the Remington / Kruti Dev layout on a US keyboard.
 *
 * Each key has the ASCII character produced without and with Shift. Rendering that
 * ASCII character with the Kruti Dev font shows the Hindi glyph, so the virtual
 * keyboard labels are guaranteed to match the font.
 *
 * Finger numbers follow the finger charts on pages 73–76 of the PDF:
 *   1 = little finger (कनिष्ठा), 2 = ring (अनामिका), 3 = middle (मध्यमा), 4 = index (तर्जनी)
 */

export const FINGER_NAMES = {
  1: { hi: 'कनिष्ठा (छोटी उंगली)', en: 'Little finger' },
  2: { hi: 'अनामिका', en: 'Ring finger' },
  3: { hi: 'मध्यमा', en: 'Middle finger' },
  4: { hi: 'तर्जनी', en: 'Index finger' },
  5: { hi: 'अंगूठा', en: 'Thumb' },
}

export const HAND_NAMES = {
  L: { hi: 'बायाँ हाथ', en: 'Left hand' },
  R: { hi: 'दायाँ हाथ', en: 'Right hand' },
}

export const ROW_NAMES = {
  number: { hi: 'नीचे से चौथी पंक्ति (अंक पंक्ति)', en: 'Number row (4th from bottom)' },
  top: { hi: 'नीचे से तीसरी पंक्ति', en: 'Top letter row (3rd from bottom)' },
  home: { hi: 'होम कीज़ (नीचे से दूसरी पंक्ति)', en: 'Home row (2nd from bottom)' },
  bottom: { hi: 'नीचे से पहली पंक्ति', en: 'Bottom row (1st from bottom)' },
  space: { hi: 'स्पेस बार', en: 'Space bar' },
}

// [code, label, normal, shifted, hand, finger]
const K = (code, label, normal, shifted, hand, finger) => ({ code, label, normal, shifted, hand, finger })

export const KEYBOARD_ROWS = [
  {
    row: 'number',
    keys: [
      K('Backquote', '`', '`', '~', 'L', 1),
      K('Digit1', '1', '1', '!', 'L', 1),
      K('Digit2', '2', '2', '@', 'L', 2),
      K('Digit3', '3', '3', '#', 'L', 3),
      K('Digit4', '4', '4', '$', 'L', 4),
      K('Digit5', '5', '5', '%', 'L', 4),
      K('Digit6', '6', '6', '^', 'R', 4),
      K('Digit7', '7', '7', '&', 'R', 4),
      K('Digit8', '8', '8', '*', 'R', 3),
      K('Digit9', '9', '9', '(', 'R', 2),
      K('Digit0', '0', '0', ')', 'R', 1),
      K('Minus', '-', '-', '_', 'R', 1),
      K('Equal', '=', '=', '+', 'R', 1),
    ],
  },
  {
    row: 'top',
    keys: [
      K('KeyQ', 'Q', 'q', 'Q', 'L', 1),
      K('KeyW', 'W', 'w', 'W', 'L', 2),
      K('KeyE', 'E', 'e', 'E', 'L', 3),
      K('KeyR', 'R', 'r', 'R', 'L', 4),
      K('KeyT', 'T', 't', 'T', 'L', 4),
      K('KeyY', 'Y', 'y', 'Y', 'R', 4),
      K('KeyU', 'U', 'u', 'U', 'R', 4),
      K('KeyI', 'I', 'i', 'I', 'R', 3),
      K('KeyO', 'O', 'o', 'O', 'R', 2),
      K('KeyP', 'P', 'p', 'P', 'R', 1),
      K('BracketLeft', '[', '[', '{', 'R', 1),
      K('BracketRight', ']', ']', '}', 'R', 1),
      K('Backslash', '\\', '\\', '|', 'R', 1),
    ],
  },
  {
    row: 'home',
    keys: [
      K('KeyA', 'A', 'a', 'A', 'L', 1),
      K('KeyS', 'S', 's', 'S', 'L', 2),
      K('KeyD', 'D', 'd', 'D', 'L', 3),
      K('KeyF', 'F', 'f', 'F', 'L', 4),
      K('KeyG', 'G', 'g', 'G', 'L', 4),
      K('KeyH', 'H', 'h', 'H', 'R', 4),
      K('KeyJ', 'J', 'j', 'J', 'R', 4),
      K('KeyK', 'K', 'k', 'K', 'R', 3),
      K('KeyL', 'L', 'l', 'L', 'R', 2),
      K('Semicolon', ';', ';', ':', 'R', 1),
      K('Quote', "'", "'", '"', 'R', 1),
    ],
  },
  {
    row: 'bottom',
    keys: [
      K('KeyZ', 'Z', 'z', 'Z', 'L', 2),
      K('KeyX', 'X', 'x', 'X', 'L', 3),
      K('KeyC', 'C', 'c', 'C', 'L', 4),
      K('KeyV', 'V', 'v', 'V', 'L', 4),
      K('KeyB', 'B', 'b', 'B', 'R', 4),
      K('KeyN', 'N', 'n', 'N', 'R', 4),
      K('KeyM', 'M', 'm', 'M', 'R', 3),
      K('Comma', ',', ',', '<', 'R', 2),
      K('Period', '.', '.', '>', 'R', 1),
      K('Slash', '/', '/', '?', 'R', 1),
    ],
  },
]

/** char -> { key, shift, alt } for every character that can be typed */
export const CHAR_TO_KEY = (() => {
  const map = {}
  for (const r of KEYBOARD_ROWS) {
    for (const key of r.keys) {
      map[key.normal] = { key, row: r.row, shift: false }
      map[key.shifted] = { key, row: r.row, shift: true }
    }
  }
  map[' '] = { key: { code: 'Space', label: 'Space', hand: 'R', finger: 5 }, row: 'space', shift: false }
  // Chandrabindu (ँ) has no key on a US keyboard: Alt+W in this app (or Alt+0161 on Windows)
  const w = KEYBOARD_ROWS[1].keys[1]
  map['¡'] = { key: w, row: 'top', shift: false, alt: true }
  return map
})()

/** Describe how to type one Kruti Dev character */
export function describeKey(ch) {
  const info = CHAR_TO_KEY[ch]
  if (!info) return null
  const { key, shift, alt, row } = info
  const shiftKey = shift ? (key.hand === 'L' ? 'ShiftRight' : 'ShiftLeft') : null
  return {
    char: ch,
    code: key.code,
    label: key.label,
    row,
    hand: key.hand,
    finger: key.finger,
    shift,
    alt: !!alt,
    shiftKey,
    combo: `${alt ? 'Alt + ' : ''}${shift ? 'Shift + ' : ''}${key.label}`,
  }
}

/** Unique keys needed for a Kruti Dev key sequence */
export function keysForSequence(seq = '') {
  const seen = new Map()
  for (const ch of seq) {
    const d = describeKey(ch)
    if (d && !seen.has(d.combo)) seen.set(d.combo, d)
  }
  return [...seen.values()]
}
