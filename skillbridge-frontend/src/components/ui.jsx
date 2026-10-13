import { AlertCircle, CheckCircle2, LoaderCircle, X } from 'lucide-react'
import { useEffect } from 'react'
import { APPLICATION_STATUS } from '../lib/format.js'

export function Spinner({ label = 'Loading...', className = 'py-16' }) {
  return (
    <div className={`flex items-center justify-center gap-3 text-sm text-slate-500 ${className}`}>
      <LoaderCircle size={20} className="animate-spin" />
      {label}
    </div>
  )
}

export function ErrorBanner({ message, onRetry, onDismiss }) {
  if (!message) return null
  return (
    <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
      <AlertCircle size={18} className="mt-0.5 shrink-0" />
      <span className="flex-1">{message}</span>
      {onRetry && (
        <button type="button" onClick={onRetry} className="font-bold underline">
          Retry
        </button>
      )}
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss">
          <X size={16} />
        </button>
      )}
    </div>
  )
}

export function SuccessBanner({ message, onDismiss }) {
  if (!message) return null
  return (
    <div role="status" className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">
      <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss">
          <X size={16} />
        </button>
      )}
    </div>
  )
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="px-4 py-12 text-center">
      {Icon && <Icon size={36} className="mx-auto mb-3 text-slate-300" />}
      <p className="font-semibold text-slate-700">{title}</p>
      {text && <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

export function Card({ children, className = '' }) {
  return <section className={`rounded-2xl bg-white p-5 shadow-sm sm:p-7 ${className}`}>{children}</section>
}

export function SectionHeader({ title, text, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-extrabold">{title}</h2>
        {text && <p className="mt-1 text-sm text-slate-500">{text}</p>}
      </div>
      {action}
    </div>
  )
}

const avatarColors = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-cyan-100 text-cyan-700',
]

export function Avatar({ name, size = 'md' }) {
  const initials = String(name || '?')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
  const color = avatarColors[(name || '').length % avatarColors.length]
  const sizes = { sm: 'h-9 w-9 text-xs', md: 'h-11 w-11 text-sm', lg: 'h-16 w-16 text-xl' }
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full font-bold ${color} ${sizes[size]}`}>
      {initials || '?'}
    </span>
  )
}

const chipTones = {
  neutral: 'bg-slate-100 text-slate-700',
  brand: 'bg-blue-50 text-blue-700',
  match: 'bg-emerald-50 text-emerald-700',
  missing: 'bg-red-50 text-red-600',
  interest: 'bg-violet-50 text-violet-700',
}

export function SkillChips({ skills, tone = 'brand', max, emptyText }) {
  const list = Array.isArray(skills) ? skills : []
  if (list.length === 0) {
    return emptyText ? <p className="text-sm text-slate-400">{emptyText}</p> : null
  }
  const shown = max ? list.slice(0, max) : list
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((skill) => (
        <span key={skill} className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${chipTones[tone]}`}>
          {skill}
        </span>
      ))}
      {max && list.length > max && (
        <span className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-400">+{list.length - max} more</span>
      )}
    </div>
  )
}

export function matchTone(percentage) {
  if (percentage >= 75) return { bar: 'bg-emerald-500', text: 'text-emerald-700', badge: 'bg-emerald-50 text-emerald-700' }
  if (percentage >= 40) return { bar: 'bg-amber-500', text: 'text-amber-700', badge: 'bg-amber-50 text-amber-700' }
  return { bar: 'bg-slate-400', text: 'text-slate-600', badge: 'bg-slate-100 text-slate-600' }
}

export function MatchBadge({ percentage }) {
  if (percentage === null || percentage === undefined) return null
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${matchTone(percentage).badge}`}>
      {percentage}% match
    </span>
  )
}

export function MatchMeter({ percentage, label = 'Skill match' }) {
  const tone = matchTone(percentage ?? 0)
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs font-semibold">
        <span className="text-slate-500">{label}</span>
        <span className={tone.text}>{percentage ?? 0}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.max(percentage ?? 0, 2)}%` }} />
      </div>
    </div>
  )
}

export function ApplicationStatusPill({ status }) {
  const value = String(status || 'APPLIED').toUpperCase()
  const config = APPLICATION_STATUS[value] || { label: value.replaceAll('_', ' '), className: 'bg-slate-100 text-slate-600' }
  return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${config.className}`}>{config.label}</span>
}

export function Modal({ title, subtitle, onClose, children, wide = false, busy = false }) {
  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape' && !busy) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, busy])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8 ${wide ? 'max-w-2xl' : 'max-w-lg'}`}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button
            type="button"
            aria-label="Close"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>
        {children}
      </section>
    </div>
  )
}

export const inputClass =
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-normal outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50'

export const primaryButton =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60'

export const secondaryButton =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'
