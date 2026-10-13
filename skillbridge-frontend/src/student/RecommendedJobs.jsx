import { BriefcaseBusiness, CalendarDays, MapPin, Sparkles } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Card, EmptyState, ErrorBanner, MatchMeter, SectionHeader, SkillChips, Spinner, primaryButton } from '../components/ui.jsx'
import { api } from '../lib/api.js'
import { formatDate, formatSalary } from '../lib/format.js'

// Open jobs ranked by skill match. `refreshKey` reloads after profile/résumé changes.
export default function RecommendedJobs({ onApply, onGoToProfile, limit = 12, compact = false, refreshKey }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [hasSkills, setHasSkills] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [recommendations, profile] = await Promise.all([
        api(`/api/student/recommendations?limit=${limit}`),
        api('/api/student/profile'),
      ])
      setItems(recommendations || [])
      setHasSkills((profile?.skills || []).length > 0)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [limit])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  return (
    <Card className={compact ? 'mb-8' : ''}>
      <SectionHeader
        title={compact ? 'Top matches for you' : 'Recommended for you'}
        text="Open internships ranked by how well they match the skills on your profile."
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
            <Sparkles size={14} /> Skill based
          </span>
        }
      />

      <ErrorBanner message={error} onRetry={load} />

      {loading ? (
        <Spinner label="Finding your best matches..." className="py-10" />
      ) : !hasSkills ? (
        <EmptyState
          icon={Sparkles}
          title="Add your skills to get recommendations"
          text="Upload your résumé and we'll detect your skills automatically, or add them to your profile yourself."
          action={
            <button type="button" onClick={onGoToProfile} className={primaryButton}>
              Complete my profile
            </button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={BriefcaseBusiness}
          title="No matching openings right now"
          text="None of the open internships you haven't applied to use your skills yet. Check back soon or add more skills."
        />
      ) : (
        <div className={`grid gap-5 ${compact ? 'lg:grid-cols-3' : 'xl:grid-cols-2'}`}>
          {(compact ? items.slice(0, 3) : items).map(({ job, matchPercentage, matchedSkills, missingSkills }) => (
            <article
              key={job.id}
              className="flex flex-col rounded-xl border border-slate-100 p-5 transition hover:border-blue-200 hover:shadow-md"
            >
              <h3 className="text-base font-bold">{job.title}</h3>
              <p className="mt-1 text-sm text-slate-500">{job.companyName}</p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={14} />
                  {job.location || 'Location not specified'}
                </span>
                {job.applicationDeadline && (
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays size={14} />
                    Apply by {formatDate(job.applicationDeadline)}
                  </span>
                )}
                {formatSalary(job.salary) && <span className="font-semibold text-slate-700">{formatSalary(job.salary)}</span>}
              </div>

              <div className="mt-4">
                <MatchMeter percentage={matchPercentage} />
              </div>

              <div className="mt-4 space-y-3">
                <div>
                  <p className="mb-1.5 text-xs font-semibold text-slate-500">You have</p>
                  <SkillChips skills={matchedSkills} tone="match" max={compact ? 4 : undefined} />
                </div>
                {missingSkills.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold text-slate-500">Skills to learn</p>
                    <SkillChips skills={missingSkills} tone="missing" max={compact ? 3 : undefined} />
                  </div>
                )}
              </div>

              <div className="mt-auto pt-5">
                <button type="button" onClick={() => onApply(job)} className={`${primaryButton} w-full`}>
                  View & apply
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </Card>
  )
}
