import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { forwardToMistral, getApiKey, CONFIG_ERROR_MESSAGE } from './lib/mistralForward.js'

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString() || '{}'))
      } catch {
        reject(new Error('JSON inválido'))
      }
    })
    req.on('error', reject)
  })
}

function mistralDevPlugin(apiKey) {
  return {
    name: 'mistral-dev-api',
    configureServer(server) {
      if (apiKey) {
        console.log('\n  ✓ MISTRAL_API_KEY cargada — diagnóstico IA disponible\n')
      } else {
        console.warn('\n  ⚠️  MISTRAL_API_KEY no encontrada.')
        console.warn('     Copia .env.example → .env, agrega tu key y reinicia npm run dev\n')
      }

      server.middlewares.use(async (req, res, next) => {
        if (req.url !== '/api/mistral/v1/chat/completions' || req.method !== 'POST') {
          return next()
        }

        try {
          const body = await readBody(req)
          const { status, body: responseBody } = await forwardToMistral(body, apiKey)
          res.statusCode = status
          res.setHeader('Content-Type', 'application/json')
          res.end(responseBody)
        } catch (err) {
          const message = err.type === 'configuration_error' ? CONFIG_ERROR_MESSAGE : err.message
          res.statusCode = err.status || 502
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify({
            type: 'error',
            error: { type: err.type || 'server_error', message },
          }))
        }
      })
    },
  }
}

const CLIENT_SECRET_VARS = [
  'VITE_MISTRAL_API_KEY',
  'VITE_ANTHROPIC_API_KEY',
  'VITE_SUPABASE_SERVICE_ROLE_KEY',
  'VITE_SUPABASE_SERVICE_ROLE',
]

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = getApiKey(env)

  for (const name of CLIENT_SECRET_VARS) {
    if (env[name]) {
      console.warn(`\n  ⚠️  ${name} está definida. Vite la copia al bundle del navegador.`)
      console.warn('     Quítela. Las claves de IA y la service role solo viven en el servidor, sin prefijo VITE_.\n')
    }
  }

  if (env.VITE_SUPABASE_URL && !env.ALLOWED_EMAILS && !env.ALLOWED_EMAIL_DOMAINS) {
    console.warn('\n  ⚠️  ALLOWED_EMAILS y ALLOWED_EMAIL_DOMAINS están vacías.')
    console.warn('     Con Supabase configurado nadie puede entrar hasta definir una de las dos.\n')
  }

  return {
    envPrefix: ['VITE_', 'ALLOWED_'],
    plugins: [react(), mistralDevPlugin(apiKey)],
    server: {
      port: 5173,
      open: true,
    },
  }
})
