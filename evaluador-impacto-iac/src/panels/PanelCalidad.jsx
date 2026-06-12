import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { C } from '../constants/colors'
import { RISK_LVL_BG, RISK_LVL_TXT } from '../constants/severity'
import { fmtCOP, fmtPct } from '../utils/format'
import { chartCard, grid2, kpiGrid, panelPre, panelTitle, panelDesc, progBg, chartTooltipStyle } from '../styles/layout'
import KpiCard from '../components/KpiCard'

export default function PanelCalidad({ d }) {
  const errCmp = [
    { name: 'Tasa error %', before: d.errPct, after: +(d.errPct * (1 - d.eR)).toFixed(1) },
    { name: 'Errores/mes', before: d.errBefore, after: d.errAfter },
    { name: 'Costo K COP', before: Math.round(d.errBefore * d.errorCostPerCase / 1000), after: Math.round(d.errAfter * d.errorCostPerCase / 1000) },
  ]

  return (
    <div>
      <div style={panelPre}>Calidad y Riesgo Operativo</div>
      <div style={panelTitle}>Control de Calidad</div>
      <div style={panelDesc}>
        Reducción de inconsistencias documentales, errores de registro y riesgo de incorporación de terceros no validados.
      </div>

      <div style={kpiGrid}>
        <KpiCard label="Tasa de error actual" val={fmtPct(d.errPct)} sub="% registros con incidencias" accent="coral" delta={{ pos: false, label: 'riesgo sin plataforma' }} />
        <KpiCard label="Tasa de error con plataforma" val={fmtPct(d.errPct * (1 - d.eR))} sub="% registros con incidencias" accent="teal" delta={{ pos: true, label: '▼ reducción de errores' }} />
        <KpiCard label="Errores evitados / mes" val={`${d.errBefore - d.errAfter} casos`} sub="casos / mes" delta={{ pos: true, label: '▲ calidad documental' }} />
        <KpiCard label="Ahorro retrabajo evitado" val={fmtCOP(d.errSavM)} sub="COP / mes" delta={{ pos: true, label: '▲ costo de corrección' }} />
      </div>

      <div style={grid2} className="panel-grid-2">
        <div style={chartCard}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-subtle)', marginBottom: 12 }}>Tasa de error: antes vs. después</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={errCmp}>
              <XAxis dataKey="name" tick={{ fill: C.gray, fontSize: 10 }} />
              <YAxis tick={{ fill: C.gray, fontSize: 10 }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10, color: C.gray }} />
              <Bar dataKey="before" name="Sin plataforma" fill={C.coral} fillOpacity={0.7} radius={[3, 3, 0, 0]} />
              <Bar dataKey="after" name="Con plataforma" fill={C.teal} fillOpacity={0.7} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={chartCard}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-subtle)', marginBottom: 12 }}>Distribución del riesgo documental</div>
          {d.riskDistribution.map((r, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{r.label}</span>
                <span style={{ fontSize: 10 }}>
                  <span style={{ color: C.coral }}>{r.before}%</span>
                  <span style={{ color: 'var(--text-muted)' }}> → </span>
                  <span style={{ color: C.teal }}>{r.after}%</span>
                </span>
              </div>
              <div style={progBg}><div style={{ height: '100%', borderRadius: 4, background: C.coral, width: `${Math.min(100, r.before)}%`, transition: 'width .6s' }} /></div>
              <div style={progBg}><div style={{ height: '100%', borderRadius: 4, background: C.teal, width: `${Math.min(100, r.after)}%`, transition: 'width .6s' }} /></div>
            </div>
          ))}
        </div>
      </div>

      <div style={chartCard}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-subtle)', marginBottom: 12 }}>Matriz de riesgo operativo — antes y después</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, paddingTop: 6 }} className="panel-grid-2">
          {['Sin plataforma', 'Con plataforma'].map((label, side) => (
            <div key={side}>
              <div style={{ fontSize: 10, fontWeight: 600, color: side === 0 ? C.coral : C.teal, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
                {d.riskMatrix.map((r, i) => {
                  const lv = side === 0 ? r.before : r.after
                  return (
                    <div key={i} style={{ borderRadius: 7, padding: '7px 4px', textAlign: 'center', background: RISK_LVL_BG[lv] }}>
                      <div style={{ fontSize: 9, color: RISK_LVL_TXT[lv], fontWeight: 500, marginBottom: 2 }}>{r.label}</div>
                      <div style={{ fontSize: 10, color: RISK_LVL_TXT[lv], fontWeight: 700 }}>{lv}</div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
