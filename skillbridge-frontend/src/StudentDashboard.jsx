

import { useCallback, useEffect, useState } from 'react'

import {

  GraduationCap,

  LayoutDashboard,

  BriefcaseBusiness,

  FileText,

  UserRound,

  Search,

  Bell,

  MapPin,

  Clock,

  ArrowUpRight,

  LogOut,

  LoaderCircle,

  X,
  CheckCircle2,
  Sparkles,
  Users,
  UserPlus,
  MessagesSquare,
  CalendarDays,
} from 'lucide-react'
import { api } from './lib/api.js'
import { WITHDRAWABLE_STATUSES, formatDate } from './lib/format.js'
import { ApplicationStatusPill, MatchBadge, SkillChips } from './components/ui.jsx'
import TagInput from './components/TagInput.jsx'
import RecommendedJobs from './student/RecommendedJobs.jsx'
import JobMatchSummary from './student/JobMatchSummary.jsx'
import ResumeUpload from './student/ResumeUpload.jsx'
import ConnectionsPanel from './student/ConnectionsPanel.jsx'
import DiscoverStudents from './shared/DiscoverStudents.jsx'
import CommunityFeed from './shared/CommunityFeed.jsx'



const API = import.meta.env.VITE_API_URL || 'https://skillbridge-2jeh.onrender.com';



export default function StudentDashboard({ onLogout }) {

  const [jobs, setJobs] = useState([])

  const [applications, setApplications] = useState([])

  const [search, setSearch] = useState('')

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState('')

  const [activeTab, setActiveTab] = useState('Overview')

  const emptyProfile = {
    phone: '',
    college: '',
    degree: '',
    branch: '',
    graduationYear: '',
    resumeUrl: '',
    githubUrl: '',
    linkedinUrl: '',
    portfolioUrl: '',
    bio: '',
    headline: '',
    location: '',
    careerGoals: '',
    skills: [],
    interests: [],
  }
  const [profile, setProfile] = useState(emptyProfile)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileError, setProfileError] = useState('')
  const [profileMessage, setProfileMessage] = useState('')



  const [selectedJob, setSelectedJob] = useState(null)

  const [coverLetter, setCoverLetter] = useState('')

  const [applying, setApplying] = useState(false)

  const [applicationMessage, setApplicationMessage] = useState('')

  const [applicationError, setApplicationError] = useState('')
  // jobId -> match % for open jobs that match the student's skills
  const [matchByJobId, setMatchByJobId] = useState({})
  // Bumped after profile/résumé changes so recommendations reload
  const [skillsVersion, setSkillsVersion] = useState(0)
  const [pendingRequests, setPendingRequests] = useState(0)
  const [withdrawingId, setWithdrawingId] = useState(null)



  const token = localStorage.getItem('skillbridgeToken')

  const email = localStorage.getItem('skillbridgeEmail') || ''

  const savedName = localStorage.getItem('skillbridgeName')

  const name = savedName || (email ? email.split('@')[0] : 'Student')



  const loadDashboard = useCallback(async () => {

    if (!token) {

      setError('Your login session is missing. Please sign in again.')

      setLoading(false)

      return

    }



    setLoading(true)

    setError('')



    try {

      const headers = {

        Authorization: `Bearer ${token}`,

      }



      const [jobResponse, applicationResponse] = await Promise.all([

        fetch(`${API}/api/jobs`, { headers }),

        fetch(`${API}/api/applications/my-applications`, { headers }),

      ])



      if (jobResponse.status === 401 || applicationResponse.status === 401) {

        throw new Error('Your session has expired. Please sign in again.')

      }



      if (!jobResponse.ok) {

        throw new Error('Unable to load jobs. Please try again.')

      }



      if (!applicationResponse.ok) {

        throw new Error('Unable to load your applications. Please try again.')

      }



      const [jobData, applicationData] = await Promise.all([

        jobResponse.json(),

        applicationResponse.json(),

      ])



      setJobs(Array.isArray(jobData) ? jobData : jobData ? [jobData] : [])

      setApplications(

        Array.isArray(applicationData)

          ? applicationData

          : applicationData

            ? [applicationData]

            : [],

      )

    } catch (err) {

      setError(

        err.message === 'Failed to fetch'

          ? 'Cannot connect to the backend. Check that Spring Boot is running.'

          : err.message,

      )

    } finally {

      setLoading(false)

    }

  }, [token])



  async function loadProfile() {
    if (!token) {
      setProfileError('Your login session is missing. Please sign in again.')
      return
    }

    setProfileLoading(true)
    setProfileError('')
    setProfileMessage('')

    try {
      const response = await fetch(`${API}/api/student/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data.message || data.error || `Unable to load profile (status ${response.status}).`,
        )
      }

      setProfile({
        ...emptyProfile,
        ...data,
        graduationYear: data.graduationYear ?? '',
      })
    } catch (err) {
      setProfileError(
        err.message === 'Failed to fetch'
          ? 'Cannot connect to the backend. Check that Spring Boot is running.'
          : err.message,
      )
    } finally {
      setProfileLoading(false)
    }
  }

  async function handleSaveProfile(event) {
    event.preventDefault()

    if (!token) {
      setProfileError('Your login session is missing. Please sign in again.')
      return
    }

    setProfileSaving(true)
    setProfileError('')
    setProfileMessage('')

    try {
      const payload = {
        ...profile,
        graduationYear:
          profile.graduationYear === '' ? null : Number(profile.graduationYear),
      }

      const response = await fetch(`${API}/api/student/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      })
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          data.message || data.error || `Unable to save profile (status ${response.status}).`,
        )
      }

      setProfile({
        ...emptyProfile,
        ...data,
        graduationYear: data.graduationYear ?? '',
      })
      setProfileMessage('Your profile has been saved successfully!')
      setSkillsVersion((version) => version + 1)
    } catch (err) {
      setProfileError(
        err.message === 'Failed to fetch'
          ? 'Cannot connect to the backend. Please try again.'
          : err.message,
      )
    } finally {
      setProfileSaving(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    api('/api/student/recommendations?limit=50')
      .then((items) =>
        setMatchByJobId(
          Object.fromEntries(items.map((item) => [item.job.id, item.matchPercentage])),
        ),
      )
      .catch(() => setMatchByJobId({}))
  }, [skillsVersion, applications.length])

  const loadPendingRequests = useCallback(() => {
    api('/api/connections/requests/incoming')
      .then((requests) => setPendingRequests(requests.length))
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadPendingRequests()
  }, [loadPendingRequests])

  useEffect(() => {
    if (activeTab === 'My Profile') {
      loadProfile()
    }
    // Load the profile whenever the student opens the profile tab.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])



  const appliedJobIds = new Set(

    applications.map((application) => Number(application.jobId)),

  )



  const filteredJobs = jobs.filter((job) => {

    const searchableText = [

      job.title,

      job.companyName,

      job.location,

      job.jobType,

      job.requiredSkills,

    ]

      .filter(Boolean)

      .join(' ')

      .toLowerCase()



    return searchableText.includes(search.trim().toLowerCase())

  })



  const shortlistedCount = applications.filter(

    (application) => application.status === 'SHORTLISTED',

  ).length



  const menu = [
    { label: 'Overview', icon: LayoutDashboard },
    { label: 'Recommended', icon: Sparkles },
    { label: 'Find Jobs', icon: Search },
    { label: 'My Applications', icon: FileText },
    { label: 'My Profile', icon: UserRound },
    { label: 'Discover', icon: Users },
    { label: 'Connections', icon: UserPlus, badge: pendingRequests },
    { label: 'Community', icon: MessagesSquare },
  ]

  function openApply(job) {
    setSelectedJob(job)
    setCoverLetter('')
    setApplicationError('')
    setApplicationMessage('')
  }

  async function handleWithdraw(application) {
    if (!window.confirm(`Withdraw your application for ${application.jobTitle}?`)) return
    setWithdrawingId(application.id)
    setError('')
    try {
      const updated = await api(`/api/applications/${application.id}/withdraw`, { method: 'PATCH' })
      setApplications((previous) =>
        previous.map((item) => (item.id === updated.id ? updated : item)),
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setWithdrawingId(null)
    }
  }



  async function handleApply(event) {

    event.preventDefault()



    if (!selectedJob || !coverLetter.trim()) return



    setApplying(true)

    setApplicationMessage('')

    setApplicationError('')



    try {

      const response = await fetch(`${API}/api/applications`, {

        method: 'POST',

        headers: {

          'Content-Type': 'application/json',

          Authorization: `Bearer ${token}`,

        },

        body: JSON.stringify({

          jobId: selectedJob.id,

          coverLetter: coverLetter.trim(),

        }),

      })



      const data = await response.json().catch(() => ({}))



      if (!response.ok) {

        throw new Error(

          data.message ||

            data.error ||

            `Application failed with status ${response.status}.`,

        )

      }



      setApplicationMessage('Application submitted successfully!')

      setCoverLetter('')



      // Refresh the job list and application history from the backend.

      await loadDashboard()

      setSelectedJob(null)

      setActiveTab('My Applications')

    } catch (err) {

      setApplicationError(

        err.message === 'Failed to fetch'

          ? 'Cannot connect to the backend. Please try again.'

          : err.message,

      )

    } finally {

      setApplying(false)

    }

  }



  return (

    <div className="min-h-screen bg-[#edf3fb] text-slate-800">

      <div className="flex min-h-screen">

        {/* Sidebar */}

        <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white px-5 py-7 md:flex">

          <div className="mb-10 flex items-center gap-3 px-2">

            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">

              <GraduationCap size={23} />

            </span>

            <span className="text-xl font-extrabold tracking-tight">

              SkillBridge

            </span>

          </div>



          <p className="mb-4 px-3 text-xs font-bold uppercase tracking-widest text-slate-400">

            Student portal

          </p>



          <nav className="space-y-2">

            {menu.map(({ label, icon: Icon, badge }) => (
              <button
                key={label}
                type="button"
                onClick={() => setActiveTab(label)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                  activeTab === label
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                }`}
              >
                <Icon size={19} />
                {label}
                {badge > 0 && (
                  <span className="ml-auto rounded-full bg-blue-600 px-2 py-0.5 text-[11px] font-bold text-white">
                    {badge}
                  </span>
                )}
              </button>
            ))}

          </nav>



          <div className="mt-auto rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 p-4 text-white">

            <p className="font-bold">Your next opportunity awaits!</p>

            <p className="mt-2 text-xs leading-5 text-blue-100">

              Keep exploring internships and growing your career.

            </p>

          </div>



          <button

            type="button"

            onClick={onLogout}

            className="mt-5 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-slate-500 hover:bg-red-50 hover:text-red-600"

          >

            <LogOut size={19} />

            Logout

          </button>

        </aside>



        {/* Main dashboard */}

        <main className="min-w-0 flex-1 p-4 sm:p-7 lg:p-9">

          {/* Header */}

          <header className="mb-8 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-white px-5 py-4 shadow-sm sm:px-7">

            <div>

              <p className="text-sm text-slate-400">

                Student Portal / {activeTab}

              </p>

              <h1 className="mt-1 text-xl font-extrabold sm:text-2xl">

                {activeTab}

              </h1>

            </div>



            <div className="flex items-center gap-4">

              <button

                type="button"

                aria-label="Notifications"

                className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100"

              >

                <Bell size={20} />

                {applications.some(

                  (application) => application.status === 'SHORTLISTED',

                ) && (

                  <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-blue-500" />

                )}

              </button>



              <div className="flex items-center gap-3 border-l border-slate-200 pl-4">

                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">

                  {name.charAt(0).toUpperCase()}

                </div>

                <div className="hidden sm:block">

                  <p className="text-sm font-bold">{name}</p>

                  <p className="text-xs text-slate-400">Student</p>

                </div>

              </div>

            </div>

          </header>



          <nav className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden" aria-label="Student sections">
            {menu.map(({ label, icon: Icon, badge }) => (
              <button
                key={label}
                type="button"
                onClick={() => setActiveTab(label)}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold ${
                  activeTab === label ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'
                }`}
              >
                <Icon size={15} />
                {label}
                {badge > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[10px] text-white">{badge}</span>}
              </button>
            ))}
            <button
              type="button"
              onClick={onLogout}
              className="flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2 text-xs font-bold text-red-600"
            >
              <LogOut size={15} />
              Logout
            </button>
          </nav>

          {error && (
            <div
              role="alert"
              className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-50 p-4 text-sm text-red-700"
            >

              <span>{error}</span>

              <button

                type="button"

                onClick={loadDashboard}

                className="font-bold underline"

              >

                Retry

              </button>

            </div>

          )}



          {loading ? (

            <div className="flex items-center justify-center gap-3 py-24 text-slate-500">

              <LoaderCircle className="animate-spin" size={22} />

              Loading your dashboard...

            </div>

          ) : (

            <>

              {/* Overview welcome banner */}

              {activeTab === 'Overview' && (

                <section className="mb-8 rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 p-7 text-white shadow-lg sm:p-9">

                  <p className="text-sm font-medium text-blue-100">

                    YOUR CAREER JOURNEY STARTS HERE

                  </p>

                  <h2 className="mt-3 text-3xl font-extrabold leading-tight sm:text-4xl">

                    Welcome back, {name}!

                  </h2>

                  <p className="mt-3 max-w-xl text-sm leading-6 text-blue-100 sm:text-base">

                    Discover opportunities, apply for internships, and follow

                    your progress toward your dream career.

                  </p>

                  <button

                    type="button"

                    onClick={() => setActiveTab('Find Jobs')}

                    className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-50"

                  >

                    Explore jobs <ArrowUpRight size={17} />
                  </button>
                </section>
              )}

              {activeTab === 'Overview' && (
                <RecommendedJobs
                  compact
                  limit={3}
                  refreshKey={skillsVersion}
                  onApply={openApply}
                  onGoToProfile={() => setActiveTab('My Profile')}
                />
              )}

              {activeTab === 'Recommended' && (
                <RecommendedJobs
                  limit={20}
                  refreshKey={`${skillsVersion}-${applications.length}`}
                  onApply={openApply}
                  onGoToProfile={() => setActiveTab('My Profile')}
                />
              )}

              {activeTab === 'Discover' && (
                <DiscoverStudents
                  text="Find classmates and peers by name, college, skills or interests, and grow your network."
                  onConnectionChange={loadPendingRequests}
                />
              )}

              {activeTab === 'Connections' && (
                <ConnectionsPanel
                  onChange={loadPendingRequests}
                  onDiscover={() => setActiveTab('Discover')}
                />
              )}

              {activeTab === 'Community' && <CommunityFeed />}



              {/* Summary cards */}

              {(activeTab === 'Overview' || activeTab === 'Find Jobs') && (

                  <section className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">

                    {[

                      {

                        label: 'Available Jobs',

                        value: jobs.filter((job) => job.status === 'OPEN').length,

                        icon: BriefcaseBusiness,

                        color: 'bg-blue-50 text-blue-700',

                      },

                      {

                        label: 'Applications Sent',

                        value: applications.length,

                        icon: FileText,

                        color: 'bg-violet-50 text-violet-700',

                      },

                      {

                        label: 'Shortlisted',

                        value: shortlistedCount,

                        icon: GraduationCap,

                        color: 'bg-emerald-50 text-emerald-700',

                      },

                    ].map(({ label, value, icon: Icon, color }) => (

                      <article

                        key={label}

                        className="rounded-2xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"

                      >

                        <div

                          className={`mb-5 flex h-12 w-12 items-center justify-center rounded-xl ${color}`}

                        >

                          <Icon size={23} />

                        </div>

                        <p className="text-sm font-medium text-slate-500">

                          {label}

                        </p>

                        <p className="mt-2 text-3xl font-extrabold">{value}</p>

                      </article>

                    ))}

                  </section>

                )}



              {/* Jobs list */}

              {(activeTab === 'Overview' || activeTab === 'Find Jobs') && (

                <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-7">

                  <div className="mb-6 flex flex-wrap items-center justify-between gap-4">

                    <div>

                      <h2 className="text-lg font-extrabold">

                        {activeTab === 'Find Jobs'

                          ? 'Find your next opportunity'

                          : 'Explore opportunities'}

                      </h2>

                      <p className="mt-1 text-sm text-slate-500">

                        Search internships and discover your next step.

                      </p>

                    </div>



                    <label className="flex w-full items-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 sm:w-72">

                      <Search size={18} className="shrink-0 text-slate-400" />

                      <input

                        value={search}

                        onChange={(event) => setSearch(event.target.value)}

                        placeholder="Search jobs, companies, skills..."

                        className="w-full min-w-0 bg-transparent text-sm outline-none"

                      />

                    </label>

                  </div>



                  {filteredJobs.length === 0 ? (

                    <div className="py-12 text-center">

                      <BriefcaseBusiness

                        size={35}

                        className="mx-auto mb-3 text-slate-300"

                      />

                      <p className="font-semibold text-slate-600">

                        No matching jobs found

                      </p>

                      <p className="mt-1 text-sm text-slate-400">

                        Try another title, company, location, or skill.

                      </p>

                    </div>

                  ) : (

                    <div className="grid gap-5 xl:grid-cols-2">

                      {(activeTab === 'Overview' ? filteredJobs.slice(0, 6) : filteredJobs).map((job) => {

                        const alreadyApplied = appliedJobIds.has(Number(job.id))
                        const isOpen = job.acceptingApplications ?? job.status === 'OPEN'



                        return (

                          <article

                            key={job.id}

                            className="rounded-xl border border-slate-100 p-5 transition hover:border-blue-200 hover:shadow-md"

                          >

                            <div className="flex items-start justify-between gap-3">

                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">

                                <BriefcaseBusiness size={21} />

                              </div>

                              <div className="flex flex-wrap justify-end gap-2">
                                {!alreadyApplied && <MatchBadge percentage={matchByJobId[job.id]} />}
                                <span
                                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                                    isOpen
                                      ? 'bg-emerald-50 text-emerald-700'
                                      : 'bg-slate-100 text-slate-500'
                                  }`}
                                >
                                  {isOpen ? 'OPEN' : job.expired ? 'EXPIRED' : job.status}
                                </span>
                              </div>
                            </div>



                            <h3 className="mt-4 text-base font-bold">

                              {job.title}

                            </h3>

                            <p className="mt-1 text-sm text-slate-500">

                              {job.companyName}

                            </p>



                            <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-500">

                              <span className="flex items-center gap-1.5">

                                <MapPin size={14} />

                                {job.location || 'Location not specified'}

                              </span>

                              <span className="flex items-center gap-1.5">

                                <Clock size={14} />

                                {(job.jobType || 'JOB').replaceAll('\_', ' ')}

                              </span>

                            </div>



                            {job.applicationDeadline && (
                              <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                                <CalendarDays size={14} />
                                Apply by {formatDate(job.applicationDeadline)}
                              </p>
                            )}
                            {job.skills?.length > 0 && (
                              <div className="mt-3">
                                <SkillChips skills={job.skills} tone="neutral" max={6} />
                              </div>
                            )}



                            {job.salary != null && (

                              <p className="mt-4 text-sm font-bold text-slate-700">

                                ₹{Number(job.salary).toLocaleString('en-IN')}

                              </p>

                            )}



                            <div className="mt-5 border-t border-slate-100 pt-4">

                              {alreadyApplied ? (

                                <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700">

                                  <CheckCircle2 size={17} />

                                  Application submitted

                                </span>

                              ) : (

                                <button
                                  type="button"
                                  disabled={!isOpen}
                                  onClick={() => openApply(job)}
                                  className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                                >
                                  {isOpen ? 'View & apply' : 'Applications Closed'}
                                </button>

                              )}

                            </div>

                          </article>

                        )

                      })}

                    </div>

                  )}

                </section>

              )}



              {/* Application history */}

              {activeTab === 'My Applications' && (

                <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-7">

                  <div className="mb-6">

                    <h2 className="text-lg font-extrabold">

                      My Applications

                    </h2>

                    <p className="mt-1 text-sm text-slate-500">

                      Track the progress of your internship applications.

                    </p>

                  </div>



                  {applications.length === 0 ? (

                    <div className="py-12 text-center">

                      <FileText

                        size={35}

                        className="mx-auto mb-3 text-slate-300"

                      />

                      <p className="font-semibold text-slate-600">

                        No applications yet

                      </p>

                      <button

                        type="button"

                        onClick={() => setActiveTab('Find Jobs')}

                        className="mt-4 rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700"

                      >

                        Browse jobs

                      </button>

                    </div>

                  ) : (

                    <div className="space-y-4">

                      {applications.map((application) => (

                        <article

                          key={application.id}

                          className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-100 p-5"

                        >

                          <div>

                            <h3 className="font-bold">

                              {application.jobTitle}

                            </h3>

                            <p className="mt-1 text-sm text-slate-500">

                              {application.companyName}

                            </p>

                            {application.appliedAt && (

                              <p className="mt-2 text-xs text-slate-400">

                                Applied on{' '}

                                {new Date(application.appliedAt).toLocaleDateString()}

                              </p>

                            )}

                          </div>



                          <div className="flex flex-wrap items-center gap-3">
                            <ApplicationStatusPill status={application.status} />
                            {WITHDRAWABLE_STATUSES.includes(application.status) && (
                              <button
                                type="button"
                                disabled={withdrawingId === application.id}
                                onClick={() => handleWithdraw(application)}
                                className="rounded-lg px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                              >
                                {withdrawingId === application.id ? 'Withdrawing...' : 'Withdraw'}
                              </button>
                            )}
                          </div>

                        </article>

                      ))}

                    </div>

                  )}

                </section>

              )}



              {/* Student profile editor */}
              {activeTab === 'My Profile' && (
                <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-8">
                  <div className="mb-8 flex items-center gap-4">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><UserRound size={30} /></div>
                    <div><h2 className="text-xl font-extrabold">{name}</h2><p className="mt-1 text-sm text-slate-500">{email}</p><p className="mt-1 text-xs text-blue-600">Student profile</p></div>
                  </div>
                  {!profileLoading && (
                    <div className="mb-8 rounded-xl bg-slate-50 p-4">
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-semibold text-slate-600">Profile completeness</span>
                        <span className="font-bold text-blue-700">{profile.profileCompletion ?? 0}%</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-white">
                        <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${profile.profileCompletion ?? 0}%` }} />
                      </div>
                      <p className="mt-2 text-xs text-slate-500">A complete profile with skills gets you better internship recommendations.</p>
                    </div>
                  )}
                  {profileLoading ? (
                    <div className="flex items-center justify-center gap-3 py-16 text-slate-500"><LoaderCircle size={22} className="animate-spin" />Loading your profile...</div>
                  ) : (
                    <form onSubmit={handleSaveProfile} className="space-y-8">
                      <ResumeUpload
                        profile={profile}
                        onProfileUpdated={(updated) => {
                          setProfile({ ...emptyProfile, ...updated, graduationYear: updated.graduationYear ?? '' })
                          setSkillsVersion((version) => version + 1)
                        }}
                      />
                      <div className="border-t border-slate-100 pt-7">
                        <h3 className="text-lg font-bold">Skills & interests</h3>
                        <p className="mt-1 text-sm text-slate-500">Skills power your job matches. Press Enter or comma after each one.</p>
                        <label className="mt-5 block text-sm font-semibold">Skills
                          <TagInput values={profile.skills || []} onChange={(skills) => setProfile({ ...profile, skills })} placeholder="e.g. Java, React, SQL" />
                        </label>
                        <label className="mt-5 block text-sm font-semibold">Interests
                          <TagInput tone="violet" values={profile.interests || []} onChange={(interests) => setProfile({ ...profile, interests })} placeholder="e.g. Web development, AI, Hackathons" />
                        </label>
                      </div>
                      <div className="border-t border-slate-100 pt-7">
                        <h3 className="text-lg font-bold">Career information</h3>
                        <div className="mt-5 grid gap-5 sm:grid-cols-2">
                          <label className="block text-sm font-semibold">Headline<input maxLength={255} value={profile.headline || ''} onChange={(e) => setProfile({ ...profile, headline: e.target.value })} placeholder="e.g. Aspiring full-stack developer" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" /></label>
                          <label className="block text-sm font-semibold">Location<input maxLength={255} value={profile.location || ''} onChange={(e) => setProfile({ ...profile, location: e.target.value })} placeholder="e.g. Hyderabad" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" /></label>
                        </div>
                        <label className="mt-5 block text-sm font-semibold">Career goals<textarea rows={3} maxLength={1000} value={profile.careerGoals || ''} onChange={(e) => setProfile({ ...profile, careerGoals: e.target.value })} placeholder="What kind of roles and companies are you aiming for?" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" /></label>
                      </div>
                      <div className="border-t border-slate-100 pt-7">
                      <div>
                        <h3 className="text-lg font-bold">Personal information</h3>
                        <p className="mt-1 text-sm text-slate-500">Add your contact details and a short introduction.</p>
                        <div className="mt-5 grid gap-5 sm:grid-cols-2">
                          <label className="block text-sm font-semibold">Full name<input value={name} readOnly className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-normal text-slate-500" /><span className="mt-1 block text-xs font-normal text-slate-400">Your account name is managed separately.</span></label>
                          <label className="block text-sm font-semibold">Email address<input type="email" value={email} readOnly className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-normal text-slate-500" /></label>
                          <label className="block text-sm font-semibold">Phone number<input type="tel" value={profile.phone || ''} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="Enter phone number" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" /></label>
                          <label className="block text-sm font-semibold">College / University<input value={profile.college || ''} onChange={(e) => setProfile({ ...profile, college: e.target.value })} placeholder="Enter your college" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" /></label>
                        </div>
                        <label className="mt-5 block text-sm font-semibold">About me<textarea rows={4} maxLength={2000} value={profile.bio || ''} onChange={(e) => setProfile({ ...profile, bio: e.target.value })} placeholder="Introduce yourself, your interests, and your career goals..." className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" /><span className="mt-1 block text-right text-xs font-normal text-slate-400">{(profile.bio || '').length}/2000 characters</span></label>
                      </div>
                      </div>
                      <div className="border-t border-slate-100 pt-7">
                        <h3 className="text-lg font-bold">Academic information</h3>
                        <div className="mt-5 grid gap-5 sm:grid-cols-2">
                          <label className="block text-sm font-semibold">Degree<input value={profile.degree || ''} onChange={(e) => setProfile({ ...profile, degree: e.target.value })} placeholder="e.g. B.Tech" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" /></label>
                          <label className="block text-sm font-semibold">Branch / Specialization<input value={profile.branch || ''} onChange={(e) => setProfile({ ...profile, branch: e.target.value })} placeholder="e.g. Computer Science and Engineering" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" /></label>
                          <label className="block text-sm font-semibold sm:col-span-2">Graduation year<input type="number" min="2000" max="2100" value={profile.graduationYear} onChange={(e) => setProfile({ ...profile, graduationYear: e.target.value })} placeholder="e.g. 2027" className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 sm:max-w-md" /></label>
                        </div>
                      </div>
                      <div className="border-t border-slate-100 pt-7">
                        <h3 className="text-lg font-bold">Professional links</h3><p className="mt-1 text-sm text-slate-500">Help recruiters learn more about your work.</p>
                        <div className="mt-5 grid gap-5 sm:grid-cols-2">
                          {[{ key: 'githubUrl', label: 'GitHub URL', placeholder: 'https://github.com/username' }, { key: 'linkedinUrl', label: 'LinkedIn URL', placeholder: 'https://linkedin.com/in/username' }, { key: 'portfolioUrl', label: 'Portfolio URL', placeholder: 'https://yourportfolio.com' }].map(({ key, label, placeholder }) => (
                            <label key={key} className="block text-sm font-semibold">{label}<input type="url" value={profile[key] || ''} onChange={(e) => setProfile({ ...profile, [key]: e.target.value })} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 font-normal outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50" /></label>
                          ))}
                        </div>
                      </div>
                      {profileError && <div role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{profileError}<button type="button" onClick={loadProfile} className="ml-2 font-bold underline">Retry</button></div>}
                      {profileMessage && <div role="status" className="flex items-center gap-2 rounded-xl bg-emerald-50 p-4 text-sm font-medium text-emerald-700"><CheckCircle2 size={18} />{profileMessage}</div>}
                      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-100 pt-6">
                        <button type="button" onClick={loadProfile} disabled={profileSaving} className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Reload profile</button>
                        <button type="submit" disabled={profileSaving} className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{profileSaving && <LoaderCircle size={17} className="animate-spin" />}{profileSaving ? 'Saving...' : 'Save Changes'}</button>
                      </div>
                    </form>
                  )}
                </section>
              )}

            </>

          )}

        </main>

      </div>



      {/* Application modal */}

      {selectedJob && (

        <div

          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"

          onMouseDown={(event) => {

            if (event.target === event.currentTarget && !applying) {

              setSelectedJob(null)

            }

          }}

        >

          <section

            role="dialog"

            aria-modal="true"

            aria-labelledby="apply-title"

            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl sm:p-8"

          >

            <div className="flex items-start justify-between gap-4">

              <div>

                <h2

                  id="apply-title"

                  className="text-2xl font-extrabold text-slate-900"

                >

                  Apply for internship

                </h2>

                <p className="mt-2 text-sm text-slate-500">
                  {selectedJob.title} · {selectedJob.companyName}
                </p>
              </div>



              <button

                type="button"

                aria-label="Close application form"

                disabled={applying}

                onClick={() => setSelectedJob(null)}

                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"

              >

                <X size={20} />

              </button>

            </div>



            <div className="mt-5 space-y-4">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><MapPin size={14} />{selectedJob.location || 'Location not specified'}</span>
                <span className="flex items-center gap-1.5"><Clock size={14} />{(selectedJob.jobType || 'JOB').replaceAll('_', ' ')}</span>
                {selectedJob.applicationDeadline && (
                  <span className="flex items-center gap-1.5"><CalendarDays size={14} />Apply by {formatDate(selectedJob.applicationDeadline)}</span>
                )}
                {selectedJob.salary != null && (
                  <span className="font-semibold text-slate-700">₹{Number(selectedJob.salary).toLocaleString('en-IN')}</span>
                )}
              </div>
              {selectedJob.description && (
                <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-sm leading-6 text-slate-600">{selectedJob.description}</p>
              )}
              <JobMatchSummary jobId={selectedJob.id} />
            </div>
            <form onSubmit={handleApply} className="mt-6 space-y-4">

              <label

                htmlFor="coverLetter"

                className="block text-sm font-semibold text-slate-700"

              >

                Cover letter

              </label>



              <textarea

                id="coverLetter"

                required

                maxLength={2000}

                rows={6}

                value={coverLetter}

                onChange={(event) => setCoverLetter(event.target.value)}

                placeholder="Tell the recruiter why you're a good fit for this role..."

                className="w-full resize-y rounded-xl border border-slate-200 p-4 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"

              />



              <p className="text-right text-xs text-slate-400">

                {coverLetter.length}/2000 characters

              </p>



              {applicationError && (

                <p

                  role="alert"

                  className="rounded-lg bg-red-50 p-3 text-sm text-red-700"

                >

                  {applicationError}

                </p>

              )}



              {applicationMessage && (

                <p

                  role="status"

                  className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700"

                >

                  {applicationMessage}

                </p>

              )}



              <div className="flex gap-3 pt-2">

                <button

                  type="button"

                  disabled={applying}

                  onClick={() => setSelectedJob(null)}

                  className="flex-1 rounded-xl border border-slate-200 px-4 py-3 font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"

                >

                  Cancel

                </button>



                <button

                  type="submit"

                  disabled={applying || !coverLetter.trim()}

                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"

                >

                  {applying && <LoaderCircle size={17} className="animate-spin" />}

                  {applying ? 'Submitting...' : 'Submit application'}

                </button>

              </div>

            </form>

          </section>

        </div>

      )}

    </div>

  )

}
