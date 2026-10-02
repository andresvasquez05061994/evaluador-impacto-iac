/**
 * Comprueba que la clave anónima no puede leer escenarios.
 * No descarga el sitio, no imprime la clave y no escribe en la base.
 *
 *   VITE_SUPABASE_URL=https://tu-proyecto.supabase.co \
 *   VITE_SUPABASE_ANON_KEY=tu_anon_key \
 *   node scripts/extract-and-test-supabase.mjs
 */

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '').replace(/\/rest\/v1$/i, '')
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || ''

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Defina VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY en el entorno. No hay valores por defecto.')
  process.exit(1)
}

if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(SUPABASE_URL)) {
  console.error('VITE_SUPABASE_URL debe ser la URL del proyecto (https://<ref>.supabase.co), sin /rest/v1.')
  process.exit(1)
}

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
}

const listResp = await fetch(`${SUPABASE_URL}/rest/v1/projects?select=id&limit=1`, { headers })
const raw = await listResp.text()

let rowCount = null
if (listResp.ok) {
  try {
    const parsed = JSON.parse(raw)
    rowCount = Array.isArray(parsed) ? parsed.length : null
  } catch {
    console.error('La respuesta de lectura anónima no es JSON. No se escribió nada en la base.')
    process.exit(1)
  }
}

console.log(`SELECT anónimo: HTTP ${listResp.status}, filas: ${rowCount ?? 'ninguna (error de acceso)'}`)

if (listResp.ok && rowCount > 0) {
  console.error('FALLO: la clave anónima leyó escenarios. Aplique supabase/migrations/002_projects_rls_auth.sql. Los datos no se imprimen.')
  process.exit(1)
}

if (!listResp.ok && listResp.status !== 401 && listResp.status !== 403) {
  console.error(`FALLO: respuesta inesperada HTTP ${listResp.status}. No se escribió nada en la base.`)
  process.exit(1)
}

console.log('OK — el acceso anónimo no devolvió escenarios y no se insertó ni eliminó nada.')
