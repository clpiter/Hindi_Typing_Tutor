import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Alert, Button, Form, InputGroup, Spinner } from 'react-bootstrap'
import { FaEye, FaEyeSlash, FaSignInAlt, FaUser, FaLock } from 'react-icons/fa'
import { login, clearAuthError } from '../features/auth/authSlice.js'
import KrutiText from '../components/KrutiText.jsx'
import AuthAside from './AuthAside.jsx'

export default function Login() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { loading, error } = useSelector((s) => s.auth)
  const [form, setForm] = useState({ identifier: '', password: '' })
  const [errors, setErrors] = useState({})
  const [showPw, setShowPw] = useState(false)

  useEffect(() => {
    dispatch(clearAuthError())
  }, [dispatch])

  const validate = () => {
    const e = {}
    if (!form.identifier.trim()) e.identifier = 'Enter your email or username'
    if (!form.password) e.password = 'Enter your password'
    setErrors(e)
    return !Object.keys(e).length
  }

  const onSubmit = async (ev) => {
    ev.preventDefault()
    if (!validate()) return
    const res = await dispatch(login({ identifier: form.identifier.trim(), password: form.password }))
    if (login.fulfilled.match(res)) navigate(location.state?.from?.pathname || '/dashboard', { replace: true })
  }

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <div className="auth-page">
      <AuthAside />
      <div className="auth-form-wrap">
        <div className="card-soft auth-card fade-up">
          <h2 className="fw-bold mb-1">Welcome back</h2>
          <p className="text-muted mb-4">
            <KrutiText text="फिर से स्वागत है! अभ्यास जारी रखने के लिए लॉग इन करें।" />
          </p>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form noValidate onSubmit={onSubmit}>
            <Form.Group className="mb-3" controlId="identifier">
              <Form.Label>Email or username</Form.Label>
              <InputGroup hasValidation>
                <InputGroup.Text>
                  <FaUser />
                </InputGroup.Text>
                <Form.Control
                  value={form.identifier}
                  onChange={set('identifier')}
                  isInvalid={!!errors.identifier}
                  autoComplete="username"
                  autoFocus
                  placeholder="you@example.com"
                />
                <Form.Control.Feedback type="invalid">{errors.identifier}</Form.Control.Feedback>
              </InputGroup>
            </Form.Group>
            <Form.Group className="mb-4" controlId="password">
              <Form.Label>Password</Form.Label>
              <InputGroup hasValidation>
                <InputGroup.Text>
                  <FaLock />
                </InputGroup.Text>
                <Form.Control
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={set('password')}
                  isInvalid={!!errors.password}
                  autoComplete="current-password"
                />
                <Button variant="outline-secondary" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Hide password' : 'Show password'}>
                  {showPw ? <FaEyeSlash /> : <FaEye />}
                </Button>
                <Form.Control.Feedback type="invalid">{errors.password}</Form.Control.Feedback>
              </InputGroup>
            </Form.Group>
            <Button type="submit" className="btn-gradient w-100 py-2" disabled={loading}>
              {loading ? <Spinner size="sm" /> : <FaSignInAlt />} Log in
            </Button>
          </Form>
          <p className="text-center text-muted mt-4 mb-0">
            New here? <Link to="/register">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
