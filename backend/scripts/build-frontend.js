/**
 * Builds the React frontend (frontend/dist) after `npm install` in backend/ –
 * but ONLY on a hosting platform, so a deploy whose build command is just
 * `npm install` (Render's default) still ships the website.
 *
 * Runs when RENDER=true (set automatically by Render) or BUILD_FRONTEND=true.
 * On a developer machine it does nothing.
 */
const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const shouldBuild = process.env.RENDER === 'true' || process.env.BUILD_FRONTEND === 'true'
if (!shouldBuild) process.exit(0)

const frontend = path.join(__dirname, '..', '..', 'frontend')
if (!fs.existsSync(path.join(frontend, 'package.json'))) {
  console.log('[build-frontend] frontend/ not found – skipping')
  process.exit(0)
}

const run = (cmd) => {
  console.log(`[build-frontend] ${cmd}`)
  // --include=dev: Vite is a devDependency and NODE_ENV may already be "production"
  execSync(cmd, { cwd: frontend, stdio: 'inherit', env: { ...process.env, NODE_ENV: 'development' } })
}

run('npm install --include=dev --no-audit --no-fund')
run('npm run build')
console.log('[build-frontend] frontend/dist is ready')
