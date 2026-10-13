package com.skillbridge.service;

import com.skillbridge.dto.JobMatchResponse;
import com.skillbridge.dto.JobResponse;
import com.skillbridge.entity.Job;
import com.skillbridge.entity.JobApplication;
import com.skillbridge.entity.Role;
import com.skillbridge.entity.User;
import com.skillbridge.repository.JobApplicationRepository;
import com.skillbridge.repository.JobRepository;
import com.skillbridge.skills.MatchResult;
import com.skillbridge.skills.SkillMatchService;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

// Skill-based job matching and recommendations for students
@Service
public class RecommendationService {

    private static final int MAX_LIMIT = 50;

    private final JobRepository jobRepository;
    private final JobApplicationRepository applicationRepository;
    private final JobService jobService;
    private final UserService userService;
    private final StudentProfileService profileService;
    private final SkillMatchService skillMatchService;

    public RecommendationService(
            JobRepository jobRepository,
            JobApplicationRepository applicationRepository,
            JobService jobService,
            UserService userService,
            StudentProfileService profileService,
            SkillMatchService skillMatchService) {
        this.jobRepository = jobRepository;
        this.applicationRepository = applicationRepository;
        this.jobService = jobService;
        this.userService = userService;
        this.profileService = profileService;
        this.skillMatchService = skillMatchService;
    }

    // How well the current student matches one job
    @Transactional(readOnly = true)
    public JobMatchResponse matchForJob(String studentEmail, Long jobId) {

        User student = userService.requireRole(studentEmail, Role.STUDENT);
        Job job = jobService.getJobEntity(jobId);

        MatchResult match = skillMatchService.match(
                profileService.getSkills(student.getId()),
                job.getRequiredSkills());

        boolean applied = applicationRepository.existsByStudentIdAndJobId(
                student.getId(), jobId);

        return toResponse(job, match, applied);
    }

    // Open jobs ranked by skill match; excludes jobs already applied to
    @Transactional(readOnly = true)
    public List<JobMatchResponse> recommend(String studentEmail, int limit) {

        User student = userService.requireRole(studentEmail, Role.STUDENT);
        Set<String> skills = profileService.getSkills(student.getId());

        if (skills.isEmpty()) {
            return List.of();
        }

        Set<Long> appliedJobIds = applicationRepository
                .findByStudentId(student.getId())
                .stream()
                .map(application -> application.getJob().getId())
                .collect(Collectors.toSet());

        int safeLimit = Math.max(1, Math.min(limit, MAX_LIMIT));

        record Scored(Job job, MatchResult match) {
        }

        return jobRepository.findAll().stream()
                .filter(Job::isAcceptingApplications)
                .filter(job -> !appliedJobIds.contains(job.getId()))
                .map(job -> new Scored(
                        job,
                        skillMatchService.match(skills, job.getRequiredSkills())))
                .filter(scored -> scored.match().matchPercentage() > 0)
                .sorted(Comparator
                        .comparingInt((Scored s) -> s.match().matchPercentage())
                        .reversed()
                        .thenComparing(
                                (Scored s) -> s.match().matchedSkills().size(),
                                Comparator.reverseOrder())
                        .thenComparing(
                                (Scored s) -> s.job().getApplicationDeadline(),
                                Comparator.nullsLast(Comparator.<LocalDate>naturalOrder())))
                .limit(safeLimit)
                .map(scored -> toResponse(scored.job(), scored.match(), false))
                .toList();
    }

    // Match of an application's student against its job (for recruiters)
    @Transactional(readOnly = true)
    public MatchResult matchApplication(JobApplication application) {
        return skillMatchService.match(
                profileService.getSkills(application.getStudent().getId()),
                application.getJob().getRequiredSkills());
    }

    private static JobMatchResponse toResponse(
            Job job, MatchResult match, boolean applied) {

        return new JobMatchResponse(
                new JobResponse(job),
                match.matchPercentage(),
                match.matchedSkills(),
                match.missingSkills(),
                applied);
    }
}
