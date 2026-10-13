package com.skillbridge.skills;

import java.util.List;

public record MatchResult(
        int matchPercentage,
        List<String> matchedSkills,
        List<String> missingSkills,
        List<String> requiredSkills) {

    public static MatchResult empty() {
        return new MatchResult(0, List.of(), List.of(), List.of());
    }
}
