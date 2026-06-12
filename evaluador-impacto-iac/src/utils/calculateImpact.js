const SEVERITY_DOWNGRADE = {
  'CRÍTICO': 'ALTO',
  'ALTO': 'MEDIO',
  'MEDIO': 'BAJO',
  'BAJO': 'MUY BAJO',
}

function reworkCostPerCase(costHr, hrs) {
  return costHr * hrs * 0.25
}

function buildRiskDistribution(aiData, errPct, eR) {
  if (aiData?.errors?.length) {
    return aiData.errors.map((e) => ({
      label: e.name,
      before: e.errorRate || 0,
      after: +((e.errorRate || 0) * (1 - eR)).toFixed(1),
    }))
  }
  const categories = [
    { label: 'Doc. incompletos', weight: 0.35 },
    { label: 'Registros sin validar', weight: 0.30 },
    { label: 'Registros duplicados', weight: 0.15 },
    { label: 'Inconsistencias trib.', weight: 0.20 },
  ]
  return categories.map((c) => ({
    label: c.label,
    before: +(errPct * c.weight).toFixed(1),
    after: +(errPct * c.weight * (1 - eR)).toFixed(1),
  }))
}

function downgradeSeverity(severity, eR) {
  const next = SEVERITY_DOWNGRADE[severity] || 'BAJO'
  if (eR > 0.85) return SEVERITY_DOWNGRADE[next] || 'MUY BAJO'
  if (eR > 0.6) return next
  return severity
}

function buildRiskMatrix(aiData, errPct, eR) {
  if (aiData?.errors?.length) {
    return aiData.errors.slice(0, 6).map((e) => ({
      label: e.name.length > 22 ? e.name.slice(0, 22) + '…' : e.name,
      before: e.severity || 'MEDIO',
      after: downgradeSeverity(e.severity || 'MEDIO', eR),
    }))
  }
  const base = errPct > 30 ? 'ALTO' : errPct > 15 ? 'MEDIO' : 'BAJO'
  const after = downgradeSeverity(base, eR)
  return [
    { label: 'Doc. incompleta', before: base, after },
    { label: 'Fraude proceso', before: errPct > 20 ? 'MEDIO' : 'BAJO', after: downgradeSeverity('MEDIO', eR) },
    { label: 'Incumplimiento', before: base, after },
    { label: 'Error tributario', before: errPct > 25 ? 'MEDIO' : 'BAJO', after: downgradeSeverity('MEDIO', eR) },
    { label: 'Dobles registros', before: 'MEDIO', after: downgradeSeverity('MEDIO', eR) },
    { label: 'Sin trazabilidad', before: 'CRÍTICO', after: eR > 0.5 ? 'BAJO' : 'MEDIO' },
  ]
}

function buildAutomods(tRed, eRed) {
  const tR = tRed / 100
  const eR = eRed / 100
  return [
    { label: 'Captura de datos', pct: Math.round(Math.min(98, 40 + tR * 60)) },
    { label: 'Validación documental', pct: Math.round(eR * 100) },
    { label: 'Notificaciones', pct: Math.round(Math.min(95, 50 + tR * 45)) },
    { label: 'Registro en sistema', pct: Math.round(Math.min(90, 35 + tR * 55)) },
    { label: 'Integraciones externas', pct: Math.round(Math.min(85, 30 + tR * 55)) },
    { label: 'Trazabilidad y auditoría', pct: Math.round(Math.min(100, 60 + eR * 40)) },
  ]
}

function buildEffortDimensions(hrs, tRed) {
  const tR = tRed / 100
  const baseEffort = Math.round((hrs / 24) * 100)
  const dims = ['Captura', 'Validación', 'Notificaciones', 'Registro', 'Seguimiento', 'Retrabajos']
  const weights = [1.1, 1.0, 0.7, 0.85, 0.9, 0.95]
  return dims.map((dim, i) => ({
    dim,
    sin: Math.min(100, Math.round(baseEffort * weights[i])),
    con: Math.min(100, Math.round(baseEffort * weights[i] * (1 - tR * 0.85))),
  }))
}

function buildSecurityRadar(eRed, tRed, errBefore, prov, compScore) {
  const eR = eRed / 100
  const tR = tRed / 100
  const errRatio = errBefore / Math.max(prov, 1)
  const sinBase = Math.max(5, Math.min(45, Math.round(15 + errRatio * 35)))
  return [
    { dim: 'Trazabilidad', sin: Math.round(sinBase * 0.5), con: Math.round(Math.min(100, 70 + tR * 30)) },
    { dim: 'Validación', sin: sinBase, con: Math.round(eR * 100) },
    { dim: 'Acceso roles', sin: Math.round(sinBase * 1.2), con: Math.round(Math.min(95, 60 + tR * 35)) },
    { dim: 'Cifrado', sin: Math.round(sinBase * 1.5), con: Math.round(Math.min(95, 65 + tR * 30)) },
    { dim: 'Auditoría', sin: Math.round(sinBase * 0.7), con: Math.round(Math.min(95, 65 + eR * 30)) },
    { dim: 'Normatividad', sin: Math.round(sinBase * 1.1), con: compScore },
  ]
}

function sumCustomByFrequency(items, frequency) {
  return activeCostItems(items)
    .filter((i) => i.frequency === frequency)
    .reduce((s, i) => s + Number(i.amount), 0)
}

/** Solo ítems con volumen > 0 participan en el cálculo. */
export function activeVolumeItems(items) {
  return (items || []).filter((i) => Number(i.volume) > 0)
}

/** Solo ítems con monto > 0 participan en el cálculo. */
export function activeCostItems(items) {
  return (items || []).filter((i) => Number(i.amount) > 0)
}

function resolveEffectiveVolume(prov, hrs, errPct, docsPerReg, customVolumeItems = []) {
  const items = activeVolumeItems(customVolumeItems)

  if (items.length === 0) {
    return {
      effectiveProv: prov,
      effectiveHrs: hrs,
      effectiveErrPct: errPct,
      effectiveDocsPerReg: docsPerReg,
      manualHrsBefore: prov * hrs,
      customVolumeTotal: 0,
      hasCustomVolume: false,
    }
  }

  const customVolumeTotal = items.reduce((s, i) => s + Number(i.volume), 0)
  const effectiveProv = prov + customVolumeTotal

  const baseLabor = prov * hrs
  const customLabor = items.reduce((s, i) => {
    const h = Number(i.hoursPerUnit) > 0 ? Number(i.hoursPerUnit) : hrs
    return s + Number(i.volume) * h
  }, 0)
  const manualHrsBefore = baseLabor + customLabor
  const effectiveHrs = effectiveProv > 0 ? manualHrsBefore / effectiveProv : hrs

  const baseErrCases = prov * (errPct / 100)
  const customErrCases = items.reduce((s, i) => {
    const ep = Number(i.errorPct) > 0 ? Number(i.errorPct) : errPct
    return s + Number(i.volume) * (ep / 100)
  }, 0)
  const effectiveErrPct = effectiveProv > 0
    ? ((baseErrCases + customErrCases) / effectiveProv) * 100
    : errPct

  const baseDocs = prov * docsPerReg
  const customDocs = items.reduce((s, i) => s + Number(i.volume) * docsPerReg, 0)
  const effectiveDocsPerReg = effectiveProv > 0
    ? (baseDocs + customDocs) / effectiveProv
    : docsPerReg

  return {
    effectiveProv,
    effectiveHrs,
    effectiveErrPct,
    effectiveDocsPerReg,
    manualHrsBefore,
    customVolumeTotal,
    hasCustomVolume: true,
    errBeforeCases: baseErrCases + customErrCases,
  }
}

function resolveCustomCosts(impl, monthly, customCostItems = []) {
  const items = activeCostItems(customCostItems)
  if (items.length === 0) {
    return {
      customCostOnce: 0,
      customCostMonthly: 0,
      totalImpl: impl,
      totalMonthlyCost: monthly,
      hasCustomCost: false,
    }
  }

  const customCostOnce = sumCustomByFrequency(items, 'once')
  const customCostMonthly = sumCustomByFrequency(items, 'monthly')

  return {
    customCostOnce,
    customCostMonthly,
    totalImpl: impl + customCostOnce,
    totalMonthlyCost: monthly + customCostMonthly,
    hasCustomCost: true,
  }
}

export function calculateImpact({
  prov,
  hrs,
  errPct,
  costHr,
  tRed,
  eRed,
  impl,
  monthly,
  docsPerReg,
  aiData = null,
  customCostItems = [],
  customVolumeItems = [],
}) {
  const vol = resolveEffectiveVolume(prov, hrs, errPct, docsPerReg, customVolumeItems)
  const costs = resolveCustomCosts(impl, monthly, customCostItems)

  const effProv = vol.effectiveProv
  const effHrs = vol.effectiveHrs
  const effErrPct = vol.effectiveErrPct
  const effDocs = vol.effectiveDocsPerReg
  const useBaseVolume = !vol.hasCustomVolume
  const useBaseCost = !costs.hasCustomCost

  const tR = tRed / 100
  const eR = eRed / 100
  const errorCostPerCase = reworkCostPerCase(costHr, useBaseVolume ? hrs : effHrs)

  const savedHrsM = useBaseVolume ? prov * hrs * tR : effProv * effHrs * tR
  const savedCostM = savedHrsM * costHr
  const errBefore = vol.hasCustomVolume
    ? Math.round(vol.errBeforeCases)
    : Math.round(prov * errPct / 100)
  const errAfter = Math.round(errBefore * (1 - eR))
  const errSavM = (errBefore - errAfter) * errorCostPerCase
  const totalSavM = savedCostM + errSavM

  const { customCostOnce, customCostMonthly, totalImpl, totalMonthlyCost } = costs

  const inv12Base = impl + monthly * 12
  const inv12 = useBaseCost ? inv12Base : totalImpl + totalMonthlyCost * 12

  const netSavM = totalSavM - (useBaseCost ? monthly : totalMonthlyCost)
  const totalSavY = totalSavM * 12
  const netSavY = netSavM * 12
  const net12 = totalSavY - inv12
  const roi = inv12 > 0 ? Math.round((net12 / inv12) * 100) : 0
  const payback = netSavM > 0 ? Math.max(1, Math.ceil((useBaseCost ? impl : totalImpl) / netSavM)) : 99

  const extraP = Math.round(savedHrsM / Math.max(useBaseVolume ? hrs : effHrs, 0.5))
  const autoLevel = Math.round(Math.min(98, 40 + tR * 55 + eR * 5))
  const efIndex = Math.round(Math.min(100, 20 + tR * 45 + eR * 35))
  const scalePct = (useBaseVolume ? prov : effProv) > 0
    ? Math.round((extraP / (useBaseVolume ? prov : effProv)) * 100)
    : 0
  const compScore = Math.round(Math.min(100, 25 + eR * 50 + tR * 25))

  const manualHrsBefore = useBaseVolume ? prov * hrs : vol.manualHrsBefore
  const manualHrsAfter = manualHrsBefore * (1 - tR)
  const hrsPerRecordAfter = +((useBaseVolume ? hrs : effHrs) * (1 - tR)).toFixed(1)
  const tasksAutomatedPerRecord = Math.round((useBaseVolume ? hrs : effHrs) * tR)
  const docsValidatedPerMonth = useBaseVolume
    ? Math.round(prov * docsPerReg)
    : Math.round(effProv * effDocs)
  const traceabilityScore = Math.round(Math.min(100, 70 + tR * 30))

  const costoOperacionActual = manualHrsBefore * costHr
  const costoRetrabajoActual = errBefore * errorCostPerCase
  const costoTotalActual = costoOperacionActual + costoRetrabajoActual
  const costoOperacionProyectado = manualHrsAfter * costHr
  const costoRetrabajoProyectado = errAfter * errorCostPerCase
  const costoTotalConPlataformaM = costoOperacionProyectado + costoRetrabajoProyectado + (useBaseCost ? monthly : totalMonthlyCost)

  const riskErrPct = useBaseVolume ? errPct : effErrPct
  const riskDistribution = buildRiskDistribution(aiData, riskErrPct, eR)
  const riskMatrix = buildRiskMatrix(aiData, riskErrPct, eR)
  const automods = buildAutomods(tRed, eRed)
  const effortDimensions = buildEffortDimensions(useBaseVolume ? hrs : effHrs, tRed)
  const securityRadar = buildSecurityRadar(eRed, tRed, errBefore, useBaseVolume ? prov : effProv, compScore)
  const secControls = securityRadar.map((r, i) => ({
    label: ['Trazabilidad', 'Validación IA', 'Control acceso', 'Cifrado datos', 'Auditoría logs', 'Normatividad'][i],
    score: r.con,
  }))

  const capacityProjection = Array.from({ length: 12 }, (_, i) => ({
    m: `M${i + 1}`,
    sin: useBaseVolume ? prov : effProv,
    con: Math.round((useBaseVolume ? prov : effProv) + extraP * Math.min(1, (i + 1) / 3)),
  }))

  const productivityProjection = Array.from({ length: 12 }, (_, i) => ({
    m: `M${i + 1}`,
    h: Math.round(savedHrsM * (i + 1)),
  }))

  const cashFlow = Array.from({ length: 12 }, (_, i) => ({
    m: `M${i + 1}`,
    val: Math.round(
      totalSavM * (i + 1)
      - (useBaseCost ? impl : totalImpl)
      - (useBaseCost ? monthly : totalMonthlyCost) * (i + 1),
    ),
  }))

  return {
    prov,
    hrs,
    errPct,
    costHr,
    docsPerReg,
    effectiveProv: effProv,
    effectiveHrs: effHrs,
    effectiveErrPct: effErrPct,
    effectiveDocsPerReg: effDocs,
    customVolumeItems,
    customVolumeTotal: vol.customVolumeTotal,
    hasCustomVolume: vol.hasCustomVolume,
    hasCustomCost: costs.hasCustomCost,
    tR,
    eR,
    savedHrsM,
    savedCostM,
    errBefore,
    errAfter,
    errSavM,
    errorCostPerCase,
    totalSavM,
    totalSavY,
    netSavM,
    netSavY,
    inv12,
    net12,
    roi,
    payback,
    extraP,
    autoLevel,
    efIndex,
    scalePct,
    compScore,
    impl,
    monthly,
    customCostItems,
    customCostOnce,
    customCostMonthly,
    totalImpl,
    totalMonthlyCost,
    manualHrsBefore,
    manualHrsAfter,
    hrsPerRecordAfter,
    tasksAutomatedPerRecord,
    docsValidatedPerMonth,
    traceabilityScore,
    costoOperacionActual,
    costoRetrabajoActual,
    costoTotalActual,
    costoOperacionProyectado,
    costoRetrabajoProyectado,
    costoTotalConPlataformaM,
    riskDistribution,
    riskMatrix,
    automods,
    effortDimensions,
    securityRadar,
    secControls,
    capacityProjection,
    productivityProjection,
    cashFlow,
  }
}
