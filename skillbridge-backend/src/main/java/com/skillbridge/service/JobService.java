
package com.skillbridge.service;

import com.skillbridge.dto.JobRequest;
import com.skillbridge.dto.JobResponse;
import com.skillbridge.entity.Job;
import com.skillbridge.entity.JobStatus;
import com.skillbridge.entity.Role;
import com.skillbridge.entity.User;
import com.skillbridge.repository.JobApplicationRepository;
import com.skillbridge.repository.JobRepository;
import com.skillbridge.skills.SkillCatalog;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@Service
public class JobService {

    private final JobRepository jobRepository;
    private final JobApplicationRepository applicationRepository;
    private final UserService userService;
    private final SkillCatalog skillCatalog;

    public JobService(
            JobRepository jobRepository,
            JobApplicationRepository applicationRepository,
            UserService userService,
            SkillCatalog skillCatalog) {
        this.jobRepository = jobRepository;
        this.applicationRepository = applicationRepository;
        this.userService = userService;
        this.skillCatalog = skillCatalog;
    }

    // Create a job for the authenticated recruiter
    @Transactional
    public JobResponse createJob(String recruiterEmail, JobRequest request) {

        User recruiter = userService.requireRole(recruiterEmail, Role.RECRUITER);

        Job job = new Job();
        applyRequest(job, request);

        // Assign ownership on the backend
        job.setRecruiter(recruiter);

        // New jobs start as OPEN
        job.setStatus(JobStatus.OPEN.name());

        return new JobResponse(jobRepository.save(job));
    }

    // Update a job owned by the authenticated recruiter
    @Transactional
    public JobResponse updateJob(
            String recruiterEmail, Long jobId, JobRequest request) {

        Job job = findOwnedJob(recruiterEmail, jobId);
        applyRequest(job, request);

        return new JobResponse(jobRepository.save(job));
    }

    // Open or close a job owned by the authenticated recruiter
    @Transactional
    public JobResponse changeStatus(
            String recruiterEmail, Long jobId, JobStatus status) {

        Job job = findOwnedJob(recruiterEmail, jobId);
        job.setStatus(status.name());

        return new JobResponse(jobRepository.save(job));
    }

    // Recruiters delete their own jobs; admins can delete any job
    @Transactional
    public void deleteJob(String email, Long jobId) {

        User user = userService.requireRole(email, Role.RECRUITER, Role.ADMIN);

        Job job = user.getRole() == Role.ADMIN
                ? getJobEntity(jobId)
                : findOwnedJob(email, jobId);

        applicationRepository.deleteByJobId(job.getId());
        jobRepository.delete(job);
    }

    // Get all jobs, newest first (used by students to browse opportunities)
    @Transactional(readOnly = true)
    public List<JobResponse> getAllJobs() {
        return toResponses(jobRepository.findAll());
    }

    // Get jobs belonging only to the logged-in recruiter
    @Transactional(readOnly = true)
    public List<JobResponse> getJobsByRecruiter(String recruiterEmail) {

        userService.requireRole(recruiterEmail, Role.RECRUITER);

        return toResponses(jobRepository.findByRecruiterEmail(recruiterEmail));
    }

    @Transactional(readOnly = true)
    public JobResponse getJobById(Long id) {
        return new JobResponse(getJobEntity(id));
    }

    @Transactional(readOnly = true)
    public List<JobResponse> getJobsByStatus(String status) {
        return toResponses(jobRepository.findByStatus(
                status.trim().toUpperCase(Locale.ROOT)));
    }

    @Transactional(readOnly = true)
    public List<JobResponse> searchJobsByTitle(String title) {
        return toResponses(jobRepository.findByTitleContainingIgnoreCase(title));
    }

    @Transactional(readOnly = true)
    public List<JobResponse> searchJobsByLocation(String location) {
        return toResponses(jobRepository.findByLocationContainingIgnoreCase(location));
    }

    // Search jobs by any combination of title/company, location, status and skill
    @Transactional(readOnly = true)
    public List<JobResponse> searchJobs(
            String title,
            String location,
            String status,
            String skill) {

        String skillFilter = blankToNull(skill);

        // Search by canonical name so "reactjs" finds jobs listing "React"
        if (skillFilter != null) {
            skillFilter = skillCatalog.canonicalize(skillFilter);
        }

        String statusFilter = blankToNull(status);

        return jobRepository.search(
                        blankToNull(title),
                        blankToNull(location),
                        statusFilter == null
                                ? null
                                : statusFilter.toUpperCase(Locale.ROOT),
                        skillFilter)
                .stream()
                .map(JobResponse::new)
                .toList();
    }

    public Job getJobEntity(Long id) {
        return jobRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Job not found with ID: " + id));
    }

    private Job findOwnedJob(String recruiterEmail, Long jobId) {

        userService.requireRole(recruiterEmail, Role.RECRUITER);

        // Don't reveal whether another recruiter's job exists
        return jobRepository.findByIdAndRecruiterEmail(jobId, recruiterEmail)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Job not found for this recruiter"));
    }

    private void applyRequest(Job job, JobRequest request) {

        job.setTitle(request.getTitle().trim());
        job.setCompanyName(request.getCompanyName().trim());
        job.setDescription(request.getDescription());
        job.setLocation(request.getLocation());
        job.setJobType(request.getJobType().trim());
        job.setSalary(request.getSalary());
        job.setApplicationDeadline(request.getApplicationDeadline());

        // Store skills in canonical form: "reactjs, JAVA" -> "React, Java"
        job.setRequiredSkills(
                String.join(", ", skillCatalog.parseList(request.getRequiredSkills())));
    }

    private static List<JobResponse> toResponses(List<Job> jobs) {
        return jobs.stream()
                .sorted(Comparator.comparing(
                        Job::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(JobResponse::new)
                .toList();
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
