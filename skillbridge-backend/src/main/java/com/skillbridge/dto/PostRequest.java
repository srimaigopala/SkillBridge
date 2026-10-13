package com.skillbridge.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record PostRequest(
        @NotBlank(message = "Post content is required")
        @Size(max = 3000, message = "Post cannot exceed 3000 characters")
        String content) {
}
