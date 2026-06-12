import { forwardToAnthropic, getApiKey, CONFIG_ERROR_MESSAGE } from '../../../lib/anthropicForward.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const apiKey = getApiKey()

  try {
    const { status, body } = await forwardToAnthropic(req.body, apiKey)
    res.status(status)
    res.setHeader('Content-Type', 'application/json')
    return res.send(body)
  } catch (err) {
    if (err.type === 'configuration_error') {
      return res.status(500).json({
        type: 'error',
        error: { type: 'configuration_error', message: CONFIG_ERROR_MESSAGE },
      })
    }
    return res.status(502).json({ error: 'Error al contactar Anthropic: ' + err.message })
  }
}
