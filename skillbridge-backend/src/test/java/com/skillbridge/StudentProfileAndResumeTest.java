package com.skillbridge;

import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.ResultActions;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class StudentProfileAndResumeTest extends ApiTestSupport {

    @Test
    void newStudentGetsEmptyProfileInsteadOfError() throws Exception {

        Account student = registerStudent("Fresh Student");

        getAs("/api/student/profile", student)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").doesNotExist())
                .andExpect(jsonPath("$.name").value("Fresh Student"))
                .andExpect(jsonPath("$.skills.length()").value(0))
                .andExpect(jsonPath("$.profileCompletion").value(0));
    }

    @Test
    void studentSavesFullProfile() throws Exception {

        Account student = registerStudent("Divya");

        putAs("/api/student/profile", student, """
                {
                  "phone": "9999999999",
                  "college": "IIT Hyderabad",
                  "degree": "B.Tech",
                  "branch": "CSE",
                  "graduationYear": 2027,
                  "bio": "I like building things",
                  "headline": "Aspiring backend engineer",
                  "location": "Hyderabad",
                  "careerGoals": "Backend roles at product companies",
                  "githubUrl": "https://github.com/divya",
                  "skills": ["java", "reactjs", "Java", "  "],
                  "interests": ["Open source", "open source", "Hackathons"]
                }
                """)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.skills", containsInAnyOrder("Java", "React")))
                .andExpect(jsonPath("$.interests", containsInAnyOrder("Open source", "Hackathons")))
                .andExpect(jsonPath("$.headline").value("Aspiring backend engineer"))
                .andExpect(jsonPath("$.profileCompletion").value(91));

        // Older clients that don't send skills/interests keep them
        putAs("/api/student/profile", student, """
                {"college": "IIT Hyderabad", "bio": "Updated bio"}
                """)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bio").value("Updated bio"))
                .andExpect(jsonPath("$.skills.length()").value(2));
    }

    @Test
    void dashboardRoundTripWithReadOnlyFieldsIsAccepted() throws Exception {

        Account student = registerStudent("Round Trip");

        // Same shape the current React dashboard sends: the loaded profile plus edits
        putAs("/api/student/profile", student, """
                {"id": null, "userId": 1, "name": "Round Trip", "email": "x@y.z",
                 "college": "", "degree": "B.Sc", "graduationYear": null,
                 "skills": [], "resumeUploaded": false, "profileCompletion": 0,
                 "updatedAt": null, "somethingNew": "ignored"}
                """)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.degree").value("B.Sc"))
                .andExpect(jsonPath("$.college").doesNotExist());
    }

    @Test
    void profileEndpointsAreStudentOnly() throws Exception {

        Account recruiter = registerRecruiter("Not A Student");

        getAs("/api/student/profile", recruiter).andExpect(status().isForbidden());
        getAs("/api/student/recommendations", recruiter).andExpect(status().isForbidden());
    }

    @Test
    void resumeUploadExtractsSkillsAndMergesThemIntoProfile() throws Exception {

        Account student = registerStudent("Neha");
        saveSkills(student, "[\"Java\"]");

        byte[] pdf = pdf(
                "Neha Sharma - Computer Science Student",
                "Skills: Java, Spring Boot, React.js, MySQL, Docker",
                "Projects: built REST APIs and deployed them on AWS");

        uploadResume(student, "neha-resume.pdf", pdf)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fileName").value("neha-resume.pdf"))
                .andExpect(jsonPath("$.extractedSkills",
                        hasItems("Java", "Spring Boot", "React", "MySQL", "Docker", "AWS", "REST APIs")))
                // Java was already on the profile, so it isn't "new"
                .andExpect(jsonPath("$.newSkillsAdded", not(hasItem("Java"))))
                .andExpect(jsonPath("$.newSkillsAdded", hasItems("Spring Boot", "React")))
                .andExpect(jsonPath("$.profile.resumeUploaded").value(true))
                .andExpect(jsonPath("$.profile.skills", hasItems("Java", "Spring Boot", "Docker")));

        getAs("/api/student/profile", student)
                .andExpect(jsonPath("$.resumeFileName").value("neha-resume.pdf"))
                .andExpect(jsonPath("$.resumeSkills", hasItems("MySQL", "AWS")));

        // Student can download it back
        getAs("/api/student/profile/resume", student)
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/pdf"))
                .andExpect(content().bytes(pdf));

        // Recruiters can view it; other students cannot
        Account recruiter = registerRecruiter("Resume Reader");
        Account otherStudent = registerStudent("Curious");

        getAs("/api/students/" + student.id() + "/resume", recruiter)
                .andExpect(status().isOk())
                .andExpect(content().contentType("application/pdf"));
        getAs("/api/students/" + student.id() + "/resume", otherStudent)
                .andExpect(status().isForbidden());

        // Deleting removes the file reference
        deleteAs("/api/student/profile/resume", student)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resumeUploaded").value(false));
        getAs("/api/student/profile/resume", student)
                .andExpect(status().isNotFound());
    }

    @Test
    void resumeSkillsDriveRecommendations() throws Exception {

        Account recruiter = registerRecruiter("ML Startup");
        Long mlJob = createJob(recruiter, "ML Intern", "Python, TensorFlow, Pandas");

        Account student = registerStudent("Ishaan");
        uploadResume(student, "cv.pdf", pdf("Experience with Python, Pandas and TensorFlow."))
                .andExpect(status().isOk());

        getAs("/api/student/recommendations", student)
                .andExpect(jsonPath("$[0].job.id").value(mlJob))
                .andExpect(jsonPath("$[0].matchPercentage").value(100));
    }

    @Test
    void nonPdfUploadsAreRejected() throws Exception {

        Account student = registerStudent("Wrong File");

        uploadResume(student, "resume.pdf", "just some text".getBytes())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Only PDF résumés are supported"));

        uploadResume(student, "empty.pdf", new byte[0])
                .andExpect(status().isBadRequest());
    }

    private ResultActions uploadResume(Account student, String name, byte[] bytes)
            throws Exception {

        MockMultipartFile file = new MockMultipartFile(
                "file", name, "application/pdf", bytes);

        return mvc.perform(multipart("/api/student/profile/resume")
                .file(file)
                .header("Authorization", "Bearer " + student.token()));
    }

    static byte[] pdf(String... lines) throws IOException {

        try (PDDocument document = new PDDocument();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            PDPage page = new PDPage();
            document.addPage(page);

            try (PDPageContentStream stream = new PDPageContentStream(document, page)) {
                stream.beginText();
                stream.setFont(new PDType1Font(Standard14Fonts.FontName.HELVETICA), 12);
                stream.newLineAtOffset(50, 700);
                for (String line : lines) {
                    stream.showText(line);
                    stream.newLineAtOffset(0, -18);
                }
                stream.endText();
            }

            document.save(out);
            return out.toByteArray();
        }
    }
}
