/**
 * One-time data update after adding the two home-row warm-up lines at the start
 * of exercise 1 (the 10 PDF lines moved from 1–10 to 3–12).
 *
 * Saved progress on exercise 1 is shifted by +2 so every result stays attached
 * to the line that was actually typed. Safe to run more than once: documents
 * already updated carry `migrations: ['ex1-warmups']` and are skipped.
 *
 *   node seed/migrate-ex1-warmups.js               (development database)
 *   node seed/migrate-ex1-warmups.js --production  (production database)
 */
require('../config/env').loadEnv()
const mongoose = require('mongoose')
const logger = require('../config/logger')
const { connectDB } = require('../config/db')

const TAG = 'ex1-warmups'
const SHIFT = 2

async function main() {
  await connectDB()
  const db = mongoose.connection.db
  const progresses = db.collection('progresses')
  const users = db.collection('users')
  const ex1 = await db.collection('exercises').findOne({ exerciseNumber: 1 })
  const newTotal = ex1?.lines?.length || 12

  const docs = await progresses.find({ exerciseNumber: 1, migrations: { $ne: TAG } }).toArray()
  for (const p of docs) {
    const update = {
      completedLines: (p.completedLines || []).map((n) => n + SHIFT),
      lastCompletedLine: p.lastCompletedLine ? p.lastCompletedLine + SHIFT : 0,
      lineResults: (p.lineResults || []).map((r) => ({ ...r, lineNumber: r.lineNumber + SHIFT })),
    }
    // an unfinished attempt now has 12 lines to complete; finished ones stay as recorded
    if (!p.completed) update.totalLines = newTotal
    await progresses.updateOne({ _id: p._id }, { $set: update, $addToSet: { migrations: TAG } })
  }

  // "continue where you left off" pointers of users last practising exercise 1
  let userCount = 0
  if (ex1) {
    const res = await users.updateMany(
      { 'preferences.lastExerciseId': ex1._id, 'preferences.lastLineNumber': { $gt: 0 }, migrations: { $ne: TAG } },
      { $inc: { 'preferences.lastLineNumber': SHIFT }, $addToSet: { migrations: TAG } },
    )
    userCount = res.modifiedCount
  }
  logger.info(`Exercise 1 warm-up migration: ${docs.length} progress document(s), ${userCount} user pointer(s) updated`)
  await mongoose.connection.close()
}

main().catch((err) => {
  logger.error('Migration failed', { error: err.message })
  process.exit(1)
})
