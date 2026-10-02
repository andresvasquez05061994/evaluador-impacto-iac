import { supabase } from '../lib/supabase.js'
import { ALLOWLIST_DENIED_MESSAGE, isCurrentUserAllowed } from '../lib/allowlist.js'

export function mapAuthError(error) {
  const msg = error?.message || 'No se pudo iniciar sesión.'
  if (/invalid login credentials/i.test(msg)) return 'Correo o contraseña incorrectos.'
  if (/email not confirmed/i.test(msg)) return 'Debe confirmar el correo antes de ingresar.'
  if (/invalid email/i.test(msg)) return 'El correo no es válido.'
  if (/failed to fetch|network|load failed|authretryablefetcherror/i.test(msg)) {
    return 'No se pudo contactar el servicio de acceso. Revise la conexión y VITE_SUPABASE_URL.'
  }
  if (/provider is not enabled|unsupported provider/i.test(msg)) {
    return 'El ingreso con Google no está habilitado en Supabase.'
  }
  if (/access_denied|user cancelled|user canceled/i.test(msg)) {
    return 'Se canceló el ingreso con Google.'
  }
  return msg
}

export function authRedirectUrl() {
  if (typeof window === 'undefined') return undefined
  return `${window.location.origin}/`
}

/** El inicializador de React corre dos veces en desarrollo; la segunda lectura ya no ve la query. */
let oauthCallbackError

/** Quita el error de OAuth de la barra de direcciones y devuelve un aviso. */
export function consumeOAuthCallbackError() {
  if (oauthCallbackError !== undefined) return oauthCallbackError
  if (typeof window === 'undefined') {
    oauthCallbackError = ''
    return oauthCallbackError
  }
  const params = new URLSearchParams(window.location.search)
  const code = params.get('error') || ''
  const description = params.get('error_description') || ''
  if (!code && !description) {
    oauthCallbackError = ''
    return oauthCallbackError
  }

  const url = new URL(window.location.href)
  url.searchParams.delete('error')
  url.searchParams.delete('error_code')
  url.searchParams.delete('error_description')
  const next = `${url.pathname}${url.search}${url.hash}`
  window.history.replaceState(window.history.state, '', next)
  oauthCallbackError = mapAuthError({ message: description || code })
  return oauthCallbackError
}

export async function signIn(email, password) {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const trimmed = String(email || '').trim()
  if (!trimmed || !password) throw new Error('Ingrese correo y contraseña.')

  const { data, error } = await supabase.auth.signInWithPassword({
    email: trimmed,
    password,
  })
  if (error) throw new Error(mapAuthError(error))
  if (!isCurrentUserAllowed(data.user?.email || data.session?.user?.email)) {
    await supabase.auth.signOut()
    throw new Error(ALLOWLIST_DENIED_MESSAGE)
  }
  return data.session
}

export async function signInWithGoogle() {
  if (!supabase) throw new Error('Supabase no está configurado.')
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: authRedirectUrl(),
      queryParams: { prompt: 'select_account' },
    },
  })
  if (error) throw new Error(mapAuthError(error))
}

export async function signOut() {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}
