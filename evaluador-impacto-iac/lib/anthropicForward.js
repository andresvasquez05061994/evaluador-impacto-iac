const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

export const CONFIG_ERROR_MESSAGE =
  'ANTHROPIC_API_KEY no configurada. Copia .env.example a .env, agrega tu API key (sk-ant-...) y reinicia el servidor.'

export function getApiKey(env = process.env) {
  return env.ANTHROPIC_API_KEY || env.VITE_ANTHROPIC_API_KEY || ''
}

export async function forwardToAnthropic(body, apiKey) {
  if (!apiKey) {
    const err = new Error(CONFIG_ERROR_MESSAGE)
    err.status = 500
    err.type = 'configuration_error'
    throw err
  }

  const upstream = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  })

  const text = await upstream.text()
  return { status: upstream.status, body: text }
}
