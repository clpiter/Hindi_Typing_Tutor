/**
 * Builds the React frontend (frontend/dist) after `npm install` in backend/ –
 * but ONLY on a hosting platform, so a deploy whose build command is just
 * `npm install` (Render's default) still ships the website.
 *
 * Runs when RENDER=true (set automatically by Render) or BUILD_FRONTEND=true.
 * On a developer machine it does nothing.
 */
const { execSync } = require('child_process')
const { findFrontendDir } = require('../utils/paths')

const shouldBuild = process.env.RENDER === 'true' || process.env.BUILD_FRONTEND === 'true'
if (!shouldBuild) process.exit(0)

const frontend = findFrontendDir() // "frontend" or "Frontend" (Linux is case-sensitive)
if (!frontend) {
  console.error('[build-frontend] frontend folder not found next to backend/ – cannot build the website')
  process.exit(1)
}
console.log(`[build-frontend] building ${frontend}`)

const run = (cmd) => {
  console.log(`[build-frontend] ${cmd}`)
  // --include=dev: Vite is a devDependency and NODE_ENV may already be "production"
  execSync(cmd, { cwd: frontend, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'development' } })
}

run('npm install --include=dev --no-audit --no-fund')
run('npm run build')
console.log('[build-frontend] frontend/dist is ready')
