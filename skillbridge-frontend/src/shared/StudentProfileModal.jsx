import { ExternalLink, FileText, GraduationCap, Mail, MapPin, Target } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Avatar, ErrorBanner, MatchMeter, Modal, SkillChips, Spinner } from '../components/ui.jsx'
import { api, openProtectedFile } from '../lib/api.js'
import { safeUrl } from '../lib/format.js'
import ConnectionButton from '../student/ConnectionButton.jsx'

// Public student profile. Students see connect actions; recruiters/admins see email and résumé.
// `match` (optional) shows an applicant's skill match for a specific job.
export default function StudentProfileModal({ userId, onClose, onConnectionChange, match }) {
  const [student, setStudent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setStudent(await api(`/api/students/${userId}`))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  const role = localStorage.getItem('skillbridgeRole')
  const canSeeResume = role === 'RECRUITER' || role === 'ADMIN'

  const links = student
    ? [
        ['GitHub', student.githubUrl],
        ['LinkedIn', student.linkedinUrl],
        ['Portfolio', student.portfolioUrl],
      ]
        .map(([label, url]) => [label, safeUrl(url)])
        .filter(([, url]) => url)
    : []

  const education = student
    ? [student.degree, student.branch, student.graduationYear && `Class of ${student.graduationYear}`]
        .filter(Boolean)
        .join(' · ')
    : ''

  return (
    <Modal title="Student profile" onClose={onClose} wide>
      {loading ? (
        <Spinner label="Loading profile..." />
      ) : error ? (
        <ErrorBanner message={error} onRetry={load} />
      ) : (
        <div className="space-y-6">
          <div className="flex flex-wrap items-start gap-4">
            <Avatar name={student.name} size="lg" />
            <div className="min-w-0 flex-1">
              <h3 className="text-xl font-extrabold">{student.name}</h3>
              {student.headline && <p className="mt-1 text-sm text-slate-600">{student.headline}</p>}
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                {student.college && (
                  <span className="inline-flex items-center gap-1.5">
                    <GraduationCap size={14} />
                    {student.college}
                  </span>
                )}
                {student.location && (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin size={14} />
                    {student.location}
                  </span>
                )}
                {student.email && (
                  <a href={`mailto:${student.email}`} className="inline-flex items-center gap-1.5 text-blue-700 hover:underline">
                    <Mail size={14} />
                    {student.email}
                  </a>
                )}
              </div>
              {education && <p className="mt-1 text-xs text-slate-400">{education}</p>}
            </div>
            {student.connectionStatus && (
              <ConnectionButton
                userId={student.userId}
                status={student.connectionStatus}
                connectionId={student.connectionId}
                onChange={() => {
                  load()
                  onConnectionChange?.()
                }}
                onError={setError}
              />
            )}
          </div>

          {match && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
              <MatchMeter percentage={match.matchPercentage} label={`Match for ${match.jobTitle}`} />
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-slate-500">Has</p>
                  <SkillChips skills={match.matchedSkills} tone="match" emptyText="None of the required skills" />
                </div>
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-slate-500">Missing</p>
                  <SkillChips skills={match.missingSkills} tone="missing" emptyText="Nothing — full match" />
                </div>
              </div>
            </div>
          )}

          {student.bio && (
            <div>
              <h4 className="mb-2 text-sm font-bold">About</h4>
              <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">{student.bio}</p>
            </div>
          )}

          {student.careerGoals && (
            <div>
              <h4 className="mb-2 flex items-center gap-2 text-sm font-bold">
                <Target size={15} /> Career goals
              </h4>
              <p className="text-sm leading-6 text-slate-600">{student.careerGoals}</p>
            </div>
          )}

          <div>
            <h4 className="mb-2 text-sm font-bold">Skills</h4>
            <SkillChips skills={student.skills} emptyText="No skills added yet" />
          </div>

          {student.interests?.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-bold">Interests</h4>
              <SkillChips skills={student.interests} tone="interest" />
            </div>
          )}

          {(links.length > 0 || (canSeeResume && student.hasResume)) && (
            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-5">
              {canSeeResume && student.hasResume && (
                <button
                  type="button"
                  onClick={() => openProtectedFile(`/api/students/${student.userId}/resume`).catch((err) => setError(err.message))}
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
                >
                  <FileText size={16} />
                  View résumé
                </button>
              )}
              {links.map(([label, url]) => (
                <a
                  key={label}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
                >
                  {label}
                  <ExternalLink size={14} />
                </a>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
