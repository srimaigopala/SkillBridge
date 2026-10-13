package com.skillbridge;

import org.junit.jupiter.api.Test;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// The core journey: profile -> recommendations -> apply -> recruiter review -> student tracks
class JobApplicationFlowTest extends ApiTestSupport {

    @Test
    void endToEndInternshipJourney() throws Exception {

        Account recruiter = registerRecruiter("Acme HR");
        Account student = registerStudent("Priya");

        // Recruiter posts two jobs; skills are stored in canonical form
        Long backendJob = createJob(recruiter, "Backend Intern", "java, springboot, MySQL, docker");
        Long dataJob = createJob(recruiter, "Data Intern", "Python, Pandas");

        getAs("/api/jobs/" + backendJob, student)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.requiredSkills").value("Java, Spring Boot, MySQL, Docker"))
                .andExpect(jsonPath("$.skills.length()").value(4))
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.acceptingApplications").value(true));

        // Student builds a profile with skills
        saveSkills(student, "[\"Java\", \"Spring Boot\", \"Git\"]");

        // Match for one job
        getAs("/api/jobs/" + backendJob + "/match", student)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matchPercentage").value(50))
                .andExpect(jsonPath("$.matchedSkills", containsInAnyOrder("Java", "Spring Boot")))
                .andExpect(jsonPath("$.missingSkills", containsInAnyOrder("MySQL", "Docker")))
                .andExpect(jsonPath("$.alreadyApplied").value(false));

        // Recommendations include the matching job but not the 0% one
        getAs("/api/student/recommendations", student)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].job.id", hasItem(backendJob.intValue())))
                .andExpect(jsonPath("$[*].job.id", not(hasItem(dataJob.intValue()))));

        // Apply, and applying twice is rejected
        Long applicationId = apply(student, backendJob);

        postAs("/api/applications", student, """
                {"jobId": %d, "coverLetter": "again"}
                """.formatted(backendJob))
                .andExpect(status().isConflict());

        // Applied jobs drop out of recommendations
        getAs("/api/student/recommendations", student)
                .andExpect(jsonPath("$[*].job.id", not(hasItem(backendJob.intValue()))));

        // Recruiter sees the applicant with their skill match
        getAs("/api/applications/received", recruiter)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].id").value(applicationId))
                .andExpect(jsonPath("$[0].studentId").value(student.id()))
                .andExpect(jsonPath("$[0].matchPercentage").value(50));

        getAs("/api/applications/job/" + backendJob, recruiter)
                .andExpect(jsonPath("$.length()").value(1));

        // Recruiter moves the application through review to selection
        patchAs("/api/applications/" + applicationId + "/status", recruiter, """
                {"status":"UNDER_REVIEW"}
                """).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UNDER_REVIEW"));

        patchAs("/api/applications/" + applicationId + "/status", recruiter, """
                {"status":"SELECTED"}
                """).andExpect(status().isOk());

        // Student tracks the result
        getAs("/api/applications/my-applications", student)
                .andExpect(jsonPath("$[0].status").value("SELECTED"))
                .andExpect(jsonPath("$[0].jobTitle").value("Backend Intern"));

        getAs("/api/applications/" + applicationId, student)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SELECTED"));

        // A selected application can no longer be withdrawn
        patchAs("/api/applications/" + applicationId + "/withdraw", student, null)
                .andExpect(status().isBadRequest());
    }

    @Test
    void roleAndOwnershipRulesAreEnforced() throws Exception {

        Account recruiter = registerRecruiter("Owner Co");
        Account otherRecruiter = registerRecruiter("Other Co");
        Account student = registerStudent("Kiran");
        Account otherStudent = registerStudent("Lata");

        // Students cannot post jobs
        postAs("/api/jobs", student, jobJson("Sneaky", "Java"))
                .andExpect(status().isForbidden());

        Long jobId = createJob(recruiter, "Frontend Intern", "React, CSS");
        Long applicationId = apply(student, jobId);

        // Recruiters cannot apply
        postAs("/api/applications", recruiter, """
                {"jobId": %d, "coverLetter": "hi"}
                """.formatted(jobId))
                .andExpect(status().isForbidden());

        // Another recruiter can't see or touch this job's applications
        getAs("/api/applications/job/" + jobId, otherRecruiter)
                .andExpect(status().isNotFound());
        patchAs("/api/applications/" + applicationId + "/status", otherRecruiter, """
                {"status":"REJECTED"}
                """).andExpect(status().isForbidden());
        putAs("/api/jobs/" + jobId, otherRecruiter, jobJson("Hijacked", "Java"))
                .andExpect(status().isNotFound());

        // Another student can't read someone else's application
        getAs("/api/applications/" + applicationId, otherStudent)
                .andExpect(status().isNotFound());

        // Recruiters can only set reviewer statuses
        patchAs("/api/applications/" + applicationId + "/status", recruiter, """
                {"status":"WITHDRAWN"}
                """).andExpect(status().isBadRequest());

        // Invalid enum value is a 400, not a 500
        patchAs("/api/applications/" + applicationId + "/status", recruiter, """
                {"status":"MAYBE"}
                """).andExpect(status().isBadRequest());
    }

    @Test
    void recruiterManagesJobLifecycle() throws Exception {

        Account recruiter = registerRecruiter("Lifecycle Inc");
        Account student = registerStudent("Arjun");

        Long jobId = createJob(recruiter, "QA Intern", "Selenium");

        // Edit
        putAs("/api/jobs/" + jobId, recruiter, jobJson("QA Automation Intern", "Selenium, Java"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("QA Automation Intern"))
                .andExpect(jsonPath("$.requiredSkills").value("Selenium, Java"));

        // Close: students can no longer apply
        patchAs("/api/jobs/" + jobId + "/status", recruiter, """
                {"status":"CLOSED"}
                """).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"))
                .andExpect(jsonPath("$.acceptingApplications").value(false));

        postAs("/api/applications", student, """
                {"jobId": %d, "coverLetter": "hi"}
                """.formatted(jobId))
                .andExpect(status().isBadRequest());

        // Reopen, apply, withdraw
        patchAs("/api/jobs/" + jobId + "/status", recruiter, """
                {"status":"OPEN"}
                """).andExpect(status().isOk());

        Long applicationId = apply(student, jobId);

        patchAs("/api/applications/" + applicationId + "/withdraw", student, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("WITHDRAWN"));

        // Recruiter can't change a withdrawn application
        patchAs("/api/applications/" + applicationId + "/status", recruiter, """
                {"status":"SHORTLISTED"}
                """).andExpect(status().isBadRequest());

        // Search by skill alias and status
        getAs("/api/jobs/search?skill=selenium&status=open", student)
                .andExpect(jsonPath("$[*].id", hasItem(jobId.intValue())));

        getAs("/api/jobs/my-jobs", recruiter)
                .andExpect(jsonPath("$[*].id", hasItem(jobId.intValue())));

        // Delete removes the job and its applications
        deleteAs("/api/jobs/" + jobId, recruiter).andExpect(status().isNoContent());
        getAs("/api/jobs/" + jobId, student).andExpect(status().isNotFound());
        getAs("/api/applications/my-applications", student)
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void jobValidationErrorsAreReported() throws Exception {

        Account recruiter = registerRecruiter("Validator Ltd");

        postAs("/api/jobs", recruiter, """
                {"title":"","companyName":"X","jobType":"Internship",
                 "salary":-5,"applicationDeadline":"2000-01-01"}
                """)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.title").exists())
                .andExpect(jsonPath("$.fieldErrors.salary").exists())
                .andExpect(jsonPath("$.fieldErrors.applicationDeadline").exists());
    }
}
