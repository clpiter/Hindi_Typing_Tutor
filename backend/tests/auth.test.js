const { describe, test, before, after } = require('node:test')
const { expect } = require('expect')
const request = require('supertest')
const { setupDb, teardownDb, makeAgent, newUser, createApp } = require('./helpers')
const { signToken } = require('../utils/tokenUtils')
const jwt = require('jsonwebtoken')

before(setupDb)
after(teardownDb)

describe('Registration', () => {
  test('registers a user, hashes the password and sets an HTTP-only cookie', async () => {
    const a = await makeAgent()
    const user = newUser()
    const res = await a.post('/api/auth/register').send(user)
    expect(res.status).toBe(201)
    expect(res.body.user.username).toBe(user.username)
    expect(res.body.user.password).toBeUndefined()
    const cookie = res.headers['set-cookie'].find((c) => c.startsWith('token='))
    expect(cookie).toMatch(/HttpOnly/i)
    expect(cookie).toMatch(/SameSite=Lax/i)

    const User = require('../models/User')
    const stored = await User.findOne({ username: user.username }).select('+password')
    expect(stored.password).not.toBe(user.password)
    expect(stored.password).toMatch(/^\$2[aby]\$/)
  })

  test('rejects duplicate email and username with 409', async () => {
    const a = await makeAgent()
    const user = newUser()
    await a.post('/api/auth/register').send(user).expect(201)
    const b = await makeAgent()
    const res = await b.post('/api/auth/register').send({ ...user })
    expect(res.status).toBe(409)
    const fields = res.body.errors.map((e) => e.field).sort()
    expect(fields).toEqual(['email', 'username'])
  })

  test('validates fields', async () => {
    const a = await makeAgent()
    const res = await a.post('/api/auth/register').send({
      name: 'A',
      username: 'bad name!',
      email: 'not-an-email',
      password: 'short',
      confirmPassword: 'different',
    })
    expect(res.status).toBe(400)
    const fields = res.body.errors.map((e) => e.field)
    expect(fields).toEqual(expect.arrayContaining(['name', 'username', 'email', 'password', 'confirmPassword']))
  })

  test('rejects state-changing requests without the CSRF header', async () => {
    const res = await request(createApp()).post('/api/auth/register').send(newUser())
    expect(res.status).toBe(403)
  })
})

describe('Login / logout / me', () => {
  let creds
  before(async () => {
    const a = await makeAgent()
    creds = newUser()
    await a.post('/api/auth/register').send(creds).expect(201)
  })

  test('logs in with email', async () => {
    const a = await makeAgent()
    const res = await a.post('/api/auth/login').send({ identifier: creds.email, password: creds.password })
    expect(res.status).toBe(200)
    expect(res.body.user.email).toBe(creds.email)
    expect(res.body.user.password).toBeUndefined()
  })

  test('logs in with username (case-insensitive) and keeps the session for /me', async () => {
    const a = await makeAgent()
    await a.post('/api/auth/login').send({ identifier: creds.username.toUpperCase(), password: creds.password }).expect(200)
    const me = await a.get('/api/auth/me')
    expect(me.status).toBe(200)
    expect(me.body.user.username).toBe(creds.username)
  })

  test('rejects a wrong password', async () => {
    const a = await makeAgent()
    const res = await a.post('/api/auth/login').send({ identifier: creds.email, password: 'wrongpass1' })
    expect(res.status).toBe(401)
    expect(res.headers['set-cookie']?.some((c) => c.startsWith('token=ey'))).toBeFalsy()
  })

  test('logout clears the cookie and /me becomes 401', async () => {
    const a = await makeAgent()
    await a.post('/api/auth/login').send({ identifier: creds.email, password: creds.password }).expect(200)
    await a.post('/api/auth/logout').expect(200)
    await a.get('/api/auth/me').expect(401)
  })

  test('updates preferences', async () => {
    const a = await makeAgent()
    await a.post('/api/auth/login').send({ identifier: creds.email, password: creds.password }).expect(200)
    const res = await a.patch('/api/auth/preferences').send({ soundEnabled: false, inputMode: 'unicode' })
    expect(res.status).toBe(200)
    expect(res.body.preferences.soundEnabled).toBe(false)
    expect(res.body.preferences.inputMode).toBe('unicode')
    await a.patch('/api/auth/preferences').send({ inputMode: 'qwerty' }).expect(400)
    const t = await a.patch('/api/auth/preferences').send({ theme: 'dark' })
    expect(t.body.preferences.theme).toBe('dark')
    await a.patch('/api/auth/preferences').send({ theme: 'blue' }).expect(400)
  })
})

describe('JWT authentication', () => {
  test('protected routes reject requests without a cookie', async () => {
    await request(createApp()).get('/api/auth/me').expect(401)
    await request(createApp()).get('/api/exercises').expect(401)
    await request(createApp()).get('/api/progress/dashboard').expect(401)
  })

  test('rejects a tampered token', async () => {
    const token = signToken('64b7f0f0f0f0f0f0f0f0f0f0') + 'x'
    await request(createApp()).get('/api/auth/me').set('Cookie', `token=${token}`).expect(401)
  })

  test('rejects an expired token', async () => {
    const token = jwt.sign({ sub: '64b7f0f0f0f0f0f0f0f0f0f0' }, process.env.JWT_SECRET, { expiresIn: -10 })
    const res = await request(createApp()).get('/api/auth/me').set('Cookie', `token=${token}`)
    expect(res.status).toBe(401)
    expect(res.body.message).toMatch(/expired/i)
  })

  test('rejects a valid token for a deleted user', async () => {
    const token = signToken('64b7f0f0f0f0f0f0f0f0f0f0')
    await request(createApp()).get('/api/auth/me').set('Cookie', `token=${token}`).expect(401)
  })
})
