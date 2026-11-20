const fs = require('fs')
const path = require('path')

const REPO_ROOT = path.join(__dirname, '..', '..')

/**
 * Location of the frontend folder. Windows ignores letter case but Linux servers
 * (Render, most hosts) do not, and the folder may be committed as "frontend" or
 * "Frontend" – so look for both instead of assuming one spelling.
 */
function findFrontendDir() {
  for (const name of ['frontend', 'Frontend', 'FRONTEND']) {
    const dir = path.join(REPO_ROOT, name)
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir
  }
  return null
}

module.exports = { REPO_ROOT, findFrontendDir }
