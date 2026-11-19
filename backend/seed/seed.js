/**
 * Seeds the 8 PDF exercises into MongoDB.
 *   npm run seed            – upsert exercises (keeps users and progress)
 *   npm run seed -- --fresh – also delete all progress documents
 */
require('dotenv').config({ quiet: true, path: require('path').join(__dirname, '..', '.env') })
const mongoose = require('mongoose')
const logger = require('../config/logger')
const { connectDB } = require('../config/db')
const Exercise = require('../models/Exercise')
const Progress = require('../models/Progress')
const { exercises } = require('./exerciseData')
const { buildHint, lineDifficulty } = require('./hintBuilder')

function toDocuments() {
  return exercises.map((ex) => ({
    exerciseNumber: ex.exerciseNumber,
    title: ex.title,
    titleEnglish: ex.titleEnglish,
    description: ex.description,
    keyboardRow: ex.keyboardRow,
    shiftPractice: ex.shiftPractice,
    keys: ex.keys,
    instructions: ex.instructions,
    difficulty: ex.difficulty,
    sourcePage: ex.sourcePage,
    lines: ex.lines.map((text, i) => ({
      lineNumber: i + 1,
      referenceText: text.normalize('NFC'),
      hint: buildHint(text, ex),
      keyboardRow: ex.keyboardRow,
      difficulty: lineDifficulty(text),
    })),
  }))
}

/** Upsert by exerciseNumber so existing progress keeps pointing at the same _id */
async function seedExercises() {
  const docs = toDocuments()
  for (const doc of docs) {
    await Exercise.findOneAndUpdate({ exerciseNumber: doc.exerciseNumber }, doc, {
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    })
  }
  await Exercise.deleteMany({ exerciseNumber: { $nin: docs.map((d) => d.exerciseNumber) } })
  return docs
}

async function main() {
  await connectDB()
  if (process.argv.includes('--fresh')) {
    const { deletedCount } = await Progress.deleteMany({})
    logger.info(`Removed ${deletedCount} progress documents`)
  }
  const docs = await seedExercises()
  const lineCount = docs.reduce((n, d) => n + d.lines.length, 0)
  logger.info(`Seeded ${docs.length} exercises with ${lineCount} lines`)
  await mongoose.connection.close()
}

if (require.main === module) {
  main().catch((err) => {
    logger.error('Seeding failed', { error: err.message, stack: err.stack })
    process.exit(1)
  })
}

module.exports = { seedExercises, toDocuments }
