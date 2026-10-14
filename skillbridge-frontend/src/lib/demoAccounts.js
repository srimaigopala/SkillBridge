// One-click demo logins for local development and demos.
// Shows the three demo access boxes in both development and production.
// IMPORTANT: Demo accounts must exist in the backend database for login to work.

export const DEMO_MODE = true

// Demo accounts used by the SkillBridge login page.
// These credentials must match accounts available in your backend database.
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