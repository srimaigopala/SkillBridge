package com.skillbridge.skills;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

// Compares a student's skills with a job's required skills.
@Service
public class SkillMatchService {

    private final SkillCatalog skillCatalog;

    public SkillMatchService(SkillCatalog skillCatalog) {
        this.skillCatalog = skillCatalog;
    }

    public MatchResult match(
            Collection<String> studentSkills,
            String jobRequiredSkills) {

        return match(studentSkills, skillCatalog.parseList(jobRequiredSkills));
    }

    public MatchResult match(
            Collection<String> studentSkills,
            Collection<String> jobSkills) {

        List<String> required =
                new ArrayList<>(skillCatalog.canonicalizeAll(jobSkills));

        if (required.isEmpty()) {
            return MatchResult.empty();
        }

        Set<String> studentKeys = new HashSet<>();

        if (studentSkills != null) {
            for (String skill : studentSkills) {
                String key = skillCatalog.key(skill);
                if (key != null) {
                    studentKeys.add(key);
                }
            }
        }

        List<String> matched = new ArrayList<>();
        List<String> missing = new ArrayList<>();

        for (String skill : required) {
            if (studentKeys.contains(skillCatalog.key(skill))) {
                matched.add(skill);
            } else {
                missing.add(skill);
            }
        }

        int percentage = (int) Math.round(
                matched.size() * 100.0 / required.size());

        return new MatchResult(percentage, matched, missing, required);
    }
}
