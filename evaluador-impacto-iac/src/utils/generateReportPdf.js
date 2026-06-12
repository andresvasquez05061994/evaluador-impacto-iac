import { jsPDF } from 'jspdf'
import { autoTable } from 'jspdf-autotable'

const C = {
  navy: [15, 15, 26],
  amber: [239, 159, 39],
  teal: [29, 158, 117],
  coral: [216, 90, 48],
  slate: [55, 55, 72],
  muted: [110, 110, 125],
  line: [220, 222, 232],
  bg: [248, 249, 252],
  white: [255, 255, 255],
}

const MARGIN = 20
const FOOTER_H = 14
const HEADER_H = 10

function fmtMoney(n) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Math.round(n))
}

function fmtMoneyShort(n) {
  const abs = Math.abs(n)
  if (abs >= 1e9) return `$${(n / 1e9).toFixed(1).replace('.', ',')} MM`
  if (abs >= 1e6) return `$${(n / 1e6).toFixed(1).replace('.', ',')} M`
  if (abs >= 1e3) return `$${Math.round(n / 1e3)} K`
  return fmtMoney(n)
}

function fmtNum(n) {
  return new Intl.NumberFormat('es-CO').format(Math.round(n))
}

function setColor(doc, [r, g, b]) {
  doc.setFillColor(r, g, b)
  doc.setDrawColor(r, g, b)
  doc.setTextColor(r, g, b)
}

function pageMetrics(doc) {
  const pageW = doc.internal.pageSize.getWidth()
  const pageH = doc.internal.pageSize.getHeight()
  return { pageW, pageH, contentW: pageW - MARGIN * 2, bottom: pageH - FOOTER_H }
}

function drawContinuationHeader(doc, orgName) {
  const { pageW } = pageMetrics(doc)
  doc.setFillColor(...C.navy)
  doc.rect(0, 0, pageW, HEADER_H, 'F')
  doc.setFillColor(...C.amber)
  doc.rect(0, HEADER_H, pageW, 0.8, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  setColor(doc, C.white)
  doc.text('Informe Ejecutivo de Impacto — IAC', MARGIN, 6.5)
  doc.setFont('helvetica', 'normal')
  setColor(doc, [200, 200, 210])
  const orgShort = orgName.length > 42 ? `${orgName.slice(0, 39)}...` : orgName
  doc.text(orgShort, pageW - MARGIN, 6.5, { align: 'right' })
}

function ensureSpace(doc, y, needed, orgName) {
  const { bottom } = pageMetrics(doc)
  if (y + needed > bottom) {
    doc.addPage()
    if (orgName) drawContinuationHeader(doc, orgName)
    return MARGIN + HEADER_H + 4
  }
  return y
}

function measureLines(doc, text, maxWidth, fontSize = 9.5) {
  doc.setFontSize(fontSize)
  return doc.splitTextToSize(String(text), maxWidth - 4)
}

function writeLines(doc, text, x, startY, maxWidth, fontSize = 9.5, lineH = 4.8, orgName) {
  let y = startY
  const lines = measureLines(doc, text, maxWidth, fontSize)
  lines.forEach((line) => {
    y = ensureSpace(doc, y, lineH, orgName)
    doc.setFontSize(fontSize)
    doc.text(line, x, y)
    y += lineH
  })
  return y + 3
}

function drawPageFooter(doc) {
  const { pageW, pageH } = pageMetrics(doc)
  const page = doc.getNumberOfPages()
  doc.setDrawColor(...C.line)
  doc.setLineWidth(0.2)
  doc.line(MARGIN, pageH - FOOTER_H, pageW - MARGIN, pageH - FOOTER_H)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7.5)
  setColor(doc, C.muted)
  doc.text('Ingeniería Asistida por Computador S.A.S.  |  Documento confidencial', MARGIN, pageH - 5)
  doc.text(`Página ${page}`, pageW - MARGIN, pageH - 5, { align: 'right' })
}

function drawCoverHeader(doc, orgName, dateStr) {
  const { pageW, contentW } = pageMetrics(doc)
  doc.setFillColor(...C.navy)
  doc.rect(0, 0, pageW, 54, 'F')
  doc.setFillColor(...C.amber)
  doc.rect(0, 54, pageW, 1.5, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  setColor(doc, C.amber)
  doc.text('IAC', MARGIN, 16)

  doc.setFontSize(18)
  setColor(doc, C.white)
  doc.text('Informe Ejecutivo de Impacto', MARGIN, 27)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  setColor(doc, [210, 210, 220])
  writeLines(doc, orgName, MARGIN, 35, contentW, 10, 4.5)

  doc.setFontSize(8.5)
  doc.text(dateStr, pageW - MARGIN, 16, { align: 'right' })
  doc.text('Evaluador de Impacto — Automatización de Procesos', pageW - MARGIN, 22, { align: 'right' })

  return 64
}

function drawKpiRow(doc, y, kpis, orgName) {
  const { contentW } = pageMetrics(doc)
  y = ensureSpace(doc, y, 26, orgName)
  const gap = 4
  const boxW = (contentW - gap * 3) / 4
  const boxH = 24

  kpis.forEach((kpi, i) => {
    const x = MARGIN + i * (boxW + gap)
    doc.setFillColor(...C.bg)
    doc.setDrawColor(...C.line)
    doc.setLineWidth(0.3)
    doc.roundedRect(x, y, boxW, boxH, 2, 2, 'FD')
    doc.setFillColor(...kpi.color)
    doc.rect(x, y, boxW, 2.5, 'F')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    setColor(doc, C.muted)
    const labelLines = measureLines(doc, kpi.label, boxW - 6, 7)
    labelLines.forEach((line, li) => doc.text(line, x + 3, y + 7 + li * 3.2))

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(kpi.value.length > 12 ? 9 : 11)
    setColor(doc, C.navy)
    doc.text(kpi.value, x + 3, y + 18)
  })

  return y + boxH + 8
}

function drawIcon(doc, type, cx, cy, size, color) {
  setColor(doc, color)
  doc.setLineWidth(0.45)
  const r = size / 2

  if (type === 'clock') {
    doc.circle(cx, cy, r, 'S')
    doc.line(cx, cy, cx, cy - r * 0.55)
    doc.line(cx, cy, cx + r * 0.45, cy + r * 0.15)
  } else if (type === 'check') {
    doc.circle(cx, cy, r, 'S')
    doc.line(cx - r * 0.35, cy, cx - r * 0.05, cy + r * 0.35)
    doc.line(cx - r * 0.05, cy + r * 0.35, cx + r * 0.4, cy - r * 0.35)
  } else if (type === 'cost') {
    doc.circle(cx, cy, r, 'S')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(size * 1.1)
    doc.text('$', cx - size * 0.18, cy + size * 0.18)
  } else if (type === 'alert') {
    doc.line(cx, cy - r, cx - r * 0.85, cy + r * 0.7)
    doc.line(cx, cy - r, cx + r * 0.85, cy + r * 0.7)
    doc.line(cx - r * 0.85, cy + r * 0.7, cx + r * 0.85, cy + r * 0.7)
    doc.setFillColor(...color)
    doc.circle(cx, cy + r * 0.15, 0.5, 'F')
  } else if (type === 'efficiency') {
    doc.line(cx - r, cy + r * 0.5, cx - r * 0.1, cy - r * 0.6)
    doc.line(cx - r * 0.1, cy - r * 0.6, cx + r, cy + r * 0.2)
    doc.line(cx - r * 0.55, cy + r * 0.05, cx + r * 0.55, cy + r * 0.05)
  } else if (type === 'target') {
    doc.circle(cx, cy, r, 'S')
    doc.circle(cx, cy, r * 0.55, 'S')
    doc.setFillColor(...color)
    doc.circle(cx, cy, r * 0.2, 'F')
  } else if (type === 'shield') {
    doc.line(cx, cy - r, cx - r * 0.75, cy - r * 0.35)
    doc.line(cx - r * 0.75, cy - r * 0.35, cx - r * 0.75, cy + r * 0.15)
    doc.line(cx - r * 0.75, cy + r * 0.15, cx, cy + r * 0.65)
    doc.line(cx, cy + r * 0.65, cx + r * 0.75, cy + r * 0.15)
    doc.line(cx + r * 0.75, cy + r * 0.15, cx + r * 0.75, cy - r * 0.35)
    doc.line(cx + r * 0.75, cy - r * 0.35, cx, cy - r)
  }
}

function drawSectionHeader(doc, y, num, title, subtitle, iconType, orgName) {
  const { contentW } = pageMetrics(doc)
  y = ensureSpace(doc, y, 28, orgName)

  doc.setFillColor(...C.navy)
  doc.roundedRect(MARGIN, y, contentW, 14, 1.5, 1.5, 'F')
  drawIcon(doc, iconType, MARGIN + 8, y + 7, 7, C.amber)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  setColor(doc, C.amber)
  doc.text(String(num).padStart(2, '0'), MARGIN + 14, y + 6)

  doc.setFontSize(11)
  setColor(doc, C.white)
  const titleLines = measureLines(doc, title.toUpperCase(), contentW - 30, 11)
  doc.text(titleLines[0], MARGIN + 22, y + 6.5)
  if (titleLines.length > 1) {
    doc.text(titleLines.slice(1).join(' '), MARGIN + 22, y + 10.5)
  }

  y += 16
  if (subtitle) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    setColor(doc, C.muted)
    y = writeLines(doc, subtitle, MARGIN, y, contentW, 8.5, 4.2, orgName)
  }
  return y + 2
}

function drawInsightBox(doc, y, title, body, accent, orgName) {
  const { contentW } = pageMetrics(doc)
  const bodyLines = measureLines(doc, body, contentW - 12, 8)
  const boxH = Math.max(18, 12 + bodyLines.length * 4)
  y = ensureSpace(doc, y, boxH + 4, orgName)

  doc.setFillColor(...C.bg)
  doc.setDrawColor(...accent)
  doc.setLineWidth(0.6)
  doc.roundedRect(MARGIN, y, contentW, boxH, 2, 2, 'FD')
  doc.setFillColor(...accent)
  doc.rect(MARGIN, y, 3, boxH, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8.5)
  setColor(doc, C.slate)
  doc.text(title, MARGIN + 6, y + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  setColor(doc, C.muted)
  bodyLines.forEach((line, i) => doc.text(line, MARGIN + 6, y + 11 + i * 4))
  return y + boxH + 6
}

function drawBulletList(doc, y, items, orgName, bulletColor = C.teal) {
  const { contentW } = pageMetrics(doc)
  items.forEach((item) => {
    const lines = measureLines(doc, item, contentW - 14, 8.5)
    y = ensureSpace(doc, y, lines.length * 4.5 + 4, orgName)
    doc.setFillColor(...bulletColor)
    doc.circle(MARGIN + 3, y - 0.5, 1.2, 'F')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    setColor(doc, C.slate)
    lines.forEach((line, i) => doc.text(line, MARGIN + 8, y + i * 4.5))
    y += lines.length * 4.5 + 3
  })
  return y
}

function parseDescription(description) {
  const match = description.match(/(.+?)(?:OBJETIVOS?\s*(?:ESPEC[IÍ]FICOS?)?(?:\s*DE\s*LA\s*PROPUESTA)?\s*:?\s*)([\s\S]+)/i)
  if (!match) return { narrative: description.trim(), objectives: [] }

  const narrative = match[1].trim()
  const rawObjectives = match[2]
    .split(/(?:\.\s+|\n+|;\s*)/)
    .map((s) => s.trim().replace(/^[-•*]\s*/, ''))
    .filter((s) => s.length > 8)

  return { narrative, objectives: rawObjectives }
}

function tableDefaults(headColor = C.navy) {
  return {
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: { top: 3, right: 3, bottom: 3, left: 3 },
      overflow: 'linebreak',
      lineColor: C.line,
      lineWidth: 0.15,
      textColor: C.slate,
      valign: 'middle',
    },
    headStyles: {
      fillColor: headColor,
      textColor: C.white,
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 3,
    },
    alternateRowStyles: { fillColor: C.bg },
    margin: { left: MARGIN, right: MARGIN },
    tableWidth: 'auto',
  }
}

function addTable(doc, startY, head, body, headColor, orgName) {
  const { contentW } = pageMetrics(doc)
  autoTable(doc, {
    startY,
    head,
    body,
    ...tableDefaults(headColor),
    tableWidth: contentW,
    columnStyles: head[0].length === 2
      ? { 0: { cellWidth: 58, fontStyle: 'bold' }, 1: { cellWidth: contentW - 58 } }
      : head[0].length === 4
        ? {
          0: { cellWidth: 42, fontStyle: 'bold' },
          1: { cellWidth: 38 },
          2: { cellWidth: 38 },
          3: { cellWidth: contentW - 118 },
        }
        : { 0: { cellWidth: 42, fontStyle: 'bold' } },
    didDrawPage: () => {
      if (orgName && doc.getNumberOfPages() > 1) {
        drawContinuationHeader(doc, orgName)
      }
    },
  })
  return doc.lastAutoTable.finalY + 8
}

function buildImplementationNotes(d, tRed, eRed) {
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
      body: `Ahorro anual ${fmtMoney(d.totalSavY)}, beneficio neto a 12 meses ${fmtMoney(d.net12)} y ROI ${d.roi}%. ${d.payback <= 12 ? `Recuperación estimada en el mes ${d.payback}.` : 'Se recomienda ajustar volumetría o inversión para acortar el payback.'}`,
    },
    {
      title: 'Trazabilidad, cumplimiento e integración',
      body: `Automatización ${d.autoLevel}%, índice operativo ${d.efIndex}/100, trazabilidad ${d.traceabilityScore}% y cumplimiento ${d.compScore}/100. Integrar con ERP e INSPECTOR desde la fase de despliegue.`,
    },
  ]
}

export function downloadImpactReport({
  orgName,
  processDescription,
  d,
  tRed,
  eRed,
}) {
  const description = processDescription?.trim()
    || `Evaluación de impacto para ${orgName} con base en los parámetros operativos configurados en el simulador IAC.`

  const { narrative, objectives } = parseDescription(description)

  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const { contentW } = pageMetrics(doc)

  const dateStr = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const costoOperacionActual = d.costoOperacionActual
  const costoRetrabajoActual = d.costoRetrabajoActual
  const costoTotalActual = d.costoTotalActual
  const costoOperacionProyectado = d.costoOperacionProyectado
  const costoRetrabajoProyectado = d.costoRetrabajoProyectado
  const costoTotalProyectado = d.costoOperacionProyectado + d.costoRetrabajoProyectado
  const errPctProyectado = +(d.errPct * (1 - d.eR)).toFixed(1)
  const manualAutoPct = Math.max(2, 100 - d.autoLevel)

  let y = drawCoverHeader(doc, orgName, dateStr)

  y = drawKpiRow(doc, y, [
    { label: 'ROI 12 meses', value: `${d.roi}%`, color: C.amber },
    { label: 'Ahorro anual', value: fmtMoneyShort(d.totalSavY), color: C.teal },
    { label: 'Recuperación', value: d.payback <= 12 ? `Mes ${d.payback}` : '> 12M', color: C.coral },
    { label: 'Reducción tiempo', value: `-${tRed}%`, color: C.navy },
  ], orgName)

  // 1. Estado actual
  y = drawSectionHeader(
    doc, y, 1, 'Estado actual',
    'Línea base del proceso según parámetros ingresados por el cliente.',
    'target',
    orgName,
  )
  doc.setFont('helvetica', 'normal')
  setColor(doc, C.slate)
  y = writeLines(doc, narrative, MARGIN, y, contentW, 9.5, 4.8, orgName)

  if (objectives.length) {
    y += 2
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    setColor(doc, C.slate)
    doc.text('Objetivos específicos de la propuesta', MARGIN, y)
    y += 5
    y = drawBulletList(doc, y, objectives, orgName, C.amber)
  }

  y = addTable(doc, y,
    [['Parámetro operativo', 'Valor actual']],
    [
      ['Registros / mes', fmtNum(d.prov)],
      ['Horas gestión / registro', `${d.hrs} h`],
      ['Horas totales / mes', `${fmtNum(d.manualHrsBefore)} h`],
      ['Tasa de error', `${d.errPct}% (${fmtNum(d.errBefore)} casos/mes)`],
      ['Costo hora analista', fmtMoney(d.costHr)],
      ['Costo operación manual / mes', fmtMoney(costoOperacionActual)],
      ['Costo retrabajo / mes', fmtMoney(costoRetrabajoActual)],
      ['Costo total proceso / mes', fmtMoney(costoTotalActual)],
    ],
    C.navy,
    orgName,
  )

  // 2. Temas críticos
  y = drawSectionHeader(
    doc, y, 2, 'Temas críticos del proceso',
    'Exposición cuantificada derivada de la operación actual.',
    'alert',
    orgName,
  )
  y = addTable(doc, y,
    [['Aspecto crítico', 'Situación actual']],
    [
      ['Volumen de gestión', `${fmtNum(d.prov)} registros/mes — ${d.hrs} h/registro`],
      ['Carga operativa manual', `${fmtNum(d.manualHrsBefore)} horas/mes`],
      ['Calidad y errores', `${d.errPct}% con error (${fmtNum(d.errBefore)} casos/mes)`],
      ['Costo operativo', `${fmtMoney(costoOperacionActual)}/mes`],
      ['Costo por retrabajo', `${fmtMoney(costoRetrabajoActual)}/mes`],
      ['Exposición económica total', `${fmtMoney(costoTotalActual)}/mes`],
    ],
    C.coral,
    orgName,
  )

  // 3. Reducción de tiempo
  y = drawSectionHeader(
    doc, y, 3, 'Reducción de tiempo',
    `Impacto configurado de la plataforma: ${tRed}% de reducción en tiempo de gestión.`,
    'clock',
    orgName,
  )
  y = drawInsightBox(
    doc, y, 'Hallazgo clave',
    `Se recuperan ${fmtNum(Math.round(d.savedHrsM))} horas/mes. Capacidad adicional: +${d.extraP} registros/mes (+${d.scalePct}%) sin ampliar equipo.`,
    C.teal,
    orgName,
  )
  y = addTable(doc, y,
    [['Indicador', 'Actual', 'Con plataforma', 'Impacto']],
    [
      ['Horas / registro', `${d.hrs} h`, `${d.hrsPerRecordAfter} h`, `-${tRed}%`],
      ['Horas totales / mes', fmtNum(d.manualHrsBefore), fmtNum(Math.round(d.manualHrsAfter)), `-${fmtNum(Math.round(d.savedHrsM))} h`],
      ['Horas liberadas / mes', '—', fmtNum(Math.round(d.savedHrsM)), `+${fmtNum(Math.round(d.savedHrsM))} h`],
      ['Capacidad adicional', '—', `+${d.extraP} reg./mes`, `+${d.scalePct}%`],
    ],
    C.teal,
    orgName,
  )

  // 4. Reducción de errores
  y = drawSectionHeader(
    doc, y, 4, 'Reducción de errores',
    `Impacto configurado de la plataforma: ${eRed}% de reducción en tasa de error.`,
    'check',
    orgName,
  )
  y = drawInsightBox(
    doc, y, 'Hallazgo clave',
    `Se evitan ${fmtNum(d.errBefore - d.errAfter)} casos de error/mes. Ahorro en retrabajo: ${fmtMoney(d.errSavM)}/mes.`,
    C.teal,
    orgName,
  )
  y = addTable(doc, y,
    [['Indicador', 'Actual', 'Con plataforma', 'Impacto']],
    [
      ['Tasa de error', `${d.errPct}%`, `${errPctProyectado}%`, `-${eRed}%`],
      ['Errores / mes', fmtNum(d.errBefore), fmtNum(d.errAfter), `-${fmtNum(d.errBefore - d.errAfter)}`],
      ['Costo retrabajo / mes', fmtMoney(costoRetrabajoActual), fmtMoney(costoRetrabajoProyectado), fmtMoney(d.errSavM)],
    ],
    C.teal,
    orgName,
  )

  // 5. Reducción de costos
  y = drawSectionHeader(
    doc, y, 5, 'Reducción de costos',
    'Comparativa económica y retorno de la inversión a 12 meses.',
    'cost',
    orgName,
  )
  y = addTable(doc, y,
    [['Concepto', 'Actual / mes', 'Con plataforma', 'Ahorro / mes']],
    [
      ['Operación manual', fmtMoney(costoOperacionActual), fmtMoney(costoOperacionProyectado), fmtMoney(d.savedCostM)],
      ['Retrabajo por errores', fmtMoney(costoRetrabajoActual), fmtMoney(costoRetrabajoProyectado), fmtMoney(d.errSavM)],
      ['Total proceso', fmtMoney(costoTotalActual), fmtMoney(costoTotalProyectado), fmtMoney(d.totalSavM)],
    ],
    C.amber,
    orgName,
  )
  y = addTable(doc, y,
    [['Retorno de inversión (12 meses)', 'Valor']],
    [
      ['Ahorro mensual total', fmtMoney(d.totalSavM)],
      ['Ahorro anual proyectado', fmtMoney(d.totalSavY)],
      ['Cuota SaaS / soporte (mensual)', fmtMoney(d.monthly)],
      ['Inversión inicial', fmtMoney(d.impl)],
      ['SaaS / soporte (12 meses)', fmtMoney(d.monthly * 12)],
      ['Inversión total 12 meses', fmtMoney(d.inv12)],
      ['Beneficio neto 12 meses', fmtMoney(d.net12)],
      ['ROI', `${d.roi}%`],
      ['Recuperación', d.payback <= 12 ? `Mes ${d.payback}` : 'Superior a 12 meses'],
    ],
    C.navy,
    orgName,
  )

  // 6. Conclusiones e implementación
  y = drawSectionHeader(
    doc, y, 6, 'Conclusiones y consideraciones de implementación',
    'Síntesis ejecutiva respaldada por indicadores de eficiencia de la solución IAC.',
    'efficiency',
    orgName,
  )

  y = drawKpiRow(doc, y, [
    { label: 'Automatización', value: `${d.autoLevel}%`, color: C.teal },
    { label: 'Eficiencia operativa', value: `${d.efIndex}/100`, color: C.amber },
    { label: 'Trazabilidad', value: `${d.traceabilityScore}%`, color: C.navy },
    { label: 'Cumplimiento', value: `${d.compScore}/100`, color: C.coral },
  ], orgName)

  y = drawInsightBox(
    doc, y, 'Conclusión ejecutiva',
    `La automatización del proceso de ${orgName} genera un ahorro operativo de ${fmtMoney(d.totalSavM)}/mes (${fmtMoney(d.totalSavY)}/año). Considerando inversión inicial y cuota SaaS de ${fmtMoney(d.monthly)}/mes, el beneficio neto a 12 meses es ${fmtMoney(d.net12)} con ROI del ${d.roi}%. La solución reduce la carga manual en ${tRed}%, mejora la calidad en ${eRed}% y expande la capacidad operativa en ${d.scalePct}%.`,
    C.amber,
    orgName,
  )

  y = addTable(doc, y,
    [['Dimensión de eficiencia', 'Proceso manual', 'Con plataforma IAC', 'Mejora']],
    [
      ['Nivel de automatización', `${manualAutoPct}% manual`, `${d.autoLevel}% automatizado`, `+${d.autoLevel - manualAutoPct} pp`],
      ['Índice operativo', '20/100 (referencia)', `${d.efIndex}/100`, `+${d.efIndex - 20} pts`],
      ['Trazabilidad auditable', 'Parcial / manual', `${d.traceabilityScore}%`, `+${d.traceabilityScore - 30}%`],
      ['Cumplimiento normativo', '40/100 (referencia)', `${d.compScore}/100`, `+${d.compScore - 40} pts`],
      ['Documentos validados / mes', '—', fmtNum(d.docsValidatedPerMonth), `+${fmtNum(d.docsValidatedPerMonth)}`],
      ['Tareas automatizadas / registro', '—', `${d.tasksAutomatedPerRecord} h`, `-${tRed}% tiempo`],
    ],
    C.teal,
    orgName,
  )

  const implNotes = buildImplementationNotes(d, tRed, eRed)
  y = ensureSpace(doc, y, 16, orgName)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  setColor(doc, C.slate)
  doc.text('Hoja de ruta de implementación', MARGIN, y)
  y += 6

  implNotes.forEach((note, i) => {
    y = ensureSpace(doc, y, 18, orgName)
    doc.setFillColor(...C.bg)
    doc.setDrawColor(...C.line)
    doc.setLineWidth(0.2)
    const noteLines = measureLines(doc, note.body, contentW - 18, 8.5)
    const noteH = Math.max(14, 8 + noteLines.length * 4.2)
    doc.roundedRect(MARGIN, y, contentW, noteH, 2, 2, 'FD')

    drawIcon(doc, i % 2 === 0 ? 'check' : 'shield', MARGIN + 6, y + noteH / 2, 6, C.teal)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    setColor(doc, C.amber)
    doc.text(`Fase ${i + 1} — ${note.title}`, MARGIN + 12, y + 5)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    setColor(doc, C.slate)
    noteLines.forEach((line, li) => doc.text(line, MARGIN + 12, y + 9 + li * 4.2))
    y += noteH + 4
  })

  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i)
    drawPageFooter(doc)
  }

  const safeName = orgName.replace(/[^\w\s.-]/g, '').trim().replace(/\s+/g, '_') || 'informe'
  doc.save(`Resumen_Ejecutivo_IAC_${safeName}.pdf`)
}
