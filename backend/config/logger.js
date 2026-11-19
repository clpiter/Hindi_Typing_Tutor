const path = require('path')
const fs = require('fs')
const winston = require('winston')

const env = process.env.NODE_ENV || 'development'
const LOG_DIR = path.join(__dirname, '..', 'logs')

// Keys that must never reach a log file
const SENSITIVE = /^(password|confirmPassword|token|jwt|authorization|cookie|cookies|secret|csrf.*)$/i

function redact(value, depth = 0) {
  if (!value || typeof value !== 'object' || depth > 5) return value
  if (Array.isArray(value)) return value.map((v) => redact(v, depth + 1))
  const out = {}
  for (const [k, v] of Object.entries(value)) {
    out[k] = SENSITIVE.test(k) ? '[REDACTED]' : redact(v, depth + 1)
  }
  return out
}

const redactFormat = winston.format((info) => {
  for (const key of Object.keys(info)) {
    if (SENSITIVE.test(key)) info[key] = '[REDACTED]'
    else if (info[key] && typeof info[key] === 'object') info[key] = redact(info[key])
  }
  return info
})

const devFormat = winston.format.combine(
  redactFormat(),
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const rest = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : ''
    return `${timestamp} ${level}: ${message}${rest}${stack ? '\n' + stack : ''}`
  }),
)

const prodFormat = winston.format.combine(
  redactFormat(),
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
)

const transports = []
if (env === 'test') {
  transports.push(new winston.transports.Console({ silent: true }))
} else if (env === 'production') {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })
  transports.push(
    new winston.transports.Console({ format: prodFormat }),
    new winston.transports.File({ filename: path.join(LOG_DIR, 'error.log'), level: 'error', maxsize: 5_000_000, maxFiles: 5 }),
    new winston.transports.File({ filename: path.join(LOG_DIR, 'combined.log'), maxsize: 10_000_000, maxFiles: 5 }),
  )
} else {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true })
  transports.push(
    new winston.transports.Console({ format: devFormat }),
    new winston.transports.File({ filename: path.join(LOG_DIR, 'dev.log'), format: prodFormat, maxsize: 5_000_000, maxFiles: 2 }),
  )
}

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (env === 'production' ? 'info' : 'debug'),
  format: prodFormat,
  transports,
  exitOnError: false,
})

logger.redact = redact
module.exports = logger
