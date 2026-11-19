/**
 * Typing speed & accuracy formulas (documented in README → "Speed calculation").
 *
 * Hindi typing tests (Kruti Dev / Remington, e.g. government skill tests) count
 * key depressions: 1 "word" = 5 key depressions, including spaces.
 *
 *   Gross WPM = (total characters typed / 5) / minutes
 *   Net WPM   = max(0, Gross WPM − incorrect characters / minutes)
 *   Accuracy  = correct characters / total characters typed × 100
 *
 * "total characters typed" counts every inserted character, including the ones
 * later corrected with Backspace; "incorrect characters" are the keystrokes that
 * introduced an error. Every line must be fully corrected before it completes,
 * so the penalty in Net WPM is for mistakes made, not for uncorrected text.
 * Time counts only active typing (idle gaps > 10 s are excluded on the client).
 */
const round = (n, d = 2) => Math.round((Number(n) || 0) * 10 ** d) / 10 ** d

function computeStats({ totalCharacters = 0, incorrectCharacters = 0, timeTaken = 0 }) {
  const total = Math.max(0, totalCharacters)
  const incorrect = Math.min(Math.max(0, incorrectCharacters), total)
  const correct = total - incorrect
  const minutes = Math.max(timeTaken, 0.5) / 60
  const grossWPM = total / 5 / minutes
  const netWPM = Math.max(0, grossWPM - incorrect / minutes)
  const accuracy = total ? (correct / total) * 100 : 0
  return {
    totalCharacters: total,
    correctCharacters: correct,
    incorrectCharacters: incorrect,
    grossWPM: round(grossWPM),
    netWPM: round(netWPM),
    accuracy: round(accuracy),
  }
}

/** Aggregate line results into totals for a whole attempt */
function aggregate(lineResults = []) {
  const sum = (k) => lineResults.reduce((a, r) => a + (Number(r[k]) || 0), 0)
  const totalCharacters = sum('totalCharacters')
  const incorrectCharacters = sum('incorrectCharacters')
  const timeTaken = round(sum('timeTaken'), 1)
  const stats = computeStats({ totalCharacters, incorrectCharacters, timeTaken })
  return { ...stats, timeTaken, mistakes: sum('mistakes') }
}

module.exports = { computeStats, aggregate, round }
