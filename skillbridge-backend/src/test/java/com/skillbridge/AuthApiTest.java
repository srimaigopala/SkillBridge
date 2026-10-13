package com.skillbridge;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthApiTest extends ApiTestSupport {

    @Test
    void registerValidatesInput() throws Exception {

        mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"","email":"not-an-email","password":"short"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists())
                .andExpect(jsonPath("$.fieldErrors.name").exists())
                .andExpect(jsonPath("$.fieldErrors.email").exists())
                .andExpect(jsonPath("$.fieldErrors.password").exists());
    }

    @Test
    void malformedBodyIsBadRequestNotServerError() throws Exception {

        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Request body is missing or malformed"));
    }

    @Test
    void studentRegistersAndLogsInWithCaseInsensitiveEmail() throws Exception {

        String email = uniqueEmail("Mixed.Case");

        mvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Asha","email":"%s","password":"%s"}
                                """.formatted(email.toUpperCase(), PASSWORD)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("STUDENT"))
                .andExpect(jsonPath("$.email").value(email.toLowerCase()));

        String token = login(email, PASSWORD);

        mvc.perform(get("/api/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Asha"))
                .andExpect(jsonPath("$.role").value("STUDENT"))
                .andExpect(jsonPath("$.createdAt").exists());
    }

    @Test
    void duplicateEmailIsRejected() throws Exception {

        Account student = registerStudent("Ravi");

        mvc.perform(post("/api/auth/register/company")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"Ravi Corp","email":"%s","password":"%s"}
                                """.formatted(student.email(), PASSWORD)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message").value("Email already registered"));
    }

    @Test
    void companyRegistrationGetsRecruiterRole() throws Exception {

        Account recruiter = registerRecruiter("Acme HR");

        getAs("/api/auth/me", recruiter)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("RECRUITER"));
    }

    @Test
    void wrongPasswordIsUnauthorized() throws Exception {

        Account student = registerStudent("Meera");

        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"WrongPassword"}
                                """.formatted(student.email())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }

    @Test
    void protectedEndpointsRequireAValidToken() throws Exception {

        mvc.perform(get("/api/jobs"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Authentication required"));

        mvc.perform(get("/api/jobs").header("Authorization", "Bearer not.a.jwt"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message", containsString("Invalid")));
    }

    @Test
    void bootstrapAdminCanLogIn() throws Exception {

        Account admin = admin();

        getAs("/api/auth/me", admin)
                .andExpect(jsonPath("$.role").value("ADMIN"));
    }
}
