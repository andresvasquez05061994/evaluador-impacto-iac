import { INDUSTRY_HINTS } from '../constants/industryUseCases.js'

const TEMPLATES = [
  {
    id: 'capture-structured',
    title: 'Captura estructurada desde correo y archivos',
    category: 'Captura de datos',
    baseScore: 88,
    toolBoost: ['Correo electrónico', 'Excel / hojas de cálculo', 'Formularios en papel'],
    rationale: 'Elimina re-digitación manual al extraer datos de correos, PDF y Excel hacia un formulario único.',
    impact: 'Reducción estimada del 40-60% en tiempo de captura y errores de transcripción.',
    complexity: 'bajo',
    quickWin: true,
  },
  {
    id: 'doc-validation',
    title: 'Validación documental automatizada',
    category: 'Validación documental',
    baseScore: 82,
    toolBoost: ['Formularios en papel', 'SharePoint / carpetas compartidas'],
    rationale: 'Verifica completitud y consistencia de soportes antes de aprobar el caso.',
    impact: 'Menos retrabajos y devoluciones; mejora la tasa de primera pasada.',
    complexity: 'medio',
    quickWin: true,
  },
  {
    id: 'erp-integration',
    title: 'Integración con ERP / sistemas core',
    category: 'Integración de sistemas',
    baseScore: 75,
    systemBoost: ['ERP', 'CRM', 'Core bancario'],
    rationale: 'Sincroniza datos validados con el sistema maestro sin intervención manual.',
    impact: 'Elimina doble registro y inconsistencias entre áreas.',
    complexity: 'alto',
    quickWin: false,
  },
  {
    id: 'notifications',
    title: 'Notificaciones y seguimiento automático',
    category: 'Notificaciones',
    baseScore: 78,
    toolBoost: ['Correo electrónico', 'WhatsApp / mensajería'],
    rationale: 'Informa al cliente y al equipo sobre estados, pendientes y vencimientos.',
    impact: 'Menos consultas de estado y menor tiempo de ciclo del proceso.',
    complexity: 'bajo',
    quickWin: true,
  },
  {
    id: 'traceability',
    title: 'Trazabilidad y auditoría del flujo',
    category: 'Trazabilidad',
    baseScore: 70,
    toolBoost: ['Sin herramienta formal', 'Formularios en papel'],
    rationale: 'Registra cada paso, responsable y evidencia para cumplimiento y mejora continua.',
    impact: 'Visibilidad end-to-end y soporte a auditorías internas o regulatorias.',
    complexity: 'medio',
    quickWin: false,
  },
  {
    id: 'approvals',
    title: 'Flujo de aprobaciones con reglas de negocio',
    category: 'Aprobaciones',
    baseScore: 72,
    toolBoost: ['Correo electrónico', 'Excel / hojas de cálculo'],
    rationale: 'Enruta solicitudes según monto, riesgo o tipo sin depender de correos dispersos.',
    impact: 'Acelera decisiones y reduce cuellos de botella operativos.',
    complexity: 'medio',
    quickWin: false,
  },
]

function scoreTemplate(t, tools, systems) {
  let score = t.baseScore
  const toolHits = (t.toolBoost || []).filter((x) => tools.includes(x)).length
  const sysHits = (t.systemBoost || []).filter((x) => systems.includes(x)).length
  score += toolHits * 4 + sysHits * 3
  if (t.quickWin) score += 2
  return Math.min(98, score)
}

export function buildFallbackDiscovery({ sector, processDesc, tools, systems }) {
  const hints = INDUSTRY_HINTS[sector] || INDUSTRY_HINTS.Otro
  const scored = TEMPLATES.map((t) => ({
    ...t,
    efficiencyScore: scoreTemplate(t, tools || [], systems || []),
  }))
    .sort((a, b) => b.efficiencyScore - a.efficiencyScore)
    .slice(0, 5)
    .map((t, i) => ({
      id: t.id,
      title: t.title,
      category: t.category,
      efficiencyScore: t.efficiencyScore,
      priorityRank: i + 1,
      rationale: t.rationale,
      industryUseCase: hints[i % hints.length] || hints[0],
      expectedImpact: t.impact,
      complexity: t.complexity,
      integrations: (t.systemBoost || []).filter((s) => (systems || []).includes(s)),
      quickWin: t.quickWin,
    }))

  return {
    sector: sector || 'Sin clasificar',
    processSummary: processDesc
      ? `Proceso manual identificado con herramientas actuales que generan fricción operativa. ${processDesc.slice(0, 180)}${processDesc.length > 180 ? '…' : ''}`
      : 'Proceso manual con oportunidades claras de automatización.',
    maturityLevel: tools?.includes('Sin herramienta formal') || tools?.includes('Formularios en papel')
      ? 'inicial'
      : 'intermedio',
    recommendedFirstStep: scored[0]
      ? `Comenzar por «${scored[0].title}» por su balance entre impacto (${scored[0].efficiencyScore}/100) y complejidad ${scored[0].complexity}.`
      : 'Priorizar captura estructurada de datos como primer paso.',
    suggestions: scored,
  }
}
