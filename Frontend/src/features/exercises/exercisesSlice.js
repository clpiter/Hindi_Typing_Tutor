import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import api, { getErrorMessage } from '../../services/api.js'

export const fetchExercises = createAsyncThunk('exercises/fetchAll', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/exercises')
    return data.exercises
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

export const fetchExerciseByNumber = createAsyncThunk('exercises/fetchByNumber', async (number, { rejectWithValue }) => {
  try {
    const { data } = await api.get(`/exercises/number/${number}`)
    return data.exercise
  } catch (err) {
    return rejectWithValue(getErrorMessage(err))
  }
})

const exercisesSlice = createSlice({
  name: 'exercises',
  initialState: { list: [], listStatus: 'idle', listError: null, byNumber: {}, current: null, currentStatus: 'idle', currentError: null },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchExercises.pending, (s) => {
        s.listStatus = 'loading'
        s.listError = null
      })
      .addCase(fetchExercises.fulfilled, (s, { payload }) => {
        s.listStatus = 'succeeded'
        s.list = payload
      })
      .addCase(fetchExercises.rejected, (s, { payload }) => {
        s.listStatus = 'failed'
        s.listError = payload
      })
      .addCase(fetchExerciseByNumber.pending, (s) => {
        s.currentStatus = 'loading'
        s.currentError = null
      })
      .addCase(fetchExerciseByNumber.fulfilled, (s, { payload }) => {
        s.currentStatus = 'succeeded'
        s.current = payload
        s.byNumber[payload.exerciseNumber] = payload
      })
      .addCase(fetchExerciseByNumber.rejected, (s, { payload }) => {
        s.currentStatus = 'failed'
        s.currentError = payload
      })
  },
})

export default exercisesSlice.reducer
