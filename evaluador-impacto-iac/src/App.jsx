import { useEffect, useState } from 'react'
import { C } from './constants/colors'
import { fmtCOP } from './utils/format'
import { downloadImpactReportDocx } from './utils/generateReportDocx'
import { loadProjects, addProject, deleteProject, clearProjects } from './utils/projectsStorage'
import { sLabel } from './styles/layout'
import { useImpactCalculations } from './hooks/useImpactCalculations'
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
  const [projects, setProjects] = useState(() => loadProjects())
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

  const handleSaveProject = () => {
    const processType = aiData?.processType || 'Proceso manual'
    const today = new Date().toISOString().slice(0, 10)
    const duplicate = projects.find(
      (p) => p.org === orgName && p.processType === processType && p.savedAt.slice(0, 10) === today,
    )

    let replaceId = null
    if (duplicate) {
      const overwrite = window.confirm(
        'Ya existe un escenario guardado hoy para esta organización y tipo de proceso. ¿Desea sobrescribirlo?',
      )
      if (overwrite) replaceId = duplicate.id
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

    setProjects(addProject(project, { replaceId }))
    setSaveToast(true)
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

  const handleDeleteProject = (id) => setProjects(deleteProject(id))
  const handleClearProjects = () => setProjects(clearProjects())

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
              <textarea
                className="field-textarea"
                value={processDescription}
                onChange={(e) => setProcessDescription(e.target.value)}
                placeholder="Descripción del proceso (mejora el informe ejecutivo)"
              />
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
