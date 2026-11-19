/**
 * Loads environment variables before anything else reads them.
 *
 *   node server.js               → development: backend/.env
 *   node server.js --production  → production:  backend/.env.production only
 *   NODE_ENV=production node …   → same as --production
 *
 * The --production flag exists because "NODE_ENV=production node …" does not
 * work in the Windows command prompt. In production only .env.production is
 * read, so development values (local database, dev secret) can never leak in.
 */
const fs = require('fs')
const path = require('path')
const dotenv = require('dotenv')

const ROOT = path.join(__dirname, '..')

function loadEnv() {
  const production = process.argv.includes('--production') || process.env.NODE_ENV === 'production'
  const file = production ? '.env.production' : '.env'
  const full = path.join(ROOT, file)

  if (fs.existsSync(full)) {
    dotenv.config({ path: full, quiet: true })
  } else if (production) {
    throw new Error('backend/.env.production is missing – copy .env.production.example and fill it in')
  }
  if (production) process.env.NODE_ENV = 'production'
  if (!process.env.NODE_ENV) process.env.NODE_ENV = 'development'
  return { mode: process.env.NODE_ENV, file: fs.existsSync(full) ? file : null }
}

/** Refuse to start production with unsafe settings */
function assertProductionConfig() {
  if (process.env.NODE_ENV !== 'production') return []
  const problems = []
  const secret = process.env.JWT_SECRET || ''
  if (secret.length < 32 || /replace_with/i.test(secret)) problems.push('JWT_SECRET must be a long random value (≥ 32 characters)')
  if (!process.env.MONGO_URI) problems.push('MONGO_URI is not set')
  if (!process.env.CLIENT_URL) problems.push('CLIENT_URL is not set (the public URL of the site)')
  return problems
}

module.exports = { loadEnv, assertProductionConfig }
