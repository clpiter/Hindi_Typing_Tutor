import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Alert, Button, Form, Spinner, Row, Col } from 'react-bootstrap'
import { FaUserPlus } from 'react-icons/fa'
import { register, clearAuthError } from '../features/auth/authSlice.js'
import KrutiText from '../components/KrutiText.jsx'
import AuthAside from './AuthAside.jsx'
import { validateRegistration } from '../utils/validation.js'

export default function Register() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { loading, error, fieldErrors } = useSelector((s) => s.auth)
  const [form, setForm] = useState({ name: '', username: '', email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    dispatch(clearAuthError())
  }, [dispatch])

  const allErrors = { ...fieldErrors, ...errors }
  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }))
    if (errors[k]) setErrors((prev) => ({ ...prev, [k]: undefined }))
  }

  const onSubmit = async (ev) => {
    ev.preventDefault()
    const e = validateRegistration(form)
    setErrors(e)
    if (Object.keys(e).length) return
    const res = await dispatch(register({ ...form, name: form.name.trim(), username: form.username.trim(), email: form.email.trim() }))
    if (register.fulfilled.match(res)) navigate('/dashboard', { replace: true })
  }

  const field = (key, label, props = {}) => (
    <Form.Group className="mb-3" controlId={key}>
      <Form.Label>{label}</Form.Label>
      <Form.Control value={form[key]} onChange={set(key)} isInvalid={!!allErrors[key]} {...props} />
      <Form.Control.Feedback type="invalid">{allErrors[key]}</Form.Control.Feedback>
    </Form.Group>
  )

  return (
    <div className="auth-page">
      <AuthAside />
      <div className="auth-form-wrap">
        <div className="card-soft auth-card fade-up" style={{ maxWidth: 520 }}>
          <h2 className="fw-bold mb-1">Create your account</h2>
          <p className="text-muted mb-4">
            <KrutiText text="खाता बनाएँ और हिंदी टाइपिंग का अभ्यास शुरू करें।" />
          </p>
          {error && <Alert variant="danger">{error}</Alert>}
          <Form noValidate onSubmit={onSubmit}>
            {field('name', 'Full name', { autoComplete: 'name', autoFocus: true })}
            <Row>
              <Col sm={6}>{field('username', 'Username', { autoComplete: 'username' })}</Col>
              <Col sm={6}>{field('email', 'Email', { type: 'email', autoComplete: 'email' })}</Col>
            </Row>
            <Row>
              <Col sm={6}>{field('password', 'Password', { type: 'password', autoComplete: 'new-password' })}</Col>
              <Col sm={6}>{field('confirmPassword', 'Confirm password', { type: 'password', autoComplete: 'new-password' })}</Col>
            </Row>
            <Form.Text className="d-block mb-3">At least 8 characters with a letter and a number.</Form.Text>
            <Button type="submit" className="btn-gradient w-100 py-2" disabled={loading}>
              {loading ? <Spinner size="sm" /> : <FaUserPlus />} Register
            </Button>
          </Form>
          <p className="text-center text-muted mt-4 mb-0">
            Already registered? <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
