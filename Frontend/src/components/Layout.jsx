import { Outlet } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { Alert } from 'react-bootstrap'
import Navbar from './Navbar.jsx'
import Sidebar from './Sidebar.jsx'
import { clearAuthError } from '../features/auth/authSlice.js'

export default function Layout() {
  const error = useSelector((s) => s.auth.error)
  const dispatch = useDispatch()
  return (
    <>
      <a href="#main" className="visually-hidden-focusable btn btn-primary position-absolute m-2" style={{ zIndex: 2000 }}>
        Skip to content
      </a>
      <Navbar />
      <div className="app-shell">
        <Sidebar />
        <main id="main" className="app-main">
          {error && (
            <Alert variant="warning" dismissible onClose={() => dispatch(clearAuthError())}>
              {error}
            </Alert>
          )}
          <Outlet />
        </main>
      </div>
    </>
  )
}
