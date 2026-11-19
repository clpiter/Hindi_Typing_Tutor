process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = process.env.JWT_SECRET_TEST || 'test_secret_that_is_long_enough_123456'
process.env.JWT_EXPIRES_IN = '1h'
process.env.BCRYPT_ROUNDS = '4'
process.env.AUTH_RATE_LIMIT = '1000'
process.env.CLIENT_URL = 'http://localhost:5173'

const mongoose = require('mongoose')
const request = require('supertest')
const { createApp } = require('../app')
const { seedExercises } = require('../seed/seed')

// Uses a separate database; it is dropped before each test file runs.
const TEST_URI = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/hindi_typing_tutor_test'

async function setupDb() {
  await mongoose.connect(TEST_URI, { serverSelectionTimeoutMS: 5000 })
  await mongoose.connection.dropDatabase()
  await Promise.all(Object.values(mongoose.models).map((m) => m.syncIndexes()))
  await seedExercises()
}

async function teardownDb() {
  await mongoose.connection.dropDatabase()
  await mongoose.connection.close()
}

/** supertest agent that keeps cookies and sends the CSRF header automatically */
async function makeAgent(app = createApp()) {
  const agent = request.agent(app)
  const res = await agent.get('/api/auth/csrf')
  const csrf = res.body.csrfToken
  const wrap = (method) => (url) => agent[method](url).set('X-CSRF-Token', csrf)
  return { agent, csrf, app, post: wrap('post'), patch: wrap('patch'), get: (url) => agent.get(url) }
}

let counter = 0
function newUser(overrides = {}) {
  counter += 1
  const id = `${Date.now().toString(36)}${counter}`
  return {
    name: 'Test Learner',
    username: `learner_${id}`,
    email: `learner_${id}@example.com`,
    password: 'abcd1234',
    confirmPassword: 'abcd1234',
    ...overrides,
  }
}

async function registeredAgent() {
  const a = await makeAgent()
  const user = newUser()
  const res = await a.post('/api/auth/register').send(user)
  if (res.status !== 201) throw new Error('register failed: ' + JSON.stringify(res.body))
  return { ...a, user: res.body.user, credentials: user }
}

module.exports = { setupDb, teardownDb, makeAgent, newUser, registeredAgent, createApp }
