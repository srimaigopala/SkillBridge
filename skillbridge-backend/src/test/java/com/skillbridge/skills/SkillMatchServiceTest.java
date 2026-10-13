package com.skillbridge.skills;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SkillMatchServiceTest {

    private final SkillMatchService service = new SkillMatchService(new SkillCatalog());

    @Test
    void calculatesPercentageWithMatchedAndMissingSkills() {

        MatchResult result = service.match(
                List.of("java", "ReactJS", "Git"),
                "Java, Spring Boot, React, MySQL");

        assertThat(result.matchPercentage()).isEqualTo(50);
        assertThat(result.matchedSkills()).containsExactly("Java", "React");
        assertThat(result.missingSkills()).containsExactly("Spring Boot", "MySQL");
        assertThat(result.requiredSkills()).hasSize(4);
    }

    @Test
    void fullMatchIsOneHundredPercent() {
        assertThat(service.match(List.of("Python", "Django"), "python, django").matchPercentage())
                .isEqualTo(100);
    }

    @Test
    void roundsToNearestPercent() {
        assertThat(service.match(List.of("Java"), "Java, Python, Go").matchPercentage())
                .isEqualTo(33);
    }

    @Test
    void jobWithoutSkillsOrStudentWithoutSkillsIsZero() {
        assertThat(service.match(List.of("Java"), "").matchPercentage()).isZero();
        assertThat(service.match(List.of(), "Java").matchPercentage()).isZero();
        assertThat(service.match(null, "Java").missingSkills()).containsExactly("Java");
    }
}
