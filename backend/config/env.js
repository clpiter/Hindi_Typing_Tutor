/**
 * Loads environment variables before anything else reads them.
 *
 * Two env files exist:
 *   backend/.env             development  (node server.js / npm run dev)
 *   backend/.env.production  production   (node server.js --production / npm run start:prod)
 *
 * Production is selected by the --production flag or NODE_ENV=production (the flag
 * exists because "NODE_ENV=production node …" does not work in the Windows command
 * prompt). In production only .env.production is read, so development values can
 * never leak in.
 *
 * On hosting platforms (Render, Railway, Heroku …) the env files are not deployed
 * (they are git-ignored); the settings come from the platform's environment
 * variables instead, so a missing file is fine there.
 */
const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

const ROOT = path.join(__dirname, '..')

function loadEnv() {
  const production = process.argv.includes('--production') || process.env.NODE_ENV === 'production'
  const file = production ? '.env.production' : '.env'
  const full = path.join(ROOT, file)
  const found = fs.existsSync(full)

  // values already set in the real environment (e.g. by the hosting platform) win
  if (found) dotenv.config({ path: full, quiet: true })
  if (production) process.env.NODE_ENV = 'production'
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development'
  return { mode: process.env.NODE_ENV, file: found ? file : 'environment variables' }
}

/** Refuse to start production with missing or unsafe settings */
function assertProductionConfig() {
  if (process.env.NODE_ENV !== 'production') return []
  const where = 'set it in backend/.env.production or in your hosting dashboard (Environment)'
  const problems = []
  const secret = process.env.JWT_SECRET || ''
  if (secret.length < 32 || /replace_with/i.test(secret)) problems.push(`JWT_SECRET must be a long random value (≥ 32 characters) – ${where}`)
  if (!process.env.MONGO_URI) problems.push(`MONGO_URI is not set – ${where}`)
  if (!process.env.CLIENT_URL) problems.push(`CLIENT_URL is not set (the public URL of the site, e.g. https://your-app.onrender.com) – ${where}`)
  return problems
}

module.exports = { loadEnv, assertProductionConfig }
