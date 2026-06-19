/**
 * Suite completa: cálculos, almacenamiento, informe, formatos y flujos de botones.
 * Ejecutar: node scripts/run-all-tests.mjs
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import AdmZip from 'adm-zip'
import { Packer } from 'docx'
import {
  calculateImpact,
  activeVolumeItems,
  activeCostItems,
} from '../src/utils/calculateImpact.js'
import {
  parseDescription,
  buildRoiInvestmentRows,
  buildOperationalParamsRows,
  buildReportData,
} from '../src/utils/reportContent.js'
import { parseAiResponse } from '../src/utils/parseAiResponse.js'
import { fmtCOP, fmtM } from '../src/utils/format.js'
import { createImpactReportDocument } from '../src/utils/generateReportDocx.js'
import { parseDiscoveryResponse } from '../src/utils/parseDiscoveryResponse.js'
import { buildFallbackDiscovery } from '../src/utils/discoveryFallback.js'
import { buildDiscoveryDescription } from '../src/utils/buildDiscoveryDescription.js'
import { buildDiscoveryUserMessage, DISCOVERY_SYSTEM_PROMPT } from '../src/constants/discoveryPrompts.js'
import { SECTORS, TOOL_OPTIONS, SYSTEM_OPTIONS, INDUSTRY_HINTS } from '../src/constants/industryUseCases.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const failures = []
let passed = 0

function ok(label) {
  passed += 1
  console.log(`  ✓ ${label}`)
}

function fail(label, detail) {
  failures.push(`${label}: ${detail}`)
  console.error(`  ✗ ${label} — ${detail}`)
}

function assertEq(label, actual, expected) {
  if (actual === expected) ok(label)
  else fail(label, `esperado ${expected}, obtuvo ${actual}`)
}

function assertTrue(label, cond, detail = '') {
  if (cond) ok(label)
  else fail(label, detail || 'condición falsa')
}

function assertApprox(label, actual, expected, tol = 1) {
  if (Math.abs(actual - expected) <= tol) ok(label)
  else fail(label, `esperado ~${expected}, obtuvo ${actual}`)
}

const BASE = {
  prov: 60,
  hrs: 8,
  errPct: 20,
  costHr: 40000,
  tRed: 70,
  eRed: 85,
  impl: 14540900,
  monthly: 1800000,
  docsPerReg: 5,
}

function legacyCalculate(p) {
  const tR = p.tRed / 100
  const eR = p.eRed / 100
  const errorCostPerCase = p.costHr * p.hrs * 0.25
  const savedHrsM = p.prov * p.hrs * tR
  const savedCostM = savedHrsM * p.costHr
  const errBefore = Math.round(p.prov * p.errPct / 100)
  const errAfter = Math.round(errBefore * (1 - eR))
  const errSavM = (errBefore - errAfter) * errorCostPerCase
  const totalSavM = savedCostM + errSavM
  const netSavM = totalSavM - p.monthly
  const totalSavY = totalSavM * 12
  const inv12 = p.impl + p.monthly * 12
  const net12 = totalSavY - inv12
  const roi = inv12 > 0 ? Math.round((net12 / inv12) * 100) : 0
  const payback = netSavM > 0 ? Math.max(1, Math.ceil(p.impl / netSavM)) : 99
  return { roi, payback, inv12, net12, totalSavM, netSavM, errBefore, savedHrsM }
}

// ── 1. Cálculos ──────────────────────────────────────────────
console.log('\n1. Motor de cálculo (calculateImpact)')

const legacy = legacyCalculate(BASE)
const empty = calculateImpact({ ...BASE, customCostItems: [], customVolumeItems: [] })
const placeholders = calculateImpact({
  ...BASE,
  customCostItems: [{ id: '1', name: '', amount: 0, frequency: 'once' }],
  customVolumeItems: [{ id: '2', name: '', volume: 0, hoursPerUnit: 0, errorPct: 0 }],
})

for (const key of ['roi', 'payback', 'inv12', 'net12', 'totalSavM', 'netSavM', 'errBefore', 'savedHrsM']) {
  assertEq(`Base vs legacy — ${key}`, empty[key], legacy[key])
  assertEq(`Placeholders cero — ${key}`, placeholders[key], empty[key])
}

assertTrue('hasCustomVolume false sin ítems', !empty.hasCustomVolume)
assertTrue('hasCustomCost false sin ítems', !empty.hasCustomCost)
assertEq('totalSavM = savedCostM + errSavM', empty.totalSavM, empty.savedCostM + empty.errSavM)
assertEq('net12 = totalSavY - inv12', empty.net12, empty.totalSavY - empty.inv12)
assertEq('ROI fórmula', empty.roi, Math.round((empty.net12 / empty.inv12) * 100))
assertEq('cashFlow mes 12 = net12', empty.cashFlow[11].val, empty.net12)

const withVolume = calculateImpact({
  ...BASE,
  customVolumeItems: [{ id: 'v1', name: 'Actualizaciones', volume: 20, hoursPerUnit: 3, errorPct: 0 }],
})
assertTrue('Volumen custom activo', withVolume.hasCustomVolume)
assertEq('effectiveProv con +20', withVolume.effectiveProv, 80)
assertTrue('ROI cambia con volumen', withVolume.roi !== empty.roi)

const withCostOnce = calculateImpact({
  ...BASE,
  customCostItems: [{ id: 'c1', name: 'Capacitación', amount: 2000000, frequency: 'once' }],
})
assertTrue('Costo once activo', withCostOnce.hasCustomCost)
assertEq('inv12 + costo once', withCostOnce.inv12, empty.inv12 + 2000000)
assertTrue('ROI baja con costo once', withCostOnce.roi < empty.roi)

const withCostMonthly = calculateImpact({
  ...BASE,
  customCostItems: [{ id: 'c2', name: 'Licencia', amount: 500000, frequency: 'monthly' }],
})
assertEq('inv12 + mensual 12M', withCostMonthly.inv12, empty.inv12 + 500000 * 12)
assertEq('netSavM - mensual extra', withCostMonthly.netSavM, empty.netSavM - 500000)

const combined = calculateImpact({
  ...BASE,
  customVolumeItems: [
    { id: 'v1', name: 'Flujo A', volume: 10, hoursPerUnit: 4, errorPct: 10 },
    { id: 'v2', name: 'Flujo B', volume: 5, hoursPerUnit: 0, errorPct: 0 },
  ],
  customCostItems: [
    { id: 'c1', name: 'Setup', amount: 1000000, frequency: 'once' },
    { id: 'c2', name: 'SaaS extra', amount: 200000, frequency: 'monthly' },
  ],
})
assertEq('Volumen combinado effectiveProv', combined.effectiveProv, 75)
assertTrue('Horas fallback base en flujo B', combined.effectiveHrs > 0)
assertTrue('hasCustomVolume y hasCustomCost', combined.hasCustomVolume && combined.hasCustomCost)

function docxPlainText(xml) {
  return xml
    .replace(/<w:tab[^/]*\/>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
}

assertEq('activeVolumeItems filtra cero', activeVolumeItems([
  { volume: 0 }, { volume: 5 }, { volume: 10 },
]).length, 2)
assertEq('activeCostItems filtra cero', activeCostItems([
  { amount: 0 }, { amount: 100 },
]).length, 1)

const noSav = calculateImpact({ ...BASE, tRed: 40, eRed: 50, monthly: 999999999 })
assertEq('payback 99 sin ahorro neto', noSav.payback, 99)

// ── 2. Formatos ──────────────────────────────────────────────
console.log('\n2. Formateo (format.js)')
assertTrue('fmtM millones', fmtM(2500000).includes('M') || fmtM(2500000).includes('2'), fmtM(2500000))
assertTrue('fmtCOP con $', fmtCOP(1000000).startsWith('$'))

// ── 3. Contenido informe ─────────────────────────────────────
console.log('\n3. Contenido informe (reportContent.js)')

const descWithObj = `Texto narrativo del proceso.

OBJETIVOS ESPECÍFICOS DE LA PROPUESTA
Automatizar captura de datos
Validar documentos`

const parsed = parseDescription(descWithObj)
assertTrue('parseDescription narrative', parsed.narrative.includes('narrativo'))
assertEq('parseDescription objetivos', parsed.objectives.length, 2)

const rowsRoi = buildRoiInvestmentRows(withCostOnce)
assertTrue('ROI rows incluye concepto once', rowsRoi.some(([l]) => l.includes('Capacitación')))
assertTrue('ROI rows incluye ROI %', rowsRoi.some(([l]) => l === 'ROI'))

const rowsOp = buildOperationalParamsRows(withVolume)
assertTrue('Ops rows volumen efectivo', rowsOp.some(([l]) => l === 'Volumen total / mes'))

const reportData = buildReportData({
  orgName: 'Test Org',
  processDescription: descWithObj,
  d: empty,
  tRed: 70,
  eRed: 85,
})
assertEq('buildReportData org', reportData.orgName, 'Test Org')
assertTrue('buildReportData implNotes', reportData.implNotes.length === 4)

// ── 4. parseAiResponse ─────────────────────────────────────────
console.log('\n4. Respuesta IA (parseAiResponse.js)')

const aiJson = JSON.stringify({
  suggestedParams: { registrosPerMonth: 50, hoursPerRecord: 8, errorRatePct: 20, costPerHourCOP: 40000 },
  errors: [{ name: 'Doc incompleto', errorRate: 15, severity: 'ALTO', category: 'Doc', timeHours: 2, description: 'x' }],
  narrative: 'Test',
  processType: 'Vinculación',
  sector: 'Textil',
})
const aiParsed = parseAiResponse('```json\n' + aiJson + '\n```')
assertTrue('parseAiResponse errors', aiParsed.errors.length === 1)

try {
  parseAiResponse('{"foo":1}')
  fail('parseAiResponse inválido', 'no lanzó error')
} catch {
  ok('parseAiResponse rechaza estructura inválida')
}

// ── 5. Portafolio (projectsService + localStorage fallback) ────
console.log('\n5. Portafolio (projectsService.js)')

const storage = {}
globalThis.localStorage = {
  getItem: (k) => storage[k] ?? null,
  setItem: (k, v) => { storage[k] = v },
  removeItem: (k) => { delete storage[k] },
}

const {
  fetchProjects,
  saveProject,
  deleteProject,
  clearProjects,
  projectFromRow,
  projectToRow,
  getStorageSource,
} = await import('../src/services/projectsService.js')
const { clearProjects: clearLocal } = await import('../src/utils/projectsStorage.js')

clearLocal()
assertEq('storage source sin Supabase', getStorageSource(), 'local')

const sampleProject = {
  id: 'p1',
  savedAt: new Date().toISOString(),
  org: 'Org A',
  sector: 'Retail',
  processType: 'Vinculación',
  narrative: 'Proceso manual',
  params: { prov: 60 },
  metrics: { roi: 100 },
}

let result = await fetchProjects()
assertEq('fetchProjects vacío', result.projects.length, 0)
assertEq('fetchProjects source local', result.source, 'local')

await saveProject(sampleProject)
result = await fetchProjects()
assertEq('saveProject', result.projects.length, 1)

result = await fetchProjects({ org: 'Org A' })
assertEq('fetchProjects por empresa', result.projects.length, 1)
assertEq('organizations incluye Org A', result.organizations.includes('Org A'), true)

result = await fetchProjects({ org: 'Inexistente' })
assertEq('fetchProjects empresa sin resultados', result.projects.length, 0)

const p2 = { ...sampleProject, id: 'p2', org: 'Org B', metrics: { roi: 200 } }
await saveProject(p2, { replaceId: 'p1' })
result = await fetchProjects()
assertEq('saveProject replaceId', result.projects.length, 1)
assertEq('replaceId mantiene org B', result.projects[0].org, 'Org B')

await deleteProject('p2')
result = await fetchProjects()
assertEq('deleteProject', result.projects.length, 0)

await saveProject(sampleProject)
await clearProjects()
result = await fetchProjects()
assertEq('clearProjects', result.projects.length, 0)

const row = projectToRow(sampleProject)
assertEq('projectToRow org', row.org, 'Org A')
assertEq('projectFromRow org', projectFromRow(row).org, 'Org A')

// ── 6. Flujos de botones (lógica App) ──────────────────────────
console.log('\n6. Flujos de botones (lógica simulada)')

function clampApply({ prov, hrs, err, cost }) {
  return {
    prov: Math.min(300, Math.max(10, prov)),
    hrs: Math.min(24, Math.max(2, hrs)),
    err: Math.min(60, Math.max(5, err)),
    cost: Math.min(120000, Math.max(20000, cost)),
  }
}

const clamped = clampApply({ prov: 5, hrs: 30, err: 99, cost: 5000 })
assertEq('Modal Aplicar — prov min', clamped.prov, 10)
assertEq('Modal Aplicar — hrs max', clamped.hrs, 24)
assertEq('Modal Aplicar — err max', clamped.err, 60)
assertEq('Modal Aplicar — cost min', clamped.cost, 20000)

function buildProjectPayload(orgName, d, params) {
  return {
    org: orgName,
    params,
    metrics: {
      roi: d.roi,
      payback: d.payback,
      totalSavY: d.totalSavY,
      net12: d.net12,
      inv12: d.inv12,
    },
  }
}

const payload = buildProjectPayload('IAC', empty, BASE)
assertEq('Guardar escenario — ROI en metrics', payload.metrics.roi, empty.roi)

function loadProjectParams(project) {
  const { params } = project
  return {
    prov: params.prov,
    customCostItems: params.customCostItems || [],
    customVolumeItems: params.customVolumeItems || [],
  }
}

const loaded = loadProjectParams({
  params: { ...BASE, customCostItems: [{ id: 'x', amount: 100, frequency: 'once' }], customVolumeItems: [] },
})
assertEq('Cargar escenario — customCostItems', loaded.customCostItems.length, 1)

function assertFalse(label, cond) {
  assertTrue(label, !cond, 'debería ser falso')
}

function switchModule(_current, next) {
  if (next === 'proyectos') return 'proyectos'
  if (next === 'descubrimiento') return 'descubrimiento'
  return 'diagnostico'
}
assertEq('Nav módulo Diagnóstico', switchModule('proyectos', 'diagnostico'), 'diagnostico')
assertEq('Nav módulo Portafolio', switchModule('diagnostico', 'proyectos'), 'proyectos')
assertEq('Nav módulo Descubrimiento', switchModule('diagnostico', 'descubrimiento'), 'descubrimiento')

function canDiscoveryNext(step, { org, processDesc, tools, toolsOther, systems, systemsOther }) {
  if (step === 0) return org.trim().length >= 2
  if (step === 1) return processDesc.trim().length >= 30
  if (step === 2) return tools.length > 0 || toolsOther.trim().length > 2
  if (step === 3) return systems.length > 0 || systemsOther.trim().length > 2
  return true
}

const discoveryDraft = {
  org: 'ACME',
  processDesc: 'Proceso manual de vinculación de proveedores con validación en Excel y correo.',
  tools: ['Excel / hojas de cálculo'],
  toolsOther: '',
  systems: ['ERP'],
  systemsOther: '',
}
assertTrue('Wizard paso 0 — org válida', canDiscoveryNext(0, discoveryDraft))
assertTrue('Wizard paso 1 — proceso >= 30 chars', canDiscoveryNext(1, discoveryDraft))
assertFalse('Wizard paso 1 — proceso corto', canDiscoveryNext(1, { ...discoveryDraft, processDesc: 'corto' }))
assertTrue('Wizard paso 2 — herramientas', canDiscoveryNext(2, discoveryDraft))
assertTrue('Wizard paso 3 — sistemas', canDiscoveryNext(3, discoveryDraft))

function mergeVoiceTranscript(prev, chunk, isFinal) {
  if (!isFinal || !chunk.trim()) return prev
  return prev.trim() ? `${prev.trim()} ${chunk.trim()}` : chunk.trim()
}
assertEq('Voz — primer fragmento', mergeVoiceTranscript('', 'Recibimos correos', true), 'Recibimos correos')
assertEq('Voz — acumula fragmentos', mergeVoiceTranscript('Recibimos correos', 'y los pasamos a Excel', true), 'Recibimos correos y los pasamos a Excel')
assertEq('Voz — ignora interim', mergeVoiceTranscript('texto', 'parcial', false), 'texto')

// ── 7. Generación DOCX ─────────────────────────────────────────
console.log('\n7. Informe Word (generateReportDocx.js)')

const logoPath = path.join(__dirname, '..', 'public', 'logo-iac.png')
const logoData = new Uint8Array(fs.readFileSync(logoPath))
const fontsDir = path.join(__dirname, '..', 'public', 'fonts')
const reportFonts = {
  regular: new Uint8Array(fs.readFileSync(path.join(fontsDir, 'Poppins-Regular.ttf'))),
  bold: new Uint8Array(fs.readFileSync(path.join(fontsDir, 'Poppins-Bold.ttf'))),
  semibold: new Uint8Array(fs.readFileSync(path.join(fontsDir, 'Poppins-SemiBold.ttf'))),
}

const doc = createImpactReportDocument({
  orgName: 'Leonisa S.A.S.',
  processDescription: descWithObj,
  d: empty,
  tRed: 70,
  eRed: 85,
  logoData,
  reportFonts,
})

const buffer = await Packer.toBuffer(doc)
assertTrue('DOCX buffer generado', buffer.length > 10000)

const zip = new AdmZip(buffer)
const docXml = zip.readAsText('word/document.xml')
const docText = docxPlainText(docXml)
const checks = [
  'Informe Ejecutivo de Impacto',
  'Leonisa S.A.S.',
  'ESTADO ACTUAL',
  'Objetivos espec',
  'Conclusión ejecutiva',
  `${empty.roi}%`,
]
for (const c of checks) {
  assertTrue(`DOCX contiene "${c}"`, docText.includes(c))
}
const headerEntry = zip.getEntries().find((e) => e.entryName.startsWith('word/header'))
const headerXml = headerEntry ? headerEntry.getData().toString('utf8') : ''
assertEq('Logo solo en encabezado (cuerpo sin imágenes)', (docXml.match(/<a:blip/g) ?? []).length, 0)
assertEq('Logo presente en encabezado', (headerXml.match(/<a:blip/g) ?? []).length, 1)
assertTrue('Poppins embebida en fontTable', zip.readAsText('word/fontTable.xml').includes('Poppins'))

// ── 8. Módulo Descubrimiento ───────────────────────────────────
console.log('\n8. Descubrimiento de automatización')

const discoveryInput = {
  org: 'Empresa Test S.A.S.',
  sector: 'Banca y fintech',
  processDesc: 'Recibimos solicitudes de apertura por correo, las digitamos en Excel, validamos documentos manualmente y registramos en el core bancario con retrabajos frecuentes.',
  tools: ['Correo electrónico', 'Excel / hojas de cálculo'],
  systems: ['ERP', 'Core bancario'],
  toolsOther: '',
  systemsOther: '',
}

const discoveryJson = JSON.stringify({
  sector: 'Banca y fintech',
  processSummary: 'Proceso manual con alta fricción documental.',
  maturityLevel: 'inicial',
  recommendedFirstStep: 'Automatizar captura desde correo.',
  suggestions: [
    {
      id: 'kyc-digital',
      title: 'Onboarding digital con KYC',
      category: 'Validación documental',
      efficiencyScore: 92,
      priorityRank: 2,
      rationale: 'Reduce digitación manual.',
      industryUseCase: 'Bancos digitales en Colombia.',
      expectedImpact: '-50% tiempo de apertura',
      complexity: 'medio',
      integrations: ['Core bancario'],
      quickWin: true,
    },
    {
      id: 'capture-email',
      title: 'Captura estructurada desde correo',
      category: 'Captura de datos',
      efficiencyScore: 88,
      priorityRank: 1,
      rationale: 'Elimina re-digitación.',
      industryUseCase: 'Fintechs de crédito.',
      expectedImpact: '-40% errores de transcripción',
      complexity: 'bajo',
      integrations: [],
      quickWin: true,
    },
  ],
})

const discoveryParsed = parseDiscoveryResponse(discoveryJson)
assertEq('parseDiscovery — sugerencias', discoveryParsed.suggestions.length, 2)
assertEq('parseDiscovery — orden por rank', discoveryParsed.suggestions[0].priorityRank, 1)
assertEq('parseDiscovery — score acotado', discoveryParsed.suggestions[0].efficiencyScore, 88)
assertTrue('parseDiscovery — quickWin', discoveryParsed.suggestions[0].quickWin)

try {
  parseDiscoveryResponse('{"suggestions":[]}')
  fail('parseDiscovery vacío', 'no lanzó error')
} catch {
  ok('parseDiscovery rechaza sin sugerencias')
}

const fallback = buildFallbackDiscovery(discoveryInput)
assertTrue('fallback — sugerencias', fallback.suggestions.length >= 4)
assertTrue('fallback — scores válidos', fallback.suggestions.every((s) => s.efficiencyScore >= 45 && s.efficiencyScore <= 98))
assertTrue('fallback — orden descendente score', fallback.suggestions[0].efficiencyScore >= fallback.suggestions[1].efficiencyScore)
assertTrue('fallback — recommendedFirstStep', fallback.recommendedFirstStep.length > 10)

const descFull = buildDiscoveryDescription(discoveryInput)
assertTrue('buildDiscovery — incluye org', descFull.includes('Empresa Test'))
assertTrue('buildDiscovery — incluye proceso', descFull.includes('core bancario'))
assertTrue('buildDiscovery — incluye herramientas', descFull.includes('Excel'))

const descOne = buildDiscoveryDescription(discoveryInput, fallback.suggestions[0])
assertTrue('buildDiscovery — sugerencia', descOne.includes('AUTOMATIZACIÓN PRIORITARIA'))
assertTrue('buildDiscovery — título sugerencia', descOne.includes(fallback.suggestions[0].title))

const userMsg = buildDiscoveryUserMessage(discoveryInput)
assertTrue('discovery prompt — sector', userMsg.includes('Banca y fintech'))
assertTrue('discovery prompt — hints industria', userMsg.includes(INDUSTRY_HINTS['Banca y fintech'][0].slice(0, 20)))
assertTrue('DISCOVERY_SYSTEM_PROMPT definido', DISCOVERY_SYSTEM_PROMPT.includes('efficiencyScore'))

assertTrue('SECTORS definidos', SECTORS.length >= 10)
assertTrue('TOOL_OPTIONS', TOOL_OPTIONS.includes('Correo electrónico'))
assertTrue('SYSTEM_OPTIONS', SYSTEM_OPTIONS.includes('ERP'))

function entryPath(route) {
  if (route === 'evaluate') return { module: 'diagnostico', showDiagnosis: true, showEntry: false }
  if (route === 'discover') return { module: 'descubrimiento', showDiagnosis: false, showEntry: false }
  return { module: 'diagnostico', showEntry: true }
}
assertEq('Entry — evaluar impacto', entryPath('evaluate').module, 'diagnostico')
assertTrue('Entry — abre diagnóstico', entryPath('evaluate').showDiagnosis)
assertEq('Entry — descubrir', entryPath('discover').module, 'descubrimiento')

function openDiagnosisFromDiscovery(session, suggestion = null) {
  if (!session?.input) return null
  return buildDiscoveryDescription(session.input, suggestion)
}
const sessionMock = { input: discoveryInput, result: fallback }
const bridged = openDiagnosisFromDiscovery(sessionMock, fallback.suggestions[0])
assertTrue('Puente discovery → diagnóstico', bridged.includes('Justificación:'))

// ── 9. Integridad de archivos UI ───────────────────────────────
console.log('\n9. Integridad módulos y componentes')

const srcRoot = path.join(__dirname, '..', 'src')
const requiredFiles = [
  'components/ModalEntry.jsx',
  'components/discovery/DiscoveryWizard.jsx',
  'components/discovery/DiscoveryResults.jsx',
  'panels/PanelDescubrimiento.jsx',
  'services/discoverAutomations.js',
  'services/projectsService.js',
  'lib/supabase.js',
  'hooks/useSpeechRecognition.js',
]
for (const f of requiredFiles) {
  assertTrue(`existe ${f}`, fs.existsSync(path.join(srcRoot, f)))
}

const wizardSrc = fs.readFileSync(path.join(srcRoot, 'components/discovery/DiscoveryWizard.jsx'), 'utf8')
assertTrue('Wizard importa useSpeechRecognition', wizardSrc.includes('useSpeechRecognition'))
assertTrue('Wizard botón Dictar', wizardSrc.includes('Dictar'))
assertTrue('Wizard paso Proceso', wizardSrc.includes('processDesc'))

const moduleNavSrc = fs.readFileSync(path.join(srcRoot, 'components/ModuleNav.jsx'), 'utf8')
assertTrue('ModuleNav — descubrimiento', moduleNavSrc.includes("id: 'descubrimiento'"))

const appSrc = fs.readFileSync(path.join(srcRoot, 'App.jsx'), 'utf8')
assertTrue('App — ModalEntry', appSrc.includes('ModalEntry'))
assertTrue('App — PanelDescubrimiento', appSrc.includes('PanelDescubrimiento'))
assertTrue('App — buildDiscoveryDescription', appSrc.includes('buildDiscoveryDescription'))
assertTrue('App — projectsService', appSrc.includes('projectsService'))
assertTrue('App — fetchProjects', appSrc.includes('fetchProjects'))

// ── Resumen ────────────────────────────────────────────────────
console.log('\n' + '─'.repeat(50))
if (failures.length) {
  console.error(`FALLÓ: ${failures.length} error(es), ${passed} OK`)
  failures.forEach((f) => console.error(' •', f))
  process.exit(1)
}
console.log(`TODO OK — ${passed} pruebas pasaron`)
console.log(`  ROI base=${empty.roi}%  payback=mes ${empty.payback}  inv12=${empty.inv12}`)
