import { FileText, LoaderCircle, Sparkles, Trash2, UploadCloud } from 'lucide-react'
import { useRef, useState } from 'react'
import { ErrorBanner, SkillChips, secondaryButton } from '../components/ui.jsx'
import { api, openProtectedFile } from '../lib/api.js'
import { formatDate } from '../lib/format.js'

const MAX_BYTES = 5 * 1024 * 1024

// Upload a PDF résumé; the backend extracts skills and merges them into the profile.
export default function ResumeUpload({ profile, onProfileUpdated }) {
  const inputRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  async function upload(file) {
    setError('')
    setResult(null)

    if (!file) return
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please choose a PDF file.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('That file is larger than 5 MB.')
      return
    }

    const form = new FormData()
    form.append('file', file)

    setUploading(true)
    try {
      const data = await api('/api/student/profile/resume', { method: 'POST', form })
      setResult(data)
      onProfileUpdated(data.profile)
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function remove() {
    if (!window.confirm('Remove your uploaded résumé? Skills already on your profile stay.')) return
    setRemoving(true)
    setError('')
    try {
      const data = await api('/api/student/profile/resume', { method: 'DELETE' })
      setResult(null)
      onProfileUpdated(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div>
      <h3 className="text-lg font-bold">Résumé</h3>
      <p className="mt-1 text-sm text-slate-500">
        Upload a PDF and we'll read it to detect your technical skills automatically.
      </p>

      <div className="mt-5">
        <ErrorBanner message={error} onDismiss={() => setError('')} />
      </div>

      {profile.resumeUploaded && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50 text-red-600">
            <FileText size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{profile.resumeFileName}</p>
            <p className="text-xs text-slate-500">Uploaded {formatDate(profile.resumeUploadedAt)}</p>
          </div>
          <button
            type="button"
            onClick={() => openProtectedFile('/api/student/profile/resume').catch((err) => setError(err.message))}
            className={secondaryButton}
          >
            View
          </button>
          <button
            type="button"
            onClick={remove}
            disabled={removing}
            className={`${secondaryButton} hover:border-red-200 hover:bg-red-50 hover:text-red-600`}
          >
            <Trash2 size={15} />
            {removing ? 'Removing...' : 'Remove'}
          </button>
        </div>
      )}

      <label
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          upload(event.dataTransfer.files?.[0])
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition ${
          dragging ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
        } ${uploading ? 'pointer-events-none opacity-70' : ''}`}
      >
        {uploading ? (
          <LoaderCircle size={28} className="animate-spin text-blue-600" />
        ) : (
          <UploadCloud size={28} className="text-blue-600" />
        )}
        <p className="mt-3 text-sm font-bold text-slate-700">
          {uploading
            ? 'Reading your résumé...'
            : profile.resumeUploaded
              ? 'Upload a new version'
              : 'Drop your PDF here or click to browse'}
        </p>
        <p className="mt-1 text-xs text-slate-400">PDF only · up to 5 MB</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          disabled={uploading}
          onChange={(event) => upload(event.target.files?.[0])}
        />
      </label>

      {result && (
        <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-emerald-800">
            <Sparkles size={16} />
            {result.extractedSkills.length > 0
              ? `Found ${result.extractedSkills.length} skills in your résumé`
              : 'No known technical skills were found in this résumé'}
          </p>
          {result.extractedSkills.length > 0 && (
            <div className="mt-3">
              <SkillChips skills={result.extractedSkills} tone="match" />
            </div>
          )}
          <p className="mt-3 text-xs text-emerald-800">
            {result.newSkillsAdded.length > 0
              ? `Added to your profile: ${result.newSkillsAdded.join(', ')}.`
              : result.extractedSkills.length > 0
                ? 'All of these were already on your profile.'
                : 'You can still add skills yourself below.'}
          </p>
        </div>
      )}

      {!result && profile.resumeSkills?.length > 0 && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs font-semibold text-slate-500">Detected in your résumé</p>
          <SkillChips skills={profile.resumeSkills} tone="match" />
        </div>
      )}
    </div>
  )
}
