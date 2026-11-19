import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LineTypingBox from '../components/LineTypingBox.jsx'
import { unicodeToKruti } from '../utils/kruti/index.js'

const LINE = { lineNumber: 1, referenceText: 'कह कर', hint: '', keyboardRow: 'home' }

function setup(props = {}) {
  const onComplete = vi.fn()
  render(
    <LineTypingBox
      line={LINE}
      mode="kruti"
      completed={false}
      active
      onComplete={onComplete}
      onDraft={vi.fn()}
      onHint={vi.fn()}
      onNextKey={vi.fn()}
      onFocusLine={vi.fn()}
      {...props}
    />,
  )
  const box = screen.getByTestId(`typing-input-${(props.line || LINE).lineNumber}`)
  /** type key by key at the end of the box, like a learner */
  const type = (text) => {
    for (const ch of text) fireEvent.change(box, { target: { value: box.value + ch } })
  }
  return { box, onComplete, type }
}

const refStatuses = () =>
  Array.from(screen.getByTestId('reference-line').querySelectorAll('.ak:not(.ak-space)')).map((el) => el.dataset.status)
const overlay = () =>
  Array.from(screen.getByTestId('typing-overlay-1').querySelectorAll('.hl')).map((s) => [s.textContent, s.dataset.status])

describe('LineTypingBox – a box below each line', () => {
  test('renders the reference in the Kruti Dev font with its own box', () => {
    const { box } = setup()
    const refEl = screen.getByTestId('reference-line')
    expect(refEl).toHaveClass('kruti')
    expect(refEl.textContent).toContain(unicodeToKruti('कह'))
    expect(box).toHaveClass('kruti')
  })

  test('correct keys are green, a wrong key is red immediately (reference and box)', () => {
    const { type } = setup()
    type('d')
    expect(refStatuses()[0]).toBe('correct')
    type('l') // स instead of ह
    expect(refStatuses()[1]).toBe('incorrect')
    expect(overlay()).toEqual([
      ['d', 'correct'],
      ['l', 'error'],
    ])
    expect(screen.getByTestId('error-character')).toBeInTheDocument()
  })

  test('Space after the last word: reported once, cursor goes to a new line in the SAME box', () => {
    const { box, onComplete, type } = setup()
    type('dg dj')
    expect(onComplete).not.toHaveBeenCalled()
    expect(screen.getByTestId('press-space')).toBeInTheDocument()
    type(' ')
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete.mock.calls[0][0]).toBe(1)
    expect(onComplete.mock.calls[0][1]).toMatchObject({ perfect: true, accuracy: 100, totalCharacters: 6, repetition: 1 })
    expect(box.value).toBe('dg dj\n')
    expect(screen.getByTestId('repetitions')).toHaveTextContent('1 बार')
    // the same line can be typed again on the new line of the box
    type('dg dj ')
    expect(onComplete).toHaveBeenCalledTimes(2)
    expect(onComplete.mock.calls[1][1]).toMatchObject({ repetition: 2 })
    expect(box.value).toBe('dg dj\ndg dj\n')
    expect(box).not.toBeDisabled()
  })

  test('the last word is detected even with a mistake: Space finishes the line, the mistake stays red', () => {
    const { box, onComplete, type } = setup()
    type('dl dj') // कस कर – स is wrong
    expect(screen.getByTestId('press-space')).toHaveTextContent('पंक्ति का अंत')
    type(' ')
    expect(onComplete).toHaveBeenCalledTimes(1)
    const result = onComplete.mock.calls[0][1]
    expect(result).toMatchObject({ perfect: false, uncorrectedErrors: 1 })
    expect(result.incorrectCharacters).toBeGreaterThan(0)
    expect(result.accuracy).toBeLessThan(100)
    expect(box.value).toBe('dl dj\n')
    // the uncorrected mistake stays highlighted in the locked line
    const locked = Array.from(screen.getByTestId('typing-overlay-1').querySelectorAll('.hl-done-error')).map((e) => e.textContent)
    expect(locked).toEqual(['l'])
    expect(screen.getByTestId('line-cheer-1')).toHaveTextContent('गलतियाँ: 1')
  })

  test('a perfect line plays the "शाबाश" animation on the line', () => {
    const { type } = setup()
    type('dg dj ')
    expect(screen.getByTestId('line-cheer-1')).toHaveTextContent('शाबाश')
    expect(screen.getByTestId('line-1')).toHaveClass('cheer-perfect')
  })

  test('a word in the middle of the line does not end it early (repeated last word)', () => {
    const { onComplete, type } = setup({ line: { ...LINE, referenceText: 'कह कर कह कर कह कर' } })
    type('dg dj ') // "कर" is the last word but only 1/3 of the line
    expect(onComplete).not.toHaveBeenCalled()
    type('dg dj dg dj ')
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  test('skipped words are counted as mistakes when the line ends by its last word', () => {
    const { onComplete, type } = setup({ line: { ...LINE, referenceText: 'कहर कसर कयास सरकार हरकारा' } })
    // everything except "कयास" – the last word ends the line (≥ 70 % typed)
    type(['dgj', 'dlj', 'ljdkj', 'gjdkjk'].join(' ') + ' ')
    expect(onComplete).toHaveBeenCalledTimes(1)
    const result = onComplete.mock.calls[0][1]
    expect(result.perfect).toBe(false)
    expect(result.errorTypes.missing).toBeGreaterThan(0)
  })

  test('Enter always moves the cursor to the next line (finishes what is typed)', () => {
    const { box, onComplete, type } = setup()
    type('dg d')
    fireEvent.keyDown(box, { key: 'Enter', code: 'Enter' })
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete.mock.calls[0][1].perfect).toBe(false) // कर was not finished
    expect(box.value).toBe('dg d\n')
    // the unfinished part counts: र of the started word कर is a mistake
    expect(screen.getByTestId('line-cheer-1')).toHaveTextContent('गलतियाँ: 1')
  })

  test('Enter on an empty new line goes to the next exercise line', () => {
    const onGoNext = vi.fn()
    const { box, type } = setup({ onGoNext, hasNext: true })
    type('dg dj ')
    fireEvent.keyDown(box, { key: 'Enter', code: 'Enter' })
    expect(onGoNext).toHaveBeenCalledWith(1)
  })

  test('finished repetitions are locked: edits to them are rejected', () => {
    const { box, type } = setup()
    type('dg dj ')
    fireEvent.change(box, { target: { value: 'xg dj\nd' } })
    expect(box.value).toBe('dg dj\n')
  })

  test('a leading space on the new line is ignored (no mistake)', () => {
    const { box, type } = setup()
    type('dg dj ')
    type(' ')
    expect(box.value).toBe('dg dj\n')
    type('d')
    expect(refStatuses()[0]).toBe('correct')
  })

  test('an IME composition in progress never completes the line', () => {
    const { box, onComplete } = setup({ mode: 'unicode' })
    fireEvent.compositionStart(box)
    fireEvent.change(box, { target: { value: 'कह कर ' } })
    expect(onComplete).not.toHaveBeenCalled()
    fireEvent.compositionEnd(box, { target: { value: 'कह कर ' } })
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  test('the box grows to 7 lines on focus and returns to normal on blur', () => {
    const { box } = setup()
    expect(box).toHaveAttribute('rows', '1')
    fireEvent.focus(box)
    expect(box).toHaveAttribute('rows', '7')
    fireEvent.blur(box)
    expect(box).toHaveAttribute('rows', '1')
  })

  test('Alt+W types chandrabindu and m+w becomes the ऊ glyph', () => {
    const { box } = setup({ line: { ...LINE, referenceText: 'ऊँट' } })
    fireEvent.change(box, { target: { value: 'mw' } })
    expect(box.value).toBe('Å')
    fireEvent.keyDown(box, { key: 'w', code: 'KeyW', altKey: true })
    expect(box.value).toBe('Å¡')
  })

  test('paste is blocked', () => {
    const { box } = setup()
    const ev = new Event('paste', { bubbles: true, cancelable: true })
    box.dispatchEvent(ev)
    expect(ev.defaultPrevented).toBe(true)
  })
})
