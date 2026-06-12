import { C } from '../../constants/colors'
import { FONT } from '../../constants/typography'
import { panelPre } from '../../styles/layout'

function scoreColor(score) {
  if (score >= 85) return C.positive
  if (score >= 65) return C.accent
  if (score >= 45) return C.amber
  return C.gray
}

function complexityLabel(c) {
  const map = { bajo: 'Baja', medio: 'Media', alto: 'Alta' }
  return map[c] || c
}

export default function DiscoveryResults({ input, result, onRestart, onEvaluateSuggestion, onEvaluateAll }) {
  const { suggestions, processSummary, recommendedFirstStep, maturityLevel, source, fallbackReason } = result

  return (
    <div className="discovery-results">
      <header className="discovery-results__header">
        <div>
          <div style={panelPre}>Resultado del descubrimiento</div>
          <h2 style={{ fontFamily: FONT, fontSize: 19, fontWeight: 600, letterSpacing: '-.02em', marginBottom: 6 }}>
            {input.org}
          </h2>
          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>
            {input.sector} · Madurez {maturityLevel}
            {source === 'fallback' && (
              <span style={{ color: C.amber }}> · Análisis heurístico{fallbackReason ? '' : ''}</span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn btn--ghost" onClick={onRestart}>
            Nuevo descubrimiento
          </button>
          <button type="button" className="btn btn--primary" onClick={onEvaluateAll}>
            Evaluar impacto completo
          </button>
        </div>
      </header>

      {processSummary && (
        <div className="discovery-summary">
          <p>{processSummary}</p>
          {recommendedFirstStep && (
            <div className="discovery-summary__cta">
              <strong>Primer paso recomendado:</strong> {recommendedFirstStep}
            </div>
          )}
        </div>
      )}

      <div style={{ ...panelPre, marginBottom: 10 }}>
        Automatizaciones sugeridas — ordenadas por score de eficiencia
      </div>

      <div className="discovery-cards">
        {suggestions.map((s, i) => (
          <article key={s.id} className="discovery-card">
            <div className="discovery-card__rank">#{s.priorityRank || i + 1}</div>
            <div className="discovery-card__body">
              <div className="discovery-card__head">
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="discovery-card__meta">
                    {s.category}
                    {s.quickWin && <span className="discovery-badge">Quick win</span>}
                    <span className="discovery-badge discovery-badge--muted">
                      Complejidad {complexityLabel(s.complexity)}
                    </span>
                  </div>
                  <h3 className="discovery-card__title">{s.title}</h3>
                </div>
                <div className="discovery-score" style={{ '--score-color': scoreColor(s.efficiencyScore) }}>
                  <div className="discovery-score__val" style={{ color: scoreColor(s.efficiencyScore) }}>
                    {s.efficiencyScore}
                  </div>
                  <div className="discovery-score__label">Eficiencia</div>
                </div>
              </div>

              <div className="discovery-score-bar">
                <div
                  className="discovery-score-bar__fill"
                  style={{ width: `${s.efficiencyScore}%`, background: scoreColor(s.efficiencyScore) }}
                />
              </div>

              <p className="discovery-card__text">{s.rationale}</p>

              {s.industryUseCase && (
                <div className="discovery-card__block">
                  <div className="discovery-card__block-label">Caso de uso en su industria</div>
                  <p>{s.industryUseCase}</p>
                </div>
              )}

              {s.expectedImpact && (
                <div className="discovery-card__block">
                  <div className="discovery-card__block-label">Impacto esperado</div>
                  <p>{s.expectedImpact}</p>
                </div>
              )}

              {s.integrations?.length > 0 && (
                <div className="discovery-card__tags">
                  {s.integrations.map((int) => (
                    <span key={int} className="discovery-tag">{int}</span>
                  ))}
                </div>
              )}

              <div className="discovery-card__foot">
                <button
                  type="button"
                  className="btn btn--text"
                  onClick={() => onEvaluateSuggestion(s)}
                >
                  Evaluar impacto de esta automatización
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
