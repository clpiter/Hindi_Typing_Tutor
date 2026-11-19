import { describe, test, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Routes, Route } from 'react-router-dom'

const apiMock = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }))
vi.mock('../services/api.js', () => ({
  default: apiMock,
  ensureCsrf: vi.fn(() => Promise.resolve('t')),
  setUnauthorizedHandler: vi.fn(),
  getErrorMessage: (e) => e?.response?.data?.message || e?.message || 'error',
  getFieldErrors: () => ({}),
}))

const { makeStore } = await import('../app/store.js')
const { default: ProtectedRoute } = await import('../components/ProtectedRoute.jsx')
const { default: Login } = await import('../pages/Login.jsx')
const { validateRegistration } = await import('../utils/validation.js')

function renderAt(path, auth) {
  const store = makeStore({ auth: { user: null, initialized: true, loading: false, error: null, fieldErrors: {}, ...auth } })
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<div>DASHBOARD PAGE</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </Provider>,
  )
  return store
}

beforeEach(() => {
  apiMock.post.mockReset()
})

describe('protected routes', () => {
  test('redirects anonymous users to /login', () => {
    renderAt('/dashboard')
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
    expect(screen.queryByText('DASHBOARD PAGE')).not.toBeInTheDocument()
  })

  test('renders the page for an authenticated user', () => {
    renderAt('/dashboard', { user: { _id: '1', name: 'A', username: 'a' } })
    expect(screen.getByText('DASHBOARD PAGE')).toBeInTheDocument()
  })

  test('waits for session restore before deciding', () => {
    renderAt('/dashboard', { initialized: false })
    expect(screen.getByText(/Restoring your session/)).toBeInTheDocument()
  })
})

describe('login', () => {
  test('validates empty fields without calling the API', () => {
    renderAt('/login')
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))
    expect(screen.getByText('Enter your email or username')).toBeInTheDocument()
    expect(apiMock.post).not.toHaveBeenCalled()
  })

  test('successful login redirects to the dashboard', async () => {
    apiMock.post.mockResolvedValue({ data: { user: { _id: '1', name: 'A', username: 'a', preferences: {} } } })
    renderAt('/login')
    fireEvent.change(screen.getByLabelText('Email or username'), { target: { value: 'a@example.com' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'abcd1234' } })
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))
    expect(await screen.findByText('DASHBOARD PAGE')).toBeInTheDocument()
    expect(apiMock.post).toHaveBeenCalledWith('/auth/login', { identifier: 'a@example.com', password: 'abcd1234' })
  })

  test('shows the server error for wrong credentials', async () => {
    apiMock.post.mockRejectedValue({ response: { status: 401, data: { message: 'Invalid email/username or password' } } })
    renderAt('/login')
    fireEvent.change(screen.getByLabelText('Email or username'), { target: { value: 'a' } })
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /log in/i }))
    await waitFor(() => expect(screen.getByText('Invalid email/username or password')).toBeInTheDocument())
  })
})

describe('registration validation', () => {
  test('flags every invalid field', () => {
    const e = validateRegistration({ name: 'A', username: 'x!', email: 'bad', password: 'short', confirmPassword: 'other' })
    expect(Object.keys(e).sort()).toEqual(['confirmPassword', 'email', 'name', 'password', 'username'])
  })
  test('accepts a valid form', () => {
    expect(validateRegistration({ name: 'Asha', username: 'asha_1', email: 'a@b.co', password: 'abcd1234', confirmPassword: 'abcd1234' })).toEqual({})
  })
})
