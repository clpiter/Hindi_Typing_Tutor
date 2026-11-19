const isDev = (c) => {
  const n = c.codePointAt(0)
  return (n >= 0x0900 && n <= 0x097f) || n === 0x200c || n === 0x200d
}
// characters that take the script of their neighbours
const NEUTRAL = /[\s\d.,!?()'"‘’“”:;\-–—।॥]/

/**
 * Split text into Devanagari and non-Devanagari runs.
 * Devanagari runs are converted to Kruti Dev codes and shown with the Kruti font;
 * Latin text (key names such as "Shift + Z") keeps the normal UI font.
 */
export function splitRuns(text = '') {
  const runs = []
  let cur = null
  for (const ch of Array.from(String(text))) {
    let type = isDev(ch) ? 'dev' : NEUTRAL.test(ch) ? 'neutral' : 'latin'
    if (type === 'neutral') type = cur ? cur.type : 'neutral'
    if (cur && (cur.type === type || cur.type === 'neutral')) {
      cur.text += ch
      if (cur.type === 'neutral') cur.type = type
    } else {
      cur = { type, text: ch }
      runs.push(cur)
    }
  }
  return runs
}

