const logger = require('../config/logger')

function notFound(req, res, next) {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` })
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  let status = err.statusCode || err.status || 500
  let message = err.message || 'Internal server error'
  let details = err.details

  if (err.name === 'CastError') {
    status = 400
    message = `Invalid ${err.path}: ${err.value}`
  } else if (err.name === 'ValidationError' && err.errors) {
    status = 400
    message = 'Validation failed'
    details = Object.values(err.errors).map((e) => ({ field: e.path, message: e.message }))
  } else if (err.code === 11000) {
    status = 409
    const field = Object.keys(err.keyValue || err.keyPattern || {})[0] || 'field'
    message = `${field} already exists`
    details = [{ field, message }]
  } else if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    status = 401
    message = 'Not authenticated. Please log in.'
  } else if (err.type === 'entity.parse.failed') {
    status = 400
    message = 'Malformed JSON body'
  } else if (err.type === 'entity.too.large') {
    status = 413
    message = 'Request body too large'
  } else if (err.name === 'MongoServerSelectionError' || err.name === 'MongoNetworkError') {
    status = 503
    message = 'Database unavailable. Please try again later.'
  }

  const logMeta = { status, method: req.method, url: req.originalUrl, userId: req.user?._id?.toString() }
  if (status >= 500) logger.error(err.message, { ...logMeta, stack: err.stack })
  else logger.warn(`API error: ${message}`, logMeta)

  const body = { success: false, message: status >= 500 && process.env.NODE_ENV === 'production' ? 'Internal server error' : message }
  if (details) body.errors = details
  res.status(status).json(body)
}

module.exports = { notFound, errorHandler }
