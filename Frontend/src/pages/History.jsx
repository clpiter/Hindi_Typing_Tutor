import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Form, Row, Col, Button, Badge, Pagination } from 'react-bootstrap'
import { FaFilter, FaTimes } from 'react-icons/fa'
import { fetchHistory } from '../features/progress/progressSlice.js'
import { fetchExercises } from '../features/exercises/exercisesSlice.js'
import KrutiText from '../components/KrutiText.jsx'
import Loader, { ErrorAlert, EmptyState } from '../components/Loader.jsx'
import { TrendLineChart } from '../components/Charts.jsx'
import { formatDate, formatDuration } from '../utils/stats.js'

const EMPTY = { exerciseNumber: '', from: '', to: '', status: 'all' }

export default function History() {
  const dispatch = useDispatch()
  const { data, status, error } = useSelector((s) => s.progress.history)
  const exercises = useSelector((s) => s.exercises.list)
  const [filters, setFilters] = useState(EMPTY)
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!exercises.length) dispatch(fetchExercises())
  }, [dispatch, exercises.length])

  useEffect(() => {
    dispatch(fetchHistory({ ...filters, page, limit: 15 }))
  }, [dispatch, filters, page])

  const set = (k) => (e) => {
    setPage(1)
    setFilters((f) => ({ ...f, [k]: e.target.value }))
  }

  // chronological trend of the sessions on this page
  const trend = useMemo(
    () =>
      [...(data?.history || [])]
        .filter((h) => h.completedLines > 0)
        .reverse()
        .map((h) => ({ label: formatDate(h.startedAt, { day: 'numeric', month: 'short' }), netWPM: h.netWPM, accuracy: h.accuracy })),
    [data],
  )
  const dateError = filters.from && filters.to && filters.from > filters.to ? '“From” must be before “To”' : null

  return (
    <div>
      <h1 className="page-title">Practice history</h1>
      <p className="page-subtitle">Every practice session is saved – filter by date and exercise.</p>

      <div className="card-soft p-3 mb-3">
        <Row className="g-2 align-items-end">
          <Col sm={6} md={3}>
            <Form.Label className="small mb-1">
              <FaFilter /> Exercise
            </Form.Label>
            <Form.Select value={filters.exerciseNumber} onChange={set('exerciseNumber')} aria-label="Filter by exercise">
              <option value="">All exercises</option>
              {exercises.map((e) => (
                <option key={e._id} value={e.exerciseNumber}>
                  {e.exerciseNumber}. {e.titleEnglish}
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col sm={6} md={2}>
            <Form.Label className="small mb-1">From</Form.Label>
            <Form.Control type="date" value={filters.from} onChange={set('from')} isInvalid={!!dateError} aria-label="From date" />
          </Col>
          <Col sm={6} md={2}>
            <Form.Label className="small mb-1">To</Form.Label>
            <Form.Control type="date" value={filters.to} onChange={set('to')} isInvalid={!!dateError} aria-label="To date" />
          </Col>
          <Col sm={6} md={3}>
            <Form.Label className="small mb-1">Status</Form.Label>
            <Form.Select value={filters.status} onChange={set('status')} aria-label="Filter by status">
              <option value="all">All sessions</option>
              <option value="completed">Completed</option>
              <option value="in-progress">In progress</option>
            </Form.Select>
          </Col>
          <Col md={2}>
            <Button variant="light" className="w-100" onClick={() => setFilters(EMPTY)}>
              <FaTimes /> Clear
            </Button>
          </Col>
        </Row>
        {dateError && <div className="text-danger small mt-2">{dateError}</div>}
      </div>

      {trend.length > 1 && (
        <Row className="g-3 mb-3">
          <Col md={6}>
            <div className="card-soft p-3">
              <h2 className="h6 fw-semibold mb-2">Net speed by session (WPM)</h2>
              <TrendLineChart data={trend} dataKey="netWPM" xKey="label" xFormatter={(x) => x} unit="WPM" height={200} />
            </div>
          </Col>
          <Col md={6}>
            <div className="card-soft p-3">
              <h2 className="h6 fw-semibold mb-2">Accuracy by session (%)</h2>
              <TrendLineChart data={trend} dataKey="accuracy" xKey="label" xFormatter={(x) => x} unit="%" height={200} domain={[0, 100]} tone="success" />
            </div>
          </Col>
        </Row>
      )}

      <div className="card-soft p-0 overflow-hidden">
        {status === 'failed' && <div className="p-3"><ErrorAlert message={error} onRetry={() => dispatch(fetchHistory({ ...filters, page }))} /></div>}
        {status === 'loading' && !data && <Loader />}
        {data && !data.history.length && (
          <EmptyState title="No sessions found">
            {filters === EMPTY ? <>Start practising to build your history. <Link to="/practice">Practice now</Link></> : 'Try changing the filters.'}
          </EmptyState>
        )}
        {data?.history?.length > 0 && (
          <div className="table-responsive">
            <table className="table table-soft table-hover mb-0" data-testid="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Exercise</th>
                  <th>Lines</th>
                  <th>Speed (net / gross)</th>
                  <th>Accuracy</th>
                  <th>Time</th>
                  <th>Mistakes</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.history.map((h) => (
                  <tr key={h._id}>
                    <td className="small">{formatDate(h.startedAt)}</td>
                    <td>
                      <strong>{h.exerciseNumber}.</strong> <KrutiText text={h.title || ''} />
                    </td>
                    <td>
                      {h.completedLines}/{h.totalLines}
                    </td>
                    <td>
                      <strong>{h.netWPM}</strong> / {h.grossWPM} WPM
                    </td>
                    <td>{h.accuracy}%</td>
                    <td>{formatDuration(h.timeTaken)}</td>
                    <td>{h.mistakes}</td>
                    <td>
                      {h.completed ? (
                        <Badge className="badge-soft-success">Completed</Badge>
                      ) : (
                        <Link to={`/practice/${h.exerciseNumber}`} className="badge badge-soft-warning text-decoration-none">
                          Resume
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data?.pages > 1 && (
        <Pagination className="mt-3 justify-content-center">
          <Pagination.Prev disabled={page <= 1} onClick={() => setPage((p) => p - 1)} />
          <Pagination.Item active>
            {page} / {data.pages}
          </Pagination.Item>
          <Pagination.Next disabled={page >= data.pages} onClick={() => setPage((p) => p + 1)} />
        </Pagination>
      )}
    </div>
  )
}
