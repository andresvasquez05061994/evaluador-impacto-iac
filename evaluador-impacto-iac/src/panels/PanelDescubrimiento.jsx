import DiscoveryWizard from '../components/discovery/DiscoveryWizard'
import DiscoveryResults from '../components/discovery/DiscoveryResults'
import { pageTitle, pageSubtitle } from '../styles/layout'

export default function PanelDescubrimiento({
  orgName,
  discoverySession,
  onComplete,
  onRestart,
  onEvaluateSuggestion,
  onEvaluateAll,
}) {
  const hasResults = discoverySession?.result && discoverySession?.input

  return (
    <div className="discovery-panel">
      <header style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 5 }}>
          Descubrimiento de automatización
        </div>
        <h1 style={pageTitle}>¿Por dónde empezar a automatizar?</h1>
        <p style={pageSubtitle}>
          Para equipos con procesos manuales que aún no tienen claro qué digitalizar primero.
          Describa su operación y reciba sugerencias priorizadas con score de eficiencia según su industria.
        </p>
      </header>

      {hasResults ? (
        <DiscoveryResults
          input={discoverySession.input}
          result={discoverySession.result}
          onRestart={onRestart}
          onEvaluateSuggestion={onEvaluateSuggestion}
          onEvaluateAll={onEvaluateAll}
        />
      ) : (
        <div className="discovery-wizard-wrap">
          <DiscoveryWizard initialOrg={orgName} onComplete={onComplete} />
        </div>
      )}
    </div>
  )
}
