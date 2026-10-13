import { Check, Clock, UserCheck, UserPlus, X } from 'lucide-react'
import { useState } from 'react'
import { api } from '../lib/api.js'

// Connect / cancel / accept / decline / remove, depending on the current status.
// Calls onChange() after any successful action so the parent can reload.
export default function ConnectionButton({ userId, status, connectionId, onChange, onError, size = 'md' }) {
  const [busy, setBusy] = useState(false)
  const pad = size === 'sm' ? 'px-3 py-2 text-xs' : 'px-4 py-2.5 text-sm'

  async function run(action) {
    setBusy(true)
    try {
      await action()
      onChange?.()
    } catch (err) {
      onError?.(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!status) return null

  if (status === 'NONE') {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => run(() => api(`/api/connections/request/${userId}`, { method: 'POST' }))}
        className={`inline-flex items-center gap-2 rounded-xl bg-blue-600 font-bold text-white hover:bg-blue-700 disabled:opacity-60 ${pad}`}
      >
        <UserPlus size={16} />
        {busy ? 'Sending...' : 'Connect'}
      </button>
    )
  }

  if (status === 'PENDING_SENT') {
    return (
      <button
        type="button"
        disabled={busy}
        title="Cancel request"
        onClick={() => run(() => api(`/api/connections/${connectionId}`, { method: 'DELETE' }))}
        className={`group inline-flex items-center gap-2 rounded-xl border border-slate-200 font-bold text-slate-500 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-60 ${pad}`}
      >
        <Clock size={16} className="group-hover:hidden" />
        <X size={16} className="hidden group-hover:block" />
        <span className="group-hover:hidden">Requested</span>
        <span className="hidden group-hover:inline">Cancel request</span>
      </button>
    )
  }

  if (status === 'PENDING_RECEIVED') {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => api(`/api/connections/${connectionId}/accept`, { method: 'POST' }))}
          className={`inline-flex items-center gap-2 rounded-xl bg-emerald-600 font-bold text-white hover:bg-emerald-700 disabled:opacity-60 ${pad}`}
        >
          <Check size={16} />
          Accept
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => run(() => api(`/api/connections/${connectionId}/reject`, { method: 'POST' }))}
          className={`inline-flex items-center gap-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60 ${pad}`}
        >
          Decline
        </button>
      </div>
    )
  }

  // CONNECTED
  return (
    <button
      type="button"
      disabled={busy}
      title="Remove connection"
      onClick={() => {
        if (window.confirm('Remove this connection?')) {
          run(() => api(`/api/connections/${connectionId}`, { method: 'DELETE' }))
        }
      }}
      className={`group inline-flex items-center gap-2 rounded-xl bg-emerald-50 font-bold text-emerald-700 hover:bg-red-50 hover:text-red-600 disabled:opacity-60 ${pad}`}
    >
      <UserCheck size={16} className="group-hover:hidden" />
      <X size={16} className="hidden group-hover:block" />
      <span className="group-hover:hidden">Connected</span>
      <span className="hidden group-hover:inline">Remove</span>
    </button>
  )
}
