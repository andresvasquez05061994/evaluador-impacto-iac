/**
 * Prueba APIs en producción (Vercel) y que Supabase niegue lectura anónima.
 * No inserta, actualiza ni borra filas.
 *
 * Uso:
 *   VERCEL_URL=https://tu-app.vercel.app node scripts/test-production-apis.mjs
 *
 * Opcional (si no están en el entorno):
 *   VITE_SUPABASE_URL=... VITE_SUPABASE_ANON_KEY=... MISTRAL_API_KEY=...
 */

const BASE = (process.env.VERCEL_URL || process.argv[2] || '').replace(/\/$/, '')
const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || ''

const results = []
let failed = 0

function ok(name, detail = '') {
  results.push({ ok: true, name, detail })
  console.log(`  ✓ ${name}${detail ? ` — ${detail}` : ''}`)
}

function fail(name, detail = '') {
  failed += 1
  results.push({ ok: false, name, detail })
  console.error(`  ✗ ${name}${detail ? ` — ${detail}` : ''}`)
}

async function testSpa() {
  if (!BASE) {
    fail('SPA carga', 'VERCEL_URL no definida')
    return
  }
  const resp = await fetch(`${BASE}/`)
  if (!resp.ok) {
    fail('SPA carga', `HTTP ${resp.status}`)
    return
  }
  const html = await resp.text()
  if (!html.includes('Evaluador') && !html.includes('root')) {
    fail('SPA carga', 'HTML inesperado')
    return
  }
  ok('SPA carga', BASE)

  const jsMatch = html.match(/src="(\/assets\/index-[^"]+\.js)"/)
  if (!jsMatch) {
    fail('Bundle JS', 'no encontrado en index.html')
    return
  }
  const jsResp = await fetch(`${BASE}${jsMatch[1]}`)
  const js = await jsResp.text()
  if (js.includes('service_role') || js.includes('InJvbGUiOiJzZXJ2aWNlX3JvbGUi')) {
    fail('Bundle sin service role', 'el JavaScript público incluye la service role')
  } else {
    ok('Bundle sin service role')
  }

  if (/sk-ant-[A-Za-z0-9]/.test(js)) {
    fail('Bundle sin clave de IA', 'hay una clave de Anthropic en el JavaScript público')
  } else {
    ok('Bundle sin clave de IA')
  }

  if (js.includes('.supabase.co')) {
    ok('Supabase embebido en build', 'URL del proyecto presente')
  } else if (js.includes('createClient') && js.includes('supabase')) {
    fail('Supabase embebido en build', 'librería incluida pero VITE_SUPABASE_URL no está en el build — redeploy tras agregar variables')
  } else {
    fail('Supabase embebido en build', 'no detectado')
  }
}

async function testMistralProxy() {
  if (!BASE) {
    fail('Mistral proxy', 'VERCEL_URL no definida')
    return
  }
  const resp = await fetch(`${BASE}/api/mistral/v1/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'mistral-small-latest',
      max_tokens: 16,
      messages: [{ role: 'user', content: 'Responde solo: OK' }],
    }),
  })
  const raw = await resp.text()
  if (resp.status === 405) {
    fail('Mistral proxy', 'método no permitido — revisa vercel.json')
    return
  }
  if (resp.status === 500 && raw.includes('configuration_error')) {
    fail('Mistral proxy', 'MISTRAL_API_KEY no configurada en Vercel')
    return
  }
  if (resp.status === 401) {
    fail('Mistral proxy', 'API key inválida')
    return
  }
  if (!resp.ok) {
    fail('Mistral proxy', `HTTP ${resp.status}: ${raw.slice(0, 120)}`)
    return
  }
  try {
    const data = JSON.parse(raw)
    const text = data.choices?.[0]?.message?.content || ''
    ok('Mistral proxy', `respuesta recibida (${text.slice(0, 40) || 'ok'})`)
  } catch {
    fail('Mistral proxy', 'respuesta no JSON')
  }
}

async function testMistralMethodGuard() {
  if (!BASE) return
  const resp = await fetch(`${BASE}/api/mistral/v1/chat/completions`, { method: 'GET' })
  if (resp.status === 405) ok('Mistral solo POST', '405 en GET')
  else fail('Mistral solo POST', `esperaba 405, recibió ${resp.status}`)
}

async function testSupabaseRest() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    fail('Supabase REST', 'VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY no definidas en entorno local')
    return
  }

  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  }

  const listResp = await fetch(`${SUPABASE_URL}/rest/v1/projects?select=id&limit=1`, { headers })
  const raw = await listResp.text()
  if (listResp.status === 404) {
    fail('Supabase tabla projects', '404 — ejecuta las migraciones 001 y 002')
    return
  }

  let rowCount = null
  if (listResp.ok) {
    try {
      const parsed = JSON.parse(raw)
      rowCount = Array.isArray(parsed) ? parsed.length : null
    } catch {
      fail('Supabase anon bloqueado', 'respuesta no JSON')
      return
    }
  }

  if (listResp.ok && rowCount > 0) {
    fail('Supabase anon bloqueado', 'la clave anónima leyó filas; aplique 002_projects_rls_auth.sql')
    return
  }

  if (listResp.ok || listResp.status === 401 || listResp.status === 403) {
    ok('Supabase anon bloqueado', `HTTP ${listResp.status}, sin filas. No se escribió en la base.`)
  } else {
    fail('Supabase anon bloqueado', `HTTP ${listResp.status}`)
  }
}

console.log('\nPruebas de APIs en producción\n')

console.log('1. Frontend (Vercel)')
await testSpa()

console.log('\n2. Mistral (serverless Vercel)')
await testMistralMethodGuard()
await testMistralProxy()

console.log('\n3. Supabase (REST directo)')
await testSupabaseRest()

console.log('\n' + '─'.repeat(50))
if (failed) {
  console.error(`FALLÓ: ${failed} prueba(s)`)
  process.exit(1)
}
console.log(`TODO OK — ${results.length} pruebas pasaron`)
