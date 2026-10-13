package com.skillbridge;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminApiTest extends ApiTestSupport {

    @Test
    void adminSeesPlatformStatistics() throws Exception {

        Account recruiter = registerRecruiter("Stats Co");
        Account student = registerStudent("Stats Student");
        apply(student, createJob(recruiter, "Stats Intern", "SQL"));

        getAs("/api/admin/stats", admin())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalUsers", greaterThanOrEqualTo(3)))
                .andExpect(jsonPath("$.totalStudents", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.totalCompanies", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.totalJobs", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.openJobs", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.totalApplications", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.applicationsApplied", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.applicationsUnderReview").exists())
                .andExpect(jsonPath("$.totalPosts").exists())
                .andExpect(jsonPath("$.totalConnections").exists());
    }

    @Test
    void adminSearchesAndFiltersUsersJobsAndApplications() throws Exception {

        Account admin = admin();
        Account recruiter = registerRecruiter("Filter Corp");
        Account student = registerStudent("Filterable Person");
        Long jobId = createJob(recruiter, "Filter Intern", "Rust");
        apply(student, jobId);

        getAs("/api/admin/users?role=RECRUITER", admin)
                .andExpect(jsonPath("$[*].role", everyItem(is("RECRUITER"))))
                .andExpect(jsonPath("$[*].id", hasItem(recruiter.id().intValue())));

        getAs("/api/admin/users?q=filterable", admin)
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].email").value(student.email()))
                .andExpect(jsonPath("$[0].disabled").value(false));

        getAs("/api/admin/jobs?skill=rust&status=OPEN", admin)
                .andExpect(jsonPath("$[*].id", hasItem(jobId.intValue())));

        getAs("/api/admin/applications?jobId=" + jobId + "&status=APPLIED", admin)
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].studentName").value("Filterable Person"));

        deleteAs("/api/admin/jobs/" + jobId, admin).andExpect(status().isNoContent());
        getAs("/api/admin/applications?jobId=" + jobId, admin)
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void disablingAUserBlocksLoginAndExistingTokens() throws Exception {

        Account admin = admin();
        Account student = registerStudent("Soon Disabled");

        patchAs("/api/admin/users/" + student.id() + "/status", admin, """
                {"disabled": true}
                """)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.disabled").value(true));

        // Existing token no longer works
        getAs("/api/jobs", student).andExpect(status().isUnauthorized());

        // Login is refused
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(student.email(), PASSWORD)))
                .andExpect(status().isForbidden());

        // Hidden from discovery
        getAs("/api/students?q=soon disabled", admin)
                .andExpect(jsonPath("$.length()").value(0));

        // Re-enable
        patchAs("/api/admin/users/" + student.id() + "/status", admin, """
                {"disabled": false}
                """).andExpect(status().isOk());
        login(student.email(), PASSWORD);

        // Admin can't disable themself
        patchAs("/api/admin/users/" + admin.id() + "/status", admin, """
                {"disabled": true}
                """).andExpect(status().isBadRequest());
    }

    @Test
    void nonAdminsAreForbidden() throws Exception {

        Account student = registerStudent("Not Admin");
        Account recruiter = registerRecruiter("Also Not Admin");

        getAs("/api/admin/stats", student).andExpect(status().isForbidden());
        getAs("/api/admin/users", recruiter).andExpect(status().isForbidden());
        deleteAs("/api/admin/jobs/1", student).andExpect(status().isForbidden());
    }
}
