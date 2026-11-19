import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Button, Dropdown, Offcanvas } from 'react-bootstrap'
import { FaBars, FaSignOutAlt, FaUser, FaVolumeUp, FaVolumeMute, FaKeyboard, FaMoon, FaSun } from 'react-icons/fa'
import { logout } from '../features/auth/authSlice.js'
import { savePreference } from '../features/settings/settingsSlice.js'
import { NavLinks } from './Sidebar.jsx'
import KrutiText from './KrutiText.jsx'
import { unicodeToKruti } from '../utils/kruti/index.js'

const LOGO = unicodeToKruti('अ')

export default function Navbar() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const user = useSelector((s) => s.auth.user)
  const { soundEnabled, theme } = useSelector((s) => s.settings)
  const dark = theme === 'dark'
  const [showMenu, setShowMenu] = useState(false)

  const handleLogout = async () => {
    await dispatch(logout())
    navigate('/login', { replace: true })
  }

  return (
    <header className="app-navbar d-flex align-items-center px-3 gap-2">
      <Button variant="light" className="d-lg-none" onClick={() => setShowMenu(true)} aria-label="Open menu">
        <FaBars />
      </Button>
      <Link to="/dashboard" className="app-brand">
        <span className="app-brand-logo kruti" aria-hidden="true">
          {LOGO}
        </span>
        <span className="d-none d-sm-inline">
          <KrutiText text="हिंदी" /> Typing Tutor
        </span>
      </Link>

      <div className="ms-auto d-flex align-items-center gap-2">
        <Button
          variant="light"
          onClick={() => dispatch(savePreference({ theme: dark ? 'light' : 'dark' }))}
          title={dark ? 'Light mode' : 'Dark mode'}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          aria-pressed={dark}
          data-testid="theme-toggle"
        >
          {dark ? <FaSun className="text-warning" /> : <FaMoon />}
        </Button>
        <Button
          variant="light"
          onClick={() => dispatch(savePreference({ soundEnabled: !soundEnabled }))}
          title={soundEnabled ? 'Sound on' : 'Sound off'}
          aria-label={soundEnabled ? 'Turn sound off' : 'Turn sound on'}
          aria-pressed={soundEnabled}
        >
          {soundEnabled ? <FaVolumeUp /> : <FaVolumeMute />}
        </Button>
        <Button as={Link} to="/practice" className="btn-gradient d-none d-md-inline-flex align-items-center gap-2">
          <FaKeyboard /> Practice
        </Button>
        {user && (
          <Dropdown align="end">
            <Dropdown.Toggle variant="light" className="d-flex align-items-center gap-2" id="user-menu">
              <span
                className="rounded-circle bg-primary text-white d-inline-grid"
                style={{ width: 30, height: 30, placeItems: 'center', fontWeight: 700 }}
              >
                {user.name?.[0]?.toUpperCase() || 'U'}
              </span>
              <span className="d-none d-md-inline">{user.username}</span>
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Header>{user.name}</Dropdown.Header>
              <Dropdown.Item as={Link} to="/profile">
                <FaUser className="me-2" /> Profile
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Item onClick={handleLogout} data-testid="logout">
                <FaSignOutAlt className="me-2" /> Logout
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        )}
      </div>

      <Offcanvas show={showMenu} onHide={() => setShowMenu(false)} placement="start" style={{ width: 280 }}>
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Menu</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body>
          <NavLinks onNavigate={() => setShowMenu(false)} />
        </Offcanvas.Body>
      </Offcanvas>
    </header>
  )
}
