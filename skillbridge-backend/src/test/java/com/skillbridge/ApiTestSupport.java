package com.skillbridge;

import com.jayway.jsonpath.JsonPath;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.LocalDate;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

// Full-stack API tests: real security, services and an in-memory H2 database.
// Every test uses fresh, uniquely named accounts so tests don't interfere.
@SpringBootTest
@AutoConfigureMockMvc
public abstract class ApiTestSupport {

    protected static final String ADMIN_EMAIL = "admin@skillbridge.test";
    protected static final String ADMIN_PASSWORD = "AdminPass123";
    protected static final String PASSWORD = "Password123";

    @Autowired
    protected MockMvc mvc;

    protected record Account(Long id, String email, String token) {
    }

    protected static String uniqueEmail(String prefix) {
        return prefix + "-" + UUID.randomUUID().toString().substring(0, 8) + "@test.local";
    }

    protected Account registerStudent(String name) throws Exception {
        return register("/api/auth/register", name, uniqueEmail("student"));
    }

    protected Account registerRecruiter(String name) throws Exception {
        return register("/api/auth/register/company", name, uniqueEmail("recruiter"));
    }

    protected Account admin() throws Exception {
        String token = login(ADMIN_EMAIL, ADMIN_PASSWORD);
        Long id = readLong(perform(get("/api/auth/me"), token)
                .andExpect(status().isOk()).andReturn(), "$.id");
        return new Account(id, ADMIN_EMAIL, token);
    }

    private Account register(String endpoint, String name, String email) throws Exception {

        MvcResult result = mvc.perform(post(endpoint)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"%s","email":"%s","password":"%s"}
                                """.formatted(name, email, PASSWORD)))
                .andExpect(status().isCreated())
                .andReturn();

        return new Account(readLong(result, "$.id"), email, login(email, PASSWORD));
    }

    protected String login(String email, String password) throws Exception {

        MvcResult result = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, password)))
                .andExpect(status().isOk())
                .andReturn();

        return JsonPath.read(result.getResponse().getContentAsString(), "$.token");
    }

    protected Long createJob(Account recruiter, String title, String skills) throws Exception {

        MvcResult result = perform(post("/api/jobs").content(jobJson(title, skills)), recruiter.token())
                .andExpect(status().isCreated())
                .andReturn();

        return readLong(result, "$.id");
    }

    protected static String jobJson(String title, String skills) {
        return """
                {
                  "title": "%s",
                  "companyName": "Acme Labs",
                  "description": "Build things",
                  "location": "Hyderabad",
                  "jobType": "Internship",
                  "salary": 15000,
                  "applicationDeadline": "%s",
                  "requiredSkills": "%s"
                }
                """.formatted(title, LocalDate.now().plusDays(30), skills);
    }

    protected void saveSkills(Account student, String skillsJsonArray) throws Exception {
        perform(put("/api/student/profile").content("""
                        {"college":"JNTU","degree":"B.Tech","branch":"CSE",
                         "graduationYear":2027,"skills":%s}
                        """.formatted(skillsJsonArray)), student.token())
                .andExpect(status().isOk());
    }

    protected Long apply(Account student, Long jobId) throws Exception {

        MvcResult result = perform(post("/api/applications").content("""
                        {"jobId": %d, "coverLetter": "I am interested"}
                        """.formatted(jobId)), student.token())
                .andExpect(status().isCreated())
                .andReturn();

        return readLong(result, "$.id");
    }

    protected ResultActions perform(MockHttpServletRequestBuilder request, String token)
            throws Exception {

        if (token != null) {
            request.header("Authorization", "Bearer " + token);
        }

        return mvc.perform(request.contentType(MediaType.APPLICATION_JSON));
    }

    protected ResultActions getAs(String url, Account account) throws Exception {
        return perform(get(url), account.token());
    }

    protected ResultActions postAs(String url, Account account, String body) throws Exception {
        MockHttpServletRequestBuilder request = post(url);
        if (body != null) {
            request.content(body);
        }
        return perform(request, account.token());
    }

    protected ResultActions putAs(String url, Account account, String body) throws Exception {
        return perform(put(url).content(body), account.token());
    }

    protected ResultActions patchAs(String url, Account account, String body) throws Exception {
        MockHttpServletRequestBuilder request = patch(url);
        if (body != null) {
            request.content(body);
        }
        return perform(request, account.token());
    }

    protected ResultActions deleteAs(String url, Account account) throws Exception {
        return perform(delete(url), account.token());
    }

    protected static Long readLong(MvcResult result, String path) throws Exception {
        Number value = JsonPath.read(result.getResponse().getContentAsString(), path);
        return value.longValue();
    }
}
