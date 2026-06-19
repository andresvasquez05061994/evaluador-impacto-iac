const BASE = 'https://evaluador-impacto-iac-e85c.vercel.app'

const html = await fetch(`${BASE}/`).then((r) => r.text())
const jsPath = html.match(/src="(\/assets\/index-[^"]+\.js)"/)?.[1]
if (!jsPath) throw new Error('No JS bundle found')

const js = await fetch(`${BASE}${jsPath}`).then((r) => r.text())
const terms = ['supabase', 'ydcivpohluwemcrvvoor', 'sb_publishable', 'createClient']
for (const t of terms) console.log(t, js.includes(t))

const supabaseUrl = js.match(/https:\/\/[a-z0-9-]+\.supabase\.co/)?.[0]
const supabaseKey =
  js.match(/sb_publishable_[A-Za-z0-9_-]+/)?.[0]
  || js.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/)?.[0]

console.log('Bundle:', jsPath)
console.log('Supabase URL:', supabaseUrl || 'NOT FOUND')
console.log('Supabase key:', supabaseKey ? `${supabaseKey.slice(0, 20)}...` : 'NOT FOUND')

if (!supabaseUrl || !supabaseKey) {
  process.exit(1)
}

const headers = {
  apikey: supabaseKey,
  Authorization: `Bearer ${supabaseKey}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

const list = await fetch(`${supabaseUrl}/rest/v1/projects?select=id,org&limit=1`, { headers })
console.log('SELECT status:', list.status, await list.text())

const testId = crypto.randomUUID()
const insert = await fetch(`${supabaseUrl}/rest/v1/projects`, {
  method: 'POST',
  headers,
  body: JSON.stringify({
    id: testId,
    saved_at: new Date().toISOString(),
    org: 'Prueba API IAC',
    sector: 'Test',
    process_type: 'Smoke test',
    narrative: 'Registro de prueba',
    params: {},
    metrics: { roi: 0 },
  }),
})
console.log('INSERT status:', insert.status, (await insert.text()).slice(0, 200))

const filter = await fetch(
  `${supabaseUrl}/rest/v1/projects?org=ilike.*Prueba%20API%20IAC*&select=id,org`,
  { headers },
)
console.log('FILTER status:', filter.status, await filter.text())

const del = await fetch(`${supabaseUrl}/rest/v1/projects?id=eq.${testId}`, { method: 'DELETE', headers })
console.log('DELETE status:', del.status)
