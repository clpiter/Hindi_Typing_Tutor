import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { createRequire } from 'module'
import { unicodeToKruti } from '../utils/kruti/index.js'

const require = createRequire(import.meta.url)
const { exercises } = require('../../../backend/seed/exerciseData.js')

const EXERCISE = {
  _id: 'ex1',
  exerciseNumber: 1,
  title: exercises[0].title,
  titleEnglish: exercises[0].titleEnglish,
  description: exercises[0].description,
  keyboardRow: 'home',
  instructions: exercises[0].instructions,
  difficulty: 'beginner',
  sourcePage: 73,
  lines: exercises[0].lines.slice(0, 3).map((t, i) => ({ lineNumber: i + 1, referenceText: t, hint: 'hint', keyboardRow: 'home' })),
}

// ---- API mock -------------------------------------------------------------
const apiMock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }))
vi.mock('../services/api.js', () => ({
  default: apiMock,
  ensureCsrf: vi.fn(() => Promise.resolve('t')),
  setUnauthorizedHandler: vi.fn(),
  getErrorMessage: (e) => e?.message || 'error',
  getFieldErrors: () => ({}),
}))
const soundMock = vi.hoisted(() => ({ playSuccessSound: vi.fn(() => Promise.resolve('mp3')) }))
vi.mock('../utils/sound.js', () => soundMock)

const { makeStore } = await import('../app/store.js')
const { default: Practice } = await import('../pages/Practice.jsx')

const USER = { _id: 'u1', name: 'Test', username: 'test', preferences: {} }

function renderPractice(preferences = {}) {
  const store = makeStore({
    auth: { user: USER, initialized: true, loading: false, error: null, fieldErrors: {} },
    settings: { soundEnabled: true, showKeyboard: true, inputMode: 'kruti', lineCelebration: true, ...preferences },
  })
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/practice/1']}>
        <Routes>
          <Route path="/practice/:exerciseNumber" element={<Practice />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )
  return store
}

let saveCount = 0
beforeEach(() => {
  saveCount = 0
  apiMock.get.mockReset()
  apiMock.post.mockReset()
  soundMock.playSuccessSound.mockClear()
  apiMock.get.mockImplementation((url) => {
    if (url === '/exercises/number/1') return Promise.resolve({ data: { exercise: EXERCISE } })
    if (url === '/exercises') return Promise.resolve({ data: { exercises: [{ ...EXERCISE, lines: undefined }, { _id: 'ex2', exerciseNumber: 2 }] } })
    if (url === '/progress/ex1') return Promise.resolve({ data: { current: null, lastCompleted: null } })
    return Promise.reject(new Error('unexpected GET ' + url))
  })
  apiMock.post.mockImplementation((url, body) => {
    if (url === '/progress/save') {
      saveCount += 1
      const done = saveCount >= EXERCISE.lines.length
      return Promise.resolve({
        data: {
          exerciseCompleted: done,
          lineResult: { lineNumber: body.lineNumber, netWPM: 20, accuracy: body.incorrectCharacters ? 90 : 100, timeTaken: body.timeTaken, totalCharacters: body.totalCharacters, incorrectCharacters: body.incorrectCharacters, mistakes: body.mistakes },
          progress: { netWPM: 20, grossWPM: 22, accuracy: 100, mistakes: 0, timeTaken: 30, totalCharacters: 90, incorrectCharacters: 0 },
        },
      })
    }
    return Promise.resolve({ data: {} })
  })
})

/** type into line n's own box, key by key, at its end */
const typeLine = (n, text) => {
  const box = screen.getByTestId(`typing-input-${n}`)
  for (const ch of text) fireEvent.change(box, { target: { value: box.value + ch } })
  return box
}
const kruti = (n) => unicodeToKruti(EXERCISE.lines[n - 1].referenceText, { mode: 'typable' })
const done = (n) => screen.getByTestId(`line-${n}`).dataset.completed

describe('Practice page', () => {
  test('every reference line has its own input box below it', async () => {
    renderPractice()
    for (const l of EXERCISE.lines) expect(await screen.findByTestId(`typing-input-${l.lineNumber}`)).toBeInTheDocument()
    expect(screen.getAllByRole('textbox')).toHaveLength(3)
    expect(screen.getAllByTestId('reference-line')).toHaveLength(3)
    expect(screen.getByTestId('virtual-keyboard')).toBeInTheDocument()
    // the exercise title lives in the sticky header together with the toolbar
    const header = screen.getByTestId('practice-header')
    expect(header).toHaveClass('practice-toolbar')
    expect(header).toHaveTextContent('अभ्यास-1')
  })

  test('perfect line + Space: saved, likes + sound + Hindi popup; cursor stays in the same box on a new line', async () => {
    renderPractice()
    const box = await screen.findByTestId('typing-input-1')
    await waitFor(() => expect(document.activeElement).toBe(box), { timeout: 2000 })
    typeLine(1, kruti(1) + ' ')

    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith('/progress/save', expect.objectContaining({ exerciseId: 'ex1', lineNumber: 1, incorrectCharacters: 0 })))
    expect(done(1)).toBe('true')
    expect(screen.getByTestId('flying-likes')).toBeInTheDocument()
    expect(soundMock.playSuccessSound).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('line-celebration')).toHaveTextContent('बहुत बढ़िया')
    // focus does NOT jump to line 2: the same box keeps it, with a new line started
    await new Promise((r) => setTimeout(r, 400))
    expect(document.activeElement).toBe(box)
    expect(box.value.endsWith('\n')).toBe(true)
    expect(box).toHaveAttribute('rows', '7')
    expect(screen.getByTestId('typing-input-2')).toHaveAttribute('rows', '1')
  })

  test('typing the same line again in its box saves another result', async () => {
    renderPractice()
    await screen.findByTestId('typing-input-1')
    typeLine(1, kruti(1) + ' ')
    typeLine(1, kruti(1) + ' ')
    await waitFor(() => expect(apiMock.post.mock.calls.filter(([u, b]) => u === '/progress/save' && b.lineNumber === 1)).toHaveLength(2))
    expect(screen.getByTestId('typing-input-1').value.split('\n')).toHaveLength(3) // 2 repetitions + new empty line
  })

  test('"next line" button and Alt+↓ move to the next box only when asked', async () => {
    renderPractice()
    await screen.findByTestId('typing-input-1')
    typeLine(1, kruti(1) + ' ')
    fireEvent.click(await screen.findByTestId('go-next-1'))
    await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('typing-input-2')))
    fireEvent.keyDown(window, { key: 'ArrowDown', code: 'ArrowDown', altKey: true })
    await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('typing-input-3')))
  })

  test('line with mistakes: no likes, no sound, no popup – but it still saves after correction', async () => {
    renderPractice()
    const box = await screen.findByTestId('typing-input-1')
    typeLine(1, 'x') // wrong first key
    expect(done(1)).toBe('false')
    fireEvent.change(box, { target: { value: '' } })
    typeLine(1, kruti(1) + ' ')
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith('/progress/save', expect.objectContaining({ lineNumber: 1, incorrectCharacters: 1 })))
    expect(screen.queryByTestId('flying-likes')).not.toBeInTheDocument()
    expect(screen.queryByTestId('line-celebration')).not.toBeInTheDocument()
    expect(soundMock.playSuccessSound).not.toHaveBeenCalled()
  })

  test('sound OFF setting suppresses the success sound', async () => {
    renderPractice({ soundEnabled: false })
    await screen.findByTestId('typing-input-1')
    typeLine(1, kruti(1) + ' ')
    await waitFor(() => expect(apiMock.post).toHaveBeenCalled())
    expect(soundMock.playSuccessSound).not.toHaveBeenCalled()
    expect(screen.getByTestId('flying-likes')).toBeInTheDocument()
  })

  test('a line with a mistake ends at its last word: saved with the mistake, no likes', async () => {
    renderPractice()
    await screen.findByTestId('typing-input-1')
    const text = kruti(1)
    const box = typeLine(1, text.slice(0, -1) + 'x ')
    await waitFor(() => expect(apiMock.post).toHaveBeenCalledWith('/progress/save', expect.objectContaining({ lineNumber: 1 })))
    const payload = apiMock.post.mock.calls.find(([u]) => u === '/progress/save')[1]
    expect(payload.incorrectCharacters).toBeGreaterThan(0)
    expect(done(1)).toBe('true')
    expect(box.value.endsWith('\n')).toBe(true)
    expect(screen.queryByTestId('flying-likes')).not.toBeInTheDocument()
    expect(soundMock.playSuccessSound).not.toHaveBeenCalled()
  })

  test('completing every line shows the Hindi congratulations modal once', async () => {
    renderPractice()
    await screen.findByTestId('typing-input-1')
    for (const n of [1, 2, 3]) typeLine(n, kruti(n) + ' ')
    expect(await screen.findByTestId('congrats-modal')).toBeInTheDocument()
    expect(screen.getAllByText(/बधाई हो/)).toHaveLength(1)
    expect(apiMock.post.mock.calls.filter(([u]) => u === '/progress/save')).toHaveLength(3)
  })

  test('restores completed lines from saved progress and focuses the first open line', async () => {
    apiMock.get.mockImplementation((url) => {
      if (url === '/exercises/number/1') return Promise.resolve({ data: { exercise: EXERCISE } })
      if (url === '/exercises') return Promise.resolve({ data: { exercises: [] } })
      if (url === '/progress/ex1')
        return Promise.resolve({ data: { current: { completedLines: [1], lineResults: [{ lineNumber: 1, netWPM: 18, accuracy: 100, timeTaken: 20, totalCharacters: 30, incorrectCharacters: 0, mistakes: 0 }] } } })
      return Promise.reject(new Error(url))
    })
    renderPractice()
    await waitFor(() => expect(done(1)).toBe('true'))
    await waitFor(() => expect(document.activeElement).toBe(screen.getByTestId('typing-input-2')), { timeout: 2000 })
  })
})

describe('exercise navigation', () => {
  test('Previous is disabled on exercise 1, Next is enabled', async () => {
    renderPractice()
    await screen.findByTestId('typing-input-1')
    expect(screen.getByTestId('prev-exercise')).toBeDisabled()
    expect(screen.getByTestId('next-exercise')).not.toBeDisabled()
  })
})
