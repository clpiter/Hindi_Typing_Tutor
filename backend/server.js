require('dotenv').config({ quiet: true })
const logger = require('./config/logger')
const { connectDB, disconnectDB } = require('./config/db')
const { createApp } = require('./app')

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack })
  process.exit(1)
})
process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { error: reason?.message || String(reason), stack: reason?.stack })
})

async function start() {
  const port = Number(process.env.PORT) || 5000
  try {
    await connectDB()
  } catch (err) {
    logger.error('Could not connect to MongoDB – is mongod running?', { error: err.message })
    process.exit(1)
  }
  const app = createApp()
  const server = app.listen(port, () => {
    logger.info(`Hindi Typing Tutor API listening on http://localhost:${port} (${process.env.NODE_ENV || 'development'})`)
  })

  const shutdown = async (signal) => {
    logger.info(`${signal} received – shutting down`)
    server.close(async () => {
      await disconnectDB()
      process.exit(0)
    })
    setTimeout(() => process.exit(1), 10000).unref()
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

start()
