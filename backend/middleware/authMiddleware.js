const User = require('../models/User')
const ApiError = require('../utils/ApiError')
const logger = require('../config/logger')
const { AUTH_COOKIE, verifyToken, clearAuthCookie } = require('../utils/tokenUtils')

/** Requires a valid JWT in the HTTP-only auth cookie */
async function protect(req, res, next) {
  const token = req.cookies?.[AUTH_COOKIE]
  if (!token) return next(ApiError.unauthorized())
  try {
    const payload = verifyToken(token)
    const user = await User.findById(payload.sub)
    if (!user) {
      clearAuthCookie(res)
      return next(ApiError.unauthorized('User no longer exists. Please log in again.'))
    }
    req.user = user
    return next()
  } catch (err) {
    if (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError' || err.name === 'NotBeforeError') {
      logger.info('Rejected invalid/expired auth token', { reason: err.name, ip: req.ip })
      clearAuthCookie(res)
      return next(ApiError.unauthorized(err.name === 'TokenExpiredError' ? 'Session expired. Please log in again.' : undefined))
    }
    return next(err)
  }
}

module.exports = { protect }
