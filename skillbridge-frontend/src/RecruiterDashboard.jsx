import { useCallback, useEffect, useState } from 'react'

import {

  LayoutDashboard,

  BriefcaseBusiness,

  Users,

  Plus,

  LogOut,

  GraduationCap,

  MapPin,

  CalendarDays,

  IndianRupee,

  Search,

  X,

  RefreshCw,

  CheckCircle2,

  Clock,
  AlertCircle,
  Pencil,
  Trash2,
  Power,
  UserSearch,
} from 'lucide-react'
import { ApplicationStatusPill, MatchMeter, SkillChips } from './components/ui.jsx'
import StudentProfileModal from './shared/StudentProfileModal.jsx'
import DiscoverStudents from './shared/DiscoverStudents.jsx'

const API = import.meta.env.VITE_API_URL || 'http://localhost:8080';

const emptyJob = {

  title: '',

  companyName: '',

  description: '',

  location: '',

  jobType: 'INTERNSHIP',

  salary: '',

  applicationDeadline: '',

  requiredSkills: '',

}

const inputClass =

  'mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

function getErrorMessage(data, fallback) {

  if (typeof data === 'string' && data.trim()) return data

  return data?.message || data?.error || fallback

}

function getJobId(job) {

  return job?.id ?? job?.jobId

}

function getApplicationId(application) {

  return application?.id ?? application?.applicationId

}

function formatSalary(salary) {

  if (salary === null || salary === undefined || salary === '') {

    return 'Not specified'

  }

  return `₹${Number(salary).toLocaleString('en-IN')}`

}

const REVIEW_ACTIONS = [
  { status: 'UNDER_REVIEW', label: 'Review', className: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
  { status: 'SHORTLISTED', label: 'Shortlist', className: 'bg-violet-50 text-violet-700 hover:bg-violet-100' },
  { status: 'SELECTED', label: 'Accept', className: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
  { status: 'REJECTED', label: 'Reject', className: 'bg-red-50 text-red-700 hover:bg-red-100' },
]

function StatusBadge({ status }) {

  const value = String(status || 'PENDING').toUpperCase()

  const styles = {

    OPEN: 'bg-emerald-50 text-emerald-700',

    CLOSED: 'bg-slate-100 text-slate-600',

    PENDING: 'bg-amber-50 text-amber-700',

    SHORTLISTED: 'bg-blue-50 text-blue-700',

    REJECTED: 'bg-red-50 text-red-700',

    ACCEPTED: 'bg-emerald-50 text-emerald-700',

  }

  return (

    <span

      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${

        styles[value] || 'bg-violet-50 text-violet-700'

      }`}

    >

      {value.replaceAll('_', ' ')}

    </span>

  )

}

export default function RecruiterDashboard({ onLogout }) {

  const [activeTab, setActiveTab] = useState('Overview')

  const [jobs, setJobs] = useState([])

  const [applications, setApplications] = useState([])

  const [selectedJob, setSelectedJob] = useState(null)

  const [jobForm, setJobForm] = useState(emptyJob)

  const [search, setSearch] = useState('')

  const [showJobForm, setShowJobForm] = useState(false)

  const [loading, setLoading] = useState(true)

  const [saving, setSaving] = useState(false)

  const [updatingApplication, setUpdatingApplication] = useState(null)

  const [error, setError] = useState('')

  const [notice, setNotice] = useState('')
  const [editingJobId, setEditingJobId] = useState(null)
  const [jobActionId, setJobActionId] = useState(null)
  const [openApplicant, setOpenApplicant] = useState(null)

  const token = localStorage.getItem('skillbridgeToken')

  const request = useCallback(

    async (path, options = {}) => {

      const response = await fetch(`${API}${path}`, {

        ...options,

        headers: {

          ...(options.body ? { 'Content-Type': 'application/json' } : {}),

          ...(token ? { Authorization: `Bearer ${token}` } : {}),

          ...options.headers,

        },

      })

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

        throw new Error(

          getErrorMessage(data, `Request failed with status ${response.status}.`),

        )

      }

      return data

    },

    [token],

  )

  const loadJobs = useCallback(async () => {

    const data = await request('/api/jobs/my-jobs')

    const list = Array.isArray(data)

      ? data

      : Array.isArray(data?.content)

        ? data.content

        : Array.isArray(data?.jobs)

          ? data.jobs

          : []

    setJobs(list)

    return list

  }, [request])

  const loadApplicants = useCallback(
    async (jobList) => {
      try {
        const data = await request('/api/applications/received')
        if (Array.isArray(data)) {
          setApplications(data)
          return data
        }
      } catch (err) {
        console.warn('Falling back to per-job applicant loading:', err.message)
      }
      const allApplications = []

      for (const job of jobList) {

        const id = getJobId(job)

        if (id === null || id === undefined) continue

        try {

          const data = await request(`/api/applications/job/${id}`)

          const list = Array.isArray(data)

            ? data

            : Array.isArray(data?.content)

              ? data.content

              : Array.isArray(data?.applications)

                ? data.applications

                : []

          allApplications.push(

            ...list.map((application) => ({

              ...application,

              jobTitle:

                application.jobTitle ||

                application.job?.title ||

                job.title ||

                'Job',

              jobId: application.jobId ?? id,

            })),

          )

        } catch (err) {

          console.warn(`Could not load applicants for job ${id}:`, err.message)

        }

      }

      setApplications(allApplications)

      return allApplications

    },

    [request],

  )

  const refreshDashboard = useCallback(async () => {

    setLoading(true)

    setError('')

    try {

      const jobList = await loadJobs()

      await loadApplicants(jobList)

    } catch (err) {

      setError(err.message || 'Could not load dashboard data.')

    } finally {

      setLoading(false)

    }

  }, [loadJobs, loadApplicants])

  useEffect(() => {

    refreshDashboard()

  }, [refreshDashboard])

  const openJobs = jobs.filter(

    (job) => String(job.status || 'OPEN').toUpperCase() === 'OPEN',

  )

  const filteredJobs = jobs.filter((job) => {

    const text =

      `${job.title || ''} ${job.companyName || job.company || ''} ${job.location || ''}`.toLowerCase()

    return text.includes(search.toLowerCase())

  })

  const filteredApplications = applications.filter((application) => {

    const text =

      `${application.jobTitle || ''} ${application.studentName || application.student?.name || application.name || ''} ${application.studentEmail || application.student?.email || application.email || ''}`.toLowerCase()

    return text.includes(search.toLowerCase())

  })

  async function handleCreateJob(event) {

    event.preventDefault()

    setSaving(true)

    setError('')

    setNotice('')

    try {

      const payload = {

        ...jobForm,

        salary: jobForm.salary === '' ? null : Number(jobForm.salary),

        requiredSkills: jobForm.requiredSkills

        .split(',')

        .map((skill) => skill.trim())

        .filter(Boolean)

        .join(', '),

      }

      await request(editingJobId ? `/api/jobs/${editingJobId}` : '/api/jobs', {
        method: editingJobId ? 'PUT' : 'POST',
        body: JSON.stringify(payload),
      })
      setJobForm(emptyJob)
      setShowJobForm(false)
      setNotice(editingJobId ? 'Job updated successfully!' : 'Job posted successfully!')
      setEditingJobId(null)

      setActiveTab('Manage Jobs')

      await refreshDashboard()

    } catch (err) {

      setError(err.message || 'Could not create job.')

    } finally {

      setSaving(false)

    }

  }

  async function handleApplicationStatus(application, status) {

    const id = getApplicationId(application)

    if (id === null || id === undefined) {

      setError('Could not find the application ID.')

      return

    }

    setUpdatingApplication(id)

    setError('')

    setNotice('')

    try {

      const updated = await request(`/api/applications/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      setApplications((previous) =>
        previous.map((item) =>
          getApplicationId(item) === id ? { ...item, ...updated } : item,
        ),
      )
      const label = { UNDER_REVIEW: 'under review', SHORTLISTED: 'shortlisted', SELECTED: 'accepted', REJECTED: 'rejected' }[status] || status.toLowerCase()
      setNotice(`Application marked ${label}.`)

    } catch (err) {

      setError(err.message || 'Could not update application status.')

    } finally {

      setUpdatingApplication(null)

    }

  }

  function startEditJob(job) {
    setEditingJobId(getJobId(job))
    setJobForm({
      title: job.title || '',
      companyName: job.companyName || '',
      description: job.description || '',
      location: job.location || '',
      jobType: job.jobType || 'INTERNSHIP',
      salary: job.salary ?? '',
      applicationDeadline: job.applicationDeadline || '',
      requiredSkills: job.requiredSkills || '',
    })
    setShowJobForm(true)
    setError('')
    setNotice('')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleToggleJobStatus(job) {
    const id = getJobId(job)
    const nextStatus = String(job.status).toUpperCase() === 'OPEN' ? 'CLOSED' : 'OPEN'
    setJobActionId(id)
    setError('')
    setNotice('')
    try {
      const updated = await request(`/api/jobs/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      })
      setJobs((previous) => previous.map((item) => (getJobId(item) === id ? updated : item)))
      setNotice(nextStatus === 'OPEN' ? `"${job.title}" is open for applications again.` : `"${job.title}" is now closed.`)
    } catch (err) {
      setError(err.message || 'Could not change the job status.')
    } finally {
      setJobActionId(null)
    }
  }

  async function handleDeleteJob(job) {
    const id = getJobId(job)
    const count = applications.filter((item) => String(item.jobId) === String(id)).length
    const warning = count > 0 ? ` Its ${count} application${count === 1 ? '' : 's'} will also be removed.` : ''
    if (!window.confirm(`Delete "${job.title}"?${warning}`)) return
    setJobActionId(id)
    setError('')
    setNotice('')
    try {
      await request(`/api/jobs/${id}`, { method: 'DELETE' })
      setJobs((previous) => previous.filter((item) => getJobId(item) !== id))
      setApplications((previous) => previous.filter((item) => String(item.jobId) !== String(id)))
      setNotice('Job deleted.')
    } catch (err) {
      setError(err.message || 'Could not delete the job.')
    } finally {
      setJobActionId(null)
    }
  }

  function updateJobField(event) {

    const { name, value } = event.target

    setJobForm((previous) => ({ ...previous, [name]: value }))

  }

  const menu = [

    { label: 'Overview', icon: LayoutDashboard },

    { label: 'Manage Jobs', icon: BriefcaseBusiness },

    { label: 'Applicants', icon: Users },
    { label: 'Find Talent', icon: UserSearch },
  ]

  return (

    <div className="min-h-screen bg-[#edf3fb] text-slate-800">

      <div className="flex min-h-screen">

        <aside className="hidden w-64 shrink-0 flex-col bg-white p-5 shadow-sm md:flex">

          <div className="mb-10 flex items-center gap-3 px-2">

            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">

              <GraduationCap size={23} />

            </span>

            <span className="text-xl font-extrabold">SkillBridge</span>

          </div>

          <p className="mb-4 px-3 text-xs font-bold uppercase tracking-widest text-slate-400">

            Recruiter portal

          </p>

          <nav className="space-y-2">

            {menu.map(({ label, icon: Icon }) => (

              <button

                key={label}

                type="button"

                onClick={() => {

                  setActiveTab(label)

                  setSearch('')

                  setError('')

                  setNotice('')

                }}

                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold ${

                  activeTab === label

                    ? 'bg-blue-50 text-blue-700'

                    : 'text-slate-500 hover:bg-slate-50'

                }`}

              >

                <Icon size={19} />

                {label}

              </button>

            ))}

          </nav>

          <button

            type="button"

            onClick={onLogout}

            className="mt-auto flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600"

          >

            <LogOut size={19} />

            Logout

          </button>

        </aside>

        <main className="min-w-0 flex-1 p-4 sm:p-8">

          <header className="mb-7 flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm">

            <div>

              <p className="text-sm text-slate-400">

                Recruiter Portal / {activeTab}

              </p>

              <h1 className="mt-1 text-2xl font-extrabold">{activeTab}</h1>

            </div>

            <div className="flex items-center gap-3">

              <button

                type="button"

                onClick={refreshDashboard}

                title="Refresh dashboard"

                className="rounded-xl border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50"

              >

                <RefreshCw size={18} />

              </button>

              <span className="rounded-full bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">

                Recruiter

              </span>

            </div>

          </header>

          {error && (

            <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">

              <AlertCircle size={19} className="mt-0.5 shrink-0" />

              <span>{error}</span>

              <button

                type="button"

                className="ml-auto"

                onClick={() => setError('')}

                aria-label="Dismiss error"

              >

                <X size={18} />

              </button>

            </div>

          )}

          {notice && (

            <div className="mb-5 flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700">

              <CheckCircle2 size={19} />

              <span>{notice}</span>

              <button

                type="button"

                className="ml-auto"

                onClick={() => setNotice('')}

                aria-label="Dismiss message"

              >

                <X size={18} />

              </button>

            </div>

          )}

          {activeTab === 'Overview' && (

            <>

              <section className="mb-7 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-600 p-7 text-white shadow-lg sm:p-8">

                <p className="text-sm text-blue-100">RECRUITER WORKSPACE</p>

                <h2 className="mt-3 text-3xl font-extrabold">

                  Find your next great hire.

                </h2>

                <p className="mt-3 max-w-xl text-blue-100">

                  Publish opportunities, review applications, and connect with

                  talented students.

                </p>

                <button

                  type="button"

                  onClick={() => {

                    setActiveTab('Manage Jobs')

                    setShowJobForm(true)

                  }}

                  className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 font-semibold text-blue-700 hover:bg-blue-50"

                >

                  <Plus size={18} />

                  Post a new job

                </button>

              </section>

              <section className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">

                {[

                  {

                    label: 'Jobs Posted',

                    value: jobs.length,

                    icon: BriefcaseBusiness,

                  },

                  {

                    label: 'Open Positions',

                    value: openJobs.length,

                    icon: LayoutDashboard,

                  },

                  {

                    label: 'Applications Received',

                    value: applications.length,

                    icon: Users,

                  },

                ].map(({ label, value, icon: Icon }) => (

                  <article

                    key={label}

                    className="rounded-2xl bg-white p-6 shadow-sm"

                  >

                    <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700">

                      <Icon size={23} />

                    </div>

                    <p className="text-sm text-slate-500">{label}</p>

                    <p className="mt-2 text-3xl font-extrabold">

                      {loading ? '…' : value}

                    </p>

                  </article>

                ))}

              </section>

              <section className="mt-7 rounded-2xl bg-white p-6 shadow-sm sm:p-7">

                <div className="flex flex-wrap items-center justify-between gap-3">

                  <h2 className="text-lg font-extrabold">Recent job postings</h2>

                  <button

                    type="button"

                    onClick={() => setActiveTab('Manage Jobs')}

                    className="text-sm font-semibold text-blue-700 hover:underline"

                  >

                    View all jobs

                  </button>

                </div>

                {loading ? (

                  <p className="mt-5 text-sm text-slate-500">Loading jobs…</p>

                ) : jobs.length === 0 ? (

                  <p className="mt-5 text-sm text-slate-500">

                    No jobs found. Create your first job posting to get started.

                  </p>

                ) : (

                  <div className="mt-4 divide-y divide-slate-100">

                    {jobs.slice(0, 4).map((job, index) => (

                      <div

                        key={getJobId(job) ?? index}

                        className="flex flex-wrap items-center justify-between gap-3 py-4"

                      >

                        <div>

                          <p className="font-bold">{job.title}</p>

                          <p className="mt-1 text-sm text-slate-500">

                            {job.companyName || job.company || 'Company not specified'}

                            {' · '}

                            {job.location || 'Location not specified'}

                          </p>

                        </div>

                        <StatusBadge status={job.status || 'OPEN'} />

                      </div>

                    ))}

                  </div>

                )}

              </section>

            </>

          )}

          {activeTab === 'Manage Jobs' && (

            <>

              <section className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white p-6 shadow-sm">

                <div>

                  <h2 className="text-xl font-extrabold">Manage job postings</h2>

                  <p className="mt-1 text-sm text-slate-500">

                    Publish opportunities and review your job listings.

                  </p>

                </div>

                <button

                  type="button"

                  onClick={() => {
                    setShowJobForm((previous) => !previous)
                    setEditingJobId(null)
                    setJobForm(emptyJob)
                  }}

                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"

                >

                  {showJobForm ? <X size={18} /> : <Plus size={18} />}

                  {showJobForm ? 'Cancel' : 'Post a job'}

                </button>

              </section>

              {showJobForm && (

                <form

                  onSubmit={handleCreateJob}

                  className="mb-7 rounded-2xl bg-white p-6 shadow-sm sm:p-8"

                >

                  <h2 className="mb-6 text-xl font-extrabold">
                    {editingJobId ? 'Edit job posting' : 'Create a job posting'}
                  </h2>

                  <div className="grid gap-5 sm:grid-cols-2">

                    <label className="text-sm font-semibold">

                      Job title \*

                      <input

                        className={inputClass}

                        name="title"

                        value={jobForm.title}

                        onChange={updateJobField}

                        placeholder="e.g. Java Developer Intern"

                        required

                      />

                    </label>

                    <label className="text-sm font-semibold">

                      Company name \*

                      <input

                        className={inputClass}

                        name="companyName"

                        value={jobForm.companyName}

                        onChange={updateJobField}

                        placeholder="Your company"

                        required

                      />

                    </label>

                    <label className="text-sm font-semibold">

                      Location \*

                      <input

                        className={inputClass}

                        name="location"

                        value={jobForm.location}

                        onChange={updateJobField}

                        placeholder="e.g. Hyderabad"

                        required

                      />

                    </label>

                    <label className="text-sm font-semibold">

                      Job type \*

                      <select

                        className={inputClass}

                        name="jobType"

                        value={jobForm.jobType}

                        onChange={updateJobField}

                        required

                      >

                        <option value="INTERNSHIP">Internship</option>

                        <option value="FULL_TIME">Full time</option>

                        <option value="PART_TIME">Part time</option>

                        <option value="CONTRACT">Contract</option>

                      </select>

                    </label>

                    <label className="text-sm font-semibold">

                      Monthly salary (₹)

                      <input

                        className={inputClass}

                        type="number"

                        name="salary"

                        min="0"

                        value={jobForm.salary}

                        onChange={updateJobField}

                        placeholder="e.g. 15000"

                      />

                    </label>

                    <label className="text-sm font-semibold">

                      Application deadline \*

                      <input

                        className={inputClass}

                        type="date"

                        name="applicationDeadline"

                        value={jobForm.applicationDeadline}

                        onChange={updateJobField}

                        min={new Date().toLocaleDateString('en-CA')}

                        required

                      />

                    </label>

                  </div>

                  <label className="mt-5 block text-sm font-semibold">

                    Required skills \*

                    <input

                      className={inputClass}

                      name="requiredSkills"

                      value={jobForm.requiredSkills}

                      onChange={updateJobField}

                      placeholder="Java, Spring Boot, MySQL"

                      required

                    />

                    <span className="mt-1 block font-normal text-slate-400">

                      Separate each skill with a comma.

                    </span>

                  </label>

                  <label className="mt-5 block text-sm font-semibold">

                    Job description \*

                    <textarea

                      className={inputClass}

                      name="description"

                      value={jobForm.description}

                      onChange={updateJobField}

                      placeholder="Describe the role, responsibilities and requirements."

                      rows={5}

                      required

                    />

                  </label>

                  <button

                    type="submit"

                    disabled={saving}

                    className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"

                  >

                    {editingJobId ? <Pencil size={18} /> : <Plus size={18} />}
                    {saving ? 'Saving…' : editingJobId ? 'Save changes' : 'Publish job'}
                  </button>

                </form>

              )}

              <div className="mb-5 flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm">

                <Search size={19} className="text-slate-400" />

                <input

                  className="w-full bg-transparent text-sm outline-none"

                  placeholder="Search jobs by title, company or location..."

                  value={search}

                  onChange={(event) => setSearch(event.target.value)}

                />

              </div>

              {loading ? (

                <p className="rounded-2xl bg-white p-8 text-slate-500">

                  Loading jobs…

                </p>

              ) : filteredJobs.length === 0 ? (

                <div className="rounded-2xl bg-white p-8 text-center shadow-sm">

                  <BriefcaseBusiness

                    size={36}

                    className="mx-auto mb-3 text-slate-300"

                  />

                  <h3 className="font-bold">No matching jobs</h3>

                  <p className="mt-2 text-sm text-slate-500">

                    Try a different search or create a new posting.

                  </p>

                </div>

              ) : (

                <div className="grid gap-5 xl:grid-cols-2">

                  {filteredJobs.map((job, index) => (

                    <article

                      key={getJobId(job) ?? index}

                      className="rounded-2xl bg-white p-6 shadow-sm"

                    >

                      <div className="flex items-start justify-between gap-3">

                        <div>

                          <h3 className="text-lg font-extrabold">

                            {job.title}

                          </h3>

                          <p className="mt-1 text-sm text-slate-500">

                            {job.companyName || job.company || 'Company not specified'}

                          </p>

                        </div>

                        <StatusBadge status={job.status || 'OPEN'} />

                      </div>

                      <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-500">

                        <span className="inline-flex items-center gap-1.5">

                          <MapPin size={16} />

                          {job.location || 'Location not specified'}

                        </span>

                        <span className="inline-flex items-center gap-1.5">

                          <BriefcaseBusiness size={16} />

                          {job.jobType || job.type || 'Job'}

                        </span>

                        <span className="inline-flex items-center gap-1.5">

                          <IndianRupee size={16} />

                          {formatSalary(job.salary)}

                        </span>

                        {job.applicationDeadline && (

                          <span className="inline-flex items-center gap-1.5">

                            <CalendarDays size={16} />

                            {job.applicationDeadline}

                          </span>

                        )}

                      </div>

                      {job.description && (

                        <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">

                          {job.description}

                        </p>

                      )}

                      {job.skills?.length > 0 && (
                        <div className="mt-4">
                          <SkillChips skills={job.skills} />
                        </div>
                      )}
                      {job.expired && String(job.status).toUpperCase() === 'OPEN' && (
                        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                          The deadline has passed. Edit the job to extend it.
                        </p>
                      )}

                      <button

                        type="button"

                        onClick={() => {

                          setSelectedJob(job)

                          setActiveTab('Applicants')

                          setSearch('')

                        }}

                        className="mt-5 inline-flex items-center gap-2 rounded-xl border border-blue-100 px-4 py-2.5 text-sm font-semibold text-blue-700 hover:bg-blue-50"

                      >

                        <Users size={17} />
                        View applicants (
                        {applications.filter((item) => String(item.jobId) === String(getJobId(job))).length})
                      </button>
                      <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">
                        <button
                          type="button"
                          onClick={() => startEditJob(job)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                        >
                          <Pencil size={14} />
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={jobActionId === getJobId(job)}
                          onClick={() => handleToggleJobStatus(job)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
                        >
                          <Power size={14} />
                          {String(job.status).toUpperCase() === 'OPEN' ? 'Close applications' : 'Reopen'}
                        </button>
                        <button
                          type="button"
                          disabled={jobActionId === getJobId(job)}
                          onClick={() => handleDeleteJob(job)}
                          className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </div>
                    </article>

                  ))}

                </div>

              )}

            </>

          )}

          {activeTab === 'Applicants' && (

            <>

              <section className="mb-6 rounded-2xl bg-white p-6 shadow-sm">

                <h2 className="text-xl font-extrabold">Applicants</h2>

                <p className="mt-1 text-sm text-slate-500">

                  Review applications and update each applicant's status.

                </p>

                <div className="mt-5 flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3">

                  <Search size={19} className="text-slate-400" />

                  <input

                    className="w-full text-sm outline-none"

                    placeholder="Search by job title or student..."

                    value={search}

                    onChange={(event) => setSearch(event.target.value)}

                  />

                </div>

                {selectedJob && (

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-blue-50 p-4">

                    <p className="text-sm text-blue-800">

                      Showing applicants for <strong>{selectedJob.title}</strong>

                    </p>

                    <button

                      type="button"

                      onClick={() => setSelectedJob(null)}

                      className="text-sm font-semibold text-blue-700 hover:underline"

                    >

                      Show all jobs

                    </button>

                  </div>

                )}

              </section>

              {loading ? (

                <p className="rounded-2xl bg-white p-8 text-slate-500">

                  Loading applicants…

                </p>

              ) : filteredApplications.filter(

                  (application) =>

                    !selectedJob ||

                    String(application.jobId) === String(getJobId(selectedJob)),

                ).length === 0 ? (

                <div className="rounded-2xl bg-white p-10 text-center shadow-sm">

                  <Users

                    size={38}

                    className="mx-auto mb-3 text-slate-300"

                  />

                  <h3 className="font-bold">No applicants found</h3>

                  <p className="mt-2 text-sm text-slate-500">

                    Applications for your job postings will appear here.

                  </p>

                </div>

              ) : (

                <div className="overflow-x-auto rounded-2xl bg-white shadow-sm">

                  <table className="w-full min-w-[1040px] text-left text-sm">

                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">

                      <tr>

                        <th className="px-5 py-4">Student</th>

                        <th className="px-5 py-4">Job</th>
                        <th className="px-5 py-4">Skill match</th>
                        <th className="px-5 py-4">Applied on</th>

                        <th className="px-5 py-4">Status</th>

                        <th className="px-5 py-4">Actions</th>

                      </tr>

                    </thead>

                    <tbody className="divide-y divide-slate-100">

                      {filteredApplications

                        .filter(

                          (application) =>

                            !selectedJob ||

                            String(application.jobId) ===

                              String(getJobId(selectedJob)),

                        )

                        .map((application, index) => {

                          const id = getApplicationId(application)

                          const student =

                            application.studentName ||

                            application.student?.name ||

                            application.name ||

                            'Student'

                          const email =

                            application.studentEmail ||

                            application.student?.email ||

                            application.email ||

                            'Email unavailable'

                          const status = String(

                            application.status || 'PENDING',

                          ).toUpperCase()

                          return (

                            <tr key={id ?? index}>

                              <td className="px-5 py-4">
                                {application.studentId ? (
                                  <button
                                    type="button"
                                    onClick={() => setOpenApplicant(application)}
                                    className="text-left font-bold text-slate-800 hover:text-blue-700 hover:underline"
                                  >
                                    {student}
                                  </button>
                                ) : (
                                  <p className="font-bold">{student}</p>
                                )}
                                <p className="mt-1 text-xs text-slate-500">
                                  {email}
                                </p>
                              </td>
                              <td className="px-5 py-4 font-medium">
                                {application.jobTitle}
                              </td>
                              <td className="w-48 px-5 py-4">
                                {application.matchPercentage != null ? (
                                  <div title={application.missingSkills?.length ? `Missing: ${application.missingSkills.join(', ')}` : 'Has every required skill'}>
                                    <MatchMeter percentage={application.matchPercentage} label={`${application.matchedSkills?.length ?? 0} of ${(application.matchedSkills?.length ?? 0) + (application.missingSkills?.length ?? 0)} skills`} />
                                  </div>
                                ) : (
                                  <span className="text-xs text-slate-400">—</span>
                                )}
                              </td>

                              <td className="px-5 py-4 text-slate-500">

                                {application.appliedAt

                                  ? new Date(

                                      application.appliedAt,

                                    ).toLocaleDateString()

                                  : application.createdAt

                                    ? new Date(

                                        application.createdAt,

                                      ).toLocaleDateString()

                                    : '—'}

                              </td>

                              <td className="px-5 py-4">
                                <ApplicationStatusPill status={status} />
                              </td>

                              <td className="px-5 py-4">

                                <div className="flex gap-1.5 whitespace-nowrap">
                                  {status === 'WITHDRAWN' ? (
                                    <span className="text-xs text-slate-400">Withdrawn by student</span>
                                  ) : (
                                    REVIEW_ACTIONS.map((action) => (
                                      <button
                                        key={action.status}
                                        type="button"
                                        disabled={updatingApplication === id || status === action.status}
                                        onClick={() => handleApplicationStatus(application, action.status)}
                                        className={`rounded-lg px-2.5 py-1.5 text-xs font-bold disabled:opacity-40 ${action.className}`}
                                      >
                                        {action.label}
                                      </button>
                                    ))
                                  )}
                                </div>

                              </td>

                            </tr>

                          )

                        })}

                    </tbody>

                  </table>

                </div>

              )}

            </>

          )}

          {activeTab === 'Find Talent' && (
            <DiscoverStudents
              title="Find talent"
              text="Browse student profiles by skill, college or interest. Open a profile to see their résumé and contact details."
            />
          )}

          {openApplicant && (
            <StudentProfileModal
              userId={openApplicant.studentId}
              onClose={() => setOpenApplicant(null)}
              match={
                openApplicant.matchPercentage != null
                  ? {
                      matchPercentage: openApplicant.matchPercentage,
                      matchedSkills: openApplicant.matchedSkills || [],
                      missingSkills: openApplicant.missingSkills || [],
                      jobTitle: openApplicant.jobTitle,
                    }
                  : null
              }
            />
          )}

          {loading && (
            <p className="mt-4 flex items-center gap-2 text-xs text-slate-400">

              <Clock size={14} />

              Syncing with SkillBridge backend…

            </p>

          )}

          <footer className="mt-8 flex items-center justify-between gap-5 overflow-x-auto rounded-2xl bg-white px-5 py-4 shadow-sm md:hidden">

            {menu.map(({ label, icon: Icon }) => (

              <button

                key={label}

                type="button"

                onClick={() => setActiveTab(label)}

                className={`flex shrink-0 flex-col items-center gap-1 text-xs font-semibold ${
                  activeTab === label ? 'text-blue-700' : 'text-slate-500'
                }`}

              >

                <Icon size={20} />

                {label}

              </button>

            ))}

            <button

              type="button"

              onClick={onLogout}

              className="flex flex-col items-center gap-1 text-xs font-semibold text-red-600"

            >

              <LogOut size={20} />

              Logout

            </button>

          </footer>

        </main>

      </div>

    </div>

  )

}
