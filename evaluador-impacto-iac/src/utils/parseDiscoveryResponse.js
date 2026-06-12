export function parseDiscoveryResponse(raw) {
  const cleaned = raw.replace(/```json|```/g, '').trim()
  const parsed = JSON.parse(cleaned)

  if (!Array.isArray(parsed.suggestions) || parsed.suggestions.length === 0) {
    throw new Error('La respuesta no incluye sugerencias de automatización')
  }

  const suggestions = parsed.suggestions
    .map((s, i) => ({
      id: s.id || `sug-${i + 1}`,
      title: String(s.title || 'Automatización sugerida'),
      category: s.category || 'Captura de datos',
      efficiencyScore: Math.min(100, Math.max(0, Math.round(Number(s.efficiencyScore) || 50))),
      priorityRank: Number(s.priorityRank) || i + 1,
      rationale: s.rationale || '',
      industryUseCase: s.industryUseCase || '',
      expectedImpact: s.expectedImpact || '',
      complexity: s.complexity || 'medio',
      integrations: Array.isArray(s.integrations) ? s.integrations : [],
      quickWin: Boolean(s.quickWin),
    }))
    .sort((a, b) => a.priorityRank - b.priorityRank)

  return {
    sector: parsed.sector || 'Sin clasificar',
    processSummary: parsed.processSummary || '',
    maturityLevel: parsed.maturityLevel || 'inicial',
    recommendedFirstStep: parsed.recommendedFirstStep || '',
    suggestions,
  }
}
