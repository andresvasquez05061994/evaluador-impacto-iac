import { useState } from 'react'
import IacLogo from './IacLogo'
import { signIn } from '../services/authService'

export default function AuthScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

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

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={handleSubmit}>
        <IacLogo />
        <h1>Ingreso al evaluador</h1>
        <p>
          Los escenarios guardados son privados. Inicie sesión con el usuario creado en Supabase.
        </p>
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
        <button className="btn btn--primary auth-submit" type="submit" disabled={pending}>
          {pending ? 'Ingresando…' : 'Ingresar'}
        </button>
        <p className="auth-note">
          El registro público está cerrado. Si no tiene usuario, solicítelo al administrador del proyecto.
        </p>
      </form>
    </div>
  )
}
