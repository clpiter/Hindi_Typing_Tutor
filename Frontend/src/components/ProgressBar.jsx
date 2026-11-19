import { ProgressBar as BsProgressBar } from 'react-bootstrap'

/** Labelled progress bar (value/max) */
export default function ProgressBar({ value = 0, max = 100, label, variant, height = 10, showText = true, className = '' }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className={className}>
      {(label || showText) && (
        <div className="d-flex justify-content-between small mb-1">
          <span className="text-muted">{label}</span>
          {showText && (
            <span className="fw-semibold">
              {value}/{max} ({pct}%)
            </span>
          )}
        </div>
      )}
      <BsProgressBar
        now={pct}
        variant={variant || (pct === 100 ? 'success' : undefined)}
        style={{ height, borderRadius: 999 }}
        aria-label={label || 'progress'}
        aria-valuenow={pct}
      />
    </div>
  )
}
