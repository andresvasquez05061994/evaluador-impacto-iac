import { SYSTEM_PROMPT } from '../constants/prompts'
import { parseAiResponse } from '../utils/parseAiResponse'

const ANTHROPIC_URL = '/api/anthropic/v1/messages'

function formatApiError(status, raw) {
  try {
    const data = JSON.parse(raw)
    const msg = data.error?.message || data.error || raw
    if (status === 401) {
      return 'API key inválida o ausente. Verifica ANTHROPIC_API_KEY en tu archivo .env (local) o en Vercel → Environment Variables.'
    }
    if (data.error?.type === 'configuration_error') {
      return msg
    }
    return typeof msg === 'string' ? msg : raw
  } catch {
    return raw || `Error HTTP ${status}`
  }
}

export async function analyzeProcess(description) {
  const resp = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: `Analiza este proceso:\n\n${description}` }],
    }),
  })

  const raw = await resp.text()

  if (!resp.ok) {
    throw new Error(formatApiError(resp.status, raw))
  }

  const data = JSON.parse(raw)
  const text = data.content?.find((b) => b.type === 'text')?.text || ''
  return parseAiResponse(text)
}
