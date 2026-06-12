import { useState, useCallback, useRef, useEffect } from 'react'
import { C } from '../../constants/colors'
import { SECTORS, TOOL_OPTIONS, SYSTEM_OPTIONS } from '../../constants/industryUseCases'
import { DISCOVERY_LOADING_MESSAGES } from '../../constants/discoveryPrompts'
import { discoverAutomations } from '../../services/discoverAutomations'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition'
import { panelPre } from '../../styles/layout'

const STEPS = ['Contexto', 'Proceso', 'Herramientas', 'Sistemas']

const fieldLabel = { ...panelPre, marginBottom: 4, display: 'block' }

function ChipGroup({ options, selected, onChange }) {
  return (
    <div className="chip-group">
      {options.map((opt) => {
        const active = selected.includes(opt)
        return (
          <button
            key={opt}
            type="button"
            className={`chip${active ? ' chip--active' : ''}`}
            onClick={() => onChange(active ? selected.filter((x) => x !== opt) : [...selected, opt])}
          >
            {opt}
          </button>
        )
      })}
    </div>
  )
}

export default function DiscoveryWizard({ initialOrg = '', onComplete }) {
  const [step, setStep] = useState(0)
  const [org, setOrg] = useState(initialOrg)
  const [sector, setSector] = useState(SECTORS[0])
  const [processDesc, setProcessDesc] = useState('')
  const [tools, setTools] = useState([])
  const [toolsOther, setToolsOther] = useState('')
  const [systems, setSystems] = useState([])
  const [systemsOther, setSystemsOther] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadMsg, setLoadMsg] = useState('')
  const [error, setError] = useState('')
  const timerRef = useRef(null)

  const handleTranscript = useCallback((chunk, isFinal) => {
    if (!isFinal || !chunk.trim()) return
    setProcessDesc((prev) => (prev.trim() ? `${prev.trim()} ${chunk.trim()}` : chunk.trim()))
  }, [])

  const { listening, supported, speechError, toggle: toggleVoice, stop: stopVoice } = useSpeechRecognition({
    onTranscript: handleTranscript,
  })

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
    stopVoice()
  }, [stopVoice])

  useEffect(() => {
    if (step !== 1) stopVoice()
  }, [step, stopVoice])

  const canNext = () => {
    if (step === 0) return org.trim().length >= 2
    if (step === 1) return processDesc.trim().length >= 30
    if (step === 2) return tools.length > 0 || toolsOther.trim().length > 2
    if (step === 3) return systems.length > 0 || systemsOther.trim().length > 2
    return true
  }

  const runAnalysis = useCallback(async () => {
    stopVoice()
    setLoading(true)
    setError('')
    let mi = 0
    setLoadMsg(DISCOVERY_LOADING_MESSAGES[0])
    timerRef.current = setInterval(() => {
      mi = (mi + 1) % DISCOVERY_LOADING_MESSAGES.length
      setLoadMsg(DISCOVERY_LOADING_MESSAGES[mi])
    }, 2200)

    const input = {
      org: org.trim(),
      sector,
      processDesc: processDesc.trim(),
      tools,
      systems,
      toolsOther: toolsOther.trim(),
      systemsOther: systemsOther.trim(),
    }

    try {
      const result = await discoverAutomations(input)
      clearInterval(timerRef.current)
      timerRef.current = null
      onComplete({ input, result })
    } catch (e) {
      clearInterval(timerRef.current)
      timerRef.current = null
      setError(e.message || 'No se pudo completar el análisis.')
      setLoading(false)
    }
  }, [org, sector, processDesc, tools, systems, toolsOther, systemsOther, onComplete, stopVoice])

  const handleNext = () => {
    if (step === 1) stopVoice()
    if (step < STEPS.length - 1) setStep(step + 1)
    else runAnalysis()
  }

  return (
    <div className="discovery-wizard">
      <div className="discovery-steps" aria-label="Pasos del descubrimiento">
        {STEPS.map((label, i) => (
          <div
            key={label}
            className={`discovery-step${i === step ? ' discovery-step--active' : ''}${i < step ? ' discovery-step--done' : ''}`}
          >
            <span className="discovery-step__num">{i + 1}</span>
            <span className="discovery-step__label">{label}</span>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="modal-status" style={{ marginTop: 20 }}>
          <div className="modal-status__spinner" />
          <span>{loadMsg}</span>
        </div>
      ) : (
        <>
          {step === 0 && (
            <div className="discovery-step-panel">
              <label style={fieldLabel}>Organización</label>
              <input
                className="field-input"
                value={org}
                onChange={(e) => setOrg(e.target.value)}
                placeholder="Ej: Empresa XYZ S.A.S."
                style={{ marginBottom: 12 }}
              />
              <label style={fieldLabel}>Industria / sector</label>
              <select className="field-select" value={sector} onChange={(e) => setSector(e.target.value)}>
                {SECTORS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          )}

          {step === 1 && (
            <div className="discovery-step-panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4, minWidth: 0 }}>
                <label style={{ ...fieldLabel, marginBottom: 0, flex: 1, minWidth: 0 }}>Describa su proceso manual</label>
                {supported && (
                  <button
                    type="button"
                    className="btn btn--ghost"
                    title={listening ? 'Detener dictado' : 'Dictar descripción por voz'}
                    onClick={toggleVoice}
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
              <p className="field-hint" style={{ marginBottom: 8 }}>
                Qué hace el equipo hoy, paso a paso, quién interviene, qué sale mal y con qué frecuencia.
                {supported ? ' Puede dictar la descripción con el botón de voz.' : ''}
              </p>
              <textarea
                className="field-textarea"
                value={processDesc}
                onChange={(e) => setProcessDesc(e.target.value)}
                placeholder="Ej: Recibimos solicitudes por correo, las transcribimos a Excel, validamos documentos a mano y registramos en el ERP..."
                style={{ minHeight: 140, borderColor: listening ? C.negative : undefined }}
              />
              {!supported && (
                <div className="field-hint" style={{ marginTop: 6 }}>
                  Dictado por voz disponible en Chrome o Edge.
                </div>
              )}
              {speechError && (
                <div style={{ fontSize: 11, color: C.negative, marginTop: 6 }}>{speechError}</div>
              )}
            </div>
          )}

          {step === 2 && (
            <div className="discovery-step-panel">
              <label style={fieldLabel}>Herramientas que usa hoy</label>
              <p className="field-hint" style={{ marginBottom: 8 }}>Seleccione todas las que apliquen.</p>
              <ChipGroup options={TOOL_OPTIONS} selected={tools} onChange={setTools} />
              <label style={{ ...fieldLabel, marginTop: 12 }}>Otras herramientas (opcional)</label>
              <input
                className="field-input"
                value={toolsOther}
                onChange={(e) => setToolsOther(e.target.value)}
                placeholder="Ej: Google Drive, Notion, Access..."
              />
            </div>
          )}

          {step === 3 && (
            <div className="discovery-step-panel">
              <label style={fieldLabel}>Sistemas o plataformas conectadas</label>
              <p className="field-hint" style={{ marginBottom: 8 }}>ERP, CRM, core, BI u otros.</p>
              <ChipGroup options={SYSTEM_OPTIONS} selected={systems} onChange={setSystems} />
              <label style={{ ...fieldLabel, marginTop: 12 }}>Otros sistemas (opcional)</label>
              <input
                className="field-input"
                value={systemsOther}
                onChange={(e) => setSystemsOther(e.target.value)}
                placeholder="Ej: Salesforce, SAP S/4HANA, ServiceNow..."
              />
            </div>
          )}

          {error && (
            <div className="modal-error" style={{ marginTop: 12 }}>{error}</div>
          )}

          <div className="discovery-wizard__actions">
            {step > 0 && (
              <button type="button" className="btn btn--ghost" onClick={() => setStep(step - 1)}>
                Atrás
              </button>
            )}
            <div style={{ flex: 1 }} />
            <button
              type="button"
              className="btn btn--primary"
              disabled={!canNext()}
              onClick={handleNext}
            >
              {step === STEPS.length - 1 ? 'Obtener sugerencias' : 'Continuar'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
