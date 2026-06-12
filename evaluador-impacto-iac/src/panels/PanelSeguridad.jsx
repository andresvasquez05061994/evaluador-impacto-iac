import { RadarChart, Radar, PolarGrid, PolarAngleAxis, Legend, ResponsiveContainer } from 'recharts'
import { C } from '../constants/colors'
import { FONT } from '../constants/typography'
import { chartCard, grid2, kpiGrid, panelPre, panelTitle, panelDesc } from '../styles/layout'
import KpiCard from '../components/KpiCard'

export default function PanelSeguridad({ d }) {
  const secRows = [
    ['Trazabilidad', 'Ninguna (correos)', `${d.traceabilityScore}% — log completo`],
    ['Validación documental', `${d.errBefore} reg./mes sin validar`, `${d.docsValidatedPerMonth.toLocaleString('es-CO')} docs/mes validados`],
    ['Control de acceso', 'Carpetas compartidas', `Roles y permisos (${d.secControls[2]?.score || 0}%)`],
    ['Cifrado de datos', 'No garantizado', `En tránsito y reposo (${d.secControls[3]?.score || 0}%)`],
    ['Cumplimiento normativo', `Score ${Math.round(d.compScore * 0.4)}/100`, `Score ${d.compScore}/100`],
    ['Detección de fraude', `${d.errBefore} casos/mes expuestos`, `${d.errAfter} casos/mes residual`],
    ['Historial cambios', 'No disponible', `Auditoría (${d.secControls[4]?.score || 0}%)`],
  ]

  return (
    <div>
      <div style={panelPre}>Dimensión de Seguridad</div>
      <div style={panelTitle}>Cumplimiento y Control</div>
      <div style={panelDesc}>
        Trazabilidad, validación normativa, protección de datos y control de acceso en cada etapa del proceso automatizado.
      </div>

      <div style={kpiGrid}>
        <KpiCard label="Trazabilidad del proceso" val={d.traceabilityScore + '%'} sub="solicitudes auditables" accent="teal" delta={{ pos: true, label: '▲ vs. proceso manual' }} />
        <KpiCard label="Documentos validados auto." val={d.docsValidatedPerMonth.toLocaleString('es-CO') + ' docs'} sub="validaciones / mes" delta={{ pos: true, label: '▲ vs. revisión manual' }} />
        <KpiCard label="Score de cumplimiento" val={d.compScore + '/100'} sub="índice / 100" delta={{ pos: true, label: '▲ normativa aplicable' }} />
        <KpiCard label="Exposición a riesgo" val={d.errBefore + ' reg.'} sub="registros no verificados/mes" accent="coral" delta={{ pos: false, label: 'riesgo activo hoy' }} />
      </div>

      <div style={grid2} className="panel-grid-2">
        <div style={chartCard}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-subtle)', marginBottom: 12 }}>Madurez en seguridad — 6 dimensiones</div>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={d.securityRadar}>
              <PolarGrid stroke="var(--chart-grid)" />
              <PolarAngleAxis dataKey="dim" tick={{ fill: C.gray, fontSize: 9 }} />
              <Radar name="Sin plataforma" dataKey="sin" stroke={C.coral} fill={C.coral} fillOpacity={0.2} />
              <Radar name="Con plataforma" dataKey="con" stroke={C.teal} fill={C.teal} fillOpacity={0.2} />
              <Legend wrapperStyle={{ fontSize: 10, color: C.gray }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
        <div style={chartCard}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-subtle)', marginBottom: 12 }}>Controles de seguridad activos</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {d.secControls.map((sc, i) => {
              const r = 22
              const circ = 2 * Math.PI * r
              const dash = circ * sc.score / 100
              return (
                <div key={i} style={{ background: 'var(--bg4)', borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ width: 56, height: 56, margin: '0 auto 5px', position: 'relative' }}>
                    <svg width={56} height={56} viewBox="0 0 56 56" style={{ transform: 'rotate(-90deg)' }}>
                      <circle cx={28} cy={28} r={r} fill="none" stroke="var(--bg3)" strokeWidth={5} />
                      <circle cx={28} cy={28} r={r} fill="none" stroke={i % 2 === 0 ? C.teal : C.amber} strokeWidth={5}
                        strokeDasharray={`${dash.toFixed(1)} ${circ.toFixed(1)}`} strokeLinecap="round" />
                    </svg>
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontFamily: FONT, fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{sc.score}</div>
                  </div>
                  <div style={{ fontSize: 10, color: C.gray, lineHeight: 1.3 }}>{sc.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div style={chartCard}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-subtle)', marginBottom: 12 }}>Comparativa de controles — antes vs. después</div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: 480 }}>
            <thead>
              <tr>{['Control', 'Sin plataforma', 'Con plataforma'].map((h) => (
                <th key={h} style={{ padding: '6px 10px', textAlign: 'left', fontSize: 10, letterSpacing: '.06em', textTransform: 'uppercase', color: C.gray, borderBottom: '1px solid var(--border)' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {secRows.map(([a, b, c], i) => (
                <tr key={i}>
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-subtle)', fontWeight: 500 }}>{a}</td>
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)', color: C.coral }}>{b}</td>
                  <td style={{ padding: '7px 10px', borderBottom: '1px solid var(--border)', color: C.teal }}>{c}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
