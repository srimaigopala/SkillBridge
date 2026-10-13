export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080'

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.status = status
    this.data = data
  }
}

// Authenticated request to the SkillBridge backend.
// Pass `body` for JSON or `form` (FormData) for uploads. Errors carry the backend's `message`.
export async function api(path, { method = 'GET', body, form, signal } = {}) {
  const token = localStorage.getItem('skillbridgeToken')
  const headers = {}
  let payload

  if (token) headers.Authorization = `Bearer ${token}`

  if (form) {
    payload = form
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    payload = JSON.stringify(body)
  }

  let response
  try {
    response = await fetch(`${API_BASE}${path}`, { method, headers, body: payload, signal })
  } catch (err) {
    if (err.name === 'AbortError') throw err
    throw new ApiError('Cannot connect to the backend. Check that Spring Boot is running.', 0)
  }

  const text = await response.text()
  let data = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!response.ok) {
    const message =
      (data && typeof data === 'object' && (data.message || data.error)) ||
      (typeof data === 'string' && data) ||
      `Request failed with status ${response.status}.`
    throw new ApiError(message, response.status, data)
  }

  return data
}

// Opens an authenticated file (e.g. a résumé PDF) in a new tab.
// The tab is opened synchronously so popup blockers allow it.
export async function openProtectedFile(path) {
  const tab = window.open('', '_blank')
  try {
    const token = localStorage.getItem('skillbridgeToken')
    const response = await fetch(`${API_BASE}${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new ApiError(data.message || 'Could not open the file.', response.status)
    }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    if (tab) {
      tab.location.href = url
    } else {
      window.location.href = url
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (err) {
    tab?.close()
    throw err
  }
}
