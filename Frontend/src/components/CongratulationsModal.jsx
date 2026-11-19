import { useEffect, useState } from 'react'
import { Modal, Button, Row, Col } from 'react-bootstrap'
import { FaTrophy, FaStar, FaArrowRight, FaRedo, FaHome } from 'react-icons/fa'
import KrutiText from './KrutiText.jsx'
import { formatDuration } from '../utils/stats.js'
import { LINE_MESSAGES, EXERCISE_MESSAGE } from '../utils/messages.js'


const COLORS = ['#f43f5e', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#facc15']

function Confetti({ count = 60 }) {
  const [pieces] = useState(
    () =>
      Array.from({ length: count }, (_, i) => ({
        left: Math.random() * 100,
        color: COLORS[i % COLORS.length],
        delay: Math.random() * 0.8,
        duration: 1.8 + Math.random() * 1.6,
        rotate: Math.random() * 360,
        w: 6 + Math.random() * 6,
      })),
  )
  return (
    <div className="confetti-layer" aria-hidden="true">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            background: p.color,
            width: p.w,
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            transform: `rotate(${p.rotate}deg)`,
          }}
        />
      ))}
    </div>
  )
}

function FloatingStars() {
  const stars = [
    { left: '8%', top: '20%', size: 16, delay: 0 },
    { left: '85%', top: '15%', size: 22, delay: 0.5 },
    { left: '18%', top: '70%', size: 12, delay: 1 },
    { left: '75%', top: '65%', size: 18, delay: 0.3 },
    { left: '50%', top: '8%', size: 14, delay: 0.8 },
  ]
  return stars.map((s, i) => (
    <FaStar key={i} className="floating-star" style={{ left: s.left, top: s.top, fontSize: s.size, animationDelay: `${s.delay}s` }} aria-hidden="true" />
  ))
}

/**
 * Non-blocking celebration after a perfect line. It does not take focus, so the
 * learner keeps typing on the next line; it disappears by itself.
 * `event` = { id, message } – a new id shows it exactly once.
 */
export function LineCelebration({ event, duration = 2600 }) {
  const [visible, setVisible] = useState(null)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    if (!event) return undefined
    // eslint-disable-next-line react-hooks/set-state-in-effect -- showing the toast is the effect of a new event
    setVisible(event)
    setLeaving(false)
    const t1 = setTimeout(() => setLeaving(true), duration - 400)
    const t2 = setTimeout(() => setVisible(null), duration)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [event, duration])

  if (!visible) return null
  return (
    <div className={`line-celebration ${leaving ? 'leaving' : ''}`} role="status" aria-live="polite" data-testid="line-celebration">
      <Confetti count={24} />
      <div className="d-flex align-items-center gap-2 justify-content-center">
        <FaTrophy className="text-warning" size={26} aria-hidden="true" />
        <KrutiText text={visible.message} className="fs-5" />
      </div>
    </div>
  )
}

/** Full modal shown when every line of an exercise is complete */
export default function CongratulationsModal({ show, onHide, stats, exercise, perfect, onNext, onRetry, onDashboard, hasNext }) {
  return (
    <Modal show={show} onHide={onHide} centered className="congrats-modal" aria-labelledby="congrats-title" data-testid="congrats-modal">
      <div className="congrats-header">
        <Confetti />
        <FloatingStars />
        <FaTrophy className="congrats-trophy" aria-hidden="true" />
        <h2 id="congrats-title" className="mt-2 mb-1 congrats-message">
          <KrutiText text={EXERCISE_MESSAGE} />
        </h2>
        {perfect && (
          <div className="mt-1">
            <KrutiText text={LINE_MESSAGES[1]} />
          </div>
        )}
        {exercise && (
          <div className="mt-2 opacity-75 small">
            <KrutiText text={`अभ्यास ${exercise.exerciseNumber} – ${exercise.title}`} />
          </div>
        )}
      </div>
      <Modal.Body className="p-4">
        {stats && (
          <Row className="g-3 text-center mb-3">
            {[
              ['Net WPM', stats.netWPM],
              ['Gross WPM', stats.grossWPM],
              ['Accuracy', `${stats.accuracy}%`],
              ['Mistakes', stats.mistakes ?? stats.incorrectCharacters ?? 0],
              ['Time', formatDuration(stats.timeTaken)],
              ['Characters', stats.totalCharacters],
            ].map(([label, value]) => (
              <Col xs={4} key={label}>
                <div className="fw-bold fs-4 text-primary">{value}</div>
                <div className="small text-muted">{label}</div>
              </Col>
            ))}
          </Row>
        )}
        <div className="d-flex flex-wrap gap-2 justify-content-center">
          {hasNext && (
            <Button className="btn-gradient" onClick={onNext} autoFocus>
              अगला अभ्यास / Next exercise <FaArrowRight />
            </Button>
          )}
          <Button variant="outline-primary" onClick={onRetry}>
            <FaRedo /> Practice again
          </Button>
          <Button variant="light" onClick={onDashboard}>
            <FaHome /> Dashboard
          </Button>
        </div>
      </Modal.Body>
    </Modal>
  )
}
