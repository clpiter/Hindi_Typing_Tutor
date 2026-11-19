const Exercise = require('../models/Exercise')
const ApiError = require('../utils/ApiError')
const logger = require('../config/logger')

/** GET /api/exercises – list without the (long) line texts */
async function listExercises(req, res) {
  const exercises = await Exercise.find().sort({ exerciseNumber: 1 }).lean()
  const data = exercises.map(({ lines, ...rest }) => ({
    ...rest,
    totalLines: lines.length,
    sampleLine: lines[0]?.referenceText || '',
  }))
  logger.debug('Exercises listed', { count: data.length, userId: req.user?._id?.toString() })
  res.json({ success: true, count: data.length, exercises: data })
}

/** GET /api/exercises/:id */
async function getExerciseById(req, res) {
  const exercise = await Exercise.findById(req.params.id)
  if (!exercise) throw ApiError.notFound('Exercise not found')
  logger.debug('Exercise retrieved', { exerciseNumber: exercise.exerciseNumber })
  res.json({ success: true, exercise })
}

/** GET /api/exercises/number/:number */
async function getExerciseByNumber(req, res) {
  const exercise = await Exercise.findOne({ exerciseNumber: req.params.number })
  if (!exercise) throw ApiError.notFound(`Exercise ${req.params.number} not found`)
  logger.debug('Exercise retrieved', { exerciseNumber: exercise.exerciseNumber })
  res.json({ success: true, exercise })
}

module.exports = { listExercises, getExerciseById, getExerciseByNumber }
