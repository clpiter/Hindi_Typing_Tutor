const crypto = require('crypto')
const ApiError = require('../utils/ApiError')
const { CSRF_COOKIE, generateCsrfToken, setCsrfCookie } = require('../utils/tokenUtils')

const SAFE = new Set(['GET', 'HEAD', 'OPTIONS'])

function safeEqual(a, b) {
  const ba = Buffer.from(String(a))
  const bb = Buffer.from(String(b))
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb)
}

/**
 * Double-submit cookie CSRF protection.
 * - Every response makes sure a readable `csrf_token` cookie exists.
 * - State-changing requests must echo it in the `X-CSRF-Token` header.
 * A cross-site page can neither read the cookie nor set the custom header, so a
 * forged request is rejected. This complements the SameSite auth cookie.
 */
function csrfProtection(req, res, next) {
  let token = req.cookies?.[CSRF_COOKIE]
  if (!token) {
    token = generateCsrfToken()
    setCsrfCookie(res, token)
  }
  req.csrfToken = token
  if (SAFE.has(req.method)) return next()

  const header = req.get('x-csrf-token')
  if (!header || !req.cookies?.[CSRF_COOKIE] || !safeEqual(header, req.cookies[CSRF_COOKIE])) {
    return next(ApiError.forbidden('Invalid or missing CSRF token. Please refresh the page and try again.'))
  }
  return next()
}

module.exports = { csrfProtection }
