import { useCallback, useEffect, useRef, useState } from 'react'

export function useSpeechRecognition({ onTranscript }) {
  const [listening, setListening] = useState(false)
  const [supported, setSupported] = useState(false)
  const [speechError, setSpeechError] = useState('')
  const recognitionRef = useRef(null)

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    setSupported(!!SpeechRecognition)
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'es-CO'

    recognition.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        onTranscript(event.results[i][0].transcript, event.results[i].isFinal)
      }
    }

    recognition.onerror = (event) => {
      const messages = {
        'not-allowed': 'Permiso de micrófono denegado. Habilítelo en el navegador.',
        'no-speech': 'No se detectó voz. Intente de nuevo.',
        aborted: 'Captura de voz cancelada.',
        'audio-capture': 'No se encontró micrófono disponible.',
        network: 'Error de red al usar reconocimiento de voz.',
      }
      setSpeechError(messages[event.error] || `Error de voz: ${event.error}`)
      setListening(false)
    }

    recognition.onend = () => setListening(false)

    recognitionRef.current = recognition

    return () => {
      recognition.stop()
    }
  }, [onTranscript])

  const start = useCallback(() => {
    setSpeechError('')
    if (!recognitionRef.current) {
      setSpeechError('Su navegador no soporta reconocimiento de voz. Use Chrome o Edge.')
      return
    }
    try {
      recognitionRef.current.start()
      setListening(true)
    } catch {
      setSpeechError('No se pudo iniciar el micrófono.')
    }
  }, [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
    setListening(false)
  }, [])

  const toggle = useCallback(() => {
    if (listening) stop()
    else start()
  }, [listening, start, stop])

  return { listening, supported, speechError, toggle, stop, start }
}
