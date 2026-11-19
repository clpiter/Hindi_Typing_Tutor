const mongoose = require('mongoose')
const logger = require('./logger')

/** Hide credentials if the URI contains them */
const safeUri = (uri) => uri.replace(/\/\/([^@/]+)@/, '//***@')

async function connectDB(uri = process.env.MONGO_URI) {
  if (!uri) throw new Error('MONGO_URI is not defined. Copy backend/.env.example to backend/.env')
  mongoose.set('strictQuery', true)

  mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'))
  mongoose.connection.on('reconnected', () => logger.info('MongoDB reconnected'))
  mongoose.connection.on('error', (err) => logger.error('MongoDB connection error', { error: err.message }))

  const conn = await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 })
  logger.info(`MongoDB connected: ${safeUri(uri)}`, { host: conn.connection.host, db: conn.connection.name })
  return conn
}

async function disconnectDB() {
  await mongoose.connection.close()
  logger.info('MongoDB connection closed')
}

module.exports = { connectDB, disconnectDB }
