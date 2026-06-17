import { useState, useCallback, useRef, useEffect } from 'react'
import { C } from '../constants/colors'
import { SEV_BORDER, SEV_COLOR } from '../constants/severity'
import { AI_LOADING_MESSAGES } from '../constants/prompts'
import { analyzeProcess } from '../services/mistral'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import { panelPre } from '../styles/layout'
import IacLogo from './IacLogo'

const fieldLabel = { ...panelPre, marginBottom: 4, display: 'block' }

export default function ModalDiagnosis({ onApply, onSkip, initialOrg = '', initialDesc = '', onGoDiscovery }) {
  const [modalOrg, setModalOrg] = useState(initialOrg)
  const [modalDesc, setModalDesc] = useState(initialDesc)
  const [aiState, setAiState] = useState('idle')
  const [aiData, setAiData] = useState(null)
  const [loadMsg, setLoadMsg] = useState('')
  const [aiError, setAiError] = useState('')
  const [apProv, setApProv] = useState(50)
  const [apHrs, setApHrs] = useState(8)
  const [apErr, setApErr] = useState(20)
  const [apCost, setApCost] = useState(40000)
  const timerRef = useRef(null)

  const handleTranscript = useCallback((chunk, isFinal) => {
    if (!isFinal || !chunk.trim()) return
    setModalDesc((prev) => (prev.trim() ? `${prev.trim()} ${chunk.trim()}` : chunk.trim()))
  }, [])

  const { listening, supported, speechError, toggle: toggleVoice, stop: stopVoice } = useSpeechRecognition({
    onTranscript: handleTranscript,
  })

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      stopVoice()
    }
  }, [stopVoice])

  const runAI = useCallback(async () => {
    if (!modalDesc.trim() || modalDesc.trim().length < 20) return
    setAiState('loading')
    setAiError('')

    let mi = 0
    setLoadMsg(AI_LOADING_MESSAGES[0])
    timerRef.current = setInterval(() => {
      mi = (mi + 1) % AI_LOADING_MESSAGES.length
      setLoadMsg(AI_LOADING_MESSAGES[mi])
    }, 2200)

    try {
      const parsed = await analyzeProcess(modalDesc)
      clearInterval(timerRef.current)
      timerRef.current = null

      setAiData(parsed)
      setApProv(parsed.suggestedParams.registrosPerMonth || 50)
      setApHrs(parsed.suggestedParams.hoursPerRecord || 8)
      setApErr(parsed.suggestedParams.errorRatePct || 20)
      setApCost(parsed.suggestedParams.costPerHourCOP || 40000)
      setAiState('done')
    } catch (e) {
      clearInterval(timerRef.current)
      timerRef.current = null
      setAiError('Error al analizar: ' + e.message)
      setAiState('error')
    }
  }, [modalDesc])

  const handleApply = () => {
    stopVoice()
    onApply({
      org: modalOrg.trim(),
      processDescription: modalDesc.trim(),
      prov: Math.min(300, Math.max(10, apProv)),
      hrs: Math.min(24, Math.max(2, apHrs)),
      err: Math.min(60, Math.max(5, apErr)),
      cost: Math.min(120000, Math.max(20000, apCost)),
      aiData,
    })
  }

  return (
    <div className="modal-overlay">
      <div className="modal-panel">

        <div style={{ marginBottom: 16 }}>
          <IacLogo />
        </div>

        <h2 className="modal-panel__title">
          Diagnóstico del proyecto
        </h2>
        <p className="modal-panel__desc">
          Describa el proceso a automatizar. El análisis identificará riesgos operativos, los cuantificará y precargará los parámetros del evaluador.
        </p>

        <label style={fieldLabel}>Organización</label>
        <input
          value={modalOrg}
          onChange={(e) => setModalOrg(e.target.value)}
          placeholder="Ej: Empresa XYZ S.A.S."
          className="field-input"
          style={{ marginBottom: 12 }}
        />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4, minWidth: 0 }}>
          <label style={{ ...fieldLabel, marginBottom: 0, flex: 1, minWidth: 0 }}>Descripción del proceso</label>
          {supported && (
            <button
              type="button"
              className="btn btn--ghost"
              title={listening ? 'Detener dictado' : 'Dictar descripción por voz'}
              onClick={toggleVoice}
              disabled={aiState === 'loading'}
              style={{ fontSize: 10, padding: '3px 8px', display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}
            >
              <span style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: listening ? C.negative : 'var(--text-faint)',
              }} />
              {listening ? 'Escuchando' : 'Dictar'}
            </button>
          )}
        </div>
        <textarea
          value={modalDesc}
          onChange={(e) => setModalDesc(e.target.value)}
          placeholder="Describa volumetría, canal actual, errores frecuentes y contexto operativo del proceso..."
          className="field-textarea"
          style={{ borderColor: listening ? C.negative : undefined, marginBottom: 6 }}
        />
        {!supported && (
          <div className="field-hint" style={{ marginBottom: 8 }}>
            Dictado por voz disponible en Chrome o Edge.
          </div>
        )}
        {speechError && (
          <div style={{ fontSize: 11, color: C.negative, marginBottom: 8 }}>{speechError}</div>
        )}

        {aiState === 'loading' && (
          <div className="modal-status">
            <div className="modal-status__spinner" />
            <span>{loadMsg}</span>
          </div>
        )}

        {aiState === 'error' && (
          <div className="modal-error">{aiError}</div>
        )}

        {aiState === 'done' && aiData && (
          <>
            <hr className="modal-divider" />

            <div style={{ ...panelPre, marginBottom: 6 }}>Resumen del proceso</div>
            <div className="modal-narrative">
              {aiData.narrative}
            </div>

            <div style={{ ...panelPre, marginBottom: 6 }}>Errores identificados</div>
            <div style={{ marginBottom: 14 }}>
              {(aiData.errors || []).map((e, i) => (
                <div key={i} className="modal-error-item" style={{ borderLeftColor: SEV_BORDER[e.severity] || C.accent }}>
                  <div className="modal-error-item__head">
                    <div className="modal-error-item__name">{e.name}</div>
                    <div className="modal-error-item__rate" style={{ color: SEV_COLOR[e.severity] || C.accent }}>{e.errorRate}%</div>
                  </div>
                  <div className="modal-error-item__meta">{e.category} · {e.severity} · {e.timeHours}h retrabajo</div>
                  <div className="modal-error-item__desc">{e.description}</div>
                </div>
              ))}
            </div>

            <div style={{ ...panelPre, marginBottom: 6 }}>Parámetros sugeridos</div>
            <div className="modal-params-grid">
              {[
                ['Registros / mes', apProv, setApProv, 1, 1, 500],
                ['Horas / registro', apHrs, setApHrs, 0.5, 0.5, 24],
                ['Tasa de error (%)', apErr, setApErr, 1, 1, 99],
                ['Costo hora COP', apCost, setApCost, 5000, 10000, 200000],
              ].map(([lbl, val, setter, step, min, max]) => (
                <div key={lbl} className="modal-param-cell">
                  <div className="modal-param-cell__label">{lbl}</div>
                  <input
                    type="number"
                    className="field-input field-input--num"
                    value={val || ''}
                    min={min}
                    max={max}
                    step={step}
                    onChange={(e) => setter(e.target.value === '' ? 0 : +e.target.value)}
                  />
                </div>
              ))}
            </div>
          </>
        )}

        <div className="modal-actions">
          {onGoDiscovery && (
            <button type="button" className="btn btn--text" onClick={onGoDiscovery} style={{ marginRight: 'auto' }}>
              ¿No sabe qué automatizar? Descubrir sugerencias
            </button>
          )}
          <button
            type="button"
            className="btn btn--ghost"
            onClick={aiState === 'done' ? () => { setAiState('idle'); setAiData(null) } : () => onSkip({ processDescription: modalDesc.trim(), org: modalOrg.trim() })}
          >
            {aiState === 'done' ? 'Volver a describir' : 'Ingresar manualmente'}
          </button>

          {aiState !== 'done' && (
            <button
              type="button"
              className="btn btn--primary"
              disabled={aiState === 'loading'}
              onClick={runAI}
              style={{ opacity: aiState === 'loading' ? 0.5 : 1 }}
            >
              Analizar con IA
            </button>
          )}

          {aiState === 'done' && (
            <button type="button" className="btn btn--primary" onClick={handleApply}>
              Aplicar y continuar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
