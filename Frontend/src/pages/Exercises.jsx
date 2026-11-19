import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Row, Col, Badge, Button } from 'react-bootstrap'
import { FaPlay, FaRedo, FaCheckCircle } from 'react-icons/fa'
import { fetchExercises } from '../features/exercises/exercisesSlice.js'
import { fetchSummary } from '../features/progress/progressSlice.js'
import KrutiText from '../components/KrutiText.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import Loader, { ErrorAlert, EmptyState } from '../components/Loader.jsx'
import { ROW_NAMES } from '../utils/kruti/index.js'

const STATUS = {
  completed: { cls: 'badge-soft-success', text: 'Completed' },
  'in-progress': { cls: 'badge-soft-warning', text: 'In progress' },
  'not-started': { cls: 'badge-soft-muted', text: 'Not started' },
}

export default function Exercises() {
  const dispatch = useDispatch()
  const { list, listStatus, listError } = useSelector((s) => s.exercises)
  const summary = useSelector((s) => s.progress.summary.data)

  useEffect(() => {
    dispatch(fetchExercises())
    dispatch(fetchSummary())
  }, [dispatch])

  if (listStatus === 'failed') return <ErrorAlert message={listError} onRetry={() => dispatch(fetchExercises())} />
  if (listStatus !== 'succeeded' && !list.length) return <Loader label="Loading exercises…" />
  if (!list.length) return <EmptyState title="No exercises found">Run <code>npm run seed</code> in the backend folder.</EmptyState>

  return (
    <div>
      <h1 className="page-title">Exercises</h1>
      <p className="page-subtitle">
        <KrutiText text="हिंदी शब्द संसाधन — टाइपराइटर कुँजीपटल अभ्यास 1–8" /> (PDF pages 73–80)
      </p>
      <Row className="g-3">
        {list.map((ex) => {
          const s = summary?.find((p) => p.exerciseNumber === ex.exerciseNumber)
          const st = STATUS[s?.status || 'not-started']
          const done = s?.currentAttempt?.completedLines?.length || 0
          return (
            <Col md={6} xl={4} key={ex._id}>
              <div className="card-soft card-hover p-3 h-100 d-flex flex-column" data-testid={`exercise-card-${ex.exerciseNumber}`}>
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <span className="line-number" style={{ width: 38, height: 38, fontSize: '1rem' }}>
                    {ex.exerciseNumber}
                  </span>
                  <Badge className={st.cls}>
                    {s?.status === 'completed' && <FaCheckCircle className="me-1" />}
                    {st.text}
                  </Badge>
                </div>
                <h2 className="h5 mb-1">
                  <KrutiText text={ex.title} />
                </h2>
                <div className="small text-muted mb-2">{ex.titleEnglish}</div>
                <div className="p-2 rounded-3 bg-primary-soft mb-2 text-truncate">
                  <KrutiText text={ex.sampleLine} />
                </div>
                <div className="small text-muted mb-2">
                  {ex.totalLines} lines · {ROW_NAMES[ex.keyboardRow]?.en}
                  {ex.shiftPractice ? ' · Shift' : ''} · <span className="text-capitalize">{ex.difficulty}</span>
                </div>
                {s?.status === 'in-progress' && <ProgressBar value={done} max={ex.totalLines} label="Current attempt" height={6} className="mb-2" />}
                {s?.bestNetWPM != null && (
                  <div className="small mb-2">
                    Best: <strong>{s.bestNetWPM} WPM</strong> · {s.bestAccuracy}% · completed {s.timesCompleted}×
                  </div>
                )}
                <div className="mt-auto">
                  <Button as={Link} to={`/practice/${ex.exerciseNumber}`} className="w-100" variant={s?.status === 'in-progress' ? 'primary' : 'outline-primary'}>
                    {s?.status === 'in-progress' ? (
                      <>
                        <FaPlay /> Resume
                      </>
                    ) : s?.status === 'completed' ? (
                      <>
                        <FaRedo /> Practise again
                      </>
                    ) : (
                      <>
                        <FaPlay /> Start
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </Col>
          )
        })}
      </Row>
    </div>
  )
}
