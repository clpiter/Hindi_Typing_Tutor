import { describe, test, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import LineTypingBox from '../components/LineTypingBox.jsx'
import HintModal from '../components/HintModal.jsx'
import Navbar from '../components/Navbar.jsx'
import { altCharactersFor } from '../utils/altKeys.js'
import { makeStore } from '../app/store.js'
import { getCookie } from '../utils/cookies.js'

describe('5 perfect repetitions in a row → next line', () => {
  const LINE = { lineNumber: 1, referenceText: 'कह कर', hint: '', keyboardRow: 'home' }
  function setup() {
    const onAutoNext = vi.fn()
    render(
      <LineTypingBox line={LINE} mode="kruti" completed={false} active hasNext onAutoNext={onAutoNext} onComplete={vi.fn()} onHint={vi.fn()} />,
    )
    const box = screen.getByTestId('typing-input-1')
    const type = (text) => {
      for (const ch of text) fireEvent.change(box, { target: { value: box.value + ch } })
    }
    return { onAutoNext, type }
  }

  test('moves on after the 5th perfect repetition, not before', () => {
    vi.useFakeTimers()
    try {
      const { onAutoNext, type } = setup()
      for (let i = 1; i <= 4; i++) type('dg dj ')
      expect(screen.getByTestId('streak-1')).toHaveTextContent('4/5')
      act(() => vi.advanceTimersByTime(2000))
      expect(onAutoNext).not.toHaveBeenCalled()
      type('dg dj ')
      expect(screen.getByTestId('streak-1')).toHaveTextContent('5/5')
      act(() => vi.advanceTimersByTime(1000))
      expect(onAutoNext).toHaveBeenCalledWith(1)
    } finally {
      vi.useRealTimers()
    }
  })

  test('a repetition with a mistake resets the streak', () => {
    const { onAutoNext, type } = setup()
    for (let i = 1; i <= 3; i++) type('dg dj ')
    type('dl dj ') // mistake
    expect(screen.queryByTestId('streak-1')).not.toBeInTheDocument()
    for (let i = 1; i <= 2; i++) type('dg dj ')
    expect(screen.getByTestId('streak-1')).toHaveTextContent('2/5')
    expect(onAutoNext).not.toHaveBeenCalled()
  })
})

describe('Alt-typed characters in hints', () => {
  test('lists only the characters that the line uses', () => {
    expect(altCharactersFor('कह कर')).toEqual([])
    const r = altCharactersFor('ऊँट')
    expect(r).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ meaning: 'ऊ', altCode: 'Alt + 0197', easy: 'm w' }),
        expect.objectContaining({ meaning: 'ँ', altCode: 'Alt + 0161', easy: 'Alt + W' }),
      ]),
    )
    expect(altCharactersFor('चट्टान')[0]).toMatchObject({ meaning: 'ट्ट', altCode: 'Alt + 0234' })
  })

  test('the hint modal shows the Alt table only when needed', () => {
    const { rerender } = render(
      <HintModal show onHide={vi.fn()} line={{ lineNumber: 1, referenceText: 'ऊपर ऊबना', hint: 'h', keyboardRow: 'top' }} />,
    )
    expect(screen.getByTestId('alt-keys')).toHaveTextContent('Alt + 0197')
    rerender(<HintModal show onHide={vi.fn()} line={{ lineNumber: 2, referenceText: 'कह कर', hint: 'h', keyboardRow: 'home' }} />)
    expect(screen.queryByTestId('alt-keys')).not.toBeInTheDocument()
  })
})

describe('light / dark mode toggle', () => {
  test('the top-bar button switches the theme and remembers it', () => {
    const store = makeStore({ settings: { soundEnabled: true, showKeyboard: true, inputMode: 'kruti', lineCelebration: true, theme: 'light' } })
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Navbar />
        </MemoryRouter>
      </Provider>,
    )
    fireEvent.click(screen.getByTestId('theme-toggle'))
    expect(store.getState().settings.theme).toBe('dark')
    expect(JSON.parse(getCookie('htt_prefs')).theme).toBe('dark')
    fireEvent.click(screen.getByTestId('theme-toggle'))
    expect(store.getState().settings.theme).toBe('light')
  })
})
