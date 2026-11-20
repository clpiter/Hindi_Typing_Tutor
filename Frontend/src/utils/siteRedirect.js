/**
 * The complete deployment (website + API on one server). If this build is opened
 * on a host that only serves files – e.g. a Render Static Site without the
 * "/api/* → API" rewrite rule – login cannot work there, so the visitor is sent
 * to the complete site instead (same path), rather than seeing
 * "Cannot reach the API server".
 *
 * Override at build time with VITE_PRIMARY_SITE_URL. Not used when VITE_API_URL
 * is set (frontend deliberately calling an API on another domain).
 */
export const PRIMARY_SITE_URL = import.meta.env.VITE_PRIMARY_SITE_URL || 'https://hindi-typing-tutor.onrender.com'

const isLocalHost = (h) => h === 'localhost' || h === '127.0.0.1' || h === '[::1]'

/** @returns {Promise<boolean>} true when a redirect was started */
export async function redirectIfApiMissing() {
  if (!import.meta.env.PROD || import.meta.env.VITE_API_URL) return false
  if (isLocalHost(window.location.hostname)) return false
  let primary
  try {
    primary = new URL(PRIMARY_SITE_URL)
  } catch {
    return false
  }
  if (primary.origin === window.location.origin) return false

  try {
    const res = await fetch('/api/health', { headers: { Accept: 'application/json' }, cache: 'no-store' })
    // our API always answers JSON; a plain "Not Found" means no API behind this host
    if ((res.headers.get('content-type') || '').includes('application/json')) return false
  } catch {
    return false // offline / network problem: stay here and show the normal error
  }
  const { pathname, search, hash } = window.location
  window.location.replace(primary.origin + pathname + search + hash)
  return true
}
