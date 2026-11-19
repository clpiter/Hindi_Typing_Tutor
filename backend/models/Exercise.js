const mongoose = require('mongoose')

const ROWS = ['home', 'top', 'bottom', 'number']
const LEVELS = ['beginner', 'intermediate', 'advanced']

const lineSchema = new mongoose.Schema(
  {
    lineNumber: { type: Number, required: true, min: 1 },
    // Canonical Unicode Hindi text. Kruti Dev encoding is derived on the client.
    referenceText: { type: String, required: true, trim: true },
    hint: { type: String, default: '' },
    keyboardRow: { type: String, enum: ROWS, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], default: 'easy' },
  },
  { _id: true },
)

const exerciseSchema = new mongoose.Schema(
  {
    exerciseNumber: { type: Number, required: true, min: 1 },
    title: { type: String, required: true, trim: true },
    titleEnglish: { type: String, trim: true },
    description: { type: String, default: '' },
    keyboardRow: { type: String, enum: ROWS, required: true },
    shiftPractice: { type: Boolean, default: false },
    keys: [{ type: String }],
    instructions: [{ type: String }],
    lines: {
      type: [lineSchema],
      validate: { validator: (v) => Array.isArray(v) && v.length > 0, message: 'An exercise needs at least one line' },
    },
    difficulty: { type: String, enum: LEVELS, default: 'beginner' },
    sourcePage: { type: Number },
  },
  { timestamps: true },
)

exerciseSchema.index({ exerciseNumber: 1 }, { unique: true })
exerciseSchema.virtual('totalLines').get(function totalLines() {
  return this.lines?.length || 0
})
exerciseSchema.set('toJSON', { virtuals: true, versionKey: false })

module.exports = mongoose.model('Exercise', exerciseSchema)
