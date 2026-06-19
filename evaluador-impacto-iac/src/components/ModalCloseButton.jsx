import { useEffect } from 'react'

export function useModalEscape(onClose) {
  useEffect(() => {
    if (!onClose) return undefined
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])
}

export default function ModalCloseButton({ onClose, label = 'Cerrar' }) {
  return (
    <button
      type="button"
      className="modal-panel__close"
      onClick={onClose}
      aria-label={label}
      title={`${label} (Esc)`}
    >
      ×
    </button>
  )
}
