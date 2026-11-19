const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')

const preferencesSchema = new mongoose.Schema(
  {
    soundEnabled: { type: Boolean, default: true },
    showKeyboard: { type: Boolean, default: true },
    lineCelebration: { type: Boolean, default: true },
    inputMode: { type: String, enum: ['kruti', 'unicode'], default: 'kruti' },
    // null = not chosen yet (the browser then follows the system light/dark setting)
    theme: { type: String, enum: ['light', 'dark', null], default: null },
    lastExerciseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exercise', default: null },
    lastLineNumber: { type: Number, default: 0 },
  },
  { _id: false },
)

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 60 },
    username: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      match: /^[a-z0-9_.]+$/,
    },
    email: { type: String, required: true, trim: true, lowercase: true, maxlength: 120 },
    password: { type: String, required: true, minlength: 8, select: false },
    preferences: { type: preferencesSchema, default: () => ({}) },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password
        delete ret.__v
        return ret
      },
    },
  },
)

userSchema.index({ email: 1 }, { unique: true })
userSchema.index({ username: 1 }, { unique: true })

userSchema.pre('save', async function hashPassword() {
  if (!this.isModified('password')) return
  const rounds = Number(process.env.BCRYPT_ROUNDS) || 12
  this.password = await bcrypt.hash(this.password, rounds)
})

userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password)
}

module.exports = mongoose.model('User', userSchema)
