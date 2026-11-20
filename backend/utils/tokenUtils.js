const jwt = require('jsonwebtoken')
const crypto = require('crypto')

const AUTH_COOKIE = 'token'
const CSRF_COOKIE = 'csrf_token'

const isProd = () => process.env.NODE_ENV === 'production'
/** Secure cookies need HTTPS. COOKIE_SECURE=false only for a plain-http install. */
const secureCookies = () => isProd() && process.env.COOKIE_SECURE !== 'false'

function getSecret() {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 16) {
    throw new Error('JWT_SECRET must be set to a long random string (backend/.env or backend/.env.production)')
  }
  return secret
}

/** "1d" / "12h" / "30m" / "45s" / "3600" -> milliseconds */
function durationToMs(value = '1d') {
  const m = String(value).trim().match(/^(\d+)\s*([smhd]?)$/i)
  if (!m) return 24 * 60 * 60 * 1000
  const n = Number(m[1])
  const unit = (m[2] || 's').toLowerCase()
  return n * { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[unit]
}

function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, getSecret(), {
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    algorithm: 'HS256',
  })
}

function verifyToken(token) {
  return jwt.verify(token, getSecret(), { algorithms: ['HS256'] })
}

function cookieBase() {
  return {
    secure: secureCookies(),
    // Production: Strict (site and API on the same domain). Set COOKIE_SAMESITE=none
    // only when the frontend is on a different domain than the API (cross-site
    // requests); that also requires Secure cookies (HTTPS).
    // Development: Lax, so the Vite dev server proxy and direct localhost access work.
    sameSite: isProd() ? (process.env.COOKIE_SAMESITE || 'strict').toLowerCase() : 'lax',
    path: '/',
  }
}

function setAuthCookie(res, token) {
  res.cookie(AUTH_COOKIE, token, {
    ...cookieBase(),
    httpOnly: true,
    maxAge: durationToMs(process.env.JWT_EXPIRES_IN || '1d'),
  })
}

function clearAuthCookie(res) {
  res.clearCookie(AUTH_COOKIE, { ...cookieBase(), httpOnly: true })
}

/** CSRF token for the double-submit cookie pattern (readable by JS on purpose) */
function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex')
}

function setCsrfCookie(res, token) {
  res.cookie(CSRF_COOKIE, token, { ...cookieBase(), httpOnly: false, maxAge: 7 * 86_400_000 })
}

module.exports = {
  AUTH_COOKIE,
  CSRF_COOKIE,
  signToken,
  verifyToken,
  setAuthCookie,
  clearAuthCookie,
  generateCsrfToken,
  setCsrfCookie,
  durationToMs,
}
