import { C } from '../constants/colors'
import { FONT } from '../constants/typography'

export default function TabBtn({ id, icon, label, active, onClick }) {
  return (
    <button
      onClick={() => onClick(id)}
      style={{
        fontFamily: FONT,
        fontSize: 11,
        fontWeight: active ? 600 : 400,
        padding: '7px 14px',
        borderRadius: 7,
        border: `1px solid ${active ? C.amber : 'var(--border-strong)'}`,
        background: active ? C.amber : 'var(--tab-inactive-bg)',
        color: active ? 'var(--accent-text-on)' : 'var(--tab-inactive-text)',
        cursor: 'pointer',
        transition: 'all .15s',
      }}
    >
      {icon} {label}
    </button>
  )
}
