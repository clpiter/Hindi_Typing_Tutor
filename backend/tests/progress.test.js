const { describe, test, before, after } = require('node:test')
const { expect } = require('expect')
const { setupDb, teardownDb, registeredAgent } = require('./helpers')
const { computeStats } = require('../utils/typingStats')

let a
let ex1
let ex2
before(async () => {
  await setupDb()
  a = await registeredAgent()
  ex1 = (await a.get('/api/exercises/number/1')).body.exercise
  ex2 = (await a.get('/api/exercises/number/2')).body.exercise
})
after(teardownDb)

const line = (exercise, lineNumber, extra = {}) => ({
  exerciseId: exercise._id,
  lineNumber,
  totalCharacters: 50,
  incorrectCharacters: 0,
  mistakes: 0,
  timeTaken: 30,
  ...extra,
})

describe('typing statistics', () => {
  test('gross/net WPM and accuracy formulas', () => {
    const s = computeStats({ totalCharacters: 100, incorrectCharacters: 5, timeTaken: 60 })
    expect(s.grossWPM).toBe(20) // 100 / 5 / 1 min
    expect(s.netWPM).toBe(15) // 20 - 5 / 1 min
    expect(s.accuracy).toBe(95)
    expect(s.correctCharacters).toBe(95)
    expect(computeStats({ totalCharacters: 10, incorrectCharacters: 10, timeTaken: 6 }).netWPM).toBe(0)
  })
})

describe('progress persistence', () => {
  test('saving a line creates an open attempt and recomputes stats on the server', async () => {
    const res = await a.post('/api/progress/save').send(line(ex1, 1, { incorrectCharacters: 5, mistakes: 5, totalCharacters: 100, timeTaken: 60, accuracy: 100, netWPM: 999 }))
    expect(res.status).toBe(201)
    expect(res.body.lineResult.netWPM).toBe(15)
    expect(res.body.lineResult.accuracy).toBe(95)
    expect(res.body.lineResult.perfect).toBe(false)
    expect(res.body.progress.completedLines).toEqual([1])
    expect(res.body.progress.completed).toBe(false)
  })

  test('the open attempt can be resumed via /continue and /:exerciseId', async () => {
    await a.post('/api/progress/save').send(line(ex1, 2)).expect(201)
    const cont = await a.get('/api/progress/continue').expect(200)
    expect(cont.body.reason).toBe('in-progress')
    expect(cont.body.exercise.exerciseNumber).toBe(1)
    expect(cont.body.nextLine).toBe(3)
    const prog = await a.get(`/api/progress/${ex1._id}`).expect(200)
    expect(prog.body.current.completedLines).toEqual([1, 2])
    expect(prog.body.current.lastCompletedLine).toBe(2)
  })

  test('re-saving a line replaces its result instead of duplicating it', async () => {
    const res = await a.post('/api/progress/save').send(line(ex1, 2, { totalCharacters: 40 })).expect(201)
    expect(res.body.progress.lineResults.filter((r) => r.lineNumber === 2)).toHaveLength(1)
    expect(res.body.progress.completedLines).toEqual([1, 2])
  })

  test('completing all lines completes the exercise', async () => {
    let res
    for (let n = 3; n <= ex1.lines.length; n++) {
      res = await a.post('/api/progress/save').send(line(ex1, n)).expect(201)
    }
    expect(res.body.exerciseCompleted).toBe(true)
    expect(res.body.progress.completed).toBe(true)
    expect(res.body.progress.completedAt).toBeTruthy()
    const cont = await a.get('/api/progress/continue').expect(200)
    expect(cont.body.reason).toBe('next-pending')
    expect(cont.body.exercise.exerciseNumber).toBe(2)
  })

  test('a new attempt starts after completion', async () => {
    const res = await a.post('/api/progress/save').send(line(ex1, 1)).expect(201)
    expect(res.body.progress.completedLines).toEqual([1])
    const all = await a.get('/api/progress').expect(200)
    const s1 = all.body.progress.find((p) => p.exerciseNumber === 1)
    expect(s1.status).toBe('in-progress')
    expect(s1.timesCompleted).toBe(1)
  })

  test('reset removes the open attempt', async () => {
    await a.post(`/api/progress/reset/${ex1._id}`).send({}).expect(200)
    const prog = await a.get(`/api/progress/${ex1._id}`).expect(200)
    expect(prog.body.current).toBeNull()
    expect(prog.body.timesCompleted).toBe(1)
  })

  test('dashboard aggregates statistics', async () => {
    await a.post('/api/progress/save').send(line(ex2, 1)).expect(201)
    const res = await a.get('/api/progress/dashboard?tz=Asia/Kolkata').expect(200)
    const d = res.body.dashboard
    expect(d.totalExercises).toBe(8)
    expect(d.completedExercises).toBe(1)
    expect(d.pendingExercises).toBe(7)
    expect(d.averageAccuracy).toBeGreaterThan(90)
    expect(d.bestSpeed).toBeGreaterThan(0)
    expect(d.totalPracticeTime).toBeGreaterThan(0)
    expect(d.dailyProgress).toHaveLength(14)
    expect(d.dailyProgress[13].lines).toBeGreaterThan(0)
    expect(d.recentActivity[0].exerciseNumber).toBe(2)
  })

  test('history supports filtering by exercise, status and date', async () => {
    const all = await a.get('/api/progress/history').expect(200)
    expect(all.body.total).toBe(2)
    const only2 = await a.get('/api/progress/history?exerciseNumber=2').expect(200)
    expect(only2.body.history.every((h) => h.exerciseNumber === 2)).toBe(true)
    const done = await a.get('/api/progress/history?status=completed').expect(200)
    expect(done.body.history.every((h) => h.completed)).toBe(true)
    const future = await a.get('/api/progress/history?from=2999-01-01').expect(200)
    expect(future.body.total).toBe(0)
    const today = new Date().toISOString().slice(0, 10)
    const upToToday = await a.get(`/api/progress/history?to=${today}`).expect(200)
    expect(upToToday.body.total).toBe(2)
  })

  test('validates progress payloads', async () => {
    await a.post('/api/progress/save').send(line(ex1, 99)).expect(400)
    await a.post('/api/progress/save').send(line(ex1, 1, { incorrectCharacters: 80 })).expect(400)
    await a.post('/api/progress/save').send(line(ex1, 1, { timeTaken: 0 })).expect(400)
    await a.post('/api/progress/save').send({ ...line(ex1, 1), exerciseId: 'nope' }).expect(400)
    await a.get('/api/progress/history?from=yesterday').expect(400)
  })

  test("progress is private to each user", async () => {
    const b = await registeredAgent()
    const res = await b.get('/api/progress/history').expect(200)
    expect(res.body.total).toBe(0)
  })
})
