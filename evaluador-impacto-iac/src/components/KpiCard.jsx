import { C } from '../constants/colors'
import { FONT } from '../constants/typography'

export default function KpiCard({ label, val, sub, delta, accent }) {
  const accentColor =
    accent === 'teal' ? C.teal :
    accent === 'coral' ? C.coral :
    accent === 'gray' ? C.gray : C.amber

  return (
    <div style={{
      background: 'var(--bg3)',
      borderRadius: 2,
      padding: '10px 11px',
      border: '1px solid var(--border)',
      position: 'relative',
      overflow: 'hidden',
      minWidth: 0,
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: accentColor }} />
      <div style={{ fontSize: 10, color: C.gray, marginBottom: 4, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{
        fontFamily: FONT,
        fontSize: 17,
        fontWeight: 600,
        lineHeight: 1.1,
        marginBottom: 2,
        color: 'var(--text)',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        fontVariantNumeric: 'tabular-nums',
      }}>{val}</div>
      {sub && <div style={{ fontSize: 9, color: 'var(--text-faint)', lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sub}</div>}
      {delta && (
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          fontSize: 9,
          fontWeight: 600,
          padding: '2px 6px',
          borderRadius: 2,
          marginTop: 4,
          maxWidth: '100%',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          background: delta.pos ? 'rgba(13,110,110,.12)' : 'rgba(155,61,74,.12)',
          color: delta.pos ? C.positive : C.negative,
        }}>{delta.label}</div>
      )}
    </div>
  )
}
