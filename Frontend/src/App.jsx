import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { fetchMe } from './features/auth/authSlice.js'
import { ensureCsrf } from './services/api.js'
import ProtectedRoute, { PublicOnlyRoute } from './components/ProtectedRoute.jsx'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Practice from './pages/Practice.jsx'
import Exercises from './pages/Exercises.jsx'
import Profile from './pages/Profile.jsx'
import History from './pages/History.jsx'
import NotFound from './pages/NotFound.jsx'

export default function App() {
  const dispatch = useDispatch()
  const theme = useSelector((s) => s.settings.theme)

  // light / dark mode: Bootstrap and the app's colour tokens follow data-bs-theme
  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme === 'dark' ? 'dark' : 'light')
  }, [theme])

  // restore the session from the HTTP-only cookie after a refresh
  useEffect(() => {
    ensureCsrf().catch(() => {})
    dispatch(fetchMe())
  }, [dispatch])

  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route element={<Layout />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/practice" element={<Practice />} />
          <Route path="/practice/:exerciseNumber" element={<Practice />} />
          <Route path="/exercises" element={<Exercises />} />
          <Route path="/history" element={<History />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Route>
    </Routes>
  )
}
