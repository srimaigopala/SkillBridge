package com.skillbridge.dto;

import java.time.LocalDateTime;

public record PostResponse(
        Long id,
        UserSummary author,
        String content,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        long likeCount,
        long commentCount,
        boolean likedByMe,
        boolean canEdit,
        boolean canDelete) {
}
