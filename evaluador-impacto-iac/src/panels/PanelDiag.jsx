import { C } from '../constants/colors'
import { FONT } from '../constants/typography'
import { SEV_BORDER, SEV_BG, SEV_COLOR } from '../constants/severity'
import { panelPre, pageTitle, pageSubtitle } from '../styles/layout'

export default function PanelDiag({ aiData, onReopen }) {
  if (!aiData) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem 2rem', border: '1px solid var(--border)', background: 'var(--bg2)' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 6 }}>Sin diagnóstico activo</div>
        <div style={{ fontSize: 12, color: 'var(--text-faint)', marginBottom: 20, maxWidth: 420, margin: '0 auto 20px', lineHeight: 1.6 }}>
          Inicie un nuevo diagnóstico para capturar el contexto del proceso, identificar riesgos y precargar los parámetros de evaluación.
        </div>
        <button type="button" className="btn btn--primary" onClick={onReopen}>
          Nuevo diagnóstico
        </button>
      </div>
    )
  }

  return (
    <div>
      <div style={panelPre}>Análisis del proceso</div>
      <h2 style={pageTitle}>Diagnóstico del proyecto</h2>
      <p style={{ ...pageSubtitle, marginBottom: 18 }}>
        Sector: <strong style={{ color: 'var(--text-subtle)', fontWeight: 600 }}>{aiData.sector}</strong>
        {' · '}
        Proceso: <strong style={{ color: 'var(--text-subtle)', fontWeight: 600 }}>{aiData.processType}</strong>
      </p>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button type="button" className="btn btn--secondary" onClick={onReopen}>
          Nuevo diagnóstico
        </button>
      </div>

      <div style={{ ...panelPre, marginBottom: 8 }}>Resumen del proceso</div>
      <div style={{ fontSize: 13, color: 'var(--text-subtle)', lineHeight: 1.75, marginBottom: 24, padding: '16px 18px', background: 'var(--bg3)', border: '1px solid var(--border)', borderLeft: `3px solid ${C.accent}` }}>
        {aiData.narrative}
      </div>

      <div style={{ ...panelPre, marginBottom: 10 }}>Matriz de riesgos identificados</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 1, background: 'var(--border)' }}>
        {(aiData.errors || []).map((e, i) => (
          <div key={i} style={{ background: 'var(--bg3)', padding: '14px 16px', borderLeft: `3px solid ${SEV_BORDER[e.severity] || C.accent}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.35, flex: 1 }}>{e.name}</div>
              <div style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', textTransform: 'uppercase', letterSpacing: '.04em', background: SEV_BG[e.severity] || 'var(--accent-subtle)', color: SEV_COLOR[e.severity] || C.accent, marginLeft: 8, whiteSpace: 'nowrap' }}>
                {e.severity}
              </div>
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 6 }}>{e.category}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12, lineHeight: 1.55 }}>{e.description}</div>
            <div style={{ display: 'flex', gap: 16 }}>
              {[
                [e.errorRate + '%', 'ocurrencia'],
                [e.timeHours + 'h', 'tiempo perdido'],
                ['$' + Math.round(e.costCOP / 1000) + 'K', 'ref. IA'],
              ].map(([v, l]) => (
                <div key={l}>
                  <div style={{ fontFamily: FONT, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{v}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
