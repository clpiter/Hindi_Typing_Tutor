/**
 * Minimal cookie helpers for NON-sensitive, readable cookies only
 * (CSRF token echo, UI preferences). The auth JWT is an HTTP-only cookie that
 * JavaScript cannot read or write.
 */
export function getCookie(name) {
  if (typeof document === 'undefined') return null
  const match = document.cookie.split('; ').find((c) => c.startsWith(name + '='))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}

export function setCookie(name, value, { days = 365, sameSite = 'Lax' } = {}) {
  if (typeof document === 'undefined') return
  const secure = window.location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${days * 86400}; path=/; SameSite=${sameSite}${secure}`
}

export function deleteCookie(name) {
  if (typeof document === 'undefined') return
  document.cookie = `${name}=; Max-Age=0; path=/`
}

export function getJsonCookie(name, fallback = null) {
  try {
    const v = getCookie(name)
    return v ? JSON.parse(v) : fallback
  } catch {
    return fallback
  }
}
