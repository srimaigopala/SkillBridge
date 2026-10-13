package com.skillbridge.dto;

import com.skillbridge.entity.User;

// Minimal author/user info embedded in posts, comments and connections
public record UserSummary(Long id, String name, String role) {

    public static UserSummary from(User user) {
        return new UserSummary(user.getId(), user.getName(), user.getRole().name());
    }
}
