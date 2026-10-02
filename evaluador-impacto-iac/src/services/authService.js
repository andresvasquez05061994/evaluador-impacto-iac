import { supabase } from '../lib/supabase.js'

export function mapAuthError(error) {
  const msg = error?.message || 'No se pudo iniciar sesión.'
  if (/invalid login credentials/i.test(msg)) return 'Correo o contraseña incorrectos.'
  if (/email not confirmed/i.test(msg)) return 'Debe confirmar el correo antes de ingresar.'
  if (/invalid email/i.test(msg)) return 'El correo no es válido.'
  if (/failed to fetch|network|load failed|authretryablefetcherror/i.test(msg)) {
    return 'No se pudo contactar el servicio de acceso. Revise la conexión y VITE_SUPABASE_URL.'
  }
  return msg
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
  return data.session
}

export async function signOut() {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}
