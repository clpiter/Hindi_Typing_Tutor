import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Row, Col, Button, Badge } from 'react-bootstrap'
import { FaBook, FaCheckCircle, FaHourglassHalf, FaTachometerAlt, FaBullseye, FaTrophy, FaClock, FaPlay, FaArrowRight } from 'react-icons/fa'
import { fetchDashboard, fetchContinue } from '../features/progress/progressSlice.js'
import StatCard from '../components/StatCard.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import KrutiText from '../components/KrutiText.jsx'
import Loader, { ErrorAlert, EmptyState } from '../components/Loader.jsx'
import { DailyBarChart, TrendLineChart } from '../components/Charts.jsx'
import { formatDuration, formatDate } from '../utils/stats.js'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'सुप्रभात'
  if (h < 17) return 'नमस्ते'
  return 'शुभ संध्या'
}

export default function Dashboard() {
  const dispatch = useDispatch()
  const user = useSelector((s) => s.auth.user)
  const { data: d, status, error } = useSelector((s) => s.progress.dashboard)
  const cont = useSelector((s) => s.progress.continueInfo.data)

  useEffect(() => {
    dispatch(fetchDashboard())
    dispatch(fetchContinue())
  }, [dispatch])

  const speedTrend = useMemo(() => (d?.dailyProgress || []).map((x) => ({ ...x, netWPM: x.lines ? x.netWPM : null })), [d])
  const practiceTo = cont?.exercise ? `/practice/${cont.exercise.exerciseNumber}` : '/practice'

  if (status === 'failed') return <ErrorAlert message={error} onRetry={() => dispatch(fetchDashboard())} />
  if (!d) return <Loader label="Loading your dashboard…" />

  const hasActivity = d.totalAttempts > 0

  return (
    <div>
      <div className="hero-card mb-4 fade-up">
        <Row className="align-items-center g-3" style={{ position: 'relative', zIndex: 1 }}>
          <Col md={8}>
            <h1 className="h3 fw-bold mb-1">
              <KrutiText text={`${greeting()}, `} />
              {user?.name}!
            </h1>
            <p className="mb-0 opacity-90">
              <KrutiText text="हिंदी टाइपिंग अभ्यास में आपका स्वागत है।" />{' '}
              {cont?.reason === 'in-progress'
                ? `Continue exercise ${cont.exercise.exerciseNumber} from line ${cont.nextLine}.`
                : cont?.reason === 'all-completed'
                  ? 'You have completed every exercise – practise again to improve your speed!'
                  : 'Pick up the next exercise and keep improving.'}
            </p>
          </Col>
          <Col md={4} className="text-md-end">
            <Button as={Link} to={practiceTo} size="lg" variant="light" className="fw-semibold text-primary px-4" data-testid="start-practice">
              <FaPlay className="me-2" />
              {cont?.reason === 'in-progress' ? 'Continue Practice' : 'Start Practice'}
            </Button>
          </Col>
        </Row>
      </div>

      <Row className="g-3 mb-4">
        <Col xs={6} lg={3}>
          <StatCard icon={FaBook} label="Total exercises" value={d.totalExercises} testId="stat-total" />
        </Col>
        <Col xs={6} lg={3}>
          <StatCard icon={FaCheckCircle} label="Completed" value={d.completedExercises} color="#16a34a" bg="#ecfdf5" testId="stat-completed" />
        </Col>
        <Col xs={6} lg={3}>
          <StatCard icon={FaHourglassHalf} label="Pending" value={d.pendingExercises} color="#d97706" bg="#fffbeb" testId="stat-pending" />
        </Col>
        <Col xs={6} lg={3}>
          <StatCard icon={FaClock} label="Total practice time" value={formatDuration(d.totalPracticeTime)} color="#0891b2" bg="#ecfeff" />
        </Col>
        <Col xs={6} lg={4}>
          <StatCard icon={FaTachometerAlt} label="Average speed (net WPM)" value={d.averageSpeed} sub={`Gross ${d.averageGrossSpeed} WPM`} />
        </Col>
        <Col xs={6} lg={4}>
          <StatCard icon={FaBullseye} label="Average accuracy" value={`${d.averageAccuracy}%`} color="#16a34a" bg="#ecfdf5" />
        </Col>
        <Col xs={12} lg={4}>
          <StatCard
            icon={FaTrophy}
            label="Best speed (net WPM)"
            value={d.bestSpeed}
            color="#ca8a04"
            bg="#fefce8"
            sub={d.bestSpeedDetail ? `Exercise ${d.bestSpeedDetail.exerciseNumber}, line ${d.bestSpeedDetail.lineNumber}` : 'No lines yet'}
          />
        </Col>
      </Row>

      <Row className="g-3 mb-4">
        <Col lg={4}>
          <div className="card-soft p-3 h-100">
            <h2 className="h6 fw-semibold mb-3">Overall progress</h2>
            <ProgressBar value={d.completedExercises} max={d.totalExercises} label="Exercises completed" className="mb-3" />
            <ProgressBar value={d.dailyGoal.done} max={d.dailyGoal.target} label="Today's goal (lines)" variant="info" className="mb-3" />
            <div className="small text-muted">
              {d.totalLinesCompleted} lines completed in {d.totalAttempts} practice session{d.totalAttempts === 1 ? '' : 's'}.
            </div>
          </div>
        </Col>
        <Col lg={4}>
          <div className="card-soft p-3 h-100">
            <h2 className="h6 fw-semibold mb-1">Lines practised per day</h2>
            <div className="small text-muted mb-2">Last 14 days</div>
            <DailyBarChart data={d.dailyProgress} dataKey="lines" unit="lines" />
          </div>
        </Col>
        <Col lg={4}>
          <div className="card-soft p-3 h-100">
            <h2 className="h6 fw-semibold mb-1">Net speed per day (WPM)</h2>
            <div className="small text-muted mb-2">Days without practice are skipped</div>
            <TrendLineChart data={speedTrend} dataKey="netWPM" unit="WPM" />
          </div>
        </Col>
      </Row>

      <div className="card-soft p-3">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h2 className="h6 fw-semibold mb-0">Recent practice activity</h2>
          <Link to="/history" className="small">
            View history <FaArrowRight />
          </Link>
        </div>
        {!hasActivity ? (
          <EmptyState title="No practice yet">
            Start with exercise 1 – home keys. <Link to="/practice/1">Begin now</Link>
          </EmptyState>
        ) : (
          <div className="table-responsive">
            <table className="table table-soft mb-0">
              <thead>
                <tr>
                  <th>Exercise</th>
                  <th>Progress</th>
                  <th>Net WPM</th>
                  <th>Accuracy</th>
                  <th>Last activity</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {d.recentActivity.map((r) => (
                  <tr key={r._id}>
                    <td>
                      <strong>{r.exerciseNumber}.</strong> <KrutiText text={r.title || ''} />
                    </td>
                    <td style={{ minWidth: 140 }}>
                      <ProgressBar value={r.completedLines} max={r.totalLines} showText={false} height={6} />
                      <span className="small text-muted">
                        {r.completedLines}/{r.totalLines} lines
                      </span>
                    </td>
                    <td>{r.netWPM}</td>
                    <td>{r.accuracy}%</td>
                    <td className="small text-muted">{formatDate(r.lastActivityAt)}</td>
                    <td className="text-end">
                      {r.completed ? (
                        <Badge className="badge-soft-success">Completed</Badge>
                      ) : (
                        <Button as={Link} size="sm" variant="outline-primary" to={`/practice/${r.exerciseNumber}`}>
                          Continue
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
