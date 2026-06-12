import { BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { C } from '../constants/colors'
import { FONT } from '../constants/typography'
import { chartCard, grid2, kpiGrid, panelPre, panelTitle, panelDesc, progBg, chartTooltipStyle } from '../styles/layout'
import KpiCard from '../components/KpiCard'

export default function PanelEficiencia({ d }) {
  return (
    <div>
      <div style={panelPre}>Dimensión Operativa</div>
      <div style={panelTitle}>Eficiencia y Automatización</div>
      <div style={panelDesc}>
        Nivel de automatización alcanzado, capacidad de escalabilidad y productividad mediante la eliminación de tareas manuales.
      </div>

      <div style={kpiGrid}>
        <KpiCard label="Nivel de automatización" val={d.autoLevel + '%'} sub="del proceso cubierto" accent="teal" delta={{ pos: true, label: `vs. ${Math.round(100 - d.autoLevel)}% manual` }} />
        <KpiCard label="Tareas manuales eliminadas" val={d.tasksAutomatedPerRecord + ' h/reg.'} sub="horas / registro" delta={{ pos: true, label: '▲ productividad' }} />
        <KpiCard label="Capacidad de escala" val={'+' + d.scalePct + '%'} sub="más registros sin aumentar equipo" delta={{ pos: true, label: '▲ sin costo incremental' }} />
        <KpiCard label="Índice eficiencia operativa" val={d.efIndex + '/100'} sub="score / 100" accent="gray" delta={{ pos: true, label: '▲ vs. proceso manual' }} />
      </div>

      <div style={grid2} className="panel-grid-2">
        <div style={chartCard}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-subtle)', marginBottom: 12 }}>Automatización por módulo</div>
          {d.automods.map((m, i) => (
            <div key={i} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                <span style={{ fontSize: 11, color: 'var(--text-subtle)' }}>{m.label}</span>
                <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{m.pct}%</span>
              </div>
              <div style={progBg}><div style={{ height: '100%', borderRadius: 4, background: C.teal, width: `${m.pct}%`, transition: 'width .6s' }} /></div>
            </div>
          ))}
        </div>
        <div style={chartCard}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-subtle)', marginBottom: 12 }}>Esfuerzo manual: antes vs. después</div>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={d.effortDimensions}>
              <PolarGrid stroke="var(--chart-grid)" />
              <PolarAngleAxis dataKey="dim" tick={{ fill: C.gray, fontSize: 9 }} />
              <Radar name="Sin plataforma" dataKey="sin" stroke={C.coral} fill={C.coral} fillOpacity={0.2} />
              <Radar name="Con plataforma" dataKey="con" stroke={C.teal} fill={C.teal} fillOpacity={0.2} />
              <Legend wrapperStyle={{ fontSize: 10, color: C.gray }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={chartCard}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-subtle)', marginBottom: 12 }}>Productividad acumulada — 12 meses</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={d.productivityProjection}>
            <XAxis dataKey="m" tick={{ fill: C.gray, fontSize: 10 }} />
            <YAxis tick={{ fill: C.gray, fontSize: 10 }} tickFormatter={(v) => v + ' h'} />
            <Tooltip formatter={(v) => v + ' h acumuladas'} contentStyle={chartTooltipStyle} />
            <Bar dataKey="h" fill={C.amber} fillOpacity={0.7} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
