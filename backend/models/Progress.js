const mongoose = require('mongoose')

/**
 * One Progress document = one practice attempt (session) of one exercise.
 * While `completed` is false the attempt can be resumed; a partial unique index
 * guarantees at most one open attempt per user and exercise.
 */
const lineResultSchema = new mongoose.Schema(
  {
    lineNumber: { type: Number, required: true },
    totalCharacters: { type: Number, required: true, min: 0 },
    correctCharacters: { type: Number, required: true, min: 0 },
    incorrectCharacters: { type: Number, required: true, min: 0 },
    mistakes: { type: Number, default: 0, min: 0 },
    timeTaken: { type: Number, required: true, min: 0 }, // seconds
    accuracy: { type: Number, default: 0 },
    grossWPM: { type: Number, default: 0 },
    netWPM: { type: Number, default: 0 },
    perfect: { type: Boolean, default: false },
    errorTypes: { type: Map, of: Number, default: undefined },
    completedAt: { type: Date, default: Date.now },
  },
  { _id: false },
)

const progressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    exerciseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', required: true },
    exerciseNumber: { type: Number, required: true },
    totalLines: { type: Number, required: true },
    lineResults: { type: [lineResultSchema], default: [] },
    completedLines: { type: [Number], default: [] },
    lastCompletedLine: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
    grossWPM: { type: Number, default: 0 },
    netWPM: { type: Number, default: 0 },
    mistakes: { type: Number, default: 0 },
    totalCharacters: { type: Number, default: 0 },
    correctCharacters: { type: Number, default: 0 },
    incorrectCharacters: { type: Number, default: 0 },
    timeTaken: { type: Number, default: 0 }, // seconds
    completed: { type: Boolean, default: false },
    startedAt: { type: Date, default: Date.now },
    completedAt: { type: Date, default: null },
    lastActivityAt: { type: Date, default: Date.now },
  },
  { timestamps: true, versionKey: false },
)

progressSchema.index(
  { userId: 1, exerciseId: 1 },
  { unique: true, partialFilterExpression: { completed: false }, name: 'one_open_attempt_per_exercise' },
)
progressSchema.index({ userId: 1, exerciseId: 1, completed: 1 })
progressSchema.index({ userId: 1, lastActivityAt: -1 })
progressSchema.index({ userId: 1, startedAt: -1 })
progressSchema.index({ userId: 1, completedAt: -1 })

module.exports = mongoose.model('Progress', progressSchema)
