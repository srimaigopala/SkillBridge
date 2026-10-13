package com.skillbridge.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CommentRequest(
        @NotBlank(message = "Comment is required")
        @Size(max = 1000, message = "Comment cannot exceed 1000 characters")
        String content) {
}
