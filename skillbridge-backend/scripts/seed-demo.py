#!/usr/bin/env python3
"""Fill a local SkillBridge backend with demo data through the public API.

Usage:  python3 scripts/seed-demo.py [http://localhost:8080]

Safe to re-run: existing accounts are reused. Every demo account uses the
password below. For local development only.
"""
import datetime
import json
import sys
import urllib.error
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080"
PASSWORD = "Demo12345"


def call(method, path, body=None, token=None):
    data = json.dumps(body).encode() if body is not None else None
    request = urllib.request.Request(BASE + path, data=data, method=method)
    request.add_header("Content-Type", "application/json")
    if token:
        request.add_header("Authorization", "Bearer " + token)
    try:
        with urllib.request.urlopen(request) as response:
            text = response.read().decode()
            return response.status, json.loads(text) if text else None
    except urllib.error.HTTPError as error:
        text = error.read().decode()
        return error.code, json.loads(text) if text else None


def account(name, email, company=False):
    path = "/api/auth/register/company" if company else "/api/auth/register"
    call("POST", path, {"name": name, "email": email, "password": PASSWORD})
    status, body = call("POST", "/api/auth/login", {"email": email, "password": PASSWORD})
    if status != 200:
        sys.exit(f"Could not log in as {email}: {body}")
    return body["token"], body["id"]


deadline = (datetime.date.today() + datetime.timedelta(days=30)).isoformat()

recruiter, _ = account("Acme Talent Team", "recruiter@demo.skillbridge", company=True)
status, existing = call("GET", "/api/jobs/my-jobs", token=recruiter)
titles = {job["title"] for job in existing or []}

jobs = [
    ("Backend Developer Intern", "Java, Spring Boot, MySQL, REST APIs, Git", "Hyderabad", 20000,
     "Build and test REST APIs for our hiring platform using Spring Boot and MySQL."),
    ("Frontend Developer Intern", "React, JavaScript, HTML, CSS, Tailwind CSS", "Bengaluru", 18000,
     "Create responsive React interfaces and work closely with designers."),
    ("Machine Learning Intern", "Python, Pandas, scikit-learn, Machine Learning", "Remote", 25000,
     "Prototype ML models that match students with the right opportunities."),
    ("DevOps Intern", "Docker, Kubernetes, AWS, Linux, CI/CD", "Pune", 22000,
     "Help automate our deployments and monitoring."),
]
job_ids = {}
for title, skills, location, salary, description in jobs:
    if title not in titles:
        call("POST", "/api/jobs", {
            "title": title, "companyName": "Acme Labs", "description": description,
            "location": location, "jobType": "INTERNSHIP", "salary": salary,
            "applicationDeadline": deadline, "requiredSkills": skills,
        }, recruiter)
for job in call("GET", "/api/jobs/my-jobs", token=recruiter)[1]:
    job_ids[job["title"]] = job["id"]

students = {
    "priya": ("Priya Sharma", "priya@demo.skillbridge", {
        "college": "JNTU Hyderabad", "degree": "B.Tech", "branch": "Computer Science", "graduationYear": 2027,
        "headline": "Backend-focused CS student", "location": "Hyderabad",
        "bio": "I enjoy building APIs and learning how large systems work.",
        "careerGoals": "Backend engineering internships at product companies.",
        "skills": ["Java", "Spring Boot", "MySQL", "Git", "React"],
        "interests": ["Open source", "System design"],
        "githubUrl": "https://github.com/",
    }),
    "rahul": ("Rahul Verma", "rahul@demo.skillbridge", {
        "college": "IIIT Bangalore", "degree": "B.Tech", "branch": "Data Science", "graduationYear": 2026,
        "headline": "Aspiring ML engineer", "location": "Bengaluru",
        "skills": ["Python", "Pandas", "Machine Learning", "SQL"],
        "interests": ["AI", "Kaggle"],
    }),
    "ananya": ("Ananya Rao", "ananya@demo.skillbridge", {
        "college": "JNTU Hyderabad", "degree": "B.Tech", "branch": "Information Technology", "graduationYear": 2027,
        "headline": "Frontend developer who loves design", "location": "Hyderabad",
        "skills": ["React", "JavaScript", "HTML", "CSS", "Figma"],
        "interests": ["UI/UX", "Hackathons"],
    }),
}
tokens, ids = {}, {}
for key, (name, email, profile) in students.items():
    tokens[key], ids[key] = account(name, email)
    call("PUT", "/api/student/profile", profile, tokens[key])

# Network: Ananya <-> Priya connected, Rahul -> Priya pending
call("POST", f"/api/connections/request/{ids['priya']}", token=tokens["ananya"])
status, req = call("GET", "/api/connections/requests/incoming", token=tokens["priya"])
for item in req or []:
    if item["userId"] == ids["ananya"]:
        call("POST", f"/api/connections/{item['id']}/accept", token=tokens["priya"])
call("POST", f"/api/connections/request/{ids['priya']}", token=tokens["rahul"])

# Applications
call("POST", "/api/applications", {"jobId": job_ids["Frontend Developer Intern"],
     "coverLetter": "I build React apps every week and would love to join your team."}, tokens["ananya"])
call("POST", "/api/applications", {"jobId": job_ids["Machine Learning Intern"],
     "coverLetter": "I have trained several models with scikit-learn and Pandas."}, tokens["rahul"])

# Community feed (only seeded once)
status, feed = call("GET", "/api/posts?size=1", token=tokens["priya"])
if feed and feed["totalElements"] == 0:
    call("POST", "/api/posts", {"content": "Just finished my first Spring Boot project with JWT auth! Happy to share notes with anyone learning backend."}, tokens["priya"])
    status, post = call("POST", "/api/posts", {"content": "Anyone preparing for frontend interviews? Let's form a study group for React and JavaScript."}, tokens["ananya"])
    call("POST", f"/api/posts/{post['id']}/like", token=tokens["priya"])
    call("POST", f"/api/posts/{post['id']}/comments", {"content": "Count me in!"}, tokens["priya"])

print("Demo data ready. Password for every demo account:", PASSWORD)
print("  recruiter@demo.skillbridge  (recruiter)")
for name, email, _ in students.values():
    print(f"  {email:<26} (student: {name})")
