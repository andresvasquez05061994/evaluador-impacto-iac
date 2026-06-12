/**
 * Verifica que sin conceptos adicionales el ROI sea idéntico al cálculo base,
 * y que los conceptos con volumen/monto > 0 alteren el resultado de forma predecible.
 * Ejecutar: node scripts/validate-impact-calculations.mjs
 */
import { calculateImpact } from '../src/utils/calculateImpact.js'

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

const legacy = legacyCalculate(BASE)
const empty = calculateImpact({ ...BASE, customCostItems: [], customVolumeItems: [] })
const placeholders = calculateImpact({
  ...BASE,
  customCostItems: [{ id: '1', name: '', amount: 0, frequency: 'once' }],
  customVolumeItems: [{ id: '2', name: '', volume: 0, hoursPerUnit: 0, errorPct: 0 }],
})

const keys = ['roi', 'payback', 'inv12', 'net12', 'totalSavM', 'netSavM', 'errBefore', 'savedHrsM']
const failures = []

for (const key of keys) {
  if (legacy[key] !== empty[key]) {
    failures.push(`Sin conceptos vs legacy — ${key}: legacy=${legacy[key]} actual=${empty[key]}`)
  }
  if (empty[key] !== placeholders[key]) {
    failures.push(`Placeholders en cero vs vacío — ${key}: empty=${empty[key]} placeholders=${placeholders[key]}`)
  }
}

if (!empty.hasCustomVolume || !empty.hasCustomCost === false) {
  if (empty.hasCustomVolume) failures.push('hasCustomVolume debería ser false sin ítems activos')
  if (empty.hasCustomCost) failures.push('hasCustomCost debería ser false sin ítems activos')
}

const withVolume = calculateImpact({
  ...BASE,
  customVolumeItems: [{ id: 'v1', name: 'Actualizaciones', volume: 20, hoursPerUnit: 3, errorPct: 0 }],
})
if (!withVolume.hasCustomVolume || withVolume.effectiveProv !== 80) {
  failures.push(`Volumen custom: effectiveProv=${withVolume.effectiveProv} (esperado 80)`)
}
if (withVolume.roi === empty.roi) {
  failures.push('ROI debería cambiar al agregar volumen adicional')
}

const withCost = calculateImpact({
  ...BASE,
  customCostItems: [{ id: 'c1', name: 'Capacitación', amount: 2000000, frequency: 'once' }],
})
if (!withCost.hasCustomCost || withCost.inv12 !== empty.inv12 + 2000000) {
  failures.push(`Costo custom: inv12=${withCost.inv12} (esperado ${empty.inv12 + 2000000})`)
}
if (withCost.roi === empty.roi) {
  failures.push('ROI debería cambiar al agregar costo adicional')
}

if (failures.length) {
  console.error('FALLÓ validación:')
  failures.forEach((f) => console.error(' -', f))
  process.exit(1)
}

console.log('Validación OK — sin conceptos adicionales ROI idéntico al cálculo base')
console.log(`  ROI=${empty.roi}%  payback=mes ${empty.payback}  inv12=${empty.inv12}`)
console.log('  Placeholders en cero no alteran el resultado')
console.log('  Conceptos activos modifican ROI correctamente')
