const express = require('express')
const { listExercises, getExerciseById, getExerciseByNumber } = require('../controllers/exerciseController')
const { protect } = require('../middleware/authMiddleware')
const { validate, exerciseIdParam, exerciseNumberParam } = require('../middleware/validationMiddleware')

const router = express.Router()

router.use(protect)
router.get('/', listExercises)
router.get('/number/:number', exerciseNumberParam, validate, getExerciseByNumber)
router.get('/:id', exerciseIdParam, validate, getExerciseById)

module.exports = router
