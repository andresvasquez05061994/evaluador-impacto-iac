const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions'

export const CONFIG_ERROR_MESSAGE =
  'MISTRAL_API_KEY no configurada. En local: copia .env.example a .env. En Vercel: Project → Settings → Environment Variables.'

export function getApiKey(env = process.env) {
  return env.MISTRAL_API_KEY || env.VITE_MISTRAL_API_KEY || ''
}

export function toMistralBody(body) {
  const messages = []
  if (body.system) {
    messages.push({ role: 'system', content: body.system })
  }
  if (Array.isArray(body.messages)) {
    for (const msg of body.messages) {
      messages.push({ role: msg.role, content: msg.content })
    }
  }
  return {
    model: body.model || 'mistral-small-latest',
    messages,
    max_tokens: body.max_tokens ?? 1500,
    response_format: { type: 'json_object' },
  }
}

export function fromMistralResponse(text) {
  const data = JSON.parse(text)
  const content = data.choices?.[0]?.message?.content || ''
  return JSON.stringify({
    content: [{ type: 'text', text: content }],
  })
}

export async function forwardToMistral(body, apiKey) {
  if (!apiKey) {
    const err = new Error(CONFIG_ERROR_MESSAGE)
    err.status = 500
    err.type = 'configuration_error'
    throw err
  }

  const upstream = await fetch(MISTRAL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(toMistralBody(body)),
  })

  const text = await upstream.text()
  if (!upstream.ok) {
    return { status: upstream.status, body: text }
  }

  return { status: upstream.status, body: fromMistralResponse(text) }
}
