export default function StatCard({ icon: Icon, label, value, sub, color = '#4f46e5', bg = '#eef2ff', testId }) {
  return (
    <div className="card-soft card-hover stat-card fade-up" data-testid={testId}>
      <div className="stat-icon" style={{ color, background: bg }}>
        <Icon aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <div className="stat-value">{value}</div>
        <div className="stat-label">{label}</div>
        {sub && <div className="small text-muted text-truncate">{sub}</div>}
      </div>
    </div>
  )
}
