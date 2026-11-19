import { Spinner, Alert, Button } from 'react-bootstrap'
import { FaInbox } from 'react-icons/fa'

export default function Loader({ label = 'Loading…', fullscreen = false }) {
  return (
    <div
      className="d-flex flex-column align-items-center justify-content-center text-muted gap-2 py-5"
      style={fullscreen ? { minHeight: '100vh' } : undefined}
      role="status"
    >
      <Spinner animation="border" variant="primary" />
      <span>{label}</span>
    </div>
  )
}

export function ErrorAlert({ message, onRetry }) {
  if (!message) return null
  return (
    <Alert variant="danger" className="d-flex align-items-center justify-content-between gap-2">
      <span>{message}</span>
      {onRetry && (
        <Button size="sm" variant="outline-danger" onClick={onRetry}>
          Retry
        </Button>
      )}
    </Alert>
  )
}

export function EmptyState({ title, children, icon: Icon = FaInbox }) {
  return (
    <div className="empty-state">
      <Icon aria-hidden="true" />
      <h6 className="fw-semibold text-body">{title}</h6>
      <div>{children}</div>
    </div>
  )
}
