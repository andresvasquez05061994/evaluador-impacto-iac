import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts'
import { C } from '../constants/colors'
import { chartCard, grid2, kpiGrid, panelPre, panelTitle, panelDesc, chartTooltipStyle } from '../styles/layout'
import KpiCard from '../components/KpiCard'

export default function PanelTiempo({ d }) {
  const hoursD = [
    { name: 'Sin plataforma', value: Math.round(d.manualHrsBefore) },
    { name: 'Con plataforma', value: Math.round(d.manualHrsAfter) },
  ]

  return (
    <div>
      <div style={panelPre}>Dimensión Temporal</div>
      <div style={panelTitle}>Velocidad de Proceso</div>
      <div style={panelDesc}>
        Liberación de horas operativas, reducción del esfuerzo por registro y proyección de capacidad adicional del equipo.
      </div>

      <div style={kpiGrid}>
        <KpiCard label="Horas / registro actuales" val={d.hrs + ' h'} sub="esfuerzo manual por caso" accent="coral" />
        <KpiCard label="Horas / registro con plataforma" val={d.hrsPerRecordAfter + ' h'} sub="esfuerzo por caso" accent="teal" delta={{ pos: true, label: `▼ ${Math.round(d.tR * 100)}% menos tiempo` }} />
        <KpiCard label="Horas liberadas / mes" val={Math.round(d.savedHrsM) + ' h'} sub="horas recuperadas" delta={{ pos: true, label: '▲ capacidad disponible' }} />
        <KpiCard label="Registros adicionales posibles" val={'+' + d.extraP} sub="con el mismo equipo" delta={{ pos: true, label: '▲ escala sin costo' }} />
      </div>

      <div style={grid2} className="panel-grid-2">
        <div style={chartCard}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-subtle)', marginBottom: 12 }}>Horas totales invertidas / mes</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={hoursD}>
              <XAxis dataKey="name" tick={{ fill: C.gray, fontSize: 10 }} />
              <YAxis tick={{ fill: C.gray, fontSize: 10 }} tickFormatter={(v) => v + ' h'} />
              <Tooltip formatter={(v) => v + ' h/mes'} contentStyle={chartTooltipStyle} />
              <Bar dataKey="value" name="Horas" radius={[4, 4, 0, 0]}>
                <Cell fill={C.coral} fillOpacity={0.7} />
                <Cell fill={C.teal} fillOpacity={0.7} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={chartCard}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-subtle)', marginBottom: 12 }}>Proyección de capacidad (registros/mes)</div>
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={d.capacityProjection}>
              <XAxis dataKey="m" tick={{ fill: C.gray, fontSize: 10 }} />
              <YAxis tick={{ fill: C.gray, fontSize: 10 }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 10, color: C.gray }} />
              <Line dataKey="sin" name="Sin plataforma" stroke={C.coral} strokeDasharray="5 3" dot={false} strokeWidth={1.5} />
              <Line dataKey="con" name="Con plataforma" stroke={C.teal} dot={false} strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
