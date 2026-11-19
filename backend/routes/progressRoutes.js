const express = require('express')
const {
  saveProgress,
  resetProgress,
  getAllProgress,
  getDashboard,
  getHistory,
  getContinue,
  getExerciseProgress,
} = require('../controllers/progressController')
const { protect } = require('../middleware/authMiddleware')
const {
  validate,
  saveProgressRules,
  historyRules,
  dashboardRules,
  progressExerciseParam,
} = require('../middleware/validationMiddleware')

const router = express.Router()

router.use(protect)
router.post('/save', saveProgressRules, validate, saveProgress)
router.post('/reset/:exerciseId', progressExerciseParam, validate, resetProgress)
router.get('/', getAllProgress)
router.get('/dashboard', dashboardRules, validate, getDashboard)
router.get('/history', historyRules, validate, getHistory)
router.get('/continue', getContinue)
// keep this last so it does not shadow the named routes above
router.get('/:exerciseId', progressExerciseParam, validate, getExerciseProgress)

module.exports = router
