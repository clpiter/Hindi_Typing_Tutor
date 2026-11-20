import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Alert, Button, ButtonGroup, Form, Dropdown } from 'react-bootstrap'
import {
  FaLightbulb,
  FaUndo,
  FaArrowRight,
  FaArrowLeft,
  FaVolumeUp,
  FaVolumeMute,
  FaKeyboard,
  FaSyncAlt,
  FaExclamationTriangle,
  FaInfoCircle,
} from 'react-icons/fa'
import ExerciseDisplay from '../components/ExerciseDisplay.jsx'
import LineTypingBox from '../components/LineTypingBox.jsx'
import TypingKeyboard from '../components/TypingKeyboard.jsx'
import HintModal from '../components/HintModal.jsx'
import FlyingLikes from '../components/FlyingLikes.jsx'
import CongratulationsModal, { LineCelebration } from '../components/CongratulationsModal.jsx'
import { LINE_MESSAGES } from '../utils/messages.js'
import ProgressBar from '../components/ProgressBar.jsx'
import Loader, { ErrorAlert } from '../components/Loader.jsx'
import KrutiText from '../components/KrutiText.jsx'
import { fetchExerciseByNumber, fetchExercises } from '../features/exercises/exercisesSlice.js'
import {
  fetchContinue,
  fetchExerciseProgress,
  saveLineResult,
  resetExerciseProgress,
} from '../features/progress/progressSlice.js'
import { savePreference } from '../features/settings/settingsSlice.js'
import { readStore, writeStore, removeStore, draftKey } from '../utils/storage.js'
import { playSuccessSound } from '../utils/sound.js'
import { computeStats, formatDuration, formatDate } from '../utils/stats.js'

const FOCUS_DELAY_MS = 350

function aggregateResults(results) {
  const list = Object.values(results)
  const sum = (k) => list.reduce((a, r) => a + (Number(r[k]) || 0), 0)
  const timeTaken = sum('timeTaken')
  const s = computeStats({ totalCharacters: sum('totalCharacters'), incorrectCharacters: sum('incorrectCharacters'), timeMs: timeTaken * 1000 })
  return { ...s, timeTaken, mistakes: sum('mistakes') }
}

export default function Practice() {
  const { exerciseNumber } = useParams()
  const number = exerciseNumber ? Number(exerciseNumber) : null
  const dispatch = useDispatch()
  const navigate = useNavigate()

  const user = useSelector((s) => s.auth.user)
  const settings = useSelector((s) => s.settings)
  const { current, currentStatus, currentError, list } = useSelector((s) => s.exercises)
  const exercise = current && current.exerciseNumber === number ? current : null
  const mode = settings.inputMode

  const [loadingProgress, setLoadingProgress] = useState(true)
  const [progressError, setProgressError] = useState(null)
  const [previous, setPrevious] = useState(null) // last completed attempt info
  const [completed, setCompleted] = useState(() => new Set())
  const [lineResults, setLineResults] = useState({})
  const [activeLine, setActiveLine] = useState(1)
  const [attemptKey, setAttemptKey] = useState(0)
  const [nextKey, setNextKey] = useState(null)
  const [hintLine, setHintLine] = useState(null)
  const [likes, setLikes] = useState(0)
  const [lineEvent, setLineEvent] = useState(null)
  const [congrats, setCongrats] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [unsaved, setUnsaved] = useState([])
  const [capsLock, setCapsLock] = useState(false)
  const [drafts, setDrafts] = useState({})

  const lineRefs = useRef({}) // one typing box per exercise line
  const completedRef = useRef(new Set())
  const draftRef = useRef({ mode, lines: {} })
  const draftTimer = useRef(null)
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  // 1. no exercise in the URL → resume where the learner left off
  useEffect(() => {
    if (number) return
    dispatch(fetchContinue())
      .unwrap()
      .then((data) => navigate(`/practice/${data.exercise?.exerciseNumber || 1}`, { replace: true }))
      .catch(() => navigate('/practice/1', { replace: true }))
  }, [number, dispatch, navigate])

  // 2. load the exercise
  useEffect(() => {
    if (number) dispatch(fetchExerciseByNumber(number))
    if (!list.length) dispatch(fetchExercises())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [number, dispatch])

  const focusLine = useCallback((n, delay = FOCUS_DELAY_MS) => {
    setTimeout(() => lineRefs.current[n]?.focus(), delay)
  }, [])

  // 3. load saved progress (MongoDB) + local draft, then focus the first open line
  const exerciseId = exercise?._id
  useEffect(() => {
    if (!exerciseId || !user) return undefined
    let cancelled = false
    setLoadingProgress(true)
    setProgressError(null)
    dispatch(fetchExerciseProgress(exerciseId))
      .unwrap()
      .then((data) => {
        if (cancelled) return
        const done = new Set(data.current?.completedLines || [])
        const results = {}
        for (const r of data.current?.lineResults || []) results[r.lineNumber] = r
        completedRef.current = done
        setCompleted(done)
        setLineResults(results)
        setPrevious(data.current ? null : data.lastCompleted)
        const stored = readStore(draftKey(user._id, exerciseId)) || { lines: {} }
        draftRef.current = stored.mode === settingsRef.current.inputMode ? stored : { mode: settingsRef.current.inputMode, lines: {} }
        setDrafts(draftRef.current.lines || {})
        // the box always continues with the first unfinished line
        const first = exercise.lines.find((l) => !done.has(l.lineNumber))?.lineNumber
        if (first) {
          setActiveLine(first)
          focusLine(first, 150)
        }
      })
      .catch((err) => !cancelled && setProgressError(String(err)))
      .finally(() => !cancelled && setLoadingProgress(false))
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exerciseId, user?._id, attemptKey, dispatch, focusLine])

  const persistDraft = useCallback(() => {
    if (!user || !exerciseId) return
    clearTimeout(draftTimer.current)
    draftTimer.current = setTimeout(() => writeStore(draftKey(user._id, exerciseId), draftRef.current), 300)
  }, [user, exerciseId])

  const handleDraft = useCallback(
    (lineNumber, draft) => {
      draftRef.current = { ...draftRef.current, mode, activeLine: lineNumber, lines: { ...draftRef.current.lines, [lineNumber]: draft } }
      persistDraft()
    },
    [mode, persistDraft],
  )

  const hasNextExercise = useMemo(() => (list.length ? list.some((e) => e.exerciseNumber === number + 1) : number < 8), [list, number])
  const goNextExercise = useCallback(() => {
    if (hasNextExercise) navigate(`/practice/${number + 1}`)
  }, [hasNextExercise, navigate, number])
  const hasPrevExercise = number > 1
  const goPrevExercise = useCallback(() => {
    if (hasPrevExercise) navigate(`/practice/${number - 1}`)
  }, [hasPrevExercise, navigate, number])

  const submitResult = useCallback(
    (payload, allDone) =>
      dispatch(saveLineResult(payload))
        .unwrap()
        .then((data) => {
          setLineResults((prev) => ({ ...prev, [payload.lineNumber]: data.lineResult }))
          setUnsaved((u) => u.filter((p) => p.lineNumber !== payload.lineNumber))
          if (data.exerciseCompleted) {
            const p = data.progress
            setCongrats({
              stats: { netWPM: p.netWPM, grossWPM: p.grossWPM, accuracy: p.accuracy, mistakes: p.mistakes, timeTaken: p.timeTaken, totalCharacters: p.totalCharacters },
              perfect: p.incorrectCharacters === 0,
            })
            if (user) removeStore(draftKey(user._id, payload.exerciseId))
          }
          return data
        })
        .catch((message) => {
          setSaveError(`Could not save line ${payload.lineNumber}: ${message}`)
          setUnsaved((u) => [...u.filter((p) => p.lineNumber !== payload.lineNumber), payload])
          if (allDone) setCongrats((c) => c || { stats: null, perfect: false })
        }),
    [dispatch, user],
  )

  /**
   * Called once for every correct repetition of a line (Space/Enter after the last
   * word). The cursor stays in the same box on a new line; focus does not move.
   */
  const handleLineComplete = useCallback(
    (lineNumber, result) => {
      if (!exercise) return
      const firstTime = !completedRef.current.has(lineNumber)
      const done = new Set(completedRef.current)
      done.add(lineNumber)
      completedRef.current = done
      if (firstTime) setCompleted(done)
      setLineResults((prev) => ({ ...prev, [lineNumber]: result }))
      setActiveLine(lineNumber)

      // drop the local draft for this line – MongoDB now has the result
      const { [lineNumber]: _drop, ...rest } = draftRef.current.lines || {}
      void _drop
      draftRef.current = { ...draftRef.current, lines: rest }
      persistDraft()

      // celebrate only a 100 %-accurate line
      if (result.perfect) {
        setLikes((n) => n + 1)
        if (settingsRef.current.soundEnabled) playSuccessSound()
        if (settingsRef.current.lineCelebration) {
          setLineEvent({ id: `${lineNumber}-${Date.now()}`, message: LINE_MESSAGES[(lineNumber - 1) % LINE_MESSAGES.length] })
        }
      }

      const allDone = firstTime && exercise.lines.every((l) => done.has(l.lineNumber))
      submitResult(
        {
          exerciseId: exercise._id,
          lineNumber,
          totalCharacters: Math.max(1, result.totalCharacters),
          incorrectCharacters: result.incorrectCharacters,
          mistakes: result.mistakes,
          timeTaken: Math.max(1, result.timeTaken),
          errorTypes: result.errorTypes,
        },
        allDone,
      )

    },
    [exercise, persistDraft, submitResult],
  )

  const handleNextKey = useCallback((lineNumber, key) => {
    setActiveLine(lineNumber)
    setNextKey(key)
  }, [])
  const handleHint = useCallback((line) => setHintLine(line), [])
  const handleFocusLine = useCallback((n) => setActiveLine(n), [])

  /** move to another line's box only when the learner asks for it */
  const goToLine = useCallback(
    (n) => {
      if (!exercise || !exercise.lines.some((l) => l.lineNumber === n)) return
      setActiveLine(n)
      focusLine(n, 0)
    },
    [exercise, focusLine],
  )

  const resetLine = useCallback(
    (n = activeLine) => {
      lineRefs.current[n]?.resetCurrent()
      const { [n]: _drop, ...rest } = draftRef.current.lines || {}
      void _drop
      draftRef.current = { ...draftRef.current, lines: rest }
      setDrafts(rest)
      persistDraft()
      focusLine(n, 50)
    },
    [activeLine, persistDraft, focusLine],
  )

  const startOver = useCallback(
    async ({ confirmFirst = true } = {}) => {
      if (!exercise) return
      if (confirmFirst && !window.confirm('Restart this exercise? Lines completed in this attempt will be cleared.')) return
      try {
        await dispatch(resetExerciseProgress(exercise._id)).unwrap()
      } catch {
        /* nothing to reset */
      }
      if (user) removeStore(draftKey(user._id, exercise._id))
      draftRef.current = { mode, lines: {} }
      setDrafts({})
      setCongrats(null)
      setAttemptKey((k) => k + 1)
    },
    [dispatch, exercise, mode, user],
  )

  const retryUnsaved = () => {
    setSaveError(null)
    unsaved.forEach((p) => submitResult(p, false))
  }

  // keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return
      const actions = {
        KeyH: () => exercise && setHintLine(exercise.lines.find((l) => l.lineNumber === activeLine) || exercise.lines[0]),
        KeyR: () => resetLine(),
        KeyN: () => goNextExercise(),
        KeyP: () => goPrevExercise(),
        KeyK: () => dispatch(savePreference({ showKeyboard: !settingsRef.current.showKeyboard })),
        KeyM: () => dispatch(savePreference({ soundEnabled: !settingsRef.current.soundEnabled })),
        ArrowDown: () => goToLine(activeLine + 1),
        ArrowUp: () => goToLine(activeLine - 1),
      }
      if (actions[e.code]) {
        e.preventDefault()
        actions[e.code]()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [exercise, activeLine, resetLine, goNextExercise, goPrevExercise, goToLine, dispatch])

  useEffect(() => () => clearTimeout(draftTimer.current), [])

  const session = useMemo(() => aggregateResults(lineResults), [lineResults])

  if (!number) return <Loader label="Finding where you left off…" />
  if (currentStatus === 'failed') return <ErrorAlert message={currentError} onRetry={() => dispatch(fetchExerciseByNumber(number))} />
  if (!exercise || currentStatus === 'loading') return <Loader label="Loading exercise…" />

  const total = exercise.lines.length
  const doneCount = completed.size

  return (
    <div className="pb-5">
      {/* exercise header: title + toolbar (scrolls with the page) */}
      <div className="card-soft practice-toolbar mb-3" data-testid="practice-header">
        <ExerciseDisplay exercise={exercise} part="header" />
        <div className="d-flex flex-wrap align-items-center gap-3 mt-2">
        <ProgressBar className="flex-grow-1" style={{ minWidth: 180 }} value={doneCount} max={total} label="Lines completed" />
        <div className="d-flex gap-2">
          <div className="metric">
            <div className="metric-value text-primary" data-testid="metric-wpm">{session.netWPM}</div>
            <div className="metric-label">Net WPM</div>
          </div>
          <div className="metric">
            <div className="metric-value text-success" data-testid="metric-accuracy">{Object.keys(lineResults).length ? `${session.accuracy}%` : '—'}</div>
            <div className="metric-label">Accuracy</div>
          </div>
          <div className="metric">
            <div className="metric-value text-danger">{session.mistakes}</div>
            <div className="metric-label">Mistakes</div>
          </div>
          <div className="metric">
            <div className="metric-value">{formatDuration(session.timeTaken)}</div>
            <div className="metric-label">Time</div>
          </div>
        </div>
        <div className="d-flex flex-wrap gap-2 ms-auto">
          <Button variant="outline-primary" size="sm" onClick={() => setHintLine(exercise.lines.find((l) => l.lineNumber === activeLine) || exercise.lines[0])} title="Alt + H">
            <FaLightbulb /> Hint
          </Button>
          <ButtonGroup size="sm">
            <Button variant="outline-secondary" onClick={() => resetLine()} title="Reset current line (Alt + R)">
              <FaUndo /> Reset
            </Button>
            <Dropdown as={ButtonGroup}>
              <Dropdown.Toggle split variant="outline-secondary" id="reset-menu" aria-label="More reset options" />
              <Dropdown.Menu>
                <Dropdown.Item onClick={() => resetLine()}>Reset current line</Dropdown.Item>
                <Dropdown.Item onClick={() => startOver()}>
                  <FaSyncAlt className="me-2" /> Restart whole exercise
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
          </ButtonGroup>
          <Button
            variant="light"
            size="sm"
            onClick={() => dispatch(savePreference({ soundEnabled: !settings.soundEnabled }))}
            aria-pressed={settings.soundEnabled}
            title="Sound on/off (Alt + M)"
          >
            {settings.soundEnabled ? <FaVolumeUp /> : <FaVolumeMute />}
          </Button>
          <Button
            variant={settings.showKeyboard ? 'primary' : 'light'}
            size="sm"
            onClick={() => dispatch(savePreference({ showKeyboard: !settings.showKeyboard }))}
            aria-pressed={settings.showKeyboard}
            title="Show/hide keyboard (Alt + K)"
          >
            <FaKeyboard />
          </Button>
          <Form.Select
            size="sm"
            style={{ width: 'auto' }}
            value={mode}
            onChange={(e) => {
              dispatch(savePreference({ inputMode: e.target.value }))
              draftRef.current = { mode: e.target.value, lines: {} }
              setDrafts({})
            }}
            aria-label="Input mode"
          >
            <option value="kruti">Kruti Dev (Remington)</option>
            <option value="unicode">Unicode IME</option>
          </Form.Select>
          <Button size="sm" variant="outline-primary" onClick={goPrevExercise} disabled={!hasPrevExercise} title="Previous exercise (Alt + P)" data-testid="prev-exercise">
            <FaArrowLeft /> Previous
          </Button>
          <Button size="sm" className="btn-gradient" onClick={goNextExercise} disabled={!hasNextExercise} title="Next exercise (Alt + N)" data-testid="next-exercise">
            Next <FaArrowRight />
          </Button>
        </div>
        </div>
      </div>

      <ExerciseDisplay exercise={exercise} part="instructions" defaultOpen={doneCount === 0} />

      {capsLock && mode === 'kruti' && (
        <Alert variant="warning" className="py-2">
          <FaExclamationTriangle /> Caps Lock is ON – Kruti Dev keys will produce the wrong letters.
        </Alert>
      )}
      {mode === 'kruti' && doneCount === 0 && (
        <Alert variant="info" className="py-2 small">
          <FaInfoCircle /> <strong>Kruti Dev mode:</strong> keep your keyboard on <strong>English (US)</strong> and type the Remington keys – e.g.{' '}
          <span className="key-cap">d</span>=क, <span className="key-cap">k</span>=ा, <span className="key-cap">f</span>=ि (typed before the
          consonant), <span className="key-cap">Z</span>=reph, <span className="key-cap">Alt+W</span>=ँ. Using a Hindi IME instead? Switch to “Unicode IME”.
        </Alert>
      )}
      {previous && doneCount === 0 && (
        <Alert variant="success" className="py-2 small">
          You completed this exercise on {formatDate(previous.completedAt)} – {previous.netWPM} WPM, {previous.accuracy}% accuracy. Practising again starts a new
          attempt.
        </Alert>
      )}
      {progressError && <ErrorAlert message={progressError} />}
      {saveError && (
        <Alert variant="danger" dismissible onClose={() => setSaveError(null)} className="d-flex align-items-center gap-2">
          <span className="flex-grow-1">{saveError}</span>
          {unsaved.length > 0 && (
            <Button size="sm" variant="outline-danger" onClick={retryUnsaved}>
              Retry saving
            </Button>
          )}
        </Alert>
      )}

      {loadingProgress ? (
        <Loader label="Restoring your progress…" />
      ) : (
        <div key={`${attemptKey}-${mode}`}>
          {/* every exercise line has its own input box below it */}
          {exercise.lines.map((line) => (
            <LineTypingBox
              key={line.lineNumber}
              ref={(h) => {
                if (h) lineRefs.current[line.lineNumber] = h
                else delete lineRefs.current[line.lineNumber]
              }}
              line={line}
              mode={mode}
              completed={completed.has(line.lineNumber)}
              result={lineResults[line.lineNumber]}
              active={activeLine === line.lineNumber}
              initialDraft={drafts[line.lineNumber]}
              onComplete={handleLineComplete}
              onDraft={handleDraft}
              onHint={handleHint}
              onNextKey={handleNextKey}
              onCapsLock={setCapsLock}
              onFocusLine={handleFocusLine}
              onGoNext={(n) => goToLine(n + 1)}
              onAutoNext={(n) => goToLine(n + 1)}
              hasNext={line.lineNumber < exercise.lines.length}
            />
          ))}
          {doneCount === total && !congrats && (
            <div className="text-center my-4">
              <KrutiText text="यह अभ्यास पूरा हो गया है।" className="fs-4 d-block mb-2" />
              <Button className="btn-gradient me-2" onClick={goNextExercise} disabled={!hasNextExercise}>
                Next exercise <FaArrowRight />
              </Button>
              <Button variant="outline-primary" onClick={() => startOver({ confirmFirst: false })}>
                Practice again
              </Button>
            </div>
          )}
        </div>
      )}

      {settings.showKeyboard && mode === 'kruti' && (
        <div className="keyboard-dock mt-3">
          <TypingKeyboard
            nextKey={nextKey}
            practiceRow={exercise.keyboardRow}
            onKey={(ch) => lineRefs.current[activeLine]?.insert(ch)}
            onBackspace={() => lineRefs.current[activeLine]?.backspace()}
          />
        </div>
      )}
      {settings.showKeyboard && mode === 'unicode' && (
        <div className="small text-muted mt-3">
          The on-screen Kruti Dev keyboard is available in Kruti Dev mode. In Unicode mode use your Hindi IME. <Link to="#" onClick={(e) => { e.preventDefault(); dispatch(savePreference({ inputMode: 'kruti' })) }}>Switch to Kruti Dev</Link>
        </div>
      )}

      <HintModal show={!!hintLine} onHide={() => setHintLine(null)} line={hintLine} exercise={exercise} nextKey={hintLine?.lineNumber === activeLine ? nextKey : null} />
      <FlyingLikes trigger={likes} />
      <LineCelebration event={lineEvent} />
      <CongratulationsModal
        show={!!congrats}
        onHide={() => setCongrats(null)}
        stats={congrats?.stats || (doneCount === total ? session : null)}
        perfect={congrats?.perfect}
        exercise={exercise}
        hasNext={hasNextExercise}
        onNext={() => {
          setCongrats(null)
          goNextExercise()
        }}
        onRetry={() => startOver({ confirmFirst: false })}
        onDashboard={() => navigate('/dashboard')}
      />
    </div>
  )
}
