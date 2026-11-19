import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api, { getErrorMessage, getFieldErrors } from '../../services/api.js'

const reject = (err, rejectWithValue) =>
  rejectWithValue({ message: getErrorMessage(err), fieldErrors: getFieldErrors(err), status: err?.response?.status })

/** Restores the session after a page refresh using the HTTP-only cookie */
export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/auth/me')
    return data.user
  } catch (err) {
    return reject(err, rejectWithValue)
  }
})

export const login = createAsyncThunk('auth/login', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/login', payload)
    return data.user
  } catch (err) {
    return reject(err, rejectWithValue)
  }
})

export const register = createAsyncThunk('auth/register', async (payload, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/register', payload)
    return data.user
  } catch (err) {
    return reject(err, rejectWithValue)
  }
})

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await api.post('/auth/logout')
  } catch {
    /* even if the request fails the local session is cleared */
  }
  return true
})

const initialState = {
  user: null,
  initialized: false, // true once /auth/me has answered
  loading: false,
  error: null,
  fieldErrors: {},
}

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    sessionExpired(state) {
      state.user = null
      state.error = 'Your session has expired. Please log in again.'
    },
    clearAuthError(state) {
      state.error = null
      state.fieldErrors = {}
    },
    updateUserPreferences(state, action) {
      if (state.user) state.user.preferences = { ...state.user.preferences, ...action.payload }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMe.fulfilled, (state, { payload }) => {
        state.user = payload
        state.initialized = true
      })
      .addCase(fetchMe.rejected, (state) => {
        state.user = null
        state.initialized = true
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null
        state.error = null
      })
    for (const thunk of [login, register]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.loading = true
          state.error = null
          state.fieldErrors = {}
        })
        .addCase(thunk.fulfilled, (state, { payload }) => {
          state.loading = false
          state.user = payload
          state.initialized = true
        })
        .addCase(thunk.rejected, (state, { payload }) => {
          state.loading = false
          state.error = payload?.message || 'Request failed'
          state.fieldErrors = payload?.fieldErrors || {}
        })
    }
  },
})

export const { sessionExpired, clearAuthError, updateUserPreferences } = authSlice.actions
export const selectUser = (s) => s.auth.user
export default authSlice.reducer
