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

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiKey = getApiKey(env)

  return {
    plugins: [react(), mistralDevPlugin(apiKey)],
    server: {
      port: 5173,
      open: true,
    },
  }
})
