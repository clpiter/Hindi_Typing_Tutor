const mongoose = require('mongoose')
const Exercise = require('../models/Exercise')
const Progress = require('../models/Progress')
const ApiError = require('../utils/ApiError')
const logger = require('../config/logger')
const { computeStats, aggregate, round } = require('../utils/typingStats')

const DAILY_LINE_GOAL = 20
const ERROR_TYPES = ['character', 'matra', 'missing', 'extra', 'space', 'wordOrder']

async function findOrCreateOpenAttempt(userId, exercise) {
  const filter = { userId, exerciseId: exercise._id, completed: false }
  let progress = await Progress.findOne(filter)
  if (progress) return progress
  try {
    progress = await Progress.create({
      ...filter,
      exerciseNumber: exercise.exerciseNumber,
      totalLines: exercise.lines.length,
      startedAt: new Date(),
    })
  } catch (err) {
    // two concurrent saves: the partial unique index lets only one create succeed
    if (err.code !== 11000) throw err
    progress = await Progress.findOne(filter)
  }
  return progress
}

/** POST /api/progress/save – save the result of one completed line */
async function saveProgress(req, res) {
  const { exerciseId, lineNumber } = req.body
  const exercise = await Exercise.findById(exerciseId).select('exerciseNumber title lines.lineNumber')
  if (!exercise) throw ApiError.notFound('Exercise not found')
  if (!exercise.lines.some((l) => l.lineNumber === lineNumber)) {
    throw ApiError.badRequest(`Exercise ${exercise.exerciseNumber} has no line ${lineNumber}`)
  }

  // Never trust client-side WPM/accuracy: recompute from the raw counts
  const stats = computeStats(req.body)
  const errorTypes = {}
  if (req.body.errorTypes && typeof req.body.errorTypes === 'object') {
    for (const t of ERROR_TYPES) {
      const v = Number(req.body.errorTypes[t])
      if (Number.isFinite(v) && v > 0) errorTypes[t] = Math.min(Math.round(v), 20000)
    }
  }
  const lineResult = {
    lineNumber,
    ...stats,
    mistakes: req.body.mistakes ?? stats.incorrectCharacters,
    timeTaken: round(req.body.timeTaken, 1),
    perfect: stats.incorrectCharacters === 0,
    errorTypes,
    completedAt: new Date(),
  }

  const progress = await findOrCreateOpenAttempt(req.user._id, exercise)
  const idx = progress.lineResults.findIndex((r) => r.lineNumber === lineNumber)
  if (idx >= 0) progress.lineResults.splice(idx, 1, lineResult)
  else progress.lineResults.push(lineResult)

  progress.completedLines = [...new Set(progress.lineResults.map((r) => r.lineNumber))].sort((a, b) => a - b)
  progress.lastCompletedLine = lineNumber
  Object.assign(progress, aggregate(progress.lineResults))
  progress.lastActivityAt = new Date()
  progress.totalLines = exercise.lines.length

  const exerciseCompleted = progress.completedLines.length >= exercise.lines.length
  if (exerciseCompleted) {
    progress.completed = true
    progress.completedAt = new Date()
  }
  await progress.save()

  req.user.preferences.lastExerciseId = exercise._id
  req.user.preferences.lastLineNumber = lineNumber
  await req.user.save({ validateModifiedOnly: true })

  logger.info('Progress saved', {
    userId: req.user._id.toString(),
    exercise: exercise.exerciseNumber,
    line: lineNumber,
    netWPM: stats.netWPM,
    accuracy: stats.accuracy,
    exerciseCompleted,
  })
  res.status(201).json({ success: true, exerciseCompleted, lineResult, progress })
}

/** POST /api/progress/reset/:exerciseId – abandon the open attempt and start over */
async function resetProgress(req, res) {
  const { deletedCount } = await Progress.deleteOne({
    userId: req.user._id,
    exerciseId: req.params.exerciseId,
    completed: false,
  })
  logger.info('Exercise attempt reset', { userId: req.user._id.toString(), exerciseId: req.params.exerciseId, deletedCount })
  res.json({ success: true, reset: deletedCount > 0 })
}

/** GET /api/progress – per-exercise summary for the current user */
async function getAllProgress(req, res) {
  const [exercises, attempts] = await Promise.all([
    Exercise.find().sort({ exerciseNumber: 1 }).select('exerciseNumber title titleEnglish keyboardRow lines.lineNumber difficulty').lean(),
    Progress.find({ userId: req.user._id }).select('-lineResults').lean(),
  ])
  const summary = exercises.map((ex) => {
    const mine = attempts.filter((a) => String(a.exerciseId) === String(ex._id))
    const done = mine.filter((a) => a.completed)
    const open = mine.find((a) => !a.completed) || null
    const last = mine.sort((a, b) => new Date(b.lastActivityAt) - new Date(a.lastActivityAt))[0]
    let status = 'not-started'
    if (open) status = 'in-progress'
    else if (done.length) status = 'completed'
    return {
      exerciseId: ex._id,
      exerciseNumber: ex.exerciseNumber,
      title: ex.title,
      titleEnglish: ex.titleEnglish,
      keyboardRow: ex.keyboardRow,
      difficulty: ex.difficulty,
      totalLines: ex.lines.length,
      status,
      timesCompleted: done.length,
      currentAttempt: open && {
        _id: open._id,
        completedLines: open.completedLines,
        lastCompletedLine: open.lastCompletedLine,
        netWPM: open.netWPM,
        accuracy: open.accuracy,
      },
      bestNetWPM: done.length ? Math.max(...done.map((a) => a.netWPM)) : null,
      bestAccuracy: done.length ? Math.max(...done.map((a) => a.accuracy)) : null,
      lastNetWPM: last?.netWPM ?? null,
      lastAccuracy: last?.accuracy ?? null,
      lastPracticedAt: last?.lastActivityAt ?? null,
    }
  })
  res.json({ success: true, progress: summary })
}

/** GET /api/progress/dashboard?tz=Asia/Kolkata */
async function getDashboard(req, res) {
  const userId = req.user._id
  const tz = req.query.tz || 'UTC'
  const since = new Date(Date.now() - 13 * 86_400_000)
  since.setUTCHours(0, 0, 0, 0)

  const [totalExercises, completedIds, totalsAgg, best, recent, daily] = await Promise.all([
    Exercise.countDocuments(),
    Progress.distinct('exerciseId', { userId, completed: true }),
    Progress.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: null,
          totalCharacters: { $sum: '$totalCharacters' },
          incorrectCharacters: { $sum: '$incorrectCharacters' },
          timeTaken: { $sum: '$timeTaken' },
          linesCompleted: { $sum: { $size: '$completedLines' } },
          attempts: { $sum: 1 },
          completedAttempts: { $sum: { $cond: ['$completed', 1, 0] } },
        },
      },
    ]),
    Progress.aggregate([
      { $match: { userId } },
      { $unwind: '$lineResults' },
      { $sort: { 'lineResults.netWPM': -1 } },
      { $limit: 1 },
      { $project: { netWPM: '$lineResults.netWPM', grossWPM: '$lineResults.grossWPM', exerciseNumber: 1, lineNumber: '$lineResults.lineNumber' } },
    ]),
    Progress.find({ userId }).sort({ lastActivityAt: -1 }).limit(6).select('-lineResults').populate('exerciseId', 'title exerciseNumber').lean(),
    Progress.aggregate([
      { $match: { userId } },
      { $unwind: '$lineResults' },
      { $match: { 'lineResults.completedAt': { $gte: since } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$lineResults.completedAt', timezone: tz } },
          lines: { $sum: 1 },
          totalCharacters: { $sum: '$lineResults.totalCharacters' },
          incorrectCharacters: { $sum: '$lineResults.incorrectCharacters' },
          timeTaken: { $sum: '$lineResults.timeTaken' },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ])

  const totals = totalsAgg[0] || { totalCharacters: 0, incorrectCharacters: 0, timeTaken: 0, linesCompleted: 0, attempts: 0, completedAttempts: 0 }
  const overall = computeStats(totals)

  // fill the last 14 days (in the user's time zone) so the chart has no gaps
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' })
  const byDay = new Map(daily.map((d) => [d._id, d]))
  const dailyProgress = []
  for (let i = 13; i >= 0; i--) {
    const key = fmt.format(new Date(Date.now() - i * 86_400_000))
    const d = byDay.get(key)
    const s = d ? computeStats(d) : null
    dailyProgress.push({
      date: key,
      lines: d?.lines || 0,
      minutes: d ? round(d.timeTaken / 60, 1) : 0,
      netWPM: s ? s.netWPM : 0,
      accuracy: s ? s.accuracy : 0,
    })
  }
  const today = dailyProgress[dailyProgress.length - 1]

  res.json({
    success: true,
    dashboard: {
      totalExercises,
      completedExercises: completedIds.length,
      pendingExercises: Math.max(0, totalExercises - completedIds.length),
      averageSpeed: totals.attempts ? overall.netWPM : 0,
      averageGrossSpeed: totals.attempts ? overall.grossWPM : 0,
      averageAccuracy: totals.attempts ? overall.accuracy : 0,
      bestSpeed: best[0]?.netWPM || 0,
      bestSpeedDetail: best[0] || null,
      totalPracticeTime: round(totals.timeTaken, 0), // seconds
      totalLinesCompleted: totals.linesCompleted,
      totalAttempts: totals.attempts,
      recentActivity: recent.map((p) => ({
        _id: p._id,
        exerciseId: p.exerciseId?._id,
        exerciseNumber: p.exerciseNumber,
        title: p.exerciseId?.title,
        completed: p.completed,
        completedLines: p.completedLines.length,
        totalLines: p.totalLines,
        netWPM: p.netWPM,
        accuracy: p.accuracy,
        lastActivityAt: p.lastActivityAt,
      })),
      dailyProgress,
      dailyGoal: { target: DAILY_LINE_GOAL, done: today.lines, percent: Math.min(100, Math.round((today.lines / DAILY_LINE_GOAL) * 100)) },
    },
  })
}

/** GET /api/progress/history?exerciseNumber=&from=&to=&status=&page=&limit= */
async function getHistory(req, res) {
  const { exerciseId, exerciseNumber, from, to, status = 'all' } = req.query
  const page = req.query.page || 1
  const limit = req.query.limit || 20
  const filter = { userId: req.user._id }
  if (exerciseId) filter.exerciseId = new mongoose.Types.ObjectId(String(exerciseId))
  if (exerciseNumber) filter.exerciseNumber = exerciseNumber
  if (status === 'completed') filter.completed = true
  if (status === 'in-progress') filter.completed = false
  if (from || to) {
    filter.startedAt = {}
    if (from) filter.startedAt.$gte = new Date(from)
    if (to) {
      const end = new Date(to)
      // a plain date means "until the end of that day"
      if (/^\d{4}-\d{2}-\d{2}$/.test(String(to))) end.setUTCHours(23, 59, 59, 999)
      filter.startedAt.$lte = end
    }
  }

  const [total, items] = await Promise.all([
    Progress.countDocuments(filter),
    Progress.find(filter)
      .sort({ startedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('exerciseId', 'title titleEnglish exerciseNumber')
      .lean(),
  ])

  res.json({
    success: true,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit) || 1,
    history: items.map((p) => ({
      _id: p._id,
      exerciseId: p.exerciseId?._id,
      exerciseNumber: p.exerciseNumber,
      title: p.exerciseId?.title,
      titleEnglish: p.exerciseId?.titleEnglish,
      startedAt: p.startedAt,
      completedAt: p.completedAt,
      lastActivityAt: p.lastActivityAt,
      completed: p.completed,
      completedLines: p.completedLines.length,
      totalLines: p.totalLines,
      grossWPM: p.grossWPM,
      netWPM: p.netWPM,
      accuracy: p.accuracy,
      timeTaken: p.timeTaken,
      mistakes: p.mistakes,
      totalCharacters: p.totalCharacters,
      incorrectCharacters: p.incorrectCharacters,
      lineResults: p.lineResults.map((r) => ({
        lineNumber: r.lineNumber,
        netWPM: r.netWPM,
        accuracy: r.accuracy,
        timeTaken: r.timeTaken,
        mistakes: r.mistakes,
        perfect: r.perfect,
      })),
    })),
  })
}

/** GET /api/progress/continue – where should the learner resume? */
async function getContinue(req, res) {
  const userId = req.user._id
  const open = await Progress.findOne({ userId, completed: false }).sort({ lastActivityAt: -1 }).lean()
  const exercises = await Exercise.find().sort({ exerciseNumber: 1 }).select('exerciseNumber title lines.lineNumber').lean()
  const brief = (ex) => ex && { _id: ex._id, exerciseNumber: ex.exerciseNumber, title: ex.title, totalLines: ex.lines.length }

  if (open) {
    const ex = exercises.find((e) => String(e._id) === String(open.exerciseId))
    const done = new Set(open.completedLines)
    const nextLine = ex?.lines.map((l) => l.lineNumber).find((n) => !done.has(n)) || 1
    return res.json({ success: true, reason: 'in-progress', exercise: brief(ex), progress: open, nextLine })
  }

  const completedIds = new Set((await Progress.distinct('exerciseId', { userId, completed: true })).map(String))
  const lastId = req.user.preferences?.lastExerciseId && String(req.user.preferences.lastExerciseId)
  const lastIdx = exercises.findIndex((e) => String(e._id) === lastId)
  // the first exercise after the last one practised that is not yet completed, else any pending one
  const ordered = lastIdx >= 0 ? [...exercises.slice(lastIdx + 1), ...exercises.slice(0, lastIdx + 1)] : exercises
  const pending = ordered.find((e) => !completedIds.has(String(e._id)))
  const ex = pending || exercises[lastIdx >= 0 ? (lastIdx + 1) % exercises.length : 0]
  res.json({
    success: true,
    reason: pending ? 'next-pending' : 'all-completed',
    exercise: brief(ex),
    progress: null,
    nextLine: 1,
  })
}

/** GET /api/progress/:exerciseId – open attempt + best result for one exercise */
async function getExerciseProgress(req, res) {
  const userId = req.user._id
  const { exerciseId } = req.params
  const exists = await Exercise.exists({ _id: exerciseId })
  if (!exists) throw ApiError.notFound('Exercise not found')

  const [current, completedAttempts] = await Promise.all([
    Progress.findOne({ userId, exerciseId, completed: false }).lean(),
    Progress.find({ userId, exerciseId, completed: true }).sort({ completedAt: -1 }).select('-lineResults').lean(),
  ])
  const best = completedAttempts.reduce((b, a) => (!b || a.netWPM > b.netWPM ? a : b), null)
  res.json({
    success: true,
    current,
    lastCompleted: completedAttempts[0] || null,
    best,
    timesCompleted: completedAttempts.length,
  })
}

module.exports = {
  saveProgress,
  resetProgress,
  getAllProgress,
  getDashboard,
  getHistory,
  getContinue,
  getExerciseProgress,
}
