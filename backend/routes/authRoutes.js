const express = require('express')
const rateLimit = require('express-rate-limit')
const { register, login, logout, me, csrf, updatePreferences } = require('../controllers/authController')
const { protect } = require('../middleware/authMiddleware')
const { validate, registerRules, loginRules, preferencesRules } = require('../middleware/validationMiddleware')

const router = express.Router()

// Brute-force protection for credential endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.AUTH_RATE_LIMIT) || 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, message: 'Too many attempts. Please try again in 15 minutes.' },
})

router.get('/csrf', csrf)
router.post('/register', authLimiter, registerRules, validate, register)
router.post('/login', authLimiter, loginRules, validate, login)
router.post('/logout', logout)
router.get('/me', protect, me)
router.patch('/preferences', protect, preferencesRules, validate, updatePreferences)

module.exports = router
