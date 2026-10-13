import { Inbox, Send, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Avatar, Card, EmptyState, ErrorBanner, SectionHeader, Spinner } from '../components/ui.jsx'
import { api } from '../lib/api.js'
import { timeAgo } from '../lib/format.js'
import StudentProfileModal from '../shared/StudentProfileModal.jsx'
import ConnectionButton from './ConnectionButton.jsx'

// Incoming requests, sent requests and accepted connections
export default function ConnectionsPanel({ onChange, onDiscover }) {
  const [incoming, setIncoming] = useState([])
  const [outgoing, setOutgoing] = useState([])
  const [connections, setConnections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openUserId, setOpenUserId] = useState(null)

  const load = useCallback(async () => {
    setError('')
    try {
      const [inc, out, conn] = await Promise.all([
        api('/api/connections/requests/incoming'),
        api('/api/connections/requests/outgoing'),
        api('/api/connections'),
      ])
      setIncoming(inc)
      setOutgoing(out)
      setConnections(conn)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function changed() {
    load()
    onChange?.()
  }

  function renderRow(item, status, subtitle) {
    return (
      <div key={item.id} className="flex flex-wrap items-center gap-3 py-4">
        <Avatar name={item.name} />
        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => setOpenUserId(item.userId)} className="font-bold hover:text-blue-700 hover:underline">
            {item.name}
          </button>
          <p className="truncate text-xs text-slate-500">
            {[item.headline, item.college].filter(Boolean).join(' · ') || 'Student'}
          </p>
          <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
        </div>
        <ConnectionButton
          userId={item.userId}
          status={status}
          connectionId={item.id}
          onChange={changed}
          onError={setError}
          size="sm"
        />
      </div>
    )
  }

  if (loading) {
    return (
      <Card>
        <Spinner label="Loading your network..." />
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <ErrorBanner message={error} onRetry={load} />

      <Card>
        <SectionHeader
          title={`Requests received (${incoming.length})`}
          text="Students who want to connect with you."
        />
        {incoming.length === 0 ? (
          <EmptyState icon={Inbox} title="No pending requests" />
        ) : (
          <div className="divide-y divide-slate-100">
            {incoming.map((item) => (
              renderRow(item, "PENDING_RECEIVED", `Sent ${timeAgo(item.createdAt)}`)
            ))}
          </div>
        )}
      </Card>

      <Card>
        <SectionHeader
          title={`My connections (${connections.length})`}
          action={
            <button type="button" onClick={onDiscover} className="rounded-xl bg-blue-50 px-4 py-2.5 text-sm font-bold text-blue-700 hover:bg-blue-100">
              Find students
            </button>
          }
        />
        {connections.length === 0 ? (
          <EmptyState
            icon={Users}
            title="You haven't connected with anyone yet"
            text="Discover classmates and peers with similar skills and interests."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {connections.map((item) => (
              renderRow(item, "CONNECTED", `Connected ${timeAgo(item.respondedAt || item.createdAt)}`)
            ))}
          </div>
        )}
      </Card>

      {outgoing.length > 0 && (
        <Card>
          <SectionHeader title={`Sent requests (${outgoing.length})`} text="Waiting for a response." />
          <div className="divide-y divide-slate-100">
            {outgoing.map((item) => (
              renderRow(item, "PENDING_SENT", `Sent ${timeAgo(item.createdAt)}`)
            ))}
          </div>
        </Card>
      )}

      {outgoing.length === 0 && incoming.length === 0 && connections.length === 0 && (
        <p className="flex items-center justify-center gap-2 text-xs text-slate-400">
          <Send size={13} /> Requests you send will show up here.
        </p>
      )}

      {openUserId && (
        <StudentProfileModal userId={openUserId} onClose={() => setOpenUserId(null)} onConnectionChange={changed} />
      )}
    </div>
  )
}
