import { useMemo, useState } from 'react'
import { C } from '../constants/colors'
import { FONT } from '../constants/typography'
import { fmtCOP } from '../utils/format'
import { pageTitle, pageSubtitle, panelPre } from '../styles/layout'

const SORT_OPTIONS = [
  { value: 'roi', label: 'ROI — mayor a menor' },
  { value: 'totalSavY', label: 'Ahorro anual — mayor a menor' },
  { value: 'payback', label: 'Recuperación — menor a mayor' },
  { value: 'autoLevel', label: 'Automatización — mayor a menor' },
  { value: 'efIndex', label: 'Eficiencia — mayor a menor' },
  { value: 'savedAt', label: 'Más reciente' },
  { value: 'org', label: 'Organización — A a Z' },
]

function formatDate(iso) {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const yyyy = d.getFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function priorityTier(roi) {
  if (roi > 150) return { label: 'Alta prioridad', color: C.positive }
  if (roi >= 80) return { label: 'Prioridad media', color: C.accent }
  return { label: 'Revisar viabilidad', color: C.negative }
}

function sortProjects(list, sortBy) {
  const arr = [...list]
  switch (sortBy) {
    case 'roi':
      return arr.sort((a, b) => b.metrics.roi - a.metrics.roi)
    case 'totalSavY':
      return arr.sort((a, b) => b.metrics.totalSavY - a.metrics.totalSavY)
    case 'payback':
      return arr.sort((a, b) => a.metrics.payback - b.metrics.payback)
    case 'autoLevel':
      return arr.sort((a, b) => b.metrics.autoLevel - a.metrics.autoLevel)
    case 'efIndex':
      return arr.sort((a, b) => b.metrics.efIndex - a.metrics.efIndex)
    case 'savedAt':
      return arr.sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt))
    case 'org':
      return arr.sort((a, b) => a.org.localeCompare(b.org, 'es'))
    default:
      return arr
  }
}

function portfolioSummary(projects) {
  if (!projects.length) {
    return { avgRoi: 0, totalSav: 0, bestPayback: null, count: 0 }
  }
  const avgRoi = Math.round(projects.reduce((s, p) => s + p.metrics.roi, 0) / projects.length)
  const totalSav = projects.reduce((s, p) => s + p.metrics.totalSavY, 0)
  const within12 = projects.filter((p) => p.metrics.payback <= 12)
  const bestPayback = within12.length
    ? Math.min(...within12.map((p) => p.metrics.payback))
    : null
  return { avgRoi, totalSav, bestPayback, count: projects.length }
}

function ComparisonMatrix({ projects }) {
  const ranked = sortProjects(projects, 'roi').slice(0, 6)
  if (ranked.length < 2) return null

  const rows = [
    { key: 'roi', label: 'ROI (12 meses)', fmt: (m) => `${m.roi > 0 ? '+' : ''}${m.roi}%` },
    { key: 'totalSavY', label: 'Ahorro anual', fmt: (m) => fmtCOP(m.totalSavY) },
    { key: 'payback', label: 'Recuperación', fmt: (m) => (m.payback <= 12 ? `Mes ${m.payback}` : '> 12M') },
    { key: 'net12', label: 'Beneficio neto 12M', fmt: (m) => fmtCOP(m.net12) },
    { key: 'inv12', label: 'Inversión 12M', fmt: (m) => fmtCOP(m.inv12) },
  ]

  return (
    <div style={{ marginBottom: 24, overflowX: 'auto', minWidth: 0 }}>
      <div style={{ ...panelPre, marginBottom: 8 }}>Matriz comparativa de priorización</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 520, tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, width: 120 }}>Indicador</th>
            {ranked.map((p, i) => (
              <th key={p.id} style={{ ...thStyle, textAlign: 'right', minWidth: 0 }}>
                <div style={{ fontSize: 9, color: 'var(--text-faint)', fontWeight: 500, marginBottom: 2 }}>#{i + 1}</div>
                <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.processType}</div>
                <div style={{ fontSize: 9, fontWeight: 400, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.org}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, label, fmt }) => (
            <tr key={key}>
              <td style={tdLabelStyle}>{label}</td>
              {ranked.map((p) => {
                const val = fmt(p.metrics)
                const isBest = key === 'roi' && p.metrics.roi === Math.max(...ranked.map((r) => r.metrics.roi))
                return (
                  <td key={p.id} style={{ ...tdValueStyle, fontWeight: isBest ? 600 : 400, color: isBest ? C.positive : 'var(--text)' }}>
                    {val}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const thStyle = {
  textAlign: 'left',
  padding: '8px 10px',
  borderBottom: '2px solid var(--border-strong)',
  color: 'var(--text-muted)',
  fontWeight: 600,
  fontSize: 10,
  letterSpacing: '.04em',
  background: 'var(--bg4)',
  overflow: 'hidden',
}

const tdLabelStyle = {
  padding: '7px 10px',
  borderBottom: '1px solid var(--border)',
  color: 'var(--text-muted)',
  fontWeight: 500,
  whiteSpace: 'nowrap',
  fontSize: 10,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
}

const tdValueStyle = {
  padding: '7px 10px',
  borderBottom: '1px solid var(--border)',
  textAlign: 'right',
  fontFamily: FONT,
  fontSize: 11,
  fontVariantNumeric: 'tabular-nums',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
}

function ProjectCard({ project, rank, onLoad, onDelete }) {
  const { metrics, sector, processType, narrative, org, savedAt } = project
  const tier = priorityTier(metrics.roi)
  const paybackOk = metrics.payback <= 12

  return (
    <article style={{ display: 'flex', background: 'var(--bg2)', border: '1px solid var(--border)', marginBottom: 1 }}>
      <div style={{ width: 3, flexShrink: 0, background: tier.color }} />
      <div style={{ flex: 1, padding: '12px 14px', minWidth: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
              {rank != null && (
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '.06em' }}>
                  RANK {String(rank).padStart(2, '0')}
                </span>
              )}
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--accent)', background: 'var(--accent-subtle)', padding: '2px 8px' }}>
                {tier.label}
              </span>
            </div>
            <h3 style={{ fontFamily: FONT, fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 3, lineHeight: 1.25, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {org}
            </h3>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {sector} · {processType} · {formatDate(savedAt)}
            </div>
          </div>
          <button
            type="button"
            title="Eliminar"
            onClick={() => onDelete(project.id)}
            className="btn btn--danger"
          >
            Eliminar
          </button>
        </div>

        {narrative && (
          <p style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            marginBottom: 14,
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}>
            {narrative}
          </p>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 8, marginBottom: 10, paddingTop: 10, borderTop: '1px solid var(--border)' }}>
          {[
            { label: 'ROI', val: `${metrics.roi > 0 ? '+' : ''}${metrics.roi}%`, highlight: metrics.roi > 0 },
            { label: 'Ahorro anual', val: fmtCOP(metrics.totalSavY), highlight: false },
            { label: 'Recuperación', val: paybackOk ? `Mes ${metrics.payback}` : '> 12M', highlight: paybackOk },
            { label: 'Automatización', val: `${metrics.autoLevel}%`, highlight: false },
            { label: 'Eficiencia', val: `${metrics.efIndex}/100`, highlight: false },
          ].map(({ label, val, highlight }) => (
            <div key={label} style={{ minWidth: 0 }}>
              <div style={{ fontSize: 8, color: 'var(--text-faint)', marginBottom: 2, letterSpacing: '.04em', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
              <div style={{
                fontFamily: FONT,
                fontSize: 13,
                fontWeight: 600,
                color: highlight ? C.positive : 'var(--text)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {val}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 10, color: 'var(--text-muted)', minWidth: 0 }}>
            <span>Horas liberadas: <strong style={{ color: 'var(--text-subtle)', fontWeight: 500 }}>{Math.round(metrics.savedHrsM)} h/mes</strong></span>
            <span>Errores evitados: <strong style={{ color: 'var(--text-subtle)', fontWeight: 500 }}>{metrics.errBefore - metrics.errAfter}/mes</strong></span>
            <span>Inversión 12M: <strong style={{ color: 'var(--text-subtle)', fontWeight: 500 }}>{fmtCOP(metrics.inv12)}</strong></span>
          </div>
          <button type="button" className="btn btn--text" onClick={() => onLoad(project)}>
            Cargar en evaluador
          </button>
        </div>
      </div>
    </article>
  )
}

export default function PanelProyectos({ projects, onLoad, onDelete, onClear, onGoToDiagnosis }) {
  const [sortBy, setSortBy] = useState('roi')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const base = q ? projects.filter((p) => p.org.toLowerCase().includes(q)) : projects
    return sortProjects(base, sortBy)
  }, [projects, search, sortBy])

  const summary = useMemo(() => portfolioSummary(projects), [projects])

  const handleClear = () => {
    if (window.confirm('¿Eliminar todos los escenarios guardados? Esta acción no se puede deshacer.')) {
      onClear()
    }
  }

  return (
    <div>
      <header style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, marginBottom: 28, flexWrap: 'wrap' }}>
        <div>
          <div style={panelPre}>Gestión de portafolio</div>
          <h1 style={pageTitle}>Portafolio de oportunidades</h1>
          <p style={pageSubtitle}>
            Compare escenarios diagnosticados, priorice inversiones y determine cuál proyecto genera el mayor impacto para la organización.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, paddingTop: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>
            {projects.length} escenario{projects.length !== 1 ? 's' : ''}
          </span>
          {projects.length > 0 && (
            <button type="button" className="btn btn--danger" onClick={handleClear}>
              Vaciar portafolio
            </button>
          )}
        </div>
      </header>

      {projects.length > 0 && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
            gap: 1,
            background: 'var(--border)',
            border: '1px solid var(--border)',
            marginBottom: 24,
          }}>
            {[
              { label: 'ROI promedio del portafolio', val: `${summary.avgRoi > 0 ? '+' : ''}${summary.avgRoi}%` },
              { label: 'Ahorro acumulado anual', val: fmtCOP(summary.totalSav) },
              { label: 'Mejor período de recuperación', val: summary.bestPayback != null ? `Mes ${summary.bestPayback}` : '> 12 meses' },
              { label: 'Escenarios en evaluación', val: String(summary.count) },
            ].map(({ label, val }) => (
              <div key={label} style={{ background: 'var(--bg2)', padding: '12px 14px', minWidth: 0, overflow: 'hidden' }}>
                <div style={{ fontSize: 9, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: '.06em', textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
                <div style={{ fontFamily: FONT, fontSize: 16, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{val}</div>
              </div>
            ))}
          </div>

          <ComparisonMatrix projects={projects} />

          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
              Ordenar
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--input-border)',
                  borderRadius: 2,
                  padding: '6px 10px',
                  fontFamily: FONT,
                  fontSize: 12,
                  color: 'var(--text)',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <input
              type="search"
              placeholder="Filtrar por organización"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                minWidth: 180,
                maxWidth: 320,
                background: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                borderRadius: 2,
                padding: '7px 10px',
                fontFamily: FONT,
                fontSize: 12,
                color: 'var(--text)',
                outline: 'none',
              }}
            />
          </div>
        </>
      )}

      {projects.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', border: '1px solid var(--border)', background: 'var(--bg2)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8, fontWeight: 500 }}>No hay escenarios en el portafolio</div>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 20, maxWidth: 400, margin: '0 auto 20px' }}>
            Complete un diagnóstico en el módulo de evaluación y guarde el escenario para compararlo con otras oportunidades de automatización.
          </div>
          {onGoToDiagnosis && (
            <button type="button" className="btn btn--primary" onClick={onGoToDiagnosis}>
              Ir a diagnóstico
            </button>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)', fontSize: 12, border: '1px solid var(--border)' }}>
          Sin resultados para &ldquo;{search}&rdquo;
        </div>
      ) : (
        <div style={{ border: '1px solid var(--border)' }}>
          {filtered.map((p, i) => (
            <ProjectCard
              key={p.id}
              project={p}
              rank={sortBy === 'roi' ? i + 1 : null}
              onLoad={onLoad}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}
