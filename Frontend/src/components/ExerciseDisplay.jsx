import { useState } from 'react'
import { Badge, Button, Collapse } from 'react-bootstrap'
import { FaChevronDown, FaChevronUp, FaKeyboard } from 'react-icons/fa'
import KrutiText from './KrutiText.jsx'
import { ROW_NAMES } from '../utils/kruti/index.js'

const LEVEL = { beginner: 'success', intermediate: 'warning', advanced: 'danger' }

/**
 * Exercise display.
 *  part="header"       – exercise number + title + badges (compact; used in the
 *                        sticky practice header so it stays visible while scrolling)
 *  part="instructions" – description and the collapsible Hindi instruction panel
 */
export default function ExerciseDisplay({ exercise, part = 'header', defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  if (!exercise) return null

  if (part === 'header') {
    return (
      <div className="exercise-header d-flex flex-wrap align-items-center gap-2" data-testid="exercise-header">
        <h1 className="h5 mb-0 me-auto text-truncate">
          <KrutiText text={`अभ्यास-${exercise.exerciseNumber}: ${exercise.title}`} />
          <span className="small text-muted fw-normal ms-2 d-none d-md-inline">{exercise.titleEnglish}</span>
        </h1>
        <Badge bg="primary" className="d-flex align-items-center gap-1">
          <FaKeyboard /> {ROW_NAMES[exercise.keyboardRow]?.en}
        </Badge>
        {exercise.shiftPractice && <Badge bg="warning" text="dark">Shift</Badge>}
        <Badge bg={LEVEL[exercise.difficulty] || 'secondary'} className="text-capitalize d-none d-sm-inline">
          {exercise.difficulty}
        </Badge>
      </div>
    )
  }

  return (
    <div className="card-soft p-3 mb-3 fade-up">
      <div className="text-muted small">
        Exercise {exercise.exerciseNumber} · PDF page {exercise.sourcePage} — <KrutiText text={exercise.description} />
      </div>
      <Button variant="link" className="px-0" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="exercise-instructions">
        {open ? <FaChevronUp /> : <FaChevronDown />} निर्देश / Instructions
      </Button>
      <Collapse in={open}>
        <div id="exercise-instructions">
          <ul className="instruction-panel mb-0 ps-3">
            {exercise.instructions?.map((t, i) => (
              <li key={i}>
                <KrutiText text={t} />
              </li>
            ))}
          </ul>
          <div className="small text-muted mt-2">
            Keyboard shortcuts: <span className="key-cap">Alt+H</span> hint · <span className="key-cap">Alt+R</span> reset line ·{' '}
            <span className="key-cap">Alt+N</span> / <span className="key-cap">Alt+P</span> next / previous exercise · <span className="key-cap">Alt+K</span> keyboard ·{' '}
            <span className="key-cap">Alt+M</span> sound · <span className="key-cap">Alt+↓/↑</span> next/previous line · <span className="key-cap">Alt+W</span> ँ
          </div>
        </div>
      </Collapse>
    </div>
  )
}
