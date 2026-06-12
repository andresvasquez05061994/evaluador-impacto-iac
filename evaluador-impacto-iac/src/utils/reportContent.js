export function fmtMoney(n) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Math.round(n))
}

export function fmtMoneyShort(n) {
  const abs = Math.abs(n)
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(1).replace('.', ',')} MM`
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1).replace('.', ',')} M`
  if (abs >= 1e3) return `$${Math.round(n / 1e3)} K`
  return fmtMoney(n)
}

export function fmtNum(n) {
  return new Intl.NumberFormat('es-CO').format(Math.round(n))
}

export function parseDescription(description) {
  const text = String(description || '').trim()
  const match = text.match(
    /([\s\S]+?)(?:\n\s*)?(?:OBJETIVOS?\s*(?:ESPEC[IÍ]FICOS?)?(?:\s*DE\s*LA\s*PROPUESTA)?\s*:?\s*)([\s\S]+)/i,
  )
  if (!match) return { narrative: text, objectives: [] }

  const narrative = match[1].trim()
  const objectives = match[2]
    .split(/\n+/)
    .map((line) => line.trim().replace(/^[-•*▪]\s*/, ''))
    .filter((line) => line.length > 4)

  return { narrative, objectives }
}

export function buildImplementationNotes(d, tRed, eRed) {
  return [
    {
      title: 'Automatización del flujo operativo',
      body: `Con ${tRed}% de reducción de tiempo se liberan ${fmtNum(Math.round(d.savedHrsM))} horas/mes y se habilitan +${d.extraP} registros adicionales/mes (+${d.scalePct}% de capacidad sin ampliar equipo).`,
    },
    {
      title: 'Control de calidad y validación documental',
      body: `La reducción de errores del ${eRed}% baja la tasa de ${d.errPct}% a ${(d.errPct * (1 - d.eR)).toFixed(1)}%, evitando ${fmtNum(d.errBefore - d.errAfter)} casos/mes y ${fmtMoney(d.errSavM)} en retrabajo.`,
    },
    {
      title: 'Validación financiera de la inversión',
      body: `Ahorro anual ${fmtMoney(d.totalSavY)}, beneficio neto a 12 meses ${fmtMoney(d.net12)} y ROI ${d.roi}%. Inversión total a 12 meses: ${fmtMoney(d.inv12)}${d.customCostItems?.length ? ' (incluye conceptos adicionales de costeo)' : ''}. Costos recurrentes: ${fmtMoney(d.totalMonthlyCost || d.monthly)}/mes. ${d.payback <= 12 ? `Recuperación estimada en el mes ${d.payback}.` : 'Se recomienda ajustar volumetría o inversión para acortar el payback.'}`,
    },
    {
      title: 'Trazabilidad, cumplimiento e integración',
      body: `Automatización ${d.autoLevel}%, índice operativo ${d.efIndex}/100, trazabilidad ${d.traceabilityScore}% y cumplimiento ${d.compScore}/100. Integrar con ERP e INSPECTOR desde la fase de despliegue.`,
    },
  ]
}

export function buildRoiInvestmentRows(d) {
  const rows = [
    ['Ahorro mensual total', fmtMoney(d.totalSavM)],
    ['Ahorro anual proyectado', fmtMoney(d.totalSavY)],
    ['Cuota SaaS / soporte (mensual)', fmtMoney(d.monthly)],
  ]

  for (const item of d.customCostItems || []) {
    if (!item.amount) continue
    const label = item.name?.trim() || 'Concepto adicional'
    if (item.frequency === 'monthly') {
      rows.push([`${label} (mensual)`, fmtMoney(item.amount)])
    }
  }

  if (d.hasCustomCost && d.customCostMonthly > 0) {
    rows.push(['Total costos recurrentes / mes', fmtMoney(d.totalMonthlyCost)])
  }

  rows.push(['Inversión inicial (implementación)', fmtMoney(d.impl)])

  for (const item of d.customCostItems || []) {
    if (!item.amount) continue
    const label = item.name?.trim() || 'Concepto adicional'
    if (item.frequency === 'once') {
      rows.push([`${label} (pago único)`, fmtMoney(item.amount)])
    }
  }

  if (d.hasCustomCost && d.customCostOnce > 0) {
    rows.push(['Inversión inicial total', fmtMoney(d.totalImpl)])
  }

  rows.push(['SaaS / soporte (12 meses)', fmtMoney(d.monthly * 12)])

  if (d.hasCustomCost && d.customCostMonthly > 0) {
    rows.push(['Conceptos adicionales (12 meses)', fmtMoney(d.customCostMonthly * 12)])
  }

  rows.push(
    ['Inversión total 12 meses', fmtMoney(d.inv12)],
    ['Beneficio neto 12 meses', fmtMoney(d.net12)],
    ['ROI', `${d.roi}%`],
    ['Recuperación', d.payback <= 12 ? `Mes ${d.payback}` : 'Superior a 12 meses'],
  )

  return rows
}

export function buildOperationalParamsRows(d) {
  const rows = [
    ['Registros base / mes', fmtNum(d.prov)],
    ['Horas gestión / registro (base)', `${d.hrs} h`],
  ]

  for (const item of d.customVolumeItems || []) {
    if (!item.volume) continue
    const label = item.name?.trim() || 'Concepto adicional'
    const h = item.hoursPerUnit > 0 ? `${item.hoursPerUnit} h/ud` : `${d.hrs} h/ud (base)`
    const err = item.errorPct > 0 ? ` · error ${item.errorPct}%` : ''
    rows.push([`${label}`, `${fmtNum(item.volume)} uds/mes · ${h}${err}`])
  }

  if (d.hasCustomVolume) {
    rows.push(['Volumen total / mes', fmtNum(d.effectiveProv)])
    rows.push(['Horas promedio ponderadas / registro', `${Number(d.effectiveHrs).toFixed(1)} h`])
    rows.push(['Tasa de error ponderada', `${Number(d.effectiveErrPct).toFixed(1)}% (${fmtNum(d.errBefore)} casos/mes)`])
  } else {
    rows.push(['Horas totales / mes', `${fmtNum(d.manualHrsBefore)} h`])
    rows.push(['Tasa de error', `${d.errPct}% (${fmtNum(d.errBefore)} casos/mes)`])
  }

  rows.push(
    ['Costo hora analista', fmtMoney(d.costHr)],
    ['Costo operación manual / mes', fmtMoney(d.costoOperacionActual)],
    ['Costo retrabajo / mes', fmtMoney(d.costoRetrabajoActual)],
    ['Costo total proceso / mes', fmtMoney(d.costoTotalActual)],
  )

  return rows
}

export function buildReportData({ orgName, processDescription, d, tRed, eRed }) {
  const description = processDescription?.trim()
    || `Evaluación de impacto para ${orgName} con base en los parámetros operativos configurados en el simulador IAC.`

  const { narrative, objectives } = parseDescription(description)

  const costoOperacionActual = d.costoOperacionActual
  const costoRetrabajoActual = d.costoRetrabajoActual
  const costoTotalActual = d.costoTotalActual
  const costoOperacionProyectado = d.costoOperacionProyectado
  const costoRetrabajoProyectado = d.costoRetrabajoProyectado
  const costoTotalProyectado = costoOperacionProyectado + costoRetrabajoProyectado
  const errPctProyectado = +(d.errPct * (1 - d.eR)).toFixed(1)
  const manualAutoPct = Math.max(2, 100 - d.autoLevel)

  const dateStr = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return {
    orgName,
    dateStr,
    narrative,
    objectives,
    implNotes: buildImplementationNotes(d, tRed, eRed),
    costoOperacionActual,
    costoRetrabajoActual,
    costoTotalActual,
    costoOperacionProyectado,
    costoRetrabajoProyectado,
    costoTotalProyectado,
    errPctProyectado,
    manualAutoPct,
    tRed,
    eRed,
    d,
  }
}
