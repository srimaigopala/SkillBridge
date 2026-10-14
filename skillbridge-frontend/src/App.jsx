
import { useState } from 'react'

import {
  ArrowLeft,
  Eye,
  EyeOff,
  GraduationCap,
  BriefcaseBusiness,
  CheckCircle2,
  ShieldCheck,
  Zap,
} from 'lucide-react'

import StudentDashboard from './StudentDashboard.jsx'
import RecruiterDashboard from './RecruiterDashboard.jsx'
import AdminDashboard from './AdminDashboard.jsx'
import { DEMO_ACCOUNTS, DEMO_MODE } from './lib/demoAccounts.js'
const API = import.meta.env.VITE_API_URL || 'https://skillbridge-2jeh.onrender.com';

export default function App() {
  const [isRegister, setIsRegister] = useState(false)

  const [isLoggedIn, setIsLoggedIn] = useState(
    Boolean(localStorage.getItem('skillbridgeToken')),
  )

  const [role, setRole] = useState('STUDENT')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [demoLoading, setDemoLoading] = useState(null)

  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
  })

  function updateField(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    })
  }

  function handleLogout() {
    localStorage.removeItem('skillbridgeToken')
    localStorage.removeItem('skillbridgeRole')
    localStorage.removeItem('skillbridgeEmail')
    localStorage.removeItem('skillbridgeName')

    setIsLoggedIn(false)
    setIsRegister(false)
    setError('')
    setMessage('')
    setRole('STUDENT')
    setShowPassword(false)

    setForm({
      name: '',
      email: '',
      password: '',
    })
  }

  function switchAuthMode(registerMode) {
    setIsRegister(registerMode)
    setError('')
    setMessage('')
    setShowPassword(false)
    setRole('STUDENT')
  }

  // Store the session returned by POST /api/auth/login and open the dashboard.
  function completeLogin(data, fallbackEmail) {
    // Login must return a JWT token.
    if (!data.token) {
      throw new Error(
        'Login succeeded, but the server did not return an authentication token.',
      )
    }

    // Use the role returned by the backend, never the form selection.
    const loggedInRole = String(data.role || '')
      .replace('ROLE_', '')
      .toUpperCase()

    if (!['STUDENT', 'RECRUITER', 'ADMIN'].includes(loggedInRole)) {
      throw new Error(
        'Your account role is missing or unsupported. Please check your backend login response.',
      )
    }

    localStorage.setItem('skillbridgeToken', data.token)
    localStorage.setItem('skillbridgeRole', loggedInRole)
    localStorage.setItem(
      'skillbridgeEmail',
      data.email || fallbackEmail,
    )

    if (data.name) {
      localStorage.setItem('skillbridgeName', data.name)
    } else {
      localStorage.removeItem('skillbridgeName')
    }

    setIsLoggedIn(true)
  }

  // Sign in with one of the demo accounts (development / demo mode only)
  async function handleDemoLogin(account) {
    setError('')
    setMessage('')
    setDemoLoading(account.role)

    try {
      const response = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: account.email, password: account.password }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(
          response.status === 401
            ? `The demo ${account.label.toLowerCase()} account doesn't exist yet. Run scripts/seed-demo.py in the backend folder (and start the backend with ADMIN_EMAIL / ADMIN_PASSWORD for the admin).`
            : data.message || `Demo login failed with status ${response.status}.`,
        )
      }

      completeLogin(data, account.email)
    } catch (err) {
      setError(
        err.message === 'Failed to fetch'
          ? 'Cannot reach the backend. Check that Spring Boot is running on port 8080.'
          : err.message,
      )
    } finally {
      setDemoLoading(null)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    setError('')
    setMessage('')
    setLoading(true)

    try {
      // Student and recruiter have separate registration endpoints.
      // All roles use the same login endpoint.
      const endpoint = isRegister
        ? role === 'RECRUITER'
          ? '/api/auth/register/company'
          : '/api/auth/register'
        : '/api/auth/login'

      const payload = isRegister
        ? {
            name: form.name.trim(),
            email: form.email.trim(),
            password: form.password,
          }
        : {
            email: form.email.trim(),
            password: form.password,
          }

      const response = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const responseText = await response.text()

      let data = {}

      try {
        data = responseText ? JSON.parse(responseText) : {}
      } catch {
        data = {}
      }

      if (!response.ok) {
        const errorMessage =
          data.message ||
          data.detail ||
          data.error ||
          (typeof data === 'string' ? data : '') ||
          `Request failed with status ${response.status}.`

        throw new Error(errorMessage)
      }

      // Registration succeeded. The user must sign in.
      if (isRegister) {
        setMessage(
          role === 'RECRUITER'
            ? 'Recruiter account created! Please sign in.'
            : 'Student account created! Please sign in.',
        )

        setIsRegister(false)
        setRole('STUDENT')

        setForm({
          name: '',
          email: form.email.trim(),
          password: '',
        })

        return
      }

      completeLogin(data, form.email.trim())
    } catch (err) {
      console.error('Authentication error:', err)

      setError(
        err.message === 'Failed to fetch'
          ? 'Cannot reach the backend. Check that Spring Boot is running on port 8080 and CORS is configured.'
          : err.message || 'Something went wrong. Please try again.',
      )
    } finally {
      setLoading(false)
    }
  }

  // Show the dashboard matching the authenticated role.
  if (isLoggedIn) {
    const userRole = localStorage.getItem('skillbridgeRole')

    if (userRole === 'STUDENT') {
      return <StudentDashboard onLogout={handleLogout} />
    }

    if (userRole === 'RECRUITER') {
      return <RecruiterDashboard onLogout={handleLogout} />
    }

    if (userRole === 'ADMIN') {
      return <AdminDashboard onLogout={handleLogout} />
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-[#edf3fb] p-6">
        <section className="max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
          <h1 className="text-2xl font-extrabold text-slate-900">
            Account role not recognized
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-500">
            Please sign in again or check your account role.
          </p>

          <button
            type="button"
            onClick={handleLogout}
            className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-bold text-white hover:bg-blue-700"
          >
            Return to login
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#e5e0ff] p-4 sm:p-8">
      <section className="grid w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl lg:min-h-[650px] lg:grid-cols-2">
        {/* Left gradient panel */}
        <aside className="relative flex min-h-[300px] flex-col justify-between overflow-hidden bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 p-8 text-white sm:p-12 lg:p-14">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-20 top-32 h-80 w-[130%] rotate-12 border-t border-white/25 bg-white/10" />
            <div className="absolute -left-10 top-56 h-72 w-[130%] -rotate-12 border-t border-white/25 bg-blue-300/20" />
            <div className="absolute -bottom-40 left-0 h-80 w-full rounded-[50%] bg-indigo-500/40 blur-2xl" />
          </div>

          <div className="relative flex w-fit items-center gap-2">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-indigo-600 shadow-lg">
              <GraduationCap size={26} />
            </span>

            <span className="text-xl font-extrabold tracking-tight">
              SkillBridge
            </span>
          </div>

          <div className="relative my-12 max-w-lg">
            <span className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-2 text-sm font-medium backdrop-blur-sm">
              <CheckCircle2 size={16} />
              Your career starts here
            </span>

            <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              Learn. Connect.
              <br />
              Get Hired.
            </h1>

            <p className="mt-5 max-w-md text-base leading-7 text-white/85 sm:text-lg">
              Discover opportunities, connect with recruiters, and take the
              next step toward your dream career.
            </p>
          </div>

          <p className="relative text-sm text-white/75">
            Your bridge between education and opportunity.
          </p>
        </aside>

        {/* Right authentication panel */}
        <section className="flex items-center justify-center bg-white px-6 py-10 sm:px-12 lg:px-16">
          <div className="w-full max-w-md">
            <div className="mb-12 flex items-center justify-between text-sm">
              <button
                type="button"
                onClick={() => {
                  switchAuthMode(false)
                }}
                className="flex items-center gap-2 text-slate-500 transition hover:text-indigo-600"
              >
                <ArrowLeft size={16} />
                Back to home
              </button>

              <button
                type="button"
                onClick={() => switchAuthMode(!isRegister)}
                className="rounded-lg px-3 py-2 font-semibold text-indigo-600 hover:bg-indigo-50"
              >
                {isRegister ? 'Sign in' : 'Register'}
              </button>
            </div>

            <div className="mb-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                {isRegister ? (
                  role === 'RECRUITER' ? (
                    <BriefcaseBusiness size={24} />
                  ) : (
                    <GraduationCap size={25} />
                  )
                ) : (
                  <BriefcaseBusiness size={24} />
                )}
              </div>

              <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
                {isRegister
                  ? role === 'RECRUITER'
                    ? 'Create recruiter account'
                    : 'Create your account'
                  : 'Welcome back'}
              </h2>

              <p className="mt-3 leading-6 text-slate-500">
                {isRegister
                  ? role === 'RECRUITER'
                    ? 'Join SkillBridge to post opportunities and connect with students.'
                    : 'Join SkillBridge and discover new opportunities.'
                  : 'Sign in to continue your career journey.'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {isRegister && (
                <>
                  <div>
                    <label
                      htmlFor="name"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      {role === 'RECRUITER'
                        ? 'Recruiter / Company name'
                        : 'Full name'}
                    </label>

                    <input
                      id="name"
                      required
                      name="name"
                      value={form.name}
                      onChange={updateField}
                      placeholder={
                        role === 'RECRUITER'
                          ? 'Enter recruiter or company name'
                          : 'Enter your full name'
                      }
                      className="w-full rounded-xl border border-slate-200 px-4 py-3.5 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="role"
                      className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                      Account type
                    </label>

                    <select
                      id="role"
                      value={role}
                      onChange={(event) => {
                        setRole(event.target.value)
                        setError('')
                        setMessage('')
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3.5 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                    >
                      <option value="STUDENT">Student</option>
                      <option value="RECRUITER">Recruiter / Company</option>
                    </select>

                    <p className="mt-2 text-xs text-slate-500">
                      Admin accounts are created separately for security.
                    </p>
                  </div>
                </>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email address
                </label>

                <input
                  id="email"
                  required
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={updateField}
                  placeholder="you@example.com"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3.5 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Password
                </label>

                <div className="relative">
                  <input
                    id="password"
                    required
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={updateField}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-slate-200 px-4 py-3.5 pr-12 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50"
                  />

                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPassword ? (
                      <EyeOff size={19} />
                    ) : (
                      <Eye size={19} />
                    )}
                  </button>
                </div>
              </div>

              {error && (
                <p
                  role="alert"
                  className="break-words rounded-xl bg-red-50 p-3 text-sm text-red-700"
                >
                  {error}
                </p>
              )}

              {message && (
                <p
                  role="status"
                  className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700"
                >
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-4 py-3.5 font-bold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading
                  ? 'Please wait...'
                  : isRegister
                    ? role === 'RECRUITER'
                      ? 'Create recruiter account'
                      : 'Create account'
                    : 'Sign in to SkillBridge'}
              </button>
            </form>

            {DEMO_MODE && !isRegister && (
              <section className="mt-8 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-sm font-bold text-indigo-900">
                    <Zap size={16} />
                    Quick demo access
                  </p>
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-indigo-600">
                    Demo mode
                  </span>
                </div>

                <div className="space-y-2">
                  {DEMO_ACCOUNTS.map((account) => {
                    const Icon =
                      account.role === 'STUDENT'
                        ? GraduationCap
                        : account.role === 'RECRUITER'
                          ? BriefcaseBusiness
                          : ShieldCheck

                    return (
                      <button
                        key={account.role}
                        type="button"
                        disabled={loading || demoLoading !== null}
                        onClick={() => handleDemoLogin(account)}
                        className="flex w-full items-center gap-3 rounded-xl border border-indigo-100 bg-white px-3 py-2.5 text-left transition hover:border-indigo-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                          <Icon size={18} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-slate-800">
                            {account.label}
                          </span>
                          <span className="block truncate text-xs text-slate-500">
                            {account.name}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs font-bold text-indigo-600">
                          {demoLoading === account.role
                            ? 'Signing in...'
                            : `Continue as ${account.label} →`}
                        </span>
                      </button>
                    )
                  })}
                </div>

                <p className="mt-3 text-[11px] leading-4 text-slate-500">
                  Sample accounts for trying SkillBridge. Only shown in development
                  and demo builds.
                </p>
              </section>
            )}

            <p className="mt-8 text-center text-sm text-slate-500">
              {isRegister
                ? 'Already have an account?'
                : "Don't have an account?"}{' '}

              <button
                type="button"
                onClick={() => switchAuthMode(!isRegister)}
                className="font-bold text-indigo-600 hover:text-indigo-800"
              >
                {isRegister ? 'Sign in' : 'Create one'}
              </button>
            </p>

            <p className="mt-10 text-center text-xs leading-5 text-slate-400">
              By continuing, you agree to SkillBridge's Terms of Service and
              Privacy Policy.
            </p>
          </div>
        </section>
      </section>
    </main>
  )
}
