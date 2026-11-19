import { Link } from 'react-router-dom'
import { Button } from 'react-bootstrap'
import KrutiText from '../components/KrutiText.jsx'

export default function NotFound() {
  return (
    <div className="d-flex flex-column align-items-center justify-content-center text-center py-5" style={{ minHeight: '70vh' }}>
      <div className="display-1 fw-bold text-primary">404</div>
      <h1 className="h4">
        <KrutiText text="पृष्ठ नहीं मिला" /> — Page not found
      </h1>
      <p className="text-muted">The page you are looking for does not exist.</p>
      <Button as={Link} to="/dashboard" className="btn-gradient">
        Go to dashboard
      </Button>
    </div>
  )
}
