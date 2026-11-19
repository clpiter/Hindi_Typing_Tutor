const path = require('path')
const fs = require('fs')
const express = require('express')
const helmet = require('helmet')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const rateLimit = require('express-rate-limit')
const mongoose = require('mongoose')

const logger = require('./config/logger')
const authRoutes = require('./routes/authRoutes')
const exerciseRoutes = require('./routes/exerciseRoutes')
const progressRoutes = require('./routes/progressRoutes')
const { csrfProtection } = require('./middleware/csrfMiddleware')
const { notFound, errorHandler } = require('./middleware/errorMiddleware')

function createApp() {
  const app = express()
  const isProd = process.env.NODE_ENV === 'production'
  if (isProd) app.set('trust proxy', 1)
  app.disable('x-powered-by')

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          fontSrc: ["'self'", 'data:'],
          imgSrc: ["'self'", 'data:'],
          mediaSrc: ["'self'", 'data:'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'"],
        },
      },
    }),
  )
  app.use(
    cors({
      origin: (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim()),
      credentials: true,
      allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    }),
  )
  app.use(express.json({ limit: '50kb' }))
  app.use(cookieParser())

  app.use(
    '/api',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: Number(process.env.API_RATE_LIMIT) || 1000,
      standardHeaders: 'draft-7',
      legacyHeaders: false,
      message: { success: false, message: 'Too many requests. Please slow down.' },
    }),
  )

  app.get('/api/health', (req, res) => {
    res.json({ success: true, status: 'ok', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' })
  })

  app.use('/api', csrfProtection)
  app.use('/api/auth', authRoutes)
  app.use('/api/exercises', exerciseRoutes)
  app.use('/api/progress', progressRoutes)
  app.use('/api', notFound)

  // In production the built frontend can be served by the API server
  const dist = path.join(__dirname, '..', 'frontend', 'dist')
  if (isProd && fs.existsSync(dist)) {
    app.use(express.static(dist, { maxAge: '7d', index: false }))
    app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')))
    logger.info('Serving frontend build from ' + dist)
  }

  app.use(notFound)
  app.use(errorHandler)
  return app
}

module.exports = { createApp }
