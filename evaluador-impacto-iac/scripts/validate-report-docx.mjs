/**
 * Genera un .docx de prueba y valida estructura básica del contenido.
 * Ejecutar: node scripts/validate-report-docx.mjs
 */
import AdmZip from 'adm-zip'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { Packer } from 'docx'
import { calculateImpact } from '../src/utils/calculateImpact.js'
import { createImpactReportDocument } from '../src/utils/generateReportDocx.js'
import { parseDescription } from '../src/utils/reportContent.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outPath = path.join(__dirname, '..', 'test-informe-leonisa.docx')
const logoPath = path.join(__dirname, '..', 'public', 'logo-iac.png')
const logoData = new Uint8Array(fs.readFileSync(logoPath))
console.log('Logo oficial:', logoPath, `(${(logoData.length / 1024).toFixed(0)} KB)`)

const leonisaDesc = `Leonisa S.A.S., líder en la industria textil, busca optimizar y automatizar el proceso de vinculación de terceros. Ingeniería Asistida por Computador propone implementar una plataforma que centralice el registro de proveedores, valide la información requerida y la integre con los sistemas internos de Leonisa.

OBJETIVOS ESPECÍFICOS DE LA PROPUESTA
Automatización y Optimización del Proceso: reducir la carga manual mediante una plataforma centralizada.
Validación y Control Documental: revisión automática de documentos requeridos en cada vinculación.
Integración con Sistemas Internos: conexión con ERP de Leonisa para sincronizar datos en tiempo real.
Trazabilidad del Proceso: registro auditable de cada solicitud dentro del flujo operativo.
Integración con Plataforma INSPECTOR: conexión mediante BOT con INSPECTOR para validaciones cruzadas.`

const d = calculateImpact({
  prov: 60, hrs: 8, errPct: 20, costHr: 40000,
  tRed: 70, eRed: 85, impl: 14540900, monthly: 1800000, docsPerReg: 5,
})

const parsed = parseDescription(leonisaDesc)
console.log('Narrativa (chars):', parsed.narrative.length)
console.log('Objetivos:', parsed.objectives.length)
parsed.objectives.forEach((o, i) => console.log(`  ${i + 1}. ${o.slice(0, 70)}...`))

const doc = createImpactReportDocument({
  orgName: 'Leonisa S.A.S.',
  processDescription: leonisaDesc,
  d,
  tRed: 70,
  eRed: 85,
  logoData,
})

const buffer = await Packer.toBuffer(doc)
fs.writeFileSync(outPath, buffer)
console.log('\nArchivo generado:', outPath, `(${(buffer.length / 1024).toFixed(1)} KB)`)

const checks = [
  'Informe Ejecutivo de Impacto',
  'Leonisa S.A.S.',
  'ESTADO ACTUAL',
  'Objetivos específicos',
  'Automatización y Optimización',
  'CONCLUSIONES Y CONSIDERACIONES',
  'Hoja de ruta de implementación',
  'Trazabilidad',
  `${d.roi}%`,
]

const zip = new AdmZip(buffer)
const text = zip.readAsText('word/document.xml')
const missing = checks.filter((c) => !text.includes(c))
if (missing.length) {
  console.error('FALTAN en documento:', missing)
  process.exit(1)
}
console.log('Validación OK —', checks.length, 'marcadores presentes')
