

import { useCallback, useEffect, useMemo, useState } from 'react'

import {

  LayoutDashboard,

  Users,

  GraduationCap,

  BriefcaseBusiness,

  ShieldCheck,

  Search,

  RefreshCw,

  LogOut,

  Menu,

  X,

  ChevronRight,

  AlertCircle,

  UserRound,

  Mail,

  TrendingUp,

  MapPin,

  CalendarDays,

  IndianRupee,

  Clock,

  Building2,

  FileText,
  ClipboardList,
  MessagesSquare,
  Trash2,
  Ban,
  CheckCircle2,
  Network,
} from 'lucide-react'
import { api } from './lib/api.js'
import CommunityFeed from './shared/CommunityFeed.jsx'
import StudentProfileModal from './shared/StudentProfileModal.jsx'



const API = 'http://localhost:8080'



const navigation = [

  { label: 'Overview', icon: LayoutDashboard },

  { label: 'All Users', icon: Users },

  { label: 'Students', icon: GraduationCap },

  { label: 'Recruiters', icon: BriefcaseBusiness },

  { label: 'Admins', icon: ShieldCheck },

  { label: 'Jobs', icon: BriefcaseBusiness },

  { label: 'Applications', icon: ClipboardList },
  { label: 'Community', icon: MessagesSquare },
]



const roleColors = {

  STUDENT: 'bg-blue-50 text-blue-700 ring-blue-100',

  RECRUITER: 'bg-purple-50 text-purple-700 ring-purple-100',

  ADMIN: 'bg-amber-50 text-amber-700 ring-amber-100',

}



const jobStatusColors = {

  OPEN: 'bg-emerald-50 text-emerald-700 ring-emerald-100',

  CLOSED: 'bg-red-50 text-red-700 ring-red-100',

  EXPIRED: 'bg-amber-50 text-amber-700 ring-amber-100',

}



const applicationStatusColors = {
  APPLIED: 'bg-blue-50 text-blue-700 ring-blue-100',
  UNDER_REVIEW: 'bg-amber-50 text-amber-700 ring-amber-100',
  SHORTLISTED: 'bg-purple-50 text-purple-700 ring-purple-100',
  REJECTED: 'bg-red-50 text-red-700 ring-red-100',
  SELECTED: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  WITHDRAWN: 'bg-slate-100 text-slate-600 ring-slate-200',
}

function formatDateTime(value) {
  if (!value) return 'Not specified'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function normalizeUsers(data) {

  if (Array.isArray(data)) return data

  if (Array.isArray(data?.users)) return data.users

  return []

}



function normalizeJobs(data) {

  if (Array.isArray(data)) return data

  if (Array.isArray(data?.jobs)) return data.jobs

  return []

}



function getUserRole(user) {

  return String(user?.role || '')

    .replace('ROLE_', '')

    .toUpperCase()

}



function formatDate(value) {

  if (!value) return 'Not specified'



  const date = new Date(`${value}`.slice(0, 10) + 'T00:00:00')



  if (Number.isNaN(date.getTime())) return value



  return date.toLocaleDateString('en-IN', {

    day: 'numeric',

    month: 'short',

    year: 'numeric',

  })

}



function formatSalary(value) {

  if (value === null || value === undefined || value === '') {

    return 'Not specified'

  }



  const amount = Number(value)



  if (Number.isNaN(amount)) return String(value)



  return `₹${amount.toLocaleString('en-IN')}`

}



function StatCard({ label, value, icon: Icon, color, description }) {

  return (

    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">

      <div className="flex items-start justify-between gap-3">

        <div>

          <p className="text-sm font-medium text-slate-500">{label}</p>

          <p className="mt-3 text-3xl font-bold tracking-tight text-slate-900">

            {value ?? 0}

          </p>

        </div>



        <div className={`rounded-xl p-3 ${color}`}>

          <Icon size={22} />

        </div>

      </div>



      <p className="mt-4 text-xs text-slate-500">{description}</p>

    </article>

  )

}



export default function AdminDashboard({ onLogout }) {

  const [activePage, setActivePage] = useState('Overview')

  const [users, setUsers] = useState([])

  const [jobs, setJobs] = useState([])

  const [applications, setApplications] = useState([])

  const [stats, setStats] = useState(null)



  const [search, setSearch] = useState('')

  const [jobStatusFilter, setJobStatusFilter] = useState('ALL')
  const [applicationStatusFilter, setApplicationStatusFilter] = useState('ALL')



  const [loading, setLoading] = useState(true)

  const [refreshing, setRefreshing] = useState(false)

  const [error, setError] = useState('')

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [actionId, setActionId] = useState(null)
  const [openStudentId, setOpenStudentId] = useState(null)
  const currentEmail = (localStorage.getItem('skillbridgeEmail') || '').toLowerCase()

  async function toggleUserDisabled(user) {
    const disable = !user.disabled
    const verb = disable ? 'Disable' : 'Re-enable'
    if (!window.confirm(`${verb} ${user.name || user.email}?${disable ? ' They will be signed out and unable to log in.' : ''}`)) return
    setActionId(`user-${user.id}`)
    setError('')
    try {
      const updated = await api(`/api/admin/users/${user.id}/status`, {
        method: 'PATCH',
        body: { disabled: disable },
      })
      setUsers((previous) => previous.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)))
      setStats((previous) =>
        previous ? { ...previous, disabledUsers: (previous.disabledUsers ?? 0) + (disable ? 1 : -1) } : previous,
      )
    } catch (err) {
      setError(err.message)
    } finally {
      setActionId(null)
    }
  }

  async function deleteJob(job) {
    if (!window.confirm(`Delete "${job.title}" and all of its applications? This cannot be undone.`)) return
    setActionId(`job-${job.id}`)
    setError('')
    try {
      await api(`/api/admin/jobs/${job.id}`, { method: 'DELETE' })
      setJobs((previous) => previous.filter((item) => item.id !== job.id))
      setApplications((previous) => previous.filter((item) => item.jobId !== job.id))
    } catch (err) {
      setError(err.message)
    } finally {
      setActionId(null)
    }
  }



  const loadDashboard = useCallback(async (isRefresh = false) => {

    if (isRefresh) {

      setRefreshing(true)

    } else {

      setLoading(true)

    }



    setError('')



    try {

      const token = localStorage.getItem('skillbridgeToken')



      if (!token) {

        throw new Error('Your login session is missing. Please sign in again.')

      }



      const headers = {

        Authorization: `Bearer ${token}`,

      }



      const [statsResponse, usersResponse, jobsResponse, applicationsResponse] =
        await Promise.all([
          fetch(`${API}/api/admin/stats`, { headers }),
          fetch(`${API}/api/admin/users`, { headers }),
          fetch(`${API}/api/jobs`, { headers }),
          fetch(`${API}/api/admin/applications`, { headers }),
        ])



      if (

        [statsResponse, usersResponse, jobsResponse, applicationsResponse].some(

          (response) => response.status === 401 || response.status === 403,

        )

      ) {

        throw new Error(

          'Access denied or your session has expired. Please sign in again with your admin account.',

        )

      }



      if (
        !statsResponse.ok ||
        !usersResponse.ok ||
        !jobsResponse.ok ||
        !applicationsResponse.ok
      ) {

        throw new Error(

          'Unable to load dashboard data. Check that the backend is running and the APIs are available.',

        )

      }



      const [statsData, usersData, jobsData, applicationsData] =
        await Promise.all([
          statsResponse.json(),
          usersResponse.json(),
          jobsResponse.json(),
          applicationsResponse.json(),
        ])



      setStats(statsData)

      setUsers(normalizeUsers(usersData))

      setJobs(normalizeJobs(jobsData))
      setApplications(Array.isArray(applicationsData) ? applicationsData : [])

    } catch (err) {

      setError(

        err.message === 'Failed to fetch'

          ? 'Cannot connect to the backend. Make sure Spring Boot is running on port 8080.'

          : err.message || 'Something went wrong while loading the dashboard.',

      )

    } finally {

      setLoading(false)

      setRefreshing(false)

    }

  }, [])



  useEffect(() => {

    loadDashboard()

  }, [loadDashboard])



  const counts = useMemo(() => {

    const roleCounts = {

      STUDENT: 0,

      RECRUITER: 0,

      ADMIN: 0,

    }



    users.forEach((user) => {

      const role = getUserRole(user)



      if (Object.prototype.hasOwnProperty.call(roleCounts, role)) {

        roleCounts[role] += 1

      }

    })



    return roleCounts

  }, [users])



  const jobCounts = useMemo(() => {

    return jobs.reduce(

      (result, job) => {

        const status = String(job.status || '').toUpperCase()



        result.total += 1



        if (status === 'OPEN') result.open += 1

        else if (status === 'CLOSED') result.closed += 1

        else if (status === 'EXPIRED') result.expired += 1



        return result

      },

      { total: 0, open: 0, closed: 0, expired: 0 },

    )

  }, [jobs])

  const applicationCounts = useMemo(() => {
    const result = { total: applications.length, applied: 0, shortlisted: 0, rejected: 0, selected: 0, withdrawn: 0 }
    applications.forEach((application) => {
      const status = String(application.status || '').toUpperCase()
      if (status === 'APPLIED') result.applied += 1
      else if (status === 'SHORTLISTED') result.shortlisted += 1
      else if (status === 'REJECTED') result.rejected += 1
      else if (status === 'SELECTED') result.selected += 1
      else if (status === 'WITHDRAWN') result.withdrawn += 1
    })
    return result
  }, [applications])

  const filteredApplications = useMemo(() => {
    let result = [...applications]
    if (applicationStatusFilter !== 'ALL') {
      result = result.filter((application) => String(application.status || '').toUpperCase() === applicationStatusFilter)
    }
    const term = search.trim().toLowerCase()
    if (term) {
      result = result.filter((application) => [
        application.studentName, application.studentEmail, application.jobTitle,
        application.companyName, application.status, application.coverLetter,
        application.id, application.jobId,
      ].some((field) => String(field ?? '').toLowerCase().includes(term)))
    }
    return result
  }, [applications, search, applicationStatusFilter])

  const filteredUsers = useMemo(() => {

    let result = [...users]



    if (activePage === 'Students') {

      result = result.filter((user) => getUserRole(user) === 'STUDENT')

    } else if (activePage === 'Recruiters') {

      result = result.filter((user) => getUserRole(user) === 'RECRUITER')

    } else if (activePage === 'Admins') {

      result = result.filter((user) => getUserRole(user) === 'ADMIN')

    }



    const term = search.trim().toLowerCase()



    if (term) {

      result = result.filter((user) => {

        return (

          String(user.name || '').toLowerCase().includes(term) ||

          String(user.email || '').toLowerCase().includes(term) ||

          getUserRole(user).toLowerCase().includes(term) ||

          String(user.id ?? '').toLowerCase().includes(term)

        )

      })

    }



    return result

  }, [users, activePage, search])



  const filteredJobs = useMemo(() => {

    let result = [...jobs]



    if (jobStatusFilter !== 'ALL') {

      result = result.filter(

        (job) =>

          String(job.status || '').toUpperCase() === jobStatusFilter,

      )

    }



    const term = search.trim().toLowerCase()



    if (term) {

      result = result.filter((job) => {

        const searchableFields = [

          job.title,

          job.companyName,

          job.location,

          job.jobType,

          job.status,

          job.requiredSkills,

          job.recruiterName,

          job.recruiterEmail,

          job.id,

        ]



        return searchableFields.some((field) =>

          String(field ?? '').toLowerCase().includes(term),

        )

      })

    }



    return result

  }, [jobs, search, jobStatusFilter])



  const totalUsers = stats?.totalUsers ?? users.length

  const totalStudents = stats?.totalStudents ?? counts.STUDENT

  const totalRecruiters = stats?.totalRecruiters ?? counts.RECRUITER

  const totalAdmins = stats?.totalAdmins ?? counts.ADMIN



  function navigateTo(page) {

    setActivePage(page)

    setSearch('')

    setJobStatusFilter('ALL')

    setMobileMenuOpen(false)

  }



  function renderUserTable() {

    return (

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">

          <div>

            <h2 className="text-lg font-bold text-slate-900">

              {activePage === 'Overview'

                ? 'Recently Registered Users'

                : activePage}

            </h2>

            <p className="mt-1 text-sm text-slate-500">

              {filteredUsers.length}{' '}

              {filteredUsers.length === 1 ? 'user' : 'users'} found

            </p>

          </div>



          <div className="relative w-full sm:max-w-sm">

            <Search

              size={18}

              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"

            />

            <input

              type="search"

              value={search}

              onChange={(event) => setSearch(event.target.value)}

              placeholder="Search name, email, role or ID..."

              aria-label="Search users"

              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50"

            />

          </div>

        </div>



        {filteredUsers.length === 0 ? (

          <div className="flex flex-col items-center px-6 py-14 text-center">

            <Search size={28} className="text-slate-400" />

            <h3 className="mt-4 font-semibold text-slate-800">

              No users found

            </h3>

            <p className="mt-2 text-sm text-slate-500">

              Try another search term or choose a different section.

            </p>

            {search && (

              <button

                type="button"

                onClick={() => setSearch('')}

                className="mt-4 rounded-lg px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"

              >

                Clear search

              </button>

            )}

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full min-w-[860px] text-left text-sm">

              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">

                <tr>

                  <th className="px-6 py-4 font-semibold">User</th>

                  <th className="px-6 py-4 font-semibold">Email address</th>

                  <th className="px-6 py-4 font-semibold">Role</th>
                  <th className="px-6 py-4 font-semibold">User ID</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold">Actions</th>
                </tr>

              </thead>



              <tbody className="divide-y divide-slate-100">

                {filteredUsers.map((user) => {

                  const role = getUserRole(user)



                  return (

                    <tr

                      key={user.id ?? user.email}

                      className="transition hover:bg-slate-50"

                    >

                      <td className="px-6 py-4">

                        <div className="flex items-center gap-3">

                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 font-bold text-indigo-700">

                            {String(user.name || 'U')

                              .trim()

                              .charAt(0)

                              .toUpperCase()}

                          </div>

                          <div>

                            {role === 'STUDENT' && !user.disabled ? (
                              <button
                                type="button"
                                onClick={() => setOpenStudentId(user.id)}
                                className="text-left font-semibold text-slate-800 hover:text-indigo-700 hover:underline"
                              >
                                {user.name || 'Unnamed user'}
                              </button>
                            ) : (
                              <p className="font-semibold text-slate-800">
                                {user.name || 'Unnamed user'}
                              </p>
                            )}

                            <p className="mt-1 text-xs text-slate-400">

                              Registered account

                            </p>

                          </div>

                        </div>

                      </td>



                      <td className="px-6 py-4 text-slate-600">

                        <span className="inline-flex items-center gap-2">

                          <Mail size={15} className="text-slate-400" />

                          {user.email || 'No email'}

                        </span>

                      </td>



                      <td className="px-6 py-4">

                        <span

                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${

                            roleColors[role] ||

                            'bg-slate-100 text-slate-600 ring-slate-200'

                          }`}

                        >

                          {role || 'UNKNOWN'}

                        </span>

                      </td>



                      <td className="px-6 py-4 font-medium text-slate-500">
                        #{user.id ?? '—'}
                      </td>
                      <td className="px-6 py-4">
                        {user.disabled ? (
                          <span className="inline-flex rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 ring-1 ring-inset ring-red-100">
                            Disabled
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-100">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {String(user.email || '').toLowerCase() === currentEmail ? (
                          <span className="text-xs text-slate-400">You</span>
                        ) : (
                          <button
                            type="button"
                            disabled={actionId === `user-${user.id}`}
                            onClick={() => toggleUserDisabled(user)}
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold disabled:opacity-50 ${
                              user.disabled
                                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                : 'bg-red-50 text-red-700 hover:bg-red-100'
                            }`}
                          >
                            {user.disabled ? <CheckCircle2 size={14} /> : <Ban size={14} />}
                            {user.disabled ? 'Enable' : 'Disable'}
                          </button>
                        )}
                      </td>
                    </tr>

                  )

                })}

              </tbody>

            </table>

          </div>

        )}

      </section>

    )

  }



  function renderApplicationsTable() {
    const filters = [
      { label: 'All statuses', value: 'ALL' },
      { label: 'Applied', value: 'APPLIED' },
      { label: 'Under review', value: 'UNDER_REVIEW' },
      { label: 'Shortlisted', value: 'SHORTLISTED' },
      { label: 'Rejected', value: 'REJECTED' },
      { label: 'Selected', value: 'SELECTED' },
      { label: 'Withdrawn', value: 'WITHDRAWN' },
    ]

    return (
      <div className="space-y-6">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { label: 'Total Applications', value: applicationCounts.total, icon: ClipboardList, color: 'bg-indigo-50 text-indigo-600' },
            { label: 'Applied', value: applicationCounts.applied, icon: FileText, color: 'bg-blue-50 text-blue-600' },
            { label: 'Shortlisted', value: applicationCounts.shortlisted, icon: UserRound, color: 'bg-purple-50 text-purple-600' },
            { label: 'Selected', value: applicationCounts.selected, icon: ShieldCheck, color: 'bg-emerald-50 text-emerald-600' },
          ].map((card) => (
            <StatCard key={card.label} {...card} description="Based on application records" />
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="space-y-4 border-b border-slate-200 p-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">All Job Applications</h2>
              <p className="mt-1 text-sm text-slate-500">
                Showing {filteredApplications.length} of {applications.length} applications
              </p>
            </div>

            <div className="relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search student, email, job, company..."
                aria-label="Search applications"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {filters.map((filter) => (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setApplicationStatusFilter(filter.value)}
                  className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    applicationStatusFilter === filter.value
                      ? 'bg-indigo-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </div>

          {filteredApplications.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <ClipboardList size={32} className="mx-auto text-slate-400" />
              <h3 className="mt-4 font-semibold text-slate-800">No applications found</h3>
              <p className="mt-2 text-sm text-slate-500">
                Try another search term or select a different status.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setApplicationStatusFilter('ALL')
                }}
                className="mt-4 rounded-lg px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1050px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Student</th>
                    <th className="px-5 py-4 font-semibold">Job</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Applied on</th>
                    <th className="px-5 py-4 font-semibold">Cover letter</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredApplications.map((application) => {
                    const status = String(application.status || 'UNKNOWN').toUpperCase()
                    return (
                      <tr key={application.id} className="align-top transition hover:bg-slate-50">
                        <td className="px-5 py-5">
                          <p className="font-semibold text-slate-900">{application.studentName || 'Unknown student'}</p>
                          <p className="mt-1 text-xs text-slate-500">{application.studentEmail || 'No email'}</p>
                          <p className="mt-1 text-xs text-slate-400">Application #{application.id}</p>
                        </td>
                        <td className="px-5 py-5">
                          <p className="font-semibold text-slate-800">{application.jobTitle || 'Unknown job'}</p>
                          <p className="mt-1 text-slate-500">{application.companyName || 'Company not specified'}</p>
                          <p className="mt-1 text-xs text-slate-400">Job ID: #{application.jobId ?? '—'}</p>
                        </td>
                        <td className="px-5 py-5">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${applicationStatusColors[status] || 'bg-slate-100 text-slate-600 ring-slate-200'}`}>
                            {status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-5 text-slate-600">{formatDateTime(application.appliedAt)}</td>
                        <td className="max-w-sm px-5 py-5">
                          <p className="whitespace-pre-wrap break-words leading-6 text-slate-600">
                            {application.coverLetter || 'No cover letter provided'}
                          </p>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    )
  }

  function renderJobsTable() {

    return (

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <div className="flex flex-col gap-4 border-b border-slate-200 p-5">

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="text-lg font-bold text-slate-900">

                Posted Jobs

              </h2>

              <p className="mt-1 text-sm text-slate-500">

                {filteredJobs.length} of {jobs.length} jobs

              </p>

            </div>



            <div className="relative w-full sm:max-w-sm">

              <Search

                size={18}

                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"

              />

              <input

                type="search"

                value={search}

                onChange={(event) => setSearch(event.target.value)}

                placeholder="Search title, company, location..."

                aria-label="Search jobs"

                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50"

              />

            </div>

          </div>



          <div className="flex flex-wrap gap-2">

            {[

              { label: 'All statuses', value: 'ALL' },

              { label: 'Open', value: 'OPEN' },

              { label: 'Closed', value: 'CLOSED' },

              { label: 'Expired', value: 'EXPIRED' },

            ].map((filter) => (

              <button

                key={filter.value}

                type="button"

                onClick={() => setJobStatusFilter(filter.value)}

                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${

                  jobStatusFilter === filter.value

                    ? 'bg-indigo-600 text-white'

                    : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'

                }`}

              >

                {filter.label}

              </button>

            ))}

          </div>

        </div>



        {filteredJobs.length === 0 ? (

          <div className="flex flex-col items-center px-6 py-14 text-center">

            <BriefcaseBusiness size={30} className="text-slate-400" />

            <h3 className="mt-4 font-semibold text-slate-800">

              No jobs found

            </h3>

            <p className="mt-2 max-w-md text-sm text-slate-500">

              No jobs match your current search and status filter. Try clearing

              the search or selecting another status.

            </p>

            <button

              type="button"

              onClick={() => {

                setSearch('')

                setJobStatusFilter('ALL')

              }}

              className="mt-4 rounded-lg px-4 py-2 text-sm font-semibold text-indigo-600 hover:bg-indigo-50"

            >

              Clear filters

            </button>

          </div>

        ) : (

          <div className="overflow-x-auto">

            <table className="w-full min-w-[1050px] text-left text-sm">

              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">

                <tr>

                  <th className="px-5 py-4 font-semibold">Job</th>

                  <th className="px-5 py-4 font-semibold">Location</th>

                  <th className="px-5 py-4 font-semibold">Type / Salary</th>

                  <th className="px-5 py-4 font-semibold">Deadline</th>

                  <th className="px-5 py-4 font-semibold">Recruiter</th>
                  <th className="px-5 py-4 font-semibold">Status</th>
                  <th className="px-5 py-4 font-semibold">Actions</th>

                </tr>

              </thead>



              <tbody className="divide-y divide-slate-100">

                {filteredJobs.map((job) => {

                  const status = String(job.status || 'UNKNOWN').toUpperCase()



                  return (

                    <tr

                      key={job.id}

                      className="align-top transition hover:bg-slate-50"

                    >

                      <td className="px-5 py-5">

                        <div className="flex items-start gap-3">

                          <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">

                            <BriefcaseBusiness size={20} />

                          </div>



                          <div className="max-w-xs">

                            <p className="font-bold text-slate-900">

                              {job.title || 'Untitled job'}

                            </p>

                            <p className="mt-1 flex items-center gap-1.5 text-slate-500">

                              <Building2 size={14} />

                              {job.companyName || 'Company not specified'}

                            </p>

                            <p className="mt-1 text-xs text-slate-400">

                              Job ID: #{job.id}

                            </p>

                            {job.requiredSkills && (

                              <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">

                                <span className="font-semibold">Skills: </span>

                                {job.requiredSkills}

                              </p>

                            )}

                          </div>

                        </div>

                      </td>



                      <td className="px-5 py-5">

                        <span className="inline-flex items-center gap-1.5 text-slate-600">

                          <MapPin size={15} className="shrink-0 text-slate-400" />

                          {job.location || 'Not specified'}

                        </span>

                      </td>



                      <td className="px-5 py-5">

                        <p className="font-medium text-slate-700">

                          {job.jobType || 'Not specified'}

                        </p>

                        <p className="mt-2 inline-flex items-center gap-1 text-slate-500">

                          <IndianRupee size={14} />

                          {formatSalary(job.salary).replace('₹', '')}

                        </p>

                      </td>



                      <td className="px-5 py-5">

                        <span className="inline-flex items-center gap-1.5 text-slate-600">

                          <CalendarDays size={15} className="shrink-0 text-slate-400" />

                          {formatDate(job.applicationDeadline)}

                        </span>

                      </td>



                      <td className="px-5 py-5">

                        <p className="font-medium text-slate-700">

                          {job.recruiterName || 'Recruiter'}

                        </p>

                        <p className="mt-1 break-all text-xs text-slate-500">

                          {job.recruiterEmail || 'Email not available'}

                        </p>

                      </td>



                      <td className="px-5 py-5">

                        <span

                          className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${

                            jobStatusColors[status] ||

                            'bg-slate-100 text-slate-600 ring-slate-200'

                          }`}

                        >

                          {status}

                        </span>

                      </td>

                      <td className="px-5 py-5">
                        <button
                          type="button"
                          disabled={actionId === `job-${job.id}`}
                          onClick={() => deleteJob(job)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      </td>
                    </tr>

                  )

                })}

              </tbody>

            </table>

          </div>

        )}

      </section>

    )

  }



  const statCards = [

    {

      label: 'Total Users',

      value: totalUsers,

      icon: Users,

      color: 'bg-indigo-50 text-indigo-600',

      description: 'All registered accounts',

    },

    {

      label: 'Students',

      value: totalStudents,

      icon: GraduationCap,

      color: 'bg-blue-50 text-blue-600',

      description: 'Student accounts',

    },

    {

      label: 'Recruiters',

      value: totalRecruiters,

      icon: BriefcaseBusiness,

      color: 'bg-purple-50 text-purple-600',

      description: 'Recruiter accounts',

    },

    {

      label: 'Admins',

      value: totalAdmins,

      icon: ShieldCheck,

      color: 'bg-amber-50 text-amber-600',

      description: 'Administrator accounts',

    },

  ]



  return (

    <div className="min-h-screen bg-slate-100 text-slate-900 lg:flex">

      {/* Mobile header */}

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-4 lg:hidden">

        <div className="flex items-center gap-3">

          <div className="rounded-xl bg-indigo-600 p-2 text-white">

            <ShieldCheck size={22} />

          </div>

          <div>

            <p className="font-bold">SkillBridge</p>

            <p className="text-xs text-slate-500">Admin Console</p>

          </div>

        </div>



        <button

          type="button"

          aria-label={mobileMenuOpen ? 'Close navigation' : 'Open navigation'}

          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}

          className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"

        >

          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}

        </button>

      </header>



      {/* Sidebar */}

      <aside

        className={`${

          mobileMenuOpen ? 'block' : 'hidden'

        } fixed inset-x-0 bottom-0 top-[69px] z-20 overflow-y-auto border-r border-slate-200 bg-white p-5 lg:sticky lg:top-0 lg:block lg:h-screen lg:w-64 lg:shrink-0`}

      >

        <div className="hidden items-center gap-3 px-2 py-4 lg:flex">

          <div className="rounded-xl bg-indigo-600 p-2.5 text-white shadow-sm">

            <ShieldCheck size={24} />

          </div>

          <div>

            <h1 className="text-lg font-extrabold tracking-tight">

              SkillBridge

            </h1>

            <p className="text-xs text-slate-500">Admin Console</p>

          </div>

        </div>



        <div className="mb-3 mt-3 px-3 text-xs font-bold uppercase tracking-wider text-slate-400">

          Workspace

        </div>



        <nav className="space-y-1" aria-label="Admin navigation">

          {navigation.map(({ label, icon: Icon }) => {

            const active = activePage === label

            const badgeCount =

              label === 'All Users'

                ? totalUsers

                : label === 'Students'

                  ? totalStudents

                  : label === 'Recruiters'

                    ? totalRecruiters

                    : label === 'Admins'

                      ? totalAdmins

                      : label === 'Jobs'

                        ? jobCounts.total
                        : label === 'Applications'
                          ? applicationCounts.total
                          : null



            return (

              <button

                key={label}

                type="button"

                onClick={() => navigateTo(label)}

                aria-current={active ? 'page' : undefined}

                className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-semibold transition ${

                  active

                    ? 'bg-indigo-600 text-white shadow-sm'

                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'

                }`}

              >

                <Icon size={19} />

                <span className="flex-1">{label}</span>



                {badgeCount !== null && (

                  <span

                    className={`rounded-lg px-2 py-0.5 text-xs ${

                      active

                        ? 'bg-white/20 text-white'

                        : 'bg-slate-100 text-slate-500'

                    }`}

                  >

                    {badgeCount}

                  </span>

                )}



                {active && <ChevronRight size={16} />}

              </button>

            )

          })}

        </nav>



        <div className="my-6 border-t border-slate-100" />



        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">

          <div className="flex items-center gap-2 text-indigo-700">

            <ShieldCheck size={18} />

            <span className="text-sm font-bold">Administrator</span>

          </div>

          <p className="mt-2 text-xs leading-5 text-slate-600">

            Manage registered accounts, review jobs, and monitor the platform.

          </p>

        </div>



        <button

          type="button"

          onClick={onLogout}

          className="mt-6 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-slate-600 transition hover:bg-red-50 hover:text-red-600"

        >

          <LogOut size={19} />

          Log out

        </button>

      </aside>



      {/* Main content */}

      <main className="min-w-0 flex-1">

        <div className="mx-auto max-w-[1600px] p-4 sm:p-6 lg:p-9">

          <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <p className="mb-2 text-sm font-medium text-indigo-600">

                Admin Workspace / {activePage}

              </p>

              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">

                {activePage === 'Overview'

                  ? 'Dashboard Overview'

                  : activePage === 'Jobs'

                    ? 'Job Management'

                    : activePage === 'Applications'
                      ? 'Application Monitoring'
                      : activePage === 'Community'
                        ? 'Community Moderation'
                        : activePage}

              </h1>

              <p className="mt-2 text-sm text-slate-500 sm:text-base">

                {activePage === 'Overview'

                  ? 'Here is what is happening on your platform.'

                  : activePage === 'Jobs'

                    ? 'Review job postings, recruiter details, deadlines, and job status.'

                    : activePage === 'Applications'
                      ? 'Monitor student applications, review cover letters, and track application status.'
                      : activePage === 'Community'
                        ? 'Read the student feed and remove posts or comments that break the rules.'
                        : `Search, browse, and review ${activePage.toLowerCase()} accounts.`}

              </p>

            </div>



            <button

              type="button"

              onClick={() => loadDashboard(true)}

              disabled={loading || refreshing}

              className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"

            >

              <RefreshCw

                size={17}

                className={refreshing ? 'animate-spin' : ''}

              />

              {refreshing ? 'Refreshing...' : 'Refresh data'}

            </button>

          </header>



          {error && (

            <div

              role="alert"

              className="mb-6 flex flex-col gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 sm:flex-row sm:items-center"

            >

              <AlertCircle size={20} className="shrink-0" />

              <p className="flex-1">{error}</p>

              <button

                type="button"

                onClick={() => loadDashboard()}

                className="self-start rounded-lg px-3 py-2 font-bold hover:bg-red-100 sm:self-auto"

              >

                Try again

              </button>

            </div>

          )}



          {loading ? (

            <div className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white">

              <RefreshCw size={30} className="animate-spin text-indigo-600" />

              <p className="mt-4 text-sm font-medium text-slate-600">

                Loading admin dashboard...

              </p>

            </div>

          ) : (

            <>

              {activePage === 'Overview' && (

                <>

                  <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                    {statCards.map((card) => (

                      <StatCard key={card.label} {...card} />

                    ))}

                  </section>



                  <section className="mb-8 grid gap-5 xl:grid-cols-3">

                    <article className="rounded-2xl border border-slate-200 bg-white p-6 xl:col-span-2">

                      <div className="flex items-start justify-between gap-4">

                        <div>

                          <p className="text-sm font-medium text-slate-500">

                            Platform snapshot

                          </p>

                          <h2 className="mt-1 text-xl font-bold text-slate-900">

                            User distribution

                          </h2>

                        </div>

                        <div className="rounded-xl bg-emerald-50 p-3 text-emerald-600">

                          <TrendingUp size={22} />

                        </div>

                      </div>



                      <div className="mt-6 space-y-5">

                        {[

                          {

                            label: 'Students',

                            count: totalStudents,

                            color: 'bg-blue-500',

                          },

                          {

                            label: 'Recruiters',

                            count: totalRecruiters,

                            color: 'bg-purple-500',

                          },

                          {

                            label: 'Admins',

                            count: totalAdmins,

                            color: 'bg-amber-500',

                          },

                        ].map((item) => {

                          const percentage =

                            totalUsers > 0

                              ? Math.min((item.count / totalUsers) * 100, 100)

                              : 0



                          return (

                            <div key={item.label}>

                              <div className="mb-2 flex items-center justify-between text-sm">

                                <span className="font-medium text-slate-700">

                                  {item.label}

                                </span>

                                <span className="text-slate-500">

                                  {item.count} users

                                </span>

                              </div>

                              <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">

                                <div

                                  className={`h-full rounded-full transition-all duration-500 ${item.color}`}

                                  style={{ width: `${percentage}%` }}

                                />

                              </div>

                            </div>

                          )

                        })}

                      </div>

                    </article>



                    <article className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-6 text-white shadow-sm">

                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15">

                        <UserRound size={25} />

                      </div>

                      <p className="mt-6 text-sm text-indigo-100">

                        Registered accounts

                      </p>

                      <p className="mt-1 text-4xl font-extrabold">

                        {totalUsers}

                      </p>

                      <p className="mt-3 text-sm leading-6 text-indigo-100">

                        Review account information and quickly find a user.

                      </p>

                      <button

                        type="button"

                        onClick={() => navigateTo('All Users')}

                        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-bold text-indigo-700 transition hover:bg-indigo-50"

                      >

                        Browse all users

                        <ChevronRight size={17} />

                      </button>

                    </article>

                  </section>



                  <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

                    {[

                      {

                        label: 'Total Jobs',

                        value: jobCounts.total,

                        icon: BriefcaseBusiness,

                        color: 'bg-indigo-50 text-indigo-600',

                      },

                      {

                        label: 'Open Jobs',

                        value: jobCounts.open,

                        icon: FileText,

                        color: 'bg-emerald-50 text-emerald-600',

                      },

                      {

                        label: 'Closed Jobs',

                        value: jobCounts.closed,

                        icon: Clock,

                        color: 'bg-red-50 text-red-600',

                      },

                      {

                        label: 'Expired Jobs',

                        value: jobCounts.expired,

                        icon: CalendarDays,

                        color: 'bg-amber-50 text-amber-600',

                      },

                    ].map((card) => (

                      <StatCard

                        key={card.label}

                        {...card}

                        description="Based on current job records"

                      />

                    ))}

                  </section>
                  <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {[
                      { label: 'Community posts', value: stats?.totalPosts ?? 0, icon: MessagesSquare, color: 'bg-sky-50 text-sky-600' },
                      { label: 'Student connections', value: stats?.totalConnections ?? 0, icon: Network, color: 'bg-violet-50 text-violet-600' },
                      { label: 'Student profiles', value: stats?.studentProfiles ?? 0, icon: UserRound, color: 'bg-emerald-50 text-emerald-600' },
                      { label: 'Disabled accounts', value: stats?.disabledUsers ?? 0, icon: Ban, color: 'bg-red-50 text-red-600' },
                    ].map((card) => (
                      <StatCard key={card.label} {...card} description="Platform activity" />
                    ))}
                  </section>
                  {renderUserTable()}
                </>
              )}



              {['All Users', 'Students', 'Recruiters', 'Admins'].includes(

                activePage,

              ) && renderUserTable()}



              {activePage === 'Jobs' && renderJobsTable()}

              {activePage === 'Applications' && renderApplicationsTable()}
              {activePage === 'Community' && <CommunityFeed />}
              {openStudentId && (
                <StudentProfileModal userId={openStudentId} onClose={() => setOpenStudentId(null)} />
              )}

            </>

          )}



          <footer className="mt-8 flex flex-col gap-2 border-t border-slate-200 py-5 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">

            <p>SkillBridge Admin Console</p>

            <p>Student Internship & Placement Management Platform</p>

          </footer>

        </div>

      </main>

    </div>

  )

}
