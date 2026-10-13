# SkillBridge Backend

Spring Boot 4 (Java 21) · MySQL · JWT · PDFBox

## Run

```bash
export DB_PASSWORD=yourMysqlPassword
export JWT_SECRET=$(openssl rand -base64 48)
export ADMIN_EMAIL=admin@skillbridge.local ADMIN_PASSWORD=ChangeMe123
./mvnw spring-boot:run
```

All settings are in `src/main/resources/application.properties` and can be overridden with
the environment variables listed in `.env.example`. The database schema is created/updated
automatically (`ddl-auto=update`). Uploaded résumés are stored under `UPLOAD_DIR/resumes`.

The first admin is created from `ADMIN_EMAIL` / `ADMIN_PASSWORD` on startup (admins cannot self-register).

## Test

```bash
./mvnw test
```

Tests use an in-memory H2 database, so MySQL is not needed. They exercise every endpoint
through the real security layer, including the full student → recruiter → student journey,
résumé upload with real PDFs, networking, the feed and admin tools.

## Roles

| Role | How it's created | Can do |
|---|---|---|
| `STUDENT` | `POST /api/auth/register` | profile, résumé, recommendations, apply, connections, feed |
| `RECRUITER` (company) | `POST /api/auth/register/company` | post/manage jobs, review applicants, view student profiles |
| `ADMIN` | `ADMIN_EMAIL` env var | stats, user/job/application oversight, disable users, moderate feed |

All endpoints except register/login need `Authorization: Bearer <token>`.
Errors always look like `{ "status", "error", "message", "path", "timestamp", "fieldErrors"? }`.

## API

### Auth
| Method | Path | Notes |
|---|---|---|
| POST | `/api/auth/register` | student · body `{name, email, password(≥8)}` |
| POST | `/api/auth/register/company` | recruiter · same body |
| POST | `/api/auth/login` | `{email, password}` → `{token, id, name, email, role}` |
| GET | `/api/auth/me` | current user (validate a stored token) |

### Student (role STUDENT)
| Method | Path | Notes |
|---|---|---|
| GET | `/api/student/profile` | own profile (empty profile with `id: null` if not created yet) |
| PUT | `/api/student/profile` | phone, college, degree, branch, graduationYear, bio, headline, location, careerGoals, links, `skills[]`, `interests[]` (omit lists to keep them) |
| POST | `/api/student/profile/resume` | multipart field `file` (PDF ≤ 5 MB) → extracted skills merged into profile |
| GET / DELETE | `/api/student/profile/resume` | download / remove own résumé |
| GET | `/api/student/recommendations?limit=10` | open jobs ranked by skill match, excluding ones already applied to |
| GET | `/api/jobs/{id}/match` | `{matchPercentage, matchedSkills, missingSkills, alreadyApplied}` |

### Jobs (internships)
| Method | Path | Role |
|---|---|---|
| GET | `/api/jobs`, `/api/jobs/{id}` | any |
| GET | `/api/jobs/search?title=&location=&status=&skill=` | any (all filters optional; `title` also matches company) |
| GET | `/api/jobs/my-jobs` | recruiter |
| POST | `/api/jobs` | recruiter |
| PUT | `/api/jobs/{id}` | owning recruiter |
| PATCH | `/api/jobs/{id}/status` | owning recruiter · `{status: OPEN | CLOSED}` |
| DELETE | `/api/jobs/{id}` | owning recruiter or admin (also deletes its applications) |

Job responses include `skills[]`, `expired` and `acceptingApplications` alongside the original fields.
Required skills are normalised on save (`reactjs, JAVA` → `React, Java`).

### Applications
| Method | Path | Role |
|---|---|---|
| POST | `/api/applications` | student · `{jobId, coverLetter}` |
| GET | `/api/applications/my-applications` | student |
| PATCH | `/api/applications/{id}/withdraw` | student (while APPLIED / UNDER_REVIEW / SHORTLISTED) |
| GET | `/api/applications/received` | recruiter · all applicants across own jobs, with match % |
| GET | `/api/applications/job/{jobId}` | owning recruiter, with match % |
| PATCH | `/api/applications/{id}/status` | owning recruiter · `UNDER_REVIEW`, `SHORTLISTED`, `REJECTED`, `SELECTED` |
| GET | `/api/applications/{id}` | owning student, owning recruiter or admin |

Status lifecycle: `APPLIED → UNDER_REVIEW → SHORTLISTED → SELECTED (accepted) | REJECTED`, or `WITHDRAWN` by the student.

### Student discovery
| Method | Path | Notes |
|---|---|---|
| GET | `/api/students?q=&skill=&college=` | public profiles (any signed-in user) |
| GET | `/api/students/{userId}` | public profile; includes `connectionStatus` for student viewers |
| GET | `/api/students/{userId}/resume` | recruiter or admin |

Email on public profiles is shown only to recruiters, admins and accepted connections.

### Connections (role STUDENT)
| Method | Path | Notes |
|---|---|---|
| GET | `/api/connections` | accepted connections |
| GET | `/api/connections/requests/incoming` · `/outgoing` | pending requests |
| GET | `/api/connections/status/{userId}` | `NONE`, `PENDING_SENT`, `PENDING_RECEIVED`, `CONNECTED` |
| POST | `/api/connections/request/{userId}` | send (if they already asked you, this accepts) |
| POST | `/api/connections/{id}/accept` · `/reject` | receiver only |
| DELETE | `/api/connections/{id}` | cancel own pending request or remove a connection |

### Community feed
| Method | Path | Role |
|---|---|---|
| GET | `/api/posts?page=0&size=20` | any · `{content[], page, size, totalElements, totalPages, last}` |
| GET | `/api/posts/user/{userId}`, `/api/posts/{id}` | any |
| POST | `/api/posts` | student · `{content}` |
| PUT | `/api/posts/{id}` | author |
| DELETE | `/api/posts/{id}` | author or admin |
| POST / DELETE | `/api/posts/{id}/like` | student (idempotent) |
| GET / POST | `/api/posts/{id}/comments` | read: any · write: student |
| DELETE | `/api/posts/{id}/comments/{commentId}` | comment author, post author or admin |

### Admin (role ADMIN)
| Method | Path | Notes |
|---|---|---|
| GET | `/api/admin/stats` | users by role, jobs, applications by status, posts, connections |
| GET | `/api/admin/users?role=&q=&disabled=` | user directory |
| GET | `/api/admin/users/{id}` | |
| PATCH | `/api/admin/users/{id}/status` | `{disabled: true|false}` — disabled users can't log in and their tokens stop working |
| GET | `/api/admin/jobs?status=&q=&skill=` | |
| DELETE | `/api/admin/jobs/{id}` | |
| GET | `/api/admin/applications?status=&jobId=` | |
