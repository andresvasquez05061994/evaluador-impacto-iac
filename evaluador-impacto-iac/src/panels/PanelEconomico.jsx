import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { C } from '../constants/colors'
import { fmtCOP } from '../utils/format'
import { chartCard, grid2, kpiGrid, panelPre, panelTitle, panelDesc, chartTooltipStyle } from '../styles/layout'
import KpiCard from '../components/KpiCard'
import ChartTooltip from '../components/ChartTooltip'

export default function PanelEconomico({ d }) {
  const svBreak = [
    { name: 'Ahorro operativo', value: Math.round(d.savedCostM) },
    { name: 'Reducción retrabajos', value: Math.round(d.errSavM) },
  ]
  const roiBar = [
    { name: 'Inversión 12M', value: d.inv12 },
    { name: 'Ahorro 12M', value: d.totalSavY },
    { name: 'Beneficio neto', value: d.net12 },
  ]

  return (
    <div>
      <div style={panelPre}>Dimensión Económica</div>
      <div style={panelTitle}>Impacto Financiero</div>
      <div style={panelDesc}>
        Retorno cuantificable sobre la inversión, incluyendo ahorro operativo, reducción de retrabajos y proyección del flujo de caja neto a 12 meses.
      </div>

      <div style={kpiGrid}>
        <KpiCard label="Ahorro mensual — operación" val={fmtCOP(d.savedCostM)} sub="COP / mes" delta={{ pos: true, label: 'vs. proceso actual' }} />
        <KpiCard label="Ahorro anual proyectado" val={fmtCOP(d.totalSavY)} sub="COP / año" accent="teal" delta={{ pos: true, label: 'vs. proceso actual' }} />
        <KpiCard label="Ahorro por reducción errores" val={fmtCOP(d.errSavM)} sub="COP / mes" delta={{ pos: true, label: 'retrabajo evitado' }} />
        <KpiCard label="ROI neto a 12 meses" val={(d.roi > 0 ? '+' : '') + d.roi + '%'} sub="retorno sobre inversión total" accent="gray" delta={{ pos: d.roi > 0, label: 'incluye costos del proyecto' }} />
        <KpiCard label="Inversión inicial total" val={fmtCOP(d.totalImpl ?? d.impl)} sub="impl. + conceptos únicos" accent="coral" delta={{ pos: false, label: 'desembolso inicial' }} />
        <KpiCard label="Costos recurrentes / mes" val={fmtCOP(d.totalMonthlyCost ?? d.monthly)} sub="SaaS + conceptos mensuales" accent="coral" delta={{ pos: false, label: 'cargo mensual' }} />
        <KpiCard label="Costo total 12 meses" val={fmtCOP(d.inv12)} sub="inversión completa período" accent="coral" delta={{ pos: false, label: 'inversión total' }} />
        <KpiCard label="Beneficio neto 12 meses" val={(d.net12 >= 0 ? '+' : '') + fmtCOP(d.net12)} sub="ahorro menos inversión" delta={{ pos: d.net12 >= 0, label: d.net12 >= 0 ? 'valor generado' : 'no recuperada' }} />
      </div>

      <div style={grid2} className="panel-grid-2">
        <div style={chartCard}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-subtle)', marginBottom: 12 }}>Flujo de caja neto acumulado — 12 meses</div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={d.cashFlow}>
              <XAxis dataKey="m" tick={{ fill: C.gray, fontSize: 10 }} />
              <YAxis tick={{ fill: C.gray, fontSize: 10 }} tickFormatter={(v) => fmtCOP(v)} />
              <Tooltip content={<ChartTooltip />} />
              <Line dataKey="val" name="Flujo neto" stroke={C.amber} strokeWidth={2} dot={{ fill: C.amber, r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div style={chartCard}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-subtle)', marginBottom: 12 }}>Estructura del ahorro mensual</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={svBreak} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3}>
                <Cell fill={C.teal} /><Cell fill={C.amber} />
              </Pie>
              <Tooltip formatter={(v) => fmtCOP(v)} contentStyle={chartTooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11, color: C.gray }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={chartCard}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-subtle)', marginBottom: 12 }}>Comparativo inversión vs. ahorro acumulado</div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={roiBar}>
            <XAxis dataKey="name" tick={{ fill: C.gray, fontSize: 10 }} />
            <YAxis tick={{ fill: C.gray, fontSize: 10 }} tickFormatter={(v) => '$' + Math.round(v / 1e6) + 'M'} />
            <Tooltip formatter={(v) => fmtCOP(v)} contentStyle={chartTooltipStyle} />
            <Bar dataKey="value" name="Valor" radius={[4, 4, 0, 0]}>
              <Cell fill={C.coral} fillOpacity={0.7} />
              <Cell fill={C.teal} fillOpacity={0.7} />
              <Cell fill={C.amber} fillOpacity={0.7} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
