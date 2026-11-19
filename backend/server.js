// must run first: the logger and everything else read process.env at load time
const { loadEnv, assertProductionConfig } = require('./config/env')
const envInfo = loadEnv()
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
  const problems = assertProductionConfig()
  if (problems.length) {
    problems.forEach((p) => logger.error('Configuration error: ' + p))
    process.exit(1)
  }
  logger.info(`Environment: ${envInfo.mode} (${envInfo.file || 'no env file'})`)
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

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`Port ${port} is already in use – stop the other server or set a different PORT`)
    } else {
      logger.error('Server error', { error: err.message })
    }
    process.exit(1)
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
