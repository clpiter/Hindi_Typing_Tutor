import { memo, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import { Button, Badge } from 'react-bootstrap'
import { FaLightbulb, FaCheckCircle, FaArrowDown } from 'react-icons/fa'
import MistakeHighlighter from './MistakeHighlighter.jsx'
import TypingInput from './TypingInput.jsx'
import {
  compareLine,
  detectLineEnd,
  typedToUnicode,
  unicodeToKruti,
  ERROR_LABELS,
  nextExpectedKey,
  typedHighlights,
} from '../utils/kruti/index.js'
import { computeStats, IDLE_CAP_MS } from '../utils/stats.js'

const PLACEHOLDER_KRUTI = unicodeToKruti('यहाँ टाइप करें…')
const CHEER_MS = 1800
/** after this many perfect repetitions in a row the cursor moves to the next line */
export const STREAK_TO_ADVANCE = 5

const countByType = (errors) =>
  errors.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1
    return acc
  }, {})

const newCounters = (draft) => ({
  total: draft?.total || 0,
  incorrect: draft?.incorrect || 0,
  mistakes: draft?.mistakes || 0,
  timeMs: draft?.timeMs || 0,
  errorTypes: { ...(draft?.errorTypes || {}) },
  lastTs: 0,
  prevErrorCount: 0,
  prevErrorTypes: {},
  prevLength: Array.from(draft?.raw || '').length,
})

/**
 * One exercise line: the reference text and its own input box below it.
 *
 * Finishing a line (a "repetition"):
 *  - Space after the last word: the end of the line is detected from the word count,
 *    the length, or the last word (see detectLineEnd) – the line does NOT have to be
 *    correct. Mistakes that were not corrected stay red and are counted.
 *  - Enter: always finishes what has been typed (the untyped rest counts as missed).
 *    On an empty new line, Enter moves to the next exercise line's box.
 * The cursor then continues on a NEW LINE INSIDE THE SAME BOX (the learner may type
 * the line again). Finished repetitions are locked.
 *
 * A perfectly typed line plays a "✓ शाबाश!" animation on the line; a line finished
 * with mistakes shows a short amber notice.
 *
 * Accuracy bookkeeping per repetition: every inserted key counts as typed; a key that
 * increases the number of errors counts as incorrect; reference aksharas that were
 * never typed (skipped) count as typed-and-incorrect when the line is finished;
 * time is active typing time (idle gaps > 10 s capped).
 */
function LineTypingBox({
  line,
  mode,
  completed,
  result,
  active,
  initialDraft,
  onComplete,
  onDraft,
  onHint,
  onNextKey,
  onCapsLock,
  onFocusLine,
  onGoNext,
  onAutoNext,
  hasNext,
  ref,
}) {
  const reference = line.referenceText
  const ln = line.lineNumber

  const [raw, setRaw] = useState(() => initialDraft?.raw || '')
  // finished repetitions: { text, segs, comparison, perfect, errors }
  const [attempts, setAttempts] = useState([])
  const [live, setLive] = useState(() => ({ total: initialDraft?.total || 0, mistakes: initialDraft?.mistakes || 0 }))
  const [cheer, setCheer] = useState(null) // { id, perfect, errors }
  const [streak, setStreak] = useState(0) // perfect repetitions in a row
  const streakRef = useRef(0)
  const counters = useRef(newCounters(initialDraft))
  const composingRef = useRef(false)
  const finishedRef = useRef(0) // repetitions already reported (guards duplicate events)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!cheer) return undefined
    const t = setTimeout(() => setCheer(null), CHEER_MS)
    return () => clearTimeout(t)
  }, [cheer])

  const prefix = useMemo(() => attempts.map((a) => a.text + '\n').join(''), [attempts])
  const value = prefix + raw

  const typedU = useMemo(() => typedToUnicode(raw, mode), [raw, mode])
  const comparison = useMemo(() => compareLine(reference, typedU), [reference, typedU])
  const lineEnd = useMemo(() => detectLineEnd(reference, typedU), [reference, typedU])
  const doneComparison = useMemo(() => compareLine(reference, reference), [reference])
  const lastAttempt = attempts[attempts.length - 1]
  const isDone = completed || attempts.length > 0

  // reference colours: the repetition being typed, else the last finished one
  let shownComparison = comparison
  let refTheme = ''
  if (!raw && lastAttempt) {
    shownComparison = lastAttempt.comparison
    refTheme = lastAttempt.perfect ? 'is-complete-ref' : ''
  } else if (!raw && completed) {
    shownComparison = doneComparison
    refTheme = 'is-complete-ref'
  }

  const highlights = useMemo(() => {
    const segs = []
    attempts.forEach((a, i) => {
      const fresh = cheer && i === attempts.length - 1 ? ' fresh' : ''
      for (const s of a.segs) segs.push({ text: s.text, status: s.status + fresh })
      segs.push({ text: '\n', status: 'done' })
    })
    return [...segs, ...typedHighlights(raw, mode, comparison)]
  }, [attempts, cheer, raw, mode, comparison])

  const reportNextKey = useCallback(
    (v) => onNextKey?.(ln, mode === 'kruti' ? nextExpectedKey(reference, v) : null),
    [onNextKey, ln, mode, reference],
  )

  /** finish the repetition if the end of the line is reached (or Enter forces it) */
  const tryFinish = useCallback(
    (v, viaEnter = false) => {
      if (composingRef.current) return false
      if (!viaEnter && !/\s$/.test(v)) return false
      const text = v.replace(/\s+$/, '')
      if (!text) return false
      const typed = typedToUnicode(text, mode)
      if (!viaEnter && !detectLineEnd(reference, typed).ended) return false
      if (finishedRef.current > attempts.length) return false
      finishedRef.current = attempts.length + 1

      const finalCmp = compareLine(reference, typed, { final: true })
      // reference aksharas never reached (the untyped rest of the line). Skipped
      // aksharas inside the typed part ("missing") are already in finalCmp.errorCount
      // and were counted as incorrect when the learner moved past them.
      const omitted = finalCmp.clusters.filter((x) => !x.isSpace && x.status === 'pending').length
      const c = counters.current
      const total = c.total + omitted
      const incorrect = Math.min(total, c.incorrect + omitted)
      const timeMs = Math.max(c.timeMs, 1000)
      const stats = computeStats({ totalCharacters: total, incorrectCharacters: incorrect, timeMs })
      const perfect = incorrect === 0 && finalCmp.errorCount === 0 && omitted === 0
      const errorTypes = { ...c.errorTypes }
      if (omitted) errorTypes.missing = (errorTypes.missing || 0) + omitted
      const remainingErrors = finalCmp.errorCount + omitted

      const segs = typedHighlights(text, mode, finalCmp).map((s) => ({ text: s.text, status: s.status === 'error' ? 'done-error' : 'done' }))
      setAttempts((a) => [...a, { text, segs, comparison: finalCmp, perfect, errors: remainingErrors }])
      setRaw('')
      counters.current = newCounters(null)
      setLive({ total: 0, mistakes: 0 })
      setCheer({ id: Date.now(), perfect, errors: finalCmp.errorCount, omitted })
      // 5 perfect repetitions in a row → move on to the next line automatically
      streakRef.current = perfect ? streakRef.current + 1 : 0
      setStreak(streakRef.current)
      if (streakRef.current >= STREAK_TO_ADVANCE) {
        streakRef.current = 0
        if (hasNext) setTimeout(() => onAutoNext?.(ln), 900) // let the animation show first
      }
      onComplete(ln, {
        ...stats,
        mistakes: c.mistakes + omitted,
        timeTaken: Math.round(timeMs / 100) / 10,
        errorTypes,
        perfect,
        uncorrectedErrors: remainingErrors,
        typed: text,
        repetition: attempts.length + 1,
      })
      reportNextKey('')
      return true
    },
    [attempts.length, ln, mode, onComplete, reference, reportNextKey, hasNext, onAutoNext],
  )

  const updateLine = useCallback(
    (v, meta = {}) => {
      const c = counters.current
      const now = Date.now()
      if (c.lastTs) c.timeMs += Math.min(now - c.lastTs, IDLE_CAP_MS)
      c.lastTs = now

      const cmp = compareLine(reference, typedToUnicode(v, mode))
      const len = meta.rawLength ?? Array.from(v).length
      const inserted = len - c.prevLength
      if (inserted > 0 && !meta.composing) {
        c.total += inserted
        if (cmp.errorCount > c.prevErrorCount) {
          c.incorrect += Math.min(inserted, cmp.errorCount - c.prevErrorCount)
          c.mistakes += 1
          for (const [type, n] of Object.entries(countByType(cmp.errors))) {
            const diff = n - (c.prevErrorTypes[type] || 0)
            if (diff > 0) c.errorTypes[type] = (c.errorTypes[type] || 0) + diff
          }
        }
      }
      if (!meta.composing) {
        c.prevLength = Array.from(v).length
        c.prevErrorCount = cmp.errorCount
        c.prevErrorTypes = countByType(cmp.errors)
      }
      composingRef.current = !!meta.composing
      setRaw(v)
      setLive({ total: c.total, mistakes: c.mistakes })
      onDraft?.(ln, { raw: v, total: c.total, incorrect: c.incorrect, mistakes: c.mistakes, timeMs: c.timeMs, errorTypes: c.errorTypes })
      reportNextKey(v)
      tryFinish(v)
    },
    [reference, mode, onDraft, ln, reportNextKey, tryFinish],
  )

  /** a new value of the whole box arrives from the textarea */
  const handleBoxChange = useCallback(
    (next, meta = {}) => {
      if (!next.startsWith(prefix)) return // finished repetitions are locked
      const v = next.slice(prefix.length).replace(/\n/g, ' ')
      // a space pressed out of habit at the start of a new line is ignored
      if (!raw && v.trim() === '') return
      const rawLength = meta.rawLength != null ? meta.rawLength - Array.from(prefix).length : undefined
      updateLine(v, { ...meta, rawLength })
    },
    [prefix, raw, updateLine],
  )

  const handleComposition = useCallback(
    (isComposing, finalValue) => {
      composingRef.current = isComposing
      if (!isComposing && finalValue != null) handleBoxChange(finalValue, { composing: false })
    },
    [handleBoxChange],
  )

  /** Enter: finish what is typed; on an empty line go to the next exercise line */
  const handleEnter = useCallback(() => {
    if (raw.trim()) tryFinish(raw, true)
    else if (isDone && hasNext) onGoNext?.(ln)
  }, [raw, tryFinish, isDone, hasNext, onGoNext, ln])

  /**
   * Bring this line (reference + box) into view below the sticky top navigation bar.
   * Runs two frames later: the box that lost focus shrinks back first, which moves
   * everything below it up; scrolling before that would leave this line hidden.
   */
  const ensureVisible = useCallback(() => {
    const run = () => {
      const card = document.getElementById(`line-${ln}`)
      if (!card) return
      const navbar = document.querySelector('.app-navbar')
      const headerBottom = navbar ? navbar.getBoundingClientRect().bottom : 0
      const top = card.getBoundingClientRect().top
      // instant (not smooth) so fast typing cannot interrupt it
      if (top < headerBottom + 8 || top > window.innerHeight * 0.6) {
        window.scrollTo({ top: window.scrollY + top - headerBottom - 12, behavior: 'auto' })
      }
    }
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(run))
    else run()
  }, [ln])

  useImperativeHandle(
    ref,
    () => ({
      focus: () => {
        const el = inputRef.current
        if (!el) return
        el.focus({ preventScroll: true })
        el.setSelectionRange(el.value.length, el.value.length)
        ensureVisible()
      },
      element: () => inputRef.current,
      /** used by the on-screen keyboard */
      insert: (text) => {
        const el = inputRef.current
        const start = Math.max(prefix.length, el?.selectionStart ?? value.length)
        const end = Math.max(start, el?.selectionEnd ?? value.length)
        handleBoxChange(value.slice(0, start) + text + value.slice(end), {
          rawLength: Array.from(value).length + Array.from(text).length - (end - start),
        })
        el?.focus({ preventScroll: true })
      },
      backspace: () => {
        const el = inputRef.current
        const start = el?.selectionStart ?? value.length
        const end = el?.selectionEnd ?? value.length
        if (start === end && start <= prefix.length) return
        const next = start !== end ? value.slice(0, start) + value.slice(end) : value.slice(0, start - 1) + value.slice(start)
        handleBoxChange(next)
        el?.focus({ preventScroll: true })
      },
      /** clear the repetition being typed (Reset) */
      resetCurrent: () => {
        counters.current = newCounters(null)
        setRaw('')
        setLive({ total: 0, mistakes: 0 })
        reportNextKey('')
      },
    }),
    [prefix, value, handleBoxChange, reportNextKey, ensureVisible],
  )

  const errorSummary = useMemo(() => countByType(comparison.errors), [comparison])
  const hasErrors = !!raw && comparison.hasErrors
  const ready = !!raw && lineEnd.ended

  return (
    <div
      className={`typing-line card-soft ${active ? 'is-active' : ''} ${isDone ? 'is-done' : ''} ${
        cheer ? (cheer.perfect ? 'cheer-perfect' : 'cheer-partial') : ''
      }`}
      id={`line-${ln}`}
      data-testid={`line-${ln}`}
      data-completed={isDone ? 'true' : 'false'}
    >
      {cheer && (
        <div key={cheer.id} className={`line-cheer ${cheer.perfect ? 'perfect' : 'partial'}`} role="status" data-testid={`line-cheer-${ln}`}>
          {cheer.perfect
            ? '✓ शाबाश! पंक्ति बिल्कुल सही'
            : `पंक्ति पूरी — गलतियाँ: ${cheer.errors}${cheer.omitted ? `, छूटे अक्षर: ${cheer.omitted}` : ''}`}
        </div>
      )}
      {/* the reference of the active line stays visible (sticky) while scrolling */}
      <div className="line-ref-row d-flex align-items-start gap-2 mb-1">
        <span className="line-number">{isDone ? <FaCheckCircle aria-label="completed" className={cheer?.perfect ? 'pop-check' : ''} /> : ln}</span>
        <div className="flex-grow-1 min-w-0">
          <MistakeHighlighter comparison={shownComparison} reference={reference} className={refTheme} />
        </div>
        <Button
          variant="outline-primary"
          size="sm"
          className="flex-shrink-0"
          onClick={() => onHint(line)}
          title="Hint (Alt + H)"
          aria-label={`Hint for line ${ln}`}
        >
          <FaLightbulb /> <span className="d-none d-md-inline">Hint</span>
        </Button>
      </div>

      <TypingInput
        inputRef={inputRef}
        value={value}
        onChange={handleBoxChange}
        onCompositionChange={handleComposition}
        onCapsLock={onCapsLock}
        onEnter={handleEnter}
        highlights={highlights}
        minCaret={prefix.length}
        mode={mode}
        status={hasErrors ? 'has-error' : ''}
        lineNumber={ln}
        onFocus={() => {
          onFocusLine?.(ln)
          reportNextKey(raw)
          ensureVisible()
        }}
        placeholder={active ? (mode === 'kruti' ? PLACEHOLDER_KRUTI : 'यहाँ टाइप करें…') : ''}
      />

      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-1 small">
        <div className="d-flex flex-wrap align-items-center">
          {hasErrors &&
            Object.entries(errorSummary).map(([type, n]) => (
              <span key={type} className="error-chip" data-testid={`error-${type}`}>
                {ERROR_LABELS[type]}: {n}
              </span>
            ))}
          {ready && (
            <span className={`fw-semibold ${comparison.isComplete ? 'text-success' : 'text-warning-emphasis'}`} data-testid="press-space">
              {comparison.isComplete ? '✓ पंक्ति सही है' : 'पंक्ति का अंत'} — <span className="key-cap">Space</span> /{' '}
              <span className="key-cap">Enter</span> दबाएँ, कर्सर अगली लाइन पर जाएगा
            </span>
          )}
          {!hasErrors && !ready && raw && <span className="text-success">✓ अब तक सही</span>}
          {streak > 0 && (
            <span className={`streak-chip ${streak >= STREAK_TO_ADVANCE ? 'full' : ''}`} data-testid={`streak-${ln}`} title="लगातार सही टाइप">
              लगातार सही: {streak}/{STREAK_TO_ADVANCE}
              {streak >= STREAK_TO_ADVANCE && hasNext ? ' → अगली पंक्ति' : ''}
            </span>
          )}
          {!raw && attempts.length > 0 && (
            <span className="text-body-secondary" data-testid="repetitions">
              {attempts.length} बार टाइप किया ({attempts.filter((a) => a.perfect).length} बिल्कुल सही) — दोबारा अभ्यास करें या{' '}
              <span className="key-cap">Enter</span> से अगली पंक्ति पर जाएँ
            </span>
          )}
        </div>
        <div className="d-flex align-items-center gap-2 text-muted">
          {raw ? (
            <span>
              Typed {live.total} · Mistakes {live.mistakes}
            </span>
          ) : null}
          {isDone && result && (
            <>
              <Badge bg="success">{result.netWPM} WPM</Badge>
              <Badge bg={result.accuracy === 100 ? 'success' : 'warning'} text={result.accuracy === 100 ? undefined : 'dark'}>
                {result.accuracy}%
              </Badge>
            </>
          )}
          {isDone && hasNext && (
            <Button variant="outline-primary" size="sm" onClick={() => onGoNext?.(ln)} title="Enter / Alt + ↓" data-testid={`go-next-${ln}`}>
              अगली पंक्ति <FaArrowDown />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

export default memo(LineTypingBox)
