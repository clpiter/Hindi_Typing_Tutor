/**
 * localStorage wrapper for temporary, non-sensitive practice state
 * (the half-typed text of the current line). It is per user and per exercise and
 * is cleared when a line/exercise is saved to MongoDB, which stays the permanent
 * record. Every access is guarded because storage can be unavailable (private
 * mode, blocked site data).
 */
const PREFIX = 'htt:'

export function readStore(key, fallback = null) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export function writeStore(key, value) {
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    /* storage full or blocked – drafts are optional */
  }
}

export function removeStore(key) {
  try {
    window.localStorage.removeItem(PREFIX + key)
  } catch {
    /* ignore */
  }
}

export const draftKey = (userId, exerciseId) => `draft:${userId}:${exerciseId}`
