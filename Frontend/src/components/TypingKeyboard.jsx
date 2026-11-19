import { memo, useEffect, useState } from 'react'
import { KEYBOARD_ROWS, describeKey } from '../utils/kruti/index.js'

/**
 * Interactive Remington / Kruti Dev keyboard (inspired by the keyboard figure on
 * PDF page 72). Each key shows the English key, its normal Kruti glyph and its
 * Shift glyph; the glyphs are the key's own ASCII character drawn with the Kruti
 * Dev font, so labels always match what the key types.
 *
 * Props
 *  nextKey      { ch } | { backspace:true } | null – key to highlight
 *  practiceRow  'home' | 'top' | 'bottom' | 'number' – row of the exercise
 *  onKey(ch)    click handler (inserts the character into the active line)
 *  onBackspace()
 */
function TypingKeyboard({ nextKey, practiceRow, onKey, onBackspace, compact = false }) {
  const [shift, setShift] = useState(false)
  const [pressed, setPressed] = useState(null)

  // mirror the physical keyboard
  useEffect(() => {
    const down = (e) => {
      if (e.key === 'Shift') setShift(true)
      setPressed(e.code)
    }
    const up = (e) => {
      if (e.key === 'Shift') setShift(false)
      setPressed(null)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  const target = nextKey?.ch ? describeKey(nextKey.ch) : null
  const wantBackspace = !!nextKey?.backspace

  const press = (key) => {
    const ch = shift ? key.shifted : key.normal
    onKey?.(ch)
    if (shift) setShift(false)
  }

  return (
    <div
      className={`vk ${compact ? 'vk-compact' : ''}`}
      data-testid="virtual-keyboard"
      aria-label="Kruti Dev keyboard"
      // keep focus (and the expanded size) in the typing box while clicking keys
      onMouseDown={(e) => e.preventDefault()}
    >
      {KEYBOARD_ROWS.map((row, ri) => (
        <div className="vk-row" key={row.row}>
          {ri === 1 && <span className="vk-key vk-wide d-none d-md-grid" style={{ placeItems: 'center' }}>Tab</span>}
          {ri === 2 && <span className="vk-key vk-wide d-none d-md-grid" style={{ placeItems: 'center' }}>Caps</span>}
          {ri === 3 && (
            <button
              type="button"
              className={`vk-key vk-wide ${shift ? 'vk-pressed' : ''} ${target?.shiftKey === 'ShiftLeft' ? 'vk-shift-next' : ''}`}
              onClick={() => setShift((s) => !s)}
              aria-pressed={shift}
            >
              ⇧ Shift
            </button>
          )}
          {row.keys.map((k) => {
            const isNext = target && target.code === k.code
            const cls = [
              'vk-key',
              `vk-finger-${k.finger}`,
              isNext ? 'vk-next' : '',
              practiceRow === row.row ? 'vk-practice-row' : '',
              pressed === k.code ? 'vk-pressed' : '',
            ].join(' ')
            return (
              <button
                type="button"
                key={k.code}
                className={cls}
                onClick={() => press(k)}
                data-code={k.code}
                data-next={isNext ? 'true' : undefined}
                title={`${k.label}  (Shift: ${k.shifted})`}
                aria-label={`Key ${k.label}`}
              >
                <span className="vk-en">{k.label}</span>
                <span className="vk-shift kruti">{k.shifted}</span>
                <span className="vk-main kruti">{k.normal}</span>
              </button>
            )
          })}
          {ri === 0 && (
            <button type="button" className={`vk-key vk-wide ${wantBackspace ? 'vk-backspace-next' : ''}`} onClick={onBackspace} data-testid="vk-backspace">
              ⌫ Back
            </button>
          )}
          {ri === 2 && (
            <span className="vk-key vk-wide d-none d-md-grid" style={{ placeItems: 'center' }}>
              Enter ↵
            </span>
          )}
          {ri === 3 && (
            <button
              type="button"
              className={`vk-key vk-wide ${shift ? 'vk-pressed' : ''} ${target?.shiftKey === 'ShiftRight' ? 'vk-shift-next' : ''}`}
              onClick={() => setShift((s) => !s)}
            >
              Shift ⇧
            </button>
          )}
        </div>
      ))}
      <div className="vk-row">
        {target?.alt && <span className="vk-key vk-wide vk-shift-next d-grid" style={{ placeItems: 'center' }}>Alt</span>}
        <button
          type="button"
          className={`vk-key vk-space ${target?.code === 'Space' ? 'vk-next' : ''}`}
          onClick={() => onKey?.(' ')}
          data-code="Space"
        >
          <span className="vk-en">Space</span>
        </button>
      </div>
      {target && (
        <div className="text-center small mt-1 text-muted">
          अगली कुँजी / Next key: <span className="key-cap">{target.combo}</span>{' '}
          <span className="kruti kruti-inline">{target.char}</span>
        </div>
      )}
      {wantBackspace && <div className="text-center small mt-1 text-danger">गलती सुधारें – Backspace दबाएँ</div>}
    </div>
  )
}

export default memo(TypingKeyboard)
