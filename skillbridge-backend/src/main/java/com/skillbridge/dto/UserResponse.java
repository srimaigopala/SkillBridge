package com.skillbridge.dto;

import com.skillbridge.entity.User;

import java.time.LocalDateTime;

public record UserResponse(
        Long id,
        String name,
        String email,
        String role,
        boolean disabled,
        LocalDateTime createdAt) {

    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getName() == null ? "" : user.getName(),
                user.getEmail(),
                user.getRole().name(),
                user.isDisabled(),
                user.getCreatedAt());
    }
}
