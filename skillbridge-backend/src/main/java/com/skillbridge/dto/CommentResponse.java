package com.skillbridge.dto;

import java.time.LocalDateTime;

public record CommentResponse(
        Long id,
        Long postId,
        UserSummary author,
        String content,
        LocalDateTime createdAt,
        boolean canDelete) {
}
