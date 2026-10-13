package com.skillbridge;

import org.junit.jupiter.api.Test;

import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CommunityFeedTest extends ApiTestSupport {

    @Test
    void studentsPostLikeAndComment() throws Exception {

        Account author = registerStudent("Poster");
        Account reader = registerStudent("Reader");

        Long postId = readLong(postAs("/api/posts", author, """
                {"content":"  Just got my first internship offer!  "}
                """)
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.content").value("Just got my first internship offer!"))
                .andExpect(jsonPath("$.author.name").value("Poster"))
                .andExpect(jsonPath("$.canEdit").value(true))
                .andReturn(), "$.id");

        // Newest first in the feed
        getAs("/api/posts?size=5", reader)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].id").value(postId))
                .andExpect(jsonPath("$.content[0].canEdit").value(false))
                .andExpect(jsonPath("$.page").value(0));

        // Liking is idempotent
        postAs("/api/posts/" + postId + "/like", reader, null)
                .andExpect(jsonPath("$.liked").value(true))
                .andExpect(jsonPath("$.likeCount").value(1));
        postAs("/api/posts/" + postId + "/like", reader, null)
                .andExpect(jsonPath("$.likeCount").value(1));

        getAs("/api/posts/" + postId, reader)
                .andExpect(jsonPath("$.likedByMe").value(true))
                .andExpect(jsonPath("$.likeCount").value(1));

        deleteAs("/api/posts/" + postId + "/like", reader)
                .andExpect(jsonPath("$.liked").value(false))
                .andExpect(jsonPath("$.likeCount").value(0));

        // Comments
        Long commentId = readLong(postAs("/api/posts/" + postId + "/comments", reader, """
                {"content":"Congratulations!"}
                """)
                .andExpect(status().isCreated())
                .andReturn(), "$.id");

        getAs("/api/posts/" + postId + "/comments", author)
                .andExpect(jsonPath("$[0].content").value("Congratulations!"))
                .andExpect(jsonPath("$[0].author.name").value("Reader"))
                // The post author may moderate comments on their post
                .andExpect(jsonPath("$[0].canDelete").value(true));

        getAs("/api/posts/user/" + author.id(), reader)
                .andExpect(jsonPath("$.content[0].commentCount").value(1));

        // Only the author edits
        putAs("/api/posts/" + postId, reader, """
                {"content":"hacked"}
                """).andExpect(status().isForbidden());
        putAs("/api/posts/" + postId, author, """
                {"content":"Edited: got my first internship offer!"}
                """).andExpect(status().isOk());

        deleteAs("/api/posts/" + postId + "/comments/" + commentId, author)
                .andExpect(status().isNoContent());

        // Deleting a post removes its likes and comments too
        postAs("/api/posts/" + postId + "/like", reader, null);
        postAs("/api/posts/" + postId + "/comments", reader, """
                {"content":"another"}
                """);
        deleteAs("/api/posts/" + postId, reader).andExpect(status().isForbidden());
        deleteAs("/api/posts/" + postId, author).andExpect(status().isNoContent());
        getAs("/api/posts/" + postId, reader).andExpect(status().isNotFound());
    }

    @Test
    void recruitersReadOnlyAndAdminsModerate() throws Exception {

        Account student = registerStudent("Moderated");
        Account recruiter = registerRecruiter("Feed Reader Inc");
        Account admin = admin();

        Long postId = readLong(postAs("/api/posts", student, """
                {"content":"Hello world"}
                """).andReturn(), "$.id");

        getAs("/api/posts", recruiter).andExpect(status().isOk());
        postAs("/api/posts", recruiter, """
                {"content":"Hiring!"}
                """).andExpect(status().isForbidden());
        postAs("/api/posts/" + postId + "/like", recruiter, null)
                .andExpect(status().isForbidden());

        getAs("/api/posts/" + postId, admin)
                .andExpect(jsonPath("$.canDelete").value(true));
        deleteAs("/api/posts/" + postId, admin).andExpect(status().isNoContent());
    }

    @Test
    void emptyPostsAreRejected() throws Exception {

        Account student = registerStudent("Blank");

        postAs("/api/posts", student, """
                {"content":"   "}
                """)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Post content is required"));
    }
}
