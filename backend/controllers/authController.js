const User = require('../models/User')
const ApiError = require('../utils/ApiError')
const logger = require('../config/logger')
const { signToken, setAuthCookie, clearAuthCookie } = require('../utils/tokenUtils')

const publicUser = (user) => user.toJSON()

/** POST /api/auth/register */
async function register(req, res) {
  const { name, username, email, password } = req.body

  const existing = await User.find({ $or: [{ email }, { username }] }).select('email username').lean()
  const errors = []
  if (existing.some((u) => u.email === email)) errors.push({ field: 'email', message: 'This email is already registered' })
  if (existing.some((u) => u.username === username)) errors.push({ field: 'username', message: 'This username is already taken' })
  if (errors.length) throw ApiError.conflict(errors[0].message, errors)

  const user = await User.create({ name, username, email, password })
  setAuthCookie(res, signToken(user._id))
  logger.info('User registered', { userId: user._id.toString(), username })
  res.status(201).json({ success: true, message: 'Registration successful', user: publicUser(user) })
}

/** POST /api/auth/login  – identifier is an email or a username */
async function login(req, res) {
  const identifier = String(req.body.identifier).trim().toLowerCase()
  const { password } = req.body
  const query = identifier.includes('@') ? { email: identifier } : { username: identifier }

  const user = await User.findOne(query).select('+password')
  const ok = user ? await user.comparePassword(password) : false
  if (!ok) {
    logger.warn('Failed login attempt', { identifier, ip: req.ip })
    throw ApiError.unauthorized('Invalid email/username or password')
  }

  user.lastLoginAt = new Date()
  await user.save({ validateModifiedOnly: true })
  setAuthCookie(res, signToken(user._id))
  logger.info('User logged in', { userId: user._id.toString() })
  res.json({ success: true, message: 'Login successful', user: publicUser(user) })
}

/** POST /api/auth/logout */
async function logout(req, res) {
  clearAuthCookie(res)
  if (req.user) logger.info('User logged out', { userId: req.user._id.toString() })
  res.json({ success: true, message: 'Logged out' })
}

/** GET /api/auth/me */
async function me(req, res) {
  res.json({ success: true, user: publicUser(req.user) })
}

/** GET /api/auth/csrf – returns the CSRF token (also set as a cookie) */
async function csrf(req, res) {
  res.json({ success: true, csrfToken: req.csrfToken })
}

/** PATCH /api/auth/preferences */
async function updatePreferences(req, res) {
  const allowed = ['soundEnabled', 'showKeyboard', 'lineCelebration', 'inputMode', 'theme', 'lastExerciseId', 'lastLineNumber']
  for (const key of allowed) {
    if (req.body[key] !== undefined) req.user.preferences[key] = req.body[key]
  }
  await req.user.save({ validateModifiedOnly: true })
  logger.debug('Preferences updated', { userId: req.user._id.toString() })
  res.json({ success: true, preferences: req.user.preferences })
}

module.exports = { register, login, logout, me, csrf, updatePreferences }
