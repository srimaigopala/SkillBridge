
package com.skillbridge.service;

import com.skillbridge.dto.JobApplicationRequest;
import com.skillbridge.dto.JobApplicationResponse;
import com.skillbridge.entity.ApplicationStatus;
import com.skillbridge.entity.Job;
import com.skillbridge.entity.JobApplication;
import com.skillbridge.entity.Role;
import com.skillbridge.entity.User;
import com.skillbridge.repository.JobApplicationRepository;
import com.skillbridge.repository.JobRepository;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;
import java.util.Set;

@Service
public class JobApplicationService {

    // Statuses a recruiter may set
    private static final Set<ApplicationStatus> RECRUITER_STATUSES = Set.of(
            ApplicationStatus.UNDER_REVIEW,
            ApplicationStatus.SHORTLISTED,
            ApplicationStatus.REJECTED,
            ApplicationStatus.SELECTED);

    // Statuses from which a student may still withdraw
    private static final Set<ApplicationStatus> WITHDRAWABLE = Set.of(
            ApplicationStatus.APPLIED,
            ApplicationStatus.UNDER_REVIEW,
            ApplicationStatus.SHORTLISTED);

    private static final Comparator<JobApplication> NEWEST_FIRST =
            Comparator.comparing(
                    JobApplication::getAppliedAt,
                    Comparator.nullsLast(Comparator.reverseOrder()));

    private final JobApplicationRepository applicationRepository;
    private final JobRepository jobRepository;
    private final UserService userService;
    private final JobService jobService;
    private final RecommendationService recommendationService;

    public JobApplicationService(
            JobApplicationRepository applicationRepository,
            JobRepository jobRepository,
            UserService userService,
            JobService jobService,
            RecommendationService recommendationService) {
        this.applicationRepository = applicationRepository;
        this.jobRepository = jobRepository;
        this.userService = userService;
        this.jobService = jobService;
        this.recommendationService = recommendationService;
    }

    @Transactional
    public JobApplicationResponse applyForJob(
            String studentEmail,
            JobApplicationRequest request) {

        User student = userService.requireRole(studentEmail, Role.STUDENT);
        Job job = jobService.getJobEntity(request.getJobId());

        if (!"OPEN".equalsIgnoreCase(job.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "This job is not open for applications");
        }

        if (job.isExpired()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Application deadline has passed");
        }

        if (applicationRepository.existsByStudentIdAndJobId(
                student.getId(), job.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT, "You have already applied for this job");
        }

        JobApplication application = new JobApplication();
        application.setStudent(student);
        application.setJob(job);
        application.setStatus(ApplicationStatus.APPLIED);
        application.setCoverLetter(request.getCoverLetter());

        try {
            return new JobApplicationResponse(
                    applicationRepository.saveAndFlush(application));
        } catch (DataIntegrityViolationException exception) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "You have already applied for this job");
        }
    }

    @Transactional(readOnly = true)
    public List<JobApplicationResponse> getMyApplications(String studentEmail) {

        User student = userService.requireRole(studentEmail, Role.STUDENT);

        return applicationRepository.findByStudentId(student.getId())
                .stream()
                .sorted(NEWEST_FIRST)
                .map(JobApplicationResponse::new)
                .toList();
    }

    // Student withdraws their own application
    @Transactional
    public JobApplicationResponse withdraw(String studentEmail, Long applicationId) {

        User student = userService.requireRole(studentEmail, Role.STUDENT);
        JobApplication application = getApplicationEntity(applicationId);

        if (!application.getStudent().getId().equals(student.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Application not found");
        }

        if (!WITHDRAWABLE.contains(application.getStatus())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "This application can no longer be withdrawn");
        }

        application.setStatus(ApplicationStatus.WITHDRAWN);

        return new JobApplicationResponse(applicationRepository.save(application));
    }

    // Recruiters view applicants for a job they own, with skill match
    @Transactional(readOnly = true)
    public List<JobApplicationResponse> getApplicationsForRecruiter(
            String recruiterEmail, Long jobId) {

        userService.requireRole(recruiterEmail, Role.RECRUITER);

        jobRepository.findByIdAndRecruiterEmail(jobId, recruiterEmail)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Job not found for this recruiter"));

        return withMatches(applicationRepository.findByJobId(jobId));
    }

    // All applications across the recruiter's jobs
    @Transactional(readOnly = true)
    public List<JobApplicationResponse> getReceivedApplications(String recruiterEmail) {

        userService.requireRole(recruiterEmail, Role.RECRUITER);

        return withMatches(applicationRepository.findByJobRecruiterEmail(recruiterEmail));
    }

    // Student owner, owning recruiter or admin can view one application
    @Transactional(readOnly = true)
    public JobApplicationResponse getApplication(String email, Long applicationId) {

        User user = userService.getCurrentUser(email);
        JobApplication application = getApplicationEntity(applicationId);

        boolean allowed = switch (user.getRole()) {
            case STUDENT -> application.getStudent().getId().equals(user.getId());
            case RECRUITER -> application.getJob().getRecruiter().getId()
                    .equals(user.getId());
            case ADMIN -> true;
        };

        if (!allowed) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Application not found");
        }

        JobApplicationResponse response = new JobApplicationResponse(application);

        return user.getRole() == Role.STUDENT
                ? response
                : response.withMatch(recommendationService.matchApplication(application));
    }

    @Transactional
    public JobApplicationResponse updateApplicationStatus(
            String recruiterEmail,
            Long applicationId,
            ApplicationStatus newStatus) {

        userService.requireRole(recruiterEmail, Role.RECRUITER);

        JobApplication application = getApplicationEntity(applicationId);

        jobRepository.findByIdAndRecruiterEmail(
                        application.getJob().getId(), recruiterEmail)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.FORBIDDEN,
                        "You cannot update applications for another recruiter's job"));

        if (newStatus == null || !RECRUITER_STATUSES.contains(newStatus)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Invalid recruiter status. Choose UNDER_REVIEW, SHORTLISTED, REJECTED, or SELECTED");
        }

        if (application.getStatus() == ApplicationStatus.WITHDRAWN) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "The student has withdrawn this application");
        }

        application.setStatus(newStatus);

        JobApplication saved = applicationRepository.save(application);

        return new JobApplicationResponse(saved)
                .withMatch(recommendationService.matchApplication(saved));
    }

    @Transactional(readOnly = true)
    public List<JobApplicationResponse> getAllApplicationsForAdmin(
            ApplicationStatus status, Long jobId) {

        return applicationRepository.findAll()
                .stream()
                .filter(a -> status == null || a.getStatus() == status)
                .filter(a -> jobId == null || a.getJob().getId().equals(jobId))
                .sorted(NEWEST_FIRST)
                .map(JobApplicationResponse::new)
                .toList();
    }

    private List<JobApplicationResponse> withMatches(List<JobApplication> applications) {
        return applications.stream()
                .sorted(NEWEST_FIRST)
                .map(a -> new JobApplicationResponse(a)
                        .withMatch(recommendationService.matchApplication(a)))
                .toList();
    }

    private JobApplication getApplicationEntity(Long applicationId) {
        return applicationRepository.findById(applicationId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Application not found"));
    }
}
