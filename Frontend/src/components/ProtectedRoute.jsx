import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useSelector } from 'react-redux'
import Loader from './Loader.jsx'

/** Renders child routes only for an authenticated user; otherwise redirects to /login */
export default function ProtectedRoute({ children }) {
  const { user, initialized } = useSelector((s) => s.auth)
  const location = useLocation()
  if (!initialized) return <Loader fullscreen label="Restoring your session…" />
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return children ?? <Outlet />
}

/** Login/Register: send already-authenticated users to the dashboard */
export function PublicOnlyRoute({ children }) {
  const { user, initialized } = useSelector((s) => s.auth)
  const location = useLocation()
  if (!initialized) return <Loader fullscreen label="Loading…" />
  if (user) return <Navigate to={location.state?.from?.pathname || '/dashboard'} replace />
  return children ?? <Outlet />
}
