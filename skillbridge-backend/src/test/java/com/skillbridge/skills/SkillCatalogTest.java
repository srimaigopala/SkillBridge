package com.skillbridge.skills;

import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class SkillCatalogTest {

    private final SkillCatalog catalog = new SkillCatalog();

    @Test
    void canonicalizesAliasesAndCase() {
        assertThat(catalog.canonicalize("reactjs")).isEqualTo("React");
        assertThat(catalog.canonicalize("  React.JS ")).isEqualTo("React");
        assertThat(catalog.canonicalize("JAVA")).isEqualTo("Java");
        assertThat(catalog.canonicalize("golang")).isEqualTo("Go");
        assertThat(catalog.canonicalize("springboot")).isEqualTo("Spring Boot");
    }

    @Test
    void keepsUnknownSkillsAsTyped() {
        assertThat(catalog.canonicalize("  Quantum   Basket Weaving ")).isEqualTo("Quantum Basket Weaving");
        assertThat(catalog.canonicalize("   ")).isNull();
    }

    @Test
    void parsesAndDeduplicatesLists() {
        assertThat(catalog.parseList("java, Java; reactjs | React, , MySQL"))
                .containsExactly("Java", "React", "MySQL");
    }

    @Test
    void extractsSkillsFromResumeTextInOrderOfAppearance() {

        String resume = """
                Jane Doe - Software Engineering Intern
                Built REST APIs with Spring Boot and Java 17, frontend in React.js.
                Databases: MySQL, PostgreSQL. Tools: Docker, Git, GitHub Actions.
                Familiar with machine learning using scikit-learn.
                """;

        Set<String> skills = catalog.extractFromText(resume);

        assertThat(skills).containsSubsequence("Spring Boot", "Java", "React", "MySQL");
        assertThat(skills).contains(
                "PostgreSQL", "Docker", "Git", "GitHub Actions",
                "Machine Learning", "scikit-learn", "REST APIs");
    }

    @Test
    void doesNotConfuseSimilarSkills() {

        Set<String> skills = catalog.extractFromText(
                "Experienced in JavaScript and MySQL, plus C++ and C#.");

        assertThat(skills).contains("JavaScript", "MySQL", "C++", "C#");
        assertThat(skills).doesNotContain("Java", "SQL", "C");
    }

    @Test
    void ignoresAmbiguousEnglishWords() {

        Set<String> skills = catalog.extractFromText(
                "I excel at teamwork, rest on weekends and go hiking every spring.");

        assertThat(skills).doesNotContain("Excel", "REST APIs", "Go", "Spring Boot");
    }

    @Test
    void skillsInsideLongerSkillsAreNotCountedTwice() {

        assertThat(catalog.extractFromText("CI/CD with GitHub Actions; mobile apps in React Native."))
                .contains("GitHub Actions", "React Native")
                .doesNotContain("GitHub", "React");

        // ...but a separate mention still counts
        assertThat(catalog.extractFromText("GitHub Actions pipelines. Code hosted on GitHub."))
                .contains("GitHub Actions", "GitHub");
    }

    @Test
    void keysMatchAcrossAliases() {
        assertThat(catalog.key("node.js")).isEqualTo(catalog.key("NodeJS"));
        assertThat(catalog.canonicalizeAll(List.of("k8s", "Kubernetes"))).containsExactly("Kubernetes");
    }
}
