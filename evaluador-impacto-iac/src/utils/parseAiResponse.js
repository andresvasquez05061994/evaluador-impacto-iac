export function parseAiResponse(raw) {
  const cleaned = raw.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(cleaned)

  if (!parsed.suggestedParams || !Array.isArray(parsed.errors)) {
    throw new Error('La respuesta de la IA no tiene la estructura esperada')
  }

  return parsed
}
