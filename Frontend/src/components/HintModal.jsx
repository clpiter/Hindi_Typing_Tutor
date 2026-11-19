import { useMemo } from 'react'
import { Modal, Table, Badge } from 'react-bootstrap'
import KrutiText from './KrutiText.jsx'
import TypingKeyboard from './TypingKeyboard.jsx'
import { altCharactersFor } from '../utils/altKeys.js'
import {
  unicodeToKrutiClusters,
  keysForSequence,
  FINGER_NAMES,
  HAND_NAMES,
  ROW_NAMES,
} from '../utils/kruti/index.js'

const FINGER_COLORS = { 1: '#f472b6', 2: '#fb923c', 3: '#34d399', 4: '#60a5fa', 5: '#a78bfa' }

const GENERAL_TIPS = [
  'अपनी उंगलियों को होम कीज़ पर रखें।',
  'गलत अक्षर को सुधारने के बाद ही अगली पंक्ति पर जाएँ।',
  'शिफ्ट कुंजी का प्रयोग आधे अक्षरों को टाइप करने के लिए करें।',
  'छोटी इ की मात्रा (ि) व्यंजन से पहले टाइप होती है, जबकि रेफ (र्) अक्षर के बाद।',
]

/**
 * Hint for one line: row/hand/finger table for every key the line needs, the
 * keystroke sequence for each word, the line's Hindi hint and a keyboard.
 */
export default function HintModal({ show, onHide, line, exercise, nextKey }) {
  const clusters = useMemo(() => (line ? unicodeToKrutiClusters(line.referenceText, { mode: 'typable' }) : []), [line])
  const sequence = clusters.map((c) => c.k).join('')
  const altChars = useMemo(() => (line ? altCharactersFor(line.referenceText) : []), [line])
  const keys = useMemo(() => keysForSequence(sequence).filter((k) => k.code !== 'Space'), [sequence])
  const words = useMemo(() => {
    if (!line) return []
    const out = []
    let cur = { u: '', k: '' }
    for (const c of clusters) {
      if (c.u === ' ') {
        if (cur.u) out.push(cur)
        cur = { u: '', k: '' }
      } else {
        cur.u += c.u
        cur.k += c.k
      }
    }
    if (cur.u) out.push(cur)
    return out.slice(0, 12)
  }, [clusters, line])

  if (!line) return null
  return (
    <Modal show={show} onHide={onHide} size="xl" centered scrollable aria-labelledby="hint-title">
      <Modal.Header closeButton>
        <Modal.Title id="hint-title" className="fs-5">
          💡 Hint – {exercise ? `अभ्यास ${exercise.exerciseNumber}, ` : ''}पंक्ति {line.lineNumber}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="p-3 rounded-3 bg-primary-soft mb-3">
          <KrutiText text={line.referenceText} className="d-block kruti-lg" />
        </div>

        <div className="row g-3">
          <div className="col-lg-6">
            <h6 className="fw-semibold">संकेत (Hint)</h6>
            <p className="mb-2">
              <KrutiText text={line.hint || ''} />
            </p>
            <p className="mb-2 small text-muted">
              Row: <Badge bg="primary">{ROW_NAMES[line.keyboardRow]?.en}</Badge>{' '}
              <KrutiText text={ROW_NAMES[line.keyboardRow]?.hi || ''} />
              {exercise?.shiftPractice && <Badge bg="warning" text="dark" className="ms-2">Shift practice</Badge>}
            </p>

            <h6 className="fw-semibold mt-3">कुँजी क्रम (key sequence)</h6>
            <Table size="sm" bordered className="hint-table mb-3">
              <tbody>
                {words.map((w, i) => (
                  <tr key={i}>
                    <td style={{ width: '40%' }}>
                      <KrutiText text={w.u} />
                    </td>
                    <td>
                      {Array.from(w.k).map((ch, j) => {
                        const d = keysForSequence(ch)[0]
                        return (
                          <span key={j} className="key-cap me-1 mb-1" title={d ? d.combo : ch}>
                            {d ? d.combo : ch}
                          </span>
                        )
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>

            {altChars.length > 0 && (
              <div className="mb-3" data-testid="alt-keys">
                <h6 className="fw-semibold">
                  <KrutiText text="Alt से टाइप होने वाले अक्षर" /> (this line)
                </h6>
                <Table size="sm" bordered className="hint-table mb-1 align-middle">
                  <thead>
                    <tr>
                      <th>Glyph</th>
                      <th>अक्षर</th>
                      <th>Alt code</th>
                      <th>
                        <KrutiText text="आसान तरीका" />
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {altChars.map((a) => (
                      <tr key={a.glyph}>
                        <td className="kruti" style={{ fontSize: '1.5rem' }}>
                          {a.glyph}
                        </td>
                        <td className="hindi-unicode">{a.meaning}</td>
                        <td>
                          <span className="key-cap">{a.altCode}</span>
                        </td>
                        <td>{a.easy === '—' ? '—' : <span className="key-cap">{a.easy}</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
                <div className="small text-muted">
                  <KrutiText text="Alt कोड के लिए Num Lock चालू रखें, Alt दबाए रखें और न्यूमेरिक कीपैड से अंक टाइप करें।" />
                </div>
              </div>
            )}

            <h6 className="fw-semibold">सामान्य निर्देश</h6>
            <ul className="instruction-panel small ps-3">
              {GENERAL_TIPS.map((t) => (
                <li key={t}>
                  <KrutiText text={t} />
                </li>
              ))}
              <li>
                Matras: <span className="key-cap">k</span> ा · <span className="key-cap">f</span> ि (before consonant) ·{' '}
                <span className="key-cap">h</span> ी · <span className="key-cap">q</span> ु · <span className="key-cap">w</span> ू ·{' '}
                <span className="key-cap">s</span> े · <span className="key-cap">S</span> ै · <span className="key-cap">ks</span> ो ·{' '}
                <span className="key-cap">kS</span> ौ · <span className="key-cap">a</span> ं · <span className="key-cap">Alt+W</span> ँ
              </li>
              <li>
                Half letters: Shift + key (क् = <span className="key-cap">D</span>); others add halant{' '}
                <span className="key-cap">~</span>. Reph र् = <span className="key-cap">Z</span> after the letter; rakar ्र ={' '}
                <span className="key-cap">z</span>.
              </li>
              <li>
                Conjuncts: क्ष <span className="key-cap">{'{'}k</span> · त्र <span className="key-cap">=</span> · ज्ञ{' '}
                <span className="key-cap">K</span> · श्र <span className="key-cap">J</span> · द्ध <span className="key-cap">)</span> · द्य{' '}
                <span className="key-cap">|</span> · द्व <span className="key-cap">{'}'}</span>
              </li>
            </ul>
          </div>

          <div className="col-lg-6">
            <h6 className="fw-semibold">कौन-सी उंगली? (Which finger?)</h6>
            <Table size="sm" hover className="hint-table align-middle">
              <thead>
                <tr>
                  <th>Key</th>
                  <th>Glyph</th>
                  <th>Hand</th>
                  <th>Finger</th>
                  <th>Shift</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.combo}>
                    <td>
                      <span className="key-cap">{k.combo}</span>
                    </td>
                    <td className="kruti" style={{ fontSize: '1.4rem' }}>
                      {k.char}
                    </td>
                    <td>
                      <KrutiText text={HAND_NAMES[k.hand].hi} />
                    </td>
                    <td>
                      <span className="finger-dot" style={{ background: FINGER_COLORS[k.finger] }} />
                      <KrutiText text={FINGER_NAMES[k.finger].hi} />
                    </td>
                    <td className="small">
                      {k.shift ? (k.shiftKey === 'ShiftRight' ? 'Right Shift' : 'Left Shift') : k.alt ? 'Alt' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>

        <TypingKeyboard nextKey={nextKey} practiceRow={line.keyboardRow} />
        <div className="small text-muted mt-2">
          Finger colours:{' '}
          {[1, 2, 3, 4].map((f) => (
            <span key={f} className="me-3">
              <span className="finger-dot" style={{ background: FINGER_COLORS[f] }} />
              {f} – {FINGER_NAMES[f].en}
            </span>
          ))}
        </div>
      </Modal.Body>
    </Modal>
  )
}
