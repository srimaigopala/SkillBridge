package com.skillbridge.dto;

import java.util.List;

public record ResumeUploadResponse(
        String fileName,
        int extractedTextLength,
        List<String> extractedSkills,
        List<String> newSkillsAdded,
        StudentProfileResponse profile) {
}
