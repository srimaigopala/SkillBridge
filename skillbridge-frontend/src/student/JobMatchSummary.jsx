import { useEffect, useState } from 'react'
import { MatchMeter, SkillChips } from '../components/ui.jsx'
import { api } from '../lib/api.js'

// Skill match for one job, shown in the apply dialog
export default function JobMatchSummary({ jobId }) {
  const [match, setMatch] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setMatch(null)
    setFailed(false)
    api(`/api/jobs/${jobId}/match`, { signal: controller.signal })
      .then(setMatch)
      .catch((err) => {
        if (err.name !== 'AbortError') setFailed(true)
      })
    return () => controller.abort()
  }, [jobId])

  if (failed) return null

  if (!match) {
    return <div className="h-24 animate-pulse rounded-xl bg-slate-50" />
  }

  if (match.matchedSkills.length + match.missingSkills.length === 0) {
    return (
      <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
        This posting doesn't list required skills.
      </p>
    )
  }

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
      <MatchMeter percentage={match.matchPercentage} label="Your skill match" />
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="mb-1.5 text-xs font-semibold text-slate-500">You have</p>
          <SkillChips skills={match.matchedSkills} tone="match" emptyText="None yet" />
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-slate-500">Missing</p>
          <SkillChips skills={match.missingSkills} tone="missing" emptyText="Nothing — great fit!" />
        </div>
      </div>
    </div>
  )
}
