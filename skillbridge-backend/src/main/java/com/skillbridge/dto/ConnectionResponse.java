package com.skillbridge.dto;

import java.time.LocalDateTime;

// direction is SENT or RECEIVED from the current user's point of view
public record ConnectionResponse(
        Long id,
        String status,
        String direction,
        Long userId,
        String name,
        String headline,
        String college,
        LocalDateTime createdAt,
        LocalDateTime respondedAt) {
}
