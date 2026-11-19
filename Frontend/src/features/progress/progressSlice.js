import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api, { getErrorMessage } from '../../services/api.js'

const tz = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  } catch {
    return 'UTC'
  }
}

const thunk = (type, fn) =>
  createAsyncThunk(type, async (arg, { rejectWithValue }) => {
    try {
      return await fn(arg)
    } catch (err) {
      return rejectWithValue(getErrorMessage(err))
    }
  })

export const fetchDashboard = thunk('progress/dashboard', async () => (await api.get('/progress/dashboard', { params: { tz: tz() } })).data.dashboard)
export const fetchSummary = thunk('progress/summary', async () => (await api.get('/progress')).data.progress)
export const fetchContinue = thunk('progress/continue', async () => (await api.get('/progress/continue')).data)
export const fetchHistory = thunk('progress/history', async (params = {}) => {
  const clean = Object.fromEntries(Object.entries(params).filter(([, v]) => v !== '' && v != null))
  return (await api.get('/progress/history', { params: clean })).data
})
export const fetchExerciseProgress = thunk('progress/exercise', async (exerciseId) => (await api.get(`/progress/${exerciseId}`)).data)
export const saveLineResult = thunk('progress/saveLine', async (payload) => (await api.post('/progress/save', payload)).data)
export const resetExerciseProgress = thunk('progress/reset', async (exerciseId) => (await api.post(`/progress/reset/${exerciseId}`)).data)

const block = () => ({ data: null, status: 'idle', error: null })

const progressSlice = createSlice({
  name: 'progress',
  initialState: {
    dashboard: block(),
    summary: block(),
    history: block(),
    continueInfo: block(),
    lastSave: block(),
  },
  reducers: {},
  extraReducers: (builder) => {
    const wire = (t, key) =>
      builder
        .addCase(t.pending, (s) => {
          s[key].status = 'loading'
          s[key].error = null
        })
        .addCase(t.fulfilled, (s, { payload }) => {
          s[key].status = 'succeeded'
          s[key].data = payload
        })
        .addCase(t.rejected, (s, { payload }) => {
          s[key].status = 'failed'
          s[key].error = payload
        })
    wire(fetchDashboard, 'dashboard')
    wire(fetchSummary, 'summary')
    wire(fetchHistory, 'history')
    wire(fetchContinue, 'continueInfo')
    wire(saveLineResult, 'lastSave')
  },
})

export default progressSlice.reducer
