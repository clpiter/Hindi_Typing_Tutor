import axios from 'axios'
import { getCookie } from '../utils/cookies.js'

/**
 * Axios instance for the REST API.
 *  - withCredentials: the JWT lives in an HTTP-only cookie the browser sends itself;
 *    the token is never readable from JavaScript and never stored in localStorage.
 *  - CSRF: the server sets a readable `csrf_token` cookie; we echo it in the
 *    X-CSRF-Token header on every state-changing request (double-submit cookie).
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

let csrfPromise = null
export async function ensureCsrf() {
  if (getCookie('csrf_token')) return getCookie('csrf_token')
  if (!csrfPromise) {
    csrfPromise = api.get('/auth/csrf').finally(() => {
      csrfPromise = null
    })
  }
  const res = await csrfPromise
  return getCookie('csrf_token') || res.data.csrfToken
}

api.interceptors.request.use(async (config) => {
  const method = (config.method || 'get').toLowerCase()
  if (!['get', 'head', 'options'].includes(method)) {
    config.headers['X-CSRF-Token'] = await ensureCsrf()
  }
  return config
})

let onUnauthorized = null
/** The store registers a callback so an expired session logs the user out */
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const { config, response } = error
    // CSRF cookie missing/rotated: fetch a fresh one and retry once
    if (response?.status === 403 && /csrf/i.test(response.data?.message || '') && !config._csrfRetry) {
      config._csrfRetry = true
      document.cookie = 'csrf_token=; Max-Age=0; path=/'
      await ensureCsrf()
      return api(config)
    }
    if (response?.status === 401 && !config.url.includes('/auth/me') && !config.url.includes('/auth/login') && onUnauthorized) {
      onUnauthorized()
    }
    return Promise.reject(error)
  },
)

/** Turn any axios error into a friendly message (English + Hindi where useful) */
export function getErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return fallback
  if (error.response) {
    const { data, status } = error.response
    if (data?.message) return data.message
    if (status >= 500) return 'Server error. Please try again later. (सर्वर त्रुटि)'
    return fallback
  }
  if (error.code === 'ECONNABORTED') return 'The request timed out. Please check your connection.'
  if (error.request) return 'Network error – cannot reach the server. Is the backend running? (नेटवर्क त्रुटि)'
  return error.message || fallback
}

export function getFieldErrors(error) {
  const list = error?.response?.data?.errors
  if (!Array.isArray(list)) return {}
  return list.reduce((acc, e) => ({ ...acc, [e.field]: acc[e.field] || e.message }), {})
}

export default api
