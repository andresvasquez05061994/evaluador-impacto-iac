import { isSupabaseConfigured, supabase } from '../lib/supabase.js'
import {
  addProject as addProjectLocal,
  clearProjects as clearProjectsLocal,
  deleteProject as deleteProjectLocal,
  loadProjects as loadProjectsLocal,
} from '../utils/projectsStorage.js'

export function getStorageSource() {
  return isSupabaseConfigured() ? 'supabase' : 'local'
}

export function projectFromRow(row) {
  return {
    id: row.id,
    savedAt: row.saved_at,
    org: row.org,
    sector: row.sector,
    processType: row.process_type,
    narrative: row.narrative,
    params: row.params ?? {},
    metrics: row.metrics ?? {},
  }
}

export function projectToRow(project) {
  return {
    id: project.id,
    saved_at: project.savedAt,
    org: project.org ?? '',
    sector: project.sector ?? 'Sin clasificar',
    process_type: project.processType ?? 'Proceso manual',
    narrative: project.narrative ?? '',
    params: project.params ?? {},
    metrics: project.metrics ?? {},
  }
}

function filterByOrg(projects, org) {
  const q = org?.trim().toLowerCase()
  if (!q) return projects
  return projects.filter((p) => p.org.toLowerCase().includes(q))
}

function uniqueOrgs(projects) {
  return [...new Set(projects.map((p) => p.org).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, 'es'))
}

export async function fetchProjects({ org } = {}) {
  if (!isSupabaseConfigured()) {
    const projects = filterByOrg(loadProjectsLocal(), org)
    return { projects, organizations: uniqueOrgs(loadProjectsLocal()), source: 'local' }
  }

  let query = supabase
    .from('projects')
    .select('*')
    .order('saved_at', { ascending: false })

  if (org?.trim()) {
    query = query.ilike('org', `%${org.trim()}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  const projects = (data ?? []).map(projectFromRow)

  const { data: orgRows, error: orgError } = await supabase
    .from('projects')
    .select('org')
    .order('org')

  if (orgError) throw new Error(orgError.message)

  const organizations = uniqueOrgs((orgRows ?? []).map((r) => ({ org: r.org })))

  return { projects, organizations, source: 'supabase' }
}

export async function saveProject(project, { replaceId } = {}) {
  if (!isSupabaseConfigured()) {
    return addProjectLocal(project, { replaceId })
  }

  if (replaceId) {
    const { error: deleteError } = await supabase.from('projects').delete().eq('id', replaceId)
    if (deleteError) throw new Error(deleteError.message)
  }

  const { error } = await supabase.from('projects').upsert(projectToRow(project))
  if (error) throw new Error(error.message)

  const { projects } = await fetchProjects()
  return projects
}

export async function deleteProject(id) {
  if (!isSupabaseConfigured()) {
    return deleteProjectLocal(id)
  }

  const { error } = await supabase.from('projects').delete().eq('id', id)
  if (error) throw new Error(error.message)

  const { projects } = await fetchProjects()
  return projects
}

export async function clearProjects() {
  if (!isSupabaseConfigured()) {
    return clearProjectsLocal()
  }

  const { error } = await supabase.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  if (error) throw new Error(error.message)

  return []
}
