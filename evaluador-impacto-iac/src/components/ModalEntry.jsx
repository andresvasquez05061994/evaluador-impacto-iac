import IacLogo from './IacLogo'
import ModalCloseButton, { useModalEscape } from './ModalCloseButton'

export default function ModalEntry({ onEvaluateImpact, onDiscover, onClose }) {
  useModalEscape(onClose)

  return (
    <div className="modal-overlay">
      <div className="modal-panel modal-panel--entry">
        {onClose && <ModalCloseButton onClose={onClose} label="Ir al panel principal" />}
        <div style={{ marginBottom: 14 }}>
          <IacLogo />
        </div>

        <h2 className="modal-panel__title">¿Cómo desea comenzar?</h2>
        <p className="modal-panel__desc">
          Elija el camino según su madurez: evaluar el ROI de un proceso definido o descubrir qué automatizar primero.
        </p>

        <div className="entry-paths">
          <button type="button" className="entry-path" onClick={onEvaluateImpact}>
            <span className="entry-path__tag">Evaluación financiera</span>
            <span className="entry-path__title">Evaluar impacto del proyecto</span>
            <span className="entry-path__desc">
              Ya conoce el proceso a automatizar. Diagnóstico con IA, parámetros ROI y informe ejecutivo.
            </span>
          </button>

          <button type="button" className="entry-path entry-path--accent" onClick={onDiscover}>
            <span className="entry-path__tag">Descubrimiento</span>
            <span className="entry-path__title">Descubrir qué automatizar</span>
            <span className="entry-path__desc">
              Proceso manual sin ruta clara. Describa su operación y reciba sugerencias priorizadas por score de eficiencia.
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
