const KEY = 'iac_projects'

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function loadProjects() {
  return read()
}

export function saveProjects(arr) {
  localStorage.setItem(KEY, JSON.stringify(arr))
}

export function addProject(project, { replaceId } = {}) {
  const arr = read()
  const next = replaceId ? arr.filter((p) => p.id !== replaceId) : arr
  next.push(project)
  saveProjects(next)
  return next
}

export function deleteProject(id) {
  const next = read().filter((p) => p.id !== id)
  saveProjects(next)
  return next
}

export function clearProjects() {
  saveProjects([])
  return []
}
