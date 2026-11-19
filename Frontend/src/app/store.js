import { configureStore, combineReducers } from '@reduxjs/toolkit'
import authReducer, { sessionExpired } from '../features/auth/authSlice.js'
import exercisesReducer from '../features/exercises/exercisesSlice.js'
import progressReducer from '../features/progress/progressSlice.js'
import settingsReducer from '../features/settings/settingsSlice.js'
import { setUnauthorizedHandler } from '../services/api.js'

const rootReducer = combineReducers({
  auth: authReducer,
  exercises: exercisesReducer,
  progress: progressReducer,
  settings: settingsReducer,
})

export function makeStore(preloadedState) {
  const store = configureStore({ reducer: rootReducer, preloadedState })
  setUnauthorizedHandler(() => {
    if (store.getState().auth.user) store.dispatch(sessionExpired())
  })
  return store
}

export const store = makeStore()

