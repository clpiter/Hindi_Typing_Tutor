import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api from '../../services/api.js'
import { getJsonCookie, setCookie } from '../../utils/cookies.js'
import { fetchMe, login, register } from '../auth/authSlice.js'

/**
 * Practice preferences. They are remembered in a readable, non-sensitive cookie
 * (`htt_prefs`) so they apply instantly on the next visit, and synced to the
 * user's MongoDB profile so they follow the learner to other devices.
 */
export const PREFS_COOKIE = 'htt_prefs'
const KEYS = ['soundEnabled', 'showKeyboard', 'inputMode', 'lineCelebration', 'theme']

/** light/dark: follow the operating system until the learner picks one */
function systemTheme() {
  try {
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}
const DEFAULTS = { soundEnabled: true, showKeyboard: true, inputMode: 'kruti', lineCelebration: true, theme: systemTheme() }

function pick(obj = {}) {
  return KEYS.reduce((acc, k) => (obj[k] !== undefined && obj[k] !== null ? { ...acc, [k]: obj[k] } : acc), {})
}

export function loadPrefs() {
  return { ...DEFAULTS, ...pick(getJsonCookie(PREFS_COOKIE, {})) }
}

export function persistPrefs(prefs) {
  setCookie(PREFS_COOKIE, JSON.stringify(pick(prefs)))
}

export const savePreference = createAsyncThunk('settings/save', async (change, { getState, dispatch }) => {
  dispatch(setPreferences(change))
  if (getState().auth.user) {
    try {
      await api.patch('/auth/preferences', change)
    } catch {
      /* the cookie still has the value; the server copy syncs on the next change */
    }
  }
  return change
})

const settingsSlice = createSlice({
  name: 'settings',
  initialState: loadPrefs(),
  reducers: {
    setPreferences(state, { payload }) {
      Object.assign(state, pick(payload))
      persistPrefs(state)
    },
  },
  extraReducers: (builder) => {
    const fromServer = (state, { payload }) => {
      if (payload?.preferences) {
        Object.assign(state, pick(payload.preferences))
        persistPrefs(state)
      }
    }
    builder.addCase(fetchMe.fulfilled, fromServer).addCase(login.fulfilled, fromServer).addCase(register.fulfilled, fromServer)
  },
})

export const { setPreferences } = settingsSlice.actions
export default settingsSlice.reducer
