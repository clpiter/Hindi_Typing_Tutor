const { body, param, query, validationResult } = require('express-validator')
const mongoose = require('mongoose')

/** Runs after a rule set; responds 400 with field errors */
function validate(req, res, next) {
  const result = validationResult(req)
  if (result.isEmpty()) return next()
  const errors = result.array().map((e) => ({ field: e.path, message: e.msg }))
  return res.status(400).json({ success: false, message: errors[0].message, errors })
}

const isObjectId = (v) => mongoose.isValidObjectId(v)

const registerRules = [
  body('name').trim().notEmpty().withMessage('Full name is required').bail()
    .isLength({ min: 2, max: 60 }).withMessage('Full name must be 2–60 characters'),
  body('username').trim().toLowerCase().notEmpty().withMessage('Username is required').bail()
    .isLength({ min: 3, max: 30 }).withMessage('Username must be 3–30 characters').bail()
    .matches(/^[a-z0-9_.]+$/).withMessage('Username may contain only letters, numbers, _ and .'),
  body('email').trim().notEmpty().withMessage('Email is required').bail()
    .isEmail().withMessage('Enter a valid email address').bail()
    .isLength({ max: 120 }).normalizeEmail({ gmail_remove_dots: false }),
  body('password').isString().withMessage('Password is required').bail()
    .isLength({ min: 8, max: 128 }).withMessage('Password must be at least 8 characters').bail()
    .matches(/[A-Za-z]/).withMessage('Password must contain a letter').bail()
    .matches(/\d/).withMessage('Password must contain a number'),
  body('confirmPassword').custom((v, { req }) => {
    if (v !== req.body.password) throw new Error('Passwords do not match')
    return true
  }),
]

const loginRules = [
  body('identifier').trim().notEmpty().withMessage('Email or username is required').bail()
    .isLength({ max: 120 }).withMessage('Email or username is too long'),
  body('password').isString().notEmpty().withMessage('Password is required').bail()
    .isLength({ max: 128 }).withMessage('Password is too long'),
]

const preferencesRules = [
  body('soundEnabled').optional().isBoolean().toBoolean(),
  body('showKeyboard').optional().isBoolean().toBoolean(),
  body('lineCelebration').optional().isBoolean().toBoolean(),
  body('inputMode').optional().isIn(['kruti', 'unicode']).withMessage('inputMode must be kruti or unicode'),
  body('theme').optional().isIn(['light', 'dark']).withMessage('theme must be light or dark'),
  body('lastExerciseId').optional({ values: 'null' }).custom(isObjectId).withMessage('Invalid exercise id'),
  body('lastLineNumber').optional().isInt({ min: 0, max: 100 }).toInt(),
]

const exerciseIdParam = [param('id').custom(isObjectId).withMessage('Invalid exercise id')]
const exerciseNumberParam = [param('number').isInt({ min: 1, max: 100 }).withMessage('Invalid exercise number').toInt()]
const progressExerciseParam = [param('exerciseId').custom(isObjectId).withMessage('Invalid exercise id')]

const saveProgressRules = [
  body('exerciseId').custom(isObjectId).withMessage('Invalid exercise id'),
  body('lineNumber').isInt({ min: 1, max: 100 }).withMessage('Invalid line number').toInt(),
  body('totalCharacters').isInt({ min: 1, max: 20000 }).withMessage('totalCharacters must be a positive integer').toInt(),
  body('incorrectCharacters').isInt({ min: 0, max: 20000 }).withMessage('incorrectCharacters must be ≥ 0').toInt()
    .custom((v, { req }) => {
      if (v > Number(req.body.totalCharacters)) throw new Error('incorrectCharacters cannot exceed totalCharacters')
      return true
    }),
  body('mistakes').optional().isInt({ min: 0, max: 20000 }).toInt(),
  body('timeTaken').isFloat({ min: 0.5, max: 7200 }).withMessage('timeTaken must be between 0.5 and 7200 seconds').toFloat(),
  body('errorTypes').optional().isObject(),
]

const historyRules = [
  query('exerciseId').optional().custom(isObjectId).withMessage('Invalid exercise id'),
  query('exerciseNumber').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('from').optional().isISO8601().withMessage('from must be a date (YYYY-MM-DD)'),
  query('to').optional().isISO8601().withMessage('to must be a date (YYYY-MM-DD)'),
  query('status').optional().isIn(['all', 'completed', 'in-progress']),
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
]

const dashboardRules = [
  query('tz').optional().isString().isLength({ max: 64 }).custom((tz) => {
    try {
      Intl.DateTimeFormat('en', { timeZone: tz })
      return true
    } catch {
      throw new Error('Invalid time zone')
    }
  }),
]

module.exports = {
  validate,
  registerRules,
  loginRules,
  preferencesRules,
  exerciseIdParam,
  exerciseNumberParam,
  progressExerciseParam,
  saveProgressRules,
  historyRules,
  dashboardRules,
}
