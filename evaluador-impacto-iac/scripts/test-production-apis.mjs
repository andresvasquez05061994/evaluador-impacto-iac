/**
 * Prueba APIs en producción (Vercel) y Supabase.
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
  if (js.includes('ydcivpohluwemcrvvoor.supabase.co')) {
    ok('Supabase embebido en build', 'proyecto ydcivpohluwemcrvvoor detectado')
  } else if (js.includes('sb_publishable_') || js.match(/createClient\("[^"]+\.supabase\.co"/)) {
    ok('Supabase embebido en build', 'URL/credenciales detectadas')
  } else if (js.includes('createClient') && js.includes('supabase')) {
    fail('Supabase embebido en build', 'librería incluida pero VITE_SUPABASE_* no están en el build — redeploy tras agregar variables')
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
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  }

  const listResp = await fetch(`${SUPABASE_URL}/rest/v1/projects?select=id,org&limit=1`, { headers })
  if (listResp.status === 404) {
    fail('Supabase tabla projects', '404 — ejecuta supabase/migrations/001_projects.sql')
    return
  }
  if (!listResp.ok) {
    const err = await listResp.text()
    fail('Supabase lectura', `HTTP ${listResp.status}: ${err.slice(0, 120)}`)
    return
  }
  ok('Supabase lectura', 'SELECT en projects OK')

  const testId = crypto.randomUUID()
  const now = new Date().toISOString()
  const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/projects`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      id: testId,
      saved_at: now,
      org: 'Prueba API IAC',
      sector: 'Test',
      process_type: 'Smoke test',
      narrative: 'Registro de prueba automatizada',
      params: { prov: 10 },
      metrics: { roi: 0 },
    }),
  })
  if (!insertResp.ok) {
    const err = await insertResp.text()
    fail('Supabase escritura', `HTTP ${insertResp.status}: ${err.slice(0, 160)}`)
    return
  }
  ok('Supabase escritura', 'INSERT OK')

  const filterResp = await fetch(
    `${SUPABASE_URL}/rest/v1/projects?org=ilike.*Prueba%20API%20IAC*&select=id,org`,
    { headers },
  )
  if (!filterResp.ok) {
    fail('Supabase filtro por empresa', `HTTP ${filterResp.status}`)
    return
  }
  const filtered = await filterResp.json()
  if (!Array.isArray(filtered) || !filtered.some((r) => r.id === testId)) {
    fail('Supabase filtro por empresa', 'no encontró el registro de prueba')
  } else {
    ok('Supabase filtro por empresa', `${filtered.length} registro(s)`)
  }

  const delResp = await fetch(`${SUPABASE_URL}/rest/v1/projects?id=eq.${testId}`, {
    method: 'DELETE',
    headers,
  })
  if (delResp.ok || delResp.status === 204) {
    ok('Supabase eliminación', 'DELETE OK')
  } else {
    fail('Supabase eliminación', `HTTP ${delResp.status}`)
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
