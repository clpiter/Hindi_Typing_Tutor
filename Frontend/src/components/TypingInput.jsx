import { useLayoutEffect, useRef, useState } from 'react'
import { applyLigaturesAtCaret } from '../utils/kruti/index.js'

/** Minimum height (in text lines) of the typing box while it is focused */
const FOCUSED_ROWS = 7

/**
 * Text box for one practice line.
 *
 * Kruti Dev mode (default): the learner keeps an ENGLISH (US) keyboard layout and
 * types the Remington key sequence; the box uses the Kruti Dev font so each key
 * shows its Hindi glyph. Extra keys:
 *   Alt + W        → ँ (chandrabindu, Kruti code ¡ – same as Alt+0161 on Windows)
 *   u + ू (m w)    → ऊ  (auto-ligatures, see utils/kruti/ligatures.js)
 * Unicode mode: for learners using a Hindi IME (Windows Hindi keyboard, Google
 * Input Tools …). IME composition is tracked; evaluation/completion waits for
 * compositionend so an unfinished composition can never complete a line.
 */
export default function TypingInput({
  value,
  onChange,
  onCompositionChange,
  onCapsLock,
  onEnter,
  highlights,
  minCaret = 0,
  mode = 'kruti',
  disabled = false,
  status = '',
  inputRef,
  lineNumber,
  onFocus,
  placeholder,
}) {
  const localRef = useRef(null)
  const ref = inputRef || localRef
  const pendingCaret = useRef(null)
  const composing = useRef(false)
  // The box grows to at least FOCUSED_ROWS lines while it has focus and goes back
  // to its normal size when focus leaves it.
  const [focused, setFocused] = useState(false)
  const rows = focused && !disabled ? FOCUSED_ROWS : 1

  // auto-grow (paragraph lines wrap over several rows; the `rows` attribute sets the minimum)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    // resetting the height to "auto" briefly shrinks the page; keep the scroll position
    const scrollY = window.scrollY
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight + 2}px`
    if (window.scrollY !== scrollY) window.scrollTo(window.scrollX, scrollY)
    if (pendingCaret.current != null && document.activeElement === el) {
      el.setSelectionRange(pendingCaret.current, pendingCaret.current)
      pendingCaret.current = null
    }
  }, [value, ref, rows])

  const emit = (next, caret, meta = {}) => {
    pendingCaret.current = caret
    onChange(next, { composing: composing.current, ...meta })
  }

  const handleChange = (e) => {
    const el = e.target
    // keep "\n": in the single exercise box it separates the finished lines
    let next = el.value.replace(/\r/g, '').replace(/\t/g, ' ')
    // No line starts with a space: a space/Enter pressed out of habit right after the
    // previous line auto-advanced here is ignored instead of counting as a mistake.
    if (!value && next.trim() === '') return
    let caret = el.selectionStart ?? next.length
    const rawLength = Array.from(next).length
    if (mode === 'kruti' && !composing.current) {
      const r = applyLigaturesAtCaret(next, caret)
      next = r.value
      caret = r.caret
    }
    emit(next, caret, { rawLength })
  }

  const insertAtCaret = (text) => {
    const el = ref.current
    const start = el.selectionStart ?? value.length
    const end = el.selectionEnd ?? value.length
    const next = value.slice(0, start) + text + value.slice(end)
    emit(next, start + text.length, { rawLength: Array.from(value).length - (end - start) + Array.from(text).length })
  }

  const handleKeyDown = (e) => {
    if (onCapsLock && e.getModifierState) onCapsLock(e.getModifierState('CapsLock'))
    if (e.key === 'Enter') {
      // the learner never types a new line; Enter finishes a correctly typed line (like Space)
      e.preventDefault()
      onEnter?.()
      return
    }
    // finished lines are locked: Backspace/Delete cannot reach into them
    if (minCaret && (e.key === 'Backspace' || e.key === 'Delete')) {
      const el = e.target
      const collapsed = el.selectionStart === el.selectionEnd
      if (el.selectionStart < minCaret || (e.key === 'Backspace' && collapsed && el.selectionStart <= minCaret)) {
        e.preventDefault()
        return
      }
    }
    if (mode === 'kruti' && e.altKey && !e.ctrlKey && e.code === 'KeyW') {
      e.preventDefault()
      insertAtCaret('¡')
    }
  }

  const fontClass = mode === 'kruti' ? 'kruti' : 'unicode hindi-unicode'
  const overlay = highlights && highlights.length > 0 && !disabled

  return (
    <div className={`typing-input-wrap ${overlay ? 'has-overlay' : ''}`}>
      {/* Mirror of the typed text, coloured per akshara: mistakes are highlighted
          inside the box. The textarea above it has transparent text, so only the
          caret and selection come from the textarea itself. */}
      {overlay && (
        <div className={`typing-input typing-backdrop ${fontClass}`} aria-hidden="true" data-testid={`typing-overlay-${lineNumber}`}>
          {highlights.map((h, i) => (
            <span key={i} className={`hl hl-${h.status}`} data-status={h.status}>
              {h.text}
            </span>
          ))}
          {'​'}
        </div>
      )}
    <textarea
      ref={ref}
      rows={rows}
      className={`typing-input ${fontClass} ${status} ${rows > 1 ? 'is-expanded' : ''}`}
      value={value}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onFocus={(e) => {
        setFocused(true)
        onFocus?.(e)
      }}
      onBlur={() => setFocused(false)}
      onSelect={(e) => {
        // keep the cursor on the line being typed (finished lines are locked)
        const el = e.target
        if (minCaret && el.selectionStart < minCaret) el.setSelectionRange(el.value.length, el.value.length)
      }}
      data-rows={rows}
      onCompositionStart={() => {
        composing.current = true
        onCompositionChange?.(true)
      }}
      onCompositionEnd={(e) => {
        composing.current = false
        onCompositionChange?.(false, e.target.value)
      }}
      onPaste={(e) => e.preventDefault()}
      onDrop={(e) => e.preventDefault()}
      disabled={disabled}
      readOnly={disabled}
      spellCheck={false}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      lang={mode === 'kruti' ? 'en' : 'hi'}
      inputMode="text"
      placeholder={placeholder}
      aria-label={lineNumber === 'box' ? 'Typing box for this exercise' : `Typing box for line ${lineNumber}`}
      data-testid={`typing-input-${lineNumber}`}
    />
    </div>
  )
}
