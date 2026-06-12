import {
  AlignmentType,
  BorderStyle,
  CharacterSet,
  Document,
  Footer,
  Header,
  ImageRun,
  LevelFormat,
  Packer,
  PageNumber,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx'
import { buildReportData, fmtMoney, fmtNum, buildRoiInvestmentRows, buildOperationalParamsRows } from './reportContent.js'
import { loadIacLogo, logoImageRun } from './loadIacLogo.js'
import { loadReportFonts, REPORT_FONT, reportFont } from './loadReportFonts.js'
import { renderEffortRadarChart } from './generateEffortRadarChart.js'

const NAVY = '0F0F1A'
const AMBER = 'EF9F27'
const TEAL = '1D9E75'
const MUTED = '6E6E7D'
const WHITE = 'FFFFFF'
const LIGHT_BG = 'F8F9FC'

const FONT = REPORT_FONT
const BODY = 18   // 9 pt ≈ 12 px (cuerpo plataforma)
const SMALL = 16  // 8 pt — etiquetas secundarias
const TITLE = 28  // 14 pt — título portada
const SUBTITLE = 22 // 11 pt — subtítulos

function run(text, opts = {}) {
  return new TextRun({ text, size: opts.size ?? BODY, ...reportFont(opts) })
}

function spacer(after = 120) {
  return new Paragraph({ spacing: { after }, children: [] })
}

function body(text, opts = {}) {
  return new Paragraph({
    alignment: opts.align,
    spacing: { after: opts.after ?? 160, line: 276 },
    children: [run(text, { size: opts.size ?? BODY, bold: opts.bold, italics: opts.italic, color: opts.color })],
  })
}

function sectionHeader(num, title, subtitle) {
  const blocks = [
    new Paragraph({
      spacing: { before: 320, after: 80 },
      border: { bottom: { color: AMBER, space: 1, style: BorderStyle.SINGLE, size: 6 } },
      children: [
        run(String(num).padStart(2, '0'), { bold: true, color: AMBER, size: SUBTITLE }),
        run('  ', { size: SUBTITLE }),
        run(title.toUpperCase(), { bold: true, color: NAVY, size: SUBTITLE }),
      ],
    }),
  ]
  if (subtitle) blocks.push(body(subtitle, { color: MUTED, italic: true, size: SMALL, after: 200 }))
  return blocks
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: 'iac-bullets', level: 0 },
    spacing: { after: 100, line: 276 },
    children: [run(text)],
  })
}

function kpiTable(kpis) {
  const col = 2340
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    columnWidths: [col, col, col, col],
    rows: [
      new TableRow({
        children: kpis.map(({ label, value }) => new TableCell({
          width: { size: col, type: WidthType.DXA },
          shading: { fill: LIGHT_BG, type: ShadingType.CLEAR },
          margins: { top: 120, bottom: 120, left: 140, right: 140 },
          children: [
            new Paragraph({ spacing: { after: 60 }, children: [run(label, { color: MUTED, size: SMALL })] }),
            new Paragraph({ children: [run(value, { bold: true, color: NAVY, size: SUBTITLE })] }),
          ],
        })),
      }),
    ],
  })
}

function dataTable(headers, rows, headerFill = NAVY) {
  const pct = Math.floor(100 / headers.length)
  const colWidth = Math.floor(9360 / headers.length)

  const headerRow = new TableRow({
    tableHeader: true,
    children: headers.map((h) => new TableCell({
      width: { size: colWidth, type: WidthType.DXA },
      shading: { fill: headerFill, type: ShadingType.CLEAR },
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({ children: [run(h, { bold: true, color: WHITE, size: SMALL })] })],
    })),
  })

  const bodyRows = rows.map((row, ri) => new TableRow({
    children: row.map((cell, ci) => new TableCell({
      width: { size: colWidth, type: WidthType.DXA },
      shading: ri % 2 === 1 ? { fill: LIGHT_BG, type: ShadingType.CLEAR } : undefined,
      margins: { top: 80, bottom: 80, left: 120, right: 120 },
      children: [new Paragraph({
        children: [run(String(cell), { bold: ci === 0, size: SMALL })],
      })],
    })),
  }))

  return new Table({
    width: { size: pct * headers.length, type: WidthType.PERCENTAGE },
    columnWidths: headers.map(() => colWidth),
    rows: [headerRow, ...bodyRows],
  })
}

function insightBox(title, text) {
  return [
    new Paragraph({
      spacing: { before: 120, after: 60 },
      shading: { fill: LIGHT_BG, type: ShadingType.CLEAR },
      border: { left: { color: TEAL, style: BorderStyle.SINGLE, size: 12, space: 4 } },
      indent: { left: 200 },
      children: [
        run(title, { bold: true, color: NAVY, size: SMALL }),
      ],
    }),
    new Paragraph({
      spacing: { after: 200 },
      shading: { fill: LIGHT_BG, type: ShadingType.CLEAR },
      indent: { left: 200 },
      children: [run(text, { color: MUTED, size: SMALL })],
    }),
  ]
}

function iacLogo(logoData) {
  return new ImageRun(logoImageRun(logoData))
}

function reportHeader(logoData) {
  return new Header({
    children: [
      new Paragraph({
        spacing: { after: 80 },
        children: [iacLogo(logoData)],
      }),
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 120 },
        border: { bottom: { color: AMBER, space: 1, style: BorderStyle.SINGLE, size: 4 } },
        children: [run('Informe Ejecutivo de Impacto', { color: MUTED, size: 16 })],
      }),
    ],
  })
}

function phaseBlock(num, title, text) {
  return [
    new Paragraph({
      spacing: { before: 160, after: 60 },
      children: [
        run(`Fase ${num} — `, { bold: true, color: AMBER, size: SMALL }),
        run(title, { bold: true, color: NAVY, size: SMALL }),
      ],
    }),
    body(text, { size: SMALL, after: 120 }),
  ]
}

function effortChartSection(chartPng, effortDimensions) {
  return [
    new Paragraph({
      spacing: { before: 320, after: 100 },
      border: { bottom: { color: AMBER, space: 1, style: BorderStyle.SINGLE, size: 6 } },
      children: [
        run('Anexo visual', { bold: true, color: AMBER, size: SMALL }),
        run('  ', { size: SMALL }),
        run('ESFUERZO MANUAL: ANTES VS. DESPUÉS', { bold: true, color: NAVY, size: SUBTITLE }),
      ],
    }),
    body(
      'Comparativa del esfuerzo operativo manual por dimensión, calculada con la volumetría, horas por registro y reducción de tiempo del cliente.',
      { color: MUTED, italic: true, size: SMALL, after: 160 },
    ),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new ImageRun({
          type: 'png',
          data: chartPng,
          transformation: { width: 480, height: 306 },
        }),
      ],
    }),
    dataTable(
      ['Dimensión', 'Sin plataforma', 'Con plataforma', 'Reducción'],
      effortDimensions.map((row) => [
        row.dim,
        `${row.sin}/100`,
        `${row.con}/100`,
        row.sin > 0 ? `-${Math.round((1 - row.con / row.sin) * 100)}%` : '—',
      ]),
      TEAL,
    ),
  ]
}

export function createImpactReportDocument({ orgName, processDescription, d, tRed, eRed, logoData, reportFonts, effortChartPng }) {
  const r = buildReportData({ orgName, processDescription, d, tRed, eRed })

  const embeddedFonts = reportFonts ? [
    { name: FONT, data: reportFonts.regular, characterSet: CharacterSet.ANSI },
    { name: `${FONT}-Bold`, data: reportFonts.bold, characterSet: CharacterSet.ANSI },
    { name: `${FONT}-SemiBold`, data: reportFonts.semibold, characterSet: CharacterSet.ANSI },
  ] : []

  return new Document({
    ...(embeddedFonts.length ? { fonts: embeddedFonts } : {}),
    numbering: {
      config: [{
        reference: 'iac-bullets',
        levels: [{
          level: 0,
          format: LevelFormat.BULLET,
          text: '\u2022',
          alignment: AlignmentType.LEFT,
          style: {
            run: { ...reportFont(), size: BODY },
            paragraph: {
              indent: { left: 720, hanging: 360 },
            },
          },
        }],
      }],
    },
    styles: {
      default: {
        document: {
          run: { ...reportFont(), size: BODY },
          paragraph: { spacing: { line: 276 } },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 1400, right: 1200, bottom: 1200, left: 1200 },
        },
      },
      headers: {
        default: reportHeader(logoData),
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [
                run('Documento confidencial  |  Página ', { color: MUTED, size: 16 }),
                new TextRun({ children: [PageNumber.CURRENT], ...reportFont({ size: 16, color: MUTED }) }),
              ],
            }),
          ],
        }),
      },
      children: [
        // Portada (logo solo en encabezado)
        new Paragraph({
          spacing: { before: 120, after: 120 },
          children: [run('Informe Ejecutivo de Impacto', { bold: true, color: NAVY, size: TITLE })],
        }),
        new Paragraph({
          spacing: { after: 60 },
          children: [run(r.orgName, { bold: true, color: NAVY, size: SUBTITLE })],
        }),
        new Paragraph({
          spacing: { after: 320 },
          children: [run(r.dateStr, { color: MUTED, size: SMALL })],
        }),

        kpiTable([
          { label: 'ROI 12 meses', value: `${r.d.roi}%` },
          { label: 'Ahorro anual', value: fmtMoney(r.d.totalSavY) },
          { label: 'Recuperación', value: r.d.payback <= 12 ? `Mes ${r.d.payback}` : 'Superior a 12 meses' },
          { label: 'Reducción de tiempo', value: `-${r.tRed}%` },
        ]),

        // 1. Estado actual
        ...sectionHeader(1, 'Estado actual', 'Línea base del proceso según parámetros ingresados por el cliente.'),
        body(r.narrative),
        ...(r.objectives.length
          ? [
            new Paragraph({
              spacing: { before: 120, after: 80 },
              children: [run('Objetivos específicos de la propuesta', { bold: true, color: NAVY, size: SMALL })],
            }),
            ...r.objectives.map((obj) => bullet(obj)),
          ]
          : []),
        dataTable(
          ['Parámetro operativo', 'Valor actual'],
          buildOperationalParamsRows(r.d),
        ),

        // 2. Temas críticos
        ...sectionHeader(2, 'Temas críticos del proceso', 'Exposición cuantificada derivada de la operación actual.'),
        dataTable(
          ['Aspecto crítico', 'Situación actual'],
          [
            ['Volumen de gestión', `${fmtNum(r.d.effectiveProv ?? r.d.prov)} registros/mes — ${(r.d.effectiveHrs ?? r.d.hrs).toFixed(1)} h/registro`],
            ['Carga operativa manual', `${fmtNum(r.d.manualHrsBefore)} horas/mes`],
            ['Calidad y errores', `${r.d.effectiveErrPct ?? r.d.errPct}% con error (${fmtNum(r.d.errBefore)} casos/mes)`],
            ['Costo operativo', `${fmtMoney(r.costoOperacionActual)}/mes`],
            ['Costo por retrabajo', `${fmtMoney(r.costoRetrabajoActual)}/mes`],
            ['Exposición económica total', `${fmtMoney(r.costoTotalActual)}/mes`],
          ],
          'D85A30',
        ),

        // 3. Reducción de tiempo
        ...sectionHeader(3, 'Reducción de tiempo', `Impacto configurado: ${r.tRed}% de reducción en tiempo de gestión.`),
        ...insightBox(
          'Hallazgo clave',
          `Se recuperan ${fmtNum(Math.round(r.d.savedHrsM))} horas/mes. Capacidad adicional: +${r.d.extraP} registros/mes (+${r.d.scalePct}%) sin ampliar equipo.`,
        ),
        dataTable(
          ['Indicador', 'Actual', 'Con plataforma', 'Impacto'],
          [
            ['Horas / registro', `${r.d.hrs} h`, `${r.d.hrsPerRecordAfter} h`, `-${r.tRed}%`],
            ['Horas totales / mes', fmtNum(r.d.manualHrsBefore), fmtNum(Math.round(r.d.manualHrsAfter)), `-${fmtNum(Math.round(r.d.savedHrsM))} h`],
            ['Horas liberadas / mes', '—', fmtNum(Math.round(r.d.savedHrsM)), `+${fmtNum(Math.round(r.d.savedHrsM))} h`],
            ['Capacidad adicional', '—', `+${r.d.extraP} reg./mes`, `+${r.d.scalePct}%`],
          ],
          TEAL,
        ),

        // 4. Reducción de errores
        ...sectionHeader(4, 'Reducción de errores', `Impacto configurado: ${r.eRed}% de reducción en tasa de error.`),
        ...insightBox(
          'Hallazgo clave',
          `Se evitan ${fmtNum(r.d.errBefore - r.d.errAfter)} casos de error/mes. Ahorro en retrabajo: ${fmtMoney(r.d.errSavM)}/mes.`,
        ),
        dataTable(
          ['Indicador', 'Actual', 'Con plataforma', 'Impacto'],
          [
            ['Tasa de error', `${r.d.errPct}%`, `${r.errPctProyectado}%`, `-${r.eRed}%`],
            ['Errores / mes', fmtNum(r.d.errBefore), fmtNum(r.d.errAfter), `-${fmtNum(r.d.errBefore - r.d.errAfter)}`],
            ['Costo retrabajo / mes', fmtMoney(r.costoRetrabajoActual), fmtMoney(r.costoRetrabajoProyectado), fmtMoney(r.d.errSavM)],
          ],
          TEAL,
        ),

        // 5. Reducción de costos
        ...sectionHeader(5, 'Reducción de costos', 'Comparativa económica operativa y retorno de la inversión a 12 meses.'),
        dataTable(
          ['Concepto', 'Actual / mes', 'Con plataforma', 'Ahorro / mes'],
          [
            ['Operación manual', fmtMoney(r.costoOperacionActual), fmtMoney(r.costoOperacionProyectado), fmtMoney(r.d.savedCostM)],
            ['Retrabajo por errores', fmtMoney(r.costoRetrabajoActual), fmtMoney(r.costoRetrabajoProyectado), fmtMoney(r.d.errSavM)],
            ['Total proceso', fmtMoney(r.costoTotalActual), fmtMoney(r.costoTotalProyectado), fmtMoney(r.d.totalSavM)],
          ],
          AMBER,
        ),
        spacer(160),
        dataTable(
          ['Retorno de inversión (12 meses)', 'Valor'],
          buildRoiInvestmentRows(r.d),
        ),

        // 6. Conclusiones
        ...sectionHeader(
          6,
          'Conclusiones y consideraciones de implementación',
          'Síntesis ejecutiva respaldada por indicadores de eficiencia de la solución IAC.',
        ),
        kpiTable([
          { label: 'Automatización', value: `${r.d.autoLevel}%` },
          { label: 'Eficiencia operativa', value: `${r.d.efIndex}/100` },
          { label: 'Trazabilidad', value: `${r.d.traceabilityScore}%` },
          { label: 'Cumplimiento', value: `${r.d.compScore}/100` },
        ]),
        spacer(200),
        ...insightBox(
          'Conclusión ejecutiva',
          `La automatización del proceso de ${r.orgName} genera un ahorro operativo de ${fmtMoney(r.d.totalSavM)}/mes (${fmtMoney(r.d.totalSavY)}/año). Considerando inversión inicial y cuota SaaS de ${fmtMoney(r.d.monthly)}/mes, el beneficio neto a 12 meses es ${fmtMoney(r.d.net12)} con ROI del ${r.d.roi}%. La solución reduce la carga manual en ${r.tRed}%, mejora la calidad en ${r.eRed}% y expande la capacidad operativa en ${r.d.scalePct}%.`,
        ),
        dataTable(
          ['Dimensión de eficiencia', 'Proceso manual', 'Con plataforma IAC', 'Mejora'],
          [
            ['Nivel de automatización', `${r.manualAutoPct}% manual`, `${r.d.autoLevel}% automatizado`, `+${r.d.autoLevel - r.manualAutoPct} pp`],
            ['Índice operativo', '20/100 (referencia)', `${r.d.efIndex}/100`, `+${r.d.efIndex - 20} pts`],
            ['Trazabilidad auditable', 'Parcial / manual', `${r.d.traceabilityScore}%`, `+${r.d.traceabilityScore - 30}%`],
            ['Cumplimiento normativo', '40/100 (referencia)', `${r.d.compScore}/100`, `+${r.d.compScore - 40} pts`],
            ['Documentos validados / mes', '—', fmtNum(r.d.docsValidatedPerMonth), `+${fmtNum(r.d.docsValidatedPerMonth)}`],
            ['Tareas automatizadas / registro', '—', `${r.d.tasksAutomatedPerRecord} h`, `-${r.tRed}% tiempo`],
          ],
          TEAL,
        ),
        new Paragraph({
          spacing: { before: 280, after: 120 },
          children: [run('Hoja de ruta de implementación', { bold: true, color: NAVY, size: SUBTITLE })],
        }),
        ...r.implNotes.flatMap((note, i) => phaseBlock(i + 1, note.title, note.body)),
        ...(effortChartPng ? effortChartSection(effortChartPng, r.d.effortDimensions) : []),
      ],
    }],
  })
}

export async function downloadImpactReportDocx(params) {
  const [logoData, reportFonts] = await Promise.all([loadIacLogo(), loadReportFonts()])
  const effortChartPng = await renderEffortRadarChart(params.d.effortDimensions)
  const doc = createImpactReportDocument({ ...params, logoData, reportFonts, effortChartPng })
  const { orgName } = params
  const blob = await Packer.toBlob(doc)
  const safeName = orgName.replace(/[^\w\s.-]/g, '').trim().replace(/\s+/g, '_') || 'informe'
  const fileName = `Resumen_Ejecutivo_IAC_${safeName}.docx`

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
