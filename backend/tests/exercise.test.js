const { describe, test, before, after } = require('node:test')
const { expect } = require('expect')
const { setupDb, teardownDb, registeredAgent } = require('./helpers')
const { exercises } = require('../seed/exerciseData')

let a
before(async () => {
  await setupDb()
  a = await registeredAgent()
})
after(teardownDb)

describe('Exercise retrieval', () => {
  test('lists all 8 PDF exercises in order without line texts', async () => {
    const res = await a.get('/api/exercises').expect(200)
    expect(res.body.count).toBe(8)
    expect(res.body.exercises.map((e) => e.exerciseNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(res.body.exercises[0].lines).toBeUndefined()
    expect(res.body.exercises[0].totalLines).toBe(12) // 2 home-row warm-ups + 10 PDF lines
    expect(res.body.exercises[5].totalLines).toBe(13)
    expect(res.body.exercises[6].totalLines).toBe(11)
  })

  test('gets an exercise by number with the PDF lines in order', async () => {
    const res = await a.get('/api/exercises/number/1').expect(200)
    const ex = res.body.exercise
    expect(ex.title).toBe('होम कीज़')
    expect(ex.lines).toHaveLength(12)
    expect(ex.lines[0].referenceText).toBe('े क ि ह श् य स ा')
    expect(ex.lines[1].referenceText).toBe('े क ि ह ी श् य स ा र')
    expect(ex.lines[3].referenceText).toBe('कह कर कस रह हक सर यह') // PDF line 2
    expect(ex.lines.map((l) => l.lineNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    expect(ex.lines[0].hint).toMatch(/होम कीज़/)
  })

  test('seeded text equals the transcription for every line', async () => {
    for (const src of exercises) {
      const res = await a.get(`/api/exercises/number/${src.exerciseNumber}`).expect(200)
      expect(res.body.exercise.lines.map((l) => l.referenceText)).toEqual(src.lines.map((l) => l.normalize('NFC')))
    }
  })

  test('gets an exercise by id', async () => {
    const list = await a.get('/api/exercises').expect(200)
    const id = list.body.exercises[7]._id
    const res = await a.get(`/api/exercises/${id}`).expect(200)
    expect(res.body.exercise.exerciseNumber).toBe(8)
  })

  test('returns 400 for an invalid id and 404 for unknown ones', async () => {
    await a.get('/api/exercises/not-an-id').expect(400)
    await a.get('/api/exercises/64b7f0f0f0f0f0f0f0f0f0f0').expect(404)
    await a.get('/api/exercises/number/99').expect(404)
  })
})
