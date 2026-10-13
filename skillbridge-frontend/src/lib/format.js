export const APPLICATION_STATUS = {
  APPLIED: { label: 'Applied', className: 'bg-blue-50 text-blue-700' },
  UNDER_REVIEW: { label: 'Under review', className: 'bg-amber-50 text-amber-700' },
  SHORTLISTED: { label: 'Shortlisted', className: 'bg-violet-50 text-violet-700' },
  SELECTED: { label: 'Accepted', className: 'bg-emerald-50 text-emerald-700' },
  REJECTED: { label: 'Rejected', className: 'bg-red-50 text-red-700' },
  WITHDRAWN: { label: 'Withdrawn', className: 'bg-slate-100 text-slate-500' },
}

export const WITHDRAWABLE_STATUSES = ['APPLIED', 'UNDER_REVIEW', 'SHORTLISTED']

export function timeAgo(value) {
  if (!value) return ''
  const date = new Date(value)
  const seconds = Math.round((Date.now() - date.getTime()) / 1000)
  if (Number.isNaN(seconds)) return ''
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDate(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatSalary(value) {
  if (value === null || value === undefined || value === '') return null
  return `₹${Number(value).toLocaleString('en-IN')}`
}

// Only allow http(s) links from user-entered profile fields (blocks javascript: URLs)
export function safeUrl(value) {
  if (!value) return null
  const trimmed = String(value).trim()
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`
  try {
    const url = new URL(withScheme)
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null
  } catch {
    return null
  }
}
