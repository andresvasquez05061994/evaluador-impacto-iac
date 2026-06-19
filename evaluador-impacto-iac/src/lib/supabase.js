import { createClient } from '@supabase/supabase-js'

/** Quita /rest/v1, barras finales y comillas accidentales de Vercel. */
export function normalizeSupabaseUrl(raw) {
  if (!raw) return ''
  let url = String(raw).trim().replace(/^['"]|['"]$/g, '')
  url = url.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '')
  return url
}

export function normalizeSupabaseKey(raw) {
  if (!raw) return ''
  return String(raw).trim().replace(/^['"]|['"]$/g, '')
}

const env = typeof import.meta !== 'undefined' ? import.meta.env : {}
const url = normalizeSupabaseUrl(env?.VITE_SUPABASE_URL)
const anonKey = normalizeSupabaseKey(env?.VITE_SUPABASE_ANON_KEY)

export const supabase = url && anonKey ? createClient(url, anonKey) : null

export function isSupabaseConfigured() {
  return !!supabase
}

export function getSupabaseUrl() {
  return url
}
