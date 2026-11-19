import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Row, Col, Form } from 'react-bootstrap'
import { FaClock, FaCheckCircle, FaTrophy, FaBullseye, FaCalendarAlt } from 'react-icons/fa'
import { fetchDashboard } from '../features/progress/progressSlice.js'
import { savePreference } from '../features/settings/settingsSlice.js'
import StatCard from '../components/StatCard.jsx'
import Loader from '../components/Loader.jsx'
import KrutiText from '../components/KrutiText.jsx'
import { formatDate, formatDuration } from '../utils/stats.js'

export default function Profile() {
  const dispatch = useDispatch()
  const user = useSelector((s) => s.auth.user)
  const settings = useSelector((s) => s.settings)
  const d = useSelector((s) => s.progress.dashboard.data)

  useEffect(() => {
    dispatch(fetchDashboard())
  }, [dispatch])

  if (!user) return <Loader />
  const toggle = (key) => (e) => dispatch(savePreference({ [key]: e.target.checked }))

  return (
    <div>
      <h1 className="page-title">Profile</h1>
      <p className="page-subtitle">
        <KrutiText text="आपकी जानकारी और अभ्यास सारांश" />
      </p>
      <Row className="g-3">
        <Col lg={4}>
          <div className="card-soft p-4 text-center h-100">
            <div
              className="rounded-circle mx-auto mb-3 d-grid text-white fw-bold"
              style={{ width: 84, height: 84, placeItems: 'center', fontSize: '2rem', background: 'linear-gradient(135deg,#4f46e5,#2563eb)' }}
            >
              {user.name?.[0]?.toUpperCase()}
            </div>
            <h2 className="h5 mb-0">{user.name}</h2>
            <div className="text-muted">@{user.username}</div>
            <div className="text-muted small">{user.email}</div>
            <hr />
            <div className="small text-muted d-flex justify-content-center align-items-center gap-2">
              <FaCalendarAlt /> Registered on {formatDate(user.createdAt, { dateStyle: 'long' })}
            </div>
            {user.lastLoginAt && <div className="small text-muted mt-1">Last login {formatDate(user.lastLoginAt)}</div>}
          </div>
        </Col>
        <Col lg={8}>
          <Row className="g-3 mb-3">
            <Col sm={6}>
              <StatCard icon={FaClock} label="Total practice time" value={d ? formatDuration(d.totalPracticeTime) : '…'} color="#0891b2" bg="#ecfeff" />
            </Col>
            <Col sm={6}>
              <StatCard icon={FaCheckCircle} label="Completed exercises" value={d ? `${d.completedExercises} / ${d.totalExercises}` : '…'} color="#16a34a" bg="#ecfdf5" />
            </Col>
            <Col sm={6}>
              <StatCard icon={FaTrophy} label="Best typing speed" value={d ? `${d.bestSpeed} WPM` : '…'} color="#ca8a04" bg="#fefce8" />
            </Col>
            <Col sm={6}>
              <StatCard icon={FaBullseye} label="Average accuracy" value={d ? `${d.averageAccuracy}%` : '…'} />
            </Col>
          </Row>
          <div className="card-soft p-3">
            <h2 className="h6 fw-semibold mb-3">Practice preferences</h2>
            <Form.Check type="switch" id="pref-sound" label="Success sound" checked={settings.soundEnabled} onChange={toggle('soundEnabled')} className="mb-2" />
            <Form.Check type="switch" id="pref-keyboard" label="Show on-screen keyboard" checked={settings.showKeyboard} onChange={toggle('showKeyboard')} className="mb-2" />
            <Form.Check
              type="switch"
              id="pref-celebration"
              label="Celebration popup after every perfect line"
              checked={settings.lineCelebration}
              onChange={toggle('lineCelebration')}
              className="mb-3"
            />
            <Form.Label className="small">Input mode</Form.Label>
            <Form.Select value={settings.inputMode} onChange={(e) => dispatch(savePreference({ inputMode: e.target.value }))} style={{ maxWidth: 320 }}>
              <option value="kruti">Kruti Dev – Remington keys on an English keyboard</option>
              <option value="unicode">Unicode – Hindi IME (Inscript / phonetic)</option>
            </Form.Select>
            <div className="small text-muted mt-2">Preferences are stored in a browser cookie and in your account.</div>
          </div>
        </Col>
      </Row>
    </div>
  )
}
