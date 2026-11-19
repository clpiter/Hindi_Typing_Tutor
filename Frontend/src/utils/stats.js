/**
 * Client-side copy of the speed formulas (the server recomputes and stores them).
 *   Gross WPM = (characters typed / 5) / minutes
 *   Net WPM   = max(0, Gross WPM − incorrect characters / minutes)
 *   Accuracy  = correct / typed × 100
 * Characters are key depressions in Kruti Dev mode (Unicode code points in IME mode).
 */
export function computeStats({ totalCharacters = 0, incorrectCharacters = 0, timeMs = 0 }) {
  const total = Math.max(0, totalCharacters)
  const incorrect = Math.min(Math.max(0, incorrectCharacters), total)
  const minutes = Math.max(timeMs, 500) / 60000
  const grossWPM = total / 5 / minutes
  const netWPM = Math.max(0, grossWPM - incorrect / minutes)
  const accuracy = total ? ((total - incorrect) / total) * 100 : 100
  return {
    totalCharacters: total,
    correctCharacters: total - incorrect,
    incorrectCharacters: incorrect,
    grossWPM: Math.round(grossWPM * 10) / 10,
    netWPM: Math.round(netWPM * 10) / 10,
    accuracy: Math.round(accuracy * 10) / 10,
  }
}

/** Idle gaps longer than this are not counted as typing time */
export const IDLE_CAP_MS = 10000

export function formatDuration(seconds = 0) {
  const s = Math.round(seconds)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ${s % 60}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

export function formatDate(d, opts = { dateStyle: 'medium', timeStyle: 'short' }) {
  if (!d) return '—'
  try {
    return new Intl.DateTimeFormat('en-IN', opts).format(new Date(d))
  } catch {
    return String(d)
  }
}
