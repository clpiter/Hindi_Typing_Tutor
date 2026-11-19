import { NavLink } from 'react-router-dom'
import { FaChartPie, FaKeyboard, FaListOl, FaHistory, FaUser } from 'react-icons/fa'
import KrutiText from './KrutiText.jsx'

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', hi: 'डैशबोर्ड', icon: FaChartPie },
  { to: '/practice', label: 'Practice', hi: 'अभ्यास करें', icon: FaKeyboard },
  { to: '/exercises', label: 'Exercises', hi: 'सभी अभ्यास', icon: FaListOl },
  { to: '/history', label: 'History', hi: 'इतिहास', icon: FaHistory },
  { to: '/profile', label: 'Profile', hi: 'प्रोफ़ाइल', icon: FaUser },
]

export function NavLinks({ onNavigate }) {
  return NAV_ITEMS.map(({ to, label, hi, icon: Icon }) => (
    <NavLink key={to} to={to} className={({ isActive }) => `side-link ${isActive ? 'active' : ''}`} onClick={onNavigate}>
      <Icon aria-hidden="true" />
      <span className="flex-grow-1">{label}</span>
      <KrutiText text={hi} className="small opacity-75" />
    </NavLink>
  ))
}

export default function Sidebar() {
  return (
    <aside className="app-sidebar" aria-label="Main navigation">
      <div className="side-section">Menu</div>
      <nav>
        <NavLinks />
      </nav>
      <div className="side-section mt-3">Tip</div>
      <div className="small text-muted px-3">
        <KrutiText text="रोज़ 15 मिनट अभ्यास करें — शुद्धता पहले, गति बाद में।" />
      </div>
    </aside>
  )
}
