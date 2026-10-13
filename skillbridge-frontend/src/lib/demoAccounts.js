// One-click demo logins for local development and demos.
// Shown when running `npm run dev`, or in a build made with VITE_DEMO_MODE=true.
// Never enable demo mode on a public deployment: these passwords are visible to anyone.
export const DEMO_MODE =
  import.meta.env.VITE_DEMO_MODE === 'true' ||
  (import.meta.env.DEV && import.meta.env.VITE_DEMO_MODE !== 'false')

// Matches the accounts created by skillbridge-backend/scripts/seed-demo.py
// and the ADMIN_EMAIL / ADMIN_PASSWORD used when starting the backend locally.
export const DEMO_ACCOUNTS = [
  {
    role: 'STUDENT',
    label: 'Student',
    name: 'Priya Sharma',
    email: import.meta.env.VITE_DEMO_STUDENT_EMAIL || 'priya@demo.skillbridge',
    password: import.meta.env.VITE_DEMO_STUDENT_PASSWORD || 'Demo12345',
  },
  {
    role: 'RECRUITER',
    label: 'Recruiter',
    name: 'Acme Talent Team',
    email: import.meta.env.VITE_DEMO_RECRUITER_EMAIL || 'recruiter@demo.skillbridge',
    password: import.meta.env.VITE_DEMO_RECRUITER_PASSWORD || 'Demo12345',
  },
  {
    role: 'ADMIN',
    label: 'Admin',
    name: 'Platform Admin',
    email: import.meta.env.VITE_DEMO_ADMIN_EMAIL || 'admin@skillbridge.local',
    password: import.meta.env.VITE_DEMO_ADMIN_PASSWORD || 'ChangeMe123',
  },
]
