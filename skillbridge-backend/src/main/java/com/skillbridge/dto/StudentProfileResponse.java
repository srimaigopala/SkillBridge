
package com.skillbridge.dto;

import java.time.LocalDateTime;
import java.util.List;

public record StudentProfileResponse(
        Long id,
        Long userId,
        String name,
        String email,
        String phone,
        String college,
        String degree,
        String branch,
        Integer graduationYear,
        String resumeUrl,
        String githubUrl,
        String linkedinUrl,
        String portfolioUrl,
        String bio,
        String headline,
        String location,
        String careerGoals,
        List<String> skills,
        List<String> interests,
        boolean resumeUploaded,
        String resumeFileName,
        LocalDateTime resumeUploadedAt,
        List<String> resumeSkills,
        int profileCompletion,
        LocalDateTime updatedAt) {
}
