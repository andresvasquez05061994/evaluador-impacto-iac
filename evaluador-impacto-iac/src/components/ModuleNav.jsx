import { C } from '../constants/colors'

export default function ModuleNav({ active, onChange }) {
  const modules = [
    { id: 'diagnostico', label: 'Diagnóstico', desc: 'Evaluación del proyecto activo' },
    { id: 'descubrimiento', label: 'Descubrimiento', desc: 'Qué automatizar primero' },
    { id: 'proyectos', label: 'Portafolio', desc: 'Priorización de oportunidades' },
  ]

  return (
    <nav className="module-nav" aria-label="Módulos principales">
      {modules.map(({ id, label }) => {
        const isActive = active === id
        return (
          <button
            key={id}
            type="button"
            className={`module-nav__item${isActive ? ' module-nav__item--active' : ''}`}
            onClick={() => onChange(id)}
            aria-current={isActive ? 'page' : undefined}
          >
            {label}
          </button>
        )
      })}
    </nav>
  )
}

export function DimensionNav({ tabs, active, onChange }) {
  return (
    <nav className="dimension-nav" aria-label="Dimensiones de impacto">
      {tabs.map(([id, label]) => {
        const isActive = active === id
        return (
          <button
            key={id}
            type="button"
            className={`dimension-nav__item${isActive ? ' dimension-nav__item--active' : ''}`}
            onClick={() => onChange(id)}
            aria-current={isActive ? 'page' : undefined}
          >
            {label}
          </button>
        )
      })}
    </nav>
  )
}

export function BtnPrimary({ children, onClick, title, style = {} }) {
  return (
    <button type="button" className="btn btn--primary" onClick={onClick} title={title} style={style}>
      {children}
    </button>
  )
}

export function BtnSecondary({ children, onClick, title, style = {} }) {
  return (
    <button type="button" className="btn btn--secondary" onClick={onClick} title={title} style={style}>
      {children}
    </button>
  )
}

export function BtnGhost({ children, onClick, title, style = {} }) {
  return (
    <button type="button" className="btn btn--ghost" onClick={onClick} title={title} style={style}>
      {children}
    </button>
  )
}

export function StatusChip({ children, variant = 'neutral' }) {
  const colors = {
    success: { bg: 'rgba(13,110,110,.1)', color: C.positive, border: 'rgba(13,110,110,.25)' },
    neutral: { bg: 'var(--accent-subtle)', color: 'var(--accent)', border: 'rgba(0,58,112,.15)' },
    muted: { bg: 'var(--bg4)', color: 'var(--text-muted)', border: 'var(--border)' },
  }
  const v = colors[variant] || colors.neutral
  return (
    <span className="status-chip" style={{ background: v.bg, color: v.color, border: `1px solid ${v.border}` }}>
      {children}
    </span>
  )
}
