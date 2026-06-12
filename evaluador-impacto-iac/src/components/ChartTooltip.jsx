import { C } from '../constants/colors'
import { fmtCOP } from '../utils/format'

export default function ChartTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null
  const fmt = formatter || fmtCOP
  return (
    <div style={{
      background: 'var(--bg3)',
      border: '1px solid var(--border-strong)',
      borderRadius: 6,
      padding: '8px 12px',
      fontSize: 11,
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || C.amber }}>{p.name}: {fmt(p.value)}</div>
      ))}
    </div>
  )
}
