package com.skillbridge.dto;

import java.util.List;

// What other users (students, recruiters, admins) can see about a student.
// Email is only shown to recruiters, admins and accepted connections.
public record PublicStudentProfileResponse(
        Long userId,
        String name,
        String email,
        String headline,
        String college,
        String degree,
        String branch,
        Integer graduationYear,
        String location,
        String bio,
        String careerGoals,
        List<String> skills,
        List<String> interests,
        String githubUrl,
        String linkedinUrl,
        String portfolioUrl,
        boolean hasResume,
        String connectionStatus,
        Long connectionId) {
}
