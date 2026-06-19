import { useCallback, useEffect, useState } from 'react'
import { C } from './constants/colors'
import { fmtCOP } from './utils/format'
import { downloadImpactReportDocx } from './utils/generateReportDocx'
import {
  clearProjects,
  deleteProject,
  fetchProjects,
  getStorageSource,
  saveProject,
} from './services/projectsService'
import { panelPre, sLabel } from './styles/layout'
import { useImpactCalculations } from './hooks/useImpactCalculations'
import { useSpeechRecognition } from './hooks/useSpeechRecognition'
import { useTheme } from './context/ThemeContext'
import ModuleNav, { DimensionNav, BtnPrimary, BtnSecondary, BtnGhost, StatusChip } from './components/ModuleNav'
import IacLogo from './components/IacLogo'
import Slider from './components/Slider'
import InvInput from './components/InvInput'
import CustomCostItems from './components/CustomCostItems'
import CustomVolumeItems from './components/CustomVolumeItems'
import ModalEntry from './components/ModalEntry'
import ModalDiagnosis from './components/ModalDiagnosis'
import PanelDiag from './panels/PanelDiag'
import PanelEconomico from './panels/PanelEconomico'
import PanelCalidad from './panels/PanelCalidad'
import PanelTiempo from './panels/PanelTiempo'
import PanelEficiencia from './panels/PanelEficiencia'
import PanelSeguridad from './panels/PanelSeguridad'
import PanelProyectos from './panels/PanelProyectos'
import PanelDescubrimiento from './panels/PanelDescubrimiento'
import { buildDiscoveryDescription } from './utils/buildDiscoveryDescription'

const DIMENSION_TABS = [
  ['diagnostico', 'Resumen'],
  ['economico', 'Impacto económico'],
  ['calidad', 'Calidad'],
  ['tiempo', 'Tiempo'],
  ['eficiencia', 'Eficiencia operativa'],
  ['seguridad', 'Seguridad'],
]

const fieldLabel = { ...panelPre, marginBottom: 4, display: 'block' }

export default function App() {
  const { toggle, isDark } = useTheme()
  const [module, setModule] = useState('diagnostico')
  const [tab, setTab] = useState('economico')
  const [showEntryModal, setShowEntryModal] = useState(true)
  const [showDiagnosisModal, setShowDiagnosisModal] = useState(false)
  const [diagnosisPrefill, setDiagnosisPrefill] = useState('')
  const [discoverySession, setDiscoverySession] = useState(null)
  const [orgName, setOrgName] = useState('')
  const [aiData, setAiData] = useState(null)
  const [processDescription, setProcessDescription] = useState('')
  const [reportError, setReportError] = useState('')
  const [projects, setProjects] = useState([])
  const [organizations, setOrganizations] = useState([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectsError, setProjectsError] = useState('')
  const [storageSource, setStorageSource] = useState(() => getStorageSource())
  const [portfolioOrgFilter, setPortfolioOrgFilter] = useState('')
  const [saveToast, setSaveToast] = useState(false)

  const [prov, setProv] = useState(60)
  const [hrs, setHrs] = useState(8)
  const [errPct, setErrPct] = useState(20)
  const [costHr, setCostHr] = useState(40000)
  const [docsPerReg, setDocsPerReg] = useState(5)
  const [tRed, setTRed] = useState(70)
  const [eRed, setERed] = useState(85)
  const [impl, setImpl] = useState(0)
  const [monthly, setMonthly] = useState(0)
  const [customCostItems, setCustomCostItems] = useState([])
  const [customVolumeItems, setCustomVolumeItems] = useState([])

  const d = useImpactCalculations({
    prov, hrs, errPct, costHr, tRed, eRed, impl, monthly, docsPerReg, aiData, customCostItems, customVolumeItems,
  })

  const handleTranscript = useCallback((chunk, isFinal) => {
    if (!isFinal || !chunk.trim()) return
    setProcessDescription((prev) => (prev.trim() ? `${prev.trim()} ${chunk.trim()}` : chunk.trim()))
  }, [])

  const { listening, supported, speechError, toggle: toggleVoice, stop: stopVoice } = useSpeechRecognition({
    onTranscript: handleTranscript,
  })

  const handleApply = ({ org, processDescription: desc, prov: p, hrs: h, err: e, cost: c, aiData: ad }) => {
    if (org) setOrgName(org)
    if (desc) setProcessDescription(desc)
    setProv(p)
    setHrs(h)
    setErrPct(e)
    setCostHr(c)
    if (ad?.errors?.length) {
      setDocsPerReg(Math.max(1, Math.min(20, Math.round(ad.errors.length * 0.8))))
    }
    setAiData(ad)
    setShowDiagnosisModal(false)
    setShowEntryModal(false)
    setModule('diagnostico')
    setTab('diagnostico')
  }

  useEffect(() => {
    if (!saveToast) return
    const t = setTimeout(() => setSaveToast(false), 2500)
    return () => clearTimeout(t)
  }, [saveToast])

  useEffect(() => () => stopVoice(), [stopVoice])

  useEffect(() => {
    if (module !== 'diagnostico') stopVoice()
  }, [module, stopVoice])

  useEffect(() => {
    if (module !== 'proyectos') return

    let cancelled = false

    async function loadPortfolio() {
      setProjectsLoading(true)
      setProjectsError('')
      try {
        const { projects: list, organizations: orgs, source } = await fetchProjects({
          org: portfolioOrgFilter,
        })
        if (!cancelled) {
          setProjects(list)
          setOrganizations(orgs)
          setStorageSource(source)
        }
      } catch (e) {
        if (!cancelled) {
          setProjectsError(e.message || 'No se pudieron cargar los escenarios.')
        }
      } finally {
        if (!cancelled) setProjectsLoading(false)
      }
    }

    loadPortfolio()
    return () => { cancelled = true }
  }, [module, portfolioOrgFilter])

  const handleSaveProject = async () => {
    const processType = aiData?.processType || 'Proceso manual'
    const today = new Date().toISOString().slice(0, 10)

    let replaceId = null
    try {
      const { projects: current } = await fetchProjects({ org: orgName })
      const duplicate = current.find(
        (p) => p.org === orgName && p.processType === processType && p.savedAt.slice(0, 10) === today,
      )

      if (duplicate) {
        const overwrite = window.confirm(
          'Ya existe un escenario guardado hoy para esta organización y tipo de proceso. ¿Desea sobrescribirlo?',
        )
        if (!overwrite) return
        replaceId = duplicate.id
      }
    } catch (e) {
      window.alert(`No se pudo verificar escenarios existentes: ${e.message}`)
      return
    }

    const project = {
      id: crypto.randomUUID(),
      savedAt: new Date().toISOString(),
      org: orgName,
      sector: aiData?.sector || 'Sin clasificar',
      processType,
      narrative: aiData?.narrative || processDescription || '',
      params: { prov, hrs, errPct, costHr, tRed, eRed, docsPerReg, impl, monthly, customCostItems, customVolumeItems },
      metrics: {
        roi: d.roi,
        payback: d.payback,
        totalSavY: d.totalSavY,
        net12: d.net12,
        inv12: d.inv12,
        autoLevel: d.autoLevel,
        efIndex: d.efIndex,
        savedHrsM: d.savedHrsM,
        errBefore: d.errBefore,
        errAfter: d.errAfter,
      },
    }

    try {
      const next = await saveProject(project, { replaceId })
      setProjects(next)
      setSaveToast(true)
      const savedOrg = orgName.trim()
      if (savedOrg) setPortfolioOrgFilter(savedOrg)
      const { organizations: orgs } = await fetchProjects({ org: savedOrg || portfolioOrgFilter })
      setOrganizations(orgs)
    } catch (e) {
      window.alert(`No se pudo guardar el escenario: ${e.message}`)
    }
  }

  const handleLoadProject = (project) => {
    const { params, org } = project
    setOrgName(org)
    setProv(params.prov)
    setHrs(params.hrs)
    setErrPct(params.errPct)
    setCostHr(params.costHr)
    setTRed(params.tRed)
    setERed(params.eRed)
    setDocsPerReg(params.docsPerReg)
    setImpl(params.impl)
    setMonthly(params.monthly)
    setCustomCostItems(params.customCostItems || [])
    setCustomVolumeItems(params.customVolumeItems || [])
    setModule('diagnostico')
    setTab('economico')
  }

  const handleDeleteProject = async (id) => {
    try {
      const next = await deleteProject(id)
      setProjects(next)
      const { organizations: orgs } = await fetchProjects({ org: portfolioOrgFilter })
      setOrganizations(orgs)
    } catch (e) {
      window.alert(`No se pudo eliminar el escenario: ${e.message}`)
    }
  }

  const handleClearProjects = async () => {
    try {
      const next = await clearProjects()
      setProjects(next)
      setOrganizations([])
    } catch (e) {
      window.alert(`No se pudo vaciar el portafolio: ${e.message}`)
    }
  }

  const handleDiscoveryComplete = ({ input, result }) => {
    if (input.org) setOrgName(input.org)
    setDiscoverySession({ input, result })
  }

  const handleDiscoveryRestart = () => setDiscoverySession(null)

  const openDiagnosisFromDiscovery = (suggestion = null) => {
    if (!discoverySession?.input) return
    const desc = buildDiscoveryDescription(discoverySession.input, suggestion)
    setProcessDescription(desc)
    setDiagnosisPrefill(desc)
    if (discoverySession.input.org) setOrgName(discoverySession.input.org)
    setModule('diagnostico')
    setTab('economico')
    setShowDiagnosisModal(true)
    setShowEntryModal(false)
  }

  const handleDownloadReport = async () => {
    try {
      setReportError('')
      await downloadImpactReportDocx({
        orgName,
        processDescription,
        d,
        tRed,
        eRed,
      })
    } catch (err) {
      console.error(err)
      setReportError(err?.message || 'No se pudo generar el informe Word.')
    }
  }

  const panels = {
    diagnostico: <PanelDiag aiData={aiData} onReopen={() => { setAiData(null); setDiagnosisPrefill(''); setShowDiagnosisModal(true) }} />,
    economico: <PanelEconomico d={d} />,
    calidad: <PanelCalidad d={d} />,
    tiempo: <PanelTiempo d={d} />,
    eficiencia: <PanelEficiencia d={d} />,
    seguridad: <PanelSeguridad d={d} />,
  }

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100vh' }}>

      {showEntryModal && (
        <ModalEntry
          onEvaluateImpact={() => {
            setShowEntryModal(false)
            setDiagnosisPrefill('')
            setShowDiagnosisModal(true)
          }}
          onDiscover={() => {
            setShowEntryModal(false)
            setModule('descubrimiento')
          }}
        />
      )}

      {showDiagnosisModal && (
        <ModalDiagnosis
          initialOrg={orgName}
          initialDesc={diagnosisPrefill}
          onApply={handleApply}
          onGoDiscovery={() => {
            setShowDiagnosisModal(false)
            setDiscoverySession(null)
            setModule('descubrimiento')
          }}
          onSkip={({ processDescription: desc, org }) => {
            if (org) setOrgName(org)
            if (desc) setProcessDescription(desc)
            setShowDiagnosisModal(false)
            setShowEntryModal(false)
            setModule('diagnostico')
          }}
        />
      )}

      <header className="app-header">
        <div className="app-header__brand">
          <IacLogo />
          <div className="app-header__divider" />
          <div className="app-header__meta">
            <span className="app-header__product">Evaluador de Impacto</span>
            <span className={`app-header__org${!orgName ? ' app-header__org--placeholder' : ''}`}>
              {orgName || 'Nombre de la organización'}
            </span>
          </div>
        </div>

        <div className="app-header__center">
          <ModuleNav active={module} onChange={setModule} />
        </div>

        <div className="app-header__actions">
          <button
            type="button"
            className="btn btn--ghost"
            title={isDark ? 'Modo claro' : 'Modo oscuro'}
            onClick={toggle}
            style={{ fontSize: 11, padding: '6px 10px' }}
          >
            {isDark ? 'Claro' : 'Oscuro'}
          </button>

          {saveToast && (
            <StatusChip variant="success">Proyecto guardado</StatusChip>
          )}

          {module === 'diagnostico' && (
            <>
              <BtnSecondary onClick={handleSaveProject}>Guardar escenario</BtnSecondary>
              <BtnPrimary onClick={handleDownloadReport} title="Descargar informe Word">
                Descargar informe
              </BtnPrimary>
              <BtnGhost onClick={() => { setAiData(null); setDiagnosisPrefill(''); setShowDiagnosisModal(true) }}>
                Nuevo diagnóstico
              </BtnGhost>
            </>
          )}

          {module === 'descubrimiento' && (
            <BtnGhost onClick={handleDiscoveryRestart}>
              Nuevo descubrimiento
            </BtnGhost>
          )}
        </div>
      </header>

      {module === 'diagnostico' ? (
        <div className="app-layout">
          <aside className="app-sidebar">
            <div className="sidebar-section">
              <div style={sLabel}>Contexto del proceso</div>
              <input
                type="text"
                className="field-input"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Nombre de la organización"
                style={{ marginBottom: 10 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 4, minWidth: 0 }}>
                <label style={{ ...fieldLabel, marginBottom: 0, flex: 1, minWidth: 0 }}>Descripción del proceso</label>
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
              <textarea
                className="field-textarea"
                value={processDescription}
                onChange={(e) => setProcessDescription(e.target.value)}
                placeholder="Descripción del proceso (mejora el informe ejecutivo)"
                style={{ borderColor: listening ? C.negative : undefined }}
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

            <div className="sidebar-section">
              <div style={sLabel}>Volumetría</div>
              <Slider label="Registros nuevos / mes" val={prov} display={prov} min={10} max={300} step={5} onChange={setProv} />
              <Slider label="Horas gestión / registro" val={hrs} display={hrs + ' h'} min={2} max={24} step={1} onChange={setHrs} />
              <Slider label="Registros con errores (%)" val={errPct} display={errPct + '%'} min={5} max={60} step={1} onChange={setErrPct} />
              <Slider label="Documentos / registro" val={docsPerReg} display={docsPerReg} min={1} max={20} step={1} onChange={setDocsPerReg} />
              <div className="sidebar-sub-label">Conceptos adicionales</div>
              <CustomVolumeItems
                items={customVolumeItems}
                onChange={setCustomVolumeItems}
                baseHrs={hrs}
                baseErrPct={errPct}
              />
              {d.hasCustomVolume && (
                <div className="sidebar-effective">
                  Volumen efectivo: <strong>{d.effectiveProv} uds/mes</strong>
                  {' · '}{d.effectiveHrs.toFixed(1)} h/ud
                </div>
              )}
            </div>

            <div className="sidebar-section">
              <div style={sLabel}>Variables de costo</div>
              <Slider label="Costo hora analista (COP)" val={costHr} display={'$' + Math.round(costHr / 1000) + 'K'} min={20000} max={120000} step={5000} onChange={setCostHr} />
            </div>

            <div className="sidebar-section">
              <div style={sLabel}>Impacto de plataforma</div>
              <Slider label="Reducción de tiempo (%)" val={tRed} display={tRed + '%'} min={40} max={90} step={5} onChange={setTRed} />
              <Slider label="Reducción de errores (%)" val={eRed} display={eRed + '%'} min={50} max={97} step={1} onChange={setERed} />
            </div>

            <div className="sidebar-section">
              <div style={sLabel}>Inversión</div>
              <InvInput label="Implementación inicial" val={impl} step={100000} sub="COP — pago único" onChange={setImpl} />
              <InvInput label="Cuota mensual SaaS" val={monthly} step={50000} sub="COP / mes" onChange={setMonthly} />
            </div>

            <div className="sidebar-section">
              <div style={sLabel}>Conceptos adicionales</div>
              <CustomCostItems items={customCostItems} onChange={setCustomCostItems} />
            </div>

            <div className="sidebar-section">
              <div style={sLabel}>Indicadores clave</div>
              {[
                { label: 'Ahorro anual proyectado', val: fmtCOP(d.totalSavY), sub: 'COP / año' },
                { label: 'ROI a 12 meses', val: (d.roi > 0 ? '+' : '') + d.roi + '%', sub: 'retorno neto' },
                { label: 'Período de recuperación', val: d.payback <= 12 ? `Mes ${d.payback}` : '> 12 meses', sub: 'payback' },
                { label: 'Inversión total 12M', val: fmtCOP(d.inv12), sub: 'impl. + cuotas' },
              ].map(({ label, val, sub }) => (
                <div key={label} className="kpi-mini">
                  <div className="kpi-mini__label">{label}</div>
                  <div className="kpi-mini__val">{val}</div>
                  <div className="kpi-mini__sub">{sub}</div>
                </div>
              ))}
            </div>
          </aside>

          <main className="app-main">
            {reportError && (
              <div style={{ fontSize: 12, color: C.negative, padding: '8px 12px', background: 'rgba(155,61,74,.08)', border: '1px solid rgba(155,61,74,.2)', borderRadius: 2, marginBottom: 14 }}>
                {reportError}
              </div>
            )}
            <DimensionNav tabs={DIMENSION_TABS} active={tab} onChange={setTab} />
            {panels[tab]}
          </main>
        </div>
      ) : module === 'descubrimiento' ? (
        <div className="app-layout app-layout--full">
          <main className="app-main app-main--portfolio">
            <PanelDescubrimiento
              orgName={orgName}
              discoverySession={discoverySession}
              onComplete={handleDiscoveryComplete}
              onRestart={handleDiscoveryRestart}
              onEvaluateSuggestion={(s) => openDiagnosisFromDiscovery(s)}
              onEvaluateAll={() => openDiagnosisFromDiscovery(null)}
            />
          </main>
        </div>
      ) : (
        <div className="app-layout app-layout--full">
          <main className="app-main app-main--portfolio">
            <PanelProyectos
              projects={projects}
              organizations={organizations}
              loading={projectsLoading}
              error={projectsError}
              storageSource={storageSource}
              orgFilter={portfolioOrgFilter}
              onOrgFilterChange={setPortfolioOrgFilter}
              onLoad={handleLoadProject}
              onDelete={handleDeleteProject}
              onClear={handleClearProjects}
              onGoToDiagnosis={() => setModule('diagnostico')}
            />
          </main>
        </div>
      )}
    </div>
  )
}
