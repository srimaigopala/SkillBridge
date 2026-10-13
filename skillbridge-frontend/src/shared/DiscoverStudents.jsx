import { GraduationCap, Search, Users } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Avatar, Card, EmptyState, ErrorBanner, SectionHeader, SkillChips, Spinner } from '../components/ui.jsx'
import { api } from '../lib/api.js'
import ConnectionButton from '../student/ConnectionButton.jsx'
import StudentProfileModal from './StudentProfileModal.jsx'

// Student directory. Students get connect buttons; recruiters use it to find talent.
export default function DiscoverStudents({ title = 'Discover students', text, onConnectionChange }) {
  const [query, setQuery] = useState('')
  const [skill, setSkill] = useState('')
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openUserId, setOpenUserId] = useState(null)

  const load = useCallback(async (q, s, signal) => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set('q', q.trim())
      if (s.trim()) params.set('skill', s.trim())
      setStudents(await api(`/api/students?${params}`, { signal }))
    } catch (err) {
      if (err.name !== 'AbortError') setError(err.message)
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [])

  // Debounced search as the user types
  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(() => load(query, skill, controller.signal), 300)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query, skill, load])

  function reload() {
    load(query, skill)
    onConnectionChange?.()
  }

  return (
    <Card>
      <SectionHeader title={title} text={text || 'Find students by name, college, skills or interests.'} />

      <div className="mb-6 grid gap-3 sm:grid-cols-[1fr_220px]">
        <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5">
          <Search size={18} className="shrink-0 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, college, interests..."
            className="w-full min-w-0 bg-transparent text-sm outline-none"
          />
        </label>
        <input
          value={skill}
          onChange={(event) => setSkill(event.target.value)}
          placeholder="Filter by skill, e.g. React"
          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
        />
      </div>

      <ErrorBanner message={error} onRetry={() => load(query, skill)} />

      {loading && students.length === 0 ? (
        <Spinner label="Searching students..." />
      ) : students.length === 0 ? (
        <EmptyState icon={Users} title="No students found" text="Try a different name, college or skill." />
      ) : (
        <div className={`grid gap-4 md:grid-cols-2 2xl:grid-cols-3 ${loading ? 'opacity-60' : ''}`}>
          {students.map((student) => (
            <article key={student.userId} className="flex flex-col rounded-xl border border-slate-100 p-5 transition hover:border-blue-200 hover:shadow-md">
              <div className="flex items-start gap-3">
                <Avatar name={student.name} />
                <div className="min-w-0">
                  <button
                    type="button"
                    onClick={() => setOpenUserId(student.userId)}
                    className="text-left font-bold hover:text-blue-700 hover:underline"
                  >
                    {student.name}
                  </button>
                  {student.headline && <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{student.headline}</p>}
                  {student.college && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                      <GraduationCap size={13} />
                      <span className="truncate">{student.college}</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="mt-4">
                <SkillChips skills={student.skills} max={5} emptyText="No skills listed yet" />
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
                <ConnectionButton
                  userId={student.userId}
                  status={student.connectionStatus}
                  connectionId={student.connectionId}
                  onChange={reload}
                  onError={setError}
                  size="sm"
                />
                <button
                  type="button"
                  onClick={() => setOpenUserId(student.userId)}
                  className="rounded-xl px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50"
                >
                  View profile
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {openUserId && (
        <StudentProfileModal
          userId={openUserId}
          onClose={() => setOpenUserId(null)}
          onConnectionChange={reload}
        />
      )}
    </Card>
  )
}
