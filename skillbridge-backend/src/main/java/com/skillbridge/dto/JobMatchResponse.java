package com.skillbridge.dto;

import java.util.List;

// A job together with how well the current student matches it
public record JobMatchResponse(
        JobResponse job,
        int matchPercentage,
        List<String> matchedSkills,
        List<String> missingSkills,
        boolean alreadyApplied) {
}
