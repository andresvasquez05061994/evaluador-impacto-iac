import { createClient } from '@supabase/supabase-js'

const env = typeof import.meta !== 'undefined' ? import.meta.env : {}
const url = env?.VITE_SUPABASE_URL
const anonKey = env?.VITE_SUPABASE_ANON_KEY

export const supabase = url && anonKey ? createClient(url, anonKey) : null

export function isSupabaseConfigured() {
  return !!supabase
}
