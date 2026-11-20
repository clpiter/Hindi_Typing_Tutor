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
const { findFrontendDir } = require('./utils/paths')

function createApp() {
  const app = express()
  const isProd = process.env.NODE_ENV === 'production'
  // behind a reverse proxy / load balancer (Render, Nginx, …) the client IP and
  // https flag come from X-Forwarded-* headers
  if (isProd) app.set('trust proxy', Number(process.env.TRUST_PROXY ?? 1))
  const httpsSite = isProd && process.env.COOKIE_SECURE !== 'false'
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
          // only ask browsers to upgrade to https when the site really is https
          upgradeInsecureRequests: httpsSite ? [] : null,
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
  const frontendDir = findFrontendDir()
  const dist = frontendDir && path.join(frontendDir, 'dist')
  if (isProd && dist && fs.existsSync(path.join(dist, 'index.html'))) {
    app.use(express.static(dist, { maxAge: '7d', index: false }))
    app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(dist, 'index.html')))
    logger.info('Serving frontend build from ' + dist)
  } else if (isProd) {
    logger.warn(`No frontend build found (${dist || 'frontend folder missing'}) – only the API is served. Run "npm run build" in the frontend folder.`)
  }

  app.use(notFound)
  app.use(errorHandler)
  return app
}

module.exports = { createApp }
