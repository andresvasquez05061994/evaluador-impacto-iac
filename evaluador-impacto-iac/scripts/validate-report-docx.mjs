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
const outPath = path.join(__dirname, '..', 'test-informe-ejemplo.docx')
const logoPath = path.join(__dirname, '..', 'public', 'logo-iac.png')
const logoData = new Uint8Array(fs.readFileSync(logoPath))
const fontsDir = path.join(__dirname, '..', 'public', 'fonts')
const reportFonts = {
  regular: new Uint8Array(fs.readFileSync(path.join(fontsDir, 'Poppins-Regular.ttf'))),
  bold: new Uint8Array(fs.readFileSync(path.join(fontsDir, 'Poppins-Bold.ttf'))),
  semibold: new Uint8Array(fs.readFileSync(path.join(fontsDir, 'Poppins-SemiBold.ttf'))),
}
console.log('Logo oficial:', logoPath, `(${(logoData.length / 1024).toFixed(0)} KB)`)

const exampleDesc = `Empresa Ejemplo S.A.S., organización ficticia del sector servicios, busca ordenar el registro de solicitudes internas. El ejercicio de prueba propone una plataforma que centralice el formulario, valide documentos y se conecte con un ERP de demostración.

OBJETIVOS ESPECÍFICOS DE LA PROPUESTA
Automatización y Optimización del Proceso: reducir la carga manual mediante una plataforma centralizada.
Validación y Control Documental: revisión automática de documentos requeridos en cada solicitud.
Integración con Sistemas Internos: conexión con un ERP de ejemplo para sincronizar datos de prueba.
Trazabilidad del Proceso: registro auditable de cada solicitud dentro del flujo operativo.`

const d = calculateImpact({
  prov: 40, hrs: 4, errPct: 10, costHr: 25000,
  tRed: 60, eRed: 80, impl: 10000000, monthly: 1000000, docsPerReg: 3,
})

const parsed = parseDescription(exampleDesc)
console.log('Narrativa (chars):', parsed.narrative.length)
console.log('Objetivos:', parsed.objectives.length)
parsed.objectives.forEach((o, i) => console.log(`  ${i + 1}. ${o.slice(0, 70)}...`))

const doc = createImpactReportDocument({
  orgName: 'Empresa Ejemplo S.A.S.',
  processDescription: exampleDesc,
  d,
  tRed: 60,
  eRed: 80,
  logoData,
  reportFonts,
})

const buffer = await Packer.toBuffer(doc)
fs.writeFileSync(outPath, buffer)
console.log('\nArchivo generado:', outPath, `(${(buffer.length / 1024).toFixed(1)} KB)`)

const checks = [
  'Informe Ejecutivo de Impacto',
  'Empresa Ejemplo S.A.S.',
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
const headerXml = zip.getEntries().find((e) => e.entryName.startsWith('word/header'))?.getData().toString('utf8') ?? ''
const bodyImages = (text.match(/<a:blip/g) ?? []).length
const headerImages = (headerXml.match(/<a:blip/g) ?? []).length
if (bodyImages !== 0) {
  console.error('Logo duplicado: el cuerpo del documento no debe incluir imágenes (encontradas:', bodyImages, ')')
  process.exit(1)
}
if (headerImages !== 1) {
  console.error('Encabezado debe tener exactamente 1 logo (encontrados:', headerImages, ')')
  process.exit(1)
}
const fontTable = zip.readAsText('word/fontTable.xml')
if (!fontTable.includes('Poppins')) {
  console.error('fontTable.xml no incluye Poppins embebida')
  process.exit(1)
}
const missing = checks.filter((c) => !text.includes(c))
if (missing.length) {
  console.error('FALTAN en documento:', missing)
  process.exit(1)
}
console.log('Validación OK —', checks.length, 'marcadores presentes, logo solo en encabezado, Poppins embebida')
