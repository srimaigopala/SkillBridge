# SkillBridge — local setup

SkillBridge is a student career platform: profiles with résumé parsing, skill-based internship
matching and recommendations, applications, a recruiter workspace, student networking,
a community feed and an admin console.

```
SkillBridge/
├── skillbridge-backend/    Spring Boot 4 API (Java 21, MySQL, JWT)
│   ├── scripts/seed-demo.py    fills the app with demo users, jobs and posts
│   ├── .env.example            every setting the backend reads
│   └── README.md               full API reference
└── skillbridge-frontend/   React 19 + Vite + Tailwind
```

## 1. Install

| Tool | Version | Check |
|---|---|---|
| Java (JDK) | **21** | `java -version` |
| Node.js | 20.19+ or 22.12+ | `node -v` |
| MySQL | 8 or newer | `mysql --version` |
| Python | 3.8+ (only for demo data) | `python3 --version` |

Maven is **not** needed — the project includes the Maven wrapper (`./mvnw`).

On macOS with Homebrew:

```bash
brew install openjdk@21 node mysql
brew services start mysql
```

## 2. Start the backend

```bash
cd skillbridge-backend
export DB_USERNAME=root
export DB_PASSWORD=            # your MySQL password (empty for a fresh Homebrew install)
export JWT_SECRET=$(openssl rand -base64 48)
export ADMIN_EMAIL=admin@skillbridge.local
export ADMIN_PASSWORD=ChangeMe123
./mvnw spring-boot:run
```

The `skillbridge` database and all tables are created automatically on first start.
Wait for `Started SkillbridgeBackendApplication`, then check http://localhost:8080/api/test.

On Windows use `mvnw.cmd spring-boot:run` and `set NAME=value` instead of `export`.

## 3. Load demo data (optional, recommended)

In a second terminal, while the backend is running:

```bash
cd skillbridge-backend
python3 scripts/seed-demo.py
```

This creates a recruiter, four internships, three students, connections, posts and applications.
All demo accounts use the password `Demo12345`.

## 4. Start the frontend

In another terminal:

```bash
cd skillbridge-frontend
npm install
npm run dev
```

Open http://localhost:5173. The login page shows **Quick demo access** buttons
(Student / Recruiter / Admin) in development mode.

| Account | Password | Role |
|---|---|---|
| `priya@demo.skillbridge` | `Demo12345` | Student |
| `recruiter@demo.skillbridge` | `Demo12345` | Recruiter |
| `admin@skillbridge.local` | `ChangeMe123` (whatever you set as `ADMIN_PASSWORD`) | Admin |

## 5. Run the tests

```bash
cd skillbridge-backend
./mvnw test
```

Tests use an in-memory database, so MySQL does not need to be running.

## Troubleshooting

- **`release version 21 not supported`** — Maven is using an older Java. Point it at JDK 21, e.g.
  `export JAVA_HOME=$(/usr/libexec/java_home -v 21)` on macOS.
- **`Connection refused` / `Access denied for user 'root'`** — MySQL isn't running, or `DB_PASSWORD` is wrong.
- **`Port 8080 was already in use`** — another backend is already running; stop it first.
- **Demo buttons say the account doesn't exist** — run `scripts/seed-demo.py` (step 3).
- **`zsh: permission denied: ./mvnw`** — run `chmod +x mvnw` once.
