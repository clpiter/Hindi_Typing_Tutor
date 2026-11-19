import { useSelector } from 'react-redux'
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

/** chart colours per theme (SVG attributes cannot read CSS variables) */
function useChartColors() {
  const dark = useSelector((s) => s.settings.theme) === 'dark'
  return dark
    ? { INK: '#9aa4b6', GRID: '#26314a', PRIMARY: '#818cf8', SUCCESS: '#4ade80', CURSOR: 'rgba(129,140,248,0.12)', DOT: '#141c2f' }
    : { INK: '#6b7280', GRID: '#eef0f4', PRIMARY: '#4f46e5', SUCCESS: '#16a34a', CURSOR: 'rgba(79,70,229,0.06)', DOT: '#fff' }
}

const shortDate = (d) => {
  const [, m, day] = String(d).split('-')
  return day && m ? `${Number(day)}/${Number(m)}` : d
}

function ChartTooltip({ active, payload, label, unit, labelFormatter = shortDate }) {
  if (!active || !payload?.length) return null
  return (
    <div className="card-soft px-3 py-2 small" style={{ boxShadow: '0 6px 20px rgba(0,0,0,.12)' }}>
      <div className="text-muted">{labelFormatter(label)}</div>
      <div className="fw-semibold">
        {payload[0].value} {unit}
      </div>
    </div>
  )
}

/** Single-series bar chart (one hue, no legend – the card title names the series) */
export function DailyBarChart({ data, dataKey, unit, height = 220 }) {
  const { INK, GRID, PRIMARY, CURSOR } = useChartColors()
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barCategoryGap="28%">
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} tick={{ fill: INK, fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fill: INK, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ fill: CURSOR }} content={<ChartTooltip unit={unit} />} />
        <Bar dataKey={dataKey} fill={PRIMARY} radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/** Single-series trend line with crosshair tooltip */
export function TrendLineChart({ data, dataKey, xKey = 'date', unit, height = 220, domain, xFormatter = shortDate, tone = 'primary' }) {
  const { INK, GRID, PRIMARY, SUCCESS, DOT } = useChartColors()
  const color = tone === 'success' ? SUCCESS : PRIMARY
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey={xKey} tickFormatter={xFormatter} tick={{ fill: INK, fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={16} />
        <YAxis domain={domain} tick={{ fill: INK, fontSize: 11 }} axisLine={false} tickLine={false} />
        <Tooltip cursor={{ stroke: '#c7d2fe', strokeWidth: 1 }} content={<ChartTooltip unit={unit} labelFormatter={xFormatter} />} />
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, fill: DOT }} activeDot={{ r: 5 }} connectNulls />
      </LineChart>
    </ResponsiveContainer>
  )
}
