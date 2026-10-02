/** Separa correos o dominios por coma, punto y coma o espacio. */
export function parseAllowlist(raw) {
  return String(raw || '')
    .split(/[,;\s]+/)
    .map((part) => part.trim().toLowerCase().replace(/^@/, ''))
    .filter(Boolean)
}

/**
 * Lista vacía = nadie entra. El correo debe coincidir entero o el dominio
 * debe estar autorizado. No usa datos que el usuario pueda editar en el JWT.
 */
export function isEmailAllowed(email, { emails = '', domains = '' } = {}) {
  const normalized = String(email || '').trim().toLowerCase()
  const at = normalized.lastIndexOf('@')
  if (at <= 0 || at === normalized.length - 1) return false

  const emailList = parseAllowlist(emails)
  const domainList = parseAllowlist(domains)
  if (emailList.length === 0 && domainList.length === 0) return false
  if (emailList.includes(normalized)) return true
  return domainList.includes(normalized.slice(at + 1))
}

function runtimeEnv() {
  if (typeof import.meta === 'undefined' || !import.meta.env) return {}
  return import.meta.env
}

export function allowlistFromEnv(env = runtimeEnv()) {
  return {
    emails: env.ALLOWED_EMAILS || env.VITE_ALLOWED_EMAILS || '',
    domains: env.ALLOWED_EMAIL_DOMAINS || env.VITE_ALLOWED_EMAIL_DOMAINS || '',
  }
}

export function isCurrentUserAllowed(email, env = runtimeEnv()) {
  return isEmailAllowed(email, allowlistFromEnv(env))
}

export const ALLOWLIST_DENIED_MESSAGE = 'Esta cuenta no está autorizada para entrar.'
export const ALLOWLIST_MISSING_MESSAGE = 'La lista de acceso no está configurada. Defina ALLOWED_EMAILS o ALLOWED_EMAIL_DOMAINS.'
