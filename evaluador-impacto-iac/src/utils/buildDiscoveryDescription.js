export function buildDiscoveryDescription(input, suggestion = null) {
  const lines = [
    `Organización: ${input.org}`,
    `Industria: ${input.sector}`,
    '',
    'PROCESO MANUAL ACTUAL:',
    input.processDesc,
    '',
    'HERRAMIENTAS ACTUALES:',
    [...input.tools, input.toolsOther].filter(Boolean).join(', ') || 'No especificadas',
    '',
    'SISTEMAS:',
    [...input.systems, input.systemsOther].filter(Boolean).join(', ') || 'No especificados',
  ]

  if (suggestion) {
    lines.push(
      '',
      'AUTOMATIZACIÓN PRIORITARIA A EVALUAR:',
      suggestion.title,
      '',
      'Justificación:',
      suggestion.rationale,
      '',
      'Impacto esperado:',
      suggestion.expectedImpact,
    )
  }

  return lines.join('\n')
}
