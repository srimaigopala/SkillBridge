package com.skillbridge;

import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class NetworkingTest extends ApiTestSupport {

    @Test
    void studentsDiscoverEachOtherAndConnect() throws Exception {

        Account alice = registerStudent("Alice Networker");
        Account bob = registerStudent("Bob Networker");
        saveSkills(bob, "[\"Kotlin\", \"Android\"]");

        // Discover Bob by skill alias; Alice doesn't see herself; email is hidden
        getAs("/api/students?skill=kotlin", alice)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].userId", hasItem(bob.id().intValue())))
                .andExpect(jsonPath("$[*].userId", not(hasItem(alice.id().intValue()))));

        getAs("/api/students/" + bob.id(), alice)
                .andExpect(jsonPath("$.name").value("Bob Networker"))
                .andExpect(jsonPath("$.college").value("JNTU"))
                .andExpect(jsonPath("$.email").doesNotExist())
                .andExpect(jsonPath("$.connectionStatus").value("NONE"));

        // Alice sends a request
        MvcResult sent = postAs("/api/connections/request/" + bob.id(), alice, null)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.direction").value("SENT"))
                .andReturn();
        Long connectionId = readLong(sent, "$.id");

        // Duplicate request is rejected
        postAs("/api/connections/request/" + bob.id(), alice, null)
                .andExpect(status().isConflict());

        getAs("/api/connections/requests/outgoing", alice)
                .andExpect(jsonPath("$[0].userId").value(bob.id()));

        getAs("/api/connections/requests/incoming", bob)
                .andExpect(jsonPath("$[0].id").value(connectionId))
                .andExpect(jsonPath("$[0].name").value("Alice Networker"))
                .andExpect(jsonPath("$[0].direction").value("RECEIVED"));

        getAs("/api/connections/status/" + alice.id(), bob)
                .andExpect(jsonPath("$.status").value("PENDING_RECEIVED"));

        // Only the receiver can accept
        postAs("/api/connections/" + connectionId + "/accept", alice, null)
                .andExpect(status().isForbidden());

        postAs("/api/connections/" + connectionId + "/accept", bob, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACCEPTED"));

        // Both see the connection; now emails are visible
        getAs("/api/connections", alice)
                .andExpect(jsonPath("$[*].userId", hasItem(bob.id().intValue())));
        getAs("/api/connections", bob)
                .andExpect(jsonPath("$[*].userId", hasItem(alice.id().intValue())));

        getAs("/api/students/" + bob.id(), alice)
                .andExpect(jsonPath("$.connectionStatus").value("CONNECTED"))
                .andExpect(jsonPath("$.email").value(bob.email()));

        // Remove the connection
        deleteAs("/api/connections/" + connectionId, bob).andExpect(status().isNoContent());
        getAs("/api/connections", alice).andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void rejectAndResendAndMutualRequests() throws Exception {

        Account carol = registerStudent("Carol");
        Account dave = registerStudent("Dave");
        Account erin = registerStudent("Erin");

        Long id = readLong(postAs("/api/connections/request/" + dave.id(), carol, null)
                .andReturn(), "$.id");

        postAs("/api/connections/" + id + "/reject", dave, null)
                .andExpect(jsonPath("$.status").value("REJECTED"));

        // Answering twice fails
        postAs("/api/connections/" + id + "/accept", dave, null)
                .andExpect(status().isBadRequest());

        // After a rejection a new request can be sent
        postAs("/api/connections/request/" + dave.id(), carol, null)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"));

        // Requester can cancel a pending request; receiver must reject instead
        deleteAs("/api/connections/" + id, dave).andExpect(status().isBadRequest());
        deleteAs("/api/connections/" + id, carol).andExpect(status().isNoContent());

        // If both ask each other, the second request accepts the first
        postAs("/api/connections/request/" + erin.id(), carol, null)
                .andExpect(status().isCreated());
        postAs("/api/connections/request/" + carol.id(), erin, null)
                .andExpect(jsonPath("$.status").value("ACCEPTED"));
    }

    @Test
    void invalidConnectionTargetsAreRejected() throws Exception {

        Account student = registerStudent("Solo");
        Account recruiter = registerRecruiter("Not Connectable");

        postAs("/api/connections/request/" + student.id(), student, null)
                .andExpect(status().isBadRequest());

        postAs("/api/connections/request/" + recruiter.id(), student, null)
                .andExpect(status().isNotFound());

        postAs("/api/connections/request/999999", student, null)
                .andExpect(status().isNotFound());

        // Recruiters don't use student networking
        getAs("/api/connections", recruiter).andExpect(status().isForbidden());
    }

    @Test
    void recruitersCanBrowseStudentProfilesWithEmail() throws Exception {

        Account student = registerStudent("Visible Student");
        saveSkills(student, "[\"Go\"]");
        Account recruiter = registerRecruiter("Talent Team");

        getAs("/api/students/" + student.id(), recruiter)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(student.email()))
                .andExpect(jsonPath("$.skills[0]").value("Go"))
                .andExpect(jsonPath("$.connectionStatus").doesNotExist());

        getAs("/api/students?q=visible student", recruiter)
                .andExpect(jsonPath("$[*].userId", hasItem(student.id().intValue())));
    }
}
