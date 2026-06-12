import {
  DISCOVERY_SYSTEM_PROMPT,
  buildDiscoveryUserMessage,
} from '../constants/discoveryPrompts'
import { parseDiscoveryResponse } from '../utils/parseDiscoveryResponse'
import { buildFallbackDiscovery } from '../utils/discoveryFallback'

const MISTRAL_URL = '/api/mistral/v1/chat/completions'

function formatApiError(status, raw) {
  try {
    const data = JSON.parse(raw)
    const msg = data.error?.message || data.message || data.error || raw
    if (status === 401) {
      return 'API key inválida o ausente. Verifica MISTRAL_API_KEY en .env o Vercel.'
    }
    return typeof msg === 'string' ? msg : raw
  } catch {
    return raw || `Error HTTP ${status}`
  }
}

function extractMistralText(data) {
  if (data.choices?.[0]?.message?.content) return data.choices[0].message.content
  if (data.content) {
    const block = data.content.find((b) => b.type === 'text')
    if (block?.text) return block.text
  }
  return ''
}

export async function discoverAutomations(input) {
  const userContent = buildDiscoveryUserMessage(input)

  try {
    const resp = await fetch(MISTRAL_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        max_tokens: 2000,
        messages: [
          { role: 'system', content: DISCOVERY_SYSTEM_PROMPT },
          { role: 'user', content: userContent },
        ],
      }),
    })

    const raw = await resp.text()
    if (!resp.ok) throw new Error(formatApiError(resp.status, raw))

    const data = JSON.parse(raw)
    const text = extractMistralText(data)
    if (!text) throw new Error('Respuesta vacía del servicio de IA')

    return { ...parseDiscoveryResponse(text), source: 'ai' }
  } catch (err) {
    console.warn('Discovery IA no disponible, usando fallback:', err.message)
    return { ...buildFallbackDiscovery(input), source: 'fallback', fallbackReason: err.message }
  }
}
