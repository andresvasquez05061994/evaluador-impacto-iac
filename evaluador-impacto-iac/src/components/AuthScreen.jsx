import { useEffect, useState } from 'react'
import IacLogo from './IacLogo'
import { signIn, signInWithGoogle } from '../services/authService'

export default function AuthScreen({ notice = '' }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(notice)
  const [pending, setPending] = useState(false)
  const [googlePending, setGooglePending] = useState(false)

  useEffect(() => {
    if (notice) setError(notice)
  }, [notice])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setPending(true)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión.')
    } finally {
      setPending(false)
    }
  }

  async function handleGoogle() {
    setError('')
    setGooglePending(true)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión con Google.')
      setGooglePending(false)
    }
  }

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <IacLogo />
        <h1>Ingreso al evaluador</h1>
        <p>
          Los escenarios guardados son privados. Entre con Google o con el correo y la contraseña creados en Supabase. Solo las cuentas de la lista autorizada pueden continuar.
        </p>
        <button
          type="button"
          className="btn btn--secondary auth-google"
          onClick={handleGoogle}
          disabled={pending || googlePending}
        >
          {googlePending ? 'Redirigiendo a Google…' : 'Iniciar sesión con Google'}
        </button>
        <div className="auth-divider">o con correo</div>
        <label className="auth-field">
          Correo
          <input
            className="field-input"
            type="email"
            name="email"
            autoComplete="username"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className="auth-field">
          Contraseña
          <input
            className="field-input"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && (
          <div className="modal-error" role="alert">{error}</div>
        )}
        <button className="btn btn--primary auth-submit" type="submit" disabled={pending || googlePending}>
          {pending ? 'Ingresando…' : 'Ingresar'}
        </button>
        <p className="auth-note">
          El registro público está cerrado. Si no tiene usuario, solicítelo al administrador del proyecto.
        </p>
      </form>
    </div>
  )
}
